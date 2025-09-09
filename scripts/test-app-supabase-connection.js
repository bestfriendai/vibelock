const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// Use the same environment variables as the app
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log("🔗 Testing Supabase connection with app credentials...");
console.log("URL:", supabaseUrl);
console.log("Key:", supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : "MISSING");

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    console.log("\n📡 Testing basic connection...");

    // Test 1: Simple count query
    const { data: countData, error: countError } = await supabase
      .from("reviews_firebase")
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("❌ Count query failed:", countError);
      return;
    }

    console.log("✅ Total reviews in database:", countData);

    // Test 2: Get a few reviews (same as app would do)
    console.log("\n📋 Testing review fetch...");
    const { data: reviews, error: reviewError } = await supabase
      .from("reviews_firebase")
      .select("*")
      .eq("status", "approved")
      .limit(5);

    if (reviewError) {
      console.error("❌ Review fetch failed:", reviewError);
      return;
    }

    console.log("✅ Successfully fetched reviews:", reviews.length);
    console.log("Sample review:", {
      id: reviews[0]?.id,
      name: reviews[0]?.reviewed_person_name,
      location: reviews[0]?.reviewed_person_location,
      status: reviews[0]?.status,
    });

    // Test 3: Test with filters (like the app does)
    console.log("\n🔍 Testing filtered query...");
    const { data: filteredReviews, error: filterError } = await supabase
      .from("reviews_firebase")
      .select("*")
      .eq("status", "approved")
      .eq("reviewed_person_location->>city", "Washington")
      .eq("reviewed_person_location->>state", "DC")
      .limit(5);

    if (filterError) {
      console.error("❌ Filtered query failed:", filterError);
      return;
    }

    console.log("✅ Washington DC reviews found:", filteredReviews.length);

    // Test 4: Test worldwide query (no location filters)
    console.log("\n🌍 Testing worldwide query...");
    const { data: worldwideReviews, error: worldwideError } = await supabase
      .from("reviews_firebase")
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(10);

    if (worldwideError) {
      console.error("❌ Worldwide query failed:", worldwideError);
      return;
    }

    console.log("✅ Worldwide reviews found:", worldwideReviews.length);
    console.log(
      "Cities found:",
      worldwideReviews.map((r) => `${r.reviewed_person_location?.city}, ${r.reviewed_person_location?.state}`),
    );

    console.log("\n🎉 All tests passed! Supabase connection is working correctly.");
  } catch (error) {
    console.error("💥 Connection test failed:", error);
  }
}

testConnection();
