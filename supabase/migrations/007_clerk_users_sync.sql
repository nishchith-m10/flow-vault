-- Create users table for Clerk sync
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,                    -- Clerk user ID (e.g., user_xxx)
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read all user records (for team member lists)
CREATE POLICY users_read_all ON public.users
  FOR SELECT USING (true);

-- Only service role can write (via webhook)
CREATE POLICY users_service_write ON public.users
  FOR ALL USING (false);

-- Create helper function for JWT user ID
CREATE OR REPLACE FUNCTION public.clerk_user_id()
RETURNS TEXT AS $$
  SELECT coalesce(
    current_setting('request.jwt.claims', true)::json->>'sub',
    current_setting('app.user_id', true)  -- Fallback for service role
  );
$$ LANGUAGE sql STABLE;

-- Create auth schema function alias
CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.clerk_user_id()
RETURNS TEXT AS $$
  SELECT public.clerk_user_id();
$$ LANGUAGE sql STABLE;

COMMENT ON TABLE public.users IS 'Users synced from Clerk via webhook';
COMMENT ON FUNCTION public.clerk_user_id() IS 'Extract Clerk user ID from JWT claims for RLS';
COMMENT ON FUNCTION auth.clerk_user_id() IS 'Auth schema alias for public.clerk_user_id()';