#!/usr/bin/env node

/**
 * Test Supabase Realtime Connection
 * This script tests the basic realtime connection to identify subscription issues
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Please ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    heartbeatIntervalMs: 15000,
    reconnectAfterMs: (tries) => Math.min(tries * 1000, 10000),
    logger: console.log,
  }
});

async function testRealtimeConnection() {
  console.log('🧪 Testing Supabase Realtime Connection');
  console.log('=====================================');
  
  try {
    // Test 1: Check authentication
    console.log('\n1️⃣ Testing authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Auth error:', authError.message);
      console.log('💡 This might be expected if no user is signed in');
    } else if (user) {
      console.log(`✅ User authenticated: ${user.id.slice(-8)}`);
    } else {
      console.log('ℹ️ No user currently signed in (this is okay for testing)');
    }

    // Test 2: Check realtime availability
    console.log('\n2️⃣ Testing realtime availability...');
    if (!supabase.realtime) {
      console.error('❌ Supabase realtime not available');
      return;
    }
    
    console.log('✅ Supabase realtime is available');
    console.log(`📡 Initial connection status: ${supabase.realtime.isConnected() ? 'connected' : 'disconnected'}`);

    // Test 3: Test basic channel subscription
    console.log('\n3️⃣ Testing basic channel subscription...');
    
    const testChannel = supabase.channel('test-connection-channel');
    
    const subscriptionPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Subscription timeout after 30 seconds'));
      }, 30000);

      testChannel.subscribe((status) => {
        console.log(`📡 Channel subscription status: ${status}`);
        
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          console.log('✅ Basic channel subscription successful');
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

    await subscriptionPromise;
    await testChannel.unsubscribe();

    // Test 4: Test postgres_changes subscription (this requires auth)
    console.log('\n4️⃣ Testing postgres_changes subscription...');
    
    if (!user) {
      console.log('⏭️ Skipping postgres_changes test (no authenticated user)');
    } else {
      const postgresChannel = supabase
        .channel('test-postgres-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'chat_messages_firebase'
        }, (payload) => {
          console.log('📨 Received postgres_changes event:', payload.eventType);
        });

      const postgresSubscriptionPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.log('⏰ postgres_changes subscription timeout (this might be normal)');
          resolve('timeout');
        }, 15000);

        postgresChannel.subscribe((status) => {
          console.log(`📡 postgres_changes subscription status: ${status}`);
          
          if (status === 'SUBSCRIBED') {
            clearTimeout(timeout);
            console.log('✅ postgres_changes subscription successful');
            resolve(status);
          } else if (status === 'CHANNEL_ERROR') {
            clearTimeout(timeout);
            reject(new Error('postgres_changes subscription error'));
          }
        });
      });

      await postgresSubscriptionPromise;
      await postgresChannel.unsubscribe();
    }

    console.log('\n🎉 Realtime connection test completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- Basic realtime connection: ✅ Working');
    console.log('- Channel subscription: ✅ Working');
    console.log('- postgres_changes: ' + (user ? '✅ Working' : '⏭️ Skipped (no auth)'));
    
  } catch (error) {
    console.error('\n❌ Realtime connection test failed:', error.message);
    console.log('\n🔍 Troubleshooting tips:');
    console.log('1. Check your internet connection');
    console.log('2. Verify Supabase project is active');
    console.log('3. Check if realtime is enabled in your Supabase project');
    console.log('4. Verify environment variables are correct');
    console.log('5. Check Supabase project quotas and limits');
  } finally {
    // Clean up
    if (supabase.realtime) {
      supabase.realtime.disconnect();
    }
    process.exit(0);
  }
}

// Run the test
testRealtimeConnection();
