# Production Readiness Guide

This document is a practical, repo‑specific guide to take the Locker Room Talk Expo React Native app to production with strong quality, reliability, and security. It prioritizes critical fixes first, then outlines an implementation roadmap across security, platform configuration, quality engineering, observability, and operations.

## Executive Summary

- Critical: Secrets are currently committed to the repo in `.env`. Immediately migrate secrets out of Git, rotate keys, and enforce secret scanning.
- Platform alignment: App currently uses React 19.0.0 with Expo SDK 53. Verify compatibility or consider pinning to React 18.2.x if issues arise.
- CI/CD: Add a CI pipeline that runs type checks, lint, unit tests, and build validations (EAS Build previews). Enforce branch protections.
- Quality engineering: Add unit/integration tests (Jest + Testing Library) and lightweight E2E (Detox or Maestro) for smoke flows.
- Observability: Add Sentry or Bugsnag for crash/error monitoring; keep using `expo-insights` but introduce a structured app logger.
- Performance & stability: Optimize Supabase real‑time message subscription to avoid refetching whole room on every change; tighten memory and reconnection behavior.
- Security & data: Establish Supabase RLS policies (documented) for each table used; remove unused Firebase configuration files.
- Monetization: Current subscription system is basic (boolean flag) - implement proper RevenueCat integration before production.
- Release management: Configure `app.json` for OTA updates with `runtimeVersion`, set EAS release channels, and introduce staged rollouts.

## Immediate Critical Actions (Day 0–1)

- Secrets & config
  - Remove tracked secrets: `.env` is committed with API keys. Keep `.env.example` only. `.gitignore` now ignores `.env*`. Rotate Supabase anon key, Expo project ID secrets, and any third‑party keys.
  - Store secrets in secure stores:
    - Local/dev: `.env` untracked. Validate with `npm run verify:env`.
    - CI/CD: EAS Secrets and VCS‑neutral secret storage in CI.
    - App runtime: Use Expo `EXPO_PUBLIC_*` only for safe client keys; server secrets must never ship in clients.
- Version alignment
  - Verify Expo SDK 53 peer ranges. If React 19 is not supported, pin `react@18.2.x` and re‑lock deps. Ensure `react-native` aligns with Expo’s version matrix.
- Access restriction & key rotation
  - Immediately rotate Supabase keys since the anon key is in Git history.
  - Enable secret scanning (GitHub Advanced Security or `gitleaks`) and block pushes with secrets.
- Security policy
  - Add `/SECURITY.md` with reporting process.
  - Turn on branch protection (require PR reviews, CI passing checks).

## Stack Overview (Repo‑Specific)

- Mobile: Expo SDK 53, React Native 0.79.5, React 19.0.0, TypeScript ~5.8.3.
- Navigation: `@react-navigation` stacks and tabs; deep linking configured in `App.tsx`.
- State: Zustand stores (`src/state/*`) persisted via AsyncStorage.
- Backend: Supabase exclusively (`src/config/supabase.ts`, `src/services/supabase.ts`) with real‑time chat, reviews, comments, reports. Firebase config files are legacy/unused.
- UI: Tailwind (nativewind), custom components in `src/components/*`.
- Monetization: Basic subscription store (boolean flag), placeholder ad components.
- Tests: Utility scripts exist (`scripts/test-comprehensive-backend.js`), but no formal unit/E2E test harness.

## Security & Data Protection

- Secrets & configuration
  - Use environment schema enforcement at CI start (`scripts/verify-env.js` exists — good). Extend it to warn on accidental `EXPO_PUBLIC_*` usage for server‑only secrets.
  - Add pre‑commit/pre‑push hooks: run `gitleaks`/`trufflehog` + ESLint + typecheck.
- Supabase RLS
  - Define and document row‑level security policies for all Supabase tables: `users`, `reviews_firebase`, `comments_firebase`, `chat_rooms_firebase`, `chat_messages_firebase`, `notifications`, `push_tokens`, `reports`.
  - Note: Table names contain "firebase" for legacy reasons but all data is in Supabase.
  - Principle: user can read public content; can only write/delete own rows where appropriate; admin pathways via service role (never shipped to client).
- Client trust boundary
  - Treat the mobile app as untrusted. Never embed service roles; avoid sensitive endpoints. Anon key is fine for public RLS‑protected reads/writes.
