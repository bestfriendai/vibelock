import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { mmkvStorage } from "../utils/mmkvStorage";
import { canUseRevenueCat, buildEnv } from "../utils/buildEnvironment";
import { subscriptionService } from "../services/subscriptionService";
import supabase from "../config/supabase";

// Environment-configurable premium entitlements
const PREMIUM_ENTITLEMENTS = (process.env.EXPO_PUBLIC_REVENUECAT_PREMIUM_ENTITLEMENTS || "premium,pro")
  .split(",")
  .map((s: string) => s.trim())
  .filter(Boolean);

// Types (always available)
interface CustomerInfo {
  entitlements: {
    active: Record<string, any>;
  };
  [key: string]: any; // Additional properties from RevenueCat
}

interface PurchasesPackage {
  identifier: string;
  packageType: string;
  storeProduct: {
    title: string;
    description: string;
    priceString: string;
    price: string;
    [key: string]: any; // Additional properties
  };
  [key: string]: any; // Additional properties
}

interface PurchasesOffering {
  identifier: string;
  availablePackages: PurchasesPackage[];
  [key: string]: any; // Additional properties
}

// Stub implementation for RevenueCat functionality
type RevenueCatStub = {
  configure: (config: { apiKey: string; appUserID?: string }) => Promise<void>;
  setDebugLogsEnabled: (enabled: boolean) => void;
  getCustomerInfo: () => Promise<CustomerInfo>;
  getOfferings: () => Promise<{ all: Record<string, any> }>;
  purchasePackage: (pkg: any) => Promise<{ customerInfo: CustomerInfo }>;
  restorePurchases: () => Promise<CustomerInfo>;
  setAttributes: (attributes: Record<string, string>) => void;
  logIn: (userId: string) => Promise<void>;
};

interface SubscriptionState {
  // Core state (always available)
  isPremium: boolean;
  isLoading: boolean;

  // Enhanced state (development build only)
  customerInfo: CustomerInfo | null;
  isPro: boolean;
  activeSubscription: any | null;
  offerings: PurchasesOffering[];

  // Supabase integration state
  shouldShowAds: boolean;
  subscriptionTier: "free" | "premium" | "pro";
  subscriptionExpiresAt: Date | null;

  // Actions
  setPremium: (v: boolean) => void;
  initializeRevenueCat: (userId?: string) => Promise<void>;
  identifyRevenueCatUser: (userId: string) => Promise<void>;
  checkSubscriptionStatus: () => Promise<void>;
  updateCustomerInfo: (info: CustomerInfo) => void;
  loadOfferings: () => Promise<void>;
  purchasePackage: (packageToPurchase: PurchasesPackage) => Promise<CustomerInfo | null>;
  restorePurchases: () => Promise<CustomerInfo>;
  setLoading: (loading: boolean) => void;

  // Supabase integration actions
  syncWithSupabase: (userId: string) => Promise<void>;
  checkAdStatus: (userId: string) => Promise<void>;
}

