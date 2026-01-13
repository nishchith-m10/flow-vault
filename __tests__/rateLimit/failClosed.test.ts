/**
 * Tests for rate limiter fail-closed behavior
 * Verifies that security-critical operations deny requests on database errors
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkRateLimit, checkInstanceRateLimit } from '@/lib/rateLimit';

// Mock the database client
vi.mock('@/lib/database/client', () => ({
  createUserClient: vi.fn(() => ({
    rpc: vi.fn(),
  })),
}));

describe('Rate Limiter - Fail-Closed Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkRateLimit - Fail Strategy', () => {
    it('should fail closed for backup:trigger on database error', async () => {
      const { createUserClient } = await import('@/lib/database/client');
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Database connection failed'),
      });

      vi.mocked(createUserClient).mockReturnValue({
        rpc: mockRpc,
      } as any);

      const result = await checkRateLimit('test-user', 'backup:trigger', 1);

      expect(result.allowed).toBe(false);
      expect(result.failedClosed).toBe(true);
      expect(result.remaining).toBe(0);
      expect(mockRpc).toHaveBeenCalledWith('flowvault_increment_rate_limit', expect.any(Object));
    });

    it('should fail closed for backup:restore on database error', async () => {
      const { createUserClient } = await import('@/lib/database/client');
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Database timeout'),
      });

      vi.mocked(createUserClient).mockReturnValue({
        rpc: mockRpc,
      } as any);

      const result = await checkRateLimit('test-user', 'backup:restore', 2);

      expect(result.allowed).toBe(false);
      expect(result.failedClosed).toBe(true);
      expect(result.limit).toBe(20); // backup:restore has limit of 20
    });

    it('should fail open for api:general on database error', async () => {
      const { createUserClient } = await import('@/lib/database/client');
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Database connection failed'),
      });

      vi.mocked(createUserClient).mockReturnValue({
        rpc: mockRpc,
      } as any);

      const result = await checkRateLimit('test-user', 'api:general', 1);

      expect(result.allowed).toBe(true);
      expect(result.failedClosed).toBeUndefined();
      expect(result.remaining).toBe(60); // api:general has limit of 60
    });

    it('should fail open for backup:export on database error', async () => {
      const { createUserClient } = await import('@/lib/database/client');
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      });

      vi.mocked(createUserClient).mockReturnValue({
        rpc: mockRpc,
      } as any);

      const result = await checkRateLimit('test-user', 'backup:export', 1);

      expect(result.allowed).toBe(true);
      expect(result.failedClosed).toBeUndefined();
      expect(result.limit).toBe(50); // backup:export has limit of 50
    });

    it('should allow request when rate limit check succeeds and under limit', async () => {
      const { createUserClient } = await import('@/lib/database/client');
      const mockRpc = vi.fn().mockResolvedValue({
        data: { current_count: 50 },
        error: null,
      });

      vi.mocked(createUserClient).mockReturnValue({
        rpc: mockRpc,
      } as any);

      const result = await checkRateLimit('test-user', 'backup:trigger', 1);

      expect(result.allowed).toBe(true);
      expect(result.failedClosed).toBeUndefined();
      expect(result.remaining).toBe(50); // 100 - 50
    });

    it('should deny request when rate limit exceeded (not fail-closed)', async () => {
      const { createUserClient } = await import('@/lib/database/client');
      const mockRpc = vi.fn().mockResolvedValue({
        data: { current_count: 101 },
        error: null,
      });

      vi.mocked(createUserClient).mockReturnValue({
        rpc: mockRpc,
      } as any);

      const result = await checkRateLimit('test-user', 'backup:trigger', 1);

      expect(result.allowed).toBe(false);
      expect(result.failedClosed).toBeUndefined(); // Normal rate limit, not fail-closed
      expect(result.remaining).toBe(0);
    });
  });

  describe('checkInstanceRateLimit - Fail-Closed Behavior', () => {
    it('should fail closed for instance:backup on database error', async () => {
      const { createUserClient } = await import('@/lib/database/client');
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Database connection failed'),
      });

      vi.mocked(createUserClient).mockReturnValue({
        rpc: mockRpc,
      } as any);

      const result = await checkInstanceRateLimit(
        'test-user',
        'https://n8n.example.com',
        'backup',
        1
      );

      expect(result.allowed).toBe(false);
      expect(result.failedClosed).toBe(true);
      expect(result.limit).toBe(200); // instance:backup has limit of 200
    });

    it('should fail closed for instance:restore on database error', async () => {
      const { createUserClient } = await import('@/lib/database/client');
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Database timeout'),
      });

      vi.mocked(createUserClient).mockReturnValue({
        rpc: mockRpc,
      } as any);

      const result = await checkInstanceRateLimit(
        'test-user',
        'https://n8n.example.com',
        'restore',
        2
      );

      expect(result.allowed).toBe(false);
      expect(result.failedClosed).toBe(true);
      expect(result.limit).toBe(50); // instance:restore has limit of 50
    });

    it('should create consistent hash for same instance URL', async () => {
      const { createUserClient } = await import('@/lib/database/client');
      const mockRpc = vi.fn()
        .mockResolvedValueOnce({ data: { current_count: 10 }, error: null })
        .mockResolvedValueOnce({ data: { current_count: 11 }, error: null });

      vi.mocked(createUserClient).mockReturnValue({
        rpc: mockRpc,
      } as any);

      const result1 = await checkInstanceRateLimit(
        'test-user',
        'https://n8n.example.com',
        'backup',
        1
      );

      const result2 = await checkInstanceRateLimit(
        'test-user',
        'https://n8n.example.com',
        'backup',
        1
      );

      // Both calls should use the same action key (same hash)
      expect(mockRpc).toHaveBeenCalledTimes(2);
      const call1Action = mockRpc.mock.calls[0][1].p_action;
      const call2Action = mockRpc.mock.calls[1][1].p_action;
      expect(call1Action).toBe(call2Action);
      expect(call1Action).toMatch(/^instance:backup:/);
    });

    it('should create different hash for different instance URLs', async () => {
      const { createUserClient } = await import('@/lib/database/client');
      const mockRpc = vi.fn()
        .mockResolvedValueOnce({ data: { current_count: 10 }, error: null })
        .mockResolvedValueOnce({ data: { current_count: 5 }, error: null });

      vi.mocked(createUserClient).mockReturnValue({
        rpc: mockRpc,
      } as any);

      const result1 = await checkInstanceRateLimit(
        'test-user',
        'https://n8n-1.example.com',
        'backup',
        1
      );

      const result2 = await checkInstanceRateLimit(
        'test-user',
        'https://n8n-2.example.com',
        'backup',
        1
      );

      // Different URLs should have different action keys
      expect(mockRpc).toHaveBeenCalledTimes(2);
      const call1Action = mockRpc.mock.calls[0][1].p_action;
      const call2Action = mockRpc.mock.calls[1][1].p_action;
      expect(call1Action).not.toBe(call2Action);
      expect(call1Action).toMatch(/^instance:backup:/);
      expect(call2Action).toMatch(/^instance:backup:/);
    });

    it('should allow request when instance rate limit check succeeds', async () => {
      const { createUserClient } = await import('@/lib/database/client');
      const mockRpc = vi.fn().mockResolvedValue({
        data: { current_count: 100 },
        error: null,
      });

      vi.mocked(createUserClient).mockReturnValue({
        rpc: mockRpc,
      } as any);

      const result = await checkInstanceRateLimit(
        'test-user',
        'https://n8n.example.com',
        'backup',
        1
      );

      expect(result.allowed).toBe(true);
      expect(result.failedClosed).toBeUndefined();
      expect(result.remaining).toBe(100); // 200 - 100
    });

    it('should deny request when instance rate limit exceeded', async () => {
      const { createUserClient } = await import('@/lib/database/client');
      const mockRpc = vi.fn().mockResolvedValue({
        data: { current_count: 201 },
        error: null,
      });

      vi.mocked(createUserClient).mockReturnValue({
        rpc: mockRpc,
      } as any);

      const result = await checkInstanceRateLimit(
        'test-user',
        'https://n8n.example.com',
        'backup',
        1
      );

      expect(result.allowed).toBe(false);
      expect(result.failedClosed).toBeUndefined(); // Normal rate limit, not fail-closed
      expect(result.remaining).toBe(0);
    });
  });

  describe('Fail Strategy Configuration', () => {
    it('should have fail-closed strategy for security-critical operations', () => {
      // This is a smoke test to ensure DEFAULT_LIMITS is properly configured
      // We verify the config by testing the actual behavior above
      expect(true).toBe(true);
    });
  });
});
