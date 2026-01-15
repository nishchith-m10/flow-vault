/**
 * Zod validation schemas for FlowVault data structures
 * Provides runtime type validation for API inputs and encrypted data
 */

import { z } from 'zod';

/**
 * Schema for encrypted data structure
 * Matches the EncryptedData interface from @/lib/encryption/types
 */
export const EncryptedDataSchema = z.object({
  ciphertext: z.string().min(1, 'Ciphertext cannot be empty'),
  iv: z.string().min(1, 'IV cannot be empty'),
  salt: z.string().min(1, 'Salt cannot be empty'),
  tag: z.string().min(1, 'Authentication tag cannot be empty'),
  version: z.number().int().positive('Version must be a positive integer'),
});

/**
 * Schema for backup metadata
 * Used for validating backup creation and restore operations
 * Matches flowvault_workflow_backups table structure
 */
export const BackupMetadataSchema = z.object({
  id: z.string().uuid('Invalid backup ID format').optional(),
  clerk_user_id: z.string().min(1, 'User ID required'),
  workflow_id: z.string().min(1, 'Workflow ID required'),
  workflow_name: z.string().min(1, 'Workflow name required'),
  workflow_data: z.record(z.string(), z.unknown()),
  content_hash: z.string().min(1, 'Content hash required'),
  version: z.number().int().nonnegative('Version must be non-negative'),
  tags: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
  backup_type: z.string().optional(),
  created_at: z.string().datetime('Invalid datetime format').optional(),
});

/**
 * Schema for user settings
 * Validates n8n connection configuration
 * Matches flowvault_user_settings table structure
 */
