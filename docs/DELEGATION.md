# Delegation and Approval Playbook

**Status**: DRAFT - Guidelines for agent delegation and human approval

## Overview

FlowVault uses an orchestration model where **GitHub Copilot** is the primary orchestrator and coordinates sub-agents (Jules, Background Agents, MCP tooling) to automate tasks. This document defines what requires human approval, delegation patterns, and emergency procedures.

---

## Approval Matrix

### Actions Requiring Explicit Approval ⚠️

| Action | Requires Approval | Reason |
|--------|------------------|--------|
| **Git Operations** | | |
| Commit code | ✅ Yes | Permanent change to codebase |
| Push to remote | ✅ Yes | Publishes changes to team |
| Create PR | ⚠️ Draft only | Drafts are safe, publishing requires approval |
| Merge PR | ✅ Yes | Modifies main codebase |
| Delete branch | ✅ Yes | Permanent deletion |
| **Database Operations** | | |
| Write to production DB | ✅ Yes | Risk of data corruption |
| Delete records | ✅ Yes | Permanent data loss |
| Schema migration | ✅ Yes | Can break application |
| Backup restoration | ✅ Yes | Overwrites current data |
| **Credentials** | | |
| Store credentials | ⚠️ Verify first | Ensure correct encryption |
| Update credentials | ✅ Yes | Could break n8n connection |
| Delete credentials | ✅ Yes | Removes access to n8n |
| Rotate API keys | ✅ Yes | Must update in n8n too |
| **Deployments** | | |
| Deploy to production | ✅ Yes | User-facing changes |
| Deploy to staging | ⚠️ Auto-approve if tests pass | Lower risk |
| Rollback deployment | ✅ Yes | Emergency action |
| **Environment Changes** | | |
| Modify .env.local | ✅ Yes | Can expose secrets |
| Change encryption key | ✅ Yes | Must re-encrypt all data |
| Update dependencies | ⚠️ If major version | Breaking changes risk |

### Actions Allowed Without Approval ✅

| Action | Auto-Approved | Rationale |
|--------|--------------|-----------|
| **Read Operations** | | |
| Fetch workflows from n8n | ✅ Yes | Read-only, no side effects |
| Query database (read) | ✅ Yes | Read-only |
| Generate code suggestions | ✅ Yes | No execution, human reviews |
| **Dry-Run Operations** | | |
| Backup dry-run | ✅ Yes | No database writes |
| Test suite execution | ✅ Yes | Isolated environment |
| Lint/format code | ✅ Yes | Reversible changes |
| **Monitoring** | | |
| Health checks | ✅ Yes | Read-only checks |
| Audit log writes | ✅ Yes | Logging is safe |
| Error reporting | ✅ Yes | Notification only |

---

## Delegation Patterns

### Pattern 1: Human-in-the-Loop (Default)

**Use for**: High-risk actions (commits, deployments, deletions)

```
┌──────────┐
│  Agent   │
│ Proposes │
│  Action  │
└────┬─────┘
     │
     ▼
┌──────────┐
│  Human   │
│ Reviews  │
│ Approves │
└────┬─────┘
     │
     ▼
┌──────────┐
│  Agent   │
│ Executes │
└──────────┘
```

**Example**:
```
GitHub Copilot instructs Jules: "Create a PR with the backup scheduler. Here's what it does:"
- Adds cron job for every 24 hours
- Implements hash-based deduplication
- Tests included (92% coverage)

[AWAITING YOUR APPROVAL TO PUSH DRAFT PR]"

User: "Approved, go ahead"

Jules (assistant): "PR created: #42 (draft). Copilot has presented it for review before publishing."
```

### Pattern 2: Auto-Approve with Notification

**Use for**: Low-risk, reversible actions (tests, dry-runs, read operations)

```
┌──────────┐
│  Agent   │
│ Executes │
│  Action  │
└────┬─────┘
     │
     ▼
┌──────────┐
│  Notify  │
│  Human   │
└──────────┘
```

**Example**:
```
Background Agent: "Running backup dry-run..."
[Executes automatically]
Background Agent: "Dry-run complete. 15 workflows found, 3 changes detected. No writes performed."
```

### Pattern 3: Conditional Approval

**Use for**: Context-dependent actions (e.g., deploy to staging if tests pass)

```
┌──────────┐
│  Agent   │
│  Checks  │
│Condition │
└────┬─────┘
     │
     ├─ Pass ──► Auto-Execute
     │
     └─ Fail ──► Request Approval
```

**Example**:
```
Jules (assistant): "Tests passing (42/42). Copilot recommends deployment to staging (awaiting human approval as required)."
[Deploys automatically]

Jules (assistant): "Tests failing (2/42). Copilot has blocked deployment and asked for review of failures."
[Waits for human decision]
```

