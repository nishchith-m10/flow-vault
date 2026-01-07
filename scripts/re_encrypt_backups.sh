#!/bin/bash
# scripts/re_encrypt_backups.sh

# This script runs the re-encryption script using ts-node.
# It passes all command-line arguments to the script.

# Example usage:
# ./scripts/re_encrypt_backups.sh --dry-run --limit 50

# Ensure that the required environment variables are set, e.g.,
# export SUPABASE_SERVICE_ROLE_KEY="..."
# export ENCRYPTION_KEY_v1="..."
# export ENCRYPTION_KEY_v2="..."

# Run the TypeScript script
npx ts-node scripts/re_encrypt_backups.ts "$@"
