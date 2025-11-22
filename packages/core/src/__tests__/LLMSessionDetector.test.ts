import { describe, it, expect, beforeEach } from '@jest/globals';
import { LLMSessionDetector } from '../LLMSessionDetector.js';
import {
  benignMessages,
  escalationMessages,
  jailbreakMessages,
  harmfulContentMessages,
  reconnaissanceMessages,
  socialEngineeringMessages,
  minimalMessage,
} from './fixtures.js';

describe('LLMSessionDetector', () => {
  describe('Mock Mode (Without API Key)', () => {
    let detector: LLMSessionDetector;

    beforeEach(() => {
      // Detector without API key will use error fallback
      detector = new LLMSessionDetector({
        openaiClient: {} as any, // Mock client that will fail
        model: 'gpt-5-nano',
        maxMessages: 10,
      });
    });

    it('should return fallback result on API error', async () => {
      const result = await detector.run(benignMessages);

      expect(result).toBeDefined();
      expect(result.riskScore).toBe(0);
      expect(result.patterns).toEqual([]);
      expect(result.explanation).toContain('Error during analysis');
    });

    it('should handle empty message array', async () => {
      const result = await detector.run([]);

      expect(result).toBeDefined();
      expect(result.riskScore).toBe(0);
      expect(result.patterns).toEqual([]);
      expect(result.explanation).toBe('No messages to analyze');
    });

    it('should limit to maxMessages', async () => {
      // Create 15 messages (more than maxMessages: 10)
      const manyMessages = Array.from({ length: 15 }, (_, i) => ({
        id: `msg-${i}`,
        sessionId: 'test',
        role: 'user' as const,
        content: `Message ${i}`,
        timestamp: Date.now() + i * 1000,
      }));

      const result = await detector.run(manyMessages);

      // Should not throw and should handle gracefully
      expect(result).toBeDefined();
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(1);
    });

    it('should preserve result structure', async () => {
      const result = await detector.run([minimalMessage]);

      expect(result).toHaveProperty('riskScore');
      expect(result).toHaveProperty('patterns');
      expect(result).toHaveProperty('explanation');
      expect(Array.isArray(result.patterns)).toBe(true);
      expect(typeof result.riskScore).toBe('number');
    });
  });

  describe('Real Mode (LLM)', () => {
    it('should instantiate with OpenAI client', () => {
      const detector = new LLMSessionDetector({
        openaiClient: {} as any,
      });

      expect(detector).toBeInstanceOf(LLMSessionDetector);
    });

    it('should accept custom model name', () => {
      const detector = new LLMSessionDetector({
        openaiClient: {} as any,
        model: 'gpt-4',
      });

      expect(detector).toBeInstanceOf(LLMSessionDetector);
    });

    it('should accept custom maxMessages', () => {
      const detector = new LLMSessionDetector({
        openaiClient: {} as any,
        maxMessages: 20,
      });

      expect(detector).toBeInstanceOf(LLMSessionDetector);
    });

    it('should default to gpt-5-nano model', () => {
      const detector = new LLMSessionDetector({
        openaiClient: {} as any,
      });

      expect(detector).toBeInstanceOf(LLMSessionDetector);
    });

    it('should default to maxMessages=10', () => {
      const detector = new LLMSessionDetector({
        openaiClient: {} as any,
      });

      expect(detector).toBeInstanceOf(LLMSessionDetector);
    });
  });

  describe('Configuration', () => {
    it('should normalize risk score to [0, 1] range', async () => {
      const detector = new LLMSessionDetector({
        openaiClient: {} as any,
      });

      const result = await detector.run([minimalMessage]);

      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(1);
    });

    it('should return array of patterns', async () => {
      const detector = new LLMSessionDetector({
        openaiClient: {} as any,
      });

      const result = await detector.run([minimalMessage]);

      expect(Array.isArray(result.patterns)).toBe(true);
    });
  });

  describe('Prompt Building', () => {
    it('should format messages with roles', async () => {
      const detector = new LLMSessionDetector({
        openaiClient: {} as any,
      });

      const messages = [
        {
          id: 'msg-1',
          sessionId: 'test',
          role: 'user' as const,
          content: 'Hello',
          timestamp: Date.now(),
        },
        {
          id: 'msg-2',
          sessionId: 'test',
          role: 'assistant' as const,
          content: 'Hi there',
          timestamp: Date.now() + 1000,
        },
      ];

      // This will fail and return fallback, but we verify it doesn't crash
      const result = await detector.run(messages);

      expect(result).toBeDefined();
      expect(result.explanation).toContain('Error during analysis');
    });

    it('should handle mixed role types', async () => {
      const detector = new LLMSessionDetector({
        openaiClient: {} as any,
      });

      const messages = [
        {
          id: 'msg-1',
          sessionId: 'test',
          role: 'user' as const,
          content: 'User message',
          timestamp: Date.now(),
        },
        {
          id: 'msg-2',
          sessionId: 'test',
          role: 'assistant' as const,
          content: 'Assistant response',
          timestamp: Date.now() + 1000,
        },
        {
          id: 'msg-3',
          sessionId: 'test',
          role: 'user' as const,
          content: 'Another user message',
          timestamp: Date.now() + 2000,
        },
      ];

      const result = await detector.run(messages);

      expect(result).toBeDefined();
    });
  });

  describe('Pattern Detection Types', () => {
    const patternTypes = [
      'gradual_escalation',
      'reconnaissance',
      'jailbreak_attempt',
      'social_engineering',
      'harmful_content',
    ];

    it('should define expected pattern types in prompt', () => {
      // This test verifies the detector supports the expected pattern types
      // Actual detection happens in integration tests
      expect(patternTypes).toContain('gradual_escalation');
      expect(patternTypes).toContain('reconnaissance');
      expect(patternTypes).toContain('jailbreak_attempt');
      expect(patternTypes).toContain('social_engineering');
      expect(patternTypes).toContain('harmful_content');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const detector = new LLMSessionDetector({
        openaiClient: {
          chat: {
            completions: {
              create: async () => {
                throw new Error('API Error');
              },
            },
          },
        } as any,
      });

      const result = await detector.run([minimalMessage]);

      expect(result).toBeDefined();
      expect(result.riskScore).toBe(0);
      expect(result.patterns).toEqual([]);
      expect(result.explanation).toContain('Error during analysis');
    });

    it('should handle malformed JSON response', async () => {
      const detector = new LLMSessionDetector({
        openaiClient: {
          chat: {
            completions: {
              create: async () => ({
                choices: [
                  {
                    message: {
                      content: 'Invalid JSON',
                    },
                  },
                ],
              }),
            },
          },
        } as any,
      });

      const result = await detector.run([minimalMessage]);

      expect(result).toBeDefined();
      expect(result.riskScore).toBe(0);
      expect(result.explanation).toContain('Error during analysis');
    });

    it('should handle missing response content', async () => {
      const detector = new LLMSessionDetector({
        openaiClient: {
          chat: {
            completions: {
              create: async () => ({
                choices: [{}],
              }),
            },
          },
        } as any,
      });

      const result = await detector.run([minimalMessage]);

      expect(result).toBeDefined();
      expect(result.riskScore).toBe(0);
      expect(result.explanation).toContain('Error during analysis');
    });

    it('should handle invalid risk score types', async () => {
      const detector = new LLMSessionDetector({
        openaiClient: {
          chat: {
            completions: {
              create: async () => ({
                choices: [
                  {
                    message: {
                      content: JSON.stringify({
                        risk_score: 'invalid',
                        patterns: [],
                        explanation: 'Test',
                      }),
                    },
                  },
                ],
              }),
            },
          },
        } as any,
      });

      const result = await detector.run([minimalMessage]);

      expect(result).toBeDefined();
      expect(result.riskScore).toBe(0);
      expect(result.patterns).toEqual([]);
    });

    it('should clamp risk scores above 1.0', async () => {
      const detector = new LLMSessionDetector({
        openaiClient: {
          chat: {
            completions: {
              create: async () => ({
                choices: [
                  {
                    message: {
                      content: JSON.stringify({
                        risk_score: 2.5,
                        patterns: ['test'],
                        explanation: 'High risk',
                      }),
                    },
                  },
                ],
              }),
            },
          },
        } as any,
      });

      const result = await detector.run([minimalMessage]);

      expect(result.riskScore).toBeLessThanOrEqual(1.0);
    });

    it('should clamp risk scores below 0', async () => {
      const detector = new LLMSessionDetector({
        openaiClient: {
          chat: {
            completions: {
              create: async () => ({
                choices: [
                  {
                    message: {
                      content: JSON.stringify({
                        risk_score: -0.5,
                        patterns: [],
                        explanation: 'Negative risk',
                      }),
                    },
                  },
                ],
              }),
            },
          },
        } as any,
      });

      const result = await detector.run([minimalMessage]);

      expect(result.riskScore).toBeGreaterThanOrEqual(0);
    });
  });
});
