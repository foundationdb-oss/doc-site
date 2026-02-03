---
title: Backup & Recovery
description: Protect your data with backups and point-in-time recovery
---

# Backup & Recovery

FoundationDB provides robust backup, restore, and disaster recovery capabilities. This guide covers continuous backup to blob storage, point-in-time recovery, and cross-datacenter replication.

## Overview

FoundationDB's backup system offers:

| Feature | Description |
|---------|-------------|
| **Continuous Backup** | Stream changes to backup destination with minimal overhead |
| **Point-in-Time Recovery** | Restore to any version within the backup window |
| **Disaster Recovery** | Real-time replication to a standby cluster |
| **Backup Tags** | Run multiple independent backups simultaneously |

!!! info "Components"
    - `fdbbackup` - CLI for managing backups
    - `fdbrestore` - CLI for restoring from backups
    - `backup_agent` - Background process that performs backup operations
    - `fdbdr` - CLI for disaster recovery management
    - `dr_agent` - Background process for DR replication

## Backup Architecture

Backup agents run as separate processes that read mutation logs from the database and write them to a backup destination. Multiple agents can run for redundancy and performance.

```mermaid
graph LR
    subgraph "FoundationDB Cluster"
        TLog[Transaction Logs<br/>Mutations]
        SS[Storage Servers]
    end

    subgraph "Backup System"
        BA1[Backup Agent 1]
        BA2[Backup Agent 2]
    end

    subgraph "Backup Storage"
        S3[(S3 / Blob Store)]
        FS[(Filesystem)]
    end

    TLog --> BA1
    TLog --> BA2
    BA1 --> S3
    BA2 --> S3
    BA1 -.-> FS
    BA2 -.-> FS

    style S3 fill:#ff9800,color:#000
    style FS fill:#4caf50,color:#fff
```

## Backup Destinations

### URL Formats

| Type | Format | Example |
|------|--------|---------|
| Local filesystem | `file://PATH` | `file:///mnt/backup/fdb` |
| Blob store (S3-compatible) | `blobstore://HOST/RESOURCE` | `blobstore://s3.amazonaws.com:443/bucket/backup` |

### Filesystem Backup

```bash
fdbbackup start -d file:///mnt/backup/fdb
```

Requirements:
- Path must be accessible to all backup agents
- Use network filesystem (NFS, EFS) for multi-machine setups
- Ensure sufficient disk space for backup history

### Blob Store Backup

```bash
fdbbackup start -d "blobstore://s3.amazonaws.com:443/my-bucket/fdb-backup?bucket=my-bucket&region=us-east-1"
```

#### Blob Store URL Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `bucket` | Bucket name (if not in path) | - |
| `region` | AWS region | `us-east-1` |
| `sc` | Storage class (`standard`, `standard_ia`, etc.) | `standard` |
| `sdk_auth` | Use AWS SDK auth chain | `false` |
| `secure_connection` | Use HTTPS | `1` |

#### Blob Store Credentials

Create a JSON credentials file:

```json
{
  "accounts": {
    "s3.amazonaws.com": {
      "api_key": "AKIAIOSFODNN7EXAMPLE",
      "secret": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
    }
  }
}
```

Set via environment variable:
```bash
export FDB_BLOB_CREDENTIALS=/path/to/credentials.json
```

Or use AWS SDK authentication:
```bash
fdbbackup start -d "blobstore://s3.amazonaws.com/bucket?sdk_auth=true"
```

## Starting a Backup

### Basic Backup

```bash
fdbbackup start -C /etc/foundationdb/fdb.cluster -d file:///backup/fdb
```

### Backup with Snapshot

Include a full snapshot for faster restores:

```bash
fdbbackup start -d file:///backup/fdb -z
```

The `-z` flag (or `--no_stop_when_done`) continues backing up after the initial snapshot.

### Backup with Tags

Run multiple independent backups:

```bash
# Primary backup to S3
fdbbackup start -t primary -d "blobstore://s3.amazonaws.com/prod-backup"

# Secondary backup to local storage
fdbbackup start -t local -d file:///mnt/backup/fdb
```

### Backup with Key Range

Back up only specific key ranges:

```bash
fdbbackup start -d file:///backup/fdb -k '\x00' '\xff'
```

## Managing Backups

### Check Backup Status

```bash
fdbbackup status -C /etc/foundationdb/fdb.cluster
```

Or for a specific tag:
```bash
fdbbackup status -t mytag
```

Example output:
```
Using cluster file `/etc/foundationdb/fdb.cluster'.

The backup on tag `default' is restorable but continuing to
 blobstore://s3.amazonaws.com:443/my-bucket (last completed log version is 12345678).

Backup is restorable to version 12345678 (approximately 5 seconds old).
```

### List Backups

```bash
fdbbackup list -b file:///backup/fdb
```

### Pause/Resume Backup

```bash
# Pause (backup continues but range log writing pauses)
fdbbackup modify -t default --active-snapshot-interval 0

# Resume
fdbbackup modify -t default --active-snapshot-interval 86400
```

