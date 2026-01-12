/**
 * Storage Adapter Interface for FlowVault
 * 
 * DRAFT - DO NOT COMMIT TO GIT
 * 
 * Defines the contract for storage implementations (Supabase, SQLite, etc.)
 * Allows easy switching between storage backends without changing business logic.
 */

/**
 * Backup record structure
 */
export interface BackupRecord {
  id: string;
  workflow_id: string;
  user_id: string;
  instance_id?: string; // Optional: for multi-instance support
  workflow_data: import('@/lib/backup/types').N8nWorkflow; // Full workflow JSON
  hash: string; // SHA-256 hash for deduplication
  created_at: string; // ISO timestamp
  metadata?: {
    workflow_name?: string;
    workflow_active?: boolean;
    tags?: string[];
    version?: number;
  };
}

/**
 * Credential record structure
 * 
 * SECURITY: All sensitive fields must be encrypted before storage
 */
export interface CredentialRecord {
  id: string;
  user_id: string;
  instance_id: string; // e.g., 'prod', 'stage', 'dev'
  encrypted_n8n_url: string; // Encrypted using AES-256-GCM
  encrypted_api_key: string; // Encrypted using AES-256-GCM
  created_at: string;
  updated_at: string;
  metadata?: {
    instance_name?: string;
    last_validated?: string; // Last time credentials were verified
  };
}

/**
 * Storage adapter interface
 * 
 * All storage implementations must implement these methods
 */
export interface StorageAdapter {
  /**
   * Save a workflow backup
   * 
   * @param workflowId - n8n workflow ID
   * @param userId - User ID (from Clerk)
   * @param data - Full workflow JSON
   * @param hash - SHA-256 hash of workflow data
   * @param instanceId - Optional instance identifier
   * @returns Created backup record
   */
  saveBackup(
    workflowId: string,
    userId: string,
    data: import('@/lib/backup/types').N8nWorkflow,
    hash: string,
    instanceId?: string
  ): Promise<BackupRecord>;

  /**
   * Get all backups for a workflow
   * 
   * @param workflowId - n8n workflow ID
   * @param userId - User ID (scoped to user for security)
   * @param limit - Max number of backups to return (default: 100)
   * @returns Array of backup records, sorted by created_at DESC
   */
  getBackups(
    workflowId: string,
    userId: string,
    limit?: number
  ): Promise<BackupRecord[]>;

  /**
   * Get the hash of the last backup for deduplication
   * 
   * @param workflowId - n8n workflow ID
   * @param userId - User ID
   * @param instanceId - Optional instance identifier
   * @returns Hash string or null if no backup exists
   */
  getLastBackupHash(
    workflowId: string,
    userId: string,
    instanceId?: string
  ): Promise<string | null>;

  /**
   * Store encrypted n8n credentials
   * 
   * @param userId - User ID
   * @param instanceId - Instance identifier (e.g., 'prod', 'dev')
   * @param encryptedUrl - Encrypted n8n URL
   * @param encryptedApiKey - Encrypted n8n API key
   * @returns Created credential record
   */
  storeCredential(
    userId: string,
    instanceId: string,
    encryptedUrl: string,
    encryptedApiKey: string
  ): Promise<CredentialRecord>;

  /**
   * Get encrypted credentials for a user
   * 
   * @param userId - User ID
   * @param instanceId - Optional instance filter
   * @returns Array of credential records
   */
  getCredentials(
    userId: string,
    instanceId?: string
  ): Promise<CredentialRecord[]>;

  /**
   * Delete a credential
   * 
   * @param userId - User ID (for security scoping)
   * @param credentialId - Credential ID to delete
   * @returns true if deleted, false if not found
   */
  deleteCredential(userId: string, credentialId: string): Promise<boolean>;

  /**
   * Delete old backups (for cleanup/retention policy)
   * 
   * @param userId - User ID
   * @param retentionDays - Keep backups newer than this many days
   * @returns Number of backups deleted
   */
  deleteOldBackups(userId: string, retentionDays: number): Promise<number>;

  /**
   * Get backup statistics for a user
   * 
   * @param userId - User ID
   * @returns Stats object
   */
  getBackupStats(userId: string): Promise<{
    total_backups: number;
    unique_workflows: number;
    total_size_bytes: number;
    oldest_backup: string | null;
    newest_backup: string | null;
  }>;
}

/**
 * Factory function to create storage adapter based on environment
 * 
 * @returns Configured storage adapter instance
 * 
 * @example
 * import { createStorageAdapter } from '@/lib/storage/adapter';
 * const storage = createStorageAdapter();
 * const backups = await storage.getBackups('wf_123', 'user_456');
 */
export async function createStorageAdapter(): Promise<StorageAdapter> {
  // In production, use Supabase
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    // Import dynamically to avoid bundling in dev
    const { default: SupabaseAdapter } = await import('./supabaseAdapter');
    return new SupabaseAdapter();
  }

  // In development, fall back to SQLite (if implemented)
  // const { default: SQLiteAdapter } = await import('./sqliteAdapter');
  // return new SQLiteAdapter();

  throw new Error('No storage adapter configured. Set NEXT_PUBLIC_SUPABASE_URL in .env.local');
}

/**
 * Helper function to check if a backup already exists with same hash
 * (for deduplication logic)
 * 
 * @param storage - Storage adapter instance
 * @param workflowId - Workflow ID
 * @param userId - User ID
 * @param hash - Hash to check
 * @returns true if backup with same hash exists
 */
export async function backupExists(
  storage: StorageAdapter,
  workflowId: string,
  userId: string,
  hash: string
): Promise<boolean> {
  const lastHash = await storage.getLastBackupHash(workflowId, userId);
  return lastHash === hash;
}
