/**
 * Re-encryption Tests
 * Unit tests for backup re-encryption logic
 */

import { describe, it, expect } from 'vitest';
import { encrypt } from '@/lib/encryption/encrypt';
import { decrypt } from '@/lib/encryption/decrypt';

describe('Re-encryption workflow', () => {
  const testData = JSON.stringify({
    id: 'wf-123',
    name: 'Test Workflow',
    nodes: [],
    connections: {},
  });

  const oldKey = 'old-test-key-32-characters-long!';
  const newKey = 'new-test-key-32-characters-long!';

  it('should decrypt with old key and re-encrypt with new key', async () => {
    // Step 1: Encrypt with old key
    const encryptedOld = await encrypt(testData, oldKey);
    expect(encryptedOld.success).toBe(true);
    expect(encryptedOld.data).toBeDefined();

    // Step 2: Decrypt with old key
    const decrypted = await decrypt(encryptedOld.data!, oldKey);
    expect(decrypted.success).toBe(true);
    expect(decrypted.plaintext).toBe(testData);

    // Step 3: Re-encrypt with new key
    const encryptedNew = await encrypt(decrypted.plaintext!, newKey);
    expect(encryptedNew.success).toBe(true);
    expect(encryptedNew.data).toBeDefined();

    // Step 4: Verify new encryption can be decrypted
    const finalDecrypt = await decrypt(encryptedNew.data!, newKey);
    expect(finalDecrypt.success).toBe(true);
    expect(finalDecrypt.plaintext).toBe(testData);
  });

  it('should fail to decrypt with wrong key', async () => {
    const encrypted = await encrypt(testData, oldKey);
    expect(encrypted.success).toBe(true);
    expect(encrypted.data).toBeDefined();

    const decrypted = await decrypt(encrypted.data!, newKey); // Wrong key

    expect(decrypted.success).toBe(false);
    expect(decrypted.error).toBeTruthy();
  });

  it('should preserve data integrity through re-encryption', async () => {
    const largeData = JSON.stringify({
      nodes: Array.from({ length: 100 }, (_, i) => ({
        id: `node-${i}`,
        type: 'test',
        data: { value: i },
      })),
    });

    // Encrypt -> Decrypt -> Re-encrypt -> Decrypt
    const enc1 = await encrypt(largeData, oldKey);
    expect(enc1.success).toBe(true);
    expect(enc1.data).toBeDefined();

    const dec1 = await decrypt(enc1.data!, oldKey);
    expect(dec1.success).toBe(true);
    expect(dec1.plaintext).toBe(largeData);

    const enc2 = await encrypt(dec1.plaintext!, newKey);
    expect(enc2.success).toBe(true);
    expect(enc2.data).toBeDefined();

    const dec2 = await decrypt(enc2.data!, newKey);
    expect(dec2.success).toBe(true);
    expect(dec2.plaintext).toBe(largeData);
    expect(JSON.parse(dec2.plaintext!)).toEqual(JSON.parse(largeData));
  });
});

// Test dry-run output without requiring secrets
