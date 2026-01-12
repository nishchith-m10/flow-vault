/**
 * Workflow backup database operations
 */

import type { Database } from '../supabase/types';
import { supabase } from './client';

type WorkflowBackup = Database['public']['Tables']['flowvault_workflow_backups']['Row'];
type WorkflowBackupInsert = Database['public']['Tables']['flowvault_workflow_backups']['Insert'];

/**
 * Creates a new workflow backup
 */
export async function createWorkflowBackup(backup: WorkflowBackupInsert) {
  const { data, error } = await supabase
    .from('flowvault_workflow_backups')
    .insert(backup as never)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create workflow backup: ${error.message}`);
  }

  return data as WorkflowBackup;
}

/**
 * Gets all backups for a specific workflow
 */
export async function getWorkflowBackups(
  clerkUserId: string,
  workflowId: string
) {
  const { data, error } = await supabase
    .from('flowvault_workflow_backups')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .eq('workflow_id', workflowId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch workflow backups: ${error.message}`);
  }

  return data as WorkflowBackup[];
}

/**
 * Gets the latest backup for a workflow
 */
export async function getLatestWorkflowBackup(
  clerkUserId: string,
  workflowId: string
) {
  const { data, error } = await supabase
    .from('flowvault_workflow_backups')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .eq('workflow_id', workflowId)
    .eq('is_active', true)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch latest backup: ${error.message}`);
  }

  return data as WorkflowBackup | null;
}

/**
 * Gets all active backups for a user
 */
export async function getAllUserBackups(clerkUserId: string) {
  const { data, error } = await supabase
    .from('flowvault_workflow_backups')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch user backups: ${error.message}`);
  }

  return data as WorkflowBackup[];
}

/**
 * Gets a backup by ID
 */
export async function getBackupById(id: string) {
  const { data, error } = await supabase
    .from('flowvault_workflow_backups')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(`Failed to fetch backup: ${error.message}`);
  }

  return data as WorkflowBackup;
}

/**
 * Deactivates old versions when creating a new backup
 */
export async function deactivateOldBackups(
  clerkUserId: string,
  workflowId: string
) {
  const { error } = await supabase
    .from('flowvault_workflow_backups')
    .update({ is_active: false } as never)
    .eq('clerk_user_id', clerkUserId)
    .eq('workflow_id', workflowId)
    .eq('is_active', true);

  if (error) {
    throw new Error(`Failed to deactivate old backups: ${error.message}`);
  }
}

/**
 * Deletes a backup
 */
export async function deleteBackup(id: string) {
  const { error } = await supabase
    .from('flowvault_workflow_backups')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete backup: ${error.message}`);
  }
}

/**
 * Gets backup count for a user (for rate limiting)
 */
export async function getUserBackupCount(clerkUserId: string): Promise<number> {
  const { count, error } = await supabase
    .from('flowvault_workflow_backups')
    .select('*', { count: 'exact', head: true })
    .eq('clerk_user_id', clerkUserId);

  if (error) {
    throw new Error(`Failed to count backups: ${error.message}`);
  }

  return count ?? 0;
}
