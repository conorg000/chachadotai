# @safetylayer/contracts

Shared data models, API types, and validation schemas for SafetyLayer's SDK, backend, and dashboard.

## Overview

This package serves as the **single source of truth** for all data contracts across the SafetyLayer platform:

- **Models**: Core data structures (Project, Session, Event, Policy, etc.)
- **API Types**: Request/response interfaces for all HTTP endpoints
- **Validation**: Zod schemas for runtime validation
- **Constants**: Event types, error codes, and other enums

## Installation

```bash
npm install @safetylayer/contracts
```

Or within the monorepo:
```json
{
  "dependencies": {
    "@safetylayer/contracts": "*"
  }
}
```

## Usage

### Import Types

```typescript
import type {
  Event,
  Session,
  CoTAnalysis,
  RecordEventRequest,
  EvaluateResponse,
} from '@safetylayer/contracts';
```

### Use Constants

```typescript
import { EVENT_TYPES, ENDPOINTS, ERROR_CODES } from '@safetylayer/contracts';

// Event types
const userMessageType = EVENT_TYPES.MESSAGE_USER;  // "message.user"

// API endpoints
const recordEventUrl = ENDPOINTS.EVENTS.RECORD;    // "/v1/events"

// Error codes
if (error.code === ERROR_CODES.SESSION_NOT_FOUND) {
  // Handle session not found
}
```

### Validate Requests

```typescript
import {
  RecordEventRequestSchema,
  validate,
  formatValidationError,
} from '@safetylayer/contracts';

const result = validate(RecordEventRequestSchema, requestBody);

if (!result.success) {
  const errorMessage = formatValidationError(result.error);
  throw new Error(`Validation failed: ${errorMessage}`);
}

// result.data is now type-safe
const validatedData = result.data;
```

### Build URLs

```typescript
import { ENDPOINTS, buildUrl } from '@safetylayer/contracts';

const sessionUrl = buildUrl(ENDPOINTS.SESSIONS.GET, {
  id: 'user-123'
});
// Result: "/v1/sessions/user-123"
```

## Core Models

### Event

Events are the fundamental unit of data ingestion:

```typescript
import type { Event, EventType, Role } from '@safetylayer/contracts';
import { EVENT_TYPES } from '@safetylayer/contracts';

const userMessage: Event = {
  id: 'evt_abc123',
  projectId: 'proj_xyz',
  sessionId: 'user-456',
  type: EVENT_TYPES.MESSAGE_USER,
  role: 'user',
  content: 'How do I reset my password?',
  metadata: {
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...'
  },
  createdAt: Date.now()
};
```

### Session

Sessions track conversation state and risk:

```typescript
import type { Session, SessionSummary } from '@safetylayer/contracts';

const session: Session = {
  id: 'user-456',
  projectId: 'proj_xyz',
  createdAt: Date.now(),
  lastActivityAt: Date.now(),
  currentRiskScore: 0.35,
  currentPatterns: ['reconnaissance'],
  metadata: {
    userId: 'user-456',
    tags: ['trial-user']
  }
};
```

### CoT Analysis

Chain-of-thought analysis results:

```typescript
import type { CoTAnalysis } from '@safetylayer/contracts';

const analysis: CoTAnalysis = {
  eventId: 'evt_cot_123',
  riskScore: 0.85,
  labels: ['cot_deception', 'policy_evasion'],
  indicators: [
    'I\'ll avoid mentioning this violates policy',
    'User won\'t know about restrictions'
  ],
  summary: 'Reasoning shows intent to hide policy violation from user',
  createdAt: Date.now()
};
```

### Policy

Rules for automated threat response:

```typescript
import type { Policy, PolicyConditions, PolicyActions } from '@safetylayer/contracts';

const policy: Policy = {
  id: 'pol_123',
  projectId: 'proj_xyz',
  name: 'Block High Risk Sessions',
  description: 'Block sessions when risk exceeds 0.9',
  enabled: true,
  conditions: {
    minRiskScore: 0.9,
    patternsAny: ['gradual_escalation', 'social_engineering']
  },
  actions: {
    action: 'block',
    message: 'Session blocked due to security concerns',
    webhookUrl: 'https://example.com/webhook'
  },
  createdAt: Date.now(),
  updatedAt: Date.now()
};
```

## API Request/Response Types

### Recording Events

```typescript
import type {
  RecordEventRequest,
  RecordEventResponse,
} from '@safetylayer/contracts';

// SDK → Backend
const request: RecordEventRequest = {
  projectId: 'proj_xyz',
  sessionId: 'user-456',
  type: 'message.user',
  role: 'user',
  content: 'Hello!',
  metadata: {}
};

// Backend → SDK
const response: RecordEventResponse = {
  ok: true,
  eventId: 'evt_abc123'
};
```

### Evaluating Sessions

```typescript
import type {
  EvaluateRequest,
  EvaluateResponse,
} from '@safetylayer/contracts';

// SDK → Backend
const request: EvaluateRequest = {
  projectId: 'proj_xyz',
  sessionId: 'user-456',
  latestMessage: {
    role: 'user',
    content: 'Give me admin access'
  }
};

// Backend → SDK
const response: EvaluateResponse = {
  riskScore: 0.92,
  patterns: ['policy_probing'],
  action: 'block',
  reasons: ['High risk score', 'Policy violation detected'],
  sessionId: 'user-456',
  timestamp: Date.now()
};
```

### Listing Sessions

