---
title: API Reference
description: FoundationDB client library reference
---

# API Reference

Complete reference for FoundationDB client libraries. Choose your language to get started.

[:octicons-book-24: Official Apple API Docs](https://apple.github.io/foundationdb/){ .md-button .md-button--primary }

<div class="grid cards" markdown>

-   :fontawesome-brands-python:{ .lg .middle } **Python** :material-check-decagram:{ .middle } Official

    ---

    Pythonic API with decorators and context managers. Best for rapid development and scripting.

    [:octicons-arrow-right-24: Python API](python.md)

-   :fontawesome-brands-java:{ .lg .middle } **Java** :material-check-decagram:{ .middle } Official

    ---

    Java client with CompletableFuture async support. Ideal for JVM-based applications.

    [:octicons-arrow-right-24: Java API](java.md)

-   :fontawesome-brands-golang:{ .lg .middle } **Go** :material-check-decagram:{ .middle } Official

    ---

    Idiomatic Go bindings with error handling. Perfect for microservices and cloud-native apps.

    [:octicons-arrow-right-24: Go API](go.md)

-   :material-language-c:{ .lg .middle } **C** :material-check-decagram:{ .middle } Official

    ---

    Low-level C API for maximum control. Foundation for all other bindings.

    [:octicons-arrow-right-24: C API](c.md)

-   :material-language-ruby:{ .lg .middle } **Ruby** :material-check-decagram:{ .middle } Official

    ---

    Official Ruby bindings shipped with the FoundationDB source. Maintained by Apple.

    [:octicons-mark-github-16: GitHub](https://github.com/apple/foundationdb/tree/main/bindings/ruby)

-   :fontawesome-brands-rust:{ .lg .middle } **Rust** :octicons-people-16:{ .middle } Community

    ---

    Community-maintained Rust bindings with async support.

    [:octicons-mark-github-16: GitHub](https://github.com/foundationdb-rs/foundationdb-rs)

-   :fontawesome-brands-node-js:{ .lg .middle } **Node.js** :octicons-people-16:{ .middle } Community

    ---

    Community-maintained Node.js bindings.

    [:octicons-mark-github-16: GitHub](https://github.com/josephg/node-foundationdb)

-   :material-dot-net:{ .lg .middle } **.NET** :octicons-people-16:{ .middle } Community

    ---

    Community-maintained .NET client library.

    [:octicons-mark-github-16: GitHub](https://github.com/Doxense/foundationdb-dotnet-client)

</div>

## API Versioning

All clients must specify an API version at startup. This is **required** before any other FDB operations:

=== "Python"

    ```python
    import fdb
    fdb.api_version(730)  # Use 7.3 API
    ```

=== "Java"

    ```java
    FDB fdb = FDB.selectAPIVersion(730);
    ```

=== "Go"

    ```go
    fdb.MustAPIVersion(730)
    ```

=== "C"

    ```c
    #define FDB_API_VERSION 730
    #include <foundationdb/fdb_c.h>

    fdb_select_api_version(FDB_API_VERSION);
    ```

!!! tip "Why API Versioning?"
    API versioning ensures your application continues to work correctly even as FoundationDB evolves. Code written for API version 710 will behave identically whether running on FDB 7.1 or 7.3.

## Common Operations

### Opening a Connection

=== "Python"

    ```python
    db = fdb.open()  # Uses default cluster file
    ```

=== "Java"

    ```java
    Database db = fdb.open();
    ```

=== "Go"

    ```go
    db := fdb.MustOpenDefault()
    ```

=== "C"

    ```c
    FDBDatabase* db;
    fdb_create_database(NULL, &db);
    ```

### Writing Data

=== "Python"

    ```python
    @fdb.transactional
    def write(tr):
        tr[b'hello'] = b'world'

    write(db)
    ```

=== "Java"

    ```java
    db.run(tr -> {
        tr.set(Tuple.from("hello").pack(),
               "world".getBytes());
        return null;
    });
    ```

=== "Go"

    ```go
    db.Transact(func(tr fdb.Transaction) (interface{}, error) {
        tr.Set(fdb.Key("hello"), []byte("world"))
        return nil, nil
    })
    ```

=== "C"

    ```c
    fdb_transaction_set(tr,
                        (uint8_t*)"hello", 5,
                        (uint8_t*)"world", 5);
    ```

### Reading Data

=== "Python"

    ```python
    @fdb.transactional
    def read(tr):
        return tr[b'hello']

    value = read(db)  # b'world'
    ```

=== "Java"

    ```java
    byte[] value = db.run(tr ->
        tr.get(Tuple.from("hello").pack()).join()
    );
    ```

=== "Go"

    ```go
    result, _ := db.Transact(func(tr fdb.Transaction) (interface{}, error) {
        return tr.Get(fdb.Key("hello")).MustGet(), nil
    })
    value := result.([]byte)
    ```

=== "C"

    ```c
    FDBFuture* f = fdb_transaction_get(tr, (uint8_t*)"hello", 5, 0);
    fdb_future_block_until_ready(f);

    fdb_bool_t present;
    const uint8_t* value;
    int value_len;
    fdb_future_get_value(f, &present, &value, &value_len);
    ```

### Atomic Increment

=== "Python"

    ```python
    import struct

    @fdb.transactional
    def increment(tr, key):
        tr.add(key, struct.pack('<q', 1))
    ```

=== "Java"

    ```java
    byte[] delta = ByteBuffer.allocate(8)
        .order(ByteOrder.LITTLE_ENDIAN)
        .putLong(1)
        .array();
    tr.mutate(MutationType.ADD, key, delta);
    ```

=== "Go"

    ```go
    delta := make([]byte, 8)
    binary.LittleEndian.PutUint64(delta, 1)
    tr.Add(key, delta)
    ```

=== "C"

    ```c
    int64_t delta = 1;
    fdb_transaction_atomic_op(tr, key, key_len,
                              (uint8_t*)&delta, 8,
                              FDB_MUTATION_TYPE_ADD);
    ```

## Common Concepts

All language bindings share these core concepts:

| Concept | Description |
|---------|-------------|
| **Database** | Connection to the FDB cluster |
| **Transaction** | Unit of work with ACID guarantees |
| **Keys/Values** | Byte strings (arbitrary binary data) |
| **Futures** | Handles for async operations |
| **Tuple Layer** | Type-aware key encoding |
| **Directory Layer** | Hierarchical key organization |

## Transaction Guarantees

Every transaction in FoundationDB provides:

- **Atomicity**: All operations succeed or fail together
- **Consistency**: Database moves between valid states
- **Isolation**: Transactions don't see each other's uncommitted changes
- **Durability**: Committed data survives failures

!!! info "Transaction Limits"
    - **5 second** default timeout
    - **10 MB** transaction size limit
    - **10 KB** max key size
    - **100 KB** max value size

## Error Handling

All bindings handle transient errors through automatic retry:

| Error Code | Name | Action |
|------------|------|--------|
| 1007 | `past_version` | Retry automatically |
| 1009 | `future_version` | Retry automatically |
| 1020 | `not_committed` | Retry automatically |
| 1021 | `commit_unknown_result` | May need manual check |
| 2000 | `client_invalid_operation` | Fix code |

See individual language pages for error handling details.

## Next Steps

- [:octicons-rocket-24: Quick Start Guide](../getting-started/quickstart.md)
- [:octicons-book-24: Core Concepts](../concepts/index.md)
- [:octicons-code-24: Design Recipes](../guides/design-recipes.md)

