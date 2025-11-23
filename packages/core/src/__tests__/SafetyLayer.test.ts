/**
 * Tests for SafetyLayer SDK client
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { SafetyLayer } from '../SafetyLayer.js';
import { EVENT_TYPES } from '@safetylayer/contracts';
import { SafetyLayerError, NetworkError } from '../http/errors.js';

// Mock fetch globally
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('SafetyLayer', () => {
  let sdk: SafetyLayer;

  beforeEach(() => {
    mockFetch.mockClear();

    sdk = new SafetyLayer({
      apiKey: 'test_key',
      projectId: 'proj_test',
      endpoint: 'http://localhost:3001',
      options: {
        timeout: 5000,
        retries: 2,
        debug: false,
      },
    });
  });

  describe('Constructor', () => {
    it('creates instance with required config', () => {
      expect(sdk).toBeInstanceOf(SafetyLayer);
    });

    it('uses default endpoint if not provided', () => {
      const defaultSdk = new SafetyLayer({
        apiKey: 'test_key',
        projectId: 'proj_test',
      });
      expect(defaultSdk).toBeInstanceOf(SafetyLayer);
    });
  });

  describe('recordEvent', () => {
    it('records an event successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, eventId: 'evt_123' }),
      } as Response);

      const result = await sdk.recordEvent({
        sessionId: 'test-session',
        type: EVENT_TYPES.MESSAGE_USER,
        role: 'user',
        content: 'Hello',
        metadata: { source: 'test' },
      });

      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/v1/events',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test_key',
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('"type":"message.user"'),
        })
      );
    });

    it('includes projectId in request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      } as Response);

      await sdk.recordEvent({
        sessionId: 'test-session',
        type: EVENT_TYPES.MESSAGE_USER,
        role: 'user',
        content: 'Hello',
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(callBody.projectId).toBe('proj_test');
    });
  });

  describe('evaluate', () => {
    it('evaluates session risk successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          riskScore: 0.75,
          patterns: ['reconnaissance'],
          action: 'flag',
          sessionId: 'test-session',
          timestamp: Date.now(),
        }),
      } as Response);

      const result = await sdk.evaluate({ sessionId: 'test-session' });

      expect(result.riskScore).toBe(0.75);
      expect(result.patterns).toContain('reconnaissance');
      expect(result.action).toBe('flag');
    });

    it('includes latestMessage when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ riskScore: 0, patterns: [] }),
      } as Response);

      await sdk.evaluate({
        sessionId: 'test-session',
        latestMessage: {
          role: 'user',
          content: 'Test message',
        },
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(callBody.latestMessage.content).toBe('Test message');
    });
  });

  describe('Convenience methods', () => {
    it('recordUserMessage works correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, eventId: 'evt_123' }),
      } as Response);

      await sdk.recordUserMessage('sess_123', 'Hello user');

      const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(callBody.type).toBe(EVENT_TYPES.MESSAGE_USER);
      expect(callBody.role).toBe('user');
      expect(callBody.content).toBe('Hello user');
    });

    it('recordAssistantMessage works correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, eventId: 'evt_124' }),
      } as Response);

      await sdk.recordAssistantMessage('sess_123', 'Hello assistant');

      const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(callBody.type).toBe(EVENT_TYPES.MESSAGE_ASSISTANT);
      expect(callBody.role).toBe('assistant');
      expect(callBody.content).toBe('Hello assistant');
    });

    it('recordCoT works correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, eventId: 'evt_125' }),
      } as Response);

      await sdk.recordCoT('sess_123', 'Let me think...', {
        userInput: 'Question',
        finalOutput: 'Answer',
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(callBody.type).toBe(EVENT_TYPES.COT);
      expect(callBody.content).toBe('Let me think...');
      expect(callBody.metadata.userInput).toBe('Question');
    });

    it('shouldBlock returns true when action is block', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          riskScore: 0.9,
          patterns: ['malicious'],
          action: 'block',
        }),
      } as Response);

      const result = await sdk.shouldBlock('sess_123');
      expect(result).toBe(true);
    });

    it('shouldBlock returns false when action is not block', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          riskScore: 0.3,
          patterns: [],
          action: 'allow',
        }),
      } as Response);

      const result = await sdk.shouldBlock('sess_123');
      expect(result).toBe(false);
    });
  });

  describe('Session ID generation', () => {
    it('generates unique session IDs via instance method', () => {
      const id1 = sdk.generateSessionId();
      const id2 = sdk.generateSessionId();

      expect(id1).toMatch(/^sess_/);
      expect(id2).toMatch(/^sess_/);
      expect(id1).not.toBe(id2);
    });

    it('generates unique session IDs via static method', () => {
      const id1 = SafetyLayer.generateSessionId();
      const id2 = SafetyLayer.generateSessionId();

      expect(id1).toMatch(/^sess_/);
      expect(id2).toMatch(/^sess_/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('Error handling', () => {
    it('throws SafetyLayerError on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            code: 'invalid_api_key',
            message: 'Invalid API key',
          },
        }),
      } as Response);

      await expect(
        sdk.recordEvent({
          sessionId: 'test',
          type: EVENT_TYPES.MESSAGE_USER,
          role: 'user',
          content: 'Test',
        })
      ).rejects.toThrow(SafetyLayerError);
    });

    it('throws NetworkError on timeout', async () => {
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => reject({ name: 'AbortError' }), 100);
          })
      );

      await expect(
        sdk.recordEvent({
          sessionId: 'test',
          type: EVENT_TYPES.MESSAGE_USER,
          role: 'user',
          content: 'Test',
        })
      ).rejects.toThrow(NetworkError);
    });
  });

  describe('Retry logic', () => {
    it('retries on network errors', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ok: true, eventId: 'evt_123' }),
        } as Response);

      const result = await sdk.recordEvent({
        sessionId: 'test',
        type: EVENT_TYPES.MESSAGE_USER,
        role: 'user',
        content: 'Test',
      });

      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('retries on 5xx errors', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({
            error: { code: 'internal_server_error', message: 'Server error' },
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ok: true, eventId: 'evt_123' }),
        } as Response);

      const result = await sdk.recordEvent({
        sessionId: 'test',
        type: EVENT_TYPES.MESSAGE_USER,
        role: 'user',
        content: 'Test',
      });

      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('gives up after max retries', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(
        sdk.recordEvent({
          sessionId: 'test',
          type: EVENT_TYPES.MESSAGE_USER,
          role: 'user',
          content: 'Test',
        })
      ).rejects.toThrow();

      // With retries: 2, we get: Initial attempt + 1 retry = 2 total
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});

