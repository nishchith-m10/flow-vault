# Technology Stack

**Analysis Date:** 2026-01-12

## Languages

**Primary:**
- TypeScript 5.x - All application code (`package.json`, `tsconfig.json`)

**Secondary:**
- JavaScript - Build scripts, config files
- CSS/Tailwind - Styling (`package.json`, `src/app/globals.css`)

## Runtime

**Environment:**
- Node.js (LTS) - JavaScript runtime
- Next.js 16.1.1 - Full-stack React framework with SSR/SSG

**Package Manager:**
- npm - Node Package Manager
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js 16.1.1 - Full-stack React framework (`package.json`)
- React 19.2.3 - UI library (`package.json`)
- Tailwind CSS 4 - Utility-first CSS framework (`package.json`)

**Testing:**
- Vitest - Unit testing framework (`vitest.config.ts`)
- jsdom - Browser environment simulation for tests

**Build/Dev:**
- TypeScript 5.x - Type checking and compilation (`tsconfig.json`)
- PostCSS 4 - CSS processing (`package.json`)
- ESLint 9 - Code linting (`.eslintrc.json`)
- Babel React Compiler - React optimization (`package.json`)

## Key Dependencies

**Critical:**
- @clerk/nextjs 6.15.0 - User authentication provider (`package.json`)
- @supabase/supabase-js 2.90.1 - Database and storage client (`package.json`)
- svix 1.84.1 - Webhook verification library (`package.json`)

**Infrastructure:**
- framer-motion 12.23.26 - Animation library (`package.json`)
- lucide-react 0.562.0 - Icon library (`package.json`)
- jszip 3.10.1 - ZIP file handling for exports (`package.json`)
- csv-parse 6.1.0 - CSV parsing (`package.json`)

**Fonts:**
- @fontsource/plus-jakarta-sans 5.2.8 - Primary font (`package.json`)
- @fontsource/jetbrains-mono 5.2.8 - Monospace font (`package.json`)

## Configuration

**Environment:**
- `.env.local` - Local development configuration (gitignored)
- `.env.example` - Template for required environment variables
- Key required vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CLERK_*`, `ENCRYPTION_KEY`

**Build:**
- `tsconfig.json` - TypeScript compiler options (ES2017 target, strict mode, path aliases)
- `next.config.ts` - Next.js configuration
- `.eslintrc.json` - ESLint rules (extends next/core-web-vitals)
- `vitest.config.ts` - Test runner configuration

## Platform Requirements

**Development:**
- macOS/Linux/Windows (any platform with Node.js)
- No Docker required for local development

**Production:**
- Vercel - Primary deployment target (Next.js optimized)
- Supabase - PostgreSQL database and file storage
- Clerk - Authentication service

---

*Stack analysis: 2026-01-12*
*Update after major dependency changes*
