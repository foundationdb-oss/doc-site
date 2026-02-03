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

We use [mike](https://github.com/jimporter/mike) for multi-version docs:

```bash
# Deploy a new version
mike deploy 7.3 latest --push

# Set default version
mike set-default latest --push
```

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
