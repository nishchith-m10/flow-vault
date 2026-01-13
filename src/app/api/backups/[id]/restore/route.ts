/**
 * Restore workflow from backup API endpoint
 * POST /api/backups/[id]/restore
 * 
 * Rate-limited to 20 requests/hour (cost=2 per request)
 * Higher cost reflects restore being more resource-intensive than exports
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBackupById } from '@/lib/database/workflowBackups';

let auth: () => Promise<{ userId?: string }> = async () => ({ userId: undefined });
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  auth = require('@clerk/nextjs/server').auth;
} catch (err) {
  // Clerk not available
}
import { decryptBackupData } from '@/lib/backup/restore';
import { type EncryptedData, decrypt } from '@/lib/encryption';
import { getUserSettings } from '@/lib/database';
import { safeJSONParse } from '@/lib/utils/json';
import { withRateLimit } from '@/lib/middleware/rateLimiter';
import { EncryptedDataSchema, validateData } from '@/lib/validation';

async function handleRestore(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const backupId = resolvedParams.id;

    // Get request body for conflict handling strategy
    const body = await request.json().catch(() => ({}));
    const handleConflict = body.handleConflict || 'create-new'; // 'skip' | 'overwrite' | 'create-new'

    // Validate conflict strategy
    if (!['skip', 'overwrite', 'create-new'].includes(handleConflict)) {
      return NextResponse.json(
        { success: false, error: 'Invalid conflict handling strategy' },
        { status: 400 }
      );
    }

    // Get backup from database
    const backup = await getBackupById(backupId);

    if (!backup) {
      return NextResponse.json(
        { success: false, error: 'Backup not found' },
        { status: 404 }
      );
    }

    // Verify backup belongs to user
    if (backup.clerk_user_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get encryption password
    const encryptionPassword = process.env.FLOWVAULT_ENCRYPTION_KEY;
    if (!encryptionPassword) {
      return NextResponse.json(
        { success: false, error: 'Encryption key not configured' },
        { status: 500 }
      );
    }

    // Decrypt backup data
    const validationResult = validateData(EncryptedDataSchema, backup.workflow_data);
    if (!validationResult.success || !validationResult.data) {
      return NextResponse.json(
        { error: `Invalid encrypted data format: ${validationResult.error}` },
        { status: 500 }
      );
    }
    const encryptedData = validationResult.data;
    const decryptResult = await decryptBackupData(encryptedData, encryptionPassword);

    if (!decryptResult.success || !decryptResult.workflow) {
      return NextResponse.json(
        {
          success: false,
          error: decryptResult.error || 'Failed to decrypt backup data',
        },
        { status: 500 }
      );
    }

    // Restore workflow to n8n
    const restoreResult = await restoreWorkflowToN8n(
      decryptResult.workflow,
      userId,
      handleConflict
    );

    if (!restoreResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: restoreResult.error || 'Failed to restore workflow',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      workflowId: restoreResult.workflowId,
      workflowName: restoreResult.workflowName,
      action: restoreResult.action,
      message: `Workflow ${restoreResult.action} successfully`,
    });
  } catch (error) {
    console.error('Restore workflow error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit('backup:restore', 2)(handleRestore);

/**
 * Restores workflow to n8n using the n8n API
 */
async function restoreWorkflowToN8n(
  workflow: Record<string, unknown>,
  clerkUserId: string,
  handleConflict: string
) {
  try {
    // Get user settings for n8n connection
    const settings = await getUserSettings(clerkUserId);
    if (!settings) {
      return {
        success: false,
        error: 'User settings not found',
      };
    }

    // Get instance URL and API key from settings
    const instanceUrl = settings.n8n_instance_url;
    
    // Decrypt API key
    const encryptionPassword = process.env.FLOWVAULT_ENCRYPTION_KEY;
    if (!encryptionPassword) {
      return {
        success: false,
        error: 'Encryption key not configured',
      };
    }

    const parseResult = safeJSONParse<EncryptedData>(settings.n8n_api_key_encrypted);
    if (!parseResult.success || !parseResult.data) {
      return {
        success: false,
        error: `Failed to parse encrypted API key: ${parseResult.error}`,
      };
    }
    const encryptedApiKey = parseResult.data;
    const decryptionResult = await decrypt(encryptedApiKey, encryptionPassword);

    if (!decryptionResult.success || !decryptionResult.plaintext) {
      return {
        success: false,
        error: 'Failed to decrypt API key',
      };
    }

    const apiKey = decryptionResult.plaintext;

    // Check if workflow exists
    let existingWorkflow = null;
    if (workflow.id) {
      try {
        const response = await fetch(`${instanceUrl}/api/v1/workflows/${workflow.id}`, {
          method: 'GET',
          headers: {
            'X-N8N-API-KEY': apiKey,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          existingWorkflow = await response.json();
        }
      } catch (_error) {
        // Workflow doesn't exist
        existingWorkflow = null;
      }
    }

    // Handle conflict
    if (existingWorkflow) {
      if (handleConflict === 'skip') {
        return {
          success: true,
          workflowId: existingWorkflow.id,
          workflowName: existingWorkflow.name,
          action: 'skipped',
        };
      }

      if (handleConflict === 'overwrite') {
        // Update existing workflow
        const response = await fetch(`${instanceUrl}/api/v1/workflows/${workflow.id}`, {
          method: 'PUT',
          headers: {
            'X-N8N-API-KEY': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(workflow),
        });

        if (!response.ok) {
          const errorText = await response.text();
          return {
            success: false,
            error: `Failed to update workflow: ${response.status} ${errorText}`,
          };
        }

        const updatedWorkflow = await response.json();
        return {
          success: true,
          workflowId: updatedWorkflow.id,
          workflowName: updatedWorkflow.name,
          action: 'updated',
        };
      }
    }

    // Create new workflow (remove ID to let n8n assign new one)
    const workflowData = { ...workflow };
    delete workflowData.id;

    const response = await fetch(`${instanceUrl}/api/v1/workflows`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(workflowData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Failed to create workflow: ${response.status} ${errorText}`,
      };
    }

    const createdWorkflow = await response.json();
    return {
      success: true,
      workflowId: createdWorkflow.id,
      workflowName: createdWorkflow.name,
      action: 'created',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to restore workflow',
    };
  }
}
