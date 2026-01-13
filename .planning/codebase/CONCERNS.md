# Codebase Concerns

**Analysis Date:** 2026-01-12

## Tech Debt

**Large Components Needing Refactoring:**
- Issue: Multiple components exceed 300 lines, handling too many responsibilities
- Files:
  - `src/app/backups/[id]/page.tsx` (471 lines) - Backup detail, restore, export in one file
  - `src/app/workflows/import/page.tsx` (451 lines) - Import UI, file parsing, conflict resolution
  - `src/app/workflows/page.tsx` (435 lines) - Workflow list, filtering, pagination, bulk ops
  - `src/components/DashboardLayout.tsx` (401 lines) - Navigation, context, layout
  - `src/app/workflows/archived/page.tsx` (336 lines) - Archived workflow management
  - `src/app/settings/page.tsx` (317 lines) - Settings form, validation, connection testing
  - `src/lib/storage/supabaseAdapter.ts` (311 lines) - Multiple storage responsibilities
  - `src/app/api/settings/route.ts` (289 lines) - All CRUD operations in one file
  - `src/app/api/n8n/route.ts` (228 lines) - n8n proxy with many operations
- Why: Rapid MVP development, feature accretion
- Impact: Hard to maintain, test, and modify
- Fix approach: Extract into smaller components/modules, separate concerns

**Incomplete Key Management:**
- Issue: TODO in `src/lib/encryption/keyManagement.ts` (line 105) - Clerk API integration for per-user keys not implemented
- Why: Deferred to post-MVP
- Impact: All users share same encryption key from environment variable
- Fix approach: Implement Clerk user metadata storage for per-user keys

## Known Bugs

**No Critical Bugs Identified**
- Codebase appears functional based on static analysis
- Runtime testing needed to identify issues

## Security Considerations

**Unsafe JSON.parse Without Try-Catch:**
- Risk: Corrupted encrypted data could crash the application
- Files:
  - `src/app/api/settings/route.ts` (line ~244) - `JSON.parse(settings.n8n_api_key_encrypted)`
  - `src/app/api/backups/[id]/restore/route.ts` (line ~162) - Same pattern
  - `src/lib/backup/n8nClient.ts` (line ~35) - Same pattern
  - `src/lib/encryption/decrypt.ts` (line ~119) - JSON.parse in error path
- Current mitigation: None
- Recommendations: Wrap all JSON.parse calls in try-catch, return typed error

**Missing Input Validation in n8n Proxy:**
- Risk: Potential injection or abuse through unvalidated parameters
- File: `src/app/api/n8n/route.ts`
- Issues:
  - `limit` parameter (line ~154) not validated - could allow excessive queries
  - `n8nUrl` used in fetch without validation (line ~13)
  - `apiKey` sent to n8n without validation (line ~10)
  - `action` parameter has basic check but not enum validation
  - No payload size limits on workflow data (lines ~18-24)
- Current mitigation: Authentication via Clerk
- Recommendations: Add parameter validation, size limits, enum checks

**Client-Side Credential Exposure:**
- Risk: API keys stored in React state could leak via error boundaries or dev tools
- Files:
  - `src/app/settings/page.tsx` (lines ~100-150) - API key in useState before server send
  - `src/components/DashboardLayout.tsx` - CredentialsContext stores n8nUrl and apiKey
- Current mitigation: Keys encrypted on server-side storage
- Recommendations: Minimize client-side credential handling, use server actions

**Global Encryption Key:**
- Risk: Single encryption key for all users; key compromise affects everyone
- File: `src/lib/encryption/keyManagement.ts`
- Current mitigation: Environment variable access control
- Recommendations: Implement per-user key derivation, key rotation mechanism

## Performance Bottlenecks

**Workflow Deduplication:**
- Problem: JSON.stringify called for every workflow during deduplication
- File: `src/lib/backup/deduplicator.ts` (line ~26)
- Measurement: Not profiled, potentially slow with large workflows
- Cause: `JSON.stringify(normalizedWorkflow, Object.keys(...).sort())`
- Improvement path: Cache normalized hashes, use streaming hash

**Fixed Pagination in n8n Proxy:**
- Problem: Hardcoded limit=250 for workflow list, no offset handling
- File: `src/app/api/n8n/route.ts` (line ~34)
- Measurement: Could fail or timeout with 250+ workflows
- Cause: No pagination implementation
- Improvement path: Add cursor/offset pagination support

## Fragile Areas

**Rate Limiter Fail-Open:**
- File: `src/lib/rateLimit/index.ts` (lines 60-68)
- Why fragile: If rate limit check fails (DB error), request is allowed
- Common failures: Database connectivity issues bypass rate limiting
- Safe modification: Consider fail-closed for security-critical operations
- Test coverage: Unit tests exist but edge cases may be missing

**Type Assertions:**
- Files: `src/lib/rateLimit/index.ts` (lines 48, 115, 119)
- Why fragile: Uses `as unknown as` and `as { ... }` type casts
- Common failures: Runtime type mismatches crash silently
- Safe modification: Add runtime type validation
- Test coverage: Partial

## Scaling Limits

**Not Evaluated**
- Current capacity and limits not profiled
- Supabase tier limits apply (database size, storage, bandwidth)

## Dependencies at Risk

**No Critical Dependencies Identified**
- All major dependencies actively maintained
- React 19 is recent but stable

## Missing Critical Features

**Per-User Encryption Keys:**
- Problem: All users share environment encryption key
- Current workaround: Single key is secure if properly managed
- Blocks: True multi-tenant isolation
- Implementation complexity: Medium (Clerk metadata integration)

**Key Rotation:**
- Problem: No mechanism to rotate encryption keys
- Current workaround: Manual re-encryption via `scripts/re_encrypt_backups.ts`
- Blocks: Security compliance requirements
- Implementation complexity: High (re-encrypt all backups)

## Test Coverage Gaps

**API Route Error Handling:**
- What's not tested: Error paths in API routes (400, 401, 500 responses)
- Risk: Error handling bugs could leak information or crash
- Priority: Medium
- Difficulty to test: Easy with mocked dependencies

**Component Rendering:**
- What's not tested: React component rendering and user interactions
- Risk: UI bugs, accessibility issues
- Priority: Low (functional app)
- Difficulty to test: Medium (requires React testing setup)

**n8n Proxy Security:**
- What's not tested: Input validation, injection attempts
- Risk: Security vulnerabilities in proxy endpoint
- Priority: High
- Difficulty to test: Medium (need security test patterns)

**Only 5 Test Files:**
- Coverage: `rls.test.ts`, `dbRateLimiter.test.ts`, `rateLimit.test.ts`, `re_encrypt.test.ts`, `restore.test.ts`
- Missing: API routes, components, encryption edge cases, database operations

---

*Concerns audit: 2026-01-12*
*Update as issues are fixed or new ones discovered*
