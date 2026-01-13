import { NextRequest, NextResponse } from 'next/server';
import { N8nProxyRequestSchema, validateData } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body with Zod schema
    const validationResult = validateData(N8nProxyRequestSchema, body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error },
        { status: 400 }
      );
    }

    const { action, n8nUrl, apiKey, workflow, tagName, workflowId, tagId, limit, variableId, variableName, variableValue, executionId } = validationResult.data as any;

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
