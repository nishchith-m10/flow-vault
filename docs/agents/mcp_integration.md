# MCP Server Integration Guide

**Status**: DRAFT - Model Context Protocol integration for multi-instance coordination

## Overview

Model Context Protocol (MCP) enables FlowVault to coordinate backups, credentials, and workflow state across multiple n8n instances. This guide covers MCP server setup, multi-instance backup coordination, and centralized management.

---

## What is MCP (and how we use it here)

**Model Context Protocol** is a standardized way for AI agents to share context and coordinate tools. Important: **FlowVault does NOT embed or require an MCP server.** Instead, we *use MCP tool‑calling capabilities from VS Code and the Background Agent during development* to orchestrate tasks (e.g., coordinate dry‑run backups, fetch encrypted credentials, or plan multi‑instance jobs).

Key points:
- We use MCP as a **local tool-calling mechanism** to help developers and agents run complex workflows safely.
- MCP calls are executed via the VS Code MCP tooling (or Background Agent) and run in **dry‑run / development context** by default.
- **Server deployment examples are provided only as an optional appendix** for reference and should not be treated as required for FlowVault.

Examples of what we use MCP tooling for:
- Requesting encrypted credentials for a specific user+instance (tool call)
- Coordinating multi-instance backup runs as a development orchestration step
- Running conflict detection and reporting via tool calls without deploying a persistent MCP server

This approach keeps FlowVault lightweight while still benefiting from the orchestration and tool-calling ergonomics that MCP provides.

---

## Appendix — Optional: MCP Server (archival reference)

> NOTE: This section is provided as an **optional reference** for advanced use cases. FlowVault does **not** require running an MCP server in production; the recommended workflow is to use MCP tooling in VS Code for development and orchestration.

### MCP Server Architecture (optional)

```
┌─────────────────────────────────────────┐
│         FlowVault MCP Server            │
│  (Centralized coordination service)     │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Credential Manager             │   │
│  │  - Store encrypted n8n creds    │   │
│  │  - Rotate API keys              │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Backup Coordinator             │   │
│  │  - Schedule backups             │   │
│  │  - Deduplicate across instances │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  State Sync Manager             │   │
│  │  - Merge workflow changes       │   │
│  │  - Conflict resolution          │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
          ↓           ↓           ↓
    ┌─────────┐ ┌─────────┐ ┌─────────┐
    │ n8n #1  │ │ n8n #2  │ │ n8n #3  │
    │ (Prod)  │ │ (Stage) │ │ (Dev)   │
    └─────────┘ └─────────┘ └─────────┘
```

---

## Setup Instructions

### 1. Install MCP SDK

```bash
npm install @modelcontextprotocol/sdk
```

### 2. Create MCP Server Configuration

**File**: `mcp.config.json` (DRAFT - do not commit)

```json
{
  "server": {
    "name": "flowvault-mcp",
    "version": "1.0.0",
    "port": 3001,
    "transport": "stdio"
  },
  "resources": [
    {
      "name": "credentials",
      "type": "database",
      "connection": "${SUPABASE_URL}/rest/v1/encrypted_credentials"
    },
    {
      "name": "backups",
      "type": "database",
      "connection": "${SUPABASE_URL}/rest/v1/workflow_backups"
    }
  ],
  "tools": [
    {
      "name": "get_credentials",
      "description": "Fetch encrypted n8n credentials for a user",
      "input_schema": {
        "type": "object",
        "properties": {
          "user_id": { "type": "string" },
          "instance_id": { "type": "string" }
        },
        "required": ["user_id", "instance_id"]
      }
    },
    {
      "name": "coordinate_backup",
      "description": "Coordinate backup across multiple n8n instances",
      "input_schema": {
        "type": "object",
        "properties": {
          "user_id": { "type": "string" },
          "instances": {
            "type": "array",
            "items": { "type": "string" }
          }
        },
        "required": ["user_id", "instances"]
      }
    }
  ]
}
```

### 3. Implement MCP Server

**File**: `src/lib/mcp/server.ts` (DRAFT)

```typescript
import { MCPServer } from '@modelcontextprotocol/sdk';
import { supabase } from '@/lib/supabase';
import { decrypt } from '@/lib/crypto';

const server = new MCPServer({
  name: 'flowvault-mcp',
  version: '1.0.0',
});

server.tool('get_credentials', async ({ user_id, instance_id }) => {
  const { data, error } = await supabase
    .from('encrypted_credentials')
    .select('*')
    .eq('user_id', user_id)
    .eq('instance_id', instance_id)
    .single();

  if (error) throw error;

  // Decrypt credentials using ENCRYPTION_KEY
  const decrypted_url = decrypt(data.encrypted_n8n_url, process.env.ENCRYPTION_KEY!);
  const decrypted_api_key = decrypt(data.encrypted_api_key, process.env.ENCRYPTION_KEY!);

  return {
    n8n_url: decrypted_url,
    api_key: decrypted_api_key,
  };
});

server.tool('coordinate_backup', async ({ user_id, instances }) => {
  const results = [];

  for (const instance_id of instances) {
    // Fetch credentials for this instance
    const creds = await server.callTool('get_credentials', { user_id, instance_id });

    // Fetch workflows from n8n API
    const response = await fetch(`${creds.n8n_url}/api/v1/workflows`, {
      headers: { 'X-N8N-API-KEY': creds.api_key },
    });

    const workflows = await response.json();

    // Process each workflow
    for (const workflow of workflows.data) {
      const hash = computeHash(workflow);
      
      // Check if backup exists
      const { data: lastBackup } = await supabase
        .from('workflow_backups')
        .select('hash')
        .eq('workflow_id', workflow.id)
        .eq('user_id', user_id)
        .eq('instance_id', instance_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Only backup if hash changed
      if (!lastBackup || lastBackup.hash !== hash) {
        await supabase.from('workflow_backups').insert({
          workflow_id: workflow.id,
          user_id,
          instance_id,
          workflow_data: workflow,
          hash,
        });

        results.push({ instance_id, workflow_id: workflow.id, backed_up: true });
      } else {
        results.push({ instance_id, workflow_id: workflow.id, backed_up: false, reason: 'no changes' });
      }
    }
  }

  return { results };
});

server.listen();
```

