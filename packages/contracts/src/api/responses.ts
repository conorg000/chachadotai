/**
 * API response type definitions
 * These are the responses returned from the backend to SDK/Dashboard
 */

import type { Session, SessionSummary, SessionDetail, RiskSnapshot } from '../models/session.js';
import type { Event, EventWithAnalysis } from '../models/event.js';
import type { Policy, PolicyDecision, PolicyAction } from '../models/policy.js';
import type { Project, ProjectSummary } from '../models/project.js';

// ============================================================================
// Public API Responses (Backend → SDK)
// ============================================================================

/** Response from recording an event */
export interface RecordEventResponse {
  /** Success flag */
  ok: boolean;
  
  /** Created event ID */
  eventId: string;
  
  /** Optional warning message */
  warning?: string;
}

/** Response from evaluate endpoint */
export interface EvaluateResponse {
  /** Current risk score for the session */
  riskScore: number;
  
  /** Detected patterns */
  patterns: string[];
  
  /** Policy decision (if any policy was triggered) */
  action: PolicyAction | null;
  
  /** Reasons for the decision */
  reasons?: string[];
  
  /** Session ID evaluated */
  sessionId: string;
  
  /** Timestamp of evaluation */
  timestamp: number;
}

// ============================================================================
// Private API Responses (Backend → Dashboard)
// ============================================================================

/** Response from listing sessions */
export interface ListSessionsResponse {
  /** Array of session summaries */
  sessions: SessionSummary[];
  
  /** Total count (for pagination) */
  total: number;
  
  /** Current offset */
  offset: number;
  
  /** Limit used */
  limit: number;
}

/** Response from getting a single session */
export interface GetSessionResponse {
  /** Full session details */
  session: SessionDetail;
}

/** Response from listing events */
export interface ListEventsResponse {
  /** Array of events (potentially with CoT analysis) */
  events: EventWithAnalysis[];
  
  /** Total count */
  total: number;
  
  /** Session ID these events belong to */
  sessionId: string;
}

// ============================================================================
// Admin API Responses (Future)
// ============================================================================

/** Response from listing projects */
export interface ListProjectsResponse {
  /** Array of project summaries */
  projects: ProjectSummary[];
  
  /** Total count */
  total: number;
}

/** Response from getting a single project */
export interface GetProjectResponse {
  /** Full project details */
  project: Project;
}

/** Response from creating a project */
export interface CreateProjectResponse {
  /** Created project */
  project: Project;
  
  /** Generated API key (plain text, only returned once) */
  apiKey: string;
}

/** Response from listing policies */
export interface ListPoliciesResponse {
  /** Array of policies */
  policies: Policy[];
  
  /** Total count */
  total: number;
}

/** Response from getting a single policy */
export interface GetPolicyResponse {
  /** Full policy details */
  policy: Policy;
}

/** Response from creating/updating a policy */
export interface PolicyMutationResponse {
  /** Created or updated policy */
  policy: Policy;
}

// ============================================================================
// Error Responses
// ============================================================================

/** Standard error response */
export interface ErrorResponse {
  /** Error flag */
  error: true;
  
  /** Error code (for programmatic handling) */
  code: string;
  
  /** Human-readable error message */
  message: string;
  
  /** Additional error details */
  details?: any;
  
  /** Request ID (for debugging) */
  requestId?: string;
}

/** Common error codes */
export const ERROR_CODES = {
  // Authentication errors (401)
  INVALID_API_KEY: 'invalid_api_key',
  MISSING_API_KEY: 'missing_api_key',
  
  // Authorization errors (403)
  INSUFFICIENT_PERMISSIONS: 'insufficient_permissions',
  PROJECT_NOT_ACCESSIBLE: 'project_not_accessible',
  
  // Validation errors (400)
  INVALID_REQUEST: 'invalid_request',
  MISSING_REQUIRED_FIELD: 'missing_required_field',
  INVALID_FIELD_VALUE: 'invalid_field_value',
  
  // Not found errors (404)
  SESSION_NOT_FOUND: 'session_not_found',
  EVENT_NOT_FOUND: 'event_not_found',
  POLICY_NOT_FOUND: 'policy_not_found',
  PROJECT_NOT_FOUND: 'project_not_found',
  
  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  
  // Server errors (500)
  INTERNAL_ERROR: 'internal_error',
  ANALYSIS_FAILED: 'analysis_failed',
  DATABASE_ERROR: 'database_error',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

