---
title: Monitoring
description: Monitor FoundationDB cluster health and performance
---

# Monitoring

FoundationDB provides comprehensive built-in monitoring capabilities. This guide covers the status command, machine-readable status JSON, key metrics, and integration with external monitoring systems.

## Status Command

The `fdbcli` status command provides human-readable cluster health information.

### Basic Status

```bash
fdb> status
```

Output includes cluster configuration, health state, and key performance metrics.

### Detailed Status

```bash
fdb> status details
```

Shows per-process information and detailed role assignments.

### Minimal Status

```bash
fdb> status minimal
```

Returns only the cluster health state—useful for scripting.

### JSON Status

```bash
fdb> status json
```

Returns the machine-readable status in JSON format.

### Example Status Output

```
Using cluster file `/etc/foundationdb/fdb.cluster'.

Configuration:
  Redundancy mode        - triple
  Storage engine         - ssd-2
  Coordinators           - 5
  Usable Regions         - 1

Cluster:
  FoundationDB processes - 15
  Zones                  - 5
  Machines               - 5
  Memory availability    - 6.1 GB per process on machine with least available
  Fault Tolerance        - 2 machines
  Server time            - 02/03/25 09:32:01

Data:
  Replication health     - Healthy
  Moving data            - 0.000 GB
  Sum of key-value sizes - 234.5 GB
  Disk space used        - 456.2 GB

Operating space:
  Storage server         - 1.2 TB free on most full server
  Log server             - 967.3 GB free on most full server

Workload:
  Read rate              - 12543 Hz
  Write rate             - 3421 Hz
  Transactions started   - 8234 Hz
  Transactions committed - 2156 Hz
  Conflict rate          - 12 Hz

Backup and DR:
  Running backups        - 1
  Running DRs            - 0
```

## Machine-Readable Status

Access the complete cluster status programmatically using the special key `\xFF\xFF/status/json`.

### Accessing via Client API

=== "Python"
    ```python
    import fdb
    import json

    fdb.api_version(730)
    db = fdb.open()

    @fdb.transactional
    def get_status(tr):
        return tr[b'\xff\xff/status/json']

    status = json.loads(get_status(db))
    print(f"Cluster healthy: {status['client']['database_status']['healthy']}")
    ```

=== "Go"
    ```go
    status, err := db.ReadTransact(func(tr fdb.ReadTransaction) (interface{}, error) {
        return tr.Get(fdb.Key("\xff\xff/status/json")).Get()
    })
    ```

=== "Java"
    ```java
    byte[] statusBytes = db.read(tr -> tr.get(new byte[]{(byte)0xff, (byte)0xff, ...}).join());
    String statusJson = new String(statusBytes, StandardCharsets.UTF_8);
    ```

### Key Status Fields

The JSON status contains these major sections:

| Section | Description |
|---------|-------------|
| `client` | Client configuration and database status |
| `cluster` | Cluster-wide configuration and state |
| `cluster.processes` | Per-process details and roles |
| `cluster.data` | Data distribution and replication state |
| `cluster.workload` | Real-time performance metrics |
| `cluster.qos` | Quality of service metrics |
| `cluster.latency_probe` | Latency measurements |
| `cluster.layers` | Layer-specific status (backup, etc.) |

### Checking Cluster Health

```python
def is_cluster_healthy(status):
    """Check if cluster is operating normally."""
    return (
        status.get('client', {}).get('database_status', {}).get('healthy', False) and
        status.get('cluster', {}).get('data', {}).get('state', {}).get('healthy', False)
    )