### Stop Backup

```bash
# Stop gracefully (keeps backup restorable)
fdbbackup discontinue -t default

# Abort immediately
fdbbackup abort -t default
```

### Wait for Backup

Wait for backup to complete or reach a restorable state:

```bash
fdbbackup wait -t default
```

## fdbbackup Command Reference

| Subcommand | Description |
|------------|-------------|
| `start` | Start a new backup |
| `modify` | Modify backup parameters |
| `status` | Show backup status |
| `abort` | Stop backup immediately |
| `discontinue` | Stop backup gracefully |
| `wait` | Wait for backup completion |
| `describe` | Describe backup contents |
| `list` | List available backups |
| `tags` | List backup tags |
| `expire` | Remove old backup data |
| `delete` | Delete backup entirely |
| `cleanup` | Clean up incomplete operations |

### Common Options

| Option | Description |
|--------|-------------|
| `-C, --cluster-file` | Path to cluster file |
| `-d, --dest-url` | Backup destination URL |
| `-t, --tag` | Backup tag (default: `default`) |
| `-k, --keys` | Key range to back up |
| `-z, --no-stop-when-done` | Continue after snapshot |
| `-s, --snapshot-interval` | Seconds between snapshots |

## Restoring from Backup

### Basic Restore

```bash
fdbrestore start -r file:///backup/fdb -C /etc/foundationdb/fdb.cluster
```

!!! danger "Warning"
    Restore **overwrites all data** in the destination cluster. The cluster should be empty or you must use `--remove_prefix` and `--add_prefix` options.

### Restore to Specific Version

```bash
fdbrestore start -r file:///backup/fdb --version 12345678
```

### Restore to Specific Timestamp

```bash
fdbrestore start -r file:///backup/fdb --timestamp "2025-02-03 10:30:00"
```

### Restore with Key Transformation

Restore to different key prefixes:

```bash
fdbrestore start -r file:///backup/fdb \
  --remove_prefix "prod/" \
  --add_prefix "staging/"
```

### Check Restore Status

```bash
fdbrestore status -C /etc/foundationdb/fdb.cluster
```

### Wait for Restore

```bash
fdbrestore wait
```

### Abort Restore

```bash
fdbrestore abort
```

## fdbrestore Command Reference

| Subcommand | Description |
|------------|-------------|
| `start` | Start a restore |
| `abort` | Stop restore in progress |
| `wait` | Wait for restore completion |
| `status` | Show restore status |

### Restore Options

| Option | Description |
|--------|-------------|
| `-r, --source-url` | Backup source URL |
| `-C, --cluster-file` | Destination cluster file |
| `--version` | Restore to specific version |
| `--timestamp` | Restore to specific timestamp |
| `-t, --tag` | Target tag |
| `--remove_prefix` | Remove prefix from restored keys |
| `--add_prefix` | Add prefix to restored keys |
| `-k, --keys` | Key range to restore |

## Running Backup Agents

Backup agents perform the actual backup work. Run them on your cluster machines.

### Starting Backup Agent

```bash
backup_agent -C /etc/foundationdb/fdb.cluster
```

### Backup Agent in foundationdb.conf

```ini
[backup_agent]
command = /usr/lib/foundationdb/backup_agent/backup_agent
logdir = /var/log/foundationdb
```

### Multiple Agents

Run multiple backup agents for redundancy and performance. They coordinate automatically.

### Agent with Blob Credentials

```bash
backup_agent -C /etc/foundationdb/fdb.cluster \
  --blob-credentials /path/to/credentials.json
```

## Disaster Recovery (DR)

DR provides real-time replication to a standby cluster for immediate failover.

### DR vs Backup

| Feature | Backup | DR |
|---------|--------|----|
| Recovery time | Minutes to hours | Seconds |
| Storage | Blob/filesystem | Secondary FDB cluster |
| Point-in-time | Yes | Limited |
| Use case | Data protection | High availability |

### DR Architecture

```mermaid
graph LR
    subgraph "Primary Datacenter"
        P_TLog[Transaction Logs]
        P_SS[Storage Servers]
        P_Client[Clients<br/>Read/Write]
    end

    subgraph "DR Datacenter"
        DR_TLog[Transaction Logs]
        DR_SS[Storage Servers]
        DR_Client[Clients<br/>Read-Only]
    end

    DR_Agent[DR Agent]

    P_Client --> P_TLog
    P_TLog --> P_SS
    P_TLog --> DR_Agent
    DR_Agent --> DR_TLog
    DR_TLog --> DR_SS
    DR_Client -.-> DR_SS

    style P_TLog fill:#4caf50,color:#fff
    style DR_TLog fill:#ff9800,color:#000
```

### Setting Up DR

1. **Start DR on primary cluster:**
   ```bash
   fdbdr start -s /path/to/primary.cluster -d /path/to/dr.cluster
   ```

2. **Run DR agents:**
   ```bash
   dr_agent -s /path/to/primary.cluster -d /path/to/dr.cluster
   ```

