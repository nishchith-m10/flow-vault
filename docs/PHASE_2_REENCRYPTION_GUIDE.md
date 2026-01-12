# Phase 2: Re-encryption Dry-Run & Rollout Guide

## Prerequisites ✅

Before proceeding, ensure:

1. **Phase 1 Complete** - RLS & key metadata migrations applied
2. **Encryption Keys Ready** - Old and new keys available
3. **Service Role Access** - `SUPABASE_SERVICE_ROLE_KEY` configured
4. **Backup Verified** - Database backup recent and tested

---

## Understanding Re-encryption 📚

### Why Re-encrypt?

- Rotate encryption keys for security best practices
- Upgrade encryption algorithms or key lengths
- Respond to potential key compromise
- Comply with key rotation policies

### How It Works

1. **Fetch backups** encrypted with old key version
2. **Decrypt** with old key → plaintext
3. **Re-encrypt** with new key → new ciphertext
4. **Update** database with new ciphertext + new key version
5. **Verify** decryptability with new key

### Safety Features

- `--dry-run` mode lists candidates without changes
- `--limit=N` processes only N backups per run
- `--confirm` flag required to apply changes
- Atomic updates (all-or-nothing per backup)
- Rollback possible if old key retained

---

## Step 1: Prepare Encryption Keys 🔑

### A. Generate or retrieve new encryption key

```bash
# Option 1: Generate new strong key (32 bytes base64)
openssl rand -base64 32

# Option 2: Use existing key from secrets manager
# (Recommended for production)

# Store keys securely - NEVER commit to git
```

### B. Export keys to environment

```bash
# Add to .env.local (DO NOT COMMIT THIS FILE)
FLOWVAULT_OLD_ENCRYPTION_KEY=your_current_key_here
FLOWVAULT_NEW_ENCRYPTION_KEY=your_new_key_here
```

### C. Register new key version in database

```sql
-- Run in Supabase SQL Editor
INSERT INTO flowvault_key_metadata (
  key_version,
  description,
  is_active
) VALUES (
  'v2-2026-01',
  'January 2026 key rotation',
  false  -- Don't activate yet
);

-- Verify
SELECT * FROM flowvault_key_metadata ORDER BY created_at DESC;
```

---

## Step 2: Dry-Run Analysis 🔍

### A. List re-encryption candidates

```bash
# Set environment variables
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
export FLOWVAULT_OLD_ENCRYPTION_KEY="old_key"
export FLOWVAULT_NEW_ENCRYPTION_KEY="new_key"
export NEW_KEY_VERSION="v2-2026-01"

# Run dry-run to see what would be re-encrypted
node scripts/re_encrypt_backups.ts --dry-run --limit=10

# Expected output:
# ✓ Found 10 backups to re-encrypt
# Would re-encrypt:
#   - Backup ID: abc-123, Workflow: My Workflow, Current: v1-initial → v2-2026-01
#   - Backup ID: def-456, Workflow: Another Flow, Current: null → v2-2026-01
#   ...
# Total: 10 backups would be re-encrypted
# (No changes applied - dry-run mode)
```

### B. Review dry-run output

Check for:
- Total number of backups to re-encrypt
- Mix of workflows and users
- Current key versions (null means v1-initial)
- Any errors or warnings

### C. Verify a sample backup manually

```bash
# Test decryption with old key (pick one backup ID from dry-run)
node -e "
const { decrypt } = require('./src/lib/encryption/decrypt.ts');
const { getBackupById } = require('./src/lib/database/workflowBackups.ts');

(async () => {
  const backup = await getBackupById('YOUR_BACKUP_ID');
  const result = await decrypt(backup.workflow_data, process.env.FLOWVAULT_OLD_ENCRYPTION_KEY);
  console.log('Decrypt success:', result.success);
  console.log('Plaintext length:', result.plaintext?.length);
})();
"
```

---

## Step 3: Small Batch Re-encryption 🔄

### A. Start with tiny batch (1-5 backups)

```bash
# Re-encrypt just 5 backups
node scripts/re_encrypt_backups.ts --confirm --limit=5

# Watch output carefully:
# ✓ Re-encrypting 5 backups...
# [1/5] Re-encrypting backup abc-123... ✓
# [2/5] Re-encrypting backup def-456... ✓
# [3/5] Re-encrypting backup ghi-789... ✓
# [4/5] Re-encrypting backup jkl-012... ✓
# [5/5] Re-encrypting backup mno-345... ✓
# 
# Summary:
#   Successfully re-encrypted: 5
#   Failed: 0
#   Total time: 2.3s
```

### B. Verify re-encrypted backups

