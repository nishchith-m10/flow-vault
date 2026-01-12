/**
 * Retention policy enforcement
 * Deletes old backups based on user's retention settings
 */

import { supabase } from '../database/client';
import { getUserSettings, createAuditLog } from '../database';
import type { RetentionPolicy } from './types';

/**
 * Gets retention policy for a user
 */
export async function getRetentionPolicy(clerkUserId: string): Promise<RetentionPolicy> {
  const settings = await getUserSettings(clerkUserId);
  
  return {
    retentionDays: settings.retention_days,
    keepMinimumVersions: 1, // Always keep at least 1 version
  };
}

/**
 * Cleans up old backups for a specific user
 */
export async function cleanupOldBackups(clerkUserId: string): Promise<number> {
  try {
    const policy = await getRetentionPolicy(clerkUserId);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

    // Get workflows with backups older than retention period
    const { data: oldBackups, error } = await supabase
      .from('flowvault_workflow_backups')
      .select('id, workflow_id, created_at')
      .eq('clerk_user_id', clerkUserId)
      .lt('created_at', cutoffDate.toISOString())
      .order('workflow_id')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch old backups: ${error.message}`);
    }

    if (!oldBackups || oldBackups.length === 0) {
      return 0;
    }

    // Group by workflow_id to respect keepMinimumVersions
    type BackupRecord = { id: string; workflow_id: string; created_at: string };
    const workflowGroups = new Map<string, BackupRecord[]>();
    
    for (const backup of oldBackups as BackupRecord[]) {
      const group = workflowGroups.get(backup.workflow_id) || [];
      group.push(backup);
      workflowGroups.set(backup.workflow_id, group);
    }

    // Determine which backups to delete
    const backupsToDelete: string[] = [];

    for (const [workflowId, backups] of workflowGroups) {
      // Get total backup count for this workflow
      const { count } = await supabase
        .from('flowvault_workflow_backups')
        .select('*', { count: 'exact', head: true })
        .eq('clerk_user_id', clerkUserId)
        .eq('workflow_id', workflowId);

      const totalBackups = count || 0;
      const canDelete = totalBackups - backups.length >= policy.keepMinimumVersions;

      if (canDelete) {
        // Delete all old backups for this workflow
        backupsToDelete.push(...backups.map(b => b.id));
      } else {
        // Keep minimum versions, delete oldest
        const toKeep = policy.keepMinimumVersions;
        const sorted = [...backups].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        backupsToDelete.push(...sorted.slice(toKeep).map(b => b.id));
      }
    }

    if (backupsToDelete.length === 0) {
      return 0;
    }

    // Delete backups
    const { error: deleteError } = await supabase
      .from('flowvault_workflow_backups')
      .delete()
      .in('id', backupsToDelete);

    if (deleteError) {
      throw new Error(`Failed to delete old backups: ${deleteError.message}`);
    }

    // Log cleanup
    await createAuditLog({
      clerk_user_id: clerkUserId,
      agent_name: 'retention_enforcer',
      action: 'cleanup_completed',
      status: 'success',
      metadata: {
        deleted_count: backupsToDelete.length,
        retention_days: policy.retentionDays,
        cutoff_date: cutoffDate.toISOString(),
      },
    });

    return backupsToDelete.length;
  } catch (error) {
    console.error('Retention cleanup failed:', error);
    
    await createAuditLog({
      clerk_user_id: clerkUserId,
      agent_name: 'retention_enforcer',
      action: 'cleanup_failed',
      status: 'error',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    throw error;
  }
}

/**
 * Runs cleanup for all users with backup enabled
 */
export async function cleanupAllUsers(): Promise<{
  usersProcessed: number;
  totalDeleted: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let usersProcessed = 0;
  let totalDeleted = 0;

  try {
    // Get all users with backup enabled
    const { data: users, error } = await supabase
      .from('flowvault_user_settings')
      .select('clerk_user_id')
      .eq('backup_enabled', true);

    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    if (!users || users.length === 0) {
      return { usersProcessed: 0, totalDeleted: 0, errors: [] };
    }

    // Process each user
    type UserRecord = { clerk_user_id: string };
    for (const user of users as UserRecord[]) {
      try {
        const deleted = await cleanupOldBackups(user.clerk_user_id);
        totalDeleted += deleted;
        usersProcessed++;
      } catch (error) {
        const errorMsg = `Cleanup failed for user ${user.clerk_user_id}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    return { usersProcessed, totalDeleted, errors };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown error');
    return { usersProcessed, totalDeleted, errors };
  }
}
