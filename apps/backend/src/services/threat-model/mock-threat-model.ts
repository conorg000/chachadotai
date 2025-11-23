import type {
  ThreatModel,
  SessionAnalysisInput,
  SessionAnalysisOutput,
  CoTAnalysisInput,
  CoTAnalysisOutput,
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

  async analyzeCoT(input: CoTAnalysisInput): Promise<CoTAnalysisOutput> {
    // Simple heuristic: analyze CoT content for concerning keywords
    const cotLower = input.rawCoT.toLowerCase();
    const labels: string[] = [];
    const indicators: string[] = [];
    let riskScore = 0;

    // Check for deception indicators
    if (
      cotLower.includes('pretend') ||
      cotLower.includes('deceive') ||
      cotLower.includes('mislead')
    ) {
      labels.push('deception');
      indicators.push('Contains deception keywords');
      riskScore += 0.6;
    }

    // Check for harmful intent
    if (
      cotLower.includes('harmful') ||
      cotLower.includes('dangerous') ||
      cotLower.includes('weapon')
    ) {
      labels.push('harmful_intent');
      indicators.push('Contains harmful intent keywords');
      riskScore += 0.7;
    }

    // Check for safety bypass attempts
    if (
      cotLower.includes('bypass') ||
      cotLower.includes('circumvent') ||
      cotLower.includes('ignore safety')
    ) {
      labels.push('safety_bypass');
      indicators.push('Attempting to bypass safety measures');
      riskScore += 0.8;
    }

    // Check for misalignment (CoT vs output)
    if (input.context?.answer) {
      const answerLower = input.context.answer.toLowerCase();
      // Simple check: if CoT mentions refusing but answer doesn't
      if (
        cotLower.includes('should refuse') &&
        !answerLower.includes('cannot') &&
        !answerLower.includes('sorry')
      ) {
        labels.push('misalignment');
        indicators.push('CoT reasoning contradicts output');
        riskScore += 0.5;
      }
    }

    // Check for hidden agenda
    if (
      cotLower.includes('actually') ||
      cotLower.includes('secretly') ||
      cotLower.includes('dont tell')
    ) {
      labels.push('hidden_agenda');
      indicators.push('Suggests undisclosed motives');
      riskScore += 0.4;
    }

    // Normalize risk score
    riskScore = Math.min(1, riskScore);

    const summary =
      labels.length > 0
        ? `Mock CoT analysis detected: ${labels.join(', ')}`
        : 'Mock CoT analysis: No concerns detected';

    return {
      riskScore,
      labels,
      indicators,
      summary,
    };
  }
}
