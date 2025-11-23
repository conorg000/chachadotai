import { Pool } from 'pg';
import type { 
  Policy, 
  PolicyAction, 
  PolicyConditions,
  RiskSnapshot 
} from '@safetylayer/contracts';

/**
 * Context for policy evaluation
 */
export interface PolicyContext {
  projectId: string;
  sessionId: string;
  currentRiskScore: number;
  currentPatterns: string[];
  latestSnapshot?: RiskSnapshot;
  eventCount?: number;
  cotLabels?: string[];
}

/**
 * Policy evaluation decision
 */
export interface PolicyEvaluationResult {
  action: PolicyAction;
  reasons: string[];
  triggeredPolicies: string[];
  riskScore: number;
  patterns: string[];
}

/**
 * Policy Engine Service
 * Evaluates policies against session context and determines actions
 */
export class PolicyEngine {
  constructor(private db: Pool) {}

  /**
   * Evaluate all enabled policies for a project against current context
   */
  async evaluate(ctx: PolicyContext): Promise<PolicyEvaluationResult> {
    // Fetch enabled policies for project
    const policies = await this.getPoliciesForProject(ctx.projectId);

    // Find all matching policies
    const matchedPolicies: Array<{ policy: Policy; reasons: string[] }> = [];

    for (const policy of policies) {
      const reasons = this.matchesConditions(policy, ctx);
      if (reasons.length > 0) {
        matchedPolicies.push({ policy, reasons });
      }
    }

    // Determine highest priority action
    const action = this.determineAction(matchedPolicies.map(m => m.policy));

    // Collect all reasons and triggered policy IDs
    const allReasons: string[] = [];
    const triggeredPolicyIds: string[] = [];

    for (const { policy, reasons } of matchedPolicies) {
      triggeredPolicyIds.push(policy.id);
      allReasons.push(`Policy "${policy.name}": ${reasons.join(', ')}`);
    }

    return {
      action,
      reasons: allReasons.length > 0 ? allReasons : ['No policies triggered'],
      triggeredPolicies: triggeredPolicyIds,
      riskScore: ctx.currentRiskScore,
      patterns: ctx.currentPatterns,
    };
  }

  /**
   * Fetch all enabled policies for a project
   */
  async getPoliciesForProject(projectId: string): Promise<Policy[]> {
    const result = await this.db.query(
      `SELECT 
        id,
        project_id as "projectId",
        name,
        enabled,
        conditions,
        actions,
        EXTRACT(EPOCH FROM created_at) * 1000 as "createdAt",
        EXTRACT(EPOCH FROM updated_at) * 1000 as "updatedAt"
      FROM policies
      WHERE project_id = $1 AND enabled = true
      ORDER BY created_at ASC`,
      [projectId]
    );

    return result.rows;
  }