```

### Database Available States

| State | Description |
|-------|-------------|
| `available` | Database is accepting reads and writes |
| `read_only` | Database only accepts reads (recovery mode) |
| `unavailable` | Database is not accepting connections |

### Data State Values

| State | Meaning |
|-------|---------|
| `healthy` | All data replicated to desired level |
| `healing` | Recovering lost replicas |
| `healthy_repartitioning` | Healthy, redistributing data |
| `healthy_removing_server` | Healthy, removing excluded server |
| `healthy_rebalancing` | Healthy, balancing data across servers |

## Key Metrics

### Performance Metrics

| Metric | Path in JSON | Target | Alert Threshold |
|--------|--------------|--------|-----------------|
| Read rate | `cluster.workload.operations.reads.hz` | Varies | Baseline ±50% |
| Write rate | `cluster.workload.operations.writes.hz` | Varies | Baseline ±50% |
| Commit rate | `cluster.workload.transactions.committed.hz` | Varies | - |
| Conflict rate | `cluster.workload.transactions.conflicted.hz` | < 1% of commits | > 5% |

### Latency Metrics

| Metric | Path in JSON | Target | Alert Threshold |
|--------|--------------|--------|-----------------|
| Commit latency (p50) | `cluster.latency_probe.commit_seconds` | < 25ms | > 100ms |
| Read latency | `cluster.latency_probe.read_seconds` | < 5ms | > 50ms |
| Transaction start | `cluster.latency_probe.transaction_start_seconds` | < 5ms | > 25ms |

### Capacity Metrics

| Metric | Path in JSON | Alert Threshold |
|--------|--------------|-----------------|
| Storage space free | `cluster.data.total_disk_used_bytes` vs capacity | < 20% free |
| Memory available | `cluster.processes.*.memory.available_bytes` | < 1GB per process |
| Moving data | `cluster.data.moving_data.in_flight_bytes` | Sustained > 10GB |

### Server-Side Latency Bands

FoundationDB tracks latency distributions for read and commit operations. Access via:

```
cluster.latency_probe.batch_priority_transaction_start_seconds
cluster.latency_probe.immediate_priority_transaction_start_seconds
cluster.latency_probe.commit_seconds
cluster.latency_probe.read_seconds
```

The `latency_statistics` feature provides percentile breakdowns when enabled.

## Process Monitoring

### Process Roles

Each process reports its assigned roles:

| Role | Description |
|------|-------------|
| `storage` | Stores key-value data |
| `log` | Transaction log |
| `commit_proxy` | Handles commit requests |
| `grv_proxy` | Handles read version requests |
| `resolver` | Conflict resolution |
| `master` | Cluster coordination |
| `cluster_controller` | Manages role assignments |
| `coordinator` | Coordination service |

### Process Health Indicators

```python
def check_process_health(process):
    """Check individual process health."""
    issues = []

    # Check memory
    mem = process.get('memory', {})
    if mem.get('available_bytes', 0) < 1_000_000_000:  # 1GB
        issues.append('low_memory')

    # Check disk
    disk = process.get('disk', {})
    if disk.get('free_bytes', 0) < 10_000_000_000:  # 10GB
        issues.append('low_disk')

    # Check CPU
    cpu = process.get('cpu', {})
    if cpu.get('usage_cores', 0) > 0.95 * cpu.get('cores', 1):
        issues.append('high_cpu')

    return issues
```

### Excluded Servers

Monitor excluded servers that are being drained:

```python
excluded = status.get('cluster', {}).get('excluded_servers', [])
for server in excluded:
    print(f"Excluded: {server['address']}")
```

## Fault Tolerance

### Current Fault Tolerance

Check how many failures the cluster can survive:

```python
fault_tolerance = status['cluster']['fault_tolerance']
print(f"Can lose {fault_tolerance['max_zone_failures_without_losing_data']} zones")
print(f"Can lose {fault_tolerance['max_zone_failures_without_losing_availability']} zones and stay available")
```

### Recovery State

| State | Description |
|-------|-------------|
| `fully_recovered` | Normal operation |
| `waiting_for_new_tlogs` | Waiting for transaction log servers |
| `accepting_commits` | Recovery accepting new commits |
| `all_logs_recruited` | Logs assigned, finalizing recovery |

## Monitoring Backup Status

Access backup status through the layers section:

```python
backup_status = status.get('cluster', {}).get('layers', {}).get('backup', {})
if backup_status:
    for tag, info in backup_status.get('tags', {}).items():
        print(f"Backup {tag}: {info.get('current_status')}")
        print(f"  Last restorable: {info.get('last_restorable_version')}")
