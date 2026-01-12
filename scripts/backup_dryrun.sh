#!/bin/bash

# FlowVault Backup Dry-Run Script
# SAMPLE - DO NOT COMMIT TO GIT
#
# Purpose: Test backup system without writing to database
# Usage: ./scripts/backup_dryrun.sh

set -e  # Exit on error

echo "🔍 FlowVault Backup Dry-Run"
echo "============================"
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo "❌ Error: .env.local not found"
  echo "Please create .env.local with required environment variables"
  exit 1
fi

# Load environment variables
export $(cat .env.local | grep -v '^#' | xargs)

# Validate required environment variables
if [ -z "$N8N_API_URL" ]; then
  echo "❌ Error: N8N_API_URL not set in .env.local"
  exit 1
fi

if [ -z "$N8N_API_KEY" ]; then
  echo "❌ Error: N8N_API_KEY not set in .env.local"
  exit 1
fi

if [ -z "$ENCRYPTION_KEY" ]; then
  echo "⚠️  Warning: ENCRYPTION_KEY not set (credentials will not be encrypted)"
fi

echo "✅ Environment variables loaded"
echo ""

# Test n8n API connectivity
echo "📡 Testing n8n API connectivity..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  "$N8N_API_URL/api/v1/workflows")

if [ "$HTTP_CODE" != "200" ]; then
  echo "❌ Error: n8n API returned HTTP $HTTP_CODE"
  echo "Check N8N_API_URL and N8N_API_KEY in .env.local"
  exit 1
fi

echo "✅ n8n API connected (HTTP $HTTP_CODE)"
echo ""

# Fetch workflows
echo "📥 Fetching workflows from n8n..."
WORKFLOWS=$(curl -s \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  "$N8N_API_URL/api/v1/workflows")

# Check if response is valid JSON
if ! echo "$WORKFLOWS" | jq empty 2>/dev/null; then
  echo "❌ Error: Invalid JSON response from n8n API"
  echo "Response: $WORKFLOWS"
  exit 1
fi

# Count workflows
WORKFLOW_COUNT=$(echo "$WORKFLOWS" | jq '.data | length')
echo "✅ Found $WORKFLOW_COUNT workflows"
echo ""

# Process each workflow
echo "🔐 Computing hashes (deduplication check)..."
CHANGED_COUNT=0

# Create a temporary file to store results
RESULTS_FILE=$(mktemp)

echo "$WORKFLOWS" | jq -c '.data[]' | while read -r workflow; do
  WORKFLOW_ID=$(echo "$workflow" | jq -r '.id')
  WORKFLOW_NAME=$(echo "$workflow" | jq -r '.name')
  
  # Remove timestamp fields for stable hash
  STABLE_JSON=$(echo "$workflow" | jq 'del(.updatedAt, .createdAt)')
  
  # Compute SHA-256 hash
  HASH=$(echo "$STABLE_JSON" | shasum -a 256 | cut -d' ' -f1)
  
  # In a real backup, we'd compare with last backup hash from DB
  # For dry-run, we'll just log what we would do
  
  echo "  - $WORKFLOW_NAME (ID: $WORKFLOW_ID)" | tee -a "$RESULTS_FILE"
  echo "    Hash: $HASH" | tee -a "$RESULTS_FILE"
  echo "    [DRY-RUN] Would check if hash differs from last backup" | tee -a "$RESULTS_FILE"
  echo "" | tee -a "$RESULTS_FILE"
  
  # Simulate change detection (randomly for demo)
  if [ $((RANDOM % 3)) -eq 0 ]; then
    echo "    ✨ [SIMULATED] Hash differs, would save new backup" | tee -a "$RESULTS_FILE"
    CHANGED_COUNT=$((CHANGED_COUNT + 1))
  else
    echo "    ⏭️  [SIMULATED] Hash unchanged, would skip backup" | tee -a "$RESULTS_FILE"
  fi
  echo "" | tee -a "$RESULTS_FILE"
done

echo ""
echo "📊 Dry-Run Summary"
echo "=================="
echo "Workflows found: $WORKFLOW_COUNT"
echo "Changes detected (simulated): $CHANGED_COUNT"
echo "Backups that would be skipped: $((WORKFLOW_COUNT - CHANGED_COUNT))"
echo ""

# Calculate storage savings
if [ "$WORKFLOW_COUNT" -gt 0 ]; then
  DEDUP_RATE=$(echo "scale=2; 100 * ($WORKFLOW_COUNT - $CHANGED_COUNT) / $WORKFLOW_COUNT" | bc)
  echo "Deduplication rate: ${DEDUP_RATE}% (backups saved by hash comparison)"
fi

echo ""
echo "✅ Dry-run complete!"
echo ""
echo "Next steps:"
echo "1. Review results above"
echo "2. If everything looks good, enable production backups"
echo "3. Set up automated schedule (cron or Vercel Cron)"
echo ""
echo "📝 Full results saved to: $RESULTS_FILE"
echo ""

# Cleanup
# rm -f "$RESULTS_FILE"  # Uncomment to auto-delete results file
