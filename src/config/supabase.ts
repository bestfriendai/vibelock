// Supabase configuration for LockerRoom MVP
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase configuration from environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Validate configuration
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration');
  throw new Error('Missing Supabase configuration: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are required');
}

// Optional debug logging in development only
if (__DEV__) {
  console.log('[Supabase Config] URL:', supabaseUrl);
  console.log('[Supabase Config] Anon Key:', supabaseAnonKey?.substring(0, 20) + '...');
}

// Create Supabase client with React Native specific configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use AsyncStorage for session persistence in React Native
    storage: AsyncStorage,
    // Auto refresh tokens
    autoRefreshToken: true,
    // Persist session across app restarts
    persistSession: true,
    // Detect session in URL (useful for magic links)
    detectSessionInUrl: false,
  },
  // Real-time configuration
  realtime: {
    // Enable real-time subscriptions
    params: {
      eventsPerSecond: 10,
    },
  },
  // Global configuration
  global: {
    headers: {
      'X-Client-Info': 'lockerroom-mobile-app',
    },
  },
});

// Export types for TypeScript support
export type { User } from '@supabase/supabase-js';
export type { Session } from '@supabase/supabase-js';
export type { AuthError } from '@supabase/supabase-js';
export type { PostgrestError } from '@supabase/supabase-js';

// Helper function to handle Supabase errors
export const handleSupabaseError = (error: any): string => {
  if (error?.message) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
};

// Helper function to check if user is authenticated
export const isAuthenticated = (): boolean => {
  return supabase.auth.getUser() !== null;
};

export default supabase;
