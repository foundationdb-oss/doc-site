---
title: Gray Failure Detection
description: Detect and react to degraded-but-not-dead processes in a FoundationDB cluster
---

# Gray Failure Detection

A *gray failure* is a process or network link that is still alive — it answers pings, opens connections, and reports up — but is responding slowly enough or dropping enough traffic that it drags down the rest of the cluster. Simple liveness checks miss this case: the process passes them, so the cluster keeps routing work through it.

FoundationDB ships an in-cluster gray failure detector that has each worker measure its peers and report degraded or disconnected links to the cluster controller, which can then exclude the offending process or trigger a recovery / region failover.

The detector is **off by default in 7.3 and 7.4**. Operators must opt in with knobs.

## Status in {{ fdb_version }}

{% if fdb_version == "7.4" %}
- All detection knobs from 7.3 are present, plus the `gray_failure` section in `status json` (`CC_GRAY_FAILURE_STATUS_JSON`) and additional opt-ins for storage-server complaints (`GRAY_FAILURE_ALLOW_PRIMARY_SS_TO_COMPLAIN`, `GRAY_FAILURE_ALLOW_REMOTE_SS_TO_COMPLAIN`).
{% elif fdb_version == "7.3" %}
- Core detection (worker peer monitor + cluster-controller aggregator) is present and knob-gated.
- The `gray_failure` status-JSON section and SS-complaint knobs are **not** in 7.3 — they ship in 7.4.
{% endif %}

!!! note "Production state"
    As of the May 2026 FoundationDB working group, at least one operator has run the detector enabled in production for roughly one week with no observed stability impact and no actual gray-failure catches. Enable in pre-prod first and watch for false positives before turning it on cluster-wide.

## How it works

1. Every worker in the transaction system runs a peer health monitor (gated by `ENABLE_WORKER_HEALTH_MONITOR`). Every `WORKER_HEALTH_MONITOR_INTERVAL` (default 60s) it inspects ping latency and connection-failure counts to its peers.
2. A peer is flagged **degraded** when its latency at `PEER_LATENCY_DEGRADATION_PERCENTILE` (default 50th percentile) exceeds `PEER_LATENCY_DEGRADATION_THRESHOLD` (default 50 ms) — or when its ping-timeout fraction exceeds `PEER_TIMEOUT_PERCENTAGE_DEGRADATION_THRESHOLD` (default 10%). It is flagged **disconnected** when `PEER_DEGRADATION_CONNECTION_FAILURE_COUNT` (default 5) connection failures accumulate. Cross-DC links to the primary satellite use the separate `*_SATELLITE` thresholds.
3. Workers send `UpdateWorkerHealthRequest` messages to the cluster controller listing their currently degraded and disconnected peers (and any peers that have recovered).
4. The cluster controller (gated by `CC_ENABLE_WORKER_HEALTH_MONITOR`) aggregates complaints. A peer must remain reported across at least `CC_MIN_DEGRADATION_INTERVAL` (default 120s) before it counts; reports older than `CC_DEGRADED_LINK_EXPIRATION_INTERVAL` (default 300s) are dropped. A server must be named by enough complainers (`CC_DEGRADED_PEER_DEGREE_TO_EXCLUDE_MIN` … `CC_DEGRADED_PEER_DEGREE_TO_EXCLUDE`) and the total degraded set must stay under `CC_MAX_EXCLUSION_DUE_TO_HEALTH` (default 2) before it acts.
5. If `CC_HEALTH_TRIGGER_RECOVERY` is enabled the controller kills the master to drive recovery and excludes the degraded servers from the new transaction system; otherwise it only logs a warning. If `CC_HEALTH_TRIGGER_FAILOVER` is enabled and degradation is widespread, it can flip primary and remote DC priorities.

## How to enable it

Both the per-worker monitor and the cluster-controller aggregator must be turned on. Set these in `foundationdb.conf` under `[fdbserver]` or via `fdbcli`'s `setknob` (transaction-class processes):

