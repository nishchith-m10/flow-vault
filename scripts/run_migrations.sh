#!/bin/bash
# Run database migrations safely
# Usage: ./scripts/run_migrations.sh [migration-file]

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}FlowVault Migration Runner${NC}"
echo -e "${GREEN}========================================${NC}"

# Check environment variables
if [ -z "$SUPABASE_URL" ]; then
  echo -e "${RED}Error: SUPABASE_URL not set${NC}"
  exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo -e "${RED}Error: SUPABASE_SERVICE_ROLE_KEY not set${NC}"
  exit 1
fi

# Extract connection details from SUPABASE_URL
# Format: https://xxxxx.supabase.co
PROJECT_REF=$(echo "$SUPABASE_URL" | sed -E 's|https://([^.]+)\.supabase\.co|\1|')
PGHOST="db.${PROJECT_REF}.supabase.co"
PGUSER="postgres"
PGDATABASE="postgres"
PGPASSWORD="$SUPABASE_SERVICE_ROLE_KEY"

export PGHOST PGUSER PGDATABASE PGPASSWORD

echo "Project: $PROJECT_REF"
echo "Host: $PGHOST"
echo ""

# If specific migration file provided
if [ -n "$1" ]; then
  MIGRATION_FILE="$1"
  
  if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}Error: Migration file not found: $MIGRATION_FILE${NC}"
    exit 1
  fi
  
  echo -e "${YELLOW}Running migration: $MIGRATION_FILE${NC}"
  psql -f "$MIGRATION_FILE"
  echo -e "${GREEN}✓ Migration applied successfully${NC}"
else
  # Run all migrations in order
  echo -e "${YELLOW}Running all migrations in supabase/migrations/${NC}"
  
  for file in supabase/migrations/*.sql; do
    if [ -f "$file" ]; then
      echo ""
      echo -e "${YELLOW}Applying: $file${NC}"
      psql -f "$file"
      echo -e "${GREEN}✓ $(basename $file) applied${NC}"
    fi
  done
  
  echo ""
  echo -e "${GREEN}========================================${NC}"
  echo -e "${GREEN}All migrations applied successfully${NC}"
  echo -e "${GREEN}========================================${NC}"
fi
