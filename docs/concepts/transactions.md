---
title: Transactions
description: Understanding FoundationDB's transaction model
---

# Transactions

FoundationDB provides ACID transactions across the entire database.

!!! note "Coming Soon"
    This section is being migrated from the original FoundationDB documentation.

## Transaction Basics

Every operation in FoundationDB happens within a transaction:

```python
@fdb.transactional
def transfer_funds(tr, from_acct, to_acct, amount):
    from_balance = int(tr[from_acct])
    to_balance = int(tr[to_acct])
    
    tr[from_acct] = str(from_balance - amount).encode()
    tr[to_acct] = str(to_balance + amount).encode()
```

## Optimistic Concurrency

FoundationDB uses optimistic concurrency control:

1. Read values during transaction
2. Write values (buffered locally)
3. Commit - validates no conflicts
4. Retry if conflicts detected

## Conflict Resolution

The `@fdb.transactional` decorator handles retries automatically:

```python
@fdb.transactional
def safe_increment(tr, key):
    value = int(tr[key] or b'0')
    tr[key] = str(value + 1).encode()
```

## Next Steps

- Understand [ACID Guarantees](acid.md)
- Learn about [Architecture](architecture.md)

