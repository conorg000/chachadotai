/**
 * @safetylayer/core
 *
 * Core library for session-aware behavioral security and Chain-of-Thought monitoring.
 */

// Export all types
export type {
  Role,
  Message,
  RiskSnapshot,
  SessionState,
  CoTAnalysis,
  CoTRecord
} from './types.js';

// Export SessionEngine
export { SessionEngine } from './SessionEngine.js';
export type { SessionEngineOptions } from './SessionEngine.js';

// Export LLMSessionDetector
export { LLMSessionDetector } from './LLMSessionDetector.js';
export type {
  SessionDetectorResult,
  LLMSessionDetectorOptions
} from './LLMSessionDetector.js';

// Export CoTMonitor
export { CoTMonitor } from './CoTMonitor.js';
export type { CoTMonitorOptions } from './CoTMonitor.js';

