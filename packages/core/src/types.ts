/**
 * Shared type definitions for SafetyLayer
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
  userInput?: string; // Optional: the user's prompt for context
  finalOutput?: string; // Optional: the model's final answer
  analysis: CoTAnalysis | null;
}
