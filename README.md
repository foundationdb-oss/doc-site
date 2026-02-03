# FoundationDB Documentation

[\![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/foundation-oss/doc-site)

Modern, comprehensive documentation for [FoundationDB](https://www.foundationdb.org/) — the open-source, distributed, transactional key-value store.

**🌐 Live Site:** [docs.foundationdb.org](https://docs.foundationdb.org) (coming soon)

## Features

- 📚 **Comprehensive Content** — Getting started guides, core concepts, API references, operations guides, and deep dives
- 🎨 **Modern Design** — Clean, accessible UI with dark/light mode toggle
- 🔍 **Fast Search** — Full-text search with suggestions and highlighting
- 📱 **Mobile Responsive** — Works great on all devices
- ✏️ **Easy Contributions** — "Edit on GitHub" links on every page
- 📊 **Interactive Diagrams** — Mermaid diagrams for architecture visualization
- 🔢 **Multi-Version Support** — Documentation versioning with [mike](https://github.com/jimporter/mike)

## Quick Start

### Prerequisites

- Python 3.8+
- pip

### Local Development

```bash
# Clone the repository
git clone https://github.com/foundation-oss/doc-site.git
cd doc-site

# Install dependencies
pip install -r requirements.txt

# Start the development server
mkdocs serve
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000) in your browser.

### Build for Production

```bash
mkdocs build
```

The static site will be generated in the `site/` directory.

## Project Structure

```
.
├── docs/                    # Documentation source files
│   ├── index.md            # Landing page
│   ├── getting-started/    # Installation, quickstart, first app
│   ├── concepts/           # Core concepts (data model, transactions, ACID)
│   ├── api/                # API reference (Python, Java, Go, C)
│   ├── operations/         # Configuration, monitoring, backup, troubleshooting
│   ├── guides/             # Design recipes, best practices, internals
│   ├── community/          # Resources, contributing guide
│   └── assets/             # Custom CSS, JS, images
├── mkdocs.yml              # MkDocs configuration
├── requirements.txt        # Python dependencies
└── vercel.json             # Vercel deployment configuration
```

## Contributing

We welcome contributions\! Here's how you can help:

### Quick Edits

Every page has an "Edit on GitHub" link. Click it to propose changes directly.

### Larger Contributions

1. **Fork** the repository
2. **Create a branch** for your changes (`git checkout -b feature/my-improvement`)
3. **Make your changes** and test locally with `mkdocs serve`
4. **Commit** with a descriptive message
5. **Push** and open a Pull Request

### Content Guidelines

- Write in clear, concise language
- Use code examples liberally
- Include diagrams for complex concepts (Mermaid syntax supported)
- Test all code snippets
- Follow the existing structure and formatting

### Adding New Pages

1. Create a new `.md` file in the appropriate directory
2. Add the page to `mkdocs.yml` navigation
3. Run `mkdocs build --strict` to check for broken links

## Deployment

### Vercel (Recommended)

This site is configured for one-click deployment on Vercel:

1. Click the "Deploy with Vercel" button above
2. Connect your GitHub repository
3. Vercel will automatically build and deploy on every push

### Manual Deployment

```bash
# Build the site
mkdocs build

# Deploy the site/ directory to any static hosting provider
```

## Versioning

We use [mike](https://github.com/jimporter/mike) for documentation versioning:

```bash
# Deploy a new version
mike deploy 7.3 latest --push

# List versions
mike list

# Set default version
mike set-default latest --push
```

## Tech Stack

- **[MkDocs](https://www.mkdocs.org/)** — Static site generator
- **[Material for MkDocs](https://squidfunk.github.io/mkdocs-material/)** — Theme and components
- **[Mermaid](https://mermaid.js.org/)** — Diagrams and flowcharts
- **[Vercel](https://vercel.com/)** — Hosting and deployment

## License

This documentation is licensed under [Apache 2.0](LICENSE), the same license as FoundationDB.

## Acknowledgments

- Content sourced and modernized from the [FoundationDB documentation archive](https://github.com/foundationdb-oss/documentation-snapshot)
- Built with ❤️ by the FoundationDB community

---

<p align="center">
  <a href="https://www.foundationdb.org/">Website</a> •
  <a href="https://github.com/apple/foundationdb">GitHub</a> •
  <a href="https://forums.foundationdb.org/">Forums</a> •
  <a href="https://discord.gg/foundationdb">Discord</a>
</p>
