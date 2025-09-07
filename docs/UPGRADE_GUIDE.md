**Scope**
- Targeted improvements to make the app easier to run and verify locally without altering runtime behavior.

**What I changed**
- Env hygiene:
  - Added Supabase and Expo project IDs to `.env.example`.
  - Created `scripts/verify-env.js` and `npm run verify:env`.
- Safer DB test utilities:
  - Rewrote `test-supabase-migration.js` to load `SUPABASE_URL` and anon key from env instead of hardcoding.
- Developer workflows:
  - Added `typecheck`, `lint`, `check`, `verify:db`, and `verify:backend` npm scripts.
- Documentation:
  - Added `docs/APP_RUNBOOK.md` with a clear end-to-end checklist.

**What I did not change**
- No runtime code paths in app screens/services were altered.
- No database schema or SQL migrations were added or modified (use your team’s canonical migrations or pull from hosted).

**Recommended next upgrades (optional, not applied)**
- Schema management: commit a `supabase/migrations/` history or a canonical schema SQL. Point `supabase/config.toml` to schema paths.
- Test coverage: add unit tests for store logic and service-layer error handling.
- CI checks: enforce `npm run check` and `npm run verify:db` in CI (with safe credentials).
- Realtime consistency: standardize on either `chat_rooms` or `chat_rooms_firebase` for room updates in `src/services/realtimeChat.ts`.
