import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface SubscriptionState {
  isPremium: boolean;
  setPremium: (v: boolean) => void;
}

const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set) => ({
      isPremium: false,
      setPremium: (v: boolean) => set({ isPremium: v }),
    }),
    { name: "subscription-storage", storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export default useSubscriptionStore;

