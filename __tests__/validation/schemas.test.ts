import { describe, it, expect } from 'vitest';
import {
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
  validateData,
  validateDataOrThrow,
  safeValidate,
} from '@/lib/validation';

describe('EncryptedDataSchema', () => {
  it('should validate correct encrypted data', () => {
    const valid = {
      ciphertext: 'encrypted_content',
      iv: 'initialization_vector',
      salt: 'salt_value',
      tag: 'auth_tag',
      version: 1,
    };
    
    const result = validateData(EncryptedDataSchema, valid);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(valid);
  });

  it('should reject missing ciphertext', () => {
    const invalid = {
      iv: 'initialization_vector',
      salt: 'salt_value',
      tag: 'auth_tag',
      version: 1,
    };
    
    const result = validateData(EncryptedDataSchema, invalid);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should reject empty ciphertext', () => {
    const invalid = {
      ciphertext: '',
      iv: 'initialization_vector',
      salt: 'salt_value',
      tag: 'auth_tag',
      version: 1,
    };
    
    const result = validateData(EncryptedDataSchema, invalid);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Ciphertext cannot be empty');
  });

  it('should reject empty iv', () => {
    const invalid = {
      ciphertext: 'encrypted_content',
      iv: '',
      salt: 'salt_value',
      tag: 'auth_tag',
      version: 1,
    };
    
    const result = validateData(EncryptedDataSchema, invalid);
    expect(result.success).toBe(false);
    expect(result.error).toContain('IV cannot be empty');
  });

  it('should reject empty salt', () => {
    const invalid = {
      ciphertext: 'encrypted_content',
      iv: 'initialization_vector',
      salt: '',
      tag: 'auth_tag',
      version: 1,
    };
    
    const result = validateData(EncryptedDataSchema, invalid);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Salt cannot be empty');
  });

  it('should reject empty tag', () => {
    const invalid = {
      ciphertext: 'encrypted_content',
      iv: 'initialization_vector',
      salt: 'salt_value',
      tag: '',
      version: 1,
    };
    
    const result = validateData(EncryptedDataSchema, invalid);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Authentication tag cannot be empty');
  });

  it('should reject negative version', () => {
    const invalid = {
      ciphertext: 'encrypted_content',
      iv: 'initialization_vector',
      salt: 'salt_value',
      tag: 'auth_tag',
      version: -1,
    };
    
    const result = validateData(EncryptedDataSchema, invalid);
    expect(result.success).toBe(false);
  });

  it('should reject zero version', () => {
    const invalid = {
      ciphertext: 'encrypted_content',
      iv: 'initialization_vector',
      salt: 'salt_value',
      tag: 'auth_tag',
      version: 0,
    };
    
    const result = validateData(EncryptedDataSchema, invalid);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Version must be a positive integer');
  });

  it('should reject decimal version', () => {
    const invalid = {
      ciphertext: 'encrypted_content',
      iv: 'initialization_vector',
      salt: 'salt_value',
      tag: 'auth_tag',
      version: 1.5,
    };
    
    const result = validateData(EncryptedDataSchema, invalid);
    expect(result.success).toBe(false);
  });
});

