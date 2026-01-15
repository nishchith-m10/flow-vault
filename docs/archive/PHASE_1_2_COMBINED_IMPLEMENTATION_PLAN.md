# FlowVault Security Hardening: Phase 1 + 2 Implementation Plan
**Date**: January 13, 2026  
**Phases**: JSON Parse Safety + Zod Foundation (Combined)  
**Estimated Duration**: 4-5 hours  
**Complexity**: Medium  
**Methodology**: OPUS 5-Pillar Implementation Cycle  

---

## PILLAR 1: PLANNING

### Objective

Create safe JSON parsing utilities and establish Zod validation foundation to eliminate **5 critical unhandled JSON.parse vulnerabilities** and prepare for schema-based validation across all API routes.

**Primary Goals:**
1. Wrap all unsafe `JSON.parse` calls with try-catch error handling
2. Create reusable utility functions for safe JSON operations
3. Install and configure Zod validation library
4. Establish base validation schemas for critical data types
5. Document patterns for future API route validation
6. Achieve 100% test coverage for new utilities

---

### Scope

#### Phase 1 - JSON Parse Safety (2-2.5 hours)
**Problem Statement:**  
Currently, 5 critical locations in the codebase use unprotected `JSON.parse` calls on encrypted data from the database. If the encrypted data is corrupted, malformed, or tampered with, these calls will throw uncaught exceptions, causing 500 errors and exposing stack traces.

**Affected Files:**
1. **`src/app/api/settings/route.ts`** (Line 244)  
   - Parses `settings.n8n_api_key_encrypted` without validation
   - Impact: GET /api/settings crashes if encrypted data is corrupted
   
2. **`src/app/api/backups/[id]/restore/route.ts`** (Line 162)  
   - Parses `settings.n8n_api_key_encrypted` without validation
   - Impact: POST /api/backups/:id/restore fails during API key decryption
   
3. **`src/lib/backup/n8nClient.ts`** (Line 35)  
   - Parses encrypted API key on every n8n client initialization
   - Impact: All n8n operations fail silently or throw generic errors
   
4. **`src/lib/encryption/decrypt.ts`** (Line 127)  
   - Parses decrypted plaintext data (secondary validation)
   - Impact: Data corruption post-decryption causes cascading failures
   
5. **`src/lib/backup/restore.ts`** (Line 104)  
   - Parses decrypted workflow JSON
   - Impact: Backup restore fails if workflow data is malformed

**Solution Approach:**
- Create `src/lib/utils/json.ts` with type-safe parsing utilities
- Implement `safeJSONParse<T>` with default value fallback
- Implement `safeJSONStringify` with circular reference handling
- Replace all unsafe `JSON.parse` calls with safe wrappers
- Return structured error responses instead of crashing

#### Phase 2 - Zod Foundation (1.5-2 hours)
**Problem Statement:**  
No runtime validation exists for API inputs or database records. Type assertions (e.g., `as EncryptedData`) trust data structure without verification, leading to potential runtime errors and security vulnerabilities.

**Solution Approach:**
- Install `zod` package via npm
- Create `src/lib/validation/schemas.ts` with base schemas:
  - `EncryptedDataSchema` for validating encrypted payloads
  - `BackupMetadataSchema` for validating backup records
  - `UserSettingsSchema` for validating settings responses
- Create `src/lib/validation/index.ts` for clean exports
- Establish error response patterns compatible with existing API contracts
- Document validation patterns for future use in API routes (Phase 3)

---

### Files to Create

#### 1. `src/lib/utils/json.ts` - Safe JSON Wrapper Utilities
**Purpose:** Provide try-catch wrappers for JSON operations with type safety  
**Exports:**
- `safeJSONParse<T>(input: string, fallback?: T): { success: boolean; data?: T; error?: string }`
- `safeJSONStringify(data: unknown, fallback?: string): { success: boolean; output?: string; error?: string }`

**Design Rationale:**
- Returns typed result objects (similar to `DecryptionResult` pattern in `decrypt.ts`)
- Prevents uncaught exceptions from bubbling to API layer
- Allows graceful degradation with fallback values
- Maintains type safety through generics

#### 2. `src/lib/validation/schemas.ts` - Zod Base Schemas
**Purpose:** Define runtime validation schemas for critical data structures  
**Exports:**
- `EncryptedDataSchema` - Validates `{ ciphertext, iv, salt, tag, version }`
- `BackupMetadataSchema` - Validates backup record structure
- `UserSettingsSchema` - Validates settings API responses

**Design Rationale:**
- Mirrors existing TypeScript interfaces but adds runtime checks
- Uses Zod's `.strict()` to reject unknown properties
- Provides human-readable error messages for API responses

#### 3. `src/lib/validation/index.ts` - Validation Exports
**Purpose:** Clean barrel export for validation utilities  
**Exports:**
- Re-exports all schemas from `schemas.ts`
- Re-exports Zod types (`z` namespace)

#### 4. `__tests__/utils/json.test.ts` - JSON Utility Tests
**Purpose:** Comprehensive test coverage for safe JSON operations  
**Test Cases:**
1. `safeJSONParse` with valid JSON object
2. `safeJSONParse` with valid JSON array
3. `safeJSONParse` with malformed JSON (missing quotes, trailing commas)
4. `safeJSONParse` with fallback value
5. `safeJSONStringify` with valid object
6. `safeJSONStringify` with circular references
7. `safeJSONStringify` with BigInt values (should fail gracefully)
8. Type inference validation (TypeScript compile-time test)

