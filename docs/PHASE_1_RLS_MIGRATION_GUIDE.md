# Phase 1: RLS & Key Rotation Migration Guide

## Prerequisites ✅

Before proceeding, ensure you have:

1. **Supabase Service Role Key** - Required for migration execution
   ```bash
   # Add to .env.local
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

2. **Database Backup** - Always backup before migrations
   ```bash
   # In Supabase Dashboard:
   # Settings → Database → Create backup
   ```

3. **Staging Environment** - Apply to staging first, then production

---

## Step 1: Verify Migration Files 📋

All migrations are idempotent (safe to run multiple times):

```bash
# Check migration files exist
ls -la supabase/migrations/
# Should show:
# 001_rls_flowvault.sql
# 002_key_metadata.sql
# 003_rate_limit_function.sql
```

---

## Step 2: Apply Migrations (STAGING FIRST) 🚀

### Option A: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI if not installed
brew install supabase/tap/supabase

# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations in order
supabase db push

# Or apply individually
psql $DATABASE_URL -f supabase/migrations/001_rls_flowvault.sql
psql $DATABASE_URL -f supabase/migrations/002_key_metadata.sql
psql $DATABASE_URL -f supabase/migrations/003_rate_limit_function.sql
```

### Option B: Using Migration Script

```bash
# Make script executable
chmod +x scripts/run_migrations.sh

# Run migrations
SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY \
./scripts/run_migrations.sh
```

### Option C: Supabase Dashboard

1. Go to Supabase Dashboard → SQL Editor
2. Paste contents of each migration file
3. Execute in order (001 → 002 → 003)

---

## Step 3: Verify RLS Policies ✅

### A. Check policies are enabled

```sql
-- Run in Supabase SQL Editor or psql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename LIKE 'flowvault_%';

-- All should show rowsecurity = true
```

### B. Verify service role bypass function

```sql
-- Test the is_service_role() function
SELECT is_service_role();
-- Should return: false (when using anon key)

-- With service role key, should return: true
```

### C. Test user isolation (CRITICAL)

```sql
-- As user A (set session var)
SELECT set_config('app.clerk_user_id', 'user-a-test-id', false);

-- Insert test backup
INSERT INTO flowvault_workflow_backups (
  clerk_user_id, workflow_id, workflow_name, version, 
  backup_type, workflow_data, content_hash
) VALUES (
  current_setting('app.clerk_user_id'),
  'test-workflow-1',
  'Test Workflow',
  1,
  'manual',
  '{"encrypted": "data"}',
  'abc123'
);

-- Try to read as different user
SELECT set_config('app.clerk_user_id', 'user-b-test-id', false);
SELECT * FROM flowvault_workflow_backups WHERE workflow_id = 'test-workflow-1';
-- Should return: 0 rows (isolated!)

-- Clean up test data
SELECT set_config('app.clerk_user_id', 'user-a-test-id', false);
DELETE FROM flowvault_workflow_backups WHERE workflow_id = 'test-workflow-1';
```

### D. Run automated RLS tests

```bash
# Run RLS test suite
npm run test -- __tests__/rls/rls.test.ts

# Expected: All tests pass
```

---

## Step 4: Verify Key Metadata & Rotation 🔑

### A. Check key metadata table exists

```sql
SELECT * FROM flowvault_key_metadata ORDER BY created_at DESC LIMIT 5;

-- Should show initial v1-initial key entry
```

### B. Test key rotation functions

```sql
-- Get active key version
SELECT flowvault_get_active_key_version();
-- Should return: 'v1-initial'

-- Simulate key rotation (DON'T DO THIS IN PROD YET)
-- INSERT INTO flowvault_key_metadata (key_version, description, is_active)
-- VALUES ('v2-test', 'Test rotation', false);

-- SELECT flowvault_activate_key_version('v2-test');
-- SELECT flowvault_get_active_key_version();
-- Should return: 'v2-test'

-- Rollback test
-- SELECT flowvault_activate_key_version('v1-initial');
```

### C. Verify backup encryption_key_version column

```sql
-- Check column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'flowvault_workflow_backups' 
  AND column_name = 'encryption_key_version';

-- Should show: encryption_key_version | text
```

---

## Step 5: Verify Rate Limit Function 📊

### A. Test atomic increment RPC

