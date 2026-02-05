---
title: Troubleshooting
description: Diagnose and resolve common FoundationDB issues
---

# Troubleshooting

This guide helps you diagnose and resolve common issues with FoundationDB. It covers cluster status interpretation, diagnostic commands, log analysis, and recovery procedures.

## Quick Diagnostics

### First Steps

When experiencing issues, start with these commands:

```bash
# Check if service is running
systemctl status foundationdb

# Verify cluster connectivity
fdbcli --exec "status"

# Check detailed status
fdbcli --exec "status details"

# Get JSON status for scripts
fdbcli --exec "status json"
```

### Status Summary Interpretation

| Status Message | Meaning | Urgency |
|----------------|---------|---------|
| `Healthy` | Normal operation | None |
| `Healthy (Rebalancing)` | Moving data between servers | Low |
| `Healing` | Recovering from failure | Medium |
| `Unavailable` | Database not accepting requests | **Critical** |
| `Recovery in progress` | Cluster recovering | Medium |

## Common Issues

### Cluster Not Reachable

**Symptoms:**
- Clients timeout on connection
- `fdbcli` hangs or reports "Unable to locate..."
- Application errors mentioning connection

**Diagnostic Steps:**

```bash
# 1. Check if fdbserver processes are running
ps aux | grep fdbserver

# 2. Verify fdbmonitor is running
systemctl status foundationdb

# 3. Check cluster file
cat /etc/foundationdb/fdb.cluster

# 4. Test coordinator connectivity
for addr in $(grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+:[0-9]+' /etc/foundationdb/fdb.cluster); do
  nc -zv ${addr%:*} ${addr#*:} 2>&1
done
```

**Solutions:**

| Cause | Solution |
|-------|----------|
| Processes not running | `systemctl restart foundationdb` |
| Wrong cluster file | Verify file matches coordinators |
| Firewall blocking | Open port 4500 (or configured port) |
| Network partition | Check network connectivity between nodes |
| All coordinators down | Restore coordinator machines first |

### Database Unavailable

**Symptoms:**
- `status` shows "Unavailable"
- Clients receive unavailable errors
- No transactions completing

**Diagnostic Steps:**

```bash
fdb> status details
```

Look for:
- Missing processes
- Insufficient fault tolerance
- Recovery state issues

**Common Causes and Solutions:**

| Cause | Status Indicator | Solution |
|-------|------------------|----------|
| Too few coordinators | "Unable to communicate with quorum" | Restore coordinators or `coordinators auto` |
| Insufficient machines | "Zone failures exceed configured" | Add machines or reduce redundancy |
| All logs lost | "Recovery requires all logs" | Restore from backup (data loss likely) |
| Network partition | Some processes unreachable | Fix network connectivity |

### High Conflict Rate

**Symptoms:**
- Many transaction retries
- Slow perceived performance
- `status` shows high conflict rate

**Diagnostic Steps:**

```bash
fdb> status
# Check "Conflict rate" in Workload section

# Get detailed metrics
fdb> status json | jq '.cluster.workload.transactions'
```

**Solutions:**

1. **Reduce transaction scope** - Read/write fewer keys per transaction
2. **Avoid hot keys** - Distribute load across key ranges
3. **Use read snapshots** - For read-only portions of transactions
4. **Optimize retry logic** - Implement exponential backoff

**Example - Using Snapshot Reads:**
```python
@fdb.transactional
def read_with_snapshot(tr):
    # Use snapshot read for non-conflicting reads
    value = tr.snapshot[key]
    return value
```

### High Latency

**Symptoms:**
- Slow transactions
- Commit latency > 100ms
- Read latency > 50ms

**Diagnostic Steps:**

```bash
fdb> status
# Check latency_probe section in JSON status
fdb> status json | jq '.cluster.latency_probe'
```

**Common Causes:**

| Cause | Indicator | Solution |
|-------|-----------|----------|
| Overloaded storage | High disk usage, queue depth | Add storage servers |
| Network latency | High ping times between nodes | Check network infrastructure |
| Large transactions | Large read/write sets | Break into smaller transactions |
| GRV contention | High GRV queue | Add grv_proxies |
| Commit contention | High commit queue | Add commit_proxies, logs |

**Tuning Commands:**
```bash
fdb> configure grv_proxies=4
fdb> configure commit_proxies=6
fdb> configure logs=8
```

### Storage Space Issues

**Symptoms:**
- "Storage is filling up" warnings
- Write failures
- Cluster marked unhealthy