**Coverage Target:** 100%

#### 5. `__tests__/validation/schemas.test.ts` - Zod Schema Tests
**Purpose:** Validate schema definitions match expected structures  
**Test Cases:**
1. `EncryptedDataSchema.parse()` with valid EncryptedData
2. `EncryptedDataSchema.parse()` with missing required fields
3. `EncryptedDataSchema.parse()` with invalid types (number instead of string)
4. `EncryptedDataSchema.parse()` with extra unknown fields (should reject)
5. `BackupMetadataSchema.parse()` with valid metadata
6. `BackupMetadataSchema.parse()` with invalid metadata
7. Error message format validation

**Coverage Target:** 90%+

---

### Files to Modify

#### 1. `src/app/api/settings/route.ts` (Line 244)
**Current Code:**
```typescript
const encryptedData: EncryptedData = JSON.parse(settings.n8n_api_key_encrypted);
```

**Planned Change:**
```typescript
import { safeJSONParse } from '@/lib/utils/json';

const parseResult = safeJSONParse<EncryptedData>(settings.n8n_api_key_encrypted);
if (!parseResult.success || !parseResult.data) {
  return NextResponse.json(
    { error: parseResult.error || 'Invalid encrypted API key format' },
    { status: 500 }
  );
}
const encryptedData = parseResult.data;
```

**Risk:** Response format change could break frontend  
**Mitigation:** Keep error response structure consistent with existing pattern

#### 2. `src/app/api/backups/[id]/restore/route.ts` (Line 162)
**Current Code:**
```typescript
const encryptedApiKey = JSON.parse(settings.n8n_api_key_encrypted) as EncryptedData;
```

**Planned Change:**
```typescript
import { safeJSONParse } from '@/lib/utils/json';

const parseResult = safeJSONParse<EncryptedData>(settings.n8n_api_key_encrypted);
if (!parseResult.success || !parseResult.data) {
  return {
    success: false,
    error: parseResult.error || 'Invalid encrypted API key format',
  };
}
const encryptedApiKey = parseResult.data;
```

**Risk:** Restore operation already has complex error handling  
**Mitigation:** Insert validation before existing decryption flow

#### 3. `src/lib/backup/n8nClient.ts` (Line 35)
**Current Code:**
```typescript
const encryptedData: EncryptedData = JSON.parse(settings.n8n_api_key_encrypted);
```

**Planned Change:**
```typescript
import { safeJSONParse } from '@/lib/utils/json';

const parseResult = safeJSONParse<EncryptedData>(settings.n8n_api_key_encrypted);
if (!parseResult.success || !parseResult.data) {
  throw new N8nConnectionError(
    `Invalid encrypted API key format: ${parseResult.error || 'JSON parse failed'}`
  );
}
const encryptedData = parseResult.data;
```

**Risk:** This is a critical path for all n8n operations  
**Mitigation:** Throw descriptive error (aligns with existing `N8nConnectionError` pattern)

#### 4. `src/lib/encryption/decrypt.ts` (Line 127)
**Current Code:**
```typescript
const data = JSON.parse(result.plaintext) as T;
```

**Planned Change:**
```typescript
import { safeJSONParse } from '@/lib/utils/json';

const parseResult = safeJSONParse<T>(result.plaintext);
if (!parseResult.success || !parseResult.data) {
  return {
    success: false,
    error: `Failed to parse decrypted data: ${parseResult.error}`,
  };
}
const data = parseResult.data;
```

**Risk:** Generic function may be used in many places  
**Mitigation:** Return structured error (maintains `DecryptionResult` contract)

#### 5. `src/lib/backup/restore.ts` (Line 104)
**Current Code:**
```typescript
workflow = JSON.parse(decryptionResult.plaintext);
```

**Planned Change:**
```typescript
import { safeJSONParse } from '@/lib/utils/json';

const parseResult = safeJSONParse(decryptionResult.plaintext);
if (!parseResult.success || !parseResult.data) {
  return {
    success: false,
    error: `Corrupted workflow data: ${parseResult.error}`,
  };
}
workflow = parseResult.data;
```

**Risk:** Workflow restore is a critical user-facing feature  
**Mitigation:** Provide clear error message about data corruption

#### 6. `package.json` - Add Zod Dependency
**Planned Change:**
```json
{
  "dependencies": {
    "zod": "^3.24.1"
  }
}
```

**Risk:** Version incompatibility with TypeScript 5  
**Mitigation:** Zod 3.24.x is compatible with TS 5.x (verified)

---

### Dependencies

#### External Dependencies
1. **Zod Package** (`zod@^3.24.1`)
   - Purpose: Runtime schema validation
   - Installation: `npm install zod`
   - Compatibility: TypeScript 5.x ✅, Node.js 18+ ✅
   - Size Impact: ~16KB gzipped (acceptable for validation capabilities)

#### Internal Dependencies
1. **`src/lib/encryption/types.ts`**
   - Required for: `EncryptedData` interface definition
   - Used by: `schemas.ts` to create matching Zod schema
   - Status: ✅ Exists

2. **`src/lib/encryption/decrypt.ts`**
   - Required for: `DecryptionResult` pattern reference
   - Used by: Aligning error response structure
   - Status: ✅ Exists