```sql
-- Test rate limit increment (safe - uses test user)
SELECT flowvault_increment_rate_limit(
  'test-user-123',
  'api:general',
  1,
  60,
  60
);

-- Should return JSON with current_count, is_allowed, window_start, etc.

-- Check counter was created
SELECT * FROM flowvault_rate_limit_counters 
WHERE clerk_user_id = 'test-user-123';

-- Clean up
DELETE FROM flowvault_rate_limit_counters 
WHERE clerk_user_id = 'test-user-123';
```

### B. Test rate limit API endpoint

```bash
# Test via API (requires app running)
curl -X GET 'http://localhost:3000/api/rate-limit/status?action=backup:trigger' \
  -H 'Cookie: __session=YOUR_CLERK_SESSION'

# Should return quota status JSON
```

---

## Step 6: Monitor & Rollback Plan 🔄

### Monitor for issues

```sql
-- Check for RLS denials (run periodically)
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables 
WHERE schemaname = 'public' AND tablename LIKE 'flowvault_%';

-- Check rate limit counters growth
SELECT COUNT(*), AVG(current_count) 
FROM flowvault_rate_limit_counters;
```

### Rollback migrations (if needed)

```bash
# ONLY IF CRITICAL ISSUE FOUND

# Rollback 003 - Rate limit function
psql $DATABASE_URL -c "DROP FUNCTION IF EXISTS flowvault_increment_rate_limit CASCADE;"

# Rollback 002 - Key metadata
psql $DATABASE_URL -c "
  ALTER TABLE flowvault_workflow_backups DROP COLUMN IF EXISTS encryption_key_version;
  DROP FUNCTION IF EXISTS flowvault_get_active_key_version CASCADE;
  DROP FUNCTION IF EXISTS flowvault_activate_key_version CASCADE;
  DROP TABLE IF EXISTS flowvault_key_metadata CASCADE;
"

# Rollback 001 - RLS policies
psql $DATABASE_URL -c "
  ALTER TABLE flowvault_user_settings DISABLE ROW LEVEL SECURITY;
  ALTER TABLE flowvault_workflow_backups DISABLE ROW LEVEL SECURITY;
  ALTER TABLE flowvault_archived_workflows DISABLE ROW LEVEL SECURITY;
  ALTER TABLE flowvault_trash DISABLE ROW LEVEL SECURITY;
  ALTER TABLE flowvault_agent_audit_log DISABLE ROW LEVEL SECURITY;
  ALTER TABLE flowvault_workflow_tags DISABLE ROW LEVEL SECURITY;
  ALTER TABLE flowvault_rate_limit_counters DISABLE ROW LEVEL SECURITY;
  DROP FUNCTION IF EXISTS is_service_role CASCADE;
"
```

---

## Step 7: Production Deployment Checklist 🎯

Before applying to production:

- [ ] All migrations tested in staging
- [ ] RLS isolation verified (user A cannot see user B's data)
- [ ] Service role bypass confirmed working
- [ ] Rate limit function tested with API calls
- [ ] Key metadata table initialized with v1-initial
- [ ] Backup of production database created
- [ ] Rollback commands prepared and tested
- [ ] Team notified of maintenance window
- [ ] Monitoring/alerts configured for RLS denials
- [ ] Run migrations during low-traffic window

---

## Common Issues & Fixes 🔧

### Issue: "permission denied for function is_service_role"

**Fix:** Grant execute permission:
```sql
GRANT EXECUTE ON FUNCTION is_service_role() TO authenticated, anon;
```

### Issue: "column encryption_key_version does not exist"

**Fix:** Migration 002 didn't apply. Re-run:
```bash
psql $DATABASE_URL -f supabase/migrations/002_key_metadata.sql
```

### Issue: RLS blocks all queries even for service role

**Fix:** Check app.is_service_role is set:
```sql
SELECT current_setting('app.is_service_role', true);
-- Should be 'true' when using service role client
```

### Issue: Rate limit RPC not found

**Fix:** Re-apply migration 003:
```bash
psql $DATABASE_URL -f supabase/migrations/003_rate_limit_function.sql
```

---

## Next Steps ➡️

After Phase 1 completion:
1. Proceed to Phase 2: Re-encryption Dry-Run
2. Monitor RLS behavior in staging for 24-48 hours
3. Review audit logs for any access issues
4. Plan production rollout

---

## Support & Documentation 📚

- RLS Details: `docs/security/RLS_and_key_rotation.md`
- Migration Source: `supabase/migrations/*.sql`
- Tests: `__tests__/rls/rls.test.ts`
