-- Seed data for LockerRoom app
-- This file populates the database with initial data for development and testing

-- Insert initial chat rooms
INSERT INTO chat_rooms_firebase (id, name, description, type, category, member_count, online_count, is_active, location, created_at, updated_at, last_activity) VALUES
  (
    '550e8400-e29b-41d4-a716-446655440001',
    'General Chat',
    'Open discussion for everyone - all topics welcome',
    'general',
    'all',
    0,
    0,
    true,
    '{"city": "Global", "state": "Worldwide"}'::jsonb,
    NOW() - INTERVAL '7 days',
    NOW(),
    NOW() - INTERVAL '1 hour'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440002',
    'College Life',
    'Share your college experiences and connect with fellow students',
    'college',
    'all',
    0,
    0,
    true,
    '{"city": "Campus", "state": "University"}'::jsonb,
    NOW() - INTERVAL '5 days',
    NOW(),
    NOW() - INTERVAL '2 hours'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440003',
    'Dating & Relationships',
    'Discuss dating, relationships, and meeting new people',
    'dating',
    'all',
    0,
    0,
    true,
    '{"city": "Global", "state": "Worldwide"}'::jsonb,
    NOW() - INTERVAL '3 days',
    NOW(),
    NOW() - INTERVAL '30 minutes'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440004',
    'Local Hangouts',
    'Find people to hang out with in your area',
    'local',
    'all',
    0,
    0,
    true,
    '{"city": "Local", "state": "Area"}'::jsonb,
    NOW() - INTERVAL '2 days',
    NOW(),
    NOW() - INTERVAL '45 minutes'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440005',
    'Study Groups',
    'Form study groups and share academic resources',
    'academic',
    'all',
    0,
    0,
    true,
    '{"city": "Campus", "state": "Academic"}'::jsonb,
    NOW() - INTERVAL '1 day',
    NOW(),
    NOW() - INTERVAL '15 minutes'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440006',
    'Sports & Fitness',
    'Talk about sports, fitness, and staying active',
    'sports',
    'all',
    0,
    0,
    true,
    '{"city": "Global", "state": "Worldwide"}'::jsonb,
    NOW() - INTERVAL '6 hours',
    NOW(),
    NOW() - INTERVAL '10 minutes'
  );

-- Insert some sample messages for the chat rooms
INSERT INTO chat_messages_firebase (id, chat_room_id, sender_id, sender_name, content, message_type, timestamp, is_read, is_deleted) VALUES
  (
    '660e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440001',
    NULL,
    'System',
    'Welcome to General Chat! Feel free to introduce yourself and start conversations.',
    'system',
    NOW() - INTERVAL '1 hour',
    false,
    false
  ),
  (
    '660e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440002',
    NULL,
    'System',
    'Welcome to College Life! Share your campus experiences and connect with fellow students.',
    'system',
    NOW() - INTERVAL '2 hours',
    false,
    false
  ),
  (
    '660e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440003',
    NULL,
    'System',
    'Welcome to Dating & Relationships! Keep conversations respectful and supportive.',
    'system',
    NOW() - INTERVAL '30 minutes',
    false,
    false
  ),
  (
    '660e8400-e29b-41d4-a716-446655440004',
    '550e8400-e29b-41d4-a716-446655440004',
    NULL,
    'System',
    'Welcome to Local Hangouts! Find people in your area to hang out with.',
    'system',
    NOW() - INTERVAL '45 minutes',
    false,
    false
  ),
  (
    '660e8400-e29b-41d4-a716-446655440005',
    '550e8400-e29b-41d4-a716-446655440005',
    NULL,
    'System',
    'Welcome to Study Groups! Collaborate and share academic resources.',
    'system',
    NOW() - INTERVAL '15 minutes',
    false,
    false
  ),
  (
    '660e8400-e29b-41d4-a716-446655440006',
    '550e8400-e29b-41d4-a716-446655440006',
    NULL,
    'System',
    'Welcome to Sports & Fitness! Share your fitness journey and sports interests.',
    'system',
    NOW() - INTERVAL '10 minutes',
    false,
    false
  );

-- Update chat rooms with last message information
UPDATE chat_rooms_firebase SET 
  last_message = jsonb_build_object(
    'content', 'Welcome to General Chat! Feel free to introduce yourself and start conversations.',
    'sender_name', 'System',
    'timestamp', NOW() - INTERVAL '1 hour',
    'message_type', 'system'
  )
WHERE id = '550e8400-e29b-41d4-a716-446655440001';

UPDATE chat_rooms_firebase SET 
  last_message = jsonb_build_object(
    'content', 'Welcome to College Life! Share your campus experiences and connect with fellow students.',
    'sender_name', 'System',
    'timestamp', NOW() - INTERVAL '2 hours',
    'message_type', 'system'
  )
WHERE id = '550e8400-e29b-41d4-a716-446655440002';

UPDATE chat_rooms_firebase SET 
  last_message = jsonb_build_object(
    'content', 'Welcome to Dating & Relationships! Keep conversations respectful and supportive.',
    'sender_name', 'System',
    'timestamp', NOW() - INTERVAL '30 minutes',
    'message_type', 'system'
  )
WHERE id = '550e8400-e29b-41d4-a716-446655440003';

UPDATE chat_rooms_firebase SET 
  last_message = jsonb_build_object(
    'content', 'Welcome to Local Hangouts! Find people in your area to hang out with.',
    'sender_name', 'System',
    'timestamp', NOW() - INTERVAL '45 minutes',
    'message_type', 'system'
  )
WHERE id = '550e8400-e29b-41d4-a716-446655440004';

UPDATE chat_rooms_firebase SET 
  last_message = jsonb_build_object(
    'content', 'Welcome to Study Groups! Collaborate and share academic resources.',
    'sender_name', 'System',
    'timestamp', NOW() - INTERVAL '15 minutes',
    'message_type', 'system'
  )
WHERE id = '550e8400-e29b-41d4-a716-446655440005';

UPDATE chat_rooms_firebase SET 
  last_message = jsonb_build_object(
    'content', 'Welcome to Sports & Fitness! Share your fitness journey and sports interests.',
    'sender_name', 'System',
    'timestamp', NOW() - INTERVAL '10 minutes',
    'message_type', 'system'
  )
WHERE id = '550e8400-e29b-41d4-a716-446655440006';
