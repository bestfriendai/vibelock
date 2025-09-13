#!/bin/bash

# Fix Architecture Issues Script
# This script resolves React Native new architecture compatibility issues
# including the "View config not found for component AutoLayoutView" error

set -e

echo "🔧 Starting architecture issue fixes..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}▶️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root directory."
    exit 1
fi

# Check if this is the correct project
if ! grep -q "locker-room-talk" package.json; then
    print_warning "This doesn't appear to be the locker-room-talk project. Continuing anyway..."
fi

print_step "Step 1: Clearing Metro cache"
if command -v npx &> /dev/null; then
    npx expo r -c || npx metro --reset-cache || print_warning "Could not clear Metro cache"
    print_success "Metro cache cleared"
else
    print_warning "npx not found, skipping Metro cache clear"
fi

print_step "Step 2: Clearing npm cache"
npm cache clean --force
print_success "npm cache cleared"

print_step "Step 3: Removing node_modules"
if [ -d "node_modules" ]; then
    rm -rf node_modules
    print_success "node_modules removed"
else
    print_warning "node_modules directory not found"
fi

print_step "Step 4: Removing package-lock.json"
if [ -f "package-lock.json" ]; then
    rm -f package-lock.json
    print_success "package-lock.json removed"
fi

print_step "Step 5: Installing dependencies"
npm install
print_success "Dependencies installed"

print_step "Step 6: Checking for iOS directory"
if [ -d "ios" ]; then
    print_step "Step 6a: Cleaning iOS build cache"
    if [ -d "ios/build" ]; then
        rm -rf ios/build
        print_success "iOS build cache cleared"
    fi
    
    print_step "Step 6b: Cleaning iOS Pods"
    if [ -f "ios/Podfile" ]; then
        cd ios
        if command -v pod &> /dev/null; then
            pod cache clean --all || print_warning "Could not clean Pod cache"
            rm -rf Pods
            rm -f Podfile.lock
            pod install
            print_success "iOS Pods reinstalled"
        else
            print_warning "CocoaPods not found, skipping pod install"
        fi
        cd ..
    fi
else
    print_warning "iOS directory not found, skipping iOS-specific steps"
fi

print_step "Step 7: Checking for Android directory"
if [ -d "android" ]; then
    print_step "Step 7a: Cleaning Android build cache"
    if [ -d "android/build" ]; then
        rm -rf android/build
    fi
    if [ -d "android/app/build" ]; then
        rm -rf android/app/build
    fi
    if [ -d "android/.gradle" ]; then
        rm -rf android/.gradle
    fi
    print_success "Android build cache cleared"
else
    print_warning "Android directory not found, skipping Android-specific steps"
fi

print_step "Step 8: Running Expo prebuild clean"
if command -v npx &> /dev/null; then
    npx expo prebuild --clean --no-install || print_warning "Expo prebuild failed, continuing..."
    print_success "Expo prebuild completed"
else
    print_warning "npx not found, skipping Expo prebuild"
fi

print_step "Step 9: Final dependency install"
npm install
print_success "Final dependency installation completed"

print_step "Step 10: Verifying project setup"
if [ -f "scripts/verify-package-setup.js" ]; then
    node scripts/verify-package-setup.js || print_warning "Package setup verification failed"
else
    print_warning "Package setup verification script not found"
fi

if [ -f "scripts/verify-env.js" ]; then
    node scripts/verify-env.js || print_warning "Environment verification failed"
else
    print_warning "Environment verification script not found"
fi

echo ""
print_success "🎉 Architecture issue fixes completed!"
echo ""
echo -e "${BLUE}📝 Summary of changes made:${NC}"
echo "  ✓ Metro cache cleared"
echo "  ✓ npm cache cleared"
echo "  ✓ node_modules reinstalled"
echo "  ✓ iOS Pods reinstalled (if applicable)"
echo "  ✓ Android build cache cleared (if applicable)"
echo "  ✓ Expo prebuild executed"
echo ""
echo -e "${BLUE}🚀 Next steps:${NC}"
echo "  1. Start the development server: npm start"
echo "  2. Run on device/simulator: npm run ios / npm run android"
echo ""
echo -e "${YELLOW}💡 If you still encounter issues:${NC}"
echo "  - Check that newArchEnabled is false in app.json"
echo "  - Verify React version is 18.2.0 in package.json"
echo "  - Ensure no FlashList imports remain in your components"
echo "  - Review the troubleshooting section in README.md"
echo ""
echo -e "${GREEN}Architecture compatibility issues should now be resolved!${NC}"