describe('UserSettingsSchema', () => {
  const validUserId = '123e4567-e89b-12d3-a456-426614174000';

  it('should validate correct user settings', () => {
    const valid = {
      clerk_user_id: validUserId,
      n8n_instance_url: 'https://n8n.example.com',
      n8n_api_key_encrypted: 'encrypted_api_key_data',
      encryption_iv: 'iv_data',
    };
    
    const result = validateData(UserSettingsSchema, valid);
    expect(result.success).toBe(true);
  });

  it('should validate with optional fields', () => {
    const valid = {
      id: validUserId,
      clerk_user_id: validUserId,
      n8n_instance_url: 'https://n8n.example.com',
      n8n_api_key_encrypted: 'encrypted_api_key_data',
      encryption_iv: 'iv_data',
      backup_enabled: true,
      backup_schedule: '0 0 * * *',
      retention_days: 30,
    };
    
    const result = validateData(UserSettingsSchema, valid);
    expect(result.success).toBe(true);
  });

  it('should reject invalid UUID for id', () => {
    const invalid = {
      id: 'not-a-uuid',
      clerk_user_id: validUserId,
      n8n_instance_url: 'https://n8n.example.com',
      n8n_api_key_encrypted: 'encrypted_api_key_data',
      encryption_iv: 'iv_data',
    };
    
    const result = validateData(UserSettingsSchema, invalid);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid settings ID');
  });

  it('should reject invalid URL', () => {
    const invalid = {
      clerk_user_id: validUserId,
      n8n_instance_url: 'not-a-url',
      n8n_api_key_encrypted: 'encrypted_api_key_data',
      encryption_iv: 'iv_data',
    };
    
    const result = validateData(UserSettingsSchema, invalid);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid n8n URL format');
  });

  it('should reject missing user_id', () => {
    const invalid = {
      n8n_instance_url: 'https://n8n.example.com',
      n8n_api_key_encrypted: 'encrypted_api_key_data',
      encryption_iv: 'iv_data',
    };
    
    const result = validateData(UserSettingsSchema, invalid);
    expect(result.success).toBe(false);
  });

  it('should reject empty encrypted API key', () => {
    const invalid = {
      clerk_user_id: validUserId,
      n8n_instance_url: 'https://n8n.example.com',
      n8n_api_key_encrypted: '',
      encryption_iv: 'iv_data',
    };
    
    const result = validateData(UserSettingsSchema, invalid);
    expect(result.success).toBe(false);
  });

  it('should reject negative retention days', () => {
    const invalid = {
      clerk_user_id: validUserId,
      n8n_instance_url: 'https://n8n.example.com',
      n8n_api_key_encrypted: 'encrypted_api_key_data',
      encryption_iv: 'iv_data',
      retention_days: -10,
    };
    
    const result = validateData(UserSettingsSchema, invalid);
    expect(result.success).toBe(false);
  });

  it('should handle null last_backup_at', () => {
    const valid = {
      clerk_user_id: validUserId,
      n8n_instance_url: 'https://n8n.example.com',
      n8n_api_key_encrypted: 'encrypted_api_key_data',
      encryption_iv: 'iv_data',
      last_backup_at: null,
    };
    
    const result = validateData(UserSettingsSchema, valid);
    expect(result.success).toBe(true);
  });
});

describe('BackupTriggerRequestSchema', () => {
  it('should validate correct backup request', () => {
    const valid = {
      workflowIds: ['workflow1', 'workflow2'],
      encryptionPassword: 'secure_password',
      tags: ['tag1', 'tag2'],
      description: 'Backup description',
    };
    
    const result = validateData(BackupTriggerRequestSchema, valid);
    expect(result.success).toBe(true);
  });

  it('should validate minimal backup request', () => {
    const valid = {
      workflowIds: ['workflow1'],
      encryptionPassword: 'secure_password',
    };
    
    const result = validateData(BackupTriggerRequestSchema, valid);
    expect(result.success).toBe(true);
  });

  it('should accept empty workflow IDs array (all fields optional)', () => {
    const valid = {
      workflowIds: [],
    };
    
    const result = validateData(BackupTriggerRequestSchema, valid);
    expect(result.success).toBe(true);
  });

  it('should accept missing fields (all optional)', () => {
    const valid = {};
    
    const result = validateData(BackupTriggerRequestSchema, valid);
    expect(result.success).toBe(true);
  });

  it('should accept with all optional fields provided', () => {
    const valid = {
      workflowIds: ['workflow1'],
      tags: ['production'],
      description: 'Test backup',
    };
    
    const result = validateData(BackupTriggerRequestSchema, valid);
    expect(result.success).toBe(true);
  });
});

describe('BackupRestoreRequestSchema', () => {
  it('should validate with handleConflict skip', () => {
    const valid = {
      handleConflict: 'skip',
    };
    
    const result = validateData(BackupRestoreRequestSchema, valid);
    expect(result.success).toBe(true);
  });

  it('should validate with handleConflict overwrite', () => {
    const valid = {
      handleConflict: 'overwrite',
    };
    
    const result = validateData(BackupRestoreRequestSchema, valid);
    expect(result.success).toBe(true);
  });

  it('should default to create-new when missing', () => {
    const valid = {};
    
    const result = validateData(BackupRestoreRequestSchema, valid);
    expect(result.success).toBe(true);
    expect(result.data?.handleConflict).toBe('create-new');
  });

  it('should reject invalid enum value', () => {
    const invalid = {
      handleConflict: 'invalid',
    };
    
    const result = validateData(BackupRestoreRequestSchema, invalid);
    expect(result.success).toBe(false);
  });
});

