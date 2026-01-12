/**
 * FlowVault Error Handling
 */

export {
  FlowVaultError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  DatabaseError,
  EncryptionError,
  N8nConnectionError,
  RateLimitError,
  ConfigurationError,
} from './errors';

export {
  handleApiError,
  getErrorMessage,
  isFlowVaultError,
  logError,
  withErrorHandling,
  type ErrorResponse,
} from './handlers';
