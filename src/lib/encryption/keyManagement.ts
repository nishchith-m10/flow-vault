/**
 * Key management utilities for FlowVault encryption
 * Handles encryption key derivation and storage
 */

import crypto from 'crypto';
import {
  DEFAULT_ENCRYPTION_CONFIG,
  PBKDF2_ITERATIONS,
  PBKDF2_DIGEST,
  type KeyDerivationOptions,
} from './types';

/**
 * Derives an encryption key from a password using PBKDF2
 * @param password - User's encryption password
 * @param salt - Salt for key derivation (must be unique per encryption)
 * @returns Derived encryption key
 */
export async function deriveKey(
  password: string,
  salt: Buffer
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const options: KeyDerivationOptions = {
      password,
      salt,
      iterations: PBKDF2_ITERATIONS,
      keyLength: DEFAULT_ENCRYPTION_CONFIG.keyLength,
      digest: PBKDF2_DIGEST,
    };

    crypto.pbkdf2(
      options.password,
      options.salt,
      options.iterations,
      options.keyLength,
      options.digest,
      (err, derivedKey) => {
        if (err) {
          reject(new Error(`Key derivation failed: ${err.message}`));
        } else {
          resolve(derivedKey);
        }
      }
    );
  });
}

/**
 * Generates a random salt for key derivation
 * @returns Random salt buffer
 */
export function generateSalt(): Buffer {
  return crypto.randomBytes(DEFAULT_ENCRYPTION_CONFIG.saltLength);
}

/**
 * Generates a random initialization vector (IV) for encryption
 * @returns Random IV buffer
 */
export function generateIV(): Buffer {
  return crypto.randomBytes(DEFAULT_ENCRYPTION_CONFIG.ivLength);
}

/**
 * Validates encryption key format
 * @param key - Encryption key to validate
 * @returns True if valid
 */
export function validateKey(key: Buffer): boolean {
  return Buffer.isBuffer(key) && key.length === DEFAULT_ENCRYPTION_CONFIG.keyLength;
}

/**
 * Gets encryption key from environment or Clerk user metadata
 * Priority: 1) Clerk metadata, 2) Environment variable
 * @param clerkUserId - Clerk user ID for metadata lookup
 * @returns Encryption key or null if not found
 */
export async function getEncryptionKey(
  clerkUserId: string
): Promise<string | null> {
  // In production, fetch from Clerk user metadata
  // For now, use environment variable as fallback
  const envKey = process.env.FLOWVAULT_ENCRYPTION_KEY;
  
  if (!envKey) {
    console.warn(`No encryption key found for user ${clerkUserId}`);
    return null;
  }

  return envKey;
}

/**
 * Stores encryption key in Clerk user metadata
 * @param clerkUserId - Clerk user ID
 * @param encryptionKey - Key to store (hashed/encrypted)
 */
export async function storeEncryptionKey(
  clerkUserId: string,
  _encryptionKey: string
): Promise<void> {
  // TODO: Implement Clerk API integration to store in user metadata
  // For Phase 1, we'll use environment variable
  console.log(`Storing encryption key for user ${clerkUserId}`);
}
