/**
 * Comprehensive AdMob Testing and Debugging Utility
 * 
 * This utility provides testing capabilities for AdMob functionality
 * with specific focus on Expo SDK 54 compatibility and development builds.
 */

import { Platform } from 'react-native';
import { canUseAdMob, buildEnv } from './buildEnvironment';
import { adMobService } from '../services/adMobService';

export interface AdMobTestResult {
  testName: string;
  success: boolean;
  message: string;
  duration: number;
  error?: any;
}

export interface AdMobCompatibilityReport {
  environment: {
    isExpoGo: boolean;
    isDevelopmentBuild: boolean;
    platform: string;
    canUseAdMob: boolean;
  };
  tests: AdMobTestResult[];
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    successRate: number;
  };
  recommendations: string[];
}

class AdMobTestingUtils {
  private testResults: AdMobTestResult[] = [];

  /**
   * Run a comprehensive AdMob compatibility test suite
   */
  async runCompatibilityTests(): Promise<AdMobCompatibilityReport> {
    console.log('🧪 Starting AdMob compatibility tests...');
    this.testResults = [];

    // Environment detection tests
    await this.testEnvironmentDetection();
    
    // AdMob service initialization tests
    await this.testAdMobInitialization();
    
    // Banner ad tests
    await this.testBannerAdConfiguration();
    
    // Interstitial ad tests
    await this.testInterstitialAdConfiguration();
    
    // App Open ad tests
    await this.testAppOpenAdConfiguration();
    
    // Performance tests
    await this.testAdLoadingPerformance();

    return this.generateReport();
  }

