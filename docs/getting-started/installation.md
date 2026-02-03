---
title: Installation
description: Install FoundationDB on Linux, macOS, Docker, or Kubernetes
---

# Installation

Get FoundationDB running on your development machine or production cluster.

## System Requirements

Before installing, ensure your system meets these requirements:

| Requirement | Minimum |
|------------|---------|
| Architecture | x86-64 (amd64) or arm64 |
| RAM | 4 GB per FoundationDB process |
| Disk | SSD recommended for production |
| Network | Low-latency connectivity for clusters |

## Quick Install

=== "Ubuntu/Debian"

    Download and install the client and server packages:

    ```bash
    # Set version (check https://github.com/apple/foundationdb/releases for latest)
    FDB_VERSION="7.3.63"

    # Download packages
    wget https://github.com/apple/foundationdb/releases/download/${FDB_VERSION}/foundationdb-clients_${FDB_VERSION}-1_amd64.deb
    wget https://github.com/apple/foundationdb/releases/download/${FDB_VERSION}/foundationdb-server_${FDB_VERSION}-1_amd64.deb

    # Install (server depends on clients)
    sudo dpkg -i foundationdb-clients_${FDB_VERSION}-1_amd64.deb \
                 foundationdb-server_${FDB_VERSION}-1_amd64.deb
    ```

    !!! warning "Version Matching"
        The client and server packages must have the same version. Always install both together.

=== "RHEL/CentOS"

    Download and install the RPM packages:

    ```bash
    # Set version
    FDB_VERSION="7.3.63"

    # Download packages
    wget https://github.com/apple/foundationdb/releases/download/${FDB_VERSION}/foundationdb-clients-${FDB_VERSION}-1.el7.x86_64.rpm
    wget https://github.com/apple/foundationdb/releases/download/${FDB_VERSION}/foundationdb-server-${FDB_VERSION}-1.el7.x86_64.rpm

    # Install
    sudo rpm -Uvh foundationdb-clients-${FDB_VERSION}-1.el7.x86_64.rpm \
                  foundationdb-server-${FDB_VERSION}-1.el7.x86_64.rpm
    ```