describe('ApiKeyTestRequestSchema', () => {
  it('should validate empty request (using stored credentials)', () => {
    const valid = {};
    
    const result = validateData(ApiKeyTestRequestSchema, valid);
    expect(result.success).toBe(true);
  });

  it('should validate request with both URL and API key provided', () => {
    const valid = {
      n8n_instance_url: 'https://n8n.example.com',
      n8n_api_key: 'test_api_key',
    };
    
    const result = validateData(ApiKeyTestRequestSchema, valid);
    expect(result.success).toBe(true);
    expect(result.data?.n8n_instance_url).toBe('https://n8n.example.com');
    expect(result.data?.n8n_api_key).toBe('test_api_key');
  });

  it('should reject request with only URL (missing API key)', () => {
    const invalid = {
      n8n_instance_url: 'https://n8n.example.com',
    };
    
    const result = validateData(ApiKeyTestRequestSchema, invalid);
    expect(result.success).toBe(false);
    expect(result.error).toContain('must both be provided together or both omitted');
  });

  it('should reject request with only API key (missing URL)', () => {
    const invalid = {
      n8n_api_key: 'test_api_key',
    };
    
    const result = validateData(ApiKeyTestRequestSchema, invalid);
    expect(result.success).toBe(false);
    expect(result.error).toContain('must both be provided together or both omitted');
  });

  it('should reject invalid URL format', () => {
    const invalid = {
      n8n_instance_url: 'not-a-valid-url',
      n8n_api_key: 'test_api_key',
    };
    
    const result = validateData(ApiKeyTestRequestSchema, invalid);
    expect(result.success).toBe(false);
  });

  it('should reject empty API key when provided', () => {
    const invalid = {
      n8n_instance_url: 'https://n8n.example.com',
      n8n_api_key: '',
    };
    
    const result = validateData(ApiKeyTestRequestSchema, invalid);
    expect(result.success).toBe(false);
  });
});

describe('N8nWorkflowSchema', () => {
  it('should validate minimal workflow', () => {
    const valid = {
      id: '123',
      name: 'Test Workflow',
    };
    
    const result = validateData(N8nWorkflowSchema, valid);
    expect(result.success).toBe(true);
  });

  it('should validate workflow with numeric id', () => {
    const valid = {
      id: 123,
      name: 'Test Workflow',
    };
    
    const result = validateData(N8nWorkflowSchema, valid);
    expect(result.success).toBe(true);
  });

  it('should validate full workflow', () => {
    const valid = {
      id: 123,
      name: 'Test Workflow',
      active: true,
      nodes: [
        { id: 'node1', type: 'trigger', parameters: {} },
        { id: 'node2', type: 'function', parameters: { code: 'return item;' } }
      ],
      connections: {
        node1: {
          main: [[{ node: 'node2', type: 'main', index: 0 }]]
        }
      },
      settings: { saveExecutionProgress: true },
      tags: ['production'],
      versionId: 'v1',
    };
    
    const result = validateData(N8nWorkflowSchema, valid);
    expect(result.success).toBe(true);
  });

  it('should reject missing name', () => {
    const invalid = {
      id: '123',
    };
    
    const result = validateData(N8nWorkflowSchema, invalid);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should reject empty name', () => {
    const invalid = {
      id: '123',
      name: '',
    };
    
    const result = validateData(N8nWorkflowSchema, invalid);
    expect(result.success).toBe(false);
  });

  it('should reject missing id', () => {
    const invalid = {
      name: 'Test Workflow',
    };
    
    const result = validateData(N8nWorkflowSchema, invalid);
    expect(result.success).toBe(false);
  });
});