- PII & content safety
  - Profiles, reviews, and messages contain PII and UGC. Ensure moderation is enforced server‑side. OpenAI moderation is implemented for content screening.
  - Add T&S, privacy policy, and data deletion pathways. `DeleteAccountScreen` exists — verify backend actual deletion/retention.
- Transport & integrity
  - Use HTTPS only. Consider certificate pinning if your risk profile warrants it (3rd‑party modules exist, needs careful integration on RN).
  - Ensure Supabase storage object ACLs align with expectations (public vs private buckets).
- Legacy cleanup
  - Remove unused Firebase configuration files (`firebase.json`, `firestore.rules`, `firestore.indexes.json`, `.firebaserc`) once confirmed they're not needed.

## Platform Configuration & Releases

- App config (`app.json`)
  - Add `updates` with `enabled: true`, OTA settings, and a `runtimeVersion` strategy (e.g., appVersion). Example:
    ```json
    {
      "expo": {
        "updates": { "enabled": true },
        "runtimeVersion": { "policy": "appVersion" }
      }
    }
    ```
  - Define release channels (production, staging) and match them to EAS profiles.
  - Review plugin list and platform permissions dialogs (iOS/Android) for privacy compliance.
- EAS Build & Submit
  - Add `eas.json` with profiles for `preview`, `staging`, `production`.
  - Use channel‑based rollouts, staged percentage rollouts, and pre‑release smoke tests (see Testing section).
- Dependency policy
  - Choose one package manager. Repo contains `bun.lock` and `package-lock.json`. Standardize on npm or bun, remove the other lockfile, and enforce via CI.
  - Keep `patch-package` usage documented; pin RN/Expo compatible versions and revisit patches each SDK upgrade.

## Quality Engineering: Testing Strategy

- Unit & component tests
  - Framework: Jest + React Native Testing Library.
  - Scope: Components in `src/components/*`, stores in `src/state/*`, and utility functions in `src/utils/*`.
  - Mock Supabase client with dependency injection or a test wrapper; validate error states (e.g., offline flows).
- Integration tests
  - Test service functions in `src/services/supabase.ts` using a Postgres mock or a test Supabase project; verify type mapping, RLS boundaries (positive and negative cases).
  - Run `scripts/test-comprehensive-backend.js` in CI nightly against a test project (never production) to catch schema drift.
- E2E tests
  - Select Detox (RN) or Maestro. Cover critical flows: sign‑in/up, create review, open chat, send message, search, logout.
  - Target minimal golden devices (iOS + Android). Run on EAS “preview” builds pre‑release.
- Static analysis & type safety
  - `npm run check` already runs typecheck + lint. Enforce in CI on PRs.
  - Tighten `tsconfig.json` (see DX section) for stricter guarantees.

## Observability, Logging, and Crash Handling

- Crash monitoring
  - Integrate Sentry (or Bugsnag) for native crash reporting and JS exceptions. Wrap screens with an error boundary (already present) and capture breadcrumbs.
- Metrics & analytics
  - Continue using `expo-insights` for performance metrics; define key app KPIs: sign‑in success, review creation, message delivery latency.
- Logging
  - Introduce a minimal logger abstraction with log levels (debug/info/warn/error) and environment filters, replacing bare `console.log` in production builds.
  - Redact PII in logs. Avoid logging tokens/keys.

## Performance & Reliability

- Real‑time chat subscription (Hotspot)
  - Current: `onMessagesSnapshot` refetches all messages on every change. This can cause churn and latency under load.
  - Fix: Subscribe to granular events (`INSERT`, `UPDATE`, `DELETE` for `chat_messages_firebase`), apply delta updates to in‑memory lists, and only refetch on reconnect or when a gap is detected.
  - Add backpressure and debounce rendering when message volumes are high.
- Network resilience
  - `useOffline` is good; ensure all networked actions use it or the retry helpers in `src/services/supabase.ts` to avoid duplicate submission.
  - Implement idempotency keys for actions that can be retried (e.g., message send) to prevent duplicates.
- Memory & rendering
  - Verify large lists use `FlashList` (already present) with proper `estimatedItemSize`.
  - Ensure images use `expo-image` with caching where sensible.
  - Verify Hermes is enabled and Reanimated is properly configured for new architecture.

## Developer Experience & Code Health

