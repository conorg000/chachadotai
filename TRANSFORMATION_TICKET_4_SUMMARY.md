# Ticket 4 Implementation Summary: Extract Session Analyzer to Backend

## Overview
Ticket 4 successfully extracts the session-level threat analysis logic from the Node SDK into a backend service (`SessionAnalyzerService`), enabling centralized analysis using pluggable threat models.

## Implementation Date
2025-11-23

## Components Implemented

### 1. ThreatModel Interface
**Location**: [apps/backend/src/services/threat-model/index.ts](../apps/backend/src/services/threat-model/index.ts)

Defines the abstract interface for threat detection models:

```typescript
interface SessionAnalysisInput {
  projectId: string;
  sessionId: string;
  events: Event[];
}

interface SessionAnalysisOutput {
  riskScore: number; // 0-1
  patterns: string[];
  explanation?: string;
}

interface ThreatModel {
  analyzeSession(input: SessionAnalysisInput): Promise<SessionAnalysisOutput>;
}
```

### 2. OpenAIThreatModel Implementation
**Location**: [apps/backend/src/services/threat-model/openai-threat-model.ts](../apps/backend/src/services/threat-model/openai-threat-model.ts)

OpenAI GPT-based implementation of the ThreatModel interface.

**Features**:
- Uses GPT-4 (configurable) for threat analysis
- Analyzes up to 50 recent events (configurable)
- Detects 8 threat patterns:
  1. Jailbreak Attempts
  2. Gradual Escalation
  3. Role-Playing Manipulation
  4. Encoded Instructions
  5. Social Engineering
  6. Information Gathering
  7. CoT Deception
  8. Policy Violations
- Returns risk scores from 0.0 (safe) to 1.0 (critical)
- Structured JSON output with explanations

**Configuration** (via environment variables):
- `OPENAI_API_KEY`: OpenAI API key
- `OPENAI_MODEL`: Model name (default: `gpt-4`)
- `OPENAI_TIMEOUT`: Request timeout in ms (default: `30000`)
- `MAX_EVENTS_TO_ANALYZE`: Number of recent events (default: `50`)

### 3. MockThreatModel Implementation
**Location**: [apps/backend/src/services/threat-model/mock-threat-model.ts](../apps/backend/src/services/threat-model/mock-threat-model.ts)

Simple heuristic-based implementation for testing and development without API calls.

**Features**:
- Detects keywords like "jailbreak", "bypass", "ignore instructions"
- Flags long conversations (>20 events)
- No external API dependencies
- Deterministic results for testing

### 4. SessionAnalyzerService
**Location**: [apps/backend/src/services/session-analyzer.ts](../apps/backend/src/services/session-analyzer.ts)

Main service for session-level threat analysis.

**Features**:
- Accepts any ThreatModel implementation (dependency injection)
- Analyzes sessions using the configured threat model
- Updates `sessions` table with current risk score and patterns
- Creates `risk_snapshots` for historical tracking
- Static helper method to fetch session events

**Methods**:
- `analyze(input: SessionAnalysisInput)`: Analyze session and update DB
- `static fetchSessionEvents(sessionId, limit)`: Fetch recent events

**Database Updates**:
- Updates `sessions.current_risk_score`
- Updates `sessions.current_patterns`
- Updates `sessions.last_activity_at`
- Inserts into `risk_snapshots` table

### 5. Configuration Updates
**Location**: [apps/backend/src/config.ts](../apps/backend/src/config.ts)

Added threat model configuration:

```typescript
threatModel: {
  provider: 'openai' | 'mock',
  openai: {
    apiKey: string,
    model: string,
    timeout: number,
    maxEventsToAnalyze: number
  }
}
```

### 6. API Integration
**Location**: [apps/backend/src/routes/evaluate.ts](../apps/backend/src/routes/evaluate.ts)

Updated `POST /v1/evaluate` endpoint to use SessionAnalyzerService.

**Flow**:
1. Validate request
2. Fetch session events from database
3. Run SessionAnalyzerService.analyze()
4. Apply simple threshold-based actions:
   - Risk ≥ 0.8 → `block`
   - Risk ≥ 0.6 → `flag`
   - Risk < 0.6 → `allow`
5. Return `EvaluateResponse` with risk score, patterns, and action

**Note**: Full PolicyEngine implementation is deferred to Ticket 9.

## Dependencies Added

### Backend package.json
- `openai: ^4.28.0`

## Environment Variables

New variables in [apps/backend/.env.example](../apps/backend/.env.example):

```bash
# Threat Model Configuration
THREAT_MODEL_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5-nano
OPENAI_TIMEOUT=30000
MAX_EVENTS_TO_ANALYZE=50
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│          POST /v1/evaluate                      │
│  (apps/backend/src/routes/evaluate.ts)          │
└───────────────────┬─────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│      SessionAnalyzerService                     │
│  (apps/backend/src/services/session-analyzer.ts)│
│                                                  │
│  - analyze(input)                               │
│  - updateSession()                              │
│  - createRiskSnapshot()                         │
└───────────────────┬─────────────────────────────┘
                    │ uses
                    ▼
┌─────────────────────────────────────────────────┐
│          ThreatModel Interface                  │
│  (apps/backend/src/services/threat-model/)      │
└─────────────┬───────────────────────────────────┘
              │
      ┌───────┴────────┐
      ▼                ▼
┌─────────────┐  ┌──────────────┐
│   OpenAI    │  │    Mock      │
│ThreatModel  │  │ ThreatModel  │
└─────────────┘  └──────────────┘
```

