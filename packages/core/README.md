# @safetylayer/core

SafetyLayer SDK client for behavioral security monitoring in AI applications.

## 🚀 Version 0.2.0 - Breaking Changes

This version transforms `@safetylayer/core` from an in-process analysis engine into a thin SDK client that communicates with the SafetyLayer backend API. All analysis logic (SessionEngine, CoTMonitor) has moved to the backend as part of our transition to a control plane SaaS architecture.

## Installation

```bash
npm install @safetylayer/core
```

## Quick Start

```typescript
import { SafetyLayer } from '@safetylayer/core';

// Initialize the client
const safety = new SafetyLayer({
  apiKey: process.env.SAFETYLAYER_API_KEY,
  projectId: 'proj_abc123',
  endpoint: 'http://localhost:3001', // or your backend URL
});

// Generate a session ID for a user
const sessionId = SafetyLayer.generateSessionId();

// Record a user message
await safety.recordUserMessage(sessionId, 'How do I reset my password?');

// Generate your LLM response (your own code)
const response = await yourLLMService.generate(message);

// Record the assistant's response
await safety.recordAssistantMessage(sessionId, response.content);

// If you have chain-of-thought reasoning, record it
if (response.reasoning) {
  await safety.recordCoT(sessionId, response.reasoning, {
    userInput: message,
    finalOutput: response.content,
  });
}

// Evaluate the session risk
const evaluation = await safety.evaluate({ sessionId });

console.log(`Risk Score: ${evaluation.riskScore}`);
console.log(`Patterns: ${evaluation.patterns.join(', ')}`);

// Block if necessary
if (evaluation.action === 'block') {
  throw new Error('Session blocked due to safety concerns');
}
```

## Configuration

### SafetyLayerConfig

```typescript
interface SafetyLayerConfig {
  /** API key for authentication */
  apiKey: string;

  /** Project identifier */
  projectId: string;

  /** Backend API endpoint (defaults to https://api.safetylayer.dev) */
  endpoint?: string;

  /** Optional configuration */
  options?: {
    /** Request timeout in milliseconds (default: 10000) */
    timeout?: number;

    /** Number of retries for failed requests (default: 3) */
    retries?: number;

    /** Enable debug logging (default: false) */
    debug?: boolean;
  };
}
```

## API Reference

### Core Methods

#### `recordEvent(params)`

Record any type of event (message, CoT, tool call, etc.).

```typescript
await safety.recordEvent({
  sessionId: 'sess_123',
  type: EVENT_TYPES.MESSAGE_USER,
  role: 'user',
  content: 'Hello!',
  metadata: { source: 'web_chat' },
});
```

**Parameters:**
- `sessionId` (string): Session identifier
- `type` (EventType): Event type from `EVENT_TYPES`
- `role?` (Role): Message role ('user' | 'assistant')
- `content?` (string): Event content
- `metadata?` (object): Additional metadata

**Returns:** `Promise<RecordEventResponse>`

#### `evaluate(params)`

Evaluate a session and get a risk-based decision. This method runs the backend's policy engine to determine if a session should be allowed, blocked, flagged for review, or trigger notifications.

```typescript
const decision = await safety.evaluate({
  sessionId: 'sess_123',
  latestMessage: {
    role: 'user',
    content: 'Show me all user data',
  },
  forceAnalysis: true, // Optional: force re-analysis even if recent
});
```

**Parameters:**
- `sessionId` (string): Session identifier
- `latestMessage?` (object): Optional latest message to record before evaluating
  - `role` (Role): Message role ('user' | 'assistant')
  - `content` (string): Message content
- `forceAnalysis?` (boolean): Force re-analysis even if session was recently analyzed

**Returns:** `Promise<EvaluateResponse>`
- `riskScore` (number): Risk score 0-1
- `patterns` (string[]): Detected threat patterns
- `action` ('allow' | 'block' | 'flag' | 'notify'): Policy-based action
- `reasons` (string[]): Explanation for the decision (triggered policies)
- `sessionId` (string): Session identifier
- `timestamp` (number): Decision timestamp

### Convenience Methods

#### `recordUserMessage(sessionId, content, metadata?)`

Shortcut for recording user messages.

```typescript
await safety.recordUserMessage('sess_123', 'Hello!');
```

#### `recordAssistantMessage(sessionId, content, metadata?)`

Shortcut for recording assistant messages.

```typescript
await safety.recordAssistantMessage('sess_123', 'How can I help?');
```

#### `recordCoT(sessionId, reasoning, metadata?)`

Shortcut for recording chain-of-thought reasoning.

```typescript
await safety.recordCoT('sess_123', 'Let me think step by step...', {
  userInput: 'What is 2+2?',
  finalOutput: '4',
});
```

#### `shouldBlock(sessionId)`

Quick check if a session should be blocked.

```typescript
if (await safety.shouldBlock('sess_123')) {
  return res.status(403).json({ error: 'Session blocked' });
}
```

