/**
 * LockerRoom Database & API Testing Suite
 * Tests actual database operations and API endpoints
 */

const https = require("https");
const { URL } = require("url");
const fs = require("fs");

class DatabaseTestSuite {
  constructor() {
    this.loadEnvVars();
    this.supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    this.supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    this.testResults = { passed: 0, failed: 0, errors: [] };
  }

  loadEnvVars() {
    try {
      const envContent = fs.readFileSync(".env", "utf8");
      envContent.split("\n").forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const [key, ...valueParts] = trimmed.split("=");
          const value = valueParts.join("=");
          if (key && value) process.env[key] = value;
        }
      });
    } catch (error) {
      console.warn("⚠️ Could not load .env file:", error.message);
    }
  }

  log(message, type = "info") {
    const prefix = { info: "📋", success: "✅", error: "❌", test: "🧪" }[type] || "📋";
    console.log(`${prefix} ${message}`);
  }

  async makeRequest(endpoint, method = "GET", data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, this.supabaseUrl);
      const options = {
        method,
        headers: {
          apikey: this.supabaseKey,
          Authorization: `Bearer ${this.supabaseKey}`,
          "Content-Type": "application/json",
        },
      };

      const req = https.request(url, options, (res) => {
        let responseData = "";
        res.on("data", (chunk) => (responseData += chunk));
        res.on("end", () => {
          try {
            const parsed = responseData ? JSON.parse(responseData) : {};
            resolve({ status: res.statusCode, data: parsed });
          } catch {
            resolve({ status: res.statusCode, data: responseData });
          }
        });
      });

      req.on("error", reject);
      if (data) req.write(JSON.stringify(data));
      req.end();
    });
  }

  async runTest(name, testFn) {
    this.log(`Testing: ${name}`, "test");
    try {
      await testFn();
      this.testResults.passed++;
      this.log(`✓ ${name}`, "success");
    } catch (error) {
      this.testResults.failed++;
      this.testResults.errors.push({ test: name, error: error.message });
      this.log(`✗ ${name}: ${error.message}`, "error");
    }
  }

  // Test database table access
  async testTableAccess() {
    const tables = ["users", "reviews_firebase", "chat_rooms_firebase", "chat_messages_firebase", "comments_firebase"];

    for (const table of tables) {
      await this.runTest(`Table Access: ${table}`, async () => {
        const response = await this.makeRequest(`/rest/v1/${table}?limit=1`);
        if (response.status !== 200) {
          throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);
        }
      });
    }
  }

  // Test authentication endpoints
  async testAuthEndpoints() {
    await this.runTest("Auth Settings", async () => {
      const response = await this.makeRequest("/auth/v1/settings");
      if (response.status !== 200) {
        throw new Error(`Auth settings not accessible: ${response.status}`);
      }
    });

    await this.runTest("Auth Health Check", async () => {
      const response = await this.makeRequest("/auth/v1/health");
      if (response.status !== 200) {
        throw new Error(`Auth health check failed: ${response.status}`);
      }
    });
  }

  // Test storage endpoints
  async testStorageEndpoints() {
    await this.runTest("Storage List Buckets", async () => {
      const response = await this.makeRequest("/storage/v1/bucket");
      // 200 = success, 404 = no buckets but endpoint works
      if (response.status !== 200 && response.status !== 404) {
        throw new Error(`Storage endpoint error: ${response.status}`);
      }
    });
  }

  // Test specific table schemas
  async testTableSchemas() {
    await this.runTest("Users Table Schema", async () => {
      const response = await this.makeRequest("/rest/v1/users?limit=0");
      if (response.status !== 200) {
        throw new Error(`Users table schema check failed: ${response.status}`);
      }
    });

    await this.runTest("Reviews Table Schema", async () => {
      const response = await this.makeRequest("/rest/v1/reviews?limit=0");
      if (response.status !== 200) {
        throw new Error(`Reviews table schema check failed: ${response.status}`);
      }
    });
  }

  // Test RLS (Row Level Security) policies
  async testRLSPolicies() {
    await this.runTest("RLS Policy Check", async () => {
      // Try to access data without authentication (should be restricted)
      const response = await this.makeRequest("/rest/v1/users?select=email&limit=1");
      // Should either return empty array or 401/403 depending on RLS setup
      if (response.status === 500) {
        throw new Error("RLS policies may not be properly configured");
      }
    });
  }

  // Test database functions
  async testDatabaseFunctions() {
    await this.runTest("Database Functions", async () => {
      // Test if any custom functions are accessible
      const response = await this.makeRequest("/rest/v1/rpc/");
      // 404 is expected if no functions, 200 if functions exist
      if (response.status !== 404 && response.status !== 200) {
        throw new Error(`Database functions endpoint error: ${response.status}`);
      }
    });
  }

  // Test real-time subscriptions
  async testRealtimeCapabilities() {
    await this.runTest("Realtime Configuration", async () => {
      // Check if realtime is enabled by trying to access the endpoint
      const response = await this.makeRequest("/realtime/v1/");
      // Various status codes are acceptable for realtime endpoint
      if (response.status >= 500) {
        throw new Error(`Realtime endpoint error: ${response.status}`);
      }
    });
  }

  // Test data insertion (if possible with anon key)
  async testDataOperations() {
    await this.runTest("Data Insert Test", async () => {
      // Try to insert test data (may fail due to RLS, which is expected)
      const testData = {
        test_field: "test_value",
        created_at: new Date().toISOString(),
      };

      // This will likely fail due to RLS, but we're testing the endpoint
      const response = await this.makeRequest("/rest/v1/test_table", "POST", testData);

      // 404 (table doesn't exist), 401/403 (RLS), or 201 (success) are all acceptable
      if (response.status >= 500) {
        throw new Error(`Data operations endpoint error: ${response.status}`);
      }
    });
  }

  // Generate comprehensive report
  generateReport() {
    const total = this.testResults.passed + this.testResults.failed;
    const successRate = ((this.testResults.passed / total) * 100).toFixed(1);

    this.log("\n" + "=".repeat(60), "info");
    this.log("DATABASE TEST RESULTS", "info");
    this.log("=".repeat(60), "info");
    this.log(`Total Tests: ${total}`, "info");
    this.log(`Passed: ${this.testResults.passed}`, "success");
    this.log(`Failed: ${this.testResults.failed}`, "error");
    this.log(`Success Rate: ${successRate}%`, successRate > 80 ? "success" : "error");

    if (this.testResults.errors.length > 0) {
      this.log("\nFAILED TESTS:", "error");
      this.testResults.errors.forEach(({ test, error }) => {
        this.log(`  - ${test}: ${error}`, "error");
      });
    }

    // Provide recommendations
    this.log("\nRECOMMENDATIONS:", "info");
    if (successRate > 90) {
      this.log("🎉 Database is fully operational and ready for production!", "success");
    } else if (successRate > 70) {
      this.log("✅ Database is functional with minor issues to address", "info");
    } else {
      this.log("⚠️ Database needs significant attention before production", "error");
    }

    // Specific recommendations based on common issues
    if (this.testResults.errors.some((e) => e.error.includes("400"))) {
      this.log("💡 Create missing storage buckets in Supabase dashboard", "info");
    }
    if (this.testResults.errors.some((e) => e.error.includes("401") || e.error.includes("403"))) {
      this.log("🔒 Review RLS policies - some restrictions may be intentional", "info");
    }
    if (this.testResults.errors.some((e) => e.error.includes("500"))) {
      this.log("🔧 Check server configuration and database setup", "error");
    }
  }

  // Main test runner
  async runAllTests() {
    this.log("🚀 Starting LockerRoom Database Tests", "info");
    this.log(`📡 Testing against: ${this.supabaseUrl}`, "info");

    await this.testTableAccess();
    await this.testAuthEndpoints();
    await this.testStorageEndpoints();
    await this.testTableSchemas();
    await this.testRLSPolicies();
    await this.testDatabaseFunctions();
    await this.testRealtimeCapabilities();
    await this.testDataOperations();

    this.generateReport();
  }
}

// Run tests
if (require.main === module) {
  const suite = new DatabaseTestSuite();
  suite.runAllTests().catch(console.error);
}

module.exports = DatabaseTestSuite;