**Diagnostic Steps:**

```bash
fdb> status details
# Check "Storage server" free space

# Per-process disk usage
fdb> status json | jq '.cluster.processes | to_entries[] | {address: .value.address, disk_free: .value.disk.free_bytes}'
```

**Solutions:**

1. **Add storage capacity** - Add new machines with storage class
2. **Delete data** - Remove old data ranges if applicable
3. **Exclude full machines** - Move data off problematic servers

```bash
# Exclude a full storage server
fdb> exclude 10.0.4.5:4500
# Wait for data to move, then remove machine
fdb> status details  # Verify data moved
```

### Process Failures

**Symptoms:**
- Individual process crashes
- Reduced fault tolerance
- "Zone failures" in status

**Diagnostic Steps:**

```bash
# Check process logs
tail -f /var/log/foundationdb/trace*.xml

# Find crash signatures
grep -i "fatal\|crash\|segfault" /var/log/foundationdb/trace*.xml

# Check recent process restarts
grep "ProcessStart" /var/log/foundationdb/trace*.xml | tail -20
```

**Common Process Issues:**

| Error Pattern | Cause | Solution |
|---------------|-------|----------|
| Out of memory | Memory limit exceeded | Increase `memory` in conf |
| Segfault | Bug or corruption | Update to latest version |
| Disk I/O error | Storage failure | Check disk health, replace |
| Too many open files | FD limit | Increase ulimit |

### Coordinator Issues

**Symptoms:**
- "Unable to communicate with quorum"
- Slow cluster startup
- Connection instability

**Diagnostic Steps:**

```bash
# List current coordinators
fdb> coordinators

# Check coordinator connectivity from each node
for coord in $(fdbcli --exec "coordinators" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+:[0-9]+'); do
  echo "Testing $coord"
  nc -zv ${coord%:*} ${coord#*:}
done
```

**Solutions:**

```bash
# Change coordinators to available machines
fdb> coordinators 10.0.4.1:4500 10.0.4.2:4500 10.0.4.3:4500

# Or let FDB choose automatically
fdb> coordinators auto
```

!!! warning
    Coordinator changes require a majority of current coordinators to be reachable.

## Diagnostic Commands Reference

### fdbcli Status Commands

| Command | Description |
|---------|-------------|
| `status` | Human-readable summary |
| `status details` | Per-process details |
| `status minimal` | One-line health check |
| `status json` | Machine-readable status |

### fdbcli Investigation Commands

```bash
# Get range of keys
fdb> getrange \xff\x02/processClass/ \xff\x02/processClass0

# Check data distribution
fdb> datadistribution on

# View configuration
fdb> configure

# Kill and recover a process (simulate failure)
fdb> kill; kill 10.0.4.1:4500; status

# Check version
fdb> getversion

# Profile transactions
fdb> profile client set 1.0 10000

# Throttle tags
fdb> throttle on tag mytag
```

### System Key Ranges

| Key Range | Contents |
|-----------|----------|
| `\xff\x02/processClass/` | Process class assignments |
| `\xff\x02/conf/` | Cluster configuration |
| `\xff/serverList/` | Server list |
| `\xff\xff/status/json` | Status JSON (special key) |

## Log Analysis

### Trace File Location

| Platform | Path |
|----------|------|
| Linux | `/var/log/foundationdb/` |
| macOS | `/usr/local/var/log/foundationdb/` |

### Trace File Format

Trace files are XML with entries containing:
- `Time` - Event timestamp
- `Type` - Event type
- `Severity` - 10 (info), 20 (debug), 30 (warn), 40 (error)
- Various event-specific fields

### Searching Trace Files

```bash
# Find all errors
grep 'Severity="40"' /var/log/foundationdb/trace*.xml

# Find warnings
grep 'Severity="30"' /var/log/foundationdb/trace*.xml

# Find specific event types
grep 'Type="MachineRecovery"' /var/log/foundationdb/trace*.xml

# Recent crashes
grep -i "crash\|fatal\|segfault\|abort" /var/log/foundationdb/trace*.xml

# Connection issues
grep 'Type="ConnectionTimedOut\|ConnectionFailed"' /var/log/foundationdb/trace*.xml
```

### Important Event Types

| Event Type | Meaning |
|------------|---------|
| `MachineRecovery` | Machine rejoined cluster |
| `RecoveryComplete` | Cluster recovery finished |
| `SlowTransaction` | Transaction exceeded threshold |
| `ConnectionTimedOut` | Network timeout |
| `StorageServerFailure` | Storage server stopped |
| `CommitProxyTerminated` | Proxy process ended |

