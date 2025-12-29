#!/bin/bash
# =============================================================================
# Universal n8n Workflow Deployment Script
# Import any workflow JSON files and tag them
#
# Usage:
#   ./n8n_deploy.sh <folder_or_file> [tag_name]
#
# Examples:
#   ./n8n_deploy.sh ./my-workflows "My Project"
#   ./n8n_deploy.sh ./single-workflow.json "Test"
#   ./n8n_deploy.sh ./folder-with-jsons
#
# Environment Variables (required):
#   N8N_API_KEY  - Your n8n API key
#   N8N_URL      - Your n8n instance URL
#
# Requirements:
#   - jq (brew install jq)
#   - curl
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration from environment
N8N_URL="${N8N_URL:-}"
N8N_API_KEY="${N8N_API_KEY:-}"

# Arguments
INPUT_PATH="${1:-}"
TAG_NAME="${2:-}"

# Temp directory
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# =============================================================================
# Functions
# =============================================================================

usage() {
    echo -e "${CYAN}n8n Workflow Deployment Script${NC}"
    echo ""
    echo "Usage: $0 <folder_or_file> [tag_name]"
    echo ""
    echo "Arguments:"
    echo "  folder_or_file  Path to workflow JSON file or folder containing JSONs"
    echo "  tag_name        Optional tag to apply to all imported workflows"
    echo ""
    echo "Environment Variables (required):"
    echo "  N8N_API_KEY     Your n8n API key"
    echo "  N8N_URL         Your n8n instance URL (e.g., https://n8n.example.com)"
    echo ""
    echo "Examples:"
    echo "  export N8N_API_KEY='your-key'"
    echo "  export N8N_URL='https://your-n8n.com'"
    echo "  $0 ./my-workflows 'My Project'"
    echo "  $0 ./workflow.json"
    exit 1
}

check_requirements() {
    local errors=0
    
    if ! command -v jq &> /dev/null; then
        echo -e "${RED}✗ jq not found. Install with: brew install jq${NC}"
        errors=1
    fi
    
    if [ -z "$N8N_API_KEY" ]; then
        echo -e "${RED}✗ N8N_API_KEY not set${NC}"
        errors=1
    fi
    
    if [ -z "$N8N_URL" ]; then
        echo -e "${RED}✗ N8N_URL not set${NC}"
        errors=1
    fi
    
    if [ -z "$INPUT_PATH" ]; then
        echo -e "${RED}✗ No input path provided${NC}"
        errors=1
    elif [ ! -e "$INPUT_PATH" ]; then
        echo -e "${RED}✗ Path not found: $INPUT_PATH${NC}"
        errors=1
    fi
    
    if [ $errors -eq 1 ]; then
        echo ""
        usage
    fi
    
    # Remove trailing slash from URL
    N8N_URL="${N8N_URL%/}"
    
    echo -e "${GREEN}✓ Configuration OK${NC}"
    echo -e "  URL: ${CYAN}$N8N_URL${NC}"
    [ -n "$TAG_NAME" ] && echo -e "  Tag: ${CYAN}$TAG_NAME${NC}"
    echo ""
}

import_workflow() {
    local json_file="$1"
    local filename=$(basename "$json_file")
    local workflow_name="${filename%.json}"
    local temp_file="$TEMP_DIR/clean_${filename}"
    
    printf "  %-40s " "$workflow_name"
    
    # Clean JSON for n8n API (remove extra properties)
    if ! jq '{
        name: .name,
        nodes: .nodes,
        connections: .connections,
        settings: .settings,
        staticData: .staticData
    }' "$json_file" > "$temp_file" 2>/dev/null; then
        echo -e "${RED}✗ Invalid JSON${NC}"
        return 1
    fi
    
    # Import via API
    local response
    response=$(curl -s -X POST "$N8N_URL/api/v1/workflows" \
        -H "X-N8N-API-KEY: $N8N_API_KEY" \
        -H "Content-Type: application/json" \
        -d @"$temp_file" 2>&1)
    
    # Parse result
    local workflow_id
    workflow_id=$(echo "$response" | jq -r '.id // empty' 2>/dev/null)
    
    if [ -n "$workflow_id" ]; then
        echo -e "${GREEN}✓${NC} ID: ${CYAN}$workflow_id${NC}"
        echo "$workflow_id"
        return 0
    else
        local error_msg
        error_msg=$(echo "$response" | jq -r '.message // "Unknown error"' 2>/dev/null)
        echo -e "${RED}✗ $error_msg${NC}"
        return 1
    fi
}

