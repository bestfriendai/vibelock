import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Report } from "../types";

interface SafetyState {
  blockedUsers: string[];
  blockedProfiles: string[];
  reports: Report[];
  isLoading: boolean;
  error: string | null;
}

interface SafetyActions {
  blockUser: (userId: string) => void;
  unblockUser: (userId: string) => void;
  blockProfile: (profileId: string) => void;
  unblockProfile: (profileId: string) => void;
  reportContent: (data: {
    reportedItemId: string;
    reportedItemType: "review" | "profile";
    reason: "inappropriate_content" | "fake_profile" | "harassment" | "spam" | "other";
    description?: string;
  }) => Promise<void>;
  isUserBlocked: (userId: string) => boolean;
  isProfileBlocked: (profileId: string) => boolean;
  clearError: () => void;
}

type SafetyStore = SafetyState & SafetyActions;

const useSafetyStore = create<SafetyStore>()(
  persist(
    (set, get) => ({
      // State
      blockedUsers: [],
      blockedProfiles: [],
      reports: [],
      isLoading: false,
      error: null,

      // Actions
      blockUser: (userId) => {
        set((state) => ({
          blockedUsers: [...new Set([...state.blockedUsers, userId])]
        }));
      },

      unblockUser: (userId) => {
        set((state) => ({
          blockedUsers: state.blockedUsers.filter(id => id !== userId)
        }));
      },

      blockProfile: (profileId) => {
        set((state) => ({
          blockedProfiles: [...new Set([...state.blockedProfiles, profileId])]
        }));
      },

      unblockProfile: (profileId) => {
        set((state) => ({
          blockedProfiles: state.blockedProfiles.filter(id => id !== profileId)
        }));
      },

      reportContent: async (data) => {
        try {
          set({ isLoading: true, error: null });

          const newReport: Report = {
            id: `report_${Date.now()}`,
            reporterId: `user_${Date.now()}`, // In production, use actual user ID
            reportedItemId: data.reportedItemId,
            reportedItemType: data.reportedItemType,
            reason: data.reason,
            description: data.description,
            status: "pending",
            createdAt: new Date()
          };

          // Simulate API delay
          await new Promise(resolve => setTimeout(resolve, 500));

          set((state) => ({
            reports: [...state.reports, newReport],
            isLoading: false
          }));

        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to submit report",
            isLoading: false
          });
        }
      },

      isUserBlocked: (userId) => {
        return get().blockedUsers.includes(userId);
      },

      isProfileBlocked: (profileId) => {
        return get().blockedProfiles.includes(profileId);
      },

      clearError: () => {
        set({ error: null });
      }
    }),
    {
      name: "safety-storage",
      storage: createJSONStorage(() => AsyncStorage),
      // Persist blocked users and profiles, but not reports or loading states
      partialize: (state) => ({
        blockedUsers: state.blockedUsers,
        blockedProfiles: state.blockedProfiles
      }),
    }
  )
);

export default useSafetyStore;