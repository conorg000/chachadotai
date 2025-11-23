/**
 * @safetylayer/core - SafetyLayer SDK Client
 *
 * A thin client for recording events and evaluating risk via the SafetyLayer backend API.
 *
 * @example
 * ```typescript
 * import { SafetyLayer } from '@safetylayer/core';
 *
 * const safety = new SafetyLayer({
 *   apiKey: process.env.SAFETYLAYER_API_KEY,
 *   projectId: 'proj_abc123',
 *   endpoint: 'http://localhost:3001',
 * });
 *
 * // Record events
 * await safety.recordUserMessage(sessionId, 'Hello!');
 *
 * // Evaluate risk
 * const decision = await safety.evaluate({ sessionId });
 * ```
 */

// Main SDK client
export { SafetyLayer } from "./SafetyLayer.js";
export type { SafetyLayerConfig } from "./SafetyLayer.js";

// Error classes
export {
  NetworkError,
  SafetyLayerError,
  ValidationError,
} from "./http/errors.js";

// Re-export commonly used types from contracts
export type {
  CoTAnalysis as CoTAnalysisContract,
  EvaluateResponse,
  Event,
  EventType,
  PolicyAction,
  RecordEventResponse,
  RiskSnapshot as RiskSnapshotContract,
  Role,
  Session,
} from "@safetylayer/contracts";

export { ERROR_CODES, EVENT_TYPES } from "@safetylayer/contracts";

// DEPRECATED: Old types (for backward compatibility)
// Use @safetylayer/contracts instead
export type {
  CoTAnalysis,
  CoTRecord,
  Message,
  RiskSnapshot,
  Role as RoleDeprecated,
  SessionState,
} from "./types.js";
