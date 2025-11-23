/**
 * Session models for backend-persisted conversation state
 * Sessions track risk and patterns across multiple events
 */

export interface Session {
  /** Unique session identifier */
  id: string;
  
  /** Project this session belongs to */
  projectId: string;
  
  /** Session creation timestamp (Unix milliseconds) */
  createdAt: number;
  
  /** Last activity timestamp (Unix milliseconds) */
  lastActivityAt: number;
  
  /** Current risk score (0-1, where 1 is highest risk) */
  currentRiskScore: number;
  
  /** Currently detected behavioral patterns */
  currentPatterns: string[];
  
  /** Optional session metadata */
  metadata?: SessionMetadata;
}

export interface SessionMetadata {
  /** User identifier (if known) */
  userId?: string;
  
  /** IP address */
  ipAddress?: string;
  
  /** User agent */
  userAgent?: string;
  
  /** Custom tags */
  tags?: string[];
  
  /** Any additional context */
  [key: string]: any;
}

/** Summary view of a session (for lists) */
export interface SessionSummary {
  /** Session ID */
  id: string;
  
  /** Project ID */
  projectId: string;
  
  /** Current risk score */
  currentRiskScore: number;
  
  /** Current patterns */
  currentPatterns: string[];
  
  /** Last activity */
  lastActivityAt: number;
  
  /** Number of events in this session */
  eventCount: number;
}

/** Detailed session view (for single session page) */
export interface SessionDetail extends Session {
  /** Risk snapshots showing evolution over time */
  riskSnapshots: RiskSnapshot[];
  
  /** Total event count */
  eventCount: number;
  
  /** Event count by type */
  eventCountByType?: Record<string, number>;
}

/** Risk snapshot at a specific point in time */
export interface RiskSnapshot {
  /** Unique snapshot identifier */
  id: string;
  
  /** Session this snapshot belongs to */
  sessionId: string;
  
  /** Project ID */
  projectId: string;
  
  /** Event that triggered this snapshot */
  eventId: string;
  
  /** Risk score at this point */
  riskScore: number;
  
  /** Patterns detected at this point */
  patterns: string[];
  
  /** Optional explanation of why risk changed */
  explanation?: string;
  
  /** Snapshot creation timestamp */
  createdAt: number;
}

