# Version-Specific Documentation

This directory structure is reserved for version-specific content overrides.

## How the Version System Works

1. **mkdocs-macros-plugin** provides version-specific variables via `main_hooks.py`
2. **FDB_VERSION** environment variable controls which configuration is used
3. **Build script** sets FDB_VERSION before each `mike deploy`

## Available Variables

Use Jinja2 syntax in markdown files to access version-specific values:

| Variable | Description | Example Values |
|----------|-------------|----------------|
| `{{ fdb_version }}` | Major.minor version | `7.1`, `7.3`, `7.4` |
| `{{ fdb_release }}` | Full release version | `7.1.67`, `7.3.71`, `7.4.6` |
| `{{ api_version }}` | API version number | `710`, `730`, `740` |
| `{{ docker_tag }}` | Docker image tag | `7.1.67`, `7.3.71`, `7.4.6` |
| `{{ docker_image }}` | Full Docker image | `foundationdb/foundationdb:7.3.71` |
| `{{ java_version }}` | Java artifact version | `7.1.67`, `7.3.71`, `7.4.6` |
| `{{ package_version }}` | Package version | `7.1.67`, `7.3.71`, `7.4.6` |
| `{{ redwood_engine }}` | Redwood storage name | `ssd-redwood-1-experimental` (7.1) or `ssd-redwood-1` (7.3+) |
| `{{ version_label }}` | Human-readable label | `Legacy`, `Stable`, `Pre-release` |
| `{{ is_stable }}` | Boolean | `True` (7.3), `False` (others) |
| `{{ is_latest }}` | Boolean | `True` (7.3), `False` (others) |

## Usage Examples

### In Code Samples
```markdown
```python
import fdb
fdb.api_version({{ api_version }})
```
```

### In Installation Instructions
```markdown
docker pull {{ docker_image }}
```

### Conditional Content
```markdown
{{ if_version("7.3", "This feature is available!", "Upgrade to 7.3 for this feature.") }}
```

## Future: Version-Specific Overrides

If entire pages need to differ by version, add them here:

```
docs_versions/
├── 7.1/
│   └── getting-started/
│       └── special-71-page.md
├── 7.3/
│   └── getting-started/
│       └── special-73-page.md
└── 7.4/
    └── getting-started/
        └── special-74-page.md
```

The build script can then copy these files before each `mike deploy`.

