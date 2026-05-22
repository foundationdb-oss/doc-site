---
title: Version Overview
description: Comparison of FoundationDB versions 7.1, 7.3, and 7.4 with status, features, and upgrade paths
---

# Version Overview

This page provides a comprehensive overview of FoundationDB versions, their status, and guidance for choosing the right version for your deployment.

!!! tip "Looking ahead?"
    For features merged upstream that are **not yet** in a released 7.3.x / 7.4.x build (and work targeting an eventual 8.0), see [What's Next / 8.0 Preview](roadmap.md).

## Supported Versions

| Version | Status | Docker Tag | Recommended For |
|---------|--------|------------|-----------------|
| **7.3** | :material-check-circle:{ .text-green } **Stable** | `foundationdb/foundationdb:7.3.77` | New deployments |
| **7.4** | :material-alert:{ .text-orange } Pre-release | `foundationdb/foundationdb:7.4.6` | Testing & evaluation |
| **7.1** | :material-archive:{ .text-grey } Legacy | `foundationdb/foundationdb:7.1.67` | Existing deployments |

## Version Lifecycle

Understanding version status helps you make informed deployment decisions:

**:material-check-circle:{ .text-green } Stable**
:   The recommended version for production deployments. Receives bug fixes and security updates. Currently: **7.3**.

**:material-alert:{ .text-orange } Pre-release**
:   Contains new features under development. Not recommended for production. Use for testing upcoming capabilities. Currently: **7.4**.

**:material-archive:{ .text-grey } Legacy**
:   Previous stable releases. Still supported but users should plan upgrades. Currently: **7.1**.

## Version Documentation

Each version has dedicated documentation reflecting its specific features and configuration:

<div class="grid cards" markdown>

-   :material-star:{ .lg .middle } **[7.3 Documentation](/7.3/)**

    ---

    Current stable release. Recommended for all new deployments.

-   :material-flask:{ .lg .middle } **[7.4 Documentation](/7.4/)**

    ---

    Pre-release with experimental Backup V2 and Bulk Loading features.

-   :material-history:{ .lg .middle } **[7.1 Documentation](/7.1/)**

    ---

    Legacy release. Plan upgrade to 7.3.

</div>

## Key Differences Between Versions

### Storage Engine Names

The Redwood storage engine was renamed between versions:

| Engine | 7.1 | 7.3 / 7.4 |
|--------|-----|-----------|
| Redwood | `ssd-redwood-1-experimental` | `ssd-redwood-1` |
| RocksDB | `ssd-rocksdb-v1` (experimental) | `ssd-rocksdb-v1` (experimental) |
| SQLite | `ssd-2` (default) | `ssd-2` (default) |

!!! note "Redwood in 7.1"
    Despite the `-experimental` suffix in 7.1, Redwood is production-ready in all supported versions.

### Version-Specific Features

=== "7.4 (Pre-release)"

    - **Backup V2** *(experimental)*: backup workers write mutation logs to blob storage directly from the cluster, cutting log-system writes by ~50%. See the [Backup V2 section in Backup & Recovery](../operations/backup.md#overview).
    - **Bulk Loading**: Experimental support for efficient data loading
    - **Go Binding Change**: `Close()` now required on Database objects
    - All 7.3 features

=== "7.3 (Stable)"

    - **Redwood Production Ready**: Storage engine name changed from `ssd-redwood-1-experimental` to `ssd-redwood-1`
    - **Improved Stability**: Enhanced reliability and performance tuning
    - **Better Monitoring**: Additional metrics and status reporting
    - All 7.1 features

=== "7.1 (Legacy)"

    - **GetMappedRange** *(experimental)*: Advanced range query capabilities for secondary indexes
    - **Version Vector**: Enhanced conflict detection for improved transaction throughput
    - **RocksDB**: Experimental storage engine support

### Feature Availability Matrix

| Feature | 7.1 | 7.3 | 7.4 |
|---------|:---:|:---:|:---:|
| Redwood Storage Engine | ✅ (experimental) | ✅ (production) | ✅ (production) |
| RocksDB Storage Engine | ✅ (experimental) | ✅ (experimental) | ✅ (experimental) |
| GetMappedRange | ✅ (experimental) | ✅ (experimental) | ✅ (experimental) |
| Version Vectors | ✅ | ✅ | ✅ |
| Backup V2 (partitioned-log writes) | ❌ | ❌ | ✅ (experimental) |
| Bulk Loading | ❌ | ❌ | ✅ (experimental) |

!!! info "Backup V2, Backup V3, and Parallel Restore are three different things"
    - **Backup V2** — write-side improvement shipping in 7.4 **as experimental** (pre-release; format not yet frozen, see [Backup & Recovery](../operations/backup.md#overview)).
    - **Backup V3** — *separate*, in-development project focused on **restore** performance via parallel log upload/download. Not in any released version. See the [Backup V3 note in Backup & Recovery](../operations/backup.md#backup-v3).
    - **Parallel Restore** — *earlier, unrelated* attempt at faster restore that was removed from the codebase. Listed below under [Deprecated Features](#deprecated-features).

## Storage Engine Compatibility

| Engine | 7.1 | 7.3 | 7.4 | Production Ready |
|--------|:---:|:---:|:---:|:----------------:|
| SQLite (`ssd-2`) | ✅ | ✅ | ✅ | Yes |
| Redwood | ✅ | ✅ | ✅ | Yes |
| RocksDB | ✅ | ✅ | ✅ | No (experimental) |

!!! tip "Choosing a Storage Engine"
    **Redwood** is recommended for most deployments. It offers better performance than SQLite and is production-ready. Use SQLite for small deployments or when disk space is limited.

## Upgrade Paths

### Recommended Upgrade Sequence

```mermaid
graph LR
    A[7.1] -->|Upgrade| B[7.3]
    B -->|Upgrade| C[7.4]
    style B fill:#4caf50,color:white
    style C fill:#ff9800,color:white
    style A fill:#9e9e9e,color:white
```

### Upgrade Considerations

| From | To | Notes |
|------|-----|-------|
| 7.1 | 7.3 | Safe direct upgrade. Review storage engine name changes. |
| 7.3 | 7.4 | Pre-release only. Wait for stable release for production. |
| 7.1 | 7.4 | Not recommended. Upgrade to 7.3 first. |

!!! warning "Pre-release Warning"
    Version 7.4 is a pre-release and should not be used in production environments. Wait for the stable release before upgrading production clusters.

## API Version Compatibility

FoundationDB uses API versioning to maintain backward compatibility. Clients specify which API version they target:

| FDB Version | API Version | Min Supported API | Notes |
|-------------|-------------|-------------------|-------|
| **7.4** | `{{ "740" }}` | 510 | Latest API features |
| **7.3** | `{{ "730" }}` | 510 | Stable API |
| **7.1** | `{{ "710" }}` | 510 | Legacy API |

!!! info "API Version Best Practice"
    Always specify an explicit API version when opening a database connection. This ensures your application behaves consistently even when the underlying client library is upgraded.

    ```python
    import fdb
    fdb.api_version(730)  # Lock to 7.3 API behavior
    ```

## Client Library Versions

Always match your client library version to your cluster version:

| Cluster Version | Python | Java | Go |
|-----------------|--------|------|----|
| 7.1.x | 7.1.x | `org.foundationdb:fdb-java:7.1.x` | `github.com/apple/foundationdb/bindings/go@v7.1.x` |
| 7.3.x | 7.3.x | `org.foundationdb:fdb-java:7.3.x` | `github.com/apple/foundationdb/bindings/go@v7.3.x` |
| 7.4.x | 7.4.x | `org.foundationdb:fdb-java:7.4.x` | `github.com/apple/foundationdb/bindings/go@v7.4.x` |

### Go Binding Breaking Change (7.4+)

!!! warning "Go Binding: Close() Required in 7.4+"
    Starting in version 7.4, the Go binding **requires** calling `Close()` on the `Database` object when you're done using it. Failure to call `Close()` will result in resource leaks.

    **Before 7.4:**
    ```go
    db := fdb.MustOpenDefault()
    // Use db... no Close() needed
    ```

    **7.4 and later:**
    ```go
    db := fdb.MustOpenDefault()
    defer db.Close()  // Required!
    // Use db...
    ```

    This change was made to properly release native resources and prevent memory leaks in long-running applications.

## Deprecated Features

The following features have been deprecated and removed from FoundationDB. Users should not build new functionality on any of these features.

!!! warning "Do Not Use Deprecated Features"
    These features are no longer supported and have been removed from the codebase. Any existing usage should be migrated to the recommended alternatives where available.

| Feature | Status | Details |
|---------|--------|---------|
| **Dynamic Knobs** | Removed | Dynamic knobs have been removed. Use static knobs for all configuration. |
| **Encryption at Rest** | Deprecated and removed | The encryption at rest feature has been deprecated and removed from FoundationDB. |
| **Metacluster** | Deprecated and removed | The metacluster feature has been deprecated and removed from FoundationDB. |
| **Blob Granules** | Deprecated and removed | The blob granules feature has been deprecated and removed from FoundationDB. |
| **Parallel Restore** | Removed | Earlier experimental feature that was never fully released. **Distinct from Backup V2 (a 7.4 write-side feature) and Backup V3 (an in-development, independent restore-side rework — not a successor to Parallel Restore).** Removed from the codebase; see the [Backup V3 note](../operations/backup.md#backup-v3) for the separate, in-progress effort. |

## Next Steps

- [Installation Guide](installation.md) - Install your chosen version
- [Quick Start](quickstart.md) - Connect and run your first transaction
- [Storage Engines](../guides/storage-engines.md) - Learn about storage engine options
- [What's Next / 8.0 Preview](roadmap.md) - Features merged upstream and targeted for upcoming releases

