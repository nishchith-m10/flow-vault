# Coding Conventions

**Analysis Date:** 2026-01-12

## Naming Patterns

**Files:**
- `camelCase.ts` - Library/utility modules (`userSettings.ts`, `workflowBackups.ts`, `rateLimiter.ts`)
- `PascalCase.tsx` - React components (`DashboardLayout.tsx`, `UserProfile.tsx`, `AuthPages.tsx`)
- `route.ts` - Next.js API route handlers
- `page.tsx` - Next.js page components
- `*.test.ts` - Test files alongside or in `__tests__/`
- `index.ts` - Barrel exports for modules

**Functions:**
- `camelCase` for all functions (`encrypt()`, `getUserSettings()`, `runBackupWithRetry()`)
- `handle*` for event handlers (`handleSave`, `handleClick`)
- `create*`, `get*`, `update*`, `delete*` for CRUD operations
- No special prefix for async functions

**Variables:**
- `camelCase` for variables (`instanceUrl`, `apiKey`, `backupEnabled`)
- `UPPER_SNAKE_CASE` for constants (`ALGORITHM`, `IV_LENGTH`, `PBKDF2_ITERATIONS`)
- No underscore prefix for private members

**Types:**
- `PascalCase` for interfaces and types (`UserSettings`, `BackupJob`, `RateLimitResult`)
- No `I` prefix for interfaces
- `*Props` suffix for component props (`ButtonProps`, `CardProps`)
- `*Type` suffix for context types (`ToastContextType`, `CredentialsContextType`)

## Code Style

**Formatting:**
- 2-space indentation
- Single quotes for strings (`'use client'`, `'vitest'`)
- Semicolons required at end of statements
- No explicit Prettier config (using ESLint defaults)

**Linting:**
- ESLint with `.eslintrc.json`
- Extends `next/core-web-vitals`
- Custom rules: React hooks warnings, unescaped entities off
- Run: `npm run lint`

## Import Organization

**Order:**
1. React and Next.js imports (`react`, `next/server`, `next/navigation`)
2. External packages (`@clerk/nextjs`, `@supabase/supabase-js`, `lucide-react`)
3. Internal modules with path aliases (`@/lib/*`, `@/components/*`)
4. Relative imports (`./utils`, `../types`)
5. Type imports (`import type { ... }`)

**Grouping:**
- Logical grouping by source
- No enforced blank lines between groups
- Destructured imports preferred

**Path Aliases:**
- `@/` maps to `src/`
- Used throughout: `@/lib/database/client`, `@/components/ui/Button`

## Error Handling

**Patterns:**
- Throw `FlowVaultError` subclasses in service layer
- Catch at API route boundaries
- Return appropriate HTTP status codes
- Include error details in response body

**Error Types (from `src/lib/errors/errors.ts`):**
- `FlowVaultError` - Base class with code, statusCode, details
- `AuthenticationError` - 401 responses
- `ValidationError` - 400 responses
- `DatabaseError` - 500 responses
- `N8nConnectionError` - n8n API failures
- `RateLimitError` - 429 responses
- `EncryptionError` - Crypto failures

**Async:**
- `try/catch` for async operations
- No `.catch()` chains
- Errors logged before re-throwing

## Logging

**Framework:**
- `console.log` - General output
- `console.error` - Error logging
- `console.warn` - Warnings
- Sentry for production error tracking (optional)

**Patterns:**
- Log at service boundaries
- Include context: `console.error('Rate limit check failed:', error)`
- No console.log in production code (93 console.error/warn across codebase)

**Where:**
- Error paths in API routes
- Service layer failures
- Encryption/decryption errors

## Comments

**When to Comment:**
- Explain why, not what
- Document business logic and algorithms
- Complex encryption/crypto operations
- API route purpose and parameters

**JSDoc/TSDoc:**
- Required for public library functions
- Include `@param`, `@returns`, `@example`
- Optional for internal functions

**Example (from `src/lib/crypto.ts`):**
```typescript
/**
 * Encrypt plaintext using AES-256-GCM
 *
 * @param plaintext - The data to encrypt (e.g., API key, URL)
 * @param encryptionKey - 32-byte hex string from environment
 * @returns Encrypted string in format: iv:authTag:encrypted
 *
 * @example
 * const encrypted = encrypt('my-secret', process.env.ENCRYPTION_KEY!);
 */
```

**TODO Comments:**
- Format: `// TODO: description`
- No username prefix (use git blame)
- Link to issue if available

## Function Design

**Size:**
- Keep under 50 lines preferred
- Some large functions exist (backup runner ~100 lines)
- Extract helpers for complex logic

**Parameters:**
- Max 3 parameters preferred
- Use options object for 4+ parameters
- Destructure in parameter list

**Return Values:**
- Explicit return statements
- Return early for guard clauses
- Use result objects for operations that can fail

## Module Design

**Exports:**
- Named exports preferred
- Default exports for React components
- Barrel files (`index.ts`) for public API

**Example (`src/components/ui/index.ts`):**
```typescript
export { default as Button } from './Button';
export type { ButtonProps } from './Button';

export { Card, CardHeader, CardBody } from './Card';
export type { CardProps } from './Card';
```

**Barrel Files:**
- `index.ts` re-exports public API
- Internal helpers stay private
- Avoid circular dependencies

---

*Convention analysis: 2026-01-12*
*Update when patterns change*
