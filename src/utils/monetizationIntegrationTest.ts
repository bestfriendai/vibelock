import { supabase } from "../config/supabase";
import { subscriptionService } from "../services/subscriptionService";
import { adMobService } from "../services/adMobService";
import useSubscriptionStore from "../state/subscriptionStore";
import { canUseRevenueCat, canUseAdMob } from "./buildEnvironment";

interface IntegrationTestResult {
  testName: string;
  passed: boolean;
  message: string;
  details?: any;
}

interface IntegrationTestReport {
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    successRate: number;
  };
  results: IntegrationTestResult[];
  recommendations: string[];
}

/**
 * Comprehensive monetization integration test suite
 * Tests the integration between RevenueCat, Supabase, and AdMob
 */
export class MonetizationIntegrationTest {
  private results: IntegrationTestResult[] = [];

  /**
   * Run all integration tests
   */
  async runAllTests(): Promise<IntegrationTestReport> {
    console.log("🧪 Starting monetization integration tests...");

    this.results = [];

    // Test environment detection
    await this.testEnvironmentDetection();

    // Test database connectivity
    await this.testDatabaseConnectivity();

    // Test subscription service
    await this.testSubscriptionService();

    // Test subscription store
    await this.testSubscriptionStore();

    // Test AdMob integration
    await this.testAdMobIntegration();

    // Test subscription-ad integration
    await this.testSubscriptionAdIntegration();

    // Test webhook handling (mock)
    await this.testWebhookHandling();

    return this.generateReport();
  }

  /**
   * Test environment detection
   */
  private async testEnvironmentDetection(): Promise<void> {
    try {
      const canRevenueCat = canUseRevenueCat();
      const canAdMob = canUseAdMob();

      this.addResult({
        testName: "Environment Detection",
        passed: true,
        message: `RevenueCat: ${canRevenueCat ? "Available" : "Mock"}, AdMob: ${canAdMob ? "Available" : "Mock"}`,
        details: { canRevenueCat, canAdMob },
      });
    } catch (error) {
      this.addResult({
        testName: "Environment Detection",
        passed: false,
        message: `Failed to detect environment: ${error}`,
      });
    }
  }

  /**
   * Test database connectivity and schema
   */
  private async testDatabaseConnectivity(): Promise<void> {
    try {
      // Test users table access
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, subscription_tier, subscription_expires_at")
        .limit(1);

      if (usersError) throw usersError;

      // Test subscription_events table access
      const { data: events, error: eventsError } = await supabase
        .from("subscription_events")
        .select("id, user_id, event_type")
        .limit(1);

      if (eventsError) throw eventsError;

      this.addResult({
        testName: "Database Connectivity",
        passed: true,
        message: "Successfully connected to Supabase and verified schema",
        details: { usersCount: users?.length || 0, eventsCount: events?.length || 0 },
      });
    } catch (error) {
      this.addResult({
        testName: "Database Connectivity",
        passed: false,
        message: `Database connectivity failed: ${error}`,
      });
    }
  }

  /**
   * Test subscription service methods
   */
  private async testSubscriptionService(): Promise<void> {
    try {
      // Test with mock user ID
      const mockUserId = "test-user-id";

      // Test getUserSubscription
      const subscription = await subscriptionService.getUserSubscription(mockUserId);

      // Test shouldShowAds
      const shouldShowAds = await subscriptionService.shouldShowAds(mockUserId);

      this.addResult({
        testName: "Subscription Service",
        passed: true,
        message: "Subscription service methods working correctly",
        details: {
          subscription: subscription.tier,
          shouldShowAds,
          isActive: subscription.isActive,
        },
      });
    } catch (error) {
      this.addResult({
        testName: "Subscription Service",
        passed: false,
        message: `Subscription service failed: ${error}`,
      });
    }
  }

  /**
   * Test subscription store state management
   */
  private async testSubscriptionStore(): Promise<void> {
    try {
      const store = useSubscriptionStore.getState();

      // Test initial state
      const hasRequiredMethods =
        typeof store.syncWithSupabase === "function" &&
        typeof store.checkAdStatus === "function" &&
        typeof store.initializeRevenueCat === "function";

      // Test state properties
      const hasRequiredState =
        typeof store.shouldShowAds === "boolean" &&
        typeof store.subscriptionTier === "string" &&
        typeof store.isPremium === "boolean";

      this.addResult({
        testName: "Subscription Store",
        passed: hasRequiredMethods && hasRequiredState,
        message:
          hasRequiredMethods && hasRequiredState
            ? "Subscription store properly configured"
            : "Subscription store missing required methods or state",
        details: {
          methods: hasRequiredMethods,
          state: hasRequiredState,
          currentTier: store.subscriptionTier,
          shouldShowAds: store.shouldShowAds,
        },
      });
    } catch (error) {
      this.addResult({
        testName: "Subscription Store",
        passed: false,
        message: `Subscription store test failed: ${error}`,
      });
    }
  }