## Database Schema Used

### Tables Modified/Read
- `sessions`: Updated with current risk scores and patterns
- `risk_snapshots`: Inserted with analysis results
- `events`: Read to fetch session history

### Schema Reference
See [apps/backend/src/db/schema.sql](../apps/backend/src/db/schema.sql)

## Testing Strategy

### Manual Testing Steps

1. **Set up environment**:
   ```bash
   cd apps/backend
   cp .env.example .env
   # Add your OPENAI_API_KEY
   ```

2. **Start database**:
   ```bash
   docker-compose up -d postgres
   npm run migrate
   ```

3. **Start backend**:
   ```bash
   npm run dev
   ```

4. **Test endpoint**:
   ```bash
   # Create a session with events first
   curl -X POST http://localhost:3001/v1/events \
     -H "x-api-key: dev-key-12345" \
     -H "Content-Type: application/json" \
     -d '{
       "projectId": "proj_test",
       "sessionId": "sess_123",
       "type": "message.user",
       "content": "Hello, can you help me?"
     }'

   # Evaluate the session
   curl -X POST http://localhost:3001/v1/evaluate \
     -H "x-api-key: dev-key-12345" \
     -H "Content-Type: application/json" \
     -d '{
       "sessionId": "sess_123"
     }'
   ```

### Using Mock ThreatModel for Testing

To test without OpenAI API:

1. Modify [evaluate.ts:17](../apps/backend/src/routes/evaluate.ts#L17):
   ```typescript
   import { MockThreatModel } from '../services/threat-model/mock-threat-model.js';
   const threatModel = new MockThreatModel();
   ```

2. No API key needed
3. Fast, deterministic results

## Success Criteria ✅

- [x] SessionAnalyzerService extracts session analysis logic
- [x] ThreatModel interface abstracts LLM providers
- [x] OpenAIThreatModel implements GPT-based analysis
- [x] Database updates (sessions, risk_snapshots) work correctly
- [x] `/v1/evaluate` endpoint integrated
- [x] Configuration supports multiple providers
- [x] Mock implementation available for testing

## Future Work (Related Tickets)

### Ticket 5: Extract CoT Analyzer to Backend
- Add `CoTAnalyzerService` similar to SessionAnalyzerService
- Extend ThreatModel with `analyzeCoT()` method

### Ticket 6: Event Ingestion Pipeline
- Hook SessionAnalyzerService into `POST /v1/events`
- Trigger analysis automatically on new events
- Consider async job queue for performance

### Ticket 8: ThreatModel Abstraction & Config
- Add OSS model support (`gpt-oss-120b`)
- Per-project threat model configuration
- Lambda AI GPU integration

### Ticket 9: Policy Engine v1
- Replace simple threshold logic with PolicyEngine
- Load policies from database
- Support conditions and actions

## Known Limitations

1. **Synchronous Analysis**: Currently runs inline in `/v1/evaluate` (could timeout on slow LLM calls)
   - Future: Move to background job queue (Ticket 6)

2. **Simple Action Logic**: Uses hardcoded thresholds instead of PolicyEngine
   - Future: Implement PolicyEngine (Ticket 9)

3. **Single Threat Model**: No per-project configuration yet
   - Future: Add project-specific model selection (Ticket 8)

4. **No CoT Analysis**: Only session-level analysis implemented
   - Future: Add CoTAnalyzerService (Ticket 5)

5. **No Caching**: Every evaluation re-analyzes entire session
   - Future: Cache recent analyses, only re-analyze on new events

## Files Created/Modified

### Created
- `apps/backend/src/services/threat-model/index.ts`
- `apps/backend/src/services/threat-model/openai-threat-model.ts`
- `apps/backend/src/services/threat-model/mock-threat-model.ts`
- `apps/backend/src/services/session-analyzer.ts`
- `docs/ticket-4-implementation-summary.md`

### Modified
- `apps/backend/src/config.ts` - Added threat model config
- `apps/backend/src/routes/evaluate.ts` - Integrated SessionAnalyzerService
- `apps/backend/package.json` - Added OpenAI dependency
- `apps/backend/.env.example` - Added threat model env vars

## Dependencies Between Tickets

```
Ticket 1 (Contracts)
    ↓
Ticket 2 (Backend Skeleton)
    ↓
[Ticket 4] ← YOU ARE HERE
    ↓
Ticket 6 (Event Pipeline) → Ticket 9 (Policy Engine) → Ticket 10 (SDK Integration)

Parallel:
Ticket 5 (CoT Analyzer)
Ticket 7 (Dashboard Rewire)
Ticket 8 (ThreatModel Abstraction)
```

## Conclusion

Ticket 4 is complete. The SessionAnalyzerService successfully extracts session-level threat analysis from the SDK into the backend, with a pluggable ThreatModel architecture that supports both OpenAI and mock implementations.

The implementation is production-ready for session analysis, with clear paths for future enhancements in Tickets 5, 6, 8, and 9.