### Log Rotation

Control log file size in `foundationdb.conf`:

```ini
[fdbserver]
logsize = 10MiB       # Roll at 10MB
maxlogssize = 100MiB  # Keep up to 100MB total
```

## Recovery Procedures

### Recovering from Machine Failure

1. **Check current state:**
   ```bash
   fdb> status details
   ```

2. **If fault tolerance > 0:** Wait for automatic recovery

3. **If fault tolerance = 0:**
   - Add replacement machine
   - Or exclude failed machine to redistribute

```bash
# Exclude failed machine
fdb> exclude 10.0.4.5

# Monitor recovery
fdb> status details
# Wait for "Moving data" to reach 0

# Remove exclusion after machine replaced
fdb> include 10.0.4.5
```

### Recovering from Quorum Loss

If majority of coordinators are lost:

1. **With surviving minority:**
   ```bash
   # Force new coordinator set (requires manual intervention)
   fdbcli -C /path/to/fdb.cluster \
     --exec "coordinators 10.0.4.1:4500 10.0.4.2:4500 10.0.4.3:4500 description=recovery_cluster"
   ```

2. **If all coordinators lost:** Restore from backup

### Forcing Recovery (Last Resort)

!!! danger "Data Loss Warning"
    Force recovery can result in data loss. Only use when normal recovery fails.

```bash
# Emergency force recovery
fdb> force_recovery_with_data_loss
```

### Restoring from Backup

See [Backup & Recovery](backup.md) for detailed restore procedures.

```bash
# Check available backups
fdbbackup describe -d file:///backup/fdb

# Restore to empty cluster
fdbrestore start -r file:///backup/fdb -C /etc/foundationdb/fdb.cluster
```

## Performance Troubleshooting

### Identifying Bottlenecks

```bash
# Get status JSON and analyze
fdb> status json

# Key metrics to check:
# - cluster.workload.operations - throughput
# - cluster.latency_probe - latencies
# - cluster.processes.*.disk.busy - disk utilization
# - cluster.processes.*.cpu.usage_cores - CPU usage
# - cluster.qos - throttling state
```

### Storage Server Bottlenecks

**Indicators:**
- High disk queue depth
- `disk.busy` near 1.0
- High read/write latencies

**Solutions:**
```bash
# Add storage servers
fdb> setclass 10.0.4.6:4500 storage

# Or exclude overloaded servers
fdb> exclude 10.0.4.5:4500
```

### Proxy Bottlenecks

**Indicators:**
- High commit latency
- GRV latency spikes
- Proxy queues backing up

**Solutions:**
```bash
fdb> configure commit_proxies=6
fdb> configure grv_proxies=4
```

### Transaction Log Bottlenecks

**Indicators:**
- Slow commits despite low storage load
- Log server disk fully busy

**Solutions:**
```bash
fdb> configure logs=8
```

## Cluster Maintenance

### Graceful Machine Removal

```bash
# 1. Exclude the machine
fdb> exclude 10.0.4.5:4500 10.0.4.5:4501

# 2. Monitor data movement
fdb> status
# Wait for "Moving data" to reach 0

# 3. Stop services on excluded machine
sudo systemctl stop foundationdb

# 4. Optionally include again if returning
fdb> include 10.0.4.5:4500 10.0.4.5:4501
```

### Rolling Restart

Restart processes one at a time without downtime:

```bash
# On each machine in sequence:
sudo systemctl restart foundationdb
# Wait for status to show healthy before proceeding
fdbcli --exec "status minimal"
```

### Upgrading FoundationDB

Upgrading a FoundationDB cluster requires careful planning to minimize downtime and maintain data integrity. Follow this comprehensive guide to perform production upgrades safely.

!!! tip "Version Documentation"
    See [Version Overview](../getting-started/versions.md) for version-specific features, upgrade paths, and compatibility notes.

#### Pre-Upgrade Checklist

Before starting an upgrade, complete this checklist:

