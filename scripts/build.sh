#!/bin/bash
# OmniAI Desktop - Production Build Script (Bash/Cross-Platform)
# This script builds the application for production distribution using electron-builder
# 
# Usage: ./scripts/build.sh
# Output: dist/ folder with installer and portable executable
# 
# Compatible with:
#   - macOS
#   - Linux (Ubuntu, Debian, Fedora, etc.)
#   - Windows (via Git Bash, WSL, or Cygwin)

# ============================================================================
# SCRIPT CONFIGURATION
# ============================================================================

# Get the script's directory (assumes script is in scripts/ folder)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Change to project root directory
cd "$PROJECT_ROOT" || exit 1

# Build output directory (from electron-builder.yml: output: dist)
DIST_DIR="$PROJECT_ROOT/dist"

# ============================================================================
# ERROR HANDLING
# ============================================================================

# Exit on any error
set -e

# Function to display error and exit
error_exit() {
    echo ""
    echo "[ERROR] $1" >&2
    echo "The build process failed." >&2
    exit 1
}

# Function to display build artifacts
show_build_artifacts() {
    echo ""
    echo "============================================"
    echo "  Build Artifacts"
    echo "============================================"
    
    if [ -d "$DIST_DIR" ]; then
        # Count files in dist directory
        ARTIFACT_COUNT=$(find "$DIST_DIR" -maxdepth 1 -type f | wc -l)
        
        if [ "$ARTIFACT_COUNT" -gt 0 ]; then
            # Get terminal color codes (if available)
            GREEN='\033[0;32m'
            YELLOW='\033[1;33m'
            CYAN='\033[0;36m'
            NC='\033[0m' # No Color
            
            # Detect if colors are supported
            if [ ! -t 1 ]; then
                GREEN=''
                YELLOW=''
                CYAN=''
                NC=''
            fi
            
            find "$DIST_DIR" -maxdepth 1 -type f -exec basename {} \; | while read -r artifact; do
                FILE_PATH="$DIST_DIR/$artifact"
                FILE_SIZE=$(stat -c%s "$FILE_PATH" 2>/dev/null || stat -f%z "$FILE_PATH" 2>/dev/null)
                SIZE_MB=$(echo "scale=2; $FILE_SIZE / 1048576" | bc)
                echo -e "  ${GREEN}$artifact${NC} (${SIZE_MB} MB)"
            done
        else
            echo "  No artifacts found in dist folder"
        fi
    fi
    
    echo ""
    echo -e "Build output location: ${CYAN}$DIST_DIR${NC}"
    echo ""
}

# ============================================================================
# PREREQUISITE CHECKS
# ============================================================================

# Get terminal color codes (if available)
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Detect if colors are supported
if [ ! -t 1 ]; then
    GREEN=''
    YELLOW=''
    CYAN=''
    RED=''
    NC=''
fi

echo "============================================"
echo "  OmniAI Desktop - Production Build"
echo "============================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    error_exit "Node.js is not installed or not in PATH"
fi
NODE_VERSION=$(node --version)
echo -e "[OK] Node.js version: ${GREEN}$NODE_VERSION${NC}"

# Check if node_modules exists (dependencies installed)
if [ ! -d "node_modules" ]; then
    echo -e "[INFO] Installing dependencies...${YELLOW}"
    npm install || error_exit "npm install failed"
    echo -e "[OK] Dependencies installed successfully${NC}"
fi

# Check if electron-builder is available
if [ ! -d "node_modules/electron-builder" ]; then
    error_exit "electron-builder is not installed. Run: npm install electron-builder"
fi

echo ""

# ============================================================================
# CLEAN PREVIOUS BUILD
# ============================================================================

echo -e "Cleaning previous build artifacts...${CYAN}"
if [ -d "$DIST_DIR" ]; then
    rm -rf "$DIST_DIR" || echo -e "${YELLOW}[WARN] Could not clean previous build${NC}"
    echo -e "[OK] Previous build cleaned${NC}"
fi
echo ""

# ============================================================================
# RUN PRODUCTION BUILD
# ============================================================================

echo -e "Starting production build with electron-builder...${CYAN}"
echo -e "This may take several minutes depending on your system.${YELLOW}"
echo ""

# Run electron-builder
# Using npm run build which executes: electron-builder
npm run build

echo ""
echo -e "[OK] Build completed successfully!${GREEN}"

# Display build artifacts
show_build_artifacts

exit 0
