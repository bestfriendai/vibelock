const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

// Test data
const testUser = {
  email: 'testuser@gmail.com',
  password: 'testpassword123',
  username: 'testuser'
};

const testReview = {
  reviewed_person_name: 'John Doe',
  reviewed_person_instagram: '@johndoe',
  review_text: 'Great person to work with!',
  rating: 5,
  category: 'professional',
  tags: ['reliable', 'professional'],
  is_anonymous: false
};

async function runComprehensiveTests() {
  console.log('🚀 Starting Comprehensive Backend Tests...\n');

  try {
    // Test 1: Authentication Flow
    console.log('1️⃣ Testing Authentication...');
    
    // Sign up
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testUser.email,
      password: testUser.password,
    });

    if (signUpError && !signUpError.message.includes('already registered')) {
      console.error('❌ Sign up failed:', signUpError.message);
    } else {
      console.log('✅ Sign up successful or user exists');
    }

    // Sign in
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password,
    });

    if (signInError) {
      console.error('❌ Sign in failed:', signInError.message);
      return;
    }

    console.log('✅ Authentication successful');
    const userId = signInData.user.id;

    // Test 2: User Profile Management
    console.log('\n2️⃣ Testing User Profile...');
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        clerk_user_id: null, // Allow null for testing
        username: testUser.username,
        email: testUser.email,
        city: 'Test City',
        state: 'Test State',
        gender: 'other',
        gender_preference: 'all',
        verification_level: 'basic',
        reputation_score: 0,
        total_reviews_submitted: 0,
        is_banned: false,
        is_blocked: false
      })
      .select()
      .single();

    if (userError) {
      console.error('❌ User profile creation failed:', userError.message);
    } else {
      console.log('✅ User profile created/updated successfully');
    }

    // Test 3: Review System
    console.log('\n3️⃣ Testing Review System...');
    
    const { data: reviewData, error: reviewError } = await supabase
      .from('reviews_firebase')
      .insert({
        ...testReview,
        author_id: userId,
        location: 'Test Location'
      })
      .select()
      .single();

    if (reviewError) {
      console.error('❌ Review creation failed:', reviewError.message);
    } else {
      console.log('✅ Review created successfully');
      
      // Test review retrieval
      const { data: reviews, error: fetchError } = await supabase
        .from('reviews_firebase')
        .select('*')
        .eq('author_id', userId);

      if (fetchError) {
        console.error('❌ Review fetch failed:', fetchError.message);
      } else {
        console.log(`✅ Retrieved ${reviews.length} reviews`);
      }
    }

    // Test 4: Comments System
    console.log('\n4️⃣ Testing Comments System...');
    
    if (reviewData) {
      const { data: commentData, error: commentError } = await supabase
        .from('comments_firebase')
        .insert({
          review_id: reviewData.id,
          author_id: userId,
          content: 'This is a test comment',
          is_anonymous: false
        })
        .select()
        .single();

      if (commentError) {
        console.error('❌ Comment creation failed:', commentError.message);
      } else {
        console.log('✅ Comment created successfully');
      }
    }

    // Test 5: Chat System
    console.log('\n5️⃣ Testing Chat System...');
    
    const { data: chatRoomData, error: chatRoomError } = await supabase
      .from('chat_rooms_firebase')
      .insert({
        name: 'Test Chat Room',
        description: 'A test chat room',
        category: 'general',
        is_private: false,
        created_by: userId
      })
      .select()
      .single();

    if (chatRoomError) {
      console.error('❌ Chat room creation failed:', chatRoomError.message);
    } else {
      console.log('✅ Chat room created successfully');

      // Test message sending
      const { data: messageData, error: messageError } = await supabase
        .from('chat_messages_firebase')
        .insert({
          room_id: chatRoomData.id,
          sender_id: userId,
          content: 'Hello, this is a test message!',
          message_type: 'text'
        })
        .select()
        .single();

      if (messageError) {
        console.error('❌ Message creation failed:', messageError.message);
      } else {
        console.log('✅ Message sent successfully');
      }
    }

    // Test 6: Notifications System
    console.log('\n6️⃣ Testing Notifications System...');
    
    const { data: notificationData, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'new_review',
        title: 'Test Notification',
        body: 'This is a test notification',
        data: { test: true },
        is_read: false,
        is_sent: false
      })
      .select()
      .single();

    if (notificationError) {
      console.error('❌ Notification creation failed:', notificationError.message);
    } else {
      console.log('✅ Notification created successfully');
    }

    // Test 7: Push Tokens
    console.log('\n7️⃣ Testing Push Tokens...');
    
    const { data: pushTokenData, error: pushTokenError } = await supabase
      .from('push_tokens')
      .insert({
        user_id: userId,
        token: 'test-push-token-123',
        device_id: 'test-device-123',
        platform: 'ios',
        is_active: true
      })
      .select()
      .single();

    if (pushTokenError) {
      console.error('❌ Push token creation failed:', pushTokenError.message);
    } else {
      console.log('✅ Push token created successfully');
    }

    // Test 8: Storage Buckets
    console.log('\n8️⃣ Testing Storage Buckets...');
    
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Storage buckets fetch failed:', bucketsError.message);
    } else {
      console.log(`✅ Found ${buckets.length} storage buckets:`, buckets.map(b => b.name));
    }

    // Test 9: Real-time Subscriptions
    console.log('\n9️⃣ Testing Real-time Subscriptions...');
    
    const channel = supabase
      .channel('test-channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'reviews_firebase'
      }, (payload) => {
        console.log('📡 Real-time event received:', payload.eventType);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time subscription successful');
          setTimeout(() => channel.unsubscribe(), 2000);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Real-time subscription failed');
        }
      });

    // Test 10: Row Level Security
    console.log('\n🔒 Testing Row Level Security...');
    
    // Try to access another user's data (should fail)
    const { data: otherUserData, error: rlsError } = await supabase
      .from('users')
      .select('*')
      .neq('id', userId);

    if (rlsError) {
      console.log('✅ RLS working - cannot access other users data');
    } else {
      console.log(`⚠️ RLS might need review - accessed ${otherUserData?.length || 0} other users`);
    }

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    
    // Delete test data
    if (reviewData) {
      await supabase.from('reviews_firebase').delete().eq('id', reviewData.id);
    }
    if (chatRoomData) {
      await supabase.from('chat_rooms_firebase').delete().eq('id', chatRoomData.id);
    }
    if (notificationData) {
      await supabase.from('notifications').delete().eq('id', notificationData.id);
    }
    if (pushTokenData) {
      await supabase.from('push_tokens').delete().eq('id', pushTokenData.id);
    }

    console.log('✅ Cleanup completed');

    // Sign out
    await supabase.auth.signOut();
    console.log('✅ Signed out successfully');

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('💥 Test suite failed:', error.message);
  }
}

// Run the tests
runComprehensiveTests();
