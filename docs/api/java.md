---
title: Java API
description: FoundationDB Java client library reference
---

# Java API

The Java client provides a modern async API using `CompletableFuture` for non-blocking operations.

[:octicons-book-24: Official API Docs](https://apple.github.io/foundationdb/javadoc/index.html){ .md-button }

## Installation

=== "Maven"

    ```xml
    <dependency>
        <groupId>org.foundationdb</groupId>
        <artifactId>fdb-java</artifactId>
        <version>7.3.0</version>
    </dependency>
    ```

=== "Gradle"

    ```groovy
    implementation 'org.foundationdb:fdb-java:7.3.0'
    ```

!!! note "Prerequisites"
    The FoundationDB client library must be installed on your system. See [Installation](../getting-started/installation.md).

## Quick Start

```java
import com.apple.foundationdb.*;
import com.apple.foundationdb.tuple.Tuple;

public class HelloFDB {
    public static void main(String[] args) {
        // REQUIRED: Set API version
        FDB fdb = FDB.selectAPIVersion(730);

        try (Database db = fdb.open()) {
            // Run a transaction
            db.run(tr -> {
                tr.set(Tuple.from("hello").pack(),
                       Tuple.from("world").pack());
                return null;
            });

            // Read the value
            byte[] result = db.run(tr ->
                tr.get(Tuple.from("hello").pack()).join()
            );

            System.out.println(Tuple.fromBytes(result));
        }
    }
}
```

## Core Concepts

### API Versioning

```java
// Must be called before any FDB operations
FDB fdb = FDB.selectAPIVersion(730);
```

!!! warning "Version Lock"
    The API version can only be set once per process.

### Opening the Database

```java
// Default cluster file
Database db = fdb.open();

// Custom cluster file
Database db = fdb.open("/path/to/fdb.cluster");

// With executor service
ExecutorService executor = Executors.newCachedThreadPool();
Database db = fdb.open(null, executor);
```

## Transactions

### Using run() (Recommended)

The `run()` method handles retries automatically:

```java
String result = db.run(tr -> {
    byte[] key = Tuple.from("users", "alice").pack();
    byte[] value = tr.get(key).join();

    if (value == null) {
        tr.set(key, "new user".getBytes());
        return "created";
    }
    return new String(value);
});
```

### Using runAsync()

For fully async operations:

```java
CompletableFuture<String> future = db.runAsync(tr -> {
    byte[] key = Tuple.from("counter").pack();

    return tr.get(key)
        .thenApply(value -> {
            long count = value == null ? 0 : Tuple.fromBytes(value).getLong(0);
            tr.set(key, Tuple.from(count + 1).pack());
            return String.valueOf(count + 1);
        });
});

String result = future.join();
```

### Manual Transaction Control

```java
Transaction tr = db.createTransaction();
try {
    tr.set(key, value);
    tr.commit().join();
} catch (RuntimeException e) {
    Throwable cause = e.getCause();
    if (cause instanceof FDBException) {
        tr.onError((FDBException) cause).join();
        // Retry logic
    }
    throw e;
} finally {
    tr.close();
}
```

## Reading Data

### Single Key

```java
db.run(tr -> {
    byte[] value = tr.get(key).join();
    if (value != null) {
        System.out.println("Value: " + new String(value));
    }
    return null;
});
```

### Range Reads

```java
db.run(tr -> {
    byte[] begin = Tuple.from("users").pack();
    byte[] end = Tuple.from("users", null).pack(); // null = max value

    // Iterate over results
    for (KeyValue kv : tr.getRange(begin, end)) {
        Tuple keyTuple = Tuple.fromBytes(kv.getKey());
        String userId = keyTuple.getString(1);
        System.out.println("User: " + userId);
    }
    return null;
});
```

### Range with Options

```java
db.run(tr -> {
    RangeQuery range = tr.getRange(begin, end);

    // With limit
    for (KeyValue kv : tr.getRange(begin, end, 100)) {
        // Process up to 100 results
    }

    // Reverse order
    for (KeyValue kv : tr.getRange(begin, end, 0, true)) {
        // Results in reverse order
    }

    // Async iteration
    AsyncIterable<KeyValue> iterable = tr.getRange(begin, end);
    iterable.asList().thenAccept(list -> {
        System.out.println("Found " + list.size() + " items");
    });

    return null;
});
```

## Writing Data

### Set and Clear

```java
db.run(tr -> {
    // Set a value
    tr.set(key, value);

    // Clear a key
    tr.clear(key);

    // Clear a range
    tr.clear(begin, end);

    return null;
});
```

### Atomic Operations

```java
import java.nio.ByteBuffer;
import java.nio.ByteOrder;

db.run(tr -> {
    // Atomic add (for counters)
    byte[] delta = ByteBuffer.allocate(8)
        .order(ByteOrder.LITTLE_ENDIAN)
        .putLong(1)
        .array();
    tr.mutate(MutationType.ADD, counterKey, delta);

    // Bitwise operations
    tr.mutate(MutationType.BIT_AND, key, mask);
    tr.mutate(MutationType.BIT_OR, key, mask);
    tr.mutate(MutationType.BIT_XOR, key, mask);

    // Min/Max
    tr.mutate(MutationType.MIN, key, newValue);
    tr.mutate(MutationType.MAX, key, newValue);

    return null;
});
```

## Tuple Layer

```java
import com.apple.foundationdb.tuple.Tuple;

// Create tuples
Tuple key = Tuple.from("users", "alice", "profile");
byte[] packed = key.pack();

// Unpack tuples
Tuple unpacked = Tuple.fromBytes(packed);
String type = unpacked.getString(0);    // "users"
String userId = unpacked.getString(1);  // "alice"

// Supported types
Tuple mixed = Tuple.from(
    "string",           // String
    42L,                // long
    3.14,               // double
    true,               // boolean
    null,               // null (sorts last)
    new byte[]{1,2,3},  // byte[]
    UUID.randomUUID()   // UUID
);
```

## Directory Layer

```java
import com.apple.foundationdb.directory.DirectoryLayer;
import com.apple.foundationdb.directory.DirectorySubspace;

// Open directories
DirectorySubspace users = DirectoryLayer.getDefault()
    .createOrOpen(db, Arrays.asList("myapp", "users")).join();

DirectorySubspace orders = DirectoryLayer.getDefault()
    .createOrOpen(db, Arrays.asList("myapp", "orders")).join();

// Use subspace for keys
db.run(tr -> {
    byte[] key = users.pack(Tuple.from("alice", "email"));
    tr.set(key, "alice@example.com".getBytes());
    return null;
});
```

## Error Handling

### FDBException

```java
try {
    db.run(tr -> {
        // Transaction logic
        return null;
    });
} catch (RuntimeException e) {
    if (e.getCause() instanceof FDBException) {
        FDBException fdbError = (FDBException) e.getCause();
        System.out.println("Error code: " + fdbError.getCode());
        System.out.println("Message: " + fdbError.getMessage());
    }
}
```

### Common Error Codes

| Code | Name | Description |
|------|------|-------------|
| 1007 | `past_version` | Transaction too old |
| 1009 | `future_version` | Cluster version ahead |
| 1020 | `not_committed` | Conflict during commit |
| 1021 | `commit_unknown_result` | Commit outcome unknown |
| 2000 | `client_invalid_operation` | Invalid API usage |

## Common Patterns

### Thread-Safe Counter

```java
public class Counter {
    private final Database db;
    private final byte[] key;

    public Counter(Database db, String name) {
        this.db = db;
        this.key = Tuple.from("counters", name).pack();
    }

    public void increment() {
        db.run(tr -> {
            byte[] delta = ByteBuffer.allocate(8)
                .order(ByteOrder.LITTLE_ENDIAN)
                .putLong(1)
                .array();
            tr.mutate(MutationType.ADD, key, delta);
            return null;
        });
    }

    public long get() {
        return db.run(tr -> {
            byte[] value = tr.get(key).join();
            if (value == null) return 0L;
            return ByteBuffer.wrap(value)
                .order(ByteOrder.LITTLE_ENDIAN)
                .getLong();
        });
    }
}
```

### Batch Operations

```java
public void batchWrite(Database db, Map<byte[], byte[]> items) {
    db.run(tr -> {
        for (Map.Entry<byte[], byte[]> entry : items.entrySet()) {
            tr.set(entry.getKey(), entry.getValue());
        }
        return null;
    });
}
```

### Watch for Changes

```java
db.run(tr -> {
    CompletableFuture<Void> watch = tr.watch(key);

    // Do other work...

    // Wait for key to change (non-blocking)
    watch.thenAccept(v -> {
        System.out.println("Key changed!");
    });

    return null;
});
```

## Best Practices

!!! success "Do"
    - Use `run()` or `runAsync()` for automatic retry handling
    - Close `Database` connections when done
    - Use the Tuple layer for structured keys
    - Keep transactions under 5 seconds

!!! failure "Don't"
    - Don't block inside async callbacks
    - Don't store values larger than 100KB
    - Don't hold Transaction objects across threads
    - Don't ignore `FDBException` in production code

## Further Reading

- [:octicons-book-24: Official Java API Reference](https://apple.github.io/foundationdb/javadoc/index.html)
- [:octicons-code-24: Java Examples](https://github.com/apple/foundationdb/tree/main/bindings/java)
- [:octicons-graph-24: Data Modeling Guide](../concepts/data-model.md)

