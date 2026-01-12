/**
 * Backup system types
 */

export interface BackupJob {
  id: string;
  clerk_user_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  backup_type: 'scheduled' | 'manual';
  started_at: string;
  completed_at: string | null;
  workflows_processed: number;
  workflows_backed_up: number;
  workflows_skipped: number;
  error_message: string | null;
  metadata: Record<string, unknown>;
}

export interface BackupJobResult {
  success: boolean;
  jobId: string;
  workflowsProcessed: number;
  workflowsBackedUp: number;
  workflowsSkipped: number;
  errors: string[];
}

export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  tags?: Array<{ id: string; name: string }>;
  nodes: unknown[];
  connections: Record<string, unknown>;
  settings?: Record<string, unknown>;
  staticData?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface BackupSchedule {
  enabled: boolean;
  frequency: 'hourly' | 'daily' | 'weekly' | 'manual';
  retentionDays: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
}

export interface RetentionPolicy {
  retentionDays: number;
  keepMinimumVersions: number;
}

export interface DeduplicationResult {
  isDuplicate: boolean;
  existingBackupId: string | null;
  contentHash: string;
}
