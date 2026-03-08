# GradeGuru - Production Build Script (Windows/PowerShell)
# This script builds the application for production distribution using electron-builder
# 
# Usage: .\scripts\build.ps1
# Output: dist/ folder with installer and portable executable

# ============================================================================
# SCRIPT CONFIGURATION
# ============================================================================

# Get the script's directory (assumes script is in scripts/ folder)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

# Change to project root directory
Set-Location $ProjectRoot

# Build output directory (from electron-builder.yml: output: dist)
$DistDir = Join-Path $ProjectRoot "dist"

# ============================================================================
# ERROR HANDLING
# ============================================================================

# Stop on any error
$ErrorActionPreference = "Stop"

# Function to handle script cleanup on error
function Handle-Error {
    param([string]$Message)
    Write-Host "`n[ERROR] $Message" -ForegroundColor Red
    Write-Host "The build process failed." -ForegroundColor Red
    exit 1
}

# Function to display build artifacts
function Show-BuildArtifacts {
    Write-Host "`n============================================" -ForegroundColor Cyan
    Write-Host "  Build Artifacts" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
    
    if (Test-Path $DistDir) {
        $artifacts = Get-ChildItem $DistDir -File
        if ($artifacts.Count -gt 0) {
            foreach ($artifact in $artifacts) {
                $sizeKB = [math]::Round($artifact.Length / 1KB, 2)
                $sizeMB = [math]::Round($artifact.Length / 1MB, 2)
                if ($sizeMB -ge 1) {
                    Write-Host "  $($artifact.Name) ($sizeMB MB)" -ForegroundColor Green
                } else {
                    Write-Host "  $($artifact.Name) ($sizeKB KB)" -ForegroundColor Green
                }
            }
        } else {
            Write-Host "  No artifacts found in dist folder" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "Build output location: $DistDir" -ForegroundColor Cyan
    Write-Host ""
}

# ============================================================================
# PREREQUISITE CHECKS
# ============================================================================

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  GradeGuru - Production Build" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Handle-Error "Node.js is not installed or not in PATH"
}

# Check if node_modules exists (dependencies installed)
$nodeModulesPath = Join-Path $ProjectRoot "node_modules"
if (-not (Test-Path $nodeModulesPath)) {
    Write-Host "[INFO] Installing dependencies..." -ForegroundColor Yellow
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

# Check if electron-builder is available
$electronBuilderPath = Join-Path $ProjectRoot "node_modules\electron-builder"
if (-not (Test-Path $electronBuilderPath)) {
    Handle-Error "electron-builder is not installed. Run: npm install electron-builder"
}

Write-Host ""

# ============================================================================
# CLEAN PREVIOUS BUILD
# ============================================================================

Write-Host "Cleaning previous build artifacts..." -ForegroundColor Cyan
if (Test-Path $DistDir) {
    try {
        Remove-Item $DistDir -Recurse -Force
        Write-Host "[OK] Previous build cleaned" -ForegroundColor Green
    } catch {
        Write-Host "[WARN] Could not clean previous build: $_" -ForegroundColor Yellow
    }
}
Write-Host ""

# ============================================================================
# RUN PRODUCTION BUILD
# ============================================================================

Write-Host "Starting production build with electron-builder..." -ForegroundColor Cyan
Write-Host "This may take several minutes depending on your system." -ForegroundColor Yellow
Write-Host ""

try {
    # Run electron-builder
    # Using npm run build which executes: electron-builder
    npm run build
    
    if ($LASTEXITCODE -ne 0) {
        Handle-Error "Build failed with exit code: $LASTEXITCODE"
    }
    
    Write-Host ""
    Write-Host "[OK] Build completed successfully!" -ForegroundColor Green
    
    # Display build artifacts
    Show-BuildArtifacts
    
} catch {
    Handle-Error "Build process failed: $_"
}

# Normal exit
exit 0
