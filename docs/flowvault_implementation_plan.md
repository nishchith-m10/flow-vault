# FlowVault: Workflow Sanitization Feature

## Overview

Add a "Smart Export" feature that auto-detects and replaces sensitive data with placeholders before exporting workflows.

---

## Bug Fix: Multi-Workflow Export

**Problem**: Exporting multiple workflows combines them into one JSON file.

**Expected**: Each workflow should be a separate [.json](file:///Users/nishchith.g.m/Desktop/UpShot_project/cold-email-dashboard-starter/vercel.json) file, delivered as a `.zip` archive.

**Fix Location**: Likely in the export handler (check `src/app/workflows/page.tsx` or utility functions).

---

## Phase 1: Core Sanitization Engine

### New File: `src/lib/sanitizer.ts`

```typescript
interface SanitizationRule {
  pattern: RegExp;
  placeholder: string;
  category: "url" | "apiKey" | "email" | "token" | "custom";
}

const DEFAULT_RULES: SanitizationRule[] = [
  // URLs (exclude safe domains)
  {
    pattern: /https?:\/\/(?!google\.com|github\.com)[^\s"']+/g,
    placeholder: "YOUR_URL",
    category: "url",
  },

  // API Keys by prefix
  {
    pattern: /AIza[A-Za-z0-9_-]{35}/g,
    placeholder: "YOUR_GOOGLE_API_KEY",
    category: "apiKey",
  },
  {
    pattern: /sk-[A-Za-z0-9]{48}/g,
    placeholder: "YOUR_OPENAI_KEY",
    category: "apiKey",
  },
  {
    pattern: /apify_api_[A-Za-z0-9]+/g,
    placeholder: "YOUR_APIFY_TOKEN",
    category: "apiKey",
  },

  // Emails
  {
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    placeholder: "YOUR_EMAIL",
    category: "email",
  },

  // Long hex tokens (40+ chars)
  { pattern: /[a-f0-9]{40,}/gi, placeholder: "YOUR_TOKEN", category: "token" },
];

export function sanitizeWorkflow(
  workflow: object,
  rules = DEFAULT_RULES
): {
  sanitized: object;
  replacements: { original: string; placeholder: string; location: string }[];
};
```

---

## Phase 2: Export UI Enhancement

### Modify: `src/components/ui/FloatingActionBar.tsx`

Add sanitization toggle to export flow:

```
┌─────────────────────────────────────┐
│  Export Options                     │
├─────────────────────────────────────┤
│  ☑️ Sanitize (remove secrets)       │
│  ○ Single file (combined JSON)     │
│  ● Separate files (.zip)           │ ← Fix for bug
│                                     │
│  [ Cancel ]      [ Export ]         │
└─────────────────────────────────────┘
```

---

## Phase 3: Preview & Confirmation

### New Component: `src/components/SanitizationPreview.tsx`

Show user what will be replaced before export:

| Found                   | Replacement       | Location           |
| ----------------------- | ----------------- | ------------------ |
| `https://n8n.myapp.com` | `YOUR_URL`        | HTTP Request node  |
| `sk-abc123...`          | `YOUR_OPENAI_KEY` | Code node (line 5) |
| `me@company.com`        | `YOUR_EMAIL`      | Gmail node         |

---

## Implementation Order

1. **Fix multi-export bug** (quick win)
2. **Create `sanitizer.ts`** with default rules
3. **Add toggle to export UI**
4. **Add preview modal** (optional, Phase 2)
5. **User-defined rules** (Premium feature)

---

## Files to Create/Modify

| File                                      | Action                                         |
| ----------------------------------------- | ---------------------------------------------- |
| `src/lib/sanitizer.ts`                    | NEW - Core sanitization logic                  |
| `src/lib/export.ts`                       | MODIFY - Fix multi-export, add sanitize option |
| `src/components/ui/FloatingActionBar.tsx` | MODIFY - Add sanitize toggle                   |
| `src/components/SanitizationPreview.tsx`  | NEW - Preview modal (Phase 2)                  |
