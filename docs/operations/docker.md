---
title: Docker Development Setup
description: Run FoundationDB in Docker for local development and testing
---

# Docker Development Setup

This guide covers running FoundationDB in Docker for local development and testing purposes.

!!! warning "Development Only"
    Docker is ideal for local development and testing. For production deployments, use [Kubernetes](kubernetes.md) with the fdb-kubernetes-operator, or traditional bare-metal/VM deployments with proper redundancy.

## Quick Start: Single-Node Container

The fastest way to get FoundationDB running locally:

```bash
# Pull the official image
docker pull foundationdb/foundationdb:{{ docker_tag }}

# Run a single-node cluster
docker run -d \
  --name fdb \
  -p 4500:4500 \
  foundationdb/foundationdb:{{ docker_tag }}

# Initialize the database (first time only)
docker exec fdb fdbcli --exec "configure new single ssd"

# Verify it's running
docker exec fdb fdbcli --exec "status"
```

!!! tip "Quick Test"
    ```bash
    # Write and read a key
    docker exec fdb fdbcli --exec "writemode on; set hello world; get hello"
    ```

## Docker Images

FoundationDB provides official Docker images:

| Image | Description |
|-------|-------------|
| `foundationdb/foundationdb:{{ docker_tag }}` | FoundationDB server with fdbcli |
| `foundationdb/foundationdb:{{ docker_tag }}-local` | Pre-configured for local development |
| `foundationdb/fdb-kubernetes-sidecar:{{ docker_tag }}` | Sidecar for Kubernetes deployments |

**Image tags:**

- `{{ docker_tag }}` — Specific version (recommended)
- `7.3` — Latest patch version in 7.3.x series
- `latest` — Latest stable release

## Data Persistence

By default, data is stored inside the container and lost when the container is removed. Mount a volume for persistence:

```bash
# Create a volume
docker volume create fdb-data

# Run with persistent storage
docker run -d \
  --name fdb \
  -p 4500:4500 \
  -v fdb-data:/var/fdb/data \
  foundationdb/foundationdb:{{ docker_tag }}
```

Or use a bind mount to a local directory:

```bash
mkdir -p ./fdb-data

docker run -d \
  --name fdb \
  -p 4500:4500 \
  -v $(pwd)/fdb-data:/var/fdb/data \
  foundationdb/foundationdb:{{ docker_tag }}
```

## Multi-Container Cluster with Docker Compose

For testing redundancy and distributed behavior, run a multi-node cluster:

```yaml
# docker-compose.yml
version: '3.8'

services:
  fdb-coordinator:
    image: foundationdb/foundationdb:{{ docker_tag }}
    container_name: fdb-coordinator
    hostname: fdb-coordinator
    ports:
      - "4500:4500"
    volumes:
      - fdb-coord-data:/var/fdb/data
      - ./fdb.cluster:/var/fdb/fdb.cluster
    environment:
      FDB_COORDINATOR: "fdb-coordinator:4500"
    networks:
      - fdb-network

  fdb-storage-1:
    image: foundationdb/foundationdb:{{ docker_tag }}
    container_name: fdb-storage-1
    hostname: fdb-storage-1
    volumes:
      - fdb-storage1-data:/var/fdb/data
      - ./fdb.cluster:/var/fdb/fdb.cluster
    depends_on:
      - fdb-coordinator
    networks:
      - fdb-network

  fdb-storage-2:
    image: foundationdb/foundationdb:{{ docker_tag }}
    container_name: fdb-storage-2
    hostname: fdb-storage-2
    volumes:
      - fdb-storage2-data:/var/fdb/data
      - ./fdb.cluster:/var/fdb/fdb.cluster
    depends_on:
      - fdb-coordinator
    networks:
      - fdb-network

  fdb-storage-3:
    image: foundationdb/foundationdb:{{ docker_tag }}
    container_name: fdb-storage-3
    hostname: fdb-storage-3
    volumes:
      - fdb-storage3-data:/var/fdb/data
      - ./fdb.cluster:/var/fdb/fdb.cluster
    depends_on:
      - fdb-coordinator
    networks:
      - fdb-network

networks:
  fdb-network:
    driver: bridge

volumes:
  fdb-coord-data:
  fdb-storage1-data:
  fdb-storage2-data:
  fdb-storage3-data:
```

**Create the cluster file:**

```bash
# fdb.cluster
echo "docker:docker@fdb-coordinator:4500" > fdb.cluster
```

**Start the cluster:**

```bash
docker-compose up -d

# Wait for containers to start
sleep 5

# Configure the database (first time only)
docker exec fdb-coordinator fdbcli --exec "configure new double ssd"

# Check status
docker exec fdb-coordinator fdbcli --exec "status"
```

## Connecting Applications

### From the Host Machine

Copy the cluster file from the container:

```bash
# Copy cluster file
docker cp fdb:/var/fdb/fdb.cluster ./fdb.cluster

# Set environment variable
export FDB_CLUSTER_FILE=$(pwd)/fdb.cluster
```

Then use any FDB client library:

