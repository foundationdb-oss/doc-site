---
hide:
  - navigation
  - toc
---

<!-- Hero Section with Parallax Gradient -->
<div class="hero-parallax" markdown>
<div class="hero-parallax__bg-layer"></div>
<div class="hero-parallax__mid-layer"></div>
<div class="hero-parallax__fg-layer"></div>

<div class="hero-parallax__content" markdown>
<div class="hero-text" markdown>
# A distributed database designed for correctness

Write applications with confidence using ACID transactions at any scale—simulation-tested, battle-proven, and open source.

[Get started](getting-started/quickstart.md){ .md-button .md-button--primary .md-button--lg }
[Learn more](concepts/index.md){ .md-button .md-button--lg }

</div>

<div class="hero-graphic">
<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Distributed database cluster diagram showing 5 connected nodes">
  <title>FoundationDB Distributed Cluster</title>
  <defs>
    <linearGradient id="nodeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#5c6bc0"/>
      <stop offset="100%" style="stop-color:#3f51b5"/>
    </linearGradient>
    <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6a5acd"/>
      <stop offset="100%" style="stop-color:#6a5acd"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Connection Lines -->
  <g class="connections" stroke="#7c4dff" stroke-width="2" stroke-opacity="0.4" fill="none">
    <line x1="200" y1="150" x2="120" y2="80" class="connection-line"/>
    <line x1="200" y1="150" x2="280" y2="80" class="connection-line"/>
    <line x1="200" y1="150" x2="100" y2="200" class="connection-line"/>
    <line x1="200" y1="150" x2="300" y2="200" class="connection-line"/>
    <line x1="120" y1="80" x2="280" y2="80" class="connection-line"/>
    <line x1="100" y1="200" x2="300" y2="200" class="connection-line"/>
    <line x1="120" y1="80" x2="100" y2="200" class="connection-line"/>
    <line x1="280" y1="80" x2="300" y2="200" class="connection-line"/>
  </g>

  <!-- Data Flow Particles -->
  <g class="data-particles">
    <circle class="particle" r="3" fill="#7c4dff">
      <animateMotion dur="3s" repeatCount="indefinite" path="M200,150 L120,80"/>
    </circle>
    <circle class="particle" r="3" fill="#7c4dff">
      <animateMotion dur="2.5s" repeatCount="indefinite" path="M200,150 L300,200"/>
    </circle>
    <circle class="particle" r="3" fill="#3f51b5">
      <animateMotion dur="3.5s" repeatCount="indefinite" path="M100,200 L200,150"/>
    </circle>
  </g>

  <!-- Database Nodes -->
  <g class="nodes" filter="url(#glow)">
    <g class="node node-central">
      <circle cx="200" cy="150" r="28" fill="url(#nodeGradient)"/>
      <rect x="186" y="140" width="28" height="20" rx="2" fill="white" fill-opacity="0.9"/>
      <line x1="190" y1="146" x2="210" y2="146" stroke="#3f51b5" stroke-width="2"/>
      <line x1="190" y1="150" x2="206" y2="150" stroke="#3f51b5" stroke-width="2"/>
      <line x1="190" y1="154" x2="208" y2="154" stroke="#3f51b5" stroke-width="2"/>
    </g>
    <g class="node">
      <circle cx="120" cy="80" r="22" fill="url(#accentGradient)"/>
      <rect x="108" y="72" width="24" height="16" rx="2" fill="white" fill-opacity="0.9"/>
      <line x1="112" y1="77" x2="128" y2="77" stroke="#7c4dff" stroke-width="1.5"/>
      <line x1="112" y1="81" x2="124" y2="81" stroke="#7c4dff" stroke-width="1.5"/>
    </g>
    <g class="node">
      <circle cx="280" cy="80" r="22" fill="url(#accentGradient)"/>
      <rect x="268" y="72" width="24" height="16" rx="2" fill="white" fill-opacity="0.9"/>
      <line x1="272" y1="77" x2="288" y2="77" stroke="#7c4dff" stroke-width="1.5"/>
      <line x1="272" y1="81" x2="284" y2="81" stroke="#7c4dff" stroke-width="1.5"/>
    </g>
    <g class="node">
      <circle cx="100" cy="200" r="22" fill="url(#accentGradient)"/>
      <rect x="88" y="192" width="24" height="16" rx="2" fill="white" fill-opacity="0.9"/>
      <line x1="92" y1="197" x2="108" y2="197" stroke="#7c4dff" stroke-width="1.5"/>
      <line x1="92" y1="201" x2="104" y2="201" stroke="#7c4dff" stroke-width="1.5"/>
    </g>
    <g class="node">
      <circle cx="300" cy="200" r="22" fill="url(#accentGradient)"/>
      <rect x="288" y="192" width="24" height="16" rx="2" fill="white" fill-opacity="0.9"/>
      <line x1="292" y1="197" x2="308" y2="197" stroke="#7c4dff" stroke-width="1.5"/>
      <line x1="292" y1="201" x2="304" y2="201" stroke="#7c4dff" stroke-width="1.5"/>
    </g>
  </g>

  <!-- Labels -->
  <g class="labels" font-family="system-ui, sans-serif" font-size="10" fill="#666" text-anchor="middle">
    <text x="200" y="275">Distributed • Transactional • Scalable</text>
  </g>
