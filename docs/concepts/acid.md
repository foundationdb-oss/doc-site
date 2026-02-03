---
title: ACID Guarantees
description: FoundationDB's strong consistency guarantees
---

# ACID Guarantees

FoundationDB provides full ACID guarantees for all transactions.

!!! note "Coming Soon"
    This section is being migrated from the original FoundationDB documentation.

## Atomicity

All operations in a transaction succeed or fail together:

- No partial writes
- Automatic cleanup on failure
- Consistent state always

## Consistency

The database moves from one valid state to another:

- Constraints maintained
- Invariants preserved
- No corruption possible

## Isolation

Transactions appear to execute serially:

- Serializable isolation level
- No dirty reads
- No phantom reads
- Snapshot reads available

## Durability

Committed transactions survive failures:

- Synchronous replication
- Configurable redundancy
- Recovery guarantees

## Comparison

| Property | FoundationDB | Traditional RDBMS |
|----------|--------------|-------------------|
| Isolation | Serializable | Varies |
| Scale | Distributed | Single node |
| Latency | Low | Low |

## Next Steps

- Learn about [Architecture](architecture.md)
- Explore [Best Practices](../guides/best-practices.md)