const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      // Core state
      isPremium: false,
      isLoading: false,

      // Enhanced state
      customerInfo: null,
      isPro: false,
      activeSubscription: null,
      offerings: [],

      // Supabase integration state
      shouldShowAds: true,
      subscriptionTier: "free",
      subscriptionExpiresAt: null,

      setPremium: (v: boolean) => set({ isPremium: v }),
      setLoading: (loading: boolean) => set({ isLoading: loading }),

      initializeRevenueCat: async (userId?: string) => {
        if (!canUseRevenueCat()) {
          console.log("RevenueCat not available in Expo Go - using mock implementation");
          // Mock successful initialization
          set({ isLoading: false });
          return;
        }

        try {
          set({ isLoading: true });

          // Use stub implementation instead of react-native-purchases
          const Purchases = createRevenueCatStub();
          const { Platform } = await import("react-native");

          if (!Purchases || typeof Purchases.configure !== "function") {
            throw new Error("RevenueCat module not properly loaded");
          }

          const apiKey = Platform.select({
            ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
            android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
          });

          if (!apiKey || typeof apiKey !== "string") {
            throw new Error("RevenueCat API key not found or invalid");
          }

          if (typeof Purchases.setDebugLogsEnabled === "function") {
            Purchases.setDebugLogsEnabled(__DEV__);
          }

          await Purchases.configure({
            apiKey,
            appUserID: userId || undefined,
          });

          if (userId && typeof Purchases.setAttributes === "function") {
            Purchases.setAttributes({
              user_id: userId,
              created_at: new Date().toISOString(),
            });
          }

          await get().checkSubscriptionStatus();
          await get().loadOfferings();

          // Sync with Supabase after successful RevenueCat initialization
          if (userId) {
            await get().syncWithSupabase(userId);
          }

          console.log("RevenueCat initialized successfully");
        } catch (error) {
          console.warn("RevenueCat initialization failed:", error);
          set({ isLoading: false });
        }
      },

      identifyRevenueCatUser: async (userId: string) => {
        if (!canUseRevenueCat()) {
          console.log("RevenueCat not available - skipping user identification");
          return;
        }

        try {
          const Purchases = createRevenueCatStub();

          if (!Purchases) {
            console.warn("RevenueCat module not available for user identification");
            return;
          }

          // Set user ID for RevenueCat
          if (typeof Purchases.logIn === "function") {
            await Purchases.logIn(userId);
            console.log("RevenueCat user identified:", userId);
          } else if (typeof Purchases.setAttributes === "function") {
            // Fallback to setting attributes if logIn is not available
            Purchases.setAttributes({
              user_id: userId,
              identified_at: new Date().toISOString(),
            });
            console.log("RevenueCat user attributes set:", userId);
          }

          // Refresh customer info after identification
          await get().checkSubscriptionStatus();
        } catch (error) {
          console.warn("Failed to identify RevenueCat user:", error);
        }
      },

      checkSubscriptionStatus: async () => {
        if (!canUseRevenueCat()) {
          // Mock implementation for Expo Go
          set({ isLoading: false });
          return;
        }

        try {
          const Purchases = createRevenueCatStub();

          if (!Purchases || typeof Purchases.getCustomerInfo !== "function") {
            throw new Error("RevenueCat getCustomerInfo not available");
          }

          const customerInfo = await Purchases.getCustomerInfo();
          if (customerInfo && typeof customerInfo === "object") {
            get().updateCustomerInfo(customerInfo);

            // Sync with Supabase when subscription status changes
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (user) {
              await subscriptionService.syncSubscriptionStatus(user.id, customerInfo);
              await get().syncWithSupabase(user.id);
            }
          }
        } catch (error) {
          console.warn("Failed to check subscription status:", error);
          set({ isLoading: false });
        }
      },

      updateCustomerInfo: (info: CustomerInfo | null | undefined) => {
        if (!info || typeof info !== "object") {
          set({
            customerInfo: null,
            isPremium: false,
            isPro: false,
            activeSubscription: null,
            isLoading: false,
          });
          return;
        }

        const active = info.entitlements?.active || {};
        const isPremium =
          Object.keys(active).some((id) => PREMIUM_ENTITLEMENTS.includes(id)) || Object.keys(active).length > 0;
        const isPro = "pro" in active; // Keep backward compatibility for isPro
        const activeSubscription = Object.values(active)[0] || null;

        set({
          customerInfo: info,
          isPremium,
          isPro,
          activeSubscription,
          isLoading: false,
        });
      },

      loadOfferings: async () => {
        if (!canUseRevenueCat()) {
          // Mock offerings for Expo Go
          const mockOfferings: PurchasesOffering[] = [
            {
              identifier: "default",
              availablePackages: [
                {
                  identifier: "monthly",
                  packageType: "MONTHLY",
                  storeProduct: {
                    title: "Monthly Premium",
                    description: "Premium features monthly",
                    priceString: "$4.99",
                    price: "4.99",
                  },
                },
                {
                  identifier: "annual",
                  packageType: "ANNUAL",
                  storeProduct: {
                    title: "Annual Premium",
                    description: "Premium features yearly",
                    priceString: "$29.99",
                    price: "29.99",
                  },
                },
              ],
            },
          ];
          set({ offerings: mockOfferings });
          return;
        }

        try {
          const Purchases = createRevenueCatStub();

          if (!Purchases || typeof Purchases.getOfferings !== "function") {
            throw new Error("RevenueCat getOfferings not available");
          }

          const offerings = await Purchases.getOfferings();
          if (offerings?.all && typeof offerings.all === "object") {
            const offeringsArray = Object.values(offerings.all).filter(
              (offering): offering is PurchasesOffering =>
                offering && typeof offering === "object" && "identifier" in offering,
            );
            set({ offerings: offeringsArray });
          }
        } catch (error) {
          console.warn("Failed to load offerings:", error);
        }
      },

      purchasePackage: async (packageToPurchase: PurchasesPackage) => {
        if (!canUseRevenueCat()) {
          // Mock purchase for Expo Go - simulate success
          set({ isLoading: true });
          await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate network delay
          set({ isPremium: true, isLoading: false });

          const mockCustomerInfo: CustomerInfo = {
            entitlements: {
              active: { premium: {} },
            },
          };
          return mockCustomerInfo;
        }

        try {
          set({ isLoading: true });
          const Purchases = createRevenueCatStub();

          if (!Purchases || typeof Purchases.purchasePackage !== "function") {
            throw new Error("RevenueCat purchasePackage not available");
          }

          const result = await Purchases.purchasePackage(packageToPurchase as any);
          if (result?.customerInfo && typeof result.customerInfo === "object") {
            get().updateCustomerInfo(result.customerInfo);

            // Sync purchase with Supabase
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (user) {
              await subscriptionService.syncSubscriptionStatus(user.id, result.customerInfo);
              await get().syncWithSupabase(user.id);
            }

            return result.customerInfo;
          }
          throw new Error("Invalid purchase result");
        } catch (error: any) {
          set({ isLoading: false });
          if (error && typeof error === "object" && !error.userCancelled) {
            console.warn("Purchase error:", error);
            throw error;
          }
          return null;
        }
      },

      restorePurchases: async () => {
        if (!canUseRevenueCat()) {
          // Mock restore for Expo Go
          const mockCustomerInfo: CustomerInfo = {
            entitlements: { active: {} },
          };
          return mockCustomerInfo;
        }

        try {
          set({ isLoading: true });
          const Purchases = createRevenueCatStub();

          if (!Purchases || typeof Purchases.restorePurchases !== "function") {
            throw new Error("RevenueCat restorePurchases not available");
          }

          const customerInfo = await Purchases.restorePurchases();
          if (customerInfo && typeof customerInfo === "object") {
            get().updateCustomerInfo(customerInfo);

            // Sync restored purchases with Supabase
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (user) {
              await subscriptionService.syncSubscriptionStatus(user.id, customerInfo);
              await get().syncWithSupabase(user.id);
            }

            return customerInfo;
          }
          throw new Error("Invalid restore result");
        } catch (error) {
          set({ isLoading: false });
          console.warn("Restore purchases error:", error);
          throw error;
        }
      },

      // Supabase integration methods
      syncWithSupabase: async (userId: string) => {
        try {
          const subscription = await subscriptionService.getUserSubscription(userId);
          const shouldShowAds = await subscriptionService.shouldShowAds(userId);

          set({
            subscriptionTier: subscription.tier as "free" | "premium" | "pro",
            subscriptionExpiresAt: subscription.expiresAt,
            shouldShowAds,
            isPremium: subscription.isActive && ["premium", "pro"].includes(subscription.tier),
            isPro: subscription.isActive && subscription.tier === "pro",
          });
        } catch (error) {
          console.warn("Failed to sync with Supabase:", error);
        }
      },

      checkAdStatus: async (userId: string) => {
        try {
          const shouldShowAds = await subscriptionService.shouldShowAds(userId);
          set({ shouldShowAds });
        } catch (error) {
          console.warn("Failed to check ad status:", error);
          // Default to showing ads if check fails
          set({ shouldShowAds: true });
        }
      },
    }),
    {
      name: "subscription-storage",
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        isPremium: state.isPremium,
        isPro: state.isPro,
        shouldShowAds: state.shouldShowAds,
        subscriptionTier: state.subscriptionTier,
        subscriptionExpiresAt: state.subscriptionExpiresAt,
      }),
    },
  ),
);

