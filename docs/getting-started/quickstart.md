---
title: Quick Start
description: Get started with FoundationDB in 5 minutes
---

# Quick Start

Go from zero to your first transaction in under 5 minutes.

## Prerequisites

- [FoundationDB installed](installation.md) and running
- One of: Python 3.8+, Java 8+, or Go 1.11+

## 1. Verify FoundationDB is Running

First, confirm your database is accessible:

```bash
fdbcli --exec "status"
```

You should see `The database is available.`

## 2. Install a Client Library

=== "Python"

    ```bash
    pip install foundationdb
    ```

=== "Java"

    ```xml
    <!-- Add to pom.xml -->
    <dependency>
        <groupId>org.foundationdb</groupId>
        <artifactId>fdb-java</artifactId>
        <version>7.3.63</version>
    </dependency>
    ```

=== "Go"

    ```bash
    go get github.com/apple/foundationdb/bindings/go/src/fdb
    ```

## 3. Hello World

Create a simple program that connects to the database and writes your first key-value pair:

=== "Python"

    ```python title="hello_fdb.py"
    import fdb

    # Always specify the API version first
    fdb.api_version(730)

    # Open the default database
    db = fdb.open()

    # Write a key-value pair
    db[b'hello'] = b'world'

    # Read it back
    print(db[b'hello'])  # b'world'

    print("✓ Connected to FoundationDB!")
    ```

    Run it:

    ```bash
    python hello_fdb.py
    ```

=== "Java"

    ```java title="HelloFDB.java"
    import com.apple.foundationdb.*;
    import com.apple.foundationdb.tuple.Tuple;

    public class HelloFDB {
        public static void main(String[] args) {
            // Always specify the API version first
            FDB fdb = FDB.selectAPIVersion(730);

            // Open the default database
            try (Database db = fdb.open()) {
                // Write a key-value pair
                db.run(tr -> {
                    tr.set(Tuple.from("hello").pack(), Tuple.from("world").pack());
                    return null;
                });

                // Read it back
                byte[] result = db.run(tr -> tr.get(Tuple.from("hello").pack()).join());
                System.out.println(Tuple.fromBytes(result).getString(0));  // "world"

                System.out.println("✓ Connected to FoundationDB!");
            }
        }
    }
    ```

=== "Go"

    ```go title="hello_fdb.go"
    package main

    import (
        "fmt"
        "log"

        "github.com/apple/foundationdb/bindings/go/src/fdb"
    )

    func main() {
        // Always specify the API version first
        fdb.MustAPIVersion(730)

        // Open the default database
        db := fdb.MustOpenDefault()

        // Write a key-value pair
        _, err := db.Transact(func(tr fdb.Transaction) (interface{}, error) {
            tr.Set(fdb.Key("hello"), []byte("world"))
            return nil, nil
        })
        if err != nil {
            log.Fatal(err)
        }

        // Read it back
        result, err := db.Transact(func(tr fdb.Transaction) (interface{}, error) {
            return tr.Get(fdb.Key("hello")).MustGet(), nil
        })
        if err != nil {
            log.Fatal(err)
        }
        fmt.Println(string(result.([]byte)))  // "world"

        fmt.Println("✓ Connected to FoundationDB!")
    }
    ```

    Run it:

    ```bash
    go run hello_fdb.go
    ```

## 4. Your First Transaction

Transactions are the core of FoundationDB. They ensure all-or-nothing execution with full ACID guarantees:

=== "Python"

    ```python title="transaction_example.py"
    import fdb
    fdb.api_version(730)
    db = fdb.open()

    # The @fdb.transactional decorator handles retries automatically
    @fdb.transactional
    def transfer_balance(tr, from_account, to_account, amount):
        # Read current balances
        from_balance = int(tr[from_account] or b'0')
        to_balance = int(tr[to_account] or b'0')

        # Check sufficient funds
        if from_balance < amount:
            raise Exception("Insufficient funds")

        # Update both accounts atomically
        tr[from_account] = str(from_balance - amount).encode()
        tr[to_account] = str(to_balance + amount).encode()

        return f"Transferred {amount}"

    # Initialize accounts
    db[b'account:alice'] = b'100'
    db[b'account:bob'] = b'50'

    # Transfer 30 from Alice to Bob
    result = transfer_balance(db, b'account:alice', b'account:bob', 30)
    print(result)  # "Transferred 30"

    # Verify balances
    print(f"Alice: {db[b'account:alice']}")  # b'70'
    print(f"Bob: {db[b'account:bob']}")      # b'80'
    ```

=== "Java"

    ```java title="TransactionExample.java"
    import com.apple.foundationdb.*;

    public class TransactionExample {
        public static void main(String[] args) {
            FDB fdb = FDB.selectAPIVersion(730);

            try (Database db = fdb.open()) {
                byte[] aliceKey = "account:alice".getBytes();
                byte[] bobKey = "account:bob".getBytes();

                // Initialize accounts
                db.run(tr -> {
                    tr.set(aliceKey, "100".getBytes());
                    tr.set(bobKey, "50".getBytes());
                    return null;
                });

                // Transfer 30 from Alice to Bob (atomic transaction)
                int amount = 30;
                db.run(tr -> {
                    int aliceBalance = Integer.parseInt(
                        new String(tr.get(aliceKey).join()));
                    int bobBalance = Integer.parseInt(
                        new String(tr.get(bobKey).join()));

                    if (aliceBalance < amount) {
                        throw new RuntimeException("Insufficient funds");
                    }

                    tr.set(aliceKey, String.valueOf(aliceBalance - amount).getBytes());
                    tr.set(bobKey, String.valueOf(bobBalance + amount).getBytes());
                    return null;
                });

                // Verify
                System.out.println("Alice: " + new String(db.run(tr -> tr.get(aliceKey).join())));
                System.out.println("Bob: " + new String(db.run(tr -> tr.get(bobKey).join())));
            }
        }
    }
    ```

