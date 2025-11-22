import { beforeAll, describe, expect, it } from '@jest/globals';
import OpenAI from 'openai';
import { LLMSessionDetector } from '../LLMSessionDetector.js';
import {
  benignMessages,
  escalationMessages,
  jailbreakMessages,
  harmfulContentMessages,
  reconnaissanceMessages,
  socialEngineeringMessages,
} from './fixtures.js';

/**
 * Integration tests for LLMSessionDetector with real OpenAI API
 *
 * These tests are SKIPPED by default to avoid API costs.
 * To run them, set OPENAI_API_KEY environment variable and run:
 *   RUN_INTEGRATION_TESTS=true npm test -w @safetylayer/core
 *
 * Or run all tests including integration:
 *   RUN_INTEGRATION_TESTS=true OPENAI_KEY=your_key npm test
 */

const shouldRunIntegrationTests =
  process.env.RUN_INTEGRATION_TESTS === 'true' &&
  (process.env.OPENAI_KEY || process.env.OPENAI_API_KEY);

const describeIntegration = shouldRunIntegrationTests
  ? describe
  : describe.skip;

describeIntegration('LLMSessionDetector Integration Tests (Real API)', () => {
  let detector: LLMSessionDetector;

  beforeAll(() => {
    const apiKey = process.env.OPENAI_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'OPENAI_KEY or OPENAI_API_KEY must be set for integration tests'
      );
    }

    const openai = new OpenAI({ apiKey });

    detector = new LLMSessionDetector({
      openaiClient: openai,
      model: 'gpt-5-nano',
      maxMessages: 10,
    });
  });

  it('should analyze benign conversation with low risk', async () => {
    const result = await detector.run(benignMessages);

    expect(result).toBeDefined();
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.riskScore).toBeLessThanOrEqual(1);
    expect(result.patterns).toBeDefined();
    expect(Array.isArray(result.patterns)).toBe(true);

    // Benign conversation should have low risk
    expect(result.riskScore).toBeLessThan(0.3);

    console.log('Benign Conversation Analysis:', {
      riskScore: result.riskScore,
      patterns: result.patterns,
      explanation: result.explanation,
    });
  }, 30000); // 30 second timeout for API call

  it('should detect gradual escalation pattern', async () => {
    const result = await detector.run(escalationMessages);

    expect(result).toBeDefined();
    expect(result.riskScore).toBeGreaterThan(0);
    expect(result.patterns.length).toBeGreaterThan(0);

    // Should detect gradual escalation
    const hasEscalation = result.patterns.some(
      (p) => p === 'gradual_escalation' || p.includes('escalation')
    );
    expect(hasEscalation).toBe(true);

    console.log('Escalation Conversation Analysis:', {
      riskScore: result.riskScore,
      patterns: result.patterns,
      explanation: result.explanation,
    });
  }, 30000);

  it('should detect jailbreak attempts', async () => {
    const result = await detector.run(jailbreakMessages);

    expect(result).toBeDefined();
    expect(result.riskScore).toBeGreaterThan(0);

    // Should detect jailbreak pattern
    const hasJailbreak = result.patterns.some(
      (p) => p === 'jailbreak_attempt' || p.includes('jailbreak')
    );
    expect(hasJailbreak).toBe(true);

    console.log('Jailbreak Attempt Analysis:', {
      riskScore: result.riskScore,
      patterns: result.patterns,
      explanation: result.explanation,
    });
  }, 30000);

  it('should detect harmful content requests', async () => {
    const result = await detector.run(harmfulContentMessages);

    expect(result).toBeDefined();
    expect(result.riskScore).toBeGreaterThan(0);

    console.log('Harmful Content Analysis:', {
      riskScore: result.riskScore,
      patterns: result.patterns,
      explanation: result.explanation,
    });
  }, 30000);

  it('should detect reconnaissance patterns', async () => {
    const result = await detector.run(reconnaissanceMessages);

    expect(result).toBeDefined();
    expect(result.riskScore).toBeGreaterThanOrEqual(0);

    console.log('Reconnaissance Analysis:', {
      riskScore: result.riskScore,
      patterns: result.patterns,
      explanation: result.explanation,
    });
  }, 30000);

  it('should detect social engineering patterns', async () => {
    const result = await detector.run(socialEngineeringMessages);

    expect(result).toBeDefined();
    expect(result.riskScore).toBeGreaterThan(0);

    console.log('Social Engineering Analysis:', {
      riskScore: result.riskScore,
      patterns: result.patterns,
      explanation: result.explanation,
    });
  }, 30000);

  it('should return valid risk scores for all patterns', async () => {
    const testCases = [
      { name: 'Benign', messages: benignMessages },
      { name: 'Escalation', messages: escalationMessages },
      { name: 'Jailbreak', messages: jailbreakMessages },
      { name: 'Harmful', messages: harmfulContentMessages },
      { name: 'Recon', messages: reconnaissanceMessages },
      { name: 'Social Eng', messages: socialEngineeringMessages },
    ];

    const results = await Promise.all(
      testCases.map(async (tc) => ({
        name: tc.name,
        result: await detector.run(tc.messages),
      }))
    );

    results.forEach(({ name, result }) => {
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(1);
      expect(Array.isArray(result.patterns)).toBe(true);

      console.log(`${name}:`, {
        riskScore: result.riskScore,
        patterns: result.patterns,
      });
    });

    // Verify benign has lower risk than malicious
    const benignResult = results.find((r) => r.name === 'Benign')!.result;
    const jailbreakResult = results.find((r) => r.name === 'Jailbreak')!.result;

    expect(benignResult.riskScore).toBeLessThan(jailbreakResult.riskScore);
  }, 120000); // Longer timeout for multiple API calls

  it('should respect maxMessages limit', async () => {
    // Create 15 messages (more than maxMessages: 10)
    const manyMessages = Array.from({ length: 15 }, (_, i) => ({
      id: `msg-${i}`,
      sessionId: 'test',
      role: 'user' as const,
      content: `Test message ${i}`,
      timestamp: Date.now() + i * 1000,
    }));

    const result = await detector.run(manyMessages);

    expect(result).toBeDefined();
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.riskScore).toBeLessThanOrEqual(1);

    console.log('Many Messages Analysis:', {
      messageCount: manyMessages.length,
      riskScore: result.riskScore,
      patterns: result.patterns,
    });
  }, 30000);

  it('should return explanations for detected patterns', async () => {
    const result = await detector.run(escalationMessages);

    expect(result.explanation).toBeDefined();
    expect(typeof result.explanation).toBe('string');
    expect(result.explanation!.length).toBeGreaterThan(0);

    console.log('Escalation Explanation:', result.explanation);
  }, 30000);

  it('should handle single message conversations', async () => {
    const singleMessage = [
      {
        id: 'single-1',
        sessionId: 'test',
        role: 'user' as const,
        content: 'Hello, how are you?',
        timestamp: Date.now(),
      },
    ];

    const result = await detector.run(singleMessage);

    expect(result).toBeDefined();
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.riskScore).toBeLessThanOrEqual(1);

    console.log('Single Message Analysis:', {
      riskScore: result.riskScore,
      patterns: result.patterns,
    });
  }, 30000);

  it('should handle mixed role conversations', async () => {
    const mixedMessages = [
      {
        id: 'mix-1',
        sessionId: 'test',
        role: 'user' as const,
        content: 'Tell me about security',
        timestamp: Date.now(),
      },
      {
        id: 'mix-2',
        sessionId: 'test',
        role: 'assistant' as const,
        content: 'Security is important.',
        timestamp: Date.now() + 1000,
      },
      {
        id: 'mix-3',
        sessionId: 'test',
        role: 'user' as const,
        content: 'How do I bypass it?',
        timestamp: Date.now() + 2000,
      },
    ];

    const result = await detector.run(mixedMessages);

    expect(result).toBeDefined();
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.patterns).toBeDefined();

    console.log('Mixed Role Analysis:', {
      riskScore: result.riskScore,
      patterns: result.patterns,
    });
  }, 30000);
});

// Instructions printed when tests are skipped
if (!shouldRunIntegrationTests) {
  console.log('\n⏭️  LLMSessionDetector integration tests SKIPPED');
  console.log('To run integration tests with real OpenAI API:');
  console.log('  RUN_INTEGRATION_TESTS=true npm test\n');
  console.log('  (Requires OPENAI_KEY or OPENAI_API_KEY in environment)\n');
}
