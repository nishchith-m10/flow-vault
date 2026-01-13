/**
 * User Settings API
 * Manages n8n credentials and backup configuration
 */

import { NextRequest, NextResponse } from 'next/server';
let auth: () => Promise<{ userId?: string }> = async () => ({ userId: undefined });
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  auth = require('@clerk/nextjs/server').auth;
} catch (err) {
  // Clerk not available
}
import {
  getUserSettings,
  createUserSettings,
  updateUserSettings,
  deleteUserSettings,
  userSettingsExist,
} from '@/lib/database';
import { encrypt, decrypt, type EncryptedData } from '@/lib/encryption';
import { safeJSONParse } from '@/lib/utils/json';
import { ApiKeyTestRequestSchema, validateData } from '@/lib/validation';

/**
 * GET /api/settings
 * Retrieves user settings
 */
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const settings = await getUserSettings(userId);

    // Don't expose encrypted API key in response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { n8n_api_key_encrypted: _key, encryption_iv: _iv, ...safeSettings } = settings;

    return NextResponse.json({
      success: true,
      data: safeSettings,
    });
  } catch (error) {
    console.error('Failed to fetch user settings:', error);
    
    if (error instanceof Error && error.message.includes('Failed to fetch')) {
      return NextResponse.json(
        { error: 'Settings not found', message: 'Please configure your settings first' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings
 * Creates or updates user settings
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      n8n_instance_url,
      n8n_api_key,
      backup_enabled,
      backup_schedule,
      retention_days,
    } = body;

    // Validate required fields
    if (!n8n_instance_url || !n8n_api_key) {
      return NextResponse.json(
        { error: 'Missing required fields', message: 'n8n_instance_url and n8n_api_key are required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(n8n_instance_url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid n8n_instance_url', message: 'Must be a valid URL' },
        { status: 400 }
      );
    }

    // Get encryption key from environment
    const encryptionPassword = process.env.FLOWVAULT_ENCRYPTION_KEY;
    if (!encryptionPassword) {
      return NextResponse.json(
        { error: 'Server configuration error', message: 'Encryption not configured' },
        { status: 500 }
      );
    }

    // Encrypt the n8n API key
    const encryptionResult = await encrypt(n8n_api_key, encryptionPassword);

    if (!encryptionResult.success || !encryptionResult.data) {
      return NextResponse.json(
        { error: 'Encryption failed', message: encryptionResult.error },
        { status: 500 }
      );
    }

    const encryptedData = encryptionResult.data;

    // Check if settings already exist
    const exists = await userSettingsExist(userId);

    let result;
    if (exists) {
      // Update existing settings
      result = await updateUserSettings(userId, {
        n8n_instance_url,
        n8n_api_key_encrypted: JSON.stringify(encryptedData),
        encryption_iv: encryptedData.iv,
        backup_enabled: backup_enabled ?? true,
        backup_schedule: backup_schedule ?? 'daily',
        retention_days: retention_days ?? 30,
      });
    } else {
      // Create new settings
      result = await createUserSettings({
        clerk_user_id: userId,
        n8n_instance_url,
        n8n_api_key_encrypted: JSON.stringify(encryptedData),
        encryption_iv: encryptedData.iv,
        backup_enabled: backup_enabled ?? true,
        backup_schedule: backup_schedule ?? 'daily',
        retention_days: retention_days ?? 30,
      });
    }

    // Don't expose encrypted key in response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { n8n_api_key_encrypted: _key, encryption_iv: _iv, ...safeSettings } = result;

    return NextResponse.json({
      success: true,
      data: safeSettings,
      message: exists ? 'Settings updated successfully' : 'Settings created successfully',
    });
  } catch (error) {
    console.error('Failed to save user settings:', error);
    
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/settings
 * Deletes user settings
 */
export async function DELETE() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await deleteUserSettings(userId);

    return NextResponse.json({
      success: true,
      message: 'Settings deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete user settings:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/settings/test
 * Tests n8n connection with current or provided credentials
 */
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = validateData(ApiKeyTestRequestSchema, body);
    
    if (!validationResult.success || !validationResult.data) {
      return NextResponse.json(
        { error: `Invalid request: ${validationResult.error}` },
        { status: 400 }
      );
    }

    const { n8n_instance_url: providedUrl, n8n_api_key: providedKey } = validationResult.data;

    let instanceUrl: string;
    let apiKey: string;

    if (providedUrl && providedKey) {
      // Test with provided credentials
      instanceUrl = providedUrl;
      apiKey = providedKey;
    } else {
      // Test with stored credentials
      const settings = await getUserSettings(userId);
      instanceUrl = settings.n8n_instance_url;

      // Decrypt stored API key
      const encryptionPassword = process.env.FLOWVAULT_ENCRYPTION_KEY;
      if (!encryptionPassword) {
        return NextResponse.json(
          { error: 'Server configuration error' },
          { status: 500 }
        );
      }

      const parseResult = safeJSONParse<EncryptedData>(settings.n8n_api_key_encrypted);
      if (!parseResult.success || !parseResult.data) {
        return NextResponse.json(
          { error: `Failed to parse encrypted API key: ${parseResult.error}` },
          { status: 500 }
        );
      }
      const encryptedData = parseResult.data;
      const decryptionResult = await decrypt(encryptedData, encryptionPassword);

      if (!decryptionResult.success || !decryptionResult.plaintext) {
        return NextResponse.json(
          { error: 'Failed to decrypt API key' },
          { status: 500 }
        );
      }

      apiKey = decryptionResult.plaintext;
    }

    // Test n8n connection
    const testUrl = `${instanceUrl}/api/v1/workflows`;
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `n8n connection failed: ${response.status} ${response.statusText}`,
      }, { status: 200 }); // Return 200 with error details
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      message: 'n8n connection successful',
      workflowCount: data.data?.length ?? 0,
    });
  } catch (error) {
    console.error('n8n connection test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Connection test failed',
    }, { status: 200 });
  }
}
