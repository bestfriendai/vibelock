import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { canUseRevenueCat, buildEnv } from "../utils/buildEnvironment";

// Environment-configurable premium entitlements
const PREMIUM_ENTITLEMENTS = (process.env.EXPO_PUBLIC_REVENUECAT_PREMIUM_ENTITLEMENTS || "premium,pro")
  .split(",")
  .map((s) => s.trim())
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

// Type for dynamic RevenueCat import
type RevenueCatModule = {
  default: {
    configure: (config: { apiKey: string; appUserID?: string }) => Promise<void>;
    setDebugLogsEnabled: (enabled: boolean) => void;
    getCustomerInfo: () => Promise<CustomerInfo>;
    getOfferings: () => Promise<{ all: Record<string, any> }>;
    purchasePackage: (pkg: any) => Promise<{ customerInfo: CustomerInfo }>;
    restorePurchases: () => Promise<CustomerInfo>;
    setAttributes: (attributes: Record<string, string>) => void;
    [key: string]: any;
  };
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

  // Actions
  setPremium: (v: boolean) => void;
  initializeRevenueCat: (userId?: string) => Promise<void>;
  checkSubscriptionStatus: () => Promise<void>;
  updateCustomerInfo: (info: CustomerInfo) => void;
  loadOfferings: () => Promise<void>;
  purchasePackage: (packageToPurchase: PurchasesPackage) => Promise<CustomerInfo | null>;
  restorePurchases: () => Promise<CustomerInfo>;
  setLoading: (loading: boolean) => void;
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

          // Dynamic import for development builds only with better type safety
          const RevenueCatModule = (await import("react-native-purchases")) as RevenueCatModule;
          const Purchases = RevenueCatModule.default;
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

          console.log("RevenueCat initialized successfully");
        } catch (error) {
          console.warn("RevenueCat initialization failed:", error);
          set({ isLoading: false });
        }
      },

      checkSubscriptionStatus: async () => {
        if (!canUseRevenueCat()) {
          // Mock implementation for Expo Go
          set({ isLoading: false });
          return;
        }

        try {
          const RevenueCatModule = (await import("react-native-purchases")) as RevenueCatModule;
          const Purchases = RevenueCatModule.default;

          if (!Purchases || typeof Purchases.getCustomerInfo !== "function") {
            throw new Error("RevenueCat getCustomerInfo not available");
          }

          const customerInfo = await Purchases.getCustomerInfo();
          if (customerInfo && typeof customerInfo === "object") {
            get().updateCustomerInfo(customerInfo);
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
          const RevenueCatModule = (await import("react-native-purchases")) as RevenueCatModule;
          const Purchases = RevenueCatModule.default;

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
          const RevenueCatModule = (await import("react-native-purchases")) as RevenueCatModule;
          const Purchases = RevenueCatModule.default;

          if (!Purchases || typeof Purchases.purchasePackage !== "function") {
            throw new Error("RevenueCat purchasePackage not available");
          }

          const result = await Purchases.purchasePackage(packageToPurchase as any);
          if (result?.customerInfo && typeof result.customerInfo === "object") {
            get().updateCustomerInfo(result.customerInfo);
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
          const RevenueCatModule = (await import("react-native-purchases")) as RevenueCatModule;
          const Purchases = RevenueCatModule.default;

          if (!Purchases || typeof Purchases.restorePurchases !== "function") {
            throw new Error("RevenueCat restorePurchases not available");
          }

          const customerInfo = await Purchases.restorePurchases();
          if (customerInfo && typeof customerInfo === "object") {
            get().updateCustomerInfo(customerInfo);
            return customerInfo;
          }
          throw new Error("Invalid restore result");
        } catch (error) {
          set({ isLoading: false });
          console.warn("Restore purchases error:", error);
          throw error;
        }
      },
    }),
    {
      name: "subscription-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isPremium: state.isPremium,
        isPro: state.isPro,
      }),
    },
  ),
);

export default useSubscriptionStore;
