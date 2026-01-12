/**
 * Trash database operations
 */

import type { Database } from '../supabase/types';
import { supabase } from './client';

type TrashItem = Database['public']['Tables']['flowvault_trash']['Row'];
type TrashItemInsert = Database['public']['Tables']['flowvault_trash']['Insert'];

/**
 * Moves a workflow to trash
 */
export async function moveToTrash(item: TrashItemInsert) {
  const { data, error } = await supabase
    .from('flowvault_trash')
    .insert(item as never)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to move to trash: ${error.message}`);
  }

  return data as TrashItem;
}

/**
 * Gets all trash items for a user
 */
export async function getTrashItems(clerkUserId: string) {
  const { data, error } = await supabase
    .from('flowvault_trash')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .order('deleted_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch trash items: ${error.message}`);
  }

  return data as TrashItem[];
}

/**
 * Restores a workflow from trash
 */
export async function restoreFromTrash(id: string) {
  const { error } = await supabase
    .from('flowvault_trash')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to restore from trash: ${error.message}`);
  }
}

/**
 * Permanently deletes a trash item
 */
export async function permanentlyDelete(id: string) {
  const { error } = await supabase
    .from('flowvault_trash')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to permanently delete: ${error.message}`);
  }
}

/**
 * Empties trash for a user
 */
export async function emptyTrash(clerkUserId: string) {
  const { error } = await supabase
    .from('flowvault_trash')
    .delete()
    .eq('clerk_user_id', clerkUserId);

  if (error) {
    throw new Error(`Failed to empty trash: ${error.message}`);
  }
}

/**
 * Gets expired trash items (past permanent_delete_at date)
 */
export async function getExpiredTrashItems() {
  const { data, error } = await supabase
    .from('flowvault_trash')
    .select('*')
    .lt('permanent_delete_at', new Date().toISOString());

  if (error) {
    throw new Error(`Failed to fetch expired trash: ${error.message}`);
  }

  return data as TrashItem[];
}
