// __tests__/rateLimit.test.ts

// Import the function to be tested
import { checkRateLimit } from '../src/lib/rateLimit';

// Define a mock RPC function that we can control in our tests
const mockRpc = jest.fn();

// Mock the '@supabase/supabase-js' module.
// The factory function ensures that any code importing createClient
// will get our mock implementation.
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    rpc: mockRpc,
  })),
}));

describe('Rate Limiter', () => {
  beforeEach(() => {
    // Clear any previous mock calls before each test
    mockRpc.mockClear();
  });

  test('should allow a request that is under the limit', async () => {
    mockRpc.mockResolvedValue({
      data: { allowed: true, remaining: 99, reset_at: new Date().toISOString() },
      error: null,
    });

    const result = await checkRateLimit('user1', 'default');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(99);
    expect(mockRpc).toHaveBeenCalledWith('check_rate_limit', expect.any(Object));
  });

  test('should block a request that is over the limit', async () => {
    mockRpc.mockResolvedValue({
      data: { allowed: false, remaining: 0, reset_at: new Date().toISOString() },
      error: null,
    });

    const result = await checkRateLimit('user1', 'default');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  test('should return a reset date', async () => {
    const resetDate = new Date(Date.now() + 60 * 60 * 1000);
    mockRpc.mockResolvedValue({
      data: { allowed: true, remaining: 99, reset_at: resetDate.toISOString() },
      error: null,
    });

    const result = await checkRateLimit('user1', 'default');
    expect(result.resetAt.toISOString()).toBe(resetDate.toISOString());
  });

  test('should allow the request if the rpc call fails', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: new Error('Database error'),
    });

    const result = await checkRateLimit('user1', 'default');
    expect(result.allowed).toBe(true);
  });
});
