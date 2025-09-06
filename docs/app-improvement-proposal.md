# Locker Room Talk (LRT) — Codebase Analysis and Improvement Plan

This document provides a comprehensive analysis of the LRT mobile app codebase and a clear roadmap. It captures what’s implemented, what remains, and what could be done to level up UX, features, performance, privacy/safety, and developer experience.

## Executive Summary

- Solid foundation: modular architecture, clear layering (services/state/screens/components), realtime chat/comments, optimistic UI, and guest-mode gating.
- Recently completed (in this branch):
  - Deep linking + shareable links (review/profile)
  - Virtualized Browse grid with skeletons and better empty states
  - Server-side review filtering (category/city/state)
  - Supabase-backed search with trending/recent and UX polish
  - Review card UX improvements (preview/stats/sentiment, quick actions)
- Highest-value next steps: unify theming/tokens, consolidate chat realtime, persist safety reports + notifications, strengthen offline/image handling, and clean up auth/guest edge cases.

## Tech Stack & Architecture

- Platform: Expo SDK 53, React Native 0.79, React 19, TypeScript 5.8
- Styling: NativeWind (Tailwind) with dark theme tokens (`tailwind.config.js`)
- State: Zustand stores persisted to AsyncStorage (`src/state/*Store.ts`)
- Backend: Supabase (auth, storage, realtime, PostgREST) configured via `src/config/supabase.ts` and accessed in `src/services/supabase.ts`
- Navigation: React Navigation (stack + bottom tabs), deep linking configured in `App.tsx`
- UI: screens in `src/screens/`, components in `src/components/`, domain types in `src/types/`

## Feature Map

- Onboarding/Auth: Onboarding, Sign In/Up; guest mode supported in store and router guard
- Browse: Review feed (staggered/grid), likes, report modal, filters (category/location)
- Search: Universal search across reviews, comments, and chat messages (no user/profile search); deep‑links to the exact result
- Create Review: Photos/videos, sentiment/flags, social handles, location; optimistic create; upload to Supabase Storage
- Review Detail: Carousel, flags, expandable text, like/dislike, comments thread with realtime updates
- Chatrooms/Chat: Room list (filters), join room with presence, send/receive messages via Supabase realtime
- Settings: Guest banner, profile info, terms/privacy placeholders, test/utility links

## State & Services Overview

- Auth (`src/state/authStore.ts`): Supabase auth + profile table management; guest mode; persisted user
- Reviews (`src/state/reviewsStore.ts`): server-side filters (category/city/state), pagination, optimistic create, like
- Comments (`src/state/commentsStore.ts`): load/create/like/dislike, realtime sync via Supabase channel
- Safety (`src/state/safetyStore.ts`): local blocks and reports (not yet persisted)
- Chat (`src/state/chatStore.ts`): list rooms/join/presence/messages, but uses a mix of Supabase realtime and a simulated `websocketService` for typing
- Supabase services (`src/services/supabase.ts`): auth/users/reviews/comments/storage + search; `realtimeChat.ts` for realtime rooms/messages/presence; `shareService.ts` for deep link sharing

## What’s Done (This Branch)

- Deep linking and shareable links
  - Files: `App.tsx`, `src/services/shareService.ts`, `src/components/ProfileCard.tsx`
  - Outcome: Open review/profile/chat routes directly; share/copy links via native share sheet

- Virtualized Browse grid + skeletons
  - File: `src/components/StaggeredGrid.tsx`
  - Outcome: Replaced ScrollView with FlashList (2 columns), added skeletons and standardized empty states

- Server-side review filtering
  - Files: `src/services/supabase.ts` (`supabaseReviews.getReviews`), `src/state/reviewsStore.ts`
  - Outcome: Category/city/state filtering pushed to database; removed client filtering for correctness and payload savings

- Supabase search + UX polish
  - Files: `src/services/supabase.ts` (`supabaseSearch`), `src/screens/SearchScreen.tsx`
  - Outcome: Prefix search with filters, trending names, recent searches, clear input, and loading skeletons

