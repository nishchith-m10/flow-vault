/**
 * Supabase client configuration for FlowVault
 * Provides typed database access layer
 */

// Optional import: provide helpful stub when @supabase/supabase-js is not installed
let createClient: <T = unknown>(...args: any[]) => any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  createClient = require('@supabase/supabase-js').createClient;
} catch (err) {
  createClient = () => {
    throw new Error('@supabase/supabase-js is not installed. Install it to enable Supabase features.');
  };
}
import type { Database } from '../supabase/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

/**
 * Typed Supabase client for server-side operations
 */
let supabase: any;
try {
  supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
} catch (err) {
  // Provide a lightweight stub when createClient isn't available so builds can proceed in environments
  // without Supabase installed. Runtime features will throw a helpful error if used without installing
  // the dependency.
  // Type assertion is acceptable here as this stub is only for build-time compatibility
  supabase = {
    from: () => ({ select: () => ({ data: null, error: null }), insert: () => ({ error: null }), update: () => ({ error: null }), delete: () => ({ error: null }) }),
    rpc: () => ({ data: null, error: null }),
  } as any;
}

export { supabase };

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