3. **TypeScript Type Definitions**
   - Required for: Generic type inference in `safeJSONParse<T>`
   - Used by: Compile-time type safety validation
   - Status: ✅ Available (TypeScript 5.x in project)

#### Dependency Graph
```
src/lib/utils/json.ts (no dependencies)
    ↓ imported by
src/app/api/settings/route.ts
src/app/api/backups/[id]/restore/route.ts
src/lib/backup/n8nClient.ts
src/lib/encryption/decrypt.ts
src/lib/backup/restore.ts

src/lib/encryption/types.ts (existing)
    ↓ used by
src/lib/validation/schemas.ts (new - imports EncryptedData interface)
    ↓ exported from
src/lib/validation/index.ts (new)
    ↓ (future) imported by
API routes (Phase 3 - not in this plan)
```

#### Blockers
**None Identified** ✅

All required types exist, no breaking changes to existing APIs, Zod installation is straightforward.

---

### Code Patterns to Follow

#### 1. Error Result Pattern (from `src/lib/encryption/decrypt.ts`)
**Existing Pattern:**
```typescript
export interface DecryptionResult {
  success: boolean;
  plaintext?: string;
  error?: string;
}
```

**Apply To:**
- `safeJSONParse` return type
- `safeJSONStringify` return type
- Validation error responses

**Rationale:** Consistent across codebase, avoids throwing exceptions in expected error paths

#### 2. Type Safety Pattern (from `src/lib/encryption/types.ts`)
**Existing Pattern:**
```typescript
export interface EncryptedData {
  ciphertext: string; // Base64 encoded
  iv: string;         // Base64 encoded initialization vector
  salt: string;       // Base64 encoded salt
  tag: string;        // Base64 encoded authentication tag
  version: number;    // Encryption format version
}
```

**Apply To:**
- Zod schema definitions (must match interface exactly)
- Generic type constraints in `safeJSONParse<T>`

**Rationale:** Runtime validation should mirror compile-time types

#### 3. Error Response Pattern (from API routes)
**Existing Pattern:**
```typescript
return NextResponse.json(
  { error: 'Descriptive error message' },
  { status: 500 }
);
```

**Apply To:**
- JSON parse failures in API routes
- Validation errors in future API route integration

**Rationale:** Frontend expects `{ error: string }` response structure

#### 4. Import Path Aliases (from `tsconfig.json`)
**Existing Pattern:**
```typescript
import { decrypt } from '@/lib/encryption/decrypt';
```

**Apply To:**
- All new imports of `safeJSONParse`, `safeJSONStringify`
- All new imports from `@/lib/validation`

**Rationale:** Consistent with project configuration, avoids relative path hell

#### 5. JSDoc Comments (from existing utilities)
**Existing Pattern:**
```typescript
/**
 * Decrypts data encrypted with AES-256-GCM
 * @param encryptedData - Encrypted data with IV, salt, and tag
 * @param password - Decryption password
 * @returns Decrypted plaintext
 */
```

**Apply To:**
- All exported functions in `json.ts`
- All exported schemas in `schemas.ts`

**Rationale:** IDE autocomplete, documentation generation

---

### Tests Required

#### Unit Tests (Priority 1 - Must Have)

**File: `__tests__/utils/json.test.ts`**

| Test Case | Description | Expected Result | Edge Cases |
|-----------|-------------|-----------------|------------|
| `safeJSONParse` - valid JSON object | `'{"key":"value"}'` | `{ success: true, data: { key: 'value' } }` | Empty object `{}` |
| `safeJSONParse` - valid JSON array | `'[1,2,3]'` | `{ success: true, data: [1,2,3] }` | Empty array `[]` |
| `safeJSONParse` - malformed JSON | `'{key:value}'` (missing quotes) | `{ success: false, error: '...' }` | Trailing comma, incomplete brackets |
| `safeJSONParse` - null input | `null` or `undefined` | `{ success: false, error: '...' }` | Empty string `''` |
| `safeJSONParse` - with fallback | Malformed JSON + fallback `{}` | `{ success: false, data: {}, error: '...' }` | Verify fallback is returned |
| `safeJSONStringify` - valid object | `{ a: 1, b: 'test' }` | `{ success: true, output: '{"a":1,"b":"test"}' }` | Nested objects, arrays |
| `safeJSONStringify` - circular reference | `const obj = { a: obj }` | `{ success: false, error: '...' }` | Verify doesn't crash |
| `safeJSONStringify` - BigInt value | `{ value: 123n }` | `{ success: false, error: '...' }` | BigInt not JSON-serializable |
| Type inference | `safeJSONParse<{ id: number }>('...')` | TypeScript compiles, data is typed | Generic type safety |

**Coverage Target:** 100% (critical security utility)

**File: `__tests__/validation/schemas.test.ts`**

| Test Case | Description | Expected Result | Edge Cases |
|-----------|-------------|-----------------|------------|
| `EncryptedDataSchema` - valid data | All required fields present | Parses successfully | Version number edge values |
| `EncryptedDataSchema` - missing field | `{ ciphertext, iv }` (no salt) | Throws ZodError | Missing each field individually |
| `EncryptedDataSchema` - invalid type | `{ ciphertext: 123 }` (number) | Throws ZodError | Type mismatch for each field |
| `EncryptedDataSchema` - extra fields | `{ ...valid, foo: 'bar' }` | Throws ZodError (strict mode) | Unknown properties rejected |
| `BackupMetadataSchema` - valid data | Valid backup metadata object | Parses successfully | All optional fields tested |
| `BackupMetadataSchema` - invalid data | Wrong types/missing required | Throws ZodError | Boundary cases |
| Error message format | Parse error for missing field | Contains field name + "required" | User-friendly messages |