</svg>
</div>
</div>

<div class="hero-parallax__fade"></div>
</div>

<!-- Section: Everything you would expect -->
<section class="landing-section landing-section--features" markdown>
## Everything you would expect { #features }

<div class="grid cards" markdown>

-   :material-shield-check:{ .lg .middle } **True ACID Transactions**

    ---

    Multi-key, multi-range transactions with serializable isolation—the strongest guarantee possible. No eventual consistency surprises.

    [:octicons-arrow-right-24: Learn about transactions](concepts/transactions.md)

-   :material-flask:{ .lg .middle } **Simulation Tested**

    ---

    Our deterministic simulation framework tests millions of failure scenarios before every release. Bugs are found before they reach you.

    [:octicons-arrow-right-24: How it works](guides/simulation-testing.md)

-   :material-server-network:{ .lg .middle } **Horizontally Scalable**

    ---

    Add nodes to increase capacity without application changes. Built for clusters from 3 nodes to hundreds of machines.

    [:octicons-arrow-right-24: Architecture](concepts/architecture.md)

-   :material-lightning-bolt:{ .lg .middle } **High Performance**

    ---

    Millions of operations per second with single-digit millisecond latencies. Optimized for both read and write-heavy workloads.

    [:octicons-arrow-right-24: Getting started](getting-started/quickstart.md)

-   :material-shield-refresh:{ .lg .middle } **Fault Tolerant**

    ---

    Automatic failover and recovery. Your data survives hardware failures, network partitions, and datacenter outages.

    [:octicons-arrow-right-24: Operations guide](operations/index.md)

-   :material-layers-triple:{ .lg .middle } **Multi-Model Foundation**

    ---

    Build documents, graphs, tables, or queues on top of the ordered key-value store. The layer concept enables any data model.

    [:octicons-arrow-right-24: Data model](concepts/data-model.md)

</div>
</section>

<!-- Section: More than just a key-value store -->
<section class="landing-section landing-section--highlights" markdown>
## More than just a key-value store { #highlights }

<div class="feature-highlight" markdown>
<div class="feature-highlight__content" markdown>
### :material-layers-triple: Layered Architecture

Build any data model on top of FoundationDB's ordered key-value core. The **Record Layer** provides structured storage with indexing, while the **Document Layer** offers MongoDB-compatible APIs.

The layer concept lets you implement documents, graphs, tables, queues, or custom data structures—all with the same underlying ACID guarantees.

[Explore the layers :octicons-arrow-right-24:](concepts/data-model.md)
</div>
<div class="feature-highlight__visual" markdown>
```
┌─────────────────────────────────────┐
│     Your Application                │
├─────────────────────────────────────┤
│  Record Layer  │  Document Layer    │
├─────────────────────────────────────┤
│     FoundationDB Key-Value Store    │
└─────────────────────────────────────┘
```
</div>
</div>

<div class="feature-highlight feature-highlight--reverse" markdown>
<div class="feature-highlight__content" markdown>
### :material-test-tube: Simulation Testing

