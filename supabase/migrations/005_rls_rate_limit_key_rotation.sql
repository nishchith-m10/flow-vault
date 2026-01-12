-- 002: RLS policies, rate limit RPC, encryption key metadata

-- 1) Helper wrapper to set session config via RPC (wraps postgres set_config)
CREATE OR REPLACE FUNCTION set_config(setting TEXT, value TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config(setting, value, TRUE);
END;
$$;

-- 2) Create encryption keys metadata table
CREATE TABLE IF NOT EXISTS flowvault_encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INTEGER NOT NULL UNIQUE,
  key_identifier TEXT, -- optional human identifier
  key_hash TEXT, -- sha256 of the key (stored for identification only)
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);

-- 3) Add key version columns to user settings and workflow backups
ALTER TABLE IF EXISTS flowvault_user_settings
  ADD COLUMN IF NOT EXISTS encryption_key_version INTEGER DEFAULT 1;

ALTER TABLE IF EXISTS flowvault_workflow_backups
  ADD COLUMN IF NOT EXISTS encryption_key_version INTEGER DEFAULT 1;

-- 4) Create or enable flowvault_rate_limit_counters and add rls + policies if not exists
CREATE TABLE IF NOT EXISTS flowvault_rate_limit_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  counter INTEGER DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  UNIQUE(clerk_user_id, action_type, window_start)
);

CREATE INDEX IF NOT EXISTS idx_flowvault_rate_limit_user_action ON flowvault_rate_limit_counters(clerk_user_id, action_type);
CREATE INDEX IF NOT EXISTS idx_flowvault_rate_limit_window ON flowvault_rate_limit_counters(window_end);

ALTER TABLE flowvault_rate_limit_counters ENABLE ROW LEVEL SECURITY;

-- Policy: allow owner or service role to see/manage own counters
CREATE POLICY IF NOT EXISTS "Users can view own rate limits"
  ON flowvault_rate_limit_counters FOR SELECT
  USING (
    clerk_user_id = current_setting('app.clerk_user_id', true)
    OR current_setting('app.is_service_role', true) = 'true'
  );

CREATE POLICY IF NOT EXISTS "Users can manage own rate limits"
  ON flowvault_rate_limit_counters FOR ALL
  USING (
    clerk_user_id = current_setting('app.clerk_user_id', true)
    OR current_setting('app.is_service_role', true) = 'true'
  )
  WITH CHECK (
    clerk_user_id = current_setting('app.clerk_user_id', true)
    OR current_setting('app.is_service_role', true) = 'true'
  );