**Coverage Target:** 90%+ (validation layer)

#### Integration Tests (Priority 2 - Should Have)

**File: `__tests__/integration/json-parse-safety.test.ts`** (optional but recommended)

| Test Case | Description | Validation |
|-----------|-------------|------------|
| Settings API with corrupted DB data | Insert malformed `n8n_api_key_encrypted`, call GET /api/settings | Returns 500 with `{ error: '...' }`, not crash |
| Backup restore with corrupted workflow | Insert backup with malformed encrypted workflow, call POST /api/backups/:id/restore | Returns `{ success: false, error: '...' }` |
| n8nClient initialization with bad data | Mock corrupted settings in DB, attempt n8n operation | Throws `N8nConnectionError` with descriptive message |

**Note:** These require test database setup (Supabase local dev or mocked queries). If time-constrained, defer to Phase 3.

#### Manual Verification Tests (Priority 3 - Nice to Have)

**Scenario 1: Corrupt Encrypted API Key**
1. Log into app, navigate to Settings
2. Using Supabase dashboard, manually edit `user_settings.n8n_api_key_encrypted` to invalid JSON (e.g., remove a `"`)
3. Refresh Settings page
4. **Expected:** See error message "Invalid encrypted API key format", not 500 error page
5. **Verify:** Browser console shows no unhandled exceptions

**Scenario 2: Corrupt Backup Data**
1. Create a backup via UI
2. Using Supabase dashboard, edit backup's `workflow_data` to malformed JSON
3. Attempt to restore the backup
4. **Expected:** See error "Corrupted workflow data: ..." in restore response
5. **Verify:** Database rollback occurred (no partial restore)

---

### Validation Criteria

#### Phase 1 Success Checklist ✅
- [ ] All 5 critical `JSON.parse` calls wrapped with `safeJSONParse`
- [ ] `src/lib/utils/json.ts` created with exports
- [ ] No TypeScript compilation errors (`npm run build`)
- [ ] Unit tests pass: `npm test __tests__/utils/json.test.ts`
- [ ] Test coverage ≥ 100% for `json.ts`
- [ ] Manual test: Corrupted encrypted data → returns helpful error (not 500 crash)
- [ ] Git commit with descriptive message

#### Phase 2 Success Checklist ✅
- [ ] Zod installed: `npm list zod` shows version
- [ ] `src/lib/validation/schemas.ts` created with 3+ base schemas
- [ ] `src/lib/validation/index.ts` created with exports
- [ ] Schemas match existing TypeScript interfaces exactly
- [ ] Unit tests pass: `npm test __tests__/validation/schemas.test.ts`
- [ ] Test coverage ≥ 90% for `schemas.ts`
- [ ] Documentation added to `schemas.ts` with usage examples
- [ ] Pattern documented in comment for future API route integration
- [ ] Git commit with descriptive message

#### Combined Phase Validation ✅
- [ ] All unit tests pass: `npm test`
- [ ] Production build succeeds: `npm run build`
- [ ] No ESLint errors: `npm run lint`
- [ ] No new TypeScript errors introduced
- [ ] Bundle size increase < 20KB (Zod gzipped)
- [ ] Existing features still work (smoke test signup/login/workflows)

---

### Risks & Mitigations

#### Risk 1: Breaking Changes to Error Responses
**Impact:** High  
**Probability:** Medium  
**Affected Components:** Frontend error handling in Settings, Backup Restore

**Problem:**  
Changing from direct `JSON.parse` exceptions to structured error responses might break frontend code that expects specific error formats or HTTP status codes.

**Mitigation Strategy:**
1. Keep error response structure consistent: `{ error: string }`
2. Maintain HTTP status codes (500 for server errors)
3. Add descriptive error messages (better UX than stack traces)
4. Test error flows in browser DevTools before committing

**Validation:**
- Review frontend error handlers in `src/app/settings/page.tsx` (if exists)
- Test Settings page with corrupted data manually
- Check browser console for unhandled promise rejections

**Rollback Plan:**  
If frontend breaks, revert `JSON.parse` wrappers but keep `safeJSONParse` utility for future gradual adoption.

---

#### Risk 2: Performance Impact of Validation
**Impact:** Low  
**Probability:** Low  
**Affected Components:** API routes with Zod schema validation (Phase 3, not this phase)

**Problem:**  
Zod validation adds runtime overhead (~0.1-1ms per validation depending on schema complexity). In high-throughput APIs, this could accumulate.

**Mitigation Strategy:**
1. Only validate at API boundaries (not internal functions)
2. Cache parsed schemas (Zod does this automatically)
3. Use `.strict()` selectively (only where unknown fields are security risk)
4. Profile API response times before/after with `console.time()`

**Validation:**
- Benchmark `/api/settings` response time before/after changes
- Target: < 5ms increase in p95 latency
- Use Chrome DevTools Network tab to measure

