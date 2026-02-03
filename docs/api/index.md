---
title: API Reference
description: FoundationDB client library reference
---

# API Reference

Complete reference for FoundationDB client libraries.

<div class="grid cards" markdown>

-   :fontawesome-brands-python:{ .lg .middle } **Python**

    ---

    Pythonic API with decorators and context managers.

    [:octicons-arrow-right-24: Python API](python.md)

-   :fontawesome-brands-java:{ .lg .middle } **Java**

    ---

    Java client with CompletableFuture async support.

    [:octicons-arrow-right-24: Java API](java.md)

-   :fontawesome-brands-golang:{ .lg .middle } **Go**

    ---

    Idiomatic Go bindings with error handling.

    [:octicons-arrow-right-24: Go API](go.md)

-   :material-language-c:{ .lg .middle } **C**

    ---

    Low-level C API for maximum control.

    [:octicons-arrow-right-24: C API](c.md)

</div>

## API Versioning

All clients must specify an API version at startup:

=== "Python"

    ```python
    import fdb
    fdb.api_version(730)  # Use 7.3 API
    ```

=== "Java"

    ```java
    FDB fdb = FDB.selectAPIVersion(730);
    ```

=== "Go"

    ```go
    fdb.MustAPIVersion(730)
    ```

=== "C"

    ```c
    fdb_select_api_version(730);
    ```

This ensures forward compatibility as the API evolves.

## Common Concepts

All language bindings share these core concepts:

| Concept | Description |
|---------|-------------|
| **Database** | Connection to the FDB cluster |
| **Transaction** | Unit of work with ACID guarantees |
| **Keys/Values** | Byte strings (arbitrary data) |
| **Futures** | Async operation handles |
| **Tuple Layer** | Structured key encoding |

## Additional Bindings

Community-maintained bindings are available for:

- Ruby
- Rust
- Node.js
- .NET

See [Community Resources](../community/resources.md) for links.

