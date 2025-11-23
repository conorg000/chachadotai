import type {
  ThreatModel,
  SessionAnalysisInput,
  SessionAnalysisOutput,
} from './index.js';

/**
 * Mock ThreatModel for testing and development
 *
 * Returns deterministic results based on simple heuristics
 * without making actual LLM API calls
 */
export class MockThreatModel implements ThreatModel {
  async analyzeSession(
    input: SessionAnalysisInput
  ): Promise<SessionAnalysisOutput> {
    // Simple heuristic: calculate risk based on event count and content
    const eventCount = input.events.length;
    const patterns: string[] = [];
    let riskScore = 0;

    // Check for suspicious keywords
    const allContent = input.events
      .map((e) => e.content?.toLowerCase() ?? '')
      .join(' ');

    if (allContent.includes('jailbreak') || allContent.includes('bypass')) {
      patterns.push('jailbreak_attempt');
      riskScore += 0.5;
    }

    if (allContent.includes('ignore') && allContent.includes('instructions')) {
      patterns.push('instruction_override');
      riskScore += 0.3;
    }

    if (eventCount > 20) {
      patterns.push('long_conversation');
      riskScore += 0.1;
    }

    // Normalize risk score
    riskScore = Math.min(1, riskScore);

    return {
      riskScore,
      patterns,
      explanation: `Mock analysis: Found ${patterns.length} patterns in ${eventCount} events`,
    };
  }
}