**Rollback Plan:**  
If performance degrades significantly (>50ms), switch to lighter validation (e.g., manual type guards) for hot paths.

---

#### Risk 3: Incomplete Test Coverage
**Impact:** Medium  
**Probability:** Medium  
**Affected Components:** Edge cases not caught by unit tests

**Problem:**  
JSON parsing has many edge cases (circular refs, BigInt, undefined, sparse arrays, etc.). Missing tests could leave vulnerabilities.

**Mitigation Strategy:**
1. Write tests for all known edge cases (see Tests Required section)
2. Use fuzzing library (e.g., `fast-check`) for property-based testing (optional)
3. Review Zod documentation for common validation pitfalls
4. Aim for 100% coverage on `json.ts` (enforced by vitest)

**Validation:**
- Run coverage report: `npm test -- --coverage`
- Review uncovered lines manually
- Add tests for any missed branches

**Rollback Plan:**  
If critical bug discovered in production, hotfix with immediate try-catch wrapper and add missing test retroactively.

---

#### Risk 4: Zod Version Compatibility
**Impact:** Low  
**Probability:** Low  
**Affected Components:** TypeScript compilation, Zod schema definitions

**Problem:**  
Zod 3.24.x might have breaking changes or TypeScript incompatibilities with our TS 5.x setup.

**Mitigation Strategy:**
1. Pin exact version in `package.json`: `"zod": "3.24.1"`
2. Test `npm install` immediately after adding dependency
3. Run `npm run build` to verify TypeScript compilation
4. Check Zod GitHub issues for known compatibility problems

**Validation:**
- `npm install` succeeds without warnings
- `npm run build` produces no errors
- Import `z` in test file, verify autocomplete works

**Rollback Plan:**  
If incompatible, downgrade to Zod 3.22.x (known stable with TS 5.x) or use alternative (e.g., `joi`, `yup`).

---

#### Risk 5: Circular Import Dependencies
**Impact:** High  
**Probability:** Low  
**Affected Components:** Module resolution, build process

**Problem:**  
If `src/lib/utils/json.ts` imports from a module that eventually imports `json.ts`, we get circular dependency errors.

**Mitigation Strategy:**
1. Keep `json.ts` dependency-free (only import Node.js built-ins)
2. Do NOT import any FlowVault modules in `json.ts`
3. Review import graph after implementation
4. Use `madge` tool to detect circular dependencies: `npx madge --circular src/`

**Validation:**
- Build succeeds without warnings
- No runtime errors about "undefined is not a function"
- `madge` reports zero circular dependencies

**Rollback Plan:**  
If circular dependency detected, move `json.ts` to new `src/lib/core/` folder (loaded before other modules).

---

### Estimated Effort

**Time Breakdown (Conservative Estimates):**

| Task | Estimated Time | Confidence |
|------|----------------|------------|
| **Phase 1: JSON Parse Safety** | | |
| Create `src/lib/utils/json.ts` (safeJSONParse, safeJSONStringify) | 30 min | High |
| Write unit tests for `json.ts` (8 test cases) | 30 min | High |
| Fix `src/app/api/settings/route.ts` (Line 244) | 10 min | High |
| Fix `src/app/api/backups/[id]/restore/route.ts` (Line 162) | 10 min | High |
| Fix `src/lib/backup/n8nClient.ts` (Line 35) | 10 min | Medium |
| Fix `src/lib/encryption/decrypt.ts` (Line 127) | 10 min | Medium |
| Fix `src/lib/backup/restore.ts` (Line 104) | 10 min | Medium |
| Run tests and verify coverage | 15 min | High |
| **Phase 1 Subtotal** | **2 hours** | |
| | | |
| **Phase 2: Zod Foundation** | | |
| Install Zod (`npm install zod`) | 5 min | High |
| Create `src/lib/validation/schemas.ts` (3 schemas) | 30 min | Medium |
| Create `src/lib/validation/index.ts` (barrel export) | 5 min | High |
| Write unit tests for schemas (7 test cases) | 30 min | Medium |
| Run tests and verify coverage | 10 min | High |
| Document usage patterns in comments | 10 min | High |
| **Phase 2 Subtotal** | **1.5 hours** | |
| | | |
| **Integration & Verification** | | |
| Run full test suite (`npm test`) | 10 min | High |
| Production build verification (`npm run build`) | 10 min | High |
| Manual testing (corrupt data scenarios) | 30 min | Medium |
| ESLint check (`npm run lint`) | 5 min | High |
| Documentation updates (README, comments) | 15 min | Low |
| Git commits (2 atomic commits) | 10 min | High |
| **Verification Subtotal** | **1.5 hours** | |
| | | |
| **Contingency Buffer (20%)** | + 1 hour | - |
| | | |
| **Total Estimated Time** | **4-5 hours** | **High** |

**Assumptions:**
- No major blockers discovered during implementation
- Test utilities (vitest) already configured and working
- Developer has moderate TypeScript/Zod experience
- Database access available for manual testing

**Adjustment Factors:**
- **-30 min** if developer is Zod expert
- **+45 min** if test setup requires debugging
- **+30 min** if integration tests are included (optional)

---

## PILLAR 2: IMPLEMENTATION

**Status:** ⏸️ NOT STARTED (Planning Phase Only)

**To be filled during execution by assigned subagents:**

