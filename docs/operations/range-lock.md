---
title: Range Lock
description: Block write traffic to specific key ranges for data operations
---

# Range Lock <span class="pill-new">NEW IN 7.4</span> <span class="pill-experimental">EXPERIMENTAL</span>

{% if fdb_version < "7.4" %}
!!! warning "Version Notice"
    This feature is only available in FoundationDB 7.4 and later. You are viewing docs for version {{ fdb_version }}.
{% endif %}

Range Lock is a feature that blocks write traffic to specific key ranges in FoundationDB. It's primarily used internally by features like [Bulk Load](bulk-load.md) to ensure data consistency during bulk operations.

## Overview

When a range lock is active:

- **Reads**: Continue to work normally
- **Writes**: Blocked with `transaction_rejected_range_locked` error
- **Scope**: Must be within user key space (`"" ~ \xff`)

!!! warning "Experimental Feature"
    Range Lock is an experimental feature. The API and behavior may change in future releases.

## Lock Types

| Type | Description | Status |
|------|-------------|--------|
| **Exclusive Read Lock** | Blocks writes, allows reads. Only one user can hold this lock. | Implemented |
| **Write Lock** | Blocks both reads and writes. | Not implemented |
| **Non-exclusive Read Lock** | Multiple users can read simultaneously. | Not implemented |

!!! note "Current Implementation"
    Only the exclusive read lock is currently implemented. Despite its name, it blocks writes (not reads), providing exclusive access for operations like bulk loading.

## Use Cases

### Bulk Load Operations

Bulk Load uses range locks to ensure data consistency:

1. Lock the target range to prevent user writes
2. Load data directly into storage servers
3. Release the lock when complete

```
BulkLoad → Lock Range → Inject Data → Unlock Range
```

### Custom Data Operations

Applications that need exclusive access to a key range for maintenance or migration can use range locks through the Management API.

## Management API

Range locks are managed through the FoundationDB Management API:

### Register Lock Owner

Before acquiring locks, register an owner identity:

```cpp
ACTOR Future<Void> registerRangeLockOwner(
    Database cx,
    RangeLockOwnerName ownerUniqueID,
    std::string description
);
```

### Acquire Lock

Take an exclusive read lock on a range:

```cpp
ACTOR Future<Void> takeExclusiveReadLockOnRange(
    Database cx,
    KeyRange range,
    RangeLockOwnerName ownerUniqueID
);
```

### Release Lock

Release the lock when done:

```cpp
ACTOR Future<Void> releaseExclusiveReadLockOnRange(
    Database cx,
    KeyRange range,
    RangeLockOwnerName ownerUniqueID
);
```

### Query Locks

Find existing locks on a range:

```cpp
ACTOR Future<std::vector<std::pair<KeyRange, RangeLockState>>>
findExclusiveReadLockOnRange(Database cx, KeyRange range);
```

## Error Handling

When a transaction writes to a locked range, it receives:

```
Error: transaction_rejected_range_locked
```

This error is retryable through `Transaction.onError()`, similar to other conflict errors.

```cpp
// Transactions automatically retry on range lock errors
loop {
    try {
        tr.set(key, value);
        wait(tr.commit());
        break;
    } catch (Error& e) {
        wait(tr.onError(e));  // Handles range_lock errors
    }
}
```

## Internal Design

Range lock metadata is stored in system key space:

- Lock data: `\xff/rangeLock/`
- Owner registry: `\xff/rangeLockOwner/`

### Commit Proxy Enforcement

1. Lock mutations update commit proxy in-memory maps
2. When mutations arrive, proxies check lock status
3. Locked mutations are rejected in post-resolution phase
4. Locking mutations add write conflict ranges for atomicity

## Compatibility

| Feature | Compatibility |
|---------|---------------|
| **Database Lock** | Range locks work independently; lock-aware transactions can still update lock metadata |
| **Backup/Restore** | May cause mutation loss during restore; auto-retry from clean state |
| **Version Vector** | Not compatible; disable version vector when using range locks |

## Limitations

- Exclusive read lock is currently the only lock type
- Range must be within user key space
- Not compatible with version vector mode

## See Also

- [Bulk Load & Dump](bulk-load.md) - Primary consumer of range locks
- [Audit Storage](audit-storage.md) - Verify data consistency

