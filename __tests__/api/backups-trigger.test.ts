import { describe, it, expect } from 'vitest';
import { BackupTriggerRequestSchema, validateData } from '@/lib/validation';

describe('POST /api/backups/trigger - Schema Validation', () => {
  it('should validate empty request body (backward compatibility)', () => {
    const result = validateData(BackupTriggerRequestSchema, {});
    expect(result.success).toBe(true);
  });

  it('should validate request with workflowIds', () => {
    const valid = {
      workflowIds: ['workflow-1', 'workflow-2'],
      tags: ['production'],
      description: 'Pre-deployment backup',
    };
    
    const result = validateData(BackupTriggerRequestSchema, valid);
    expect(result.success).toBe(true);
    expect(result.data?.workflowIds).toHaveLength(2);
  });

  it('should accept request with only workflowIds', () => {
    const valid = { workflowIds: ['workflow-1'] };
    const result = validateData(BackupTriggerRequestSchema, valid);
    expect(result.success).toBe(true);
  });

  it('should strip unknown fields', () => {
    const input = {
      workflowIds: ['workflow-1'],
      maliciousField: 'ignored',
    };
    const result = validateData(BackupTriggerRequestSchema, input);
    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty('maliciousField');
  });
});
