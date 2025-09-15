/**
 * @deprecated This monolithic service file is deprecated.
 * Please use the modular services directly:
 * - authService from './auth'
 * - usersService from './users'
 * - reviewsService from './reviews'
 * - chatService from './chat'
 * - reportsService from './reports'
 * - searchService from './search'
 * - storageService from './storage'
 *
 * This file now re-exports the modular services for backward compatibility.
 * All new code should import from the modular service files directly.
 */

// Re-export modular services for backward compatibility
export { authService as supabaseAuth } from "./auth";
export { usersService as supabaseUsers } from "./users";
export { reviewsService as supabaseReviews } from "./reviews";
export { chatService as supabaseChat } from "./chat";
export { reportsService as supabaseReports } from "./reports";
export { searchService as supabaseSearch } from "./search";
export { storageService as supabaseStorage } from "./storage";

// Re-export supabase client and error handler for backward compatibility
export { supabase, handleSupabaseError } from "../config/supabase";

// Export placeholder for comments service (if needed in the future)
export const supabaseComments = {
  createComment: async () => {
    throw new Error("Please use modular services");
  },
  getComments: async () => {
    throw new Error("Please use modular services");
  },
  updateComment: async () => {
    throw new Error("Please use modular services");
  },
  deleteComment: async () => {
    throw new Error("Please use modular services");
  },
  onCommentsSnapshot: () => {
    throw new Error("Please use modular services");
  },
};
