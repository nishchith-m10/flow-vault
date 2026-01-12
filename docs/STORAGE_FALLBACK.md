# Storage Options and Fallback Strategy

**Status**: DRAFT - Storage backend options and fallback plan

## Overview

FlowVault requires a reliable storage backend for workflow backups, credentials, and audit logs. This document outlines storage options, trade-offs, and fallback strategies.

---

## Primary Storage: Supabase

**Recommended for production and MVP**

### Pros
- ✅ PostgreSQL-based (ACID compliance, reliability)
- ✅ Built-in authentication integration (works with Clerk)
- ✅ Real-time subscriptions (for live backup updates)
- ✅ Row-level security (RLS) for data isolation
- ✅ Generous free tier (500MB database, 1GB file storage)
- ✅ Hosted service (no server maintenance)
- ✅ Built-in backups and point-in-time recovery

### Cons
- ❌ Vendor lock-in (migration effort if switching)
- ❌ Costs scale with usage (after free tier)
- ❌ Requires internet connectivity (not offline)

### Setup

```bash
# Install Supabase client
npm install @supabase/supabase-js

# Environment variables
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Schema Creation

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Workflow backups table
CREATE TABLE workflow_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  instance_id TEXT,
  workflow_data JSONB NOT NULL,
  hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB
);

-- Indexes
CREATE INDEX idx_workflow_backups_user_workflow 
  ON workflow_backups(user_id, workflow_id, created_at DESC);

-- Encrypted credentials table
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

-- Agent audit log
CREATE TABLE agent_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  agent_type TEXT NOT NULL,
  job_name TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  user_id TEXT,
  metadata JSONB,
  error_message TEXT
);

CREATE INDEX idx_agent_audit_log_timestamp 
  ON agent_audit_log(created_at DESC);

-- Row-level security (RLS)
ALTER TABLE workflow_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE encrypted_credentials ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own data
CREATE POLICY user_workflow_backups 
  ON workflow_backups 
  FOR ALL 
  USING (auth.uid() = user_id);

CREATE POLICY user_credentials 
  ON encrypted_credentials 
  FOR ALL 
  USING (auth.uid() = user_id);
```

---

## Fallback Storage: SQLite (Local Development)

**Recommended for local development and testing**

### Pros
- ✅ No external dependencies (runs locally)
- ✅ Fast for development (no network latency)
- ✅ Easy to reset/wipe data (delete file)
- ✅ Works offline

### Cons
- ❌ Not suitable for production (single file, no concurrent writes)
- ❌ No built-in backups or replication
- ❌ Requires file system access (not serverless-compatible)

### Setup

```bash
# Install better-sqlite3
npm install better-sqlite3
npm install -D @types/better-sqlite3
```

### Implementation

**File**: `src/lib/storage/sqliteAdapter.sample.ts`