- Review card UX polish
  - File: `src/components/ProfileCard.tsx`
  - Outcome: Preview text, sentiment chips, flag counts, share/report, and micro-interactions

- Review card action layout refined
  - File: `src/components/ProfileCard.tsx`
  - Outcome: Standardized top action rail (heart top-left, share top-right, report below share), reserved chips area, clamped preview text; resolves overlap on shorter cards

- Auth helper improvement (partial)
  - File: `src/config/supabase.ts` — added `isAuthenticatedAsync()`; sync variant still not reliable (see below)

## Issues & Gaps Identified

- Inconsistent brand tokens
  - `tailwind.config.js` sets `brand.red: "#FFFFFF"`, producing white “red” accents; fix brand palette and audit usages.

- Report modal theming
  - `src/components/ReportModal.tsx` uses light theme classes; convert to dark theme tokens (`surface/*`, `text/*`, `border`).

- Auth helper correctness
  - `isAuthenticated()` uses a Promise like a value; remove or make async. Prefer store (`authStore`) or `isAuthenticatedAsync()` for critical checks.

- Chat realtime is split
  - `chatStore` uses Supabase realtime for rooms/messages but simulated `websocketService` for typing; consolidate on Supabase realtime (presence/broadcast typing) for one source of truth.

- Guest edge cases
  - Deep-link into `ChatRoom` can error (“Must be signed in”); gate `ChatRoomScreen` for guest and route to Sign In/Up.
  - `authStore.setGuestMode` sets `isAuthenticated: true` when guest; may confuse non-UI checks. Prefer `isAuthenticated: false` + explicit `isGuestMode` gates.

- Comment posting when unauthenticated
  - `commentsStore.createComment` optimistically posts while the backend requires auth; disable input for guest or support anonymous comments server-side.

- Image upload reliability
  - `reviewsStore.createReview` uses `fetch(file://...)` for Blob; in Expo, prefer `expo-file-system` for local files; add compression and store width/height to avoid layout shifts.

- Search scope and model alignment
  - Remove user/profile searching entirely. Focus search on content only (reviews/comments/messages). De‑emphasize or delete legacy profile search code and UI.

- Search scope is limited
  - Current search targets profiles/names only. Product requirement: search reviews (review_text/name/location), comments (content), and chat messages (content), and navigate users directly to the matching review/comment/message.


## Recommendations (Prioritized)

1) Theming and UI Consistency
- Convert `ReportModal` to tokenized dark theme classes
- Add a theme toggle in Settings and ensure modal/sheet parity

2) Chat Realtime Unification
- Replace typing via `websocketService` with Supabase presence or channel broadcast in `realtimeChat.ts`
- Add message pagination (load older) and preserve scroll position
- Remove simulator from production builds to reduce ambiguity

3) Safety & Reporting
- Add `supabaseReports` service to persist reports; update `safetyStore` for optimistic + persisted writes
- Add admin review queue with status updates surfaced to clients

4) Offline and Image Handling
- Add NetInfo-based offline banner at app root and retry patterns
- Pre-upload image compression, generate thumbnails, `expo-image` caching + placeholders; store media width/height

5) Auth/Guest Flows
- Remove or make `isAuthenticated()` async; prefer store or `isAuthenticatedAsync()`
- Set `isAuthenticated: false` for guest; rely on `isGuestMode` gates and adjust AppNavigator if needed
- Guard ChatRoom and comments UI for guest; show consistent prompts to Sign In/Up

6) Search Overhaul (Cross‑Entity + Performance)
- Expand search coverage to Reviews, Comments, and Chat Messages.
  - Reviews: search `review_text`, `reviewed_person_name`, and `reviewed_person_location` (city/state).
  - Comments: search `content`; return `reviewId` + `commentId` for deep link to `ReviewDetail` with anchor/highlight.
  - Messages: search `content`; return `roomId` + `messageId` for deep link to `ChatRoom` and scroll to message.