describe('N8nWorkflowListSchema', () => {
  it('should validate workflow list', () => {
    const valid = {
      data: [
        { id: '1', name: 'Workflow 1' },
        { id: '2', name: 'Workflow 2' },
      ],
    };
    
    const result = validateData(N8nWorkflowListSchema, valid);
    expect(result.success).toBe(true);
  });

  it('should validate empty workflow list', () => {
    const valid = {
      data: [],
    };
    
    const result = validateData(N8nWorkflowListSchema, valid);
    expect(result.success).toBe(true);
  });

  it('should reject missing data field', () => {
    const invalid = {};
    
    const result = validateData(N8nWorkflowListSchema, invalid);
    expect(result.success).toBe(false);
  });

  it('should reject invalid workflows in list', () => {
    const invalid = {
      data: [
        { id: '1' }, // Missing name
      ],
    };
    
    const result = validateData(N8nWorkflowListSchema, invalid);
    expect(result.success).toBe(false);
  });
});

describe('SettingsUpdateRequestSchema', () => {
  it('should validate correct settings update', () => {
    const valid = {
      n8n_instance_url: 'https://n8n.example.com',
      n8n_api_key: 'api_key_value',
    };
    
    const result = validateData(SettingsUpdateRequestSchema, valid);
    expect(result.success).toBe(true);
  });

  it('should validate with optional fields', () => {
    const valid = {
      n8n_instance_url: 'https://n8n.example.com',
      n8n_api_key: 'api_key_value',
      backup_enabled: true,
      backup_schedule: 'daily',
      retention_days: 90,
    };
    
    const result = validateData(SettingsUpdateRequestSchema, valid);
    expect(result.success).toBe(true);
  });

  it('should reject invalid URL', () => {
    const invalid = {
      n8n_instance_url: 'not-a-url',
      n8n_api_key: 'api_key_value',
    };
    
    const result = validateData(SettingsUpdateRequestSchema, invalid);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid');
  });

  it('should reject missing API key', () => {
    const invalid = {
      n8nUrl: 'https://n8n.example.com',
      encryptionPassword: 'secure_password',
    };
    
    const result = validateData(SettingsUpdateRequestSchema, invalid);
    expect(result.success).toBe(false);
  });

  it('should reject empty API key', () => {
    const invalid = {
      n8nUrl: 'https://n8n.example.com',
      n8nApiKey: '',
      encryptionPassword: 'secure_password',
    };
    
    const result = validateData(SettingsUpdateRequestSchema, invalid);
    expect(result.success).toBe(false);
  });

  it('should reject negative retention days', () => {
    const invalid = {
      n8nUrl: 'https://n8n.example.com',
      n8nApiKey: 'api_key_value',
      encryptionPassword: 'secure_password',
      retentionDays: -10,
    };
    
    const result = validateData(SettingsUpdateRequestSchema, invalid);
    expect(result.success).toBe(false);
  });
});

describe('EncryptionResultSchema', () => {
  it('should validate successful encryption result', () => {
    const valid = {
      success: true,
      data: {
        ciphertext: 'encrypted',
        iv: 'iv',
        salt: 'salt',
        tag: 'tag',
        version: 1,
      },
    };
    
    const result = validateData(EncryptionResultSchema, valid);
    expect(result.success).toBe(true);
  });

  it('should validate failed encryption result', () => {
    const valid = {
      success: false,
      error: 'Encryption failed',
    };
    
    const result = validateData(EncryptionResultSchema, valid);
    expect(result.success).toBe(true);
  });

  it('should reject missing success field', () => {
    const invalid = {
      data: {
        ciphertext: 'encrypted',
        iv: 'iv',
        salt: 'salt',
        tag: 'tag',
        version: 1,
      },
    };
    
    const result = validateData(EncryptionResultSchema, invalid);
    expect(result.success).toBe(false);
  });
});

describe('DecryptionResultSchema', () => {
  it('should validate successful decryption result', () => {
    const valid = {
      success: true,
      plaintext: 'decrypted text',
    };
    
    const result = validateData(DecryptionResultSchema, valid);
    expect(result.success).toBe(true);
  });

  it('should validate failed decryption result', () => {
    const valid = {
      success: false,
      error: 'Decryption failed',
    };
    
    const result = validateData(DecryptionResultSchema, valid);
    expect(result.success).toBe(true);
  });

  it('should reject missing success field', () => {
    const invalid = {
      plaintext: 'decrypted text',
    };
    
    const result = validateData(DecryptionResultSchema, invalid);
    expect(result.success).toBe(false);
  });
});

