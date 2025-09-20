#!/usr/bin/env node

/**
 * Script to seed chat rooms in the remote Supabase database
 * This ensures there are chat rooms available for users to join
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const chatRooms = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'General Chat',
    description: 'Open discussion for everyone - all topics welcome',
    type: 'general',
    category: 'all',
    member_count: 0,
    online_count: 0,
    is_active: true,
    location: { city: 'Global', state: 'Worldwide' },
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    last_activity: new Date(Date.now() - 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'College Life',
    description: 'Share your college experiences and connect with fellow students',
    type: 'college',
    category: 'all',
    member_count: 0,
    online_count: 0,
    is_active: true,
    location: { city: 'Campus', state: 'University' },
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    last_activity: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    name: 'Dating & Relationships',
    description: 'Discuss dating, relationships, and meeting new people',
    type: 'dating',
    category: 'all',
    member_count: 0,
    online_count: 0,
    is_active: true,
    location: { city: 'Global', state: 'Worldwide' },
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    last_activity: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    name: 'Local Hangouts',
    description: 'Find people to hang out with in your area',
    type: 'local',
    category: 'all',
    member_count: 0,
    online_count: 0,
    is_active: true,
    location: { city: 'Local', state: 'Area' },
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    last_activity: new Date(Date.now() - 45 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440005',
    name: 'Study Groups',
    description: 'Form study groups and share academic resources',
    type: 'academic',
    category: 'all',
    member_count: 0,
    online_count: 0,
    is_active: true,
    location: { city: 'Campus', state: 'Academic' },
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    last_activity: new Date(Date.now() - 15 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440006',
    name: 'Sports & Fitness',
    description: 'Talk about sports, fitness, and staying active',
    type: 'sports',
    category: 'all',
    member_count: 0,
    online_count: 0,
    is_active: true,
    location: { city: 'Global', state: 'Worldwide' },
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    last_activity: new Date(Date.now() - 10 * 60 * 1000).toISOString()
  }
];

const welcomeMessages = [
  {
    id: '660e8400-e29b-41d4-a716-446655440001',
    chat_room_id: '550e8400-e29b-41d4-a716-446655440001',
    sender_id: null,
    sender_name: 'System',
    content: 'Welcome to General Chat! Feel free to introduce yourself and start conversations.',
    message_type: 'system',
    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    is_read: false,
    is_deleted: false
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440002',
    chat_room_id: '550e8400-e29b-41d4-a716-446655440002',
    sender_id: null,
    sender_name: 'System',
    content: 'Welcome to College Life! Share your campus experiences and connect with fellow students.',
    message_type: 'system',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    is_read: false,
    is_deleted: false
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440003',
    chat_room_id: '550e8400-e29b-41d4-a716-446655440003',
    sender_id: null,
    sender_name: 'System',
    content: 'Welcome to Dating & Relationships! Keep conversations respectful and supportive.',
    message_type: 'system',
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    is_read: false,
    is_deleted: false
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440004',
    chat_room_id: '550e8400-e29b-41d4-a716-446655440004',
    sender_id: null,
    sender_name: 'System',
    content: 'Welcome to Local Hangouts! Find people in your area to hang out with.',
    message_type: 'system',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    is_read: false,
    is_deleted: false
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440005',
    chat_room_id: '550e8400-e29b-41d4-a716-446655440005',
    sender_id: null,
    sender_name: 'System',
    content: 'Welcome to Study Groups! Collaborate and share academic resources.',
    message_type: 'system',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    is_read: false,
    is_deleted: false
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440006',
    chat_room_id: '550e8400-e29b-41d4-a716-446655440006',
    sender_id: null,
    sender_name: 'System',
    content: 'Welcome to Sports & Fitness! Share your fitness journey and sports interests.',
    message_type: 'system',
    timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    is_read: false,
    is_deleted: false
  }
];

async function seedChatRooms() {
  console.log('🌱 Starting chat room seeding...');

  try {
    // Check if chat rooms already exist
    const { data: existingRooms, error: checkError } = await supabase
      .from('chat_rooms_firebase')
      .select('id')
      .limit(1);

    if (checkError) {
      console.error('❌ Error checking existing rooms:', checkError);
      return;
    }

    if (existingRooms && existingRooms.length > 0) {
      console.log('✅ Chat rooms already exist, skipping seed');
      return;
    }

    // Insert chat rooms
    console.log('📝 Inserting chat rooms...');
    const { error: roomsError } = await supabase
      .from('chat_rooms_firebase')
      .insert(chatRooms);

    if (roomsError) {
      console.error('❌ Error inserting chat rooms:', roomsError);
      return;
    }

    console.log('✅ Chat rooms inserted successfully');

    // Insert welcome messages
    console.log('💬 Inserting welcome messages...');
    const { error: messagesError } = await supabase
      .from('chat_messages_firebase')
      .insert(welcomeMessages);

    if (messagesError) {
      console.error('❌ Error inserting messages:', messagesError);
      return;
    }

    console.log('✅ Welcome messages inserted successfully');

    // Update chat rooms with last message info
    console.log('🔄 Updating chat rooms with last message info...');
    for (let i = 0; i < chatRooms.length; i++) {
      const room = chatRooms[i];
      const message = welcomeMessages[i];
      
      const { error: updateError } = await supabase
        .from('chat_rooms_firebase')
        .update({
          last_message: {
            content: message.content,
            sender_name: message.sender_name,
            timestamp: message.timestamp,
            message_type: message.message_type
          }
        })
        .eq('id', room.id);

      if (updateError) {
        console.warn(`⚠️ Error updating room ${room.name}:`, updateError);
      }
    }

    console.log('🎉 Chat room seeding completed successfully!');
    console.log(`📊 Created ${chatRooms.length} chat rooms with welcome messages`);

  } catch (error) {
    console.error('💥 Unexpected error during seeding:', error);
  }
}

// Run the seeding
seedChatRooms().then(() => {
  console.log('🏁 Seeding process finished');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Seeding failed:', error);
  process.exit(1);
});