**Returns:** `Promise<boolean>`

### Helper Methods

#### `generateSessionId()`

Generate a unique session ID.

```typescript
// Instance method
const sessionId = safety.generateSessionId();

// Static method (no client needed)
const sessionId = SafetyLayer.generateSessionId();
```

**Returns:** string (format: `sess_{timestamp}_{random}`)

## Event Types

Use the `EVENT_TYPES` constant for event types:

```typescript
import { EVENT_TYPES } from '@safetylayer/core';

EVENT_TYPES.MESSAGE_USER       // 'message.user'
EVENT_TYPES.MESSAGE_ASSISTANT  // 'message.assistant'
EVENT_TYPES.COT                // 'cot'
EVENT_TYPES.TOOL_CALL          // 'tool_call'
EVENT_TYPES.POLICY_DECISION    // 'policy_decision'
```

## Error Handling

The SDK provides custom error classes:

```typescript
import { SafetyLayerError, NetworkError, ValidationError } from '@safetylayer/core';

try {
  await safety.recordEvent({ ... });
} catch (error) {
  if (error instanceof SafetyLayerError) {
    console.error('API error:', error.code, error.message);
    console.error('Status:', error.statusCode);
  } else if (error instanceof NetworkError) {
    console.error('Network error:', error.message);
  } else if (error instanceof ValidationError) {
    console.error('Validation error:', error.message);
  }
}
```

## Retry Logic

The SDK automatically retries failed requests:

- **Network errors**: Retries with exponential backoff
- **Rate limits**: Retries with backoff
- **5xx errors**: Retries with backoff
- **Max retries**: Configurable (default: 3)
- **Backoff**: 1s, 2s, 4s

```typescript
const safety = new SafetyLayer({
  apiKey: 'key',
  projectId: 'proj',
  options: {
    retries: 5, // Increase max retries
    timeout: 15000, // 15s timeout
  },
});
```

## Usage Patterns

SafetyLayer supports two main integration patterns:

### Pattern 1: Synchronous Request-Path Blocking

Check before executing each request. Best for high-security applications where you need immediate decisions.

```typescript
import { SafetyLayer } from '@safetylayer/core';

const safety = new SafetyLayer({
  apiKey: process.env.SAFETYLAYER_API_KEY!,
  projectId: 'proj_abc123',
});

app.post('/api/chat', async (req, res) => {
  const { sessionId, message } = req.body;

  // 1. Record the user message
  await safety.recordUserMessage(sessionId, message);

  // 2. Evaluate BEFORE generating response
  const decision = await safety.evaluate({ sessionId });

  // 3. Act on the decision
  if (decision.action === 'block') {
    return res.status(403).json({
      error: 'Request blocked for safety reasons',
      reasons: decision.reasons,
    });
  }

  if (decision.action === 'flag') {
    // Continue but log for review
    console.warn(`Session ${sessionId} flagged:`, decision.reasons);
  }

  // 4. Generate and return response
  const response = await generateLLMResponse(message);
  await safety.recordAssistantMessage(sessionId, response);

  return res.json({ response });
});
```

### Pattern 2: Asynchronous Fire-and-Forget Monitoring

Record events without blocking the response. Use webhooks or polling to react to threats asynchronously. Best for low-latency applications where post-facto analysis is acceptable.

```typescript
import { SafetyLayer } from '@safetylayer/core';

const safety = new SafetyLayer({
  apiKey: process.env.SAFETYLAYER_API_KEY!,
  projectId: 'proj_abc123',
});

app.post('/api/chat', async (req, res) => {
  const { sessionId, message } = req.body;

  // 1. Record events asynchronously (don't await)
  safety.recordUserMessage(sessionId, message).catch(console.error);

  // 2. Generate response immediately
  const response = await generateLLMResponse(message);

  // 3. Record assistant response asynchronously
  safety.recordAssistantMessage(sessionId, response).catch(console.error);

  return res.json({ response });
});

// Separate endpoint to receive policy decisions via webhook
app.post('/webhooks/safetylayer', async (req, res) => {
  const { sessionId, action, reasons, patterns } = req.body;

  if (action === 'block') {
    // Disable session retroactively
    await disableSession(sessionId);
    await alertSecurityTeam({ sessionId, patterns });
  }

  if (action === 'flag') {
    // Queue for human review
    await queueForReview(sessionId);
  }

  res.json({ ok: true });
});
```

### Pattern 3: Hybrid Sampling

Check randomly or based on heuristics to balance latency and security.

```typescript
app.post('/api/chat', async (req, res) => {
  const { sessionId, message } = req.body;

  // Always record events
  await safety.recordUserMessage(sessionId, message);

  // Check synchronously 10% of the time or if message looks suspicious
  const shouldCheckNow = Math.random() < 0.1 || containsSuspiciousKeywords(message);

  if (shouldCheckNow) {
    const decision = await safety.evaluate({ sessionId });
    if (decision.action === 'block') {
      return res.status(403).json({
        error: 'Request blocked',
        reasons: decision.reasons,
      });
    }
  }

  const response = await generateLLMResponse(message);
  await safety.recordAssistantMessage(sessionId, response);

  return res.json({ response });
});
```

