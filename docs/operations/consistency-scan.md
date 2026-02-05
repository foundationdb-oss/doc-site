---
title: Consistency Scan
description: Continuous background scanning for data corruption detection
---

# Consistency Scan <span class="pill-new">NEW IN 7.4</span>

{% if fdb_version < "7.4" %}
!!! warning "Version Notice"
    This feature is only available in FoundationDB 7.4 and later. You are viewing docs for version {{ fdb_version }}.
{% endif %}

Consistency Scan provides continuous background verification of data consistency by reading all replicas of each shard at a configurable rate. This helps detect corrupt "cold" data by ensuring all data is periodically read and verified.

## Overview

The consistency scan:

- Reads all replicas of each shard to verify data matches
- Runs continuously at a configurable rate
- Logs errors as trace events with Severity = 40
- Publishes metrics via Status JSON

!!! tip "Cold Data Detection"
    Cold data (rarely accessed) can silently corrupt on disk. Consistency scan ensures all data is periodically verified, catching corruption that would otherwise go unnoticed.

## Configuration

Configure consistency scan via `fdbcli`:

### Enable Consistency Scan

```bash
# Enable with 5 MB/s rate, scanning once every 28 days
fdbcli> consistencyscan on maxRate 5000000 targetInterval 2419200
```

### Disable Consistency Scan

```bash
fdbcli> consistencyscan off
```

### View Current Stats

```bash
fdbcli> consistencyscan stats
```

## Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `maxRate` | Maximum scan rate in bytes/second | `5000000` (5 MB/s) |
| `targetInterval` | Target seconds to complete full scan | `2419200` (28 days) |

### Rate Planning

Choose rates based on your cluster size and acceptable overhead:

| Cluster Size | Suggested Rate | Full Scan Time |
|--------------|----------------|----------------|
| < 100 GB | 1 MB/s | ~1 day |
| 100 GB - 1 TB | 5 MB/s | ~2-3 days |
| 1 TB - 10 TB | 10 MB/s | ~1-2 weeks |
| > 10 TB | 20+ MB/s | ~2-4 weeks |

!!! note "Performance Impact"
    The scan rate should be low enough to avoid impacting production workloads. Start conservative and increase as needed.

## Monitoring

### Status JSON

Consistency scan metrics are published at:

```
.cluster.consistency_scan
```

Query via:

```bash
fdbcli> status json
# Parse .cluster.consistency_scan section
```

### Trace Events

Monitor `ConsistencyScanMetrics` trace events for:

| Metric | Description |
|--------|-------------|
| `BytesScanned` | Total bytes scanned |
| `ErrorCount` | Number of errors encountered |
| `InconsistenciesFound` | Data mismatches detected |
| `ScanProgress` | Percentage of cluster scanned |

### Alerting

Set up alerts for:

- `InconsistenciesFound > 0` - Data corruption detected
- `ErrorCount` increasing - Scan encountering issues
- No progress for extended period - Scan may be stuck

## Error Handling

When inconsistencies are found:

1. **Trace Event**: Logged with Severity = 40
2. **Metrics Updated**: `InconsistenciesFound` incremented
3. **No Automatic Action**: Manual intervention required

!!! warning "Responding to Inconsistencies"
    If consistency scan detects mismatches:
    
    1. Review trace events for affected key ranges
    2. Run targeted [Audit Storage](audit-storage.md) checks
    3. Consider restoring affected ranges from backup
    4. Investigate root cause (disk issues, bugs, etc.)

## Use Cases

### Proactive Corruption Detection

Schedule scans to catch silent corruption:

```bash
# Scan entire cluster every 14 days at 10 MB/s
fdbcli> consistencyscan on maxRate 10000000 targetInterval 1209600
```

### Post-Hardware-Event Verification

After disk replacements or hardware issues:

```bash
# Temporarily increase scan rate for faster verification
fdbcli> consistencyscan on maxRate 50000000 targetInterval 86400
```

### Compliance Requirements

For environments requiring regular data integrity verification:

```bash
# Weekly full scan at low priority
fdbcli> consistencyscan on maxRate 5000000 targetInterval 604800
```

## Comparison with Audit Storage

| Feature | Consistency Scan | Audit Storage |
|---------|------------------|---------------|
| **Mode** | Continuous background | On-demand |
| **Speed** | Rate-limited, low impact | As fast as possible |
| **Focus** | Replica data consistency | Data + metadata consistency |
| **Use Case** | Ongoing monitoring | Targeted investigation |

Use both together:
- **Consistency Scan**: Continuous background verification
- **Audit Storage**: Deep investigation when issues are suspected

## Best Practices

1. **Enable in production** - Run continuously at low rate
2. **Monitor metrics** - Alert on inconsistencies
3. **Adjust rate** - Balance thoroughness vs performance
4. **Investigate quickly** - Don't ignore inconsistency alerts
5. **Combine with audits** - Use Audit Storage for deep dives

## See Also

- [Audit Storage](audit-storage.md) - On-demand consistency checking
- [Monitoring](monitoring.md) - Cluster health metrics
- [Troubleshooting](troubleshooting.md) - Debugging guide

