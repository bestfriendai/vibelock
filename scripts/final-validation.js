#!/usr/bin/env node

/**
 * Final Validation Script
 * 
 * This script performs a final check to ensure the app is ready to run
 * without critical errors.
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bold}${colors.blue}${msg}${colors.reset}`)
};

// File reading helper
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return null;
  }
}

// Check if file exists
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

// Validation functions
const validations = {
  // Check critical files exist
  checkCriticalFiles: () => {
    log.header('Checking Critical Files');
    
    const criticalFiles = [
      'App.tsx',
      'package.json',
      'src/navigation/AppNavigator.tsx',
      'src/state/authStore.ts',
      'src/state/reviewsStore.ts',
      'src/state/chatStore.ts',
      'src/config/supabase.ts',
      'src/components/ErrorBoundary.tsx'
    ];
    
    let allExist = true;
    
    criticalFiles.forEach(file => {
      if (fileExists(file)) {
        log.success(`${file} exists`);
      } else {
        log.error(`${file} is missing`);
        allExist = false;
      }
    });
    
    return allExist;
  },

  // Check for critical import errors
  checkImports: () => {
    log.header('Checking Critical Imports');
    
    const appContent = readFile('App.tsx');
    let importIssues = 0;
    
    if (appContent) {
      // Check for correct React Navigation import
      if (appContent.includes('@react-navigation/native')) {
        log.success('App.tsx: Correct React Navigation import');
      } else {
        log.error('App.tsx: Missing or incorrect React Navigation import');
        importIssues++;
      }
      
      // Check for ErrorBoundary import
      if (appContent.includes('./src/components/ErrorBoundary')) {
        log.success('App.tsx: ErrorBoundary import found');
      } else {
        log.error('App.tsx: ErrorBoundary import missing');
        importIssues++;
      }
    }
    
    return importIssues === 0;
  },

  // Check for TypeScript interface issues
  checkInterfaces: () => {
    log.header('Checking TypeScript Interfaces');
    
    const chatStoreContent = readFile('src/state/chatStore.ts');
    let interfaceIssues = 0;
    
    if (chatStoreContent) {
      // Check for cleanup method in interface
      if (chatStoreContent.includes('cleanup: () => Promise<void>')) {
        log.success('chatStore: cleanup method in interface');
      } else {
        log.error('chatStore: cleanup method missing from interface');
        interfaceIssues++;
      }
    }
    
    return interfaceIssues === 0;
  },

  // Check for accessibility improvements
  checkAccessibility: () => {
    log.header('Checking Accessibility Improvements');
    
    const files = [
      'src/components/LikeDislikeButtons.tsx',
      'src/components/SegmentedTabs.tsx',
      'src/components/ImageCarousel.tsx',
      'src/components/ConfirmationModal.tsx'
    ];
    
    let accessibilityCount = 0;
    
    files.forEach(file => {
      const content = readFile(file);
      if (content && content.includes('accessibilityLabel')) {
        log.success(`${path.basename(file)}: Has accessibility labels`);
        accessibilityCount++;
      }
    });
    
    return accessibilityCount;
  },

  // Check for performance optimizations
  checkPerformance: () => {
    log.header('Checking Performance Optimizations');
    
    const files = [
      'src/components/StaggeredGrid.tsx',
      'src/components/EnhancedReviewCard.tsx',
      'src/components/MediaGallery.tsx'
    ];
    
    let optimizationCount = 0;
    
    files.forEach(file => {
      const content = readFile(file);
      if (content && (content.includes('memo(') || content.includes('React.memo'))) {
        log.success(`${path.basename(file)}: Uses memoization`);
        optimizationCount++;
      }
    });
    
    return optimizationCount;
  },

  // Check package.json dependencies
  checkDependencies: () => {
    log.header('Checking Key Dependencies');
    
    const packageContent = readFile('package.json');
    if (!packageContent) {
      log.error('package.json not found');
      return false;
    }
    
    const packageJson = JSON.parse(packageContent);
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    const keyDependencies = [
      '@react-navigation/native',
      '@supabase/supabase-js',
      'react-native-reanimated',
      'react-native-safe-area-context',
      '@shopify/flash-list',
      'expo-image-manipulator',
      'zustand'
    ];
    
    let allPresent = true;
    
    keyDependencies.forEach(dep => {
      if (dependencies[dep]) {
        log.success(`${dep}: ${dependencies[dep]}`);
      } else {
        log.error(`${dep}: Missing`);
        allPresent = false;
      }
    });
    
    return allPresent;
  },

  // Check for removed mock data
  checkMockDataRemoval: () => {
    log.header('Checking Mock Data Removal');
    
    const reviewsStoreContent = readFile('src/state/reviewsStore.ts');
    if (reviewsStoreContent) {
      if (!reviewsStoreContent.includes('id: "2"') && !reviewsStoreContent.includes('Jasmine')) {
        log.success('reviewsStore: Mock data removed');
        return true;
      } else {
        log.error('reviewsStore: Mock data still present');
        return false;
      }
    }
    
    return false;
  }
};

// Main validation function
async function runFinalValidation() {
  console.log(`${colors.bold}${colors.blue}Final App Validation Report${colors.reset}`);
  console.log('='.repeat(50));
  
  const results = {};
  
  // Run all validations
  results.criticalFiles = validations.checkCriticalFiles();
  results.imports = validations.checkImports();
  results.interfaces = validations.checkInterfaces();
  results.accessibility = validations.checkAccessibility();
  results.performance = validations.checkPerformance();
  results.dependencies = validations.checkDependencies();
  results.mockDataRemoved = validations.checkMockDataRemoval();
  
  // Generate summary
  log.header('Final Summary');
  
  const criticalIssues = [
    !results.criticalFiles,
    !results.imports,
    !results.interfaces,
    !results.dependencies
  ].filter(Boolean).length;
  
  const improvements = results.accessibility + results.performance + (results.mockDataRemoved ? 1 : 0);
  
  log.info(`Critical files: ${results.criticalFiles ? 'OK' : 'ISSUES'}`);
  log.info(`Imports: ${results.imports ? 'OK' : 'ISSUES'}`);
  log.info(`Interfaces: ${results.interfaces ? 'OK' : 'ISSUES'}`);
  log.info(`Dependencies: ${results.dependencies ? 'OK' : 'ISSUES'}`);
  log.info(`Accessibility improvements: ${results.accessibility}`);
  log.info(`Performance optimizations: ${results.performance}`);
  log.info(`Mock data removed: ${results.mockDataRemoved ? 'YES' : 'NO'}`);
  
  if (criticalIssues === 0) {
    log.success('🎉 App is ready to run! All critical issues resolved.');
    log.info(`✨ ${improvements} improvements successfully implemented.`);
  } else {
    log.error(`❌ ${criticalIssues} critical issues need to be fixed before running.`);
  }
  
  return criticalIssues === 0;
}

// Run validation if called directly
if (require.main === module) {
  runFinalValidation().catch(console.error);
}

module.exports = { runFinalValidation, validations };
