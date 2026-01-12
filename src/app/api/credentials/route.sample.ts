/**
 * API Route: Store/Retrieve Encrypted n8n Credentials
 * 
 * SAMPLE - DO NOT COMMIT TO GIT
 * 
 * Endpoints:
 * - POST /api/credentials - Store encrypted credentials
 * - GET /api/credentials - Retrieve encrypted credentials
 * - DELETE /api/credentials/:id - Delete credentials
 * 
 * Security:
 * - Requires Clerk authentication
 * - User-scoped (can't access other users' credentials)
 * - Credentials encrypted before storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { encrypt, decrypt } from '@/lib/crypto';
import { createStorageAdapter } from '@/lib/storage/adapter';

/**
 * POST /api/credentials
 * 
 * Store encrypted n8n credentials for the authenticated user
 * 
 * Request body:
 * {
 *   "instance_id": "prod",
 *   "n8n_url": "https://n8n.example.com",
 *   "api_key": "n8n_api_..."
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "credential_id": "uuid"
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { instance_id, n8n_url, api_key } = body;

    // Validate inputs
    if (!instance_id || !n8n_url || !api_key) {
      return NextResponse.json(
        { error: 'Missing required fields: instance_id, n8n_url, api_key' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(n8n_url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid n8n_url format' },
        { status: 400 }
      );
    }

    // Get encryption key from environment
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      console.error('ENCRYPTION_KEY not set in environment');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Encrypt credentials
    const encryptedUrl = encrypt(n8n_url, encryptionKey);
    const encryptedApiKey = encrypt(api_key, encryptionKey);

    // Store in database
    const storage = await createStorageAdapter();
    const credential = await storage.storeCredential(
      userId,
      instance_id,
      encryptedUrl,
      encryptedApiKey
    );

    // Return success
    return NextResponse.json({
      success: true,
      credential_id: credential.id,
      instance_id: credential.instance_id,
    });
  } catch (error) {
    console.error('Failed to store credentials:', error);
    return NextResponse.json(
      { error: 'Failed to store credentials' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/credentials
 * 
 * Retrieve decrypted n8n credentials for the authenticated user
 * 
 * Query params:
 * - instance_id (optional): Filter by instance
 * 
 * Response:
 * {
 *   "credentials": [
 *     {
 *       "id": "uuid",
 *       "instance_id": "prod",
 *       "n8n_url": "https://n8n.example.com",
 *       "api_key": "n8n_api_...",
 *       "created_at": "2026-01-05T12:00:00Z"
 *     }
 *   ]
 * }
 */
export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query params
    const { searchParams } = new URL(req.url);
    const instanceId = searchParams.get('instance_id') || undefined;

    // Get encryption key
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      console.error('ENCRYPTION_KEY not set in environment');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Fetch credentials from database
    const storage = await createStorageAdapter();
    const credentials = await storage.getCredentials(userId, instanceId);

    // Decrypt credentials
    const decryptedCredentials = credentials.map((cred) => ({
      id: cred.id,
      instance_id: cred.instance_id,
      n8n_url: decrypt(cred.encrypted_n8n_url, encryptionKey),
      api_key: decrypt(cred.encrypted_api_key, encryptionKey),
      created_at: cred.created_at,
      updated_at: cred.updated_at,
      metadata: cred.metadata,
    }));

    return NextResponse.json({
      credentials: decryptedCredentials,
    });
  } catch (error) {
    console.error('Failed to retrieve credentials:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve credentials' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/credentials
 * 
 * Delete a credential
 * 
 * Request body:
 * {
 *   "credential_id": "uuid"
 * }
 * 
 * Response:
 * {
 *   "success": true
 * }
 */
export async function DELETE(req: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { credential_id } = body;

    if (!credential_id) {
      return NextResponse.json(
        { error: 'Missing required field: credential_id' },
        { status: 400 }
      );
    }

    // Delete from database
    const storage = await createStorageAdapter();
    const deleted = await storage.deleteCredential(userId, credential_id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Credential not found or already deleted' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete credential:', error);
    return NextResponse.json(
      { error: 'Failed to delete credential' },
      { status: 500 }
    );
  }
}

/**
 * Example client-side usage:
 * 
 * // Store credentials
 * const response = await fetch('/api/credentials', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     instance_id: 'prod',
 *     n8n_url: 'https://n8n.example.com',
 *     api_key: 'n8n_api_...',
 *   }),
 * });
 * 
 * // Retrieve credentials
 * const response = await fetch('/api/credentials');
 * const { credentials } = await response.json();
 * 
 * // Delete credential
 * await fetch('/api/credentials', {
 *   method: 'DELETE',
 *   body: JSON.stringify({ credential_id: 'uuid' }),
 * });
 */
