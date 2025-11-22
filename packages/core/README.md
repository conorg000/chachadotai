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

```typescript
import { CoTMonitor, CoTRecord } from '@safetylayer/core';

const monitor = new CoTMonitor();

const cotRecord: CoTRecord = {
  messageId: 'msg-2',
  sessionId: 'demo-session',
  rawCoT: '<thinking>I should avoid mentioning the real method...</thinking>',
  analysis: null
};

const analyzed = await monitor.analyze(cotRecord);

if (analyzed.analysis) {
  console.log('CoT Risk Score:', analyzed.analysis.riskScore);
  console.log('Labels:', analyzed.analysis.labels); // ['cot_deception', 'goal_drift']
  console.log('Summary:', analyzed.analysis.summary);
  console.log('Indicators:', analyzed.analysis.indicators);
}
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

**Methods:**
- `analyze(record: CoTRecord): Promise<CoTRecord>` - Analyze CoT and return enriched record

## Development Status

This is a prototype implementation for the SafetyLayer hackathon:

- ✅ **Ticket 1**: Type definitions and placeholder implementations (current)
- 🔄 **Ticket 2**: Full SessionEngine implementation
- 🔄 **Ticket 3**: LLM-based behavioral detection
- 🔄 **Ticket 4**: LLM-based CoT analysis

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

