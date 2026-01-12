/**
 * Simple unit test for DB rate limiter logic (requires test runner like vitest or jest)
 * This test mocks Supabase RPC call and verifies the module's behaviour on RPC errors and success.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/database/client', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

const { checkAndIncrementRateLimit } = await import('@/lib/rateLimit/dbRateLimiter');
const { supabase } = await import('@/lib/database/client');

describe('dbRateLimiter', () => {
  it('should allow on RPC true', async () => {
    // @ts-expect-error mocking supabase rpc method
    supabase.rpc.mockResolvedValue({ data: true, error: null });
    const res = await checkAndIncrementRateLimit('user_a', 'manual_backup', 3, 3600);
    expect(res.allowed).toBe(true);
  });

  it('should fail-open on RPC error', async () => {
    // @ts-expect-error mocking supabase rpc method
    supabase.rpc.mockResolvedValue({ data: null, error: { message: 'rpc error' } });
    const res = await checkAndIncrementRateLimit('user_a', 'manual_backup', 3, 3600);
    expect(res.allowed).toBe(true); // fails open
  });
});
