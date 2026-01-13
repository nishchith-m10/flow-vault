/**
 * Decryption functions for FlowVault
 * Implements AES-256-GCM authenticated decryption
 */

import crypto from 'crypto';
import {
  DEFAULT_ENCRYPTION_CONFIG,
  type EncryptedData,
  type DecryptionResult,
} from './types';
import { deriveKey, validateKey } from './keyManagement';
import { safeJSONParse } from '@/lib/utils/json';

/**
 * Decrypts data encrypted with AES-256-GCM
 * @param encryptedData - Encrypted data with IV, salt, and tag
 * @param password - Decryption password
 * @returns Decrypted plaintext
 */
export async function decrypt(
  encryptedData: EncryptedData,
  password: string
): Promise<DecryptionResult> {
  try {
    // Input validation
    if (!encryptedData || typeof encryptedData !== 'object') {
      return {
        success: false,
        error: 'Invalid encrypted data: must be an object',
      };
    }

    if (!password || typeof password !== 'string') {
      return {
        success: false,
        error: 'Invalid password: must be a non-empty string',
      };
    }

    const { ciphertext, iv, salt, tag, version } = encryptedData;

    // Validate required fields
    if (!ciphertext || !iv || !salt || !tag) {
      return {
        success: false,
        error: 'Invalid encrypted data: missing required fields',
      };
    }

    // Check version compatibility
    if (version !== 1) {
      return {
        success: false,
        error: `Unsupported encryption version: ${version}`,
      };
    }

    // Convert base64 strings to buffers
    const ivBuffer = Buffer.from(iv, 'base64');
    const saltBuffer = Buffer.from(salt, 'base64');
    const tagBuffer = Buffer.from(tag, 'base64');

    // Derive decryption key
    const key = await deriveKey(password, saltBuffer);

    if (!validateKey(key)) {
      return {
        success: false,
        error: 'Key derivation failed: invalid key length',
      };
    }

    // Create decipher
    const decipher = crypto.createDecipheriv(
      DEFAULT_ENCRYPTION_CONFIG.algorithm,
      key,
      ivBuffer
    );

    // Set authentication tag
    decipher.setAuthTag(tagBuffer);

    // Decrypt data
    let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
    plaintext += decipher.final('utf8');

    return {
      success: true,
      plaintext,
    };
  } catch (error) {
    // Authentication failure or decryption error
    if (error instanceof Error && error.message.includes('auth')) {
      return {
        success: false,
        error: 'Decryption failed: invalid password or corrupted data',
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Decryption failed',
    };
  }
}

/**
 * Decrypts JSON data
 * @param encryptedData - Encrypted JSON data
 * @param password - Decryption password
 * @returns Decrypted JSON object
 */
export async function decryptJSON<T = Record<string, unknown>>(
  encryptedData: EncryptedData,
  password: string
): Promise<DecryptionResult & { data?: T }> {
  try {
    const result = await decrypt(encryptedData, password);

    if (!result.success || !result.plaintext) {
      return {
        success: false,
        error: result.error || 'Decryption failed',
      };
    }

    const parseResult = safeJSONParse<T>(result.plaintext);
    if (!parseResult.success || !parseResult.data) {
      return { 
        success: false, 
        error: `JSON parse failed: ${parseResult.error}` 
      };
    }

    return {
      success: true,
      data: parseResult.data,
      plaintext: result.plaintext,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error
        ? `JSON decryption failed: ${error.message}`
        : 'JSON decryption failed',
    };
  }
}

/**
 * Decrypts workflow data
 * @param encryptedData - Encrypted workflow data
 * @param password - Decryption password
 * @returns Decrypted workflow data object
 */
export async function decryptWorkflowData(
  encryptedData: EncryptedData,
  password: string
): Promise<DecryptionResult & { data?: Record<string, unknown> }> {
  return decryptJSON<Record<string, unknown>>(encryptedData, password);
}

/**
 * Decrypts credentials
 * @param encryptedData - Encrypted credentials
 * @param password - Decryption password
 * @returns Decrypted credentials object
 */
export async function decryptCredentials(
  encryptedData: EncryptedData,
  password: string
): Promise<DecryptionResult & { data?: Record<string, unknown> }> {
  return decryptJSON<Record<string, unknown>>(encryptedData, password);
}
