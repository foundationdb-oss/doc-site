---
title: Bulk Load & Dump
description: Load and dump large datasets efficiently using SST files
---

# Bulk Load & Dump <span class="pill-new">NEW IN 7.4</span> <span class="pill-experimental">EXPERIMENTAL</span>

{% if fdb_version < "7.4" %}
!!! warning "Version Notice"
    This feature is only available in FoundationDB 7.4 and later. You are viewing docs for version {{ fdb_version }}.
{% endif %}

Bulk Load and Bulk Dump provide efficient mechanisms for loading and dumping large datasets directly to/from storage servers, bypassing the transaction system for improved performance.

## Overview

| Command | Description |
|---------|-------------|
| `bulkdump` | Export key-value ranges to SST files |
| `bulkload` | Import SST files directly into storage servers |

!!! warning "Experimental Feature"
    Bulk Load/Dump is an experimental feature in 7.4. The API and behavior may change in future releases.

## Prerequisites

Bulk Load/Dump requires specific cluster configuration:

```bash
# Required knobs for bulk operations
--knob_shard_encode_location_metadata=1
--knob_desired_teams_per_server=10
--knob_enable_read_lock_on_range=1
```

!!! note "Storage Server Count"
    Ensure you have sufficient storage servers. Too few SSs can cause bulk load failures.

## Quick Start

### 1. Start with Bulk Dump

Enable bulk dump mode and export data:

```bash
fdbcli> bulkdump mode on
fdbcli> bulkdump dump "" \xff /tmp/bulkload
Received Job ID: de6b2ae7197cef28cac38d7ad7a6d3e7
```

### 2. Monitor Progress

Check the status until complete:

```bash
fdbcli> bulkdump status
Running bulk dumping job: de6b2ae7197cef28cac38d7ad7a6d3e7
Finished 42 tasks

# When done:
fdbcli> bulkdump status
No bulk dumping job is running
```

### 3. Load with Bulk Load

Import the dumped data:

```bash
fdbcli> bulkload mode on
fdbcli> bulkload load de6b2ae7197cef28cac38d7ad7a6d3e7 "" \xff /tmp/bulkload
Received Job ID: de6b2ae7197cef28cac38d7ad7a6d3e7
```

## Bulk Dump Commands

```
bulkdump [mode|dump|status|cancel] [ARGs]

Commands:
  mode [on|off]              Enable/disable bulk dump mode
  dump <BEGIN> <END> <DIR>   Dump key range to directory/S3
  status                     Check current job status
  cancel <JOBID>             Cancel a running job
```

### Output Structure

Bulk dump creates a directory structure:

```
/tmp/bulkload/<job-id>/
├── job-manifest.txt           # Job metadata
└── <shard-id>/
    └── 0/
        ├── 133445450-manifest.txt  # Shard manifest
        ├── 133445450-data.sst      # SST data file
        └── 133445450-sample.sst    # Byte sample (if applicable)
```

## Bulk Load Commands

```
bulkload [mode|load|status|cancel|history] [ARGs]

Commands:
  mode [on|off]                        Enable/disable bulk load mode
  load <JOBID> <BEGIN> <END> <DIR>     Load job from directory/S3
  status                               Check current job status
  cancel <JOBID>                       Cancel a running job
  history                              View job history
  history clear [all|<id>]             Clear history
```

### View Load History

```bash
fdbcli> bulkload history
Job de6b2ae7197cef28cac38d7ad7a6d3e7 submitted at 1744830891.011401
  Range: { begin=  end=\xff }
  Tasks: 1 total
  Duration: 1.246195 mins
  Status: Complete
```

## S3 / Blob Store Support

Bulk operations support Amazon S3 and S3-compatible blob stores.

### URL Format

```
blobstore://@<bucket>.<region>.amazonaws.com/<prefix>?bucket=<bucket>&region=<region>
```

### Dump to S3

```bash
fdbcli> bulkdump mode on
fdbcli> bulkdump dump "" \xff \
  blobstore://@backup-bucket.s3.us-west-2.amazonaws.com/bulkload/test?bucket=backup-bucket&region=us-west-2
```

### Load from S3

```bash
fdbcli> bulkload mode on
fdbcli> bulkload load <JOBID> "" \xff \
  blobstore://@backup-bucket.s3.us-west-2.amazonaws.com/bulkload/test?bucket=backup-bucket&region=us-west-2
```

!!! tip "Credentials"
    Configure blob credentials as described in [Backup & Recovery](backup.md#blob-store-credentials).

## Troubleshooting

### Debug Logging

Enable verbose HTTP logging for S3 issues:

```bash
--knob_http_verbose_level=10
```

### Trace Events

Search for these trace event patterns:
- `DDBulkLoad*`, `SSBulkLoad*` - Bulk load events
- `DDBulkDump*`, `SSBulkDump*` - Bulk dump events
- `S3Client*` - S3 connectivity issues

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Bulk load fails | Too few storage servers | Add more SSs |
| Job not progressing | Missing knobs | Enable required knobs |
| S3 connection fails | Credentials | Check blob credentials file |

## Limitations

- Only one bulk dump or bulk load job can run at a time
- Requires cluster to be configured with location metadata encoding
- Range must be within user key space (`"" ~ \xff`)

## See Also

- [Range Lock](range-lock.md) - Used internally by bulk operations
- [Backup & Recovery](backup.md) - For incremental backups

