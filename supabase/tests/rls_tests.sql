-- RLS tests for flowvault_* tables
-- Run with: psql 'postgres://<user>:<pass>@<host>:<port>/<db>' -f supabase/tests/rls_tests.sql
-- Or paste into Supabase SQL editor and run step-by-step

-- Clean slate (test-only)
TRUNCATE TABLE flowvault_user_settings CASCADE;
TRUNCATE TABLE flowvault_workflow_backups CASCADE;
TRUNCATE TABLE flowvault_rate_limit_counters CASCADE;

-- Insert test rows
INSERT INTO flowvault_user_settings (clerk_user_id, n8n_instance_url, n8n_api_key_encrypted, encryption_iv)
VALUES
('user_a', 'https://a.example', 'enc', 'iv'),
('user_b', 'https://b.example', 'enc', 'iv');

INSERT INTO flowvault_workflow_backups (clerk_user_id, workflow_id, workflow_name, workflow_data, content_hash, version)
VALUES
('user_a', 'w1', 'Workflow A1', '{}'::jsonb, 'h1', 1),
('user_b', 'w2', 'Workflow B1', '{}'::jsonb, 'h2', 1);

-- 1) Set session as user_a
SELECT set_config('app.clerk_user_id', 'user_a', true);

-- Should return only user_a rows
SELECT 'user_settings' as tbl, count(*) FROM flowvault_user_settings;
SELECT 'backups' as tbl, count(*) FROM flowvault_workflow_backups;

-- 2) Switch to user_b
SELECT set_config('app.clerk_user_id', 'user_b', true);
SELECT 'user_settings' as tbl, count(*) FROM flowvault_user_settings;
SELECT 'backups' as tbl, count(*) FROM flowvault_workflow_backups;

-- 3) As service role
SELECT set_config('app.is_service_role', 'true', true);
SELECT 'user_settings_all' as tbl, count(*) FROM flowvault_user_settings;
SELECT 'backups_all' as tbl, count(*) FROM flowvault_workflow_backups;

-- 4) Rate limiter RPC
SELECT increment_rate_limit('user_a', 'manual_backup', 2, 3600) as allowed; -- true
SELECT increment_rate_limit('user_a', 'manual_backup', 2, 3600) as allowed; -- true
SELECT increment_rate_limit('user_a', 'manual_backup', 2, 3600) as allowed; -- false (exceeded)

-- Clean up test data
TRUNCATE TABLE flowvault_user_settings CASCADE;
TRUNCATE TABLE flowvault_workflow_backups CASCADE;
TRUNCATE TABLE flowvault_rate_limit_counters CASCADE;

-- End of tests
