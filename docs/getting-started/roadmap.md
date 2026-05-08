---
title: What's Next / 8.0 Preview
description: Forward-looking roadmap of FoundationDB work merged upstream and what to expect in upcoming 7.3.x / 7.4.x patches and the eventual 8.0 release
---

# What's Next / 8.0 Preview

This page summarizes FoundationDB work that has been merged in [`apple/foundationdb`](https://github.com/apple/foundationdb) but is not yet part of a released 7.3.x or 7.4.x build. It is intended to help operators and application developers plan ahead.

!!! warning "Not in any released build today"
    The features listed on this page are **not yet available in a released 7.3.x or 7.4.x build**. They are tracked here so users can plan ahead. There is **no public 8.0 build available for testing today** — items in the "Targeting 8.0" section live on `main` and will only ship once a `release-8.0` branch is cut and tagged.

    For the current state of supported releases, see the [Version Overview](versions.md).

## Coming in the next 7.3.x / 7.4.x patch

Items in this section are already merged to the `release-7.3` and `release-7.4` branches and will appear in the next patch release on each branch. They are listed here because the most recent tagged builds (**7.3.77** and **7.4.6**) do **not** include them yet.

### Async `status` with internal 25 s timeout

Today, when a `status` request from `fdbcli` (or via `\xff\xff/status/json`) cannot complete within the client-side 30 s timeout — for example because the cluster controller is slow to collect data from every role — the request fails outright and the operator is left with no observability data at all.

Upstream changed `status` to run asynchronously inside the cluster controller with an internal **25 second** soft timeout. When the soft timeout is hit, the controller returns the **partial status data it has collected so far** (with the missing sections marked) instead of letting the whole request time out at 30 s.

**User-visible behavior after this lands:**

- `fdbcli> status` (and `status json`) is much more likely to return *something useful* on a struggling cluster.
- Sections that could not be collected in time are reported as missing rather than failing the whole call.
- No new knobs are required; behavior is on by default.

**Upstream PRs:** [main #12940](https://github.com/apple/foundationdb/pull/12940) · backport [`release-7.3` #13068](https://github.com/apple/foundationdb/pull/13068) · backport [`release-7.4` #13099](https://github.com/apple/foundationdb/pull/13099).

!!! note "Which patch will include this?"
    On `release-7.3` this is queued for the patch following **7.3.77**. On `release-7.4` it is queued for the patch following **7.4.6**. Patch dates are set upstream by Apple and are not promised here.

## Targeting 8.0 (merged to `main`)

The features below are merged to `main` only. They will not ship in any 7.3.x or 7.4.x patch and require a future 8.0 release.

<div class="grid cards" markdown>

-   :material-heart-pulse:{ .lg .middle } **Stable / Cluster Health Metric**

    ---

    A new `ClusterHealthMetrics` trace event exposes a single scalar **cluster health level** derived from existing internal signals (queue depths, lag, role health). The intent is to give operators and automation one number to alert on and to drive higher-level decisions such as failover.

    Design doc: `design/cluster_health_metric.md` in the upstream tree.

    [:octicons-arrow-right-24: Upstream PR #12899](https://github.com/apple/foundationdb/pull/12899)

-   :material-swap-horizontal:{ .lg .middle } **More aggressive region failover**

    ---

    Adds a knob, `CC_FAILOVER_DUE_TO_TPS_LIMIT_DURATION`, that allows the cluster controller to trigger a region failover when the primary region has been TPS-limited for that many seconds. The behavior is gated on the existing `CC_HEALTH_TRIGGER_FAILOVER` knob and is **off by default** — operators must opt in.

    [:octicons-arrow-right-24: Upstream PR #12849](https://github.com/apple/foundationdb/pull/12849)

-   :material-timer-sand:{ .lg .middle } **Faster GRV rejection**

    ---

    A new transaction option, `max_grv_queue_delay`, lets clients bound the time a `getReadVersion` request may sit in the proxy queue. If exceeded, the proxy returns a new **non-retryable** error, `transaction_grv_queue_rejected`, instead of the client waiting out a slow proxy.

    Useful for latency-sensitive workloads that prefer to fail fast and shed load rather than block on a degraded proxy.

    [:octicons-arrow-right-24: Upstream PR #13085](https://github.com/apple/foundationdb/pull/13085)

-   :material-speedometer:{ .lg .middle } **VersionedMap optimization**

    ---

    Internal performance improvement to the `VersionedMap` data structure used in the storage server hot path. **No API or knob changes.** Upstream micro-benchmarks (CPU-saturated `mako` runs) showed roughly a **2 % throughput** improvement; real-world wins will vary by workload.

    [:octicons-arrow-right-24: Upstream PR #13028](https://github.com/apple/foundationdb/pull/13028)

</div>

## Note on 8.0

There is **no `release-8.0` branch in `apple/foundationdb` today**, and no 8.0 tag has been published. Feature work labeled here as "Targeting 8.0" lives on `main` and will be rolled into a release branch when upstream decides to cut one. Until that happens:

- There is **no 8.0 Docker image, binary, or client library** to download.
- This documentation site does **not** publish an 8.0 version — only [7.1, 7.3, and 7.4](versions.md) are built.
- Specific timelines and the exact feature list of an eventual 8.0 are decided upstream and may change. Items above are listed because they are merged today, not because they are guaranteed to ship in any particular release.

If you need to track the work directly, follow the linked PRs and the [`apple/foundationdb`](https://github.com/apple/foundationdb) `main` branch.

## Next Steps

- [Version Overview](versions.md) — what's actually shipping today in 7.1, 7.3, and 7.4.
- [Upgrading](../operations/upgrading.md) — how to move between supported versions.

