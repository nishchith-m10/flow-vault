# Automated Backup MVP Feature Specification

**Status**: DRAFT - Feature specification for automated workflow backups

## Overview

FlowVault's automated backup system periodically backs up n8n workflows with smart deduplication to minimize storage and avoid unnecessary snapshots.

---

## Acceptance Criteria

### Must Have (MVP)

1. **Automated Backup Scheduler**
   - ✅ Run on configurable schedule (default: daily / every 24 hours)
   - ✅ Fetch all workflows from n8n API
   - ✅ Compute SHA-256 hash of each workflow
   - ✅ Compare with last backup hash
   - ✅ Only save backup if hash differs (deduplication)
   - ✅ Log all backup operations to audit log

2. **Credential Security**
   - ✅ Store n8n URL and API key encrypted (AES-256-GCM)
   - ✅ Encryption key in environment variable (ENCRYPTION_KEY)
   - ✅ Never log or expose credentials in plaintext
   - ✅ User-scoped credentials (can't access other users' creds)

3. **Storage**
   - ✅ Supabase as primary storage backend
   - ✅ Store workflow JSON, hash, timestamp
   - ✅ Support multiple backups per workflow (versioning)
   - ✅ Implement retention policy (optional: delete backups older than X days)

4. **User Experience**
   - ✅ One-time credential setup (store in encrypted_credentials table)
   - ✅ View backup history for each workflow
   - ✅ Restore workflow from backup (manual action)
   - ✅ Dry-run mode for testing (don't write to DB)

### Nice to Have (Post-MVP)

- 📋 Multi-instance support (backup from multiple n8n installations)
- 📋 Backup diff viewer (show what changed between versions)
- 📋 Automated restoration on workflow deletion
- 📋 Backup export (download as JSON)
- 📋 Slack/email notifications on backup failure
- 📋 Backup compression (gzip workflow JSON)
- 📋 Incremental backups (only store diffs)

---

## Scheduler Approach

### Option 1: Node-Cron (Recommended for MVP)

**Pros**:
- Simple setup
- Runs in Next.js server process
- Good for development and small-scale production

**Cons**:
- Requires persistent server (not compatible with serverless)
- Stops when server restarts (unless using PM2 or similar)

**Implementation**:

```typescript
import cron from 'node-cron';
import { runBackup } from './jobs/backup';

cron.schedule('0 0 * * *', async () => {
  console.log('Running scheduled backup...');
  await runBackup();
});
```

### Option 2: Vercel Cron Jobs

**Pros**:
- Serverless-compatible
- Managed by Vercel (no server maintenance)
- Reliable scheduling

**Cons**:
- Requires Vercel Pro plan
- Limited to HTTP endpoints (can't run arbitrary code)

**Implementation**:

```json
{
  "crons": [
    {
      "path": "/api/cron/backup",
      "schedule": "0 0 * * *"
    }
  ]
}
```

```typescript
export async function GET(req: NextRequest) {
  // Verify cron secret
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await runBackup();
  return NextResponse.json({ success: true });
}
```

**Recommendation**: Start with Node-Cron for MVP, migrate to Vercel Cron if needed for scale.

---

## Deduplication Algorithm

### Hash-Based Comparison

1. **Compute Hash**:
   - Serialize workflow JSON to string (stable order)
   - Compute SHA-256 hash
   - Store hash alongside backup

2. **Check Last Backup**:
   - Query database for last backup of this workflow
   - Compare hashes
   - If identical: skip backup (no changes)
   - If different: save new backup

3. **Edge Cases**:
   - **First backup**: No previous hash exists, always save
   - **Workflow deleted then re-created**: New workflow ID, treated as new
   - **Timestamp fields**: Exclude from hash (e.g., `updatedAt`)

### Example Implementation

```typescript
import { computeHash } from '@/lib/crypto';
import { createStorageAdapter } from '@/lib/storage/adapter';

async function backupWorkflow(workflowId: string, userId: string, workflowData: any) {
  const storage = createStorageAdapter();

  // Compute hash (exclude timestamp fields)
  const stableData = { ...workflowData };
  delete stableData.updatedAt;
  delete stableData.createdAt;
  const hash = computeHash(stableData);

  // Check last backup
  const lastHash = await storage.getLastBackupHash(workflowId, userId);

  if (lastHash === hash) {
    console.log(`Workflow ${workflowId} unchanged, skipping backup`);
    return { backed_up: false, reason: 'no changes' };
  }

  // Save new backup
  await storage.saveBackup(workflowId, userId, workflowData, hash);
  console.log(`Workflow ${workflowId} backed up successfully`);
  return { backed_up: true, hash };
}
```

---

## Data Model

### Supabase Tables

#### Table: `workflow_backups`

```sql
CREATE TABLE workflow_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  instance_id TEXT, -- Optional: for multi-instance support
  workflow_data JSONB NOT NULL,
  hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB -- Optional: workflow name, tags, etc.
);

-- Index for fast queries
CREATE INDEX idx_workflow_backups_user_workflow 
  ON workflow_backups(user_id, workflow_id, created_at DESC);

-- Index for hash lookups (deduplication)
CREATE INDEX idx_workflow_backups_hash 
  ON workflow_backups(workflow_id, hash);
```

#### Table: `encrypted_credentials`

```sql
CREATE TABLE encrypted_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  instance_id TEXT NOT NULL,
  encrypted_n8n_url TEXT NOT NULL,
  encrypted_api_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB,
  UNIQUE(user_id, instance_id)
);
```

#### Table: `agent_audit_log` (for monitoring)

```sql
CREATE TABLE agent_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  agent_type TEXT NOT NULL, -- 'jules' | 'background' | 'mcp'
  job_name TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL, -- 'success' | 'failure' | 'warning'
  user_id TEXT,
  metadata JSONB,
  error_message TEXT
);

CREATE INDEX idx_agent_audit_log_timestamp 
  ON agent_audit_log(created_at DESC);
```

---

## UI Wireframe Notes

### Page: Workflow Backups

**Route**: `/workflows/[id]/backups`

**Layout**:
```
┌─────────────────────────────────────────┐
│ Workflow: Customer Onboarding          │
│ Last backup: 2 hours ago                │
│ Total backups: 15                       │
├─────────────────────────────────────────┤
│ [Enable Auto-Backup] [Schedule: 24h ▼]  │
├─────────────────────────────────────────┤
│ Backup History                          │
│ ┌─────────────────────────────────────┐ │
│ │ Jan 5, 2026 2:00 PM                 │ │
│ │ Hash: a3f5b2c8...                   │ │
│ │ [View] [Restore] [Download]         │ │
│ ├─────────────────────────────────────┤ │
│ │ Jan 5, 2026 8:00 AM                 │ │
│ │ Hash: b4e6c3d9...                   │ │
│ │ [View] [Restore] [Download]         │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Features**:
- Enable/disable auto-backup per workflow
- Configure backup schedule (dropdown: 12h, 24h, custom)
- View backup history (list with timestamp, hash)
- Restore from backup (confirmation modal)
- Download backup as JSON

### Page: Credentials Setup

**Route**: `/settings/credentials`

**Layout**:
```
┌─────────────────────────────────────────┐
│ n8n Credentials                         │
├─────────────────────────────────────────┤
│ Instance: Production                    │
│ URL: https://n8n.example.com            │
│ API Key: n8n_api_****************       │
│ [Edit] [Delete]                         │
├─────────────────────────────────────────┤
│ [+ Add Instance]                        │
└─────────────────────────────────────────┘
```

**Features**:
- Add multiple n8n instances (prod, stage, dev)
- Test connection (verify API key)
- Masked API key display (show last 4 chars)
- Edit/delete credentials

---

## Security Considerations

1. **Encryption at Rest**:
   - All credentials encrypted using AES-256-GCM
   - Unique IV for each encryption operation
   - Authentication tag for integrity verification

2. **Access Control**:
   - User-scoped queries (can't access other users' data)
   - Clerk authentication on all API routes
   - Service role key for backend operations (not exposed to client)

3. **Secret Management**:
   - ENCRYPTION_KEY in `.env.local` (never commit)
   - Rotate encryption key periodically (re-encrypt data)
   - Use environment variables for all secrets

4. **Audit Logging**:
   - Log all backup operations (success/failure)
   - Log credential access (who, when, what)
   - Monitor for unusual activity (too many failures, etc.)

5. **Rate Limiting** (Post-MVP):
   - Limit API calls to n8n (respect rate limits)
   - Throttle backup frequency per user

---

## Testing Plan

### Unit Tests

- ✅ `crypto.ts`: Test encrypt/decrypt roundtrip
- ✅ `adapter.ts`: Mock Supabase calls, verify deduplication logic
- ✅ `backupScheduler.ts`: Mock cron, verify job execution

### Integration Tests

- ✅ End-to-end backup flow (fetch from n8n API, save to DB)
- ✅ Credential storage and retrieval
- ✅ Hash comparison logic (same hash = skip, different hash = save)

### Manual Testing

- ✅ Set up credentials in UI
- ✅ Trigger backup manually (dry-run)
- ✅ Verify backup appears in UI
- ✅ Modify workflow in n8n, verify new backup created
- ✅ Don't modify workflow, verify no new backup (deduplication)
- ✅ Restore from backup, verify workflow restored correctly

---

## Rollout Plan

### Phase 1: Core Implementation (Week 1)
- Implement crypto utilities (`crypto.ts`)
- Create storage adapter (`adapter.ts`, `supabaseAdapter.ts`)
- Build API routes (`/api/credentials`, `/api/backups`)

### Phase 2: Scheduler (Week 2)
- Implement backup scheduler (node-cron)
- Add deduplication logic
- Create dry-run script for testing

### Phase 3: UI (Week 3)
- Build credentials setup page
- Build backup history page
- Add restore functionality

### Phase 4: Testing & Launch (Week 4)
- Unit and integration tests
- Manual testing with real n8n instance
- Deploy to production (limited beta)
- Monitor logs and performance

---

## Monitoring & Alerts

### Metrics to Track

- **Backup success rate**: % of successful backups
- **Deduplication rate**: % of backups skipped (no changes)
- **Average backup duration**: Time to complete backup job
- **Storage growth**: Total size of backups over time
- **Credential access**: How often credentials are accessed

### Alerts

- 🚨 Backup failure (3+ consecutive failures)
- 🚨 Credential decryption error (invalid key, corrupted data)
- ⚠️ Backup duration exceeds 5 minutes (performance issue)
- ⚠️ Storage exceeds 1GB per user (potential abuse)

---

## Future Enhancements

1. **Backup Diff Viewer**:
   - Show side-by-side comparison of two backups
   - Highlight what changed (nodes added/removed/modified)

2. **Automated Restoration**:
   - Detect workflow deletion in n8n
   - Prompt user to restore from latest backup
   - Option: auto-restore on deletion

3. **Backup Export/Import**:
   - Download all backups as ZIP
   - Import backups from another FlowVault instance

4. **Smart Scheduling**:
   - Learn workflow change patterns
   - Increase backup frequency for frequently-changed workflows
   - Decrease for stable workflows

5. **Webhook Integration**:
   - Trigger backup on n8n workflow save (via webhook)
   - Real-time backups instead of scheduled

## References

- [Agent Overview](./agents/README.md)
- [Storage Fallback Strategy](./STORAGE_FALLBACK.md)
- [Delegation Playbook](./DELEGATION.md)
