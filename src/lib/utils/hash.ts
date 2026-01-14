/**
 * Cryptographic Hashing Utilities
 * Provides secure hash generation for credential uniqueness checking
 */

import { webcrypto } from 'crypto';

/**
 * Generate SHA-256 hash of input string
 * Used for credential uniqueness constraints without storing plaintext
 *
 * @param input - String to hash (e.g., API key, URL)
 * @returns Hex-encoded SHA-256 hash
 *
 * @example
 * ```typescript
 * const hash = await generateSHA256Hash('my-api-key');
 * // Returns: '2c26b46b68ffc68ff99b453c1d30413413422d706...
 * ```
 */
export async function generateSHA256Hash(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);

  // Use Web Crypto API (available in Node.js 15+)
  const hashBuffer = await webcrypto.subtle.digest('SHA-256', data);

  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

/**
 * Generate hash for API key uniqueness checking
 * Wrapper around generateSHA256Hash for semantic clarity
 *
 * @param apiKey - Plaintext API key
 * @returns SHA-256 hash of API key
 */
export async function generateApiKeyHash(apiKey: string): Promise<string> {
  return generateSHA256Hash(apiKey);
}

/**
 * Validate hash format
 * Ensures hash is a valid 64-character hex string (SHA-256)
 *
 * @param hash - Hash string to validate
 * @returns True if valid SHA-256 hex format
 */
export function isValidSHA256Hash(hash: string): boolean {
  return /^[a-f0-9]{64}$/i.test(hash);
}
