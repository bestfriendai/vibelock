#!/usr/bin/env node

/**
 * RevenueCat MCP Helper Script
 *
 * This script helps interact with the RevenueCat MCP server
 * to set up the complete subscription configuration.
 */

const https = require("https");

const MCP_URL = "mcp.revenuecat.ai";
const API_KEY = "sk_NwaebOrtgTNIWxHRYqbMFkxYNmXlf";

// Helper function to make MCP requests
function makeMCPRequest(method, params = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: `tools/call`,
      params: {
        name: method,
        arguments: params,
      },
    });

    const options = {
      hostname: MCP_URL,
      port: 443,
      path: "/mcp",
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        "Content-Length": Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      let responseData = "";

      res.on("data", (chunk) => {
        responseData += chunk;
      });

      res.on("end", () => {
        try {
          // Handle Server-Sent Events format
          if (responseData.startsWith("event: message\ndata: ")) {
            const jsonData = responseData.split("data: ")[1];
            const parsed = JSON.parse(jsonData);

            // Extract the actual data from the MCP response format
            if (parsed.result && parsed.result.content && parsed.result.content[0]) {
              const textContent = parsed.result.content[0].text;
              const actualData = JSON.parse(textContent);
              resolve(actualData);
            } else {
              resolve(parsed.result);
            }
          } else {
            const parsed = JSON.parse(responseData);
            if (parsed.error) {
              reject(new Error(`MCP Error: ${JSON.stringify(parsed.error)}`));
            } else {
              resolve(parsed.result);
            }
          }
        } catch (e) {
          reject(new Error(`Parse Error: ${responseData}`));
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function setupRevenueCat() {
  console.log("🚀 Setting up RevenueCat using MCP...\n");

  try {
    // Step 1: Get project details
    console.log("📋 Getting project details...");
    const projectsResponse = await makeMCPRequest("mcp_RC_get_project");
    const project = projectsResponse.items[0]; // Get the first project
    console.log("✅ Project:", project.name, `(${project.id})`);
    const projectId = project.id;

    // Step 2: List existing apps
    console.log("📱 Checking existing apps...");
    const apps = await makeMCPRequest("mcp_RC_list_apps", { project_id: projectId });
    console.log(`Found ${apps.items.length} existing apps`);

    let iosApp, androidApp;

    // Step 3: Create iOS app if it doesn't exist
    const existingIosApp = apps.items.find(
      (app) => app.type === "app_store" && app.app_store?.bundle_id === "com.lockerroomtalk.app",
    );

    if (existingIosApp) {
      console.log("✅ iOS app already exists:", existingIosApp.id);
      iosApp = existingIosApp;
    } else {
      console.log("📱 Creating iOS app...");
      iosApp = await makeMCPRequest("mcp_RC_create_app", {
        project_id: projectId,
        name: "LockerRoom iOS",
        type: "app_store",
        bundle_id: "com.lockerroomtalk.app",
      });
      console.log("✅ iOS app created:", iosApp.id);
    }

    // Step 4: Create Android app if it doesn't exist
    const existingAndroidApp = apps.items.find(
      (app) => app.type === "play_store" && app.play_store?.package_name === "com.lockerroomtalk.app",
    );

    if (existingAndroidApp) {
      console.log("✅ Android app already exists:", existingAndroidApp.id);
      androidApp = existingAndroidApp;
    } else {
      console.log("🤖 Creating Android app...");
      androidApp = await makeMCPRequest("mcp_RC_create_app", {
        project_id: projectId,
        name: "LockerRoom Android",
        type: "play_store",
        package_name: "com.lockerroomtalk.app",
      });
      console.log("✅ Android app created:", androidApp.id);
    }

    // Step 5: Create entitlement
    console.log("🎯 Checking entitlements...");
    const entitlements = await makeMCPRequest("mcp_RC_list_entitlements", { project_id: projectId });

    let premiumEntitlement = entitlements.items.find((ent) => ent.lookup_key === "premium_features");

    if (premiumEntitlement) {
      console.log("✅ Premium entitlement already exists:", premiumEntitlement.id);
    } else {
      console.log("🎯 Creating premium entitlement...");
      premiumEntitlement = await makeMCPRequest("mcp_RC_create_entitlement", {
        project_id: projectId,
        lookup_key: "premium_features",
        display_name: "Premium Features",
      });
      console.log("✅ Premium entitlement created:", premiumEntitlement.id);
    }

    // Step 6: Create offering
    console.log("📦 Checking offerings...");
    const offerings = await makeMCPRequest("mcp_RC_list_offerings", { project_id: projectId });

    let defaultOffering = offerings.items.find((off) => off.lookup_key === "default");

    if (defaultOffering) {
      console.log("✅ Default offering already exists:", defaultOffering.id);
    } else {
      console.log("📦 Creating default offering...");
      defaultOffering = await makeMCPRequest("mcp_RC_create_offering", {
        project_id: projectId,
        lookup_key: "default",
        display_name: "Default Offering",
        metadata: {},
      });
      console.log("✅ Default offering created:", defaultOffering.id);
    }

    // Step 7: Get API keys
    console.log("🔑 Getting API keys...");
    const iosKeys = await makeMCPRequest("mcp_RC_list_public_api_keys", {
      project_id: projectId,
      app_id: iosApp.id,
    });

    const androidKeys = await makeMCPRequest("mcp_RC_list_public_api_keys", {
      project_id: projectId,
      app_id: androidApp.id,
    });

    console.log("\n🎉 RevenueCat Setup Complete!\n");
    console.log("📋 Configuration Summary:");
    console.log(`Project: ${project.name} (${projectId})`);
    console.log(`iOS App: ${iosApp.name} (${iosApp.id})`);
    console.log(`Android App: ${androidApp.name} (${androidApp.id})`);
    console.log(`Entitlement: ${premiumEntitlement.display_name} (${premiumEntitlement.id})`);
    console.log(`Offering: ${defaultOffering.display_name} (${defaultOffering.id})`);

    console.log("\n🔑 API Keys:");
    console.log(`iOS Public Key: ${iosKeys.items[0]?.key || "Not found"}`);
    console.log(`Android Public Key: ${androidKeys.items[0]?.key || "Not found"}`);

    return {
      project,
      iosApp,
      androidApp,
      premiumEntitlement,
      defaultOffering,
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
    .then((result) => {
      console.log("\n✅ Setup completed successfully!");

      // Output environment variables
      if (result.iosApiKey && result.androidApiKey) {
        console.log("\n📝 Add these to your .env file:");
        console.log(`EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=${result.iosApiKey}`);
        console.log(`EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=${result.androidApiKey}`);
      }

      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Setup failed:", error);
      process.exit(1);
    });
}

module.exports = { setupRevenueCat, makeMCPRequest };
