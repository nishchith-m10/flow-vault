/**
 * Lightweight Sentry initializer for server-side error reporting
 * Reads SENTRY_DSN from env and initializes Sentry only when present.
 * Exports `captureException` and `withScope` helpers that are safe no-ops when Sentry not configured.
 */
let Sentry: {
  init: (config: { dsn: string; environment: string }) => void;
  captureException: (error: unknown) => void;
  withScope: (callback: (scope: { setExtra: (key: string, value: unknown) => void }) => void) => void;
} | null = null;
let initialized = false;

export async function initSentry() {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    // No DSN configured — keep functions as no-ops
    return;
  }

  try {
    // Dynamically import to avoid adding hard dep in browser bundles
    // Install @sentry/node in production to enable reporting
    Sentry = await import('@sentry/node');
    Sentry.init({ dsn, environment: process.env.NODE_ENV || 'development' });
    initialized = true;
  } catch (err) {
    // Fail quietly and leave capture as no-op
    console.warn('Sentry init failed:', err instanceof Error ? err.message : err);
  }
}

export function captureException(err: unknown, context?: Record<string, unknown>) {
  if (!initialized || !Sentry) return;
  try {
    if (context) {
      Sentry.withScope((scope) => {
        Object.entries(context).forEach(([k, v]) => scope.setExtra(k, v));
        Sentry.captureException(err);
      });
    } else {
      Sentry.captureException(err);
    }
  } catch (e) {
    // swallow errors to avoid cascading failures
    console.warn('Sentry capture failed', e instanceof Error ? e.message : e);
  }
}

const sentry = {
  initSentry,
  captureException,
};

export default sentry;