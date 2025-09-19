#!/usr/bin/env node

/**
 * Debug Chatroom Issues
 * This script helps identify the root cause of chatroom subscription failures
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    heartbeatIntervalMs: 15000,
    reconnectAfterMs: (tries) => Math.min(tries * 1000, 10000),
    logger: console.log,
  }
});

async function debugChatroomIssues() {
  console.log('🔍 Debugging Chatroom Issues');
  console.log('============================');
  
  try {
    // Step 1: Test basic connectivity
    console.log('\n1️⃣ Testing basic connectivity...');
    const startTime = Date.now();
    
    try {
      const response = await fetch('https://www.google.com/generate_204', {
        method: 'HEAD',
        timeout: 5000
      });
      console.log(`✅ Internet connectivity: OK (${Date.now() - startTime}ms)`);
    } catch (error) {
      console.error('❌ Internet connectivity: FAILED', error.message);
      return;
    }

    // Step 2: Test Supabase API connectivity
    console.log('\n2️⃣ Testing Supabase API connectivity...');
    try {
      const { data, error } = await supabase.from('users').select('count').limit(1);
      if (error) {
        console.error('❌ Supabase API error:', error.message);
      } else {
        console.log('✅ Supabase API: Connected');
      }
    } catch (error) {
      console.error('❌ Supabase API: Connection failed', error.message);
    }

    // Step 3: Test authentication
    console.log('\n3️⃣ Testing authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Auth error:', authError.message);
      console.log('💡 This is expected if no user is signed in');
    } else if (user) {
      console.log(`✅ User authenticated: ${user.id.slice(-8)}`);
      console.log(`📧 Email: ${user.email}`);
    } else {
      console.log('ℹ️ No user currently signed in');
    }

    // Step 4: Test realtime service availability
    console.log('\n4️⃣ Testing realtime service...');
    if (!supabase.realtime) {
      console.error('❌ Supabase realtime not available');
      return;
    }
    
    console.log('✅ Supabase realtime is available');
    console.log(`📡 Connection status: ${supabase.realtime.isConnected() ? 'connected' : 'disconnected'}`);

    // Step 5: Test basic channel subscription (similar to chatroom)
    console.log('\n5️⃣ Testing channel subscription (simulating chatroom join)...');
    
    const testRoomId = '86250edc-5520-48da-b9cd-0c28982b6148'; // The room from the error
    const testChannel = supabase.channel(`room_${testRoomId}`, {
      config: {
        presence: { key: 'test_user' },
        broadcast: { self: false },
      },
    });

    // Add the same listeners as the real chatroom
    testChannel
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages_firebase',
        filter: `chat_room_id=eq.${testRoomId}`,
      }, (payload) => {
        console.log('📨 Received message:', payload.new?.content);
      })
      .on('presence', { event: 'sync' }, () => {
        console.log('👥 Presence sync');
      })
      .on('broadcast', { event: 'typing' }, (payload) => {
        console.log('⌨️ Typing indicator:', payload);
      });

    // Test subscription with timeout
    const subscriptionResult = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Subscription timeout after 30 seconds'));
      }, 30000);

      testChannel.subscribe((status) => {
        console.log(`📡 Channel subscription status: ${status}`);
        
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          resolve(status);
        } else if (status === 'CHANNEL_ERROR') {
          clearTimeout(timeout);
          reject(new Error('Channel subscription error'));
        } else if (status === 'TIMED_OUT') {
          clearTimeout(timeout);
          reject(new Error('Channel subscription timed out'));
        }
      });
    });

    console.log('✅ Channel subscription successful!');

    // Test presence tracking
    if (user) {
      console.log('\n6️⃣ Testing presence tracking...');
      try {
        await testChannel.track({
          userId: user.id,
          userName: user.email || 'Test User',
          online_at: new Date().toISOString(),
        });
        console.log('✅ Presence tracking successful');
      } catch (presenceError) {
        console.warn('⚠️ Presence tracking failed:', presenceError.message);
      }
    }

    // Clean up
    await testChannel.unsubscribe();

    console.log('\n🎉 All tests passed! Chatroom should work.');
    console.log('\n💡 If you\'re still seeing issues, check:');
    console.log('1. Network connectivity in the app');
    console.log('2. Authentication state in the app');
    console.log('3. Supabase project quotas and limits');
    console.log('4. RLS policies on chat_messages_firebase table');

  } catch (error) {
    console.error('\n❌ Debug test failed:', error.message);
    
    if (error.message.includes('timeout')) {
      console.log('\n🔍 Subscription timeout troubleshooting:');
      console.log('1. Check if Supabase realtime is enabled in your project');
      console.log('2. Verify your project is not paused or over quota');
      console.log('3. Check if there are any network restrictions');
      console.log('4. Try refreshing your Supabase project');
    }
    
    if (error.message.includes('CHANNEL_ERROR')) {
      console.log('\n🔍 Channel error troubleshooting:');
      console.log('1. Check RLS policies on the table');
      console.log('2. Verify table permissions');
      console.log('3. Check if the table exists');
      console.log('4. Verify authentication is working');
    }
  } finally {
    if (supabase.realtime) {
      supabase.realtime.disconnect();
    }
    process.exit(0);
  }
}

// Run the debug
debugChatroomIssues();
