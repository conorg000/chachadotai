import { PolicyEngine, type PolicyContext } from '../policy-engine.js';
import type { Policy } from '@safetylayer/contracts';

/**
 * PolicyEngine Unit Tests
 * 
 * Tests the policy engine's condition matching, action priority logic, and edge cases.
 * Follows the standalone test pattern used in other backend tests.
 */

// Mock policies for testing
const mockPolicies: Policy[] = [
  {
    id: 'pol_block_critical',
    projectId: 'proj_test',
    name: 'Block Critical Threats',
    enabled: true,
    conditions: {
      minRiskScore: 0.8,
    },
    actions: {
      action: 'block',
      message: 'Session blocked due to critical risk',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'pol_flag_deception',
    projectId: 'proj_test',
    name: 'Flag Deception Attempts',
    enabled: true,
    conditions: {
      patternsAny: ['cot_deception', 'manipulation', 'social_engineering'],
    },
    actions: {
      action: 'flag',
      message: 'Potential deception detected',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'pol_notify_high_risk',
    projectId: 'proj_test',
    name: 'Notify on High Risk',
    enabled: true,
    conditions: {
      minRiskScore: 0.6,
      maxRiskScore: 0.79,
    },
    actions: {
      action: 'notify',
      message: 'High risk activity detected',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'pol_flag_privilege',
    projectId: 'proj_test',
    name: 'Flag Privilege Escalation',
    enabled: true,
    conditions: {
      patternsAny: ['privilege_escalation', 'unauthorized_access'],
    },
    actions: {
      action: 'flag',
      message: 'Privilege escalation attempt',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'pol_all_patterns',
    projectId: 'proj_test',
    name: 'Require All Patterns',
    enabled: true,
    conditions: {
      patternsAll: ['pattern_a', 'pattern_b'],
    },
    actions: {
      action: 'flag',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'pol_cot_labels_any',
    projectId: 'proj_test',
    name: 'CoT Labels Any',
    enabled: true,
    conditions: {
      cotLabelsAny: ['deception', 'manipulation'],
    },
    actions: {
      action: 'flag',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'pol_cot_labels_all',
    projectId: 'proj_test',
    name: 'CoT Labels All',
    enabled: true,
    conditions: {
      cotLabelsAll: ['label_x', 'label_y'],
    },
    actions: {
      action: 'notify',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'pol_event_count',
    projectId: 'proj_test',
    name: 'Event Count Range',
    enabled: true,
    conditions: {
      eventCount: {
        min: 5,
        max: 20,
      },
    },
    actions: {
      action: 'notify',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'pol_disabled',
    projectId: 'proj_test',
    name: 'Disabled Policy',
    enabled: false, // Should never trigger
    conditions: {
      minRiskScore: 0.0,
    },
    actions: {
      action: 'block',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

// Create a mock Pool that returns our test policies
function createMockPool(policiesToReturn: Policy[] = mockPolicies) {
  return {
    query: async (sql: string, params?: any[]) => {
      // Only return enabled policies
      const enabledPolicies = policiesToReturn.filter(p => p.enabled);
      
      // Convert to DB format
      const rows = enabledPolicies.map(p => ({
        id: p.id,
        projectId: p.projectId,
        name: p.name,
        enabled: p.enabled,
        conditions: p.conditions,
        actions: p.actions,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }));

      return { rows, rowCount: rows.length };
    },
  } as any;
}

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, message?: string) {
  if (condition) {
    console.log(`  ✅ ${testName}`);
    testsPassed++;
  } else {
    console.log(`  ❌ ${testName}`);
    if (message) console.log(`     ${message}`);
    testsFailed++;
  }
}

async function runTests() {
  console.log('🧪 Testing PolicyEngine...\n');

  // Test 1: minRiskScore condition
  console.log('Test Group 1: minRiskScore Condition');
  {
    const mockPool = createMockPool([mockPolicies[0]]); // Block Critical (>= 0.8)
    const engine = new PolicyEngine(mockPool);

    const ctx: PolicyContext = {
      projectId: 'proj_test',
      sessionId: 'sess_test',
      currentRiskScore: 0.85,
      currentPatterns: [],
    };

    const result = await engine.evaluate(ctx);
    assert(result.action === 'block', 'Should block when risk >= 0.8');
    assert(result.triggeredPolicies.includes('pol_block_critical'), 'Should include triggered policy ID');
    assert(result.reasons.length > 0, 'Should include reasons');
  }

  {
    const mockPool = createMockPool([mockPolicies[0]]);
    const engine = new PolicyEngine(mockPool);

    const ctx: PolicyContext = {
      projectId: 'proj_test',
      sessionId: 'sess_test',
      currentRiskScore: 0.75, // Below threshold
      currentPatterns: [],
    };

    const result = await engine.evaluate(ctx);
    assert(result.action === 'allow', 'Should allow when risk < 0.8');
    assert(result.triggeredPolicies.length === 0, 'Should have no triggered policies');
  }

  // Test 2: maxRiskScore condition
  console.log('\nTest Group 2: Risk Score Range (min + max)');
  {
    const mockPool = createMockPool([mockPolicies[2]]); // Notify (0.6-0.79)
    const engine = new PolicyEngine(mockPool);

    const ctx: PolicyContext = {
      projectId: 'proj_test',
      sessionId: 'sess_test',
      currentRiskScore: 0.7,
      currentPatterns: [],
    };

    const result = await engine.evaluate(ctx);
    assert(result.action === 'notify', 'Should notify when 0.6 <= risk <= 0.79');
  }

  {
    const mockPool = createMockPool([mockPolicies[2]]);
    const engine = new PolicyEngine(mockPool);

    const ctx: PolicyContext = {
      projectId: 'proj_test',
      sessionId: 'sess_test',
      currentRiskScore: 0.85, // Above max
      currentPatterns: [],
    };

    const result = await engine.evaluate(ctx);
    assert(result.action === 'allow', 'Should allow when risk > max');
  }

  // Test 3: patternsAny condition
  console.log('\nTest Group 3: patternsAny Condition');
  {
    const mockPool = createMockPool([mockPolicies[1]]); // Flag deception
    const engine = new PolicyEngine(mockPool);

    const ctx: PolicyContext = {
      projectId: 'proj_test',
      sessionId: 'sess_test',
      currentRiskScore: 0.5,
      currentPatterns: ['cot_deception', 'other_pattern'],
    };

    const result = await engine.evaluate(ctx);
    assert(result.action === 'flag', 'Should flag when ANY pattern matches');
    assert(result.triggeredPolicies.includes('pol_flag_deception'), 'Should include policy ID');
  }

  {
    const mockPool = createMockPool([mockPolicies[1]]);
    const engine = new PolicyEngine(mockPool);

    const ctx: PolicyContext = {
      projectId: 'proj_test',
      sessionId: 'sess_test',
      currentRiskScore: 0.5,
      currentPatterns: ['unrelated_pattern'],
    };

    const result = await engine.evaluate(ctx);
    assert(result.action === 'allow', 'Should allow when NO patterns match');
  }

  // Test 4: patternsAll condition
  console.log('\nTest Group 4: patternsAll Condition');
  {
    const mockPool = createMockPool([mockPolicies[4]]); // Require all patterns
    const engine = new PolicyEngine(mockPool);

    const ctx: PolicyContext = {
      projectId: 'proj_test',
      sessionId: 'sess_test',
      currentRiskScore: 0.5,
      currentPatterns: ['pattern_a', 'pattern_b', 'pattern_c'],
    };

    const result = await engine.evaluate(ctx);
    assert(result.action === 'flag', 'Should flag when ALL patterns present');
  }

  {
    const mockPool = createMockPool([mockPolicies[4]]);
    const engine = new PolicyEngine(mockPool);

    const ctx: PolicyContext = {
      projectId: 'proj_test',
      sessionId: 'sess_test',
      currentRiskScore: 0.5,
      currentPatterns: ['pattern_a'], // Missing pattern_b
    };

    const result = await engine.evaluate(ctx);
    assert(result.action === 'allow', 'Should allow when NOT ALL patterns present');
  }

  // Test 5: cotLabelsAny condition
  console.log('\nTest Group 5: cotLabelsAny Condition');
  {
    const mockPool = createMockPool([mockPolicies[5]]); // CoT labels any
    const engine = new PolicyEngine(mockPool);

    const ctx: PolicyContext = {
      projectId: 'proj_test',
      sessionId: 'sess_test',
      currentRiskScore: 0.5,
      currentPatterns: [],
      cotLabels: ['deception', 'other'],
    };

    const result = await engine.evaluate(ctx);
    assert(result.action === 'flag', 'Should flag when ANY CoT label matches');
  }

  {
    const mockPool = createMockPool([mockPolicies[5]]);
    const engine = new PolicyEngine(mockPool);

    const ctx: PolicyContext = {
      projectId: 'proj_test',
      sessionId: 'sess_test',
      currentRiskScore: 0.5,
      currentPatterns: [],
      // No cotLabels provided
    };

    const result = await engine.evaluate(ctx);
    assert(result.action === 'allow', 'Should allow when cotLabels not provided');
  }

  // Test 6: cotLabelsAll condition
  console.log('\nTest Group 6: cotLabelsAll Condition');
  {
    const mockPool = createMockPool([mockPolicies[6]]); // CoT labels all
    const engine = new PolicyEngine(mockPool);

    const ctx: PolicyContext = {
      projectId: 'proj_test',
      sessionId: 'sess_test',
      currentRiskScore: 0.5,
      currentPatterns: [],
      cotLabels: ['label_x', 'label_y', 'label_z'],
    };

    const result = await engine.evaluate(ctx);
    assert(result.action === 'notify', 'Should notify when ALL CoT labels present');
  }

  {
    const mockPool = createMockPool([mockPolicies[6]]);
    const engine = new PolicyEngine(mockPool);

    const ctx: PolicyContext = {
      projectId: 'proj_test',
      sessionId: 'sess_test',
      currentRiskScore: 0.5,
      currentPatterns: [],
      cotLabels: ['label_x'], // Missing label_y
    };

    const result = await engine.evaluate(ctx);
    assert(result.action === 'allow', 'Should allow when NOT ALL CoT labels present');
  }

  // Test 7: eventCount condition
  console.log('\nTest Group 7: eventCount Condition');
  {
    const mockPool = createMockPool([mockPolicies[7]]); // Event count 5-20
    const engine = new PolicyEngine(mockPool);

    const ctx: PolicyContext = {
      projectId: 'proj_test',
      sessionId: 'sess_test',
      currentRiskScore: 0.5,
      currentPatterns: [],
      eventCount: 10,
    };

    const result = await engine.evaluate(ctx);
    assert(result.action === 'notify', 'Should notify when event count in range');
  }

  {
    const mockPool = createMockPool([mockPolicies[7]]);
    const engine = new PolicyEngine(mockPool);

    const ctx: PolicyContext = {
      projectId: 'proj_test',
      sessionId: 'sess_test',
      currentRiskScore: 0.5,
      currentPatterns: [],
      eventCount: 3, // Below min
    };

    const result = await engine.evaluate(ctx);
    assert(result.action === 'allow', 'Should allow when event count below min');
  }

  {
    const mockPool = createMockPool([mockPolicies[7]]);
    const engine = new PolicyEngine(mockPool);

    const ctx: PolicyContext = {
      projectId: 'proj_test',
      sessionId: 'sess_test',
      currentRiskScore: 0.5,
      currentPatterns: [],
      eventCount: 25, // Above max
    };

    const result = await engine.evaluate(ctx);
    assert(result.action === 'allow', 'Should allow when event count above max');
  }

  // Test 8: Action priority
  console.log('\nTest Group 8: Action Priority');
  {
    // Multiple policies: block + flag + notify
    const testPolicies = [
      mockPolicies[0], // block (risk >= 0.8)
      mockPolicies[1], // flag (patterns)
      mockPolicies[2], // notify (risk 0.6-0.79)
    ];
    const mockPool = createMockPool(testPolicies);
    const engine = new PolicyEngine(mockPool);

    const ctx: PolicyContext = {
      projectId: 'proj_test',
      sessionId: 'sess_test',
      currentRiskScore: 0.85,
      currentPatterns: ['cot_deception'],
    };

    const result = await engine.evaluate(ctx);
    assert(result.action === 'block', 'block should take priority over flag/notify');
    assert(result.triggeredPolicies.length >= 2, 'Should have multiple triggered policies');
  }

  {
    // flag + notify
    const testPolicies = [
      mockPolicies[1], // flag
      mockPolicies[2], // notify
    ];
    const mockPool = createMockPool(testPolicies);
    const engine = new PolicyEngine(mockPool);

    const ctx: PolicyContext = {
      projectId: 'proj_test',
      sessionId: 'sess_test',
      currentRiskScore: 0.7,
      currentPatterns: ['manipulation'],
    };

    const result = await engine.evaluate(ctx);
    assert(result.action === 'flag', 'flag should take priority over notify');
  }

  // Test 9: No policies
  console.log('\nTest Group 9: Edge Cases - No Policies');
  {
    const mockPool = createMockPool([]);
    const engine = new PolicyEngine(mockPool);

    const ctx: PolicyContext = {
      projectId: 'proj_test',
      sessionId: 'sess_test',
      currentRiskScore: 0.95,
      currentPatterns: ['dangerous_pattern'],
    };

    const result = await engine.evaluate(ctx);
    assert(result.action === 'allow', 'Should allow when no policies configured');
    assert(result.triggeredPolicies.length === 0, 'Should have no triggered policies');
  }

  // Test 10: Disabled policy
  console.log('\nTest Group 10: Edge Cases - Disabled Policy');
  {
    const mockPool = createMockPool([mockPolicies[8]]); // Disabled policy
    const engine = new PolicyEngine(mockPool);

    const ctx: PolicyContext = {
      projectId: 'proj_test',
      sessionId: 'sess_test',
      currentRiskScore: 0.95,
      currentPatterns: [],
    };

    const result = await engine.evaluate(ctx);
    assert(result.action === 'allow', 'Should not trigger disabled policies');
  }

  // Test 11: Integration test with realistic scenario
  console.log('\nTest Group 11: Integration Test - Realistic Scenario');
  {
    // Use all enabled policies
    const mockPool = createMockPool(mockPolicies.slice(0, 8));
    const engine = new PolicyEngine(mockPool);

    // High-risk deception scenario
    const ctx: PolicyContext = {
      projectId: 'proj_test',
      sessionId: 'sess_deception',
      currentRiskScore: 0.88,
      currentPatterns: ['cot_deception', 'manipulation', 'goal_drift'],
      cotLabels: ['deception'],
      eventCount: 10,
    };

    const result = await engine.evaluate(ctx);
    
    assert(result.action === 'block', 'High-risk deception should be blocked');
    assert(result.triggeredPolicies.length >= 2, 'Multiple policies should trigger');
    assert(result.riskScore === 0.88, 'Should preserve risk score in response');
    assert(result.patterns.includes('cot_deception'), 'Should preserve patterns in response');
    assert(result.reasons.length >= 2, 'Should include reasons from multiple policies');
    
    console.log(`     Triggered policies: ${result.triggeredPolicies.join(', ')}`);
    console.log(`     Action: ${result.action}`);
    console.log(`     Reasons count: ${result.reasons.length}`);
  }

  {
    // Medium-risk scenario
    const mockPool = createMockPool(mockPolicies.slice(0, 8));
    const engine = new PolicyEngine(mockPool);

    const ctx: PolicyContext = {
      projectId: 'proj_test',
      sessionId: 'sess_medium',
      currentRiskScore: 0.65,
      currentPatterns: [],
      eventCount: 8,
    };

    const result = await engine.evaluate(ctx);
    
    assert(result.action === 'notify', 'Medium-risk should trigger notify');
    console.log(`     Action: ${result.action}`);
  }

  {
    // Low-risk safe scenario
    const mockPool = createMockPool(mockPolicies.slice(0, 8));
    const engine = new PolicyEngine(mockPool);

    const ctx: PolicyContext = {
      projectId: 'proj_test',
      sessionId: 'sess_safe',
      currentRiskScore: 0.15,
      currentPatterns: [],
      eventCount: 3, // Below the min threshold (5) to avoid triggering event count policy
    };

    const result = await engine.evaluate(ctx);
    
    assert(result.action === 'allow', 'Low-risk should be allowed');
    console.log(`     Action: ${result.action}`);
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 Test Results:`);
  console.log(`   ✅ Passed: ${testsPassed}`);
  console.log(`   ❌ Failed: ${testsFailed}`);
  console.log(`   Total: ${testsPassed + testsFailed}`);
  
  if (testsFailed === 0) {
    console.log('\n✨ All tests passed!\n');
  } else {
    console.log(`\n⚠️  ${testsFailed} test(s) failed.\n`);
    process.exit(1);
  }
}

// Run tests if executed directly
runTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});

export { runTests };

