# RevenueCat Configuration for LockerRoom

## ✅ Project Successfully Connected!

Your LockerRoom project is now connected to RevenueCat MCP. Here's your complete configuration:

## 🔑 Project Details

- **Project ID**: `projf5ad9927`
- **Project Name**: LockerRoom
- **Created**: January 7, 2025

## 📱 Configured Apps

### iOS App

- **App ID**: `appbbff2f8dd5`
- **Name**: LockerRoom iOS
- **Bundle ID**: `com.lockerroomtalk.app`
- **Platform**: App Store

### Android App

- **App ID**: `app360535eb49`
- **Name**: LockerRoom Android
- **Package Name**: `com.lockerroomtalk.app`
- **Platform**: Google Play Store

## 🎁 Entitlements

### Premium Features

- **Entitlement ID**: `entlf379a32ad5`
- **Lookup Key**: `premium_features`
- **Display Name**: Premium Features

This entitlement will unlock:

- Ad-free experience
- Unlimited reviews
- Priority chat rooms
- Advanced filtering
- Media upload (larger files)
- Premium badges

## 💰 Offerings

### Default Offering

- **Offering ID**: `ofrng42cff5f13e`
- **Lookup Key**: `default`
- **Is Current**: Yes

## 📦 Products to Create

You need to create these products in your app stores:

### iOS Products (App Store Connect)

1. **Monthly Premium**
   - Product ID: `com.lockerroomtalk.premium.monthly`
   - Price: $9.99
   - Duration: 1 month
   - Auto-renewable subscription

2. **Annual Premium**
   - Product ID: `com.lockerroomtalk.premium.annual`
   - Price: $95.99 (20% discount)
   - Duration: 1 year
   - Auto-renewable subscription

3. **Lifetime Premium**
   - Product ID: `com.lockerroomtalk.premium.lifetime`
   - Price: $199.99
   - Non-consumable

### Android Products (Google Play Console)

1. **Monthly Premium**
   - Product ID: `monthly_premium`
   - Price: $9.99
   - Billing Period: 1 month
   - Subscription

2. **Annual Premium**
   - Product ID: `annual_premium`
   - Price: $95.99
   - Billing Period: 1 year
   - Subscription

3. **Lifetime Premium**
   - Product ID: `lifetime_premium`
   - Price: $199.99
   - One-time purchase

## 🔧 Implementation Code

Update your `src/services/revenueCatService.ts`:

```typescript
import Purchases, { PurchasesOffering, CustomerInfo, PurchasesPackage } from "react-native-purchases";
import { Platform } from "react-native";

export class RevenueCatService {
  private static instance: RevenueCatService;
  private isInitialized = false;

  // Your app IDs from RevenueCat
  private readonly CONFIG = {
    ios: "appbbff2f8dd5_public_key", // Get from RevenueCat dashboard
    android: "app360535eb49_public_key", // Get from RevenueCat dashboard
    entitlement: "premium_features",
    offering: "default",
  };

  static getInstance(): RevenueCatService {
    if (!RevenueCatService.instance) {
      RevenueCatService.instance = new RevenueCatService();
    }
    return RevenueCatService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const apiKey = Platform.select({
        ios: this.CONFIG.ios,
        android: this.CONFIG.android,
      });

      if (!apiKey) {
        throw new Error("RevenueCat API key not configured");
      }

      await Purchases.configure({ apiKey });

      if (__DEV__) {
        Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
      }

      this.isInitialized = true;
      console.log("RevenueCat initialized for LockerRoom");
    } catch (error) {
      console.error("Failed to initialize RevenueCat:", error);
      throw error;
    }
  }

  async checkPremiumStatus(): Promise<boolean> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      return customerInfo.entitlements.active[this.CONFIG.entitlement] !== undefined;
    } catch (error) {
      console.error("Error checking premium status:", error);
      return false;
    }
  }

  async getOfferings(): Promise<PurchasesOffering | null> {
    try {
      const offerings = await Purchases.getOfferings();
      return offerings.current;
    } catch (error) {
      console.error("Error fetching offerings:", error);
      return null;
    }
  }

  async purchasePackage(packageToPurchase: PurchasesPackage): Promise<CustomerInfo> {
    try {
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      console.log("Purchase successful:", customerInfo.entitlements.active);
      return customerInfo;
    } catch (error) {
      console.error("Purchase failed:", error);
      throw error;
    }
  }

  async restorePurchases(): Promise<CustomerInfo> {
    try {
      const customerInfo = await Purchases.restorePurchases();
      console.log("Purchases restored:", customerInfo.entitlements.active);
      return customerInfo;
    } catch (error) {
      console.error("Restore failed:", error);
      throw error;
    }
  }
}

export const revenueCatService = RevenueCatService.getInstance();
```

## 🌐 Webhook Configuration

Configure your webhook endpoint in RevenueCat dashboard:

**Webhook URL**: `https://your-supabase-project.supabase.co/functions/v1/revenuecat-webhook`

**Events to Subscribe**:

- Initial Purchase
- Renewal
- Cancellation
- Billing Issue
- Product Change
- Subscription Paused
- Expiration

## 📋 Next Steps

1. **Get API Keys from RevenueCat Dashboard**:
   - Go to: https://app.revenuecat.com
   - Navigate to: LockerRoom → Apps → [iOS/Android] → API Keys
   - Copy the public SDK keys

2. **Update Environment Variables**:

   ```bash
   EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=<ios_public_key>
   EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=<android_public_key>
   ```

3. **Create Products in App Stores**:
   - Create the products listed above in App Store Connect
   - Create the products in Google Play Console
   - Import them to RevenueCat dashboard

4. **Create Packages**:
   Once products are imported, create packages in the default offering:
   - `$rc_monthly` → Monthly Premium
   - `$rc_annual` → Annual Premium
   - `$rc_lifetime` → Lifetime Premium

5. **Test Purchases**:
   - Use sandbox accounts for iOS
   - Use test accounts for Android
   - Verify entitlement unlocking

## 🧪 Testing Checklist

- [ ] RevenueCat SDK initializes without errors
- [ ] Offerings load correctly
- [ ] Products display with correct prices
- [ ] Purchase flow completes successfully
- [ ] Entitlements unlock premium features
- [ ] Restore purchases works
- [ ] Webhook receives events
- [ ] Subscription status syncs with database

## 🔒 Security Notes

- Never expose your secret API key (`sk_NwaebOrtgTNIWxHRYqbMFkxYNmXlf`)
- Use public SDK keys in your mobile app
- Store webhook secret securely in Supabase
- Validate all webhook events

## 📊 Using RevenueCat MCP in Claude

Now that your project is connected, you can use natural language commands in Claude:

- "Show me revenue metrics for LockerRoom"
- "List all active subscribers"
- "Create a promotional campaign"
- "Check subscription status for user X"
- "Update product pricing"
- "Generate revenue report for last 30 days"

The MCP integration allows you to manage everything without leaving Claude!
