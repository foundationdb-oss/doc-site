---
title: Data Model
description: Understanding FoundationDB's key-value data model
---

# Data Model

FoundationDB uses an ordered key-value store as its core data model.

!!! note "Coming Soon"
    This section is being migrated from the original FoundationDB documentation.

## Key-Value Pairs

At its core, FoundationDB stores data as ordered key-value pairs:

- **Keys**: Arbitrary byte strings (up to 10KB)
- **Values**: Arbitrary byte strings (up to 100KB)
- **Ordering**: Keys are sorted lexicographically

## Key Design

Keys in FoundationDB should be designed carefully:

```python
# Using the tuple layer for structured keys
from fdb.tuple import pack, unpack

# Create a key for user data
key = pack(('users', user_id, 'profile'))
```

## Layers

FoundationDB provides several layers for working with data:

- **Tuple Layer**: Structured key encoding
- **Directory Layer**: Hierarchical key management
- **Subspace**: Key prefix management

## Next Steps

- Learn about [Transactions](transactions.md)
- Understand [ACID Guarantees](acid.md)

