#!/usr/bin/env node

/**
 * COMPREHENSIVE CHATROOM FLOW TEST
 * Tests the complete chatroom functionality from database to UI
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://dqjhwqhelqwhvtpxccwj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxamh3cWhlbHF3aHZ0cHhjY3dqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0MjE4MjcsImV4cCI6MjA2ODk5NzgyN30.qZmbCZig2wy0ShcaXWZ6TxD-vpbrExSIEImHAvaFkMQ';

const supabase = createClient(supabaseUrl, supabaseKey);

// Test room ID (Washington DC Local)
const TEST_ROOM_ID = '86250edc-5520-48da-b9cd-0c28982b6148';
const TEST_USER_ID = 'a5315475-b44e-4b2d-9fb9-9dc372f50380';

async function testCompleteFlow() {
  console.log('🚀 STARTING COMPREHENSIVE CHATROOM FLOW TEST');
  console.log('=' .repeat(60));

  let testResults = {
    databaseConnection: false,
    roomsLoading: false,
    messagesLoading: false,
    messageSending: false,
    realtimeConnection: false,
    overallSuccess: false
  };

  try {
    // Test 1: Database Connection
    console.log('\n📊 TEST 1: Database Connection');
    console.log('-'.repeat(40));

    const { data: connectionTest, error: connectionError } = await supabase
      .from('chat_rooms_firebase')
      .select('count')
      .limit(1);

    if (connectionError) {
      console.error('❌ Database connection failed:', connectionError.message);
      return testResults;
    }

    testResults.databaseConnection = true;
    console.log('✅ Database connection successful');

    // Test 2: Chat Rooms Loading (simulating loadChatRooms)
    console.log('\n📋 TEST 2: Chat Rooms Loading');
    console.log('-'.repeat(40));

    const { data: rooms, error: roomsError } = await supabase
      .from('chat_rooms_firebase')
      .select('id, name, description, type, category, member_count, online_count, is_active, location')
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('last_activity', { ascending: false })
      .limit(10);

    if (roomsError) {
      console.error('❌ Rooms loading failed:', roomsError.message);
      return testResults;
    }

    testResults.roomsLoading = true;
    console.log(`✅ Loaded ${rooms.length} chat rooms successfully`);
    console.log('📋 Sample rooms:', rooms.slice(0, 3).map(r => `${r.name} (${r.type})`));

    // Test 3: Messages Loading (simulating loadMessages)
    console.log('\n💬 TEST 3: Messages Loading');
    console.log('-'.repeat(40));

    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages_firebase')
      .select('id, chat_room_id, sender_name, content, message_type, timestamp, is_deleted')
      .eq('chat_room_id', TEST_ROOM_ID)
      .eq('is_deleted', false)
      .order('timestamp', { ascending: false })
      .limit(20);

    if (messagesError) {
      console.error('❌ Messages loading failed:', messagesError.message);
      return testResults;
    }

    testResults.messagesLoading = true;
    console.log(`✅ Loaded ${messages.length} messages successfully`);
    console.log('💬 Recent messages:', messages.slice(0, 3).map(m => `${m.sender_name}: ${m.content.slice(0, 30)}...`));

    // Test 4: Message Sending (simulating sendMessage)
    console.log('\n📤 TEST 4: Message Sending');
    console.log('-'.repeat(40));

    const testMessage = {
      chat_room_id: TEST_ROOM_ID,
      sender_id: TEST_USER_ID,
      sender_name: 'test_flow_user',
      sender_avatar: null,
      content: `FLOW TEST MESSAGE - ${new Date().toISOString()}`,
      message_type: 'text',
      timestamp: new Date().toISOString(),
      is_read: false,
      reply_to: null,
      is_deleted: false,
      reactions: []
    };

    const { data: sentMessage, error: sendError } = await supabase
      .from('chat_messages_firebase')
      .insert(testMessage)
      .select()
      .single();

    if (sendError) {
      console.error('❌ Message sending failed:', sendError.message);
      return testResults;
    }

    testResults.messageSending = true;
    console.log('✅ Message sent successfully');
    console.log('📤 Sent message ID:', sentMessage.id);

    // Test 5: Realtime Connection
    console.log('\n🔄 TEST 5: Realtime Connection');
    console.log('-'.repeat(40));

    try {
      // Test realtime subscription
      const channel = supabase
        .channel(`test-room-${TEST_ROOM_ID}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages_firebase',
          filter: `chat_room_id=eq.${TEST_ROOM_ID}`
        }, (payload) => {
          console.log('🔄 Realtime message received:', payload.new.content);
        });

      const subscribeResult = await channel.subscribe();

      if (subscribeResult === 'SUBSCRIBED') {
        testResults.realtimeConnection = true;
        console.log('✅ Realtime subscription successful');

        // Clean up
        await channel.unsubscribe();
      } else {
        console.error('❌ Realtime subscription failed:', subscribeResult);
      }
    } catch (realtimeError) {
      console.error('❌ Realtime connection error:', realtimeError.message);
    }

    // Overall Results
    console.log('\n🎯 COMPREHENSIVE TEST RESULTS');
    console.log('=' .repeat(60));

    const passedTests = Object.values(testResults).filter(Boolean).length;
    const totalTests = Object.keys(testResults).length - 1; // Exclude overallSuccess

    testResults.overallSuccess = passedTests === totalTests;

    console.log(`📊 Tests Passed: ${passedTests}/${totalTests}`);
    console.log('📋 Detailed Results:');
    console.log(`   Database Connection: ${testResults.databaseConnection ? '✅' : '❌'}`);
    console.log(`   Rooms Loading: ${testResults.roomsLoading ? '✅' : '❌'}`);
    console.log(`   Messages Loading: ${testResults.messagesLoading ? '✅' : '❌'}`);
    console.log(`   Message Sending: ${testResults.messageSending ? '✅' : '❌'}`);
    console.log(`   Realtime Connection: ${testResults.realtimeConnection ? '✅' : '❌'}`);

    if (testResults.overallSuccess) {
      console.log('\n🎉 ALL TESTS PASSED! Chatroom backend is fully functional.');
      console.log('🔍 If chatrooms still don\'t work in the app, the issue is likely:');
      console.log('   1. React Native/Expo realtime compatibility');
      console.log('   2. UI rendering or state synchronization');
      console.log('   3. Navigation or component integration');
    } else {
      console.log('\n⚠️ Some tests failed. Check the errors above.');
    }

  } catch (error) {
    console.error('\n🚨 CRITICAL ERROR during testing:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      hint: error.hint
    });
  }

  return testResults;
}

// Run the test
if (require.main === module) {
  testCompleteFlow()
    .then((results) => {
      process.exit(results.overallSuccess ? 0 : 1);
    })
    .catch((error) => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { testCompleteFlow };