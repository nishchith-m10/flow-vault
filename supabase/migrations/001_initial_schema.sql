-- FlowVault Initial Database Schema
-- This migration sets up all core tables for FlowVault functionality

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Fallback: ensure uuid_generate_v4 exists by creating a wrapper
-- using gen_random_uuid() (pgcrypto) if uuid-ossp's function is missing.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'uuid_generate_v4') THEN
    CREATE OR REPLACE FUNCTION uuid_generate_v4()
    RETURNS uuid AS $fn$
      SELECT gen_random_uuid();
    $fn$ LANGUAGE SQL IMMUTABLE;
  END IF;
END;
$$;

-- =====================================================
-- 1. USER SETTINGS TABLE
-- =====================================================
-- Stores per-user FlowVault configuration and n8 connection details
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL UNIQUE,
  n8n_instance_url TEXT NOT NULL,
  n8n_api_key_encrypted TEXT NOT NULL, -- AES-256-GCM encrypted with ENCRYPTION_KEY
  encryption_iv TEXT NOT NULL, -- Initialization vector for decryption
  backup_enabled BOOLEAN DEFAULT true,
  backup_schedule TEXT DEFAULT '0 0 * * *', -- Daily at midnight (cron format)
  last_backup_at TIMESTAMPTZ,
  retention_days INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_settings_clerk_id ON user_settings(clerk_user_id);

-- =====================================================
-- 2. WORKFLOW BACKUPS TABLE
-- =====================================================
-- Stores versioned backups of n8n workflows with deduplication
CREATE TABLE workflow_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  workflow_id TEXT NOT NULL, -- n8n workflow ID
  workflow_name TEXT NOT NULL,
  workflow_data JSONB NOT NULL, -- Full workflow JSON from n8n API
  content_hash TEXT NOT NULL, -- SHA-256 hash for deduplication
  version INTEGER NOT NULL, -- Auto-incremented version number per workflow
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true, -- n8n workflow active status at backup time
  backup_type TEXT DEFAULT 'scheduled', -- 'scheduled', 'manual', 'pre-delete'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(clerk_user_id, workflow_id, version)
);

CREATE INDEX idx_workflow_backups_user ON workflow_backups(clerk_user_id);
CREATE INDEX idx_workflow_backups_workflow_id ON workflow_backups(clerk_user_id, workflow_id);
CREATE INDEX idx_workflow_backups_hash ON workflow_backups(content_hash);
CREATE INDEX idx_workflow_backups_created ON workflow_backups(created_at DESC);

-- =====================================================
-- 3. ARCHIVED WORKFLOWS TABLE
-- =====================================================
-- Tracks workflows archived in n8n (soft-deleted from n8n active state)
CREATE TABLE archived_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  workflow_id TEXT NOT NULL,
  workflow_name TEXT NOT NULL,
  workflow_data JSONB NOT NULL,
  tags TEXT[] DEFAULT '{}',
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  archived_from_n8n BOOLEAN DEFAULT false, -- true if archived via n8n UI, false if via FlowVault
  last_backup_id UUID REFERENCES workflow_backups(id) ON DELETE SET NULL,
  
  UNIQUE(clerk_user_id, workflow_id)
);

CREATE INDEX idx_archived_workflows_user ON archived_workflows(clerk_user_id);
CREATE INDEX idx_archived_workflows_archived_at ON archived_workflows(archived_at DESC);

-- =====================================================
-- 4. TRASH TABLE
-- =====================================================
-- Soft-delete storage for workflows before permanent deletion
CREATE TABLE trash (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  workflow_id TEXT NOT NULL,
  workflow_name TEXT NOT NULL,
  workflow_data JSONB NOT NULL,
  tags TEXT[] DEFAULT '{}',
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  permanent_delete_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
  source TEXT DEFAULT 'active', -- 'active' or 'archived'
  
  UNIQUE(clerk_user_id, workflow_id)
);

CREATE INDEX idx_trash_user ON trash(clerk_user_id);
CREATE INDEX idx_trash_deleted_at ON trash(deleted_at DESC);
CREATE INDEX idx_trash_permanent_delete ON trash(permanent_delete_at);

-- =====================================================
-- 5. AGENT AUDIT LOG TABLE
-- =====================================================
-- Tracks all agent actions for compliance and debugging
CREATE TABLE agent_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT, -- NULL for system-wide actions
  agent_name TEXT NOT NULL, -- 'Copilot', 'Planner', 'Executor', 'PR-Manager', 'Verifier', 'Jules', etc.
  action TEXT NOT NULL, -- 'backup_created', 'workflow_archived', 'approval_requested', etc.
  status TEXT NOT NULL, -- 'success', 'failure', 'pending_approval', 'rejected'
  metadata JSONB, -- Flexible storage for action-specific data
  dry_run BOOLEAN DEFAULT false,
  approval_required BOOLEAN DEFAULT false,
  approved_by TEXT, -- clerk_user_id or 'system'
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user ON agent_audit_log(clerk_user_id);
CREATE INDEX idx_audit_log_agent ON agent_audit_log(agent_name);
CREATE INDEX idx_audit_log_created ON agent_audit_log(created_at DESC);
CREATE INDEX idx_audit_log_status ON agent_audit_log(status);

