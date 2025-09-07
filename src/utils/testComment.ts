// Simple test function to verify comment creation without complex auth checks
import { supabase } from "../config/supabase";
import useAuthStore from "../state/authStore";

export const testCommentCreation = async (reviewId: string, content: string) => {
  console.log("🧪 Testing comment creation...");
  
  try {
    // Check store state
    const storeState = useAuthStore.getState();
    console.log("📱 Store state:", {
      hasUser: !!storeState.user,
      isAuthenticated: storeState.isAuthenticated,
      isGuestMode: storeState.isGuestMode,
      userId: storeState.user?.id?.slice(-4)
    });
    
    if (!storeState.isAuthenticated || !storeState.user || storeState.isGuestMode) {
      console.error("❌ Store says not authenticated or in guest mode");
      return false;
    }
    
    // Check Supabase session
    const { data: session, error: sessionError } = await supabase.auth.getSession();
    console.log("🔐 Supabase session:", {
      hasSession: !!session.session,
      hasUser: !!session.session?.user,
      userId: session.session?.user?.id?.slice(-4),
      error: sessionError?.message
    });
    
    // Try to create comment directly
    const { data, error } = await supabase
      .from("comments_firebase")
      .insert({
        review_id: reviewId,
        author_id: storeState.user.id,
        author_name: storeState.user.anonymousId || "Test User",
        content: content,
        like_count: 0,
        dislike_count: 0,
      })
      .select("id")
      .single();
    
    if (error) {
      console.error("❌ Comment creation failed:", error);
      return false;
    }
    
    console.log("✅ Comment created successfully:", data.id);
    return true;
    
  } catch (error) {
    console.error("❌ Test failed:", error);
    return false;
  }
};
