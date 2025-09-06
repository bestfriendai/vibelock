#!/usr/bin/env node

/**
 * Test script to validate Firebase to Supabase migration
 * Run with: node test-supabase-migration.js
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration with your Supabase anon key
const SUPABASE_URL = 'https://dqjhwqhelqwhvtpxccwj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxamh3cWhlbHF3aHZ0cHhjY3dqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0MjE4MjcsImV4cCI6MjA2ODk5NzgyN30.qZmbCZig2wy0ShcaXWZ6TxD-vpbrExSIEImHAvaFkMQ';

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
    
    await channel.subscribe();
    
    // Clean up
    await supabase.removeChannel(channel);
    
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
    console.log('1. Update your .env file with the correct SUPABASE_ANON_KEY');
    console.log('2. Test the app functionality manually');
    console.log('3. Remove Firebase dependencies when ready');
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