describe('BackupMetadataSchema', () => {
  it('should validate correct backup metadata', () => {
    const valid = {
      clerk_user_id: 'user123',
      workflow_id: 'wf123',
      workflow_name: 'Test Workflow',
      workflow_data: { nodes: [], connections: {} },
      content_hash: 'abc123def456',
      version: 1,
    };
    
    const result = validateData(BackupMetadataSchema, valid);
    expect(result.success).toBe(true);
  });

  it('should validate with optional fields', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    const valid = {
      id: validUuid,
      clerk_user_id: 'user123',
      workflow_id: 'wf123',
      workflow_name: 'Test Workflow',
      workflow_data: { nodes: [], connections: {} },
      content_hash: 'abc123def456',
      version: 1,
      tags: ['production', 'critical'],
      is_active: true,
      backup_type: 'manual',
      created_at: '2026-01-13T00:00:00Z',
    };
    
    const result = validateData(BackupMetadataSchema, valid);
    expect(result.success).toBe(true);
  });

  it('should reject invalid UUID', () => {
    const invalid = {
      id: 'not-a-uuid',
      clerk_user_id: 'user123',
      workflow_id: 'wf123',
      workflow_name: 'Test Workflow',
      workflow_data: { nodes: [], connections: {} },
      content_hash: 'abc123def456',
      version: 1,
    };
    
    const result = validateData(BackupMetadataSchema, invalid);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid backup ID format');
  });

  it('should reject negative version', () => {
    const invalid = {
      clerk_user_id: 'user123',
      workflow_id: 'wf123',
      workflow_name: 'Test Workflow',
      workflow_data: { nodes: [], connections: {} },
      content_hash: 'abc123def456',
      version: -1,
    };
    
    const result = validateData(BackupMetadataSchema, invalid);
    expect(result.success).toBe(false);
  });

  it('should accept version 0', () => {
    const valid = {
      clerk_user_id: 'user123',
      workflow_id: 'wf123',
      workflow_name: 'Test Workflow',
      workflow_data: { nodes: [], connections: {} },
      content_hash: 'abc123def456',
      version: 0,
    };
    
    const result = validateData(BackupMetadataSchema, valid);
    expect(result.success).toBe(true);
  });
});

describe('Helper Functions', () => {
  describe('validateData', () => {
    it('should return typed data on success', () => {
      const valid = { n8n_instance_url: 'https://n8n.example.com', n8n_api_key: 'test' };
      const result = validateData(ApiKeyTestRequestSchema, valid);
      
      expect(result.success).toBe(true);
      expect(result.data?.n8n_api_key).toBe('test');
    });

    it('should return error on failure', () => {
      const result = validateData(ApiKeyTestRequestSchema, { n8n_instance_url: 'https://n8n.example.com' });
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle complex validation errors', () => {
      const invalid = {
        n8n_instance_url: 'not-a-url',
        retention_days: -5,
      };
      const result = validateData(SettingsUpdateRequestSchema, invalid);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should preserve data structure on success', () => {
      const valid = {
        id: 123,
        name: 'Test',
        active: true,
        tags: ['tag1', 'tag2'],
      };
      const result = validateData(N8nWorkflowSchema, valid);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(valid);
    });
  });

  describe('validateDataOrThrow', () => {
    it('should return data on success', () => {
      const valid = { n8n_instance_url: 'https://n8n.example.com', n8n_api_key: 'test' };
      const result = validateDataOrThrow(ApiKeyTestRequestSchema, valid);
      
      expect(result.n8n_api_key).toBe('test');
    });

    it('should return data on success with empty object', () => {
      const valid = {};
      const result = validateDataOrThrow(ApiKeyTestRequestSchema, valid);
      
      expect(result).toEqual({});
    });

    it('should throw on validation failure', () => {
      expect(() => {
        validateDataOrThrow(ApiKeyTestRequestSchema, { n8n_instance_url: 'https://n8n.example.com' });
      }).toThrow();
    });

    it('should throw with meaningful error', () => {
      expect(() => {
        validateDataOrThrow(SettingsUpdateRequestSchema, {
          n8n_instance_url: 'not-a-url',
          retention_days: -5,
        });
      }).toThrow();
    });

    it('should preserve data types', () => {
      const valid = {
        n8n_instance_url: 'https://example.com',
        n8n_api_key: 'key',
        retention_days: 30,
      };
      const result = validateDataOrThrow(SettingsUpdateRequestSchema, valid);
      
      expect(result.retention_days).toBe(30);
      expect(typeof result.retention_days).toBe('number');
    });
  });

  describe('safeValidate', () => {
    it('should return detailed success result', () => {
      const valid = { n8n_instance_url: 'https://n8n.example.com', n8n_api_key: 'test' };
      const result = safeValidate(ApiKeyTestRequestSchema, valid);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.n8n_api_key).toBe('test');
      }
    });

    it('should return detailed error result', () => {
      const result = safeValidate(ApiKeyTestRequestSchema, { n8n_instance_url: 'https://n8n.example.com' });
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    it('should provide error details for debugging', () => {
      const invalid = {
        n8n_instance_url: 'not-a-url',
        retention_days: -5,
      };
      const result = safeValidate(SettingsUpdateRequestSchema, invalid);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    it('should handle complex nested validation', () => {
      const valid = {
        data: [
          { id: '1', name: 'Workflow 1', active: true },
          { id: 2, name: 'Workflow 2', active: false },
        ],
      };
      const result = safeValidate(N8nWorkflowListSchema, valid);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data).toHaveLength(2);
      }
    });
  });
});

