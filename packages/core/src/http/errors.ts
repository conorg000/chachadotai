/**
 * Custom error classes for SafetyLayer SDK
 */

import type { ErrorResponse, ErrorCode } from '@safetylayer/contracts';

/**
 * Base error class for SafetyLayer API errors
 */
export class SafetyLayerError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public statusCode?: number,
    public details?: ErrorResponse
  ) {
    super(message);
    this.name = 'SafetyLayerError';
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SafetyLayerError);
    }
  }
}

/**
 * Error class for network-related failures (timeouts, connection errors, etc.)
 */
export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NetworkError);
    }
  }
}

/**
 * Error class for request validation failures
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }
}

