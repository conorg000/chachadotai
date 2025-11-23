Here’s a ticket breakdown based on the plan (excluding Phase 6), organised so that after a single foundation ticket, the two of you can work in parallel.

---

## Ticket 1 – Define API & Data Contracts (Foundation)

**Goal**
Create the shared contracts (types + HTTP API spec) that all other work will rely on.

**Scope**

- Define core data models (in a `contracts` module/repo folder):

  - `Session`
  - `Event`
  - `RiskSnapshot`
  - `CoTAnalysis`
  - `Project`
  - `Policy` (minimal shape)

- Define v1 HTTP API spec (OpenAPI or markdown):

  - `POST /v1/events`

    - Body: `{ projectId, sessionId, type, role?, content?, metadata? }`
    - Returns: `{ ok: true }` (for now)

  - `POST /v1/evaluate`

    - Body: `{ projectId, sessionId, latestMessage }`
    - Returns: `{ riskScore, patterns, action? }`

  - `GET /v1/sessions?projectId=...`

    - Returns: `Session[]` (trimmed list fields: id, riskScore, patterns, lastActivity).

  - `GET /v1/sessions/:id`

    - Returns: full `Session` including `riskSnapshots` (timeline).

  - `GET /v1/events?sessionId=...`

    - Returns: `Event[]` (messages, tool calls, CoT events with analysis if present).

- Decide the event types (e.g. `message.user`, `message.assistant`, `cot`, `tool_call`, `policy_decision`).

**Dependencies**
None.
**Unblocks**
Tickets 2–10.

---

## Ticket 2 – Backend Skeleton + RDS Schema

**Goal**
Stand up the basic control-plane backend with RDS schema and empty handlers for the API spec from Ticket 1.

**Scope**

- Create a new backend service (Node/TS on EC2 or local dev for now):

  - Express/Fastify/Nest (whatever you’re already using).

- Implement authentication placeholder (simple API key per project).

- Create RDS schema (using migrations):

  - `projects(id, name, api_key_hash, created_at, ...)`
  - `sessions(id, project_id, created_at, last_activity_at, current_risk_score, current_patterns JSONB)`
  - `events(id, session_id, project_id, type, role, content, metadata JSONB, created_at)`
  - `risk_snapshots(id, session_id, project_id, event_id, risk_score, patterns JSONB, created_at)`

- Implement API endpoints as stubs:

  - `POST /v1/events`: validate input, insert into `events`, upsert `sessions` (no analysis yet).
  - `POST /v1/evaluate`: validate input, return stub `{ riskScore: 0, patterns: [], action: null }`.
  - `GET /v1/sessions`, `GET /v1/sessions/:id`, `GET /v1/events?sessionId=...` backed by RDS.

**Dependencies**
Ticket 1.
**Parallel**
Tickets 3, 6 can start once basic schemas/endpoints stabilise.

---

## Ticket 3 – SDK Refactor: From Engine to Client of Backend

**Goal**
Refactor the existing Node package into a thin SDK that talks to the new backend, while retaining a compatibility mode if needed.

**Scope**

- New SDK surface (in `@safetylayer/node`):

  ```ts
  const safety = new SafetyLayer({
    apiKey: '...',
    projectId: '...',
    endpoint: 'https://api.safetylayer.dev'
  });

  await safety.recordEvent({
    sessionId,
    type: 'message.user',
    content: '...',
    metadata: { ... }
  });

  const decision = await safety.evaluate({
    sessionId,
    latestMessage: { role: 'user', content: '...' }
  });
  ```

- Implement:

  - `recordEvent` → POST `/v1/events`
  - `evaluate` → POST `/v1/evaluate`

- Handle:

  - `sessionId` input (user-provided, but add helper to generate if missing).
  - Basic retry/backoff on transient errors.
  - Configuration (endpoint, timeouts, logging).

- Optional (flagged) “legacy mode”:

  - Keep ability to run locally with in-process logic for your own tests/demos (behind a config flag).

**Dependencies**
Ticket 1.
**Parallel**
Tickets 2, 6, 7.

---

## Ticket 4 – Extract Session Analyzer to Backend (SessionAnalyzerService)

**Goal**
Move the session-level threat analysis logic (multi-turn session detector) from the Node package into a backend service.

**Scope**

