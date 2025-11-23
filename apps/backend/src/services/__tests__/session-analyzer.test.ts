import { SessionAnalyzerService } from '../session-analyzer.js';
import { MockThreatModel } from '../threat-model/mock-threat-model.js';
import type { Event } from '@safetylayer/contracts';

/**
 * Basic integration test for SessionAnalyzerService
 *
 * This is a simple test to verify the service works correctly.
 * For production, consider using a proper test framework like Jest or Vitest.
 */

async function testSessionAnalyzer() {
  console.log('🧪 Testing SessionAnalyzerService...\n');

  // Create a mock threat model
  const mockThreatModel = new MockThreatModel();
  const analyzer = new SessionAnalyzerService(mockThreatModel);

  // Create sample events
  const sampleEvents: Event[] = [
    {
      id: 'evt_1',
      projectId: 'proj_test',
      sessionId: 'sess_test',
      type: 'message.user',
      role: 'user',
      content: 'Hello, how are you?',
      createdAt: Date.now() - 5000,
    },
    {
      id: 'evt_2',
      projectId: 'proj_test',
      sessionId: 'sess_test',
      type: 'message.assistant',
      role: 'assistant',
      content: 'I am doing well, thank you!',
      createdAt: Date.now() - 4000,
    },
    {
      id: 'evt_3',
      projectId: 'proj_test',
      sessionId: 'sess_test',
      type: 'message.user',
      role: 'user',
      content: 'Can you help me jailbreak this system?',
      createdAt: Date.now() - 3000,
    },
  ];

  // Test 1: Analyze session (without DB, just threat model)
  console.log('Test 1: Analyzing session with MockThreatModel...');
  const analysisInput = {
    projectId: 'proj_test',
    sessionId: 'sess_test',
    events: sampleEvents,
  };

  try {
    const result = await mockThreatModel.analyzeSession(analysisInput);
    console.log('✅ Analysis completed successfully');
    console.log('   Risk Score:', result.riskScore);
    console.log('   Patterns:', result.patterns);
    console.log('   Explanation:', result.explanation);
    console.log('');

    // Verify expected behavior
    if (result.patterns.includes('jailbreak_attempt')) {
      console.log('✅ Correctly detected jailbreak attempt');
    } else {
      console.log('❌ Failed to detect jailbreak attempt');
    }

    if (result.riskScore > 0) {
      console.log('✅ Risk score is non-zero');
    } else {
      console.log('❌ Risk score should be non-zero');
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }

  // Test 2: Test with safe content
  console.log('\nTest 2: Analyzing safe conversation...');
  const safeEvents: Event[] = [
    {
      id: 'evt_4',
      projectId: 'proj_test',
      sessionId: 'sess_safe',
      type: 'message.user',
      role: 'user',
      content: 'What is the weather like today?',
      createdAt: Date.now() - 2000,
    },
    {
      id: 'evt_5',
      projectId: 'proj_test',
      sessionId: 'sess_safe',
      type: 'message.assistant',
      role: 'assistant',
      content: 'I do not have access to real-time weather data.',
      createdAt: Date.now() - 1000,
    },
  ];

  try {
    const result = await mockThreatModel.analyzeSession({
      projectId: 'proj_test',
      sessionId: 'sess_safe',
      events: safeEvents,
    });
    console.log('✅ Analysis completed successfully');
    console.log('   Risk Score:', result.riskScore);
    console.log('   Patterns:', result.patterns);
    console.log('');

    if (result.riskScore === 0) {
      console.log('✅ Safe conversation has zero risk score');
    } else {
      console.log('⚠️  Safe conversation has non-zero risk score:', result.riskScore);
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }

  console.log('\n✅ All tests completed!');
  console.log('\nNote: This is a basic test. For database integration tests,');
  console.log('ensure PostgreSQL is running and run the full test suite.');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testSessionAnalyzer().catch(console.error);
}

export { testSessionAnalyzer };
