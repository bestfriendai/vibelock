import Purchases, {
  PurchasesOffering,
  CustomerInfo,
  PurchasesPackage,
  PURCHASES_ERROR_CODE,
  PurchasesStoreProduct,
  LOG_LEVEL,
} from "react-native-purchases";
import { Platform, Alert } from "react-native";

/**
 * RevenueCat Service for LockerRoom
 * Manages all subscription and in-app purchase functionality
 */
export class RevenueCatService {
  private static instance: RevenueCatService;
  private isInitialized = false;
  private currentUserId: string | null = null;

  // Configuration with your actual API keys
  private readonly CONFIG = {
    ios: "appl_CyjOqIadlWZmncacXcBdlnsJlvU",
    android: "goog_lPWImthqDCqkfMZpVFPUPjJGeci",
    entitlement: "premium_features",
    offering: "default",
  };

  // Product identifiers
  private readonly PRODUCTS = {
    ios: {
      monthly: "com.lockerroomtalk.premium.monthly",
      annual: "com.lockerroomtalk.premium.annual",
      lifetime: "com.lockerroomtalk.premium.lifetime",
    },
    android: {
      monthly: "monthly_premium",
      annual: "annual_premium",
      lifetime: "lifetime_premium",
    },
  };

  static getInstance(): RevenueCatService {
    if (!RevenueCatService.instance) {
      RevenueCatService.instance = new RevenueCatService();
    }
    return RevenueCatService.instance;
  }

  /**
   * Initialize RevenueCat SDK
   */
  async initialize(userId?: string): Promise<void> {
    if (this.isInitialized && this.currentUserId === userId) {
      return;
    }

    try {
      // Get platform-specific API key
      const apiKey = Platform.select({
        ios: this.CONFIG.ios,
        android: this.CONFIG.android,
      });

      if (!apiKey) {
        throw new Error("RevenueCat API key not configured for this platform");
      }

      // Configure Purchases
      Purchases.configure({
        apiKey,
        appUserID: userId || null, // Use provided user ID or let RC generate one
        useAmazon: false,
      });

      // Set log level for debugging
      if (__DEV__) {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      } else {
        Purchases.setLogLevel(LOG_LEVEL.ERROR);
      }

      // Set user attributes if user ID provided
      if (userId) {
        await this.setUserAttributes(userId);
      }

      this.isInitialized = true;
      this.currentUserId = userId || null;

      // Log initial customer info
      const customerInfo = await this.getCustomerInfo();
      console.log("✅ RevenueCat initialized:", customerInfo);
    } catch (error) {
      console.error("❌ Failed to initialize RevenueCat:", error);
      throw error;
    }
  }

  /**
   * Set user attributes for analytics
   */
  private async setUserAttributes(userId: string): Promise<void> {
    try {
      // Set display name
      await Purchases.setDisplayName(userId);

      // You can set additional attributes here
      await Purchases.setAttributes({
        platform: Platform.OS,
        app_version: "1.0.0",
      });
    } catch (error) {
      console.error("Error setting user attributes:", error);
    }
  }

  /**
   * Check if user has active premium subscription
   */
  async checkPremiumStatus(): Promise<boolean> {
    try {
      const customerInfo = await this.getCustomerInfo();
      return this.isPremiumActive(customerInfo);
    } catch (error) {
      console.error("Error checking premium status:", error);
      return false;
    }
  }

  /**
   * Helper to check if premium is active from customer info
   */
  private isPremiumActive(customerInfo: CustomerInfo): boolean {
    return customerInfo.entitlements.active[this.CONFIG.entitlement] !== undefined;
  }

  /**
   * Get customer information
   */
  async getCustomerInfo(): Promise<CustomerInfo> {
    try {
      return await Purchases.getCustomerInfo();
    } catch (error) {
      console.error("Error getting customer info:", error);
      throw error;
    }
  }

  /**
   * Get available offerings
   */
  async getOfferings(): Promise<PurchasesOffering | null> {
    try {
      const offerings = await Purchases.getOfferings();

      if (!offerings.current) {
        return null;
      }

      // Log available packages for debugging
      console.log(
        "📦 Available packages:",
        offerings.current.availablePackages.map((p) => {
          const product = p.product as PurchasesStoreProduct;
          return {
            identifier: p.identifier,
            product: product.identifier,
            price: product.priceString,
          };
        }),
      );

      return offerings.current;
    } catch (error) {
      console.error("Error fetching offerings:", error);
      return null;
    }
  }

