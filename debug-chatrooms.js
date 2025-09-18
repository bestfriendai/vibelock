#!/usr/bin/env node

/**
 * Comprehensive Chatroom Debug Script
 * Tests all aspects of the chatroom functionality
 */

const { createClient } = require("@supabase/supabase-js");
const { setTimeout, clearTimeout } = require("timers");

const supabase = createClient(
  "https://dqjhwqhelqwhvtpxccwj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxamh3cWhlbHF3aHZ0cHhjY3dqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0MjE4MjcsImV4cCI6MjA2ODk5NzgyN30.qZmbCZig2wy0ShcaXWZ6TxD-vpbrExSIEImHAvaFkMQ",
);

async function debugChatrooms() {
  console.log("🔍 Starting comprehensive chatroom debugging...\n");

  // Test 1: Basic connection
  console.log("1️⃣ Testing Supabase connection...");
  try {
    const { error } = await supabase.from("chat_rooms_firebase").select("count").limit(1);
    if (error) throw error;
    console.log("✅ Connection successful");
  } catch (error) {
    console.error("❌ Connection failed:", error.message);
    return;
  }

  // Test 2: Chat rooms query (exact same as loadChatRooms)
  console.log("\n2️⃣ Testing chat rooms query...");
  try {
    const { data: chatRooms, error } = await supabase
      .from("chat_rooms_firebase")
      .select(
        `
        id,
        name,
        description,
        type,
        category,
        member_count,
        online_count,
        unread_count,
        last_activity,
        is_active,
        location,
        created_at,
        updated_at
      `,
      )
      .eq("is_active", true)
      .order("last_activity", { ascending: false });

    if (error) throw error;

    console.log(`✅ Found ${chatRooms.length} active chat rooms`);
    if (chatRooms.length > 0) {
      console.log("📋 Sample room:", {
        id: chatRooms[0].id,
        name: chatRooms[0].name,
        type: chatRooms[0].type,
        memberCount: chatRooms[0].member_count,
      });
    }
  } catch (error) {
    console.error("❌ Chat rooms query failed:", error.message);
  }

  // Test 3: Real-time connection
  console.log("\n3️⃣ Testing real-time connection...");
  try {
    const channel = supabase.channel("debug-test");

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Real-time connection timeout"));
      }, 5000);

      channel.subscribe((status) => {
        console.log("📡 Real-time status:", status);
        if (status === "SUBSCRIBED") {
          clearTimeout(timeout);
          console.log("✅ Real-time connection successful");
          channel.unsubscribe();
          resolve();
        } else if (status === "CHANNEL_ERROR") {
          clearTimeout(timeout);
          reject(new Error("Real-time connection error"));
        }
      });
    });
  } catch (error) {
    console.error("❌ Real-time connection failed:", error.message);
  }

  // Test 4: Test postgres_changes subscription
  console.log("\n4️⃣ Testing postgres_changes subscription...");
  try {
    const testChannel = supabase.channel("test-postgres-changes").on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "chat_messages_firebase",
      },
      (payload) => {
        console.log("📨 Received postgres_changes event:", payload.eventType);
      },
    );

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.log("⚠️ No postgres_changes events received (this might be normal)");
        testChannel.unsubscribe();
        resolve();
      }, 3000);

      testChannel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("✅ postgres_changes subscription active");
          // Don't resolve here, wait for timeout or actual event
        } else if (status === "CHANNEL_ERROR") {
          clearTimeout(timeout);
          testChannel.unsubscribe();
          reject(new Error("postgres_changes subscription error"));
        }
      });
    });
  } catch (error) {
    console.error("❌ postgres_changes subscription failed:", error.message);
  }

  // Test 5: Check RLS policies by trying to insert a test message
  console.log("\n5️⃣ Testing RLS policies (read-only)...");
  try {
    // Just test if we can read messages (should work with RLS)
    const { error } = await supabase.from("chat_messages_firebase").select("id, content, sender_name").limit(1);

    if (error && error.code === "PGRST116") {
      console.log("⚠️ RLS policy might be blocking reads - this could prevent real-time updates");
    } else if (error) {
      console.log("⚠️ Message query error:", error.message);
    } else {
      console.log("✅ Can read messages (RLS allows reads)");
    }
  } catch (error) {
    console.error("❌ RLS test failed:", error.message);
  }

  console.log("\n🏁 Debug complete!");
  console.log("\n📋 Summary:");
  console.log("- If connection and chat rooms query work, the issue is likely in the React app");
  console.log("- If real-time works but postgres_changes doesn't, check Supabase replication settings");
  console.log("- If RLS blocks reads, real-time subscriptions won't work");

  process.exit(0);
}

debugChatrooms().catch((error) => {
  console.error("💥 Debug script failed:", error);
  process.exit(1);
});
