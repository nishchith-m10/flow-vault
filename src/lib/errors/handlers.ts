// src/lib/errors/handlers.ts
import * as Sentry from '@sentry/nextjs';
import { initializeSentry } from '../sentry/init';

// Initialize Sentry at startup
initializeSentry();

/**
 * Captures and reports an error to Sentry.
 *
 * @param error The error to capture.
 * @param context Additional context to send with the error.
 */
export function captureError(error: any, context?: any) {
  if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureException(error, { extra: context });
  } else {
    // Fallback to console.error if Sentry is not configured
    console.error('An error occurred:', error, 'Context:', context);
  }
}

/**
 * A higher-order function to wrap API handlers with error capturing.
 *
 * @param handler The Next.js API handler to wrap.
 * @returns A new handler that captures errors.
 */
export function withErrorHandling<T>(handler: (...args: any[]) => Promise<T>) {
  return async (...args: any[]): Promise<T | void> => {
    try {
      return await handler(...args);
    } catch (error) {
      captureError(error, { args });
      // Depending on the use case, you might want to re-throw the error
      // or return a specific error response.
    }
  };
}
