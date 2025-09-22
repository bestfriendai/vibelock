import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { mmkvStorage } from "../utils/mmkvStorage";
import { Report } from "../types";
import { reportsService } from "../services/reports";
import useAuthStore from "./authStore";
import { AppError, parseSupabaseError } from "../utils/errorHandling";

// Constants for data limits
const MAX_PERSISTED_BLOCKED_USERS = 50;
const MAX_PERSISTED_REPORTS = 20;

// Sanitize safety data for persistence - remove sensitive information
const sanitizeSafetyDataForPersistence = (data: {
  blockedUsers: string[];
  blockedProfiles: string[];
  reports: Report[];
}) => {
  return {
    // Limit and anonymize blocked users
    blockedUsers: data.blockedUsers
      .slice(0, MAX_PERSISTED_BLOCKED_USERS)
      .map((userId) => "blocked_" + userId.substring(0, 8)),
    // Limit and anonymize blocked profiles
    blockedProfiles: data.blockedProfiles
      .slice(0, MAX_PERSISTED_BLOCKED_USERS)
      .map((profileId) => "blocked_" + profileId.substring(0, 8)),
    // Limit reports and remove sensitive details
    reports: data.reports.slice(0, MAX_PERSISTED_REPORTS).map((report) => ({
      ...report,
      reporterId: "reporter_" + report.reporterId.substring(0, 8),
      description: report.description ? report.description.substring(0, 50) + "..." : report.description,
    })),
  };
};

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
    reportedItemType: "review" | "profile" | "comment" | "message";
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
          blockedUsers: [...new Set([...state.blockedUsers, userId])],
        }));
      },

      unblockUser: (userId) => {
        set((state) => ({
          blockedUsers: state.blockedUsers.filter((id) => id !== userId),
        }));
      },

      blockProfile: (profileId) => {
        set((state) => ({
          blockedProfiles: [...new Set([...state.blockedProfiles, profileId])],
        }));
      },

      unblockProfile: (profileId) => {
        set((state) => ({
          blockedProfiles: state.blockedProfiles.filter((id) => id !== profileId),
        }));
      },

      reportContent: async (data) => {
        try {
          set({ isLoading: true, error: null });

          // Get current user from auth store
          const { user } = useAuthStore.getState();
          if (!user) {
            throw new Error("Must be signed in to report content");
          }

          // Create report in database
          const reportResult = await reportsService.createReport({
            reporterId: user.id,
            reportedItemId: data.reportedItemId,
            reportedItemType: data.reportedItemType,
            reason: data.reason,
            description: data.description,
          });
          const reportId = reportResult.id;

          // Create local report object for optimistic UI
          const newReport: Report = {
            id: reportId,
            reporterId: user.id,
            reportedItemId: data.reportedItemId,
            reportedItemType: data.reportedItemType,
            reason: data.reason,
            description: data.description,
            status: "pending",
            createdAt: new Date(),
          };

          set((state) => ({
            reports: [...state.reports, newReport],
            isLoading: false,
          }));
        } catch (error) {
          const appError = error instanceof AppError ? error : parseSupabaseError(error);
          set({
            error: appError.userMessage,
            isLoading: false,
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
      },
    }),
    {
      name: "safety-storage",
      storage: createJSONStorage(() => mmkvStorage),
      // Persist sanitized safety data, but not loading states
      partialize: (state) =>
        sanitizeSafetyDataForPersistence({
          blockedUsers: state.blockedUsers,
          blockedProfiles: state.blockedProfiles,
          reports: state.reports,
        }),
      // Add version for future migrations
      version: 1,
      migrate: (persistedState: any, _version: number) => {
        try {
          const ps = persistedState || {};
          return {
            blockedUsers: Array.isArray(ps.blockedUsers) ? ps.blockedUsers : [],
            blockedProfiles: Array.isArray(ps.blockedProfiles) ? ps.blockedProfiles : [],
            reports: Array.isArray(ps.reports) ? ps.reports : [],
          };
        } catch (error) {
          return { blockedUsers: [], blockedProfiles: [], reports: [] };
        }
      },
      // Add data cleanup on hydration
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Clean up old persisted reports periodically
          const now = Date.now();
          const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

          // Remove reports older than a month
          if (state.reports) {
            state.reports = state.reports.filter((report) => {
              return new Date(report.createdAt).getTime() > oneMonthAgo;
            });
          }

          if (__DEV__) {
            console.log("🧹 Safety store: Cleaned up old persisted data");
          }
        }
      },
    },
  ),
);

export default useSafetyStore;