  /**
   * Purchase a specific package
   */
  async purchasePackage(packageToPurchase: PurchasesPackage): Promise<{
    success: boolean;
    customerInfo?: CustomerInfo;
    cancelled?: boolean;
    error?: string;
  }> {
    try {
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);

      const isPremium = this.isPremiumActive(customerInfo);

      if (isPremium) {
        return { success: true, customerInfo };
      } else {
        return {
          success: false,
          error: "Purchase processed but premium not activated. Please contact support.",
        };
      }
    } catch (error: any) {
      if (error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
        return { success: false, cancelled: true };
      }
      console.error("Purchase error:", error.message || error);
      return { success: false, error: error.message || "Purchase failed" };
    }
  }

  /**
   * Purchase by product type (monthly, annual, lifetime)
   */
  async purchaseByType(type: "monthly" | "annual" | "lifetime"): Promise<{
    success: boolean;
    customerInfo?: CustomerInfo;
    cancelled?: boolean;
    error?: string;
  }> {
    try {
      const offerings = await this.getOfferings();

      if (!offerings) {
        return { success: false, error: "No offerings available" };
      }

      // Map type to package identifier
      const packageIdentifiers: Record<string, string> = {
        monthly: "$rc_monthly",
        annual: "$rc_annual",
        lifetime: "$rc_lifetime",
      };

      const packageId = packageIdentifiers[type];
      const packageToPurchase = offerings.availablePackages.find((p) => p.identifier === packageId);

      if (!packageToPurchase) {
        return { success: false, error: `Package ${type} not found` };
      }

      return await this.purchasePackage(packageToPurchase);
    } catch (error) {
      console.error("Error purchasing by type:", error);
      return { success: false, error: "Failed to process purchase" };
    }
  }

  /**
   * Restore previous purchases
   */
  async restorePurchases(): Promise<{
    success: boolean;
    customerInfo?: CustomerInfo;
    hadPremium: boolean;
    error?: string;
  }> {
    try {
      const customerInfo = await Purchases.restorePurchases();
      const isPremium = this.isPremiumActive(customerInfo);

      if (isPremium) {
        return { success: true, customerInfo, hadPremium: true };
      } else {
        return { success: true, customerInfo, hadPremium: false };
      }
    } catch (error) {
      console.error("Error restoring purchases:", error);
      return {
        success: false,
        hadPremium: false,
        error: error instanceof Error ? error.message : "Restore failed",
      };
    }
  }

  /**
   * Get specific product details
   */
  async getProduct(productId: string): Promise<PurchasesStoreProduct | null> {
    try {
      const products = await Purchases.getProducts([productId]);
      return products[0] || null;
    } catch (error) {
      console.error("Error fetching product:", error);
      return null;
    }
  }

  /**
   * Check if user can make payments
   */
  async canMakePayments(): Promise<boolean> {
    try {
      return await Purchases.canMakePayments();
    } catch (error) {
      console.error("Error checking payment capability:", error);
      return false;
    }
  }

  /**
   * Logout current user (for user switching)
   */
  async logout(): Promise<void> {
    try {
      await Purchases.logOut();
      this.currentUserId = null;
    } catch (error) {
      console.error("Error logging out:", error);
    }
  }

  /**
   * Show manage subscriptions page
   */
  async showManageSubscriptions(): Promise<void> {
    try {
      if (Platform.OS === "ios") {
        // iOS opens subscription management in Settings
        await Purchases.showManageSubscriptions();
      } else {
        // Android opens Google Play subscriptions
        Alert.alert("Manage Subscription", "You will be redirected to Google Play to manage your subscription.", [
          { text: "Cancel", style: "cancel" },
          { text: "Continue", onPress: () => Purchases.showManageSubscriptions() },
        ]);
      }
    } catch (error) {
      console.error("Error showing subscription management:", error);
      Alert.alert("Error", "Could not open subscription management");
    }
  }

  /**
   * Get price string for a specific product type
   */
  async getPriceString(type: "monthly" | "annual" | "lifetime"): Promise<string | null> {
    try {
      const offerings = await this.getOfferings();
      if (!offerings) return null;

      const packageIdentifiers: Record<string, string> = {
        monthly: "$rc_monthly",
        annual: "$rc_annual",
        lifetime: "$rc_lifetime",
      };

      const packageId = packageIdentifiers[type];
      const pkg = offerings.availablePackages.find((p) => p.identifier === packageId);

      if (pkg) {
        const product = pkg.product as PurchasesStoreProduct;
        return product.priceString || null;
      }

      return null;
    } catch (error) {
      console.error("Error getting price string:", error);
      return null;
    }
  }

  /**
   * Check subscription expiration date
   */
  async getExpirationDate(): Promise<Date | null> {
    try {
      const customerInfo = await this.getCustomerInfo();
      const entitlement = customerInfo.entitlements.active[this.CONFIG.entitlement];

      if (entitlement?.expirationDate) {
        return new Date(entitlement.expirationDate);
      }

      return null;
    } catch (error) {
      console.error("Error getting expiration date:", error);
      return null;
    }
  }

  /**
   * Check if subscription will renew
   */
  async willRenew(): Promise<boolean> {
    try {
      const customerInfo = await this.getCustomerInfo();
      const entitlement = customerInfo.entitlements.active[this.CONFIG.entitlement];

      return entitlement?.willRenew || false;
    } catch (error) {
      console.error("Error checking renewal status:", error);
      return false;
    }
  }
}

// Export singleton instance
export const revenueCatService = RevenueCatService.getInstance();