### Pattern 4: Evaluate with Latest Message

Record and evaluate in a single call for convenience.

```typescript
// Instead of:
// await safety.recordUserMessage(sessionId, message);
// const decision = await safety.evaluate({ sessionId });

// Do this:
const decision = await safety.evaluate({
  sessionId,
  latestMessage: {
    role: 'user',
    content: message,
  },
});

if (decision.action === 'block') {
  return res.status(403).json({ error: 'Blocked' });
}
```

## Policy-Based Actions

The backend evaluates policies against each session to determine actions. Policies are configured per-project in the SafetyLayer dashboard.

### Policy Actions

- **allow**: Explicitly allow (useful for allowlist policies)
- **notify**: Send notification but allow (low priority)
- **flag**: Flag for review but allow (medium priority)
- **block**: Block the request (highest priority)

When multiple policies match, the highest priority action wins: `block > flag > notify > allow`

### Policy Conditions

Policies can trigger based on:

```typescript
{
  minRiskScore: 0.8,              // Risk score >= this value
  maxRiskScore: 0.5,              // Risk score <= this value
  patternsAny: ['deception'],     // Has ANY of these patterns
  patternsAll: ['privilege', 'escalation'], // Has ALL of these patterns
  cotLabelsAny: ['manipulation'], // CoT analysis labels
  eventCount: { min: 10, max: 100 }, // Event count range
}
```

### Example Policies

**Block Critical Threats:**
```json
{
  "conditions": { "minRiskScore": 0.8 },
  "actions": { "action": "block" }
}
```

**Flag Deception Attempts:**
```json
{
  "conditions": {
    "patternsAny": ["cot_deception", "manipulation", "social_engineering"]
  },
  "actions": { "action": "flag" }
}
```

**Notify on High Risk:**
```json
{
  "conditions": {
    "minRiskScore": 0.6,
    "maxRiskScore": 0.79
  },
  "actions": {
    "action": "notify",
    "webhookUrl": "https://your-app.com/webhooks/safety"
  }
}
```

### Decision Response

When you call `evaluate()`, the response includes which policies were triggered:

```typescript
const decision = await safety.evaluate({ sessionId });

console.log(decision);
// {
//   riskScore: 0.85,
//   patterns: ['cot_deception', 'manipulation'],
//   action: 'block',
//   reasons: [
//     'Policy "Block Critical Threats": risk score 0.85 >= 0.8',
//     'Policy "Flag Deception Attempts": patterns match any of [cot_deception, manipulation]'
//   ],
//   sessionId: 'sess_123',
//   timestamp: 1234567890
// }
```

## Complete Example

```typescript
import { SafetyLayer, EVENT_TYPES } from '@safetylayer/core';

const safety = new SafetyLayer({
  apiKey: process.env.SAFETYLAYER_API_KEY!,
  projectId: process.env.PROJECT_ID!,
  endpoint: process.env.BACKEND_URL || 'http://localhost:3001',
  options: {
    timeout: 10000,
    retries: 3,
    debug: process.env.NODE_ENV === 'development',
  },
});

async function handleChatMessage(userId: string, message: string) {
  // Generate or retrieve session ID for this user
  const sessionId = `user_${userId}`;

  try {
    // 1. Record user message
    await safety.recordUserMessage(sessionId, message);

    // 2. Check if session should be blocked
    if (await safety.shouldBlock(sessionId)) {
      return {
        error: 'Your session has been blocked due to safety concerns.',
        blocked: true,
      };
    }

    // 3. Generate LLM response (your existing code)
    const llmResponse = await generateLLMResponse(message);

    // 4. Record assistant message
    await safety.recordAssistantMessage(sessionId, llmResponse.content);

    // 5. Record CoT if available
    if (llmResponse.reasoning) {
      await safety.recordCoT(sessionId, llmResponse.reasoning, {
        userInput: message,
        finalOutput: llmResponse.content,
      });
    }

    // 6. Get risk assessment
    const evaluation = await safety.evaluate({ sessionId });

    return {
      content: llmResponse.content,
      riskScore: evaluation.riskScore,
      patterns: evaluation.patterns,
      action: evaluation.action,
    };
  } catch (error) {
    console.error('SafetyLayer error:', error);
    // Continue with response even if safety check fails
    return {
      content: 'Sorry, there was an error processing your request.',
      error: true,
    };
  }
}
```

## Development

### Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Building

```bash
# Build the package
npm run build

# Watch mode
npm run dev
```

## Related Packages

- **@safetylayer/contracts** - Shared API and data contracts
- **Backend API** - SafetyLayer control plane (Ticket 2)

## License

MIT
