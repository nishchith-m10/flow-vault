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
  workflowIds: z.array(z.string()).min(1, 'At least one workflow ID required'),
  encryptionPassword: z.string().min(1, 'Encryption password required'),
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
});

/**
 * Schema for backup restore request
 * Used in restore endpoint
 */
export const BackupRestoreRequestSchema = z.object({
  encryptionPassword: z.string().min(1, 'Encryption password required'),
  overwrite: z.boolean().optional(),
});

/**
 * Schema for settings update request
 * Used in settings API endpoints
 */
export const SettingsUpdateRequestSchema = z.object({
  n8nUrl: z.string().url('Invalid n8n URL format'),
  n8nApiKey: z.string().min(1, 'API key required'),
  encryptionPassword: z.string().min(1, 'Encryption password required'),
  backupEnabled: z.boolean().optional(),
  backupSchedule: z.string().optional(),
  retentionDays: z.number().int().positive().optional(),
});

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