```sql
-- Check backups were updated
SELECT id, workflow_name, encryption_key_version, updated_at
FROM flowvault_workflow_backups
WHERE encryption_key_version = 'v2-2026-01'
ORDER BY updated_at DESC
LIMIT 5;

-- Should show 5 backups with new key version
```

### C. Test decryption with new key

```bash
# Verify one of the re-encrypted backups
node -e "
const { decrypt } = require('./src/lib/encryption/decrypt.ts');
const { getBackupById } = require('./src/lib/database/workflowBackups.ts');

(async () => {
  const backup = await getBackupById('abc-123'); // Use real ID from step B
  const result = await decrypt(backup.workflow_data, process.env.FLOWVAULT_NEW_ENCRYPTION_KEY);
  console.log('Decrypt with NEW key:', result.success);
  console.log('Workflow name:', JSON.parse(result.plaintext).name);
})();
"
```

**CRITICAL:** If decryption fails, DO NOT CONTINUE. Investigate the issue.

---

## Step 4: Incremental Rollout 📈

### A. Increase batch sizes gradually

```bash
# After successful 5-backup test:

# Batch 1: 25 backups
node scripts/re_encrypt_backups.ts --confirm --limit=25

# Wait 5 minutes, monitor for issues, verify sample

# Batch 2: 100 backups
node scripts/re_encrypt_backups.ts --confirm --limit=100

# Wait 10 minutes, monitor, verify

# Batch 3: 500 backups
node scripts/re_encrypt_backups.ts --confirm --limit=500

# Continue scaling up as confidence grows
```

### B. Monitor progress

```sql
-- Track re-encryption progress
SELECT 
  encryption_key_version,
  COUNT(*) as backup_count,
  MAX(updated_at) as last_reencrypted
FROM flowvault_workflow_backups
GROUP BY encryption_key_version
ORDER BY encryption_key_version;

-- Expected output:
-- v1-initial    | 4500  | 2026-01-10 12:00:00
-- v2-2026-01    | 630   | 2026-01-10 14:23:15
-- (null)        | 100   | 2026-01-09 08:00:00
```

### C. Set up monitoring alerts

```sql
-- Create a function to check re-encryption progress
CREATE OR REPLACE FUNCTION get_reencryption_stats()
RETURNS TABLE (
  key_version TEXT,
  count BIGINT,
  percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(encryption_key_version, 'v1-initial (null)') as key_version,
    COUNT(*) as count,
    ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM flowvault_workflow_backups)), 2) as percentage
  FROM flowvault_workflow_backups
  GROUP BY encryption_key_version;
END;
$$ LANGUAGE plpgsql;

-- Check stats
SELECT * FROM get_reencryption_stats();
```

---

## Step 5: Final Batch & Activation 🎯

### A. Re-encrypt remaining backups

```bash
# Once confident, re-encrypt all remaining
# (omit --limit to process all)
node scripts/re_encrypt_backups.ts --confirm

# This may take a while for large datasets
# Monitor progress in separate terminal:
watch -n 30 'psql $DATABASE_URL -c "SELECT * FROM get_reencryption_stats();"'
```

### B. Verify 100% migration

```sql
-- Check for any backups NOT on new key
SELECT COUNT(*) as remaining_old_key
FROM flowvault_workflow_backups
WHERE encryption_key_version IS NULL 
   OR encryption_key_version != 'v2-2026-01';

-- Should return: 0
```

### C. Activate new key version

```sql
-- Make v2-2026-01 the active key for NEW backups
SELECT flowvault_activate_key_version('v2-2026-01');

-- Verify
SELECT * FROM flowvault_key_metadata WHERE is_active = true;
-- Should show: v2-2026-01
```

### D. Update application configuration

```bash
# Update .env.local (or secrets manager)
# Change primary encryption key to new key:
FLOWVAULT_ENCRYPTION_KEY=<value from FLOWVAULT_NEW_ENCRYPTION_KEY>

# Keep old key available for any missed backups:
FLOWVAULT_OLD_ENCRYPTION_KEY=<previous key>

# Deploy updated environment variables
# (Vercel: Dashboard → Settings → Environment Variables)
```

---

## Step 6: Verification & Cleanup 🧹

### A. Smoke test with new backups

```bash
# Trigger a manual backup (should use new key)
curl -X POST http://localhost:3000/api/backups/trigger \
  -H 'Cookie: __session=YOUR_SESSION'

# Check the new backup's key version
psql $DATABASE_URL -c "
  SELECT id, workflow_name, encryption_key_version, created_at
  FROM flowvault_workflow_backups
  ORDER BY created_at DESC
  LIMIT 5;
"

# Should show new backups with: v2-2026-01
```

### B. Test restore functionality

