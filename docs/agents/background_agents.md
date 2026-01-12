# Background Agent Job Definitions

**Status**: DRAFT - Background agent job configurations

## Overview

Background Agents are autonomous workers that run scheduled or long-running tasks without blocking the UI. This document defines job types, triggers, and expected outputs for FlowVault.

---

## 1. Dev Watcher Agent

### Purpose
Monitor the Next.js development server and surface compilation errors, runtime errors, and warnings.

### Job Definition

```typescript
{
  name: "dev-watcher",
  type: "long-running",
  trigger: "manual", // or "on-start"
  command: "npm run dev",
  description: "Monitor Next.js dev server for errors",
  
  errorPatterns: [
    /Error:/i,
    /TypeError:/i,
    /Module not found/i,
    /Failed to compile/i,
    /SyntaxError:/i
  ],
  
  actions: {
    onError: {
      notify: true,
      logToFile: "logs/dev-errors.log",
      suggestFix: true // Use AI to suggest fixes
    },
    onWarning: {
      notify: false,
      logToFile: "logs/dev-warnings.log"
    }
  },
  
  outputFormat: {
    type: "structured",
    fields: ["timestamp", "severity", "message", "file", "line"]
  }
}
```

### Expected Output

```json
{
  "timestamp": "2026-01-05T14:32:10.123Z",
  "severity": "error",
  "message": "Module not found: Can't resolve '@/lib/crypto'",
  "file": "src/app/api/credentials/route.ts",
  "line": 5,
  "suggestion": "Create the missing module at src/lib/crypto.ts or check the import path"
}
```

### VS Code Task Configuration

```json
{
  "label": "Dev Watcher",
  "type": "shell",
  "command": "npm run dev",
  "isBackground": true,
  "problemMatcher": {
    "pattern": [
      {
        "regexp": ".",
        "file": 1,
        "location": 2,
        "message": 3
      }
    ],
    "background": {
      "activeOnStart": true,
      "beginsPattern": "^\\s*- (Local|Environments)",
      "endsPattern": "Compiled|Failed to compile"
    }
  }
}
```

---

## 2. Backup Dry-Run Agent

### Purpose
Periodically test the backup system without writing to production database. Validates credentials, connectivity, and deduplication logic.

### Job Definition

```typescript
{
  name: "backup-dryrun",
  type: "scheduled",
  trigger: {
    cron: "0 */12 * * *", // Every 12 hours
    timezone: "UTC"
  },
  command: "./scripts/backup_dryrun.sh",
  description: "Test backup system without writing to DB",
  
  validations: [
    "n8n API connectivity",
    "Credential decryption",
    "Hash computation",
    "Supabase read access"
  ],
  
  actions: {
    onSuccess: {
      notify: false,
      logToFile: "logs/backup-dryrun.log"
    },
    onFailure: {
      notify: true,
      severity: "warning",
      retryCount: 2,
      retryDelay: 300 // 5 minutes
    }
  },
  
  outputFormat: {
    type: "summary",
    fields: ["workflows_found", "hashes_computed", "changes_detected", "duration_ms"]
  }
}
```

### Expected Output

```json
{
  "timestamp": "2026-01-05T02:00:00.000Z",
  "status": "success",
  "workflows_found": 15,
  "hashes_computed": 15,
  "changes_detected": 3,
  "duration_ms": 1847,
  "details": [
    {
      "workflow_id": "wf_123",
      "name": "Customer Onboarding",
      "hash": "a3f5...",
      "changed": true
    },
    // ... more workflows
  ]
}
```

### Script Implementation

See `scripts/backup_dryrun.sh` for full implementation.

---

## 3. Health Check Agent

### Purpose
Monitor n8n instance health, API availability, and workflow execution status. Alert on downtime or anomalies.

### Job Definition

