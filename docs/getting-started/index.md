---
title: Getting Started
description: Install FoundationDB and build your first application
---

# Getting Started

Get up and running with FoundationDB in minutes.

<div class="grid cards" markdown>

-   :material-download:{ .lg .middle } **Installation**

    ---

    Install FoundationDB on Linux, macOS, or Windows.

    [:octicons-arrow-right-24: Install now](installation.md)

-   :material-rocket-launch:{ .lg .middle } **Quick Start**

    ---

    Connect to FoundationDB and run your first transaction.

    [:octicons-arrow-right-24: Get started](quickstart.md)

-   :material-application:{ .lg .middle } **First Application**

    ---

    Build a complete application with FoundationDB.

    [:octicons-arrow-right-24: Build an app](first-app.md)

</div>

## What is FoundationDB?

FoundationDB is a distributed database designed to handle large volumes of structured data across clusters of commodity servers. It organizes data as an ordered key-value store and employs ACID transactions for all operations.

**Key features:**

- :white_check_mark: **ACID transactions** across the entire cluster
- :white_check_mark: **Horizontal scaling** to hundreds of nodes
- :white_check_mark: **High availability** with automatic failover
- :white_check_mark: **Low latency** for both reads and writes

## Version Highlights

{% if fdb_version == "7.4" %}
!!! tip "New in {{ fdb_version }}"
    - **Backup V2** — 50% reduction in write amplification during backups
    - **Bulk Loading** {{ version_pill("7.4", "experimental") }} — Efficient data loading/dumping for migrations
    - **Range Locks** {{ version_pill("7.4", "experimental") }} — Fine-grained locking for specific key ranges
    - **gRPC Integration** {{ version_pill("7.4", "experimental") }} — Native gRPC support for client communication
    - **Go Binding Change** — `Close()` must now be called on Database objects

{% elif fdb_version == "7.3" %}
!!! info "Highlights in {{ fdb_version }}"
    - **Redwood Storage Engine** — Now production-ready as `ssd-redwood-1` (renamed from `ssd-redwood-1-experimental`)
    - **Gray Failure Detection** — Improved detection of partial failures and degraded nodes
    - **Physical Shard Support** — Better control over data placement and movement

{% elif fdb_version == "7.1" %}
!!! note "Key Features in {{ fdb_version }}"
    - **GetMappedRange** — Index prefetch for efficient secondary index lookups
    - **Version Vector** {{ version_pill("7.1", "experimental") }} — Enhanced conflict detection for better concurrency
    - **RocksDB Storage Engine** {{ version_pill("7.1", "experimental") }} — Alternative storage backend
    - **USE_GRV_CACHE** — Transaction option for reduced latency on read-heavy workloads

{% endif %}

## Prerequisites

Before you begin, ensure you have:

- A supported operating system (Linux, macOS, or Windows)
- At least 1GB of RAM available
- Network connectivity (for cluster deployments)

## Next Steps

After completing this section, continue to [Core Concepts](../concepts/index.md) to understand how FoundationDB works under the hood.

