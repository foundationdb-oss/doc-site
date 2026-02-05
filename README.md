<p align="center">
  <a href="https://www.foundationdb.org/">
    <img src="docs/assets/images/foundationdb-logo.png" alt="FoundationDB" width="400">
  </a>
</p>

<p align="center">
  <strong>Modern, comprehensive documentation for FoundationDB</strong><br>
  The open-source, distributed, transactional key-value store
</p>

<p align="center">
  <a href="https://doc-site-foundationdb-oss.vercel.app/">Live Site</a> •
  <a href="https://www.foundationdb.org/">Website</a> •
  <a href="https://github.com/apple/foundationdb">GitHub</a> •
  <a href="https://forums.foundationdb.org/">Forums</a>
</p>

<p align="center">
  <a href="https://vercel.com/new/clone?repository-url=https://github.com/foundationdb-oss/doc-site">
    <img src="https://vercel.com/button" alt="Deploy with Vercel">
  </a>
</p>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📚 **Comprehensive Content** | Getting started, core concepts, API references, operations, and deep dives |
| 🎨 **Modern Design** | Clean UI with dark/light mode, inspired by MkDocs Material |
| 🔍 **Fast Search** | Full-text search with suggestions and highlighting |
| 📱 **Mobile Responsive** | Works great on all devices |
| ✏️ **Easy Contributions** | "Edit on GitHub" links on every page |
| 📊 **Interactive Diagrams** | Mermaid diagrams for architecture visualization |
| 🔢 **Multi-Version Support** | Documentation versioning with [mike](https://github.com/jimporter/mike) |
| 📈 **Analytics** | GA4 integration with feedback tracking |

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/foundationdb-oss/doc-site.git
cd doc-site

# Install dependencies
pip install -r requirements.txt

# Start the development server
mkdocs serve
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000) in your browser.

## 📁 Project Structure

```
docs/
├── index.md              # Landing page with hero section
├── getting-started/      # Installation, quickstart, first app, tutorials
├── concepts/             # Data model, transactions, architecture, ACID, layers
├── api/                  # Python, Java, Go, C API references
├── operations/           # Configuration, monitoring, backup, troubleshooting
├── guides/               # Design recipes, best practices, internals
├── community/            # Resources, contributing guide
└── assets/               # Custom CSS, JS, images, logos
```

## 🤝 Contributing

We welcome contributions\! Here's how you can help:

### Quick Edits

Every page has an **"Edit on GitHub"** link in the top right. Click it to propose changes directly.

### Larger Contributions

1. Fork the repository
2. Create a branch: `git checkout -b feature/my-improvement`
3. Make changes and test locally: `mkdocs serve`
4. Commit with a descriptive message
5. Push and open a Pull Request

### Content Guidelines

- Write in clear, concise language
- Use code examples liberally
- Include Mermaid diagrams for complex concepts
- Test all code snippets
- Run `mkdocs build --strict` to check for broken links

## 🚢 Deployment

### Vercel (Recommended)

Click the **"Deploy with Vercel"** button above, or:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Manual

```bash
mkdocs build
# Deploy the site/ directory to any static hosting provider
```

## 📚 Documentation Versioning