Before any release, FoundationDB runs **millions of simulated hours** of operation, injecting every imaginable failure: disk corruption, network partitions, process crashes, and clock skew.

This deterministic testing framework catches bugs that would take years to appear in production—before they ever reach you.

[Learn about simulation :octicons-arrow-right-24:](guides/simulation-testing.md)
</div>
<div class="feature-highlight__visual" markdown>
```
Simulated failures:
  ✓ 1M+ hours tested
  ✓ Network partitions
  ✓ Disk failures
  ✓ Process crashes
  ✓ Clock skew
  ✓ Byzantine faults
```
</div>
</div>

<div class="feature-highlight" markdown>
<div class="feature-highlight__content" markdown>
### :material-earth: Multi-Region Replication

Deploy FoundationDB across data centers for disaster recovery and low-latency reads worldwide. Synchronous replication ensures no data loss, while configurable consistency levels let you tune the tradeoff between latency and freshness.

[Configure replication :octicons-arrow-right-24:](operations/configuration.md)
</div>
<div class="feature-highlight__visual" markdown>
```
        Region A          Region B
      ┌─────────┐       ┌─────────┐
      │  Node   │◄─────►│  Node   │
      │  Node   │       │  Node   │
      │  Node   │       │  Node   │
      └─────────┘       └─────────┘
           ▲                 ▲
           └────────┬────────┘
                    ▼
              ┌─────────┐
              │ Region C│
              └─────────┘
```
</div>
</div>
</section>

<!-- Section: Trusted in production -->
<section class="landing-section landing-section--trusted" markdown>
## Trusted in production { #trusted }

<p class="section-intro">Industry leaders rely on FoundationDB for mission-critical workloads. Over 10 years in production, handling millions of transactions per second.</p>

<div class="company-logos">
  <div class="company-logo">
    <img src="assets/images/logos/apple.svg" alt="Apple" />
  </div>
  <div class="company-logo">
    <img src="assets/images/logos/snowflake.svg" alt="Snowflake" />
  </div>
  <div class="company-logo">
    <img src="assets/images/logos/vmware.svg" alt="VMware" />
  </div>
  <div class="company-logo">
    <img src="assets/images/logos/tigris.svg" alt="Tigris" />
  </div>
  <div class="company-logo">
    <img src="assets/images/logos/adobe.svg" alt="Adobe" />
  </div>
</div>
</section>

<!-- Section: See it in action -->
<section class="landing-section landing-section--video" markdown>
## See it in action { #video }

<div class="video-section" markdown>
<div class="video-wrapper">
  <iframe
    src="https://www.youtube.com/embed/ZQc9-seU-5k"
    title="Swift as C++ Successor in FoundationDB - Strange Loop 2023"
    frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowfullscreen>
  </iframe>
</div>

**Swift as C++ Successor in FoundationDB** — Konrad Malawski at Strange Loop 2023

Learn how FoundationDB is pioneering the use of Swift as a systems programming language, replacing C++ for new development while maintaining the database's legendary reliability.
</div>
</section>

<!-- Section: Let's keep in touch -->
<section class="landing-section landing-section--community" markdown>
## Let's keep in touch { #community }

<div class="grid cards" markdown>

-   :fontawesome-brands-github:{ .lg .middle } **GitHub**

    ---

    Star the project, report issues, and contribute code.

    [:octicons-arrow-right-24: apple/foundationdb](https://github.com/apple/foundationdb)

-   :fontawesome-brands-discord:{ .lg .middle } **Discord**

    ---

    Chat with the community in real-time.

    [:octicons-arrow-right-24: Join Discord](https://discord.gg/foundationdb)

-   :material-forum:{ .lg .middle } **Forums**

    ---

    Ask questions and connect with the community.

    [:octicons-arrow-right-24: Community Forums](https://forums.foundationdb.org)

-   :fontawesome-brands-slack:{ .lg .middle } **Slack**

    ---

    Real-time discussions with the FoundationDB community.

    [:octicons-arrow-right-24: Join Slack](https://join.slack.com/t/foundationdb-community)

</div>
</section>

<!-- Custom Footer -->
<footer class="landing-footer" markdown>
Made with :material-heart:{ .heart-icon } and FoundationDB
</footer>

