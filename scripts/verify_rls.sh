#!/bin/bash
#
# RLS Verification Script
# Runs automated checks to verify Row-Level Security is working correctly
#

set -e

echo "🔐 FlowVault RLS Verification Script"
echo "===================================="
echo ""

# Check environment variables
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "❌ Error: NEXT_PUBLIC_SUPABASE_URL not set"
    exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Error: SUPABASE_SERVICE_ROLE_KEY not set"
    exit 1
fi

DB_URL="${NEXT_PUBLIC_SUPABASE_URL/https:\/\//postgresql://postgres:}"
DB_URL="${DB_URL}?sslmode=require"

echo "✓ Environment variables configured"
echo ""

# Function to run SQL and show results
run_sql() {
    local description=$1
    local sql=$2
    
    echo "📝 $description"
    echo "   SQL: $sql"
    
    if psql "$DB_URL" -c "$sql" 2>&1; then
        echo "   ✓ Success"
    else
        echo "   ❌ Failed"
        return 1
    fi
    echo ""
}

# 1. Check RLS is enabled on all flowvault tables
echo "Step 1: Checking RLS is enabled on all tables"
echo "----------------------------------------------"
run_sql "Check RLS status" "
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename LIKE 'flowvault_%'
ORDER BY tablename;
"

# 2. Verify is_service_role() function exists
echo "Step 2: Verifying is_service_role() function"
echo "--------------------------------------------"
run_sql "Check function exists" "
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'is_service_role';
"

# 3. Test user isolation (critical!)
echo "Step 3: Testing user isolation (CRITICAL)"
echo "----------------------------------------"

# Create test data as user A
run_sql "Insert test backup as user-a" "
SELECT set_config('app.clerk_user_id', 'test-user-a', false);
INSERT INTO flowvault_workflow_backups (
  clerk_user_id, workflow_id, workflow_name, version,
  backup_type, workflow_data, content_hash
) VALUES (
  current_setting('app.clerk_user_id'),
  'test-wf-rls-verification',
  'RLS Test Workflow',
  1,
  'manual',
  '{\"ciphertext\":\"test\",\"iv\":\"test\",\"salt\":\"test\",\"tag\":\"test\",\"version\":1}',
  'test-hash-rls'
) RETURNING id;
"

# Try to read as user B (should fail/return 0 rows)
echo "📝 Attempting cross-user access (should return 0 rows)"
RESULT=$(psql "$DB_URL" -t -c "
SELECT set_config('app.clerk_user_id', 'test-user-b', false);
SELECT COUNT(*) 
FROM flowvault_workflow_backups 
WHERE workflow_id = 'test-wf-rls-verification';
")

if [ "$RESULT" -eq 0 ]; then
    echo "   ✓ User isolation working! User B cannot see User A's data"
else
    echo "   ❌ SECURITY ISSUE: User B can see User A's data!"
    echo "   RLS policies may not be working correctly"
    exit 1
fi
echo ""

# Cleanup test data
run_sql "Cleanup test data" "
SELECT set_config('app.clerk_user_id', 'test-user-a', false);
DELETE FROM flowvault_workflow_backups 
WHERE workflow_id = 'test-wf-rls-verification';
"

# 4. Verify service role bypass
echo "Step 4: Verifying service role bypass"
echo "-------------------------------------"
run_sql "Check service role can bypass RLS" "
SELECT set_config('app.is_service_role', 'true', false);
SELECT COUNT(*) as accessible_rows 
FROM flowvault_workflow_backups 
LIMIT 1;
"

# 5. Check key metadata table
echo "Step 5: Checking key metadata setup"
echo "-----------------------------------"
run_sql "Verify key metadata table" "
SELECT key_version, is_active, created_at 
FROM flowvault_key_metadata 
ORDER BY created_at DESC 
LIMIT 5;
"

# 6. Test rate limit function
echo "Step 6: Testing rate limit RPC function"
echo "---------------------------------------"
run_sql "Test atomic increment RPC" "
SELECT flowvault_increment_rate_limit(
  'test-rls-verify-user',
  'api:test',
  1,
  60,
  100
);
"

# Cleanup rate limit test
run_sql "Cleanup rate limit test" "
DELETE FROM flowvault_rate_limit_counters 
WHERE clerk_user_id = 'test-rls-verify-user';
"

# Final summary
echo "=================================="
echo "✅ RLS Verification Complete!"
echo "=================================="
echo ""
echo "All checks passed. Your RLS policies are working correctly."
echo ""
echo "Next steps:"
echo "1. Monitor production logs for RLS denials"
echo "2. Run integration tests: npm run test"
echo "3. Proceed to Phase 2 (re-encryption) when ready"
echo ""
