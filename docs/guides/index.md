---
title: Guides
description: Practical guides for building with FoundationDB
---

# Guides

Practical guides for building applications with FoundationDB, from design patterns to deep internals.

<div class="grid cards" markdown>

-   :material-book-open-variant:{ .lg .middle } **Design Recipes**

    ---

    Common patterns and solutions for FoundationDB applications.

    [:octicons-arrow-right-24: Design Recipes](design-recipes.md)

-   :material-check-all:{ .lg .middle } **Best Practices**

    ---

    Guidelines for building robust, performant applications.

    [:octicons-arrow-right-24: Best Practices](best-practices.md)

-   :material-flask:{ .lg .middle } **Internals & Deep Dives**

    ---

    Advanced content: architecture, simulation testing, and storage engines.

    [:octicons-arrow-right-24: Internals Overview](internals-overview.md)

{% if fdb_version >= "7.3" %}
-   :material-account-group:{ .lg .middle } **Tenants** <span class="pill-new">NEW in 7.3</span>

    ---

    Configure multi-tenant key-space isolation for workload separation.

    [:octicons-arrow-right-24: Tenants](tenants.md)

-   :material-shield-key:{ .lg .middle } **Authorization** <span class="pill-new">NEW in 7.3</span>

    ---

    Tenant-scoped access control with JWT tokens.

    [:octicons-arrow-right-24: Authorization](authorization.md)
{% endif %}

</div>

## What You'll Learn

These guides cover practical patterns for common use cases:

- **Data Modeling** - Structure your keys for efficient queries
- **Concurrency Patterns** - Handle conflicts gracefully
- **Performance Optimization** - Get the most from your cluster
- **Error Handling** - Build resilient applications

## Prerequisites

Before diving into these guides, you should:

- [x] Complete the [Getting Started](../getting-started/index.md) section
- [x] Understand [Core Concepts](../concepts/index.md)
- [x] Have a running FoundationDB cluster

## Recipe Index

| Recipe | Use Case |
|--------|----------|
| Counters | Atomic increment/decrement |
| Queues | FIFO task processing |
| Indexes | Secondary access patterns |
| Blob Storage | Large value handling |

## Deep Dive Topics

For advanced users who want to understand FDB's internals:

| Topic | Description |
|-------|-------------|
| [Simulation Testing](simulation-testing.md) | FDB's deterministic testing approach |
| [Architecture Deep Dive](architecture-deep-dive.md) | Transaction processing & consensus |
| [Storage Engines](storage-engines.md) | Redwood, SSD, and memory engines |

!!! tip "Request a Recipe"
    Missing a pattern you need? [Open an issue](https://github.com/foundationdb-oss/doc-site/issues) on GitHub.

