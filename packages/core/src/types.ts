/**
 * Legacy type definitions for SafetyLayer SDK.
 *
 * For backend integration, use types from @safetylayer/contracts package.
 */

export type Role = "user" | "assistant";

export interface Message {
  id: string;
  sessionId: string;
  role: Role;
  content: string;
  timestamp: number;
  cotRecord?: CoTRecord;
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
  userInput?: string;
  finalOutput?: string;
  analysis: CoTAnalysis | null;
}
