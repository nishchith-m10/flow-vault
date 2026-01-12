/**
 * Backup module exports
 */

export { runBackup, runBackupWithRetry } from './runner';
export { cleanupOldBackups, cleanupAllUsers, getRetentionPolicy } from './retention';
export { checkDuplication, generateContentHash, validateWorkflowData } from './deduplicator';
export { createN8nClient } from './n8nClient';
export { checkRateLimit, getRateLimitReset, batchWithRateLimit, clearRateLimitState } from './rateLimiter';
export {
  validateWorkflowStructure,
  decryptBackupData,
  restoreWorkflow,
  formatWorkflowForExport,
} from './restore';

export type {
  BackupJob,
  BackupJobResult,
  N8nWorkflow,
  BackupSchedule,
  RetentionPolicy,
  DeduplicationResult,
} from './types';
export type {
  RestoreOptions,
  RestoreResult,
  WorkflowValidationResult,
} from './restore';
