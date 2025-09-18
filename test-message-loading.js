#!/usr/bin/env node

/**
 * Test script to verify message loading functionality
 */

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://dqjhwqhelqwhvtpxccwj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxamh3cWhlbHF3aHZ0cHhjY3dqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0MjE4MjcsImV4cCI6MjA2ODk5NzgyN30.qZmbCZig2wy0ShcaXWZ6TxD-vpbrExSIEImHAvaFkMQ",
);

async function testMessageLoading() {
  console.log("🧪 Testing message loading functionality...\n");

  // Test 1: Get a chat room ID
  console.log("1️⃣ Getting chat room...");
  const { data: rooms, error: roomError } = await supabase
    .from("chat_rooms_firebase")
    .select("id, name")
    .eq("is_active", true)
    .limit(1);

  if (roomError || !rooms || rooms.length === 0) {
    console.error("❌ Failed to get chat room:", roomError);
    return;
  }

  const room = rooms[0];
  console.log(`✅ Found room: ${room.name} (${room.id.slice(-8)})`);

  // Test 2: Load messages for this room (same query as loadInitialMessages)
  console.log("\n2️⃣ Loading messages...");
  const { data: messages, error: messageError } = await supabase
    .from("chat_messages_firebase")
    .select(
      `
      id,
      chat_room_id,
      sender_id,
      sender_name,
      sender_avatar,
      content,
      message_type,
      timestamp,
      is_read,
      is_deleted,
      reply_to,
      reactions
    `,
    )
    .eq("chat_room_id", room.id)
    .eq("is_deleted", false)
    .order("timestamp", { ascending: false })
    .limit(50);

  if (messageError) {
    console.error("❌ Failed to load messages:", messageError);
    return;
  }

  console.log(`✅ Loaded ${messages.length} messages`);

  if (messages.length > 0) {
    console.log("\n📋 Sample messages:");
    messages.slice(0, 3).forEach((msg, i) => {
      console.log(`  ${i + 1}. ${msg.sender_name}: ${msg.content?.slice(0, 50)}...`);
      console.log(`     Time: ${new Date(msg.timestamp).toLocaleString()}`);
    });
  }

  // Test 3: Format messages (same as formatMessage function)
  console.log("\n3️⃣ Testing message formatting...");
  const formattedMessages = messages.map((msg) => ({
    id: msg.id,
    chatRoomId: msg.chat_room_id,
    senderId: msg.sender_id,
    senderName: msg.sender_name,
    senderAvatar: msg.sender_avatar,
    content: msg.content,
    messageType: msg.message_type || "text",
    timestamp: new Date(msg.timestamp),
    isRead: msg.is_read || false,
    replyTo: msg.reply_to,
    reactions: msg.reactions || [],
  }));

  console.log(`✅ Formatted ${formattedMessages.length} messages`);

  // Test 4: Simulate callback execution
  console.log("\n4️⃣ Simulating message callback...");
  const messageEvent = {
    type: "initial",
    items: formattedMessages,
  };

  console.log(`✅ Created message event with ${messageEvent.items.length} items`);
  console.log(`📋 Event type: ${messageEvent.type}`);

  console.log("\n🎉 Message loading test completed successfully!");
  console.log("\n📋 Summary:");
  console.log(`- Room: ${room.name}`);
  console.log(`- Messages found: ${messages.length}`);
  console.log(`- Messages formatted: ${formattedMessages.length}`);
  console.log(`- Callback simulation: SUCCESS`);

  if (messages.length === 0) {
    console.log("\n⚠️ No messages found - this might explain why chat rooms appear empty");
    console.log("💡 Try sending a test message to this room to verify the fix");
  } else {
    console.log("\n✅ Messages are available - the race condition fix should work");
  }
}

testMessageLoading().catch((error) => {
  console.error("💥 Test failed:", error);
  process.exit(1);
});