- Use Postgres Full‑Text Search (`to_tsvector`, `ts_rank`) and/or `pg_trgm` for partial/fuzzy matching; add GIN indexes.
- UI: segmented results (All/Reviews/Comments/Messages) or unified list with badges + snippets; infinite scroll per segment.
- No user/profile search at all. Remove “People” tab and any profile results.

7) Notifications
- Implement push notifications for: new comments on my reviews, likes, and chat mentions/replies; respect Settings preferences

8) Developer Experience
- Add Sentry for crash reporting and minimal analytics for funnels
- Enable TS `strict: true` and tighten service/store typing
- Add unit tests for store reducers and smoke navigation tests

## Concrete File-Level Actions

- `tailwind.config.js`: set real brand colors and audit UI for contrast
- `src/components/ReportModal.tsx`: convert to tokenized dark styling
- `src/config/supabase.ts`: remove/fix sync `isAuthenticated()`; keep `isAuthenticatedAsync()` or rely on store
- `src/state/authStore.ts`: keep `isAuthenticated: false` when guest; guard routes using `isGuestMode`
- `src/screens/ChatRoomScreen.tsx`: block guest and route to Sign In/Up with a friendly prompt
- `src/services/realtimeChat.ts`: add typing presence/broadcast; expose `setTyping`; update `chatStore`
- `src/state/safetyStore.ts` + `src/services/supabase.ts`: add report persistence (`supabaseReports.createReport` etc.)
- `src/screens/CreateReviewScreen.tsx` + `src/state/reviewsStore.ts`: use `expo-file-system`, compress images, store dimensions
- `src/services/supabase.ts`: add cross‑entity search methods
  - `supabaseSearch.searchReviews(query, filters?)`
  - `supabaseSearch.searchComments(query, filters?)`
  - `supabaseSearch.searchMessages(query, filters?)`
  - (Optional) `supabaseSearch.searchAll(query, filters?)` combining types with `entity_type`, `entity_id`, `rank`, `snippet`
- `src/screens/SearchScreen.tsx`: convert to segmented results (All/Reviews/Comments/Messages). On press:
  - Review → navigate `ReviewDetail` with `reviewId` (and optionally preloaded review) and highlight matching text
  - Comment → navigate `ReviewDetail` with `reviewId` + `highlightCommentId` and scroll/highlight
  - Message → navigate `ChatRoom` with `roomId` + `messageId` and scroll/highlight
- `src/navigation/AppNavigator.tsx`: include linking params for `highlightCommentId` and `messageId`
- `src/screens/ReviewDetailScreen.tsx`: accept `highlightCommentId` and auto‑scroll/highlight
- `src/screens/ChatRoomScreen.tsx` + `src/services/realtimeChat.ts`: add `scrollToMessage(messageId)` and a `loadMessageAndContext` helper

- `src/components/ProfileCard.tsx` [Done]: standardize action positions, reserve chips area, clamp preview text, ensure gradient/readability

## Repository Cleanup & Documentation

- Move or remove ad‑hoc root markdown files to keep the repo lean. Suggested:
  - Archive to `docs/archive/`: `BACKEND_REVIEW_SUMMARY.md`, `FIREBASE_CLEANUP.md`, `FIREBASE_VERIFICATION_REPORT.md`, `HEADER_CHANGES.md`, `SUPABASE_MIGRATION.md`, `WARP.md`, `ReadMeKen.md`
  - Keep: `README.md` (add if missing) and `docs/app-improvement-proposal.md`
- Remove deprecated source files and examples:
  - `src/services/firebase.ts.deprecated`, `src/config/firebase.ts.deprecated`, `src/components/FirebaseExample.tsx.deprecated`
