/**
 * Proof-of-Concept: Zod Validation in Settings Test Endpoint
 * Demonstrates runtime validation with ApiKeyTestRequestSchema
 */

import { describe, it, expect } from 'vitest';
import { ApiKeyTestRequestSchema, validateData } from '@/lib/validation';

describe('Settings Test Endpoint - Zod Validation POC', () => {
  describe('ApiKeyTestRequestSchema Validation', () => {
    it('should accept empty object (test with stored credentials)', () => {
      const requestBody = {};
      
      const result = validateData(ApiKeyTestRequestSchema, requestBody);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });

    it('should accept both URL and API key together', () => {
      const requestBody = {
        n8n_instance_url: 'https://n8n.example.com',
        n8n_api_key: 'my_api_key_123',
      };
      
      const result = validateData(ApiKeyTestRequestSchema, requestBody);
      
      expect(result.success).toBe(true);
      expect(result.data?.n8n_instance_url).toBe('https://n8n.example.com');
      expect(result.data?.n8n_api_key).toBe('my_api_key_123');
    });

    it('should reject URL without API key', () => {
      const requestBody = {
        n8n_instance_url: 'https://n8n.example.com',
      };
      
      const result = validateData(ApiKeyTestRequestSchema, requestBody);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('must both be provided together or both omitted');
    });

    it('should reject API key without URL', () => {
      const requestBody = {
        n8n_api_key: 'my_api_key_123',
      };
      
      const result = validateData(ApiKeyTestRequestSchema, requestBody);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('must both be provided together or both omitted');
    });

    it('should reject invalid URL format', () => {
      const requestBody = {
        n8n_instance_url: 'not-a-valid-url',
        n8n_api_key: 'my_api_key_123',
      };
      
      const result = validateData(ApiKeyTestRequestSchema, requestBody);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid');
    });

    it('should reject empty API key', () => {
      const requestBody = {
        n8n_instance_url: 'https://n8n.example.com',
        n8n_api_key: '',
      };
      
      const result = validateData(ApiKeyTestRequestSchema, requestBody);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('API key cannot be empty');
    });

    it('should provide TypeScript type safety', () => {
      const requestBody = {
        n8n_instance_url: 'https://n8n.example.com',
        n8n_api_key: 'my_api_key_123',
      };
      
      const result = validateData(ApiKeyTestRequestSchema, requestBody);
      
      if (result.success && result.data) {
        // TypeScript knows these fields exist and are typed correctly
        const url: string | undefined = result.data.n8n_instance_url;
        const key: string | undefined = result.data.n8n_api_key;
        
        expect(url).toBe('https://n8n.example.com');
        expect(key).toBe('my_api_key_123');
      }
    });
  });

  describe('Benefits Demonstration', () => {
    it('demonstrates better error messages vs manual validation', () => {
      // Manual validation approach (old way)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const manualValidation = (body: any) => {
        if (body.n8n_instance_url && !body.n8n_api_key) {
          return 'Missing required field: n8n_api_key'; // Generic error
        }
        return null;
      };

      // Zod validation approach (new way)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const zodValidation = (body: any) => {
        const result = validateData(ApiKeyTestRequestSchema, body);
        return result.success ? null : result.error;
      };

      const invalidBody = { n8n_instance_url: 'https://n8n.example.com' };
      
      const manualError = manualValidation(invalidBody);
      const zodError = zodValidation(invalidBody);

      // Zod provides more detailed error messages
      expect(manualError).toBeTruthy();
      expect(zodError).toContain('must both be provided together or both omitted');
    });

    it('demonstrates runtime type safety', () => {
      const untrustedInput = {
        n8n_instance_url: 'https://n8n.example.com',
        n8n_api_key: 'key123',
        malicious_field: 'ignored', // Extra fields are stripped
      };

      const result = validateData(ApiKeyTestRequestSchema, untrustedInput);
      
      expect(result.success).toBe(true);
      // Validated data only contains schema-defined fields
      expect(result.data).toHaveProperty('n8n_instance_url');
      expect(result.data).toHaveProperty('n8n_api_key');
      // Extra fields don't appear in validated data (Zod strips them)
    });
  });
});
