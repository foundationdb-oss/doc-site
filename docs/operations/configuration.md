---
title: Configuration
description: Configure FoundationDB clusters
---

# Configuration

Configure FoundationDB clusters for your workload.

!!! note "Coming Soon"
    This section is being migrated from the original FoundationDB documentation.

## Cluster Configuration

### fdb.cluster File

The cluster file defines how clients connect to FoundationDB:

```
my_cluster:abc123@10.0.0.1:4500,10.0.0.2:4500,10.0.0.3:4500
```

### Redundancy Modes

| Mode | Min Nodes | Fault Tolerance |
|------|-----------|-----------------|
| single | 1 | None |
| double | 3 | 1 node failure |
| triple | 5 | 2 node failures |
| three_datacenter | 9 | 1 datacenter |

### Configuring via fdbcli

```bash
fdb> configure double
fdb> configure storage_engine=ssd
```

## Storage Engines

- **SSD** - Optimized for SSDs (recommended)
- **Memory** - Keep data in memory
- **SQLite** - Legacy, for HDDs

## Process Configuration

See `foundationdb.conf` for process-level settings.

## Next Steps

- Set up [Monitoring](monitoring.md)
- Plan [Backup & Recovery](backup.md)