```ini
[fdbserver]
knob_enable_worker_health_monitor    = true
knob_cc_enable_worker_health_monitor = true
```

| Knob | Default | Purpose |
|------|---------|---------|
| `ENABLE_WORKER_HEALTH_MONITOR` | `false` | Master switch on each worker (collects per-peer measurements). |
| `CC_ENABLE_WORKER_HEALTH_MONITOR` | `false` | Master switch on the cluster controller (aggregates complaints). |
| `CC_HEALTH_TRIGGER_RECOVERY` | `false` | If true, exclude degraded servers via a recovery. If false, only log warnings — recommended for initial enablement. |
| `CC_HEALTH_TRIGGER_FAILOVER` | `false` | If true, allow region failover when degradation is widespread (`CC_FAILOVER_DUE_TO_HEALTH_MIN_DEGRADATION` … `CC_FAILOVER_DUE_TO_HEALTH_MAX_DEGRADATION`). |
| `CC_ENABLE_REMOTE_LOG_ROUTER_MONITORING` | `true` | Detect degraded log-router connectivity (already on by default once the master switches are on). |
| `CC_ENABLE_ENTIRE_SATELLITE_MONITORING` | `false` | Try to detect a fully degraded satellite DC. |
| `CC_INVALIDATE_EXCLUDED_PROCESSES` | `false` | Drop complaints from processes already excluded by a gray-failure-triggered recovery. |
| `GRAY_FAILURE_ENABLE_TLOG_RECOVERY_MONITORING` | `true` | Run the health monitor during TLog recovery as well. |
{% if fdb_version >= "7.4" %}
| `CC_GRAY_FAILURE_STATUS_JSON` | `false` | Include a `gray_failure` section in `status json`. |
| `GRAY_FAILURE_ALLOW_PRIMARY_SS_TO_COMPLAIN` | `false` | Let primary-DC storage servers also report degraded peers. |
| `GRAY_FAILURE_ALLOW_REMOTE_SS_TO_COMPLAIN` | `false` | Let remote-DC storage servers also report degraded peers. |
{% endif %}

