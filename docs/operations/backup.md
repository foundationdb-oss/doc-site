---
title: Backup & Recovery
description: Protect your data with backups and point-in-time recovery
---

# Backup & Recovery

Protect your data with FoundationDB's backup and restore capabilities.

!!! note "Coming Soon"
    This section is being migrated from the original FoundationDB documentation.

## Backup Overview

FoundationDB supports:

- **Continuous backup** - Stream changes to blob storage
- **Point-in-time recovery** - Restore to any moment
- **Disaster recovery** - Cross-datacenter replication

## Starting a Backup

```bash
fdbbackup start -d file:///backup/path -z
```

## Backup Destinations

| Type | Example |
|------|---------|
| Local filesystem | `file:///backup/fdb` |
| Amazon S3 | `blobstore://s3.amazonaws.com/bucket` |
| Azure Blob | `blobstore://account.blob.core.windows.net/container` |

## Restore Process

```bash
# Restore from backup
fdbrestore start -r file:///backup/path
```

## Disaster Recovery

For DR scenarios, use secondary cluster replication:

```bash
fdbdr start -s primary_cluster -d dr_cluster
```

## Best Practices

- [ ] Test restores regularly
- [ ] Monitor backup lag
- [ ] Encrypt backup data
- [ ] Retain multiple backup generations

## Next Steps

- Learn [Troubleshooting](troubleshooting.md)
- Review [Configuration](configuration.md)

