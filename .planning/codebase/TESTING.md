# Testing Patterns

**Analysis Date:** 2026-01-12

## Test Framework

**Runner:**
- Vitest 1.x
- Config: `vitest.config.ts` in project root

**Assertion Library:**
- Vitest built-in expect
- Matchers: `toBe`, `toEqual`, `toThrow`, `toMatchObject`, `toBeGreaterThan`

**Run Commands:**
```bash
npm test                              # Run all tests
npm test -- --watch                   # Watch mode
npm test -- path/to/file.test.ts     # Single file
npm run test:coverage                 # Coverage report
```

## Test File Organization

**Location:**
- `__tests__/` directory at project root (separate from source)
- Not co-located with source files

**Naming:**
- `{module}.test.ts` - All test files
- No distinction between unit/integration in filename

**Structure:**
```
__tests__/
├── backup/
│   └── restore.test.ts           # Backup restore tests
├── rateLimit/
│   └── rateLimit.test.ts         # Rate limiting tests
├── re_encrypt/
│   └── re_encrypt.test.ts        # Encryption tests
├── rls/
│   └── rls.test.ts               # Row-Level Security tests
└── security/
    └── dbRateLimiter.test.ts     # Security tests
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mocks at top of file
vi.mock('@/lib/database/client', () => ({
  createUserClient: vi.fn(),
}));

describe('ModuleName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('functionName', () => {
    it('should handle success case', async () => {
      // arrange
      const input = createTestInput();

      // act
      const result = await functionName(input);

      // assert
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it('should throw on invalid input', () => {
      expect(() => functionName(null)).toThrow('Invalid input');
    });
  });
});
```

**Patterns:**
- Use `beforeEach` for per-test setup
- Use `afterEach` to restore mocks: `vi.restoreAllMocks()`
- Use `vi.clearAllMocks()` to reset mock call history
- Explicit arrange/act/assert sections in complex tests

## Mocking

**Framework:**
- Vitest built-in mocking (`vi`)
- Module mocking via `vi.mock()` at top of test file

**Patterns:**
```typescript
import { vi } from 'vitest';

// Mock module
vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: vi.fn(),
}));

// Mock in test
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
};

vi.mocked(getSupabaseServerClient).mockResolvedValue(mockSupabase);
```

**What to Mock:**
- Supabase client and operations
- Clerk authentication
- External API calls (n8n)
- Environment variables
- File system operations

**What NOT to Mock:**
- Internal pure functions
- Simple utilities
- TypeScript types

## Fixtures and Factories

**Test Data:**
```typescript
// Factory functions in test file
function createTestUser(overrides?: Partial<User>): User {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    ...overrides,
  };
}

function createTestBackup(overrides?: Partial<Backup>): Backup {
  return {
    id: 'test-backup-id',
    userId: 'test-user-id',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}
```

**Location:**
- Factory functions: Define in test file near usage
- Shared fixtures: `__tests__/fixtures/` if needed
- Mock data: Inline in test when simple

## Coverage

**Requirements:**
- No enforced coverage target
- Coverage tracked for awareness
- Focus on critical paths (backup, encryption, rate limiting)

**Configuration (vitest.config.ts):**
```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  exclude: ['node_modules/', '__tests__/', '*.config.ts', 'scripts/', '.next/'],
}
```

**View Coverage:**
```bash
npm run test:coverage
open coverage/index.html
```

## Test Types

**Unit Tests:**
- Test single function in isolation
- Mock all external dependencies
- Fast: Each test <100ms
- Examples: `rateLimit.test.ts`, `restore.test.ts`

**Integration Tests:**
- Test multiple modules together
- Mock external boundaries only
- Examples: `rls.test.ts` (tests RLS with real Supabase)

**E2E Tests:**
- Not currently implemented
- Manual testing for full user flows

## Common Patterns

**Async Testing:**
```typescript
it('should handle async operation', async () => {
  const result = await asyncFunction();
  expect(result).toBe('expected');
});
```

**Error Testing:**
```typescript
it('should throw on invalid input', () => {
  expect(() => parse(null)).toThrow('Cannot parse null');
});

// Async error
it('should reject on failure', async () => {
  await expect(asyncCall()).rejects.toThrow('error message');
});
```

**Supabase Mocking:**
```typescript
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
};
```

**RLS Integration Tests (from `__tests__/rls/rls.test.ts`):**
```typescript
/**
 * RLS (Row-Level Security) Tests
 * Prerequisites:
 *   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment
 *   - Migrations 001 and 002 applied to test database
 *
 * Run: npm test -- __tests__/rls
 */
describe('RLS Policies', () => {
  beforeAll(async () => {
    // Setup test users and data
  });

  afterAll(async () => {
    // Cleanup
  });

  it('should allow user to access own data', async () => {
    // Test with user's JWT
  });

  it('should deny access to other users data', async () => {
    // Test cross-user access attempt
  });
});
```

**Snapshot Testing:**
- Not used in this codebase
- Prefer explicit assertions

## Test Setup (vitest.setup.ts)

**Mocked Dependencies:**
- `next/server` - NextRequest, NextResponse
- `next/navigation` - useRouter, usePathname
- `@clerk/nextjs` - useUser, SignedIn, SignedOut
- `@clerk/nextjs/server` - auth, currentUser
- `@supabase/supabase-js` - createClient with chainable query builders

**Environment Setup:**
- Mock environment variables
- Suppress console output in tests
- Configure global test utilities

---

*Testing analysis: 2026-01-12*
*Update when test patterns change*