Tuning thresholds (`PEER_LATENCY_DEGRADATION_*`, `PEER_TIMEOUT_PERCENTAGE_DEGRADATION_THRESHOLD`, `PEER_DEGRADATION_CONNECTION_FAILURE_COUNT`, `CC_DEGRADED_PEER_DEGREE_TO_EXCLUDE*`, `CC_MAX_EXCLUSION_DUE_TO_HEALTH`, `CC_MAX_HEALTH_RECOVERY_COUNT`, `CC_TRACKING_HEALTH_RECOVERY_INTERVAL`) all exist as separate knobs; defaults are documented in [`fdbclient/ServerKnobs.cpp`](https://github.com/apple/foundationdb/blob/release-{{ fdb_version }}/fdbclient/ServerKnobs.cpp).

!!! warning "Don't enable recovery/failover triggers first"
    Start with `CC_HEALTH_TRIGGER_RECOVERY = false` and `CC_HEALTH_TRIGGER_FAILOVER = false`. The detector will still publish trace events so you can watch what it *would* do without letting it kill the master or flip regions on day one.

## What to watch after enabling

The detector emits trace events you can grep for in process logs:

| Trace event | Source | Meaning |
|-------------|--------|---------|
| `HealthMonitorDetectDegradedPeer` | worker | A peer crossed the latency / timeout / connection-failure threshold. Useful detail fields include `Peer`, `MedianLatency`, `CheckedPercentileLatency`, `PingTimeoutCount`, `ConnectionFailureCount`, `Disconnected`. |
| `HealthMonitorDetectRecoveredPeer` | worker | A previously degraded peer is now healthy. |
| `HealthMonitorDetectRecentClosedPeer` | worker | Reports a recently closed transport peer that the monitor still considers part of the txn system. |
| `ClusterControllerUpdateWorkerHealth` | cluster controller | A complaint arrived from a worker. Detail fields: `WorkerAddress`, `DegradedPeers`, `DisconnectedPeers`, `RecoveredPeers`. |
| `ClusterControllerHealthMonitor` | cluster controller | Per-cycle summary of currently degraded servers. Detail fields: `DegradedServers`, `DisconnectedServers`, `DegradedSatellite`. |
| `WorkerPeerHealthRecovered`, `WorkerAllPeerHealthRecovered` | cluster controller | A peer / worker fell out of the degraded set. |
| `DegradedServerDetectedAndSuggestRecovery` | cluster controller | The controller would have triggered recovery if `CC_HEALTH_TRIGGER_RECOVERY` were on (`SevWarnAlways`). |
| `DegradedServerDetectedAndTriggerRecovery` | cluster controller | The controller is forcing a master failure to exclude a degraded server (`SevWarnAlways`). |
| `DegradedServerDetectedAndSuggestFailover` / `DegradedServerDetectedAndTriggerFailover` | cluster controller | Equivalent pair for region failover. |

{% if fdb_version >= "7.4" %}
On {{ fdb_version }} you can also enable `CC_GRAY_FAILURE_STATUS_JSON` and read the `gray_failure` object inside `status json` for a snapshot of currently degraded servers without tailing trace logs.
{% endif %}

## Recommended rollout

1. **Pre-prod first.** Enable only `ENABLE_WORKER_HEALTH_MONITOR` and `CC_ENABLE_WORKER_HEALTH_MONITOR` (suggest mode), keep `CC_HEALTH_TRIGGER_RECOVERY` and `CC_HEALTH_TRIGGER_FAILOVER` `false`.
2. **Watch for at least a week.** Look for `HealthMonitorDetectDegradedPeer` and `ClusterControllerHealthMonitor` events. Confirm the rate matches your idea of cluster health and that you don't see continuous false positives — a noisy NIC, a slow coordinator host, or a single hot pipe will all show up here.
3. **Promote gradually.** Once the suggest-only signal is clean, enable `CC_HEALTH_TRIGGER_RECOVERY`. Watch `DegradedServerDetectedAndTriggerRecovery` events and recovery counts; `CC_MAX_HEALTH_RECOVERY_COUNT` (default 5 in `CC_TRACKING_HEALTH_RECOVERY_INTERVAL` of 1 hour) caps how often gray failure can drive a recovery.
4. **Failover last.** Only enable `CC_HEALTH_TRIGGER_FAILOVER` after you have run with recovery on for some time and trust the signal.

## What's coming next

Newer gray-failure work — including additional integration with cluster health metrics and more aggressive region failover — is on the roadmap for the next major release. See the [Roadmap](../getting-started/roadmap.md) page for an inventory of what is merged into `main` but not yet shipped in 7.3 or 7.4.

## References

- Worker health monitor: [`fdbserver/worker.actor.cpp`](https://github.com/apple/foundationdb/blob/release-{{ fdb_version }}/fdbserver/worker.actor.cpp)
- Cluster-controller aggregation: [`fdbserver/ClusterController.actor.cpp`](https://github.com/apple/foundationdb/blob/release-{{ fdb_version }}/fdbserver/ClusterController.actor.cpp) and [`fdbserver/include/fdbserver/ClusterController.actor.h`](https://github.com/apple/foundationdb/blob/release-{{ fdb_version }}/fdbserver/include/fdbserver/ClusterController.actor.h)
- Knob defaults: [`fdbclient/ServerKnobs.cpp`](https://github.com/apple/foundationdb/blob/release-{{ fdb_version }}/fdbclient/ServerKnobs.cpp), [`fdbclient/include/fdbclient/ServerKnobs.h`](https://github.com/apple/foundationdb/blob/release-{{ fdb_version }}/fdbclient/include/fdbclient/ServerKnobs.h)
- Earlier guard-knob refactor: [apple/foundationdb#10848](https://github.com/apple/foundationdb/pull/10848)

