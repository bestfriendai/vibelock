import { supabase } from '../config/supabase';
import { withRetry } from '../utils/retryLogic';
import { User, AuthProvider } from '../types';

export class AuthService {
  async signIn(email: string, password: string) {
    return withRetry(
      async () => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        return data;
      },
      {
        maxAttempts: 2,
        retryableErrors: ['Network request failed'],
      }
    );
  }

  async signUp(email: string, password: string, username?: string) {
    return withRetry(
      async () => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username },
          },
        });

        if (error) throw error;
        return data;
      },
      {
        maxAttempts: 2,
        retryableErrors: ['Network request failed'],
      }
    );
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async resetPassword(email: string) {
    return withRetry(
      async () => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: 'lockerroom://reset-password', // Deep link for mobile app
        });

        if (error) throw error;
      },
      {
        maxAttempts: 2,
        retryableErrors: ['Network request failed'],
      }
    );
  }

  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
  }

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  async refreshSession() {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throw error;
    return data.session;
  }

  async signInWithOAuth(provider: AuthProvider) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider as any,
      options: {
        redirectTo: 'lockerroom://auth/callback',
      },
    });

    if (error) throw error;
    return data;
  }

  async deleteAccount() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const { error } = await supabase.rpc('delete_user_account', {
      user_id: user.id,
    });

    if (error) throw error;
    await this.signOut();
  }

  onAuthStateChange(callback: (session: any) => void) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });

    return subscription;
  }

  async verifyOtp(email: string, token: string) {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });

    if (error) throw error;
    return data;
  }

  async resendOtp(email: string) {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });

    if (error) throw error;
  }
}

export const authService = new AuthService();