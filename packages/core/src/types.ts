/**
 * Shared type definitions for SafetyLayer
 */

export type Role = 'user' | 'assistant';

export interface Message {
  id: string;
  sessionId: string;
  role: Role;
  content: string;
  timestamp: number;
}

export interface RiskSnapshot {
  atMessageId: string;
  riskScore: number;
  patterns: string[];
}

export interface SessionState {
  sessionId: string;
  messages: Message[];
  riskScore: number;
  patterns: string[];
  timeline: RiskSnapshot[];
}

export interface CoTAnalysis {
  riskScore: number;
  labels: string[];
  indicators: string[];
  summary: string;
}

export interface CoTRecord {
  messageId: string;
  sessionId: string;
  rawCoT: string;
  analysis: CoTAnalysis | null;
}

