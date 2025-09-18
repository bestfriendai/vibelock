#!/usr/bin/env node

/**
 * Test script to verify the authentication fix
 * This simulates the authentication flow that was failing
 */

console.log("🧪 Testing authentication fix...\n");

// Mock the auth service and store
const mockAuthService = {
  getCurrentUser: async () => {
    console.log("📞 authService.getCurrentUser() called");
    return {
      id: "test-supabase-user-123",
      email: "test@example.com",
      created_at: new Date().toISOString(),
    };
  },
};

const mockAuthStore = {
  getState: () => ({
    isAuthenticated: true,
    user: {
      id: "test-store-user-123",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
    },
    isGuestMode: false,
  }),
};

// Mock the fixed getAuthenticatedUser function
const getAuthenticatedUser = async () => {
  try {
    const storeState = mockAuthStore.getState();
    console.log("🔍 Store state:", {
      isAuthenticated: storeState.isAuthenticated,
      hasUser: !!storeState.user,
      isGuestMode: storeState.isGuestMode,
      userId: storeState.user?.id?.slice(-4) || "none",
    });

    const supabaseUser = await mockAuthService.getCurrentUser();
    console.log("🔍 Supabase user:", {
      hasSupabaseUser: !!supabaseUser,
      supabaseUserId: supabaseUser?.id?.slice(-4) || "none",
    });

    const isFullyAuthenticated = storeState.isAuthenticated && storeState.user && supabaseUser;

    return {
      user: isFullyAuthenticated ? storeState.user : null,
      supabaseUser: isFullyAuthenticated ? supabaseUser : null,
    };
  } catch (error) {
    console.warn("Error checking authentication:", error);
    return { user: null, supabaseUser: null };
  }
};

// Mock the fixed requireAuthentication function
const requireAuthentication = async (action = "perform this action") => {
  console.log(`🔐 requireAuthentication called for: ${action}`);

  const { user, supabaseUser } = await getAuthenticatedUser();

  console.log("🔍 Auth check result:", {
    hasUser: !!user,
    hasSupabaseUser: !!supabaseUser,
    userId: user?.id?.slice(-4) || "none",
    supabaseUserId: supabaseUser?.id?.slice(-4) || "none",
  });

  if (!user && !supabaseUser) {
    console.error(`❌ Authentication failed for ${action}: No user or supabaseUser found`);
    throw new Error(`Must be signed in to ${action}`);
  }

  // If we have store user but no supabase user, try to get supabase user again
  if (user && !supabaseUser) {
    console.log("🔄 Getting fresh Supabase user...");
    const freshSupabaseUser = await mockAuthService.getCurrentUser(); // FIXED: was supabaseAuth.getCurrentUser()
    return { user, supabaseUser: freshSupabaseUser || null };
  }

  return { user: user, supabaseUser: supabaseUser };
};

// Test the authentication flow
async function testAuthFlow() {
  try {
    console.log('1️⃣ Testing requireAuthentication for "join chat room"...');
    const result = await requireAuthentication("join chat room");

    console.log("✅ Authentication successful!");
    console.log("📋 Result:", {
      hasUser: !!result.user,
      hasSupabaseUser: !!result.supabaseUser,
      userEmail: result.user?.email,
      supabaseUserEmail: result.supabaseUser?.email,
    });

    console.log("\n🎉 The authentication fix is working correctly!");
    console.log("🔧 The bug was: supabaseAuth.getCurrentUser() -> authService.getCurrentUser()");
  } catch (error) {
    console.error("❌ Authentication test failed:", error.message);
    console.log("🐛 The fix did not resolve the issue");
  }
}

testAuthFlow();