We use [mike](https://github.com/jimporter/mike) for multi-version documentation. This allows users to switch between different FoundationDB releases.

> **Note:** We use `--alias-type=redirect` for all mike deploy commands to ensure compatibility with Vercel. Mike's default symlink-based aliases don't work on Vercel's static hosting.

### Current Versions

| Version | Alias | Description |
|---------|-------|-------------|
| `7.3` | `stable`, `latest` | **Current stable release** (default) |
| `7.4` | - | Pre-release version |
| `7.1` | - | Legacy version |

### Local Development

#### Prerequisites

- Python 3.8+
- pip (or uv for faster installs)
- Git

```bash
pip install -r requirements.txt
```

#### Quick Preview (Single Version)

For most development work, use MkDocs directly:

```bash
mkdocs serve
```

This serves the docs at `http://localhost:8000` with live reload, using the default 7.3 configuration.

**Testing a specific version:** Set the `FDB_VERSION` environment variable to control which version's variables are used:

```bash
FDB_VERSION=7.1 mkdocs serve  # Test with 7.1 variables
FDB_VERSION=7.3 mkdocs serve  # Test with 7.3 variables (default)
FDB_VERSION=7.4 mkdocs serve  # Test with 7.4 variables
```

#### Local Testing with Version Picker

To test the version picker locally with all versions, use the provided script:

```bash
./scripts/mike-serve.sh
```

This script:
- Builds all versions (7.1, 7.3, 7.4) with the correct configuration
- Uses a **temporary branch** (`mike-local-temp`) instead of `gh-pages`
- Sets up proper version aliases (stable, latest → 7.3)
- **Automatically cleans up** when you press Ctrl+C
- Serves the multi-version site at http://localhost:8000

> ⚠️ **Warning: Do NOT run `mike deploy` directly**
>
> Running `mike deploy` without the `-b` flag creates **permanent commits** on your `gh-pages` branch. These commits will:
> - Pollute your git history
> - Show up when you run `git log --all`
> - Potentially get pushed to the remote if you're not careful
>
> Always use `./scripts/mike-serve.sh` for local testing. It handles the temporary branch automatically.

#### Manual Mike Commands (CI/Production Only)

The commands below are for reference and are primarily used in CI/CD pipelines. For local development, use the script above.

```bash
# Build all versions with mike (note: creates commits on gh-pages!)
FDB_VERSION=7.1 mike deploy 7.1 --title="7.1 (Legacy)"
FDB_VERSION=7.3 mike deploy 7.3 stable latest --title="7.3 (Stable)"
FDB_VERSION=7.4 mike deploy 7.4 --title="7.4 (Pre-release)"

# Set the default version
mike set-default stable

# Serve with version picker (from gh-pages)
mike serve

# List all deployed versions
mike list
```

Note: Mike requires a git repository and stores versions on the `gh-pages` branch.

#### How the Version System Works

The `main_hooks.py` file defines version-specific variables for each FoundationDB release:

| Variable | 7.1 | 7.3 | 7.4 |
|----------|-----|-----|-----|
| `{{ api_version }}` | 710 | 730 | 740 |
| `{{ fdb_release }}` | 7.1.67 | 7.3.71 | 7.4.6 |
| `{{ docker_tag }}` | 7.1.67 | 7.3.71 | 7.4.6 |

Template variables are rendered based on the `FDB_VERSION` environment variable set during build. For example:

```python
# This code in docs:
fdb.api_version({{ api_version }})

# Renders as (depending on version):
fdb.api_version(710)  # 7.1
fdb.api_version(730)  # 7.3
fdb.api_version(740)  # 7.4
```

Version conditionals control content visibility:

```jinja
{{ if_version("7.3", "This feature is available!", "Upgrade to 7.3 for this feature.") }}
```

See `docs_versions/README.md` for the full list of available variables.

#### Verifying Version-Specific Content

When testing locally, verify:

- **API versions** are correct (710, 730, 740) in code samples
- **Version pills** appear on the correct pages (e.g., `{{ version_pill("7.3", "new") }}`)
- **Version conditionals** show/hide content properly for each version
- **Docker tags and release numbers** match the expected version

#### ⚠️ Warning: Do NOT Run the Vercel Build Script Locally

**Never run `scripts/vercel-build.sh` on your local machine.** This script:
- Deletes the `.git` directory (`rm -rf .git`)
- Initializes a fresh git repo
- Is designed for Vercel's ephemeral build environment only

Running it locally will destroy your git history and uncommitted changes.

### Version Deployment Workflow

> **Note:** Production deployments happen automatically via Vercel when changes are pushed to main. The commands below are for manual deployments or local testing.

```bash
# Deploy stable version with aliases
mike deploy 7.3 stable latest --title="7.3 (Stable)" --push

# Deploy pre-release version
mike deploy 7.4 --title="7.4 (Pre-release)" --push

# Deploy legacy version
mike deploy 7.1 --title="7.1 (Legacy)" --push

# Set the default version
mike set-default stable --push

# Delete an old version (use with caution)
mike delete 6.x --push
```

### URL Structure

| URL | Content |
|-----|---------|
| `/` | 7.3 content (stable at root) |
| `/stable/` | Alias → 7.3 |
| `/latest/` | Alias → 7.3 |
| `/7.3/` | 7.3 docs |
| `/7.4/` | 7.4 docs (pre-release) |
| `/7.1/` | 7.1 docs (legacy) |

### CI/CD Build Process

The Vercel build script (`scripts/vercel-build.sh`) handles versioned deployments:

1. Initializes a git repository (required by mike)
2. Deploys each version with appropriate aliases
3. Sets the default version to `stable`
4. Extracts the built site from the `gh-pages` branch
5. Copies stable version content to root for backward compatibility

## 🛠 Tech Stack

- **[MkDocs](https://www.mkdocs.org/)** — Static site generator
- **[Material for MkDocs](https://squidfunk.github.io/mkdocs-material/)** — Theme and components
- **[Mermaid](https://mermaid.js.org/)** — Diagrams and flowcharts
- **[Vercel](https://vercel.com/)** — Hosting and deployment

## 📄 License

This documentation is licensed under [Apache 2.0](LICENSE), the same license as FoundationDB.

---

<p align="center">
  Content sourced from the <a href="https://github.com/foundationdb-oss/documentation-snapshot">FoundationDB documentation archive</a><br>
  Built with ❤️ by the FoundationDB community
</p>
