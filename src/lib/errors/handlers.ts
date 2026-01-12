/**
 * Error handling utilities
 */

import { NextResponse } from 'next/server';
import { FlowVaultError } from './errors';
import sentry from '@/lib/sentry';

(async () => {
  await sentry.initSentry();
})();

export interface ErrorResponse {
  error: string;
  message: string;
  code?: string;
  statusCode?: number;
  details?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Converts an error to a standardized API response
 */
export function handleApiError(error: unknown): NextResponse<ErrorResponse> {
  console.error('API Error:', error);
  // Send to Sentry for server-side visibility
  sentry.captureException(error, { location: 'handleApiError' });

  // FlowVault custom errors
  if (error instanceof FlowVaultError) {
    return NextResponse.json(
      {
        error: error.name,
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        details: error.details,
        timestamp: new Date().toISOString(),
      },
      { status: error.statusCode }
    );
  }

  // Standard JavaScript errors
  if (error instanceof Error) {
    return NextResponse.json(
      {
        error: 'InternalServerError',
        message: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }

  // Unknown error type
  return NextResponse.json(
    {
      error: 'UnknownError',
      message: 'An unknown error occurred',
      timestamp: new Date().toISOString(),
    },
    { status: 500 }
  );
}

/**
 * Safely extracts error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

/**
 * Checks if an error is a specific FlowVault error type
 */
export function isFlowVaultError(error: unknown, errorType?: typeof FlowVaultError): boolean {
  if (errorType) {
    return error instanceof errorType;
  }
  return error instanceof FlowVaultError;
}

/**
 * Logs error with context
 */
export function logError(
  error: unknown,
  context?: Record<string, unknown>
) {
  const errorInfo = {
    message: getErrorMessage(error),
    stack: error instanceof Error ? error.stack : undefined,
    context,
    timestamp: new Date().toISOString(),
  };

  console.error('Error logged:', errorInfo);

  // Send to Sentry (if configured)
  sentry.captureException(error, { context: errorInfo });
}

/**
 * Wraps async function with error handling
 */
export function withErrorHandling<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  errorHandler?: (error: unknown) => void
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (errorHandler) {
        errorHandler(error);
      } else {
        logError(error, { function: fn.name, args });
      }
      throw error;
    }
  }) as T;
}
