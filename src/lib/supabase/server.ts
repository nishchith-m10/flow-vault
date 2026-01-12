import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check .env.local'
  );
}

/**
 * Server-side Supabase client with service role key
 * Bypasses RLS - use with caution and always validate user permissions
 * 
 * @param clerkUserId - Optional Clerk user ID to set in session context for RLS
 */
export async function getSupabaseServerClient(clerkUserId?: string) {
  const client = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
    },
  });

  // Set Clerk user ID in Postgres session for RLS policies
  const userIdToSet = clerkUserId || (await auth()).userId;
  
  if (userIdToSet) {
    await client.rpc('set_config', {
      setting: 'app.clerk_user_id',
      value: userIdToSet,
    });
  }
  // Mark session as service role so RLS policies can detect bypass
  // (This is safe because this client uses the Supabase service role key)
  await client.rpc('set_config', {
    setting: 'app.is_service_role',
    value: 'true',
  });
  return client;
}

/**
 * Get Supabase client with anon key for server components
 * Respects RLS policies - safer for user-scoped operations
 */
export async function getSupabaseAnonClient() {
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  });

  // Set Clerk user ID in session context for RLS
  const { userId } = await auth();
  
  if (userId) {
    await client.rpc('set_config', {
      setting: 'app.clerk_user_id',
      value: userId,
    });
  }

  return client;
}