create_tag() {
    local tag_name="$1"
    
    # Try to create
    local response
    response=$(curl -s -X POST "$N8N_URL/api/v1/tags" \
        -H "X-N8N-API-KEY: $N8N_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"name\": \"$tag_name\"}" 2>&1)
    
    local tag_id
    tag_id=$(echo "$response" | jq -r '.id // empty' 2>/dev/null)
    
    if [ -n "$tag_id" ]; then
        echo "$tag_id"
        return 0
    fi
    
    # Might already exist, fetch it
    response=$(curl -s -X GET "$N8N_URL/api/v1/tags" \
        -H "X-N8N-API-KEY: $N8N_API_KEY" 2>&1)
    
    tag_id=$(echo "$response" | jq -r ".data[] | select(.name==\"$tag_name\") | .id" 2>/dev/null | head -1)
    
    [ -n "$tag_id" ] && echo "$tag_id"
}

tag_workflow() {
    local workflow_id="$1"
    local tag_id="$2"
    
    curl -s -X PUT "$N8N_URL/api/v1/workflows/$workflow_id/tags" \
        -H "X-N8N-API-KEY: $N8N_API_KEY" \
        -H "Content-Type: application/json" \
        -d "[{\"id\": \"$tag_id\"}]" > /dev/null 2>&1
}

# =============================================================================
# Main
# =============================================================================

echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   n8n Workflow Deployment Script       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

check_requirements

# Collect JSON files
declare -a JSON_FILES=()

if [ -f "$INPUT_PATH" ]; then
    # Single file
    JSON_FILES+=("$INPUT_PATH")
elif [ -d "$INPUT_PATH" ]; then
    # Directory - find all JSON files recursively
    while IFS= read -r -d '' file; do
        JSON_FILES+=("$file")
    done < <(find "$INPUT_PATH" -name "*.json" -type f -print0 | sort -z)
fi

if [ ${#JSON_FILES[@]} -eq 0 ]; then
    echo -e "${RED}No JSON files found in: $INPUT_PATH${NC}"
    exit 1
fi

echo -e "${YELLOW}Found ${#JSON_FILES[@]} workflow(s) to import${NC}"
echo ""

# Import workflows
declare -a IMPORTED_IDS=()
success_count=0
fail_count=0

echo -e "${BLUE}Importing workflows...${NC}"
for json_file in "${JSON_FILES[@]}"; do
    result=$(import_workflow "$json_file")
    if [ $? -eq 0 ] && [ -n "$result" ]; then
        # Get last line (the ID)
        wf_id=$(echo "$result" | tail -1)
        IMPORTED_IDS+=("$wf_id")
        ((success_count++))
    else
        ((fail_count++))
    fi
done

echo ""
echo -e "  ${GREEN}✓ Imported: $success_count${NC}"
[ $fail_count -gt 0 ] && echo -e "  ${RED}✗ Failed: $fail_count${NC}"

# Apply tags if requested
if [ -n "$TAG_NAME" ] && [ ${#IMPORTED_IDS[@]} -gt 0 ]; then
    echo ""
    echo -e "${BLUE}Applying tag: $TAG_NAME${NC}"
    
    tag_id=$(create_tag "$TAG_NAME")
    
    if [ -n "$tag_id" ]; then
        echo -e "  Tag ID: ${CYAN}$tag_id${NC}"
        
        for wf_id in "${IMPORTED_IDS[@]}"; do
            tag_workflow "$wf_id" "$tag_id"
        done
        
        echo -e "  ${GREEN}✓ Tagged ${#IMPORTED_IDS[@]} workflow(s)${NC}"
    else
        echo -e "  ${YELLOW}⚠ Could not create tag (may require paid plan)${NC}"
    fi
fi

# Summary
echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${GREEN}Done!${NC} Check your n8n dashboard: ${CYAN}$N8N_URL${NC}"
echo ""

exit 0
