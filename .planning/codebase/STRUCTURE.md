# Codebase Structure

**Analysis Date:** 2026-01-12

## Directory Layout

```
n8n-deployment/
├── __tests__/              # Test suites
│   ├── backup/            # Backup/restore tests
│   ├── rateLimit/         # Rate limiting tests
│   ├── re_encrypt/        # Encryption tests
│   ├── rls/               # Row-Level Security tests
│   └── security/          # Security tests
├── docs/                   # Documentation
├── scripts/                # Utility scripts
├── src/                    # Source code
│   ├── app/               # Next.js App Router
│   ├── components/        # React components
│   ├── lib/               # Business logic
│   └── types/             # TypeScript definitions
├── supabase/               # Database migrations
│   └── migrations/        # SQL migration files
├── types/                  # Global type definitions
├── package.json            # Project manifest
├── tsconfig.json           # TypeScript config
└── vitest.config.ts        # Test configuration
```

## Directory Purposes

**src/app/**
- Purpose: Next.js App Router pages and API routes
- Contains: Page components, API route handlers, layouts
- Key files:
  - `layout.tsx` - Root layout with providers
  - `page.tsx` - Dashboard/home page
  - `globals.css` - Global styles
- Subdirectories:
  - `api/` - REST API endpoints
  - `workflows/` - Workflow management pages
  - `backups/` - Backup detail pages
  - `settings/` - Settings page
  - `sign-in/`, `sign-up/` - Auth pages

**src/app/api/**
- Purpose: REST API endpoints
- Contains: Route handlers (`route.ts` files)
- Key files:
  - `backups/trigger/route.ts` - Manual backup trigger
  - `backups/[id]/restore/route.ts` - Restore backup
  - `backups/[id]/export/route.ts` - Export backup
  - `settings/route.ts` - User settings CRUD
  - `n8n/route.ts` - n8n proxy API (228 lines)
  - `webhooks/clerk/route.ts` - Clerk webhook handler
  - `cron/scheduled-backup/route.ts` - Scheduled backup
  - `cron/cleanup-backups/route.ts` - Backup cleanup

**src/components/**
- Purpose: Reusable React components
- Contains: UI components, providers, layouts
- Key files:
  - `DashboardLayout.tsx` - Main layout with navigation (401 lines)
  - `Modal.tsx` - Modal provider and component
  - `Toast.tsx` - Toast notifications
  - `ThemeProvider.tsx` - Dark/light theme
  - `CommandPalette.tsx` - Command palette
  - `AuthPages.tsx` - Login/signup wrapper
- Subdirectories:
  - `ui/` - Base UI components (Button, Card, Input, etc.)
  - `providers/` - Context providers (Auth)

**src/lib/**
- Purpose: Business logic and utilities
- Contains: Service modules, database operations, middleware
- Subdirectories:
  - `backup/` - Backup orchestration (`runner.ts`, `restore.ts`, `n8nClient.ts`, `deduplicator.ts`, `retention.ts`)
  - `database/` - DB operations (`userSettings.ts`, `workflowBackups.ts`, `archivedWorkflows.ts`, `trash.ts`, `auditLog.ts`)
  - `encryption/` - Crypto operations (`encrypt.ts`, `decrypt.ts`, `keyManagement.ts`)
  - `errors/` - Custom error classes (`errors.ts`, `handlers.ts`)
  - `middleware/` - Express-like middleware (`rateLimiter.ts`, `cronSecret.ts`, `cron.ts`)
  - `rateLimit/` - Rate limiting (`index.ts`, `dbRateLimiter.ts`)
  - `storage/` - Storage adapter (`supabaseAdapter.ts`)
  - `supabase/` - Supabase clients (`client.ts`, `server.ts`, `types.ts`)
  - `sentry/` - Error reporting (`init.ts`)

**src/types/**
- Purpose: TypeScript type definitions
- Contains: Global type declarations
- Key files:
  - `supabase.d.ts` - Supabase schema types
  - `vitest.d.ts`, `vitest-core.d.ts` - Test type definitions

**__tests__/**
- Purpose: Test suites (separate from source)
- Contains: Unit, integration, and functional tests
- Key files:
  - `backup/restore.test.ts` - Backup restore tests
  - `rateLimit/rateLimit.test.ts` - Rate limit tests
  - `rls/rls.test.ts` - RLS integration tests
  - `security/dbRateLimiter.test.ts` - Security tests
  - `re_encrypt/re_encrypt.test.ts` - Encryption tests

**scripts/**
- Purpose: Utility scripts for development/maintenance
- Contains: Shell scripts, TypeScript utilities
- Key files:
  - `re_encrypt_backups.ts` - Data re-encryption utility
  - `run_migration.js` - Database migration runner
  - `commit_*.ts` - Git automation

**supabase/migrations/**
- Purpose: Database schema evolution
- Contains: SQL migration files
- Naming: `001_*.sql`, `002_*.sql`, etc.

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx` - Root layout with provider hierarchy
- `src/middleware.ts` - Clerk authentication middleware
- `next.config.ts` - Next.js configuration

**Configuration:**
- `tsconfig.json` - TypeScript compiler options
- `.eslintrc.json` - ESLint rules
- `vitest.config.ts` - Vitest test configuration
- `.env.example` - Environment variable template

**Core Logic:**
- `src/lib/backup/runner.ts` - Backup orchestration
- `src/lib/backup/restore.ts` - Restore operations
- `src/lib/encryption/encrypt.ts` - Data encryption
- `src/lib/encryption/decrypt.ts` - Data decryption
- `src/lib/rateLimit/index.ts` - Rate limiting

**Testing:**
- `__tests__/` - All test files
- `vitest.setup.ts` - Test environment setup

**Documentation:**
- `docs/` - Project documentation
- `README.md` - User-facing documentation

## Naming Conventions

**Files:**
- `kebab-case.ts` - Utility modules (`rate-limit.ts`, but actually `rateLimiter.ts`)
- `camelCase.ts` - Most library files (`userSettings.ts`, `workflowBackups.ts`)
- `PascalCase.tsx` - React components (`DashboardLayout.tsx`, `UserProfile.tsx`)
- `route.ts` - Next.js API route handlers
- `page.tsx` - Next.js page components
- `*.test.ts` - Test files

**Directories:**
- `kebab-case` or `camelCase` - Feature directories
- Plural for collections: `migrations/`, `components/`, `providers/`

**Special Patterns:**
- `[id]` - Dynamic route segments
- `index.ts` - Barrel exports for modules
- `*.d.ts` - Type declaration files

## Where to Add New Code

**New Feature:**
- Primary code: `src/lib/{feature}/`
- API route: `src/app/api/{feature}/route.ts`
- UI page: `src/app/{feature}/page.tsx`
- Tests: `__tests__/{feature}/`

**New Component:**
- Implementation: `src/components/{ComponentName}.tsx`
- UI primitives: `src/components/ui/{Component}.tsx`
- Types: Inline or `src/types/`
- Tests: `__tests__/components/{component}.test.tsx`

**New API Route:**
- Definition: `src/app/api/{resource}/route.ts`
- Dynamic: `src/app/api/{resource}/[id]/route.ts`
- Handler logic: `src/lib/{resource}/`
- Tests: `__tests__/api/{resource}.test.ts`

**Utilities:**
- Shared helpers: `src/lib/{domain}/`
- Type definitions: `src/types/` or inline
- Database operations: `src/lib/database/`

## Special Directories

**node_modules/**
- Purpose: npm dependencies
- Source: Installed by `npm install`
- Committed: No (gitignored)

**.next/**
- Purpose: Next.js build output
- Source: Generated by `npm run build`
- Committed: No (gitignored)

**supabase/migrations/**
- Purpose: Database schema migrations
- Source: Manually created SQL files
- Committed: Yes (version controlled)

---

*Structure analysis: 2026-01-12*
*Update when directory structure changes*
