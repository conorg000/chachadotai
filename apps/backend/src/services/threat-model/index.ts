import type { Event } from '@safetylayer/contracts';

/**
 * Input for session-level threat analysis
 */
export interface SessionAnalysisInput {
  projectId: string;
  sessionId: string;
  events: Event[];
}

/**
 * Output from session-level threat analysis
 */
export interface SessionAnalysisOutput {
  riskScore: number; // 0-1
  patterns: string[];
  explanation?: string;
}

/**
 * Input for CoT (Chain-of-Thought) analysis
 */
export interface CoTAnalysisInput {
  projectId: string;
  sessionId: string;
  eventId: string; // the CoT event ID
  rawCoT: string; // raw chain-of-thought content
  context?: {
    lastUserMessage?: string;
    answer?: string;
  };
}

/**
 * Output from CoT analysis
 */
export interface CoTAnalysisOutput {
  riskScore: number; // 0-1
  labels: string[]; // e.g., ['deception', 'harmful_intent']
  indicators: string[]; // specific concerning phrases or patterns
  summary: string; // brief summary of the analysis
}

/**
 * Abstract interface for threat detection models
 *
 * This allows swapping between different LLM providers
 * (OpenAI, OSS models, etc.) without changing analysis logic
 */
export interface ThreatModel {
  /**
   * Analyze a session for potential security threats
   */
  analyzeSession(input: SessionAnalysisInput): Promise<SessionAnalysisOutput>;

  /**
   * Analyze a chain-of-thought for deception or harmful intent
   */
  analyzeCoT(input: CoTAnalysisInput): Promise<CoTAnalysisOutput>;
}
