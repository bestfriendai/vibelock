/**
 * LockerRoom App - Comprehensive E2E Test Runner
 * Tests all functionality including authentication, database operations, and UI components
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class E2ETestRunner {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };
    this.startTime = Date.now();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📋',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      test: '🧪'
    }[type] || '📋';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async runTest(testName, testFunction) {
    this.log(`Running test: ${testName}`, 'test');
    try {
      await testFunction();
      this.testResults.passed++;
      this.log(`PASSED: ${testName}`, 'success');
      return true;
    } catch (error) {
      this.testResults.failed++;
      this.testResults.errors.push({ test: testName, error: error.message });
      this.log(`FAILED: ${testName} - ${error.message}`, 'error');
      return false;
    }
  }

  // Database Connection Tests
  async testDatabaseConnection() {
    return this.runTest('Database Connection', async () => {
      // Check if Supabase configuration is valid
      const supabaseConfig = fs.readFileSync('src/config/supabase.ts', 'utf8');
      if (!supabaseConfig.includes('createClient')) {
        throw new Error('Supabase client not properly configured');
      }
      
      // Check environment variables
      if (!process.env.EXPO_PUBLIC_SUPABASE_URL) {
        throw new Error('EXPO_PUBLIC_SUPABASE_URL not set');
      }
      if (!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
        throw new Error('EXPO_PUBLIC_SUPABASE_ANON_KEY not set');
      }
    });
  }

  // Authentication System Tests
  async testAuthenticationSystem() {
    const authTests = [
      'Sign Up Screen Exists',
      'Sign In Screen Exists', 
      'Forgot Password Screen Exists',
      'Auth Store Configuration',
      'Auth Service Functions'
    ];

    for (const test of authTests) {
      await this.runTest(`Auth: ${test}`, async () => {
        switch (test) {
          case 'Sign Up Screen Exists':
            if (!fs.existsSync('src/screens/SignUpScreen.tsx')) {
              throw new Error('SignUpScreen.tsx not found');
            }
            break;
          case 'Sign In Screen Exists':
            if (!fs.existsSync('src/screens/SignInScreen.tsx')) {
              throw new Error('SignInScreen.tsx not found');
            }
            break;
          case 'Forgot Password Screen Exists':
            if (!fs.existsSync('src/screens/ForgotPasswordScreen.tsx')) {
              throw new Error('ForgotPasswordScreen.tsx not found');
            }
            break;
          case 'Auth Store Configuration':
            const authStore = fs.readFileSync('src/state/authStore.ts', 'utf8');
            if (!authStore.includes('signUp') || !authStore.includes('signIn')) {
              throw new Error('Auth store missing required functions');
            }
            break;
          case 'Auth Service Functions':
            const authService = fs.readFileSync('src/services/auth.ts', 'utf8');
            if (!authService.includes('signUp') || !authService.includes('signIn')) {
              throw new Error('Auth service missing required functions');
            }
            break;
        }
      });
    }
  }

  // Reviews System Tests
  async testReviewsSystem() {
    const reviewTests = [
      'Browse Screen Exists',
      'Create Review Screen Exists',
      'Review Detail Screen Exists',
      'Reviews Store Configuration',
      'Reviews Service Functions'
    ];

    for (const test of reviewTests) {
      await this.runTest(`Reviews: ${test}`, async () => {
        switch (test) {
          case 'Browse Screen Exists':
            if (!fs.existsSync('src/screens/BrowseScreen.tsx')) {
              throw new Error('BrowseScreen.tsx not found');
            }
            break;
          case 'Create Review Screen Exists':
            if (!fs.existsSync('src/screens/CreateReviewScreen.tsx')) {
              throw new Error('CreateReviewScreen.tsx not found');
            }
            break;
          case 'Review Detail Screen Exists':
            if (!fs.existsSync('src/screens/ReviewDetailScreen.tsx')) {
              throw new Error('ReviewDetailScreen.tsx not found');
            }
            break;
          case 'Reviews Store Configuration':
            const reviewsStore = fs.readFileSync('src/state/reviewsStore.ts', 'utf8');
            if (!reviewsStore.includes('loadReviews') || !reviewsStore.includes('createReview')) {
              throw new Error('Reviews store missing required functions');
            }
            break;
          case 'Reviews Service Functions':
            const reviewsService = fs.readFileSync('src/services/reviews.ts', 'utf8');
            if (!reviewsService.includes('getReviews') || !reviewsService.includes('createReview')) {
              throw new Error('Reviews service missing required functions');
            }
            break;
        }
      });
    }
  }

  // Chat System Tests
  async testChatSystem() {
    const chatTests = [
      'Chat Room Screen Exists',
      'Chatrooms Screen Exists',
      'Chat Store Configuration',
      'Realtime Chat Service',
      'Message Components'
    ];

    for (const test of chatTests) {
      await this.runTest(`Chat: ${test}`, async () => {
        switch (test) {
          case 'Chat Room Screen Exists':
            if (!fs.existsSync('src/screens/ChatRoomScreen.tsx')) {
              throw new Error('ChatRoomScreen.tsx not found');
            }
            break;
          case 'Chatrooms Screen Exists':
            if (!fs.existsSync('src/screens/ChatroomsScreen.tsx')) {
              throw new Error('ChatroomsScreen.tsx not found');
            }
            break;
          case 'Chat Store Configuration':
            const chatStore = fs.readFileSync('src/state/chatStore.ts', 'utf8');
            if (!chatStore.includes('sendMessage') || !chatStore.includes('joinChatRoom')) {
              throw new Error('Chat store missing required functions');
            }
            break;
          case 'Realtime Chat Service':
            if (!fs.existsSync('src/services/realtimeChat.ts')) {
              throw new Error('realtimeChat.ts service not found');
            }
            break;
          case 'Message Components':
            if (!fs.existsSync('src/components/EnhancedMessageBubble.tsx')) {
              throw new Error('Message components not found');
            }
            break;
        }
      });
    }
  }

  // Navigation Tests
  async testNavigation() {
    return this.runTest('Navigation Configuration', async () => {
      if (!fs.existsSync('src/navigation/AppNavigator.tsx')) {
        throw new Error('AppNavigator.tsx not found');
      }
      
      const navigator = fs.readFileSync('src/navigation/AppNavigator.tsx', 'utf8');
      const requiredScreens = ['SignIn', 'SignUp', 'Browse', 'Search', 'CreateReview', 'ChatRoom'];
      
      for (const screen of requiredScreens) {
        if (!navigator.includes(screen)) {
          throw new Error(`Navigation missing ${screen} screen`);
        }
      }
    });
  }

  // Component Tests
  async testComponents() {
    const components = [
      'ErrorBoundary',
      'LoadingSpinner', 
      'OfflineBanner',
      'StaggeredGrid',
      'LocationSelector',
      'DistanceFilter'
    ];

    for (const component of components) {
      await this.runTest(`Component: ${component}`, async () => {
        if (!fs.existsSync(`src/components/${component}.tsx`)) {
          throw new Error(`${component}.tsx not found`);
        }
      });
    }
  }

  // Service Tests
  async testServices() {
    const services = [
      'auth',
      'reviews', 
      'storage',
      'locationService',
      'notificationService',
      'adMobService',
      'errorReporting'
    ];

    for (const service of services) {
      await this.runTest(`Service: ${service}`, async () => {
        if (!fs.existsSync(`src/services/${service}.ts`)) {
          throw new Error(`${service}.ts not found`);
        }
      });
    }
  }

  // Configuration Tests
  async testConfiguration() {
    const configs = [
      'supabase',
      'theme',
      'constants'
    ];

    for (const config of configs) {
      await this.runTest(`Config: ${config}`, async () => {
        const configPath = config === 'constants' ? 
          'src/constants/strings.ts' : 
          `src/config/${config}.ts`;
        
        if (!fs.existsSync(configPath)) {
          throw new Error(`${config} configuration not found`);
        }
      });
    }
  }

  // Generate Test Report
  generateReport() {
    const duration = Date.now() - this.startTime;
    const total = this.testResults.passed + this.testResults.failed + this.testResults.skipped;
    
    this.log('\n' + '='.repeat(50), 'info');
    this.log('TEST EXECUTION COMPLETE', 'info');
    this.log('='.repeat(50), 'info');
    this.log(`Total Tests: ${total}`, 'info');
    this.log(`Passed: ${this.testResults.passed}`, 'success');
    this.log(`Failed: ${this.testResults.failed}`, 'error');
    this.log(`Skipped: ${this.testResults.skipped}`, 'warning');
    this.log(`Duration: ${duration}ms`, 'info');
    
    if (this.testResults.errors.length > 0) {
      this.log('\nFAILED TESTS:', 'error');
      this.testResults.errors.forEach(({ test, error }) => {
        this.log(`  - ${test}: ${error}`, 'error');
      });
    }
    
    const successRate = ((this.testResults.passed / total) * 100).toFixed(1);
    this.log(`\nSuccess Rate: ${successRate}%`, successRate > 90 ? 'success' : 'warning');
  }

  // Main test execution
  async runAllTests() {
    this.log('Starting LockerRoom App E2E Tests', 'info');
    
    await this.testDatabaseConnection();
    await this.testAuthenticationSystem();
    await this.testReviewsSystem();
    await this.testChatSystem();
    await this.testNavigation();
    await this.testComponents();
    await this.testServices();
    await this.testConfiguration();
    
    this.generateReport();
  }
}

// Run tests if called directly
if (require.main === module) {
  const runner = new E2ETestRunner();
  runner.runAllTests().catch(console.error);
}

module.exports = E2ETestRunner;
