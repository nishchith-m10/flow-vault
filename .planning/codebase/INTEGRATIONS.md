# External Integrations

**Analysis Date:** 2026-01-12

## APIs & External Services

**n8n Workflow Engine:**
- n8n - Workflow automation platform integration
  - Client: Custom HTTP client in `src/lib/backup/n8nClient.ts`
  - Proxy API: `src/app/api/n8n/route.ts`
  - Auth: API key stored encrypted in Supabase, env var `N8N_API_KEY` for testing
  - Operations: Workflow CRUD, tag management, execution management, variable management

**Payment Processing:**
- Stripe (Optional) - Prepared for future monetization
  - SDK/Client: Not actively integrated
  - Auth: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` in `.env.example`
  - Status: Environment variables configured, integration pending

## Data Storage

**Databases:**
- PostgreSQL on Supabase - Primary data store
  - Connection: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  - Client: `@supabase/supabase-js 2.90.1` via `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`
  - Database client: `src/lib/database/client.ts`
  - Migrations: `supabase/migrations/*.sql`
  - RLS: Row-Level Security policies using Clerk user IDs

**File Storage:**
- Supabase Storage - Backup file storage
  - SDK/Client: `@supabase/supabase-js`
  - Adapter: `src/lib/storage/supabaseAdapter.ts`
  - Auth: Service role key for server-side operations

**Caching:**
- None currently - All database queries direct to Supabase

## Authentication & Identity

**Auth Provider:**
- Clerk - User authentication and management
  - SDK: `@clerk/nextjs 6.15.0`
  - Middleware: `src/middleware.ts`
  - Server auth: `src/lib/supabase/server.ts`
  - Components: `src/components/AuthPages.tsx`, `src/components/providers/AuthProvider.tsx`
  - Sign-in/up: `src/app/sign-in/`, `src/app/sign-up/`

**OAuth Integrations:**
- Configured through Clerk dashboard (Google, GitHub, etc.)
- No direct OAuth implementation in codebase

## Monitoring & Observability

**Error Tracking:**
- Sentry (Optional)
  - Init: `src/lib/sentry/init.ts`, `src/lib/sentry.ts`
  - DSN: `SENTRY_DSN` or `NEXT_PUBLIC_SENTRY_DSN` env var
  - Sample rate: 10% production, 100% development
  - Filters sensitive data from error reports

**Analytics:**
- Not currently implemented

**Logs:**
- Console output only (stdout/stderr)
- Vercel logs in production

## CI/CD & Deployment

**Hosting:**
- Vercel - Next.js optimized hosting
  - Deployment: Automatic on git push
  - Environment vars: Configured in Vercel dashboard

**CI Pipeline:**
- Not explicitly configured in repository
- Vercel handles build/deploy automation

## Environment Configuration

**Development:**
- Required env vars: See `.env.example`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`
  - `CLERK_WEBHOOK_SECRET`
  - `ENCRYPTION_KEY` (32-byte hex for AES-256)
  - `NEXT_PUBLIC_APP_URL`
- Secrets location: `.env.local` (gitignored)

**Staging:**
- Separate Supabase project recommended
- Separate Clerk application

**Production:**
- Secrets management: Vercel environment variables
- Database: Supabase production project

## Webhooks & Callbacks

**Incoming:**
- Clerk Webhooks - `/api/webhooks/clerk`
  - Handler: `src/app/api/webhooks/clerk/route.ts`
  - Verification: Svix signature validation
  - Events: `user.created`, `user.updated`, `user.deleted`
  - Syncs Clerk users to Supabase `users` table

**Outgoing:**
- None currently

## Cron Jobs

**Scheduled Tasks:**
- Scheduled backup: `src/app/api/cron/scheduled-backup/route.ts`
- Backup cleanup: `src/app/api/cron/cleanup-backups/route.ts`
- Middleware: `src/lib/middleware/cronSecret.ts`, `src/lib/middleware/cron.ts`
- Auth: `CRON_SECRET` env var for Vercel cron authentication

## Data Encryption

**Client-side Encryption:**
- AES-256-GCM cipher for sensitive data
- PBKDF2 key derivation (100,000 iterations)
- Modules:
  - `src/lib/encryption/encrypt.ts`
  - `src/lib/encryption/decrypt.ts`
  - `src/lib/encryption/keyManagement.ts`
- Used for: n8n API keys, workflow credentials in backups

## Rate Limiting

**Database-backed Rate Limiting:**
- Table: `flowvault_rate_limit_counters`
- RPC: `flowvault_increment_rate_limit`
- Modules:
  - `src/lib/rateLimit/index.ts`
  - `src/lib/rateLimit/dbRateLimiter.ts`
  - `src/lib/middleware/rateLimiter.ts`
- Limits: 100/hr backup trigger, 20/hr restore, 50/hr export

---

*Integration audit: 2026-01-12*
*Update when adding/removing external services*
