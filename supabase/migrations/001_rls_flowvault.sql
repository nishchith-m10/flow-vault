-- Migration: 001_rls_flowvault.sql
-- Description: Enables Row-Level Security (RLS) for all flowvault_* tables.
-- Order: This migration must be applied before 002_key_metadata.sql.

-- Make sure to run this with a role that has the necessary permissions, e.g., the postgres user.
-- PGPASSWORD="$SUPABASE_SERVICE_ROLE_KEY" psql "$SUPABASE_DB_URL" -f supabase/migrations/001_rls_flowvault.sql

-- For Supabase, the service_role is a super-admin role that bypasses RLS.
-- We will create policies that allow access to the owner (matching user_id with auth.uid())
-- and the service role.

BEGIN;

-- Table: flowvault_user_settings
ALTER TABLE IF EXISTS public.flowvault_user_settings ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.flowvault_user_settings IS 'RLS: only owner or service role may access';
CREATE POLICY "flowvault_user_settings_owner_access" ON public.flowvault_user_settings
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Table: flowvault_workflow_backups
ALTER TABLE IF EXISTS public.flowvault_workflow_backups ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.flowvault_workflow_backups IS 'RLS: only owner or service role may access';
CREATE POLICY "flowvault_backups_owner_access" ON public.flowvault_workflow_backups
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Table: flowvault_archived_workflows
ALTER TABLE IF EXISTS public.flowvault_archived_workflows ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.flowvault_archived_workflows IS 'RLS: only owner or service role may access';
CREATE POLICY "flowvault_archived_workflows_owner_access" ON public.flowvault_archived_workflows
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Table: flowvault_trash
ALTER TABLE IF EXISTS public.flowvault_trash ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.flowvault_trash IS 'RLS: only owner or service role may access';
CREATE POLICY "flowvault_trash_owner_access" ON public.flowvault_trash
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Table: flowvault_agent_audit_log
ALTER TABLE IF EXISTS public.flowvault_agent_audit_log ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.flowvault_agent_audit_log IS 'RLS: only owner or service role may access';
CREATE POLICY "flowvault_agent_audit_log_owner_access" ON public.flowvault_agent_audit_log
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Table: flowvault_workflow_tags
ALTER TABLE IF EXISTS public.flowvault_workflow_tags ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.flowvault_workflow_tags IS 'RLS: only owner or service role may access';
CREATE POLICY "flowvault_workflow_tags_owner_access" ON public.flowvault_workflow_tags
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Table: flowvault_rate_limit_counters
ALTER TABLE IF EXISTS public.flowvault_rate_limit_counters ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.flowvault_rate_limit_counters IS 'RLS: only owner or service role may access';
CREATE POLICY "flowvault_rate_limit_counters_owner_access" ON public.flowvault_rate_limit_counters
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- Verification queries:
-- Note: To run these, you need to be connected to the database.
-- 1. As a regular user (JWT required):
--    - `SELECT COUNT(*) FROM flowvault_workflow_backups;` -- Should only return count of your own backups.
--    - `SELECT COUNT(*) FROM flowvault_workflow_backups WHERE user_id = 'some-other-user-uuid';` -- Should return 0.
-- 2. As the service_role (using service role key):
--    - `SET ROLE service_role;`
--    - `SELECT COUNT(*) FROM flowvault_workflow_backups;` -- Should return total count of all backups.
--    - `RESET ROLE;`

COMMIT;