```typescript
import Database from 'better-sqlite3';
import { StorageAdapter, BackupRecord, CredentialRecord } from './adapter';

export default class SQLiteAdapter implements StorageAdapter {
  private db: Database.Database;

  constructor(dbPath: string = './data/flowvault.db') {
    this.db = new Database(dbPath);
    this.initTables();
  }

  private initTables() {
    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS workflow_backups (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        instance_id TEXT,
        workflow_data TEXT NOT NULL,
        hash TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_workflow_backups 
        ON workflow_backups(user_id, workflow_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS encrypted_credentials (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        instance_id TEXT NOT NULL,
        encrypted_n8n_url TEXT NOT NULL,
        encrypted_api_key TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT,
        UNIQUE(user_id, instance_id)
      );
    `);
  }

  async saveBackup(
    workflowId: string,
    userId: string,
    data: any,
    hash: string,
    instanceId?: string
  ): Promise<BackupRecord> {
    const id = crypto.randomUUID();
    const stmt = this.db.prepare(`
      INSERT INTO workflow_backups (id, workflow_id, user_id, instance_id, workflow_data, hash, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      workflowId,
      userId,
      instanceId || null,
      JSON.stringify(data),
      hash,
      JSON.stringify({ workflow_name: data.name })
    );

    return {
      id,
      workflow_id: workflowId,
      user_id: userId,
      instance_id: instanceId,
      workflow_data: data,
      hash,
      created_at: new Date().toISOString(),
    };
  }

  async getBackups(
    workflowId: string,
    userId: string,
    limit: number = 100
  ): Promise<BackupRecord[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM workflow_backups
      WHERE workflow_id = ? AND user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(workflowId, userId, limit);
    return rows.map(row => ({
      ...row,
      workflow_data: JSON.parse(row.workflow_data),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }));
  }

  async getLastBackupHash(
    workflowId: string,
    userId: string,
    instanceId?: string
  ): Promise<string | null> {
    let query = `
      SELECT hash FROM workflow_backups
      WHERE workflow_id = ? AND user_id = ?
    `;
    const params = [workflowId, userId];

    if (instanceId) {
      query += ' AND instance_id = ?';
      params.push(instanceId);
    }

    query += ' ORDER BY created_at DESC LIMIT 1';

    const stmt = this.db.prepare(query);
    const row = stmt.get(...params);
    return row?.hash || null;
  }

  // ... implement other methods
}
```

---

## Alternative: PostgreSQL (Self-Hosted)

**For teams wanting full control**

### Pros
- ✅ Full control over infrastructure
- ✅ No vendor lock-in
- ✅ Can run on-premises (for compliance)

### Cons
- ❌ Requires server maintenance (backups, updates, scaling)
- ❌ More setup overhead

### Setup

Use the same schema as Supabase (PostgreSQL-compatible).

---

## Fallback Strategy Decision Tree

```
┌───────────────────────────────────────┐
│ Which environment?                    │
└───────────────┬───────────────────────┘
                │
        ┌───────┴───────┐
        │               │
    Production      Development
        │               │
        ▼               ▼
  ┌─────────┐     ┌──────────┐
  │Supabase │     │ SQLite   │
  │(Primary)│     │ (Local)  │
  └─────────┘     └──────────┘
        │               │
        │ Supabase      │ Need cloud
        │ unavailable?  │ storage?
        ▼               ▼
  ┌──────────┐    ┌─────────┐
  │PostgreSQL│    │Supabase │
  │(Self-host│    │(Fallback│
  └──────────┘    └─────────┘
```

### Implementation

**File**: `src/lib/storage/adapter.ts`

```typescript
export function createStorageAdapter(): StorageAdapter {
  // Production: Use Supabase
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL not set for production');
    }
    const SupabaseAdapter = require('./supabaseAdapter').default;
    return new SupabaseAdapter();
  }

  // Development: Use SQLite if configured
  if (process.env.USE_SQLITE === 'true') {
    const SQLiteAdapter = require('./sqliteAdapter').default;
    return new SQLiteAdapter();
  }

  // Default: Use Supabase (even in dev)
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const SupabaseAdapter = require('./supabaseAdapter').default;
    return new SupabaseAdapter();
  }

  throw new Error('No storage adapter configured. Set NEXT_PUBLIC_SUPABASE_URL or USE_SQLITE=true');
}
```

---

## Migration Strategy

### Supabase to PostgreSQL

If you need to migrate from Supabase to self-hosted PostgreSQL:

1. **Export data** from Supabase:
   ```bash
   # Use Supabase CLI or pg_dump
   supabase db dump -f backup.sql
   ```

2. **Set up PostgreSQL**:
   ```bash
   # Install PostgreSQL
   brew install postgresql
   
   # Create database
   createdb flowvault
   ```

3. **Import data**:
   ```bash
   psql flowvault < backup.sql
   ```

4. **Update connection string**:
   ```bash
   # .env.local
   DATABASE_URL=postgresql://user:pass@localhost:5432/flowvault
   ```

### SQLite to Supabase

For moving from local SQLite to Supabase:

1. **Export SQLite data** as JSON:
   ```typescript
   const backups = db.prepare('SELECT * FROM workflow_backups').all();
   fs.writeFileSync('backups.json', JSON.stringify(backups));
   ```

2. **Import to Supabase**:
   ```typescript
   const backups = JSON.parse(fs.readFileSync('backups.json'));
   for (const backup of backups) {
     await supabase.from('workflow_backups').insert(backup);
   }
   ```

---

## Disaster Recovery

### Backup Strategy

1. **Supabase automatic backups** (included in paid plans):
   - Daily backups retained for 7 days
   - Point-in-time recovery (PITR)

2. **Manual exports** (recommended):
   ```bash
   # Weekly export
   supabase db dump -f backups/flowvault-$(date +%Y%m%d).sql
   ```

3. **Offsite storage**:
   - Upload backups to S3/GCS
   - Encrypt before upload

### Recovery Plan

1. **Database corruption**:
   - Restore from Supabase automatic backup
   - Or restore from manual export

2. **Supabase outage**:
   - Switch to PostgreSQL fallback (pre-configured)
   - Restore from latest export

3. **Data loss**:
   - Check Supabase audit logs
   - Restore from point-in-time backup

---

## Performance Considerations

### Indexing

Critical indexes for fast queries:
```sql
-- For backup history queries
CREATE INDEX idx_workflow_backups_user_workflow 
  ON workflow_backups(user_id, workflow_id, created_at DESC);

-- For deduplication lookups
CREATE INDEX idx_workflow_backups_hash 
  ON workflow_backups(workflow_id, hash);

-- For audit log queries
CREATE INDEX idx_agent_audit_log_timestamp 
  ON agent_audit_log(created_at DESC);
```

### Query Optimization

- **Limit rows returned**: Default to 100 backups per workflow
- **Paginate large result sets**: Use offset/limit or cursor-based pagination
- **Use JSONB indexes** (Supabase only):
  ```sql
  CREATE INDEX idx_workflow_data_name 
    ON workflow_backups ((workflow_data->>'name'));
  ```

### Caching

For frequently-accessed data:
- Cache last backup hash in Redis (reduce DB queries)
- Cache credentials in memory (decrypt once per session)

---

## Cost Estimation

### Supabase Free Tier

- 500MB database storage
- 1GB file storage
- Unlimited API requests
- 2GB bandwidth

**Estimated capacity**:
- ~1000 workflows @ 500KB each = 500MB
- Sufficient for MVP and small teams

### Supabase Pro ($25/month)

- 8GB database storage
- 100GB file storage
- 50GB bandwidth

**Estimated capacity**:
- ~16,000 workflows @ 500KB each = 8GB
- Suitable for medium teams (50-100 users)

### Cost Optimization

1. **Retention policy**: Delete backups older than 90 days
2. **Compression**: Gzip workflow JSON (reduce storage by ~70%)
3. **Deduplication**: Only store unique backups (already implemented)

---

## Recommendations

### For MVP
- **Use Supabase** (free tier)
- **SQLite for local dev** (optional)
- **Implement retention policy** (delete old backups)

### For Production (Scale)
- **Upgrade to Supabase Pro** when needed
- **Consider self-hosted PostgreSQL** for large enterprises
- **Implement caching** (Redis) for performance

### For Offline Support
- **Hybrid approach**: SQLite for offline, sync to Supabase when online
- **Conflict resolution**: Last-write-wins or manual merge

## References

- [Backup MVP Spec](./BACKUP_MVP.md)
- [Agent Overview](./agents/README.md)
