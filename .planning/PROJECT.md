# FlowVault Security Hardening

**Created:** 2026-01-12

## Vision

Harden FlowVault's security posture by addressing identified vulnerabilities, implementing schema-based validation with Zod, and adding abuse prevention mechanisms to prepare for production use.

## Requirements

### Validated

- ✓ AES-256-GCM encryption for sensitive data at rest — existing
- ✓ Clerk authentication with Supabase Row-Level Security — existing
- ✓ Backup/restore orchestration for n8n workflows — existing
- ✓ Database-backed rate limiting with atomic counters — existing
- ✓ n8n API integration via proxy — existing
- ✓ Layered architecture (Presentation → API → Business Logic → Data Access) — existing
- ✓ Custom error hierarchy (FlowVaultError subclasses) — existing

### Active

- [ ] Wrap all JSON.parse calls in try-catch with typed error handling
- [ ] Add Zod validation schemas for all API route inputs
- [ ] Fix rate limiter fail-open behavior for security-critical operations
- [ ] Add input validation to n8n proxy (limit, action, payload size)
- [ ] Replace unsafe type assertions with runtime validation
- [ ] Implement API key uniqueness constraint per user
- [ ] Implement n8n URL uniqueness constraint per user
- [ ] Add instance-level rate limits (per n8n instance)
- [ ] Minimize client-side credential exposure

### Out of Scope

- Chrome extension — focus on core API security first
- Monetization/pricing tiers — business logic after security is solid
- Per-user encryption keys — complex Clerk metadata integration for later phase

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Zod for validation | Schema-based, TypeScript-native, composable | — Pending |
| Fail-closed rate limiting | Security-critical operations shouldn't bypass limits | — Pending |
| Server-side credential handling | Reduce client-side exposure surface | — Pending |

## Technical Context

**Stack:** Next.js 16.1.1, React 19.2.3, TypeScript 5.x, Tailwind CSS 4, Supabase, Clerk

**Security Files to Modify:**
- `src/app/api/settings/route.ts` — Unsafe JSON.parse (line ~244)
- `src/app/api/backups/[id]/restore/route.ts` — Unsafe JSON.parse (line ~162)
- `src/lib/backup/n8nClient.ts` — Unsafe JSON.parse (line ~35)
- `src/lib/encryption/decrypt.ts` — JSON.parse in error path (line ~119)
- `src/app/api/n8n/route.ts` — Missing input validation (228 lines)
- `src/lib/rateLimit/index.ts` — Fail-open behavior (lines 60-68)

**Reference Documents:**
- `.planning/codebase/CONCERNS.md` — Full list of security issues
- `docs/flowvault_chat/v2_FEATURES_IDEAS.md` — Abuse prevention specs
- `docs/flowvault_chat/v1_PRODUCT_LAUNCH_PLAN.md` — Product context

## Success Criteria

- All JSON.parse calls wrapped with error handling
- All API routes validated with Zod schemas
- Rate limiter fails closed on database errors
- n8n proxy validates all input parameters
- No type assertions without runtime guards
- Abuse prevention constraints active

---

*Last updated: 2026-01-12 after initialization*
