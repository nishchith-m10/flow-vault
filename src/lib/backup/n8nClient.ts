/**
 * n8n API client for fetching workflows
 */

import { decrypt, type EncryptedData } from '../encryption';
import { getUserSettings } from '../database';
import { N8nConnectionError } from '../errors';
import type { N8nWorkflow } from './types';

export interface N8nClient {
  fetchWorkflows(): Promise<N8nWorkflow[]>;
  fetchWorkflow(workflowId: string): Promise<N8nWorkflow>;
  createWorkflow(workflow: Partial<N8nWorkflow>): Promise<N8nWorkflow>;
  updateWorkflow(workflowId: string, workflow: Partial<N8nWorkflow>): Promise<N8nWorkflow>;
  testConnection(): Promise<boolean>;
}

/**
 * Creates an n8n API client for a user
 */
export async function createN8nClient(clerkUserId: string): Promise<N8nClient> {
  // Get user settings
  const settings = await getUserSettings(clerkUserId);

  if (!settings) {
    throw new N8nConnectionError('User settings not found');
  }

  // Decrypt API key
  const encryptionPassword = process.env.FLOWVAULT_ENCRYPTION_KEY;
  if (!encryptionPassword) {
    throw new N8nConnectionError('Encryption key not configured');
  }

  const encryptedData: EncryptedData = JSON.parse(settings.n8n_api_key_encrypted);
  const decryptionResult = await decrypt(encryptedData, encryptionPassword);

  if (!decryptionResult.success || !decryptionResult.plaintext) {
    throw new N8nConnectionError('Failed to decrypt n8n API key');
  }

  const apiKey = decryptionResult.plaintext;
  const instanceUrl = settings.n8n_instance_url;

  return {
    async fetchWorkflows(): Promise<N8nWorkflow[]> {
      try {
        const response = await fetch(`${instanceUrl}/api/v1/workflows`, {
          method: 'GET',
          headers: {
            'X-N8N-API-KEY': apiKey,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new N8nConnectionError(
            `Failed to fetch workflows: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        return data.data || [];
      } catch (error) {
        if (error instanceof N8nConnectionError) {
          throw error;
        }
        throw new N8nConnectionError(
          `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    },

    async fetchWorkflow(workflowId: string): Promise<N8nWorkflow> {
      try {
        const response = await fetch(`${instanceUrl}/api/v1/workflows/${workflowId}`, {
          method: 'GET',
          headers: {
            'X-N8N-API-KEY': apiKey,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new N8nConnectionError(
            `Failed to fetch workflow ${workflowId}: ${response.status} ${response.statusText}`
          );
        }

        return await response.json();
      } catch (error) {
        if (error instanceof N8nConnectionError) {
          throw error;
        }
        throw new N8nConnectionError(
          `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    },

    async createWorkflow(workflow: Partial<N8nWorkflow>): Promise<N8nWorkflow> {
      try {
        const response = await fetch(`${instanceUrl}/api/v1/workflows`, {
          method: 'POST',
          headers: {
            'X-N8N-API-KEY': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(workflow),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new N8nConnectionError(
            `Failed to create workflow: ${response.status} ${errorText}`
          );
        }

        return await response.json();
      } catch (error) {
        if (error instanceof N8nConnectionError) {
          throw error;
        }
        throw new N8nConnectionError(
          `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    },

    async updateWorkflow(workflowId: string, workflow: Partial<N8nWorkflow>): Promise<N8nWorkflow> {
      try {
        const response = await fetch(`${instanceUrl}/api/v1/workflows/${workflowId}`, {
          method: 'PUT',
          headers: {
            'X-N8N-API-KEY': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(workflow),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new N8nConnectionError(
            `Failed to update workflow ${workflowId}: ${response.status} ${errorText}`
          );
        }

        return await response.json();
      } catch (error) {
        if (error instanceof N8nConnectionError) {
          throw error;
        }
        throw new N8nConnectionError(
          `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    },

    async testConnection(): Promise<boolean> {
      try {
        const response = await fetch(`${instanceUrl}/api/v1/workflows`, {
          method: 'GET',
          headers: {
            'X-N8N-API-KEY': apiKey,
            'Content-Type': 'application/json',
          },
        });

        return response.ok;
      } catch {
        return false;
      }
    },
  };
}
