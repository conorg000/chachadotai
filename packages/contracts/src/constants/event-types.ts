/**
 * Event type constants for SafetyLayer
 * These represent different kinds of events that can be recorded in a session
 */

export const EVENT_TYPES = {
  // Message events (most common)
  MESSAGE_USER: 'message.user',
  MESSAGE_ASSISTANT: 'message.assistant',
  
  // Chain-of-thought event (assistant reasoning)
  COT: 'cot',
  
  // Tool/function calls (future extensibility)
  TOOL_CALL: 'tool_call',
  
  // Policy decision events (automated actions)
  POLICY_DECISION: 'policy_decision',
} as const;

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];

// Human-readable labels for event types
export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  [EVENT_TYPES.MESSAGE_USER]: 'User Message',
  [EVENT_TYPES.MESSAGE_ASSISTANT]: 'Assistant Message',
  [EVENT_TYPES.COT]: 'Chain-of-Thought',
  [EVENT_TYPES.TOOL_CALL]: 'Tool Call',
  [EVENT_TYPES.POLICY_DECISION]: 'Policy Decision',
};

