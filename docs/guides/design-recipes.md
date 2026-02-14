---
title: Design Recipes
description: Common patterns and solutions for FoundationDB applications
---

# Design Recipes

Learn how to build common data structures and models on top of FoundationDB's key-value API. These recipes demonstrate practical patterns used in production applications.

## Overview

FoundationDB's ordered key-value store with ACID transactions enables building sophisticated data structures. These recipes show you how to leverage:

- **Ordered keys** for efficient range reads
- **Tuple layer** for structured key encoding
- **Transactions** for maintaining data consistency
- **Subspaces** for key organization

| Recipe | Use Case |
|--------|----------|
| [Simple Indexes](#simple-indexes) | Secondary access patterns |
| [Tables](#tables) | Sparse 2D data with row/column access |
| [Queues](#queues) | FIFO task processing |
| [Priority Queues](#priority-queues) | Ordered task processing |
| [Vectors](#vectors) | Array-like data structures |
| [Hierarchical Documents](#hierarchical-documents) | JSON-like nested data |
| [Blob Storage](#blob-storage) | Large binary objects |
| [Spatial Indexing](#spatial-indexing) | 2D coordinate queries |
| [Indirect Workspaces](#indirect-workspaces) | Blue/green data updates |

### Language Availability

These recipes have reference implementations in the [FoundationDB repository](https://github.com/apple/foundationdb/tree/main/recipes):

| Recipe | Python | Java | Go | Ruby |
|--------|--------|------|----|------|
| Simple Indexes | — | [:material-github:](https://github.com/apple/foundationdb/blob/main/recipes/java-recipes/MicroIndexes.java) | — | — |
| Tables | [:material-github:](https://github.com/apple/foundationdb/blob/main/recipes/python-recipes/micro_table.py) | [:material-github:](https://github.com/apple/foundationdb/blob/main/recipes/java-recipes/MicroTable.java) | [:material-github:](https://github.com/apple/foundationdb/blob/main/recipes/go-recipes/table.go) | [:material-github:](https://github.com/apple/foundationdb/blob/main/recipes/ruby-recipes/micro_table.rb) |
| Queues | [:material-github:](https://github.com/apple/foundationdb/blob/main/recipes/python-recipes/micro_queue.py) | [:material-github:](https://github.com/apple/foundationdb/blob/main/recipes/java-recipes/MicroQueue.java) | [:material-github:](https://github.com/apple/foundationdb/blob/main/recipes/go-recipes/queue.go) | [:material-github:](https://github.com/apple/foundationdb/blob/main/recipes/ruby-recipes/micro_queue.rb) |
| Priority Queues | [:material-github:](https://github.com/apple/foundationdb/blob/main/recipes/python-recipes/micro_priority.py) | [:material-github:](https://github.com/apple/foundationdb/blob/main/recipes/java-recipes/MicroPriority.java) | [:material-github:](https://github.com/apple/foundationdb/blob/main/recipes/go-recipes/priority.go) | [:material-github:](https://github.com/apple/foundationdb/blob/main/recipes/ruby-recipes/micro_priority.rb) |
| Vectors | — | [:material-github:](https://github.com/apple/foundationdb/blob/main/recipes/java-recipes/MicroVector.java) | — | — |
| Hierarchical Documents | [:material-github:](https://github.com/apple/foundationdb/blob/main/recipes/python-recipes/micro_doc.py) | [:material-github:](https://github.com/apple/foundationdb/blob/main/recipes/java-recipes/MicroDoc.java) | [:material-github:](https://github.com/apple/foundationdb/blob/main/recipes/go-recipes/doc.go) | [:material-github:](https://github.com/apple/foundationdb/blob/main/recipes/ruby-recipes/micro_doc.rb) |
| Blob Storage | [:material-github:](https://github.com/apple/foundationdb/blob/main/recipes/python-recipes/micro_blob.py) | [:material-github:](https://github.com/apple/foundationdb/blob/main/recipes/java-recipes/MicroBlob.java) | [:material-github:](https://github.com/apple/foundationdb/blob/main/recipes/go-recipes/blob.go) | [:material-github:](https://github.com/apple/foundationdb/blob/main/recipes/ruby-recipes/micro_blob.rb) |
| Spatial Indexing | — | [:material-github:](https://github.com/apple/foundationdb/blob/main/recipes/java-recipes/MicroSpatial.java) | — | — |
| Indirect Workspaces | [:material-github:](https://github.com/apple/foundationdb/blob/main/recipes/python-recipes/micro_indirect.py) | [:material-github:](https://github.com/apple/foundationdb/blob/main/recipes/java-recipes/MicroIndirect.java) | [:material-github:](https://github.com/apple/foundationdb/blob/main/recipes/go-recipes/indirect.go) | [:material-github:](https://github.com/apple/foundationdb/blob/main/recipes/ruby-recipes/micro_indirect.rb) |

---

## Simple Indexes

Add secondary indexes to allow efficient retrieval of data in multiple ways.

### Challenge

You have data keyed by a primary ID but need to look it up by other attributes (like zipcode, email, etc.) without scanning everything.

### Strategy

1. Store the primary data with a key like `(main_subspace, ID) = value`
2. Create index entries with keys like `(index_subspace, attribute, ID) = ''`
3. Update both in the same transaction to guarantee consistency

### Pattern

The index stores the attribute value and ID in the key, enabling efficient range reads for all IDs matching an attribute:

```
Primary:  (user, ID, zipcode) = name
Index:    (zipcode_index, zipcode, ID) = ''
```

### Code

=== "Python"

    ```python
    import fdb
    fdb.api_version(730)

    user = fdb.Subspace(('user',))
    index = fdb.Subspace(('zipcode_index',))

    @fdb.transactional
    def set_user(tr, ID, name, zipcode):
        """Store user and update zipcode index atomically."""
        tr[user[ID][zipcode]] = name
        tr[index[zipcode][ID]] = ''

    @fdb.transactional
    def get_user(tr, ID):
        """Retrieve user by primary key."""
        for k, v in tr[user[ID].range()]:
            return v
        return None

    @fdb.transactional
    def get_user_ids_in_region(tr, zipcode):
        """Query index to find all users in a zipcode."""
        return [index.unpack(k)[1] for k, _ in tr[index[zipcode].range()]]
    ```

=== "Java"

    ```java
    import com.apple.foundationdb.*;
    import com.apple.foundationdb.tuple.*;
    import java.util.ArrayList;

    public class SimpleIndexes {
        private static final Subspace user = new Subspace(Tuple.from("user"));
        private static final Subspace index = new Subspace(Tuple.from("zipcode_index"));

        public static void setUser(TransactionContext tcx,
                                   String id, String name, String zipcode) {
            tcx.run(tr -> {
                tr.set(user.pack(Tuple.from(id, zipcode)),
                       Tuple.from(name).pack());
                tr.set(index.pack(Tuple.from(zipcode, id)),
                       Tuple.from().pack());
                return null;
            });
        }

        public static String getUser(TransactionContext tcx, String id) {
            return tcx.run(tr -> {
                for (KeyValue kv : tr.getRange(user.subspace(Tuple.from(id)).range(), 1)) {
                    return Tuple.fromBytes(kv.getValue()).getString(0);
                }
                return null;
            });
        }

        public static ArrayList<String> getUserIdsInRegion(
                TransactionContext tcx, String zipcode) {
            return tcx.run(tr -> {
                ArrayList<String> ids = new ArrayList<>();
                for (KeyValue kv : tr.getRange(
                        index.subspace(Tuple.from(zipcode)).range())) {
                    ids.add(index.unpack(kv.getKey()).getString(1));
                }
                return ids;
            });
        }
    }
    ```

### Extensions

**Multiple Indexes**: Maintain as many indexes as needed. Trade write performance for read speed:

```
(main, ID) = value
(index_x, X, ID) = ''
(index_y, Y, ID) = ''
```

**Covering Indexes**: Store the full value in the index to avoid a second lookup:

```
(main, ID) = value
(index, X, ID) = value  // Duplicate value for single-read access
```

---

## Tables

Create a table data structure suitable for sparse data with efficient row and column access.

### Challenge

Support efficient random access to individual cells, plus retrieval of entire rows or columns.

### Strategy

Store each cell twice—once in row-major order, once in column-major order—to enable efficient access either way. This is perfect for sparse tables since unassigned cells consume no storage.

### Pattern

```
Row index:    (table, 'R', row, column) = value
Column index: (table, 'C', column, row) = value
```

### Code

=== "Python"

    ```python
    import fdb
    fdb.api_version(730)

    table = fdb.Subspace(('T',))
    row_index = table['R']
    col_index = table['C']

    def _pack(value):
        return fdb.tuple.pack((value,))

    def _unpack(value):
        return fdb.tuple.unpack(value)[0]

    @fdb.transactional
    def table_set_cell(tr, row, column, value):
        """Set a cell, updating both row and column indexes."""
        tr[row_index[row][column]] = _pack(value)
        tr[col_index[column][row]] = _pack(value)

    @fdb.transactional
    def table_get_cell(tr, row, column):
        """Get a single cell value."""
        return _unpack(tr[row_index[row][column]])

    @fdb.transactional
    def table_get_row(tr, row):
        """Get all cells in a row with a single range read."""
        cols = {}
        for k, v in tr[row_index[row].range()]:
            r, c = row_index.unpack(k)
            cols[c] = _unpack(v)
        return cols

    @fdb.transactional
    def table_get_col(tr, col):
        """Get all cells in a column with a single range read."""
        rows = {}
        for k, v in tr[col_index[col].range()]:
            c, r = col_index.unpack(k)
            rows[r] = _unpack(v)
        return rows

    @fdb.transactional
    def table_set_row(tr, row, cols):
        """Replace an entire row."""
        del tr[row_index[row].range()]
        for c, v in cols.items():
            table_set_cell(tr, row, c, v)
    ```

=== "Java"

    ```java
    import com.apple.foundationdb.*;
    import com.apple.foundationdb.tuple.*;
    import java.util.HashMap;
    import java.util.Map;

    public class Tables {
        private static final Subspace table = new Subspace(Tuple.from("T"));
        private static final Subspace rowIndex = table.subspace(Tuple.from("R"));
        private static final Subspace colIndex = table.subspace(Tuple.from("C"));

        public static void setCell(TransactionContext tcx,
                                   String row, String col, Object value) {
            tcx.run(tr -> {
                byte[] packed = Tuple.from(value).pack();
                tr.set(rowIndex.pack(Tuple.from(row, col)), packed);
                tr.set(colIndex.pack(Tuple.from(col, row)), packed);
                return null;
            });
        }

        public static Map<String, Object> getRow(TransactionContext tcx, String row) {
            return tcx.run(tr -> {
                Map<String, Object> cols = new HashMap<>();
                for (KeyValue kv : tr.getRange(
                        rowIndex.subspace(Tuple.from(row)).range())) {
                    Tuple key = rowIndex.unpack(kv.getKey());
                    Object val = Tuple.fromBytes(kv.getValue()).get(0);
                    cols.put(key.getString(1), val);
                }
                return cols;
            });
        }

        public static Map<String, Object> getCol(TransactionContext tcx, String col) {
            return tcx.run(tr -> {
                Map<String, Object> rows = new HashMap<>();
                for (KeyValue kv : tr.getRange(
                        colIndex.subspace(Tuple.from(col)).range())) {
                    Tuple key = colIndex.unpack(kv.getKey());
                    Object val = Tuple.fromBytes(kv.getValue()).get(0);
                    rows.put(key.getString(1), val);
                }
                return rows;
            });
        }
    }
    ```

### Extensions

**Higher Dimensions**: Extend to N dimensions by adding more tuple elements. For most use cases, store only the most common access patterns rather than all N! orderings.

---

## Queues

Create a queue data structure supporting FIFO operations with concurrent access.

### Challenge

Allow efficient enqueue and dequeue operations by multiple clients simultaneously without conflicts.

### Strategy

Use increasing integers to encode order. Add a random element to each key to make concurrent enqueues conflict-free. Use snapshot reads for the index to avoid write conflicts.

### Pattern

```
(queue, index, random) = value
```

Keys are ordered by index first, then by random element (for concurrent writes with the same index).

### Code

=== "Python"

    ```python
    import fdb
    import os

    fdb.api_version(730)

    queue = fdb.Subspace(('Q',))

    @fdb.transactional
    def enqueue(tr, value):
        """Add item to the queue (conflict-free via snapshot read)."""
        tr[queue[last_index(tr) + 1][os.urandom(20)]] = value

    @fdb.transactional
    def dequeue(tr):
        """Remove and return the first item, or None if empty."""
        item = first_item(tr)
        if item is None:
            return None
        del tr[item.key]
        return item.value

    @fdb.transactional
    def last_index(tr):
        """Find the highest index using a reverse range read."""
        r = queue.range()
        for key, _ in tr.snapshot.get_range(r.start, r.stop,
                                             limit=1, reverse=True):
            return queue.unpack(key)[0]
        return 0

    @fdb.transactional
    def first_item(tr):
        """Get the first item in the queue."""
        r = queue.range()
        for kv in tr.get_range(r.start, r.stop, limit=1):
            return kv
        return None
    ```

=== "Java"

    ```java
    import com.apple.foundationdb.*;
    import com.apple.foundationdb.tuple.*;
    import java.util.Random;

    public class Queue {
        private static final Subspace queue = new Subspace(Tuple.from("Q"));
        private static final Random random = new Random();

        public static void enqueue(TransactionContext tcx, Object value) {
            tcx.run(tr -> {
                byte[] rand = new byte[20];
                random.nextBytes(rand);
                tr.set(queue.subspace(Tuple.from(lastIndex(tr) + 1, rand)).pack(),
                       Tuple.from(value).pack());
                return null;
            });
        }

        public static Object dequeue(TransactionContext tcx) {
            return tcx.run(tr -> {
                KeyValue item = firstItem(tr);
                if (item == null) return null;
                tr.clear(item.getKey());
                return Tuple.fromBytes(item.getValue()).get(0);
            });
        }

        private static long lastIndex(Transaction tr) {
            for (KeyValue kv : tr.snapshot().getRange(queue.range(), 1, true)) {
                return (long) queue.unpack(kv.getKey()).get(0);
            }
            return 0L;
        }

        private static KeyValue firstItem(Transaction tr) {
            for (KeyValue kv : tr.getRange(queue.range(), 1)) {
                return kv;
            }
            return null;
        }
    }
    ```

!!! tip "High-Contention Dequeues"
    For very high dequeue rates, use a staging technique: failed dequeue attempts register a request, then retry to fulfill outstanding requests. This spreads contention across multiple keys.

---

## Priority Queues

Create a priority queue supporting push, pop_min, pop_max, peek_min, and peek_max operations.

### Challenge

Support priority-based ordering while handling concurrent operations without excessive conflicts.

### Strategy

Form keys from `(priority, count, random)` tuples. Priority sorts items, count preserves insertion order within a priority, and random prevents conflicts.

### Pattern

```
(pq, priority, count, random) = value
```

Minimum priority items are at the start of the keyspace, maximum at the end—enabling efficient peek/pop operations via limited range reads.

### Code

=== "Python"

    ```python
    import fdb
    import os

    fdb.api_version(730)

    pq = fdb.Subspace(('P',))

    @fdb.transactional
    def push(tr, value, priority):
        """Add item with given priority."""
        tr[pq[priority][_next_count(tr, priority)][os.urandom(20)]] = value

    @fdb.transactional
    def _next_count(tr, priority):
        """Get next count for a priority level (snapshot read for conflict-free)."""
        r = pq[priority].range()
        for key, _ in tr.snapshot.get_range(r.start, r.stop,
                                             limit=1, reverse=True):
            return pq[priority].unpack(key)[0] + 1
        return 0

    @fdb.transactional
    def pop(tr, max=False):
        """Remove and return min (default) or max priority item."""
        r = pq.range()
        for item in tr.get_range(r.start, r.stop, limit=1, reverse=max):
            del tr[item.key]
            return item.value
        return None

    @fdb.transactional
    def peek(tr, max=False):
        """Return min (default) or max priority item without removing."""
        r = pq.range()
        for item in tr.get_range(r.start, r.stop, limit=1, reverse=max):
            return item.value
        return None

    # Convenience functions
    def pop_min(tr): return pop(tr, max=False)
    def pop_max(tr): return pop(tr, max=True)
    def peek_min(tr): return peek(tr, max=False)
    def peek_max(tr): return peek(tr, max=True)
    ```

=== "Java"

    ```java
    import com.apple.foundationdb.*;
    import com.apple.foundationdb.tuple.*;
    import java.util.Random;

    public class PriorityQueue {
        private static final Subspace pq = new Subspace(Tuple.from("P"));
        private static final Random random = new Random();

        public static void push(TransactionContext tcx, Object value, long priority) {
            tcx.run(tr -> {
                byte[] rand = new byte[20];
                random.nextBytes(rand);
                long count = nextCount(tr, priority);
                tr.set(pq.pack(Tuple.from(priority, count, rand)),
                       Tuple.from(value).pack());
                return null;
            });
        }

        private static long nextCount(Transaction tr, long priority) {
            Subspace prioritySub = pq.subspace(Tuple.from(priority));
            for (KeyValue kv : tr.snapshot().getRange(prioritySub.range(), 1, true)) {
                return (long) prioritySub.unpack(kv.getKey()).get(0) + 1;
            }
            return 0L;
        }

        public static Object pop(TransactionContext tcx, boolean max) {
            return tcx.run(tr -> {
                for (KeyValue kv : tr.getRange(pq.range(), 1, max)) {
                    tr.clear(kv.getKey());
                    return Tuple.fromBytes(kv.getValue()).get(0);
                }
                return null;
            });
        }

        public static Object popMin(TransactionContext tcx) { return pop(tcx, false); }
        public static Object popMax(TransactionContext tcx) { return pop(tcx, true); }
    }
    ```

---

## Vectors

Create a vector data structure with efficient random lookup, append, scan, and truncate operations.

### Challenge

Maintain array-like performance characteristics in a distributed key-value store.

### Strategy

Use the vector index as the key. Tuple encoding ensures adjacent elements are stored adjacently, enabling efficient range scans.

### Pattern

```
(vector_subspace, index) = value
```

### Code

=== "Python"

    ```python
    import fdb
    fdb.api_version(730)

    vector = fdb.Subspace(('V',))

    @fdb.transactional
    def vector_get(tr, index):
        """Get element at index."""
        return tr[vector[index]]

    @fdb.transactional
    def vector_set(tr, index, value):
        """Set element at index."""
        tr[vector[index]] = value

    @fdb.transactional
    def vector_push(tr, value):
        """Append to end of vector."""
        tr[vector[vector_size(tr)]] = value

    @fdb.transactional
    def vector_size(tr):
        """Get vector length."""
        r = vector.range()
        for key, _ in tr.get_range(r.start, r.stop, limit=1, reverse=True):
            return vector.unpack(key)[0] + 1
        return 0

    @fdb.transactional
    def vector_scan(tr, start=0, end=None):
        """Iterate over vector elements."""
        if end is None:
            r = vector.range((start,))
        else:
            r = vector.range((start,), (end,))
        return [v for k, v in tr[r]]

    @fdb.transactional
    def vector_truncate(tr, new_size):
        """Remove elements from new_size onwards."""
        r = vector.range()
        del tr[vector[new_size].key():r.stop]
    ```

=== "Java"

    ```java
    import com.apple.foundationdb.*;
    import com.apple.foundationdb.tuple.*;
    import java.util.ArrayList;
    import java.util.List;

    public class Vector {
        private static final Subspace vector = new Subspace(Tuple.from("V"));

        public static byte[] get(TransactionContext tcx, long index) {
            return tcx.run(tr -> tr.get(vector.pack(Tuple.from(index))).join());
        }

        public static void set(TransactionContext tcx, long index, byte[] value) {
            tcx.run(tr -> {
                tr.set(vector.pack(Tuple.from(index)), value);
                return null;
            });
        }

        public static long size(TransactionContext tcx) {
            return tcx.run(tr -> {
                for (KeyValue kv : tr.getRange(vector.range(), 1, true)) {
                    return (long) vector.unpack(kv.getKey()).get(0) + 1;
                }
                return 0L;
            });
        }

        public static List<byte[]> scan(TransactionContext tcx, long start, long end) {
            return tcx.run(tr -> {
                List<byte[]> result = new ArrayList<>();
                Range range = new Range(
                    vector.pack(Tuple.from(start)),
                    vector.pack(Tuple.from(end))
                );
                for (KeyValue kv : tr.getRange(range)) {
                    result.add(kv.getValue());
                }
                return result;
            });
        }
    }
    ```

### Extensions

- **Multi-dimensional**: Add more indexes to the tuple: `(subspace, i, j)` for 2D arrays
- **Sparse**: Unset elements consume no storage—perfect for sparse arrays
- **Composition**: Store pointers to other data structures for complex nested structures

---

## Hierarchical Documents

Store JSON-like nested documents with efficient subdocument retrieval.

### Challenge

Support storage and retrieval of documents as a whole or by paths to subdocuments.

### Strategy

Flatten the document tree into tuples representing paths from root to each leaf. Store each path as a key, enabling subdocument retrieval via prefix range reads.

### Pattern

A document like:
```json
{"user": {"name": "alice", "tags": ["dev", "ops"]}}
```

Becomes keys:
```
(doc, doc_id, "user", "name") = "alice"
(doc, doc_id, "user", "tags", 0) = "dev"
(doc, doc_id, "user", "tags", 1) = "ops"
```

### Code

=== "Python"

    ```python
    import fdb
    import json
    import random
    import itertools

    fdb.api_version(730)

    doc_space = fdb.Subspace(('D',))

    EMPTY_OBJECT = -2
    EMPTY_ARRAY = -1

    def to_tuples(item):
        """Convert nested structure to list of path tuples."""
        if item == {}:
            return [(EMPTY_OBJECT, None)]
        elif item == []:
            return [(EMPTY_ARRAY, None)]
        elif isinstance(item, dict):
            return [(k,) + sub for k, v in item.items() for sub in to_tuples(v)]
        elif isinstance(item, list):
            return [(i,) + sub for i, v in enumerate(item) for sub in to_tuples(v)]
        else:
            return [(item,)]

    def from_tuples(tuples):
        """Reconstruct nested structure from path tuples."""
        if not tuples:
            return {}
        first = tuples[0]
        if len(first) == 1:
            return first[0]
        if first == (EMPTY_OBJECT, None):
            return {}
        if first == (EMPTY_ARRAY, None):
            return []

        groups = [list(g) for k, g in itertools.groupby(tuples, lambda t: t[0])]
        if first[0] == 0:  # array
            return [from_tuples([t[1:] for t in g]) for g in groups]
        else:  # object
            return {g[0][0]: from_tuples([t[1:] for t in g]) for g in groups}

    @fdb.transactional
    def insert_doc(tr, doc):
        """Insert a document, returning its ID."""
        if isinstance(doc, str):
            doc = json.loads(doc)
        if 'doc_id' not in doc:
            doc['doc_id'] = random.randint(0, 100000000)
        for tup in to_tuples(doc):
            tr[doc_space.pack((doc['doc_id'],) + tup[:-1])] = \
                fdb.tuple.pack((tup[-1],))
        return doc['doc_id']

    @fdb.transactional
    def get_doc(tr, doc_id, prefix=()):
        """Get document or subdocument by path prefix."""
        v = tr[doc_space.pack((doc_id,) + prefix)]
        if v.present():
            return from_tuples([prefix + fdb.tuple.unpack(v)])
        else:
            return from_tuples([
                doc_space.unpack(k)[1:] + fdb.tuple.unpack(v)
                for k, v in tr[doc_space.range((doc_id,) + prefix)]
            ])
    ```

### Usage

```python
# Insert a document
doc_id = insert_doc(db, {
    "user": "alice",
    "profile": {"email": "alice@example.com", "verified": True},
    "tags": ["admin", "developer"]
})

# Get entire document
doc = get_doc(db, doc_id)

# Get just the profile subdocument
profile = get_doc(db, doc_id, ("profile",))

# Get just tags
tags = get_doc(db, doc_id, ("tags",))
```

---

## Blob Storage

Store binary large objects that exceed the 100KB value limit.

### Challenge

FoundationDB values are limited to 100KB (best performance under 10KB). Large files need a different approach.

### Strategy

Split the blob into chunks stored as separate key-value pairs. Use byte offset as the key suffix for efficient random access.

### Pattern

```
(blob_subspace, offset) = chunk_data
```

### Code

=== "Python"

    ```python
    import fdb
    fdb.api_version(730)

    CHUNK_SIZE = 10000  # 10KB chunks for optimal performance

    blob_subspace = fdb.Subspace(('blob',))

    @fdb.transactional
    def write_blob(tr, blob_id, data):
        """Write a blob by chunking it into multiple keys."""
        # Clear any existing blob data
        del tr[blob_subspace[blob_id].range()]

        # Write chunks
        for offset in range(0, len(data), CHUNK_SIZE):
            chunk = data[offset:offset + CHUNK_SIZE]
            tr[blob_subspace[blob_id][offset]] = chunk

    @fdb.transactional
    def read_blob(tr, blob_id):
        """Read entire blob by combining chunks."""
        chunks = []
        for k, v in tr[blob_subspace[blob_id].range()]:
            chunks.append(v)
        return b''.join(chunks)

    @fdb.transactional
    def read_blob_range(tr, blob_id, start, length):
        """Read a range of bytes from a blob."""
        # Find which chunks we need
        start_chunk = (start // CHUNK_SIZE) * CHUNK_SIZE
        end_byte = start + length

        result = b''
        for k, v in tr[blob_subspace[blob_id].range()]:
            offset = blob_subspace[blob_id].unpack(k)[0]
            if offset + len(v) <= start:
                continue
            if offset >= end_byte:
                break

            # Calculate slice within this chunk
            chunk_start = max(0, start - offset)
            chunk_end = min(len(v), end_byte - offset)
            result += v[chunk_start:chunk_end]

        return result

    @fdb.transactional
    def delete_blob(tr, blob_id):
        """Delete a blob."""
        del tr[blob_subspace[blob_id].range()]

    @fdb.transactional
    def blob_size(tr, blob_id):
        """Get blob size without reading all data."""
        total = 0
        for k, v in tr[blob_subspace[blob_id].range()]:
            total += len(v)
        return total
    ```

### Usage

```python
# Write a large file
with open('large_file.bin', 'rb') as f:
    data = f.read()
write_blob(db, 'my-blob-id', data)

# Read it back
retrieved = read_blob(db, 'my-blob-id')

# Read just a portion (e.g., for streaming)
header = read_blob_range(db, 'my-blob-id', 0, 1024)
```

!!! tip "Chunk Size Selection"
    - **10KB**: Good default for most use cases
    - **Smaller (1-5KB)**: Better for random access patterns
    - **Larger (50-100KB)**: Better for sequential reads, but approaches value size limits

---

## Spatial Indexing

Index 2D spatial data for efficient bounding box queries using Z-order curves.

[:material-github: Java Source](https://github.com/apple/foundationdb/blob/main/recipes/java-recipes/MicroSpatial.java){ .md-button .md-button--text }

### Challenge

You need to efficiently query data by 2D coordinates—for example, "find all items within this bounding box"—without scanning the entire dataset.

### Strategy

Use Z-order (Morton) encoding to map 2D coordinates to a single 1D value. This preserves spatial locality: points that are close in 2D space tend to be close in Z-order. Store data keyed by Z-value, then use range queries for spatial lookups.

### Pattern

```
Label to Z:  (label_z, label, z_value) = ''
Z to Label:  (z_label, z_value, label) = ''
```

Two indexes provide efficient lookups in either direction—finding a label's location or finding all labels near a location.

### Code

=== "Python"

    ```python
    import fdb
    fdb.api_version(730)

    label_z = fdb.Subspace(('L',))  # label -> z-value
    z_label = fdb.Subspace(('Z',))  # z-value -> label

    def xy_to_z(x, y):
        """Convert 2D coordinates to Z-order value (Morton code).

        Interleaves bits of x and y to create a single value
        that preserves spatial locality.
        """
        z = 0
        for i in range(32):
            z |= ((x >> i) & 1) << (2 * i)
            z |= ((y >> i) & 1) << (2 * i + 1)
        return z

    def z_to_xy(z):
        """Convert Z-order value back to 2D coordinates."""
        x = y = 0
        for i in range(32):
            x |= ((z >> (2 * i)) & 1) << i
            y |= ((z >> (2 * i + 1)) & 1) << i
        return x, y

    @fdb.transactional
    def set_location(tr, label, x, y):
        """Set or update an item's location."""
        # Remove old location if it exists
        old_z = None
        for k, _ in tr[label_z[label].range()]:
            old_z = label_z.unpack(k)[1]
            break

        if old_z is not None:
            del tr[label_z[label][old_z]]
            del tr[z_label[old_z][label]]

        # Set new location
        new_z = xy_to_z(x, y)
        tr[label_z[label][new_z]] = b''
        tr[z_label[new_z][label]] = b''

    @fdb.transactional
    def get_location(tr, label):
        """Get an item's current location."""
        for k, _ in tr[label_z[label].range()]:
            z = label_z.unpack(k)[1]
            return z_to_xy(z)
        return None

    @fdb.transactional
    def get_in_box(tr, x_min, y_min, x_max, y_max):
        """Find all labels within a bounding box.

        Note: Z-order ranges are an approximation. Some false positives
        outside the box may be returned and need filtering.
        """
        results = []
        z_min = xy_to_z(x_min, y_min)
        z_max = xy_to_z(x_max, y_max)

        # Scan the Z-range and filter to exact box
        for k, _ in tr[z_label[z_min] : z_label[z_max + 1]]:
            z, label = z_label.unpack(k)
            x, y = z_to_xy(z)
            if x_min <= x <= x_max and y_min <= y <= y_max:
                results.append((label, x, y))
        return results
    ```

=== "Java"

    ```java
    import com.apple.foundationdb.*;
    import com.apple.foundationdb.tuple.*;
    import java.util.ArrayList;
    import java.util.List;

    public class SpatialIndex {
        private static final Subspace labelZ = new Subspace(Tuple.from("L"));
        private static final Subspace zLabel = new Subspace(Tuple.from("Z"));

        /** Convert 2D coordinates to Z-order value (Morton code). */
        public static long xyToZ(long x, long y) {
            long z = 0;
            for (int i = 0; i < 32; i++) {
                z |= ((x >> i) & 1) << (2 * i);
                z |= ((y >> i) & 1) << (2 * i + 1);
            }
            return z;
        }

        /** Convert Z-order value back to 2D coordinates. */
        public static long[] zToXy(long z) {
            long x = 0, y = 0;
            for (int i = 0; i < 32; i++) {
                x |= ((z >> (2 * i)) & 1) << i;
                y |= ((z >> (2 * i + 1)) & 1) << i;
            }
            return new long[]{x, y};
        }

        /** Set or update an item's location. */
        public static void setLocation(TransactionContext tcx,
                                       String label, long x, long y) {
            tcx.run(tr -> {
                // Remove old location if exists
                Long oldZ = null;
                for (KeyValue kv : tr.getRange(
                        labelZ.subspace(Tuple.from(label)).range(), 1)) {
                    oldZ = labelZ.unpack(kv.getKey()).getLong(1);
                }

                if (oldZ != null) {
                    tr.clear(labelZ.pack(Tuple.from(label, oldZ)));
                    tr.clear(zLabel.pack(Tuple.from(oldZ, label)));
                }

                // Set new location
                long newZ = xyToZ(x, y);
                tr.set(labelZ.pack(Tuple.from(label, newZ)),
                       Tuple.from().pack());
                tr.set(zLabel.pack(Tuple.from(newZ, label)),
                       Tuple.from().pack());
                return null;
            });
        }

        /** Find all labels within a bounding box. */
        public static List<String> getInBox(TransactionContext tcx,
                long xMin, long yMin, long xMax, long yMax) {
            return tcx.run(tr -> {
                List<String> results = new ArrayList<>();
                long zMin = xyToZ(xMin, yMin);
                long zMax = xyToZ(xMax, yMax);

                Range range = new Range(
                    zLabel.pack(Tuple.from(zMin)),
                    zLabel.pack(Tuple.from(zMax + 1))
                );

                for (KeyValue kv : tr.getRange(range)) {
                    Tuple key = zLabel.unpack(kv.getKey());
                    long z = key.getLong(0);
                    String label = key.getString(1);
                    long[] xy = zToXy(z);

                    if (xy[0] >= xMin && xy[0] <= xMax &&
                        xy[1] >= yMin && xy[1] <= yMax) {
                        results.add(label);
                    }
                }
                return results;
            });
        }
    }
    ```

### Extensions

**Geohashing**: For latitude/longitude data, consider geohash encoding which provides similar locality properties with string-based keys.

**Higher Precision**: For floating-point coordinates, multiply by a scale factor and round to integers before encoding.

**Multi-Resolution**: Store data at multiple Z-order resolutions for faster coarse queries.

---

## Indirect Workspaces

Implement atomic blue/green data updates using workspace indirection.

[:material-github: Python Source](https://github.com/apple/foundationdb/blob/main/recipes/python-recipes/micro_indirect.py){ .md-button .md-button--text }
[:material-github: Java Source](https://github.com/apple/foundationdb/blob/main/recipes/java-recipes/MicroIndirect.java){ .md-button .md-button--text }
[:material-github: Go Source](https://github.com/apple/foundationdb/blob/main/recipes/go-recipes/indirect.go){ .md-button .md-button--text }

### Challenge

You need to perform large batch updates to a dataset atomically—readers should see either the old complete state or the new complete state, never a partially-updated view.

### Strategy

Use the Directory layer to maintain two workspaces: `current` (serving reads) and `new` (staging writes). Writers populate the new workspace, then atomically swap it to become current. This enables zero-downtime data refreshes.

### Pattern

```
/working/current/  →  active data (readers use this)
/working/new/      →  staging area (writers build new version here)

On commit: atomic move  new → current
```

### Code

=== "Python"

    ```python
    import fdb
    fdb.api_version(730)

    class Workspace:
        """Blue/green workspace for atomic batch updates.

        Usage:
            workspace = Workspace(working_dir, db)

            # Read current data
            for k, v in db[workspace.current.range()]:
                process(k, v)

            # Build new version
            with workspace as new_space:
                db[new_space['key1']] = 'value1'
                db[new_space['key2']] = 'value2'
            # On exit, new_space atomically becomes current
        """

        def __init__(self, directory, db):
            self.dir = directory
            self.db = db

        @property
        def current(self):
            """Get the current (active) workspace."""
            return self.dir.create_or_open(self.db, ('current',))

        def __enter__(self):
            """Create a new workspace for staging updates."""
            return self.dir.create_or_open(self.db, ('new',))

        def __exit__(self, exc_type, exc_val, exc_tb):
            """Atomically swap new workspace to current."""
            if exc_type is None:  # Only swap on success
                self._swap(self.db)

        @fdb.transactional
        def _swap(self, tr):
            """Atomic swap: remove current, rename new to current."""
            # Remove old current
            if self.dir.exists(tr, ('current',)):
                self.dir.remove(tr, ('current',))
            # Move new to current
            self.dir.move(tr, ('new',), ('current',))


    # Example usage
    def refresh_catalog(db, new_items):
        """Replace entire catalog atomically."""
        working_dir = fdb.directory.create_or_open(db, ('catalog_workspace',))
        workspace = Workspace(working_dir, db)

        with workspace as staging:
            # Clear staging area
            del db[staging.range()]

            # Write all new items
            for item_id, data in new_items.items():
                db[staging[item_id]] = fdb.tuple.pack((data,))

        # Swap complete - readers now see new catalog
    ```

=== "Java"

    ```java
    import com.apple.foundationdb.*;
    import com.apple.foundationdb.directory.*;
    import com.apple.foundationdb.tuple.*;
    import java.util.Arrays;

    public class Workspace {
        private final DirectorySubspace workingDir;
        private final Database db;

        public Workspace(Database db, String name) {
            this.db = db;
            this.workingDir = DirectoryLayer.getDefault()
                .createOrOpen(db, Arrays.asList(name)).join();
        }

        /** Get the current (active) workspace for reads. */
        public DirectorySubspace getCurrent() {
            return DirectoryLayer.getDefault()
                .createOrOpen(db, Arrays.asList(
                    workingDir.getPath().get(0), "current")).join();
        }

        /** Create a new staging workspace. */
        public DirectorySubspace createStaging() {
            return DirectoryLayer.getDefault()
                .createOrOpen(db, Arrays.asList(
                    workingDir.getPath().get(0), "new")).join();
        }

        /** Atomically swap staging to current. */
        public void commit() {
            db.run(tr -> {
                DirectoryLayer dl = DirectoryLayer.getDefault();
                String base = workingDir.getPath().get(0);

                // Remove old current if exists
                if (dl.exists(tr, Arrays.asList(base, "current")).join()) {
                    dl.remove(tr, Arrays.asList(base, "current")).join();
                }
                // Move new to current
                dl.move(tr, Arrays.asList(base, "new"),
                           Arrays.asList(base, "current")).join();
                return null;
            });
        }
    }

    // Example usage
    public class CatalogRefresh {
        public static void refresh(Database db, Map<String, byte[]> items) {
            Workspace workspace = new Workspace(db, "catalog");

            // Build new version in staging
            DirectorySubspace staging = workspace.createStaging();
            db.run(tr -> {
                // Clear staging
                tr.clear(staging.range());

                // Write new items
                for (var entry : items.entrySet()) {
                    tr.set(staging.pack(Tuple.from(entry.getKey())),
                           entry.getValue());
                }
                return null;
            });

            // Atomic swap
            workspace.commit();
        }
    }
    ```

### Usage

```python
# Initial setup
db = fdb.open()
working_dir = fdb.directory.create_or_open(db, ('products',))
workspace = Workspace(working_dir, db)

# Readers always see consistent current state
@fdb.transactional
def get_all_products(tr):
    return dict(tr[workspace.current.range()])

# Writers build new state without blocking readers
with workspace as new_version:
    # Populate new_version with updated data
    db[new_version['sku-001']] = b'...'
    db[new_version['sku-002']] = b'...'
# Atomic swap happens here - instant cutover
```

### Extensions

**Rollback**: Keep the previous workspace around under a `previous` name for quick rollback if issues are detected.

**Multi-Stage**: Chain multiple workspaces for complex ETL pipelines where each stage validates before promoting.

**Versioned History**: Instead of removing old workspaces, rename them with timestamps to maintain an audit trail.

---

## Next Steps

- Review [Best Practices](best-practices.md) for production guidelines
- Explore the [API Reference](../api/index.md) for language-specific details
- See [Data Model](../concepts/data-model.md) for foundational concepts

