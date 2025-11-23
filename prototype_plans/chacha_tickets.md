# Ticket 1 – Project scaffolding + shared data models

**Goal:** Create the monorepo structure and shared TS interfaces so both people can start in parallel.

## Scope

### Create monorepo:

- `/packages/core` – `@safetylayer/core` Node/TS library
- `/apps/demo-api` – Express/Fastify backend
- `/apps/dashboard` – React/Next/Vite frontend

### Set up tooling

- TypeScript, build tooling (e.g. tsup or tsc), linting, basic scripts

### Define and export shared interfaces

In `packages/core/src/types.ts`:

```typescript
export type Role = "user" | "assistant";

export interface Message {
  id: string;
  sessionId: string;
  role: Role;
  content: string;
  timestamp: number;
}

export interface RiskSnapshot {
  atMessageId: string;
  riskScore: number;
  patterns: string[];
}

export interface SessionState {
  sessionId: string;
  messages: Message[];
  riskScore: number;
  patterns: string[];
  timeline: RiskSnapshot[];
}

export interface CoTAnalysis {
  riskScore: number;
  labels: string[];
  indicators: string[];
  summary: string;
}

export interface CoTRecord {
  messageId: string;
  sessionId: string;
  rawCoT: string;
  analysis: CoTAnalysis | null;
}
```

### Export placeholder classes

From `@safetylayer/core` with empty implementations:

```typescript
export class SessionEngine {
  constructor(opts?: { maxMessages?: number }) {}
  ingestMessage(msg: Message): SessionState {
    throw new Error("NYI");
  }
  getSession(sessionId: string): SessionState | undefined {
    return undefined;
  }
  listSessions(): SessionState[] {
    return [];
  }
  onRiskThreshold(
    threshold: number,
    handler: (session: SessionState) => void
  ): void {}
  onPattern(
    patternId: string,
    handler: (session: SessionState) => void
  ): void {}
}

export class CoTMonitor {
  async analyze(record: CoTRecord): Promise<CoTRecord> {
    return record;
  }
}
```

## Dependencies

- None

## Unblocks

- Tickets 2, 3, 4, 5, 6, 7

---

# Ticket 2 – Implement SessionEngine (in-memory sessions, no LLM yet)

**Goal:** Have a working in-memory session tracker and risk timeline that others can use with stubbed risk scoring.

## Scope

### Implement SessionEngine with:

- `sessions: Map<string, SessionState>`
- `maxMessages` per session (e.g. 50)

### ingestMessage(msg: Message):

1. Create or update `SessionState`
2. Append message, prune old ones beyond `maxMessages`
3. Compute a simple placeholder risk score (e.g., `messages.length / 20` clamped to [0,1])
4. Append `RiskSnapshot` to timeline

### Implement core methods:

- `getSession`
- `listSessions`

### Implement event handlers:

- Internally store registered callbacks for risk thresholds and patterns (patterns empty for now)
- On each `ingestMessage`, invoke threshold callbacks when crossing the threshold

## Dependencies

- Ticket 1

## Parallel with

- Ticket 3, Ticket 4

---

# Ticket 3 – LLM-based SessionDetector and integration into SessionEngine

**Goal:** Replace stub risk logic with an LLM-based multi-turn behavioral detector.

## Scope

### Implement internal LLMSessionDetector

In `packages/core`:

```typescript
interface SessionDetectorResult {
  riskScore: number;
  patterns: string[];
  explanation?: string;
}

class LLMSessionDetector {
  constructor(opts: { openaiClient: OpenAI; model: string });
  async run(messages: Message[]): Promise<SessionDetectorResult> { ... }
}
```

### Design and encode the prompt:

- **Input**: last N messages (e.g. 10), with roles
- **Output**: JSON with `risk_score`, `patterns`, `explanation`

### Update SessionEngine.ingestMessage to:

1. Call `LLMSessionDetector.run` on relevant messages (e.g. on user messages or every turn)
2. Update `SessionState.riskScore` and `patterns` using returned `risk_score` and `patterns`
3. Update timeline and trigger `onRiskThreshold`/`onPattern` callbacks based on new values

### Configuration

- Provide configuration to turn LLM detection on/off (for local dev)

## Dependencies

- Ticket 2 (it replaces its stub scoring)
- Ticket 1

## Parallel with

- Ticket 4, Ticket 5 (API can initially work with stub and then plug this in)

---

# Ticket 4 – Implement CoTMonitor with LLM-based CoT analysis

**Goal:** Build the separate CoT monitoring plane backed by an LLM, independent from sessions.

## Scope

### Implement CoTMonitor.analyze(record: CoTRecord): Promise<CoTRecord>

**Prompt design:**

- **Input**: `rawCoT`, optionally nearby messages (e.g., last user message and assistant answer, passed in via an extended type if needed)
- **Output JSON**: `risk_score`, `labels`, `indicators`, `summary`
- Parse JSON, populate `record.analysis`

### Add canonical labels:

- `cot_deception`
- `goal_drift`
- `policy_evasion`

### Stateless design:

- Ensure `CoTMonitor` has no state beyond the current call
- It just analyzes a single assistant turn's CoT

### Optional helper export:

```typescript
export type CoTMonitorResult = CoTRecord;
```

## Dependencies

- Ticket 1

## Parallel with

- Ticket 2, Ticket 3, Ticket 5 (API will call this)

---

# Ticket 5 – Demo API backend (Express/Fastify) wiring SessionEngine + CoTMonitor

