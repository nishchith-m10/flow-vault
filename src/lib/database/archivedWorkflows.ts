/**
 * Archived workflows database operations
 */

import type { Database } from '../supabase/types';
import { supabase } from './client';

type ArchivedWorkflow = Database['public']['Tables']['flowvault_archived_workflows']['Row'];
type ArchivedWorkflowInsert = Database['public']['Tables']['flowvault_archived_workflows']['Insert'];

/**
 * Archives a workflow
 */
export async function archiveWorkflow(workflow: ArchivedWorkflowInsert) {
  const { data, error } = await supabase
    .from('flowvault_archived_workflows')
    .insert(workflow as never)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to archive workflow: ${error.message}`);
  }

  return data as ArchivedWorkflow;
}

/**
 * Gets all archived workflows for a user
 */
export async function getArchivedWorkflows(clerkUserId: string) {
  const { data, error } = await supabase
    .from('flowvault_archived_workflows')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .order('archived_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch archived workflows: ${error.message}`);
  }

  return data as ArchivedWorkflow[];
}

/**
 * Gets an archived workflow by ID
 */
export async function getArchivedWorkflowById(id: string) {
  const { data, error } = await supabase
    .from('flowvault_archived_workflows')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(`Failed to fetch archived workflow: ${error.message}`);
  }

  return data as ArchivedWorkflow;
}

/**
 * Unarchives a workflow (deletes from archive)
 */
export async function unarchiveWorkflow(id: string) {
  const { error } = await supabase
    .from('flowvault_archived_workflows')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to unarchive workflow: ${error.message}`);
  }
}

/**
 * Checks if a workflow is archived
 */
export async function isWorkflowArchived(
  clerkUserId: string,
  workflowId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('flowvault_archived_workflows')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .eq('workflow_id', workflowId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to check archive status: ${error.message}`);
  }

  return data !== null;
}
