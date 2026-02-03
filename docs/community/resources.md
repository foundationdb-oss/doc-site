---
title: Resources
description: Community resources, talks, papers, and learning materials for FoundationDB
---

# Resources

Explore talks, papers, tools, and learning materials from the FoundationDB community.

## :material-youtube: Conference Talks

### Featured Talks

<div class="grid cards" markdown>

-   :material-star:{ .lg .middle } **FoundationDB SIGMOD Paper Presentation**

    ---

    Official presentation of the SIGMOD 2021 Best Paper Award winner.

    [:octicons-arrow-right-24: Watch on YouTube](https://www.youtube.com/watch?v=st0VjQdpZL4){ target="_blank" }

-   :material-shield-check:{ .lg .middle } **Deterministic Simulation Testing**

    ---

    Will Wilson explains FoundationDB's legendary testing approach (2014).

    [:octicons-arrow-right-24: Watch on YouTube](https://www.youtube.com/watch?v=4fFDFbi3toc){ target="_blank" }

</div>

### FoundationDB Summit Recordings

| Year | Playlist | Highlights |
|------|----------|------------|
| **2019** | [:octicons-play-24: Watch Playlist](https://www.youtube.com/playlist?list=PLbzoR-pLrL6oWYrC950yAhbLk8FRRB_Bt){ target="_blank" } | Production experiences, new features |
| **2018** | [:octicons-play-24: Watch Playlist](https://www.youtube.com/playlist?list=PLbzoR-pLrL6q7uYN-94-p_-Q3hyAmpI7o){ target="_blank" } | First summit after open source release |

### Technical Deep Dives

| Talk | Speaker | Year | Link |
|------|---------|------|------|
| FoundationDB at Snowflake: Architecture and Internals | Markus Pilman (Snowflake) | 2021 | [:octicons-play-24:](https://www.youtube.com/watch?v=4yH4r8ZCt8M){ target="_blank" } |
| FoundationDB or: How I Learned to Stop Worrying | Markus Pilman (Snowflake) | 2020 | [:octicons-play-24:](https://www.youtube.com/watch?v=OJb8A6h9jQQ){ target="_blank" } |
| Novel Design Choices in Apache CouchDB | Adam Kocoloski | 2021 | [:octicons-play-24:](https://www.youtube.com/watch?v=FCs7Dz8hgjQ){ target="_blank" } |
| QuiCK: A Queuing System in CloudKit | Apple Engineers | 2021 | [:octicons-play-24:](https://www.youtube.com/watch?v=I9mNENkZT90){ target="_blank" } |
| Operating FoundationDB on Kubernetes | Johannes Scheuermann | 2022 | [:octicons-play-24:](https://www.youtube.com/watch?v=Kf3kquvuing){ target="_blank" } |

### Recent Meetup Recordings (2024-2025)

| Topic | Company | Link |
|-------|---------|------|
| FoundationDB as an Identity Graph Database | Adobe | [:octicons-play-24:](https://www.youtube.com/watch?v=oYiFTBO67uU){ target="_blank" } |
| How Tigris Leverages FDB for Global Metadata | Tigris Data | [:octicons-play-24:](https://www.youtube.com/watch?v=QubKAR1Wl4o){ target="_blank" } |
| Encryption in FoundationDB | Snowflake | [:octicons-play-24:](https://www.youtube.com/watch?v=4K96Z-8mt_0){ target="_blank" } |
| Spark Connector for FoundationDB | Adobe | [:octicons-play-24:](https://www.youtube.com/watch?v=_JdD_EYU-GE){ target="_blank" } |
| Control Plane for FoundationDB | Snowflake | [:octicons-play-24:](https://www.youtube.com/watch?v=JrPahzbLYGs){ target="_blank" } |
| Self Healing from Gray Failures | Adobe | [:octicons-play-24:](https://www.youtube.com/watch?v=zonHByBBb4M){ target="_blank" } |
| RocksDB Storage Engine for FoundationDB | Adobe | [:octicons-play-24:](https://www.youtube.com/watch?v=LibOOXxeraE){ target="_blank" } |

---

## :material-file-document: Academic Papers

### Core Papers

<div class="grid cards" markdown>

-   :material-trophy:{ .lg .middle } **SIGMOD 2021 Best Paper**

    ---

    **FoundationDB: A Distributed Unbundled Transactional Key Value Store**

    The definitive paper on FoundationDB's architecture, winning the SIGMOD 2021 Best Paper Award.

    [:octicons-arrow-right-24: Read Paper (PDF)](https://www.foundationdb.org/files/fdb-paper.pdf){ target="_blank" }

-   :material-cloud:{ .lg .middle } **Record Layer Paper**

    ---

    **FoundationDB Record Layer: A Multi-Tenant Structured Datastore**

    How Apple's CloudKit uses the Record Layer to serve hundreds of millions of users.

    [:octicons-arrow-right-24: Read Paper (PDF)](https://www.foundationdb.org/files/record-layer-paper.pdf){ target="_blank" }

</div>

### Additional Papers

| Paper | Year | Description |
|-------|------|-------------|
| [QuiCK: A Queuing System in CloudKit](https://www.foundationdb.org/files/QuiCK.pdf){ target="_blank" } | 2021 | Apple's queueing system built on FoundationDB |
| [CloudKit: Structured Storage for Mobile Applications](https://www.vldb.org/pvldb/vol11/p540-shraer.pdf){ target="_blank" } | 2018 | Apple's iCloud backend architecture |

---

## :fontawesome-brands-github: Official Resources

| Resource | Description |
|----------|-------------|
| [:octicons-mark-github-16: GitHub Repository](https://github.com/apple/foundationdb){ target="_blank" } | Source code, issues, and discussions |
| [:material-web: Official Website](https://www.foundationdb.org){ target="_blank" } | Project homepage and blog |
| [:material-book-open-variant: Documentation](https://apple.github.io/foundationdb/){ target="_blank" } | Official technical documentation |
| [:material-download: Downloads](https://apple.github.io/foundationdb/downloads.html){ target="_blank" } | Binary releases for all platforms |
| [:material-tag: Release Notes](https://github.com/apple/foundationdb/releases){ target="_blank" } | Version history and changelog |

---

## :material-layers: Official Layers

FoundationDB's layered architecture enables building specialized databases on top of its transactional core.

<div class="grid cards" markdown>

-   :material-database:{ .lg .middle } **Record Layer**

    ---

    A structured data store providing schema management, indexing, and queries. Powers Apple's CloudKit.

    [:octicons-mark-github-16: GitHub](https://github.com/FoundationDB/fdb-record-layer){ target="_blank" } · [:material-book: Documentation](https://foundationdb.github.io/fdb-record-layer/){ target="_blank" }

-   :material-file-document:{ .lg .middle } **Document Layer**

    ---

    MongoDB-compatible document database built on FoundationDB.

    [:octicons-mark-github-16: GitHub](https://github.com/FoundationDB/fdb-document-layer){ target="_blank" } · [:material-book: Documentation](https://foundationdb.github.io/fdb-document-layer/){ target="_blank" }

</div>

---

## :material-tools: Tools & Operations

### Monitoring & Observability

| Tool | Description | Link |
|------|-------------|------|
| **fdb_exporter** | Prometheus metrics exporter | [:octicons-mark-github-16:](https://github.com/leoluk/fdb_exporter){ target="_blank" } |
| **wavefront-fdb-tailer** | Wavefront integration | [:octicons-mark-github-16:](https://github.com/wavefrontHQ/wavefront-fdb-tailer){ target="_blank" } |

### Kubernetes

| Tool | Description | Link |
|------|-------------|------|
| **fdb-kubernetes-operator** | Official Kubernetes operator | [:octicons-mark-github-16:](https://github.com/FoundationDB/fdb-kubernetes-operator){ target="_blank" } |

### Benchmarking

| Tool | Description | Link |
|------|-------------|------|
| **go-ycsb** | Database benchmark suite with FDB support | [:octicons-mark-github-16:](https://github.com/pingcap/go-ycsb){ target="_blank" } |

---

## :material-bookshelf: Community Bindings

Beyond official Python, Java, Ruby, Go, and C bindings, the community maintains:

| Language | Maintainer | Link |
|----------|------------|------|
| **Rust** | fdb-rs community | [:octicons-mark-github-16:](https://github.com/foundationdb-rs/foundationdb-rs){ target="_blank" } |
| **C#/.NET** | @Doxense | [:octicons-mark-github-16:](https://github.com/Doxense/foundationdb-dotnet-client){ target="_blank" } |
| **Node.js** | @josephg | [:material-npm:](https://www.npmjs.com/package/foundationdb){ target="_blank" } |
| **Elixir** | @ananthakumaran | [:octicons-mark-github-16:](https://github.com/ananthakumaran/fdb){ target="_blank" } |
| **Haskell** | @crclark | [:octicons-mark-github-16:](https://github.com/crclark/foundationdb-haskell){ target="_blank" } |
| **Swift** | @kirilltitov | [:octicons-mark-github-16:](https://github.com/kirilltitov/FDBSwift){ target="_blank" } |

[:octicons-arrow-right-24: See all bindings on awesome-foundationdb](https://github.com/FoundationDB/awesome-foundationdb#bindings){ target="_blank" }

---

## :material-podcast: Podcasts

| Podcast | Episode | Year |
|---------|---------|------|
| **Antithesis BugBash** | [FoundationDB: From Idea to Apple Acquisition](https://www.youtube.com/watch?v=C1nZzQqcPZw){ target="_blank" } | 2023 |
| **Data Engineering Podcast** | [Using FoundationDB As The Bedrock For Your Distributed Systems](https://www.dataengineeringpodcast.com/foundationdb-distributed-systems-episode-80/){ target="_blank" } | 2019 |
| **Software Engineering Daily** | [FoundationDB with Ryan Worl](https://softwareengineeringdaily.com/2019/07/01/foundationdb-with-ryan-worl/){ target="_blank" } | 2019 |

---

## :material-factory: Production Users

FoundationDB powers critical infrastructure at:

| Company | Use Case |
|---------|----------|
| **Apple** | iCloud services via CloudKit (hundreds of millions of users) |
| **Snowflake** | Metadata management for cloud data warehouse |
| **Wavefront (VMware)** | Cloud monitoring and analytics |
| **Tigris Data** | Global metadata storage |
| **Adobe** | Identity graph database |

---

## :material-book-plus: Additional Resources

- [:material-flask: Internals & Deep Dives](../guides/internals-overview.md) — Architecture, simulation testing, storage engines
- [:octicons-mark-github-16: awesome-foundationdb](https://github.com/FoundationDB/awesome-foundationdb){ target="_blank" } — Comprehensive curated list
- [:material-blog: Official Blog](https://www.foundationdb.org/blog/){ target="_blank" } — Announcements and technical posts
- [:material-forum: Community Forums](https://forums.foundationdb.org/){ target="_blank" } — Discussions and Q&A

