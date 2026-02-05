---
title: Contributing
description: How to contribute to FoundationDB - get started with code, docs, or community
---

# Contributing

Welcome to the FoundationDB community! :wave:

We're thrilled you're interested in contributing. FoundationDB is an open-source project that powers critical infrastructure at companies like Apple, Snowflake, and Adobe—and it's built and improved by contributors like you.

!!! tip "First Time Contributing?"
    New to FoundationDB or open source? That's great! Check out our [Getting Started Guide](../getting-started/index.md) to understand the project, then come back here when you're ready to contribute.

---

## :material-hand-wave: Ways to Get Involved

<div class="grid cards" markdown>

-   :material-bug:{ .lg .middle } **Report Issues**

    ---

    Found a bug or unexpected behavior? Help us improve by reporting it.

    [:octicons-arrow-right-24: Open an Issue](https://github.com/apple/foundationdb/issues/new){ .md-button target="_blank" }

-   :material-source-pull:{ .lg .middle } **Submit Code**

    ---

    Fix bugs, add features, or improve performance.

    [:octicons-arrow-right-24: Fork on GitHub](https://github.com/apple/foundationdb/fork){ .md-button target="_blank" }

-   :material-file-document:{ .lg .middle } **Improve Docs**

    ---

    Documentation improvements are always welcome and appreciated. Every page has an "Edit" button.

    [:octicons-arrow-right-24: Edit Docs](https://github.com/foundationdb-oss/doc-site){ .md-button target="_blank" }

-   :material-tag-multiple:{ .lg .middle } **Doc Versions**

    ---

    We use [mike](https://github.com/jimporter/mike) for documentation versioning. See the [workflow guide](#documentation-versioning) below.

    [:octicons-arrow-right-24: Versioning Guide](#documentation-versioning)

-   :material-forum:{ .lg .middle } **Join Discussions**

    ---

    Share knowledge, ask questions, and help other users.

    [:octicons-arrow-right-24: Community Forum](https://forums.foundationdb.org){ .md-button target="_blank" }

</div>

---

## :material-rocket-launch: Getting Started

### Prerequisites

Before building FoundationDB, ensure you have:

- **Operating System**: Linux (recommended), macOS, or Windows
- **Compiler**: Clang 11+ or GCC 10+
- **Build Tools**: CMake 3.13+, Ninja (recommended)
- **Dependencies**: OpenSSL, Boost

### Clone and Build

```bash
# Clone the repository
git clone https://github.com/apple/foundationdb.git
cd foundationdb

# Create build directory
mkdir build && cd build

# Configure with CMake
cmake -G Ninja ..

# Build
ninja

# Run tests (optional but recommended)
ctest --output-on-failure
```

!!! note "Build Documentation"
    For detailed build instructions including platform-specific guides, see the [official build documentation](https://github.com/apple/foundationdb/blob/main/BUILDING.md){ target="_blank" }.

---

## :material-source-pull: Submitting a Pull Request

### Before You Start

1. **Check existing issues** — Someone may already be working on it
2. **Discuss large changes** — Open an issue first to gather feedback
3. **Review the codebase** — Understand existing patterns and conventions

### Pull Request Checklist

- [ ] **Tests**: Include tests for new features or bug fixes
- [ ] **Documentation**: Update relevant documentation
- [ ] **Style**: Follow the project's coding conventions
- [ ] **Commits**: Write clear, descriptive commit messages
- [ ] **Scope**: Keep changes focused and atomic
- [ ] **CI**: Ensure all continuous integration checks pass

### Code Style Guidelines

| Language | Style Guide |
|----------|-------------|
| C++ | [LLVM Coding Standards](https://llvm.org/docs/CodingStandards.html){ target="_blank" } |
| Python | [PEP 8](https://peps.python.org/pep-0008/){ target="_blank" } |
| Java | Standard Oracle conventions |
| Go | `gofmt` |

### Commit Message Format

Write clear, descriptive commit messages:

```
Short summary (50 chars or less)

More detailed explanation if necessary. Wrap at 72 characters.
Explain the problem this commit solves and why this approach
was chosen.

Fixes #123
```

---

## :material-test-tube: Testing

FoundationDB uses **simulation testing** to ensure correctness. This is one of the most rigorous testing frameworks in the database industry.

### Running Tests

```bash
# Run all tests
ctest --output-on-failure

# Run specific test suite
ctest -R <test-name-pattern>

# Run with verbose output
ctest -V
```

### Simulation Testing

FoundationDB's simulation framework (using Flow) tests millions of potential failure scenarios:

- Network partitions
- Disk failures
- Process crashes
- Clock skew
- Memory corruption

!!! info "Learn About Simulation Testing"
    Watch [Testing Distributed Systems w/ Deterministic Simulation](https://www.youtube.com/watch?v=4fFDFbi3toc){ target="_blank" } by Will Wilson for a deep dive into this approach.

---

## :material-account-group: Community Guidelines

### Code of Conduct

We're committed to providing a welcoming and inclusive environment. Please read and follow our [Code of Conduct](https://github.com/apple/foundationdb/blob/main/CODE_OF_CONDUCT.md){ target="_blank" }.

### Communication Channels

| Channel | Purpose |
|---------|---------|
| [:material-forum: Community Forums](https://forums.foundationdb.org){ target="_blank" } | Questions, discussions, announcements |
| [:fontawesome-brands-discord: Discord](https://discord.gg/foundationdb){ target="_blank" } | Real-time chat with the community |
| [:octicons-mark-github-16: GitHub Issues](https://github.com/apple/foundationdb/issues){ target="_blank" } | Bug reports and feature requests |
| [:material-stack-overflow: Stack Overflow](https://stackoverflow.com/questions/tagged/foundationdb){ target="_blank" } | Technical Q&A |

### Getting Help

- **Stuck on a contribution?** Ask in the forums or Discord
- **Need code review guidance?** Maintainers are happy to help
- **Have questions about architecture?** Check the [SIGMOD paper](https://www.foundationdb.org/files/fdb-paper.pdf){ target="_blank" }

---

## :material-star: Recognition

All contributors are valued members of our community. We recognize contributions through:

- GitHub contributor credits
- Acknowledgment in release notes for significant contributions
- Community spotlight on forums

---

## :material-tag-multiple: Documentation Versioning

We use [mike](https://github.com/jimporter/mike){ target="_blank" } with MkDocs Material to manage documentation versions. The version selector appears in the header, allowing users to switch between different FoundationDB releases.

### Version Structure

| Version | Alias | Description |
|---------|-------|-------------|
| `7.3` | `stable`, `latest` | **Current stable release** (default) |
| `7.4` | - | Pre-release version |
| `7.1` | - | Legacy version |

!!! note "Version Banners"
    - **7.4** displays a pre-release warning banner
    - **7.1** displays a legacy version warning banner
    - **7.3** is the recommended production version

### Maintainer Workflow

#### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Preview versioned docs locally
mike serve

# Build a specific version locally (for testing)
mike deploy 7.3 stable latest --title="7.3 (Stable)"
```

#### Deploying Versions

Mike commands deploy documentation versions. On this project, **deployments happen automatically via Vercel** when changes are pushed to main.

```bash
# Deploy stable version with aliases
mike deploy 7.3 stable latest --title="7.3 (Stable)"

# Deploy pre-release version
mike deploy 7.4 --title="7.4 (Pre-release)"

# Deploy legacy version
mike deploy 7.1 --title="7.1 (Legacy)"

# Set the default version
mike set-default stable
```

#### Managing Versions

```bash
# List all deployed versions
mike list

# Delete an old version (use with caution)
mike delete 6.x
```

### URL Structure

Documentation URLs follow this pattern:

| URL | Content |
|-----|---------|
| `https://docs.foundationdb.org/` | 7.3 content (stable at root) |
| `https://docs.foundationdb.org/stable/` | Alias → 7.3 |
| `https://docs.foundationdb.org/latest/` | Alias → 7.3 |
| `https://docs.foundationdb.org/7.3/` | 7.3 docs |
| `https://docs.foundationdb.org/7.4/` | 7.4 docs (pre-release) |
| `https://docs.foundationdb.org/7.1/` | 7.1 docs (legacy) |

### CI/CD Integration

Deployments are automated via Vercel:

1. Push changes to `main` branch
2. Vercel runs the build script which uses Mike to build all versions
3. Site is deployed with versioned documentation

!!! tip "Testing Changes"
    Always use `mike serve` locally to preview versioned documentation before pushing changes.

---

## :material-frequently-asked-questions: FAQ

??? question "I'm new to databases. Can I still contribute?"
    Absolutely! Start with documentation improvements, testing, or smaller bug fixes. The community is here to help you learn.

??? question "How long does PR review take?"
    Most PRs are reviewed within a few days. Complex changes may take longer. Feel free to ping maintainers if you haven't heard back in a week.

??? question "Can I contribute to documentation only?"
    Yes! Documentation is crucial for project success. Technical writing, tutorials, and examples are highly valued contributions.

??? question "Where can I find good first issues?"
    Look for issues labeled [`good first issue`](https://github.com/apple/foundationdb/labels/good%20first%20issue){ target="_blank" } or [`help wanted`](https://github.com/apple/foundationdb/labels/help%20wanted){ target="_blank" }.

---

**Ready to contribute?** Pick an issue, join the conversation, or just say hello in the forums. We're excited to have you! :rocket:

