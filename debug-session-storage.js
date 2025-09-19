#!/usr/bin/env node

/**
 * DEBUG SESSION STORAGE
 * Check if sessions are being stored and retrieved correctly
 */

const { createClient } = require('@supabase/supabase-js');
const AsyncStorage = require('@react-native-async-storage/async-storage').default;

// Supabase configuration
const supabaseUrl = 'https://dqjhwqhelqwhvtpxccwj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxamh3cWhlbHF3aHZ0cHhjY3dqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0MjE4MjcsImV4cCI6MjA2ODk5NzgyN30.qZmbCZig2wy0ShcaXWZ6TxD-vpbrExSIEImHAvaFkMQ';

// Create Supabase client with same config as app
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: "pkce",
    debug: true,
  },
});

async function debugSessionStorage() {
  console.log('🔍 DEBUGGING SESSION STORAGE');
  console.log('=' .repeat(50));

  try {
    // Check what's in AsyncStorage
    console.log('\n📦 AsyncStorage Contents:');
    console.log('-'.repeat(30));
    
    const storageKey = `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`;
    console.log('🔑 Storage key:', storageKey);
    
    const storedSession = await AsyncStorage.getItem(storageKey);
    console.log('💾 Stored session:', storedSession ? 'EXISTS' : 'NOT FOUND');
    
    if (storedSession) {
      try {
        const parsedSession = JSON.parse(storedSession);
        console.log('📋 Session details:', {
          hasAccessToken: !!parsedSession.access_token,
          hasRefreshToken: !!parsedSession.refresh_token,
          hasUser: !!parsedSession.user,
          userId: parsedSession.user?.id?.slice(-8) || 'none',
          email: parsedSession.user?.email || 'none',
          expiresAt: parsedSession.expires_at ? new Date(parsedSession.expires_at * 1000).toISOString() : 'none'
        });
      } catch (parseError) {
        console.error('❌ Failed to parse stored session:', parseError.message);
      }
    }

    // Test Supabase session retrieval
    console.log('\n🔄 Supabase Session Retrieval:');
    console.log('-'.repeat(30));
    
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Session retrieval error:', error.message);
    } else {
      console.log('📋 Retrieved session:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id?.slice(-8) || 'none',
        email: session?.user?.email || 'none',
        expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'none'
      });
    }

    // Test manual login to see what happens
    console.log('\n🔐 Testing Manual Login:');
    console.log('-'.repeat(30));
    
    // Note: You'll need to provide actual credentials
    const TEST_EMAIL = 'imsocool@gmail.com';
    const TEST_PASSWORD = 'your_password_here'; // Replace with actual password
    
    console.log('⚠️ Skipping login test - provide actual password in script');
    console.log('💡 To test login, replace TEST_PASSWORD with actual password');
    
    /*
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    
    if (loginError) {
      console.error('❌ Login failed:', loginError.message);
    } else {
      console.log('✅ Login successful');
      console.log('📋 Login session:', {
        hasSession: !!loginData.session,
        hasUser: !!loginData.user,
        userId: loginData.user?.id?.slice(-8) || 'none'
      });
      
      // Check if session was stored
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for storage
      const newStoredSession = await AsyncStorage.getItem(storageKey);
      console.log('💾 Session stored after login:', !!newStoredSession);
    }
    */

    // Check all AsyncStorage keys
    console.log('\n🗂️ All AsyncStorage Keys:');
    console.log('-'.repeat(30));
    
    const allKeys = await AsyncStorage.getAllKeys();
    console.log('📋 Total keys:', allKeys.length);
    
    const authKeys = allKeys.filter(key => key.includes('auth') || key.includes('sb-'));
    console.log('🔐 Auth-related keys:', authKeys.length);
    authKeys.forEach(key => {
      console.log(`   - ${key}`);
    });

    // Summary
    console.log('\n🎯 SESSION STORAGE DIAGNOSIS:');
    console.log('=' .repeat(50));
    
    const hasStoredSession = !!storedSession;
    const hasActiveSession = !!session;
    const storageWorking = allKeys.length > 0;
    
    console.log(`📊 AsyncStorage Working: ${storageWorking ? '✅ Yes' : '❌ No'}`);
    console.log(`📊 Session Stored: ${hasStoredSession ? '✅ Yes' : '❌ No'}`);
    console.log(`📊 Session Active: ${hasActiveSession ? '✅ Yes' : '❌ No'}`);
    
    if (!hasStoredSession && !hasActiveSession) {
      console.log('\n💡 LIKELY ISSUES:');
      console.log('   1. User needs to log in again');
      console.log('   2. Session expired and wasn\'t refreshed');
      console.log('   3. AsyncStorage is being cleared');
      console.log('   4. Auth configuration issue');
    } else if (hasStoredSession && !hasActiveSession) {
      console.log('\n💡 LIKELY ISSUES:');
      console.log('   1. Session parsing/validation failing');
      console.log('   2. Session expired');
      console.log('   3. Supabase client configuration issue');
    } else if (hasActiveSession) {
      console.log('\n✅ SESSION STORAGE IS WORKING CORRECTLY');
      console.log('💡 If you\'re still having auth issues, the problem is in:');
      console.log('   1. React Native auth state management');
      console.log('   2. Profile fetching logic');
      console.log('   3. Auth store initialization');
    }

  } catch (error) {
    console.error('\n🚨 CRITICAL ERROR:', error);
  }
}

// Run the debug
if (require.main === module) {
  debugSessionStorage()
    .then(() => {
      console.log('\n✅ Session storage debug completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Debug failed:', error);
      process.exit(1);
    });
}

module.exports = { debugSessionStorage };
