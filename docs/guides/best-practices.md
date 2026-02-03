---
title: Best Practices
description: Guidelines for building robust, performant FoundationDB applications
---

# Best Practices

Guidelines for building reliable, high-performance applications with FoundationDB.

## Transaction Design

### Keep Transactions Short

Transactions should complete quickly—ideally under 5 seconds. Long transactions are more likely to conflict and be retried.

```python
# ✅ Good: Small, focused transaction
@fdb.transactional
def update_user_email(tr, user_id, new_email):
    tr[user_key(user_id, 'email')] = new_email

# ❌ Bad: Doing too much in one transaction
@fdb.transactional
def process_all_users(tr):
    for user_id in get_all_user_ids(tr):  # Could be millions!
        process_user(tr, user_id)
```

### Use the `@transactional` Decorator

Always use the transaction decorator (or equivalent) to handle automatic retries:

=== "Python"

    ```python
    @fdb.transactional
    def safe_increment(tr, key):
        value = int(tr[key] or b'0')
        tr[key] = str(value + 1).encode()
    ```

=== "Java"

    ```java
    db.run(tr -> {
        byte[] value = tr.get(key).join();
        int count = value != null ? Integer.parseInt(new String(value)) : 0;
        tr.set(key, String.valueOf(count + 1).getBytes());
        return null;
    });
    ```

### Avoid Read-Your-Writes When Possible

Reading keys you've written in the same transaction works, but it can increase conflict rates:

```python
# ✅ Better: Compute locally if you can
@fdb.transactional
def increment(tr, key, amount):
    old = int(tr[key] or b'0')
    new = old + amount
    tr[key] = str(new).encode()
    return new  # Return computed value, don't re-read

# 🆗 Works, but may increase conflicts
@fdb.transactional
def increment_and_verify(tr, key, amount):
    old = int(tr[key] or b'0')
    tr[key] = str(old + amount).encode()
    return int(tr[key])  # Re-reading what we wrote
```

---

## Key Design

### Use the Tuple Layer

Always encode composite keys with the tuple layer—never construct keys manually:

```python
# ✅ Good: Uses tuple layer
from fdb import Subspace
users = Subspace(('users',))
key = users.pack((user_id, 'profile', 'email'))

# ❌ Bad: Manual key construction
key = f"users/{user_id}/profile/email".encode()  # Not order-preserving!
```

### Keep Keys Short

Short keys improve performance. Target under 32 bytes when practical, never exceed 10KB.

| Approach | Key Size |
|----------|----------|
| `('u', user_id)` | ~10-20 bytes ✅ |
| `('users', user_id)` | ~15-25 bytes ✅ |
| `('application', 'users', 'data', user_id)` | ~40+ bytes ⚠️ |

### Design for Range Reads

Structure keys so related data is adjacent. Put the most commonly filtered attribute first:

```python
# Query pattern: "all orders for a customer"
# ✅ Customer first enables efficient range read
orders = Subspace(('orders',))
key = orders.pack((customer_id, order_id))

# Now you can get all orders for a customer:
for k, v in tr[orders.range((customer_id,))]:
    ...
```

---

## Value Design

### Keep Values Under 10KB

