// Comprehensive Supabase Integration Test Suite
import {
  supabaseAuth,
  supabaseUsers,
  supabaseReviews,
  supabaseChat,
  supabaseStorage,
  supabaseSearch,
} from "../services/supabase";
import supabase from "../config/supabase";
import { storageService } from "../services/storageService";
import { enhancedRealtimeChatService } from "../services/realtimeChat";
import { AppError, parseSupabaseError } from "./errorHandling";

export interface TestResult {
  name: string;
  success: boolean;
  message: string;
  duration: number;
  error?: any;
}

export interface TestSuiteResult {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: TestResult[];
  duration: number;
}

class SupabaseTestSuite {
  private results: TestResult[] = [];
  private startTime: number = 0;

  // Run all tests
  async runAllTests(): Promise<TestSuiteResult> {
    this.startTime = Date.now();
    this.results = [];

    // Connection Tests
    await this.testBasicConnection();
    await this.testDatabaseSchema();

    // Authentication Tests
    await this.testAuthService();

    // Database Operation Tests
    await this.testUserOperations();
    await this.testReviewOperations();
    await this.testChatOperations();

    // Real-time Tests
    await this.testRealtimeSubscriptions();

    // Storage Tests
    await this.testStorageOperations();

    // Error Handling Tests
    await this.testErrorHandling();

    const duration = Date.now() - this.startTime;
    const passedTests = this.results.filter((r) => r.success).length;
    const failedTests = this.results.filter((r) => !r.success).length;

    const summary: TestSuiteResult = {
      totalTests: this.results.length,
      passedTests,
      failedTests,
      results: this.results,
      duration,
    };

    return summary;
  }

  // Test basic connection
  private async testBasicConnection() {
    await this.runTest("Basic Connection", async () => {
      const { data, error } = await supabase.from("users").select("id").limit(1);
      if (error) throw error;
      return "Connection successful";
    });
  }

  // Test database schema
  private async testDatabaseSchema() {
    await this.runTest("Database Schema", async () => {
      const requiredTables = [
        "users",
        "reviews_firebase",
        "comments_firebase",
        "chat_rooms_firebase",
        "chat_messages_firebase",
        "notifications",
        "push_tokens",
        "reports",
      ];

      for (const table of requiredTables) {
        const { data, error } = await (supabase as any).from(table).select("*").limit(1);
        if (error) throw new Error(`Table ${table} not accessible: ${error.message}`);
      }

      return `All ${requiredTables.length} required tables accessible`;
    });
  }

  // Test authentication service
  private async testAuthService() {
    await this.runTest("Auth Service - Get Session", async () => {
      const session = await supabaseAuth.getSession();
      return session ? "Session found" : "No active session";
    });

    await this.runTest("Auth Service - Get User", async () => {
      const user = await supabaseAuth.getUser();
      return user ? `User found: ${user.email}` : "No authenticated user";
    });
  }

  // Test user operations
  private async testUserOperations() {
    await this.runTest("User Operations - Get Profile", async () => {
      const user = await supabaseAuth.getUser();
      if (!user) return "No user to test with";

      const profile = await supabaseUsers.getProfile(user.id);
      return profile ? "Profile retrieved" : "No profile found";
    });
  }

  // Test review operations
  private async testReviewOperations() {
    await this.runTest("Review Operations - Get Reviews", async () => {
      const reviews = await supabaseReviews.getReviews();
      return `Retrieved ${reviews.data?.length || 0} reviews`;
    });

    await this.runTest("Review Operations - Search Reviews", async () => {
      const results = await supabaseSearch.searchReviews("test", {});
      return `Search returned ${(results as any).data?.length || 0} results`;
    });

    await this.runTest("Review Operations - Media Validation", async () => {
      const reviews = await supabaseReviews.getReviews();
      let validMediaCount = 0;
      let totalMediaCount = 0;
      let fileUriCount = 0;

      for (const review of reviews.data || []) {
        if (review.media && Array.isArray(review.media)) {
          for (const mediaItem of review.media) {
            totalMediaCount++;
            if (mediaItem.uri && mediaItem.uri.startsWith("https://")) {
              validMediaCount++;
            } else if (mediaItem.uri && mediaItem.uri.startsWith("file://")) {
              fileUriCount++;
            }
          }
        }
      }

      return `Media validation: ${validMediaCount}/${totalMediaCount} valid URLs, ${fileUriCount} legacy file:// URIs`;
    });
  }

