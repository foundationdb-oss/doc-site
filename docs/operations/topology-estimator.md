---
title: Cluster Topology Estimator
description: Interactive calculator for sizing FoundationDB clusters - storage, logs, proxies, resolvers, coordinators, and machines.
---

# Cluster Topology Estimator

Interactive sizing calculator for FoundationDB clusters. Enter your workload and the page recommends process counts for each role, plus an `fdbcli` snippet you can adapt.

!!! warning "Starting point, not authoritative"
    These recommendations are derived from public benchmarks and operator reports. They are a **starting point** for capacity planning, not a guarantee. Validate against your own workload, and read the [How sizing works](#how-sizing-works) section below to understand the limits of each formula.

## Calculator

<div id="te-root" class="te-root">
<form id="te-form" class="te-card" autocomplete="off">
  <h3>Workload</h3>
  <div class="te-grid">
    <div class="te-field">
      <label for="te-readQps">Read QPS</label>
      <input id="te-readQps" name="readQps" type="number" min="0" step="100" value="10000">
      <span class="te-help">Sustained gets/scans per second across the cluster.</span>
    </div>
    <div class="te-field">
      <label for="te-writeQps">Write QPS</label>
      <input id="te-writeQps" name="writeQps" type="number" min="0" step="100" value="5000">
      <span class="te-help">Sustained set/clear operations per second.</span>
    </div>
    <div class="te-field">
      <label for="te-dataTB">Total data size (TB)</label>
      <input id="te-dataTB" name="dataTB" type="number" min="0" step="0.1" value="1">
      <span class="te-help">Logical (pre-replication) dataset size.</span>
    </div>
  </div>

  <h3>Cluster</h3>
  <div class="te-grid">
    <div class="te-field">
      <label for="te-redundancy">Redundancy mode</label>
      <select id="te-redundancy" name="redundancy">
        <option value="single">single</option>
        <option value="double">double</option>
        <option value="triple" selected>triple</option>
        <option value="three_data_hall">three_data_hall</option>
        <option value="three_datacenter">three_datacenter</option>
      </select>
      <span class="te-help">Drives replication factor and coordinator count.</span>
    </div>
    <div class="te-field">
      <label for="te-engine">Storage engine</label>
      <select id="te-engine" name="engine">
        <option value="ssd">ssd (SQLite B-tree)</option>
        <option value="ssd-redwood-v1" selected>ssd-redwood-v1</option>
        <option value="ssd-rocksdb-v1">ssd-rocksdb-v1</option>
        <option value="memory">memory</option>
      </select>
      <span class="te-help">Per-process throughput baselines come from this.</span>
    </div>
    <div class="te-field">
      <label for="te-logsRatio">SS : T-log ratio</label>
      <input id="te-logsRatio" name="logsRatio" type="number" min="1" max="32" step="1" value="12">
      <span class="te-help">8 (OpenAI) – 12 (default) – 16-20 (Apple).</span>
    </div>
    <div class="te-field">
      <label>Workload hint</label>
      <div class="te-radio-row">
        <label><input type="radio" name="workloadHint" value="read-heavy"> Read-heavy</label>
        <label><input type="radio" name="workloadHint" value="mixed" checked> Mixed</label>
        <label><input type="radio" name="workloadHint" value="write-heavy"> Write-heavy</label>
      </div>
      <span class="te-help">Bumps GRV-proxy floor for read-heavy workloads.</span>
    </div>
  </div>
</form>

<div class="te-card">
  <h3>Recommended topology</h3>
  <div id="te-results" class="te-results"></div>
</div>

<div class="te-card">
  <h3>Apply this configuration</h3>
  <p>Live-updated <code>fdbcli</code> snippet derived from the recommendations above. Review it carefully before applying to a live cluster — <code>configure new</code> is destructive.</p>
  <div class="te-cli">
    <pre><code id="te-cli-code" class="language-shell">loading…</code></pre>
  </div>
</div>
</div>

## How sizing works

The calculator above is driven by a small set of per-role rules. Each section below explains the rule, what limits it in practice, and when to add more.

### Inputs that drive sizing

| Input | Drives |
|-------|--------|
| Read QPS | Storage processes (read side), GRV proxies |
| Write QPS | Storage processes (write side), commit proxies, resolvers, T-log fan-in |
| Total data size | Storage process count (data-per-SS target), per-SS RAM (byte sample) |
| Redundancy mode | Replication factor, coordinator count, RAM × replicas |
| Storage engine | Per-process throughput baselines (SSD vs memory) |
| SS : T-log ratio | T-log process count |
| Workload hint | GRV-proxy floor (read-heavy ⇒ ≥ 3) |



### Role data flow

```mermaid
flowchart LR
    Client([Clients])
    GRV[GRV proxies]
    CP[Commit proxies]
    Res[Resolvers]
    TL[Transaction logs]
    SS[Storage servers]
    Coord[Coordinators]

    Client -->|GetReadVersion| GRV
    GRV -->|read version| Client
    Client -->|reads| SS
    Client -->|commits| CP
    CP -->|conflict check| Res
    CP -->|commit batch| TL
    TL -->|persist mutations| SS
    Coord -.->|cluster file / leadership| GRV
    Coord -.-> CP
    Coord -.-> TL
```

### Storage servers { #sizing-storage }

**Rule of thumb.** One `fdbserver` storage process saturates around **55K reads/s** or **20K writes/s** on SSD/Redwood, and roughly **90K reads/s** or **35K writes/s** on the memory engine. Plan for ≤ **500 GB of replicated data per process** so data distribution and recovery stay quick.

The calculator picks the larger of the throughput-based and data-based requirements, multiplied by the replication factor:

```text
ss_throughput = ceil(max(read_qps/per_proc_reads, write_qps/per_proc_writes) × 1.5) × RF
ss_data       = ceil(data_GB × RF / 500)
storage_processes = max(ss_throughput, ss_data, RF × 2)
```

**What limits it.** Disk IOPS, fsync latency, and CPU on the SS process. SSDs hit fsync ceilings before CPU does on write-heavy workloads.

**When to add more.** Sustained `data_lag_seconds > 5`, `storage_queue` consistently > 100 MB, or `data_distribution_queue_length > 0` for long stretches.

!!! tip "1–3 SSes per disk"
    Modern NVMe can host 2 SSes per disk; high-IOPS network block storage 1–2; low-IOPS block storage 1. Each SS needs its own disk path so writes don't queue against each other.

### Transaction logs { #sizing-tlogs }

**Rule of thumb.** **One T-log per host** on dedicated `class=transaction` nodes. The SS:T-log ratio sits between Apple's relaxed **1:16–20** and OpenAI's aggressive **1:8** — the calculator defaults to **1:12**.

```text
logs = max(3, ceil(storage_processes / SS_to_TLog_ratio))
```

**What limits it.** Group-commit fsync latency on the T-log disk. T-logs are **disk-IOPS bound**, not capacity bound. Co-locating two T-logs on the same disk halves throughput; keep one T-log per disk and one per host.

**When to add more.** `commit_latency` rises and `tlog_queue_size` climbs while disk fsync latency is healthy → fan-in is the bottleneck. Spread reads across more T-logs.

!!! warning "Diminishing returns past 15 T-logs"
    Snowflake's operators report negligible throughput gains beyond ~15 T-logs in a single log set. Past that point, evaluate sharding the workload across multiple clusters before adding more T-logs.

### Commit proxies { #sizing-commit-proxies }

**Rule of thumb.** Default to **3** commit proxies (Apple's baseline). The calculator scales by write QPS:

```text
commit_proxies = max(3, ceil(write_qps / 50000))
```

**What limits it.** Commit-batch CPU and network bandwidth on each proxy. Each commit proxy adds latency overhead even when idle, so don't over-provision.

**When to add more.** `commit_latency` rises while `tlog_queue_size` is healthy and `resolver_queue` is short — the proxies themselves are the bottleneck.

### GRV proxies { #sizing-grv-proxies }

**Rule of thumb.** Default **1** proxy; **3** for read-heavy workloads. Cluster-wide GRV throughput saturates around **400K/s**, so adding more than ~3–4 GRV proxies rarely helps.

```text
grv_proxies = max(1, ceil(read_qps / 200000))
# read-heavy hint bumps the floor to 3
```

**What limits it.** Single-master `getReadVersion` serialization. Adding GRV proxies parallelises the GRV path but the underlying master still has to mint version numbers serially.

**When to add more.** `read_version_batch_size` is high or clients see GRV latency growing while master CPU is moderate.

### Resolvers { #sizing-resolvers }

**Rule of thumb.** Default **1**. The community guidance is "have one, that is it" unless profiling proves otherwise.

```text
resolvers = max(1, ceil(write_qps / 80000))
```

**What limits it.** Conflict-set memory and CPU. Each resolver owns a key range; **more resolvers can increase false conflicts** because keys from one transaction can hash across multiple resolvers and trigger spurious aborts.

**When to add more.** `resolver_queue` is consistently long and CPU on the single resolver is pegged. Rarely needs more than 4.

### Coordinators { #sizing-coordinators }

**Rule of thumb.** Use an **odd** number of coordinators in **distinct failure domains** (racks, AZs, datacenters):

| Redundancy | Coordinators |
|------------|--------------|
| `single` | 1 |
| `double` | 3 |
| `triple` | 5 |
| `three_data_hall` | 9 |
| `three_datacenter` | 9 |

Coordinators don't sit on the hot path — their latency does not affect normal transactions. Their job is to maintain a Paxos-like quorum on the cluster's coordination state.

### Stateless processes

Reserve a small pool of `class=stateless` processes for the cluster controller, master, commit proxies, GRV proxies, resolvers, plus a couple of standby slots and any log routers you run. The kubernetes-operator [scaling guide](https://github.com/FoundationDB/fdb-kubernetes-operator/blob/main/docs/manual/scaling.md) recommends:

```text
stateless_slots ≈ commit_proxies + grv_proxies + resolvers + 4
```

The `+ 4` covers cluster controller, master, and two warm standbys.

### Machines { #sizing-machines }

The calculator splits machines into three classes:

| Class | Count |
|-------|-------|
| `transaction` (one T-log per host) | = `logs` |
| `storage` (≤ 8 cores per host) | `ceil(storage / 8)` |
| `stateless` | `ceil((cp + grv + res + 4) / 8)` |

RAM budget per process is **4 GB** (per `foundationdb.conf` defaults), with **25% headroom** for OS, page cache, and byte-sample memory inside the storage process.

## Replication factor implications

| Redundancy mode | Replication factor (storage) | T-log replication | Coordinators | Notes |
|-----------------|------------------------------|-------------------|--------------|-------|
| `single` | 1 | 1 | 1 | Dev only — no fault tolerance. |
| `double` | 2 | 2 | 3 | Single-machine failure. |
| `triple` | 3 | 3 | 5 | Default for production. |
| `three_data_hall` | 3 (across 3 data halls) | 4 | 9 | Survives loss of one data hall. |
| `three_datacenter` | 6 (3 × 2 sites) | 6 | 9 | Highest cost, multi-region. |

Replication multiplies storage cost (bytes-on-disk and SS RAM) but does **not** multiply write QPS — the calculator already accounts for replication when sizing storage processes.

## Process-class layout patterns

Layouts borrowed from operator playbooks (see [semisol's blog](https://semisol.dev/blog/fdb-tuning) and the [kubernetes-operator scaling guide](https://github.com/FoundationDB/fdb-kubernetes-operator/blob/main/docs/manual/scaling.md)):

=== "Tiny (dev / staging)"

    | Hosts | Roles per host |
    |-------|----------------|
    | 3 | 1 × stateless + 1 × log + 2 × storage, all `class=unset` |

    Use `single` or `double` redundancy. One process per role, all on the same machine class.

=== "Small (1–4 TB)"

    | Hosts | Roles per host |
    |-------|----------------|
    | 3 transaction | 1 × T-log, `class=transaction` |
    | 3 stateless   | cluster controller / master / proxies / resolver, `class=stateless` |
    | N storage     | up to 8 × SS, `class=storage` |

    Triple redundancy. Coordinators co-locate on stateless or transaction machines in distinct failure domains.

=== "Medium / large (10+ TB)"

    | Hosts | Roles per host |
    |-------|----------------|
    | 5–15 transaction | 1 × T-log per host |
    | 3+ stateless     | dedicated, scaled with proxy count |
    | many storage     | one disk = 1–2 SS, ≤ 8 SS per host |

    Triple or three_data_hall. Add transaction-class hosts before commit proxies — most "throughput is too low" issues are T-log fan-in, not proxy count.

## Real-world data points

| Operator | Approx workload | Storage | T-logs | Commit proxies | GRV proxies | Notes |
|----------|-----------------|---------|--------|----------------|-------------|-------|
| **OpenAI** | ~60K mixed QPS, 100 TB, triple | ~400 SS | ~49 | ~49 | — | Aggressive 1:8 SS:T-log ratio; high CP count to keep commit latency low. |
| **Apple** | Production clusters, triple | varies | 1:16–1:20 of SS count | 3 | 3 | Relaxed log:SS ratio; conservative proxy counts. |
| **Snowflake** | High-throughput | varies | capped at ~15 | varies | varies | Reports diminishing T-log returns past 15 in a single log set. |

!!! note "Calculator vs reality"
    The calculator's defaults sit between Apple's relaxed ratios and OpenAI's aggressive ones. For the OpenAI sanity case (24K writes / 36K reads / 100 TB / triple) the model lands in the right order of magnitude on storage and T-logs, but recommends fewer commit proxies than OpenAI runs in production — real-world commit-proxy scaling is bound by per-CP commit-batch CPU well below the 50K writes/CP heuristic. Treat the model as a floor; profile the cluster and add proxies as `commit_latency` warrants.

## Sources

- [FoundationDB Configuration](https://apple.github.io/foundationdb/configuration.html) — Apple's official configuration guide (redundancy modes, storage engines, process classes).
- [FoundationDB Architecture](https://apple.github.io/foundationdb/architecture.html) — role breakdown for proxies, resolvers, T-logs, storage servers.
- [FoundationDB Performance](https://apple.github.io/foundationdb/performance.html) — published per-process throughput numbers.
- [Forum: Scaling log server and log to storage ratio](https://forums.foundationdb.org/t/scaling-log-server-and-log-to-storage-ratio/4890) — Apple, OpenAI, and Snowflake operators discuss SS:T-log ratios.
- [Forum: How to troubleshoot throughput / performance degrade](https://forums.foundationdb.org/t/how-to-troubleshoot-throughput-performance-degrade/1436) — diagnosing CP / T-log / SS bottlenecks in practice.
- [fdb-kubernetes-operator scaling guide](https://github.com/FoundationDB/fdb-kubernetes-operator/blob/main/docs/manual/scaling.md) — process-class slot accounting and stateless minimum.
- [semisol — FoundationDB tuning](https://semisol.dev/blog/fdb-tuning) — practical layout patterns and proxy/resolver tuning notes.
