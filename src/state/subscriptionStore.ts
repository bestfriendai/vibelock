import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { canUseRevenueCat, buildEnv } from "../utils/buildEnvironment";

// Types (always available)
interface CustomerInfo {
  entitlements: {
    active: Record<string, any>;
  };
}

interface PurchasesPackage {
  identifier: string;
  packageType: string;
  storeProduct: {
    title: string;
    description: string;
    priceString: string;
    price: string;
  };
}

interface PurchasesOffering {
  identifier: string;
  availablePackages: PurchasesPackage[];
}

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

          // Dynamic import for development builds only
          const Purchases = (await import("react-native-purchases")).default;
          const { Platform } = await import("react-native");

          const apiKey = Platform.select({
            ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
            android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
          });

          if (!apiKey) {
            throw new Error("RevenueCat API key not found");
          }

          Purchases.setDebugLogsEnabled(__DEV__);

          await Purchases.configure({
            apiKey,
            appUserID: userId,
          });

          if (userId) {
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
          const Purchases = (await import("react-native-purchases")).default;
          const customerInfo = await Purchases.getCustomerInfo();
          get().updateCustomerInfo(customerInfo);
        } catch (error) {
          console.warn("Failed to check subscription status:", error);
          set({ isLoading: false });
        }
      },

      updateCustomerInfo: (info: CustomerInfo) => {
        const isPremium = "premium" in info.entitlements.active;
        const isPro = "pro" in info.entitlements.active;
        const activeSubscription = info.entitlements.active["premium"] || info.entitlements.active["pro"] || null;

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
          const Purchases = (await import("react-native-purchases")).default;
          const offerings = await Purchases.getOfferings();
          set({ offerings: Object.values(offerings.all) as any });
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
          const Purchases = (await import("react-native-purchases")).default;
          const { customerInfo } = await Purchases.purchasePackage(packageToPurchase as any);
          get().updateCustomerInfo(customerInfo);
          return customerInfo;
        } catch (error: any) {
          set({ isLoading: false });
          if (!error.userCancelled) {
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
          const Purchases = (await import("react-native-purchases")).default;
          const customerInfo = await Purchases.restorePurchases();
          get().updateCustomerInfo(customerInfo);
          return customerInfo;
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