```bash
# Try restoring a backup created with new key
curl -X POST http://localhost:3000/api/backups/{backup_id}/restore \
  -H 'Content-Type: application/json' \
  -H 'Cookie: __session=YOUR_SESSION' \
  -d '{"handleConflict": "create-new"}'

# Should succeed without errors
```

### C. Retain old key (recommended: 90 days)

```bash
# DO NOT delete old key immediately
# Keep for emergency rollback or missed backups

# Add to secrets manager with retention policy:
# Key: FLOWVAULT_LEGACY_KEY_V1
# Value: <old key>
# Expiry: 2026-04-10 (90 days)
```

### D. Document key rotation

```bash
# Update docs/security/KEY_ROTATION_LOG.md
cat >> docs/security/KEY_ROTATION_LOG.md << EOF

## Key Rotation: January 10, 2026

- **Date:** 2026-01-10
- **Old Key Version:** v1-initial
- **New Key Version:** v2-2026-01
- **Backups Re-encrypted:** 5,230
- **Duration:** ~4 hours
- **Issues:** None
- **Old Key Retention:** Until 2026-04-10

EOF
```

---

## Rollback Procedure (Emergency) 🚨

### If re-encryption fails catastrophically:

```bash
# 1. Stop re-encryption script immediately (Ctrl+C)

# 2. Reactivate old key version
psql $DATABASE_URL -c "SELECT flowvault_activate_key_version('v1-initial');"

# 3. Update app to use old key
# (Revert environment variables)

# 4. Assess damage
psql $DATABASE_URL -c "
  SELECT encryption_key_version, COUNT(*) 
  FROM flowvault_workflow_backups 
  GROUP BY encryption_key_version;
"

# 5. If needed, restore from database backup
# (Use Supabase Dashboard → Database → Restore)

# 6. Investigate root cause before retrying
```

### Partial rollback (some backups failed):

```sql
-- Find failed backups (if script logged them)
-- Re-run script with --limit to retry just those IDs
```

---

## Common Issues & Solutions 🔧

### Issue: "Decryption failed with new key"

**Causes:**
- Wrong new key provided
- Key not base64 encoded properly
- Database update failed mid-transaction

**Fix:**
```bash
# Verify new key in database matches env var
echo $FLOWVAULT_NEW_ENCRYPTION_KEY

# Check backup's stored key version
psql $DATABASE_URL -c "
  SELECT encryption_key_version 
  FROM flowvault_workflow_backups 
  WHERE id = 'failing_backup_id';
"

# If mismatch, investigate data corruption
```

### Issue: "Permission denied inserting key metadata"

**Fix:**
```sql
-- Grant permissions to authenticated role
GRANT INSERT ON flowvault_key_metadata TO authenticated;
```

### Issue: Re-encryption script too slow

**Optimization:**
```bash
# Process in parallel batches (use GNU parallel)
seq 0 10 | parallel -j 4 \
  "node scripts/re_encrypt_backups.ts --confirm --limit=500 --offset={}"

# Or run multiple instances with different filters
```

### Issue: Old backups still showing null key version

**Fix:**
```sql
-- Update null to v1-initial for tracking
UPDATE flowvault_workflow_backups
SET encryption_key_version = 'v1-initial'
WHERE encryption_key_version IS NULL;
```

---

## Monitoring & Alerts 📊

### Set up monitoring queries

```sql
-- Daily re-encryption progress check
CREATE OR REPLACE VIEW reencryption_progress AS
SELECT 
  DATE(updated_at) as date,
  encryption_key_version,
  COUNT(*) as backups_processed
FROM flowvault_workflow_backups
WHERE updated_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(updated_at), encryption_key_version
ORDER BY date DESC;

-- Query it
SELECT * FROM reencryption_progress;
```

### Add application metrics

```typescript
// In src/lib/backup/runner.ts - track key versions used
export async function trackEncryptionKeyUsage(keyVersion: string) {
  // Send to monitoring service (e.g., Sentry, Datadog)
  console.log(`[METRICS] Backup encrypted with key: ${keyVersion}`);
}
```

---

## Next Steps ➡️

After Phase 2 completion:
1. Monitor re-encrypted backups for 7 days
2. Schedule next key rotation (recommend: 90 days)
3. Update RUNBOOK.md with key rotation schedule
4. Train team on emergency rollback procedures
5. Proceed to Phase 3: Integration Tests & CI

---

## Support & Documentation 📚

- Script Source: `scripts/re_encrypt_backups.ts`
- Encryption Module: `src/lib/encryption/`
- Key Metadata: `supabase/migrations/002_key_metadata.sql`
- Security Docs: `docs/security/RLS_and_key_rotation.md`