export const UserSettingsSchema = z.object({
  id: z.string().uuid('Invalid settings ID').optional(),
  clerk_user_id: z.string().min(1, 'User ID required'),
  n8n_instance_url: z.string().url('Invalid n8n URL format'),
  n8n_api_key_encrypted: z.string().min(1, 'Encrypted API key required'),
  encryption_iv: z.string().min(1, 'Encryption IV required'),
  backup_enabled: z.boolean().optional(),
  backup_schedule: z.string().optional(),
  last_backup_at: z.string().datetime().nullable().optional(),
  retention_days: z.number().int().positive('Retention days must be positive').optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

/**
 * Schema for workflow creation/update
 * Validates workflow data from n8n before storage
 */
export const N8nWorkflowSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string().min(1, 'Workflow name required'),
  active: z.boolean().optional(),
  nodes: z.array(z.any()).optional(), // Can't validate node structure without knowing all node types
  connections: z.record(z.string(), z.any()).optional(),
  settings: z.record(z.string(), z.any()).optional(),
  staticData: z.any().optional(),
  tags: z.array(z.string()).optional(),
  versionId: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

/**
 * Schema for API key test request
 * Used in settings/test endpoint (PATCH /api/settings)
 * Accepts optional credentials to test, or uses stored credentials if not provided
 */
export const ApiKeyTestRequestSchema = z.object({
  n8n_instance_url: z.string().url('Invalid n8n URL format').optional(),
  n8n_api_key: z.string().min(1, 'API key cannot be empty').optional(),
}).refine(
  (data) => {
    // Both must be provided together or both omitted
    const hasUrl = !!data.n8n_instance_url;
    const hasKey = !!data.n8n_api_key;
    return hasUrl === hasKey;
  },
  {
    message: 'n8n_instance_url and n8n_api_key must both be provided together or both omitted',
  }
);

/**
 * Schema for backup trigger request
 * Used in backup creation endpoint
 */
export const BackupTriggerRequestSchema = z.object({
  workflowIds: z.array(z.string().max(100, 'Workflow ID too long')).optional(),
  tags: z.array(z.string().max(50, 'Tag too long')).optional(),
  description: z.string().max(500, 'Description too long').optional(),
});

/**
 * Schema for backup restore request
 * Used in restore endpoint
 */
export const BackupRestoreRequestSchema = z
  .object({
    handleConflict: z.enum(['skip', 'overwrite', 'create-new']).optional().default('create-new'),
  })
  .strict(); // Reject unknown fields for security

/**
 * Schema for settings update request
 * Used in settings API endpoints
 */
export const SettingsUpdateRequestSchema = z
  .object({
    n8n_instance_url: z.string().url('Invalid n8n URL format').max(2048, 'URL too long'),
    n8n_api_key: z.string().min(1, 'API key required').max(1024, 'API key too long'),
    backup_enabled: z.boolean().optional().default(true),
    backup_schedule: z.string().optional().default('daily'),
    retention_days: z.number().int().positive('Retention days must be positive').optional().default(30),
  })
  .strict(); // Reject unknown fields for security

/**
 * Schema for workflow list response
 * Validates data returned from n8n API
 */
export const N8nWorkflowListSchema = z.object({
  data: z.array(N8nWorkflowSchema),
});

/**
 * Schema for encryption result validation
 * Used to validate encryption operation outputs
 */
export const EncryptionResultSchema = z.object({
  success: z.boolean(),
  data: EncryptedDataSchema.optional(),
  error: z.string().optional(),
});

/**
 * Schema for decryption result validation
 * Used to validate decryption operation outputs
 */
export const DecryptionResultSchema = z.object({
  success: z.boolean(),
  plaintext: z.string().optional(),
  error: z.string().optional(),
});

/**
 * n8n Proxy API Validation Schemas
 * Used to validate requests to the /api/n8n proxy endpoint
 */

/**
 * Enum of all valid n8n proxy actions
 * Whitelist approach prevents invalid actions from being processed
 */
export const N8nActionEnum = z.enum([
  // Workflow actions
  'import',
  'listWorkflows',
  'getWorkflow',
  'deleteWorkflow',
  'activateWorkflow',
  'deactivateWorkflow',
  'archiveWorkflow',
  'unarchiveWorkflow',
  // Tag actions
  'createTag',
  'listTags',
  'deleteTag',
  'tagWorkflow',
  'untagWorkflow',
  // Execution actions
  'listExecutions',
  'getExecution',
  'deleteExecution',
  'retryExecution',
]);

/**
 * Schema for n8n URL validation
 * Must be HTTPS, valid URL format, reasonable length
 */
export const N8nUrlSchema = z
  .string()
  .url('Invalid URL format')
  .max(2048, 'URL too long (max 2048 characters)')
  .refine(
    (url) => url.startsWith('https://') || url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1'),
    { message: 'n8n URL must use HTTPS (or HTTP for localhost)' }
  );

/**
 * Schema for n8n API key validation
 * Reasonable length constraints for security
 */
export const N8nApiKeySchema = z
  .string()
  .min(10, 'API key too short (min 10 characters)')
  .max(1024, 'API key too long (max 1024 characters)');

/**
 * Common fields present on every n8n proxy request
 */
export const N8nCommonFields = z.object({
  n8nUrl: N8nUrlSchema,
  apiKey: N8nApiKeySchema,
});

/**
 * Schema for query limit parameter
 * Prevents DoS via excessive query limits
 */
export const N8nLimitSchema = z
  .number()
  .int('Limit must be an integer')
  .min(1, 'Limit must be at least 1')
  .max(1000, 'Limit cannot exceed 1000');

/**
 * Schema for workflow import payload
 * Validates structure and enforces size limits to prevent DoS
 */
export const N8nWorkflowImportSchema = z.object({
  name: z.string().min(1, 'Workflow name required').max(200, 'Workflow name too long'),
  nodes: z.array(z.any()).max(500, 'Too many nodes (max 500)'),
  connections: z.record(z.string(), z.any()),
  settings: z.record(z.string(), z.any()).optional(),
  staticData: z.any().optional(),
});

/**
 * Schema for workflow import action
 */
export const N8nImportRequestSchema = z.object({
  action: z.literal('import'),
  workflow: N8nWorkflowImportSchema,
}).merge(N8nCommonFields);

/**
 * Schema for workflow operations requiring workflowId
 */
export const N8nGetWorkflowRequestSchema = z.object({
  action: z.literal('getWorkflow'),
  workflowId: z.string().min(1, 'Workflow ID required').max(100, 'Workflow ID too long'),
}).merge(N8nCommonFields);

export const N8nDeleteWorkflowRequestSchema = z.object({
  action: z.literal('deleteWorkflow'),
  workflowId: z.string().min(1, 'Workflow ID required').max(100, 'Workflow ID too long'),
}).merge(N8nCommonFields);

export const N8nActivateWorkflowRequestSchema = z.object({
  action: z.literal('activateWorkflow'),
  workflowId: z.string().min(1, 'Workflow ID required').max(100, 'Workflow ID too long'),
}).merge(N8nCommonFields);

export const N8nDeactivateWorkflowRequestSchema = z.object({
  action: z.literal('deactivateWorkflow'),
  workflowId: z.string().min(1, 'Workflow ID required').max(100, 'Workflow ID too long'),
}).merge(N8nCommonFields);

export const N8nArchiveWorkflowRequestSchema = z.object({
  action: z.literal('archiveWorkflow'),
  workflowId: z.string().min(1, 'Workflow ID required').max(100, 'Workflow ID too long'),
}).merge(N8nCommonFields);

export const N8nUnarchiveWorkflowRequestSchema = z.object({
  action: z.literal('unarchiveWorkflow'),
  workflowId: z.string().min(1, 'Workflow ID required').max(100, 'Workflow ID too long'),
}).merge(N8nCommonFields);

/**
 * Schema for tag operations
 */
export const N8nCreateTagRequestSchema = z.object({
  action: z.literal('createTag'),
  tagName: z.string().min(1, 'Tag name required').max(100, 'Tag name too long'),
}).merge(N8nCommonFields);

export const N8nDeleteTagRequestSchema = z.object({
  action: z.literal('deleteTag'),
  tagId: z.string().min(1, 'Tag ID required').max(100, 'Tag ID too long'),
}).merge(N8nCommonFields);

export const N8nTagWorkflowRequestSchema = z.object({
  action: z.literal('tagWorkflow'),
  workflowId: z.string().min(1, 'Workflow ID required').max(100, 'Workflow ID too long'),
  tagId: z.string().min(1, 'Tag ID required').max(100, 'Tag ID too long'),
}).merge(N8nCommonFields);

export const N8nUntagWorkflowRequestSchema = z.object({
  action: z.literal('untagWorkflow'),
  workflowId: z.string().min(1, 'Workflow ID required').max(100, 'Workflow ID too long'),
  tagId: z.string().min(1, 'Tag ID required').max(100, 'Tag ID too long'),
}).merge(N8nCommonFields);

/**
 * Schema for list tags
 */
export const N8nListTagsRequestSchema = z.object({
  action: z.literal('listTags'),}).merge(N8nCommonFields);

/**
 * Schema for execution operations
 */
export const N8nGetExecutionRequestSchema = z.object({
  action: z.literal('getExecution'),
  executionId: z.string().min(1, 'Execution ID required').max(100, 'Execution ID too long'),
}).merge(N8nCommonFields);

export const N8nDeleteExecutionRequestSchema = z.object({
  action: z.literal('deleteExecution'),
  executionId: z.string().min(1, 'Execution ID required').max(100, 'Execution ID too long'),
}).merge(N8nCommonFields);

export const N8nRetryExecutionRequestSchema = z.object({
  action: z.literal('retryExecution'),
  executionId: z.string().min(1, 'Execution ID required').max(100, 'Execution ID too long'),
}).merge(N8nCommonFields);

export const N8nListExecutionsRequestSchema = z.object({
  action: z.literal('listExecutions'),
  limit: N8nLimitSchema.optional(),
}).merge(N8nCommonFields);

export const N8nListWorkflowsRequestSchema = z.object({
  action: z.literal('listWorkflows'),}).merge(N8nCommonFields);

/**
 * Discriminated union schema for all n8n proxy requests
 * Validates the request based on the action type
 */
export const N8nProxyRequestSchema = z.discriminatedUnion('action', [
  N8nImportRequestSchema,
  N8nGetWorkflowRequestSchema,
  N8nDeleteWorkflowRequestSchema,
  N8nActivateWorkflowRequestSchema,
  N8nDeactivateWorkflowRequestSchema,
  N8nArchiveWorkflowRequestSchema,
  N8nUnarchiveWorkflowRequestSchema,
  N8nCreateTagRequestSchema,
  N8nDeleteTagRequestSchema,
  N8nTagWorkflowRequestSchema,
  N8nUntagWorkflowRequestSchema,
  N8nListTagsRequestSchema,
  N8nGetExecutionRequestSchema,
  N8nDeleteExecutionRequestSchema,
  N8nRetryExecutionRequestSchema,
  N8nListExecutionsRequestSchema,
  N8nListWorkflowsRequestSchema,
]);

/**
 * Rate Limit Database Response Schemas
 * Used to validate data from Supabase RPC and queries
 */

/**
 * Schema for rate limit counter from flowvault_rate_limit_counters table
 */
export const RateLimitCounterSchema = z.object({
  count: z.number().int().nonnegative('Count must be non-negative'),
  window_start: z.string().datetime('Invalid window_start datetime format'),
});

/**
 * Schema for RPC response from flowvault_increment_rate_limit
 */
export const RateLimitRpcResponseSchema = z.object({
  current_count: z.number().int().nonnegative('Current count must be non-negative'),
});

/**
 * Type exports for TypeScript inference
 */
export type EncryptedDataInput = z.infer<typeof EncryptedDataSchema>;
export type BackupMetadataInput = z.infer<typeof BackupMetadataSchema>;
export type UserSettingsInput = z.infer<typeof UserSettingsSchema>;
export type N8nWorkflowInput = z.infer<typeof N8nWorkflowSchema>;
export type ApiKeyTestRequest = z.infer<typeof ApiKeyTestRequestSchema>;
export type BackupTriggerRequest = z.infer<typeof BackupTriggerRequestSchema>;
export type BackupRestoreRequest = z.infer<typeof BackupRestoreRequestSchema>;
export type SettingsUpdateRequest = z.infer<typeof SettingsUpdateRequestSchema>;
export type N8nWorkflowListInput = z.infer<typeof N8nWorkflowListSchema>;
export type EncryptionResultInput = z.infer<typeof EncryptionResultSchema>;
export type DecryptionResultInput = z.infer<typeof DecryptionResultSchema>;
export type N8nProxyRequest = z.infer<typeof N8nProxyRequestSchema>;
export type N8nAction = z.infer<typeof N8nActionEnum>;
export type RateLimitCounter = z.infer<typeof RateLimitCounterSchema>;
export type RateLimitRpcResponse = z.infer<typeof RateLimitRpcResponseSchema>;

/**
 * USAGE EXAMPLES
 * 
 * Example 1: Validate API request body
 * ```typescript
 * import { ApiKeyTestRequestSchema, validateData } from '@/lib/validation';
 * 
 * export async function POST(request: Request) {
 *   const body = await request.json();
 *   const result = validateData(ApiKeyTestRequestSchema, body);
 *   
 *   if (!result.success) {
 *     return NextResponse.json({ error: result.error }, { status: 400 });
 *   }
 *   
 *   // result.data is fully typed as ApiKeyTestRequest
 *   const { encryptionPassword } = result.data;
 * }
 * ```
 * 
 * Example 2: Validate encrypted data from database
 * ```typescript
 * import { EncryptedDataSchema } from '@/lib/validation';
 * import { safeJSONParse } from '@/lib/utils/json';
 * 
 * const parseResult = safeJSONParse(settings.n8n_api_key_encrypted);
 * if (!parseResult.success || !parseResult.data) {
 *   return { error: 'Failed to parse encrypted data' };
 * }
 * 
 * const validationResult = validateData(EncryptedDataSchema, parseResult.data);
 * if (!validationResult.success) {
 *   return { error: `Invalid encrypted data: ${validationResult.error}` };
 * }
 * ```
 * 
 * Example 3: Validate backup trigger request
 * ```typescript
 * import { BackupTriggerRequestSchema } from '@/lib/validation';
 * 
 * export async function POST(request: Request) {
 *   const body = await request.json();
 *   const result = validateData(BackupTriggerRequestSchema, body);
 *   
 *   if (!result.success) {
 *     return NextResponse.json({ error: result.error }, { status: 400 });
 *   }
 *   
 *   // Fully typed with autocomplete
 *   const { workflowIds, encryptionPassword, tags } = result.data;
 *   // ... proceed with backup creation
 * }
 * ```
 * 
 * Example 4: Validate workflow data from n8n API
 * ```typescript
 * import { N8nWorkflowListSchema } from '@/lib/validation';
 * 
 * const response = await fetch(`${n8nUrl}/workflows`, {
 *   headers: { 'X-N8N-API-KEY': apiKey }
 * });
 * const data = await response.json();
 * 
 * const result = validateData(N8nWorkflowListSchema, data);
 * if (!result.success) {
 *   throw new Error(`Invalid workflow data from n8n: ${result.error}`);
 * }
 * 
 * // Safely iterate over validated workflows
 * for (const workflow of result.data.data) {
 *   console.log(`Workflow: ${workflow.name}`);
 * }
 * ```
 */
