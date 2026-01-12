/**
 * Workflow restore logic for FlowVault
 * Handles decryption and restoration of workflows to n8n
 */

import { decrypt, type EncryptedData } from '../encryption';
import { createN8nClient } from './n8nClient';
import type { N8nWorkflow } from './types';

export interface RestoreOptions {
  backupId: string;
  clerkUserId: string;
  handleConflict?: 'skip' | 'overwrite' | 'create-new';
}

export interface RestoreResult {
  success: boolean;
  workflowId?: string;
  workflowName?: string;
  action?: 'created' | 'updated' | 'skipped';
  error?: string;
}

export interface WorkflowValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates workflow structure before restore
 */
export function validateWorkflowStructure(workflow: unknown): WorkflowValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if workflow is an object
  if (!workflow || typeof workflow !== 'object') {
    errors.push('Workflow data must be an object');
    return { valid: false, errors, warnings };
  }

  const wf = workflow as Record<string, unknown>;

  // Required fields
  if (!wf.name || typeof wf.name !== 'string') {
    errors.push('Workflow must have a name');
  }

  if (!wf.nodes || !Array.isArray(wf.nodes)) {
    errors.push('Workflow must have a nodes array');
  } else {
    // Validate nodes structure
    if (wf.nodes.length === 0) {
      warnings.push('Workflow has no nodes');
    }

    // Check for circular references in nodes (basic check)
    try {
      JSON.stringify(wf.nodes);
    } catch (_error) {
      errors.push('Workflow nodes contain circular references');
    }
  }

  if (!wf.connections || typeof wf.connections !== 'object') {
    warnings.push('Workflow has no connections object');
  }

  // Validate workflow size (5MB limit for safety)
  const workflowSize = JSON.stringify(workflow).length;
  if (workflowSize > 5 * 1024 * 1024) {
    warnings.push(`Workflow is large (${(workflowSize / 1024 / 1024).toFixed(2)}MB)`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Decrypts and validates workflow data from backup
 */
export async function decryptBackupData(
  encryptedData: EncryptedData,
  encryptionPassword: string
): Promise<{ success: boolean; workflow?: N8nWorkflow; error?: string }> {
  try {
    // Decrypt the workflow data
    const decryptionResult = await decrypt(encryptedData, encryptionPassword);

    if (!decryptionResult.success || !decryptionResult.plaintext) {
      return {
        success: false,
        error: decryptionResult.error || 'Decryption failed',
      };
    }

    // Parse JSON
    let workflow: N8nWorkflow;
    try {
      workflow = JSON.parse(decryptionResult.plaintext);
    } catch (_error) {
      return {
        success: false,
        error: 'Invalid workflow data: failed to parse JSON',
      };
    }

    // Validate structure
    const validation = validateWorkflowStructure(workflow);
    if (!validation.valid) {
      return {
        success: false,
        error: `Invalid workflow structure: ${validation.errors.join(', ')}`,
      };
    }

    return {
      success: true,
      workflow,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to decrypt backup',
    };
  }
}

/**
 * Restores a workflow to n8n
 */
export async function restoreWorkflow(
  workflow: N8nWorkflow,
  clerkUserId: string,
  options: {
    handleConflict?: 'skip' | 'overwrite' | 'create-new';
  } = {}
): Promise<RestoreResult> {
  try {
    const { handleConflict = 'create-new' } = options;

    // Create n8n client
    const client = await createN8nClient(clerkUserId);

    // Check if workflow exists
    let existingWorkflow: N8nWorkflow | null = null;
    if (workflow.id) {
      try {
        existingWorkflow = await client.fetchWorkflow(workflow.id);
      } catch (_error) {
        // Workflow doesn't exist, which is fine
        existingWorkflow = null;
      }
    }

    // Handle conflict based on strategy
    if (existingWorkflow) {
      if (handleConflict === 'skip') {
        return {
          success: true,
          workflowId: existingWorkflow.id,
          workflowName: existingWorkflow.name,
          action: 'skipped',
        };
      }

      if (handleConflict === 'overwrite') {
        // Update existing workflow
        const updatedWorkflow = await client.updateWorkflow(workflow.id!, workflow);
        return {
          success: true,
          workflowId: updatedWorkflow.id,
          workflowName: updatedWorkflow.name,
          action: 'updated',
        };
      }

      // Create new workflow (remove ID to force creation)
      const workflowCopy: Partial<N8nWorkflow> = { ...workflow };
      delete workflowCopy.id;
      const createdWorkflow = await client.createWorkflow(workflowCopy);
      return {
        success: true,
        workflowId: createdWorkflow.id,
        workflowName: createdWorkflow.name,
        action: 'created',
      };
    } else {
      // Create new workflow
      const workflowCopy: Partial<N8nWorkflow> = { ...workflow };
      delete workflowCopy.id; // Let n8n assign new ID
      const createdWorkflow = await client.createWorkflow(workflowCopy);
      return {
        success: true,
        workflowId: createdWorkflow.id,
        workflowName: createdWorkflow.name,
        action: 'created',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to restore workflow',
    };
  }
}

/**
 * Exports workflow data as n8n-compatible JSON
 */
export function formatWorkflowForExport(workflow: N8nWorkflow): string {
  // n8n expects workflows to be in a specific format for import
  const exportData = {
    name: workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    active: workflow.active,
    settings: workflow.settings || {},
    staticData: workflow.staticData || null,
    tags: workflow.tags || [],
  };

  return JSON.stringify(exportData, null, 2);
}
