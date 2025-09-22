#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Missing Supabase credentials in environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log("🔄 Testing Supabase connection...");
  console.log("URL:", supabaseUrl);
  console.log("");

  try {
    // Test 1: Check reviews_firebase table
    console.log("📚 Testing reviews_firebase table...");
    const { data: reviews, error: reviewsError } = await supabase
      .from("reviews_firebase")
      .select("id, reviewed_person_name, created_at")
      .limit(5);

    if (reviewsError) {
      console.error("❌ Reviews error:", reviewsError);
    } else {
      console.log(`✅ Found ${reviews?.length || 0} reviews`);
      if (reviews && reviews.length > 0) {
        console.log("Sample review:", {
          id: reviews[0].id,
          name: reviews[0].reviewed_person_name,
          created: reviews[0].created_at,
        });
      }
    }
    console.log("");

    // Test 2: Check chat_rooms_firebase table
    console.log("💬 Testing chat_rooms_firebase table...");
    const { data: rooms, error: roomsError } = await supabase
      .from("chat_rooms_firebase")
      .select("id, name, is_private, is_active")
      .eq("is_active", true)
      .eq("is_private", false)
      .limit(5);

    if (roomsError) {
      console.error("❌ Chat rooms error:", roomsError);
    } else {
      console.log(`✅ Found ${rooms?.length || 0} public chat rooms`);
      if (rooms && rooms.length > 0) {
        console.log("Sample room:", {
          id: rooms[0].id,
          name: rooms[0].name,
          is_private: rooms[0].is_private,
          is_active: rooms[0].is_active,
        });
      }
    }
    console.log("");

    // Test 3: Check chat_messages_firebase table
    console.log("📨 Testing chat_messages_firebase table...");
    const { data: messages, error: messagesError } = await supabase
      .from("chat_messages_firebase")
      .select("id, content, sender_name")
      .limit(5);

    if (messagesError) {
      console.error("❌ Messages error:", messagesError);
    } else {
      console.log(`✅ Found ${messages?.length || 0} messages`);
    }
    console.log("");

    // Test 4: Check users table
    console.log("👤 Testing users table...");
    const { data: users, error: usersError } = await supabase.from("users").select("id, username, created_at").limit(5);

    if (usersError) {
      console.error("❌ Users error:", usersError);
    } else {
      console.log(`✅ Found ${users?.length || 0} users`);
    }
    console.log("");

    // Test 5: Check comments_firebase table
    console.log("💭 Testing comments_firebase table...");
    const { data: comments, error: commentsError } = await supabase
      .from("comments_firebase")
      .select("id, content, author_name")
      .limit(5);

    if (commentsError) {
      console.error("❌ Comments error:", commentsError);
    } else {
      console.log(`✅ Found ${comments?.length || 0} comments`);
    }

    console.log("\n🎉 Database connection test complete!");
  } catch (error) {
    console.error("💥 Unexpected error:", error);
  }
}

testConnection();
