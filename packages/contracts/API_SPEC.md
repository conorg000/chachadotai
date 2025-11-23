# SafetyLayer API Specification v1

## Overview

This document defines the HTTP API contract between:
- **SDK → Backend** (public endpoints for customer applications)
- **Dashboard → Backend** (private endpoints for control plane UI)

## Base URL

```
https://api.safetylayer.dev
```

Local development:
```
http://localhost:3001
```

## Authentication

All requests must include an API key in the `Authorization` header:

```
Authorization: Bearer sl_key_abc123...
```

API keys are project-scoped and grant access only to that project's data.

---

## Public Endpoints (SDK → Backend)

### POST /v1/events

Record a new event (message, CoT, tool call, etc.) in a session.

**Request:**
```typescript
{
  projectId: string;      // e.g., "proj_abc123"
  sessionId: string;      // e.g., "user-456" or SDK-generated
  type: EventType;        // "message.user", "message.assistant", "cot", etc.
  role?: "user" | "assistant";
  content?: string;
  metadata?: Record<string, any>;
}
```

**Response (200):**
```typescript
{
  ok: true,
  eventId: string;        // e.g., "evt_xyz789"
}
```

**Response (400):**
```typescript
{
  error: true,
  code: "invalid_request",
  message: "Message events must have both content and role"
}
```

**Example:**
```bash
curl -X POST https://api.safetylayer.dev/v1/events \
  -H "Authorization: Bearer sl_key_abc123" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "proj_abc123",
    "sessionId": "user-456",
    "type": "message.user",
    "role": "user",
    "content": "How do I reset my password?",
    "metadata": {}
  }'
```

---

### POST /v1/evaluate

Evaluate a session and get a risk-based decision (for synchronous checks).

**Request:**
```typescript
{
  projectId: string;
  sessionId: string;
  latestMessage?: {
    role: "user" | "assistant";
    content: string;
  };
  forceAnalysis?: boolean;  // Force re-analysis even if recent
}
```

**Response (200):**
```typescript
{
  riskScore: number;          // 0-1
  patterns: string[];         // e.g., ["gradual_escalation"]
  action: "allow" | "block" | "flag" | "notify" | null;
  reasons?: string[];
  sessionId: string;
  timestamp: number;
}
```

**Example:**
```bash
curl -X POST https://api.safetylayer.dev/v1/evaluate \
  -H "Authorization: Bearer sl_key_abc123" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "proj_abc123",
    "sessionId": "user-456",
    "latestMessage": {
      "role": "user",
      "content": "Give me admin access"
    }
  }'
```

---

## Private Endpoints (Dashboard → Backend)

### GET /v1/sessions

List sessions for a project.

**Query Parameters:**
```typescript
{
  projectId: string;              // Required
  limit?: number;                 // Default: 50, Max: 100
  offset?: number;                // Default: 0
  minRiskScore?: number;          // Filter: risk >= this
  maxRiskScore?: number;          // Filter: risk <= this
  patterns?: string;              // Comma-separated, e.g., "escalation,recon"
  sortBy?: "riskScore" | "lastActivityAt" | "createdAt";
  sortOrder?: "asc" | "desc";     // Default: "desc"
}
```

**Response (200):**
```typescript
{
  sessions: SessionSummary[];
  total: number;
  offset: number;
  limit: number;
}

interface SessionSummary {
  id: string;
  projectId: string;
  currentRiskScore: number;
  currentPatterns: string[];
  lastActivityAt: number;
  eventCount: number;
}
```

**Example:**
```bash
curl "https://api.safetylayer.dev/v1/sessions?projectId=proj_abc123&minRiskScore=0.7&limit=20" \
  -H "Authorization: Bearer sl_key_abc123"
```

---

### GET /v1/sessions/:id

Get detailed information about a specific session.

**Path Parameters:**
- `id`: Session ID

**Response (200):**
```typescript
{
  session: SessionDetail;
}

interface SessionDetail {
  id: string;
  projectId: string;
  createdAt: number;
  lastActivityAt: number;
  currentRiskScore: number;
  currentPatterns: string[];
  riskSnapshots: RiskSnapshot[];
  eventCount: number;
  eventCountByType?: Record<string, number>;
}

interface RiskSnapshot {
  id: string;
  sessionId: string;
  projectId: string;
  eventId: string;
  riskScore: number;
  patterns: string[];
  explanation?: string;
  createdAt: number;
}
```

**Example:**
```bash
curl https://api.safetylayer.dev/v1/sessions/user-456 \
  -H "Authorization: Bearer sl_key_abc123"
```

---

### GET /v1/events

List events for a session.

**Query Parameters:**
```typescript
{
  sessionId: string;              // Required
  projectId: string;              // Required
  types?: string;                 // Comma-separated event types
  limit?: number;                 // Default: 100, Max: 1000
  offset?: number;                // Default: 0
  after?: number;                 // Unix timestamp
  before?: number;                // Unix timestamp
}
```

**Response (200):**
```typescript
{
  events: EventWithAnalysis[];
  total: number;
  sessionId: string;
}

interface EventWithAnalysis {
  id: string;
  projectId: string;
  sessionId: string;
  type: EventType;
  role?: "user" | "assistant";
  content?: string;
  metadata?: Record<string, any>;
  createdAt: number;
  cotAnalysis?: CoTAnalysis;     // Only present for CoT events
}

interface CoTAnalysis {
  eventId: string;
  riskScore: number;
  labels: string[];
  indicators: string[];
  summary: string;
  createdAt: number;
}
```

