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
| **Disk Snapshot Backup** | Block-level point-in-time backup using filesystem/EBS snapshots; high-throughput restore, no continuous backup |

!!! info "Components"
    - `fdbbackup` - CLI for managing backups
    - `fdbrestore` - CLI for restoring from backups
    - `backup_agent` - Background process that performs backup operations
    - `fdbdr` - CLI for disaster recovery management
    - `dr_agent` - Background process for DR replication
    - `fdbcli snapshot` - Block-level disk snapshot backup orchestrator (covered below)

{% if fdb_version >= "7.4" %}
!!! tip "Backup V2 <span class="pill-improved">IMPROVED IN 7.4</span>"
    FoundationDB 7.4 introduces **Backup V2**, which reduces writes to the log system by approximately 50%. This improves commit latency and reduces the number of transaction logs required. Backup V2 is enabled automatically in 7.4 clusters.

    **Key improvements:**

    - **50% reduction** in backup-related writes to transaction logs
    - **Lower commit latency** for write-heavy workloads
    - **Fewer TLogs required** for backup operations
    - Automatic enablement - no configuration needed
{% endif %}
{% if fdb_version < "7.4" %}
!!! info "Backup System"
    The backup system streams mutations from transaction logs to your backup destination with minimal overhead.
{% endif %}

