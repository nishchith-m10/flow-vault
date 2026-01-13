/**
 * Sentry Initialization
 * Only initializes if SENTRY_DSN is present
 */

let Sentry: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Sentry = require('@sentry/nextjs');
} catch (err) {
  // Fallback stub for environments without @sentry/nextjs installed
  Sentry = {
    init: () => {},
    withScope: (cb: (scope: any) => void) => cb({ setContext: () => {} }),
    captureException: () => {},
    captureMessage: () => {},
  };
}

let sentryInitialized = false;

/**
 * Initialize Sentry for server-side error tracking
 * Safe to call multiple times (no-op if already initialized or DSN missing)
 */
export function initSentry(): void {
  if (sentryInitialized) return;

  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

  if (!dsn) {
    console.log('[Sentry] DSN not configured, skipping initialization');
    return;
  }

  try {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      
      // Don't send errors in development unless explicitly enabled
      enabled: process.env.NODE_ENV === 'production' || process.env.SENTRY_ENABLED === 'true',
      
      // Filter out noise
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'Non-Error promise rejection captured',
      ],
      
      beforeSend(event: any, hint: any) {
        // Don't send errors containing sensitive data
        const error = hint.originalException;
        if (error instanceof Error) {
          const message = error.message.toLowerCase();
          if (
            message.includes('api_key') ||
            message.includes('password') ||
            message.includes('secret') ||
            message.includes('token')
          ) {
            console.warn('[Sentry] Blocked error containing sensitive data');
            return null;
          }
        }
        return event;
      },
    });

    sentryInitialized = true;
    console.log('[Sentry] Initialized successfully');
  } catch (error) {
    console.error('[Sentry] Failed to initialize:', error);
  }
}

/**
 * Capture exception to Sentry (no-op if not initialized)
 */
export function captureException(error: Error | unknown, context?: Record<string, unknown>): void {
  if (!sentryInitialized) {
    return; // Silent no-op
  }

  try {
    if (context) {
      Sentry.withScope((scope: any) => {
        Object.entries(context).forEach(([key, value]) => {
          scope.setContext(key, value as Record<string, unknown>);
        });
        Sentry.captureException(error);
      });
    } else {
      Sentry.captureException(error);
    }
  } catch (err) {
    console.error('[Sentry] Failed to capture exception:', err);
  }
}

/**
 * Capture message to Sentry
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
  if (!sentryInitialized) return;

  try {
    Sentry.captureMessage(message, level);
  } catch (err) {
    console.error('[Sentry] Failed to capture message:', err);
  }
}

if (typeof window === 'undefined') {
  // Server-side only
  (async () => {
    await initSentry();
  })();
}
