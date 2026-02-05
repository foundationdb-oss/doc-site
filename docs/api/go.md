---
title: Go API
description: FoundationDB Go client library reference
---

# Go API

The Go client provides idiomatic bindings with proper error handling and context support.

[:octicons-book-24: Official API Docs](https://pkg.go.dev/github.com/apple/foundationdb/bindings/go/src/fdb){ .md-button }

## Installation

=== "go get"

    ```bash
    go get github.com/apple/foundationdb/bindings/go/src/fdb
    ```

=== "go.mod"

    ```go title="go.mod"
    require github.com/apple/foundationdb/bindings/go v0.0.0-20240101000000-abcdef123456
    ```

    Then run:

    ```bash
    go mod tidy
    ```

!!! note "Prerequisites"
    The FoundationDB client library must be installed on your system. See [Installation](../getting-started/installation.md).

## Quick Start

```go
package main

import (
    "fmt"
    "log"

    "github.com/apple/foundationdb/bindings/go/src/fdb"
)

func main() {
    // REQUIRED: Set API version (must match or be less than installed version)
    fdb.MustAPIVersion({{ api_version }})

    // Open the default database
    db := fdb.MustOpenDefault()
{% if fdb_version >= "7.4" %}
    defer db.Close()  // REQUIRED in 7.4+
{% endif %}

    // Run a transaction
    _, err := db.Transact(func(tr fdb.Transaction) (interface{}, error) {
        tr.Set(fdb.Key("hello"), []byte("world"))
        return nil, nil
    })
    if err != nil {
        log.Fatal(err)
    }

    // Read the value
    result, err := db.Transact(func(tr fdb.Transaction) (interface{}, error) {
        return tr.Get(fdb.Key("hello")).MustGet(), nil
    })
    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("Value: %s\n", result.([]byte))
}
```

## Core Concepts

### API Versioning

```go
// Must be called before any FDB operations
fdb.MustAPIVersion(730)

// Or with error handling
err := fdb.APIVersion(730)
if err != nil {
    log.Fatal(err)
}
```

### Opening the Database

```go
// Default cluster file
db := fdb.MustOpenDefault()

// Custom cluster file
db, err := fdb.OpenDatabase("/path/to/fdb.cluster")
if err != nil {
    log.Fatal(err)
}

// With options
db, err := fdb.OpenDefault(fdb.DefaultClusterFile)
```

{% if fdb_version >= "7.4" %}
!!! warning "Breaking Change in 7.4: Close() Required <span class="pill-new">NEW IN 7.4</span>"
    Starting with FoundationDB 7.4, **you must call `Close()` on Database objects** when you're done using them. Failure to call `Close()` will result in resource leaks.

    ```go
    db := fdb.MustOpenDefault()
    defer db.Close()  // REQUIRED in 7.4+

    // Use the database...
    _, err := db.Transact(func(tr fdb.Transaction) (interface{}, error) {
        tr.Set(fdb.Key("hello"), []byte("world"))
        return nil, nil
    })
    ```

    **Migration steps:**

    1. Locate all `fdb.Open*` calls in your codebase
    2. Add `defer db.Close()` immediately after each successful open
    3. For long-lived database handles, ensure `Close()` is called during graceful shutdown

    **Why this change?**

    The Go binding now properly manages native resources. Calling `Close()` ensures that network threads and memory are properly cleaned up.
{% endif %}

## Transactions

### Using Transact() (Recommended)

The `Transact()` method handles retries automatically:

```go
result, err := db.Transact(func(tr fdb.Transaction) (interface{}, error) {
    // Read
    value := tr.Get(fdb.Key("counter")).MustGet()

    // Compute
    count := 0
    if value != nil {
        count = int(binary.LittleEndian.Uint64(value))
    }

    // Write
    newValue := make([]byte, 8)
    binary.LittleEndian.PutUint64(newValue, uint64(count+1))
    tr.Set(fdb.Key("counter"), newValue)

    return count + 1, nil
})
if err != nil {
    log.Fatal(err)
}
fmt.Printf("New count: %d\n", result.(int))
```

### Using ReadTransact()

For read-only transactions:

```go
result, err := db.ReadTransact(func(tr fdb.ReadTransaction) (interface{}, error) {
    return tr.Get(fdb.Key("mykey")).MustGet(), nil
})
```

### Manual Transaction Control

```go
tr, err := db.CreateTransaction()
if err != nil {
    log.Fatal(err)
}

for {
    tr.Set(fdb.Key("key"), []byte("value"))

    err := tr.Commit().Get()
    if err == nil {
        break
    }

    // Handle retryable errors
    fe := err.(fdb.Error)
    err = tr.OnError(fe).Get()
    if err != nil {
        log.Fatal(err)
    }
}
```

## Reading Data

### Single Key

```go
db.Transact(func(tr fdb.Transaction) (interface{}, error) {
    // Get returns a FutureByteSlice
    future := tr.Get(fdb.Key("mykey"))

    // Block until value is available
    value := future.MustGet() // Returns nil if key doesn't exist

    // Or with error handling
    value, err := future.Get()

    return value, err
})
```

### Range Reads

```go
import "github.com/apple/foundationdb/bindings/go/src/fdb/tuple"

db.Transact(func(tr fdb.Transaction) (interface{}, error) {
    // Define range
    begin := tuple.Tuple{"users"}.Pack()
    end := tuple.Tuple{"users", nil}.Pack() // nil = max value

    // Create range
    r := fdb.KeyRange{Begin: begin, End: end}

    // Iterate over results
    ri := tr.GetRange(r, fdb.RangeOptions{}).Iterator()
    for ri.Advance() {
        kv := ri.MustGet()
        key, _ := tuple.Unpack(kv.Key)
        fmt.Printf("User: %v = %s\n", key, kv.Value)
    }

    return nil, nil
})
```

### Range Options

```go
db.Transact(func(tr fdb.Transaction) (interface{}, error) {
    r := fdb.KeyRange{Begin: begin, End: end}

    opts := fdb.RangeOptions{
        Limit:   100,           // Max results
        Reverse: true,          // Reverse order
        Mode:    fdb.StreamingModeWantAll,
    }

    ri := tr.GetRange(r, opts).Iterator()
    for ri.Advance() {
        kv := ri.MustGet()
        // Process key-value
    }

    // Or get all as slice
    slice, err := tr.GetRange(r, opts).GetSliceWithError()

    return slice, err
})
```

## Writing Data

### Set and Clear

```go
db.Transact(func(tr fdb.Transaction) (interface{}, error) {
    // Set a value
    tr.Set(fdb.Key("key"), []byte("value"))

    // Clear a key
    tr.Clear(fdb.Key("key"))

    // Clear a range
    tr.ClearRange(fdb.KeyRange{
        Begin: fdb.Key("prefix\x00"),
        End:   fdb.Key("prefix\xff"),
    })

    return nil, nil
})
```

### Atomic Operations

```go
import "encoding/binary"

db.Transact(func(tr fdb.Transaction) (interface{}, error) {
    key := fdb.Key("counter")

    // Atomic add
    delta := make([]byte, 8)
    binary.LittleEndian.PutUint64(delta, 1)
    tr.Add(key, delta)

    // Bitwise operations
    tr.BitAnd(key, mask)
    tr.BitOr(key, mask)
    tr.BitXor(key, mask)

    // Min/Max
    tr.Min(key, value)
    tr.Max(key, value)

    return nil, nil
})
```

## Tuple Layer

```go
import "github.com/apple/foundationdb/bindings/go/src/fdb/tuple"

// Create tuples
key := tuple.Tuple{"users", "alice", "profile"}
packed := key.Pack()

// Unpack tuples
unpacked, err := tuple.Unpack(packed)
userType := unpacked[0].(string)  // "users"
userId := unpacked[1].(string)    // "alice"

// Supported types
mixed := tuple.Tuple{
    "string",                    // string
    int64(42),                   // int64
    float64(3.14),               // float64
    true,                        // bool
    nil,                         // nil (sorts last)
    []byte{1, 2, 3},             // []byte
    tuple.UUID{...},             // UUID
}
```

## Directory Layer

```go
import "github.com/apple/foundationdb/bindings/go/src/fdb/directory"

// Open directories
users, err := directory.CreateOrOpen(db, []string{"myapp", "users"}, nil)
if err != nil {
    log.Fatal(err)
}

orders, err := directory.CreateOrOpen(db, []string{"myapp", "orders"}, nil)
if err != nil {
    log.Fatal(err)
}

// Use subspace for keys
db.Transact(func(tr fdb.Transaction) (interface{}, error) {
    key := users.Pack(tuple.Tuple{"alice", "email"})
    tr.Set(key, []byte("alice@example.com"))
    return nil, nil
})
```

## Error Handling

### FDB Errors

```go
result, err := db.Transact(func(tr fdb.Transaction) (interface{}, error) {
    return tr.Get(fdb.Key("key")).Get()
})

if err != nil {
    if fe, ok := err.(fdb.Error); ok {
        switch fe.Code {
        case 1007: // past_version
            fmt.Println("Transaction too old")
        case 1020: // not_committed
            fmt.Println("Conflict detected")
        default:
            fmt.Printf("FDB error %d: %s\n", fe.Code, fe.Error())
        }
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

```go
type Counter struct {
    db  fdb.Database
    key fdb.Key
}

func NewCounter(db fdb.Database, name string) *Counter {
    return &Counter{
        db:  db,
        key: tuple.Tuple{"counters", name}.Pack(),
    }
}

func (c *Counter) Increment() error {
    _, err := c.db.Transact(func(tr fdb.Transaction) (interface{}, error) {
        delta := make([]byte, 8)
        binary.LittleEndian.PutUint64(delta, 1)
        tr.Add(c.key, delta)
        return nil, nil
    })
    return err
}

func (c *Counter) Get() (int64, error) {
    result, err := c.db.ReadTransact(func(tr fdb.ReadTransaction) (interface{}, error) {
        value := tr.Get(c.key).MustGet()
        if value == nil {
            return int64(0), nil
        }
        return int64(binary.LittleEndian.Uint64(value)), nil
    })
    if err != nil {
        return 0, err
    }
    return result.(int64), nil
}
```

### Watch for Changes

```go
db.Transact(func(tr fdb.Transaction) (interface{}, error) {
    watch := tr.Watch(fdb.Key("mykey"))

    // Start a goroutine to wait for changes
    go func() {
        err := watch.Get()
        if err != nil {
            log.Printf("Watch error: %v", err)
            return
        }
        fmt.Println("Key changed!")
    }()

    return nil, nil
})
```

### Context Support

```go
import "context"

ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

// Use context with options
opts := fdb.TransactionOptions{}
opts.SetTimeout(5000) // 5 seconds in milliseconds

result, err := db.Transact(func(tr fdb.Transaction) (interface{}, error) {
    tr.Options().SetTimeout(5000)
    return tr.Get(fdb.Key("key")).Get()
})
```

## Best Practices

!!! success "Do"
    - Use `Transact()` for automatic retry handling
    - Use `MustGet()` only when errors are truly unexpected
    - Use the tuple layer for structured keys
    - Handle `fdb.Error` appropriately in production
{% if fdb_version >= "7.4" %}
    - **Always call `db.Close()`** when done with Database objects (7.4+)
{% endif %}

!!! failure "Don't"
    - Don't ignore errors from FDB operations
    - Don't store values larger than 100KB
    - Don't hold transactions open for long periods
    - Don't use `panic()` in production transaction code
{% if fdb_version >= "7.4" %}
    - Don't forget to call `db.Close()` - it will leak resources (7.4+)
{% endif %}

## Further Reading

- [:octicons-book-24: Official Go API Reference](https://pkg.go.dev/github.com/apple/foundationdb/bindings/go/src/fdb)
- [:octicons-code-24: Go Examples](https://github.com/apple/foundationdb/tree/main/bindings/go)
- [:octicons-graph-24: Data Modeling Guide](../concepts/data-model.md)

