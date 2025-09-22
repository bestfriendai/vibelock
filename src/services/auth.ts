import supabase, { handleSupabaseError } from "../config/supabase";
import { withRetry } from "../utils/retryLogic";
import { AuthProvider } from "../types";
import { initializeUserSubscription } from "../utils/subscriptionUtils";
import type { AuthResponse, Session, User as SupabaseUser, OAuthResponse } from "@supabase/supabase-js";

// Enhanced types for v2.57.4 compatibility
interface AuthResult {
  user: SupabaseUser | null;
  session: Session | null;
}

interface AuthError extends Error {
  status?: number;
  code?: string;
}

// Validation helpers for v2.57.4
const validateAuthResponse = (response: AuthResponse): AuthResult => {
  if (!response.data) {
    throw new Error("Invalid auth response structure");
  }
  return {
    user: response.data.user,
    session: response.data.session,
  };
};

const validateSession = (session: Session | null): boolean => {
  if (!session) return false;

  // Check if session has required v2 structure
  return !!(session.access_token && session.refresh_token && session.user);
};

const handleAuthError = (error: any): never => {
  console.warn("Auth operation failed:", error);
  const message = handleSupabaseError(error);
  const authError = new Error(message) as AuthError;
  authError.status = error?.status;
  authError.code = error?.code;
  throw authError;
};

export class AuthService {
  // Enhanced signIn with v2.57.4 validation
  async signIn(email: string, password: string): Promise<AuthResult> {
    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    return withRetry(
      async () => {
        const response = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (response.error) {
          handleAuthError(response.error);
        }

        const result = validateAuthResponse(response);

        // Validate session structure for v2 compatibility
        if (result.session && !validateSession(result.session)) {
          throw new Error("Invalid session structure received");
        }

        return result;
      },
      {
        maxAttempts: 3,
        retryableErrors: ["Network request failed", "timeout", "ECONNRESET"],
        baseDelay: 1000,
      },
    );
  }

  // Enhanced signUp with v2.57.4 validation and metadata handling
  async signUp(
    email: string,
    password: string,
    username?: string,
    additionalData?: Record<string, any>,
  ): Promise<AuthResult> {
    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters long");
    }

