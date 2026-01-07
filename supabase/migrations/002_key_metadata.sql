-- Migration: 002_key_metadata.sql
-- Description: Adds key versioning support for encryption.
-- Order: This migration must be applied after 001_rls_flowvault.sql.

-- Make sure to run this with a role that has the necessary permissions.
-- PGPASSWORD="$SUPABASE_SERVICE_ROLE_KEY" psql "$SUPABASE_DB_URL" -f supabase/migrations/002_key_metadata.sql

BEGIN;

-- Table: flowvault_key_metadata
CREATE TABLE IF NOT EXISTS public.flowvault_key_metadata (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  key_version VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  active BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB
);

COMMENT ON TABLE public.flowvault_key_metadata IS 'Stores metadata about encryption keys used for backups.';
COMMENT ON COLUMN public.flowvault_key_metadata.key_version IS 'A unique identifier for the encryption key version.';
COMMENT ON COLUMN public.flowvault_key_metadata.active IS 'Indicates if this key is the current active key for encryption.';

-- Add indexes for key lookups
CREATE INDEX IF NOT EXISTS idx_flowvault_key_metadata_key_version ON public.flowvault_key_metadata(key_version);
CREATE INDEX IF NOT EXISTS idx_flowvault_key_metadata_active ON public.flowvault_key_metadata(active);

-- Add encryption_key_version to flowvault_workflow_backups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'flowvault_workflow_backups' AND column_name = 'encryption_key_version'
  ) THEN
    ALTER TABLE public.flowvault_workflow_backups ADD COLUMN encryption_key_version VARCHAR(255);
    COMMENT ON COLUMN public.flowvault_workflow_backups.encryption_key_version IS 'The version of the key used to encrypt the backup data.';
  END IF;
END $$;

-- Add an index for the new column
CREATE INDEX IF NOT EXISTS idx_flowvault_workflow_backups_encryption_key_version ON public.flowvault_workflow_backups(encryption_key_version);

-- Verification queries:
-- 1. Check if the table and columns were created:
--    - `\d flowvault_key_metadata`
--    - `\d flowvault_workflow_backups`
-- 2. Check if indexes were created:
--    - `SELECT indexname FROM pg_indexes WHERE tablename = 'flowvault_key_metadata';`
--    - `SELECT indexname FROM pg_indexes WHERE tablename = 'flowvault_workflow_backups';`

COMMIT;
