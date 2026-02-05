#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Temporary branch for local testing (avoids polluting real gh-pages)
TEMP_BRANCH="mike-local-temp"

# Cleanup function for graceful Ctrl+C handling
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down...${NC}"
    # Clean up temporary branch
    if git show-ref --verify --quiet refs/heads/${TEMP_BRANCH}; then
        echo -e "${YELLOW}Cleaning up temporary branch ${TEMP_BRANCH}...${NC}"
        git branch -D ${TEMP_BRANCH} 2>/dev/null || true
        echo -e "  ${GREEN}✓${NC} Temporary branch deleted"
    fi
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

echo -e "${BLUE}=== Mike Local Serve - FoundationDB Versioned Docs ===${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}ERROR: Python 3 is not installed${NC}"
    exit 1
fi
echo -e "  ${GREEN}✓${NC} Python 3 found: $(python3 --version)"

if ! command -v mike &> /dev/null; then
    echo -e "${RED}ERROR: mike is not installed${NC}"
    echo "  Install with: pip install mike"
    exit 1
fi
echo -e "  ${GREEN}✓${NC} mike found: $(mike --version)"

if ! command -v mkdocs &> /dev/null; then
    echo -e "${RED}ERROR: mkdocs is not installed${NC}"
    echo "  Install with: pip install -r requirements.txt"
    exit 1
fi
echo -e "  ${GREEN}✓${NC} mkdocs found"
echo ""

# Check git repository exists (mike requires git)
# Note: .git can be a directory (normal repo) or a file (worktree)
echo -e "${YELLOW}Checking git repository...${NC}"
if [ ! -d ".git" ] && [ ! -f ".git" ]; then
    echo -e "${RED}ERROR: Not a git repository${NC}"
    echo "  Please run this script from the root of a git repository."
    exit 1
fi
echo -e "  ${GREEN}✓${NC} Git repo exists"

# Delete existing temp branch if it exists (clean slate)
if git show-ref --verify --quiet refs/heads/${TEMP_BRANCH}; then
    echo -e "  ${YELLOW}Removing existing temporary branch...${NC}"
    git branch -D ${TEMP_BRANCH} 2>/dev/null || true
fi
echo ""

# Build all versions with mike using temporary branch
# The FDB_VERSION environment variable is used by mkdocs-macros-plugin
# (via main_hooks.py) to inject version-specific variables
#
# Using -b ${TEMP_BRANCH} to deploy to a temporary branch instead of gh-pages
# This avoids polluting the real gh-pages branch during local testing

echo -e "${BLUE}Building versioned documentation to temporary branch...${NC}"
echo -e "  ${YELLOW}(Using branch: ${TEMP_BRANCH})${NC}"
echo ""

# 7.1 - Legacy version
echo -e "${YELLOW}Building FoundationDB 7.1 (Legacy)...${NC}"
export FDB_VERSION="7.1"
mike deploy 7.1 --title="7.1 (Legacy)" --alias-type=redirect -b ${TEMP_BRANCH}
echo -e "  ${GREEN}✓${NC} 7.1 built"
echo ""

# 7.3 - Current stable (gets stable and latest aliases)
echo -e "${YELLOW}Building FoundationDB 7.3 (Stable)...${NC}"
export FDB_VERSION="7.3"
mike deploy 7.3 stable latest --title="7.3 (Stable)" --alias-type=redirect -b ${TEMP_BRANCH}
echo -e "  ${GREEN}✓${NC} 7.3 built (aliases: stable, latest)"
echo ""

# 7.4 - Pre-release
echo -e "${YELLOW}Building FoundationDB 7.4 (Pre-release)...${NC}"
export FDB_VERSION="7.4"
mike deploy 7.4 --title="7.4 (Pre-release)" --alias-type=redirect -b ${TEMP_BRANCH}
echo -e "  ${GREEN}✓${NC} 7.4 built"
echo ""

# Set stable as the default version
echo -e "${YELLOW}Setting default version to stable...${NC}"
mike set-default stable -b ${TEMP_BRANCH}
echo -e "  ${GREEN}✓${NC} Default set to stable"
echo ""

# Show available versions
echo -e "${BLUE}Available versions:${NC}"
mike list -b ${TEMP_BRANCH}
echo ""

# Serve the documentation from the temporary branch
echo -e "${GREEN}=== Starting local server ===${NC}"
echo ""
echo -e "  ${BLUE}URL: http://localhost:8000${NC}"
echo ""
echo -e "  Version URLs:"
echo -e "    • http://localhost:8000/       → stable (7.3)"
echo -e "    • http://localhost:8000/7.1/   → 7.1 (Legacy)"
echo -e "    • http://localhost:8000/7.3/   → 7.3 (Stable)"
echo -e "    • http://localhost:8000/7.4/   → 7.4 (Pre-release)"
echo ""
echo -e "  ${YELLOW}Press Ctrl+C to stop (temporary branch will be cleaned up)${NC}"
echo ""

mike serve -b ${TEMP_BRANCH}