---

## Approval Mechanisms

### 1. Interactive Prompts (Assisted by Jules)

Jules pauses and waits for explicit approval:

```
Jules (assistant): "Ready to commit changes to git. Copilot has prepared these changes and is requesting your review:

Files modified:
- src/lib/scheduler/backupScheduler.ts (new)
- docs/agents/README.md (updated)

Commit message: 'feat: Add automated backup scheduler'

Type 'approve' to proceed, or 'cancel' to abort."

User: "approve"

Jules (assistant): "Committed. Commit hash: abc123f" — Copilot has recorded the commit and presented it for review.
```

### 2. Configuration Flags (Background Agents)

Set approval requirements in config:

```json
// background_agents.config.json
{
  "jobs": [
    {
      "name": "backup-dryrun",
      "approval_required": false,  // Auto-execute
      "notify_on_completion": true
    },
    {
      "name": "backup-production",
      "approval_required": true,   // Wait for approval
      "approval_timeout": 3600     // 1 hour
    }
  ]
}
```

### 3. Environment Variables

Use env vars to toggle approval mode:

```bash
# .env.local
AGENTS_AUTO_APPROVE=false  # Require approval for all actions
AGENTS_DRY_RUN_ONLY=true   # Never execute, only log what would happen
```

---

## Emergency Procedures

### Kill-Switch: Stop All Agents

**When to use**: Agent behaving unexpectedly, infinite loops, accidental deletions

**How to trigger**:

#### Option 1: Environment Variable
```bash
# Set kill-switch
export AGENTS_DISABLED=true

# Restart server (if using node-cron)
pm2 restart flowvault
```

#### Option 2: Kill Process
```bash
# Find agent processes
ps aux | grep "node.*cron\|background-agent"

# Kill by PID
kill -9 <PID>
```

#### Option 3: Dashboard Toggle
Add a kill-switch button in UI:

```typescript
// src/app/settings/agents/page.tsx
async function toggleKillSwitch() {
  await fetch('/api/agents/kill-switch', {
    method: 'POST',
    body: JSON.stringify({ enabled: true }),
  });
}
```

### Rollback Procedure

If agent made unwanted changes:

#### 1. Code Changes (Git)
```bash
# Revert last commit
git revert HEAD

# Or hard reset (if not pushed)
git reset --hard HEAD~1
```

#### 2. Database Changes (Supabase)

```sql
-- Restore from backup (if using PITR)
-- Contact Supabase support or use manual backup

-- Or manually delete records
DELETE FROM workflow_backups
WHERE created_at > '2026-01-05 14:00:00'
  AND user_id = 'user_123';
```

#### 3. Credential Changes

```bash
# Delete incorrect credentials
curl -X DELETE /api/credentials \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"credential_id": "uuid"}'

# Re-add correct credentials
curl -X POST /api/credentials \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"instance_id": "prod", "n8n_url": "...", "api_key": "..."}'
```

---

## Audit Logging

All agent actions logged to `agent_audit_log` table:

```typescript
// Log agent action
await supabase.from('agent_audit_log').insert({
  agent_type: 'jules',
  job_name: 'backup-scheduler',
  action: 'Created PR #42',
  status: 'success',
  user_id: 'user_123',
  metadata: {
    pr_url: 'https://github.com/...',
    files_changed: 2,
    approval_required: true,
  },
});
```

### Querying Audit Logs

```typescript
// Get recent agent activity
const { data: logs } = await supabase
  .from('agent_audit_log')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(100);

// Filter by agent type
const { data: julesLogs } = await supabase
  .from('agent_audit_log')
  .select('*')
  .eq('agent_type', 'jules')
  .gte('created_at', new Date(Date.now() - 86400000).toISOString()); // Last 24 hours
```

### Audit Log Alerts

Monitor for suspicious activity:

```typescript
// Alert on too many failures
const { count } = await supabase
  .from('agent_audit_log')
  .select('*', { count: 'exact' })
  .eq('status', 'failure')
  .gte('created_at', new Date(Date.now() - 3600000).toISOString()); // Last hour

if (count > 10) {
  sendAlert('Too many agent failures in last hour');
}
```

---

## Triggering Agents

### Jules Agent (Interactive, sub-agent)

**Note:** Jules is a helper sub-agent and may be invoked by Copilot or used directly by developers; it is separate from Copilot's internal sub-agents.

Use natural language commands:

```
User: "Create a backup scheduler that runs every 24 hours"

GitHub Copilot instructs Jules: "Create a backup scheduler with these components:
1. Cron job (0 0 * * *)
2. n8n API integration
3. Hash-based deduplication
4. Supabase storage

[AWAITING APPROVAL TO GENERATE CODE]"

User: "Proceed"

Jules (assistant): [Generates code files under Copilot's instruction]
```

