import { vi } from 'vitest';

// Set up environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'test-clerk-key';
process.env.CLERK_SECRET_KEY = 'test-clerk-secret';

// Mock Next.js server modules
vi.mock('next/server', () => ({
  NextRequest: vi.fn(),
  NextResponse: {
    json: vi.fn((data, init) => ({ data, init, headers: new Map() })),
    redirect: vi.fn(),
  },
}));

// Mock Next.js navigation
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

// Mock Clerk authentication
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

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    })),
    rpc: vi.fn(() => ({
      single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  })),
}));

// Global test utilities
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
};
