---
title: Python API
description: FoundationDB Python client library reference
---

# Python API

The Python client provides a Pythonic interface to FoundationDB with decorators, context managers, and async support.

[:octicons-book-24: Official API Docs](https://apple.github.io/foundationdb/api-python.html){ .md-button }

## Installation

=== "pip"

    ```bash
    pip install foundationdb
    ```

=== "conda"

    ```bash
    conda install -c conda-forge python-foundationdb
    ```

!!! note "Prerequisites"
    The FoundationDB client library must be installed on your system. See [Installation](../getting-started/installation.md).

## Quick Start

```python
import fdb

# REQUIRED: Set API version before any other FDB calls
fdb.api_version(730)

# Open the default database
db = fdb.open()

# Simple transaction using decorator
@fdb.transactional
def hello_world(tr):
    tr[b'hello'] = b'world'
    return tr[b'hello']

result = hello_world(db)
print(result)  # b'world'
```

## Core Concepts

### API Versioning

Always set the API version at program startup:

```python
import fdb
fdb.api_version(730)  # FoundationDB 7.3
```

!!! warning "Version Lock"
    Once set, the API version cannot be changed. Call `api_version()` before any other FDB operations.

### Opening the Database

```python
# Default cluster file location
db = fdb.open()

# Custom cluster file
db = fdb.open('/path/to/fdb.cluster')

# With event loop (for async)
db = fdb.open(event_model='asyncio')
```

## Transactions

### Using the Decorator

The `@fdb.transactional` decorator is the recommended approach:

```python
@fdb.transactional
def transfer_funds(tr, from_acct, to_acct, amount):
    """Transfer funds between accounts atomically."""
    from_key = fdb.tuple.pack(('accounts', from_acct))
    to_key = fdb.tuple.pack(('accounts', to_acct))

    from_balance = int(tr[from_key] or b'0')
    to_balance = int(tr[to_key] or b'0')

    if from_balance < amount:
        raise ValueError("Insufficient funds")

    tr[from_key] = str(from_balance - amount).encode()
    tr[to_key] = str(to_balance + amount).encode()

# Pass database as first argument
transfer_funds(db, 'alice', 'bob', 100)
```

!!! tip "Automatic Retry"
    The decorator automatically retries on transient errors and conflict.

### Context Manager

For more control, use the context manager:

```python
with db.transaction() as tr:
    tr[b'key1'] = b'value1'
    tr[b'key2'] = b'value2'
    # Commits automatically on exit
```

### Manual Transactions

For fine-grained control:

```python
tr = db.create_transaction()
try:
    tr[b'key'] = b'value'
    tr.commit().wait()
except fdb.FDBError as e:
    tr.on_error(e).wait()
    # Retry logic here
```

## Reading Data

### Single Key

```python
@fdb.transactional
def get_value(tr, key):
    return tr[key]  # Returns None if not found
```

### Range Reads

```python
@fdb.transactional
def get_range(tr, start, end):
    """Read all key-value pairs in range."""
    return list(tr.get_range(start, end))

@fdb.transactional
def get_all_users(tr):
    """Read all users using tuple keys."""
    start = fdb.tuple.pack(('users',))
    end = fdb.tuple.pack(('users', None))  # None is max value

    users = []
    for key, value in tr.get_range(start, end):
        _, user_id = fdb.tuple.unpack(key)
        users.append((user_id, value.decode()))
    return users
```

### Range Options

```python
@fdb.transactional
def get_with_options(tr):
    # Limit results
    result = tr.get_range(start, end, limit=100)

    # Reverse order
    result = tr.get_range(start, end, reverse=True)

    # Streaming mode for large ranges
    result = tr.get_range(start, end, streaming_mode=fdb.StreamingMode.want_all)
```

## Writing Data

### Set and Clear

```python
@fdb.transactional
def write_data(tr):
    # Set a value
    tr[b'key'] = b'value'

    # Clear a key
    del tr[b'key']

    # Clear a range
    tr.clear_range(b'prefix\x00', b'prefix\xff')
```

### Atomic Operations

```python
@fdb.transactional
def atomic_ops(tr, key):
    # Atomic add (for counters)
    tr.add(key, struct.pack('<q', 1))

    # Bitwise operations
    tr.bit_and(key, b'\xff\x00')
    tr.bit_or(key, b'\x00\xff')
    tr.bit_xor(key, b'\xaa\x55')

    # Min/max
    tr.min(key, struct.pack('<q', 10))
    tr.max(key, struct.pack('<q', 100))

    # Compare and clear
    tr.compare_and_clear(key, b'expected')
```

## Tuple Layer

The tuple layer provides structured key encoding:

```python
from fdb import tuple

# Pack tuples into keys
key = tuple.pack(('users', 'alice', 'profile'))
# Result: b'\x02users\x00\x02alice\x00\x02profile\x00'

# Unpack keys into tuples
values = tuple.unpack(key)
# Result: ('users', 'alice', 'profile')

# Supported types: str, bytes, int, float, bool, None, UUID
key = tuple.pack(('data', 42, 3.14, True, None))
```

## Directory Layer

Organize keys hierarchically:

```python
# Open the directory layer
directory = fdb.directory.create_or_open(db, ('myapp',))

# Create subspaces
users = directory.create_or_open(db, ('users',))
orders = directory.create_or_open(db, ('orders',))

# Use subspace for keys
@fdb.transactional
def create_user(tr, user_id, name):
    tr[users.pack((user_id, 'name'))] = name.encode()
    tr[users.pack((user_id, 'created'))] = str(time.time()).encode()
```

## Error Handling

### Retryable Errors

```python
@fdb.transactional
def safe_operation(tr):
    # Transactional decorator handles retries
    value = tr[b'counter']
    tr[b'counter'] = str(int(value or b'0') + 1).encode()
```

### Non-Retryable Errors

```python
try:
    result = some_operation(db)
except fdb.FDBError as e:
    if e.code == 1007:  # past_version
        print("Transaction too old")
    elif e.code == 1009:  # future_version
        print("Cluster version ahead")
    else:
        raise
```

### Common Error Codes

| Code | Name | Description |
|------|------|-------------|
| 1007 | `past_version` | Transaction took too long |
| 1009 | `future_version` | Cluster ahead of client |
| 1020 | `not_committed` | Conflict during commit |
| 1021 | `commit_unknown_result` | Commit may have succeeded |
| 2000 | `client_invalid_operation` | Invalid API usage |

## Async Support

### With asyncio

```python
import asyncio
import fdb

fdb.api_version(730)
db = fdb.open()

async def async_operation():
    @fdb.transactional
    async def read_write(tr):
        value = await tr[b'key']
        tr[b'key2'] = value + b'_modified'
        return value

    return await read_write(db)

asyncio.run(async_operation())
```

## Common Patterns

### Counters

```python
import struct

@fdb.transactional
def increment(tr, counter_key):
    tr.add(counter_key, struct.pack('<q', 1))

@fdb.transactional
def get_count(tr, counter_key):
    value = tr[counter_key]
    if value is None:
        return 0
    return struct.unpack('<q', value)[0]
```

### Presence Checking

```python
@fdb.transactional
def exists(tr, key):
    return tr[key] is not None
```

### Pagination

```python
@fdb.transactional
def get_page(tr, prefix, page_size, last_key=None):
    start = last_key + b'\x00' if last_key else prefix
    end = fdb.KeySelector.first_greater_or_equal(prefix + b'\xff')

    results = list(tr.get_range(start, end, limit=page_size + 1))

    has_more = len(results) > page_size
    if has_more:
        results = results[:page_size]

    return results, has_more
```

## Best Practices

!!! success "Do"
    - Use `@fdb.transactional` decorator for automatic retry
    - Keep transactions short (< 5 seconds)
    - Use tuple layer for structured keys
    - Handle `FDBError` exceptions appropriately

!!! failure "Don't"
    - Don't perform I/O inside transactions
    - Don't hold transactions open during user input
    - Don't ignore conflict errors in critical paths
    - Don't store values > 100KB (use chunking)

## Further Reading

- [:octicons-book-24: Official Python API Reference](https://apple.github.io/foundationdb/api-python.html)
- [:octicons-code-24: Python Recipes](../guides/design-recipes.md)
- [:octicons-graph-24: Data Modeling Guide](../concepts/data-model.md)