=== "Python"
    ```python
    import fdb
    fdb.api_version(730)
    db = fdb.open()

    @fdb.transactional
    def set_greeting(tr):
        tr[b'hello'] = b'world'

    set_greeting(db)
    ```

=== "Go"
    ```go
    package main

    import "github.com/apple/foundationdb/bindings/go/src/fdb"

    func main() {
        fdb.MustAPIVersion(730)
        db := fdb.MustOpenDefault()

        db.Transact(func(tr fdb.Transaction) (interface{}, error) {
            tr.Set(fdb.Key("hello"), []byte("world"))
            return nil, nil
        })
    }
    ```

=== "Java"
    ```java
    import com.apple.foundationdb.*;

    public class App {
        public static void main(String[] args) {
            FDB fdb = FDB.selectAPIVersion(730);
            try (Database db = fdb.open()) {
                db.run(tr -> {
                    tr.set(Tuple.from("hello").pack(), Tuple.from("world").pack());
                    return null;
                });
            }
        }
    }
    ```

### From Another Container

Link your application container to the FDB network:

```yaml
# In your docker-compose.yml
services:
  my-app:
    image: my-app:latest
    volumes:
      - ./fdb.cluster:/var/fdb/fdb.cluster:ro
    environment:
      FDB_CLUSTER_FILE: /var/fdb/fdb.cluster
    networks:
      - fdb-network
    depends_on:
      - fdb-coordinator
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FDB_CLUSTER_FILE` | Path to cluster file | `/var/fdb/fdb.cluster` |
| `FDB_PORT` | Port for fdbserver | `4500` |
| `FDB_NETWORKING_MODE` | `container` or `host` | `container` |
| `FDB_COORDINATOR` | Coordinator address | (auto-detected) |
| `FDB_PROCESS_CLASS` | Process class (storage, log, stateless) | (unset) |

## Configuration Options

### Custom foundationdb.conf

Mount a custom configuration file:

```bash
docker run -d \
  --name fdb \
  -v $(pwd)/foundationdb.conf:/etc/foundationdb/foundationdb.conf:ro \
  -v fdb-data:/var/fdb/data \
  foundationdb/foundationdb:{{ docker_tag }}
```

Example `foundationdb.conf` for development:

```ini
[fdbmonitor]
user = foundationdb
group = foundationdb

[general]
cluster-file = /var/fdb/fdb.cluster
restart-delay = 10

[fdbserver]
command = /usr/bin/fdbserver
public-address = auto:$ID
listen-address = public
datadir = /var/fdb/data/$ID
logdir = /var/log/foundationdb
memory = 4GiB

[fdbserver.4500]
class = storage

[fdbserver.4501]
class = log
```

### Memory Limits

Set container memory limits to match your configuration:

```bash
docker run -d \
  --name fdb \
  --memory 8g \
  --memory-swap 8g \
  foundationdb/foundationdb:{{ docker_tag }}
```

!!! note "Memory Planning"
    Each fdbserver process needs at least 4GB RAM. If running multiple processes, increase accordingly.

## Useful Commands

| Task | Command |
|------|---------|
| Check cluster status | `docker exec fdb fdbcli --exec "status"` |
| View detailed status | `docker exec fdb fdbcli --exec "status details"` |
| Interactive fdbcli | `docker exec -it fdb fdbcli` |
| View logs | `docker logs fdb` |
| Follow logs | `docker logs -f fdb` |
| Stop cluster | `docker stop fdb` |
| Remove cluster | `docker rm -f fdb` |
| Clean restart | `docker rm -f fdb && docker volume rm fdb-data` |

## Troubleshooting

### Container Won't Start

Check logs for errors:

```bash
docker logs fdb
```

Common issues:

| Error | Cause | Solution |
|-------|-------|----------|
| `Address already in use` | Port 4500 occupied | Use `-p 4501:4500` or stop conflicting service |
| `Permission denied` | Volume mount permissions | Check host directory permissions |
| `Out of memory` | Insufficient memory | Increase container memory limits |

### Cannot Connect from Host

1. **Verify container is running:**
   ```bash
   docker ps | grep fdb
   ```

2. **Check cluster file points to correct address:**
   ```bash
   cat fdb.cluster
   # Should show: description:id@127.0.0.1:4500
   ```

3. **Test connectivity:**
   ```bash
   nc -zv localhost 4500
   ```

### Database Not Configured

If you see `The database is not yet configured`:

```bash
docker exec fdb fdbcli --exec "configure new single ssd"
```

## Limitations

Docker deployments have limitations compared to production setups:

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| Single host | No real fault tolerance | Use for development only |
| Shared resources | Unpredictable performance | Set resource limits |
| Network isolation | Client connectivity complexity | Use bridge networking |
| No automatic recovery | Manual intervention needed | Use Kubernetes for HA |

## Next Steps

- For production deployments, see [Kubernetes Deployment](kubernetes.md)
- Learn about [Configuration](configuration.md) options
- Set up [Monitoring](monitoring.md) for your development cluster

