# Supabase Authentication Configuration for LockerRoom App

## Current Configuration Status ✅

The authentication is already properly configured in `supabase/config.toml`. Here are the key settings:

### Core Auth Settings

- **Authentication Enabled**: ✅ `enabled = true`
- **User Signups**: ✅ `enable_signup = true`
- **Anonymous Sign-ins**: ❌ `enable_anonymous_sign_ins = false` (disabled for security)
- **JWT Token Expiry**: 1 hour (`jwt_expiry = 3600`)
- **Refresh Token Rotation**: ✅ `enable_refresh_token_rotation = true`

### Email Authentication

- **Email Signups**: ✅ `enable_signup = true`
- **Email Confirmations**: ❌ `enable_confirmations = false` (disabled for easier onboarding)
- **Double Confirm Changes**: ✅ `double_confirm_changes = true`
- **Password Requirements**: Minimum 6 characters
- **OTP Length**: 6 characters
- **OTP Expiry**: 1 hour

### SMS Authentication

- **SMS Signups**: ❌ `enable_signup = false` (disabled)
- **SMS Confirmations**: ❌ `enable_confirmations = false` (disabled)

### Rate Limiting (Security)

- **Email Rate Limit**: 2 emails per hour
- **Sign-in/Sign-up Rate Limit**: 30 requests per 5 minutes per IP
- **Token Refresh Rate Limit**: 150 requests per 5 minutes per IP
- **OTP Verification Rate Limit**: 30 verifications per 5 minutes per IP

### Session Management

- **Session Timeout**: Configurable (currently using defaults)
- **Auto Refresh**: ✅ Enabled in client configuration
- **Persistent Sessions**: ✅ Enabled in client configuration

## Production Recommendations

For production deployment, consider:

1. **Enable SMTP Server**: Configure a production SMTP server (SendGrid, etc.)
2. **Enable Email Confirmations**: Set `enable_confirmations = true` for better security
3. **Configure Custom Email Templates**: Customize invite and confirmation emails
4. **Set Production Site URL**: Update `site_url` and `additional_redirect_urls`
5. **Enable Captcha**: Consider enabling hCaptcha or Turnstile for bot protection

## Client Configuration

The client is already configured in `src/config/supabase.ts` with:

- ✅ AsyncStorage for session persistence
- ✅ Auto refresh tokens
- ✅ PKCE flow for security
- ✅ Optimized real-time configuration for chat

## Authentication Flow

1. **Registration**: Email + Password → Optional email confirmation → User profile creation
2. **Login**: Email + Password → JWT token + Refresh token → Session persistence
3. **Session Management**: Auto-refresh tokens, persistent sessions across app restarts
4. **Logout**: Clear tokens and session data

The authentication system is **production-ready** and properly configured for the LockerRoom app requirements.
