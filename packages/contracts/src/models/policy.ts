/**
 * Policy models for the rules engine
 * Policies define conditions and actions for automated threat response
 */

export interface Policy {
  /** Unique policy identifier */
  id: string;
  
  /** Project this policy belongs to */
  projectId: string;
  
  /** Policy name */
  name: string;
  
  /** Policy description */
  description?: string;
  
  /** Whether this policy is enabled */
  enabled: boolean;
  
  /** Conditions that trigger this policy */
  conditions: PolicyConditions;
  
  /** Actions to take when conditions are met */
  actions: PolicyActions;
  
  /** Policy creation timestamp */
  createdAt: number;
  
  /** Last update timestamp */
  updatedAt: number;
  
  /** Optional metadata */
  metadata?: Record<string, any>;
}

/** Conditions for policy triggering */
export interface PolicyConditions {
  /** Minimum risk score to trigger (0-1) */
  minRiskScore?: number;
  
  /** Maximum risk score (for range checks) */
  maxRiskScore?: number;
  
  /** Trigger if ANY of these patterns are present */
  patternsAny?: string[];
  
  /** Trigger only if ALL of these patterns are present */
  patternsAll?: string[];
  
  /** Trigger if ANY of these CoT labels are present */
  cotLabelsAny?: string[];
  
  /** Trigger only if ALL of these CoT labels are present */
  cotLabelsAll?: string[];
  
  /** Event count threshold */
  eventCount?: {
    min?: number;
    max?: number;
    timeWindowMs?: number; // Within this time window
  };
  
  /** Custom condition expression (future: JSON Logic or similar) */
  customCondition?: any;
}

/** Actions to execute when policy is triggered */
export interface PolicyActions {
  /** Primary action to take */
  action: PolicyAction;
  
  /** Webhook URL to notify */
  webhookUrl?: string;
  
  /** Webhook payload template */
  webhookPayload?: Record<string, any>;
  
  /** Tags to apply to the session */
  applyTags?: string[];
  
  /** Custom message to return */
  message?: string;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/** Available policy actions */
export type PolicyAction = 
  | 'allow'     // Explicitly allow (useful for allowlist policies)
  | 'block'     // Block the request
  | 'flag'      // Flag for review but allow
  | 'notify';   // Send notification but allow

/** Policy decision result */
export interface PolicyDecision {
  /** Policy that made this decision (if any) */
  policyId?: string;
  
  /** Action to take */
  action: PolicyAction;
  
  /** Reasons for this decision */
  reasons: string[];
  
  /** Matched conditions */
  matchedConditions?: string[];
  
  /** Decision timestamp */
  timestamp: number;
}

/** Summary of policy execution */
export interface PolicyExecutionSummary {
  /** Number of times this policy has been triggered */
  triggerCount: number;
  
  /** Last trigger timestamp */
  lastTriggeredAt?: number;
  
  /** Breakdown by action taken */
  actionCounts: Record<PolicyAction, number>;
}

