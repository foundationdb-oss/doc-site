---
title: Installation
description: Install FoundationDB on your system
---

# Installation

Get FoundationDB up and running on your system.

!!! note "Coming Soon"
    This section is being migrated from the original FoundationDB documentation. Check back soon for complete installation guides for all supported platforms.

## Platforms

- **Linux** (Ubuntu, RHEL, CentOS)
- **macOS**
- **Windows** (client libraries only)

## Quick Install

=== "Ubuntu/Debian"

    ```bash
    # Download and install
    wget https://github.com/apple/foundationdb/releases/download/7.3.27/foundationdb-clients_7.3.27-1_amd64.deb
    wget https://github.com/apple/foundationdb/releases/download/7.3.27/foundationdb-server_7.3.27-1_amd64.deb
    sudo dpkg -i foundationdb-clients_7.3.27-1_amd64.deb foundationdb-server_7.3.27-1_amd64.deb
    ```

=== "RHEL/CentOS"

    ```bash
    # Download and install
    wget https://github.com/apple/foundationdb/releases/download/7.3.27/foundationdb-clients-7.3.27-1.el7.x86_64.rpm
    wget https://github.com/apple/foundationdb/releases/download/7.3.27/foundationdb-server-7.3.27-1.el7.x86_64.rpm
    sudo rpm -Uvh foundationdb-clients-7.3.27-1.el7.x86_64.rpm foundationdb-server-7.3.27-1.el7.x86_64.rpm
    ```

=== "macOS"

    ```bash
    # Using Homebrew
    brew install foundationdb
    ```

## Next Steps

After installation, proceed to the [Quick Start](quickstart.md) guide.

