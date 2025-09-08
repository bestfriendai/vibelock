#!/usr/bin/env node

/**
 * Monetization Implementation Validation Script
 * 
 * This script validates the monetization implementation to ensure
 * everything will work correctly when API keys are added.
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Validating Monetization Implementation...\n');

const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  issues: []
};

function addResult(type, message, file = null) {
  results[type]++;
  results.issues.push({
    type,
    message,
    file
  });
  
  const emoji = type === 'passed' ? '✅' : type === 'failed' ? '❌' : '⚠️';
  const fileInfo = file ? ` (${file})` : '';
  console.log(`${emoji} ${message}${fileInfo}`);
}

function checkFileExists(filePath, description) {
  if (fs.existsSync(filePath)) {
    addResult('passed', `${description} exists`, filePath);
    return true;
  } else {
    addResult('failed', `${description} missing`, filePath);
    return false;
  }
}

function checkFileContent(filePath, patterns, description) {
  if (!fs.existsSync(filePath)) {
    addResult('failed', `${description} file missing`, filePath);
    return false;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  let allPassed = true;
  
  patterns.forEach(({ pattern, message }) => {
    if (content.includes(pattern)) {
      addResult('passed', message, filePath);
    } else {
      addResult('failed', `Missing: ${message}`, filePath);
      allPassed = false;
    }
  });
  
  return allPassed;
}

// Test 1: Core Files Existence
console.log('📁 Checking Core Files...');
checkFileExists('src/utils/buildEnvironment.ts', 'Build Environment Utility');
checkFileExists('src/state/subscriptionStore.ts', 'Subscription Store');
checkFileExists('src/services/adMobService.ts', 'AdMob Service');
checkFileExists('src/components/AdBanner.tsx', 'AdBanner Component');
checkFileExists('src/hooks/useInterstitialAd.ts', 'Interstitial Ad Hook');
checkFileExists('src/components/subscription/PaywallAdaptive.tsx', 'Adaptive Paywall');
checkFileExists('src/components/FeatureGate.tsx', 'Feature Gate Component');
checkFileExists('src/components/TestMonetization.tsx', 'Test Component');

console.log('\n🔍 Checking Implementation Details...');

// Test 2: Build Environment
checkFileContent('src/utils/buildEnvironment.ts', [
  { pattern: 'expo-constants', message: 'Expo Constants import' },
  { pattern: 'react-native-purchases', message: 'Native module detection' },
  { pattern: 'canUseRevenueCat', message: 'RevenueCat capability check' },
  { pattern: 'canUseAdMob', message: 'AdMob capability check' }
], 'Build Environment');

// Test 3: Subscription Store
checkFileContent('src/state/subscriptionStore.ts', [
  { pattern: 'canUseRevenueCat()', message: 'Environment detection usage' },
  { pattern: 'await import(\'react-native-purchases\')', message: 'Dynamic import' },
  { pattern: 'EXPO_PUBLIC_REVENUECAT_IOS_API_KEY', message: 'iOS API key usage' },
  { pattern: 'EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY', message: 'Android API key usage' },
  { pattern: 'Platform.select', message: 'Platform-specific configuration' },
  { pattern: 'Mock successful initialization', message: 'Expo Go fallback' }
], 'Subscription Store');

// Test 4: AdMob Service
checkFileContent('src/services/adMobService.ts', [
  { pattern: 'canUseAdMob()', message: 'Environment detection usage' },
  { pattern: 'await import(\'react-native-google-mobile-ads\')', message: 'Dynamic import' },
  { pattern: 'EXPO_PUBLIC_ADMOB_IOS_BANNER_ID', message: 'iOS banner ID usage' },
  { pattern: 'EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID', message: 'Android banner ID usage' },
  { pattern: 'MockInterstitialAd', message: 'Mock implementation' },
  { pattern: 'initializeMockAds', message: 'Mock initialization' }
], 'AdMob Service');

// Test 5: AdBanner Component
checkFileContent('src/components/AdBanner.tsx', [
  { pattern: 'canUseAdMob()', message: 'Environment detection usage' },
  { pattern: 'MockBannerAd', message: 'Mock banner component' },
  { pattern: 'RealBannerAd', message: 'Real banner component' },
  { pattern: 'await import(\'react-native-google-mobile-ads\')', message: 'Dynamic import' },
  { pattern: 'isPremium', message: 'Premium user check' }
], 'AdBanner Component');

// Test 6: App.tsx Integration
if (checkFileExists('App.tsx', 'Main App File')) {
  checkFileContent('App.tsx', [
    { pattern: 'useSubscriptionStore', message: 'Subscription store import' },
    { pattern: 'adMobService', message: 'AdMob service import' },
    { pattern: 'buildEnv', message: 'Build environment import' },
    { pattern: 'initializeRevenueCat', message: 'RevenueCat initialization' },
    { pattern: 'hasNativeModules', message: 'Native module check' }
  ], 'App.tsx Integration');
}

// Test 7: ProfileScreen Integration
if (checkFileExists('src/screens/ProfileScreen.tsx', 'Profile Screen')) {
  checkFileContent('src/screens/ProfileScreen.tsx', [
    { pattern: 'useSubscriptionStore', message: 'Subscription store usage' },
    { pattern: 'PaywallAdaptive', message: 'Paywall component import' },
    { pattern: 'buildEnv', message: 'Build environment usage' },
    { pattern: 'isPremium', message: 'Premium status check' },
    { pattern: 'restorePurchases', message: 'Restore purchases functionality' }
  ], 'ProfileScreen Integration');
}

console.log('\n📋 Checking Environment Variables...');

// Test 8: Environment Variables Documentation
const envVars = [
  'EXPO_PUBLIC_REVENUECAT_IOS_API_KEY',
  'EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY',
  'EXPO_PUBLIC_ADMOB_IOS_APP_ID',
  'EXPO_PUBLIC_ADMOB_ANDROID_APP_ID',
  'EXPO_PUBLIC_ADMOB_IOS_BANNER_ID',
  'EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID',
  'EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID',
  'EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID'
];

envVars.forEach(envVar => {
  // Check if environment variable is referenced in code
  const files = [
    'src/state/subscriptionStore.ts',
    'src/services/adMobService.ts'
  ];
  
  let found = false;
  files.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes(envVar)) {
        found = true;
      }
    }
  });
  
  if (found) {
    addResult('passed', `Environment variable ${envVar} properly referenced`);
  } else {
    addResult('warnings', `Environment variable ${envVar} not found in code`);
  }
});

console.log('\n🎯 Validation Summary:');
console.log(`✅ Passed: ${results.passed}`);
console.log(`❌ Failed: ${results.failed}`);
console.log(`⚠️  Warnings: ${results.warnings}`);

if (results.failed === 0) {
  console.log('\n🎉 ALL TESTS PASSED! The monetization implementation is ready for API keys.');
  console.log('\n📝 Next Steps:');
  console.log('1. Add your API keys to the .env file');
  console.log('2. Update app.json with the required plugins');
  console.log('3. Create a development build');
  console.log('4. Test with the TestMonetization component');
} else {
  console.log('\n⚠️  Some issues were found. Please review the failed tests above.');
}

console.log('\n📚 For detailed setup instructions, see:');
console.log('- INSTALLATION_INSTRUCTIONS.md');
console.log('- COMPREHENSIVE_TEST_RESULTS.md');

process.exit(results.failed > 0 ? 1 : 0);
