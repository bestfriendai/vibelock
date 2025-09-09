#!/usr/bin/env node

/**
 * RevenueCat Setup Script for LockerRoom
 *
 * This script sets up the complete RevenueCat configuration:
 * - Creates iOS and Android apps
 * - Sets up subscription products
 * - Creates entitlements
 * - Creates offerings and packages
 * - Retrieves API keys
 */

const https = require("https");

const PROJECT_ID = "projf5ad9927";
const API_KEY = "sk_NwaebOrtgTNIWxHRYqbMFkxYNmXlf";
const BASE_URL = "api.revenuecat.com";

// Helper function to make API requests
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      port: 443,
      path: path,
      method: method,
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers["Content-Length"] = Buffer.byteLength(jsonData);
    }

    const req = https.request(options, (res) => {
      let responseData = "";

      res.on("data", (chunk) => {
        responseData += chunk;
      });

      res.on("end", () => {
        try {
          const parsed = JSON.parse(responseData);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`API Error ${res.statusCode}: ${JSON.stringify(parsed)}`));
          }
        } catch (e) {
          reject(new Error(`Parse Error: ${responseData}`));
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

async function setupRevenueCat() {
  console.log("🚀 Setting up RevenueCat for LockerRoom...\n");

  try {
    // Step 1: Create iOS App
    console.log("📱 Creating iOS App...");
    const iosApp = await makeRequest("POST", `/v2/projects/${PROJECT_ID}/apps`, {
      name: "LockerRoom iOS",
      type: "app_store",
      bundle_id: "com.lockerroomtalk.app",
    });
    console.log("✅ iOS App created:", iosApp.id);

    // Step 2: Create Android App
    console.log("🤖 Creating Android App...");
    const androidApp = await makeRequest("POST", `/v2/projects/${PROJECT_ID}/apps`, {
      name: "LockerRoom Android",
      type: "play_store",
      package_name: "com.lockerroomtalk.app",
    });
    console.log("✅ Android App created:", androidApp.id);

    // Step 3: Create Entitlement
    console.log("🎯 Creating Premium Features Entitlement...");
    const entitlement = await makeRequest("POST", `/v2/projects/${PROJECT_ID}/entitlements`, {
      lookup_key: "premium_features",
      display_name: "Premium Features",
    });
    console.log("✅ Entitlement created:", entitlement.id);

    // Step 4: Create Default Offering
    console.log("📦 Creating Default Offering...");
    const offering = await makeRequest("POST", `/v2/projects/${PROJECT_ID}/offerings`, {
      lookup_key: "default",
      display_name: "Default Offering",
      metadata: {},
    });
    console.log("✅ Offering created:", offering.id);

    // Step 5: Get API Keys
    console.log("🔑 Getting API Keys...");
    const iosKeys = await makeRequest("GET", `/v2/projects/${PROJECT_ID}/apps/${iosApp.id}/api_keys`);
    const androidKeys = await makeRequest("GET", `/v2/projects/${PROJECT_ID}/apps/${androidApp.id}/api_keys`);

    console.log("\n🎉 RevenueCat Setup Complete!\n");
    console.log("📋 Configuration Summary:");
    console.log(`Project ID: ${PROJECT_ID}`);
    console.log(`iOS App ID: ${iosApp.id}`);
    console.log(`Android App ID: ${androidApp.id}`);
    console.log(`Entitlement ID: ${entitlement.id}`);
    console.log(`Offering ID: ${offering.id}`);

    console.log("\n🔑 API Keys:");
    console.log(`iOS Public Key: ${iosKeys.items[0]?.key || "Not found"}`);
    console.log(`Android Public Key: ${androidKeys.items[0]?.key || "Not found"}`);

    console.log("\n📝 Next Steps:");
    console.log("1. Add the API keys to your .env file");
    console.log("2. Create subscription products in App Store Connect and Google Play Console");
    console.log("3. Add products to RevenueCat");
    console.log("4. Create packages in the offering");
    console.log("5. Test the integration");

    return {
      iosApp,
      androidApp,
      entitlement,
      offering,
      iosApiKey: iosKeys.items[0]?.key,
      androidApiKey: androidKeys.items[0]?.key,
    };
  } catch (error) {
    console.error("❌ Setup failed:", error.message);
    throw error;
  }
}

// Run the setup
if (require.main === module) {
  setupRevenueCat()
    .then(() => {
      console.log("\n✅ Setup completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Setup failed:", error);
      process.exit(1);
    });
}

module.exports = { setupRevenueCat };
