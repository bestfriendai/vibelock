# RevenueCat Complete Setup Guide for Loccc

## 1. Install RevenueCat CLI

```bash
# Install the RevenueCat CLI globally
npm install -g @revenuecat/cli

# Verify installation
revenuecat --version
```

## 2. Login to RevenueCat

```bash
# Login with your RevenueCat account
revenuecat login

# This will open a browser for authentication
# After authentication, you'll see: "Successfully logged in as your@email.com"
```

## 3. Create RevenueCat Project

```bash
# Create a new project (if not already created)
revenuecat project create "Loccc" \
  --description "Local reviews and chat rooms app"

# List your projects to get the project ID
revenuecat project list
```

## 4. Create iOS App

```bash
# Create iOS app in RevenueCat
revenuecat app create ios \
  --project-id YOUR_PROJECT_ID \
  --bundle-id "com.lockerroom.app" \
  --app-name "Loccc iOS" \
  --app-store-connect-api-key-id YOUR_ASC_KEY_ID \
  --app-store-connect-api-key-issuer-id YOUR_ISSUER_ID \
  --app-store-connect-api-key-path ./AuthKey_YOUR_KEY.p8 \
  --app-store-connect-app-id YOUR_APP_STORE_APP_ID

# Get the iOS API key
revenuecat app get-public-key ios --project-id YOUR_PROJECT_ID
```

## 5. Create Android App

```bash
# Create Android app in RevenueCat
revenuecat app create android \
  --project-id YOUR_PROJECT_ID \
  --package-name "com.lockerroom.app" \
  --app-name "Loccc Android" \
  --service-account-credentials-path ./google-play-service-account.json

# Get the Android API key
revenuecat app get-public-key android --project-id YOUR_PROJECT_ID
```

## 6. Configure Products

### Create Entitlements

```bash
# Create premium entitlement
revenuecat entitlement create \
  --project-id YOUR_PROJECT_ID \
  --identifier "premium" \
  --display-name "Premium Access" \
  --description "Unlock all premium features"

# Create pro entitlement (if needed)
revenuecat entitlement create \
  --project-id YOUR_PROJECT_ID \
  --identifier "pro" \
  --display-name "Pro Access" \
  --description "Advanced features for power users"
```

### Create Products (Subscriptions)

```bash
# Monthly subscription
revenuecat product create \
  --project-id YOUR_PROJECT_ID \
  --app ios \
  --identifier "monthly_premium" \
  --display-name "Monthly Premium" \
  --app-store-product-id "com.lockerroom.premium.monthly" \
  --entitlements "premium"

# Annual subscription (with discount)
revenuecat product create \
  --project-id YOUR_PROJECT_ID \
  --app ios \
  --identifier "annual_premium" \
  --display-name "Annual Premium" \
  --app-store-product-id "com.lockerroom.premium.annual" \
  --entitlements "premium"

# Lifetime purchase
revenuecat product create \
  --project-id YOUR_PROJECT_ID \
  --app ios \
  --identifier "lifetime_premium" \
  --display-name "Lifetime Premium" \
  --app-store-product-id "com.lockerroom.premium.lifetime" \
  --entitlements "premium"
```

### Link Android Products

```bash
# Link the same products for Android
revenuecat product create \
  --project-id YOUR_PROJECT_ID \
  --app android \
  --identifier "monthly_premium" \
  --display-name "Monthly Premium" \
  --google-product-id "monthly_premium" \
  --entitlements "premium"

revenuecat product create \
  --project-id YOUR_PROJECT_ID \
  --app android \
  --identifier "annual_premium" \
  --display-name "Annual Premium" \
  --google-product-id "annual_premium" \
  --entitlements "premium"
```

## 7. Create Offerings

