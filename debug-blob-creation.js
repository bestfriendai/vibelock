#!/usr/bin/env node

/**
 * Debug Blob Creation Test
 * Tests the blob creation process that's failing in the upload pipeline
 */

const fetch = require('node-fetch');

async function testBlobCreation() {
  console.log('🔍 Testing Blob Creation Process\n');

  // Test 1: Create blob from data URL (simulating expo-image-manipulator output)
  console.log('📸 Test 1: Creating blob from data URL');
  
  try {
    // This simulates what expo-image-manipulator might return
    const testImageData = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
    
    console.log('   Original data URL length:', testImageData.length);
    
    const response = await fetch(testImageData);
    console.log('   Fetch response status:', response.status);
    console.log('   Fetch response headers:', Object.fromEntries(response.headers.entries()));
    
    const blob = await response.blob();
    console.log('   Blob size:', blob.size);
    console.log('   Blob type:', blob.type);
    
    if (blob.size > 0) {
      console.log('✅ Blob creation from data URL successful');
    } else {
      console.log('❌ Blob creation failed - empty blob');
    }
  } catch (error) {
    console.log('❌ Blob creation from data URL failed:', error.message);
  }

  console.log('\n' + '-'.repeat(50));

  // Test 2: Create blob from file URL (simulating device file path)
  console.log('📱 Test 2: Testing file URL blob creation');
  
  try {
    // This simulates what might come from image picker
    const fileUrl = "file:///some/local/path/image.jpg";
    
    console.log('   File URL:', fileUrl);
    
    const response = await fetch(fileUrl);
    console.log('   Fetch response status:', response.status);
    
    const blob = await response.blob();
    console.log('   Blob size:', blob.size);
    console.log('   Blob type:', blob.type);
    
    if (blob.size > 0) {
      console.log('✅ Blob creation from file URL successful');
    } else {
      console.log('❌ Blob creation failed - empty blob');
    }
  } catch (error) {
    console.log('❌ Blob creation from file URL failed:', error.message);
    console.log('   This is expected in Node.js - file:// URLs don\'t work the same way as in React Native');
  }

  console.log('\n' + '-'.repeat(50));

  // Test 3: Test actual Supabase upload with test blob
  console.log('🗄️  Test 3: Testing Supabase upload with valid blob');
  
  try {
    // Create a valid blob
    const testImageData = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
    const response = await fetch(testImageData);
    const blob = await response.blob();
    
    console.log('   Test blob size:', blob.size);
    
    if (blob.size > 0) {
      console.log('✅ Valid blob created for upload test');
      
      // Note: We won't actually upload to avoid creating test files
      console.log('   (Skipping actual upload to avoid creating test files)');
    } else {
      console.log('❌ Cannot test upload - blob is empty');
    }
  } catch (error) {
    console.log('❌ Upload test preparation failed:', error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎯 DIAGNOSIS AND RECOMMENDATIONS');
  console.log('='.repeat(60));

  console.log('\n🔍 Root Cause Analysis:');
  console.log('The issue is likely in the React Native environment where:');
  console.log('1. expo-image-manipulator returns a file:// URI');
  console.log('2. fetch(file://...) in React Native may not work as expected');
  console.log('3. The blob created from the fetch is empty (0 bytes)');
  console.log('4. Supabase Storage receives and stores the empty blob');

  console.log('\n💡 Solutions to try:');
  console.log('1. Use FileSystem.readAsStringAsync() with base64 encoding');
  console.log('2. Convert base64 string directly to blob without fetch()');
  console.log('3. Use expo-file-system to read the manipulated image');
  console.log('4. Check if expo-image-manipulator is returning valid URIs');

  console.log('\n🔧 Code fixes to implement:');
  console.log('1. Add logging to see what expo-image-manipulator returns');
  console.log('2. Replace fetch(manipulatedImage.uri) with FileSystem approach');
  console.log('3. Add blob size validation before upload');
  console.log('4. Handle the case where blob creation fails');

  console.log('\n📝 Next steps:');
  console.log('1. Check the debug logs when creating a review in the app');
  console.log('2. Look for the manipulated image URI in the logs');
  console.log('3. Verify if the URI is accessible');
  console.log('4. Implement the FileSystem-based solution');
}

testBlobCreation();