describe('Edge Cases and Integration', () => {
  it('should handle null values appropriately', () => {
    const result = validateData(UserSettingsSchema, {
      clerk_user_id: '123e4567-e89b-12d3-a456-426614174000',
      n8n_instance_url: 'https://example.com',
      n8n_api_key_encrypted: 'encrypted',
      encryption_iv: 'iv',
      last_backup_at: null,
    });
    
    expect(result.success).toBe(true);
  });

  it('should handle undefined optional fields', () => {
    const valid = {
      workflowIds: ['wf1'],
      encryptionPassword: 'pass',
      // tags and description are undefined
    };
    const result = validateData(BackupTriggerRequestSchema, valid);
    
    expect(result.success).toBe(true);
  });

  it('should handle mixed string/number workflow IDs', () => {
    const list = {
      data: [
        { id: '123', name: 'String ID' },
        { id: 456, name: 'Number ID' },
      ],
    };
    const result = validateData(N8nWorkflowListSchema, list);
    
    expect(result.success).toBe(true);
  });

  it('should validate complex workflow structures', () => {
    const workflow = {
      id: 'complex-wf',
      name: 'Complex Workflow',
      active: true,
      nodes: [
        {
          id: 'trigger',
          type: 'webhook',
          parameters: { path: '/webhook', method: 'POST' },
        },
        {
          id: 'code',
          type: 'code',
          parameters: {
            code: 'const result = items.map(item => ({ ...item, processed: true })); return result;',
          },
        },
      ],
      connections: {
        trigger: {
          main: [[{ node: 'code', type: 'main', index: 0 }]],
        },
      },
      settings: {
        saveExecutionProgress: true,
        executionTimeout: 3600,
      },
      staticData: {
        counter: 0,
      },
      tags: ['production', 'webhook', 'automated'],
    };
    
    const result = validateData(N8nWorkflowSchema, workflow);
    expect(result.success).toBe(true);
  });

  it('should handle validation across multiple schemas', () => {
    // Settings update
    const settings = {
      n8n_instance_url: 'https://n8n.example.com',
      n8n_api_key: 'api_key',
    };
    const settingsResult = validateData(SettingsUpdateRequestSchema, settings);
    expect(settingsResult.success).toBe(true);

    // Backup trigger
    const backup = {
      workflowIds: ['wf1', 'wf2'],
      tags: ['manual'],
    };
    const backupResult = validateData(BackupTriggerRequestSchema, backup);
    expect(backupResult.success).toBe(true);

    // Encrypted data
    const encrypted = {
      ciphertext: 'data',
      iv: 'iv',
      salt: 'salt',
      tag: 'tag',
      version: 1,
    };
    const encryptedResult = validateData(EncryptedDataSchema, encrypted);
    expect(encryptedResult.success).toBe(true);
  });
});