```bash
# Create default offering
revenuecat offering create \
  --project-id YOUR_PROJECT_ID \
  --identifier "default" \
  --display-name "Standard Pricing" \
  --is-current true

# Add packages to offering
revenuecat package create \
  --project-id YOUR_PROJECT_ID \
  --offering "default" \
  --identifier "\$rc_monthly" \
  --display-name "Monthly" \
  --product-id "monthly_premium" \
  --position 0

revenuecat package create \
  --project-id YOUR_PROJECT_ID \
  --offering "default" \
  --identifier "\$rc_annual" \
  --display-name "Annual" \
  --product-id "annual_premium" \
  --position 1

revenuecat package create \
  --project-id YOUR_PROJECT_ID \
  --offering "default" \
  --identifier "\$rc_lifetime" \
  --display-name "Lifetime" \
  --product-id "lifetime_premium" \
  --position 2
```

## 8. Configure Webhooks

```bash
# Set up webhook for subscription events
revenuecat webhook create \
  --project-id YOUR_PROJECT_ID \
  --url "https://your-project.supabase.co/functions/v1/revenuecat-webhook" \
  --secret "your-webhook-secret" \
  --events "all"

# Get webhook details
revenuecat webhook list --project-id YOUR_PROJECT_ID
```

## 9. Export Configuration

```bash
# Export all API keys and configuration
revenuecat config export \
  --project-id YOUR_PROJECT_ID \
  --output ./revenuecat-config.json

# This will create a file with all your API keys
```

## 10. Update Environment Variables

Based on the exported configuration, update your `.env.production`:

```bash
# RevenueCat Configuration
EXPO_PUBLIC_REVENUECAT_API_KEY=public_sdk_key_here
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_xxxxxxxxxxxxxxxxxxxxx
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_xxxxxxxxxxxxxxxxxxxxx
EXPO_PUBLIC_REVENUECAT_PREMIUM_ENTITLEMENTS=premium,pro

# Server-side (for webhooks)
REVENUECAT_API_KEY=secret_api_key_here
REVENUECAT_WEBHOOK_SECRET=your_webhook_secret
```

## 11. Create App Store Products

### iOS (App Store Connect)

```bash
# Use RevenueCat CLI to create products in App Store Connect
revenuecat app-store-connect product create \
  --api-key-id YOUR_KEY_ID \
  --api-key-issuer-id YOUR_ISSUER_ID \
  --api-key-path ./AuthKey_YOUR_KEY.p8 \
  --app-id YOUR_APP_ID \
  --product-id "com.lockerroom.premium.monthly" \
  --reference-name "Monthly Premium" \
  --product-type "AUTO_RENEWABLE_SUBSCRIPTION" \
  --subscription-group "Premium"

# Repeat for annual and lifetime
```

### Android (Google Play Console)

```bash
# Create products in Google Play Console
revenuecat google-play product create \
  --service-account-path ./google-play-service-account.json \
  --package-name "com.lockerroom.app" \
  --product-id "monthly_premium" \
  --product-type "subs" \
  --default-price "USD:9.99"
```

## 12. Test Configuration

```bash
# Validate your setup
revenuecat validate \
  --project-id YOUR_PROJECT_ID \
  --check-products \
  --check-entitlements \
  --check-offerings

# Test webhook
revenuecat webhook test \
  --project-id YOUR_PROJECT_ID \
  --webhook-id YOUR_WEBHOOK_ID
```

## 13. Upload to EAS Secrets

```bash
# Upload RevenueCat keys to EAS for secure builds
eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_IOS_API_KEY --value "appl_xxxxx"
eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY --value "goog_xxxxx"
eas secret:create --scope project --name REVENUECAT_API_KEY --value "secret_xxxxx"
eas secret:create --scope project --name REVENUECAT_WEBHOOK_SECRET --value "webhook_secret"
```

## 14. Implementation in Code

Update your `src/state/subscriptionStore.ts`:

```typescript
import Purchases, { PurchasesOffering, CustomerInfo, PurchasesPackage } from "react-native-purchases";
import { Platform } from "react-native";

export const initializeRevenueCat = async () => {
  try {
    // Use platform-specific API keys
    const apiKey = Platform.select({
      ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
      android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
    });

    if (!apiKey) {
      throw new Error("RevenueCat API key not found");
    }

    // Configure RevenueCat
    await Purchases.configure({
      apiKey,
      appUserID: null, // Let RevenueCat generate ID
      observerMode: false,
      useAmazon: false,
    });

    // Enable debug logs in development
    if (__DEV__) {
      Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    }

    // Set user attributes
    const user = await getCurrentUser();
    if (user) {
      Purchases.setEmail(user.email);
      Purchases.setAttributes({
        user_id: user.id,
        created_at: user.created_at,
      });
    }

    console.log("RevenueCat initialized successfully");
  } catch (error) {
    console.error("Failed to initialize RevenueCat:", error);
  }
};
```

## 15. Testing Checklist

- [ ] Test on iOS Sandbox account
- [ ] Test on Android test account
- [ ] Verify webhook receives events
- [ ] Check entitlement unlocking
- [ ] Test subscription renewal
- [ ] Test cancellation flow
- [ ] Verify restore purchases
- [ ] Test upgrade/downgrade (Android)
- [ ] Check receipt validation

## Common CLI Commands Reference

```bash
# Get project info
revenuecat project get --project-id YOUR_PROJECT_ID

# List all products
revenuecat product list --project-id YOUR_PROJECT_ID

# List all entitlements
revenuecat entitlement list --project-id YOUR_PROJECT_ID

# Get current offering
revenuecat offering current --project-id YOUR_PROJECT_ID

# Check user subscription status
revenuecat customer get --project-id YOUR_PROJECT_ID --user-id USER_ID

# Grant promotional entitlement
revenuecat customer grant-entitlement \
  --project-id YOUR_PROJECT_ID \
  --user-id USER_ID \
  --entitlement-id "premium" \
  --duration "1m"

# Revoke entitlement
revenuecat customer revoke-entitlement \
  --project-id YOUR_PROJECT_ID \
  --user-id USER_ID \
  --entitlement-id "premium"
```

## Troubleshooting

### Issue: Products not showing in app

```bash
# Check product configuration
revenuecat product validate --project-id YOUR_PROJECT_ID

# Ensure products are approved in stores
revenuecat app-store-connect product status --product-id PRODUCT_ID
```

### Issue: Webhook not receiving events

```bash
# Test webhook endpoint
curl -X POST https://your-webhook-url \
  -H "Authorization: Bearer YOUR_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Check webhook logs
revenuecat webhook logs --project-id YOUR_PROJECT_ID
```

### Issue: Subscription not unlocking features

```bash
# Check customer info
revenuecat customer get --project-id YOUR_PROJECT_ID --user-id USER_ID

# Verify entitlement configuration
revenuecat entitlement get --project-id YOUR_PROJECT_ID --identifier "premium"
```

## Production Checklist

Before going live:

1. **API Keys**
   - [ ] Production API keys in EAS Secrets
   - [ ] Webhook secret configured
   - [ ] Server API key for backend

2. **Products**
   - [ ] All products created in App Store Connect
   - [ ] All products created in Google Play Console
   - [ ] Products approved and active
   - [ ] Prices set correctly

3. **Testing**
   - [ ] Sandbox testing completed
   - [ ] Production test with promo codes
   - [ ] Restore purchases working
   - [ ] Analytics events firing

4. **Backend**
   - [ ] Webhook endpoint deployed
   - [ ] Receipt validation implemented
   - [ ] User subscription status synced

5. **Legal**
   - [ ] Terms of Service updated
   - [ ] Privacy Policy includes RevenueCat
   - [ ] Refund policy documented
   - [ ] Auto-renewal disclosure added

## Support Resources

- RevenueCat Dashboard: https://app.revenuecat.com
- Documentation: https://docs.revenuecat.com
- CLI Reference: https://docs.revenuecat.com/docs/cli
- Support: support@revenuecat.com
- Status Page: https://status.revenuecat.com
