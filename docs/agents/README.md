# FlowVault Agent Orchestration

**Status**: DRAFT - Uncommitted documentation for agent orchestration setup

## Overview

FlowVault leverages multiple AI agent types to automate workflow backup, testing, and lifecycle management tasks. This document provides an overview of our agent architecture, roles, and integration patterns.

## Agent Types

### Primary Orchestrator — GitHub Copilot (Raptor mini (Preview))
- **Identity**: When asked, the orchestrator should be referred to as **GitHub Copilot** and the model as **Raptor mini (Preview)**.
- **Role**: Project-level orchestrator and decision-maker. GitHub Copilot acts as the primary orchestrator for FlowVault development tasks, coordinating sub-agents (Jules, Background Agent) and presenting suggestions for human approval.
- **Responsibilities**:
  - Accept high-level instructions from the developer and orchestrate sub-agent workflows
  - Deploy and coordinate internal Copilot sub-agents (Planner, Executor, PR-Manager)
  - Approve, request, and summarize agent outputs
  - Enforce safe defaults (dry-run, approval gates) and audit logs
- **Note**: GitHub Copilot is the authoritative orchestrator; other agents should be treated as helpers and invoked by Copilot or by a human.

### Copilot Internal Sub-agents
These are lightweight roles that Copilot may instantiate or simulate internally to break tasks into focused responsibilities. They are not separate external services — they are logical subagents under Copilot's control.

- **Planner**: Analyzes feature requests, produces an implementation plan, creates stepwise tasks, drafts schedules (e.g., backup frequency), and computes required checks and rollbacks. Outputs: task list, estimated scope, required env/credentials, and test plan.

- **Executor**: Runs the actual operations under dry-run by default: executes tests, runs backup dry-runs, performs code generation tasks, and collects logs and artifacts. Requires explicit Copilot/human approval before performing write actions (DB writes, commits, deploys).

- **PR-Manager**: Prepares PR drafts, formats changelogs and release notes, runs pre-merge checks, and coordinates with Verifier for final sign-off. Creates Draft PRs only; publishing needs manual approval.

### Verifier Agent
- **Role**: Final validation and sign-off agent. After Copilot and sub-agents complete a workflow, Verifier runs end-to-end checks (full test suite, security scans, secret-scan verification, and audit confirmation). Verifier issues a final approve/reject recommendation for production actions and logs the decision to `agent_audit_log`.

### 1. Jules Agent (Sub-agent / Helper)
- **Role**: Interactive sub-agent used by GitHub Copilot for task execution and planning
- **Capabilities**:
  - Backup scheduler planning (cron job configuration, hash comparison logic) when instructed by Copilot
  - Running tests or orchestrating CI tasks as a helper
  - Preparing PR draft content and changelogs when requested
  - Generating code suggestions and refactors under Copilot orchestration
- **Safety**: Always operates in dry-run mode by default; requires explicit approval from GitHub Copilot (or a human) for commits and writes
- **Configuration**: See [jules_prompts.md](./jules_prompts.md)

### 2. Background Agent
- **Role**: Autonomous job execution for long-running or scheduled tasks
- **Capabilities**:
  - Dev server monitoring (detect errors, surface issues)
  - Automated backup dry-runs
  - Health checks for n8n instances
  - Periodic maintenance tasks
- **Configuration**: See [background_agents.md](./background_agents.md)

### 3. MCP Tooling (VS Code Model Context Protocol integration)
- **Role**: Local tool-calling and orchestration during development (not a required FlowVault server)
- **Capabilities**:
  - Coordinate local tool calls (credential fetch, dry-run orchestration)
  - Support multi-instance scenario testing in development
- **Configuration**: See [mcp_integration.md](./mcp_integration.md)

## Agent Workflows

### Automated Backup Flow
1. **Background Agent** triggers on schedule (e.g., every 24 hours)
2. Fetches workflows from n8n API using encrypted credentials
3. Computes SHA-256 hash of workflow JSON
4. Compares with last backup hash (via Supabase)
5. If changed: saves new backup, triggers notification
6. If unchanged: skips backup (deduplication)

### Test & CI Flow
1. **GitHub Copilot** coordinates test runs and may instruct **Jules** to execute tests as a sub-agent
2. The chosen agent executes the test suite via `npm test`
3. Results are parsed and summarized for review
4. On failure: the orchestrator (Copilot) provides debugging suggestions or requests further analysis
5. On success: Copilot may request a PR draft from Jules and present it as a suggested draft for human review

### PR Draft Creation Flow
1. **GitHub Copilot** analyzes changes and orchestrates PR creation, instructing **Jules** as needed
2. Jules (on Copilot's instruction) or another helper generates a changelog from git diff
3. Creates a draft PR with:
   - Feature summary
   - Breaking changes (if any)
   - Test results
   - Documentation updates needed
4. Copilot presents the draft and waits for explicit human approval before publishing or pushing

## Safety Guardrails

### Dry-Run by Default
- All agent actions default to dry-run mode
- Explicit approval required for:
  - Git commits
  - Database writes (production)
  - Backup restoration
  - Credential modifications

### Approval Matrix
See [DELEGATION.md](../DELEGATION.md) for full approval requirements.

### Audit Logging
- All agent actions logged to Supabase `agent_audit_log` table
- Includes: timestamp, agent type, action, user_id, success/failure

## Environment Variables

Required in `.env.local`:
```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Encryption
ENCRYPTION_KEY=<32-byte hex string>

# n8n Instance (per user, stored encrypted)
N8N_API_URL=https://your-n8n.example.com
N8N_API_KEY=n8n_api_...
```

## Getting Started

### 1. Configure Jules Agent
Review and customize prompts in [jules_prompts.md](./jules_prompts.md)

### 2. Set Up Background Agents
Define job schedules in [background_agents.md](./background_agents.md)

### 3. Test Backup Dry-Run
```bash
./scripts/backup_dryrun.sh
```

### 4. Review Approval Workflow
Read [DELEGATION.md](../DELEGATION.md) to understand what requires approval

## Triggering Agents

### Jules Agent
- Use natural language commands in chat
- Example: "Create a backup scheduler that runs every 24 hours"
- Example: "Run tests and create a PR draft if they pass"

### Background Agent
- Configure in `.vscode/tasks.json` or cron
- Monitor via VS Code task output
- Example task: "Dev Watcher" runs `next dev` and surfaces errors

### MCP Servers
- Coordinate via MCP protocol for multi-instance setups
- See [mcp_integration.md](./mcp_integration.md)

## Best Practices

1. **Always test in dry-run mode first**
2. **Review agent-generated code before approving**
3. **Keep encryption keys secure** (never commit ENCRYPTION_KEY)
4. **Monitor audit logs** for unexpected agent behavior
5. **Use kill-switch** if agents behave unexpectedly (see DELEGATION.md)

## Troubleshooting

### Agent Not Responding
- Check environment variables are set
- Verify API keys are valid
- Review agent audit logs

### Backup Not Triggering
- Check cron schedule syntax
- Verify n8n API credentials
- Test with dry-run script first

### Hash Mismatch Issues
- Ensure workflow JSON is stable (no timestamp fields)
- Verify hash algorithm (SHA-256)
- Check for encoding differences (UTF-8)

## References

- [Backup MVP Spec](../BACKUP_MVP.md)
- [Storage Fallback Strategy](../STORAGE_FALLBACK.md)
- [Delegation Playbook](../DELEGATION.md)
