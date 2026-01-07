# RLS and Key Rotation Runbook

This document provides instructions for applying and managing the new security features, including Row-Level Security (RLS) and encryption key rotation.

## 1. Pre-migration Checklist

- [ ] **Backup the database:** Before applying any migrations, take a full backup of the production database.
- [ ] **Verify environment variables:** Use the `scripts/check_env.js` script to ensure all required environment variables are set.
- [ ] **Review migrations:** Manually review the SQL in `supabase/migrations/001_rls_flowvault.sql` and `supabase/migrations/002_key_metadata.sql`.

## 2. Applying Migrations

The migrations must be applied in the correct order.

### Staging Environment

1. Apply the RLS migration:
   ```bash
   PGPASSWORD="$SUPABASE_SERVICE_ROLE_KEY" psql "$SUPABASE_DB_URL" -f supabase/migrations/001_rls_flowvault.sql
   ```
2. Apply the key metadata migration:
   ```bash
   PGPASSWORD="$SUPABASE_SERVICE_ROLE_KEY" psql "$SUPABASE_DB_URL" -f supabase/migrations/002_key_metadata.sql
   ```
3. Run the verification queries in the migration files to confirm that the changes were applied correctly.

### Production Environment

Follow the same steps as in the staging environment, but with the production database credentials.

## 3. Key Rotation and Re-encryption

The `scripts/re_encrypt_backups.sh` script is used to re-encrypt backups with a new key.

### Dry Run (Recommended)

First, run the script in dry-run mode to see which backups would be affected:
```bash
./scripts/re_encrypt_backups.sh --dry-run
```

### Full Run

To perform the re-encryption, run the script with the `--confirm` flag:
```bash
./scripts/re_encrypt_backups.sh --confirm
```

**Note:** This is a potentially destructive operation. Ensure you have a database backup before proceeding.

## 4. Rollback Instructions

### RLS Policies

To remove the RLS policies, you can disable RLS on the tables:
```sql
ALTER TABLE public.flowvault_user_settings DISABLE ROW LEVEL SECURITY;
-- Repeat for all other flowvault_* tables
```

### Key Metadata

The `002_key_metadata.sql` migration is not easily reversible. It adds a table and a column. If you need to roll back, you would need to manually drop the `flowvault_key_metadata` table and the `encryption_key_version` column from `flowvault_workflow_backups`.

**Caution:** Rolling back this migration may result in data loss if you have already started using the key rotation feature.
