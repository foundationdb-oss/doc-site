---
title: Building from Source
description: How to build FoundationDB from source code on Linux, macOS, and Windows
---

# Building from Source

This guide covers building FoundationDB from source code. Whether you're contributing code or exploring internals, building from source gives you full control.

!!! tip "Just Want to Use FoundationDB?"
    If you just want to run FoundationDB, use the [pre-built packages](../getting-started/installation.md) instead.

---

## :material-clipboard-check: Prerequisites

### All Platforms

| Tool | Version | Notes |
|------|---------|-------|
| **CMake** | 3.13+ | Build system generator |
| **Ninja** | Latest | Recommended build tool (faster than Make) |
| **Clang** | 11+ | Preferred compiler |
| **GCC** | 10+ | Alternative to Clang |
| **Python** | 3.7+ | Required for build scripts |

### Linux (Ubuntu/Debian)

```bash
# Install build dependencies
sudo apt-get update
sudo apt-get install -y \
    build-essential \
    cmake \
    ninja-build \
    clang \
    libboost-dev \
    libssl-dev \
    liblz4-dev \
    python3 \
    python3-pip

# For Java bindings (optional)
sudo apt-get install -y openjdk-11-jdk

# For Go bindings (optional)
sudo apt-get install -y golang

# For Mono/.NET bindings (optional)
sudo apt-get install -y mono-devel
```

### Linux (RHEL/CentOS/Fedora)

```bash
# Fedora
sudo dnf install -y \
    cmake \
    ninja-build \
    clang \
    boost-devel \
    openssl-devel \
    lz4-devel \
    python3 \
    python3-pip

# For Java bindings
sudo dnf install -y java-11-openjdk-devel
```

### macOS

```bash
# Install Homebrew if not present
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install dependencies
brew install cmake ninja boost openssl lz4 python

# For Java bindings
brew install openjdk@11

# For Mono/.NET bindings
brew install mono
```

!!! note "Xcode Command Line Tools"
    Ensure Xcode Command Line Tools are installed: `xcode-select --install`

### Windows

Building on Windows requires:

- Visual Studio 2019 or 2022 with C++ workload
- CMake 3.13+ (included with Visual Studio or standalone)
- Python 3.7+
- Boost (install via vcpkg or manually)

```powershell
# Using vcpkg for dependencies
vcpkg install boost:x64-windows openssl:x64-windows
```

---

## :material-rocket-launch: Building

### Basic Build

```bash
# Clone the repository
git clone https://github.com/apple/foundationdb.git
cd foundationdb

# Create build directory
mkdir build && cd build

# Configure (Linux/macOS)
cmake -G Ninja \
    -DCMAKE_BUILD_TYPE=Release \
    ..

# Build
ninja

# The binaries will be in ./bin/
ls bin/
```

### CMake Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `CMAKE_BUILD_TYPE` | `Debug` | `Debug`, `Release`, `RelWithDebInfo` |
| `WITH_PYTHON` | `ON` | Build Python bindings |
| `WITH_JAVA` | `OFF` | Build Java bindings |
| `WITH_GO` | `OFF` | Build Go bindings |
| `WITH_C_BINDING` | `ON` | Build C binding |
| `BUILD_DOCUMENTATION` | `OFF` | Build Sphinx documentation |
| `BUILD_TESTING` | `ON` | Build tests |
| `USE_CCACHE` | `OFF` | Use ccache for faster rebuilds |

```bash
# Example: Build with Java and Go bindings
cmake -G Ninja \
    -DCMAKE_BUILD_TYPE=Release \
    -DWITH_JAVA=ON \
    -DWITH_GO=ON \
    ..
```

### Building Specific Components

```bash
# Build only fdbserver
ninja fdbserver

# Build only fdbcli
ninja fdbcli

# Build only client library
ninja fdb_c

# Build Python bindings
ninja fdb_python

# Build all bindings
ninja bindings
```

---

## :material-folder-multiple: Source Code Structure

Understanding the repository layout helps navigate the codebase:

