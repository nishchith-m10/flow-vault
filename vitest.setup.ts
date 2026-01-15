import { vi } from 'vitest';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'test-clerk-key';
process.env.CLERK_SECRET_KEY = 'test-clerk-secret';

vi.mock('next/server', () => ({
  NextRequest: vi.fn(),
  NextResponse: {
    json: vi.fn((data: any, init?: any) => ({ data, init, headers: new Map() })),
    redirect: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  useParams: vi.fn(() => ({})),
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(() => ({
    userId: 'test-user-id',
    sessionClaims: {},
  })),
  currentUser: vi.fn(() => null),
}));

vi.mock('@clerk/nextjs', () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
  useUser: vi.fn(() => ({
    user: { id: 'test-user-id' },
    isLoaded: true,
    isSignedIn: true,
  })),
}));

vi.mock('@supabase/supabase-js', () => {
  // Simple in-memory store for mocked tables
  const db: Record<string, any[]> = {};

  const createClient = vi.fn(() => ({
    from: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn((field: string, val: any) => {
          const rows = (db[table] || []).filter((r) => r[field] === val);
          return Promise.resolve({ data: rows, error: null });
        }),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn((field: string, val: any) => {
          db[table] = (db[table] || []).filter((r) => r[field] !== val);
          return Promise.resolve({ data: null, error: null });
        }),
      })),
      insert: vi.fn((rows: any) => {
        db[table] = db[table] || [];
        const toInsert = Array.isArray(rows) ? rows : [rows];
        for (const r of toInsert) {
          const row = { id: db[table].length + 1, ...r };
          db[table].push(row);
        }
        const last = db[table][db[table].length - 1];
        const promise: any = Promise.resolve({ data: null, error: null });
        promise.select = vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: last, error: null })) }));
        return promise as any;
      }),
      update: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
  }));

  return { createClient };
});

global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
};
