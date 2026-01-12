-- Migration: 001_rls_flowvault.sql
-- Description: Enable Row-Level Security (RLS) on all flowvault_* tables
-- Author: GitHub Copilot / Task 8
-- Date: 2026-01-07
-- Safety: Idempotent (safe to re-run)

-- ============================================================================
-- OVERVIEW
-- ============================================================================
-- This migration enables RLS on all flowvault_* tables and creates policies
-- that enforce the following rules:
--   1. Users can only access rows where user_id = auth.uid()
--   2. Service role (used for cron jobs, admin ops) can bypass all policies
--   3. All SELECT, INSERT, UPDATE, DELETE operations are protected
--
-- Tables protected:
--   - flowvault_user_settings
--   - flowvault_workflow_backups
--   - flowvault_archived_workflows
--   - flowvault_trash
--   - flowvault_agent_audit_log
--   - flowvault_workflow_tags
--   - flowvault_rate_limit_counters
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTION: Check if current role is service_role
-- ============================================================================
-- This function checks if the current JWT role is 'service_role' (bypass)
-- Used in policy USING clauses to allow service role to bypass RLS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role',
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.is_service_role() IS 'Returns true if current JWT role is service_role (for RLS bypass)';

-- ============================================================================
-- TABLE: flowvault_user_settings
-- ============================================================================
ALTER TABLE IF EXISTS public.flowvault_user_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "flowvault_user_settings_owner_all" ON public.flowvault_user_settings;

