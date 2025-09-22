import { authService } from "../services/auth";
import supabase from "../config/supabase";
import { Alert } from "react-native";

interface TestResult {
  testName: string;
  success: boolean;
  error?: string;
  data?: any;
  duration: number;
}

class SupabaseAuthTester {
  private results: TestResult[] = [];
  private testEmail = `test+${Date.now()}@lockerroom.app`;
  private testPassword = "TestPassword123!";

  async runAllTests(): Promise<TestResult[]> {
    console.log("🧪 Starting Supabase Authentication Tests...");
    this.results = [];

    // Test connection first
    await this.testConnection();

    // Test authentication flow
    await this.testSignUp();
    await this.testSignIn();
    await this.testGetSession();
    await this.testRefreshSession();
    await this.testResetPassword();
    await this.testSignOut();

    // Test error cases
    await this.testInvalidSignIn();
    await this.testInvalidSignUp();

    // Test OAuth (will fail in test but we can check the method exists)
    await this.testOAuthSetup();

    this.printResults();
    return this.results;
  }

  private async runTest(testName: string, testFn: () => Promise<any>): Promise<void> {
    const startTime = Date.now();
    try {
      console.log(`🔍 Testing: ${testName}`);
      const data = await testFn();
      const duration = Date.now() - startTime;

      this.results.push({
        testName,
        success: true,
        data,
        duration,
      });

      console.log(`✅ ${testName} - PASSED (${duration}ms)`);
    } catch (error: any) {
      const duration = Date.now() - startTime;

      this.results.push({
        testName,
        success: false,
        error: error.message || error.toString(),
        duration,
      });

      console.log(`❌ ${testName} - FAILED (${duration}ms):`, error.message);
    }
  }

  private async testConnection(): Promise<void> {
    await this.runTest("Connection Test", async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error && error.message !== "Auth session missing!") {
        throw error;
      }
      return { connected: true, hasSession: !!data.session };
    });
  }

  private async testSignUp(): Promise<void> {
    await this.runTest("Sign Up", async () => {
      const result = await authService.signUp(this.testEmail, this.testPassword, "TestUser");

      if (!result.user) {
        throw new Error("No user returned from signup");
      }

      // Check if email confirmation is required
      const emailConfirmationRequired = !result.user.email_confirmed_at;

      return {
        userId: result.user.id,
        email: result.user.email,
        emailConfirmed: !!result.user.email_confirmed_at,
        emailConfirmationRequired,
        session: !!result.session,
      };
    });
  }

  private async testSignIn(): Promise<void> {
    await this.runTest("Sign In", async () => {
      // Wait a moment for signup to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const result = await authService.signIn(this.testEmail, this.testPassword);

      if (!result.user || !result.session) {
        throw new Error("Sign in failed - no user or session returned");
      }

      return {
        userId: result.user.id,
        email: result.user.email,
        sessionId: result.session.access_token.substring(0, 20) + "...",
        emailConfirmed: !!result.user.email_confirmed_at,
      };
    });
  }

  private async testGetSession(): Promise<void> {
    await this.runTest("Get Session", async () => {
      const session = await authService.getSession();

      if (!session) {
        throw new Error("No active session found");
      }

      return {
        hasSession: true,
        userId: session.user.id,
        expiresAt: session.expires_at,
      };
    });
  }

  private async testRefreshSession(): Promise<void> {
    await this.runTest("Refresh Session", async () => {
      const session = await authService.refreshSession();

      if (!session) {
        throw new Error("Session refresh failed");
      }

      return {
        refreshed: true,
        userId: session.user.id,
        newExpiresAt: session.expires_at,
      };
    });
  }

  private async testResetPassword(): Promise<void> {
    await this.runTest("Reset Password", async () => {
      await authService.resetPassword(this.testEmail);
      return { resetEmailSent: true };
    });
  }

  private async testSignOut(): Promise<void> {
    await this.runTest("Sign Out", async () => {
      await authService.signOut();

      // Verify we're signed out
      const session = await authService.getSession();
      if (session) {
        throw new Error("Session still exists after sign out");
      }

      return { signedOut: true };
    });
  }

  private async testInvalidSignIn(): Promise<void> {
    await this.runTest("Invalid Sign In", async () => {
      try {
        await authService.signIn("invalid@email.com", "wrongpassword");
        throw new Error("Expected sign in to fail with invalid credentials");
      } catch (error: any) {
        // This should fail - that's expected
        if (
          error.message.includes("Invalid login credentials") ||
          error.message.includes("Email/Password is incorrect")
        ) {
          return { expectedError: true, errorMessage: error.message };
        }
        throw error;
      }
    });
  }

  private async testInvalidSignUp(): Promise<void> {
    await this.runTest("Invalid Sign Up", async () => {
      try {
        await authService.signUp("invalid-email", "weak");
        throw new Error("Expected sign up to fail with invalid data");
      } catch (error: any) {
        // This should fail - that's expected
        if (error.message.includes("email") || error.message.includes("password")) {
          return { expectedError: true, errorMessage: error.message };
        }
        throw error;
      }
    });
  }

  private async testOAuthSetup(): Promise<void> {
    await this.runTest("OAuth Setup", async () => {
      // Just test that the method exists and doesn't crash immediately
      try {
        // This will fail in React Native but we can check the method exists
        const result = await authService.signInWithOAuth("google" as any);
        return { oauthAvailable: true };
      } catch (error: any) {
        // Expected to fail in React Native environment
        if (error.message.includes("window") || error.message.includes("location")) {
          return { oauthMethodExists: true, expectedError: "React Native environment" };
        }
        throw error;
      }
    });
  }

  private printResults(): void {
    console.log("\n📊 Test Results Summary:");
    console.log("========================");

    const passed = this.results.filter((r) => r.success).length;
    const failed = this.results.filter((r) => r.success === false).length;
    const totalTime = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏱️  Total Time: ${totalTime}ms`);
    console.log(`📧 Test Email: ${this.testEmail}`);

    if (failed > 0) {
      console.log("\n❌ Failed Tests:");
      this.results
        .filter((r) => !r.success)
        .forEach((r) => {
          console.log(`  - ${r.testName}: ${r.error}`);
        });
    }

    console.log("\n🔍 Detailed Results:");
    this.results.forEach((r) => {
      console.log(`  ${r.success ? "✅" : "❌"} ${r.testName} (${r.duration}ms)`);
      if (r.data) {
        console.log(`    Data:`, JSON.stringify(r.data, null, 2));
      }
      if (r.error) {
        console.log(`    Error: ${r.error}`);
      }
    });
  }

  // Method to run a quick connection test
  async quickConnectionTest(): Promise<boolean> {
    try {
      const { error } = await supabase.auth.getSession();
      if (error && error.message !== "Auth session missing!") {
        console.error("Supabase connection failed:", error);
        return false;
      }
      console.log("✅ Supabase connection successful");
      return true;
    } catch (error) {
      console.error("❌ Supabase connection failed:", error);
      return false;
    }
  }
}

export const supabaseAuthTester = new SupabaseAuthTester();

// Helper function to run tests from anywhere in the app
export const runAuthTests = async (): Promise<void> => {
  if (__DEV__) {
    try {
      await supabaseAuthTester.runAllTests();
    } catch (error) {
      console.error("Test suite failed:", error);
      Alert.alert("Test Failed", "Check console for details");
    }
  } else {
    console.warn("Auth tests only available in development mode");
  }
};

// Helper to test connection only
export const testSupabaseConnection = async (): Promise<boolean> => {
  return await supabaseAuthTester.quickConnectionTest();
};