  /**
   * Check if a policy's conditions match the current context
   * Returns array of matched condition descriptions (empty if no match)
   */
  private matchesConditions(policy: Policy, ctx: PolicyContext): string[] {
    const conditions = policy.conditions;
    const matchedReasons: string[] = [];

    // Check min risk score
    if (conditions.minRiskScore !== undefined) {
      if (ctx.currentRiskScore >= conditions.minRiskScore) {
        matchedReasons.push(`risk score ${ctx.currentRiskScore.toFixed(2)} >= ${conditions.minRiskScore}`);
      } else {
        // Condition not met, policy doesn't match
        return [];
      }
    }

    // Check max risk score
    if (conditions.maxRiskScore !== undefined) {
      if (ctx.currentRiskScore <= conditions.maxRiskScore) {
        matchedReasons.push(`risk score ${ctx.currentRiskScore.toFixed(2)} <= ${conditions.maxRiskScore}`);
      } else {
        // Condition not met, policy doesn't match
        return [];
      }
    }

    // Check patterns_any (at least one pattern must match)
    if (conditions.patternsAny && conditions.patternsAny.length > 0) {
      const matchedPatterns = conditions.patternsAny.filter(p => 
        ctx.currentPatterns.includes(p)
      );
      if (matchedPatterns.length > 0) {
        matchedReasons.push(`patterns match any of [${matchedPatterns.join(', ')}]`);
      } else {
        // Condition not met, policy doesn't match
        return [];
      }
    }

    // Check patterns_all (all patterns must match)
    if (conditions.patternsAll && conditions.patternsAll.length > 0) {
      const allMatch = conditions.patternsAll.every(p => 
        ctx.currentPatterns.includes(p)
      );
      if (allMatch) {
        matchedReasons.push(`patterns match all of [${conditions.patternsAll.join(', ')}]`);
      } else {
        // Condition not met, policy doesn't match
        return [];
      }
    }

    // Check CoT labels_any (at least one label must match)
    if (conditions.cotLabelsAny && conditions.cotLabelsAny.length > 0 && ctx.cotLabels) {
      const matchedLabels = conditions.cotLabelsAny.filter(l => 
        ctx.cotLabels!.includes(l)
      );
      if (matchedLabels.length > 0) {
        matchedReasons.push(`CoT labels match any of [${matchedLabels.join(', ')}]`);
      } else {
        // Condition not met, policy doesn't match
        return [];
      }
    }

    // Check CoT labels_all (all labels must match)
    if (conditions.cotLabelsAll && conditions.cotLabelsAll.length > 0 && ctx.cotLabels) {
      const allMatch = conditions.cotLabelsAll.every(l => 
        ctx.cotLabels!.includes(l)
      );
      if (allMatch) {
        matchedReasons.push(`CoT labels match all of [${conditions.cotLabelsAll.join(', ')}]`);
      } else {
        // Condition not met, policy doesn't match
        return [];
      }
    }

    // Check event count
    if (conditions.eventCount && ctx.eventCount !== undefined) {
      const { min, max } = conditions.eventCount;
      let countMatches = true;

      if (min !== undefined && ctx.eventCount < min) {
        countMatches = false;
      }
      if (max !== undefined && ctx.eventCount > max) {
        countMatches = false;
      }

      if (countMatches) {
        matchedReasons.push(`event count ${ctx.eventCount} in range`);
      } else {
        // Condition not met, policy doesn't match
        return [];
      }
    }

    // If we have no specific conditions but policy exists, it always matches
    // (This allows for "default" policies)
    if (matchedReasons.length === 0 && this.hasNoConditions(conditions)) {
      matchedReasons.push('default policy (no conditions)');
    }

    return matchedReasons;
  }

  /**
   * Check if conditions object has no actual conditions set
   */
  private hasNoConditions(conditions: PolicyConditions): boolean {
    return (
      conditions.minRiskScore === undefined &&
      conditions.maxRiskScore === undefined &&
      (!conditions.patternsAny || conditions.patternsAny.length === 0) &&
      (!conditions.patternsAll || conditions.patternsAll.length === 0) &&
      (!conditions.cotLabelsAny || conditions.cotLabelsAny.length === 0) &&
      (!conditions.cotLabelsAll || conditions.cotLabelsAll.length === 0) &&
      !conditions.eventCount
    );
  }

  /**
   * Determine the highest priority action from matched policies
   * Priority: block > flag > notify > allow
   */
  private determineAction(matchedPolicies: Policy[]): PolicyAction {
    if (matchedPolicies.length === 0) {
      return 'allow';
    }

    // Check for block (highest priority)
    if (matchedPolicies.some(p => p.actions.action === 'block')) {
      return 'block';
    }

    // Check for flag (medium-high priority)
    if (matchedPolicies.some(p => p.actions.action === 'flag')) {
      return 'flag';
    }

    // Check for notify (medium priority)
    if (matchedPolicies.some(p => p.actions.action === 'notify')) {
      return 'notify';
    }

    // Default to allow
    return 'allow';
  }
}

