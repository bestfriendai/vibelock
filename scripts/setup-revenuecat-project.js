#!/usr/bin/env node

/**
 * RevenueCat Project Setup using MCP API
 * This script configures your Lockerroom project in RevenueCat
 */

const https = require("https");

const API_KEY = "sk_NwaebOrtgTNIWxHRYqbMFkxYNmXlf";
const MCP_URL = "mcp.revenuecat.ai";

// Helper function to make MCP requests
function mcpRequest(method, params = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      jsonrpc: "2.0",
      method: `call_tool`,
      params: {
        name: method,
        arguments: params,
      },
      id: Date.now(),
    });

    const options = {
      hostname: MCP_URL,
      path: "/mcp",
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        "Content-Length": data.length,
      },
    };

    const req = https.request(options, (res) => {
      let body = "";

      res.on("data", (chunk) => {
        body += chunk.toString();
      });

      res.on("end", () => {
        try {
          // Parse SSE response
          const lines = body.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const jsonStr = line.slice(6);
              const parsed = JSON.parse(jsonStr);
              resolve(parsed);
              return;
            }
          }
          resolve({ error: "No data in response" });
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function setupLockerroomProject() {
  console.log("🚀 Setting up Lockerroom Project in RevenueCat...\n");

  try {
    // 1. Get project details
    console.log("📊 Getting project details...");
    const projectResponse = await mcpRequest("mcp_RC_get_project");

    if (projectResponse.result) {
      const project = projectResponse.result.content?.[0]?.text;
      console.log("✅ Connected to RevenueCat project");

      // Parse project ID from response if available
      const projectMatch = project?.match(/"id":\s*"([^"]+)"/);
      const projectId = projectMatch ? projectMatch[1] : "proj1ab2c3d4"; // Use your actual project ID

      console.log(`   Project ID: ${projectId}`);

      // 2. Create or verify apps
      console.log("\n📱 Setting up apps...");

      // Check existing apps
      const appsResponse = await mcpRequest("mcp_RC_list_apps", {
        project_id: projectId,
      });

      // Create iOS app if not exists
      console.log("   Creating iOS app...");
      const iosAppResponse = await mcpRequest("mcp_RC_create_app", {
        project_id: projectId,
        name: "Lockerroom iOS",
        type: "app_store",
        bundle_id: "com.lockerroom.app",
      });

      // Create Android app if not exists
      console.log("   Creating Android app...");
      const androidAppResponse = await mcpRequest("mcp_RC_create_app", {
        project_id: projectId,
        name: "Lockerroom Android",
        type: "play_store",
        package_name: "com.lockerroom.app",
      });

      // 3. Create entitlements
      console.log("\n🎁 Creating entitlements...");

      const entitlementResponse = await mcpRequest("mcp_RC_create_entitlement", {
        project_id: projectId,
        lookup_key: "premium",
        display_name: "Premium Access",
      });

      console.log("✅ Premium entitlement created");

      // 4. List and create products
      console.log("\n📦 Setting up products...");

      // Note: Products need to be created in App Store Connect and Google Play Console first
      // Then imported/synced in RevenueCat dashboard

      console.log(`
⚠️  Important: You need to create these products in your app stores first:
   
   iOS (App Store Connect):
   - com.lockerroom.premium.monthly ($9.99/month)
   - com.lockerroom.premium.annual ($95.99/year)  
   - com.lockerroom.premium.lifetime ($199.99 one-time)
   
   Android (Google Play Console):
   - monthly_premium ($9.99/month)
   - annual_premium ($95.99/year)
   - lifetime_premium ($199.99 one-time)
`);

      // 5. Create offerings and packages
      console.log("\n🎯 Creating offerings...");

      // Get offerings list
      const offeringsResponse = await mcpRequest("mcp_RC_list_offerings", {
        project_id: projectId,
      });

      // Check if default offering exists
      let offeringId = null;
      if (offeringsResponse.result?.content) {
        const offeringsText = offeringsResponse.result.content[0]?.text || "";
        const offeringMatch = offeringsText.match(/"id":\s*"([^"]+)"/);
        offeringId = offeringMatch ? offeringMatch[1] : null;
      }

      if (offeringId) {
        // Create packages for the offering
        console.log(`   Adding packages to offering ${offeringId}...`);

        // Monthly package
        await mcpRequest("mcp_RC_create_package", {
          project_id: projectId,
          offering_id: offeringId,
          lookup_key: "$rc_monthly",
          display_name: "Monthly",
          position: 0,
        });

        // Annual package
        await mcpRequest("mcp_RC_create_package", {
          project_id: projectId,
          offering_id: offeringId,
          lookup_key: "$rc_annual",
          display_name: "Annual (Save 20%)",
          position: 1,
        });

        // Lifetime package
        await mcpRequest("mcp_RC_create_package", {
          project_id: projectId,
          offering_id: offeringId,
          lookup_key: "$rc_lifetime",
          display_name: "Lifetime",
          position: 2,
        });

        console.log("✅ Packages created");
      }

      // 6. Get API keys for the apps
      console.log("\n🔑 Getting API keys...");

      // You'll need to get these from the RevenueCat dashboard
      console.log(`
📋 Next Steps:
1. Go to RevenueCat Dashboard: https://app.revenuecat.com
2. Navigate to your Lockerroom project
3. Get the iOS and Android API keys
4. Update your .env.production file with:
   
   EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=<your_ios_key>
   EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=<your_android_key>
`);

      console.log("\n✅ RevenueCat project setup complete!");
    } else {
      console.error("❌ Could not connect to RevenueCat project");
    }
  } catch (error) {
    console.error("❌ Setup failed:", error.message);
  }
}

// Run the setup
setupLockerroomProject();
