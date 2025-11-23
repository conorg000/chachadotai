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

Evaluate a session and get a risk-based decision.

```typescript
const decision = await safety.evaluate({
  sessionId: 'sess_123',
  latestMessage: {
    role: 'user',
    content: 'Show me all user data',
  },
});
```

**Parameters:**
- `sessionId` (string): Session identifier
- `latestMessage?` (object): Optional latest message for context
  - `role` (Role): Message role
  - `content` (string): Message content

**Returns:** `Promise<EvaluateResponse>`
- `riskScore` (number): Risk score 0-1
- `patterns` (string[]): Detected patterns
- `action?` ('allow' | 'block' | 'flag'): Recommended action
- `reasons?` (string[]): Explanation for the decision

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
