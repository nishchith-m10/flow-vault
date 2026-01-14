-- Migration 009: Standardize clerk_user_id column naming
-- Purpose: Fix schema inconsistency where migration 008 recreated user_settings with clerk_user_id
-- but other tables still have user_id from migration 002 rename

-- This migration standardizes ALL user-related tables to use clerk_user_id

-- Step 1: Update workflow_backups table (renamed from flowvault_workflow_backups in migration 002)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public'
             AND table_name='workflow_backups'
             AND column_name='user_id') THEN
    ALTER TABLE workflow_backups RENAME COLUMN user_id TO clerk_user_id;
    -- Update index names for clarity
    ALTER INDEX IF EXISTS idx_workflow_backups_user RENAME TO idx_workflow_backups_clerk_user;
  END IF;
END;
$$;

-- Step 2: Update archived_workflows table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public'
             AND table_name='archived_workflows'
             AND column_name='user_id') THEN
    ALTER TABLE archived_workflows RENAME COLUMN user_id TO clerk_user_id;
    ALTER INDEX IF EXISTS idx_archived_workflows_user RENAME TO idx_archived_workflows_clerk_user;
  END IF;
END;
$$;

-- Step 3: Update trash table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public'
             AND table_name='trash'
             AND column_name='user_id') THEN
    ALTER TABLE trash RENAME COLUMN user_id TO clerk_user_id;
    ALTER INDEX IF EXISTS idx_trash_user RENAME TO idx_trash_clerk_user;
  END IF;
END;
$$;

-- Step 4: Update workflow_tags table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public'
             AND table_name='workflow_tags'
             AND column_name='user_id') THEN
    ALTER TABLE workflow_tags RENAME COLUMN user_id TO clerk_user_id;
    ALTER INDEX IF EXISTS idx_workflow_tags_user RENAME TO idx_workflow_tags_clerk_user;
  END IF;
END;
$$;

-- Step 5: Update rate_limit_counters table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public'
             AND table_name='rate_limit_counters'
             AND column_name='user_id') THEN
    ALTER TABLE rate_limit_counters RENAME COLUMN user_id TO clerk_user_id;
    ALTER INDEX IF EXISTS idx_rate_limit_user_action RENAME TO idx_rate_limit_clerk_user_action;
  END IF;
END;
$$;

-- Step 6: Update agent_audit_log table (nullable column)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public'
             AND table_name='agent_audit_log'
             AND column_name='user_id') THEN
    ALTER TABLE agent_audit_log RENAME COLUMN user_id TO clerk_user_id;
    ALTER INDEX IF EXISTS idx_audit_log_user RENAME TO idx_audit_log_clerk_user;
  END IF;
END;
$$;

-- Step 7: Recreate RLS policies for workflow_backups with updated column name
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can view own backups" ON workflow_backups;
  DROP POLICY IF EXISTS "Users can insert own backups" ON workflow_backups;
  DROP POLICY IF EXISTS "Users can delete own backups" ON workflow_backups;

  -- Create new policies with correct column name
  CREATE POLICY "Users can view own backups"
    ON workflow_backups FOR SELECT
    USING (clerk_user_id = current_setting('app.clerk_user_id', true));

  CREATE POLICY "Users can insert own backups"
    ON workflow_backups FOR INSERT
    WITH CHECK (clerk_user_id = current_setting('app.clerk_user_id', true));

  CREATE POLICY "Users can delete own backups"
    ON workflow_backups FOR DELETE
    USING (clerk_user_id = current_setting('app.clerk_user_id', true));
END;
$$;

-- Step 8: Recreate RLS policies for archived_workflows with updated column name
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own archived workflows" ON archived_workflows;
  DROP POLICY IF EXISTS "Users can insert own archived workflows" ON archived_workflows;
  DROP POLICY IF EXISTS "Users can update own archived workflows" ON archived_workflows;
  DROP POLICY IF EXISTS "Users can delete own archived workflows" ON archived_workflows;

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
END;
$$;

-- Step 9: Recreate RLS policies for trash with updated column name
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own trash" ON trash;
  DROP POLICY IF EXISTS "Users can insert own trash" ON trash;
  DROP POLICY IF EXISTS "Users can delete own trash" ON trash;

  CREATE POLICY "Users can view own trash"
    ON trash FOR SELECT
    USING (clerk_user_id = current_setting('app.clerk_user_id', true));

  CREATE POLICY "Users can insert own trash"
    ON trash FOR INSERT
    WITH CHECK (clerk_user_id = current_setting('app.clerk_user_id', true));

  CREATE POLICY "Users can delete own trash"
    ON trash FOR DELETE
    USING (clerk_user_id = current_setting('app.clerk_user_id', true));
END;
$$;

-- Step 10: Recreate RLS policies for workflow_tags with updated column name
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own tags" ON workflow_tags;
  DROP POLICY IF EXISTS "Users can manage own tags" ON workflow_tags;

  CREATE POLICY "Users can view own tags"
    ON workflow_tags FOR SELECT
    USING (clerk_user_id = current_setting('app.clerk_user_id', true));

  CREATE POLICY "Users can manage own tags"
    ON workflow_tags FOR ALL
    USING (clerk_user_id = current_setting('app.clerk_user_id', true))
    WITH CHECK (clerk_user_id = current_setting('app.clerk_user_id', true));
END;
$$;

-- Step 11: Recreate RLS policies for rate_limit_counters with updated column name
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own rate limits" ON rate_limit_counters;
  DROP POLICY IF EXISTS "Users can manage own rate limits" ON rate_limit_counters;

  CREATE POLICY "Users can view own rate limits"
    ON rate_limit_counters FOR SELECT
    USING (clerk_user_id = current_setting('app.clerk_user_id', true));

  CREATE POLICY "Users can manage own rate limits"
    ON rate_limit_counters FOR ALL
    USING (clerk_user_id = current_setting('app.clerk_user_id', true))
    WITH CHECK (clerk_user_id = current_setting('app.clerk_user_id', true));
END;
$$;

-- Step 12: Recreate RLS policies for agent_audit_log with updated column name
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own audit logs" ON agent_audit_log;

  CREATE POLICY "Users can view own audit logs"
    ON agent_audit_log FOR SELECT
    USING (clerk_user_id = current_setting('app.clerk_user_id', true));
END;
$$;

-- Migration complete: all tables now use clerk_user_id consistently
