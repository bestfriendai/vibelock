#!/usr/bin/env node

/**
 * Quick verification test for the image upload fix
 * Run this after creating a new review with images
 */

const fetch = require('node-fetch');

const SUPABASE_URL = 'https://dqjhwqhelqwhvtpxccwj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxamh3cWhlbHF3aHZ0cHhjY3dqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0MjE4MjcsImV4cCI6MjA2ODk5NzgyN30.qZmbCZig2wy0ShcaXWZ6TxD-vpbrExSIEImHAvaFkMQ';

async function verifyImageFix() {
  console.log('🔍 Verifying Image Upload Fix\n');

  try {
    // Get the most recent review
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/reviews_firebase?select=id,profile_photo,media,created_at&order=created_at.desc&limit=1`,
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
    
    if (reviews.length === 0) {
      console.log('❌ No reviews found');
      return;
    }

    const newestReview = reviews[0];
    console.log(`📝 Checking newest review: ${newestReview.id}`);
    console.log(`   Created: ${newestReview.created_at}`);

    let totalImages = 0;
    let validImages = 0;
    let emptyImages = 0;
    let errorImages = 0;

    // Check media array
    if (newestReview.media && Array.isArray(newestReview.media)) {
      console.log(`\n📸 Found ${newestReview.media.length} media items:`);
      
      for (let i = 0; i < newestReview.media.length; i++) {
        const mediaItem = newestReview.media[i];
        
        if (mediaItem.uri && mediaItem.uri.startsWith('https://')) {
          totalImages++;
          
          try {
            const imageResponse = await fetch(mediaItem.uri, { method: 'HEAD' });
            const contentLength = imageResponse.headers.get('content-length');
            const size = contentLength ? parseInt(contentLength) : 0;
            
            console.log(`   ${i + 1}. ${mediaItem.uri.substring(0, 70)}...`);
            console.log(`      Size: ${size} bytes`);
            
            if (size > 0) {
              validImages++;
              console.log(`      Status: ✅ VALID`);
            } else {
              emptyImages++;
              console.log(`      Status: ❌ EMPTY`);
            }
          } catch (error) {
            errorImages++;
            console.log(`   ${i + 1}. ${mediaItem.uri.substring(0, 70)}...`);
            console.log(`      Status: ❌ ERROR - ${error.message}`);
          }
        } else {
          console.log(`   ${i + 1}. Invalid URI: ${mediaItem.uri || 'null'}`);
        }
      }
    } else {
      console.log('\n📸 No media array found');
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 VERIFICATION RESULTS');
    console.log('='.repeat(50));
    
    console.log(`Total images checked: ${totalImages}`);
    console.log(`Valid images (>0 bytes): ${validImages}`);
    console.log(`Empty images (0 bytes): ${emptyImages}`);
    console.log(`Error images: ${errorImages}`);

    if (validImages > 0 && emptyImages === 0) {
      console.log('\n🎉 SUCCESS: Image upload fix is working!');
      console.log('   - All images have content (>0 bytes)');
      console.log('   - Images should now display in the app');
    } else if (validImages > 0 && emptyImages > 0) {
      console.log('\n⚠️  PARTIAL SUCCESS: Some images are working');
      console.log(`   - ${validImages} images have content`);
      console.log(`   - ${emptyImages} images are still empty`);
      console.log('   - May need additional debugging');
    } else if (emptyImages > 0) {
      console.log('\n❌ ISSUE PERSISTS: Images are still empty');
      console.log('   - The fix may not be working correctly');
      console.log('   - Check the debug logs in the app console');
    } else if (totalImages === 0) {
      console.log('\n📝 NO IMAGES: Review has no media items');
      console.log('   - Create a review with images to test the fix');
    } else {
      console.log('\n❓ UNCLEAR: Unable to determine status');
    }

    console.log('\n💡 Next Steps:');
    if (validImages > 0 && emptyImages === 0) {
      console.log('   - Pull-to-refresh on the browse screen');
      console.log('   - Images should now appear in the app');
      console.log('   - Test creating another review to confirm consistency');
    } else {
      console.log('   - Check the app console for debug logs');
      console.log('   - Look for "📸 Image upload debug:" messages');
      console.log('   - Verify the FileSystem.readAsStringAsync is working');
    }

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

verifyImageFix();