- Implement `SessionAnalyzerService` in backend:

  ```ts
  interface SessionAnalysisInput {
    projectId: string;
    sessionId: string;
    events: Event[];
  }

  interface SessionAnalysisOutput {
    riskScore: number;
    patterns: string[];
    explanation?: string;
  }

  class SessionAnalyzerService {
    constructor(threatModel: ThreatModel) {}
    analyze(input: SessionAnalysisInput): Promise<SessionAnalysisOutput> { ... }
  }
  ```

- Implement an initial `ThreatModel` using OpenAI (just for session analysis for now):

  ```ts
  interface ThreatModel {
    analyzeSession(input: SessionAnalysisInput): Promise<SessionAnalysisOutput>;
  }
  ```

- Prompt design:

  - Take last N events for the session.
  - Provide role-labelled messages.
  - Ask for JSON: `{ "risk_score": 0-1, "patterns": [...], "explanation": "..." }`.

- On analysis:

  - Update `sessions.current_risk_score` and `sessions.current_patterns`.
  - Insert a row into `risk_snapshots`.

**Dependencies**
Tickets 1, 2.
**Parallel**
Ticket 5, 6, 7.

---

## Ticket 5 – Extract CoT Analyzer to Backend (CoTAnalyzerService)

**Goal**
Move CoT monitoring logic into a backend service, using LLMs for analysis.

**Scope**

- Implement `CoTAnalyzerService`:

  ```ts
  interface CoTAnalysisInput {
    projectId: string;
    sessionId: string;
    eventId: string;      // the CoT event
    rawCoT: string;
    context?: { lastUserMessage?: string; answer?: string };
  }

  interface CoTAnalysisOutput {
    riskScore: number;
    labels: string[];
    indicators: string[];
    summary: string;
  }

  class CoTAnalyzerService {
    constructor(threatModel: ThreatModel) {}
    analyze(input: CoTAnalysisInput): Promise<CoTAnalysisOutput> { ... }
  }
  ```

- Extend `ThreatModel`:

  ```ts
  interface ThreatModel {
    analyzeSession(...): Promise<SessionAnalysisOutput>;
    analyzeCoT(input: CoTAnalysisInput): Promise<CoTAnalysisOutput>;
  }
  ```

- Implement initial OpenAI-based `ThreatModel.analyzeCoT`.

- DB changes:

  - Either:

    - Store `CoTAnalysis` in `events.metadata` for CoT events, or
    - Create `cot_analyses` table with `event_id` FK.

**Dependencies**
Tickets 1, 2.
**Parallel**
Tickets 4, 6, 7.

---

## Ticket 6 – Event Ingestion Pipeline & Analysis Hook-Up

**Goal**
Wire the backend ingestion flow so that new events trigger session and CoT analysis via the services from Tickets 4 and 5.

**Scope**

- In `POST /v1/events` handler:

  - Insert event into `events`.
  - Upsert `sessions` (create if missing; update `last_activity_at`).
  - Enqueue an internal task/job:

    - For performance simplicity, can start as “just call `analyze` inline” and later move to a worker.
    - For each new event:

      - Fetch recent events for `sessionId`.
      - Call `SessionAnalyzerService.analyze`.
      - If event is CoT-type:

        - Call `CoTAnalyzerService.analyze`.

- Write minimal error handling & logging.
- Ensure `GET /v1/sessions` and `GET /v1/sessions/:id` reflect updated `riskScore` and `patterns`.

**Dependencies**
Tickets 2, 4, 5.
**Parallel**
Tickets 3, 7, 8.

---

## Ticket 7 – Dashboard Rewire to Backend (Multi-tenant Ready)

**Goal**
Make the dashboard talk only to the new backend API and be project-aware (even if you start with a single project).

**Scope**

- Add a simple “project selector” or hard-code one `projectId` for now, but design components to accept `projectId`.

- Replace calls to the old demo API / in-memory engine with:

  - `GET /v1/sessions?projectId=...` for sessions list.
  - `GET /v1/sessions/:id` for session detail view.
  - `GET /v1/events?sessionId=...` to render message list + CoT events.

- Sessions list:

  - Show `id`, `current_risk_score`, `current_patterns`, `last_activity_at`.

- Session detail:

  - Message list based on `events`.
  - Risk timeline based on `risk_snapshots`.
  - CoT panel:

    - For events that have CoT analysis (metadata or `cot_analyses`), show `labels`, `summary`, and raw CoT.

