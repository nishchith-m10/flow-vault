/**
 * Settings API Uniqueness Constraints Tests
 * Tests for API key and n8n URL uniqueness enforcement (hash generation)
 */

import { describe, it, expect } from 'vitest';
import { generateApiKeyHash, generateSHA256Hash, isValidSHA256Hash } from '@/lib/utils/hash';

describe('Uniqueness Constraint Hash Generation', () => {
  describe('API Key Hash Generation', () => {
    it('should generate consistent SHA-256 hash for same input', async () => {
      const apiKey = 'test-api-key-123';
      const hash1 = await generateApiKeyHash(apiKey);
      const hash2 = await generateApiKeyHash(apiKey);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // Valid SHA-256 hex
    });

    it('should generate different hashes for different inputs', async () => {
      const hash1 = await generateApiKeyHash('api-key-1');
      const hash2 = await generateApiKeyHash('api-key-2');

      expect(hash1).not.toBe(hash2);
    });

    it('should generate 64-character hex string', async () => {
      const hash = await generateApiKeyHash('test-key');

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it('should handle empty string', async () => {
      const hash = await generateApiKeyHash('');

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it('should handle unicode characters', async () => {
      const hash = await generateApiKeyHash('api-key-🔑-日本語');

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe('SHA-256 Hash Function', () => {
    it('should generate correct SHA-256 hash', async () => {
      // Known test vector: SHA-256 of "hello" is "2cf24dba5fb0a30e26e83b2ac5b9e29e..."
      const hash = await generateSHA256Hash('hello');

      expect(hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    });

    it('should be deterministic', async () => {
      const input = 'deterministic-test';
      const hashes = await Promise.all([
        generateSHA256Hash(input),
        generateSHA256Hash(input),
        generateSHA256Hash(input),
      ]);

      expect(hashes[0]).toBe(hashes[1]);
      expect(hashes[1]).toBe(hashes[2]);
    });

    it('should produce different hashes for different inputs', async () => {
      const hash1 = await generateSHA256Hash('input1');
      const hash2 = await generateSHA256Hash('input2');
      const hash3 = await generateSHA256Hash('input1 '); // with trailing space

      expect(hash1).not.toBe(hash2);
      expect(hash1).not.toBe(hash3);
      expect(hash2).not.toBe(hash3);
    });
  });

  describe('Hash Validation', () => {
    it('should validate correct SHA-256 hash format', () => {
      const validHash = '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824';

      expect(isValidSHA256Hash(validHash)).toBe(true);
    });

    it('should reject hash with wrong length', () => {
      const shortHash = '2cf24dba5fb0a30e';
      const longHash = '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b982412345';

      expect(isValidSHA256Hash(shortHash)).toBe(false);
      expect(isValidSHA256Hash(longHash)).toBe(false);
    });

    it('should reject hash with invalid characters', () => {
      const invalidHash = '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b982g'; // 'g' is invalid
      const withSpaces = '2cf24dba 5fb0a30e 26e83b2a c5b9e29e 1b161e5c 1fa7425e 73043362 938b9824';

      expect(isValidSHA256Hash(invalidHash)).toBe(false);
      expect(isValidSHA256Hash(withSpaces)).toBe(false);
    });

    it('should accept uppercase hex', () => {
      const uppercaseHash = '2CF24DBA5FB0A30E26E83B2AC5B9E29E1B161E5C1FA7425E73043362938B9824';

      expect(isValidSHA256Hash(uppercaseHash)).toBe(true);
    });

    it('should accept mixed case hex', () => {
      const mixedCaseHash = '2Cf24Dba5Fb0A30e26E83b2Ac5B9e29E1b161E5c1Fa7425E73043362938B9824';

      expect(isValidSHA256Hash(mixedCaseHash)).toBe(true);
    });
  });

  describe('Hash Function Security Properties', () => {
    it('should generate different hashes for similar inputs', async () => {
      const hash1 = await generateApiKeyHash('api-key');
      const hash2 = await generateApiKeyHash('api-key '); // with space
      const hash3 = await generateApiKeyHash('API-KEY'); // different case

      expect(hash1).not.toBe(hash2);
      expect(hash1).not.toBe(hash3);
      expect(hash2).not.toBe(hash3);
    });

    it('should be deterministic (same input always produces same hash)', async () => {
      const input = 'consistent-api-key-12345';
      const hashes = await Promise.all([
        generateApiKeyHash(input),
        generateApiKeyHash(input),
        generateApiKeyHash(input),
        generateApiKeyHash(input),
        generateApiKeyHash(input),
      ]);

      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(1); // All hashes should be identical
    });

    it('should handle long inputs', async () => {
      const longInput = 'a'.repeat(10000);
      const hash = await generateApiKeyHash(longInput);

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it('should handle special characters', async () => {
      const specialInput = '!@#$%^&*()_+-={}[]|\\:";\'<>,.?/~`';
      const hash = await generateApiKeyHash(specialInput);

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe('Collision Resistance (Statistical)', () => {
    it('should produce different hashes for incrementing keys', async () => {
      const hashes = await Promise.all([
        generateApiKeyHash('api-key-001'),
        generateApiKeyHash('api-key-002'),
        generateApiKeyHash('api-key-003'),
        generateApiKeyHash('api-key-004'),
        generateApiKeyHash('api-key-005'),
      ]);

      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(5); // All different
    });

    it('should produce different hashes for similar URLs', async () => {
      const hashes = await Promise.all([
        generateSHA256Hash('https://n8n1.example.com'),
        generateSHA256Hash('https://n8n2.example.com'),
        generateSHA256Hash('https://n8n3.example.com'),
      ]);

      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(3);
    });
  });
});
