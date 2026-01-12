/**
 * Content-based deduplication for workflow backups
 * Uses SHA-256 hashing to detect duplicate workflow content
 */

import crypto from 'crypto';
import { getLatestWorkflowBackup } from '../database';
import type { N8nWorkflow, DeduplicationResult } from './types';

/**
 * Generates SHA-256 hash of workflow data
 * Normalizes data before hashing to ensure consistency
 */
export function generateContentHash(workflow: N8nWorkflow): string {
  // Create normalized copy excluding metadata that changes frequently
  const normalizedWorkflow = {
    id: workflow.id,
    name: workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: workflow.settings,
    staticData: workflow.staticData,
  };

  // Sort keys for consistent hashing
  const sortedData = JSON.stringify(normalizedWorkflow, Object.keys(normalizedWorkflow).sort());
  
  return crypto
    .createHash('sha256')
    .update(sortedData)
    .digest('hex');
}

/**
 * Checks if workflow content has changed since last backup
 */
export async function checkDuplication(
  clerkUserId: string,
  workflowId: string,
  workflow: N8nWorkflow
): Promise<DeduplicationResult> {
  try {
    // Get latest backup for this workflow
    const latestBackup = await getLatestWorkflowBackup(clerkUserId, workflowId);

    if (!latestBackup) {
      // No previous backup - not a duplicate
      const contentHash = generateContentHash(workflow);
      return {
        isDuplicate: false,
        existingBackupId: null,
        contentHash,
      };
    }

    // Generate hash for current workflow
    const currentHash = generateContentHash(workflow);

    // Compare with latest backup hash
    if (currentHash === latestBackup.content_hash) {
      // Content unchanged - duplicate
      return {
        isDuplicate: true,
        existingBackupId: latestBackup.id,
        contentHash: currentHash,
      };
    }

    // Content changed - not a duplicate
    return {
      isDuplicate: false,
      existingBackupId: null,
      contentHash: currentHash,
    };
  } catch (error) {
    console.error('Deduplication check failed:', error);
    
    // On error, generate new hash and treat as non-duplicate to ensure backup
    const contentHash = generateContentHash(workflow);
    return {
      isDuplicate: false,
      existingBackupId: null,
      contentHash,
    };
  }
}

/**
 * Validates workflow data structure
 */
export function validateWorkflowData(workflow: unknown): workflow is N8nWorkflow {
  if (!workflow || typeof workflow !== 'object') {
    return false;
  }

  const w = workflow as Record<string, unknown>;
  
  return (
    typeof w.id === 'string' &&
    typeof w.name === 'string' &&
    Array.isArray(w.nodes) &&
    typeof w.connections === 'object'
  );
}
