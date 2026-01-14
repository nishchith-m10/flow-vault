/**
 * Tests for /api/n8n proxy endpoint Zod schema validation
 * Verifies all n8n proxy action schemas work correctly
 */

import { describe, it, expect } from 'vitest';
import {
  N8nProxyRequestSchema,
  N8nActionEnum,
  N8nUrlSchema,
  N8nApiKeySchema,
  N8nLimitSchema,
  N8nWorkflowImportSchema,
  validateData,
} from '@/lib/validation';

describe('/api/n8n Proxy - Schema Validation', () => {
  describe('Common Field Validation', () => {
    it('should reject invalid action', () => {
      const invalid = {
        action: 'invalidAction',
        n8nUrl: 'https://n8n.example.com',
        apiKey: 'test-api-key-1234567890',
      };

      const result = validateData(N8nProxyRequestSchema, invalid);
      expect(result.success).toBe(false);
      expect(result.error).toContain('action');
    });

    it('should reject missing n8nUrl', () => {
      const invalid = {
        action: 'listWorkflows',
        apiKey: 'test-api-key-1234567890',
      };

      const result = validateData(N8nProxyRequestSchema, invalid);
      expect(result.success).toBe(false);
      expect(result.error).toContain('n8nUrl');
    });

    it('should reject invalid URL format', () => {
      const invalid = {
        action: 'listWorkflows',
        n8nUrl: 'not-a-valid-url',
        apiKey: 'test-api-key-1234567890',
      };

      const result = validateData(N8nProxyRequestSchema, invalid);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid URL format');
    });

    it('should reject HTTP URL (not HTTPS or localhost)', () => {
      const invalid = {
        action: 'listWorkflows',
        n8nUrl: 'http://n8n.example.com',
        apiKey: 'test-api-key-1234567890',
      };

      const result = validateData(N8nProxyRequestSchema, invalid);
      expect(result.success).toBe(false);
      expect(result.error).toContain('must use HTTPS');
    });

    it('should accept localhost HTTP URLs', () => {
      const valid = {
        action: 'listWorkflows',
        n8nUrl: 'http://localhost:5678',
        apiKey: 'test-api-key-1234567890',
      };

      const result = validateData(N8nProxyRequestSchema, valid);
      expect(result.success).toBe(true);
    });

    it('should accept 127.0.0.1 HTTP URLs', () => {
      const valid = {
        action: 'listWorkflows',
        n8nUrl: 'http://127.0.0.1:5678',
        apiKey: 'test-api-key-1234567890',
      };

      const result = validateData(N8nProxyRequestSchema, valid);
      expect(result.success).toBe(true);
    });

    it('should reject URL exceeding 2048 characters', () => {
      const longUrl = 'https://' + 'a'.repeat(2050) + '.com';
      const invalid = {
        action: 'listWorkflows',
        n8nUrl: longUrl,
        apiKey: 'test-api-key-1234567890',
      };

      const result = validateData(N8nProxyRequestSchema, invalid);
      expect(result.success).toBe(false);
      expect(result.error).toContain('URL too long');
    });

    it('should reject missing apiKey', () => {
      const invalid = {
        action: 'listWorkflows',
        n8nUrl: 'https://n8n.example.com',
      };

      const result = validateData(N8nProxyRequestSchema, invalid);
      expect(result.success).toBe(false);
      expect(result.error).toContain('apiKey');
    });

    it('should reject API key shorter than 10 characters', () => {
      const invalid = {
        action: 'listWorkflows',
        n8nUrl: 'https://n8n.example.com',
        apiKey: 'short',
      };

      const result = validateData(N8nProxyRequestSchema, invalid);
      expect(result.success).toBe(false);
      expect(result.error).toContain('API key too short');
    });

    it('should reject API key exceeding 1024 characters', () => {
      const longKey = 'a'.repeat(1025);
      const invalid = {
        action: 'listWorkflows',
        n8nUrl: 'https://n8n.example.com',
        apiKey: longKey,
      };

      const result = validateData(N8nProxyRequestSchema, invalid);
      expect(result.success).toBe(false);
      expect(result.error).toContain('API key too long');
    });
  });

  describe('N8nActionEnum', () => {
    it('should accept all valid actions', () => {
      const validActions = [
        'import', 'listWorkflows', 'getWorkflow', 'deleteWorkflow',
        'activateWorkflow', 'deactivateWorkflow', 'archiveWorkflow', 'unarchiveWorkflow',
        'createTag', 'listTags', 'deleteTag', 'tagWorkflow', 'untagWorkflow',
        'listExecutions', 'getExecution', 'deleteExecution', 'retryExecution',
      ];

      for (const action of validActions) {
        const result = N8nActionEnum.safeParse(action);
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid actions', () => {
      const invalidActions = ['invalidAction', 'hack', '', 123, null, undefined];

      for (const action of invalidActions) {
        const result = N8nActionEnum.safeParse(action);
        expect(result.success).toBe(false);
      }
    });
  });

  describe('Workflow Import Validation', () => {
    it('should reject import with missing workflow', () => {
      const invalid = {
        action: 'import',
        n8nUrl: 'https://n8n.example.com',
        apiKey: 'test-api-key-1234567890',
      };

      const result = validateData(N8nProxyRequestSchema, invalid);
      expect(result.success).toBe(false);
      expect(result.error).toContain('workflow');
    });

    it('should reject import with workflow name exceeding 200 characters', () => {
      const longName = 'a'.repeat(201);
      const invalid = {
        action: 'import',
        n8nUrl: 'https://n8n.example.com',
        apiKey: 'test-api-key-1234567890',
        workflow: {
          name: longName,
          nodes: [],
          connections: {},
        },
      };

      const result = validateData(N8nProxyRequestSchema, invalid);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Workflow name too long');
    });

    it('should reject import with more than 500 nodes (DoS prevention)', () => {
      const tooManyNodes = Array(501).fill({ type: 'test' });
      const invalid = {
        action: 'import',
        n8nUrl: 'https://n8n.example.com',
        apiKey: 'test-api-key-1234567890',
        workflow: {
          name: 'Test Workflow',
          nodes: tooManyNodes,
          connections: {},
        },
      };

      const result = validateData(N8nProxyRequestSchema, invalid);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Too many nodes');
    });

    it('should accept valid workflow import', () => {
      const valid = {
        action: 'import',
        n8nUrl: 'https://n8n.example.com',
        apiKey: 'test-api-key-1234567890',
        workflow: {
          name: 'Test Workflow',
          nodes: [{ type: 'n8n-nodes-base.start' }],
          connections: {},
        },
      };

      const result = validateData(N8nProxyRequestSchema, valid);
      expect(result.success).toBe(true);
    });

    it('should accept workflow with optional settings and staticData', () => {
      const valid = {
        action: 'import',
        n8nUrl: 'https://n8n.example.com',
        apiKey: 'test-api-key-1234567890',
        workflow: {
          name: 'Test Workflow',
          nodes: [{ type: 'n8n-nodes-base.start' }],
          connections: {},
          settings: { saveDataErrorExecution: 'all' },
          staticData: { lastRun: '2025-01-01' },
        },
      };

      const result = validateData(N8nProxyRequestSchema, valid);
      expect(result.success).toBe(true);
    });
  });

  describe('Workflow Operations Validation', () => {
    it('should reject getWorkflow without workflowId', () => {
      const invalid = {
        action: 'getWorkflow',
        n8nUrl: 'https://n8n.example.com',
        apiKey: 'test-api-key-1234567890',
      };

      const result = validateData(N8nProxyRequestSchema, invalid);
      expect(result.success).toBe(false);
      expect(result.error).toContain('workflowId');
    });

    it('should reject deleteWorkflow with workflowId exceeding 100 characters', () => {
      const longId = 'a'.repeat(101);
      const invalid = {
        action: 'deleteWorkflow',
        n8nUrl: 'https://n8n.example.com',
        apiKey: 'test-api-key-1234567890',
        workflowId: longId,
      };

      const result = validateData(N8nProxyRequestSchema, invalid);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Workflow ID too long');
    });

    it('should accept all valid workflow operations', () => {
      const actions = ['getWorkflow', 'deleteWorkflow', 'activateWorkflow', 'deactivateWorkflow', 'archiveWorkflow', 'unarchiveWorkflow'];

      for (const action of actions) {
        const valid = {
          action,
          n8nUrl: 'https://n8n.example.com',
          apiKey: 'test-api-key-1234567890',
          workflowId: 'test-workflow-id',
        };

        const result = validateData(N8nProxyRequestSchema, valid);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('Tag Operations Validation', () => {
    it('should reject createTag without tagName', () => {
      const invalid = {
        action: 'createTag',
        n8nUrl: 'https://n8n.example.com',
        apiKey: 'test-api-key-1234567890',
      };

      const result = validateData(N8nProxyRequestSchema, invalid);
      expect(result.success).toBe(false);
      expect(result.error).toContain('tagName');
    });

    it('should reject createTag with tagName exceeding 100 characters', () => {
      const longName = 'a'.repeat(101);
      const invalid = {
        action: 'createTag',
        n8nUrl: 'https://n8n.example.com',
        apiKey: 'test-api-key-1234567890',
        tagName: longName,
      };

      const result = validateData(N8nProxyRequestSchema, invalid);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Tag name too long');
    });

    it('should reject tagWorkflow without tagId', () => {
      const invalid = {
        action: 'tagWorkflow',
        n8nUrl: 'https://n8n.example.com',
        apiKey: 'test-api-key-1234567890',
        workflowId: 'test-workflow',
      };

      const result = validateData(N8nProxyRequestSchema, invalid);
      expect(result.success).toBe(false);
      expect(result.error).toContain('tagId');
    });

    it('should accept valid createTag', () => {
      const valid = {
        action: 'createTag',
        n8nUrl: 'https://n8n.example.com',
        apiKey: 'test-api-key-1234567890',
        tagName: 'production',
      };

      const result = validateData(N8nProxyRequestSchema, valid);
      expect(result.success).toBe(true);
    });

    it('should accept valid tagWorkflow', () => {
      const valid = {
        action: 'tagWorkflow',
        n8nUrl: 'https://n8n.example.com',
        apiKey: 'test-api-key-1234567890',
        workflowId: 'test-workflow',
        tagId: 'test-tag',
      };

      const result = validateData(N8nProxyRequestSchema, valid);
      expect(result.success).toBe(true);
    });

    it('should accept valid deleteTag', () => {
      const valid = {
        action: 'deleteTag',
        n8nUrl: 'https://n8n.example.com',
        apiKey: 'test-api-key-1234567890',
        tagId: 'test-tag',
      };

      const result = validateData(N8nProxyRequestSchema, valid);
      expect(result.success).toBe(true);
    });
  });

  describe('Execution Operations Validation', () => {
    it('should reject getExecution without executionId', () => {
      const invalid = {
        action: 'getExecution',
        n8nUrl: 'https://n8n.example.com',
        apiKey: 'test-api-key-1234567890',
      };

      const result = validateData(N8nProxyRequestSchema, invalid);
      expect(result.success).toBe(false);
      expect(result.error).toContain('executionId');
    });

    it('should reject listExecutions with limit exceeding 1000', () => {
      const invalid = {
        action: 'listExecutions',
        n8nUrl: 'https://n8n.example.com',
        apiKey: 'test-api-key-1234567890',
        limit: 1001,
      };

      const result = validateData(N8nProxyRequestSchema, invalid);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Limit cannot exceed 1000');
    });

    it('should reject listExecutions with negative limit', () => {
      const invalid = {
        action: 'listExecutions',
        n8nUrl: 'https://n8n.example.com',
        apiKey: 'test-api-key-1234567890',
        limit: -1,
      };

      const result = validateData(N8nProxyRequestSchema, invalid);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Limit must be at least 1');
    });

    it('should reject listExecutions with limit of 0', () => {
      const invalid = {
        action: 'listExecutions',
        n8nUrl: 'https://n8n.example.com',
        apiKey: 'test-api-key-1234567890',
        limit: 0,
      };

      const result = validateData(N8nProxyRequestSchema, invalid);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Limit must be at least 1');
    });

    it('should accept listExecutions with valid limit', () => {
      const valid = {
        action: 'listExecutions',
        n8nUrl: 'https://n8n.example.com',
        apiKey: 'test-api-key-1234567890',
        limit: 100,
      };

      const result = validateData(N8nProxyRequestSchema, valid);
      expect(result.success).toBe(true);
    });

    it('should accept listExecutions without limit', () => {
      const valid = {
        action: 'listExecutions',
        n8nUrl: 'https://n8n.example.com',
        apiKey: 'test-api-key-1234567890',
      };

      const result = validateData(N8nProxyRequestSchema, valid);
      expect(result.success).toBe(true);
    });

    it('should accept execution operations with executionId', () => {
      const actions = ['getExecution', 'deleteExecution', 'retryExecution'];

      for (const action of actions) {
        const valid = {
          action,
          n8nUrl: 'https://n8n.example.com',
          apiKey: 'test-api-key-1234567890',
          executionId: 'test-execution-id',
        };

        const result = validateData(N8nProxyRequestSchema, valid);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('List Operations Validation', () => {
    it('should accept listWorkflows', () => {
      const valid = {
        action: 'listWorkflows',
        n8nUrl: 'https://n8n.example.com',
        apiKey: 'test-api-key-1234567890',
      };

      const result = validateData(N8nProxyRequestSchema, valid);
      expect(result.success).toBe(true);
    });

    it('should accept listTags', () => {
      const valid = {
        action: 'listTags',
        n8nUrl: 'https://n8n.example.com',
        apiKey: 'test-api-key-1234567890',
      };

      const result = validateData(N8nProxyRequestSchema, valid);
      expect(result.success).toBe(true);
    });
  });

  describe('N8nLimitSchema', () => {
    it('should accept valid limit values', () => {
      const validLimits = [1, 50, 100, 500, 1000];

      for (const limit of validLimits) {
        const result = N8nLimitSchema.safeParse(limit);
        expect(result.success).toBe(true);
      }
    });

    it('should reject limit values outside 1-1000 range', () => {
      const invalidLimits = [0, -1, 1001, 99999];

      for (const limit of invalidLimits) {
        const result = N8nLimitSchema.safeParse(limit);
        expect(result.success).toBe(false);
      }
    });

    it('should reject non-integer limits', () => {
      const invalidLimits = [1.5, 50.7, '100', null, undefined];

      for (const limit of invalidLimits) {
        const result = N8nLimitSchema.safeParse(limit);
        expect(result.success).toBe(false);
      }
    });
  });

  describe('N8nWorkflowImportSchema', () => {
    it('should require name and nodes', () => {
      const invalid = { connections: {} };
      const result = N8nWorkflowImportSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should accept minimal valid workflow', () => {
      const valid = {
        name: 'Test Workflow',
        nodes: [],
        connections: {},
      };
      const result = N8nWorkflowImportSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should limit workflow name to 200 characters', () => {
      const validName = 'a'.repeat(200);
      const invalidName = 'a'.repeat(201);

      const valid = { name: validName, nodes: [], connections: {} };
      const invalid = { name: invalidName, nodes: [], connections: {} };

      expect(N8nWorkflowImportSchema.safeParse(valid).success).toBe(true);
      expect(N8nWorkflowImportSchema.safeParse(invalid).success).toBe(false);
    });

    it('should limit nodes to 500', () => {
      const validNodes = Array(500).fill({ type: 'test' });
      const tooManyNodes = Array(501).fill({ type: 'test' });

      const valid = { name: 'Test', nodes: validNodes, connections: {} };
      const invalid = { name: 'Test', nodes: tooManyNodes, connections: {} };

      expect(N8nWorkflowImportSchema.safeParse(valid).success).toBe(true);
      expect(N8nWorkflowImportSchema.safeParse(invalid).success).toBe(false);
    });
  });
});
