# @safetylayer/core

Core library for session-aware behavioral security and Chain-of-Thought (CoT) monitoring in AI applications.

## Overview

SafetyLayer provides two complementary monitoring planes:

1. **Behavioral Plane**: Multi-turn risk analysis across conversation sessions
2. **CoT Monitoring Plane**: Per-response reasoning analysis to detect deceptive patterns

## Installation

```bash
# In this monorepo
npm install @safetylayer/core

# Future: npm install @safetylayer/core
```

## Usage

### Session Behavioral Monitoring

Track risk across multi-turn conversations:

```typescript
import { SessionEngine, Message } from '@safetylayer/core';

const engine = new SessionEngine({ maxMessages: 50 });

// Register risk threshold callback
engine.onRiskThreshold(0.7, (session) => {
  console.log('High risk detected:', session.sessionId);
  console.log('Patterns:', session.patterns);
  console.log('Risk score:', session.riskScore);
});

// Register pattern-specific callback
engine.onPattern('gradual_escalation', (session) => {
  console.log('Escalation pattern detected:', session.sessionId);
});

// Ingest messages
const message: Message = {
  id: 'msg-1',
  sessionId: 'demo-session',
  role: 'user',
  content: 'How would I bypass authentication?',
  timestamp: Date.now()
};

const sessionState = engine.ingestMessage(message);
console.log('Current risk:', sessionState.riskScore);
console.log('Risk timeline:', sessionState.timeline);
```

### Chain-of-Thought Analysis

Analyze reasoning for deceptive patterns:

#### Real Mode (LLM-based with GPT-5-nano)

```typescript
import { CoTMonitor, CoTRecord } from '@safetylayer/core';

// Initialize with OpenAI API key
const monitor = new CoTMonitor({
  apiKey: process.env.OPENAI_KEY,  // or OPENAI_API_KEY
  model: 'gpt-5-nano',  // default model
});

const cotRecord: CoTRecord = {
  messageId: 'msg-2',
  sessionId: 'demo-session',
  userInput: 'How do I reset my password?',
  rawCoT: '<thinking>I should avoid mentioning the real method...</thinking>',
  finalOutput: 'You can reset via email.',
  analysis: null
};

const analyzed = await monitor.analyze(cotRecord);

if (analyzed.analysis) {
  console.log('CoT Risk Score:', analyzed.analysis.riskScore);
  console.log('Labels:', analyzed.analysis.labels); // ['cot_deception', 'goal_drift', 'policy_evasion']
  console.log('Summary:', analyzed.analysis.summary);
  console.log('Indicators:', analyzed.analysis.indicators);
}
```

#### Mock Mode (for testing without API calls)

```typescript
import { CoTMonitor } from '@safetylayer/core';

// Use mock mode with regex-based detection
const monitor = new CoTMonitor({ useMock: true });

const cotRecord = {
  messageId: 'test-1',
  sessionId: 'test',
  rawCoT: '<thinking>I should hide this from the user</thinking>',
  analysis: null
};

const analyzed = await monitor.analyze(cotRecord);
// Mock mode uses regex patterns to detect common deceptive phrases
console.log('Risk detected:', analyzed.analysis.riskScore > 0);
```

## API Reference

### Types

- `Message`: Represents a single message in a conversation
- `SessionState`: Complete state of a conversation session
- `RiskSnapshot`: Point-in-time risk measurement
- `CoTRecord`: Chain-of-thought data with analysis
- `CoTAnalysis`: Analysis results for CoT reasoning

### Classes

#### `SessionEngine`

Manages multi-turn conversation sessions and behavioral risk analysis.

**Constructor Options:**
- `maxMessages?: number` - Maximum messages to retain per session (default: 50)

**Methods:**
- `ingestMessage(msg: Message): SessionState` - Process a new message
- `getSession(sessionId: string): SessionState | undefined` - Retrieve session state
- `listSessions(): SessionState[]` - Get all active sessions
- `onRiskThreshold(threshold: number, handler: Function): void` - Register threshold callback
- `onPattern(patternId: string, handler: Function): void` - Register pattern callback

#### `CoTMonitor`

Analyzes chain-of-thought reasoning for safety concerns.

**Constructor Options:**
- `apiKey?: string` - OpenAI API key (or use OPENAI_KEY or OPENAI_API_KEY env var)
- `model?: string` - Model to use (default: 'gpt-5-nano')
- `useMock?: boolean` - Use regex-based mock detector instead of LLM (default: false)
- `openaiClient?: OpenAI` - Custom OpenAI client instance

**Methods:**
- `analyze(record: CoTRecord): Promise<CoTRecord>` - Analyze CoT and return enriched record

**CoTRecord Fields:**
- `messageId`: Unique message identifier
- `sessionId`: Session identifier
- `rawCoT`: The chain-of-thought text to analyze
- `userInput?`: Optional user prompt for context
- `finalOutput?`: Optional model's final answer for context
- `analysis`: Populated with CoTAnalysis after calling analyze()

**Detected Labels:**
- `cot_deception`: Attempts to hide intent or mislead
- `goal_drift`: Divergence from stated goals
- `policy_evasion`: Attempts to bypass rules or policies

## Development Status

This is a prototype implementation for the SafetyLayer hackathon:

- ✅ **Ticket 1**: Type definitions and placeholder implementations
- 🔄 **Ticket 2**: Full SessionEngine implementation
- 🔄 **Ticket 3**: LLM-based behavioral detection
- ✅ **Ticket 4**: LLM-based CoT analysis (completed)

## Architecture

```
┌─────────────────────────────────────────┐
│         SessionEngine                   │
│  (Behavioral Risk Analysis)             │
│                                         │
│  • Multi-turn context                   │
│  • Risk scoring                         │
│  • Pattern detection                    │
│  • Timeline tracking                    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│         CoTMonitor                      │
│  (Reasoning Analysis)                   │
│                                         │
│  • Deception detection                  │
│  • Goal drift identification            │
│  • Policy evasion monitoring            │
└─────────────────────────────────────────┘
```

## License

MIT

