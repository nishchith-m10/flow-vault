// Archive management utilities using n8n's native isArchived field

interface Workflow {
  id: string;
  name: string;
  active: boolean;
  isArchived: boolean;
  updatedAt: string;
  tags?: { id: string; name: string }[];
}

/**
 * Check if a workflow is archived using n8n's native isArchived field
 */
export function isWorkflowArchived(workflow: Workflow): boolean {
  return workflow.isArchived === true;
}

/**
 * Archive a workflow by setting isArchived to true in n8n
 */
export async function archiveWorkflow(n8nUrl: string, apiKey: string, workflowId: string): Promise<void> {
  await fetch('/api/n8n', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'archiveWorkflow', n8nUrl, apiKey, workflowId }),
  });
}

/**
 * Unarchive a workflow by setting isArchived to false in n8n
 */
export async function unarchiveWorkflow(n8nUrl: string, apiKey: string, workflowId: string): Promise<void> {
  await fetch('/api/n8n', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'unarchiveWorkflow', n8nUrl, apiKey, workflowId }),
  });
}
