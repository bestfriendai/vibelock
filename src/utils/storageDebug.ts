// Storage debugging utilities
import supabase from "../config/supabase";

// Quick test function you can call from anywhere in your app
export const quickStorageTest = async () => {
  console.log("🚀 Quick Storage Test Starting...");

  try {
    // 1. Check auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    console.log("Auth check:", {
      hasUser: !!user,
      userId: user?.id?.substring(0, 8) + "...",
      error: authError?.message,
    });

    if (!user) {
      console.warn("❌ ISSUE FOUND: User not authenticated!");
      return { success: false, issue: "Not authenticated" };
    }

    // 2. Test simple upload
    const testFile = new Blob(["test"], { type: "text/plain" });
    const testPath = `debug-test-${Date.now()}.txt`;

    const { data, error } = await supabase.storage.from("review-images").upload(testPath, testFile);

    if (error) {
      console.warn("❌ UPLOAD FAILED:", error.message);
      return { success: false, issue: error.message };
    }

    console.log("✅ Upload successful! Cleaning up...");
    await supabase.storage.from("review-images").remove([data.path]);

    return { success: true, message: "Storage is working!" };
  } catch (error: any) {
    console.warn("💥 Test failed:", error.message);
    return { success: false, issue: error.message };
  }
};

export const debugStorageSetup = async () => {
  console.log("🔍 Debugging Storage Setup...");

  try {
    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    console.log("👤 Auth Status:", {
      authenticated: !!user,
      userId: user?.id,
      email: user?.email,
      error: authError?.message,
    });

    if (!user) {
      console.warn("❌ User not authenticated - this is likely the issue!");
      return;
    }

    // Check storage buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    console.log("🗄️ Storage Buckets:", {
      buckets: buckets?.map((b) => ({ id: b.id, name: b.name, public: b.public })),
      error: bucketsError?.message,
    });

    // Test upload to review-images bucket
    const testFile = new Blob(["test content"], { type: "text/plain" });
    const testPath = `test-${Date.now()}.txt`;

    console.log("🧪 Testing upload to review-images bucket...");
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("review-images")
      .upload(testPath, testFile);

    console.log("📤 Upload Test Result:", {
      success: !!uploadData,
      path: uploadData?.path,
      error: uploadError?.message,
    });

    // Clean up test file if upload succeeded
    if (uploadData) {
      await supabase.storage.from("review-images").remove([uploadData.path]);
      console.log("🧹 Test file cleaned up");
    }
  } catch (error: any) {
    console.warn("💥 Debug failed:", error.message);
  }
};

export const testStoragePermissions = async (bucket: string) => {
  console.log(`🔐 Testing permissions for bucket: ${bucket}`);

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.warn("❌ Not authenticated");
      return false;
    }

    // Test file
    const testFile = new Blob(["permission test"], { type: "text/plain" });
    const testPath = `permission-test-${Date.now()}.txt`;

    // Test upload
    const { data, error } = await supabase.storage.from(bucket).upload(testPath, testFile);

    if (error) {
      console.warn(`❌ Upload failed for ${bucket}:`, error.message);
      return false;
    }

    console.log(`✅ Upload successful for ${bucket}`);

    // Clean up
    await supabase.storage.from(bucket).remove([data.path]);
    return true;
  } catch (error: any) {
    console.warn(`💥 Permission test failed for ${bucket}:`, error.message);
    return false;
  }
};
