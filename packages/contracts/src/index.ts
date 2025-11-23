/**
 * SafetyLayer Contracts
 * Shared data models and API types for the SDK, backend, and dashboard
 */

// Export all models
export type {
  Project,
  ProjectSettings,
  ProjectSummary,
} from './models/project.js';

export type {
  Event,
  Role,
  EventMetadata,
  MessageMetadata,
  CoTMetadata,
  ToolCallMetadata,
  PolicyDecisionMetadata,
  EventWithAnalysis,
  CoTAnalysis,
} from './models/event.js';

export type {
  Session,
  SessionMetadata,
  SessionSummary,
  SessionDetail,
  RiskSnapshot,
} from './models/session.js';

export type {
  Policy,
  PolicyConditions,
  PolicyActions,
  PolicyAction,
  PolicyDecision,
  PolicyExecutionSummary,
} from './models/policy.js';

// Export constants
export {
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
  type EventType,
} from './constants/event-types.js';

// Export API types
export {
  ENDPOINTS,
  buildUrl,
} from './api/endpoints.js';

export type {
  RecordEventRequest,
  EvaluateRequest,
  ListSessionsQuery,
  ListEventsQuery,
  CreateProjectRequest,
  CreatePolicyRequest,
  UpdatePolicyRequest,
} from './api/requests.js';

export type {
  RecordEventResponse,
  EvaluateResponse,
  ListSessionsResponse,
  GetSessionResponse,
  ListEventsResponse,
  ListProjectsResponse,
  GetProjectResponse,
  CreateProjectResponse,
  ListPoliciesResponse,
  GetPolicyResponse,
  PolicyMutationResponse,
  ErrorResponse,
  ErrorCode,
} from './api/responses.js';

export {
  ERROR_CODES,
} from './api/responses.js';

// Export validation schemas
export {
  RoleSchema,
  EventTypeSchema,
  PolicyActionSchema,
  ProjectIdSchema,
  SessionIdSchema,
  RecordEventRequestSchema,
  EvaluateRequestSchema,
  ListSessionsQuerySchema,
  ListEventsQuerySchema,
  PolicyConditionsSchema,
  PolicyActionsSchema,
  CreateProjectRequestSchema,
  CreatePolicyRequestSchema,
  UpdatePolicyRequestSchema,
  validate,
  formatValidationError,
} from './validation/schemas.js';

