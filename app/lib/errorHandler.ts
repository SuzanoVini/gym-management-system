// lib/errorHandler.ts

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public userMessage?: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

type NotificationType = 'success' | 'error' | 'warning' | 'info';

export const errorHandler = {
  /**
   * Log an error with context information
   * @param error - The error to log
   * @param context - Additional context (function name, user action, etc.)
   */
  log: (error: unknown, context?: string) => {
    const timestamp = new Date().toISOString();
    const errorInfo = {
      timestamp,
      context,
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
              ...(error instanceof AppError && {
                code: error.code,
                userMessage: error.userMessage,
              }),
            }
          : error,
    };

    console.error('[ERROR]', errorInfo);

    // In production, send to error tracking service (Sentry, LogRocket, etc)
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { extra: { context } });
    }
  },

  /**
   * Show a notification to the user
   * @param message - The message to display
   * @param type - Type of notification (success, error, warning, info)
   */
  notify: (message: string, type: NotificationType = 'info') => {
    // TODO: Replace with proper toast notification library (react-hot-toast, sonner, etc)
    // For now, using structured alerts
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
    };

    if (typeof window !== 'undefined') {
      alert(`${icons[type]} ${message}`);
    }
  },

  /**
   * Handle an error by logging it and showing a user-friendly message
   * @param error - The error to handle
   * @param context - Additional context about where the error occurred
   */
  handle: (error: unknown, context?: string) => {
    errorHandler.log(error, context);

    let userMessage = 'An unexpected error occurred. Please try again.';

    if (error instanceof AppError) {
      userMessage = error.userMessage || error.message;
    } else if (error instanceof Error) {
      // Check for common error patterns
      if (error.message.includes('fetch')) {
        userMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message.includes('permission') || error.message.includes('denied')) {
        userMessage = 'You do not have permission to perform this action.';
      } else if (error.message.includes('duplicate')) {
        userMessage = 'This record already exists.';
      } else if (error.message.includes('not found')) {
        userMessage = 'The requested record was not found.';
      }
    }

    errorHandler.notify(userMessage, 'error');
  },

  /**
   * Wrap an async function with error handling
   * @param fn - The async function to wrap
   * @param context - Context for error logging
   * @returns Wrapped function with error handling
   */
  wrap: <T extends (...args: unknown[]) => Promise<unknown>>(fn: T, context?: string): T => {
    return (async (...args: Parameters<T>) => {
      try {
        return await fn(...args);
      } catch (error) {
        errorHandler.handle(error, context);
        throw error;
      }
    }) as T;
  },
};

/**
 * Common error factory functions
 */
export const errors = {
  validation: (field: string, message: string) =>
    new AppError(`Validation failed for ${field}: ${message}`, 'VALIDATION_ERROR', message),

  notFound: (resource: string) =>
    new AppError(
      `${resource} not found`,
      'NOT_FOUND',
      `The requested ${resource.toLowerCase()} was not found.`
    ),

  database: (operation: string, details?: string) =>
    new AppError(
      `Database ${operation} failed: ${details}`,
      'DATABASE_ERROR',
      `Failed to ${operation}. Please try again.`
    ),

  network: () =>
    new AppError(
      'Network request failed',
      'NETWORK_ERROR',
      'Network error. Please check your connection and try again.'
    ),

  permission: (action: string) =>
    new AppError(
      `Permission denied for ${action}`,
      'PERMISSION_ERROR',
      'You do not have permission to perform this action.'
    ),
};