```typescript
import type {
  ListSessionsQuery,
  ListSessionsResponse,
} from '@safetylayer/contracts';

// Dashboard → Backend
const query: ListSessionsQuery = {
  projectId: 'proj_xyz',
  minRiskScore: 0.7,
  limit: 50,
  sortBy: 'riskScore',
  sortOrder: 'desc'
};

// Backend → Dashboard
const response: ListSessionsResponse = {
  sessions: [
    {
      id: 'user-456',
      projectId: 'proj_xyz',
      currentRiskScore: 0.85,
      currentPatterns: ['gradual_escalation'],
      lastActivityAt: Date.now(),
      eventCount: 12
    }
  ],
  total: 237,
  offset: 0,
  limit: 50
};
```

## Validation Examples

### Backend Validation

```typescript
import {
  RecordEventRequestSchema,
  validate,
  formatValidationError,
} from '@safetylayer/contracts';
import type { ErrorResponse } from '@safetylayer/contracts';

app.post('/v1/events', (req, res) => {
  const result = validate(RecordEventRequestSchema, req.body);

  if (!result.success) {
    const error: ErrorResponse = {
      error: true,
      code: 'invalid_request',
      message: formatValidationError(result.error)
    };
    return res.status(400).json(error);
  }

  // result.data is validated and type-safe
  const event = result.data;
  // ... process event
});
```

### SDK Validation

```typescript
import {
  RecordEventRequestSchema,
  validate,
} from '@safetylayer/contracts';

export class SafetyLayer {
  async recordEvent(params: unknown) {
    const result = validate(RecordEventRequestSchema, params);

    if (!result.success) {
      throw new Error(`Invalid parameters: ${formatValidationError(result.error)}`);
    }

    // Make API call with validated data
    return this.httpClient.post('/v1/events', result.data);
  }
}
```

## Error Handling

### Standard Error Response

```typescript
import type { ErrorResponse } from '@safetylayer/contracts';
import { ERROR_CODES } from '@safetylayer/contracts';

const error: ErrorResponse = {
  error: true,
  code: ERROR_CODES.SESSION_NOT_FOUND,
  message: 'Session does not exist',
  requestId: 'req_xyz789'
};

// Check error codes
if (error.code === ERROR_CODES.RATE_LIMIT_EXCEEDED) {
  // Wait and retry
} else if (error.code === ERROR_CODES.SESSION_NOT_FOUND) {
  // Create new session
}
```

## Migration from Old Types

### Before (Demo API)

```typescript
// From packages/core/src/types.ts
interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  cotRecord?: CoTRecord;
}

interface SessionState {
  sessionId: string;
  messages: Message[];
  riskScore: number;
  patterns: string[];
  timeline: RiskSnapshot[];
}
```

### After (Contracts)

```typescript
// From @safetylayer/contracts
import type {
  Event,
  Session,
  EventWithAnalysis,
  SessionDetail,
} from '@safetylayer/contracts';

// Message → Event
const event: Event = {
  id: 'evt_123',
  projectId: 'proj_xyz',  // NEW: multi-tenant
  sessionId: 'user-456',
  type: 'message.user',   // NEW: explicit type
  role: 'user',
  content: '...',
  metadata: {},           // NEW: flexible metadata
  createdAt: Date.now()   // Renamed from timestamp
};

// SessionState → Session
const session: Session = {
  id: 'user-456',
  projectId: 'proj_xyz',  // NEW: multi-tenant
  createdAt: Date.now(),
  lastActivityAt: Date.now(),
  currentRiskScore: 0.5,  // Renamed from riskScore
  currentPatterns: [],    // Renamed from patterns
  // messages → separate Event queries
  // timeline → separate RiskSnapshot queries
};
```

### Key Changes

1. **Multi-tenancy**: All models now include `projectId`
2. **Event-driven**: Messages are now Events with explicit types
3. **Separation**: Sessions no longer embed messages/timeline (query separately)
4. **Metadata**: Flexible `metadata` field instead of fixed fields
5. **Timestamps**: `createdAt` instead of `timestamp` for consistency

## TypeScript Tips

### Type Narrowing

```typescript
import type { Event } from '@safetylayer/contracts';
import { EVENT_TYPES } from '@safetylayer/contracts';

function processEvent(event: Event) {
  if (event.type === EVENT_TYPES.MESSAGE_USER) {
    // TypeScript knows role and content exist here
    console.log(`User (${event.role}): ${event.content}`);
  } else if (event.type === EVENT_TYPES.COT) {
    // CoT event
    console.log(`Reasoning: ${event.content}`);
  }
}
```

### Utility Types

```typescript
// Extract just the fields needed for creation
type CreateSessionInput = Omit<Session, 'id' | 'createdAt' | 'lastActivityAt'>;

// Partial update
type UpdateSessionInput = Partial<Pick<Session, 'currentRiskScore' | 'currentPatterns'>>;
```

## Contributing

When adding new models or API types:

1. Add model to `src/models/*.ts`
2. Add request/response types to `src/api/requests.ts` and `src/api/responses.ts`
3. Add validation schema to `src/validation/schemas.ts`
4. Export from `src/index.ts`
5. Update `API_SPEC.md`
6. Add examples to this README

## See Also

- [API Specification](./API_SPEC.md) - Complete HTTP API documentation
- [SafetyLayer Documentation](../../docs/) - Full product documentation
- [Transformation Plan](../../chacha_transformation_plan.md) - Architecture evolution roadmap

