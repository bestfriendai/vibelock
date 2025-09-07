**Purpose**
- End-to-end checklist to make the Locker Room Talk app run reliably on a new machine, including environment, database, verification, and troubleshooting.

**Stack Overview**
- Mobile: Expo React Native (SDK 53) + TypeScript + React 19.0.0
- State: `zustand` with persisted stores
- Backend: Supabase (Auth, PostgREST, Realtime, Storage, Edge Functions) - **Supabase Only**
- Notifications: Expo push + Supabase table `notifications` + Edge Function

**Prerequisites**
- Node 20.x and npm 10.x
- Xcode (iOS) and/or Android Studio (Android)
- Expo CLI (bundled via `expo` dep): `npx expo start`
- Supabase CLI: `brew install supabase/tap/supabase`

**Environment**
- Copy `.env.example` to `.env` and fill required values:
  - `EXPO_PUBLIC_SUPABASE_URL` (your Supabase project URL)
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY` (your Supabase anon key)
  - `EXPO_PUBLIC_PROJECT_ID` (Expo project ID for push notifications)
- Note: Firebase environment variables in `.env.example` are legacy and can be left empty
- Verify: `npm run verify:env`

**Key Configuration Files**
- `src/config/supabase.ts:1`: Single source of truth for the Supabase client
- `supabase/config.toml:1`: Local Supabase dev config
- `scripts/test-comprehensive-backend.js:1`: Full backend smoke tests
- `test-supabase-migration.js:1`: Lightweight DB capability check (uses env vars)

**Local Setup**
- Install deps: `npm install`
- Type + lint check: `npm run check`
- Start the app: `npm run start`
  - iOS: press `i`
  - Android: press `a`

**Supabase Setup (Hosted or Local)**
- **Hosted (Recommended)**: Use your Supabase project URL + anon key in `.env`
- **Local Development (Optional)**:
  - Start: `supabase start`
  - Studio: http://127.0.0.1:54323/
  - Update `.env` with the local URL and anon key shown by CLI
- **Important**: This app uses Supabase exclusively - no Firebase integration

**Database Expectations**
- Tables used by the app/services (must exist in Supabase):
  - `users` - User profiles and authentication data
  - `reviews_firebase` - Dating reviews (legacy table name, but uses Supabase)
  - `comments_firebase` - Comments on reviews (legacy table name, but uses Supabase)
  - `chat_rooms_firebase` - Chat room metadata (legacy table name, but uses Supabase)
  - `chat_messages_firebase` - Chat messages (legacy table name, but uses Supabase)
  - `notifications` - Push notification queue
  - `push_tokens` - Device push notification tokens
  - `reports` - User reports for content moderation
- Storage buckets used (public): `avatars`, `evidence`, `thumbnails`, `chat-media`
- Note: Table names contain "firebase" for legacy reasons but all data is stored in Supabase
- If starting fresh, pull schema from your cloud project or apply your team SQL migrations.

**Edge Functions**
- `supabase/functions/notifications/index.ts:1` sends Expo push notifications when rows are added to `notifications`.
- Deploy (hosted): `supabase functions deploy notifications`
- Set required env on the function: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

**App Auth & State**
- Supabase auth persistence is configured with AsyncStorage and PKCE in `src/config/supabase.ts:1`.
- Store/auth synchronization is handled in `src/state/authStore.ts:1` and `src/utils/authUtils.ts:1`.
- Do not override the `Authorization` header globally; the client sets it per-user dynamically.

**Verification Steps**
- Env check: `npm run verify:env`
- DB capabilities (read/storage/realtime): `npm run verify:db`
- Full backend flows (auth, reviews, comments, chat, notifications, storage): `npm run verify:backend`

**Running the App**
- Ensure `.env` is complete, Supabase is reachable.
- Start: `npm run start`, then open on iOS/Android.
- First-run: Sign up/sign in from the app; a basic user profile is auto-created (`src/services/supabase.ts:1`).

**Common Pitfalls**
- Missing env vars: run `npm run verify:env`.
- Auth mismatch after hot reload: `getAuthenticatedUser()` defers to either store or Supabase; the auth listener reconciles shortly. See `src/utils/authUtils.ts:1`.
- Realtime events not firing: confirm Supabase Realtime is enabled and RLS allows `SELECT` on the tables.
- Storage upload on device: ensure `EXPO_PUBLIC_PROJECT_ID` is set (push) and that buckets exist.

**Troubleshooting**
- Network/timeout errors are normalized via `handleSupabaseError` in `src/config/supabase.ts:1` and `parseSupabaseError` in `src/utils/errorHandling.ts:1`.
- Offline handling: `src/hooks/useOffline.ts:1` provides retry/backoff helpers.

**Operational Tasks**
- Lint/types: `npm run check`
- Update env for new projects: edit `.env`, re-run `npm run verify:env`
- Smoke test backend: `npm run verify:backend`

**Security Notes**
- Never hardcode Supabase keys in code; use `.env`.
- RLS should restrict writes to the authenticated user where applicable (users’ own data). Review RLS with your DBA.
