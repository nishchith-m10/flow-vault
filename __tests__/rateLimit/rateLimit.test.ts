/**
 * Rate Limiter Tests
 * Unit tests for quota enforcement logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkRateLimit, getRateLimitStatus } from '@/lib/rateLimit';

// Mock Supabase client
vi.mock('@/lib/database/client', () => ({
  createUserClient: vi.fn(() => ({
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => ({
                  single: vi.fn(),
                })),
              })),
            })),
          })),
        })),
      })),
    })),
  })),
}));

describe('Rate Limiter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkRateLimit', () => {
    it('should return allowed=true when under limit', async () => {
      const { createUserClient } = await import('@/lib/database/client');
      const mockSingle = vi.fn().mockResolvedValue({
        data: { current_count: 50 },
        error: null,
      });
      const mockRpc = vi.fn().mockReturnValue({ single: mockSingle });
      vi.mocked(createUserClient).mockReturnValue({ rpc: mockRpc } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

      const result = await checkRateLimit('user-123', 'api:general', 1);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
      expect(mockRpc).toHaveBeenCalledWith(
        'flowvault_increment_rate_limit',
        expect.objectContaining({
          p_user_id: 'user-123',
          p_action: 'api:general',
          p_cost: 1,
        })
      );
    });

    it('should return allowed=false when over limit', async () => {
      const { createUserClient } = await import('@/lib/database/client');
      const mockSingle = vi.fn().mockResolvedValue({
        data: { current_count: 100 },
        error: null,
      });
      const mockRpc = vi.fn().mockReturnValue({ single: mockSingle });
      vi.mocked(createUserClient).mockReturnValue({ rpc: mockRpc } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

      const result = await checkRateLimit('user-123', 'api:general', 1);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should fail open on database error', async () => {
      const { createUserClient } = await import('@/lib/database/client');
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'DB Error' },
      });
      const mockRpc = vi.fn().mockReturnValue({ single: mockSingle });
      vi.mocked(createUserClient).mockReturnValue({ rpc: mockRpc } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

      const result = await checkRateLimit('user-123', 'api:general', 1);

      expect(result.allowed).toBe(true); // Fail open
    });

    it('should support custom cost values', async () => {
      const { createUserClient } = await import('@/lib/database/client');
      const mockSingle = vi.fn().mockResolvedValue({
        data: { current_count: 95 },
        error: null,
      });
      const mockRpc = vi.fn().mockReturnValue({ single: mockSingle });
      vi.mocked(createUserClient).mockReturnValue({ rpc: mockRpc } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

      await checkRateLimit('user-123', 'backup:trigger', 5);

      expect(mockRpc).toHaveBeenCalledWith(
        'flowvault_increment_rate_limit',
        expect.objectContaining({ p_cost: 5 })
      );
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return current status without incrementing', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({
                      data: { count: 30, window_start: new Date().toISOString() },
                      error: null,
                    }),
                  })),
                })),
              })),
            })),
          })),
        })),
      }));
      vi.mocked(createUserClient).mockReturnValue({ from: mockFrom } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

      const result = await getRateLimitStatus('user-123', 'api:general');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it('should return full quota if no counter exists', async () => {
      const { createUserClient } = await import('@/lib/database/client');
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({
                      data: null,
                      error: { code: 'PGRST116' }, // Not found
                    }),
                  })),
                })),
              })),
            })),
          })),
        })),
      }));
      vi.mocked(createUserClient).mockReturnValue({ from: mockFrom } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

      const result = await getRateLimitStatus('user-123', 'api:general');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(60); // Default for api:general
    });
  });
});
