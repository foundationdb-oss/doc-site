---
title: Cluster Recovery Process
description: How FoundationDB recovers from failures through multi-phase recovery
---

# Cluster Recovery Process

FoundationDB is designed to recover quickly from any component failure. This guide explains the multi-phase recovery process that ensures no committed data is lost while minimizing downtime.

!!! warning "Advanced Content"
    This builds on [Architecture](../concepts/architecture.md). Understanding the transaction system components is essential.

## Recovery Philosophy

FDB embraces failure as inevitable and designs for fast recovery:

> "FDB assumes that failures will happen and focuses on recovering quickly rather than preventing failures."

Key principles:

- **Fail fast** - Detect failures quickly, don't wait
- **Recovery over prevention** - Optimize recovery time, not MTBF
- **Generation-based** - Replace entire transaction system atomically
- **Guaranteed durability** - No committed transactions are ever lost

## What Triggers Recovery

Recovery is triggered when any critical component fails:

```mermaid
graph TB
    subgraph "Transaction System (Generation N)"
        Master[Master]
        Proxy[Proxies]
        Resolver[Resolvers]
        TLog[TLogs]
    end
    
    Failure[/"Component Failure"/]
    
    Master --> Failure
    Proxy --> Failure
    Resolver --> Failure
    TLog --> Failure
    
    Failure --> NewGen["Recovery: Create Generation N+1"]
```

| Trigger | Description |
|---------|-------------|
| **Master failure** | Master process crashes or becomes unreachable |
| **TLog failure** | Transaction log below quorum |
| **Resolver failure** | Resolver process crashes |
| **Proxy failure** | Commit proxy crashes |
| **Network partition** | Components can't communicate |
| **Configuration change** | Redundancy mode, storage engine changes |

## Recovery Phases

Recovery proceeds through four distinct phases:

```mermaid
stateDiagram-v2
    [*] --> CoordinatorLock: Failure Detected
    
    CoordinatorLock: Phase 1: Lock Coordinators
    MasterRecruit: Phase 2: Recruit Master
    TransactionRecovery: Phase 3: Transaction System Recovery
    AcceptCommits: Phase 4: Resume Operations
    
    CoordinatorLock --> MasterRecruit: Lock acquired
    MasterRecruit --> TransactionRecovery: Master elected
    TransactionRecovery --> AcceptCommits: Recovery complete
    AcceptCommits --> [*]: Cluster operational
    
    note right of CoordinatorLock: ~5-20 ms
    note right of MasterRecruit: ~10-50 ms
    note right of TransactionRecovery: ~50-200 ms
    note right of AcceptCommits: Ready to serve
```

### Phase 1: Lock Coordinators

The Cluster Controller detects failure and begins recovery:

1. **Failure detection** - Heartbeat timeout or explicit notification
2. **Coordinator lock** - CC acquires lock on coordinators (Paxos)
3. **Prevent split-brain** - Old generation cannot make progress

```mermaid
sequenceDiagram
    participant CC as Cluster Controller
    participant C1 as Coordinator 1
    participant C2 as Coordinator 2
    participant C3 as Coordinator 3
    
    Note over CC: Failure detected
    
    par Lock coordinators
        CC->>C1: Lock (generation N+1)
        CC->>C2: Lock (generation N+1)
        CC->>C3: Lock (generation N+1)
    end
    
    C1-->>CC: Locked ✓
    C2-->>CC: Locked ✓
    C3-->>CC: Locked ✓
    
    Note over CC: Majority locked - proceed
```

### Phase 2: Recruit Master

The Cluster Controller recruits a new Master:

1. **Select candidate** - Choose healthy process for Master role
2. **Master startup** - New Master initializes
3. **Version handoff** - New Master gets last committed version

### Phase 3: Transaction System Recovery

The most complex phase—rebuilding the transaction system:

```mermaid
flowchart TB
    subgraph "Recovery Steps"
        A[Recruit new TLogs, Resolvers, Proxies]
        B[Read recovery state from old TLogs]
        C[Determine recovery version]
        D[Copy uncommitted data to new TLogs]
        E[Accept new transactions]
    end
    
    A --> B --> C --> D --> E
```

#### Determining Recovery Version

The new Master must determine which transactions committed:

```mermaid
graph LR
    subgraph "Old TLogs"
        TL1["TLog 1<br/>Versions: 100-150"]
        TL2["TLog 2<br/>Versions: 100-148"]
        TL3["TLog 3<br/>Versions: 100-145"]
    end
    
    RecoveryPoint["Recovery Version: 148<br/>(Quorum agreement)"]
    
    TL1 --> RecoveryPoint
    TL2 --> RecoveryPoint
    TL3 --> RecoveryPoint
```

The recovery version is the highest version that:

- Was acknowledged by a quorum of TLogs
- Was marked as committed by the old Master

### Phase 4: Resume Operations

Once the new transaction system is ready:

1. **New TLogs ready** - Accepting writes
2. **Resolvers ready** - Conflict detection active
3. **Proxies ready** - Accepting client requests
4. **Master announces** - New generation is live

```mermaid
graph TB
    subgraph "Generation N (Failed)"
        Old[Old Master<br/>Old TLogs<br/>Old Proxies]
        style Old fill:#ffcccc
    end

    subgraph "Generation N+1 (Active)"
        New[New Master<br/>New TLogs<br/>New Proxies]
        style New fill:#ccffcc
    end

    Old -->|Recovery| New
    Client[Clients] --> New
```

## Recovery Guarantees

FDB's recovery provides strong guarantees:

| Guarantee | Description |
|-----------|-------------|
| **No data loss** | All committed transactions survive recovery |
| **No phantoms** | Uncommitted transactions don't appear after recovery |
| **Consistency** | Database remains consistent throughout |
| **Bounded time** | Recovery typically < 1 second |

### How Durability Is Maintained

```mermaid
graph LR
    subgraph "Before Failure"
        T1["Txn 1: Committed ✓<br/>(Quorum TLogs)"]
        T2["Txn 2: Committed ✓<br/>(Quorum TLogs)"]
        T3["Txn 3: In-flight<br/>(Not all TLogs)"]
    end

    subgraph "After Recovery"
        R1["Txn 1: Preserved ✓"]
        R2["Txn 2: Preserved ✓"]
        R3["Txn 3: Lost ✗<br/>(Client will retry)"]
    end

    T1 --> R1
    T2 --> R2
    T3 -.->|Not durable| R3
```

## Availability During Recovery

FDB remains partially available during recovery:

| Operation | During Recovery |
|-----------|-----------------|
| **Reads (recent)** | Available if storage server has data |
| **Reads (old)** | May fail if version too old |
| **Writes** | Blocked until recovery completes |
| **New transactions** | Blocked during GRV unavailability |

### Client Behavior

Clients automatically handle recovery:

1. **Retry loop** - Built into client bindings
2. **Backoff** - Exponential backoff during unavailability
3. **Reconnect** - Discover new proxies via coordinators

## Recovery Timing

Typical recovery phases:

```mermaid
gantt
    title Recovery Timeline
    dateFormat X
    axisFormat %L ms

    section Phase 1
    Lock Coordinators    :0, 20

    section Phase 2
    Recruit Master       :20, 50

    section Phase 3
    Recruit TLogs        :50, 100
    Read Old TLogs       :100, 200
    Determine Recovery   :200, 250

    section Phase 4
    Resume Service       :250, 300
```

| Phase | Typical Duration | Factors |
|-------|------------------|---------|
| Coordinator lock | 5-20 ms | Coordinator latency |
| Master recruitment | 10-30 ms | Process availability |
| TLog recovery | 50-200 ms | Log size, network |
| **Total** | **100-500 ms** | Cluster size, load |

## Failure Scenarios

### Single TLog Failure

```mermaid
flowchart LR
    Fail["TLog 3 fails"] --> Detect["Master detects failure"]
    Detect --> Recover["Full recovery<br/>(new generation)"]
    Recover --> Resume["Resume with<br/>remaining TLogs"]
```

### Master Failure

The Cluster Controller detects and initiates recovery:

1. CC notices Master heartbeat missing
2. CC triggers full transaction system recovery
3. New Master recruited, new generation started

### Coordinator Failure

Coordinators use Paxos for fault tolerance:

- **Majority available** - Cluster continues
- **Minority lost** - No cluster impact
- **Majority lost** - Cluster unavailable (configuration issue)

## Monitoring Recovery

Key recovery metrics:

| Metric | Description |
|--------|-------------|
| `Recoveries` | Count of recovery events |
| `RecoveryDuration` | Time spent in recovery |
| `RecoveryState` | Current recovery phase |

Monitor recovery in `fdbcli`:

```bash
fdb> status details
# Shows recovery state and history
```

## Source Code References

[:material-github: MasterProxyServer.actor.cpp](https://github.com/apple/foundationdb/blob/main/fdbserver/MasterProxyServer.actor.cpp)
: Master and recovery coordination

[:material-github: ClusterController.actor.cpp](https://github.com/apple/foundationdb/blob/main/fdbserver/ClusterController.actor.cpp)
: Cluster controller logic

[:material-github: Coordination.actor.cpp](https://github.com/apple/foundationdb/blob/main/fdbserver/Coordination.actor.cpp)
: Coordinator implementation

## Further Reading

- [Architecture Overview](../concepts/architecture.md) - Component roles
- [Architecture Deep Dive](architecture-deep-dive.md) - Transaction processing
- [Simulation Testing](simulation-testing.md) - How recovery is tested
- [:material-file-pdf-box: SIGMOD Paper, Section 5](https://www.foundationdb.org/files/fdb-paper.pdf) - Recovery design

