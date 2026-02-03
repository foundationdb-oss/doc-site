---
title: Contributing
description: How to contribute to FoundationDB
---

# Contributing

Welcome! We're excited you want to contribute to FoundationDB.

!!! note "Coming Soon"
    This section is being migrated from the original FoundationDB documentation.

## Ways to Contribute

### :material-bug: Report Issues

Found a bug? Open an issue on GitHub:

[:octicons-arrow-right-24: Report an Issue](https://github.com/apple/foundationdb/issues/new){ .md-button }

### :material-source-pull: Submit Code

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

### :material-file-document: Improve Documentation

Documentation improvements are always welcome:

[:octicons-arrow-right-24: Edit on GitHub](https://github.com/foundation-oss/doc-site){ .md-button }

## Development Setup

```bash
# Clone the repository
git clone https://github.com/apple/foundationdb.git
cd foundationdb

# Build (requires CMake and Clang)
mkdir build && cd build
cmake ..
make
```

## Code Style

- C++ follows LLVM coding style
- Python follows PEP 8
- Commit messages should be descriptive

## Pull Request Guidelines

- [ ] Include tests for new features
- [ ] Update documentation as needed
- [ ] Follow existing code patterns
- [ ] Keep changes focused and atomic

## Community Guidelines

Please review our [Code of Conduct](https://github.com/apple/foundationdb/blob/main/CODE_OF_CONDUCT.md) before contributing.

