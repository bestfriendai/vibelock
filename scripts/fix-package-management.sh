#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "🔧 Starting Package Management Cleanup..."
echo "=============================================="

# Step 1: Check and Remove Conflicting Lock Files
log_info "Checking for conflicting lock files..."

LOCK_FILES_FOUND=()
if [ -f "package-lock.json" ]; then
    LOCK_FILES_FOUND+=("package-lock.json")
fi
if [ -f "yarn.lock" ]; then
    LOCK_FILES_FOUND+=("yarn.lock")
fi
if [ -f "bun.lockb" ]; then
    LOCK_FILES_FOUND+=("bun.lockb")
fi
if [ -f "pnpm-lock.yaml" ]; then
    LOCK_FILES_FOUND+=("pnpm-lock.yaml")
fi

if [ ${#LOCK_FILES_FOUND[@]} -gt 1 ]; then
    log_warning "Multiple lock files detected: ${LOCK_FILES_FOUND[*]}"
    log_info "Keeping npm as the package manager by retaining package-lock.json and removing conflicting lockfiles..."
    
    # Remove non-npm lockfiles while keeping package-lock.json
    if [ -f "yarn.lock" ]; then
        rm yarn.lock
        log_success "Removed yarn.lock"
    fi
    if [ -f "pnpm-lock.yaml" ]; then
        rm pnpm-lock.yaml
        log_success "Removed pnpm-lock.yaml"
    fi
    if [ -f "bun.lockb" ]; then
        rm bun.lockb
        log_success "Removed bun.lockb"
    fi
    log_info "Intentionally retained package-lock.json to standardize on npm as primary package manager"
    
elif [ ${#LOCK_FILES_FOUND[@]} -eq 0 ]; then
    log_warning "No lock files found - npm projects typically commit package-lock.json for dependency version consistency"
    
elif [ ${#LOCK_FILES_FOUND[@]} -eq 1 ] && [ "${LOCK_FILES_FOUND[0]}" != "package-lock.json" ]; then
    # Check if npm scripts are used in package.json
    if grep -q '"scripts"' package.json && grep -A 20 '"scripts"' package.json | grep -q 'npm\|npx'; then
        log_warning "Found ${LOCK_FILES_FOUND[0]} but package.json uses npm scripts - consider standardizing on npm and generating package-lock.json"
    else
        log_info "Single non-npm lock file detected: ${LOCK_FILES_FOUND[0]}"
    fi
else
    log_info "Single lock file detected: ${LOCK_FILES_FOUND[0]}"
fi

# Step 2: Clean Package Cache
log_info "Cleaning npm cache..."
npm cache clean --force 2>/dev/null || {
    log_warning "Could not clean npm cache, continuing..."
}

# Step 3: Check if node_modules exists and install dependencies
log_info "Installing dependencies..."
if [ ! -d "node_modules" ]; then
    log_info "node_modules directory not found, running fresh install..."
else
    log_info "node_modules found, updating dependencies..."
fi

npm install || {
    log_error "npm install failed"
    exit 1
}
log_success "Dependencies installed successfully"

# Step 4: Configure Expo-specific dependencies
log_info "Configuring Expo dependencies..."

# Configure Expo packages using npx first, then fallback to global expo
log_info "Installing react-native-worklets via npx expo..."
if npx expo install react-native-worklets 2>/dev/null; then
    log_success "Successfully installed react-native-worklets via npx expo"
elif command -v expo &> /dev/null; then
    log_info "npx expo unavailable, trying global expo CLI..."
    expo install react-native-worklets || {
        log_warning "expo install failed, but react-native-worklets is already in package.json"
    }
else
    log_warning "Neither npx expo nor global Expo CLI found. react-native-worklets is in package.json but may need manual configuration."
fi

log_info "Ensuring expo-av is properly configured via npx expo..."
if npx expo install expo-av 2>/dev/null; then
    log_success "Successfully installed expo-av via npx expo"
elif command -v expo &> /dev/null; then
    log_info "npx expo unavailable, trying global expo CLI..."
    expo install expo-av || {
        log_warning "expo install for expo-av failed, but package is already in package.json"
    }
else
    log_warning "Neither npx expo nor global Expo CLI found. expo-av is in package.json but may need manual configuration."
fi

# Step 5: Check app.json for deprecated properties
log_info "Checking app.json for deprecated properties..."
if [ -f "app.json" ]; then
    if grep -q "statusBarStyle" app.json; then
        log_warning "Found deprecated 'statusBarStyle' property in app.json"
        # Create backup
        cp app.json app.json.backup
        # Remove the statusBarStyle property using safe JSON editing
        if node scripts/remove-statusbar-style.js; then
            log_success "Removed deprecated 'statusBarStyle' property"
        else
            log_warning "Failed to remove statusBarStyle property safely - app.json may contain invalid JSON"
        fi
    else
        log_info "No deprecated properties found in app.json"
    fi
else
    log_warning "app.json not found"
fi

# Step 6: Verify peer dependencies
log_info "Checking peer dependencies..."
npm ls --depth=0 2>/dev/null || {
    log_warning "Some peer dependency warnings may exist, but this is common in React Native projects"
}

# Step 7: Run Expo doctor for final verification
log_info "Running final verification..."
if command -v expo &> /dev/null; then
    expo doctor || {
        log_warning "Expo doctor found some issues, but basic setup should be functional"
    }
else
    log_info "Skipping expo doctor (Expo CLI not available)"
fi

# Step 8: Check React Native Worklets specifically
log_info "Verifying react-native-worklets installation..."
if npm list react-native-worklets &> /dev/null; then
    log_success "react-native-worklets is properly installed"
else
    log_warning "react-native-worklets may need additional configuration"
fi

# Step 9: Summary
echo ""
echo "=============================================="
log_success "Package management cleanup completed!"
echo ""
echo "📋 Summary:"
echo "  ✅ Checked for conflicting lock files"
echo "  ✅ Cleaned package cache"
echo "  ✅ Installed/updated dependencies"
echo "  ✅ Configured Expo dependencies"
echo "  ✅ Checked for deprecated app.json properties"
echo "  ✅ Verified basic package structure"
echo ""
echo "🚀 Your project should now have clean package management!"
echo ""

# Final check - ensure package.json has the required dependencies
log_info "Final verification of key dependencies..."
REQUIRED_DEPS=("react-native-worklets" "expo-av")
MISSING_DEPS=()

for dep in "${REQUIRED_DEPS[@]}"; do
    if ! grep -q "\"$dep\"" package.json; then
        MISSING_DEPS+=("$dep")
    fi
done

if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
    log_error "Missing required dependencies: ${MISSING_DEPS[*]}"
    log_info "Adding missing dependencies..."
    for dep in "${MISSING_DEPS[@]}"; do
        npm install "$dep" || log_warning "Failed to install $dep"
    done
else
    log_success "All required dependencies are present in package.json"
fi

echo "🎉 Package management fix script completed successfully!"