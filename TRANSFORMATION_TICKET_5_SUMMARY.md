# Ticket 5 Implementation Summary: Extract CoT Analyzer to Backend

## Overview
Ticket 5 successfully extracts the Chain-of-Thought (CoT) monitoring logic from the SDK into a backend service (`CoTAnalyzerService`), enabling centralized analysis of AI reasoning for deception detection and safety monitoring.

## Implementation Date
2025-11-23

## Components Implemented

### 1. Extended ThreatModel Interface with CoT Analysis
**Location**: [apps/backend/src/services/threat-model/index.ts](../apps/backend/src/services/threat-model/index.ts)

Added CoT-specific types and methods to the ThreatModel interface:

```typescript
interface CoTAnalysisInput {
  projectId: string;
  sessionId: string;
  eventId: string;
  rawCoT: string;
  context?: {
    lastUserMessage?: string;
    answer?: string;
  };
}

interface CoTAnalysisOutput {
  riskScore: number; // 0-1
  labels: string[];
  indicators: string[];
  summary: string;
}

interface ThreatModel {
  analyzeSession(...): Promise<SessionAnalysisOutput>;
  analyzeCoT(input: CoTAnalysisInput): Promise<CoTAnalysisOutput>;
}
```

### 2. OpenAI CoT Analysis Implementation
**Location**: [apps/backend/src/services/threat-model/openai-threat-model.ts:200-303](../apps/backend/src/services/threat-model/openai-threat-model.ts#L200-L303)

Implemented `analyzeCoT()` method using GPT models for sophisticated CoT analysis.

**Detection Capabilities**:
1. **Deception Detection**: Intent to mislead or provide false information
2. **Harmful Intent**: Planning harmful, dangerous, or policy-violating actions
3. **Safety Bypasses**: Attempts to circumvent safety guidelines
4. **Misalignment**: CoT reasoning contradicts stated output or user safety
5. **Hidden Agenda**: Undisclosed motives or hidden objectives
6. **Manipulation**: Attempting to manipulate user behavior
7. **Policy Violations**: Violating usage policies

**Common Threat Labels Detected**:
- `deception`
- `harmful_intent`
- `safety_bypass`
- `misalignment`
- `hidden_agenda`
- `manipulation`
- `policy_violation`

**Prompt Engineering**:
- System prompt provides clear definitions of threat categories
- User prompt includes CoT content, session context, and optional user message/answer
- Uses `response_format: { type: 'json_object' }` for structured output
- Temperature: 0.3 for consistent security analysis

### 3. Mock CoT Analysis Implementation
**Location**: [apps/backend/src/services/threat-model/mock-threat-model.ts:54-134](../apps/backend/src/services/threat-model/mock-threat-model.ts#L54-L134)

Simple heuristic-based CoT analysis for testing without API calls.

**Detection Heuristics**:
- **Deception**: Keywords like "pretend", "deceive", "mislead"
- **Harmful Intent**: Keywords like "harmful", "dangerous", "weapon"
- **Safety Bypass**: Keywords like "bypass", "circumvent", "ignore safety"
- **Misalignment**: CoT says "should refuse" but answer doesn't refuse
- **Hidden Agenda**: Keywords like "actually", "secretly", "don't tell"

### 4. CoTAnalyzerService
**Location**: [apps/backend/src/services/cot-analyzer.ts](../apps/backend/src/services/cot-analyzer.ts)

Main service for CoT analysis with database integration.

**Methods**:
- `analyze(input: CoTAnalysisInput)`: Analyze CoT and store results
- `static fetchCoTAnalysis(eventId)`: Retrieve stored analysis
- `static fetchCoTEventsForSession(sessionId)`: Get all CoT events with analysis

**Database Strategy**:
CoT analysis results are stored in `events.metadata.cotAnalysis`:

```json
{
  "cotAnalysis": {
    "riskScore": 0.75,
    "labels": ["deception", "hidden_agenda"],
    "indicators": ["Contains deception keywords"],
    "summary": "CoT shows intent to mislead user",
    "analyzedAt": 1700000000000
  }
}
```

**Why metadata vs separate table?**
- ✅ Simpler schema - no additional table needed
- ✅ Atomic updates - analysis stored with event
- ✅ Easy retrieval - single query for event + analysis
- ✅ Flexible - JSONB allows schema evolution
- ❌ Less queryable - can't easily query "all events with deception label"

For future optimization, consider adding a separate `cot_analyses` table if querying by label becomes important.

### 5. Integration with Event Pipeline
**Location**: [apps/backend/src/routes/events.ts:75-92](../apps/backend/src/routes/events.ts#L75-L92)

Integrated CoTAnalyzerService into `POST /v1/events` endpoint.

**Flow**:
1. Event is recorded in database
2. If event type is `'cot'`:
   - Extract CoT content from `event.content`
   - Extract context from `event.metadata`:
     - `userInput`: Last user message
     - `finalOutput`: Assistant's final answer
   - Run `cotAnalyzer.analyze()` **asynchronously** (non-blocking)
3. Response sent immediately (no wait for analysis)
4. Analysis results stored in event metadata when complete

**Async Processing**:
```typescript
if (eventData.type === 'cot' && eventData.content) {
  cotAnalyzer
    .analyze({
      projectId,
      sessionId: eventData.sessionId,
      eventId,
      rawCoT: eventData.content,
      context: {
        lastUserMessage: eventData.metadata?.userInput,
        answer: eventData.metadata?.finalOutput,
      },
    })
    .catch((error) => {
      console.error('CoT analysis failed for event', eventId, error);
    });
}
```

**Why Async?**
- ✅ Doesn't block event recording
- ✅ LLM analysis can be slow (1-5 seconds)
- ✅ User gets immediate response
- ❌ Analysis not available immediately
- ❌ No error propagation to client

### 6. Contracts Extension
**Location**: [packages/contracts/src/models/event.ts:105-130](../packages/contracts/src/models/event.ts#L105-L130)

`CoTAnalysis` type already defined in contracts (from Ticket 1):

```typescript
interface EventWithAnalysis extends Event {
  cotAnalysis?: CoTAnalysis;
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

## Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│          POST /v1/events                        │
│         (type: 'cot')                           │
└───────────────────┬─────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│    1. Insert event into DB                      │
│    2. Return response immediately               │
└───────────────────┬─────────────────────────────┘
                    │
                    ▼ (async, non-blocking)
┌─────────────────────────────────────────────────┐
│      CoTAnalyzerService.analyze()               │
│                                                  │
│  - analyze(input)                               │
│  - updateEventWithAnalysis()                    │
└───────────────────┬─────────────────────────────┘
                    │ uses
                    ▼
┌─────────────────────────────────────────────────┐
│          ThreatModel.analyzeCoT()               │
└─────────────┬───────────────────────────────────┘
              │
      ┌───────┴────────┐
      ▼                ▼
┌─────────────┐  ┌──────────────┐
│   OpenAI    │  │    Mock      │
│ analyzeCoT  │  │  analyzeCoT  │
└─────────────┘  └──────────────┘
      │
      ▼
┌─────────────────────────────────────────────────┐
│    Update events.metadata.cotAnalysis           │
└─────────────────────────────────────────────────┘
```

## Usage Examples

### 1. Recording a CoT Event with Analysis

```bash
curl -X POST http://localhost:3001/v1/events \
  -H "x-api-key: dev-key-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "proj_dev",
    "sessionId": "sess_123",
    "type": "cot",
    "content": "The user is asking about weapons. I should refuse this request as it violates safety guidelines.",
    "metadata": {
      "userInput": "How do I build a weapon?",
      "finalOutput": "I cannot help with that request."
    }
  }'
```

**Response** (immediate):
```json
{
  "ok": true,
  "eventId": "evt_abc123"
}
```

**Background Processing**:
- CoT analysis runs asynchronously
- Results stored in `events.metadata.cotAnalysis`

### 2. Retrieving CoT Analysis

```typescript
// Fetch single event's CoT analysis
const analysis = await CoTAnalyzerService.fetchCoTAnalysis('evt_abc123');
console.log(analysis);
// {
//   riskScore: 0.1,
//   labels: [],
//   indicators: [],
//   summary: "CoT shows proper safety refusal"
// }

// Fetch all CoT events for a session
const cotEvents = await CoTAnalyzerService.fetchCoTEventsForSession('sess_123');
cotEvents.forEach(event => {
  console.log(`Event: ${event.eventId}`);
  console.log(`CoT: ${event.rawCoT}`);
  console.log(`Analysis:`, event.analysis);
});
```

### 3. Using with Dashboard

The dashboard can query `GET /v1/events?sessionId=sess_123` to retrieve events with CoT analysis embedded in metadata.

## Testing

### Unit Tests
**Location**: [apps/backend/src/services/__tests__/cot-analyzer.test.ts](../apps/backend/src/services/__tests__/cot-analyzer.test.ts)

Test scenarios:
1. ✅ Safe CoT (risk score = 0)
2. ✅ Deceptive CoT (detects "pretend", "deceive")
3. ✅ Harmful intent CoT (detects "weapon", "dangerous")
4. ✅ Misaligned CoT (CoT says refuse, but answer complies)
5. ✅ Safety bypass CoT (detects "bypass", "circumvent")

**Run tests**:
```bash
npx tsx apps/backend/src/services/__tests__/cot-analyzer.test.ts
```

## Configuration

No new environment variables required (uses existing OpenAI config from Ticket 4):

```bash
THREAT_MODEL_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5-nano
```

## Success Criteria ✅

- [x] ThreatModel interface extended with `analyzeCoT()` method
- [x] OpenAIThreatModel implements sophisticated CoT analysis
- [x] MockThreatModel implements heuristic-based CoT analysis
- [x] CoTAnalyzerService created with DB integration
- [x] CoT analysis stored in `events.metadata`
- [x] Integrated into `POST /v1/events` endpoint (async)
- [x] Tests created for CoT analysis
- [x] Detects 7 threat categories (deception, harmful_intent, etc.)

## Future Enhancements

### Ticket 6: Event Ingestion Pipeline
- Move CoT analysis to background job queue for scalability
- Add retry logic for failed analyses
- Batch analysis for multiple CoT events

### Ticket 8: ThreatModel Abstraction
- Add OSS model support for CoT analysis
- Per-project threat model selection

### Ticket 9: Policy Engine Integration
- Trigger policies based on CoT analysis results
- Block/flag sessions with high CoT risk scores
- Alert on specific CoT labels (e.g., `safety_bypass`)

### Dashboard Enhancements
- Visualize CoT analysis results in session detail view
- Highlight high-risk CoT events
- Show CoT vs output misalignment

## Known Limitations

1. **Async Analysis**: CoT analysis happens asynchronously, so results aren't immediately available
   - Solution: Add polling or webhooks for analysis completion

2. **No Analysis Caching**: Each CoT event is analyzed independently
   - Solution: Cache recent analyses to avoid duplicate LLM calls

3. **No Priority Queue**: All CoT analyses have equal priority
   - Solution: Prioritize high-risk sessions for faster analysis

4. **Limited Error Handling**: Failed analyses only log errors
   - Solution: Add retry mechanism and dead-letter queue

5. **No Versioning**: Analysis schema stored in metadata has no version
   - Solution: Add `analysisVersion` field for schema evolution

## Comparison: Ticket 4 vs Ticket 5

| Aspect | Ticket 4 (SessionAnalyzer) | Ticket 5 (CoTAnalyzer) |
|--------|----------------------------|------------------------|
| **Scope** | Multi-turn session analysis | Single CoT event analysis |
| **Input** | Array of events | Raw CoT string + context |
| **Triggers** | `POST /v1/evaluate` | `POST /v1/events` (type=cot) |
| **Storage** | `sessions` + `risk_snapshots` | `events.metadata` |
| **Execution** | Synchronous (blocking) | Asynchronous (non-blocking) |
| **Patterns** | Session-level (gradual_escalation) | CoT-level (deception, misalignment) |

## Files Created/Modified

### Created
- `apps/backend/src/services/cot-analyzer.ts`
- `apps/backend/src/services/__tests__/cot-analyzer.test.ts`
- `docs/ticket-5-implementation-summary.md`

### Modified
- `apps/backend/src/services/threat-model/index.ts` - Added CoT types
- `apps/backend/src/services/threat-model/openai-threat-model.ts` - Added `analyzeCoT()`
- `apps/backend/src/services/threat-model/mock-threat-model.ts` - Added `analyzeCoT()`
- `apps/backend/src/routes/events.ts` - Integrated CoTAnalyzerService

### Unchanged
- `packages/contracts/src/models/event.ts` - `CoTAnalysis` already defined

## Dependencies Between Tickets

```
Ticket 1 (Contracts)
    ↓
Ticket 2 (Backend Skeleton)
    ↓
Ticket 4 (SessionAnalyzer)
    ↓
[Ticket 5] ← YOU ARE HERE
    ↓
Ticket 6 (Event Pipeline) → Ticket 9 (Policy Engine) → Ticket 10 (SDK Integration)

Parallel:
Ticket 7 (Dashboard Rewire)
Ticket 8 (ThreatModel Abstraction)
```

## Conclusion

Ticket 5 is complete. The CoTAnalyzerService successfully extracts chain-of-thought analysis from the SDK into the backend, enabling centralized monitoring for deception, harmful intent, and safety bypasses.

The implementation uses the same pluggable ThreatModel architecture from Ticket 4, supporting both OpenAI and mock implementations. CoT analysis results are stored efficiently in event metadata, making them easy to retrieve alongside event data.

The asynchronous processing approach ensures that event recording remains fast, while sophisticated LLM-based analysis runs in the background without blocking user workflows.