```

## Alerting Recommendations

### Critical Alerts

| Condition | Check | Action |
|-----------|-------|--------|
| Database unavailable | `!client.database_status.available` | Page on-call |
| Data not fully replicated | `!cluster.data.state.healthy` | Investigate immediately |
| No fault tolerance | `fault_tolerance.max_zone_failures_without_losing_data == 0` | Add capacity |

### Warning Alerts

| Condition | Check | Action |
|-----------|-------|--------|
| High conflict rate | `conflicted.hz / committed.hz > 0.05` | Review application logic |
| Low disk space | `< 20% free on any server` | Add storage or clean up |
| High latency | `commit_seconds > 0.1` | Investigate workload |
| Sustained data movement | `moving_data.in_flight_bytes > 10GB for 30min` | Check for excluded servers |

### Example Alerting Script

```python
#!/usr/bin/env python3
import fdb
import json
import sys

fdb.api_version(730)
db = fdb.open()

@fdb.transactional
def get_status(tr):
    return json.loads(tr[b'\xff\xff/status/json'])

status = get_status(db)

# Check critical conditions
if not status['client']['database_status']['available']:
    print("CRITICAL: Database unavailable")
    sys.exit(2)

if not status['cluster']['data']['state']['healthy']:
    print("CRITICAL: Data not healthy - " + status['cluster']['data']['state']['name'])
    sys.exit(2)

# Check warnings
fault_tolerance = status['cluster']['fault_tolerance']['max_zone_failures_without_losing_data']
if fault_tolerance == 0:
    print("WARNING: No fault tolerance")
    sys.exit(1)

workload = status['cluster']['workload']['transactions']
if workload['committed']['hz'] > 0:
    conflict_rate = workload['conflicted']['hz'] / workload['committed']['hz']
    if conflict_rate > 0.05:
        print(f"WARNING: High conflict rate {conflict_rate:.1%}")
        sys.exit(1)

print("OK: Cluster healthy")
sys.exit(0)
```

## Prometheus Integration

### Using fdb-prometheus-exporter

Export FoundationDB metrics to Prometheus:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'foundationdb'
    static_configs:
      - targets: ['localhost:8080']
    scrape_interval: 15s
```

### Key Prometheus Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `fdb_cluster_available` | Gauge | 1 if cluster available |
| `fdb_cluster_healthy` | Gauge | 1 if cluster healthy |
| `fdb_workload_reads_hz` | Gauge | Read operations per second |
| `fdb_workload_writes_hz` | Gauge | Write operations per second |
| `fdb_workload_commits_hz` | Gauge | Commits per second |
| `fdb_latency_commit_seconds` | Gauge | Commit latency |
| `fdb_storage_used_bytes` | Gauge | Total storage used |

## Grafana Dashboards

### Recommended Dashboard Panels

1. **Cluster Health** - Overall status indicator
2. **Throughput** - Reads, writes, commits over time
3. **Latency** - Commit and read latency percentiles
4. **Data Distribution** - Storage per server, moving data
5. **Fault Tolerance** - Current redundancy level
6. **Process Health** - Memory, CPU, disk per process

### Sample Grafana Query

```promql
# Commit latency p99
histogram_quantile(0.99, fdb_commit_latency_seconds_bucket)

# Conflict rate percentage
(fdb_workload_conflicted_hz / fdb_workload_committed_hz) * 100
```

## Trace Files

FoundationDB servers write detailed trace files in XML format.

### Trace File Location

| Platform | Default Path |
|----------|--------------|
| Linux | `/var/log/foundationdb/` |
| macOS | `/usr/local/var/log/foundationdb/` |

### Trace File Contents

Trace files contain:

- Transaction timing information
- Error events and stack traces
- Performance metrics
- Role transitions
- Network events

### Analyzing Trace Files

```bash
# Find errors in trace files
grep -h "Severity=\"40\"" /var/log/foundationdb/trace*.xml

# Find warnings
grep -h "Severity=\"30\"" /var/log/foundationdb/trace*.xml
```

## Next Steps

- Configure [Backup & Recovery](backup.md) for data protection
- Review [Troubleshooting](troubleshooting.md) for common issues
- See [Configuration](configuration.md) for cluster tuning

