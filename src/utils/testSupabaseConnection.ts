import { supabase } from "../config/supabase";

/**
 * Test Supabase connection and authentication
 */
export const testSupabaseConnection = async () => {
  console.log("🔍 Testing Supabase connection...");
  
  try {
    // Test 1: Basic connection
    console.log("📡 Testing basic connection...");
    const { data, error } = await supabase.from("users").select("id").limit(1);
    
    if (error) {
      console.error("❌ Basic connection failed:", error);
      return false;
    }
    
    console.log("✅ Basic connection successful");
    
    // Test 2: Auth service availability
    console.log("🔐 Testing auth service...");
    const { data: session } = await supabase.auth.getSession();
    console.log("✅ Auth service available, current session:", session?.session ? "Active" : "None");
    
    // Test 3: Network timeout test with AbortController
    console.log("⏱️ Testing network timeout handling with AbortController...");
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, 5000);
    
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id")
        .limit(1)
        .abortSignal(abortController.signal);
      
      clearTimeout(timeoutId);
      
      if (error) {
        if (error.message?.includes('aborted')) {
          console.log("⚠️ Connection timed out (5 seconds)");
        } else {
          throw error;
        }
      } else {
        console.log("✅ Network timeout handling working");
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError' || error.message?.includes('aborted')) {
        console.log("⚠️ Connection aborted due to timeout");
      } else {
        console.error("❌ Network error:", error.message || error);
      }
    }
    
    return true;
  } catch (error) {
    console.error("❌ Supabase connection test failed:", error);
    return false;
  }
};

/**
 * Test authentication flow
 */
export const testAuthFlow = async (email: string, password: string) => {
  console.log("🔐 Testing authentication flow...");
  
  try {
    // Test sign up (will fail if user exists, which is expected)
    console.log("📝 Testing sign up...");
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          console.log("ℹ️ User already exists (expected)");
        } else {
          console.error("❌ Sign up error:", signUpError);
        }
      } else {
        console.log("✅ Sign up successful:", signUpData.user?.email);
      }
    } catch (error) {
      console.error("❌ Sign up failed:", error);
    }
    
    // Test sign in
    console.log("🔑 Testing sign in...");
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (signInError) {
      console.error("❌ Sign in error:", signInError);
      return false;
    }
    
    console.log("✅ Sign in successful:", signInData.user?.email);
    
    // Test sign out
    console.log("🚪 Testing sign out...");
    const { error: signOutError } = await supabase.auth.signOut();
    
    if (signOutError) {
      console.error("❌ Sign out error:", signOutError);
      return false;
    }
    
    console.log("✅ Sign out successful");
    return true;
    
  } catch (error) {
    console.error("❌ Auth flow test failed:", error);
    return false;
  }
};