3. **Check DR status:**
   ```bash
   fdbdr status -s /path/to/primary.cluster -d /path/to/dr.cluster
   ```

### DR Switchover

Perform a planned switchover:

```bash
fdbdr switch -s /path/to/primary.cluster -d /path/to/dr.cluster
```

After switchover:
- DR cluster becomes primary
- Original primary becomes standby
- Applications reconnect to new primary

### DR Failover

For unplanned failover when primary is unavailable:

```bash
# On DR cluster
fdbcli> writemode on
fdbcli> clearrange "" "\xff"  # Only if needed to break replication
```

!!! warning
    Unplanned failover may result in data loss for transactions not yet replicated.

## fdbdr Command Reference

| Subcommand | Description |
|------------|-------------|
| `start` | Start DR replication |
| `switch` | Switch primary and DR |
| `abort` | Stop DR |
| `status` | Show DR status |

## TLS Support

All backup commands support TLS when connecting to TLS-enabled clusters:

```bash
fdbbackup start -d file:///backup/fdb \
  --tls-certificate-file /path/to/cert.pem \
  --tls-key-file /path/to/key.pem \
  --tls-ca-file /path/to/ca.pem
```

Or via environment variables:
```bash
export FDB_TLS_CERTIFICATE_FILE=/path/to/cert.pem
export FDB_TLS_KEY_FILE=/path/to/key.pem
fdbbackup start -d file:///backup/fdb
```

## Backup Retention and Expiration

### Expire Old Backups

Remove backup data older than specified version or timestamp:

```bash
# Expire by version
fdbbackup expire -d file:///backup/fdb --expire-before-version 12345678

# Expire by timestamp
fdbbackup expire -d file:///backup/fdb --expire-before-timestamp "2025-01-01 00:00:00"

# Force minimum restorability before expiring
fdbbackup expire -d file:///backup/fdb --restorable-after-version 12000000
```

### Delete Backup Entirely

```bash
fdbbackup delete -d file:///backup/fdb
```

## Monitoring Backups

### Status in fdbcli

```bash
fdb> status
...
Backup and DR:
  Running backups        - 1
  Running DRs            - 0
```

### Backup Metrics

Monitor these via machine-readable status:

| Metric | Path | Alert Threshold |
|--------|------|-----------------|
| Backup running | `cluster.layers.backup.instances_running` | == 0 when expected |
| Last restorable | `cluster.layers.backup.tags.{tag}.last_restorable_seconds_behind_primary` | > 300 seconds |
| Backup agents | `cluster.layers.backup.agents_running` | < expected count |

### Alerting Script

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
backup = status.get('cluster', {}).get('layers', {}).get('backup', {})

if not backup.get('instances_running', 0):
    print("WARNING: No backup instances running")
    sys.exit(1)

for tag, info in backup.get('tags', {}).items():
    lag = info.get('last_restorable_seconds_behind_primary', float('inf'))
    if lag > 300:
        print(f"WARNING: Backup {tag} is {lag:.0f} seconds behind")
        sys.exit(1)

print("OK: Backups healthy")
sys.exit(0)
```

## Best Practices

### Backup Configuration

1. **Run multiple backup agents** - At least 2 for redundancy
2. **Use blob storage for production** - More durable than filesystem
3. **Set appropriate snapshot intervals** - Daily snapshots balance storage vs restore time
4. **Tag your backups** - Enables multiple independent backup streams

### Testing and Validation

1. **Test restores regularly** - Monthly to a test cluster
2. **Validate backup integrity** - Use `fdbbackup describe`
3. **Monitor backup lag** - Alert if > 5 minutes behind
4. **Document recovery procedures** - RTO/RPO requirements

### Retention Policy

1. **Define retention requirements** - Regulatory, operational
2. **Automate expiration** - Use `fdbbackup expire` in cron
3. **Keep multiple generations** - At least 7 days for point-in-time
4. **Verify before expiring** - Ensure newer backups are restorable

### Security

1. **Encrypt backup storage** - S3 server-side encryption or client-side
2. **Secure credentials** - Use IAM roles, not long-term keys
3. **Restrict backup access** - Separate credentials for backup vs restore
4. **Audit backup operations** - Log all backup/restore commands

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Backup not progressing | No backup agents | Start backup agents |
| High backup lag | Slow destination | Check network, storage IOPS |
| Restore fails | Corrupted backup | Try earlier version |
| Permission denied | Credential issues | Check blob credentials file |

### Debug Commands

```bash
# Describe backup contents
fdbbackup describe -d file:///backup/fdb

# List backup tags
fdbbackup tags

# Cleanup incomplete operations
fdbbackup cleanup -d file:///backup/fdb

# Check backup agent logs
tail -f /var/log/foundationdb/backup_agent*.xml
```

## Next Steps

- Learn [Troubleshooting](troubleshooting.md) for common issues
- Review [Monitoring](monitoring.md) for backup metrics
- See [Configuration](configuration.md) for backup agent settings