-- 5) RLS policies for other flowvault_* tables (owner + service role/system)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='flowvault_user_settings') THEN
    ALTER TABLE flowvault_user_settings ENABLE ROW LEVEL SECURITY;

    CREATE POLICY IF NOT EXISTS "Users can view own settings"
      ON flowvault_user_settings FOR SELECT
      USING (clerk_user_id = current_setting('app.clerk_user_id', true) OR current_setting('app.is_service_role', true) = 'true');

    CREATE POLICY IF NOT EXISTS "Users can insert own settings"
      ON flowvault_user_settings FOR INSERT
      WITH CHECK (clerk_user_id = current_setting('app.clerk_user_id', true) OR current_setting('app.is_service_role', true) = 'true');

    CREATE POLICY IF NOT EXISTS "Users can update own settings"
      ON flowvault_user_settings FOR UPDATE
      USING (clerk_user_id = current_setting('app.clerk_user_id', true) OR current_setting('app.is_service_role', true) = 'true')
      WITH CHECK (clerk_user_id = current_setting('app.clerk_user_id', true) OR current_setting('app.is_service_role', true) = 'true');
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='flowvault_workflow_backups') THEN
    ALTER TABLE flowvault_workflow_backups ENABLE ROW LEVEL SECURITY;

    CREATE POLICY IF NOT EXISTS "Users can view own backups"
      ON flowvault_workflow_backups FOR SELECT
      USING (clerk_user_id = current_setting('app.clerk_user_id', true) OR current_setting('app.is_service_role', true) = 'true');

    CREATE POLICY IF NOT EXISTS "Users can insert own backups"
      ON flowvault_workflow_backups FOR INSERT
      WITH CHECK (clerk_user_id = current_setting('app.clerk_user_id', true) OR current_setting('app.is_service_role', true) = 'true');

    CREATE POLICY IF NOT EXISTS "Users can delete own backups"
      ON flowvault_workflow_backups FOR DELETE
      USING (clerk_user_id = current_setting('app.clerk_user_id', true) OR current_setting('app.is_service_role', true) = 'true');
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='flowvault_archived_workflows') THEN
    ALTER TABLE flowvault_archived_workflows ENABLE ROW LEVEL SECURITY;

    CREATE POLICY IF NOT EXISTS "Users can view own archived workflows"
      ON flowvault_archived_workflows FOR SELECT
      USING (clerk_user_id = current_setting('app.clerk_user_id', true) OR current_setting('app.is_service_role', true) = 'true');

    CREATE POLICY IF NOT EXISTS "Users can insert own archived workflows"
      ON flowvault_archived_workflows FOR INSERT
      WITH CHECK (clerk_user_id = current_setting('app.clerk_user_id', true) OR current_setting('app.is_service_role', true) = 'true');

    CREATE POLICY IF NOT EXISTS "Users can update own archived workflows"
      ON flowvault_archived_workflows FOR UPDATE
      USING (clerk_user_id = current_setting('app.clerk_user_id', true) OR current_setting('app.is_service_role', true) = 'true')
      WITH CHECK (clerk_user_id = current_setting('app.clerk_user_id', true) OR current_setting('app.is_service_role', true) = 'true');

    CREATE POLICY IF NOT EXISTS "Users can delete own archived workflows"
      ON flowvault_archived_workflows FOR DELETE
      USING (clerk_user_id = current_setting('app.clerk_user_id', true) OR current_setting('app.is_service_role', true) = 'true');
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='flowvault_trash') THEN
    ALTER TABLE flowvault_trash ENABLE ROW LEVEL SECURITY;

    CREATE POLICY IF NOT EXISTS "Users can view own trash"
      ON flowvault_trash FOR SELECT
      USING (clerk_user_id = current_setting('app.clerk_user_id', true) OR current_setting('app.is_service_role', true) = 'true');

    CREATE POLICY IF NOT EXISTS "Users can insert own trash"
      ON flowvault_trash FOR INSERT
      WITH CHECK (clerk_user_id = current_setting('app.clerk_user_id', true) OR current_setting('app.is_service_role', true) = 'true');

    CREATE POLICY IF NOT EXISTS "Users can delete own trash"
      ON flowvault_trash FOR DELETE
      USING (clerk_user_id = current_setting('app.clerk_user_id', true) OR current_setting('app.is_service_role', true) = 'true');
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='flowvault_agent_audit_log') THEN
    -- audit log intentionally kept open for admins, but allow service-role to bypass
    ALTER TABLE flowvault_agent_audit_log ENABLE ROW LEVEL SECURITY;

    CREATE POLICY IF NOT EXISTS "Admins or service can view audit logs"
      ON flowvault_agent_audit_log FOR SELECT
      USING (current_setting('app.is_service_role', true) = 'true');

    CREATE POLICY IF NOT EXISTS "Service can insert audit logs"
      ON flowvault_agent_audit_log FOR INSERT
      WITH CHECK (current_setting('app.is_service_role', true) = 'true' OR clerk_user_id = current_setting('app.clerk_user_id', true));
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='flowvault_workflow_tags') THEN
    ALTER TABLE flowvault_workflow_tags ENABLE ROW LEVEL SECURITY;

    CREATE POLICY IF NOT EXISTS "Users can view own tags"
      ON flowvault_workflow_tags FOR SELECT
      USING (clerk_user_id = current_setting('app.clerk_user_id', true) OR current_setting('app.is_service_role', true) = 'true');

    CREATE POLICY IF NOT EXISTS "Users can manage own tags"
      ON flowvault_workflow_tags FOR ALL
      USING (clerk_user_id = current_setting('app.clerk_user_id', true) OR current_setting('app.is_service_role', true) = 'true')
      WITH CHECK (clerk_user_id = current_setting('app.clerk_user_id', true) OR current_setting('app.is_service_role', true) = 'true');
  END IF;
END
$$;

-- 6) Atomic function to increment and check rate limits
CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_clerk_user_id TEXT,
  p_action_type TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
  v_window_start TIMESTAMPTZ := date_trunc('second', NOW() - (EXTRACT(EPOCH FROM NOW())::bigint % p_window_seconds) * INTERVAL '1 second');
  v_window_end TIMESTAMPTZ := v_window_start + (p_window_seconds * INTERVAL '1 second');
  v_counter INTEGER;
BEGIN
  -- Try update existing row
  LOOP
    UPDATE flowvault_rate_limit_counters
      SET counter = counter + 1
      WHERE clerk_user_id = p_clerk_user_id
        AND action_type = p_action_type
        AND window_start = v_window_start
      RETURNING counter INTO v_counter;

    IF FOUND THEN
      IF v_counter > p_limit THEN
        RETURN FALSE;
      END IF;
      RETURN TRUE;
    END IF;

    -- Not found: try to insert; handle concurrent inserts gracefully
    BEGIN
      INSERT INTO flowvault_rate_limit_counters (clerk_user_id, action_type, counter, window_start, window_end)
      VALUES (p_clerk_user_id, p_action_type, 1, v_window_start, v_window_end);
      RETURN TRUE;
    EXCEPTION WHEN unique_violation THEN
      -- Someone else inserted concurrently; retry
      CONTINUE;
    END;
  END LOOP;
END;
$$;

-- 7) Populate a default key metadata row (version=1) if absent
INSERT INTO flowvault_encryption_keys (version, key_identifier, is_active)
SELECT 1, 'initial', true
WHERE NOT EXISTS (SELECT 1 FROM flowvault_encryption_keys WHERE version = 1);

-- 8) Ensure existing rows have encryption_key_version set
UPDATE flowvault_user_settings SET encryption_key_version = 1 WHERE encryption_key_version IS NULL;
UPDATE flowvault_workflow_backups SET encryption_key_version = 1 WHERE encryption_key_version IS NULL;

-- Migration complete
```