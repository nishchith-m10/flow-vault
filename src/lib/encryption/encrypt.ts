/**
 * Encryption functions for FlowVault
 * Implements AES-256-GCM authenticated encryption
 */

import crypto from 'crypto';
import {
  DEFAULT_ENCRYPTION_CONFIG,
  ENCRYPTION_VERSION,
  type EncryptedData,
  type EncryptionResult,
} from './types';
import { deriveKey, generateSalt, generateIV, validateKey } from './keyManagement';

/**
 * Encrypts plaintext data using AES-256-GCM
 * @param plaintext - Data to encrypt
 * @param password - Encryption password
 * @returns Encrypted data with IV, salt, and authentication tag
 */
export async function encrypt(
  plaintext: string,
  password: string
): Promise<EncryptionResult> {
  try {
    // Input validation
    if (!plaintext || typeof plaintext !== 'string') {
      return {
        success: false,
        error: 'Invalid plaintext: must be a non-empty string',
      };
    }

    if (!password || typeof password !== 'string') {
      return {
        success: false,
        error: 'Invalid password: must be a non-empty string',
      };
    }

    // Generate random salt and IV
    const salt = generateSalt();
    const iv = generateIV();

    // Derive encryption key from password
    const key = await deriveKey(password, salt);

    if (!validateKey(key)) {
      return {
        success: false,
        error: 'Key derivation failed: invalid key length',
      };
    }

    // Create cipher
    const cipher = crypto.createCipheriv(
      DEFAULT_ENCRYPTION_CONFIG.algorithm,
      key,
      iv
    );

    // Encrypt data
    let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');

    // Get authentication tag
    const tag = cipher.getAuthTag();

    const encryptedData: EncryptedData = {
      ciphertext,
      iv: iv.toString('base64'),
      salt: salt.toString('base64'),
      tag: tag.toString('base64'),
      version: ENCRYPTION_VERSION,
    };

    return {
      success: true,
      data: encryptedData,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Encryption failed',
    };
  }
}

/**
 * Encrypts JSON data (workflow data, credentials, etc.)
 * @param data - JSON-serializable data
 * @param password - Encryption password
 * @returns Encrypted data
 */
export async function encryptJSON(
  data: Record<string, unknown>,
  password: string
): Promise<EncryptionResult> {
  try {
    const jsonString = JSON.stringify(data);
    return await encrypt(jsonString, password);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error
        ? `JSON encryption failed: ${error.message}`
        : 'JSON encryption failed',
    };
  }
}

/**
 * Encrypts workflow data for storage
 * @param workflowData - n8n workflow data object
 * @param password - Encryption password
 * @returns Encrypted workflow data
 */
export async function encryptWorkflowData(
  workflowData: Record<string, unknown>,
  password: string
): Promise<EncryptionResult> {
  return encryptJSON(workflowData, password);
}

/**
 * Encrypts sensitive credentials (n8n API key, webhooks, etc.)
 * @param credentials - Credentials object
 * @param password - Encryption password
 * @returns Encrypted credentials
 */
export async function encryptCredentials(
  credentials: Record<string, unknown>,
  password: string
): Promise<EncryptionResult> {
  return encryptJSON(credentials, password);
}