=== "Go"

    ```go title="transaction_example.go"
    package main

    import (
        "fmt"
        "log"
        "strconv"

        "github.com/apple/foundationdb/bindings/go/src/fdb"
    )

    func main() {
        fdb.MustAPIVersion(730)
        db := fdb.MustOpenDefault()

        aliceKey := fdb.Key("account:alice")
        bobKey := fdb.Key("account:bob")

        // Initialize accounts
        db.Transact(func(tr fdb.Transaction) (interface{}, error) {
            tr.Set(aliceKey, []byte("100"))
            tr.Set(bobKey, []byte("50"))
            return nil, nil
        })

        // Transfer 30 from Alice to Bob (atomic transaction)
        amount := 30
        _, err := db.Transact(func(tr fdb.Transaction) (interface{}, error) {
            aliceBytes := tr.Get(aliceKey).MustGet()
            bobBytes := tr.Get(bobKey).MustGet()

            aliceBalance, _ := strconv.Atoi(string(aliceBytes))
            bobBalance, _ := strconv.Atoi(string(bobBytes))

            if aliceBalance < amount {
                return nil, fmt.Errorf("insufficient funds")
            }

            tr.Set(aliceKey, []byte(strconv.Itoa(aliceBalance-amount)))
            tr.Set(bobKey, []byte(strconv.Itoa(bobBalance+amount)))
            return nil, nil
        })
        if err != nil {
            log.Fatal(err)
        }

        // Verify
        result, _ := db.Transact(func(tr fdb.Transaction) (interface{}, error) {
            return map[string]string{
                "alice": string(tr.Get(aliceKey).MustGet()),
                "bob":   string(tr.Get(bobKey).MustGet()),
            }, nil
        })
        balances := result.(map[string]string)
        fmt.Printf("Alice: %s\n", balances["alice"])  // 70
        fmt.Printf("Bob: %s\n", balances["bob"])      // 80
    }
    ```

!!! info "Why Transactions Matter"
    Even if your system crashes mid-transfer, FoundationDB guarantees either both accounts are updated or neither is. This is the power of ACID transactions.

## 5. Range Reads

FoundationDB stores keys in sorted order, making range queries efficient:

=== "Python"

    ```python
    import fdb
    fdb.api_version(730)
    db = fdb.open()

    # Store some users
    db[b'user:001'] = b'Alice'
    db[b'user:002'] = b'Bob'
    db[b'user:003'] = b'Charlie'

    # Read all users (range query)
    @fdb.transactional
    def get_all_users(tr):
        # Range from 'user:' to 'user:\xff' gets all user keys
        return [(k, v) for k, v in tr.get_range(b'user:', b'user:\xff')]

    for key, value in get_all_users(db):
        print(f"{key.decode()} = {value.decode()}")
    ```

=== "Java"

    ```java
    // Store some users
    db.run(tr -> {
        tr.set("user:001".getBytes(), "Alice".getBytes());
        tr.set("user:002".getBytes(), "Bob".getBytes());
        tr.set("user:003".getBytes(), "Charlie".getBytes());
        return null;
    });

    // Read all users (range query)
    db.run(tr -> {
        for (KeyValue kv : tr.getRange("user:".getBytes(), "user:\u00ff".getBytes())) {
            System.out.printf("%s = %s%n",
                new String(kv.getKey()),
                new String(kv.getValue()));
        }
        return null;
    });
    ```

=== "Go"

    ```go
    // Store some users
    db.Transact(func(tr fdb.Transaction) (interface{}, error) {
        tr.Set(fdb.Key("user:001"), []byte("Alice"))
        tr.Set(fdb.Key("user:002"), []byte("Bob"))
        tr.Set(fdb.Key("user:003"), []byte("Charlie"))
        return nil, nil
    })

    // Read all users (range query)
    db.Transact(func(tr fdb.Transaction) (interface{}, error) {
        r := fdb.KeyRange{Begin: fdb.Key("user:"), End: fdb.Key("user:\xff")}
        kvs := tr.GetRange(r, fdb.RangeOptions{}).GetSliceOrPanic()
        for _, kv := range kvs {
            fmt.Printf("%s = %s\n", string(kv.Key), string(kv.Value))
        }
        return nil, nil
    })
    ```

## What You've Learned

:white_check_mark: How to connect to FoundationDB
:white_check_mark: Writing and reading key-value pairs
:white_check_mark: Using transactions for atomic operations
:white_check_mark: Performing range queries on sorted keys

## Next Steps

- [First Application](first-app.md) — Build a complete class scheduling system
- [Core Concepts](../concepts/index.md) — Understand data modeling and transactions
- [API Reference](../api/index.md) — Explore the full API

