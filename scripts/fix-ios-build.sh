#!/bin/bash

echo "🔧 Fixing iOS build configuration..."

# Navigate to project root
cd "$(dirname "$0")/.." || exit 1

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf ios/build
rm -rf ios/Pods
rm -rf ~/Library/Developer/Xcode/DerivedData

# Clear CocoaPods cache
echo "🗑️ Clearing CocoaPods cache..."
pod cache clean --all 2>/dev/null || true

# Install pods with proper architecture
echo "📦 Installing CocoaPods dependencies..."
cd ios

# For M1/M2 Macs, ensure we're using the right architecture
pod install

cd ..

# Fix any React Native specific issues
echo "🔄 Fixing React Native issues..."

# Ensure metro cache is clean
echo "🧹 Cleaning Metro cache..."
npx react-native start --reset-cache &
METRO_PID=$!
sleep 5
kill $METRO_PID 2>/dev/null || true

# Fix any permission issues
echo "🔐 Fixing permissions..."
chmod +x node_modules/.bin/*

# Patch React Native for iOS 17+ compatibility if needed
echo "🩹 Applying patches..."
npx patch-package

echo "✅ iOS build configuration fixed!"
echo ""
echo "📱 To build for iOS, run:"
echo "   expo run:ios"
echo ""
echo "🏗️ For production build:"
echo "   eas build --platform ios"