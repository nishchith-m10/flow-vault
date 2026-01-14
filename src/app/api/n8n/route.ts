import { NextRequest, NextResponse } from 'next/server';
import { N8nProxyRequestSchema, validateData } from '@/lib/validation';
import { getUserSettings } from '@/lib/database';
import { decrypt, type EncryptedData } from '@/lib/encryption';
import { safeJSONParse } from '@/lib/utils/json';

// Clerk auth import
let auth: () => Promise<{ userId?: string }> = async () => ({ userId: undefined });
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  auth = require('@clerk/nextjs/server').auth;
} catch (err) {
  // Clerk not available
}

// Helper type for destructuring discriminated union - all fields are optional except common ones
type N8nProxyRequestFlat = {
  action: string;
  workflow?: any;
  tagName?: string;
  workflowId?: string;
  tagId?: string;
  limit?: number;
  variableId?: string;
  variableName?: string;
  variableValue?: string;
  executionId?: string;
};

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate request body with Zod schema
    const validationResult = validateData(N8nProxyRequestSchema, body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error },
        { status: 400 }
      );
    }

    // Fetch user settings server-side (credentials never sent to client)
    let settings;
    try {
      settings = await getUserSettings(userId);
    } catch (error) {
      return NextResponse.json(
        { error: 'Settings not configured', message: 'Please configure your n8n credentials in settings first' },
        { status: 404 }
      );
    }

    // Decrypt API key server-side
    const encryptionPassword = process.env.FLOWVAULT_ENCRYPTION_KEY;
    if (!encryptionPassword) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const encryptedDataResult = safeJSONParse<EncryptedData>(
      settings.n8n_api_key_encrypted
    );

    if (!encryptedDataResult.success || !encryptedDataResult.data) {
      console.error('Failed to parse encrypted API key:', encryptedDataResult.error);
      return NextResponse.json(
        { error: 'Failed to decrypt credentials' },
        { status: 500 }
      );
    }

    const decryptResult = await decrypt(encryptedDataResult.data, encryptionPassword);
    if (!decryptResult.success || !decryptResult.plaintext) {
      console.error('Failed to decrypt API key:', decryptResult.error);
      return NextResponse.json(
        { error: 'Failed to decrypt credentials' },
        { status: 500 }
      );
    }

    const apiKey = decryptResult.plaintext;
    const n8nUrl = settings.n8n_instance_url;

    // Type assertion is safe here because we've validated with Zod schema above
    // Using flat type to destructure all possible fields from discriminated union
    const { action, workflow, tagName, workflowId, tagId, limit, variableId, variableName, variableValue, executionId } = validationResult.data as N8nProxyRequestFlat;

    const headers = {
      'X-N8N-API-KEY': apiKey,
      'Content-Type': 'application/json',
    };

    const baseUrl = n8nUrl.replace(/\/$/, '');

    switch (action) {
      // ============ WORKFLOWS ============
      case 'import': {
        const cleanWorkflow = {
          name: workflow.name,
          nodes: workflow.nodes,
          connections: workflow.connections,
          settings: workflow.settings,
          staticData: workflow.staticData,
        };
        const response = await fetch(`${baseUrl}/api/v1/workflows`, {
          method: 'POST',
          headers,
          body: JSON.stringify(cleanWorkflow),
        });
        return NextResponse.json(await response.json());
      }

      case 'listWorkflows': {
        const response = await fetch(`${baseUrl}/api/v1/workflows?limit=250`, {
          headers: { 'X-N8N-API-KEY': apiKey },
        });
        return NextResponse.json(await response.json());
      }

      case 'getWorkflow': {
        const response = await fetch(`${baseUrl}/api/v1/workflows/${workflowId}`, {
          headers: { 'X-N8N-API-KEY': apiKey },
        });
        return NextResponse.json(await response.json());
      }

      case 'deleteWorkflow': {
        const response = await fetch(`${baseUrl}/api/v1/workflows/${workflowId}`, {
          method: 'DELETE',
          headers: { 'X-N8N-API-KEY': apiKey },
        });
        return NextResponse.json({ success: response.ok });
      }

      case 'activateWorkflow': {
        const response = await fetch(`${baseUrl}/api/v1/workflows/${workflowId}/activate`, {
          method: 'POST',
          headers: { 'X-N8N-API-KEY': apiKey },
        });
        return NextResponse.json(await response.json());
      }

      case 'deactivateWorkflow': {
        const response = await fetch(`${baseUrl}/api/v1/workflows/${workflowId}/deactivate`, {
          method: 'POST',
          headers: { 'X-N8N-API-KEY': apiKey },
        });
        return NextResponse.json(await response.json());
      }

      // ============ TAGS ============
      case 'createTag': {
        const createResponse = await fetch(`${baseUrl}/api/v1/tags`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ name: tagName }),
        });
        const createData = await createResponse.json();
        if (createData.id) return NextResponse.json(createData);

        const fetchResponse = await fetch(`${baseUrl}/api/v1/tags`, {
          headers: { 'X-N8N-API-KEY': apiKey },
        });
        const fetchData = await fetchResponse.json();
        const existingTag = fetchData.data?.find((t: { name: string }) => t.name === tagName);
        return NextResponse.json(existingTag || { error: 'Could not create tag' });
      }

      case 'listTags': {
        const response = await fetch(`${baseUrl}/api/v1/tags`, {
          headers: { 'X-N8N-API-KEY': apiKey },
        });
        return NextResponse.json(await response.json());
      }

      case 'deleteTag': {
        const response = await fetch(`${baseUrl}/api/v1/tags/${tagId}`, {
          method: 'DELETE',
          headers: { 'X-N8N-API-KEY': apiKey },
        });
        return NextResponse.json({ success: response.ok });
      }

      case 'tagWorkflow': {
        const response = await fetch(`${baseUrl}/api/v1/workflows/${workflowId}/tags`, {
          method: 'PUT',
          headers,
          body: JSON.stringify([{ id: tagId }]),
        });
        return NextResponse.json(await response.json());
      }

      case 'untagWorkflow': {
        // Get current tags first
        const getResponse = await fetch(`${baseUrl}/api/v1/workflows/${workflowId}`, {
          headers: { 'X-N8N-API-KEY': apiKey },
        });
        const workflow = await getResponse.json();
        
        // Filter out the tag to remove
        const remainingTags = (workflow.tags || [])
          .filter((t: { id: string }) => t.id !== tagId)
          .map((t: { id: string }) => ({ id: t.id }));
        
        // Update with remaining tags
        const response = await fetch(`${baseUrl}/api/v1/workflows/${workflowId}/tags`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(remainingTags),
        });
        return NextResponse.json(await response.json());
      }

      case 'archiveWorkflow': {
        const response = await fetch(`${baseUrl}/api/v1/workflows/${workflowId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ isArchived: true }),
        });
        return NextResponse.json(await response.json());
      }

      case 'unarchiveWorkflow': {
        const response = await fetch(`${baseUrl}/api/v1/workflows/${workflowId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ isArchived: false }),
        });
        return NextResponse.json(await response.json());
      }

      // ============ EXECUTIONS ============
      case 'listExecutions': {
        const queryLimit = limit || 50;
        const response = await fetch(`${baseUrl}/api/v1/executions?limit=${queryLimit}`, {
          headers: { 'X-N8N-API-KEY': apiKey },
        });
        return NextResponse.json(await response.json());
      }

      case 'getExecution': {
        const response = await fetch(`${baseUrl}/api/v1/executions/${executionId}`, {
          headers: { 'X-N8N-API-KEY': apiKey },
        });
        return NextResponse.json(await response.json());
      }

      case 'deleteExecution': {
        const response = await fetch(`${baseUrl}/api/v1/executions/${executionId}`, {
          method: 'DELETE',
          headers: { 'X-N8N-API-KEY': apiKey },
        });
        return NextResponse.json({ success: response.ok });
      }

      case 'retryExecution': {
        const response = await fetch(`${baseUrl}/api/v1/executions/${executionId}/retry`, {
          method: 'POST',
          headers: { 'X-N8N-API-KEY': apiKey },
        });
        return NextResponse.json(await response.json());
      }

      // ============ VARIABLES ============
      case 'listVariables': {
        const response = await fetch(`${baseUrl}/api/v1/variables`, {
          headers: { 'X-N8N-API-KEY': apiKey },
        });
        return NextResponse.json(await response.json());
      }

      case 'createVariable': {
        const response = await fetch(`${baseUrl}/api/v1/variables`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ key: variableName, value: variableValue }),
        });
        return NextResponse.json(await response.json());
      }

      case 'updateVariable': {
        const response = await fetch(`${baseUrl}/api/v1/variables/${variableId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ key: variableName, value: variableValue }),
        });
        return NextResponse.json(await response.json());
      }

      case 'deleteVariable': {
        const response = await fetch(`${baseUrl}/api/v1/variables/${variableId}`, {
          method: 'DELETE',
          headers: { 'X-N8N-API-KEY': apiKey },
        });
        return NextResponse.json({ success: response.ok });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
