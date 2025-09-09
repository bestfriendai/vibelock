#!/usr/bin/env node

/**
 * Finish RevenueCat Implementation Script
 * 
 * This script completes the RevenueCat implementation by:
 * - Creating subscription products for both iOS and Android
 * - Attaching products to the premium entitlement
 * - Attaching products to packages
 * - Verifying the complete configuration
 */

const { makeMCPRequest } = require('./revenuecat-mcp-helper');

const PROJECT_ID = 'projf5ad9927';
const IOS_APP_ID = 'appbbff2f8dd5';
const ANDROID_APP_ID = 'app360535eb49';
const ENTITLEMENT_ID = 'entlf379a32ad5';
const OFFERING_ID = 'ofrng42cff5f13e';
const MONTHLY_PACKAGE_ID = 'pkge3a47574b06';
const ANNUAL_PACKAGE_ID = 'pkge8893b98063';

async function finishImplementation() {
  console.log('🏁 Finishing RevenueCat Implementation...\n');

  try {
    // Step 1: Create iOS subscription products
    console.log('📱 Creating iOS subscription products...');
    
    const iosMonthlyProduct = await makeMCPRequest('mcp_RC_create_product', {
      project_id: PROJECT_ID,
      store_identifier: 'com.lockerroomtalk.app.premium.monthly',
      type: 'subscription',
      app_id: IOS_APP_ID,
      display_name: 'LockerRoom Premium Monthly (iOS)'
    });
    console.log('✅ iOS Monthly product created:', iosMonthlyProduct.id);

    const iosAnnualProduct = await makeMCPRequest('mcp_RC_create_product', {
      project_id: PROJECT_ID,
      store_identifier: 'com.lockerroomtalk.app.premium.annual',
      type: 'subscription',
      app_id: IOS_APP_ID,
      display_name: 'LockerRoom Premium Annual (iOS)'
    });
    console.log('✅ iOS Annual product created:', iosAnnualProduct.id);

    // Step 2: Create Android subscription products
    console.log('🤖 Creating Android subscription products...');
    
    const androidMonthlyProduct = await makeMCPRequest('mcp_RC_create_product', {
      project_id: PROJECT_ID,
      store_identifier: 'premium_monthly:monthly-base-plan',
      type: 'subscription',
      app_id: ANDROID_APP_ID,
      display_name: 'LockerRoom Premium Monthly (Android)'
    });
    console.log('✅ Android Monthly product created:', androidMonthlyProduct.id);

    const androidAnnualProduct = await makeMCPRequest('mcp_RC_create_product', {
      project_id: PROJECT_ID,
      store_identifier: 'premium_annual:annual-base-plan',
      type: 'subscription',
      app_id: ANDROID_APP_ID,
      display_name: 'LockerRoom Premium Annual (Android)'
    });
    console.log('✅ Android Annual product created:', androidAnnualProduct.id);

    // Step 3: Attach all products to the premium entitlement
    console.log('🎯 Attaching products to premium entitlement...');
    
    await makeMCPRequest('mcp_RC_attach_products_to_entitlement', {
      project_id: PROJECT_ID,
      entitlement_id: ENTITLEMENT_ID,
      product_ids: [
        iosMonthlyProduct.id,
        iosAnnualProduct.id,
        androidMonthlyProduct.id,
        androidAnnualProduct.id
      ]
    });
    console.log('✅ All products attached to premium entitlement');

    // Step 4: Attach monthly products to monthly package
    console.log('📦 Attaching monthly products to monthly package...');
    
    await makeMCPRequest('mcp_RC_attach_products_to_package', {
      project_id: PROJECT_ID,
      package_id: MONTHLY_PACKAGE_ID,
      products: [
        {
          product_id: iosMonthlyProduct.id,
          eligibility_criteria: 'all'
        },
        {
          product_id: androidMonthlyProduct.id,
          eligibility_criteria: 'all'
        }
      ]
    });
    console.log('✅ Monthly products attached to monthly package');

    // Step 5: Attach annual products to annual package
    console.log('📦 Attaching annual products to annual package...');
    
    await makeMCPRequest('mcp_RC_attach_products_to_package', {
      project_id: PROJECT_ID,
      package_id: ANNUAL_PACKAGE_ID,
      products: [
        {
          product_id: iosAnnualProduct.id,
          eligibility_criteria: 'all'
        },
        {
          product_id: androidAnnualProduct.id,
          eligibility_criteria: 'all'
        }
      ]
    });
    console.log('✅ Annual products attached to annual package');

    // Step 6: Verify configuration by listing everything
    console.log('🔍 Verifying complete configuration...');
    
    const products = await makeMCPRequest('mcp_RC_list_products', {
      project_id: PROJECT_ID
    });
    console.log(`✅ Total products created: ${products.items.length}`);

    const entitlementProducts = await makeMCPRequest('mcp_RC_get_products_from_entitlement', {
      project_id: PROJECT_ID,
      entitlement_id: ENTITLEMENT_ID
    });
    console.log(`✅ Products attached to entitlement: ${entitlementProducts.items.length}`);

    const monthlyPackageProducts = await makeMCPRequest('mcp_RC_list_packages', {
      project_id: PROJECT_ID,
      offering_id: OFFERING_ID,
      expand: ['items.product']
    });
    console.log(`✅ Packages in offering: ${monthlyPackageProducts.items.length}`);

    console.log('\n🎉 RevenueCat Implementation Complete!\n');
    
    console.log('📋 Final Configuration Summary:');
    console.log(`Project: LockerRoom (${PROJECT_ID})`);
    console.log(`iOS App: ${IOS_APP_ID}`);
    console.log(`Android App: ${ANDROID_APP_ID}`);
    console.log(`Entitlement: premium_features (${ENTITLEMENT_ID})`);
    console.log(`Offering: Default (${OFFERING_ID})`);
    console.log('');
    console.log('📱 Products Created:');
    console.log(`iOS Monthly: ${iosMonthlyProduct.id} (com.lockerroomtalk.app.premium.monthly)`);
    console.log(`iOS Annual: ${iosAnnualProduct.id} (com.lockerroomtalk.app.premium.annual)`);
    console.log(`Android Monthly: ${androidMonthlyProduct.id} (premium_monthly)`);
    console.log(`Android Annual: ${androidAnnualProduct.id} (premium_annual)`);
    console.log('');
    console.log('📦 Packages:');
    console.log(`Monthly Package: ${MONTHLY_PACKAGE_ID} ($rc_monthly)`);
    console.log(`Annual Package: ${ANNUAL_PACKAGE_ID} ($rc_annual)`);

    console.log('\n🚀 Your app is now ready for subscription testing!');
    console.log('\n📝 Next Steps:');
    console.log('1. ✅ RevenueCat configuration is complete');
    console.log('2. ✅ API keys are configured in .env');
    console.log('3. Create matching products in App Store Connect and Google Play Console');
    console.log('4. Build development client: eas build --profile development');
    console.log('5. Test subscription flows with real purchases');
    console.log('6. Verify premium features unlock correctly');

    return {
      iosMonthlyProduct,
      iosAnnualProduct,
      androidMonthlyProduct,
      androidAnnualProduct,
      totalProducts: products.items.length,
      entitlementProducts: entitlementProducts.items.length
    };

  } catch (error) {
    console.error('❌ Implementation failed:', error.message);
    throw error;
  }
}

// Run the implementation
if (require.main === module) {
  finishImplementation()
    .then((result) => {
      console.log('\n✅ RevenueCat implementation finished successfully!');
      console.log(`Created ${result.totalProducts} products with ${result.entitlementProducts} attached to premium entitlement`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Implementation failed:', error);
      process.exit(1);
    });
}

module.exports = { finishImplementation };
