# Security Test Plan — RLS, Rate Limiting, Sentry, Key Rotation ✅

## Overview
This document describes the tests and steps to validate the RLS, DB-backed rate limiter, CRON_SECRET middleware, Sentry integration, and key rotation re-encryption script.

## Quick SQL-based tests (recommended for CI or manual check)
1. Apply the migration: `supabase db push` or run `scripts/run_migration.sh`.
2. Run the SQL test script: `psql <connection> -f supabase/tests/rls_tests.sql` (or paste into Supabase SQL editor).
   - Verifies that RLS allows each user to see only their rows
   - Verifies service role (set `app.is_service_role = true`) can access audit logs & all rows
   - Verifies `increment_rate_limit` RPC increments and enforces a limit

## API-level tests (manual or integration)
1. Start a test Supabase instance or use _test_ project with test data.
2. Set `CRON_SECRET` locally and POST to cron endpoints with header `Authorization: Bearer $CRON_SECRET` to ensure 200 responses.
3. Call `POST /api/backups/trigger` as an authenticated user; make 4 calls quickly and confirm the 4th receives 429 (Rate limit exceeded) when using DB fallback.

## Sentry verification
1. Temporarily set `SENTRY_DSN` to a test DSN and trigger a server error (e.g., throw in a route) — confirm events appear in Sentry.
2. Remove `SENTRY_DSN` and confirm no errors are thrown due to missing DSN.

## Key rotation test
1. Set `FLOWVAULT_OLD_ENCRYPTION_KEY` and `FLOWVAULT_NEW_ENCRYPTION_KEY`, set `NEW_KEY_VERSION=2`.
2. Run: `node scripts/re_encrypt_backups.ts` and confirm rows with old version are re-encrypted and flag updated.
3. Spot-check a few updated rows with `SELECT encryption_key_version, workflow_data FROM flowvault_workflow_backups`.

## Automation suggestions
- Add the SQL test script execution into CI (e.g., a `vitest` job or direct `psql` job) that runs after migrations in test environment.
- Add a nightly job that runs `scripts/re_encrypt_backups.ts` in a maintenance window after setting `FLOWVAULT_NEW_ENCRYPTION_KEY` if needed.

## Notes
- Running tests that perform DB writes requires admin/service role credentials (SUPABASE_SERVICE_ROLE_KEY).
- The SQL tests are intentionally simple and work without adding a JS test runner.