- [ ] Backend Security Agent: Implement `src/lib/utils/json.ts`
- [ ] Backend Security Agent: Apply safe JSON parsing to 5 critical files
- [ ] Validation Schema Agent: Install Zod and create schemas
- [ ] Testing Agent: Write unit tests for json.ts
- [ ] Testing Agent: Write unit tests for schemas.ts
- [ ] All Agents: Execute verification checklist

**Implementation Log:** (to be added during execution)

---

## PILLAR 3: SELF-CRITIQUE

**Status:** ⏸️ NOT STARTED (Planning Phase Only)

**To be filled after implementation:**

- [ ] Review all changed files against planning requirements
- [ ] Verify no edge cases missed in error handling
- [ ] Check pattern consistency (naming, error responses, TypeScript types)
- [ ] Search for security vulnerabilities (e.g., missing input validation)
- [ ] Validate test coverage meets targets (100% json.ts, 90% schemas.ts)
- [ ] Confirm no new TypeScript errors or ESLint warnings

**Critique Log:** (to be added after implementation)

---

## PILLAR 4: VERIFICATION

**Status:** ⏸️ NOT STARTED (Planning Phase Only)

**To be filled after self-critique:**

### Automated Checks
- [ ] `npm test` - All unit tests pass
- [ ] `npm run build` - Production build succeeds
- [ ] `npm run lint` - No ESLint errors
- [ ] `npx madge --circular src/` - No circular dependencies
- [ ] Coverage report - 100% for json.ts, 90%+ for schemas.ts

### Manual Verification
- [ ] Corrupt encrypted API key in DB → GET /api/settings returns error (not crash)
- [ ] Corrupt backup workflow data → Restore returns descriptive error
- [ ] n8n client initialization with bad data → Throws helpful error
- [ ] Existing workflows/backups still function correctly
- [ ] Signup/login flows unaffected

### Performance Validation
- [ ] API response time increase < 5ms (measure with Chrome DevTools)
- [ ] Bundle size increase < 20KB gzipped (check build output)

**Verification Log:** (to be added after verification)

---

## PILLAR 5: SIGN-OFF

**Status:** ⏸️ NOT STARTED (Planning Phase Only)

**To be filled after verification:**

### Success Criteria Met
- [ ] Phase 1: JSON Parse Safety ✅
- [ ] Phase 2: Zod Foundation ✅
- [ ] All unit tests passing ✅
- [ ] Production build successful ✅
- [ ] Manual testing complete ✅
- [ ] Documentation updated ✅

### Deliverables
- [ ] `src/lib/utils/json.ts` - Safe JSON utilities
- [ ] `src/lib/validation/schemas.ts` - Zod base schemas
- [ ] `src/lib/validation/index.ts` - Validation exports
- [ ] `__tests__/utils/json.test.ts` - Unit tests (100% coverage)
- [ ] `__tests__/validation/schemas.test.ts` - Unit tests (90%+ coverage)
- [ ] Updated files (5 critical JSON.parse fixes)
- [ ] `package.json` - Zod dependency added

### Known Issues / Technical Debt
- (To be documented if any issues discovered during implementation)

### Recommendations for Next Phase
- Phase 3: API Route Validation - Apply Zod schemas to all API endpoints
- Phase 4: Rate Limiter Hardening - Fix fail-open behavior
- Phase 5: n8n Proxy Input Validation - Validate action, limit, payload size

**Sign-Off:** (Planning Architect / Implementation Team Lead)

---

## Subagent Delegation Plan

### Backend Security Agent
**Role:** Senior Backend Engineer  
**Specialization:** Security, Encryption, API Routes  

**Responsibilities:**
1. Create `src/lib/utils/json.ts` with safe parsing utilities
2. Fix all 5 critical `JSON.parse` calls in production code:
   - `src/app/api/settings/route.ts` (Line 244)
   - `src/app/api/backups/[id]/restore/route.ts` (Line 162)
   - `src/lib/backup/n8nClient.ts` (Line 35)
   - `src/lib/encryption/decrypt.ts` (Line 127)
   - `src/lib/backup/restore.ts` (Line 104)
3. Ensure error responses maintain consistent API contract
4. Coordinate with Testing Agent for integration test scenarios

**Ownership Files:**
- `src/lib/utils/json.ts` (create)
- `src/app/api/settings/route.ts` (modify)
- `src/app/api/backups/[id]/restore/route.ts` (modify)
- `src/lib/backup/n8nClient.ts` (modify)
- `src/lib/encryption/decrypt.ts` (modify)
- `src/lib/backup/restore.ts` (modify)

**Tools to Use:**
- `create_file` for `json.ts`
- `multi_replace_string_in_file` for parallel edits to 5 files
- `run_in_terminal` for `npm run build` verification

**Success Criteria:**
- All files modified without breaking existing error handling
- TypeScript compilation succeeds
- No new ESLint warnings

---

### Validation Schema Agent
**Role:** TypeScript Specialist  
**Specialization:** Runtime Validation, Type Safety, Zod  

**Responsibilities:**
1. Install Zod package (`npm install zod`)
2. Create `src/lib/validation/schemas.ts` with base validation schemas:
   - `EncryptedDataSchema` (mirrors `EncryptedData` interface)
   - `BackupMetadataSchema` (for backup records)
   - `UserSettingsSchema` (for settings API responses)
3. Create `src/lib/validation/index.ts` for clean exports
4. Document usage patterns for future API route integration
5. Establish error response patterns compatible with existing API contracts