| Directory | Description |
|-----------|-------------|
| [:material-github: `fdbserver/`](https://github.com/apple/foundationdb/tree/main/fdbserver){ target="_blank" } | Server processes (storage, TLog, proxy, resolver, etc.) |
| [:material-github: `fdbclient/`](https://github.com/apple/foundationdb/tree/main/fdbclient){ target="_blank" } | Client library (transactions, database connections) |
| [:material-github: `flow/`](https://github.com/apple/foundationdb/tree/main/flow){ target="_blank" } | Flow runtime and actor framework |
| [:material-github: `fdbrpc/`](https://github.com/apple/foundationdb/tree/main/fdbrpc){ target="_blank" } | RPC layer and networking |
| [:material-github: `fdbmonitor/`](https://github.com/apple/foundationdb/tree/main/fdbmonitor){ target="_blank" } | Process monitor (manages server processes) |
| [:material-github: `fdbcli/`](https://github.com/apple/foundationdb/tree/main/fdbcli){ target="_blank" } | Command-line interface |
| [:material-github: `bindings/`](https://github.com/apple/foundationdb/tree/main/bindings){ target="_blank" } | Language bindings (Python, Java, Go, C) |
| [:material-github: `fdbbackup/`](https://github.com/apple/foundationdb/tree/main/fdbbackup){ target="_blank" } | Backup and restore tools |
| [:material-github: `metacluster/`](https://github.com/apple/foundationdb/tree/main/metacluster){ target="_blank" } | Multi-cluster management |

---

## :material-language-cpp: Flow Language Primer

FoundationDB is written in **Flow**, a custom C++ dialect that enables deterministic simulation testing. Flow code lives in `.actor.cpp` and `.actor.h` files that are transpiled to standard C++ during build.

### Key Concepts

```cpp
// Flow actor - an asynchronous function
ACTOR Future<Void> myActor(Database db) {
    state Transaction tr(db);  // 'state' variables persist across waits

    loop {
        try {
            Optional<Value> val = wait(tr.get("mykey"_sr));  // Explicit yield point
            if (val.present()) {
                return Void();
            }
            wait(delay(1.0));  // Simulate time passing
        } catch (Error& e) {
            wait(tr.onError(e));  // Handle errors, retry transaction
        }
    }
}
```

| Concept | Description |
|---------|-------------|
| `ACTOR` | Declares an asynchronous function that can be paused/resumed |
| `Future<T>` | Represents an asynchronous result (like a promise) |
| `wait(Future<T>)` | Suspends the actor until the future is ready |
| `state` | Variables that persist across `wait` points |
| `loop { }` | Infinite loop (common pattern in actors) |

!!! info "Learn More About Flow"
    - [:octicons-arrow-right-24: Internals Overview](../guides/internals-overview.md#the-flow-language) — Flow language basics
    - [:octicons-arrow-right-24: Simulation Testing](../guides/simulation-testing.md) — How Flow enables deterministic testing

### Why Flow?

Flow enables **deterministic simulation** - the same inputs always produce the same outputs, even with concurrency. This lets FoundationDB test millions of failure scenarios that would be impossible to reproduce in real distributed systems.

---

## :material-test-tube: Running Simulation Tests

FoundationDB's legendary simulation testing framework tests the entire codebase against millions of failure scenarios.

### Running Tests

```bash
# Build with testing enabled (default)
cmake -G Ninja -DBUILD_TESTING=ON ..
ninja

# Run all tests
ctest --output-on-failure

# Run specific test suite
ctest -R <test-name-pattern>

# Run with verbose output
ctest -V

# Run simulation tests directly
./bin/fdbserver -r simulation -f <test-file>
```

### Test Files

Simulation tests are defined in `.toml` files in the `tests/` directory:

```bash
# List available test files
ls tests/

# Run a specific test
./bin/fdbserver -r simulation -f tests/fast/AtomicOps.toml
```

!!! tip "Simulation Seeds"
    When a test fails, note the seed number for reproducibility:
    ```bash
    ./bin/fdbserver -r simulation -f tests/fast/AtomicOps.toml -s <seed>
    ```

---

## :material-microsoft-visual-studio-code: IDE Setup

### VS Code with CMake

1. Install extensions:
    - CMake Tools
    - C/C++ (Microsoft)
    - clangd (recommended over Microsoft IntelliSense)

2. Configure workspace settings (`.vscode/settings.json`):
```json
{
    "cmake.buildDirectory": "${workspaceFolder}/build",
    "cmake.generator": "Ninja",
    "cmake.configureSettings": {
        "CMAKE_BUILD_TYPE": "Debug"
    },
    "clangd.arguments": [
        "--compile-commands-dir=${workspaceFolder}/build"
    ]
}
```

### CLion

1. Open the project (CLion auto-detects CMake)
2. Configure CMake profile:
    - **Generator**: Ninja
    - **Build type**: Debug or RelWithDebInfo
    - **CMake options**: `-DCMAKE_BUILD_TYPE=Debug`

!!! tip "Compile Commands"
    Generate `compile_commands.json` for better IDE support:
    ```bash
    cmake -G Ninja -DCMAKE_EXPORT_COMPILE_COMMANDS=ON ..
    ```

---

## :material-alert-circle: Common Issues

### Build Errors

??? question "Boost not found"
    ```bash
    # Linux
    sudo apt-get install libboost-dev

    # macOS
    brew install boost

    # Or specify path manually
    cmake -DBOOST_ROOT=/path/to/boost ..
    ```

??? question "OpenSSL not found on macOS"
    ```bash
    # Install via Homebrew
    brew install openssl

    # Point CMake to it
    cmake -DOPENSSL_ROOT_DIR=$(brew --prefix openssl) ..
    ```

??? question "Actor compiler errors"
    Flow's actor compiler runs during build. If you see errors about `.actor.cpp` files:

    1. Ensure you have a clean build directory
    2. Delete CMake cache: `rm -rf build/CMakeCache.txt`
    3. Reconfigure and rebuild

??? question "Out of memory during linking"
    FoundationDB can require significant RAM to link. Try:

    - Use `lld` linker: `cmake -DCMAKE_EXE_LINKER_FLAGS="-fuse-ld=lld" ..`
    - Reduce parallelism: `ninja -j 2`

### Runtime Issues

??? question "Cluster file not found"
    Create a cluster file at `/etc/foundationdb/fdb.cluster`:
    ```bash
    sudo mkdir -p /etc/foundationdb
    echo "docker:docker@127.0.0.1:4500" | sudo tee /etc/foundationdb/fdb.cluster
    ```

??? question "Permission denied on data directory"
    Ensure the data directory exists and is writable:
    ```bash
    sudo mkdir -p /var/lib/foundationdb/data
    sudo chown -R $(whoami) /var/lib/foundationdb
    ```

---

## :material-link-variant: Additional Resources

- [:material-github: Official BUILDING.md](https://github.com/apple/foundationdb/blob/main/BUILDING.md){ target="_blank" } — Canonical build instructions
- [:octicons-arrow-right-24: Contributing Guide](contributing.md) — Code style, PR process
- [:octicons-arrow-right-24: Internals Overview](../guides/internals-overview.md) — Architecture deep dive