  // Test chat operations
  private async testChatOperations() {
    await this.runTest("Chat Operations - Get Rooms", async () => {
      const rooms = await supabaseChat.getRooms("test-user");
      return `Retrieved ${rooms.length} chat rooms`;
    });
  }

  // Test real-time subscriptions
  private async testRealtimeSubscriptions() {
    await this.runTest("Real-time - Initialize Service", async () => {
      await enhancedRealtimeChatService.initialize();
      return "Real-time service initialized";
    });

    await this.runTest("Real-time - Channel Creation", async () => {
      const testChannel = supabase.channel("test-channel");
      await testChannel.subscribe();
      await supabase.removeChannel(testChannel);
      return "Test channel created and removed";
    });

    await this.runTest("Real-time - Service Cleanup", async () => {
      await enhancedRealtimeChatService.cleanup();
      return "Real-time service cleaned up successfully";
    });
  }

  // Test storage operations
  private async testStorageOperations() {
    await this.runTest("Storage - Get Buckets", async () => {
      const buckets = storageService.getBuckets();
      return `Available buckets: ${Object.values(buckets).join(", ")}`;
    });

    await this.runTest("Storage - Upload Test Image", async () => {
      try {
        // Create a simple test blob (1x1 pixel PNG)
        const testImageData =
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
        const response = await fetch(testImageData);
        const blob = await response.blob();

        const filename = `test-images/test_${Date.now()}.png`;
        const uploadedUrl = await supabaseStorage.uploadFile("review-images", filename, blob);

        if (uploadedUrl && typeof uploadedUrl === "string" && (uploadedUrl as string).startsWith("https://")) {
          return `Upload successful: ${uploadedUrl}`;
        } else {
          throw new Error("Invalid URL returned");
        }
      } catch (error) {
        throw new Error(`Upload failed: ${error}`);
      }
    });

    await this.runTest("Storage - Public URL Generation", async () => {
      const url = storageService.getPublicUrl("avatars", "test/test.jpg");
      if (!url.includes("supabase.co")) throw new Error("Invalid URL format");
      return "Public URL generated correctly";
    });
  }

  // Test error handling
  private async testErrorHandling() {
    await this.runTest("Error Handling - Parse Network Error", async () => {
      const networkError = { name: "TypeError", message: "Network request failed" };
      const appError = parseSupabaseError(networkError);
      if (appError.type !== "NETWORK") throw new Error("Network error not parsed correctly");
      return "Network error parsed correctly";
    });

    await this.runTest("Error Handling - Parse Auth Error", async () => {
      const authError = { status: 401, message: "Unauthorized" };
      const appError = parseSupabaseError(authError);
      if (appError.type !== "AUTH") throw new Error("Auth error not parsed correctly");
      return "Auth error parsed correctly";
    });
  }

  // Helper method to run individual tests
  private async runTest(name: string, testFn: () => Promise<string>) {
    const startTime = Date.now();
    try {
      const message = await testFn();
      const duration = Date.now() - startTime;

      this.results.push({
        name,
        success: true,
        message,
        duration,
      });

      console.log(`✅ ${name} (${duration}ms): ${message}`);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.results.push({
        name,
        success: false,
        message: errorMessage,
        duration,
        error,
      });

      console.error(`❌ ${name} (${duration}ms): ${errorMessage}`);
    }
  }

  // Get test results summary
  getResultsSummary(): string {
    const passed = this.results.filter((r) => r.success).length;
    const failed = this.results.filter((r) => !r.success).length;
    const total = this.results.length;

    let summary = `\n🧪 Test Results Summary:\n`;
    summary += `Total Tests: ${total}\n`;
    summary += `Passed: ${passed} ✅\n`;
    summary += `Failed: ${failed} ❌\n`;
    summary += `Success Rate: ${((passed / total) * 100).toFixed(1)}%\n\n`;

    if (failed > 0) {
      summary += `Failed Tests:\n`;
      this.results
        .filter((r) => !r.success)
        .forEach((r) => {
          summary += `- ${r.name}: ${r.message}\n`;
        });
    }

    return summary;
  }

  // Run quick health check
  async quickHealthCheck(): Promise<boolean> {
    try {
      // Test basic connection
      const { error } = await supabase.from("users").select("id").limit(1);
      if (error) throw error;

      // Test auth service
      await supabaseAuth.getSession();

      // Test real-time
      const testChannel = supabase.channel("health-check");
      await testChannel.subscribe();
      await supabase.removeChannel(testChannel);

      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const supabaseTestSuite = new SupabaseTestSuite();
export default supabaseTestSuite;
