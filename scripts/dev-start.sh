#!/bin/bash
# GradeGuru - Development Start Script (Bash/Cross-Platform)
# This script starts the application in development mode using Electron
# 
# Usage: ./scripts/dev-start.sh
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

# ============================================================================
# ERROR HANDLING
# ============================================================================

# Exit on any error
set -e

# Function to display error and exit
error_exit() {
    echo ""
    echo "[ERROR] $1" >&2
    echo "The development server could not start." >&2
    echo "Please check:" >&2
    echo "  1. Node.js is installed (run: node --version)" >&2
    echo "  2. Dependencies are installed (run: npm install)" >&2
    echo "  3. No other Electron process is running" >&2
    exit 1
}

# ============================================================================
# PREREQUISITE CHECKS
# ============================================================================

echo "============================================"
echo "  GradeGuru - Development Mode"
echo "============================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    error_exit "Node.js is not installed or not in PATH"
fi
NODE_VERSION=$(node --version)
echo "[OK] Node.js version: $NODE_VERSION"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    error_exit "npm is not installed or not in PATH"
fi
NPM_VERSION=$(npm --version)
echo "[OK] npm version: $NPM_VERSION"

# Check if node_modules exists (dependencies installed)
if [ ! -d "node_modules" ]; then
    echo "[INFO] node_modules not found. Running npm install..."
    npm install || error_exit "npm install failed"
    echo "[OK] Dependencies installed successfully"
fi

echo ""

# ============================================================================
# START ELECTRON IN DEVELOPMENT MODE
# ============================================================================

echo "Starting GradeGuru in development mode..."
echo "Press Ctrl+C to stop the application"
echo ""

# Run Electron in development mode
# Using npm run dev which executes: electron .
npm run dev

# If we get here, Electron has closed
echo ""
echo "[INFO] Development server stopped."
exit 0
