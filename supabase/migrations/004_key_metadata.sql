-- Migration: 002_key_metadata.sql
-- Description: Add encryption key versioning and metadata support
-- Author: GitHub Copilot / Task 8
-- Date: 2026-01-07
-- Safety: Idempotent (safe to re-run)

-- ============================================================================
-- OVERVIEW
-- ============================================================================
-- This migration adds support for encryption key rotation by:
--   1. Creating a flowvault_key_metadata table to track key versions
--   2. Adding encryption_key_version column to flowvault_workflow_backups
--   3. Providing functions to manage active key versions
--
-- Key rotation workflow:
--   1. Generate new encryption key (external process)
--   2. Insert new key version into flowvault_key_metadata (mark as active)
--   3. Run re-encryption job to migrate old backups to new key version
--   4. Archive old key version (mark as inactive) after migration complete
-- ============================================================================

-- ============================================================================
-- TABLE: flowvault_key_metadata
-- ============================================================================
-- Stores encryption key version information and metadata
-- Note: Does NOT store the actual encryption keys (keys are in env vars)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.flowvault_key_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_version VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  deactivated_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  notes TEXT
);

-- Add index for active key lookups
CREATE INDEX IF NOT EXISTS idx_flowvault_key_metadata_active
ON public.flowvault_key_metadata(is_active, key_version)
WHERE is_active = true;

-- Add index for version lookups
CREATE INDEX IF NOT EXISTS idx_flowvault_key_metadata_version
ON public.flowvault_key_metadata(key_version);

COMMENT ON TABLE public.flowvault_key_metadata IS 'Tracks encryption key versions for backup re-encryption. Does NOT store actual keys.';
COMMENT ON COLUMN public.flowvault_key_metadata.key_version IS 'Unique identifier for the key version (e.g., "v1", "2026-01-07", "key-abc123")';
COMMENT ON COLUMN public.flowvault_key_metadata.is_active IS 'Only one key version should be active at a time (used for new backups)';
COMMENT ON COLUMN public.flowvault_key_metadata.metadata IS 'Additional metadata: algorithm, rotation reason, etc.';

-- ============================================================================
-- RLS for flowvault_key_metadata
-- ============================================================================
-- Service role only (users should not see key metadata)
ALTER TABLE public.flowvault_key_metadata ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "flowvault_key_metadata_service_only" ON public.flowvault_key_metadata;

CREATE POLICY "flowvault_key_metadata_service_only"
ON public.flowvault_key_metadata
FOR ALL
USING (public.is_service_role())
WITH CHECK (public.is_service_role());

COMMENT ON TABLE public.flowvault_key_metadata IS 'RLS enabled: service_role only (key rotation operations)';

-- ============================================================================
-- ALTER TABLE: flowvault_workflow_backups
-- ============================================================================
-- Add encryption_key_version column to track which key was used
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'flowvault_workflow_backups'
      AND column_name = 'encryption_key_version'
  ) THEN
    ALTER TABLE public.flowvault_workflow_backups
    ADD COLUMN encryption_key_version VARCHAR(50);
  END IF;
END $$;

-- Add index for re-encryption queries (find backups with old key versions)
CREATE INDEX IF NOT EXISTS idx_flowvault_backups_key_version
ON public.flowvault_workflow_backups(encryption_key_version)
WHERE encryption_key_version IS NOT NULL;

COMMENT ON COLUMN public.flowvault_workflow_backups.encryption_key_version IS 'Key version used to encrypt this backup (references flowvault_key_metadata.key_version)';

-- ============================================================================
-- FUNCTION: Get active encryption key version
-- ============================================================================
CREATE OR REPLACE FUNCTION public.flowvault_get_active_key_version()
RETURNS VARCHAR AS $$
DECLARE
  active_version VARCHAR;
BEGIN
  SELECT key_version INTO active_version
  FROM public.flowvault_key_metadata
  WHERE is_active = true
  ORDER BY activated_at DESC
  LIMIT 1;
  
  RETURN active_version;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.flowvault_get_active_key_version() IS 'Returns the currently active encryption key version';

