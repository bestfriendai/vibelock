#!/usr/bin/env node

/**
 * Complete RevenueCat Setup Script
 *
 * This script completes the RevenueCat setup by:
 * - Creating packages for the offering
 * - Setting up the current offering
 * - Creating a paywall
 */

const { makeMCPRequest } = require("./revenuecat-mcp-helper");

const PROJECT_ID = "projf5ad9927";
const IOS_APP_ID = "appbbff2f8dd5";
const ANDROID_APP_ID = "app360535eb49";
const ENTITLEMENT_ID = "entlf379a32ad5";
const OFFERING_ID = "ofrng42cff5f13e";

async function completeSetup() {
  console.log("🔧 Completing RevenueCat setup...\n");

  try {
    // Step 1: Create packages for the offering
    console.log("📦 Creating packages...");

    // Create monthly package
    const monthlyPackage = await makeMCPRequest("mcp_RC_create_package", {
      project_id: PROJECT_ID,
      offering_id: OFFERING_ID,
      lookup_key: "$rc_monthly",
      display_name: "Monthly Premium",
      position: 1,
    });
    console.log("✅ Monthly package created:", monthlyPackage.id);

    // Create annual package
    const annualPackage = await makeMCPRequest("mcp_RC_create_package", {
      project_id: PROJECT_ID,
      offering_id: OFFERING_ID,
      lookup_key: "$rc_annual",
      display_name: "Annual Premium",
      position: 2,
    });
    console.log("✅ Annual package created:", annualPackage.id);

    // Step 2: Set the offering as current
    console.log("🎯 Setting offering as current...");
    await makeMCPRequest("mcp_RC_update_offering", {
      project_id: PROJECT_ID,
      offering_id: OFFERING_ID,
      display_name: "Default Offering",
      is_current: true,
    });
    console.log("✅ Offering set as current");

    // Step 3: Create a paywall
    console.log("💳 Creating paywall...");
    const paywall = await makeMCPRequest("mcp_RC_create_paywall", {
      project_id: PROJECT_ID,
      offering_id: OFFERING_ID,
    });
    console.log("✅ Paywall created:", paywall.id);

    console.log("\n🎉 RevenueCat setup is now complete!\n");

    console.log("📋 Final Configuration:");
    console.log(`Project: LockerRoom (${PROJECT_ID})`);
    console.log(`iOS App: ${IOS_APP_ID}`);
    console.log(`Android App: ${ANDROID_APP_ID}`);
    console.log(`Entitlement: ${ENTITLEMENT_ID}`);
    console.log(`Offering: ${OFFERING_ID}`);
    console.log(`Monthly Package: ${monthlyPackage.id}`);
    console.log(`Annual Package: ${annualPackage.id}`);
    console.log(`Paywall: ${paywall.id}`);

    console.log("\n📝 Next Steps:");
    console.log("1. ✅ API keys are already added to .env");
    console.log("2. Create subscription products in App Store Connect and Google Play Console");
    console.log("3. Add products to RevenueCat and attach them to packages");
    console.log("4. Build development client and test subscription flow");
    console.log("5. Test premium features unlock correctly");

    console.log("\n🏪 Store Setup Required:");
    console.log("App Store Connect:");
    console.log("- Create subscription: com.lockerroomtalk.app.premium.monthly");
    console.log("- Create subscription: com.lockerroomtalk.app.premium.annual");
    console.log("");
    console.log("Google Play Console:");
    console.log("- Create subscription: premium_monthly");
    console.log("- Create subscription: premium_annual");

    return {
      monthlyPackage,
      annualPackage,
      paywall,
    };
  } catch (error) {
    console.error("❌ Setup failed:", error.message);
    throw error;
  }
}

// Run the setup
if (require.main === module) {
  completeSetup()
    .then(() => {
      console.log("\n✅ Complete setup finished successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Complete setup failed:", error);
      process.exit(1);
    });
}

module.exports = { completeSetup };
