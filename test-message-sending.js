#!/usr/bin/env node

/**
 * Test script to verify message sending functionality
 */

const { createClient } = require("@supabase/supabase-js");
const { setTimeout } = require("timers");

const supabase = createClient(
  "https://dqjhwqhelqwhvtpxccwj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxamh3cWhlbHF3aHZ0cHhjY3dqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0MjE4MjcsImV4cCI6MjA2ODk5NzgyN30.qZmbCZig2wy0ShcaXWZ6TxD-vpbrExSIEImHAvaFkMQ",
);

async function testMessageSending() {
  console.log("🧪 Testing message sending functionality...\n");

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

  // Test 2: Try to send a test message (same structure as sendMessage)
  console.log("\n2️⃣ Testing message insertion...");
  const testMessage = {
    chat_room_id: room.id,
    sender_id: "test_user_" + Date.now(),
    sender_name: "Test User",
    content: "Test message from debug script - " + new Date().toLocaleTimeString(),
    message_type: "text",
    timestamp: new Date().toISOString(),
    is_read: false,
    is_deleted: false,
    reply_to: null,
  };

  const { data: insertResult, error: insertError } = await supabase
    .from("chat_messages_firebase")
    .insert(testMessage)
    .select()
    .single();

  if (insertError) {
    console.error("❌ Failed to insert test message:", insertError);
    return;
  }

  console.log(`✅ Successfully inserted test message: ${insertResult.id}`);
  console.log(`📝 Message content: ${insertResult.content}`);

  // Test 3: Verify the message was inserted
  console.log("\n3️⃣ Verifying message insertion...");
  const { data: verifyResult, error: verifyError } = await supabase
    .from("chat_messages_firebase")
    .select("id, content, sender_name, timestamp")
    .eq("id", insertResult.id)
    .single();

  if (verifyError) {
    console.error("❌ Failed to verify message:", verifyError);
    return;
  }

  console.log(`✅ Message verified in database:`);
  console.log(`   ID: ${verifyResult.id}`);
  console.log(`   Content: ${verifyResult.content}`);
  console.log(`   Sender: ${verifyResult.sender_name}`);
  console.log(`   Time: ${new Date(verifyResult.timestamp).toLocaleString()}`);

  // Test 4: Test real-time subscription (basic)
  console.log("\n4️⃣ Testing real-time subscription...");

  let subscriptionWorking = false;
  const channel = supabase
    .channel(`test_room_${room.id}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chat_messages_firebase",
        filter: `chat_room_id=eq.${room.id}`,
      },
      (payload) => {
        console.log("📨 Real-time message received:", payload.new.content);
        subscriptionWorking = true;
      },
    )
    .subscribe((status) => {
      console.log(`🔄 Subscription status: ${status}`);
    });

  // Wait a moment for subscription to establish
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Send another test message to trigger real-time
  console.log("\n5️⃣ Sending real-time test message...");
  const realtimeTestMessage = {
    chat_room_id: room.id,
    sender_id: "realtime_test_" + Date.now(),
    sender_name: "Realtime Test",
    content: "Real-time test message - " + new Date().toLocaleTimeString(),
    message_type: "text",
    timestamp: new Date().toISOString(),
    is_read: false,
    is_deleted: false,
    reply_to: null,
  };

  const { error: realtimeError } = await supabase.from("chat_messages_firebase").insert(realtimeTestMessage);

  if (realtimeError) {
    console.error("❌ Failed to send real-time test message:", realtimeError);
  } else {
    console.log("✅ Real-time test message sent");
  }

  // Wait for real-time event
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Cleanup
  await channel.unsubscribe();

  console.log("\n🎉 Message sending test completed!");
  console.log("\n📋 Summary:");
  console.log(`- Room: ${room.name}`);
  console.log(`- Message insertion: SUCCESS`);
  console.log(`- Message verification: SUCCESS`);
  console.log(`- Real-time subscription: ${subscriptionWorking ? "SUCCESS" : "NEEDS INVESTIGATION"}`);

  if (!subscriptionWorking) {
    console.log("\n⚠️ Real-time subscription may need investigation");
    console.log("💡 But basic message sending to database is working");
  } else {
    console.log("\n✅ All systems working - message sending should work in app");
  }
}

testMessageSending().catch((error) => {
  console.error("💥 Test failed:", error);
  process.exit(1);
});
