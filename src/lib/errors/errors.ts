/**
 * Custom error classes for FlowVault
 */

export class FlowVaultError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'FlowVaultError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class AuthenticationError extends FlowVaultError {
  constructor(message: string = 'Authentication required', details?: Record<string, unknown>) {
    super(message, 'AUTH_REQUIRED', 401, details);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends FlowVaultError {
  constructor(message: string = 'Permission denied', details?: Record<string, unknown>) {
    super(message, 'PERMISSION_DENIED', 403, details);
    this.name = 'AuthorizationError';
  }
}

export class ValidationError extends FlowVaultError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends FlowVaultError {
  constructor(resource: string = 'Resource', details?: Record<string, unknown>) {
    super(`${resource} not found`, 'NOT_FOUND', 404, details);
    this.name = 'NotFoundError';
  }
}

export class DatabaseError extends FlowVaultError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'DATABASE_ERROR', 500, details);
    this.name = 'DatabaseError';
  }
}

export class EncryptionError extends FlowVaultError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'ENCRYPTION_ERROR', 500, details);
    this.name = 'EncryptionError';
  }
}

export class N8nConnectionError extends FlowVaultError {
  constructor(message: string = 'Failed to connect to n8n', details?: Record<string, unknown>) {
    super(message, 'N8N_CONNECTION_ERROR', 502, details);
    this.name = 'N8nConnectionError';
  }
}

export class RateLimitError extends FlowVaultError {
  constructor(
    message: string = 'Rate limit exceeded',
    public retryAfter?: number,
    details?: Record<string, unknown>
  ) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429, details);
    this.name = 'RateLimitError';
  }
}

export class ConfigurationError extends FlowVaultError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFIGURATION_ERROR', 500, details);
    this.name = 'ConfigurationError';
  }
}
