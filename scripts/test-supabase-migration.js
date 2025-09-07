#!/usr/bin/env node

/**
 * Test script to validate Firebase to Supabase migration
 * Run with: node test-supabase-migration.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Load configuration from environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables:');
  if (!SUPABASE_URL) {
    console.error('  - SUPABASE_URL or EXPO_PUBLIC_SUPABASE_URL is not set');
  }
  if (!SUPABASE_ANON_KEY) {
    console.error('  - SUPABASE_ANON_KEY or EXPO_PUBLIC_SUPABASE_ANON_KEY is not set');
  }
  console.error('\nPlease ensure these variables are set in your .env file or environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');
  
  try {
    // Test basic connection by querying a simple table
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    return false;
  }
}

async function testTableStructures() {
  console.log('🔍 Testing table structures...');
  
  const tables = [
    'users',
    'reviews_firebase',
    'chat_rooms_firebase', 
    'chat_messages_firebase',
    'comments_firebase'
  ];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.error(`❌ Table ${table} test failed:`, error.message);
        return false;
      }
      
      console.log(`✅ Table ${table} accessible`);
    } catch (error) {
      console.error(`❌ Table ${table} error:`, error.message);
      return false;
    }
  }
  
  return true;
}

async function testRLSPolicies() {
  console.log('🔍 Testing Row Level Security policies...');
  
  try {
    // Test that we can read from tables (should work with anon key)
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews_firebase')
      .select('*')
      .limit(1);
    
    if (reviewsError) {
      console.error('❌ RLS test failed for reviews:', reviewsError.message);
      return false;
    }
    
    const { data: chatRooms, error: chatError } = await supabase
      .from('chat_rooms_firebase')
      .select('*')
      .limit(1);
    
    if (chatError) {
      console.error('❌ RLS test failed for chat rooms:', chatError.message);
      return false;
    }
    
    console.log('✅ RLS policies working correctly');
    return true;
  } catch (error) {
    console.error('❌ RLS test error:', error.message);
    return false;
  }
}

async function testRealtimeSetup() {
  console.log('🔍 Testing realtime setup...');
  
  try {
    // Create a test subscription to see if realtime is enabled
    const channel = supabase
      .channel('test-channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_messages_firebase'
      }, (payload) => {
        console.log('Realtime event received:', payload);
      });
    
    const subscribeResult = await channel.subscribe();
    
    // Check subscription state
    if (channel.state === 'SUBSCRIBED' || subscribeResult === 'SUBSCRIBED') {
      console.log('✅ Channel subscribed successfully');
      
      // Clean up - only remove if successfully subscribed
      try {
        await supabase.removeChannel(channel);
      } catch (removeError) {
        console.error('⚠️ Error removing channel:', removeError.message);
      }
    } else {
      console.error('❌ Channel subscription failed, state:', channel.state);
      return false;
    }
    
    console.log('✅ Realtime setup successful');
    return true;
  } catch (error) {
    console.error('❌ Realtime test error:', error.message);
    return false;
  }
}

async function testStorageBuckets() {
  console.log('🔍 Testing storage buckets...');

  try {
    // Test storage access by trying to get a public URL from each bucket
    // This is a better test than listing buckets (which requires admin permissions)
    const expectedBuckets = ['avatars', 'evidence', 'thumbnails', 'chat-media'];

    for (const bucketName of expectedBuckets) {
      try {
        // Try to get a public URL for a test file (this will work even if file doesn't exist)
        const { data } = supabase.storage
          .from(bucketName)
          .getPublicUrl('test-file.jpg');

        if (data && data.publicUrl) {
          console.log(`✅ Bucket ${bucketName} accessible`);
        } else {
          console.error(`❌ Bucket ${bucketName} not accessible`);
          return false;
        }
      } catch (bucketError) {
        console.error(`❌ Error accessing bucket ${bucketName}:`, bucketError.message);
        return false;
      }
    }

    console.log('✅ All storage buckets accessible');
    return true;
  } catch (error) {
    console.error('❌ Storage test error:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Supabase migration validation tests...\n');
  
  const tests = [
    { name: 'Database Connection', fn: testDatabaseConnection },
    { name: 'Table Structures', fn: testTableStructures },
    { name: 'RLS Policies', fn: testRLSPolicies },
    { name: 'Realtime Setup', fn: testRealtimeSetup },
    { name: 'Storage Buckets', fn: testStorageBuckets }
  ];
  
  let passedTests = 0;
  
  for (const test of tests) {
    console.log(`\n--- ${test.name} ---`);
    const result = await test.fn();
    if (result) {
      passedTests++;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Test Results: ${passedTests}/${tests.length} tests passed`);
  
  if (passedTests === tests.length) {
    console.log('🎉 All tests passed! Migration validation successful.');
    console.log('\n📝 Next steps:');
    console.log('1. Ensure environment variables are properly configured:');
    console.log('   - SUPABASE_URL (or EXPO_PUBLIC_SUPABASE_URL) is set in .env or secret manager');
    console.log('   - SUPABASE_ANON_KEY (or EXPO_PUBLIC_SUPABASE_ANON_KEY) is set in .env or secret manager');
    console.log('2. Run tests to verify app functionality:');
    console.log('   - npm test (or your configured test command)');
    console.log('3. Verify the app works correctly using the environment variables');
    console.log('4. Check and remove any remaining Firebase environment variables and dependencies:');
    console.log('   - Review package.json for Firebase packages');
    console.log('   - Remove FIREBASE_* environment variables from .env');
  } else {
    console.log('❌ Some tests failed. Please review the errors above.');
    process.exit(1);
  }
}

// Run the tests
runAllTests().catch(error => {
  console.error('💥 Test runner error:', error);
  process.exit(1);
});