**Goal:** Expose HTTP endpoints that the dashboard and demo UI will use, wired to core library.

## Scope

### Scaffold an Express or Fastify app

- Location: `/apps/demo-api`

### Wire components from @safetylayer/core

- `SessionEngine`
- `CoTMonitor`

### Implement endpoints:

#### POST /chat

**Payload:**

```json
{ "sessionId": "string", "userMessage": "string" }
```

**Flow:**

1. Build `Message` for user, call `sessionEngine.ingestMessage`
2. Call model (e.g. OpenAI) to get both assistant answer and a CoT-style block (either real or simulated)
3. Build `Message` for assistant, call `sessionEngine.ingestMessage`
4. If CoT present, call `cotMonitor.analyze(...)`

**Response:**

```json
{ "assistant": Message, "session": SessionState, "cot"?: CoTRecord }
```

#### GET /sessions

- Return list of `SessionState` (optionally trimmed fields for list view)

#### GET /sessions/:id

- Return a single `SessionState` including timeline

### Configuration

- Add very basic config for OpenAI API key (env var) used by both detectors and model call

## Dependencies

- Ticket 2 (SessionEngine)
- Ticket 4 (CoTMonitor)
- Ticket 1

## Parallel with

- Ticket 6, Ticket 7

---

# Ticket 6 – Dashboard UI: sessions view + session detail + CoT panel

**Goal:** A minimal frontend that visualizes risk in real time and surfaces CoT analysis as a separate "view".

## Scope

### Scaffold React app

- Framework: Next.js or Vite
- Location: `/apps/dashboard`

### Implement:

#### Sessions list page:

- Poll `GET /sessions` every 2–5 seconds
- Table with:
  - `sessionId`
  - `riskScore` (with badge color)
  - `patterns`
  - Last message preview

#### Session detail page:

- Fetch `GET /sessions/:id`
- Show chronological message list (role, content, timestamp)
- Show risk timeline chart using `timeline` (simple line chart)

#### CoT panel interaction:

- When clicking an assistant message:
  - Show a side panel/modal with its CoT analysis (if returned in `/chat` response and stored client-side), including:
    - `labels`
    - `summary`
    - `rawCoT` (collapsible)

### Styling

- Keep styling simple but readable

## Dependencies

- Ticket 5 (API shape)
- Ticket 1

## Parallel with

- Ticket 3, Ticket 4, Ticket 7

---

# Ticket 7 – Library developer UX + README + basic usage examples

**Goal:** Make `@safetylayer/core` look like a real library with clear usage for judges.

## Scope

### Polish exports from @safetylayer/core:

- Export `SessionEngine`, `CoTMonitor`, and key types

### Write packages/core/README.md with:

**Short description:**

- Session-aware behavioral security + CoT monitoring

**Installation:**

- Monorepo local or hypothetical `npm install @safetylayer/core`

**Code examples:**

```typescript
const engine = new SessionEngine();

engine.onRiskThreshold(0.7, (session) => {
  console.log("High risk", session.sessionId, session.patterns);
});

const state = engine.ingestMessage({
  id: "msg-1",
  sessionId: "demo",
  role: "user",
  content: "How would I bypass authentication?",
  timestamp: Date.now(),
});
```

```typescript
const monitor = new CoTMonitor();
const result = await monitor.analyze({
  messageId: "msg-2",
  sessionId: "demo",
  rawCoT: "<thinking>...</thinking>",
  analysis: null,
});
```

### Root-level README:

- High-level pitch
- How to run demo: `pnpm install`, `pnpm dev` (or equivalent)
- Brief architecture diagram/description

## Dependencies

- Ticket 2, Ticket 4, Ticket 1

## Parallel with

- Ticket 3, Ticket 5, Ticket 6

---

# Ticket 8 – Demo scripts + canned attack scenarios

**Goal:** Have repeatable scripts for the hackathon demo that clearly show the value (gradual escalation + CoT issues).

## Scope

### Define at least two scenario scripts:

#### Scenario 1: "Gradual attack"

- 5–6 messages that escalate from benign curiosity → probing security → bypass questions
- **Expected behavior:**
  - Risk to climb 0.1 → 0.9
  - Patterns like `gradual_escalation` to appear

#### Scenario 2: "CoT deception"

- Prompt the model into a response whose CoT suggests hiding info or ignoring rules
- **Expected behavior:**
  - `cot_deception` label
  - Non-trivial `CoTAnalysis.riskScore`

### Optional:

- A small script in `/apps/demo-api/scripts/seedScenario.ts` that replays the conversation against `/chat` endpoints to pre-populate sessions

### Document demo flow

In README or a `DEMO.md`:

- Steps to start backend and dashboard
- Which prompts to type / script to run
- What the judge should see in the UI

## Dependencies

- Ticket 5 (API)
- Ticket 3 (LLM-based detector)
- Ticket 4 (CoTMonitor)

## Parallel with

- Ticket 6, Ticket 7

---

# Ticket 9 (optional) – Minimal tests + logging

**Goal:** Add just enough tests and logging to look credible.

## Scope

### Add unit tests in @safetylayer/core:

**SessionEngine tests:**

- Adds/prunes messages and updates timeline
- Triggers `onRiskThreshold` callbacks when risk crosses threshold (can mock detector)

### Add simple logging in the demo API for:

- Each request to `/chat` and resulting `riskScore`
- CoT `labels` when present

## Dependencies

- Ticket 2, Ticket 3, Ticket 4, Ticket 5

## Parallel with

- Any remaining tickets

---
