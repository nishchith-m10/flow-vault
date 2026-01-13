# Architecture

**Analysis Date:** 2026-01-12

## Pattern Overview

**Overall:** Layered Full-Stack Web Application (Next.js 16 App Router)

**Key Characteristics:**
- Server-side rendering with React Server Components
- API routes colocated with pages
- Feature-based directory organization
- Row-Level Security at database layer
- Client-side encryption for sensitive data

## Layers

**Presentation Layer:**
- Purpose: User interface and client-side interactions
- Contains: React components, pages, client-side state management
- Location: `src/app/`, `src/components/`
- Depends on: API Layer for data fetching
- Used by: End users via browser

**API Layer:**
- Purpose: REST endpoints for data operations
- Contains: Route handlers, request validation, auth middleware
- Location: `src/app/api/`
- Depends on: Business Logic Layer, Authentication
- Used by: Presentation Layer, external clients

**Business Logic Layer:**
- Purpose: Core application logic and orchestration
- Contains: Backup runner, encryption, rate limiting, error handling
- Location: `src/lib/backup/`, `src/lib/encryption/`, `src/lib/rateLimit/`, `src/lib/errors/`
- Depends on: Data Access Layer, External Integration
- Used by: API Layer

**Data Access Layer:**
- Purpose: Database operations with type safety
- Contains: CRUD operations for workflows, backups, settings, audit logs
- Location: `src/lib/database/`, `src/lib/supabase/`
- Depends on: Supabase client
- Used by: Business Logic Layer

**External Integration:**
- Purpose: Communication with n8n workflow engine
- Contains: HTTP client for n8n API
- Location: `src/lib/backup/n8nClient.ts`
- Depends on: User settings (encrypted API key)
- Used by: Business Logic Layer

## Data Flow

**Manual Backup Trigger Flow:**

1. User POSTs to `/api/backups/trigger`
2. Middleware validates Clerk authentication
3. Rate limiter checks quota (`backup:trigger`, 100/hr)
4. Handler calls `runBackupWithRetry(userId, 'manual')` in `src/lib/backup/runner.ts`
5. Backup runner fetches user settings from database
6. Decrypts n8n API key using `src/lib/encryption/decrypt.ts`
7. Creates n8n client, fetches workflows via HTTP
8. For each workflow: deduplicates, validates, encrypts, stores in DB
9. Creates audit log entry in `src/lib/database/auditLog.ts`
10. Returns `BackupJobResult` to client

**State Management:**
- Server-side: Stateless request handling, all state in Supabase
- Client-side: React Context for credentials, theme, modals, toasts
- No Redis or in-memory caching

## Key Abstractions

**Error Hierarchy:**
- Purpose: Consistent error handling across layers
- Location: `src/lib/errors/errors.ts`
- Examples: `FlowVaultError`, `AuthenticationError`, `ValidationError`, `DatabaseError`, `N8nConnectionError`, `RateLimitError`, `EncryptionError`
- Pattern: Base class with code, statusCode, details; specific subclasses

**Middleware Pattern:**
- Purpose: Cross-cutting concerns for API routes
- Location: `src/lib/middleware/rateLimiter.ts`
- Examples: `withRateLimit(action, cost)` higher-order function
- Pattern: Wraps route handlers with quota checks

**Service Interfaces:**
- Purpose: Abstraction over external services
- Location: `src/lib/backup/n8nClient.ts`
- Examples: `N8nClient` with `fetchWorkflows()`, `createWorkflow()`, `updateWorkflow()`
- Pattern: Interface-based, injectable

**Storage Adapter:**
- Purpose: Abstract file storage operations
- Location: `src/lib/storage/supabaseAdapter.ts`
- Examples: Upload, download, delete operations
- Pattern: Adapter pattern for potential provider switching

## Entry Points

**Web Application:**
- Location: `next dev` / `next start` (Next.js built-in)
- Triggers: HTTP requests
- Responsibilities: Serve pages and API routes

**Root Layout:**
- Location: `src/app/layout.tsx`
- Triggers: Every page render
- Responsibilities: Provider hierarchy (Auth, Theme, Toast, Modal, CommandPalette), authentication guard

**Middleware:**
- Location: `src/middleware.ts`
- Triggers: Every request before routing
- Responsibilities: Clerk authentication, route protection

**API Routes:**
- Location: `src/app/api/**/*.ts`
- Triggers: HTTP requests to /api/*
- Responsibilities: Handle specific operations (backups, settings, webhooks, cron)

## Error Handling

**Strategy:** Throw exceptions in service layer, catch at API route boundaries

**Patterns:**
- Services throw `FlowVaultError` subclasses with context
- API routes catch errors, return appropriate HTTP status
- Rate limit exceeded returns 429 with headers
- Authentication failures return 401
- Validation errors return 400 with details
- Unexpected errors return 500, logged to console

## Cross-Cutting Concerns

**Logging:**
- Console.log/error for development
- Sentry for production error tracking (optional)
- Structured error messages with context

**Validation:**
- API routes validate request body structure
- Zod not used - manual validation
- Type safety via TypeScript

**Authentication:**
- Clerk middleware protects all routes by default
- Public routes explicitly configured
- User ID from Clerk used for RLS in Supabase

**Encryption:**
- AES-256-GCM for sensitive data at rest
- PBKDF2 for key derivation
- Server-side only - never client-side

---

*Architecture analysis: 2026-01-12*
*Update when major patterns change*
