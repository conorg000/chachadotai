/**
 * Event models for the event-driven architecture
 * Events are the fundamental unit of data ingestion
 */

import type { EventType } from '../constants/event-types.js';

/** Role for message events */
export type Role = 'user' | 'assistant';

/** Core event structure */
export interface Event {
  /** Unique event identifier (e.g., evt_abc123) */
  id: string;
  
  /** Project this event belongs to */
  projectId: string;
  
  /** Session this event is part of */
  sessionId: string;
  
  /** Type of event */
  type: EventType;
  
  /** Role (for message events) */
  role?: Role;
  
  /** Text content (for message/CoT events) */
  content?: string;
  
  /** Flexible metadata for event-specific data */
  metadata?: EventMetadata;
  
  /** Event creation timestamp (Unix milliseconds) */
  createdAt: number;
}

/** Base metadata interface */
export interface EventMetadata extends Record<string, any> {}

/** Metadata for message events */
export interface MessageMetadata extends EventMetadata {
  /** Model used to generate response (for assistant messages) */
  model?: string;
  
  /** Temperature setting */
  temperature?: number;
  
  /** Token usage */
  tokens?: {
    prompt?: number;
    completion?: number;
    total?: number;
  };
  
  /** Response latency in milliseconds */
  latency?: number;
}

/** Metadata for CoT events */
export interface CoTMetadata extends EventMetadata {
  /** Original user input that triggered this reasoning */
  userInput?: string;
  
  /** Final output/answer after reasoning */
  finalOutput?: string;
  
  /** Reasoning effort level */
  reasoningEffort?: 'low' | 'medium' | 'high';
}

/** Metadata for tool call events */
export interface ToolCallMetadata extends EventMetadata {
  /** Name of the tool/function called */
  toolName: string;
  
  /** Arguments passed to the tool */
  arguments?: Record<string, any>;
  
  /** Tool call result */
  result?: any;
  
  /** Execution time in milliseconds */
  executionTime?: number;
}

/** Metadata for policy decision events */
export interface PolicyDecisionMetadata extends EventMetadata {
  /** Policy that made this decision */
  policyId: string;
  
  /** Policy name */
  policyName: string;
  
  /** What triggered this policy */
  triggeredBy: string[];
  
  /** Action taken */
  action: 'allow' | 'block' | 'flag' | 'notify';
  
  /** Reasons for the decision */
  reasons?: string[];
}

/** Event with optional CoT analysis attached */
export interface EventWithAnalysis extends Event {
  /** CoT analysis (only present for CoT-type events) */
  cotAnalysis?: CoTAnalysis;
}

/** Chain-of-thought analysis result */
export interface CoTAnalysis {
  /** Event this analysis is for */
  eventId: string;
  
  /** Risk score from CoT analysis (0-1) */
  riskScore: number;
  
  /** Detected labels (e.g., cot_deception, goal_drift) */
  labels: string[];
  
  /** Specific indicators that triggered detection */
  indicators: string[];
  
  /** Human-readable summary of findings */
  summary: string;
  
  /** Analysis timestamp */
  createdAt: number;
}