// Stub implementation to replace react-native-purchases
function createRevenueCatStub(): RevenueCatStub {
  return {
    configure: async (config: { apiKey: string; appUserID?: string }) => {
      console.log("[STUB] RevenueCat configure called with:", {
        apiKey: config.apiKey?.substring(0, 10) + "...",
        appUserID: config.appUserID,
      });
      // Simulate async operation
      await new Promise((resolve) => setTimeout(resolve, 100));
    },
    setDebugLogsEnabled: (enabled: boolean) => {
      console.log("[STUB] RevenueCat setDebugLogsEnabled:", enabled);
    },
    getCustomerInfo: async (): Promise<CustomerInfo> => {
      console.log("[STUB] RevenueCat getCustomerInfo called");
      await new Promise((resolve) => setTimeout(resolve, 200));
      return {
        entitlements: {
          active: {}, // No active subscriptions in stub
        },
      };
    },
    getOfferings: async () => {
      console.log("[STUB] RevenueCat getOfferings called");
      await new Promise((resolve) => setTimeout(resolve, 200));
      return {
        all: {
          default: {
            identifier: "default",
            availablePackages: [
              {
                identifier: "monthly",
                packageType: "MONTHLY",
                storeProduct: {
                  title: "Monthly Premium (STUB)",
                  description: "Premium features monthly (demo)",
                  priceString: "$4.99",
                  price: "4.99",
                },
              },
              {
                identifier: "annual",
                packageType: "ANNUAL",
                storeProduct: {
                  title: "Annual Premium (STUB)",
                  description: "Premium features yearly (demo)",
                  priceString: "$29.99",
                  price: "29.99",
                },
              },
            ],
          },
        },
      };
    },
    purchasePackage: async (pkg: any): Promise<{ customerInfo: CustomerInfo }> => {
      console.log("[STUB] RevenueCat purchasePackage called with:", pkg?.identifier);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate purchase flow
      const mockCustomerInfo: CustomerInfo = {
        entitlements: {
          active: { premium: {} }, // Simulate successful purchase
        },
      };
      return { customerInfo: mockCustomerInfo };
    },
    restorePurchases: async (): Promise<CustomerInfo> => {
      console.log("[STUB] RevenueCat restorePurchases called");
      await new Promise((resolve) => setTimeout(resolve, 500));
      return {
        entitlements: {
          active: {}, // No purchases to restore in stub
        },
      };
    },
    setAttributes: (attributes: Record<string, string>) => {
      console.log("[STUB] RevenueCat setAttributes called with:", attributes);
    },
    logIn: async (userId: string) => {
      console.log("[STUB] RevenueCat logIn called with:", userId);
      await new Promise((resolve) => setTimeout(resolve, 100));
    },
  };
}

export default useSubscriptionStore;
