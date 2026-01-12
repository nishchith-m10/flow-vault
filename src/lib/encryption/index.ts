/**
 * FlowVault Encryption Module
 * Provides AES-256-GCM encryption for sensitive workflow data and credentials
 */

export {
  encrypt,
  encryptJSON,
  encryptWorkflowData,
  encryptCredentials,
} from './encrypt';

export {
  decrypt,
  decryptJSON,
  decryptWorkflowData,
  decryptCredentials,
} from './decrypt';

export {
  deriveKey,
  generateSalt,
  generateIV,
  validateKey,
  getEncryptionKey,
  storeEncryptionKey,
} from './keyManagement';

export {
  DEFAULT_ENCRYPTION_CONFIG,
  ENCRYPTION_VERSION,
  PBKDF2_ITERATIONS,
  PBKDF2_DIGEST,
  type EncryptionConfig,
  type EncryptedData,
  type EncryptionResult,
  type DecryptionResult,
  type KeyDerivationOptions,
} from './types';

// Clarify encoding used for ciphertext generation