- TypeScript config (tighten for safety)
  - Expand `tsconfig.json`:
    - `noUncheckedIndexedAccess: true`
    - `exactOptionalPropertyTypes: true`
    - `noImplicitOverride: true`
    - `useUnknownInCatchVariables: true`
    - `noFallthroughCasesInSwitch: true`
- ESLint & formatting
  - Add rules for `no-console` in production, `import/order`, and React Hooks lint rules. Keep Prettier integration.
- Module boundaries
  - Maintain current separation: `components/`, `screens/`, `services/`, `state/`, `utils/`. Consider `api/` consolidation into a single client with adapters per provider.
- Documentation
  - Keep `docs/APP_RUNBOOK.md` and this guide aligned. Add `CONTRIBUTING.md` with setup, scripts, and branching strategy.
- Scripts
  - Add `npm run test` (jest), `npm run test:e2e` (Detox/Maestro), `npm run build:preview` (EAS), `npm run audit` (security scan), and `npm run format`.

## Backend/Data Model Notes (Supabase)

- Data mapping
  - `src/services/supabase.ts` maps snake_case DB fields to camelCase types. Keep this invariant and add unit tests for the mappers.
- Reviews & comments
  - Enforce server‑side moderation queue for `status: pending/approved/rejected`. Ensure only moderators can update status.
- Reports
  - Input sanitization present — good. Add server‑side constraints and RLS so reporters can only view their reports; moderators can update status.
- Search
  - Use database indexes on search columns used in `ilike` and JSON path queries to keep performance under load.

## Release Process & Rollouts

- Branching
  - `main` protected; `develop` for integration; feature branches → PRs.
- Environments
  - `dev` (simulators), `staging` (TestFlight/Internal App Sharing), `prod` (stores). Separate Supabase projects per environment.
- Rollouts
  - Build pre‑release on `staging`. Run smoke E2E. Promote to `prod` release channel if green.
- OTA policy
  - Use runtime versioning to avoid breaking native/runtime mismatches. Ship small fixes via OTA; native changes through store updates.

## Compliance & Store Readiness

- Legal
  - Add Privacy Policy, Terms of Service, content moderation policy. Ensure data deletion requests are honored end‑to‑end.
- Permissions & prompts
  - Review iOS/Android permissions messages for camera, location, contacts, notifications. Justify usage in store listings.
- App size & startup time
  - Audit assets, enable image compression, and avoid heavy libs where possible.

## Concrete Backlog (Prioritized)

1. Secrets & Security
   - Remove `.env` from Git history; rotate Supabase keys; set up secret scanning in CI.
   - Add `/SECURITY.md` and branch protection.
2. Platform Compatibility
   - Align React/Expo/RN versions; remove one lockfile; re‑install from scratch.
3. CI/CD
   - Add GitHub Actions: `check` (typecheck + lint), unit tests, EAS build (preview) on PRs; require passing checks to merge.
4. Tests
   - Add Jest + RN Testing Library; create tests for: `ErrorBoundary`, `MessageBubble`, Zustand stores, `handleSupabaseError` mapping.
   - Add stub E2E with Detox or Maestro for core flows.
5. Real‑time Chat
   - Replace “refetch all on change” with event‑driven delta updates; add pagination and scroll‑to‑load; write perf tests.
6. Observability
   - Integrate Sentry; introduce logger; standardize error surfaces (user‑friendly + developer‑friendly).
7. App Config & Releases
   - Add `runtimeVersion`, release channels, EAS profiles; formalize staging → prod promotion.
8. Monetization Implementation
   - Upgrade basic subscription store to support RevenueCat integration
   - Replace placeholder AdBanner with actual ad network integration
   - Implement proper feature gating and paywall flows
9. Cleanup Legacy
   - Remove unused Firebase configuration files (`firebase.json`, `firestore.rules`, etc.)
   - Clean up any remaining Firebase references in documentation

## Appendix: Notable File Pointers

- Secrets & config: `.env`, `.env.example`, `scripts/verify-env.js`, `app.json`
- Supabase setup: `src/config/supabase.ts`, `src/services/supabase.ts`
- State & session: `src/state/authStore.ts`, `src/state/*`
- Navigation & linking: `src/navigation/AppNavigator.tsx`, `App.tsx`
- Offline resilience: `src/hooks/useOffline.ts`
- Backend test script: `scripts/test-comprehensive-backend.js`

---

Questions or want me to wire up CI, tests, or Sentry now? I can add the configs and starter tests in a follow‑up PR.