=== "Compatibility"

    - [ ] **Verify upgrade path** - Check [supported upgrade paths](../getting-started/versions.md#upgrade-paths)
    - [ ] **Review breaking changes** - Check version-specific notes below
    - [ ] **Client compatibility** - Ensure client libraries match target version
    - [ ] **API version** - Confirm your application's API version is supported
    - [ ] **Test environment** - Validate upgrade in staging first

=== "Backups"

    - [ ] **Full backup** - Complete a full backup before upgrading
    - [ ] **Verify backup** - Confirm backup is restorable
    - [ ] **Backup location** - Ensure backup storage is accessible
    - [ ] **DR cluster** - If using DR, verify secondary is up to date

=== "Infrastructure"

    - [ ] **Cluster health** - Verify `status` shows "Healthy"
    - [ ] **Fault tolerance** - Confirm fault tolerance ≥ 1
    - [ ] **No moving data** - Wait for data movement to complete
    - [ ] **Disk space** - Ensure 20%+ free space on all nodes
    - [ ] **Maintenance window** - Schedule appropriate downtime

```bash
# Pre-upgrade health check script
echo "=== Pre-Upgrade Health Check ==="

# Check cluster status
fdbcli --exec "status"

# Verify fault tolerance
fdbcli --exec "status json" | jq '.cluster.fault_tolerance'

# Check for data movement
fdbcli --exec "status json" | jq '.cluster.data.moving_data'

# Verify all processes are healthy
fdbcli --exec "status details"

# Note current version
fdbcli --version
```

#### Upgrade Procedure

##### Step 1: Install Updated Client Binaries

For non-patch upgrades, install new client binaries on all client machines first:

```bash
# Download new packages
wget {{ download_url }}/foundationdb-clients_{{ fdb_version }}-1_amd64.deb

# Install on each client machine
sudo dpkg -i foundationdb-clients_{{ fdb_version }}-1_amd64.deb

# Restart client applications
# (Your application-specific restart procedure)
```

!!! warning "Multi-Version Clients"
    Keep old client libraries installed until upgrade completes. This allows clients to connect during the rolling upgrade. See [Multi-version client](https://apple.github.io/foundationdb/api-general.html#multi-version-client).

##### Step 2: Stage Packages on All Machines

Download and stage packages on all cluster machines before starting:

```bash
# On each cluster machine
cd /tmp
wget {{ download_url }}/foundationdb-clients_{{ fdb_version }}-1_amd64.deb
wget {{ download_url }}/foundationdb-server_{{ fdb_version }}-1_amd64.deb
```

##### Step 3: Upgrade Coordinators First

**Critical**: Upgrade coordinator machines before other machines to ensure cluster coordination continues.

```bash
# Identify coordinators
fdbcli --exec "coordinators"

# For EACH coordinator machine, in sequence:
# 1. Stop the service
sudo systemctl stop foundationdb

# 2. Install new packages
sudo dpkg -i foundationdb-clients_{{ fdb_version }}-1_amd64.deb \
             foundationdb-server_{{ fdb_version }}-1_amd64.deb

# 3. Start the service
sudo systemctl start foundationdb

# 4. Wait for coordinator to rejoin (check from another machine)
fdbcli --exec "status minimal"
# Wait until "Healthy" before proceeding to next coordinator
```

!!! note "Coordinator Majority"
    Maintain coordinator quorum throughout. With 5 coordinators, upgrade one at a time, ensuring 3+ are always available.

##### Step 4: Rolling Upgrade Remaining Machines

After all coordinators are upgraded, upgrade remaining machines one at a time:

```bash
# For EACH remaining machine:

# 1. Optional: Exclude machine to move data off first
fdbcli --exec "exclude 10.0.4.X"
fdbcli --exec "status"
# Wait for "Moving data: 0.000 GB"

# 2. Stop the service
sudo systemctl stop foundationdb

# 3. Install new packages
sudo dpkg -i foundationdb-clients_{{ fdb_version }}-1_amd64.deb \
             foundationdb-server_{{ fdb_version }}-1_amd64.deb

# 4. Start the service
sudo systemctl start foundationdb

# 5. If excluded, re-include the machine
fdbcli --exec "include 10.0.4.X"

# 6. Verify health before proceeding
fdbcli --exec "status minimal"
# Wait until "Healthy" before next machine
```

##### Step 5: Verify Upgrade Complete

```bash
# Confirm all processes are on new version
fdbcli --exec "status details"

# Verify cluster health
fdbcli --exec "status"

# Check version in JSON
fdbcli --exec "status json" | jq '.cluster.processes[].version' | sort -u
```

#### Timing Expectations

| Cluster Size | Coordinator Upgrade | Full Cluster | Notes |
|-------------|---------------------|--------------|-------|
| 5 machines | 10-15 minutes | 30-45 minutes | Small cluster |
| 20 machines | 10-15 minutes | 1-2 hours | Medium cluster |
| 100+ machines | 15-20 minutes | 4-8 hours | Large cluster |

Actual times depend on:

- **Data volume** - More data = slower exclusion/inclusion
- **Redundancy mode** - Triple replication requires more data movement
- **Disk speed** - SSDs significantly faster than HDDs
- **Network bandwidth** - Data rebalancing limited by network

#### Monitoring During Upgrade

Watch these metrics throughout the upgrade:

| Metric | Location | Expected Behavior |
|--------|----------|------------------|
| Cluster status | `status` | May show "Healing" during upgrades |
| Fault tolerance | `status` | Should not drop to 0 |
| Moving data | `status` | Expect spikes after each machine |
| Replication health | `status` | "Healthy" or "Healthy (Rebalancing)" |
| Process count | `status details` | May temporarily decrease |

```bash
# Continuous monitoring during upgrade
watch -n 5 'fdbcli --exec "status minimal"; echo "---"; \
             fdbcli --exec "status json" | jq "{
               health: .cluster.database_status.healthy,
               fault_tolerance: .cluster.fault_tolerance.max_zone_failures_without_losing_data,
               moving_data_gb: (.cluster.data.moving_data.in_flight_bytes / 1073741824),
               processes: .cluster.processes | length
             }"'
```

!!! warning "Alert Thresholds"
    - **Fault tolerance = 0**: Pause upgrade, investigate before continuing
    - **Database unavailable**: Stop upgrade, check coordinator quorum
    - **Moving data stuck**: May indicate storage server issue

#### Rollback Procedures

!!! danger "Rollback Limitations"
    Downgrades between major/minor versions are generally **not supported**. Only proceed with rollback if the upgrade hasn't completed or if documented for your specific version pair.

##### If Upgrade Fails Mid-Way

1. **Do not continue** with remaining machines
2. **Check cluster health** - If healthy, remaining old-version machines are still functional
3. **Restore backup** if cluster is unavailable and cannot recover

##### Downgrade Within Same Minor Version

Patch version downgrades (e.g., 7.3.71 → 7.3.60) may be possible:

```bash
# Only if cluster is still functional
sudo systemctl stop foundationdb
sudo dpkg -i foundationdb-server_<old_version>.deb
sudo systemctl start foundationdb
```

##### Recovery from Failed Upgrade

If the cluster becomes unavailable:

1. **Stop all FoundationDB processes** on all machines
2. **Restore coordinator machines** to old version or from backup
3. **Restore data from backup** if necessary
4. **Start coordinators first**, then other machines

```bash
# Emergency restore from backup
fdbcli --exec "status"  # Confirm cluster state

# If backup restore needed:
fdbrestore start -r file:///backup/fdb -C /etc/foundationdb/fdb.cluster --dest_cluster_file /path/to/new_cluster
```

See [Backup & Recovery](backup.md) for detailed restore procedures.

#### Version-Specific Upgrade Notes

For detailed version-specific information, see [Version Overview](../getting-started/versions.md).

| Upgrade Path | Key Considerations |
|--------------|-------------------|
| 7.1 → 7.3 | Safe direct upgrade. Storage engine `ssd-redwood-1-experimental` renamed to `ssd-redwood-1` |
| 7.3 → 7.4 | Pre-release only. Go binding requires `Close()` on Database objects |
| 7.1 → 7.4 | Not recommended. Upgrade to 7.3 first |

!!! tip "API Version Compatibility"
    Client applications specify an API version when connecting. All supported versions accept API versions 510+. Lock your application to a specific API version for consistent behavior across cluster upgrades.

## Getting Help

### Self-Service Resources

- [Official Documentation](https://apple.github.io/foundationdb/)
- [GitHub Issues](https://github.com/apple/foundationdb/issues)
- [FoundationDB Forum](https://forums.foundationdb.org/)

### Gathering Information for Support

When seeking help, collect:

1. **Version information:**
   ```bash
   fdbcli --version
   fdbcli --exec "status json" > status.json
   ```

2. **Relevant logs:**
   ```bash
   tar czf logs.tar.gz /var/log/foundationdb/trace.*.xml
   ```

3. **Configuration:**
   ```bash
   cat /etc/foundationdb/foundationdb.conf
   cat /etc/foundationdb/fdb.cluster
   ```

4. **Error messages** - Exact error text and timestamps

## Next Steps

- Review [Monitoring](monitoring.md) for proactive issue detection
- Configure [Backup & Recovery](backup.md) for disaster preparedness
- See [Configuration](configuration.md) for performance tuning

