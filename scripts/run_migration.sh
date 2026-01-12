#!/bin/bash

# Run Supabase migration using REST API
# This script reads the migration SQL and executes it via Supabase's PostgREST API

# Load environment variables
source .env.local 2>/dev/null || true

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ Missing Supabase credentials in .env.local"
  exit 1
fi

echo "🔗 Connecting to Supabase..."
echo "   URL: $NEXT_PUBLIC_SUPABASE_URL"
echo ""

# Read the migration SQL file
MIGRATION_SQL=$(cat supabase/migrations/001_initial_schema.sql)

echo "📝 Executing migration via Supabase SQL Editor API..."
echo ""

# Execute SQL using Supabase's query endpoint
RESPONSE=$(curl -s -X POST \
  "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$MIGRATION_SQL" | jq -Rs .)}")

if echo "$RESPONSE" | grep -q "error"; then
  echo "⚠️  Direct API execution not available."
  echo ""
  echo "📋 Please run the migration manually:"
  echo ""
  echo "1. Go to: https://supabase.com/dashboard/project/ixndaxvmrpkvurxqxaiw/sql/new"
  echo "2. Copy the contents of: supabase/migrations/001_initial_schema.sql"
  echo "3. Paste into the SQL editor"
  echo "4. Click 'Run' (or press Ctrl+Enter)"
  echo ""
  echo "💡 The migration file is ready at:"
  echo "   $PWD/supabase/migrations/001_initial_schema.sql"
else
  echo "✅ Migration executed successfully!"
  echo ""
  echo "🎉 Database schema is ready!"
  echo ""
  echo "Verify in Supabase Dashboard → Table Editor:"
  echo "   ✓ user_settings"
  echo "   ✓ workflow_backups"
  echo "   ✓ archived_workflows"
  echo "   ✓ trash"
  echo "   ✓ agent_audit_log"
  echo "   ✓ workflow_tags"
  echo "   ✓ rate_limit_counters"
fi
