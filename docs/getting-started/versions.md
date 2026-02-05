---
title: Version Overview
description: Comparison of FoundationDB versions 7.1, 7.3, and 7.4 with status, features, and upgrade paths
---

# Version Overview

This page provides a comprehensive overview of FoundationDB versions, their status, and guidance for choosing the right version for your deployment.

## Supported Versions

| Version | Status | Docker Tag | Recommended For |
|---------|--------|------------|-----------------|
| **7.3** | :material-check-circle:{ .text-green } **Stable** | `foundationdb/foundationdb:7.3.71` | New deployments |
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

    Pre-release with Backup V2 and bulk loading features.

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

    - **Backup V2**: 50% reduction in write amplification during backups
    - **Bulk Loading**: Experimental support for efficient data loading
    - All 7.3 features

=== "7.3 (Stable)"

    - **Redwood renamed**: Storage engine name simplified
    - **Improved stability**: Enhanced reliability and performance
    - All 7.1 features

=== "7.1 (Legacy)"

    - **GetMappedRange**: Advanced range query capabilities
    - **Version Vector**: Enhanced conflict detection
    - **RocksDB**: Experimental storage engine support

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

## Client Library Versions

Always match your client library version to your cluster version:

| Cluster Version | Python | Java |
|-----------------|--------|------|
| 7.1.x | 7.1.x | `org.foundationdb:fdb-java:7.1.x` |
| 7.3.x | 7.3.x | `org.foundationdb:fdb-java:7.3.x` |
| 7.4.x | 7.4.x | `org.foundationdb:fdb-java:7.4.x` |

## Next Steps

- [Installation Guide](installation.md) - Install your chosen version
- [Quick Start](quickstart.md) - Connect and run your first transaction
- [Storage Engines](../guides/storage-engines.md) - Learn about storage engine options

