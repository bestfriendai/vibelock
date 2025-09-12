// Quick test script - run this in your app console or add to a screen temporarily
import { quickStorageTest } from "./src/utils/storageDebug";

// Call this function to test storage
const testStorage = async () => {
  console.log("=== STORAGE DEBUG TEST ===");
  const result = await quickStorageTest();
  console.log("Test result:", result);

  if (result.success) {
    console.log("🎉 Storage is working correctly!");
  } else {
    console.log("❌ Storage issue found:", result.issue);
    console.log("\n📋 Next steps:");
    console.log("1. Make sure you ran the SQL script in Supabase SQL Editor");
    console.log("2. Check that you're signed in to the app");
    console.log("3. Verify your .env file has correct Supabase credentials");
  }
};

// Export for use
export { testStorage };