- Wire basic auth to backend (even if just an API key in env for now).

**Dependencies**
Tickets 1, 2.
**Parallel**
Tickets 3, 4, 5, 6, 8, 9.

---

## Ticket 8 – ThreatModel Abstraction & Config (OpenAI → OSS-ready)

**Goal**
Make the analysis layer pluggable so you can later swap OpenAI for `gpt-oss-120b` with minimal refactor.

**Scope**

- Finalise `ThreatModel` interface (already used by Tickets 4 and 5).
- Implement `OpenAIThreatModel`:

  - Reads model name + API key from config.
  - Used by `SessionAnalyzerService` and `CoTAnalyzerService`.

- Add config wiring:

  - For now, a global config: `THREAT_MODEL_PROVIDER=openai`.
  - Later, can be per-project.

- Add TODO points / stubs for `Oss120bThreatModel`:

  - Define the interface with host/endpoint expected from Lambda AI GPU.
  - Not implemented yet, but type-checked.

**Dependencies**
Tickets 4, 5 (uses them), but can be started as soon as ThreatModel appears conceptually.
**Parallel**
Tickets 6, 7, 9.

---

## Ticket 9 – Policy Engine v1 (Rules → Actions)

**Goal**
Implement a minimal policy/rules engine in the backend that turns risk outputs into actions (block, flag, etc.).

**Scope**

- DB:

  - `policies(id, project_id, name, enabled, conditions JSONB, actions JSONB, created_at, updated_at)`

- Define minimal conditions schema (JSON):

  ```json
  {
    "min_risk_score": 0.8,
    "patterns_any": ["gradual_escalation", "cot_deception"]
  }
  ```

- Define minimal actions schema:

  ```json
  {
    "action": "block" | "flag" | "notify",
    "webhook_url": "https://..."
  }
  ```

- Implement `PolicyEvaluator`:

  ```ts
  interface PolicyContext {
    projectId: string;
    session: Session;
    latestSnapshot: RiskSnapshot;
  }

  interface PolicyDecision {
    action: "allow" | "block" | "flag" | "notify";
    reasons: string[];
  }

  class PolicyEngine {
    evaluate(ctx: PolicyContext): Promise<PolicyDecision>;
  }
  ```

- Wire into analysis flow:

  - After `SessionAnalyzerService.analyze` updates session + snapshot:

    - Load enabled policies for the project.
    - Evaluate.
    - Store a `policy_decision` event in `events`.

- For “notify” actions, log to console or future-proof for webhooks (no need to implement webhooks yet if time is tight).

**Dependencies**
Tickets 2, 4, 6 (needs risk to exist).
**Parallel**
Ticket 7, 8, 10.

---

## Ticket 10 – SDK Decision Integration (Automated Actions in Apps)

**Goal**
Close the loop: let developer-users easily act on threats via the SDK.

**Scope**

- Extend SDK:

  ```ts
  const decision = await safety.evaluate({
    sessionId,
    latestMessage: { role: "user", content: "..." },
  });

  if (decision.action === "block") {
    // e.g. throw / return 403 / custom error
  }
  ```

- Backend:

  - Implement `POST /v1/evaluate` properly:

    - Fetch current session + latest risk snapshot.
    - Optionally re-run `SessionAnalyzerService` if needed.
    - Run `PolicyEngine`.
    - Return `{ riskScore, patterns, action, reasons }`.

- Provide 1–2 code examples for users in the SDK README:

  - Example: Express route that calls `safety.evaluate` before hitting the LLM.
  - Example: Chat handler that uses `decision.action` to show a “blocked for safety” message.

**Dependencies**
Tickets 1, 2, 3, 4, 6, 9.
**Parallel**
Ticket 7, 8 (once `/v1/evaluate` contract is fixed).

---

### Suggested work split for two developers

After Ticket 1 is done:

- **Developer A (backend-heavy):**

  - Ticket 2 → Ticket 4 → Ticket 6 → Ticket 9
  - Then support Ticket 8 and Ticket 10.

- **Developer B (SDK/UI-heavy):**

  - Ticket 3 → Ticket 5 → Ticket 7
  - Then help with Ticket 8 and Ticket 10.

This keeps you both busy in parallel while converging on the new “SDK → control plane backend → dashboard” architecture.
