#!/usr/bin/env node

/**
 * UI/UX Improvements Validation Script
 * 
 * This script validates that the UI/UX improvements have been properly implemented
 * by checking code patterns, consistency, and best practices.
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

// Get all files with specific extensions
function getFiles(dir, extensions = ['.tsx', '.ts']) {
  const files = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        traverse(fullPath);
      } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

// Validation functions
const validations = {
  // Check for consistent spacing patterns
  checkSpacingConsistency: () => {
    log.header('Checking Spacing Consistency');
    
    const files = getFiles('src/screens').concat(getFiles('src/components'));
    let inconsistencies = 0;
    let improvements = 0;
    
    files.forEach(file => {
      const content = readFile(file);
      if (!content) return;
      
      // Check for improved header padding
      if (content.includes('px-6 py-6')) {
        improvements++;
        log.success(`${path.basename(file)}: Uses consistent header padding (px-6 py-6)`);
      }
      
      // Check for old inconsistent patterns
      if (content.includes('px-4 py-4') && !content.includes('px-6 py-6')) {
        inconsistencies++;
        log.warning(`${path.basename(file)}: Still uses old header padding (px-4 py-4)`);
      }
      
      // Check for consistent list item padding
      if (content.includes('p-5')) {
        improvements++;
        log.success(`${path.basename(file)}: Uses consistent list item padding (p-5)`);
      }
      
      // Check for consistent section spacing
      if (content.includes('mt-6')) {
        improvements++;
        log.success(`${path.basename(file)}: Uses consistent section spacing (mt-6)`);
      }
    });
    
    log.info(`Found ${improvements} spacing improvements and ${inconsistencies} inconsistencies`);
    return { improvements, inconsistencies };
  },

  // Check for accessibility improvements
  checkAccessibilityImprovements: () => {
    log.header('Checking Accessibility Improvements');
    
    const files = getFiles('src/components');
    let accessibilityImprovements = 0;
    let missingAccessibility = 0;
    
    files.forEach(file => {
      const content = readFile(file);
      if (!content) return;
      
      // Check for accessibility labels
      if (content.includes('accessibilityLabel')) {
        accessibilityImprovements++;
        log.success(`${path.basename(file)}: Has accessibility labels`);
      }
      
      // Check for accessibility roles
      if (content.includes('accessibilityRole')) {
        accessibilityImprovements++;
        log.success(`${path.basename(file)}: Has accessibility roles`);
      }
      
      // Check for accessibility hints
      if (content.includes('accessibilityHint')) {
        accessibilityImprovements++;
        log.success(`${path.basename(file)}: Has accessibility hints`);
      }
      
      // Check for Pressable without accessibility
      if (content.includes('<Pressable') && !content.includes('accessibilityLabel')) {
        missingAccessibility++;
        log.warning(`${path.basename(file)}: Has Pressable without accessibility labels`);
      }
    });
    
    log.info(`Found ${accessibilityImprovements} accessibility improvements and ${missingAccessibility} missing labels`);
    return { accessibilityImprovements, missingAccessibility };
  },

  // Check for performance optimizations
  checkPerformanceOptimizations: () => {
    log.header('Checking Performance Optimizations');
    
    const files = getFiles('src/components');
    let optimizations = 0;
    
    files.forEach(file => {
      const content = readFile(file);
      if (!content) return;
      
      // Check for memoization
      if (content.includes('memo(') || content.includes('React.memo')) {
        optimizations++;
        log.success(`${path.basename(file)}: Uses memoization`);
      }
      
      // Check for proper FlashList usage
      if (content.includes('estimatedItemSize') && content.includes('getItemType')) {
        optimizations++;
        log.success(`${path.basename(file)}: Uses dynamic FlashList sizing`);
      }
      
      // Check for error boundaries
      if (content.includes('ErrorBoundary')) {
        optimizations++;
        log.success(`${path.basename(file)}: Uses error boundaries`);
      }
      
      // Check for lazy loading
      if (content.includes('priority="low"') || content.includes('cachePolicy')) {
        optimizations++;
        log.success(`${path.basename(file)}: Uses optimized image loading`);
      }
    });
    
    log.info(`Found ${optimizations} performance optimizations`);
    return { optimizations };
  },

  // Check for animation improvements
  checkAnimationImprovements: () => {
    log.header('Checking Animation Improvements');
    
    const files = getFiles('src/components');
    let animationImprovements = 0;
    
    files.forEach(file => {
      const content = readFile(file);
      if (!content) return;
      
      // Check for Reanimated usage
      if (content.includes('react-native-reanimated')) {
        animationImprovements++;
        log.success(`${path.basename(file)}: Uses Reanimated for animations`);
      }
      
      // Check for proper animation cleanup
      if (content.includes('useEffect') && content.includes('return () =>')) {
        animationImprovements++;
        log.success(`${path.basename(file)}: Has animation cleanup`);
      }
      
      // Check for reduced motion support
      if (content.includes('AccessibilityInfo.isReduceMotionEnabled')) {
        animationImprovements++;
        log.success(`${path.basename(file)}: Supports reduced motion`);
      }
    });
    
    log.info(`Found ${animationImprovements} animation improvements`);
    return { animationImprovements };
  },

  // Check for form validation improvements
  checkFormValidationImprovements: () => {
    log.header('Checking Form Validation Improvements');
    
    const createReviewFile = readFile('src/screens/CreateReviewScreen.tsx');
    let validationImprovements = 0;
    
    if (createReviewFile) {
      // Check for enhanced validation
      if (createReviewFile.includes('validation.isValid')) {
        validationImprovements++;
        log.success('CreateReviewScreen: Uses enhanced validation system');
      }
      
      // Check for character counter improvements
      if (createReviewFile.includes('reviewText.length > 450')) {
        validationImprovements++;
        log.success('CreateReviewScreen: Has improved character counter with color coding');
      }
      
      // Check for minimum length validation
      if (createReviewFile.includes('length < 10')) {
        validationImprovements++;
        log.success('CreateReviewScreen: Has minimum length validation');
      }
    }
    
    log.info(`Found ${validationImprovements} form validation improvements`);
    return { validationImprovements };
  },

  // Check for removed mock data
  checkMockDataRemoval: () => {
    log.header('Checking Mock Data Removal');
    
    const reviewsStoreFile = readFile('src/state/reviewsStore.ts');
    let mockDataRemoved = false;
    
    if (reviewsStoreFile) {
      // Check if mock data array is removed
      if (!reviewsStoreFile.includes('id: "2"') && !reviewsStoreFile.includes('Jasmine')) {
        mockDataRemoved = true;
        log.success('reviewsStore: Mock data array has been removed');
      } else {
        log.error('reviewsStore: Mock data array still present');
      }
    }
    
    return { mockDataRemoved };
  }
};

// Main validation function
async function validateImprovements() {
  console.log(`${colors.bold}${colors.blue}UI/UX Improvements Validation Report${colors.reset}`);
  console.log('='.repeat(50));
  
  const results = {};
  
  // Run all validations
  results.spacing = validations.checkSpacingConsistency();
  results.accessibility = validations.checkAccessibilityImprovements();
  results.performance = validations.checkPerformanceOptimizations();
  results.animations = validations.checkAnimationImprovements();
  results.formValidation = validations.checkFormValidationImprovements();
  results.mockData = validations.checkMockDataRemoval();
  
  // Generate summary
  log.header('Summary');
  
  const totalImprovements = 
    results.spacing.improvements +
    results.accessibility.accessibilityImprovements +
    results.performance.optimizations +
    results.animations.animationImprovements +
    results.formValidation.validationImprovements +
    (results.mockData.mockDataRemoved ? 1 : 0);
  
  const totalIssues = 
    results.spacing.inconsistencies +
    results.accessibility.missingAccessibility +
    (results.mockData.mockDataRemoved ? 0 : 1);
  
  log.info(`Total improvements implemented: ${totalImprovements}`);
  log.info(`Total issues remaining: ${totalIssues}`);
  
  if (totalIssues === 0) {
    log.success('All UI/UX improvements have been successfully implemented! 🎉');
  } else {
    log.warning(`${totalIssues} issues still need attention.`);
  }
  
  return results;
}

// Run validation if called directly
if (require.main === module) {
  validateImprovements().catch(console.error);
}

module.exports = { validateImprovements, validations };
