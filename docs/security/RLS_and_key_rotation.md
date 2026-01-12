# RLS & Key Rotation Guide

## Overview
This document provides step-by-step instructions for applying RLS policies and performing encryption key rotation on the flowvault database.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Applying RLS Migrations](#applying-rls-migrations)
- [Verification](#verification)
- [Key Rotation Workflow](#key-rotation-workflow)
- [Rollback Procedures](#rollback-procedures)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Environment Variables
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # Service role key (admin)
FLOWVAULT_ENCRYPTION_KEY=your-current-key-32chars
```

### Required Tools
- `psql` (PostgreSQL client) OR Supabase CLI
- Node.js 20+ (for re-encryption scripts)
- Access to Supabase dashboard (for verification)

---

## Applying RLS Migrations

### Method 1: Using psql
```bash
# Set environment variables
export PGPASSWORD="$SUPABASE_SERVICE_ROLE_KEY"
export PGHOST="db.your-project.supabase.co"
export PGUSER="postgres"
export PGDATABASE="postgres"

# Apply migrations in order
psql -f supabase/migrations/001_rls_flowvault.sql
psql -f supabase/migrations/002_key_metadata.sql
psql -f supabase/migrations/003_rate_limit_function.sql
```

### Method 2: Using Supabase CLI
```bash
supabase db push

# Or apply specific migration
supabase db push --include-all --file supabase/migrations/001_rls_flowvault.sql
```

### Method 3: Using Supabase Dashboard
1. Go to https://app.supabase.com/project/YOUR_PROJECT/sql
2. Copy contents of each migration file
3. Execute in order (001, 002, 003)

---

## Verification

### 1. Check RLS is Enabled
Run this query in Supabase SQL Editor:
```sql
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'flowvault_%'
ORDER BY tablename;
```
**Expected:** All flowvault_* tables show `rls_enabled = true`

### 2. Verify Policies Exist
```sql
SELECT
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE 'flowvault_%'
ORDER BY tablename;
```
**Expected:** Each table has a policy with name ending in `_owner_all`

### 3. Test User Isolation (Manual)
Create test user in Supabase Auth, then test access:
```sql
-- As test user (use Supabase client with user JWT)
SELECT COUNT(*) FROM flowvault_user_settings; -- Should only see own rows

-- As service role
SET ROLE service_role;
SELECT COUNT(*) FROM flowvault_user_settings; -- Should see all rows
RESET ROLE;
```

### 4. Verify Key Metadata
```sql
SELECT key_version, is_active, created_at, notes
FROM public.flowvault_key_metadata
ORDER BY created_at DESC;
```
**Expected:** At least one row (v1-initial) with `is_active = true`

---

## Key Rotation Workflow

### Overview
Key rotation involves:
1. Generating a new encryption key
2. Registering the new key version in the database
3. Re-encrypting existing backups with the new key
4. Activating the new key for new backups
5. Archiving the old key

### Step 1: Generate New Encryption Key
```bash
# Generate a secure random key (32+ characters)
openssl rand -base64 32
# Or use: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Store securely (do NOT commit to repo)
export FLOWVAULT_NEW_ENCRYPTION_KEY="your-new-key-here"
export FLOWVAULT_OLD_ENCRYPTION_KEY="$FLOWVAULT_ENCRYPTION_KEY" # Current key
```

### Step 2: Register New Key Version
```sql
INSERT INTO public.flowvault_key_metadata (key_version, metadata, notes)
VALUES (
  'v2-2026-01',
  '{"algorithm": "AES-256-GCM", "rotation_reason": "scheduled rotation"}'::jsonb,
  'Rotated on 2026-01-07'
);
```

### Step 3: Run Re-encryption Job (Dry Run First)
```bash
# Export old and new keys
export FLOWVAULT_OLD_ENCRYPTION_KEY="v1-key..."
export FLOWVAULT_NEW_ENCRYPTION_KEY="v2-key..."
export SUPABASE_URL="https://..."
export SUPABASE_SERVICE_ROLE_KEY="..."

# Dry run (no changes)
./scripts/re_encrypt_backups.sh --dry-run

# Or with Node/TypeScript directly
npx tsx scripts/re_encrypt_backups.ts --dry-run

# Review output, then run for real
./scripts/re_encrypt_backups.sh --confirm --limit 100

# If successful, run for all backups
./scripts/re_encrypt_backups.sh --confirm
```

### Step 4: Activate New Key Version
```sql
SELECT public.flowvault_activate_key_version('v2-2026-01');
```

### Step 5: Verify Re-encryption
```sql
SELECT
  encryption_key_version,
  COUNT(*) AS backup_count
FROM public.flowvault_workflow_backups
GROUP BY encryption_key_version
ORDER BY encryption_key_version;
```
**Expected:** All backups should show `v2-2026-01` (or the new version)

### Step 6: Archive Old Key
- **DO NOT** delete the old key from your secure vault (needed for disaster recovery)
- Mark it as inactive in the DB (done automatically by `flowvault_activate_key_version`)
- Document old key version and storage location in your secrets manager

---

## Rollback Procedures

### Rollback RLS (Emergency Only)
```sql
-- Disable RLS on all tables
ALTER TABLE public.flowvault_user_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.flowvault_workflow_backups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.flowvault_archived_workflows DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.flowvault_trash DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.flowvault_agent_audit_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.flowvault_workflow_tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.flowvault_rate_limit_counters DISABLE ROW LEVEL SECURITY;

-- Drop helper function
DROP FUNCTION IF EXISTS public.is_service_role();
```

### Rollback Key Rotation
If re-encryption fails or corrupts data:
1. **Stop new backups** immediately
2. **Restore from database snapshot** (Supabase → Database → Backups)
3. Re-activate old key version:
   ```sql
   SELECT public.flowvault_activate_key_version('v1-initial');
   ```
4. Investigate failure, fix, and retry with `--limit` flag

---

## Troubleshooting

### RLS prevents service role from accessing data
**Symptom:** Cron jobs or admin operations fail with permission errors

**Solution:** Verify service role bypass function:
```sql
SELECT public.is_service_role(); -- Should return true when using service_role key
```

If false, check JWT claims:
```sql
SELECT current_setting('request.jwt.claims', true);
```

### Re-encryption script fails
**Common causes:**
- Wrong old/new key provided → Check env vars
- Database connection issues → Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Corrupted backup data → Skip and investigate specific backup

**Solution:** Run with `--dry-run` first, use `--limit 10` to test small batch

### Rate limiter not working
**Symptom:** Rate limit middleware doesn't block requests

**Check:**
1. Migration 003 applied? `SELECT * FROM pg_proc WHERE proname = 'flowvault_increment_rate_limit';`
2. Middleware integrated in API routes? Check route handlers use `withRateLimit`

---

## Monitoring & Maintenance

### Daily Checks
- Monitor Sentry for RLS-related errors
- Check rate limit counter growth: `SELECT COUNT(*) FROM flowvault_rate_limit_counters;`

### Weekly Checks
- Review key metadata: active key version, rotation schedule
- Check backup encryption coverage: all backups should have `encryption_key_version` set

### Scheduled Key Rotation
- Rotate encryption keys every 90 days (recommended)
- Document rotation dates and reasons in `flowvault_key_metadata.notes`

---

## Security Best Practices

1. **Never commit encryption keys** to version control
2. **Use secrets manager** (AWS Secrets Manager, Vercel env vars) for key storage
3. **Backup database** before applying migrations or key rotation
4. **Test in staging first** before production
5. **Monitor Sentry** for unexpected auth/encryption errors
6. **Rotate keys regularly** (every 3-6 months)
7. **Audit RLS policies** quarterly to ensure they match requirements

---

## Support & Contact
For issues or questions:
- Check Supabase logs: https://app.supabase.com/project/YOUR_PROJECT/logs
- Review GitHub Issues
- Contact: [your-team-email]
