---
title: Transaction Processing Pipeline
description: End-to-end transaction flow through FoundationDB's distributed commit protocol
---

# Transaction Processing Pipeline

This guide traces a transaction's complete journey through FoundationDB—from client to durable storage—explaining the timing characteristics and conflict detection at each stage.

!!! warning "Advanced Content"
    This builds on [Architecture](../concepts/architecture.md) and [Transactions](../concepts/transactions.md). Read those first.

## Pipeline Overview

A FoundationDB transaction flows through multiple components:

```mermaid
sequenceDiagram
    participant Client
    participant GRVProxy as GRV Proxy
    participant SS as Storage Server
    participant CommitProxy as Commit Proxy
    participant Resolver
    participant TLog as Transaction Log
    
    Note over Client,TLog: Read Phase
    Client->>GRVProxy: 1. Get Read Version
    GRVProxy-->>Client: Read Version (RV)
    Client->>SS: 2. Read keys at RV
    SS-->>Client: Values
    
    Note over Client,TLog: Commit Phase
    Client->>CommitProxy: 3. Commit(reads, writes, RV)
    CommitProxy->>Resolver: 4. Check conflicts
    Resolver-->>CommitProxy: OK / Conflict
    CommitProxy->>TLog: 5. Write mutations
    TLog-->>CommitProxy: Durable ✓
    CommitProxy-->>Client: 6. Committed @ CV
    
    Note over TLog,SS: Apply Phase (async)
    TLog-)SS: 7. Stream mutations
    SS->>SS: Apply to storage
```

## Stage 1: Get Read Version (GRV)

Every transaction starts by obtaining a **read version**—a logical timestamp representing a consistent snapshot of the database.

### GRV Flow

```mermaid
sequenceDiagram
    participant Client
    participant GRVProxy
    participant Master
    participant Ratekeeper
    
    Client->>GRVProxy: GetReadVersion(priority)
    GRVProxy->>Ratekeeper: Get throttle status
    Ratekeeper-->>GRVProxy: Allowed rate
    
    alt Throttled
        GRVProxy-->>Client: Retry after delay
    else Allowed
        GRVProxy->>Master: Get current version
        Master-->>GRVProxy: Version 123456
        GRVProxy-->>Client: ReadVersion: 123456
    end
```

### Timing Characteristics

| Metric | Typical Value | Notes |
|--------|---------------|-------|
| GRV latency | 0.5-2 ms | Network round-trip to proxy |
| Batching window | 1 ms | GRV requests batched for efficiency |
| Throttle delay | 0-100+ ms | Under heavy load |

### Transaction Priorities

Clients can request different priorities:

- **Default** - Normal transaction priority
- **Batch** - Lower priority, may be delayed under load
- **Immediate** - Higher priority (use sparingly)

## Stage 2: Read Keys

Reads go directly to storage servers that own the requested keys.

```mermaid
sequenceDiagram
    participant Client
    participant SS1 as Storage Server 1
    participant SS2 as Storage Server 2
    
    Note over Client: Key A owned by SS1<br/>Key B owned by SS2
    
    par Parallel Reads
        Client->>SS1: Read A at v123456
        SS1-->>Client: Value of A
    and
        Client->>SS2: Read B at v123456
        SS2-->>Client: Value of B
    end
```

### Key-Location Resolution

Clients cache the **shard map** (key range → storage server) locally:

1. First read for a key range: client asks Commit Proxy for location
2. Proxy returns storage server addresses
3. Client caches mapping, refreshes on stale errors

### Timing Characteristics

| Metric | Typical Value | Notes |
|--------|---------------|-------|
| Read latency | 0.5-2 ms | Per storage server round-trip |
| Cache hit | ~0 ms overhead | For key location lookup |
| Parallel reads | Overlapped | Client reads multiple servers simultaneously |

## Stage 3: Submit Commit

When the client commits, it sends the transaction to a Commit Proxy:

```cpp
// What the client sends
struct CommitRequest {
    Version readVersion;           // When we read
    vector<KeyRange> readRanges;   // What we read (for conflict check)
    vector<Mutation> mutations;    // What we're writing
    TransactionOptions options;    // Priority, tags, etc.
}
```

The Commit Proxy:

1. Assigns a **commit version** (from Master)
2. Routes transaction to all relevant Resolvers
3. Coordinates the commit protocol

## Stage 4: Conflict Detection

Resolvers determine if the transaction conflicts with concurrent commits.

```mermaid
graph TB
    subgraph "Resolver State"
        Window["Recent Commits Window<br/>(~5 seconds of history)"]
        
        subgraph "Version 123450"
            W1[Write: key_X]
        end
        
        subgraph "Version 123452"
            W2[Write: key_Y, key_Z]
        end
        
        subgraph "Version 123455"
            W3[Write: key_X]
        end
    end
    
    TX["New Transaction<br/>Read: key_X at v123451<br/>Commit: v123456"]
    
    TX --> Check{Conflict?}
    W3 --> Check
    Check -->|key_X written at v123455 > v123451| Conflict[❌ Conflict!]
```