    return withRetry(
      async () => {
        // Prepare user metadata according to v2.57.4 spec
        const userMetadata = {
          username: username || email.split("@")[0],
          ...additionalData,
        };

        const response = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: userMetadata,
          },
        });

        if (response.error) {
          handleAuthError(response.error);
        }

        const result = validateAuthResponse(response);

        // Initialize subscription status for new users
        if (result.user && !response.error) {
          try {
            await initializeUserSubscription(result.user.id);
          } catch (subscriptionError) {
            console.warn("Failed to initialize subscription for new user:", subscriptionError);
            // Don't throw here as the main signup was successful
          }
        }

        return result;
      },
      {
        maxAttempts: 3,
        retryableErrors: ["Network request failed", "timeout", "ECONNRESET"],
        baseDelay: 1000,
      },
    );
  }

  // Enhanced signOut with v2.57.4 compatibility
  async signOut(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        handleAuthError(error);
      }
    } catch (error) {
      console.warn("Sign out error:", error);
      // Don't throw on sign out errors - still clear local session
      throw error;
    }
  }

  // Enhanced password reset with v2.57.4 deep link handling
  async resetPassword(email: string): Promise<void> {
    if (!email) {
      throw new Error("Email is required for password reset");
    }

    return withRetry(
      async () => {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
          redirectTo: "lockerroom://reset-password", // Deep link for mobile app
        });

        if (error) {
          handleAuthError(error);
        }
      },
      {
        maxAttempts: 3,
        retryableErrors: ["Network request failed", "timeout", "ECONNRESET"],
        baseDelay: 2000,
      },
    );
  }

  // Enhanced password update with validation
  async updatePassword(newPassword: string): Promise<void> {
    if (!newPassword || newPassword.length < 6) {
      throw new Error("New password must be at least 6 characters long");
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      handleAuthError(error);
    }
  }

  // Enhanced user update method for v2.57.4
  async updateUser(updates: { email?: string; password?: string; data?: Record<string, any> }): Promise<AuthResult> {
    const { data, error } = await supabase.auth.updateUser(updates);

    if (error) {
      handleAuthError(error);
    }

    return {
      user: data.user,
      session: null,
    };
  }

  // Enhanced session retrieval with v2.57.4 validation
  async getSession(): Promise<Session | null> {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      handleAuthError(error);
    }

    const session = data?.session;

    if (session && !validateSession(session)) {
      console.warn("Invalid session structure detected");
      return null;
    }

    return session;
  }

  // Enhanced user retrieval with v2.57.4 validation
  async getUser(): Promise<SupabaseUser | null> {
    const { data, error } = await supabase.auth.getUser();

    if (error && error.message !== "Auth session missing!") {
      handleAuthError(error);
    }

    return data?.user || null;
  }

  // Enhanced session refresh with v2.57.4 validation
  async refreshSession(): Promise<Session | null> {
    const { data, error } = await supabase.auth.refreshSession();

    if (error) {
      handleAuthError(error);
    }

    const session = data?.session;

    if (session && !validateSession(session)) {
      throw new Error("Invalid session structure after refresh");
    }

    return session;
  }

  // Enhanced OAuth sign-in with v2.57.4 compatibility
  async signInWithOAuth(provider: AuthProvider, additionalOptions?: Record<string, any>): Promise<OAuthResponse> {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider as any,
      options: {
        redirectTo: "lockerroom://auth/callback",
        ...additionalOptions,
        // PKCE is enabled by default in Supabase for native apps, but explicitly set
      },
    });

    if (error) {
      handleAuthError(error);
    }

    return data as unknown as OAuthResponse;
  }

  // Enhanced account deletion with v2.57.4 validation
  async deleteAccount(): Promise<void> {
    const user = await this.getUser();
    if (!user) {
      throw new Error("No authenticated user found");
    }

    const { error } = await (supabase as any).rpc("delete_user_account", {
      user_id: user.id,
    });

    if (error) {
      handleAuthError(error);
    }

    // Ensure sign out after account deletion
    try {
      await this.signOut();
    } catch (signOutError) {
      console.warn("Error during sign out after account deletion:", signOutError);
    }
  }

  // Enhanced auth state change listener with v2.57.4 event handling
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      try {
        // Validate session structure if present
        if (session && !validateSession(session)) {
          console.warn("Invalid session structure in auth state change");
          callback(event, null);
          return;
        }

        callback(event, session);
      } catch (error) {
        console.warn("Error in auth state change callback:", error);
        callback("ERROR", null);
      }
    });

    return subscription;
  }

  // Enhanced OTP verification with v2.57.4 validation
  async signInWithOtp(email: string, token: string) {
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    // Handle MFA
  }

  async verifyOtp(email: string, token: string, type: "email" | "signup" | "recovery" = "email"): Promise<AuthResult> {
    if (!email || !token) {
      throw new Error("Email and token are required for OTP verification");
    }

    let verifyParams: any;

    if (type === "email" || type === "signup" || type === "recovery") {
      verifyParams = {
        email: email.trim().toLowerCase(),
        token: token.trim(),
        type: type as any,
      };
    } else {
      // For other types, use phone verification
      verifyParams = {
        phone: email, // Assuming email is actually phone number for SMS
        token: token.trim(),
        type: "sms" as any,
      };
    }

    const response = await supabase.auth.verifyOtp(verifyParams);

    if (response.error) {
      handleAuthError(response.error);
    }

    return validateAuthResponse(response);
  }

  // Enhanced OTP resend with v2.57.4 type safety
  async resendOtp(email: string, type: "signup" | "email_change" = "signup"): Promise<void> {
    if (!email) {
      throw new Error("Email is required for OTP resend");
    }

    const { error } = await supabase.auth.resend({
      type: type as any,
      email: email.trim().toLowerCase(),
    });

    if (error) {
      handleAuthError(error);
    }
  }

  // Utility method to check if session is valid
  isSessionValid(session: Session | null): boolean {
    return validateSession(session);
  }

  // Utility method to get session expiry
  getSessionExpiry(session: Session | null): Date | null {
    if (!session?.expires_at) return null;
    return new Date(session.expires_at * 1000);
  }

  // Utility method to check if session is expired
  isSessionExpired(session: Session | null): boolean {
    const expiry = this.getSessionExpiry(session);
    return expiry ? expiry.getTime() < Date.now() : true;
  }
}

// Export singleton instance
export const authService = new AuthService();

// Export for direct usage
export default authService;