- Cull unused test/util scripts or move to `scripts/` with a README: `test-supabase-migration.js`, `test-comprehensive-backend.js`
- Delete or rotate temp data: `logs/` contents
- Consider removing unused AI API wrappers if not in use in production features (e.g., `src/api/grok.ts`, `src/api/anthropic.ts`, `src/api/image-generation.ts`, `src/api/transcribe-audio.ts`) and centralize through a single `chat-service` if still needed for moderation.

Add a `CONTRIBUTING.md` with run/build/test instructions and a short “Coding Standards” note to replace scattered notes.

## Suggested Supabase Views and Indexes (Search)

```sql
-- Enable helpful extensions
create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- Reviews FTS index
create index if not exists idx_reviews_fts
  on reviews_firebase using gin (
    to_tsvector('english',
      unaccent(coalesce(review_text,'')) || ' ' ||
      unaccent(coalesce(reviewed_person_name,'')) || ' ' ||
      unaccent(coalesce(reviewed_person_location->>'city','')) || ' ' ||
      unaccent(coalesce(reviewed_person_location->>'state',''))
    )
  );

-- Comments FTS index
create index if not exists idx_comments_fts
  on comments_firebase using gin (to_tsvector('english', unaccent(coalesce(content,''))));

-- Chat messages FTS index
create index if not exists idx_chat_messages_fts
  on chat_messages_firebase using gin (to_tsvector('english', unaccent(coalesce(content,''))));

-- Optional unified search view
create or replace view search_all as
  select id as entity_id, 'review' as entity_type,
         reviewed_person_name as title,
         review_text as body,
         created_at,
         to_tsvector('english', unaccent(coalesce(review_text,'') || ' ' || coalesce(reviewed_person_name,''))) as tsv
  from reviews_firebase where status = 'approved'
  union all
  select id, 'comment', author_name, content, created_at,
         to_tsvector('english', unaccent(coalesce(content,'')))
  from comments_firebase where is_deleted = false
  union all
  select id, 'message', sender_name, content, timestamp,
         to_tsvector('english', unaccent(coalesce(content,'')))
  from chat_messages_firebase;
```

## Roadmap

- Quick Wins (1 week)
  - Unify ReportModal styling; add offline banner; guard guest in ChatRoom/comments; prefer `isAuthenticatedAsync`; enable image caching; remove profile search code/UX; start repo cleanup (archive/move .mds, delete deprecated files)
- Near-Term (2–4 weeks)
  - Unify chat realtime including typing; message pagination; persist reports; notifications; search overhaul (cross‑entity + FTS + segmented results); image compression/thumbnails; complete repo cleanup
- Mid-Term (1–2 months)
  - Moderation pipeline with PII redaction; monetization hooks; analytics + Sentry; TS strict; store tests and a couple of E2E flows

## Animated Onboarding 2.0

- Goals: Higher conversion to Sign Up, explain value quickly, and feel premium.
- Flow: 3–4 swipeable slides with Reanimated transitions, parallax images, and subtle haptics. CTA row pinned at bottom (Create Account, Sign In, Browse as Guest).
- Visuals: Use Lottie or Skia for lightweight animations; gradient backgrounds; adaptive to light/dark.
- Content: Slide 1 (Discover reviews), Slide 2 (Stay safe with reports/moderation), Slide 3 (Chat in real time), Slide 4 (Privacy-first & anonymous).
- Tech:
  - `react-native-reanimated` + `GestureHandler` for slides and parallax
  - `lottie-react-native` for vector animations (optional)
  - `expo-haptics` for CTA taps
- File-level:
  - `src/screens/OnboardingScreen.tsx`: refactor to a paged carousel; extract `AnimatedFeatureSlide` component; remove hardcoded “stats” and replace with illustrations/animation
  - Add `assets/onboarding/` for Lottie JSON and images
  - Preserve existing CTAs (Create Account, Sign In, Browse as Guest) and analytics hooks (to be added)

## Notes

- Reviews: server-side filters are live; radius can be added later via lat/lon + PostGIS
- Search: now Supabase-backed; DB aggregation will improve scale and UX
- Chat: consolidate on Supabase realtime; remove simulator in production