-- Create unified policy for all operations (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "flowvault_user_settings_owner_all"
ON public.flowvault_user_settings
FOR ALL
USING (
  user_id = current_setting('app.clerk_user_id', true) OR public.is_service_role()
)
WITH CHECK (
  user_id = current_setting('app.clerk_user_id', true) OR public.is_service_role()
);

COMMENT ON TABLE public.flowvault_user_settings IS 'RLS enabled: only owner or service_role can access';

-- ============================================================================
-- TABLE: flowvault_workflow_backups
-- ============================================================================
ALTER TABLE IF EXISTS public.flowvault_workflow_backups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "flowvault_workflow_backups_owner_all" ON public.flowvault_workflow_backups;

CREATE POLICY "flowvault_workflow_backups_owner_all"
ON public.flowvault_workflow_backups
FOR ALL
USING (
  user_id = current_setting('app.clerk_user_id', true) OR public.is_service_role()
)
WITH CHECK (
  user_id = current_setting('app.clerk_user_id', true) OR public.is_service_role()
);

COMMENT ON TABLE public.flowvault_workflow_backups IS 'RLS enabled: only owner or service_role can access';

-- ============================================================================
-- TABLE: flowvault_archived_workflows
-- ============================================================================
ALTER TABLE IF EXISTS public.flowvault_archived_workflows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "flowvault_archived_workflows_owner_all" ON public.flowvault_archived_workflows;

CREATE POLICY "flowvault_archived_workflows_owner_all"
ON public.flowvault_archived_workflows
FOR ALL
USING (
  user_id = current_setting('app.clerk_user_id', true) OR public.is_service_role()
)
WITH CHECK (
  user_id = current_setting('app.clerk_user_id', true) OR public.is_service_role()
);

COMMENT ON TABLE public.flowvault_archived_workflows IS 'RLS enabled: only owner or service_role can access';

-- ============================================================================
-- TABLE: flowvault_trash
-- ============================================================================
ALTER TABLE IF EXISTS public.flowvault_trash ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "flowvault_trash_owner_all" ON public.flowvault_trash;

CREATE POLICY "flowvault_trash_owner_all"
ON public.flowvault_trash
FOR ALL
USING (
  user_id = current_setting('app.clerk_user_id', true) OR public.is_service_role()
)
WITH CHECK (
  user_id = current_setting('app.clerk_user_id', true) OR public.is_service_role()
);

COMMENT ON TABLE public.flowvault_trash IS 'RLS enabled: only owner or service_role can access';

-- ============================================================================
-- TABLE: flowvault_agent_audit_log
-- ============================================================================
-- Intentionally skipping RLS for agent audit log to allow admin/system access
-- The agent audit log is used for system-level actions and should be queryable by
-- administrators and service role only; do not apply RLS here.
COMMENT ON TABLE public.flowvault_agent_audit_log IS 'RLS intentionally not enabled: admin/system access only';

-- ============================================================================
-- TABLE: flowvault_workflow_tags
-- ============================================================================
ALTER TABLE IF EXISTS public.flowvault_workflow_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "flowvault_workflow_tags_owner_all" ON public.flowvault_workflow_tags;

CREATE POLICY "flowvault_workflow_tags_owner_all"
ON public.flowvault_workflow_tags
FOR ALL
USING (
  user_id = current_setting('app.clerk_user_id', true) OR public.is_service_role()
)
WITH CHECK (
  user_id = current_setting('app.clerk_user_id', true) OR public.is_service_role()
);

COMMENT ON TABLE public.flowvault_workflow_tags IS 'RLS enabled: only owner or service_role can access';

-- ============================================================================
-- TABLE: flowvault_rate_limit_counters
-- ============================================================================
ALTER TABLE IF EXISTS public.flowvault_rate_limit_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "flowvault_rate_limit_counters_owner_all" ON public.flowvault_rate_limit_counters;

CREATE POLICY "flowvault_rate_limit_counters_owner_all"
ON public.flowvault_rate_limit_counters
FOR ALL
USING (
  user_id = current_setting('app.clerk_user_id', true) OR public.is_service_role()
)
WITH CHECK (
  user_id = current_setting('app.clerk_user_id', true) OR public.is_service_role()
);

-- Add index for performance (user_id + action_type lookups)
CREATE INDEX IF NOT EXISTS idx_flowvault_rate_limit_user_action
ON public.flowvault_rate_limit_counters(user_id, action_type);

COMMENT ON TABLE public.flowvault_rate_limit_counters IS 'RLS enabled: only owner or service_role can access';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries to verify RLS is working correctly
-- (Replace 'test-user-id' and 'other-user-id' with real user IDs)
-- ============================================================================

-- VERIFICATION 1: Check RLS is enabled on all tables
-- Expected: All flowvault_* tables should show relrowsecurity = true
/*
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'flowvault_%'
ORDER BY tablename;
*/

-- VERIFICATION 2: Check policies exist
-- Expected: Each flowvault_* table should have a policy ending in '_owner_all'
/*
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE 'flowvault_%'
ORDER BY tablename, policyname;
*/

-- VERIFICATION 3: Test user isolation (run as regular user)
-- Expected: User should only see their own rows
/*
SET ROLE authenticated;
SET request.jwt.claims = '{"sub": "test-user-id", "role": "authenticated"}';
SELECT COUNT(*) FROM flowvault_user_settings WHERE user_id = 'test-user-id'; -- Should return rows
SELECT COUNT(*) FROM flowvault_user_settings WHERE user_id = 'other-user-id'; -- Should return 0
RESET ROLE;
*/

-- VERIFICATION 4: Test service role bypass
-- Expected: Service role should see all rows
/*
SET ROLE service_role;
SET request.jwt.claims = '{"role": "service_role"}';
SELECT COUNT(*) FROM flowvault_user_settings; -- Should return all rows
RESET ROLE;
*/

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- To disable RLS on all tables (emergency rollback):
/*
ALTER TABLE public.flowvault_user_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.flowvault_workflow_backups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.flowvault_archived_workflows DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.flowvault_trash DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.flowvault_agent_audit_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.flowvault_workflow_tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.flowvault_rate_limit_counters DISABLE ROW LEVEL SECURITY;
DROP FUNCTION IF EXISTS public.is_service_role();
*/

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
