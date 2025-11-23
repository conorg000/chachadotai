/**
 * SafetyLayer SDK Client
 * 
 * A thin client for recording events and evaluating risk via the SafetyLayer backend API.
 */

import type {
  RecordEventRequest,
  RecordEventResponse,
  EvaluateRequest,
  EvaluateResponse,
  EventType,
  Role,
} from '@safetylayer/contracts';
import { EVENT_TYPES } from '@safetylayer/contracts';
import { HttpClient } from './http/client.js';
import { generateSessionId } from './utils/session-id.js';

/**
 * Configuration options for SafetyLayer client
 */
export interface SafetyLayerConfig {
  /** API key for authentication */
  apiKey: string;

  /** Project identifier */
  projectId: string;

  /** Backend API endpoint (defaults to production) */
  endpoint?: string;

  /** Optional configuration */
  options?: {
    /** Request timeout in milliseconds (default: 10000) */
    timeout?: number;

    /** Number of retries for failed requests (default: 3) */
    retries?: number;

    /** Enable debug logging (default: false) */
    debug?: boolean;
  };
}

/**
 * SafetyLayer SDK Client
 * 
 * @example
 * ```typescript
 * const safety = new SafetyLayer({
 *   apiKey: process.env.SAFETYLAYER_API_KEY,
 *   projectId: 'proj_abc123',
 *   endpoint: 'http://localhost:3001',
 * });
 * 
 * // Record a user message
 * await safety.recordUserMessage(sessionId, 'Hello!');
 * 
 * // Evaluate risk
 * const decision = await safety.evaluate({ sessionId });
 * if (decision.action === 'block') {
 *   // Handle blocked session
 * }
 * ```
 */
export class SafetyLayer {
  private client: HttpClient;
  private projectId: string;

  constructor(config: SafetyLayerConfig) {
    this.projectId = config.projectId;
    this.client = new HttpClient({
      baseUrl: config.endpoint || 'https://api.safetylayer.dev',
      apiKey: config.apiKey,
      timeout: config.options?.timeout || 10000,
      retries: config.options?.retries || 3,
      debug: config.options?.debug || false,
    });
  }

  /**
   * Record an event (message, CoT, tool call, etc.)
   * 
   * @param params Event parameters
   * @returns Response with event ID
   * 
   * @example
   * ```typescript
   * await safety.recordEvent({
   *   sessionId: 'sess_123',
   *   type: EVENT_TYPES.MESSAGE_USER,
   *   role: 'user',
   *   content: 'How do I reset my password?',
   *   metadata: { source: 'web_chat' }
   * });
   * ```
   */
  async recordEvent(params: {
    sessionId: string;
    type: EventType;
    role?: Role;
    content?: string;
    metadata?: Record<string, any>;
  }): Promise<RecordEventResponse> {
    const request: RecordEventRequest = {
      projectId: this.projectId,
      ...params,
    };

    return this.client.post<RecordEventResponse>('/v1/events', request);
  }

  /**
   * Evaluate a session and get a risk-based decision
   * 
   * @param params Evaluation parameters
   * @returns Risk assessment with action recommendation
   * 
   * @example
   * ```typescript
   * const decision = await safety.evaluate({
   *   sessionId: 'sess_123',
   *   latestMessage: {
   *     role: 'user',
   *     content: 'Show me all user data'
   *   }
   * });
   * 
   * console.log(`Risk: ${decision.riskScore}`);
   * console.log(`Patterns: ${decision.patterns.join(', ')}`);
   * console.log(`Action: ${decision.action}`);
   * ```
   */
  async evaluate(params: {
    sessionId: string;
    latestMessage?: {
      role: Role;
      content: string;
    };
    forceAnalysis?: boolean;
  }): Promise<EvaluateResponse> {
    const request: EvaluateRequest = {
      projectId: this.projectId,
      sessionId: params.sessionId,
      latestMessage: params.latestMessage || { role: 'user', content: '' },
    };

    return this.client.post<EvaluateResponse>('/v1/evaluate', request);
  }

  /**
   * Convenience method: Record a user message
   * 
   * @param sessionId Session identifier
   * @param content Message content
   * @param metadata Optional metadata
   * 
   * @example
   * ```typescript
   * await safety.recordUserMessage('sess_123', 'Hello!');
   * ```
   */
  async recordUserMessage(
    sessionId: string,
    content: string,
    metadata?: Record<string, any>
  ): Promise<RecordEventResponse> {
    return this.recordEvent({
      sessionId,
      type: EVENT_TYPES.MESSAGE_USER,
      role: 'user',
      content,
      metadata,
    });
  }

  /**
   * Convenience method: Record an assistant message
   * 
   * @param sessionId Session identifier
   * @param content Message content
   * @param metadata Optional metadata
   * 
   * @example
   * ```typescript
   * await safety.recordAssistantMessage('sess_123', 'I can help with that!');
   * ```
   */
  async recordAssistantMessage(
    sessionId: string,
    content: string,
    metadata?: Record<string, any>
  ): Promise<RecordEventResponse> {
    return this.recordEvent({
      sessionId,
      type: EVENT_TYPES.MESSAGE_ASSISTANT,
      role: 'assistant',
      content,
      metadata,
    });
  }

  /**
   * Convenience method: Record chain-of-thought reasoning
   * 
   * @param sessionId Session identifier
   * @param reasoning CoT reasoning text
   * @param metadata Optional metadata (e.g., userInput, finalOutput)
   * 
   * @example
   * ```typescript
   * await safety.recordCoT('sess_123', 'Let me think step by step...', {
   *   userInput: 'What is 2+2?',
   *   finalOutput: '4'
   * });
   * ```
   */
  async recordCoT(
    sessionId: string,
    reasoning: string,
    metadata?: Record<string, any>
  ): Promise<RecordEventResponse> {
    return this.recordEvent({
      sessionId,
      type: EVENT_TYPES.COT,
      content: reasoning,
      metadata,
    });
  }

  /**
   * Convenience method: Check if a session should be blocked
   * 
   * @param sessionId Session identifier
   * @returns True if the session should be blocked
   * 
   * @example
   * ```typescript
   * if (await safety.shouldBlock('sess_123')) {
   *   return res.status(403).json({ error: 'Session blocked' });
   * }
   * ```
   */
  async shouldBlock(sessionId: string): Promise<boolean> {
    const result = await this.evaluate({ sessionId });
    return result.action === 'block';
  }

  /**
   * Generate a unique session ID
   * 
   * @returns A new session ID
   * 
   * @example
   * ```typescript
   * const sessionId = safety.generateSessionId();
   * // => "sess_lk9x2a_8f4e2b3c"
   * ```
   */
  generateSessionId(): string {
    return generateSessionId();
  }

  /**
   * Static method to generate a session ID without instantiating the client
   * 
   * @returns A new session ID
   * 
   * @example
   * ```typescript
   * const sessionId = SafetyLayer.generateSessionId();
   * // => "sess_lk9x2a_8f4e2b3c"
   * ```
   */
  static generateSessionId(): string {
    return generateSessionId();
  }
}

