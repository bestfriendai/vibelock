#!/usr/bin/env node

/**
 * Comprehensive Image Upload Pipeline Test Suite
 * Tests the complete flow from image upload to display
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://dqjhwqhelqwhvtpxccwj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxamh3cWhlbHF3aHZ0cHhjY3dqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0MjE4MjcsImV4cCI6MjA2ODk5NzgyN30.qZmbCZig2wy0ShcaXWZ6TxD-vpbrExSIEImHAvaFkMQ';

class ImageUploadTester {
  constructor() {
    this.testResults = {
      storageAccess: false,
      recentReviews: false,
      mediaValidation: false,
      imageAccessibility: false,
      uploadPipeline: false
    };
  }

  async runAllTests() {
    console.log('🧪 Starting Comprehensive Image Upload Pipeline Tests\n');
    
    try {
      await this.testStorageAccess();
      await this.testRecentReviews();
      await this.testMediaValidation();
      await this.testImageAccessibility();
      await this.testUploadPipeline();
      
      this.printSummary();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    }
  }

  async testStorageAccess() {
    console.log('📦 Test 1: Storage Bucket Access');
    
    try {
      // Test if we can access the storage bucket
      const response = await fetch(`${SUPABASE_URL}/storage/v1/bucket/review-images`, {
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY
        }
      });

      if (response.ok) {
        console.log('✅ Storage bucket accessible');
        this.testResults.storageAccess = true;
      } else {
        console.log(`⚠️  Storage bucket response: ${response.status}`);
        this.testResults.storageAccess = false;
      }
    } catch (error) {
      console.log('❌ Storage bucket access failed:', error.message);
      this.testResults.storageAccess = false;
    }
  }

  async testRecentReviews() {
    console.log('\n📋 Test 2: Recent Reviews Retrieval');
    
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/reviews_firebase?select=id,profile_photo,media,created_at&order=created_at.desc&limit=10`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch reviews: ${response.status}`);
      }

      const reviews = await response.json();
      console.log(`✅ Retrieved ${reviews.length} reviews`);
      
      this.reviews = reviews;
      this.testResults.recentReviews = true;
    } catch (error) {
      console.log('❌ Recent reviews retrieval failed:', error.message);
      this.testResults.recentReviews = false;
    }
  }

  async testMediaValidation() {
    console.log('\n🔍 Test 3: Media URL Validation');
    
    if (!this.reviews) {
      console.log('❌ No reviews available for validation');
      this.testResults.mediaValidation = false;
      return;
    }

    let totalMedia = 0;
    let validHttpsMedia = 0;
    let legacyFileMedia = 0;
    let emptyMedia = 0;
    let validProfilePhotos = 0;
    let legacyProfilePhotos = 0;

    for (const review of this.reviews) {
      // Check profile photo
      if (review.profile_photo) {
        if (review.profile_photo.startsWith('https://')) {
          validProfilePhotos++;
        } else if (review.profile_photo.startsWith('file://')) {
          legacyProfilePhotos++;
        }
      }

      // Check media array
      if (review.media && Array.isArray(review.media)) {
        for (const mediaItem of review.media) {
          totalMedia++;
          
          if (!mediaItem.uri) {
            emptyMedia++;
          } else if (mediaItem.uri.startsWith('https://')) {
            validHttpsMedia++;
          } else if (mediaItem.uri.startsWith('file://')) {
            legacyFileMedia++;
          }
        }
      }
    }

    console.log(`📊 Media Validation Results:`);
    console.log(`  Total media items: ${totalMedia}`);
    console.log(`  Valid HTTPS URLs: ${validHttpsMedia} (${Math.round(validHttpsMedia/totalMedia*100)}%)`);
    console.log(`  Legacy file:// URIs: ${legacyFileMedia} (${Math.round(legacyFileMedia/totalMedia*100)}%)`);
    console.log(`  Empty URIs: ${emptyMedia}`);
    console.log(`  Valid profile photos: ${validProfilePhotos}`);
    console.log(`  Legacy profile photos: ${legacyProfilePhotos}`);

    // Test passes if we have some valid HTTPS media
    this.testResults.mediaValidation = validHttpsMedia > 0;
    
    if (this.testResults.mediaValidation) {
      console.log('✅ Media validation passed - found valid HTTPS URLs');
    } else {
      console.log('⚠️  Media validation warning - no valid HTTPS URLs found');
    }
  }

  async testImageAccessibility() {
    console.log('\n🖼️  Test 4: Image Accessibility');
    
    if (!this.reviews) {
      console.log('❌ No reviews available for accessibility testing');
      this.testResults.imageAccessibility = false;
      return;
    }

    let accessibleImages = 0;
    let inaccessibleImages = 0;
    let emptyImages = 0;
    let testCount = 0;

    for (const review of this.reviews) {
      if (testCount >= 5) break; // Test first 5 reviews only

      // Test media images
      if (review.media && Array.isArray(review.media)) {
        for (const mediaItem of review.media) {
          if (mediaItem.uri && mediaItem.uri.startsWith('https://')) {
            testCount++;
            
            try {
              const response = await fetch(mediaItem.uri, { method: 'HEAD' });
              
              if (response.ok) {
                const contentLength = response.headers.get('content-length');
                if (contentLength && parseInt(contentLength) > 0) {
                  accessibleImages++;
                  console.log(`✅ Image accessible: ${mediaItem.uri.substring(0, 80)}...`);
                } else {
                  emptyImages++;
                  console.log(`⚠️  Image empty (0 bytes): ${mediaItem.uri.substring(0, 80)}...`);
                }
              } else {
                inaccessibleImages++;
                console.log(`❌ Image inaccessible (${response.status}): ${mediaItem.uri.substring(0, 80)}...`);
              }
            } catch (error) {
              inaccessibleImages++;
              console.log(`❌ Image test failed: ${error.message}`);
            }
          }
        }
      }
    }

    console.log(`\n📊 Image Accessibility Results:`);
    console.log(`  Accessible images: ${accessibleImages}`);
    console.log(`  Empty images (0 bytes): ${emptyImages}`);
    console.log(`  Inaccessible images: ${inaccessibleImages}`);

    this.testResults.imageAccessibility = accessibleImages > 0;
    
    if (emptyImages > 0) {
      console.log('⚠️  WARNING: Found empty image files - upload pipeline may have issues');
    }
  }

  async testUploadPipeline() {
    console.log('\n🚀 Test 5: Upload Pipeline Status');

    // Check if newest reviews have valid images
    if (!this.reviews || this.reviews.length === 0) {
      console.log('❌ No reviews to test upload pipeline');
      this.testResults.uploadPipeline = false;
      return;
    }

    const newestReview = this.reviews[0];
    let hasValidMedia = false;
    let hasEmptyMedia = false;
    let totalMediaItems = 0;
    let validMediaItems = 0;

    if (newestReview.media && Array.isArray(newestReview.media)) {
      totalMediaItems = newestReview.media.length;

      for (const mediaItem of newestReview.media) {
        if (mediaItem.uri && mediaItem.uri.startsWith('https://')) {
          hasValidMedia = true;

          // Check if the image is empty
          try {
            const response = await fetch(mediaItem.uri, { method: 'HEAD' });
            const contentLength = response.headers.get('content-length');
            const size = contentLength ? parseInt(contentLength) : 0;

            console.log(`   📸 Media: ${mediaItem.uri.substring(0, 60)}... (${size} bytes)`);

            if (size > 0) {
              validMediaItems++;
            } else {
              hasEmptyMedia = true;
            }
          } catch (error) {
            console.log(`   ❌ Could not check: ${error.message}`);
          }
        } else {
          console.log(`   ⚠️  Invalid URI: ${mediaItem.uri ? mediaItem.uri.substring(0, 60) + '...' : 'null'}`);
        }
      }
    }

    console.log(`\n📝 Newest Review Analysis (${newestReview.id}):`);
    console.log(`  Created: ${newestReview.created_at}`);
    console.log(`  Total media items: ${totalMediaItems}`);
    console.log(`  Valid HTTPS media: ${hasValidMedia ? '✅' : '❌'}`);
    console.log(`  Non-empty media files: ${validMediaItems}/${totalMediaItems}`);
    console.log(`  Has empty media files: ${hasEmptyMedia ? '⚠️  YES' : '✅ NO'}`);

    if (hasValidMedia && validMediaItems === totalMediaItems && !hasEmptyMedia) {
      console.log('✅ Upload pipeline working perfectly');
      this.testResults.uploadPipeline = true;
    } else if (hasValidMedia && validMediaItems > 0) {
      console.log('⚠️  Upload pipeline partially working - some files may be empty');
      this.testResults.uploadPipeline = false;
    } else {
      console.log('❌ Upload pipeline not working - no valid media URLs');
      this.testResults.uploadPipeline = false;
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUITE SUMMARY');
    console.log('='.repeat(60));

    const tests = [
      { name: 'Storage Access', result: this.testResults.storageAccess },
      { name: 'Recent Reviews', result: this.testResults.recentReviews },
      { name: 'Media Validation', result: this.testResults.mediaValidation },
      { name: 'Image Accessibility', result: this.testResults.imageAccessibility },
      { name: 'Upload Pipeline', result: this.testResults.uploadPipeline }
    ];

    tests.forEach(test => {
      const status = test.result ? '✅ PASS' : '❌ FAIL';
      console.log(`${test.name.padEnd(20)} ${status}`);
    });

    const passedTests = tests.filter(t => t.result).length;
    const totalTests = tests.length;

    console.log('\n' + '-'.repeat(60));
    console.log(`Overall Result: ${passedTests}/${totalTests} tests passed`);

    if (passedTests === totalTests) {
      console.log('🎉 All tests passed! Image upload pipeline is working correctly.');
    } else if (passedTests >= 3) {
      console.log('⚠️  Most tests passed, but some issues detected. Check warnings above.');
    } else {
      console.log('❌ Multiple test failures detected. Image upload pipeline needs attention.');
    }

    console.log('\n💡 Recommendations:');
    
    if (!this.testResults.uploadPipeline) {
      console.log('  - Check image upload logic in reviewsStore.ts');
      console.log('  - Verify expo-image-manipulator is working correctly');
      console.log('  - Test blob creation from manipulated images');
    }
    
    if (!this.testResults.imageAccessibility) {
      console.log('  - Check Supabase Storage bucket permissions');
      console.log('  - Verify image files are not empty (0 bytes)');
    }

    console.log('  - Create a new review with images to test the current pipeline');
    console.log('  - Use pull-to-refresh on browse screen to see latest reviews');
  }
}

// Run the test suite
const tester = new ImageUploadTester();
tester.runAllTests();
