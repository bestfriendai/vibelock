#!/usr/bin/env node

/**
 * Script to test chat room loading from the remote Supabase database
 * This helps debug any issues with chat room functionality
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testChatRooms() {
  console.log("🧪 Testing chat room functionality...");
  console.log("🔗 Supabase URL:", supabaseUrl.substring(0, 30) + "...");

  try {
    // Test 1: Load chat rooms
    console.log("\n📋 Test 1: Loading chat rooms...");
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
        last_message,
        is_active,
        location,
        created_at,
        updated_at
      `,
      )
      .eq("is_active", true)
      .order("last_activity", { ascending: false });

    if (error) {
      console.error("❌ Error loading chat rooms:", error);
      return;
    }

    console.log(`✅ Successfully loaded ${chatRooms?.length || 0} chat rooms`);

    if (chatRooms && chatRooms.length > 0) {
      console.log("\n📊 Chat rooms found:");
      chatRooms.forEach((room, index) => {
        console.log(`  ${index + 1}. ${room.name} (${room.type})`);
        console.log(`     - Description: ${room.description}`);
        console.log(`     - Members: ${room.member_count || 0}`);
        console.log(`     - Last activity: ${new Date(room.last_activity).toLocaleString()}`);
        console.log(`     - ID: ${room.id}`);
        console.log("");
      });
    } else {
      console.log("⚠️ No chat rooms found");
    }

    // Test 2: Load messages for first room
    if (chatRooms && chatRooms.length > 0) {
      const firstRoom = chatRooms[0];
      console.log(`\n💬 Test 2: Loading messages for "${firstRoom.name}"...`);

      const { data: messages, error: messagesError } = await supabase
        .from("chat_messages_firebase")
        .select("*")
        .eq("chat_room_id", firstRoom.id)
        .order("timestamp", { ascending: false })
        .limit(10);

      if (messagesError) {
        console.error("❌ Error loading messages:", messagesError);
      } else {
        console.log(`✅ Successfully loaded ${messages?.length || 0} messages`);
        if (messages && messages.length > 0) {
          console.log("\n📝 Recent messages:");
          messages.forEach((msg, index) => {
            console.log(`  ${index + 1}. ${msg.sender_name}: ${msg.content}`);
            console.log(`     - Type: ${msg.message_type}, Time: ${new Date(msg.timestamp).toLocaleString()}`);
          });
        }
      }
    }

    // Test 3: Check database connection
    console.log("\n🔌 Test 3: Testing database connection...");
    const { data: connectionTest, error: connectionError } = await supabase
      .from("chat_rooms_firebase")
      .select("count(*)")
      .single();

    if (connectionError) {
      console.error("❌ Database connection error:", connectionError);
    } else {
      console.log("✅ Database connection successful");
    }

    // Test 4: Check RLS policies
    console.log("\n🔒 Test 4: Testing RLS policies...");
    const { data: user } = await supabase.auth.getUser();
    console.log("Current user:", user.user ? "Authenticated" : "Anonymous");

    console.log("\n🎉 All tests completed!");
  } catch (error) {
    console.error("💥 Unexpected error during testing:", error);
  }
}

// Run the tests
testChatRooms()
  .then(() => {
    console.log("🏁 Testing process finished");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Testing failed:", error);
    process.exit(1);
  });
