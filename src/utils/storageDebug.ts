// Storage debugging utilities
import supabase from "../config/supabase";

// Quick test function you can call from anywhere in your app
export const quickStorageTest = async () => {
  try {
    // 1. Check auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, issue: "Not authenticated" };
    }

    // 2. Test simple upload
    const testFile = new Blob(["test"], { type: "text/plain" });
    const testPath = `debug-test-${Date.now()}.txt`;

    const { data, error } = await supabase.storage.from("review-images").upload(testPath, testFile);

    if (error) {
      return { success: false, issue: error.message };
    }

    await supabase.storage.from("review-images").remove([data.path]);

    return { success: true, message: "Storage is working!" };
  } catch (error: any) {
    return { success: false, issue: error.message };
  }
};

export const debugStorageSetup = async () => {
  try {
    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (!user) {
      return;
    }

    // Check storage buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    console.log("Storage buckets:", buckets?.map((b) => ({ id: b.id, name: b.name, public: b.public })) || "none");
    if (bucketsError) {
      console.error("Bucket error:", bucketsError.message);
    }

    // Test upload to review-images bucket
    const testFile = new Blob(["test content"], { type: "text/plain" });
    const testPath = `test-${Date.now()}.txt`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("review-images")
      .upload(testPath, testFile);

    // Clean up test file if upload succeeded
    if (uploadData) {
      await supabase.storage.from("review-images").remove([uploadData.path]);
    }
  } catch (error: any) {
    console.error("Storage debug error:", error);
  }
};

export const testStoragePermissions = async (bucket: string) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return false;
    }

    // Test file
    const testFile = new Blob(["permission test"], { type: "text/plain" });
    const testPath = `permission-test-${Date.now()}.txt`;

    // Test upload
    const { data, error } = await supabase.storage.from(bucket).upload(testPath, testFile);

    if (error) {
      return false;
    }

    // Clean up
    await supabase.storage.from(bucket).remove([data.path]);
    return true;
  } catch (error: any) {
    return false;
  }
};
