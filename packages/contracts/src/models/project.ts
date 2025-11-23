/**
 * Project models for multi-tenant architecture
 * Each project represents a customer/tenant using SafetyLayer
 */

export interface Project {
  /** Unique project identifier (e.g., proj_abc123) */
  id: string;
  
  /** Display name of the project */
  name: string;
  
  /** Hashed API key for authentication */
  apiKeyHash: string;
  
  /** Project creation timestamp (Unix milliseconds) */
  createdAt: number;
  
  /** Optional project-specific settings */
  settings?: ProjectSettings;
}

export interface ProjectSettings {
  /** Max number of events to retain per session */
  maxEventsPerSession?: number;
  
  /** Default risk threshold for alerts */
  defaultRiskThreshold?: number;
  
  /** Enabled features for this project */
  features?: {
    cotAnalysis?: boolean;
    policyEngine?: boolean;
    webhooks?: boolean;
  };
  
  /** Custom metadata */
  metadata?: Record<string, any>;
}

/** Summary view of a project (for lists) */
export interface ProjectSummary {
  id: string;
  name: string;
  createdAt: number;
  sessionCount?: number;
  lastActivityAt?: number;
}