While values can be up to 100KB, performance is best under 10KB. For larger data, use the [Blob pattern](design-recipes.md#blob-storage).

### Pack Multiple Small Values

If you frequently read several tiny values together, consider combining them:

```python
# ❌ Many tiny reads
email = tr[user['email']]
name = tr[user['name']]
created = tr[user['created']]

# ✅ Single read, unpack locally
profile = fdb.tuple.unpack(tr[user['profile']])
email, name, created = profile[0], profile[1], profile[2]
```

---

## Conflict Avoidance

### Use Atomic Operations

For counters and accumulators, use atomic operations to avoid conflicts:

```python
# ✅ Atomic add - no read conflict
tr.add(counter_key, struct.pack('<q', 1))

# ❌ Read-modify-write - causes conflicts under contention
value = int(tr[counter_key] or b'0')
tr[counter_key] = str(value + 1).encode()
```

### Use Snapshot Reads for Non-Critical Data

When you don't need the read to cause conflicts (e.g., getting an approximate count):

```python
@fdb.transactional
def enqueue(tr, value):
    # Snapshot read for index - doesn't add to read conflict ranges
    last = last_index_snapshot(tr)
    tr[queue[last + 1][random_id()]] = value

def last_index_snapshot(tr):
    r = queue.range()
    for k, _ in tr.snapshot.get_range(r.start, r.stop, limit=1, reverse=True):
        return queue.unpack(k)[0]
    return 0
```

### Shard Hot Keys

If a single key is updated frequently, split it:

```python
# ❌ Hot key - all increments conflict
tr.add(b'global_counter', struct.pack('<q', 1))

# ✅ Sharded counter - spread across N keys
shard = random.randint(0, NUM_SHARDS - 1)
tr.add(counter_subspace.pack((shard,)), struct.pack('<q', 1))

# To read total, sum all shards (can use snapshot for approximate)
def get_counter(tr):
    total = 0
    for k, v in tr.snapshot[counter_subspace.range()]:
        total += struct.unpack('<q', v)[0]
    return total
```

---

## Error Handling

### Understand Retry Behavior

The `@transactional` decorator retries on retriable errors. Ensure your transaction logic is idempotent:

```python
@fdb.transactional
def create_user(tr, user_id, email):
    # ✅ Idempotent - safe to retry
    tr[users[user_id]['email']] = email
    tr[users[user_id]['created']] = str(time.time()).encode()

@fdb.transactional
def send_and_log(tr, user_id, message):
    # ❌ NOT idempotent - external side effect
    send_email(message)  # May send multiple times on retry!
    tr[logs[user_id][time.time()]] = message
```

### Handle Non-Retriable Errors

Some errors shouldn't be retried. The decorator handles this, but be aware:

| Error | Retriable? | Action |
|-------|------------|--------|
| `commit_unknown_result` | Maybe | Check if change applied |
| `transaction_too_old` | Yes | Automatic retry |
| `not_committed` | Yes | Automatic retry |
| `key_too_large` | No | Fix your key design |
| `value_too_large` | No | Use blob pattern |

---

## Performance Tips

### Batch Operations

Use range operations instead of individual gets when reading multiple keys:

```python
# ❌ Slow: N round trips
for user_id in user_ids:
    data[user_id] = tr[users[user_id]]

# ✅ Fast: Single range read (if keys are adjacent)
for k, v in tr[users.range()]:
    user_id = users.unpack(k)[0]
    data[user_id] = v

# ✅ Fast: Parallel individual reads
futures = {uid: tr[users[uid]] for uid in user_ids}
data = {uid: f.wait() for uid, f in futures.items()}
```

### Limit Range Reads

Always set reasonable limits on range reads:

```python
# ✅ Limit results
for k, v in tr.get_range(start, end, limit=100):
    ...

# ✅ Use streaming mode for large scans
for k, v in tr.get_range(start, end,
                          streaming_mode=fdb.StreamingMode.want_all):
    ...
```

### Pre-fetch with Futures

Start reads early and wait for them later:

```python
@fdb.transactional
def get_user_with_orders(tr, user_id):
    # Start both reads immediately
    user_future = tr[users[user_id]]
    orders_future = tr[orders.range((user_id,))]

    # Now wait for results
    user = user_future.wait()
    orders = list(orders_future)

    return user, orders
```

---

## Index Maintenance

### Update Indexes Transactionally

Always update indexes in the same transaction as the data:

```python
@fdb.transactional
def update_user_email(tr, user_id, old_email, new_email):
    # Update data
    tr[users[user_id]['email']] = new_email

    # Update index - remove old, add new
    del tr[email_index[old_email]]
    tr[email_index[new_email]] = user_id
```

### Handle Index Updates Carefully

When updating indexed fields, always remove the old index entry:

```python
@fdb.transactional
def set_user_region(tr, user_id, new_region):
    # Read old value to remove from index
    old_region = tr[users[user_id]['region']]

    # Update data
    tr[users[user_id]['region']] = new_region

    # Update index
    if old_region:
        del tr[region_index[old_region][user_id]]
    tr[region_index[new_region][user_id]] = b''
```

---

## Directory and Subspace Usage

### Use the Directory Layer for Dynamic Namespaces

For multi-tenant or dynamic applications, use the directory layer:

```python
import fdb.directory

# Get or create a directory for each tenant
tenant_dir = fdb.directory.create_or_open(db, ('tenants', tenant_id))

# Use the directory as a subspace
users = tenant_dir.create_or_open(db, ('users',))
tr[users.pack((user_id, 'email'))] = email
```

### Prefer Subspaces for Static Structure

For known, fixed namespaces, subspaces are simpler:

```python
# Static application structure
users = fdb.Subspace(('users',))
orders = fdb.Subspace(('orders',))
products = fdb.Subspace(('products',))
```

---

## Testing and Development

### Use a Separate Database for Tests

Never run tests against production. Use a local cluster or separate test database:

```python
import pytest

@pytest.fixture
def test_db():
    db = fdb.open()
    # Clear test subspace before each test
    db.clear_range(TEST_SUBSPACE.range())
    yield db
    # Cleanup after test
    db.clear_range(TEST_SUBSPACE.range())
```

### Test Transaction Conflicts

Verify your application handles conflicts correctly:

```python
def test_concurrent_increment():
    # Simulate concurrent modifications
    import threading

    errors = []
    def increment():
        try:
            for _ in range(100):
                safe_increment(db, counter_key)
        except Exception as e:
            errors.append(e)

    threads = [threading.Thread(target=increment) for _ in range(10)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert not errors
    assert get_counter(db, counter_key) == 1000
```

---

## Summary

| Area | Best Practice |
|------|---------------|
| Transactions | Keep short (<5s), use decorator, idempotent logic |
| Keys | Use tuple layer, keep short, design for range reads |
| Values | Keep under 10KB, combine tiny values |
| Conflicts | Use atomic ops, snapshot reads, shard hot keys |
| Performance | Batch operations, limit ranges, use futures |
| Indexes | Update transactionally, handle old values |

## Next Steps

- Apply these patterns with [Design Recipes](design-recipes.md)
- Review the [API Reference](../api/index.md) for language specifics
- Learn about [Monitoring](../operations/monitoring.md) for production

