/**
 * Encryption/Decryption Utilities for FlowVault
 * 
 * DRAFT - DO NOT COMMIT TO GIT
 * 
 * Uses Node.js crypto module with AES-256-GCM for encrypting sensitive data
 * (n8n API keys, URLs, etc.)
 * 
 * IMPORTANT SECURITY NOTES:
 * - ENCRYPTION_KEY must be 32 bytes (64 hex characters)
 * - Store ENCRYPTION_KEY in .env.local, NEVER commit to git
 * - Rotate encryption key periodically
 * - Use unique IV (initialization vector) for each encryption
 */

import crypto from 'crypto';

/**
 * Encryption algorithm
 * AES-256-GCM provides:
 * - 256-bit key strength
 * - Galois/Counter Mode for authenticated encryption
 * - Built-in integrity verification
 */
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 bytes for GCM mode

/**
 * Encrypt plaintext using AES-256-GCM
 * 
 * @param plaintext - The data to encrypt (e.g., API key, URL)
 * @param encryptionKey - 32-byte hex string from environment (ENCRYPTION_KEY)
 * @returns Encrypted string in format: iv:authTag:encrypted (all hex-encoded)
 * 
 * @example
 * const encrypted = encrypt('my-secret-api-key', process.env.ENCRYPTION_KEY!);
 * // Returns: "a1b2c3d4....:e5f6g7h8....:i9j0k1l2...."
 */
export function encrypt(plaintext: string, encryptionKey: string): string {
  try {
    // Validate encryption key
    if (!encryptionKey || encryptionKey.length !== 64) {
      throw new Error('Invalid encryption key: must be 32 bytes (64 hex characters)');
    }

    // Convert hex key to buffer
    const key = Buffer.from(encryptionKey, 'hex');

    // Generate random IV (initialization vector)
    // Must be unique for each encryption operation
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt plaintext
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get authentication tag (for GCM mode)
    // Ensures data integrity and authenticity
    const authTag = cipher.getAuthTag();

    // Return format: iv:authTag:encrypted (all hex-encoded)
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Encryption failed. Check encryption key and input data.');
  }
}

/**
 * Decrypt ciphertext using AES-256-GCM
 * 
 * @param ciphertext - Encrypted string in format: iv:authTag:encrypted
 * @param encryptionKey - Same 32-byte hex string used for encryption
 * @returns Decrypted plaintext
 * 
 * @example
 * const decrypted = decrypt(encrypted, process.env.ENCRYPTION_KEY!);
 * // Returns: "my-secret-api-key"
 */
export function decrypt(ciphertext: string, encryptionKey: string): string {
  try {
    // Validate encryption key
    if (!encryptionKey || encryptionKey.length !== 64) {
      throw new Error('Invalid encryption key: must be 32 bytes (64 hex characters)');
    }

    // Parse ciphertext components
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid ciphertext format. Expected: iv:authTag:encrypted');
    }

    const [ivHex, authTagHex, encryptedHex] = parts;

    // Convert hex strings to buffers
    const key = Buffer.from(encryptionKey, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    // Set authentication tag (for GCM mode)
    decipher.setAuthTag(authTag);

    // Decrypt ciphertext
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Decryption failed. Check encryption key or ciphertext integrity.');
  }
}

/**
 * Generate a secure random encryption key
 * 
 * Use this to generate ENCRYPTION_KEY for .env.local
 * Run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 * 
 * @returns 32-byte hex string (64 characters)
 * 
 * @example
 * const newKey = generateEncryptionKey();
 * console.log(`ENCRYPTION_KEY=${newKey}`);
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash data using SHA-256 (for backup deduplication)
 * 
 * @param data - Data to hash (e.g., workflow JSON)
 * @returns SHA-256 hash as hex string
 * 
 * @example
 * const hash = computeHash(JSON.stringify(workflow));
 * // Returns: "a3f5b2c8..."
 */
export function computeHash(data: string | object): string {
  const stringData = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHash('sha256').update(stringData).digest('hex');
}

/**
 * Validate encryption key format
 * 
 * @param key - Key to validate
 * @returns true if valid, false otherwise
 */
export function isValidEncryptionKey(key: string): boolean {
  return typeof key === 'string' && key.length === 64 && /^[0-9a-fA-F]+$/.test(key);
}

// Example usage (for testing only - remove in production):
// const key = generateEncryptionKey();
// console.log('Generated key:', key);
// const encrypted = encrypt('my-secret-data', key);
// console.log('Encrypted:', encrypted);
// const decrypted = decrypt(encrypted, key);
// console.log('Decrypted:', decrypted);

// Add `isValidEncryptionKey` helper and document usage

// Add docs and ensure functions validate empty keys

// Narrow types and add TODOs

// Add tests ensuring invalid keys are rejected
