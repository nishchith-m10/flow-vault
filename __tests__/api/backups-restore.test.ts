import { describe, it, expect } from 'vitest';
import { BackupRestoreRequestSchema, validateData } from '@/lib/validation';

describe('POST /api/backups/[id]/restore - Schema Validation', () => {
  it('should validate "skip" conflict strategy', () => {
    const valid = { handleConflict: 'skip' };
    const result = validateData(BackupRestoreRequestSchema, valid);
    expect(result.success).toBe(true);
    expect(result.data?.handleConflict).toBe('skip');
  });

  it('should validate "overwrite" conflict strategy', () => {
    const valid = { handleConflict: 'overwrite' };
    const result = validateData(BackupRestoreRequestSchema, valid);
    expect(result.success).toBe(true);
  });

  it('should validate "create-new" conflict strategy', () => {
    const valid = { handleConflict: 'create-new' };
    const result = validateData(BackupRestoreRequestSchema, valid);
    expect(result.success).toBe(true);
  });

  it('should default to "create-new" when missing', () => {
    const valid = {};
    const result = validateData(BackupRestoreRequestSchema, valid);
    expect(result.success).toBe(true);
    expect(result.data?.handleConflict).toBe('create-new');
  });

  it('should reject invalid conflict strategy', () => {
    const invalid = { handleConflict: 'delete' };
    const result = validateData(BackupRestoreRequestSchema, invalid);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid option');
  });

  it('should reject non-string conflict strategy', () => {
    const invalid = { handleConflict: 123 };
    const result = validateData(BackupRestoreRequestSchema, invalid);
    expect(result.success).toBe(false);
  });

  it('should reject unknown fields (strict mode)', () => {
    const input = {
      handleConflict: 'skip',
      maliciousField: 'rejected',
    };
    const result = validateData(BackupRestoreRequestSchema, input);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unrecognized key');
  });
});