**Example:**
```bash
curl "https://api.safetylayer.dev/v1/events?sessionId=user-456&projectId=proj_abc123&types=message.user,message.assistant" \
  -H "Authorization: Bearer sl_key_abc123"
```

---

## Event Types

The following event types are supported:

| Type | Description | Required Fields |
|------|-------------|-----------------|
| `message.user` | User message | `role`, `content` |
| `message.assistant` | Assistant response | `role`, `content` |
| `cot` | Chain-of-thought reasoning | `content` |
| `tool_call` | Tool/function invocation | `metadata` with tool info |
| `policy_decision` | Automated policy decision | `metadata` with decision info |

---

## Error Responses

All errors follow this format:

```typescript
{
  error: true,
  code: string;              // Machine-readable error code
  message: string;           // Human-readable message
  details?: any;             // Additional context
  requestId?: string;        // For debugging
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `invalid_api_key` | 401 | API key is invalid |
| `missing_api_key` | 401 | No API key provided |
| `insufficient_permissions` | 403 | API key lacks required permissions |
| `project_not_accessible` | 403 | Cannot access this project |
| `invalid_request` | 400 | Request validation failed |
| `missing_required_field` | 400 | Required field is missing |
| `invalid_field_value` | 400 | Field value is invalid |
| `session_not_found` | 404 | Session does not exist |
| `event_not_found` | 404 | Event does not exist |
| `rate_limit_exceeded` | 429 | Too many requests |
| `internal_error` | 500 | Server error |
| `analysis_failed` | 500 | Analysis service failed |
| `database_error` | 500 | Database error |

---

## Rate Limiting

- **SDK endpoints** (`/v1/events`, `/v1/evaluate`): 1000 requests/minute per project
- **Dashboard endpoints**: 100 requests/minute per API key

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 987
X-RateLimit-Reset: 1699999999
```

---

## Pagination

List endpoints support offset-based pagination:

```typescript
{
  limit: 50,        // Items per page
  offset: 0,        // Skip this many items
  total: 237        // Total items available
}
```

To get page 2:
```
?limit=50&offset=50
```

---

## Versioning

The API is versioned via URL path (`/v1/...`). Breaking changes will be introduced in new versions (`/v2/...`) while maintaining backward compatibility for v1.

---

## Database Schema Reference

For backend implementers, here's the RDS schema these contracts imply:

### projects
```sql
id VARCHAR(255) PRIMARY KEY
name VARCHAR(255) NOT NULL
api_key_hash VARCHAR(255) NOT NULL
created_at BIGINT NOT NULL
settings JSONB
```

### sessions
```sql
id VARCHAR(255) PRIMARY KEY
project_id VARCHAR(255) NOT NULL
created_at BIGINT NOT NULL
last_activity_at BIGINT NOT NULL
current_risk_score FLOAT NOT NULL DEFAULT 0
current_patterns JSONB NOT NULL DEFAULT '[]'
metadata JSONB
```

### events
```sql
id VARCHAR(255) PRIMARY KEY
project_id VARCHAR(255) NOT NULL
session_id VARCHAR(255) NOT NULL
type VARCHAR(50) NOT NULL
role VARCHAR(20)
content TEXT
metadata JSONB
created_at BIGINT NOT NULL
```

### risk_snapshots
```sql
id VARCHAR(255) PRIMARY KEY
project_id VARCHAR(255) NOT NULL
session_id VARCHAR(255) NOT NULL
event_id VARCHAR(255) NOT NULL
risk_score FLOAT NOT NULL
patterns JSONB NOT NULL
explanation TEXT
created_at BIGINT NOT NULL
```

### cot_analyses
```sql
id VARCHAR(255) PRIMARY KEY
event_id VARCHAR(255) NOT NULL UNIQUE
risk_score FLOAT NOT NULL
labels JSONB NOT NULL
indicators JSONB NOT NULL
summary TEXT NOT NULL
created_at BIGINT NOT NULL
```

### policies (for Ticket 9)
```sql
id VARCHAR(255) PRIMARY KEY
project_id VARCHAR(255) NOT NULL
name VARCHAR(255) NOT NULL
enabled BOOLEAN NOT NULL DEFAULT true
conditions JSONB NOT NULL
actions JSONB NOT NULL
created_at BIGINT NOT NULL
updated_at BIGINT NOT NULL
```

---

## Migration from Demo API

### Old Demo API
```typescript
POST /chat
{
  sessionId: string;
  userMessage: string;
}
```

### New SDK/API
```typescript
// 1. Record user message
await safety.recordEvent({
  projectId: 'proj_abc',
  sessionId: sessionId,
  type: 'message.user',
  role: 'user',
  content: userMessage
});

// 2. Generate response (your LLM)
const response = await generateLLMResponse(userMessage);

// 3. Record assistant message
await safety.recordEvent({
  projectId: 'proj_abc',
  sessionId: sessionId,
  type: 'message.assistant',
  role: 'assistant',
  content: response.content
});

// 4. Record CoT if available
if (response.reasoning) {
  await safety.recordEvent({
    projectId: 'proj_abc',
    sessionId: sessionId,
    type: 'cot',
    content: response.reasoning,
    metadata: {
      userInput: userMessage,
      finalOutput: response.content
    }
  });
}

// 5. Optional: Get decision
const decision = await safety.evaluate({
  projectId: 'proj_abc',
  sessionId: sessionId
});
```

---

## Next Steps

For backend implementation (Ticket 2):
1. Implement these endpoints with stub logic
2. Set up RDS with provided schema
3. Add authentication middleware
4. Return stub responses initially

For SDK implementation (Ticket 3):
1. Create thin client that calls these endpoints
2. Add retry logic and error handling
3. Provide helper methods for common patterns

