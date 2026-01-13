/**
 * Supabase Storage Adapter Implementation
 * 
 * SAMPLE - DO NOT COMMIT TO GIT
 * 
 * Implements the StorageAdapter interface using Supabase as the backend.
 * Requires the following Supabase tables:
 * - workflow_backups
 * - encrypted_credentials
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  StorageAdapter,
  BackupRecord,
  CredentialRecord,
} from './adapter';

/**
 * Database schema (for reference - create these tables in Supabase)
 * 
 * CREATE TABLE workflow_backups (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   workflow_id TEXT NOT NULL,
 *   user_id TEXT NOT NULL,
 *   instance_id TEXT,
 *   workflow_data JSONB NOT NULL,
 *   hash TEXT NOT NULL,
 *   created_at TIMESTAMPTZ DEFAULT now(),
 *   metadata JSONB
 * );
 * 
 * CREATE INDEX idx_workflow_backups_user_workflow 
 *   ON workflow_backups(user_id, workflow_id, created_at DESC);
 * 
 * CREATE TABLE encrypted_credentials (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id TEXT NOT NULL,
 *   instance_id TEXT NOT NULL,
 *   encrypted_n8n_url TEXT NOT NULL,
 *   encrypted_api_key TEXT NOT NULL,
 *   created_at TIMESTAMPTZ DEFAULT now(),
 *   updated_at TIMESTAMPTZ DEFAULT now(),
 *   metadata JSONB,
 *   UNIQUE(user_id, instance_id)
 * );
 */

export default class SupabaseAdapter implements StorageAdapter {
  private client: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role for backend

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials. Check .env.local');
    }

    this.client = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Save a workflow backup
   */
  async saveBackup(
    workflowId: string,
    userId: string,
    data: import('@/lib/backup/types').N8nWorkflow,
    hash: string,
    instanceId?: string
  ): Promise<BackupRecord> {
    const { data: backup, error } = await this.client
      .from('workflow_backups')
      .insert({
        workflow_id: workflowId,
        user_id: userId,
        instance_id: instanceId,
        workflow_data: data,
        hash,
        metadata: {
          workflow_name: data.name,
          workflow_active: data.active,
          tags: data.tags || [],
        },
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to save backup:', error);
      throw new Error(`Failed to save backup: ${error.message}`);
    }

    return backup as BackupRecord;
  }

  /**
   * Get all backups for a workflow
   */
  async getBackups(
    workflowId: string,
    userId: string,
    limit: number = 100
  ): Promise<BackupRecord[]> {
    const { data, error } = await this.client
      .from('workflow_backups')
      .select('*')
      .eq('workflow_id', workflowId)
      .eq('user_id', userId) // Security: scope to user
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to get backups:', error);
      throw new Error(`Failed to get backups: ${error.message}`);
    }

    return (data || []) as BackupRecord[];
  }

  /**
   * Get the hash of the last backup for deduplication
   */
  async getLastBackupHash(
    workflowId: string,
    userId: string,
    instanceId?: string
  ): Promise<string | null> {
    let query = this.client
      .from('workflow_backups')
      .select('hash')
      .eq('workflow_id', workflowId)
      .eq('user_id', userId);

    if (instanceId) {
      query = query.eq('instance_id', instanceId);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // No backup exists yet (expected on first run)
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Failed to get last backup hash:', error);
      return null;
    }

    return data?.hash || null;
  }

  /**
   * Store encrypted n8n credentials
   */
  async storeCredential(
    userId: string,
    instanceId: string,
    encryptedUrl: string,
    encryptedApiKey: string
  ): Promise<CredentialRecord> {
    const { data, error } = await this.client
      .from('encrypted_credentials')
      .upsert({
        user_id: userId,
        instance_id: instanceId,
        encrypted_n8n_url: encryptedUrl,
        encrypted_api_key: encryptedApiKey,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to store credential:', error);
      throw new Error(`Failed to store credential: ${error.message}`);
    }

    return data as CredentialRecord;
  }

  /**
   * Get encrypted credentials for a user
   */
  async getCredentials(
    userId: string,
    instanceId?: string
  ): Promise<CredentialRecord[]> {
    let query = this.client
      .from('encrypted_credentials')
      .select('*')
      .eq('user_id', userId);

    if (instanceId) {
      query = query.eq('instance_id', instanceId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to get credentials:', error);
      throw new Error(`Failed to get credentials: ${error.message}`);
    }

    return (data || []) as CredentialRecord[];
  }

  /**
   * Delete a credential
   */
  async deleteCredential(userId: string, credentialId: string): Promise<boolean> {
    const { error } = await this.client
      .from('encrypted_credentials')
      .delete()
      .eq('id', credentialId)
      .eq('user_id', userId); // Security: ensure user owns credential

    if (error) {
      console.error('Failed to delete credential:', error);
      return false;
    }

    return true;
  }

  /**
   * Delete old backups (for cleanup/retention policy)
   */
  async deleteOldBackups(userId: string, retentionDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const { data, error } = await this.client
      .from('workflow_backups')
      .delete()
      .eq('user_id', userId)
      .lt('created_at', cutoffDate.toISOString())
      .select();

    if (error) {
      console.error('Failed to delete old backups:', error);
      return 0;
    }

    return data?.length || 0;
  }

  /**
   * Get backup statistics for a user
   */
  async getBackupStats(userId: string): Promise<{
    total_backups: number;
    unique_workflows: number;
    total_size_bytes: number;
    oldest_backup: string | null;
    newest_backup: string | null;
  }> {
    // Get total count and unique workflows
    const { data, error } = await this.client
      .from('workflow_backups')
      .select('workflow_id, workflow_data, created_at')
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to get backup stats:', error);
      throw new Error(`Failed to get backup stats: ${error.message}`);
    }

    const backups = data || [];
    const uniqueWorkflows = new Set(backups.map((b: any) => b.workflow_id)).size;
    
    // Calculate total size (approximate)
    const totalSize = backups.reduce((sum: number, b: any) => {
      return sum + JSON.stringify(b.workflow_data).length;
    }, 0);

    const timestamps = backups.map((b: any) => b.created_at).sort();

    return {
      total_backups: backups.length,
      unique_workflows: uniqueWorkflows,
      total_size_bytes: totalSize,
      oldest_backup: timestamps[0] || null,
      newest_backup: timestamps[timestamps.length - 1] || null,
    };
  }
}

/**
 * Example usage:
 * 
 * import SupabaseAdapter from '@/lib/storage/supabaseAdapter.sample';
 * 
 * const storage = new SupabaseAdapter();
 * 
 * // Save a backup
 * await storage.saveBackup('wf_123', 'user_456', workflowData, hash);
 * 
 * // Get backups
 * const backups = await storage.getBackups('wf_123', 'user_456');
 * 
 * // Check if backup needed
 * const lastHash = await storage.getLastBackupHash('wf_123', 'user_456');
 * if (lastHash !== currentHash) {
 *   await storage.saveBackup(...);
 * }
 */