---

## Multi-Instance Backup Coordination

### Scenario: Backup Prod, Stage, and Dev

```typescript
const result = await mcpClient.callTool('coordinate_backup', {
  user_id: 'user_123',
  instances: ['prod', 'stage', 'dev'],
});

console.log(result);
```

### Deduplication Across Instances

MCP server maintains a global view of all backups, enabling:
- **Cross-instance deduplication**: If workflow is identical across prod/stage, only backup once
- **Conflict detection**: Alert if same workflow differs across instances
- **Merge strategies**: Prompt user to resolve conflicts (keep prod, keep stage, manual merge)

---

## Centralized Credential Management

### Store Credentials

```typescript
server.tool('store_credentials', async ({ user_id, instance_id, n8n_url, api_key }) => {
  const encrypted_url = encrypt(n8n_url, process.env.ENCRYPTION_KEY!);
  const encrypted_key = encrypt(api_key, process.env.ENCRYPTION_KEY!);

  await supabase.from('encrypted_credentials').upsert({
    user_id,
    instance_id,
    encrypted_n8n_url: encrypted_url,
    encrypted_api_key: encrypted_key,
  });

  return { success: true };
});
```

### Rotate API Keys

```typescript
server.tool('rotate_api_key', async ({ user_id, instance_id, new_api_key }) => {
  const encrypted_key = encrypt(new_api_key, process.env.ENCRYPTION_KEY!);

  await supabase
    .from('encrypted_credentials')
    .update({ encrypted_api_key: encrypted_key })
    .eq('user_id', user_id)
    .eq('instance_id', instance_id);

  // Audit log
  await supabase.from('agent_audit_log').insert({
    agent_type: 'mcp',
    job_name: 'rotate_api_key',
    action: `Rotated API key for instance ${instance_id}`,
    status: 'success',
    user_id,
  });

  return { success: true };
});
```

---

## Workflow State Synchronization

### Detect Conflicts

```typescript
server.tool('detect_conflicts', async ({ user_id, workflow_id }) => {
  const { data: backups } = await supabase
    .from('workflow_backups')
    .select('*')
    .eq('user_id', user_id)
    .eq('workflow_id', workflow_id)
    .order('created_at', { ascending: false })
    .limit(10);

  // Group by instance
  const byInstance = backups.reduce((acc, backup) => {
    if (!acc[backup.instance_id]) acc[backup.instance_id] = [];
    acc[backup.instance_id].push(backup);
    return acc;
  }, {});

  // Compare latest hashes across instances
  const latestHashes = Object.entries(byInstance).map(([instance, backups]) => ({
    instance,
    hash: backups[0].hash,
    timestamp: backups[0].created_at,
  }));

  // Check for conflicts
  const uniqueHashes = new Set(latestHashes.map(h => h.hash));
  
  if (uniqueHashes.size > 1) {
    return {
      conflict: true,
      instances: latestHashes,
      message: 'Workflow differs across instances',
    };
  }

  return { conflict: false };
});
```

---

## Security Considerations

### 1. Credential Encryption
- All credentials encrypted at rest using AES-256-GCM
- Encryption key (`ENCRYPTION_KEY`) stored in environment, never committed
- Rotate encryption key periodically

### 2. Access Control
- MCP tools (when used) should only be callable by authorized orchestrators/agents (GitHub Copilot, Jules, Background Agent)
- User-scoped credentials (can't access another user's creds)
- Rate limiting on credential access

### 3. Audit Logging
- All MCP tool calls logged to `agent_audit_log`
- Include: timestamp, user_id, tool_name, success/failure

---

## Testing MCP Integration

### 1. Local Testing

```bash
# Start MCP server
node src/lib/mcp/server.js

# In another terminal, test with MCP client
node scripts/test_mcp.js
```

### 2. Dry-Run Mode

```typescript
{
  "dryRun": true, // Don't write to DB, just log what would happen
  "verbose": true // Detailed logging
}
```

---

## Deployment

### Option 1: Standalone Service
Deploy MCP server as a separate service (e.g., on Railway, Fly.io)

### Option 2: Embedded in Next.js
Run MCP server alongside Next.js (via background agent)

### Option 3: Serverless
Use Vercel Edge Functions or AWS Lambda

---

## Best Practices

1. **Test with single instance first** before multi-instance coordination
2. **Use dry-run mode** for new MCP tools
3. **Monitor MCP server logs** for errors and performance issues
4. **Implement retry logic** for transient failures (network, API rate limits)
5. **Version MCP tools** to support backward compatibility

## References

- [MCP Specification](https://modelcontextprotocol.io/)
- [Agent Overview](./README.md)
- [Backup MVP Spec](../BACKUP_MVP.md)