  /**
   * Test AdMob integration
   */
  private async testAdMobIntegration(): Promise<void> {
    try {
      // Test AdMob service initialization
      await adMobService.initialize();

      // Test ad display methods (should not actually show ads in test)
      const interstitialResult = await adMobService.showInterstitialAd();
      const appOpenResult = await adMobService.showAppOpenAd();

      this.addResult({
        testName: "AdMob Integration",
        passed: true,
        message: "AdMob service initialized and methods callable",
        details: {
          interstitialResult,
          appOpenResult,
          canUseAdMob: canUseAdMob(),
        },
      });
    } catch (error) {
      this.addResult({
        testName: "AdMob Integration",
        passed: false,
        message: `AdMob integration failed: ${error}`,
      });
    }
  }

  /**
   * Test subscription-ad integration
   */
  private async testSubscriptionAdIntegration(): Promise<void> {
    try {
      // Test that premium users don't see ads
      const mockPremiumUserId = "premium-user-id";

      // Mock premium user in database (for testing)
      const { error } = await supabase.from("users").upsert({
        id: mockPremiumUserId,
        subscription_tier: "premium",
        subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      if (error && !error.message.includes("duplicate key")) {
        throw error;
      }

      // Test ad display logic for premium user
      const shouldShowAds = await subscriptionService.shouldShowAds(mockPremiumUserId);

      this.addResult({
        testName: "Subscription-Ad Integration",
        passed: !shouldShowAds, // Premium users should NOT see ads
        message: shouldShowAds ? "ERROR: Premium users are seeing ads" : "Premium users correctly skip ads",
        details: { shouldShowAds, userTier: "premium" },
      });
    } catch (error) {
      this.addResult({
        testName: "Subscription-Ad Integration",
        passed: false,
        message: `Subscription-ad integration test failed: ${error}`,
      });
    }
  }

  /**
   * Test webhook handling (mock)
   */
  private async testWebhookHandling(): Promise<void> {
    try {
      // Test webhook event processing with mock data
      const mockWebhookEvent = {
        type: "INITIAL_PURCHASE",
        app_user_id: "test-webhook-user",
        product_id: "premium_monthly",
        entitlement_ids: ["premium"],
        purchased_at_ms: Date.now(),
        expiration_at_ms: Date.now() + 30 * 24 * 60 * 60 * 1000,
      };

      await subscriptionService.handleWebhookEvent("INITIAL_PURCHASE", mockWebhookEvent);

      this.addResult({
        testName: "Webhook Handling",
        passed: true,
        message: "Webhook processing completed successfully",
        details: { eventType: "INITIAL_PURCHASE" },
      });
    } catch (error) {
      this.addResult({
        testName: "Webhook Handling",
        passed: false,
        message: `Webhook handling failed: ${error}`,
      });
    }
  }

  /**
   * Add test result
   */
  private addResult(result: IntegrationTestResult): void {
    this.results.push(result);
    const status = result.passed ? "✅" : "❌";
    console.log(`${status} ${result.testName}: ${result.message}`);
  }

  /**
   * Generate comprehensive test report
   */
  private generateReport(): IntegrationTestReport {
    const totalTests = this.results.length;
    const passedTests = this.results.filter((r) => r.passed).length;
    const failedTests = totalTests - passedTests;
    const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

    const recommendations: string[] = [];

    // Generate recommendations based on failed tests
    this.results.forEach((result) => {
      if (!result.passed) {
        switch (result.testName) {
          case "Database Connectivity":
            recommendations.push("Check Supabase configuration and run database migrations");
            break;
          case "Subscription Service":
            recommendations.push("Verify subscription service implementation and database schema");
            break;
          case "AdMob Integration":
            recommendations.push("Check AdMob configuration and build environment");
            break;
          case "Subscription-Ad Integration":
            recommendations.push("Fix subscription status checking in ad display logic");
            break;
          case "Webhook Handling":
            recommendations.push("Review webhook handler implementation");
            break;
        }
      }
    });

    if (successRate < 100) {
      recommendations.push("Run individual component tests to isolate issues");
      recommendations.push("Check environment variables and configuration files");
    }

    return {
      summary: {
        totalTests,
        passedTests,
        failedTests,
        successRate: Math.round(successRate * 100) / 100,
      },
      results: this.results,
      recommendations,
    };
  }
}

/**
 * Utility function to run integration tests
 */
export const runMonetizationIntegrationTests = async (): Promise<IntegrationTestReport> => {
  const tester = new MonetizationIntegrationTest();
  return await tester.runAllTests();
};

/**
 * Print test report to console
 */
export const printIntegrationTestReport = (report: IntegrationTestReport): void => {
  console.log("\n📊 MONETIZATION INTEGRATION TEST REPORT");
  console.log("==========================================");
  console.log(`Total Tests: ${report.summary.totalTests}`);
  console.log(`Passed: ${report.summary.passedTests}`);
  console.log(`Failed: ${report.summary.failedTests}`);
  console.log(`Success Rate: ${report.summary.successRate}%`);

  if (report.summary.failedTests > 0) {
    console.log("\n❌ Failed Tests:");
    report.results
      .filter((r) => !r.passed)
      .forEach((result) => {
        console.log(`  - ${result.testName}: ${result.message}`);
      });
  }

  if (report.recommendations.length > 0) {
    console.log("\n💡 Recommendations:");
    report.recommendations.forEach((rec) => {
      console.log(`  - ${rec}`);
    });
  }

  console.log("\n==========================================\n");
};
