/**
 * Validation utilities and schemas
 * Central export point for all validation-related functionality
 */

export {
  EncryptedDataSchema,
  BackupMetadataSchema,
  UserSettingsSchema,
  N8nWorkflowSchema,
  ApiKeyTestRequestSchema,
  BackupTriggerRequestSchema,
  BackupRestoreRequestSchema,
  SettingsUpdateRequestSchema,
  N8nWorkflowListSchema,
  EncryptionResultSchema,
  DecryptionResultSchema,
} from './schemas';

export type {
  EncryptedDataInput,
  BackupMetadataInput,
  UserSettingsInput,
  N8nWorkflowInput,
  ApiKeyTestRequest,
  BackupTriggerRequest,
  BackupRestoreRequest,
  SettingsUpdateRequest,
  N8nWorkflowListInput,
  EncryptionResultInput,
  DecryptionResultInput,
} from './schemas';

/**
 * Helper function to validate and parse data with Zod schema
 * Returns typed result with success/error status
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Validates data against a Zod schema and returns a typed result
 * 
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns ValidationResult with success status and typed data or error message
 * 
 * @example
 * ```typescript
 * const result = validateData(ApiKeyTestRequestSchema, requestBody);
 * if (!result.success) {
 *   return { error: result.error };
 * }
 * // result.data is now typed as ApiKeyTestRequest
 * const { encryptionPassword } = result.data;
 * ```
 */
export function validateData<T>(
  schema: { parse: (data: unknown) => T },
  data: unknown
): ValidationResult<T> {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Validation failed' };
  }
}

/**
 * Validates data and throws an error if validation fails
 * Useful for scenarios where you want to fail fast
 * 
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Parsed and validated data
 * @throws Error if validation fails
 * 
 * @example
 * ```typescript
 * try {
 *   const validData = validateDataOrThrow(BackupTriggerRequestSchema, requestBody);
 *   // validData is typed as BackupTriggerRequest
 * } catch (error) {
 *   return NextResponse.json({ error: error.message }, { status: 400 });
 * }
 * ```
 */
export function validateDataOrThrow<T>(
  schema: { parse: (data: unknown) => T },
  data: unknown
): T {
  return schema.parse(data);
}

/**
 * Validates data with safe parsing (won't throw)
 * Returns Zod's SafeParseResult with detailed error information
 * 
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns SafeParseResult from Zod with success/error details
 * 
 * @example
 * ```typescript
 * const result = safeValidate(UserSettingsSchema, data);
 * if (!result.success) {
 *   console.error('Validation errors:', result.error.errors);
 *   return { error: 'Invalid settings data' };
 * }
 * const settings = result.data;
 * ```
 */
export function safeValidate<T>(
  schema: { safeParse: (data: unknown) => { success: boolean; data?: T; error?: unknown } },
  data: unknown
) {
  return schema.safeParse(data);
}
