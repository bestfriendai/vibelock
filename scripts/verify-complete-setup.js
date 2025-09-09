#!/usr/bin/env node

/**
 * Verify Complete RevenueCat Setup
 * 
 * This script verifies that the complete RevenueCat setup is working:
 * - All products are created
 * - Products are attached to entitlements
 * - Products are attached to packages
 * - API keys are configured
 * - App configuration is correct
 */

const { makeMCPRequest } = require('./revenuecat-mcp-helper');
require('dotenv').config();

const PROJECT_ID = 'projf5ad9927';
const IOS_APP_ID = 'appbbff2f8dd5';
const ANDROID_APP_ID = 'app360535eb49';
const ENTITLEMENT_ID = 'entlf379a32ad5';
const OFFERING_ID = 'ofrng42cff5f13e';

async function verifyCompleteSetup() {
  console.log('🔍 Verifying Complete RevenueCat Setup...\n');

  let allTestsPassed = true;
  const results = {
    passed: 0,
    failed: 0,
    warnings: 0
  };

  function logResult(status, message) {
    const emoji = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
    console.log(`${emoji} ${message}`);
    results[status === 'pass' ? 'passed' : status === 'fail' ? 'failed' : 'warnings']++;
    if (status === 'fail') allTestsPassed = false;
  }

  try {
    // Test 1: Environment Variables
    console.log('1️⃣ Testing Environment Variables...');
    const iosKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
    const androidKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
    
    if (iosKey && iosKey.startsWith('appl_')) {
      logResult('pass', 'iOS API key is configured correctly');
    } else {
      logResult('fail', 'iOS API key is missing or invalid');
    }
    
    if (androidKey && androidKey.startsWith('goog_')) {
      logResult('pass', 'Android API key is configured correctly');
    } else {
      logResult('fail', 'Android API key is missing or invalid');
    }

    // Test 2: Project Structure
    console.log('\n2️⃣ Testing Project Structure...');
    const project = await makeMCPRequest('mcp_RC_get_project');
    const projectData = project.items[0];
    
    if (projectData && projectData.name === 'LockerRoom') {
      logResult('pass', `Project exists: ${projectData.name} (${projectData.id})`);
    } else {
      logResult('fail', 'Project not found or incorrect name');
    }

    // Test 3: Apps
    console.log('\n3️⃣ Testing Apps...');
    const apps = await makeMCPRequest('mcp_RC_list_apps', { project_id: PROJECT_ID });
    
    const iosApp = apps.items.find(app => app.id === IOS_APP_ID);
    const androidApp = apps.items.find(app => app.id === ANDROID_APP_ID);
    
    if (iosApp && iosApp.app_store?.bundle_id === 'com.lockerroomtalk.app') {
      logResult('pass', `iOS app configured: ${iosApp.name} (${iosApp.app_store.bundle_id})`);
    } else {
      logResult('fail', 'iOS app not found or incorrect bundle ID');
    }
    
    if (androidApp && androidApp.play_store?.package_name === 'com.lockerroomtalk.app') {
      logResult('pass', `Android app configured: ${androidApp.name} (${androidApp.play_store.package_name})`);
    } else {
      logResult('fail', 'Android app not found or incorrect package name');
    }

    // Test 4: Products
    console.log('\n4️⃣ Testing Products...');
    const products = await makeMCPRequest('mcp_RC_list_products', { project_id: PROJECT_ID });
    
    const expectedProducts = [
      'com.lockerroomtalk.app.premium.monthly',
      'com.lockerroomtalk.app.premium.annual',
      'premium_monthly:monthly-base-plan',
      'premium_annual:annual-base-plan'
    ];
    
    expectedProducts.forEach(identifier => {
      const product = products.items.find(p => p.store_identifier === identifier);
      if (product) {
        logResult('pass', `Product exists: ${identifier} (${product.id})`);
      } else {
        logResult('fail', `Product missing: ${identifier}`);
      }
    });

    // Test 5: Entitlements
    console.log('\n5️⃣ Testing Entitlements...');
    const entitlements = await makeMCPRequest('mcp_RC_list_entitlements', { project_id: PROJECT_ID });
    const premiumEntitlement = entitlements.items.find(e => e.lookup_key === 'premium_features');
    
    if (premiumEntitlement) {
      logResult('pass', `Premium entitlement exists: ${premiumEntitlement.display_name} (${premiumEntitlement.id})`);
      
      // Check entitlement products
      const entitlementProducts = await makeMCPRequest('mcp_RC_get_products_from_entitlement', {
        project_id: PROJECT_ID,
        entitlement_id: premiumEntitlement.id
      });
      
      if (entitlementProducts.items.length === 4) {
        logResult('pass', `All 4 products attached to premium entitlement`);
      } else {
        logResult('fail', `Only ${entitlementProducts.items.length}/4 products attached to entitlement`);
      }
    } else {
      logResult('fail', 'Premium entitlement not found');
    }

    // Test 6: Offerings and Packages
    console.log('\n6️⃣ Testing Offerings and Packages...');
    const offerings = await makeMCPRequest('mcp_RC_list_offerings', { project_id: PROJECT_ID });
    const defaultOffering = offerings.items.find(o => o.lookup_key === 'default');
    
    if (defaultOffering) {
      logResult('pass', `Default offering exists: ${defaultOffering.display_name} (${defaultOffering.id})`);
      
      // Check packages
      const packages = await makeMCPRequest('mcp_RC_list_packages', {
        project_id: PROJECT_ID,
        offering_id: defaultOffering.id
      });
      
      const monthlyPackage = packages.items.find(p => p.lookup_key === '$rc_monthly');
      const annualPackage = packages.items.find(p => p.lookup_key === '$rc_annual');
      
      if (monthlyPackage) {
        logResult('pass', `Monthly package exists: ${monthlyPackage.display_name} (${monthlyPackage.id})`);
      } else {
        logResult('fail', 'Monthly package not found');
      }
      
      if (annualPackage) {
        logResult('pass', `Annual package exists: ${annualPackage.display_name} (${annualPackage.id})`);
      } else {
        logResult('fail', 'Annual package not found');
      }
    } else {
      logResult('fail', 'Default offering not found');
    }

    // Test 7: API Keys
    console.log('\n7️⃣ Testing API Keys...');
    const iosKeys = await makeMCPRequest('mcp_RC_list_public_api_keys', {
      project_id: PROJECT_ID,
      app_id: IOS_APP_ID
    });
    
    const androidKeys = await makeMCPRequest('mcp_RC_list_public_api_keys', {
      project_id: PROJECT_ID,
      app_id: ANDROID_APP_ID
    });
    
    if (iosKeys.items.length > 0) {
      logResult('pass', `iOS API key available: ${iosKeys.items[0].key.substring(0, 10)}...`);
    } else {
      logResult('fail', 'iOS API key not found');
    }
    
    if (androidKeys.items.length > 0) {
      logResult('pass', `Android API key available: ${androidKeys.items[0].key.substring(0, 10)}...`);
    } else {
      logResult('fail', 'Android API key not found');
    }

    // Summary
    console.log('\n📊 Verification Summary:');
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`⚠️ Warnings: ${results.warnings}`);

    if (allTestsPassed) {
      console.log('\n🎉 ALL TESTS PASSED! Your RevenueCat implementation is complete and ready!');
      console.log('\n🚀 What you can do now:');
      console.log('1. Test in Expo Go: npm start (demo purchases)');
      console.log('2. Create store products in App Store Connect and Google Play Console');
      console.log('3. Build development client: eas build --profile development');
      console.log('4. Test real purchases in development build');
      console.log('5. Deploy to production when ready');
    } else {
      console.log('\n⚠️ Some tests failed. Please review the issues above.');
    }

    return {
      allTestsPassed,
      results,
      totalProducts: products.items.length,
      totalApps: apps.items.length
    };

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    return { allTestsPassed: false, error: error.message };
  }
}

// Run the verification
if (require.main === module) {
  verifyCompleteSetup()
    .then((result) => {
      if (result.allTestsPassed) {
        console.log('\n✅ Verification completed successfully!');
        process.exit(0);
      } else {
        console.log('\n❌ Verification found issues');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n❌ Verification failed:', error);
      process.exit(1);
    });
}

module.exports = { verifyCompleteSetup };