-- ============================================================================
-- FUNCTION: Activate new key version (deactivates previous)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.flowvault_activate_key_version(p_key_version VARCHAR)
RETURNS VOID AS $$
BEGIN
  -- Deactivate all existing keys
  UPDATE public.flowvault_key_metadata
  SET is_active = false,
      deactivated_at = NOW()
  WHERE is_active = true;
  
  -- Activate the specified key version
  UPDATE public.flowvault_key_metadata
  SET is_active = true,
      activated_at = NOW(),
      deactivated_at = NULL
  WHERE key_version = p_key_version;
  
  -- If key version doesn't exist, raise exception
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Key version % not found', p_key_version;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.flowvault_activate_key_version(VARCHAR) IS 'Activates a key version (deactivates all others). Use during key rotation.';

-- ============================================================================
-- SEED DATA: Initial key version
-- ============================================================================
-- Insert default key version if none exists
-- This represents the current FLOWVAULT_ENCRYPTION_KEY in environment
-- ============================================================================
INSERT INTO public.flowvault_key_metadata (key_version, is_active, activated_at, metadata, notes)
VALUES (
  'v1-initial',
  true,
  NOW(),
  '{"algorithm": "AES-256-GCM", "kdf": "PBKDF2-SHA256", "iterations": 100000}'::jsonb,
  'Initial encryption key version. Represents current FLOWVAULT_ENCRYPTION_KEY in environment.'
)
ON CONFLICT (key_version) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- VERIFICATION 1: Check key metadata table exists and has initial version
-- Expected: Should show v1-initial as active
/*
SELECT
  key_version,
  is_active,
  created_at,
  activated_at,
  metadata,
  notes
FROM public.flowvault_key_metadata
ORDER BY created_at DESC;
*/

-- VERIFICATION 2: Check encryption_key_version column was added
-- Expected: Should show encryption_key_version column
/*
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'flowvault_workflow_backups'
  AND column_name = 'encryption_key_version';
*/

-- VERIFICATION 3: Test active key version function
-- Expected: Should return 'v1-initial'
/*
SELECT public.flowvault_get_active_key_version();
*/

-- VERIFICATION 4: Check backups needing re-encryption (none initially)
-- Expected: Should return 0 (all backups should have NULL or 'v1-initial')
/*
SELECT
  encryption_key_version,
  COUNT(*) AS backup_count
FROM public.flowvault_workflow_backups
GROUP BY encryption_key_version
ORDER BY encryption_key_version;
*/

-- ============================================================================
-- KEY ROTATION WORKFLOW (Manual Steps)
-- ============================================================================
/*
-- Step 1: Generate new encryption key (external - store in secure vault)
-- export NEW_ENCRYPTION_KEY="..." (keep secure, do NOT commit)

-- Step 2: Insert new key version into metadata
INSERT INTO public.flowvault_key_metadata (key_version, metadata, notes)
VALUES (
  'v2-2026-01',
  '{"algorithm": "AES-256-GCM", "rotation_reason": "scheduled rotation"}'::jsonb,
  'Rotated on 2026-01-07'
);

-- Step 3: Activate new key version (deactivates v1-initial)
SELECT public.flowvault_activate_key_version('v2-2026-01');

-- Step 4: Run re-encryption job (see scripts/re_encrypt_backups.ts)
-- This will:
--   - Find all backups with encryption_key_version != 'v2-2026-01'
--   - Decrypt with old key (requires old key in environment)
--   - Re-encrypt with new key
--   - Update encryption_key_version to 'v2-2026-01'
-- Example:
-- export OLD_ENCRYPTION_KEY="..." (v1-initial key)
-- export NEW_ENCRYPTION_KEY="..." (v2-2026-01 key)
-- node scripts/re_encrypt_backups.js --dry-run
-- node scripts/re_encrypt_backups.js --confirm --limit 100

-- Step 5: Verify re-encryption completed
SELECT
  encryption_key_version,
  COUNT(*) AS backup_count
FROM public.flowvault_workflow_backups
GROUP BY encryption_key_version;
-- Expected: All backups should show 'v2-2026-01'

-- Step 6: Archive old key version (mark inactive, keep for audit)
-- Old keys should be kept in secure vault for disaster recovery
-- but marked inactive in DB
*/

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
/*
-- To remove key metadata support:
ALTER TABLE public.flowvault_workflow_backups DROP COLUMN IF EXISTS encryption_key_version;
DROP FUNCTION IF EXISTS public.flowvault_activate_key_version(VARCHAR);
DROP FUNCTION IF EXISTS public.flowvault_get_active_key_version();
DROP TABLE IF EXISTS public.flowvault_key_metadata;
*/

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
