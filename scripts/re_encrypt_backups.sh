#!/bin/bash
# Re-encrypt Backups Wrapper Script
# Provides safer defaults and environment variable checks

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}FlowVault Backup Re-encryption Tool${NC}"
echo -e "${GREEN}========================================${NC}"

# Check required environment variables
# Accept NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL
if [ -z "$SUPABASE_URL" ] && [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo -e "${RED}Error: SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL not set${NC}"
  exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo -e "${RED}Error: SUPABASE_SERVICE_ROLE_KEY not set${NC}"
  exit 1
fi

# Prefer FLOWVAULT_NEW_ENCRYPTION_KEY as the new key env var
if [ -z "$FLOWVAULT_NEW_ENCRYPTION_KEY" ] && [ -z "$FLOWVAULT_ENCRYPTION_KEY" ]; then
  echo -e "${RED}Error: FLOWVAULT_NEW_ENCRYPTION_KEY (new key) not set${NC}"
  exit 1
fi

if [ -z "$FLOWVAULT_OLD_ENCRYPTION_KEY" ]; then
  echo -e "${YELLOW}Warning: FLOWVAULT_OLD_ENCRYPTION_KEY not set${NC}"
  echo -e "${YELLOW}You may need to provide --old-key flag or ensure old key is available in environment${NC}"
fi

# Default to dry-run unless --confirm is passed
if [[ ! "$*" =~ "--confirm" ]]; then
  echo -e "${YELLOW}Running in DRY RUN mode (no changes will be made)${NC}"
  echo -e "${YELLOW}Add --confirm flag to apply changes${NC}"
  echo ""
fi

# Run the TypeScript script
npx tsx scripts/re_encrypt_backups.ts "$@"
