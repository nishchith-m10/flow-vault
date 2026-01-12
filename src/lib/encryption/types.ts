/**
 * Encryption types and interfaces for FlowVault
 * Uses AES-256-GCM for authenticated encryption
 */

export interface EncryptionConfig {
  algorithm: 'aes-256-gcm';
  ivLength: number; // 16 bytes for GCM
  saltLength: number; // 32 bytes for key derivation
  tagLength: number; // 16 bytes for authentication tag
  keyLength: number; // 32 bytes for AES-256
}

export interface EncryptedData {
  ciphertext: string; // Base64 encoded
  iv: string; // Base64 encoded initialization vector
  salt: string; // Base64 encoded salt (for key derivation)
  tag: string; // Base64 encoded authentication tag
  version: number; // Encryption format version for future compatibility
}

export interface EncryptionResult {
  success: boolean;
  data?: EncryptedData;
  error?: string;
}

export interface DecryptionResult {
  success: boolean;
  plaintext?: string;
  error?: string;
}

export interface KeyDerivationOptions {
  password: string;
  salt: Buffer;
  iterations: number; // PBKDF2 iterations (recommend 100000+)
  keyLength: number; // Output key length in bytes
  digest: string; // Hash algorithm (e.g., 'sha256')
}

export const DEFAULT_ENCRYPTION_CONFIG: EncryptionConfig = {
  algorithm: 'aes-256-gcm',
  ivLength: 16,
  saltLength: 32,
  tagLength: 16,
  keyLength: 32,
};

export const ENCRYPTION_VERSION = 1;
export const PBKDF2_ITERATIONS = 100000;
export const PBKDF2_DIGEST = 'sha256';
