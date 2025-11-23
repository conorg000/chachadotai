/**
 * API request type definitions
 * These are the payloads sent from SDK/Dashboard to the backend
 */

import type { EventType } from '../constants/event-types.js';
import type { Role } from '../models/event.js';
import type { PolicyConditions, PolicyActions } from '../models/policy.js';

// ============================================================================
// Public API Requests (SDK → Backend)
// ============================================================================

/** Request to record a new event */
export interface RecordEventRequest {
  /** Project identifier */
  projectId: string;
  
  /** Session identifier */
  sessionId: string;
  
  /** Event type */
  type: EventType;
  
  /** Role (for message events) */
  role?: Role;
  
  /** Content (for message/CoT events) */
  content?: string;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/** Request to evaluate a session and get a decision */
export interface EvaluateRequest {
  /** Project identifier */
  projectId: string;
  
  /** Session to evaluate */
  sessionId: string;
  
  /** Latest message to consider (optional, may already be in session) */
  latestMessage?: {
    role: Role;
    content: string;
  };
  
  /** Whether to force re-analysis (default: false) */
  forceAnalysis?: boolean;
}

// ============================================================================
// Private API Requests (Dashboard → Backend)
// ============================================================================

/** Query parameters for listing sessions */
export interface ListSessionsQuery {
  /** Project to filter by */
  projectId: string;
  
  /** Maximum number of results */
  limit?: number;
  
  /** Offset for pagination */
  offset?: number;
  
  /** Filter by minimum risk score */
  minRiskScore?: number;
  
  /** Filter by maximum risk score */
  maxRiskScore?: number;
  
  /** Filter by patterns (any match) */
  patterns?: string[];
  
  /** Sort field */
  sortBy?: 'riskScore' | 'lastActivityAt' | 'createdAt';
  
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
}

/** Query parameters for listing events */
export interface ListEventsQuery {
  /** Session to get events for */
  sessionId: string;
  
  /** Project ID (for auth) */
  projectId: string;
  
  /** Filter by event types */
  types?: EventType[];
  
  /** Maximum number of results */
  limit?: number;
  
  /** Offset for pagination */
  offset?: number;
  
  /** Get events after this timestamp */
  after?: number;
  
  /** Get events before this timestamp */
  before?: number;
}

// ============================================================================
// Admin API Requests (Future)
// ============================================================================

/** Request to create a new project */
export interface CreateProjectRequest {
  /** Project name */
  name: string;
  
  /** Optional settings */
  settings?: {
    maxEventsPerSession?: number;
    defaultRiskThreshold?: number;
  };
}

/** Request to create a new policy */
export interface CreatePolicyRequest {
  /** Project ID */
  projectId: string;
  
  /** Policy name */
  name: string;
  
  /** Policy description */
  description?: string;
  
  /** Policy conditions */
  conditions: PolicyConditions;
  
  /** Policy actions */
  actions: PolicyActions;
  
  /** Whether policy starts enabled */
  enabled?: boolean;
}

/** Request to update a policy */
export interface UpdatePolicyRequest {
  /** New name (optional) */
  name?: string;
  
  /** New description (optional) */
  description?: string;
  
  /** New conditions (optional) */
  conditions?: PolicyConditions;
  
  /** New actions (optional) */
  actions?: PolicyActions;
  
  /** Enable/disable (optional) */
  enabled?: boolean;
}

