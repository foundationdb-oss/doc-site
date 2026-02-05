---
title: C API
description: FoundationDB C client library reference
---

# C API

The C API is the foundational interface used by all other language bindings. It provides low-level access with maximum control.

[:octicons-book-24: Official API Docs](https://apple.github.io/foundationdb/api-c.html){ .md-button }

## Installation

The C client is included with the FoundationDB client package:

=== "macOS"

    ```bash
    brew install foundationdb
    # Headers: /usr/local/include/foundationdb/
    # Library: /usr/local/lib/libfdb_c.dylib
    ```

=== "Linux (Debian/Ubuntu)"

    ```bash
    wget https://github.com/apple/foundationdb/releases/download/7.3.71/foundationdb-clients_7.3.71-1_amd64.deb
    sudo dpkg -i foundationdb-clients_7.3.71-1_amd64.deb
    # Headers: /usr/include/foundationdb/
    # Library: /usr/lib/libfdb_c.so
    ```

=== "Linux (RHEL/CentOS)"

    ```bash
    wget https://github.com/apple/foundationdb/releases/download/7.3.71/foundationdb-clients-7.3.71-1.el7.x86_64.rpm
    sudo rpm -i foundationdb-clients-7.3.71-1.el7.x86_64.rpm
    ```

## Compilation

```bash
# Compile with FDB
gcc -o myapp myapp.c -lfdb_c -lpthread

# Or with explicit paths
gcc -o myapp myapp.c -I/usr/include -L/usr/lib -lfdb_c -lpthread
```

## Quick Start

```c
#define FDB_API_VERSION 730
#include <foundationdb/fdb_c.h>
#include <stdio.h>
#include <string.h>

int main() {
    fdb_error_t err;

    // Select API version
    err = fdb_select_api_version(FDB_API_VERSION);
    if (err) {
        fprintf(stderr, "Error selecting API version: %s\n", fdb_get_error(err));
        return 1;
    }

    // Setup the network
    err = fdb_setup_network();
    if (err) {
        fprintf(stderr, "Error setting up network: %s\n", fdb_get_error(err));
        return 1;
    }

    // Start network thread
    pthread_t network_thread;
    pthread_create(&network_thread, NULL, (void*)fdb_run_network, NULL);

    // Open database
    FDBDatabase* db;
    err = fdb_create_database(NULL, &db);  // NULL = default cluster file
    if (err) {
        fprintf(stderr, "Error opening database: %s\n", fdb_get_error(err));
        return 1;
    }

    // Create transaction
    FDBTransaction* tr;
    fdb_database_create_transaction(db, &tr);

    // Write a value
    const char* key = "hello";
    const char* value = "world";
    fdb_transaction_set(tr, (uint8_t*)key, strlen(key),
                        (uint8_t*)value, strlen(value));

    // Commit
    FDBFuture* commit_future = fdb_transaction_commit(tr);
    err = fdb_future_block_until_ready(commit_future);
    err = fdb_future_get_error(commit_future);
    fdb_future_destroy(commit_future);

    if (err) {
        fprintf(stderr, "Commit error: %s\n", fdb_get_error(err));
    } else {
        printf("Successfully wrote key!\n");
    }

    // Cleanup
    fdb_transaction_destroy(tr);
    fdb_database_destroy(db);
    fdb_stop_network();
    pthread_join(network_thread, NULL);

    return 0;
}
```

## Core Concepts

### API Versioning

```c
#define FDB_API_VERSION 730
#include <foundationdb/fdb_c.h>

// Must be called first
fdb_error_t err = fdb_select_api_version(FDB_API_VERSION);
```

!!! warning "Define Before Include"
    `FDB_API_VERSION` must be defined **before** including `fdb_c.h`.

### Network Setup

The network must be set up exactly once per process:

```c
// Configure network (optional)
fdb_network_set_option(FDB_NET_OPTION_TRACE_ENABLE,
                       (uint8_t*)"/tmp/fdb", 8);

// Setup network (must be called before run_network)
fdb_error_t err = fdb_setup_network();

// Run network on separate thread
pthread_t net_thread;
pthread_create(&net_thread, NULL, (void*)fdb_run_network, NULL);

// ... use database ...

// Shutdown
fdb_stop_network();
pthread_join(net_thread, NULL);
```

### Opening the Database

```c
FDBDatabase* db;

// Default cluster file
fdb_error_t err = fdb_create_database(NULL, &db);

// Custom cluster file
err = fdb_create_database("/path/to/fdb.cluster", &db);

// Don't forget to destroy when done
fdb_database_destroy(db);
```

## Transactions

### Creating Transactions

```c
FDBTransaction* tr;
fdb_error_t err = fdb_database_create_transaction(db, &tr);
if (err) {
    fprintf(stderr, "Create transaction error: %s\n", fdb_get_error(err));
}
```

### Transaction Loop Pattern

```c
int transaction_with_retry(FDBDatabase* db,
                           int (*operation)(FDBTransaction*)) {
    FDBTransaction* tr;
    fdb_error_t err;

    fdb_database_create_transaction(db, &tr);

    while (1) {
        // Perform operation
        int result = operation(tr);
        if (result < 0) {
            fdb_transaction_destroy(tr);
            return result;
        }

        // Commit
        FDBFuture* commit = fdb_transaction_commit(tr);
        fdb_future_block_until_ready(commit);
        err = fdb_future_get_error(commit);
        fdb_future_destroy(commit);

        if (!err) {
            fdb_transaction_destroy(tr);
            return 0;  // Success
        }

        // Handle error
        FDBFuture* retry = fdb_transaction_on_error(tr, err);
        fdb_future_block_until_ready(retry);
        err = fdb_future_get_error(retry);
        fdb_future_destroy(retry);

        if (err) {
            // Non-retryable error
            fdb_transaction_destroy(tr);
            return -1;
        }
        // Loop to retry
    }
}
```

## Reading Data

### Single Key

```c
void read_key(FDBTransaction* tr, const char* key) {
    FDBFuture* future = fdb_transaction_get(tr,
                                             (uint8_t*)key,
                                             strlen(key),
                                             0);  // 0 = not snapshot

    fdb_future_block_until_ready(future);

    fdb_error_t err = fdb_future_get_error(future);
    if (err) {
        fprintf(stderr, "Get error: %s\n", fdb_get_error(err));
        fdb_future_destroy(future);
        return;
    }

    fdb_bool_t present;
    const uint8_t* value;
    int value_length;

    fdb_future_get_value(future, &present, &value, &value_length);

    if (present) {
        printf("Value: %.*s\n", value_length, value);
    } else {
        printf("Key not found\n");
    }

    fdb_future_destroy(future);
}
```

### Range Reads

```c
void read_range(FDBTransaction* tr,
                const char* begin_key,
                const char* end_key) {

    FDBFuture* future = fdb_transaction_get_range(
        tr,
        FDB_KEYSEL_FIRST_GREATER_OR_EQUAL((uint8_t*)begin_key, strlen(begin_key)),
        FDB_KEYSEL_FIRST_GREATER_OR_EQUAL((uint8_t*)end_key, strlen(end_key)),
        0,      // limit (0 = unlimited)
        0,      // target_bytes (0 = unlimited)
        FDB_STREAMING_MODE_WANT_ALL,
        0,      // iteration
        0,      // snapshot
        0       // reverse
    );

    fdb_future_block_until_ready(future);

    const FDBKeyValue* kvs;
    int count;
    fdb_bool_t more;

    fdb_future_get_keyvalue_array(future, &kvs, &count, &more);

    for (int i = 0; i < count; i++) {
        printf("Key: %.*s = %.*s\n",
               kvs[i].key_length, kvs[i].key,
               kvs[i].value_length, kvs[i].value);
    }

    fdb_future_destroy(future);
}
```

## Writing Data

### Set and Clear

```c
void write_data(FDBTransaction* tr) {
    // Set a value
    const char* key = "mykey";
    const char* value = "myvalue";
    fdb_transaction_set(tr,
                        (uint8_t*)key, strlen(key),
                        (uint8_t*)value, strlen(value));

    // Clear a key
    fdb_transaction_clear(tr, (uint8_t*)key, strlen(key));

    // Clear a range
    fdb_transaction_clear_range(tr,
                                (uint8_t*)"prefix\x00", 8,
                                (uint8_t*)"prefix\xff", 8);
}
```

### Atomic Operations

```c
#include <stdint.h>

void atomic_operations(FDBTransaction* tr) {
    const char* key = "counter";

    // Atomic add (little-endian int64)
    int64_t delta = 1;
    fdb_transaction_atomic_op(tr,
                              (uint8_t*)key, strlen(key),
                              (uint8_t*)&delta, sizeof(delta),
                              FDB_MUTATION_TYPE_ADD);

    // Bitwise AND
    uint8_t mask[] = {0xff, 0x00, 0xff, 0x00};
    fdb_transaction_atomic_op(tr,
                              (uint8_t*)key, strlen(key),
                              mask, sizeof(mask),
                              FDB_MUTATION_TYPE_BIT_AND);

    // Other atomic operations:
    // FDB_MUTATION_TYPE_BIT_OR
    // FDB_MUTATION_TYPE_BIT_XOR
    // FDB_MUTATION_TYPE_MIN
    // FDB_MUTATION_TYPE_MAX
    // FDB_MUTATION_TYPE_COMPARE_AND_CLEAR
}
```

## Futures

### Working with Futures

```c
// Create future
FDBFuture* future = fdb_transaction_get(tr, key, key_len, 0);

// Block until ready
fdb_error_t err = fdb_future_block_until_ready(future);

// Check for errors
err = fdb_future_get_error(future);
if (err) {
    fprintf(stderr, "Error: %s\n", fdb_get_error(err));
}

// Get result (varies by future type)
fdb_bool_t present;
const uint8_t* value;
int value_len;
fdb_future_get_value(future, &present, &value, &value_len);

// IMPORTANT: Always destroy futures
fdb_future_destroy(future);
```

### Async Callbacks

```c
void my_callback(FDBFuture* future, void* callback_parameter) {
    fdb_error_t err = fdb_future_get_error(future);
    if (err) {
        fprintf(stderr, "Async error: %s\n", fdb_get_error(err));
        return;
    }

    // Process result...
    int* done_flag = (int*)callback_parameter;
    *done_flag = 1;
}

void async_get(FDBTransaction* tr, const char* key) {
    int done = 0;

    FDBFuture* future = fdb_transaction_get(tr,
                                             (uint8_t*)key,
                                             strlen(key),
                                             0);

    fdb_future_set_callback(future, my_callback, &done);

    // Do other work while waiting...
    while (!done) {
        // Poll or do other work
    }

    fdb_future_destroy(future);
}
```

## Error Handling

### Error Codes

```c
fdb_error_t err = fdb_future_get_error(future);

if (err) {
    // Get error description
    const char* msg = fdb_get_error(err);
    fprintf(stderr, "Error %d: %s\n", err, msg);

    // Check if retryable
    if (fdb_error_predicate(FDB_ERROR_PREDICATE_RETRYABLE, err)) {
        // Can retry
    }

    // Check if commit result unknown
    if (fdb_error_predicate(FDB_ERROR_PREDICATE_MAYBE_COMMITTED, err)) {
        // Commit may have succeeded
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

### Safe Transaction Wrapper

```c
typedef struct {
    FDBDatabase* db;
} AppContext;

int safe_write(FDBDatabase* db,
               const char* key,
               const char* value) {
    FDBTransaction* tr;
    fdb_error_t err;

    fdb_database_create_transaction(db, &tr);

    while (1) {
        fdb_transaction_set(tr,
                           (uint8_t*)key, strlen(key),
                           (uint8_t*)value, strlen(value));

        FDBFuture* f = fdb_transaction_commit(tr);
        fdb_future_block_until_ready(f);
        err = fdb_future_get_error(f);
        fdb_future_destroy(f);

        if (!err) break;

        FDBFuture* e = fdb_transaction_on_error(tr, err);
        fdb_future_block_until_ready(e);
        err = fdb_future_get_error(e);
        fdb_future_destroy(e);

        if (err) {
            fdb_transaction_destroy(tr);
            return -1;
        }
    }

    fdb_transaction_destroy(tr);
    return 0;
}
```

### Atomic Counter

```c
int64_t atomic_increment(FDBDatabase* db, const char* counter_key) {
    FDBTransaction* tr;
    fdb_database_create_transaction(db, &tr);

    int64_t delta = 1;
    fdb_transaction_atomic_op(tr,
                              (uint8_t*)counter_key, strlen(counter_key),
                              (uint8_t*)&delta, sizeof(delta),
                              FDB_MUTATION_TYPE_ADD);

    // Commit with retry loop...
    FDBFuture* f = fdb_transaction_commit(tr);
    fdb_future_block_until_ready(f);
    fdb_future_destroy(f);
    fdb_transaction_destroy(tr);

    return delta;  // Note: actual value requires a read
}
```

## Best Practices

!!! success "Do"
    - Always destroy futures and transactions when done
    - Use the transaction retry loop pattern
    - Run the network on a dedicated thread
    - Check error codes after all operations

!!! failure "Don't"
    - Don't call `fdb_run_network` from multiple threads
    - Don't forget to call `fdb_stop_network` before exit
    - Don't hold transactions open for long periods
    - Don't ignore `fdb_future_get_error` return values

## Further Reading

- [:octicons-book-24: Official C API Reference](https://apple.github.io/foundationdb/api-c.html)
- [:octicons-code-24: C Examples](https://github.com/apple/foundationdb/tree/main/bindings/c/test)
- [:octicons-graph-24: Data Modeling Guide](../concepts/data-model.md)