### Conflict Detection Algorithm

For each transaction with read version `RV` and commit version `CV`:

```
for each key in transaction.readSet:
    if key was written at any version V where RV < V < CV:
        return CONFLICT
return NO_CONFLICT
```

### Resolver Sharding

For scalability, multiple Resolvers each handle a portion of the key space:

- Each key range maps to a specific Resolver
- Transactions touching multiple ranges go to multiple Resolvers
- All Resolvers must approve for commit to proceed

## Stage 5: Write to Transaction Logs

After conflict resolution passes, mutations are written to TLogs:

```mermaid
sequenceDiagram
    participant Proxy as Commit Proxy
    participant TL1 as TLog 1
    participant TL2 as TLog 2
    participant TL3 as TLog 3

    Note over Proxy: Parallel write to all TLogs

    par Write to quorum
        Proxy->>TL1: Write mutations @ v123457
        TL1->>TL1: fsync()
        TL1-->>Proxy: Durable ✓
    and
        Proxy->>TL2: Write mutations @ v123457
        TL2->>TL2: fsync()
        TL2-->>Proxy: Durable ✓
    and
        Proxy->>TL3: Write mutations @ v123457
        TL3->>TL3: fsync()
        TL3-->>Proxy: (slower response)
    end

    Note over Proxy: Quorum (2/3) achieved
    Note over Proxy: Transaction committed!
```

### Durability Guarantees

| Property | Guarantee |
|----------|-----------|
| **Sync writes** | fsync() before acknowledgment |
| **Quorum** | Majority of TLogs must acknowledge |
| **Ordering** | Mutations written in version order |

## Stage 6: Client Acknowledgment

Once quorum TLogs acknowledge:

1. Commit Proxy marks transaction as committed
2. Returns commit version to client
3. Transaction is now durable and visible

### Timing Summary

| Stage | Typical Latency | On Critical Path? |
|-------|-----------------|-------------------|
| Get Read Version | 0.5-2 ms | Yes |
| Read from Storage | 0.5-2 ms × keys | Yes |
| Commit to Proxy | 0.5-1 ms | Yes |
| Conflict Resolution | 0.1-0.5 ms | Yes |
| TLog Write + fsync | 1-5 ms | Yes |
| **Total Commit** | **3-15 ms** | - |

## Stage 7: Apply to Storage (Async)

After commit, mutations flow to storage servers asynchronously:

```mermaid
graph LR
    subgraph "Transaction Logs"
        TLog1[TLog 1]
        TLog2[TLog 2]
    end

    subgraph "Storage Servers"
        SS1[SS1: keys a-m]
        SS2[SS2: keys n-z]
    end

    TLog1 -->|Stream mutations| SS1
    TLog1 -->|Stream mutations| SS2
    TLog2 -->|Stream mutations| SS1
    TLog2 -->|Stream mutations| SS2
```

Storage servers:

1. **Pull from TLogs** - Request mutations for their key ranges
2. **Apply in order** - Maintain version ordering
3. **Update versions** - Track "durable version" for reads

### Storage Server Lag

If storage servers fall behind:

- Reads at old versions still work (MVCC)
- Ratekeeper throttles new transactions
- TLogs buffer mutations (bounded memory)

## Conflict Handling

When conflicts occur:

```mermaid
flowchart TB
    Conflict[Transaction Conflicts]

    Conflict --> ClientRetry[Client-side retry loop]
    ClientRetry --> NewGRV[Get new read version]
    NewGRV --> Reread[Re-read keys]
    Reread --> Reapply[Re-apply logic]
    Reapply --> Recommit[Try commit again]
```

The client binding handles this automatically with exponential backoff.

## Source Code References

[:material-github: CommitProxyServer.actor.cpp](https://github.com/apple/foundationdb/blob/main/fdbserver/CommitProxyServer.actor.cpp)
: Commit proxy implementation

[:material-github: Resolver.actor.cpp](https://github.com/apple/foundationdb/blob/main/fdbserver/Resolver.actor.cpp)
: Conflict resolution logic

[:material-github: TLogServer.actor.cpp](https://github.com/apple/foundationdb/blob/main/fdbserver/TLogServer.actor.cpp)
: Transaction log implementation

[:material-github: GrvProxyServer.actor.cpp](https://github.com/apple/foundationdb/blob/main/fdbserver/GrvProxyServer.actor.cpp)
: GRV proxy implementation

## Further Reading

- [ACID Guarantees](../concepts/acid.md) - How the pipeline delivers ACID
- [Architecture Deep Dive](architecture-deep-dive.md) - System overview
- [Recovery Internals](recovery-internals.md) - What happens when components fail
- [:material-file-pdf-box: SIGMOD Paper, Section 3](https://www.foundationdb.org/files/fdb-paper.pdf) - Transaction processing

