/**
 * Supabase client configuration for FlowVault
 * Provides typed database access layer
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../supabase/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

/**
 * Typed Supabase client for server-side operations
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

/**
 * Creates a Supabase client for a specific user (with RLS)
 * @param userId - Clerk user ID
 * @returns Typed Supabase client
 */
export function createUserClient(userId: string) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        'x-user-id': userId,
      },
    },
  });
}
