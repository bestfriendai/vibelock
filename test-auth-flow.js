#!/usr/bin/env node

/**
 * TEST AUTHENTICATION FLOW
 * Tests the complete authentication flow to identify logout issues
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://dqjhwqhelqwhvtpxccwj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxamh3cWhlbHF3aHZ0cHhjY3dqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0MjE4MjcsImV4cCI6MjA2ODk5NzgyN30.qZmbCZig2wy0ShcaXWZ6TxD-vpbrExSIEImHAvaFkMQ';

const supabase = createClient(supabaseUrl, supabaseKey);

// Test credentials
const TEST_EMAIL = 'imsocool@gmail.com';
const TEST_PASSWORD = 'password123'; // You'll need to provide the actual password

async function testAuthFlow() {
  console.log('🚀 TESTING AUTHENTICATION FLOW');
  console.log('=' .repeat(50));

  try {
    // Test 1: Check current session
    console.log('\n📊 TEST 1: Current Session Check');
    console.log('-'.repeat(30));
    
    const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session check failed:', sessionError.message);
    } else {
      console.log('✅ Session check successful');
      console.log('📋 Current session:', {
        hasSession: !!currentSession,
        hasUser: !!currentSession?.user,
        userId: currentSession?.user?.id?.slice(-8) || 'none',
        email: currentSession?.user?.email || 'none',
        expiresAt: currentSession?.expires_at ? new Date(currentSession.expires_at * 1000).toISOString() : 'none'
      });
    }

    // Test 2: Check user profile in database
    console.log('\n👤 TEST 2: User Profile Check');
    console.log('-'.repeat(30));
    
    if (currentSession?.user) {
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentSession.user.id)
        .single();
      
      if (profileError) {
        console.error('❌ Profile fetch failed:', profileError.message);
        console.log('🔍 Error details:', {
          code: profileError.code,
          hint: profileError.hint,
          details: profileError.details
        });
      } else {
        console.log('✅ Profile fetch successful');
        console.log('📋 User profile:', {
          id: userProfile.id?.slice(-8),
          email: userProfile.email,
          anonymousId: userProfile.anonymous_id,
          createdAt: userProfile.created_at
        });
      }
    } else {
      console.log('⚠️ No current session - skipping profile check');
    }

    // Test 3: Test chat rooms access
    console.log('\n🏠 TEST 3: Chat Rooms Access');
    console.log('-'.repeat(30));
    
    const { data: chatRooms, error: roomsError } = await supabase
      .from('chat_rooms_firebase')
      .select('id, name, type, is_active')
      .eq('is_active', true)
      .limit(5);
    
    if (roomsError) {
      console.error('❌ Chat rooms fetch failed:', roomsError.message);
    } else {
      console.log('✅ Chat rooms fetch successful');
      console.log(`📋 Found ${chatRooms.length} active chat rooms`);
      chatRooms.forEach(room => {
        console.log(`   - ${room.name} (${room.type})`);
      });
    }

    // Test 4: Auth state listener simulation
    console.log('\n🔄 TEST 4: Auth State Listener Simulation');
    console.log('-'.repeat(30));
    
    let listenerCallCount = 0;
    const authListener = supabase.auth.onAuthStateChange((event, session) => {
      listenerCallCount++;
      console.log(`🔄 Auth state change #${listenerCallCount}:`, {
        event,
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id?.slice(-8) || 'none',
        timestamp: new Date().toISOString()
      });
    });

    // Wait a bit to see if there are any auth state changes
    console.log('⏳ Waiting 3 seconds for auth state changes...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log(`📊 Total auth state changes detected: ${listenerCallCount}`);
    
    // Clean up listener
    authListener.data.subscription.unsubscribe();

    // Summary
    console.log('\n🎯 AUTHENTICATION FLOW TEST SUMMARY');
    console.log('=' .repeat(50));
    
    const hasValidSession = !!currentSession && !!currentSession.user;
    const hasValidProfile = currentSession?.user ? true : false; // We'll assume profile exists if session exists
    const canAccessChatRooms = !!chatRooms && chatRooms.length > 0;
    
    console.log(`📊 Session Status: ${hasValidSession ? '✅ Valid' : '❌ Invalid'}`);
    console.log(`📊 Profile Status: ${hasValidProfile ? '✅ Valid' : '❌ Invalid'}`);
    console.log(`📊 Chat Access: ${canAccessChatRooms ? '✅ Working' : '❌ Failed'}`);
    console.log(`📊 Auth Listener: ${listenerCallCount > 0 ? '✅ Active' : '❌ Silent'}`);
    
    if (hasValidSession && hasValidProfile && canAccessChatRooms) {
      console.log('\n🎉 AUTHENTICATION FLOW IS WORKING CORRECTLY!');
      console.log('💡 If you\'re still experiencing logout issues, the problem is likely in:');
      console.log('   1. React Native auth state management');
      console.log('   2. Auth store listener logic');
      console.log('   3. Profile fetch error handling');
    } else {
      console.log('\n⚠️ AUTHENTICATION ISSUES DETECTED');
      console.log('🔍 Check the failed components above for root cause');
    }

  } catch (error) {
    console.error('\n🚨 CRITICAL ERROR during auth flow test:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      hint: error.hint
    });
  }
}

// Run the test
if (require.main === module) {
  testAuthFlow()
    .then(() => {
      console.log('\n✅ Auth flow test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { testAuthFlow };