  /**
   * Test environment detection and configuration
   */
  private async testEnvironmentDetection(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const isExpoGo = buildEnv.isExpoGo;
      const canUse = canUseAdMob();
      
      this.addTestResult({
        testName: 'Environment Detection',
        success: true,
        message: `Expo Go: ${isExpoGo}, Can use AdMob: ${canUse}, Platform: ${Platform.OS}`,
        duration: Date.now() - startTime
      });
    } catch (error) {
      this.addTestResult({
        testName: 'Environment Detection',
        success: false,
        message: 'Failed to detect environment',
        duration: Date.now() - startTime,
        error
      });
    }
  }

  /**
   * Test AdMob service initialization with SDK 54 compatibility
   */
  private async testAdMobInitialization(): Promise<void> {
    const startTime = Date.now();
    
    try {
      await adMobService.initialize();
      
      this.addTestResult({
        testName: 'AdMob Service Initialization',
        success: true,
        message: 'AdMob service initialized successfully',
        duration: Date.now() - startTime
      });
    } catch (error) {
      this.addTestResult({
        testName: 'AdMob Service Initialization',
        success: false,
        message: 'Failed to initialize AdMob service',
        duration: Date.now() - startTime,
        error
      });
    }
  }

  /**
   * Test banner ad configuration and unit IDs
   */
  private async testBannerAdConfiguration(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const bannerUnitId = adMobService.getBannerAdUnitId();
      
      if (bannerUnitId) {
        this.addTestResult({
          testName: 'Banner Ad Configuration',
          success: true,
          message: `Banner unit ID configured: ${bannerUnitId}`,
          duration: Date.now() - startTime
        });
      } else {
        this.addTestResult({
          testName: 'Banner Ad Configuration',
          success: false,
          message: 'Banner unit ID not configured',
          duration: Date.now() - startTime
        });
      }
    } catch (error) {
      this.addTestResult({
        testName: 'Banner Ad Configuration',
        success: false,
        message: 'Failed to get banner ad configuration',
        duration: Date.now() - startTime,
        error
      });
    }
  }

  /**
   * Test interstitial ad configuration and functionality
   */
  private async testInterstitialAdConfiguration(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const interstitialUnitId = adMobService.getInterstitialAdUnitId();
      
      if (interstitialUnitId) {
        // Test ad show capability (without actually showing)
        const canShow = adMobService.shouldShowInterstitialAd('postCreation');
        
        this.addTestResult({
          testName: 'Interstitial Ad Configuration',
          success: true,
          message: `Interstitial unit ID: ${interstitialUnitId}, Can show: ${canShow}`,
          duration: Date.now() - startTime
        });
      } else {
        this.addTestResult({
          testName: 'Interstitial Ad Configuration',
          success: false,
          message: 'Interstitial unit ID not configured',
          duration: Date.now() - startTime
        });
      }
    } catch (error) {
      this.addTestResult({
        testName: 'Interstitial Ad Configuration',
        success: false,
        message: 'Failed to get interstitial ad configuration',
        duration: Date.now() - startTime,
        error
      });
    }
  }

  /**
   * Test app open ad configuration
   */
  private async testAppOpenAdConfiguration(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const appOpenUnitId = adMobService.getAppOpenAdUnitId();
      
      if (appOpenUnitId) {
        this.addTestResult({
          testName: 'App Open Ad Configuration',
          success: true,
          message: `App Open unit ID configured: ${appOpenUnitId}`,
          duration: Date.now() - startTime
        });
      } else {
        this.addTestResult({
          testName: 'App Open Ad Configuration',
          success: false,
          message: 'App Open unit ID not configured',
          duration: Date.now() - startTime
        });
      }
    } catch (error) {
      this.addTestResult({
        testName: 'App Open Ad Configuration',
        success: false,
        message: 'Failed to get app open ad configuration',
        duration: Date.now() - startTime,
        error
      });
    }
  }

  /**
   * Test ad loading performance and timing
   */
  private async testAdLoadingPerformance(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Test dynamic import performance (SDK 54 compatibility)
      if (canUseAdMob()) {
        const importStartTime = Date.now();
        await import('react-native-google-mobile-ads');
        const importDuration = Date.now() - importStartTime;
        
        this.addTestResult({
          testName: 'Ad Module Import Performance',
          success: importDuration < 5000, // Should load within 5 seconds
          message: `Import took ${importDuration}ms`,
          duration: Date.now() - startTime
        });
      } else {
        this.addTestResult({
          testName: 'Ad Module Import Performance',
          success: true,
          message: 'Skipped - using mock implementation',
          duration: Date.now() - startTime
        });
      }
    } catch (error) {
      this.addTestResult({
        testName: 'Ad Module Import Performance',
        success: false,
        message: 'Failed to import ad module',
        duration: Date.now() - startTime,
        error
      });
    }
  }

  /**
   * Add a test result to the collection
   */
  private addTestResult(result: AdMobTestResult): void {
    this.testResults.push(result);
    console.log(`${result.success ? '✅' : '❌'} ${result.testName}: ${result.message}`);
  }

  /**
   * Generate a comprehensive compatibility report
   */
  private generateReport(): AdMobCompatibilityReport {
    const passed = this.testResults.filter(r => r.success).length;
    const failed = this.testResults.length - passed;
    const successRate = this.testResults.length > 0 ? (passed / this.testResults.length) * 100 : 0;

    const recommendations = this.generateRecommendations();

    return {
      environment: {
        isExpoGo: buildEnv.isExpoGo,
        isDevelopmentBuild: !buildEnv.isExpoGo,
        platform: Platform.OS,
        canUseAdMob: canUseAdMob()
      },
      tests: this.testResults,
      summary: {
        totalTests: this.testResults.length,
        passed,
        failed,
        successRate
      },
      recommendations
    };
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const failedTests = this.testResults.filter(r => !r.success);

    if (failedTests.length === 0) {
      recommendations.push('✅ All tests passed! AdMob is properly configured.');
      return recommendations;
    }

    // Environment-specific recommendations
    if (buildEnv.isExpoGo) {
      recommendations.push('ℹ️ Running in Expo Go - using mock ads. Build a development build to test real ads.');
    }

    // Initialization failure recommendations
    if (failedTests.some(t => t.testName.includes('Initialization'))) {
      recommendations.push('🔧 AdMob initialization failed. Check react-native-google-mobile-ads version compatibility with Expo SDK 54.');
      recommendations.push('🔧 Try rebuilding your development build with the latest AdMob plugin configuration.');
    }

    // Configuration recommendations
    if (failedTests.some(t => t.testName.includes('Configuration'))) {
      recommendations.push('⚙️ Ad unit IDs are not properly configured. Check your AdMob configuration.');
    }

    // Performance recommendations
    if (failedTests.some(t => t.testName.includes('Performance'))) {
      recommendations.push('⚡ Ad loading performance issues detected. This may indicate SDK 54 compatibility problems.');
    }

    return recommendations;
  }

  /**
   * Print a formatted test report to console
   */
  printReport(report: AdMobCompatibilityReport): void {
    console.log('\n📊 AdMob Compatibility Report');
    console.log('================================');
    console.log(`Environment: ${report.environment.platform} (${report.environment.isExpoGo ? 'Expo Go' : 'Development Build'})`);
    console.log(`Can use AdMob: ${report.environment.canUseAdMob}`);
    console.log(`\nTest Results: ${report.summary.passed}/${report.summary.totalTests} passed (${report.summary.successRate.toFixed(1)}%)`);
    
    console.log('\nRecommendations:');
    report.recommendations.forEach(rec => console.log(rec));
    
    if (report.summary.failed > 0) {
      console.log('\nFailed Tests:');
      report.tests.filter(t => !t.success).forEach(test => {
        console.log(`❌ ${test.testName}: ${test.message}`);
        if (test.error) {
          console.log(`   Error: ${test.error.message || test.error}`);
        }
      });
    }
  }
}

export const adMobTestingUtils = new AdMobTestingUtils();