**Ownership Files:**
- `package.json` (modify - add Zod dependency)
- `src/lib/validation/schemas.ts` (create)
- `src/lib/validation/index.ts` (create)

**Tools to Use:**
- `run_in_terminal` for `npm install zod`
- `create_file` for schema files
- `read_file` to reference `src/lib/encryption/types.ts` for interface definitions

**Success Criteria:**
- Zod installed without dependency conflicts
- Schemas match TypeScript interfaces exactly
- JSDoc comments explain usage patterns

---

### Testing Agent
**Role:** QA Engineer  
**Specialization:** Unit Testing, Test Coverage, Vitest  

**Responsibilities:**
1. Write comprehensive unit tests for `src/lib/utils/json.ts`:
   - Valid JSON parsing (objects, arrays)
   - Malformed JSON handling
   - Fallback value behavior
   - Circular reference handling in stringify
2. Write unit tests for `src/lib/validation/schemas.ts`:
   - Valid schema validation
   - Invalid data rejection
   - Error message format validation
3. Run test suite and generate coverage report
4. Verify 100% coverage for `json.ts`, 90%+ for `schemas.ts`
5. Manual testing of corrupted data scenarios

**Ownership Files:**
- `__tests__/utils/json.test.ts` (create)
- `__tests__/validation/schemas.test.ts` (create)

**Tools to Use:**
- `create_file` for test files
- `run_in_terminal` for `npm test` and coverage reports
- `read_file` to understand implementation details

**Success Criteria:**
- All tests pass (`npm test`)
- Coverage targets met (100% json.ts, 90% schemas.ts)
- No flaky tests (run 3 times to verify)

---

### Coordination Protocol

**Sequential Dependencies:**
1. **Backend Security Agent** creates `json.ts` → **Testing Agent** writes tests for it
2. **Validation Schema Agent** installs Zod → creates schemas → **Testing Agent** writes tests
3. **Backend Security Agent** applies fixes → **All Agents** verify no regressions

**Parallel Work (No Dependencies):**
- Backend Security Agent creating `json.ts` || Validation Schema Agent installing Zod
- Testing Agent writing `json.test.ts` || Validation Schema Agent creating `schemas.ts`

**Communication Checkpoints:**
1. After `json.ts` created → Testing Agent notified
2. After Zod installed → Backend Security Agent notified (may use in future)
3. After all files created → All Agents run `npm run build` together
4. After tests written → All Agents review coverage report

**Conflict Resolution:**
- If Backend Security Agent and Validation Schema Agent modify same file → Backend Agent merges
- If test fails → Testing Agent files bug report, relevant agent fixes
- If circular dependency detected → Backend Security Agent refactors module structure

---

## Next Steps (Immediate Actions)

**Priority Order for Execution:**

### Step 1: Environment Setup (5 min)
**Assigned To:** Validation Schema Agent  
**Action:** `npm install zod`  
**Verification:** `npm list zod` shows installed version  
**Blocker:** None  

---

### Step 2: Create Safe JSON Utilities (30 min)
**Assigned To:** Backend Security Agent  
**Action:** Create `src/lib/utils/json.ts` with:
- `safeJSONParse<T>` function
- `safeJSONStringify` function
- JSDoc comments
- Export types

**Verification:** File compiles without errors  
**Blocker:** None  

---

### Step 3: Fix Critical JSON.parse Calls (45 min)
**Assigned To:** Backend Security Agent  
**Action:** Use `multi_replace_string_in_file` to update 5 files in parallel:
1. `src/app/api/settings/route.ts` (Line 244)
2. `src/app/api/backups/[id]/restore/route.ts` (Line 162)
3. `src/lib/backup/n8nClient.ts` (Line 35)
4. `src/lib/encryption/decrypt.ts` (Line 127)
5. `src/lib/backup/restore.ts` (Line 104)

**Verification:** `npm run build` succeeds  
**Blocker:** Step 2 must complete first  

---

### Step 4: Create Zod Validation Schemas (45 min)
**Assigned To:** Validation Schema Agent  
**Action:** Create `src/lib/validation/schemas.ts` and `index.ts`  
**Verification:** Import schemas in test file, TypeScript autocomplete works  
**Blocker:** Step 1 must complete first  

---

### Step 5: Write Unit Tests for json.ts (30 min)
**Assigned To:** Testing Agent  
**Action:** Create `__tests__/utils/json.test.ts` with 8 test cases  
**Verification:** `npm test json.test.ts` passes, 100% coverage  
**Blocker:** Step 2 must complete first  

---

### Step 6: Write Unit Tests for schemas.ts (30 min)
**Assigned To:** Testing Agent  
**Action:** Create `__tests__/validation/schemas.test.ts` with 7 test cases  
**Verification:** `npm test schemas.test.ts` passes, 90%+ coverage  
**Blocker:** Step 4 must complete first  

---

### Step 7: Full Verification (45 min)
**Assigned To:** All Agents (Coordinated)  
**Actions:**
1. Run `npm test` (all tests)
2. Run `npm run build` (production build)
3. Run `npm run lint` (ESLint check)
4. Manual testing: Corrupt DB data scenarios
5. Performance check: API response times

**Verification:** All checks pass ✅  
**Blocker:** Steps 3, 5, 6 must complete first  

---