```typescript
{
  name: "health-check",
  type: "scheduled",
  trigger: {
    cron: "*/15 * * * *", // Every 15 minutes
    timezone: "UTC"
  },
  description: "Monitor n8n instance health",
  
  checks: [
    {
      name: "api-ping",
      endpoint: "${N8N_API_URL}/healthz",
      timeout: 5000,
      expectedStatus: 200
    },
    {
      name: "workflow-count",
      endpoint: "${N8N_API_URL}/workflows",
      validate: (data) => data.length > 0
    },
    {
      name: "recent-executions",
      endpoint: "${N8N_API_URL}/executions",
      validate: (data) => {
        const recent = data.filter(e => 
          Date.now() - new Date(e.startedAt).getTime() < 3600000
        );
        return recent.length > 0; // At least 1 execution in last hour
      }
    }
  ],
  
  actions: {
    onFailure: {
      notify: true,
      severity: "critical",
      escalate: true, // Alert via email/SMS
      maxFailures: 3 // Alert after 3 consecutive failures
    },
    onRecovery: {
      notify: true,
      severity: "info"
    }
  },
  
  outputFormat: {
    type: "status",
    fields: ["status", "failing_checks", "uptime_percentage"]
  }
}
```

### Expected Output

```json
{
  "timestamp": "2026-01-05T14:45:00.000Z",
  "status": "healthy",
  "checks_passed": 3,
  "checks_failed": 0,
  "uptime_percentage": 99.97,
  "details": [
    {
      "check": "api-ping",
      "status": "pass",
      "response_time_ms": 87
    },
    {
      "check": "workflow-count",
      "status": "pass",
      "workflows_found": 15
    },
    {
      "check": "recent-executions",
      "status": "pass",
      "executions_last_hour": 42
    }
  ]
}
```

---

## 4. Agent Orchestration

### Running Background Agents

#### Local Development (VS Code Tasks)
```bash
# Open VS Code Command Palette (Cmd+Shift+P)
# Run Task > Dev Watcher
# Run Task > Backup Dry-Run
```

#### Production (Vercel Cron)
Configure in `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/backup-dryrun",
      "schedule": "0 */12 * * *"
    },
    {
      "path": "/api/cron/health-check",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

#### Alternative: Node-Cron
```typescript
import cron from 'node-cron';
import { runBackupDryRun } from './jobs/backupDryRun';
import { runHealthCheck } from './jobs/healthCheck';

cron.schedule('0 */12 * * *', runBackupDryRun);

cron.schedule('*/15 * * * *', runHealthCheck);
```

---

## 5. Monitoring & Logs

### Audit Logging

All background agent jobs log to Supabase:

```sql
-- Table: agent_audit_log
CREATE TABLE agent_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  agent_type TEXT NOT NULL, -- 'jules' | 'background' | 'mcp'
  job_name TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL, -- 'success' | 'failure' | 'warning'
  user_id TEXT, -- NULL for background jobs
  metadata JSONB, -- Job-specific data
  error_message TEXT
);
```

### Viewing Logs

```typescript
const { data: logs } = await supabase
  .from('agent_audit_log')
  .select('*')
  .eq('agent_type', 'background')
  .order('created_at', { ascending: false })
  .limit(100);
```

---

## 6. Safety & Kill-Switch

### Emergency Stop

To stop all background agents:

```bash
# Kill all node-cron jobs
pkill -f "node.*cron"

# Or set kill-switch in environment
export AGENTS_DISABLED=true
```

### Graceful Shutdown

```typescript
process.on('SIGTERM', () => {
  console.log('Stopping background agents...');
  cron.getTasks().forEach(task => task.stop());
  process.exit(0);
});
```

---

## 7. Best Practices

1. **Always test in dry-run mode first** before enabling production jobs
2. **Set reasonable timeouts** to prevent hanging jobs
3. **Implement retry logic** with exponential backoff
4. **Monitor job duration** and alert on anomalies
5. **Use structured logging** for easy parsing and analysis
6. **Rotate logs** to prevent disk space issues
7. **Test failure scenarios** (API down, invalid credentials, etc.)

## References

- [Agent Overview](./README.md)
- [Delegation Playbook](../DELEGATION.md)
- [Backup MVP Spec](../BACKUP_MVP.md)
