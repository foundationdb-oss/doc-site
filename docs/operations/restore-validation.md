---
title: Restore Validation
description: Verify backup restore integrity with automated validation
---

# Restore Validation <span class="pill-new">NEW IN 7.4</span>

{% if fdb_version < "7.4" %}
!!! warning "Version Notice"
    This feature is only available in FoundationDB 7.4 and later. You are viewing docs for version {{ fdb_version }}.
{% endif %}

Restore Validation verifies that backup restore operations completed without data corruption. It compares the current database state with restored data to ensure the restore process worked correctly.

## Overview

Restore validation:

- Restores backup data to a validation prefix (`\xff\x02/rlog/`)
- Compares source data with restored data
- Reports mismatches via audit status and trace events
- Runs as an audit job with progress tracking

!!! tip "When to Use"
    Run restore validation immediately after completing a restore operation to verify data integrity.

## Workflow

### 1. Lock the Database

Prevent writes during validation to avoid false positives:

```bash
fdbcli> lock
Lock UID: abc123...
```

!!! important "Save the Lock UID"
    You'll need this UID to unlock the database after validation.

### 2. Restore to Validation Prefix

Restore backup data to the validation keyspace:

```bash
fdbrestore start \
  -r file:///backup/fdb/backup-2025-02-03... \
  --dest-cluster-file /etc/foundationdb/fdb.cluster \
  --add-prefix "\xff\x02/rlog/" \
  -w
```

The `--add-prefix` parameter restores data to the validation prefix instead of overwriting production data.

### 3. Start Validation Audit

```bash
fdbcli> audit_storage validate_restore "" "\xff"
Audit ID: 12345678-1234-5678-1234-567812345678
```

### 4. Monitor Progress

```bash
# Check audit status
fdbcli> get_audit_status validate_restore id <AUDIT_ID>

# Check detailed progress
fdbcli> get_audit_status validate_restore progress <AUDIT_ID>
```

### 5. Check Results

**Success** (Phase 2 = Complete):
```
AuditStorageState: [ID]: <AUDIT_ID>, [Range]: ["","\xff"), [Type]: 5, [Phase]: 2
```

**Failure** (Phase 3 = Error):
```
AuditStorageState: [ID]: <AUDIT_ID>, [Range]: ["","\xff"), [Type]: 5, [Phase]: 3
```

### 6. Cleanup

Unlock the database and remove validation data:

```bash
fdbcli> unlock <LOCK_UID>
fdbcli> option on ACCESS_SYSTEM_KEYS
fdbcli> writemode on
fdbcli> clearrange "\xff\x02/rlog/" "\xff\x02/rlog0"
```

## What Validation Checks

| Validates | Description |
|-----------|-------------|
| ✅ Restore process integrity | No corruption during restore |
| ✅ Current source ↔ restored data | Data matches at audit time |
| ✅ Data transfer accuracy | No lost or corrupted keys |

| Does NOT Validate | Description |
|-------------------|-------------|
| ❌ Backup ↔ source changes | Changes after backup are expected |
| ❌ Long-term consistency | Point-in-time check only |

!!! note "Expected Behavior"
    If source data changed after the backup was created, validation will report a mismatch. This is expected—lock the database to prevent changes during validation.

## Trace Events

| Event | Description |
|-------|-------------|
| `SSAuditRestoreBegin` | Validation started |
| `SSAuditRestoreComplete` | Validation finished successfully |
| `SSAuditRestoreError` | Validation found errors |

Check logs for details:

```bash
grep "SSAuditRestore" /var/log/foundationdb/*.log
```

## Performance

| Dataset Size | Expected Duration |
|--------------|-------------------|
| < 1,000 keys | Seconds |
| 1,000 - 10,000 keys | 1-5 minutes |
| 10,000 - 1M keys | 10-60 minutes |
| > 1M keys | Hours |

Rate is controlled by `AUDIT_STORAGE_RATE_PER_SERVER_MAX` (default: 50 MB/s per server).

## Troubleshooting

### "restore_destination_not_empty" Error

**Cause**: Restore without `--add-prefix`

**Fix**: Always use `--add-prefix "\xff\x02/rlog/"` for validation restores.

### False Positive Mismatches

**Cause**: Source data changed during validation

**Fix**: Lock the database before restore and validation:

```bash
fdbcli> lock
# Then restore and validate
```

### No Progress

**Cause**: Storage server issues or missing data

**Fix**: Check `status details` for SS health, verify data distribution.

### Cannot See Restored Data

**Cause**: Need system key access

**Fix**: Enable access to system keys:

```bash
fdbcli> option on ACCESS_SYSTEM_KEYS
fdbcli> getrange "\xff\x02/rlog/" "\xff\x02/rlog0"
```

## Best Practices

1. **Always lock** before validation to prevent false positives
2. **Run immediately** after restore operations
3. **Monitor trace events** for detailed error information
4. **Clean up** validation data after checking results
5. **Document results** for compliance and audit trails

## See Also

- [Backup & Recovery](backup.md) - Creating and restoring backups
- [Audit Storage](audit-storage.md) - General consistency auditing
- [Troubleshooting](troubleshooting.md) - Debugging guide

