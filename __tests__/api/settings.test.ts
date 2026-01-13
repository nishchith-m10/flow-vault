import { describe, it, expect } from 'vitest';
import { SettingsUpdateRequestSchema, validateData } from '@/lib/validation';

describe('POST /api/settings - Schema Validation', () => {
  it('should validate correct settings request with all fields', () => {
    const valid = {
      n8n_instance_url: 'https://n8n.example.com',
      n8n_api_key: 'test_api_key_123',
      backup_enabled: true,
      backup_schedule: 'daily',
      retention_days: 30,
    };
    
    const result = validateData(SettingsUpdateRequestSchema, valid);
    expect(result.success).toBe(true);
    expect(result.data?.retention_days).toBe(30);
  });

  it('should validate minimal request with defaults', () => {
    const valid = {
      n8n_instance_url: 'https://n8n.example.com',
      n8n_api_key: 'test_key',
    };
    
    const result = validateData(SettingsUpdateRequestSchema, valid);
    expect(result.success).toBe(true);
    expect(result.data?.backup_enabled).toBe(true); // default
    expect(result.data?.backup_schedule).toBe('daily'); // default
    expect(result.data?.retention_days).toBe(30); // default
  });

  it('should reject missing n8n_instance_url', () => {
    const invalid = { n8n_api_key: 'test_key' };
    const result = validateData(SettingsUpdateRequestSchema, invalid);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should reject missing n8n_api_key', () => {
    const invalid = { n8n_instance_url: 'https://n8n.example.com' };
    const result = validateData(SettingsUpdateRequestSchema, invalid);
    expect(result.success).toBe(false);
    expect(result.error).toContain('n8n_api_key');
  });

  it('should reject invalid URL format', () => {
    const invalid = {
      n8n_instance_url: 'not-a-valid-url',
      n8n_api_key: 'test_key',
    };
    const result = validateData(SettingsUpdateRequestSchema, invalid);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid');
  });

  it('should reject empty API key', () => {
    const invalid = {
      n8n_instance_url: 'https://n8n.example.com',
      n8n_api_key: '',
    };
    const result = validateData(SettingsUpdateRequestSchema, invalid);
    expect(result.success).toBe(false);
  });

  it('should reject negative retention_days', () => {
    const invalid = {
      n8n_instance_url: 'https://n8n.example.com',
      n8n_api_key: 'test_key',
      retention_days: -5,
    };
    const result = validateData(SettingsUpdateRequestSchema, invalid);
    expect(result.success).toBe(false);
    expect(result.error).toContain('positive');
  });

  it('should reject zero retention_days', () => {
    const invalid = {
      n8n_instance_url: 'https://n8n.example.com',
      n8n_api_key: 'test_key',
      retention_days: 0,
    };
    const result = validateData(SettingsUpdateRequestSchema, invalid);
    expect(result.success).toBe(false);
  });
});
