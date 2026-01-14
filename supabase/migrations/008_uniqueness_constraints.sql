-- Migration 008: Uniqueness Constraints for Abuse Prevention
-- Adds constraints to prevent multiple users from sharing credentials
-- Date: 2026-01-13

-- =====================================================
-- 1. ADD API KEY HASH COLUMN
-- =====================================================
-- Add column to store SHA-256 hash of plaintext API key
-- This enables uniqueness checking without storing plaintext

-- First, rename the old table to preserve existing data
ALTER TABLE user_settings RENAME TO user_settings_old;

-- Create new table with hash column
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL UNIQUE,
  n8n_instance_url TEXT NOT NULL UNIQUE, -- NEW: Unique constraint
  n8n_api_key_encrypted TEXT NOT NULL,
  n8n_api_key_hash TEXT NOT NULL UNIQUE, -- NEW: Hash for uniqueness checking
  encryption_iv TEXT NOT NULL,
  backup_enabled BOOLEAN DEFAULT true,
  backup_schedule TEXT DEFAULT '0 0 * * *',
  last_backup_at TIMESTAMPTZ,
  retention_days INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. MIGRATE EXISTING DATA
-- =====================================================
-- Copy data from old table
-- Note: n8n_api_key_hash will be populated by application code
-- For now, set temporary hash values to allow migration

INSERT INTO user_settings (
  id,
  clerk_user_id,
  n8n_instance_url,
  n8n_api_key_encrypted,
  n8n_api_key_hash,
  encryption_iv,
  backup_enabled,
  backup_schedule,
  last_backup_at,
  retention_days,
  created_at,
  updated_at
)
SELECT
  id,
  clerk_user_id,
  n8n_instance_url,
  n8n_api_key_encrypted,
  -- Generate temporary unique hash from encrypted data + user ID
  -- This will be replaced when users next update their settings
  encode(digest(n8n_api_key_encrypted || clerk_user_id || encryption_iv, 'sha256'), 'hex') as n8n_api_key_hash,
  encryption_iv,
  backup_enabled,
  backup_schedule,
  last_backup_at,
  retention_days,
  created_at,
  updated_at
FROM user_settings_old;

-- Drop old table
DROP TABLE user_settings_old;

-- =====================================================
-- 3. RECREATE INDEXES
-- =====================================================
CREATE INDEX idx_user_settings_clerk_id ON user_settings(clerk_user_id);
CREATE INDEX idx_user_settings_url ON user_settings(n8n_instance_url);
CREATE INDEX idx_user_settings_hash ON user_settings(n8n_api_key_hash);

-- =====================================================
-- 4. RECREATE TRIGGERS
-- =====================================================
-- Reapply updated_at trigger
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. RECREATE RLS POLICIES
-- =====================================================
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  USING (clerk_user_id = current_setting('app.clerk_user_id', true));

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  WITH CHECK (clerk_user_id = current_setting('app.clerk_user_id', true));

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  USING (clerk_user_id = current_setting('app.clerk_user_id', true))
  WITH CHECK (clerk_user_id = current_setting('app.clerk_user_id', true));

-- =====================================================
-- 6. HELPER FUNCTION FOR CONSTRAINT CHECKING
-- =====================================================
-- Function to check if credentials are already in use
CREATE OR REPLACE FUNCTION check_credentials_available(
  p_n8n_url TEXT,
  p_api_key_hash TEXT,
  p_clerk_user_id TEXT DEFAULT NULL
)
RETURNS TABLE(
  url_available BOOLEAN,
  hash_available BOOLEAN,
  conflicting_user_id TEXT
) AS $$
DECLARE
  v_url_user TEXT;
  v_hash_user TEXT;
BEGIN
  -- Check URL uniqueness
  SELECT clerk_user_id INTO v_url_user
  FROM user_settings
  WHERE n8n_instance_url = p_n8n_url
    AND (p_clerk_user_id IS NULL OR clerk_user_id != p_clerk_user_id);

  -- Check API key hash uniqueness
  SELECT clerk_user_id INTO v_hash_user
  FROM user_settings
  WHERE n8n_api_key_hash = p_api_key_hash
    AND (p_clerk_user_id IS NULL OR clerk_user_id != p_clerk_user_id);

  RETURN QUERY SELECT
    v_url_user IS NULL as url_available,
    v_hash_user IS NULL as hash_available,
    COALESCE(v_url_user, v_hash_user) as conflicting_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Changes:
-- 1. Added n8n_api_key_hash column with UNIQUE constraint
-- 2. Added UNIQUE constraint to n8n_instance_url
-- 3. Created helper function for credential availability checking
-- 4. Migrated existing data with temporary hashes

-- Next steps:
-- 1. Update application code to generate proper hashes
-- 2. Add error handling for constraint violations
-- 3. Add tests for uniqueness enforcement
