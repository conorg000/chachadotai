/**
 * Zod validation schemas for API requests
 * Used by both SDK (client-side) and backend (server-side) for validation
 */

import { z } from 'zod';
import { EVENT_TYPES } from '../constants/event-types.js';

// ============================================================================
// Base schemas
// ============================================================================

export const RoleSchema = z.enum(['user', 'assistant']);

export const EventTypeSchema = z.enum([
  EVENT_TYPES.MESSAGE_USER,
  EVENT_TYPES.MESSAGE_ASSISTANT,
  EVENT_TYPES.COT,
  EVENT_TYPES.TOOL_CALL,
  EVENT_TYPES.POLICY_DECISION,
]);

export const PolicyActionSchema = z.enum(['allow', 'block', 'flag', 'notify']);

// ID patterns
const projectIdPattern = /^proj_[a-zA-Z0-9]+$/;
const sessionIdPattern = /^[a-zA-Z0-9_-]+$/;

export const ProjectIdSchema = z.string().regex(projectIdPattern, 'Invalid project ID format');
export const SessionIdSchema = z.string().regex(sessionIdPattern, 'Invalid session ID format').min(1).max(255);

// ============================================================================
// Public API Schemas (SDK → Backend)
// ============================================================================

export const RecordEventRequestSchema = z.object({
  projectId: ProjectIdSchema,
  sessionId: SessionIdSchema,
  type: EventTypeSchema,
  role: RoleSchema.optional(),
  content: z.string().max(50000).optional(),
  metadata: z.record(z.any()).optional(),
}).refine(
  (data) => {
    // Message events must have content
    if (data.type.startsWith('message.') && !data.content) {
      return false;
    }
    // Message events must have role
    if (data.type.startsWith('message.') && !data.role) {
      return false;
    }
    return true;
  },
  {
    message: 'Message events must have both content and role',
  }
);

export const EvaluateRequestSchema = z.object({
  projectId: ProjectIdSchema,
  sessionId: SessionIdSchema,
  latestMessage: z.object({
    role: RoleSchema,
    content: z.string().max(50000),
  }).optional(),
  forceAnalysis: z.boolean().optional(),
});

// ============================================================================
// Private API Schemas (Dashboard → Backend)
// ============================================================================

export const ListSessionsQuerySchema = z.object({
  projectId: ProjectIdSchema,
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  minRiskScore: z.coerce.number().min(0).max(1).optional(),
  maxRiskScore: z.coerce.number().min(0).max(1).optional(),
  patterns: z.string().transform(s => s.split(',')).optional(),
  sortBy: z.enum(['riskScore', 'lastActivityAt', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const ListEventsQuerySchema = z.object({
  sessionId: SessionIdSchema,
  projectId: ProjectIdSchema,
  types: z.string().transform(s => s.split(',')).optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  after: z.coerce.number().int().optional(),
  before: z.coerce.number().int().optional(),
});

// ============================================================================
// Admin API Schemas (Future)
// ============================================================================

export const PolicyConditionsSchema = z.object({
  minRiskScore: z.number().min(0).max(1).optional(),
  maxRiskScore: z.number().min(0).max(1).optional(),
  patternsAny: z.array(z.string()).optional(),
  patternsAll: z.array(z.string()).optional(),
  cotLabelsAny: z.array(z.string()).optional(),
  cotLabelsAll: z.array(z.string()).optional(),
  eventCount: z.object({
    min: z.number().int().optional(),
    max: z.number().int().optional(),
    timeWindowMs: z.number().int().optional(),
  }).optional(),
  customCondition: z.any().optional(),
});

export const PolicyActionsSchema = z.object({
  action: PolicyActionSchema,
  webhookUrl: z.string().url().optional(),
  webhookPayload: z.record(z.any()).optional(),
  applyTags: z.array(z.string()).optional(),
  message: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export const CreateProjectRequestSchema = z.object({
  name: z.string().min(1).max(255),
  settings: z.object({
    maxEventsPerSession: z.number().int().min(10).max(10000).optional(),
    defaultRiskThreshold: z.number().min(0).max(1).optional(),
  }).optional(),
});

export const CreatePolicyRequestSchema = z.object({
  projectId: ProjectIdSchema,
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  conditions: PolicyConditionsSchema,
  actions: PolicyActionsSchema,
  enabled: z.boolean().optional(),
});

export const UpdatePolicyRequestSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  conditions: PolicyConditionsSchema.optional(),
  actions: PolicyActionsSchema.optional(),
  enabled: z.boolean().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

// ============================================================================
// Helper functions
// ============================================================================

/** Type-safe validation helper */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/** Get formatted error message from Zod error */
export function formatValidationError(error: z.ZodError): string {
  return error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('; ');
}

