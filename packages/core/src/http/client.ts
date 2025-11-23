/**
 * HTTP client with retry logic and validation for SafetyLayer SDK
 */

import {
  RecordEventRequestSchema,
  EvaluateRequestSchema,
  validate,
  formatValidationError,
  ERROR_CODES,
  type ErrorResponse,
} from '@safetylayer/contracts';
import { SafetyLayerError, NetworkError, ValidationError } from './errors.js';

export interface HttpClientConfig {
  baseUrl: string;
  apiKey: string;
  timeout: number;
  retries: number;
  debug: boolean;
}

/**
 * HTTP client for SafetyLayer API with automatic retry and validation
 */
export class HttpClient {
  constructor(private config: HttpClientConfig) {}

  /**
   * Make a POST request with automatic validation and retry
   */
  async post<T>(path: string, body: any): Promise<T> {
    // Validate request body using contracts schemas
    if (path === '/v1/events') {
      const result = validate(RecordEventRequestSchema, body);
      if (!result.success) {
        throw new ValidationError(formatValidationError(result.error));
      }
    } else if (path === '/v1/evaluate') {
      const result = validate(EvaluateRequestSchema, body);
      if (!result.success) {
        throw new ValidationError(formatValidationError(result.error));
      }
    }

    // Make request with retry logic
    return this.requestWithRetry<T>('POST', path, body);
  }

  /**
   * Make a GET request with automatic retry
   */
  async get<T>(path: string): Promise<T> {
    return this.requestWithRetry<T>('GET', path);
  }

  /**
   * Execute a request with exponential backoff retry
   */
  private async requestWithRetry<T>(
    method: string,
    path: string,
    body?: any,
    attempt = 1
  ): Promise<T> {
    try {
      return await this.makeRequest<T>(method, path, body);
    } catch (error) {
      if (this.shouldRetry(error, attempt)) {
        const delay = this.getBackoffDelay(attempt);
        if (this.config.debug) {
          console.log(
            `[SafetyLayer] Retry ${attempt}/${this.config.retries} after ${delay}ms`
          );
        }
        await this.sleep(delay);
        return this.requestWithRetry<T>(method, path, body, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Make the actual HTTP request
   */
  private async makeRequest<T>(
    method: string,
    path: string,
    body?: any
  ): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      };

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorData: ErrorResponse;
        try {
          errorData = (await response.json()) as ErrorResponse;
        } catch {
          // If response isn't JSON, create a generic error
          errorData = {
            error: true,
            code: 'internal_error',
            message: `HTTP ${response.status}: ${response.statusText}`,
          };
        }

        throw new SafetyLayerError(
          errorData.message || 'Unknown error',
          errorData.code as any,
          response.status,
          errorData
        );
      }

      const data = (await response.json()) as T;
      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new NetworkError(`Request timeout after ${this.config.timeout}ms`);
      }

      if (error instanceof SafetyLayerError) {
        throw error;
      }

      throw new NetworkError(error.message || 'Network request failed');
    }
  }

  /**
   * Determine if the error is retryable
   */
  private shouldRetry(error: any, attempt: number): boolean {
    if (attempt >= this.config.retries) {
      return false;
    }

    // Retry on network errors
    if (error instanceof NetworkError) {
      return true;
    }

    // Retry on rate limits
    if (
      error instanceof SafetyLayerError &&
      error.code === ERROR_CODES.RATE_LIMIT_EXCEEDED
    ) {
      return true;
    }

    // Retry on 5xx errors
    if (
      error instanceof SafetyLayerError &&
      error.statusCode &&
      error.statusCode >= 500
    ) {
      return true;
    }

    return false;
  }

  /**
   * Calculate exponential backoff delay
   */
  private getBackoffDelay(attempt: number): number {
    // Exponential backoff: 1s, 2s, 4s
    return Math.min(1000 * Math.pow(2, attempt - 1), 4000);
  }

  /**
   * Sleep for a given number of milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

