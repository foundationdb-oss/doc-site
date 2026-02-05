---
title: Audit Storage
description: Validate data consistency across replicas and location metadata
---

# Audit Storage <span class="pill-new">NEW in 7.4</span>

{% if fdb_version < "7.4" %}
!!! warning "Version Notice"
    This feature is only available in FoundationDB 7.4 and later. You are viewing docs for version {{ fdb_version }}.
{% endif %}

Audit Storage validates the consistency of data replicas and location metadata in your FoundationDB cluster. It provides end-to-end verification that all copies of your data match and that metadata is consistent.

## Overview

Audit Storage checks three types of consistency:

| Audit Type | What It Checks |
|------------|----------------|
| `replica` | Data consistency between replicas across all DCs |
| `locationmetadata` | Consistency between KeyServer and ServerKey metadata |
| `ssshard` | Consistency between ServerKey and storage server shard mappings |

## Key Features

- **End-to-end completeness** - Persists progress; continues until all ranges are verified
- **Scalable** - Near-linear speedup with parallelism (configurable via `CONCURRENT_AUDIT_TASK_COUNT_MAX`)
- **Fault tolerant** - Automatically retries failed checks
- **Progress monitoring** - CLI commands to track job status
- **No additional setup** - Uses existing DD and SS infrastructure

## Commands

### Start an Audit

```bash
# Check replica consistency
fdbcli> audit_storage replica "" \xff\xff

# Check location metadata
fdbcli> audit_storage locationmetadata "" \xff\xff

# Check SS shard mappings
fdbcli> audit_storage ssshard "" \xff\xff
```

### Check Status

```bash
# List recent jobs
fdbcli> get_audit_status replica recent

# Check specific job progress
fdbcli> get_audit_status replica progress <AUDIT_ID>
```

### Cancel an Audit

```bash
fdbcli> audit_storage cancel replica <AUDIT_ID>
```

## Audit Types

### Replica Consistency (`replica`)

Verifies that all replicas of each key-value pair are identical:

- Compares data between storage servers across all data centers
- Uses shard-based partitioning for efficient parallel checking
- Generates `SSAuditStorageShardReplicaError` trace events on mismatch

```bash
fdbcli> audit_storage replica "" \xff
Audit ID: 12345678-1234-5678-1234-567812345678
```

### Location Metadata (`locationmetadata`)

Validates consistency between system metadata:

- Checks `KeyServer` ↔ `ServerKey` mappings
- Ensures ranges are assigned to correct servers
- Generates `DDDoAuditLocationMetadataError` on mismatch

!!! note
    Location metadata audit always checks all key space, regardless of the range specified.

### SS Shard Mappings (`ssshard`)

Verifies storage server local state matches system metadata:

- Compares `ServerKeys` with SS in-memory shard information
- Checks each storage server individually
- Generates `SSAuditStorageSsShardError` on mismatch

## Monitoring Progress

### CLI Status

```bash
fdbcli> get_audit_status replica progress <AUDIT_ID>
Audit ID: 12345678...
Type: replica
Range: ["", "\xff")
Phase: Running
Submitted: 42 tasks
Completed: 38 tasks
Error: 0 tasks
```

### Trace Events

Monitor these trace events for audit activity:

| Event | Description |
|-------|-------------|
| `AuditStorageStart` | Audit job started |
| `AuditStorageComplete` | Audit job finished |
| `SSAuditStorageShardReplicaError` | Replica inconsistency detected |
| `DDDoAuditLocationMetadataError` | Metadata inconsistency detected |
| `SSAuditStorageSsShardError` | Shard mapping inconsistency detected |

## Progress Persistence

Audit progress is stored in system metadata:

- Replica/location metadata: `\xff/auditRanges/`
- SS shard checking: `\xff/auditServers/`

This enables:
- Resume after failures without re-checking completed ranges
- Accurate progress tracking
- Efficient resource utilization

## Comparison with Consistency Checker Urgent

| Feature | Audit Storage | Consistency Checker Urgent |
|---------|---------------|---------------------------|
| Progress persistence | ✅ Yes | ❌ No |
| Location metadata check | ✅ Yes | ❌ No |
| CLI job management | ✅ Yes | ❌ No |
| Efficiency | ✅ High (no repeat work) | ⚠️ Lower |

## Best Practices

1. **Schedule regular audits** - Run replica audits periodically (e.g., weekly)
2. **Monitor trace events** - Alert on `*Error` trace events
3. **Use appropriate ranges** - For large clusters, audit in segments
4. **Check after incidents** - Run audits after hardware failures or recoveries

## Troubleshooting

### Audit Not Progressing

- Check storage server health with `status details`
- Verify data distribution is working
- Review trace logs for errors

### High Error Count

- Examine specific `*Error` trace events
- Check for storage server issues
- Consider running shard-by-shard audits

## See Also

- [Consistency Scan](consistency-scan.md) - Continuous background scanning
- [Restore Validation](restore-validation.md) - Validate backup restores
- [Troubleshooting](troubleshooting.md) - General debugging guide