<a id="backup-v3"></a>
!!! note "Backup V3 (In Development)"
    **Backup V3** extends Backup V2 by partitioning the mutation log along **two dimensions** instead of one: by **log-router tag** (already in V2) **and** additionally by **user key range** (new in V3). At restore time this lets the restore job process distinct key ranges in parallel, dramatically reducing restore time for large datasets.

    A new CLI option, `--mutation-log-type` (with values `DEFAULT` and `PARTITIONED_LOG`), selects the log format when starting a backup ([PR #13127](https://github.com/apple/foundationdb/pull/13127)).

    Backup V3 is **gated under the 8.0 protocol version** and is **not available in 7.3 or 7.4** ([PR #13225](https://github.com/apple/foundationdb/pull/13225)). It will only ship once a `release-8.0` branch is cut and tagged.

    Note: An earlier "parallel restore" feature was a separate, prior attempt at fast restore that was removed from the codebase in [PR #12903](https://github.com/apple/foundationdb/pull/12903). Backup V3 is a ground-up replacement, not a continuation of that work.

    If you need fast restore today and can tolerate non-continuous backup, see [Disk Snapshot Backup](#disk-snapshot-backup) below — it is used in production by some large operators.

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

!!! warning "Multi-Cloud Backup Status"
    The blob store backup URL scheme (`blobstore://`) is primarily tested with **AWS S3**. Be aware of the following:

    - **Azure Blob Storage** — Support exists in the codebase but is believed to be broken in current versions. Use with caution and test thoroughly.
    - **Google Cloud Storage (GCS)** — Community support is being contributed by Palantir. Check the latest release notes for availability.

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
| `-d, --destcontainer` | Backup destination URL |
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

For **unplanned failover** when the primary cluster is unavailable and `fdbdr switch` cannot be used (since it requires both clusters):

1. **Abort the DR job** to unlock the destination cluster and stop replication:
   ```bash
   fdbdr abort -s /path/to/primary.cluster -d /path/to/dr.cluster
   ```
   After abort, the DR cluster retains a consistent snapshot of the source database from some point in the past. The cluster is unlocked and becomes writable.

2. **Redirect applications** to the DR cluster by updating their cluster files to point to the DR cluster.

3. **(Optional) Set up reverse DR** once the original primary is recovered, to replicate back from the now-active DR cluster:
   ```bash
   fdbdr start -s /path/to/dr.cluster -d /path/to/primary.cluster
   dr_agent -s /path/to/dr.cluster -d /path/to/primary.cluster
   ```

!!! warning "Potential Data Loss"
    Unplanned failover will lose any transactions that were committed on the primary but not yet replicated to the DR cluster. When DR is operating normally, this window is typically only a few seconds of commits.

!!! note "If `fdbdr abort` Fails"
    If the DR agents and metadata are in a broken state and `fdbdr abort` does not work, you can force-unlock the DR cluster using `fdbcli`:
    ```bash
    # Connect to the DR cluster
    fdbcli -C /path/to/dr.cluster
    fdbcli> unlock <UID>
    ```
    Use `fdbcli> lock` to find the current lock UID. This unlocks the database without clearing any data.

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

## Disk Snapshot Backup

Disk snapshot backup is an alternative backup mechanism that captures a point-in-time, block-level image of every FoundationDB process's data directory by triggering filesystem or block-device snapshots (EBS, ZFS, LVM, btrfs, CSI volume snapshots, etc.) coordinated across the cluster. Unlike `fdbbackup`, it does not stream a continuous mutation log to external storage — instead, it produces a single consistent disk image per role at a single FDB version. Operators choose this approach when restore throughput from `fdbbackup` is the bottleneck (a snapshot restore is bounded by the speed at which volumes can be attached or copied, not by log replay), and when continuous point-in-time recovery is not required. The mechanism has been part of FoundationDB since the 6.x line and is used in production by some large operators. The **snapshot mechanism** can come from the filesystem (ZFS, btrfs) or from the block layer underneath the filesystem (EBS, LVM, CSI VolumeSnapshot); see Prerequisites below for the implications of each choice.

### When to Use

| Aspect | `fdbbackup` | Disk Snapshot Backup |
|--------|-------------|----------------------|
| Granularity | Logical key-value mutations | Block-level disk image per process |
| Point-in-time recovery | Any version within the backup window | Only the FDB version captured at snapshot time |
| Continuous backup | Yes | No |
| Restore speed | Bounded by data size + log replay throughput | Bounded by volume attach / copy speed |
| External dependencies | Blob store or filesystem destination | Filesystem or block device with snapshot support |
| Storage engine support | Any storage engine | Redwood (`ssd-redwood-1`) and SQLite (`ssd-2`) only |
| Operator tooling required | Low — ships with FDB | High — operator must build, deploy, and manage a `snap_create` binary |

### How It Works

When `fdbcli> snapshot <binary> [args...]` is invoked, the cluster controller orchestrates a synchronized snapshot across all stateful processes. Each `fdbserver` process then forks the operator-supplied `snap_create` binary, which is responsible for invoking the underlying volume-snapshot mechanism on that host's data directory.

```mermaid
graph TD
    Op[Operator]
    CLI["fdbcli&gt; snapshot /bin/snap_create.sh"]
    CC[Cluster Controller<br/>Snapshot Orchestrator]

    subgraph "Storage Process"
        SS[fdbserver<br/>storage role]
        SS_Snap[snap_create<br/>--role=storage]
        SS_Disk[(Storage data dir)]
    end

    subgraph "TLog Process"
        TL[fdbserver<br/>tlog role]
        TL_Snap[snap_create<br/>--role=tlog]
        TL_Disk[(TLog data dir)]
    end

    subgraph "Coordinator Process"
        CO[fdbserver<br/>coordinator]
        CO_Snap[snap_create<br/>--role=coord]
        CO_Disk[(Coordinator data dir)]
    end

    Op --> CLI
    CLI --> CC
    CC --> SS
    CC --> TL
    CC --> CO
    SS --> SS_Snap --> SS_Disk
    TL --> TL_Snap --> TL_Disk
    CO --> CO_Snap --> CO_Disk

    style CC fill:#ff9800,color:#000
    style SS_Disk fill:#4caf50,color:#fff
    style TL_Disk fill:#4caf50,color:#fff
    style CO_Disk fill:#4caf50,color:#fff
```

The orchestrator quiesces the relevant subsystems and ensures that all per-role snapshots taken across the cluster reflect the same FDB version. The result is a set of disk images — one per role, per process — that together form a consistent backup of the cluster.

!!! note "Prerequisites"
    - **Block-level snapshots** (recommended) — AWS EBS, LVM, CSI VolumeSnapshot on Kubernetes. These work under any filesystem, including the upstream-recommended **ext4 with `defaults,noatime,discard`**. This is the most common production choice.
    - **Filesystem-level snapshots** — ZFS, btrfs. These require the FoundationDB data directory to live on a copy-on-write filesystem, which has [historically been discouraged for performance reasons](https://apple.github.io/foundationdb/configuration.html#filesystem). Operators choosing this path should benchmark against ext4 first and prefer Redwood (`ssd-redwood-1`) over SQLite (`ssd-2`); Apple has not published an updated formal recommendation. See [Filesystem](configuration.md#filesystem) for more.
    - **Linux only** — disk snapshot backup is not supported on Windows.
    - **Storage engine restriction** — supported only with the Redwood (`ssd-redwood-1`) and SQLite (`ssd-2`) storage engines. **Not supported with the RocksDB storage engine** ([apple/foundationdb#5155](https://github.com/apple/foundationdb/issues/5155)).
    - **Operator-supplied binary** — the operator must build, deploy, and maintain a `snap_create` executable (see below). FoundationDB does not ship one.

### Setting Up the `snap_create` Binary

`snap_create` is an operator-supplied executable invoked by `fdbserver` once per role on each host when a snapshot is requested. It is responsible for actually triggering the underlying volume-snapshot operation (for example, an `aws ec2 create-snapshot` call, an `lvcreate --snapshot`, a `zfs snapshot`, or a CSI `VolumeSnapshot`).

The simplest illustrative implementation copies the data directory to a separate location, similar to the upstream example:

```bash
#!/bin/bash
# /bin/snap_create.sh — illustrative example only.
# Real deployments should call EBS / LVM / ZFS / CSI snapshot APIs.
set -euo pipefail

UID=""
VERSION=""
PATH_ARG=""
ROLE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --uid)     UID="$2";      shift 2 ;;
    --version) VERSION="$2";  shift 2 ;;
    --path)    PATH_ARG="$2"; shift 2 ;;
    --role)    ROLE="$2";     shift 2 ;;
    *)         shift ;;  # ignore extra operator-supplied args
  esac
done

DEST="/var/snapshots/${UID}/${ROLE}-${VERSION}"
mkdir -p "$DEST"
cp -a "$PATH_ARG"/. "$DEST"/
```

`fdbserver` injects four named arguments when invoking the binary, followed by any extra arguments the operator passed to `fdbcli> snapshot`:

| Argument | Description |
|----------|-------------|
| `--uid <UID>` | Snapshot UID generated by the cluster controller; identical across all roles in a single snapshot. |
| `--version <FDB version>` | The FDB cluster version captured by this snapshot. |
| `--path <data dir>` | Absolute path to the data directory that must be snapshotted. |
| `--role <role>` | Role of the process: `storage`, `tlog`, `coord`, etc. |
| _user-supplied args_ | Any additional arguments after the binary path in `fdbcli> snapshot`. |

### Configuring the Cluster

To allow `fdbserver` to fork the snapshot binary, set `whitelist_binpath` in the `[fdbserver]` section of `foundationdb.conf` on every host:

```ini
[fdbserver]
command = /usr/sbin/fdbserver
whitelist_binpath = /bin/snap_create.sh
```

The path may be a colon-separated list if multiple binaries are permitted. Restart `fdbserver` (or trigger a rolling restart) for the change to take effect.

The `SNAP_CREATE_MAX_TIMEOUT` knob (default 5 minutes) bounds how long the orchestrator will wait for `snap_create` to complete on each process. Tune it via `--knob-snap-create-max-timeout=<seconds>` if your underlying snapshot mechanism is slow.

### Recommended Metadata to Capture

Disk snapshot images by themselves are not sufficient to reconstitute a cluster — the operator must also record enough metadata to map images back to roles, processes, and FDB versions at restore time. Capture at least the following per snapshot:

| Field | Description |
|-------|-------------|
| **UID** | The snapshot UID returned by `fdbcli> snapshot`. Identical across all roles in a single snapshot. |
| **fdbserver version** | Exact FDB binary version that produced the snapshot. Required when restoring (the new cluster must run the same major version). |
| **Creation time** | Wall-clock time the snapshot was taken. Useful for retention policy. |
| **Cluster file** | Contents of `fdb.cluster` at the time of snapshot, so coordinator addresses can be re-derived. |
| **Configuration / knobs** | `foundationdb.conf` and any non-default knobs in effect on each process. |
| **Process IP and port** | Address each role was listening on at snapshot time. |
| **Locality** | `--locality_*` settings (zoneid, dcid, machineid) for each process. |
| **File naming** | Recommended naming convention: `<cluster-name>:<ip>:<port>:<UID>` so images can be grouped and matched at restore time. |

!!! tip
    Store this metadata alongside the snapshot images themselves (e.g., as object tags on EBS snapshots or as a sidecar JSON file) so it cannot be lost independently of the data.

### Taking a Backup

From an `fdbcli` session attached to the cluster:

```text
fdbcli> snapshot /bin/snap_create.sh --extra-arg value
Snapshot command succeeded with UID a1b2c3d4e5f60718293a4b5c6d7e8f90
```

Pass the absolute path to your `snap_create` binary (which must match `whitelist_binpath`) followed by any extra arguments your binary accepts. The UID printed in the response is the same UID injected as `--uid` to every invocation of `snap_create` across the cluster.

!!! warning "`snapshot` is a hidden `fdbcli` command"
    In both `release-7.3` and `release-7.4` of `apple/foundationdb`, `snapshot` is registered as a **hidden** command (`CommandFactory snapshotFactory("snapshot")` in `fdbcli/SnapshotCommand.actor.cpp`, marked `// hidden commands, no help text for now`). It is fully functional, but it does **not** appear in `fdbcli> help` output. Invoke it directly by name.

### Restore Steps

A disk-snapshot restore reconstitutes a new FDB cluster from a previously captured set of per-role snapshot images. Roughly:

1. **Locate snapshot images by UID.** Identify all images that share the same snapshot UID — one per role per process across the original cluster.
2. **Group by old IP / locality.** Use the captured metadata to group images by the original process's IP, port, and locality. Each group corresponds to one process worth of state.
3. **Provision new cluster nodes.** Decide on the IP layout for the new cluster, build a mapping from old IP → new IP, and attach (or copy) each image to the corresponding new host into the same data directory layout per role.
4. **Recompute `fdb.cluster`.** Rewrite the cluster file with the new coordinator IPs (taken from the IP mapping). Distribute the new cluster file to every node.
5. **Start `fdbserver` on the new nodes.** With the data directories in place and the new cluster file pointing at the new coordinators, the cluster will recover automatically to the snapshot's FDB version.

!!! warning "Multi-role processes share a data directory"
    If a single `fdbserver` on the original cluster ran multiple roles out of one data directory (for example, a combined storage + tlog), the disk image will contain files for all of those roles. When restoring such an image into a node that should serve only one of those roles, the operator must delete the on-disk files belonging to the other roles before starting `fdbserver`, or the process will refuse to start. Plan the role-to-node mapping carefully when designing the restore.

### Error Codes

`snap_create` failures and orchestration errors surface through standard FoundationDB error codes. The most relevant are:

| Code | Name | Description | Suggested action |
|------|------|-------------|------------------|
| 2500 | `snap_disable_tlog_pop_failed` | Failed to disable tlog popping during snapshot. | Retry; check tlog process health. |
| 2501 | `snap_storage_failed` | `snap_create` invocation on a storage process failed. | Check `snap_create` logs on the affected storage host. |
| 2502 | `snap_tlog_failed` | `snap_create` invocation on a tlog process failed. | Check `snap_create` logs on the affected tlog host. |
| 2503 | `snap_coord_failed` | `snap_create` invocation on a coordinator failed. | Check `snap_create` logs on the affected coordinator. |
| 2504 | `snap_enable_tlog_pop_failed` | Failed to re-enable tlog popping after snapshot. | Investigate tlog state; popping may need to be re-enabled manually. |
| 2505 | `snap_path_not_whitelisted` | The supplied binary is not present in `whitelist_binpath`. | Add the binary path to `whitelist_binpath` in `foundationdb.conf` and restart. |
| 2506 | `snap_not_fully_recovered_unsupported` | Cluster has not fully recovered; snapshot is not allowed. | Wait for cluster recovery to complete, then retry. |
| 2507 | `snap_log_anti_quorum_unsupported` | Snapshot is not supported with log anti-quorum configured. | Reconfigure the cluster without log anti-quorum to use disk snapshots. |
| 2508 | `snap_with_recovery_unsupported` | Snapshot was attempted concurrently with recovery. | Retry once recovery completes. |
| 4000 | `snap_invalid_uid_string` | The supplied UID string is malformed. | Use a valid UID (the API generates one for you when called from `fdbcli`). |

!!! warning "Limitations"
    - **No continuous / point-in-time recovery.** Each snapshot captures one FDB version; you cannot replay forward to an arbitrary later version.
    - **Linux only.** Windows is not supported.
    - **Encryption depends on the storage layer.** FoundationDB does not encrypt the snapshot images itself — encryption-at-rest is whatever your filesystem, EBS volume, or storage backend provides.
    - **Operator-built tooling.** The `snap_create` binary, snapshot transport, and restore orchestration are entirely the operator's responsibility.
    - **Restore version is fixed.** A restore brings the cluster up at exactly the version captured by the snapshot; you cannot choose a different version at restore time.

### Programmatic API

Disk snapshot backup can also be triggered from application code via the C API ([apple/foundationdb#4241](https://github.com/apple/foundationdb/pull/4241)):

```c
const char *uid = "a1b2c3d4e5f60718293a4b5c6d7e8f90";
FDBFuture *f = fdb_database_create_snapshot(db, uid, strlen(uid));
```

The caller supplies the UID (typically a freshly generated 32-character hex string), and `fdbserver` invokes the configured `snap_create` binary on each role exactly as it would for `fdbcli> snapshot`. The future resolves once the cluster-wide snapshot has either succeeded or failed.

### Cleanup

FoundationDB does **not** garbage-collect old or failed disk-snapshot images. If a snapshot operation fails partway through, or if a successful snapshot ages out of the operator's retention policy, the on-disk (or on-EBS, or on-S3) artifacts must be expired by external tooling — for example, a cron job that lists snapshots older than _N_ days and deletes them, or lifecycle policies on the underlying storage. Plan a cleanup strategy before enabling disk snapshot backup in production.


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

{% if fdb_version >= "7.3" %}
### Backup Encryption <span class="pill-new">NEW IN 7.3</span>

Starting in FoundationDB 7.3, backups support **native file-level encryption**. When enabled, backup data is encrypted before being written to the backup destination, providing end-to-end encryption regardless of the storage backend.

#### Enabling Encryption

To enable encryption on an existing backup, use the `fdbbackup modify` command:

```bash
fdbbackup modify -t default --encryption
```

New backups can also be started with encryption enabled:

```bash
fdbbackup start -d "blobstore://s3.amazonaws.com/my-bucket/fdb-backup" --encryption
```

!!! note
    Encryption applies to newly written backup files. Existing unencrypted files in the backup are not retroactively encrypted.

#### Checking Encryption Status

**Backup status** — Encryption key information is included in the backup status JSON output:

```bash
fdbbackup status -t default --json
```

The JSON output includes encryption key details when encryption is active.

**Backup describe** — The `fdbbackup describe` output includes a `FileLevelEncryption` field indicating whether the backup is encrypted:

```bash
fdbbackup describe -d "blobstore://s3.amazonaws.com/my-bucket/fdb-backup" --json
```

Look for the `FileLevelEncryption` field in the JSON response to confirm encryption is enabled.

!!! tip
    Native backup encryption works with all backup destinations including S3 blob storage and local filesystem targets. It can be combined with S3 server-side encryption for defense in depth.
{% endif %}

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

