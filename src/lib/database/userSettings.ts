/**
 * User settings database operations
 */

import type { Database } from '../supabase/types';
import { supabase } from './client';

type UserSettings = Database['public']['Tables']['user_settings']['Row'];
type UserSettingsInsert = Database['public']['Tables']['user_settings']['Insert'];
type UserSettingsUpdate = Database['public']['Tables']['user_settings']['Update'];

/**
 * Gets user settings by Clerk user ID
 */
export async function getUserSettings(clerkUserId: string) {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch user settings: ${error.message}`);
  }

  return data as UserSettings;
}

/**
 * Creates new user settings
 */
export async function createUserSettings(settings: UserSettingsInsert) {
  const { data, error } = await supabase
    .from('user_settings')
    .insert(settings as never)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create user settings: ${error.message}`);
  }

  return data as UserSettings;
}

/**
 * Updates user settings
 */
export async function updateUserSettings(
  clerkUserId: string,
  updates: UserSettingsUpdate
) {
  const { data, error } = await supabase
    .from('user_settings')
    .update(updates as never)
    .eq('clerk_user_id', clerkUserId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update user settings: ${error.message}`);
  }

  return data as UserSettings;
}

/**
 * Deletes user settings
 */
export async function deleteUserSettings(clerkUserId: string) {
  const { error } = await supabase
    .from('user_settings')
    .delete()
    .eq('clerk_user_id', clerkUserId);

  if (error) {
    throw new Error(`Failed to delete user settings: ${error.message}`);
  }
}

/**
 * Checks if user settings exist
 */
export async function userSettingsExist(clerkUserId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to check user settings: ${error.message}`);
  }

  return data !== null;
}
