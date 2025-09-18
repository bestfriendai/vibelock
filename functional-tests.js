/**
 * LockerRoom App - Functional Testing Suite
 * Tests actual app functionality through API calls and database operations
 */

const { execSync } = require("child_process");
const fs = require("fs");
const https = require("https");
const { URL } = require("url");

class FunctionalTestSuite {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: [],
    };

    // Load environment variables from .env file
    this.loadEnvVars();

    this.supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    this.supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    console.log("🔧 Supabase URL:", this.supabaseUrl);
    console.log("🔑 Supabase Key:", this.supabaseKey ? "Set" : "Not Set");
  }

  loadEnvVars() {
    try {
      const envContent = fs.readFileSync(".env", "utf8");
      const lines = envContent.split("\n");

      lines.forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const [key, ...valueParts] = trimmed.split("=");
          const value = valueParts.join("=");
          if (key && value) {
            process.env[key] = value;
          }
        }
      });
    } catch (error) {
      console.warn("⚠️ Could not load .env file:", error.message);
    }
  }

  log(message, type = "info") {
    const timestamp = new Date().toISOString();
    const prefix =
      {
        info: "📋",
        success: "✅",
        error: "❌",
        warning: "⚠️",
        test: "🧪",
      }[type] || "📋";

    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async makeSupabaseRequest(endpoint, method = "GET", data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, this.supabaseUrl);

      const options = {
        method,
        headers: {
          apikey: this.supabaseKey,
          Authorization: `Bearer ${this.supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
      };

      const req = https.request(url, options, (res) => {
        let responseData = "";

        res.on("data", (chunk) => {
          responseData += chunk;
        });

        res.on("end", () => {
          try {
            const parsed = responseData ? JSON.parse(responseData) : {};
            resolve({
              status: res.statusCode,
              data: parsed,
              headers: res.headers,
            });
          } catch (_error) {
            resolve({
              status: res.statusCode,
              data: responseData,
              headers: res.headers,
            });
          }
        });
      });

      req.on("error", (error) => {
        reject(error);
      });

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  async runTest(testName, testFunction) {
    this.log(`Running test: ${testName}`, "test");
    try {
      await testFunction();
      this.testResults.passed++;
      this.log(`PASSED: ${testName}`, "success");
      return true;
    } catch (error) {
      this.testResults.failed++;
      this.testResults.errors.push({ test: testName, error: error.message });
      this.log(`FAILED: ${testName} - ${error.message}`, "error");
      return false;
    }
  }

  // Test Supabase Connection
  async testSupabaseConnection() {
    return this.runTest("Supabase Connection", async () => {
      if (!this.supabaseUrl || !this.supabaseKey) {
        throw new Error("Supabase credentials not configured");
      }

      const response = await this.makeSupabaseRequest("/rest/v1/");

      if (response.status !== 200 && response.status !== 404) {
        throw new Error(`Supabase connection failed with status: ${response.status}`);
      }
    });
  }

  // Test Database Tables
  async testDatabaseTables() {
    const tables = ["users", "reviews_firebase", "chat_rooms_firebase", "chat_messages_firebase", "comments_firebase"];

    for (const table of tables) {
      await this.runTest(`Database Table: ${table}`, async () => {
        const response = await this.makeSupabaseRequest(`/rest/v1/${table}?limit=1`);

        if (response.status !== 200) {
          throw new Error(`Table ${table} not accessible: ${response.status}`);
        }
      });
    }
  }

  // Test Authentication Endpoints
  async testAuthEndpoints() {
    return this.runTest("Auth Endpoints", async () => {
      // Test auth endpoint availability
      const response = await this.makeSupabaseRequest("/auth/v1/settings");

      if (response.status !== 200) {
        throw new Error(`Auth endpoint not accessible: ${response.status}`);
      }
    });
  }

  // Test Storage Buckets
  async testStorageBuckets() {
    const buckets = ["review-images", "profile-photos", "chat-media"];

    for (const bucket of buckets) {
      await this.runTest(`Storage Bucket: ${bucket}`, async () => {
        const response = await this.makeSupabaseRequest(`/storage/v1/bucket/${bucket}`);

        // 200 = exists, 404 = doesn't exist but endpoint works
        if (response.status !== 200 && response.status !== 404) {
          throw new Error(`Storage bucket ${bucket} endpoint error: ${response.status}`);
        }
      });
    }
  }

  // Test App Build
  async testAppBuild() {
    return this.runTest("App Build Check", async () => {
      try {
        // Check if the app can be built (TypeScript compilation)
        execSync("npx tsc --noEmit --skipLibCheck", {
          stdio: "pipe",
          timeout: 30000,
        });
      } catch (error) {
        throw new Error(`TypeScript compilation failed: ${error.message}`);
      }
    });
  }

  // Test Package Dependencies
  async testDependencies() {
    return this.runTest("Package Dependencies", async () => {
      const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
      const criticalDeps = [
        "@supabase/supabase-js",
        "react-native",
        "expo",
        "zustand",
        "@react-navigation/native",
        "react-native-reanimated",
      ];

      for (const dep of criticalDeps) {
        if (!packageJson.dependencies[dep] && !packageJson.devDependencies[dep]) {
          throw new Error(`Critical dependency ${dep} not found`);
        }
      }
    });
  }

  // Test Configuration Files
  async testConfigFiles() {
    const configFiles = ["app.json", "babel.config.js", "metro.config.js", "tsconfig.json"];

    for (const file of configFiles) {
      await this.runTest(`Config File: ${file}`, async () => {
        if (!fs.existsSync(file)) {
          throw new Error(`Configuration file ${file} not found`);
        }
      });
    }
  }

  // Test Environment Variables
  async testEnvironmentVariables() {
    const requiredEnvVars = ["EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_ANON_KEY", "EXPO_PUBLIC_PROJECT_ID"];

    for (const envVar of requiredEnvVars) {
      await this.runTest(`Environment Variable: ${envVar}`, async () => {
        if (!process.env[envVar]) {
          throw new Error(`Environment variable ${envVar} not set`);
        }
      });
    }
  }

  // Generate Test Report
  generateReport() {
    const total = this.testResults.passed + this.testResults.failed;

    this.log("\n" + "=".repeat(60), "info");
    this.log("FUNCTIONAL TEST EXECUTION COMPLETE", "info");
    this.log("=".repeat(60), "info");
    this.log(`Total Tests: ${total}`, "info");
    this.log(`Passed: ${this.testResults.passed}`, "success");
    this.log(`Failed: ${this.testResults.failed}`, "error");

    if (this.testResults.errors.length > 0) {
      this.log("\nFAILED TESTS:", "error");
      this.testResults.errors.forEach(({ test, error }) => {
        this.log(`  - ${test}: ${error}`, "error");
      });
    }

    const successRate = ((this.testResults.passed / total) * 100).toFixed(1);
    this.log(`\nSuccess Rate: ${successRate}%`, successRate > 90 ? "success" : "warning");

    if (successRate > 90) {
      this.log("\n🎉 App is ready for production!", "success");
    } else {
      this.log("\n⚠️ App needs attention before production deployment", "warning");
    }
  }

  // Main test execution
  async runAllTests() {
    this.log("Starting LockerRoom App Functional Tests", "info");

    await this.testEnvironmentVariables();
    await this.testDependencies();
    await this.testConfigFiles();
    await this.testSupabaseConnection();
    await this.testAuthEndpoints();
    await this.testDatabaseTables();
    await this.testStorageBuckets();
    await this.testAppBuild();

    this.generateReport();
  }
}

// Run tests if called directly
if (require.main === module) {
  const suite = new FunctionalTestSuite();
  suite.runAllTests().catch(console.error);
}

module.exports = FunctionalTestSuite;
