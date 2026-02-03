---
title: Quick Start
description: Get started with FoundationDB in minutes
---

# Quick Start

Get your first FoundationDB operations running in minutes.

!!! note "Coming Soon"
    This section is being migrated from the original FoundationDB documentation.

## Prerequisites

- FoundationDB installed ([Installation Guide](installation.md))
- Python 3.8+ (for this tutorial)

## Connect to the Database

```python
import fdb

# Initialize the API
fdb.api_version(730)

# Open the database
db = fdb.open()

print("Connected to FoundationDB!")
```

## Basic Operations

```python
# Write a key-value pair
@fdb.transactional
def set_greeting(tr):
    tr[b'hello'] = b'world'

# Read a key-value pair  
@fdb.transactional
def get_greeting(tr):
    return tr[b'hello']

set_greeting(db)
print(get_greeting(db))  # b'world'
```

## Next Steps

- Learn about [First Application](first-app.md) patterns
- Explore [Core Concepts](../concepts/index.md)

