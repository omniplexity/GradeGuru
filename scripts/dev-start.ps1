# GradeGuru - Development Start Script (Windows/PowerShell)
# This script starts the application in development mode using Electron
# 
# Usage: .\scripts\dev-start.ps1

# ============================================================================
# SCRIPT CONFIGURATION
# ============================================================================

# Get the script's directory (assumes script is in scripts/ folder)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

# Change to project root directory
Set-Location $ProjectRoot

# ============================================================================
# ERROR HANDLING
# ============================================================================

# Stop on any error
$ErrorActionPreference = "Stop"

# Function to handle script cleanup on error
function Handle-Error {
    param([string]$Message)
    Write-Host "`n[ERROR] $Message" -ForegroundColor Red
    Write-Host "The development server could not start." -ForegroundColor Red
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "  1. Node.js is installed (run: node --version)" -ForegroundColor Yellow
    Write-Host "  2. Dependencies are installed (run: npm install)" -ForegroundColor Yellow
    Write-Host "  3. No other Electron process is running" -ForegroundColor Yellow
    exit 1
}

# ============================================================================
# PREREQUISITE CHECKS
# ============================================================================

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  GradeGuru - Development Mode" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Handle-Error "Node.js is not installed or not in PATH"
}

# Check if npm is available
try {
    $npmVersion = npm --version
    Write-Host "[OK] npm version: $npmVersion" -ForegroundColor Green
} catch {
    Handle-Error "npm is not installed or not in PATH"
}

# Check if node_modules exists (dependencies installed)
$nodeModulesPath = Join-Path $ProjectRoot "node_modules"
if (-not (Test-Path $nodeModulesPath)) {
    Write-Host "[INFO] node_modules not found. Running npm install..." -ForegroundColor Yellow
    try {
        npm install
        if ($LASTEXITCODE -ne 0) {
            Handle-Error "npm install failed"
        }
        Write-Host "[OK] Dependencies installed successfully" -ForegroundColor Green
    } catch {
        Handle-Error "Failed to install dependencies: $_"
    }
}

Write-Host ""

# ============================================================================
# START ELECTRON IN DEVELOPMENT MODE
# ============================================================================

Write-Host "Starting GradeGuru in development mode..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the application" -ForegroundColor Yellow
Write-Host ""

try {
    # Run Electron in development mode
    # Using npm run dev which executes: electron .
    npm run dev
    
    # If we get here, Electron has closed
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n[ERROR] Electron exited with code: $LASTEXITCODE" -ForegroundColor Red
        exit $LASTEXITCODE
    }
} catch {
    Handle-Error "Failed to start Electron: $_"
}

# Normal exit
Write-Host "`n[INFO] Development server stopped." -ForegroundColor Green
exit 0
