# Copilot Internal Sub-agents & Verifier (DRAFT)

**Status**: DRAFT — Defines the internal sub-agents Copilot can deploy or simulate when orchestrating FlowVault tasks.

## Overview
GitHub Copilot (Raptor mini) acts as the primary orchestrator. To keep responsibilities modular and auditable, Copilot uses internal sub-agents to handle focused parts of a task. These sub-agents are logical roles inside Copilot — they are not separate running services.

## Sub-agent Roles

### Planner
- **Purpose**: Turn a high-level feature request into a concrete implementation plan
- **Inputs**: Feature description, repo context, constraints (security, quotas)
- **Outputs**: Task list, schema changes, required env vars, test matrix, rollback plan
- **Guardrails**:
  - Must run in analysis/dry-run mode only
  - Must list explicit approvals required before side-effects

### Executor
- **Purpose**: Execute tasks prepared by Planner (dry-run first)
- **Examples**: run tests, run backup dry-runs, run lint and format tasks
- **Outputs**: Logs, test artifacts, simulated diffs
- **Guardrails**:
  - Default to dry-run (no writes/commits)
  - If write actions are requested, escalate to Copilot for explicit approval

### PR-Manager
- **Purpose**: Create PR drafts with changelogs and testing results
- **Outputs**: Draft PR, changelog, list of changed files, required reviewers
- **Guardrails**:
  - Only create draft PRs; publishing requires human or Copilot approval

## Verifier Agent
- **Purpose**: Final sign-off for production changes
- **Tasks**:
  - Run full E2E tests and security scans
  - Run secret-scan baseline and verify audit logs
  - Confirm CI green and compliance checks
- **Outputs**: Approve / Reject decision with reasoning and audit entry

## Example Workflow (High Level)
1. Developer: "Add automated backup for sensitive workflows"
2. Copilot invokes **Planner** → plan produced (task list, schedule: daily)
3. Copilot invokes **Executor** to run dry-run backup and unit tests
4. Copilot invokes **PR-Manager** to create draft PR with results
5. **Verifier** runs full tests and security scans; recommends approval
6. On success, human approves and Copilot finalizes publishing and deploy steps

## Audit & Logging
- Every sub-agent action must be logged to `agent_audit_log` with: timestamp, sub-agent name, action, user_id, status, and artifacts reference.

## Security & Approval
- All write operations require an explicit approval step (Copilot or human) recorded in the audit log.
- Sub-agents must never store secrets; they request secrets from secure server-side storage when needed.

---

**Note**: This document is a draft to be refined when we begin implementing agent orchestration features and automation flows.
