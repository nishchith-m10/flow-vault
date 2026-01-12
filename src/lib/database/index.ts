/**
 * FlowVault Database Access Layer
 * Typed functions for all database operations
 */

export { supabase, createUserClient } from './client';

export {
  getUserSettings,
  createUserSettings,
  updateUserSettings,
  deleteUserSettings,
  userSettingsExist,
} from './userSettings';

export {
  createWorkflowBackup,
  getWorkflowBackups,
  getLatestWorkflowBackup,
  getAllUserBackups,
  getBackupById,
  deactivateOldBackups,
  deleteBackup,
  getUserBackupCount,
} from './workflowBackups';

export {
  archiveWorkflow,
  getArchivedWorkflows,
  getArchivedWorkflowById,
  unarchiveWorkflow,
  isWorkflowArchived,
} from './archivedWorkflows';

export {
  moveToTrash,
  getTrashItems,
  restoreFromTrash,
  permanentlyDelete,
  emptyTrash,
  getExpiredTrashItems,
} from './trash';

export {
  createAuditLog,
  getUserAuditLogs,
  getAgentAuditLogs,
  getPendingApprovals,
  approveAuditLog,
} from './auditLog';