=== "macOS"

    Download the installer package from the [releases page](https://github.com/apple/foundationdb/releases):

    ```bash
    # Download the package (check for latest version)
    # For Intel Macs:
    curl -LO https://github.com/apple/foundationdb/releases/download/7.3.63/FoundationDB-7.3.63_x86_64.pkg

    # For Apple Silicon (M1/M2/M3):
    curl -LO https://github.com/apple/foundationdb/releases/download/7.3.63/FoundationDB-7.3.63_arm64.pkg

    # Install (opens GUI installer)
    open FoundationDB-7.3.63_*.pkg
    ```

    The installer includes both client libraries and a local development server.

    !!! note "macOS is for Development Only"
        The macOS version is designed for local development. Use Linux for production deployments.

=== "Docker"

    Run FoundationDB in a container for quick testing:

    ```bash
    # Pull the official image
    docker pull foundationdb/foundationdb:7.3.63

    # Run a single-node cluster
    docker run -d --name fdb \
      -p 4500:4500 \
      foundationdb/foundationdb:7.3.63

    # Verify it's running
    docker exec fdb fdbcli --exec "status"
    ```

    For persistent data, mount a volume:

    ```bash
    docker run -d --name fdb \
      -p 4500:4500 \
      -v fdb-data:/var/fdb/data \
      foundationdb/foundationdb:7.3.63
    ```

=== "Kubernetes"

    Use the official FoundationDB Kubernetes Operator for production deployments:

    ```bash
    # Install the operator CRDs and deployment
    kubectl apply -f https://raw.githubusercontent.com/FoundationDB/fdb-kubernetes-operator/main/config/crd/bases/apps.foundationdb.org_foundationdbclusters.yaml
    kubectl apply -f https://raw.githubusercontent.com/FoundationDB/fdb-kubernetes-operator/main/config/crd/bases/apps.foundationdb.org_foundationdbbackups.yaml
    kubectl apply -f https://raw.githubusercontent.com/FoundationDB/fdb-kubernetes-operator/main/config/crd/bases/apps.foundationdb.org_foundationdbrestores.yaml
    kubectl apply -f https://raw.githubusercontent.com/foundationdb/fdb-kubernetes-operator/main/config/samples/deployment.yaml

    # Create a sample cluster
    kubectl apply -f https://raw.githubusercontent.com/foundationdb/fdb-kubernetes-operator/main/config/samples/cluster.yaml

    # Check cluster status
    kubectl get foundationdbcluster
    ```

    See the [Kubernetes Operator documentation](https://github.com/FoundationDB/fdb-kubernetes-operator) for advanced configuration.

## Verify Installation

After installation, verify FoundationDB is running:

```bash
fdbcli --exec "status"
```

You should see output like:

```
Using cluster file `/etc/foundationdb/fdb.cluster'.

Configuration:
  Redundancy mode        - single
  Storage engine         - memory
  Coordinators           - 1

Cluster:
  FoundationDB processes - 1
  Machines               - 1
  Memory availability    - 4.1 GB per process on machine with least available

Data:
  Replication health     - Healthy
  Moving data            - 0.000 GB
  Sum of key-value sizes - 0 MB
```

!!! tip "Troubleshooting"
    If `fdbcli` can't connect, check that the FoundationDB service is running:

    ```bash
    # Linux
    sudo systemctl status foundationdb

    # macOS
    launchctl list | grep fdb
    ```

## Install Client Libraries

FoundationDB provides client libraries for multiple languages:

=== "Python"

    ```bash
    pip install foundationdb
    ```

=== "Java"

    Add to your `pom.xml`:

    ```xml
    <dependency>
        <groupId>org.foundationdb</groupId>
        <artifactId>fdb-java</artifactId>
        <version>7.3.63</version>
    </dependency>
    ```

    Or with Gradle:

    ```groovy
    implementation 'org.foundationdb:fdb-java:7.3.63'
    ```

=== "Go"

    ```bash
    go get github.com/apple/foundationdb/bindings/go/src/fdb
    ```

=== "Ruby"

    ```bash
    gem install fdb
    ```

=== "C"

    C bindings are included with the FoundationDB client packages. Headers are installed to `/usr/include/foundationdb/`.

## Default Configuration

After installation, FoundationDB runs with these defaults:

| Setting | Default Value | Notes |
|---------|--------------|-------|
| Redundancy mode | `single` | No replication (development only) |
| Storage engine | `memory` | Data must fit in RAM |
| Bind address | `127.0.0.1` | Localhost only |
| Data directory | `/var/fdb/data` | Linux default |
| Cluster file | `/etc/foundationdb/fdb.cluster` | Linux default |

!!! warning "Development Configuration"
    The default configuration is for local development only. For production, configure proper redundancy and use the SSD storage engine. See [Configuration](../operations/configuration.md).

## Managing the Service

=== "Linux (systemd)"

    ```bash
    # Start
    sudo systemctl start foundationdb

    # Stop
    sudo systemctl stop foundationdb

    # Restart
    sudo systemctl restart foundationdb

    # Enable on boot
    sudo systemctl enable foundationdb

    # View logs
    sudo journalctl -u foundationdb -f
    ```

=== "macOS"

    ```bash
    # Start
    sudo launchctl load /Library/LaunchDaemons/com.foundationdb.fdbmonitor.plist

    # Stop
    sudo launchctl unload /Library/LaunchDaemons/com.foundationdb.fdbmonitor.plist

    # View logs
    tail -f /usr/local/foundationdb/logs/fdbmonitor.log
    ```

## Uninstalling

=== "Ubuntu/Debian"

    ```bash
    sudo dpkg -r foundationdb-server foundationdb-clients
    sudo rm -rf /var/fdb /etc/foundationdb
    ```

=== "RHEL/CentOS"

    ```bash
    sudo rpm -e foundationdb-server foundationdb-clients
    sudo rm -rf /var/fdb /etc/foundationdb
    ```

=== "macOS"

    ```bash
    sudo /usr/local/foundationdb/uninstall-FoundationDB.sh
    ```

## Next Steps

- [Quick Start](quickstart.md) — Connect and run your first transaction
- [First Application](first-app.md) — Build a complete application
- [Core Concepts](../concepts/index.md) — Understand how FoundationDB works

