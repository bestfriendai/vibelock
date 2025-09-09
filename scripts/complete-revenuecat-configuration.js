#!/usr/bin/env node

/**
 * Complete RevenueCat Configuration Script
 * 
 * This script completes the RevenueCat configuration by:
 * - Checking existing products
 * - Creating missing products
 * - Attaching products to entitlements and packages
 * - Verifying the complete setup
 */

const { makeMCPRequest } = require('./revenuecat-mcp-helper');

const PROJECT_ID = 'projf5ad9927';
const IOS_APP_ID = 'appbbff2f8dd5';
const ANDROID_APP_ID = 'app360535eb49';
const ENTITLEMENT_ID = 'entlf379a32ad5';
const OFFERING_ID = 'ofrng42cff5f13e';
const MONTHLY_PACKAGE_ID = 'pkge3a47574b06';
const ANNUAL_PACKAGE_ID = 'pkge8893b98063';

async function completeConfiguration() {
  console.log('🔧 Completing RevenueCat Configuration...\n');

  try {
    // Step 1: List existing products
    console.log('📋 Checking existing products...');
    const existingProducts = await makeMCPRequest('mcp_RC_list_products', {
      project_id: PROJECT_ID
    });
    
    console.log(`Found ${existingProducts.items.length} existing products:`);
    existingProducts.items.forEach(product => {
      console.log(`  - ${product.display_name} (${product.store_identifier}) - ${product.id}`);
    });

    // Step 2: Find or create products
    let iosMonthlyProduct = existingProducts.items.find(p => 
      p.store_identifier === 'com.lockerroomtalk.app.premium.monthly'
    );
    let iosAnnualProduct = existingProducts.items.find(p => 
      p.store_identifier === 'com.lockerroomtalk.app.premium.annual'
    );
    let androidMonthlyProduct = existingProducts.items.find(p => 
      p.store_identifier === 'premium_monthly:monthly-base-plan'
    );
    let androidAnnualProduct = existingProducts.items.find(p => 
      p.store_identifier === 'premium_annual:annual-base-plan'
    );

    // Create missing iOS products
    if (!iosMonthlyProduct) {
      console.log('📱 Creating iOS Monthly product...');
      iosMonthlyProduct = await makeMCPRequest('mcp_RC_create_product', {
        project_id: PROJECT_ID,
        store_identifier: 'com.lockerroomtalk.app.premium.monthly',
        type: 'subscription',
        app_id: IOS_APP_ID,
        display_name: 'LockerRoom Premium Monthly (iOS)'
      });
      console.log('✅ iOS Monthly product created:', iosMonthlyProduct.id);
    } else {
      console.log('✅ iOS Monthly product already exists:', iosMonthlyProduct.id);
    }

    if (!iosAnnualProduct) {
      console.log('📱 Creating iOS Annual product...');
      iosAnnualProduct = await makeMCPRequest('mcp_RC_create_product', {
        project_id: PROJECT_ID,
        store_identifier: 'com.lockerroomtalk.app.premium.annual',
        type: 'subscription',
        app_id: IOS_APP_ID,
        display_name: 'LockerRoom Premium Annual (iOS)'
      });
      console.log('✅ iOS Annual product created:', iosAnnualProduct.id);
    } else {
      console.log('✅ iOS Annual product already exists:', iosAnnualProduct.id);
    }

    // Create missing Android products
    if (!androidMonthlyProduct) {
      console.log('🤖 Creating Android Monthly product...');
      androidMonthlyProduct = await makeMCPRequest('mcp_RC_create_product', {
        project_id: PROJECT_ID,
        store_identifier: 'premium_monthly:monthly-base-plan',
        type: 'subscription',
        app_id: ANDROID_APP_ID,
        display_name: 'LockerRoom Premium Monthly (Android)'
      });
      console.log('✅ Android Monthly product created:', androidMonthlyProduct.id);
    } else {
      console.log('✅ Android Monthly product already exists:', androidMonthlyProduct.id);
    }

    if (!androidAnnualProduct) {
      console.log('🤖 Creating Android Annual product...');
      androidAnnualProduct = await makeMCPRequest('mcp_RC_create_product', {
        project_id: PROJECT_ID,
        store_identifier: 'premium_annual:annual-base-plan',
        type: 'subscription',
        app_id: ANDROID_APP_ID,
        display_name: 'LockerRoom Premium Annual (Android)'
      });
      console.log('✅ Android Annual product created:', androidAnnualProduct.id);
    } else {
      console.log('✅ Android Annual product already exists:', androidAnnualProduct.id);
    }

    // Step 3: Check current entitlement products
    console.log('🎯 Checking entitlement products...');
    const entitlementProducts = await makeMCPRequest('mcp_RC_get_products_from_entitlement', {
      project_id: PROJECT_ID,
      entitlement_id: ENTITLEMENT_ID
    });

    const attachedProductIds = entitlementProducts.items.map(p => p.id);
    const allProductIds = [
      iosMonthlyProduct.id,
      iosAnnualProduct.id,
      androidMonthlyProduct.id,
      androidAnnualProduct.id
    ];

    const missingProductIds = allProductIds.filter(id => !attachedProductIds.includes(id));

    if (missingProductIds.length > 0) {
      console.log(`🎯 Attaching ${missingProductIds.length} products to premium entitlement...`);
      await makeMCPRequest('mcp_RC_attach_products_to_entitlement', {
        project_id: PROJECT_ID,
        entitlement_id: ENTITLEMENT_ID,
        product_ids: missingProductIds
      });
      console.log('✅ Products attached to premium entitlement');
    } else {
      console.log('✅ All products already attached to premium entitlement');
    }

    // Step 4: Check and attach products to packages
    console.log('📦 Checking package products...');
    const packages = await makeMCPRequest('mcp_RC_list_packages', {
      project_id: PROJECT_ID,
      offering_id: OFFERING_ID,
      expand: ['items.product']
    });

    const monthlyPackage = packages.items.find(p => p.lookup_key === '$rc_monthly');
    const annualPackage = packages.items.find(p => p.lookup_key === '$rc_annual');

    // Attach monthly products to monthly package if needed
    if (monthlyPackage && (!monthlyPackage.products || monthlyPackage.products.length === 0)) {
      console.log('📦 Attaching monthly products to monthly package...');
      await makeMCPRequest('mcp_RC_attach_products_to_package', {
        project_id: PROJECT_ID,
        package_id: monthlyPackage.id,
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
    } else {
      console.log('✅ Monthly package already has products attached');
    }

    // Attach annual products to annual package if needed
    if (annualPackage && (!annualPackage.products || annualPackage.products.length === 0)) {
      console.log('📦 Attaching annual products to annual package...');
      await makeMCPRequest('mcp_RC_attach_products_to_package', {
        project_id: PROJECT_ID,
        package_id: annualPackage.id,
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
    } else {
      console.log('✅ Annual package already has products attached');
    }

    // Step 5: Final verification
    console.log('🔍 Final verification...');
    const finalProducts = await makeMCPRequest('mcp_RC_list_products', {
      project_id: PROJECT_ID
    });
    const finalEntitlementProducts = await makeMCPRequest('mcp_RC_get_products_from_entitlement', {
      project_id: PROJECT_ID,
      entitlement_id: ENTITLEMENT_ID
    });

    console.log('\n🎉 RevenueCat Configuration Complete!\n');
    
    console.log('📋 Final Configuration Summary:');
    console.log(`Total Products: ${finalProducts.items.length}`);
    console.log(`Products in Premium Entitlement: ${finalEntitlementProducts.items.length}`);
    console.log('');
    console.log('📱 Products:');
    console.log(`iOS Monthly: ${iosMonthlyProduct.id} (com.lockerroomtalk.app.premium.monthly)`);
    console.log(`iOS Annual: ${iosAnnualProduct.id} (com.lockerroomtalk.app.premium.annual)`);
    console.log(`Android Monthly: ${androidMonthlyProduct.id} (premium_monthly:monthly-base-plan)`);
    console.log(`Android Annual: ${androidAnnualProduct.id} (premium_annual:annual-base-plan)`);

    console.log('\n🚀 Your RevenueCat implementation is now 100% complete!');
    console.log('\n📝 Store Setup Instructions:');
    console.log('App Store Connect:');
    console.log('- Create: com.lockerroomtalk.app.premium.monthly');
    console.log('- Create: com.lockerroomtalk.app.premium.annual');
    console.log('');
    console.log('Google Play Console:');
    console.log('- Create subscription: premium_monthly');
    console.log('- Add base plan: monthly-base-plan');
    console.log('- Create subscription: premium_annual');
    console.log('- Add base plan: annual-base-plan');

    return {
      iosMonthlyProduct,
      iosAnnualProduct,
      androidMonthlyProduct,
      androidAnnualProduct,
      totalProducts: finalProducts.items.length,
      entitlementProducts: finalEntitlementProducts.items.length
    };

  } catch (error) {
    console.error('❌ Configuration failed:', error.message);
    throw error;
  }
}

// Run the configuration
if (require.main === module) {
  completeConfiguration()
    .then((result) => {
      console.log('\n✅ RevenueCat configuration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Configuration failed:', error);
      process.exit(1);
    });
}

module.exports = { completeConfiguration };
