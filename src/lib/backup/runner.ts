/**
 * Backup runner - orchestrates the backup process
 */

import { createN8nClient } from './n8nClient';
import { checkDuplication, validateWorkflowData } from './deduplicator';
import { batchWithRateLimit } from './rateLimiter';
import { encryptWorkflowData } from '../encryption';
import {
  createWorkflowBackup,
  deactivateOldBackups,
  createAuditLog,
} from '../database';
import { DatabaseError, N8nConnectionError } from '../errors';
import type { BackupJobResult, N8nWorkflow } from './types';

/**
 * Runs backup for a single user
 */
export async function runBackup(
  clerkUserId: string,
  backupType: 'scheduled' | 'manual' = 'scheduled'
): Promise<BackupJobResult> {
  const jobId = crypto.randomUUID();
  const errors: string[] = [];
  let workflowsProcessed = 0;
  let workflowsBackedUp = 0;
  let workflowsSkipped = 0;

  try {
    // Create n8n API client
    const n8nClient = await createN8nClient(clerkUserId);

    // Test connection first
    const connected = await n8nClient.testConnection();
    if (!connected) {
      throw new N8nConnectionError('Cannot connect to n8n instance');
    }

    // Fetch all workflows
    const workflows = await n8nClient.fetchWorkflows();
    workflowsProcessed = workflows.length;

    // Log backup start
    await createAuditLog({
      clerk_user_id: clerkUserId,
      agent_name: 'backup_runner',
      action: 'backup_started',
      status: 'running',
      metadata: {
        job_id: jobId,
        backup_type: backupType,
        workflow_count: workflows.length,
      },
    });

    // Get encryption password
    const encryptionPassword = process.env.FLOWVAULT_ENCRYPTION_KEY;
    if (!encryptionPassword) {
      throw new DatabaseError('Encryption key not configured');
    }

    // Process workflows with rate limiting
    await batchWithRateLimit(
      workflows,
      async (workflow: N8nWorkflow) => {
        try {
          // Validate workflow data
          if (!validateWorkflowData(workflow)) {
            const wf = workflow as { id?: string };
            errors.push(`Invalid workflow data for ${wf.id || 'unknown'}`);
            workflowsSkipped++;
            return;
          }

          // Check for duplication
          const dedupResult = await checkDuplication(
            clerkUserId,
            workflow.id,
            workflow
          );

          if (dedupResult.isDuplicate) {
            console.log(`Workflow ${workflow.id} unchanged, skipping backup`);
            workflowsSkipped++;
            return;
          }

          // Encrypt workflow data
          const encryptionResult = await encryptWorkflowData(
            workflow as Record<string, unknown>,
            encryptionPassword
          );

          if (!encryptionResult.success || !encryptionResult.data) {
            errors.push(
              `Encryption failed for ${workflow.id}: ${encryptionResult.error}`
            );
            workflowsSkipped++;
            return;
          }

          // Deactivate old versions
          await deactivateOldBackups(clerkUserId, workflow.id);

          // Get next version number
          // For now, we'll use a simple timestamp-based version
          const version = Date.now();

          // Extract tags
          const tags = workflow.tags?.map(t => t.name) || [];

          // Create backup
          await createWorkflowBackup({
            clerk_user_id: clerkUserId,
            workflow_id: workflow.id,
            workflow_name: workflow.name,
            workflow_data: encryptionResult.data as never,
            content_hash: dedupResult.contentHash,
            version,
            tags,
            is_active: true,
            backup_type: backupType,
          });

          workflowsBackedUp++;
        } catch (error) {
          const errorMsg = `Failed to backup workflow ${workflow.id}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`;
          console.error(errorMsg);
          errors.push(errorMsg);
          workflowsSkipped++;
        }
      },
      clerkUserId
    );

    // Log backup completion
    await createAuditLog({
      clerk_user_id: clerkUserId,
      agent_name: 'backup_runner',
      action: 'backup_completed',
      status: 'success',
      metadata: {
        job_id: jobId,
        workflows_processed: workflowsProcessed,
        workflows_backed_up: workflowsBackedUp,
        workflows_skipped: workflowsSkipped,
        errors: errors.length,
      },
    });

    return {
      success: true,
      jobId,
      workflowsProcessed,
      workflowsBackedUp,
      workflowsSkipped,
      errors,
    };
  } catch (error) {
    // Log backup failure
    await createAuditLog({
      clerk_user_id: clerkUserId,
      agent_name: 'backup_runner',
      action: 'backup_failed',
      status: 'error',
      metadata: {
        job_id: jobId,
        error: error instanceof Error ? error.message : 'Unknown error',
        workflows_processed: workflowsProcessed,
        workflows_backed_up: workflowsBackedUp,
        workflows_skipped: workflowsSkipped,
      },
    });

    errors.push(error instanceof Error ? error.message : 'Unknown error');

    return {
      success: false,
      jobId,
      workflowsProcessed,
      workflowsBackedUp,
      workflowsSkipped,
      errors,
    };
  }
}

/**
 * Runs backup with retry logic
 */
export async function runBackupWithRetry(
  clerkUserId: string,
  backupType: 'scheduled' | 'manual' = 'scheduled',
  maxRetries = 3
): Promise<BackupJobResult> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await runBackup(clerkUserId, backupType);
      
      if (result.success) {
        return result;
      }

      // If backup partially succeeded, don't retry
      if (result.workflowsBackedUp > 0) {
        return result;
      }

      lastError = new Error(result.errors.join(', '));
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt < maxRetries) {
        // Exponential backoff: 2^attempt seconds
        const delayMs = Math.pow(2, attempt) * 1000;
        console.log(`Backup attempt ${attempt} failed, retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError || new Error('Backup failed after all retries');
}
