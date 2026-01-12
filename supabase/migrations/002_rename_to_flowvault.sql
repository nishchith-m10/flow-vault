-- Migration: 004_rename_to_flowvault.sql
-- Description: Rename existing tables/columns to flowvault_* and normalize user_id column name
-- Safety: Idempotent (uses IF EXISTS / IF NOT EXISTS guards)

-- Rename tables to 'flowvault_' prefix if they haven't been renamed yet
ALTER TABLE IF EXISTS public.user_settings RENAME TO flowvault_user_settings;
ALTER TABLE IF EXISTS public.workflow_backups RENAME TO flowvault_workflow_backups;
ALTER TABLE IF EXISTS public.archived_workflows RENAME TO flowvault_archived_workflows;
ALTER TABLE IF EXISTS public.trash RENAME TO flowvault_trash;
ALTER TABLE IF EXISTS public.agent_audit_log RENAME TO flowvault_agent_audit_log;
ALTER TABLE IF EXISTS public.workflow_tags RENAME TO flowvault_workflow_tags;
ALTER TABLE IF EXISTS public.rate_limit_counters RENAME TO flowvault_rate_limit_counters;

-- Rename clerk_user_id -> user_id on renamed tables if column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='flowvault_user_settings' AND column_name='clerk_user_id') THEN
    ALTER TABLE public.flowvault_user_settings RENAME COLUMN clerk_user_id TO user_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='flowvault_workflow_backups' AND column_name='clerk_user_id') THEN
    ALTER TABLE public.flowvault_workflow_backups RENAME COLUMN clerk_user_id TO user_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='flowvault_archived_workflows' AND column_name='clerk_user_id') THEN
    ALTER TABLE public.flowvault_archived_workflows RENAME COLUMN clerk_user_id TO user_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='flowvault_trash' AND column_name='clerk_user_id') THEN
    ALTER TABLE public.flowvault_trash RENAME COLUMN clerk_user_id TO user_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='flowvault_workflow_tags' AND column_name='clerk_user_id') THEN
    ALTER TABLE public.flowvault_workflow_tags RENAME COLUMN clerk_user_id TO user_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='flowvault_rate_limit_counters' AND column_name='clerk_user_id') THEN
    ALTER TABLE public.flowvault_rate_limit_counters RENAME COLUMN clerk_user_id TO user_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Recreate / rename indexes to expected names (guarded)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='flowvault_user_settings' AND indexname='idx_user_settings_clerk_id') THEN
    EXECUTE 'ALTER INDEX idx_user_settings_clerk_id RENAME TO idx_flowvault_user_settings_user_id';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='flowvault_user_settings' AND indexname='idx_flowvault_user_settings_user_id') THEN
    BEGIN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_flowvault_user_settings_user_id ON public.flowvault_user_settings(user_id)';
    EXCEPTION WHEN others THEN
      -- ignore
    END;
  END IF;

  -- Workflow backups indexes
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='flowvault_workflow_backups' AND indexname='idx_workflow_backups_user') THEN
    EXECUTE 'ALTER INDEX idx_workflow_backups_user RENAME TO idx_flowvault_workflow_backups_user';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='flowvault_workflow_backups' AND indexname='idx_flowvault_workflow_backups_user') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_flowvault_workflow_backups_user ON public.flowvault_workflow_backups(user_id)';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Ensure foreign key references remain valid (last_backup_id)
-- If last_backup_id references workflow_backups, update to new table name if necessary
-- Note: referencing is by table name, not required to change here because renaming preserves FK

-- Final sanity checks
COMMENT ON TABLE public.flowvault_user_settings IS 'Renamed from user_settings by 004_rename_to_flowvault.sql';
COMMENT ON TABLE public.flowvault_workflow_backups IS 'Renamed from workflow_backups by 004_rename_to_flowvault.sql';