### Step 8: Documentation & Commit (15 min)
**Assigned To:** Backend Security Agent (Lead)  
**Actions:**
1. Update `docs/IMPLEMENTATION_STATUS.md` (mark Phase 1+2 complete)
2. Add usage examples to `schemas.ts` JSDoc
3. Git commit (atomic commits for Phase 1 and Phase 2)

**Verification:** Clean git history, descriptive commit messages  
**Blocker:** Step 7 must complete first  

---

## Appendix A: Reference Code Examples

### Example 1: Safe JSON Parse Implementation
```typescript
/**
 * Safely parse JSON string with error handling
 * @param input - JSON string to parse
 * @param fallback - Default value if parsing fails
 * @returns Result object with success flag and data/error
 */
export function safeJSONParse<T = unknown>(
  input: string,
  fallback?: T
): { success: boolean; data?: T; error?: string } {
  try {
    if (typeof input !== 'string') {
      return {
        success: false,
        data: fallback,
        error: 'Input must be a string',
      };
    }
    
    const data = JSON.parse(input) as T;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      data: fallback,
      error: error instanceof Error ? error.message : 'JSON parse failed',
    };
  }
}
```

### Example 2: Zod Schema Definition
```typescript
import { z } from 'zod';
import type { EncryptedData } from '@/lib/encryption/types';

/**
 * Runtime validation schema for EncryptedData
 * Must match the EncryptedData TypeScript interface exactly
 */
export const EncryptedDataSchema = z.object({
  ciphertext: z.string().min(1, 'Ciphertext is required'),
  iv: z.string().min(1, 'IV is required'),
  salt: z.string().min(1, 'Salt is required'),
  tag: z.string().min(1, 'Authentication tag is required'),
  version: z.number().int().positive(),
}).strict(); // Reject unknown properties

// Type inference (should match EncryptedData interface)
type InferredEncryptedData = z.infer<typeof EncryptedDataSchema>;
```

### Example 3: API Route Error Handling
```typescript
// BEFORE (Unsafe)
const encryptedData: EncryptedData = JSON.parse(settings.n8n_api_key_encrypted);

// AFTER (Safe)
import { safeJSONParse } from '@/lib/utils/json';

const parseResult = safeJSONParse<EncryptedData>(settings.n8n_api_key_encrypted);
if (!parseResult.success || !parseResult.data) {
  return NextResponse.json(
    { error: parseResult.error || 'Invalid encrypted API key format' },
    { status: 500 }
  );
}
const encryptedData = parseResult.data;
```

---

## Appendix B: Test Case Specifications

### JSON Utility Tests (json.test.ts)
```typescript
import { describe, it, expect } from 'vitest';
import { safeJSONParse, safeJSONStringify } from '@/lib/utils/json';

describe('safeJSONParse', () => {
  it('should parse valid JSON object', () => {
    const result = safeJSONParse('{"key":"value"}');
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ key: 'value' });
    expect(result.error).toBeUndefined();
  });

  it('should handle malformed JSON', () => {
    const result = safeJSONParse('{key:value}'); // Missing quotes
    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
    expect(result.error).toContain('JSON');
  });

  it('should use fallback value on parse failure', () => {
    const fallback = { default: true };
    const result = safeJSONParse('invalid', fallback);
    expect(result.success).toBe(false);
    expect(result.data).toEqual(fallback);
  });

  // ... 5 more test cases ...
});
```

### Zod Schema Tests (schemas.test.ts)
```typescript
import { describe, it, expect } from 'vitest';
import { EncryptedDataSchema } from '@/lib/validation/schemas';

describe('EncryptedDataSchema', () => {
  const validData = {
    ciphertext: 'abc123',
    iv: 'def456',
    salt: 'ghi789',
    tag: 'jkl012',
    version: 1,
  };

  it('should validate correct EncryptedData', () => {
    const result = EncryptedDataSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validData);
    }
  });

  it('should reject data with missing required fields', () => {
    const { salt, ...incomplete } = validData;
    const result = EncryptedDataSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('salt');
    }
  });

  // ... 5 more test cases ...
});
```

---

## Appendix C: Migration Checklist

**Pre-Implementation:**
- [x] Read all existing documentation (OPUS prompt, PROJECT.md, CONCERNS.md)
- [x] Identify all `JSON.parse` calls in codebase
- [x] Review existing error handling patterns
- [x] Verify TypeScript and Zod compatibility
- [x] Create implementation plan (this document)

**During Implementation:**
- [ ] Create `src/lib/utils/json.ts`
- [ ] Create `src/lib/validation/schemas.ts`
- [ ] Create `src/lib/validation/index.ts`
- [ ] Update 5 files with safe JSON parsing
- [ ] Write unit tests (json.test.ts)
- [ ] Write unit tests (schemas.test.ts)
- [ ] Install Zod dependency

**Post-Implementation:**
- [ ] Run full test suite
- [ ] Run production build
- [ ] Run ESLint
- [ ] Manual testing (corrupted data scenarios)
- [ ] Performance benchmarking
- [ ] Git commits (2 atomic commits)
- [ ] Update IMPLEMENTATION_STATUS.md

---

**Document Version:** 1.0  
**Last Updated:** January 13, 2026  
**Status:** ✅ Planning Complete - Ready for Implementation  
**Next Action:** Assign subagents and begin Step 1 (Zod installation)
