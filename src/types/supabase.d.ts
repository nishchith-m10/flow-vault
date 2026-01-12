declare module '@supabase/supabase-js' {
  export function createClient<T = any>(...args: any[]): any;
  export type SupabaseClient = any;
}