### Background Agent (Scheduled)

Configure in `.vscode/tasks.json` or cron:

```json
{
  "label": "Backup Dry-Run",
  "type": "shell",
  "command": "./scripts/backup_dryrun.sh",
  "isBackground": true,
  "problemMatcher": []
}
```

Or use VS Code Command Palette:
```
Cmd+Shift+P > Tasks: Run Task > Backup Dry-Run
```

### MCP Server (Programmatic)

Call MCP tools from Jules or Background Agent:

```typescript
import { MCPClient } from '@modelcontextprotocol/sdk';

const client = new MCPClient();
const result = await client.callTool('coordinate_backup', {
  user_id: 'user_123',
  instances: ['prod', 'stage', 'dev'],
});
```

---

## Best Practices

### 1. Start with Dry-Run Mode

Always test in dry-run before enabling production mode:

```bash
# Environment variable
DRY_RUN=true npm run backup

# Or code flag
const dryRun = process.env.DRY_RUN === 'true';
if (dryRun) {
  console.log('[DRY-RUN] Would save backup:', workflowId);
} else {
  await storage.saveBackup(...);
}
```

### 2. Review Generated Code Before Approving

Don't blindly approve agent-generated code. Check for:
- Security issues (exposed secrets, SQL injection)
- Logic errors (incorrect conditions, infinite loops)
- Breaking changes (API changes, schema changes)

### 3. Monitor Audit Logs Regularly

Set up daily/weekly review of agent activity:
- Check for unusual patterns (too many failures, unexpected actions)
- Verify all high-risk actions were approved
- Look for performance issues (slow queries, timeouts)

### 4. Keep Approval Matrix Updated

As agents evolve, update the approval matrix:
- Add new actions as they're implemented
- Adjust approval requirements based on risk
- Document reasons for approval decisions

### 5. Test Emergency Procedures

Periodically test kill-switch and rollback:
- Trigger kill-switch in dev environment
- Practice rollback on test data
- Ensure team knows how to respond to incidents

---

## Example Workflows

### Workflow 1: Automated Backup (No Approval)

```
1. Background Agent triggers on schedule (every 24 hours)
2. Fetches workflows from n8n API ✅ (read-only, auto-approved)
3. Computes hashes ✅ (computation, auto-approved)
4. Compares with last backup ✅ (read-only, auto-approved)
5. If changed: saves to Supabase ⚠️ (write, but configured as auto-approve for backups)
6. Logs to audit log ✅ (logging, auto-approved)
7. Notifies user (optional) ✅ (notification, auto-approved)
```

### Workflow 2: Create PR (With Approval)

```
1. User: "Create a PR for the backup feature"
2. Jules analyzes uncommitted changes ✅ (read-only)
3. Jules generates PR description ✅ (no side effects)
4. Jules shows preview and asks for approval ⚠️ (AWAITING APPROVAL)
5. User: "Approved"
6. Jules creates draft PR ✅ (draft is safe)
7. Jules waits for user to publish ⚠️ (publishing requires manual action)
```

### Workflow 3: Restore Backup (With Approval)

```
1. User: "Restore workflow wf_123 from backup"
2. Jules fetches backup from Supabase ✅ (read-only)
3. Jules shows backup preview (date, hash, changes) ✅ (display, auto-approved)
4. Jules warns about overwriting current workflow ⚠️ (AWAITING APPROVAL)
5. User: "Proceed"
6. Jules calls n8n API to restore workflow ✅ (approved, executes)
7. Jules confirms restoration and logs to audit ✅ (logging, auto-approved)
```

---

## Troubleshooting

### Agent Stuck Waiting for Approval

**Symptom**: Agent shows "[AWAITING APPROVAL]" but doesn't proceed

**Cause**: User didn't respond, or approval mechanism broken

**Solution**:
- Check if user input was received (typo in approval command)
- Verify approval timeout hasn't expired
- Restart agent if needed

### Agent Executed Without Approval

**Symptom**: High-risk action executed without human approval

**Cause**: Misconfigured approval matrix or auto-approve bug

**Solution**:
1. Immediately trigger kill-switch
2. Review audit logs to identify what was executed
3. Rollback changes if necessary
4. Fix approval configuration
5. Add regression test

### Audit Logs Not Recording

**Symptom**: Agent actions not appearing in `agent_audit_log`

**Cause**: Logging function error, database connection issue

**Solution**:
- Check Supabase connection
- Verify `agent_audit_log` table exists
- Test logging function in isolation
- Add error handling to logging code

---

## References

- [Agent Overview](./agents/README.md)
- [Backup MVP Spec](./BACKUP_MVP.md)
- [Background Agents](./agents/background_agents.md)
