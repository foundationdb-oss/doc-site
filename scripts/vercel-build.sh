#!/bin/bash
set -e

echo "=== VERCEL BUILD - FoundationDB Versioned Docs ==="

# Install dependencies into a virtual environment
echo "Creating virtual environment and installing dependencies..."
uv venv --python 3.12 .venv
uv pip install -r requirements.txt

# Add venv bin to PATH so mike/mkdocs are found directly
export PATH="$(pwd)/.venv/bin:$PATH"

echo "Virtual environment created and added to PATH"

# Clean any existing build artifacts
echo "Cleaning existing directories..."
rm -rf site 2>/dev/null || true

# Initialize git repo for mike (mike requires git)
echo "Initializing git repo for mike..."
if [ -d ".git" ]; then
    echo "Removing existing git state for clean build..."
    rm -rf .git
fi

git init
git config user.name "vercel-build"
git config user.email "build@vercel.app"

# Initial commit needed for mike
git add .
git commit -m "Build commit for Vercel $(date)"

echo "Starting versioned documentation build..."

# Deploy each version with mike
# mike deploy <version> [aliases...] --title="<title>"

# 7.1 - Legacy version
echo "Building FoundationDB 7.1 (Legacy)..."
mike deploy 7.1 --title="7.1 (Legacy)"

# 7.3 - Current stable (gets stable and latest aliases)
echo "Building FoundationDB 7.3 (Stable)..."
mike deploy 7.3 stable latest --title="7.3 (Stable)"

# 7.4 - Pre-release
echo "Building FoundationDB 7.4 (Pre-release)..."
mike deploy 7.4 --title="7.4 (Pre-release)"

# Set stable as the default version
echo "Setting default version to stable..."
mike set-default stable

# Verify mike deployment
echo "Verifying mike deployment..."
mike list

# Extract built site from gh-pages branch
echo "Extracting site from gh-pages branch..."

if git show-ref --verify --quiet refs/heads/gh-pages; then
    echo "gh-pages branch found"
    
    mkdir -p site
    git archive gh-pages | tar -x -C site
    
    echo "Site contents:"
    ls -la site/ | head -10
    
    # Copy stable version to root for backward compatibility
    echo "Deploying stable version to root for backward compatibility..."
    
    if [ -d "site/stable" ]; then
        # Backup versions.json
        if [ -f "site/versions.json" ]; then
            cp site/versions.json site/versions.json.backup
        fi
        
        # Copy stable content to root
        cp -r site/stable/* site/ 2>/dev/null || true
        
        # Restore versions.json for version selector
        if [ -f "site/versions.json.backup" ]; then
            cp site/versions.json.backup site/versions.json
            rm site/versions.json.backup
        fi
        
        # Verify version directories exist
        echo "Verifying versioned access..."
        for ver in 7.1 7.3 7.4 stable latest; do
            if [ -d "site/$ver" ]; then
                echo "  ✓ $ver/ exists"
            else
                echo "  ✗ $ver/ MISSING"
            fi
        done
        
        # Verify root content
        if [ -f "site/index.html" ]; then
            echo "  ✓ Root index.html exists"
        else
            echo "ERROR: Root index.html missing!"
            exit 1
        fi
        
        echo ""
        echo "=== BUILD SUCCESSFUL ==="
        echo "URL structure:"
        echo "  • /           → 7.3 content (stable)"
        echo "  • /7.1/       → 7.1 docs (legacy)"
        echo "  • /7.3/       → 7.3 docs (stable)"
        echo "  • /7.4/       → 7.4 docs (pre-release)"
        echo "  • /stable/    → Alias to 7.3"
        echo "  • /latest/    → Alias to 7.3"
    else
        echo "ERROR: Stable version directory not found!"
        exit 1
    fi
else
    echo "ERROR: No gh-pages branch found!"
    exit 1
fi

echo ""
echo "Vercel build completed successfully!"