-- =====================================================
-- 6. WORKFLOW TAGS TABLE
-- =====================================================
-- Normalized tag storage for better querying and analytics
CREATE TABLE workflow_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  tag_name TEXT NOT NULL,
  color TEXT, -- Hex color code for UI
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(clerk_user_id, tag_name)
);

CREATE INDEX idx_workflow_tags_user ON workflow_tags(clerk_user_id);

-- =====================================================
-- 7. RATE LIMITING COUNTERS (Supabase-side fallback)
-- =====================================================
-- Upstash Redis primary, this table as fallback for rate limit tracking
CREATE TABLE rate_limit_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'api_call', 'backup_request', 'export', etc.
  counter INTEGER DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  
  UNIQUE(clerk_user_id, action_type, window_start)
);

CREATE INDEX idx_rate_limit_user_action ON rate_limit_counters(clerk_user_id, action_type);
CREATE INDEX idx_rate_limit_window ON rate_limit_counters(window_end);

-- =====================================================
-- 8. UPDATED_AT TRIGGER FUNCTION
-- =====================================================
-- Auto-update updated_at timestamp on row modification
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to user_settings table
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================
-- Enable RLS on all user-facing tables
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE trash ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_counters ENABLE ROW LEVEL SECURITY;

-- Note: agent_audit_log intentionally does NOT have RLS for admin/system access

-- User Settings Policies
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

-- Workflow Backups Policies
CREATE POLICY "Users can view own backups"
  ON workflow_backups FOR SELECT
  USING (clerk_user_id = current_setting('app.clerk_user_id', true));

CREATE POLICY "Users can insert own backups"
  ON workflow_backups FOR INSERT
  WITH CHECK (clerk_user_id = current_setting('app.clerk_user_id', true));

CREATE POLICY "Users can delete own backups"
  ON workflow_backups FOR DELETE
  USING (clerk_user_id = current_setting('app.clerk_user_id', true));

-- Archived Workflows Policies
CREATE POLICY "Users can view own archived workflows"
  ON archived_workflows FOR SELECT
  USING (clerk_user_id = current_setting('app.clerk_user_id', true));

CREATE POLICY "Users can insert own archived workflows"
  ON archived_workflows FOR INSERT
  WITH CHECK (clerk_user_id = current_setting('app.clerk_user_id', true));

CREATE POLICY "Users can update own archived workflows"
  ON archived_workflows FOR UPDATE
  USING (clerk_user_id = current_setting('app.clerk_user_id', true))
  WITH CHECK (clerk_user_id = current_setting('app.clerk_user_id', true));

CREATE POLICY "Users can delete own archived workflows"
  ON archived_workflows FOR DELETE
  USING (clerk_user_id = current_setting('app.clerk_user_id', true));

-- Trash Policies
CREATE POLICY "Users can view own trash"
  ON trash FOR SELECT
  USING (clerk_user_id = current_setting('app.clerk_user_id', true));

CREATE POLICY "Users can insert own trash"
  ON trash FOR INSERT
  WITH CHECK (clerk_user_id = current_setting('app.clerk_user_id', true));

CREATE POLICY "Users can delete own trash"
  ON trash FOR DELETE
  USING (clerk_user_id = current_setting('app.clerk_user_id', true));

-- Workflow Tags Policies
CREATE POLICY "Users can view own tags"
  ON workflow_tags FOR SELECT
  USING (clerk_user_id = current_setting('app.clerk_user_id', true));

CREATE POLICY "Users can manage own tags"
  ON workflow_tags FOR ALL
  USING (clerk_user_id = current_setting('app.clerk_user_id', true))
  WITH CHECK (clerk_user_id = current_setting('app.clerk_user_id', true));

-- Rate Limit Counters Policies
CREATE POLICY "Users can view own rate limits"
  ON rate_limit_counters FOR SELECT
  USING (clerk_user_id = current_setting('app.clerk_user_id', true));

CREATE POLICY "Users can manage own rate limits"
  ON rate_limit_counters FOR ALL
  USING (clerk_user_id = current_setting('app.clerk_user_id', true))
  WITH CHECK (clerk_user_id = current_setting('app.clerk_user_id', true));

-- =====================================================
-- 10. HELPER FUNCTIONS
-- =====================================================

-- Function to get next backup version number for a workflow
CREATE OR REPLACE FUNCTION get_next_backup_version(
  p_clerk_user_id TEXT,
  p_workflow_id TEXT
)
RETURNS INTEGER AS $$
DECLARE
  v_max_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version), 0) INTO v_max_version
  FROM workflow_backups
  WHERE clerk_user_id = p_clerk_user_id
    AND workflow_id = p_workflow_id;
  
  RETURN v_max_version + 1;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired trash items
CREATE OR REPLACE FUNCTION cleanup_expired_trash()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM trash
  WHERE permanent_delete_at <= NOW();
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- You can now run this migration in your Supabase dashboard
-- or via Supabase CLI: supabase migration up
