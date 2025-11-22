Technical Plan: SafetyLayer Hackathon Prototype
(Referencing Tickets 1–9)

1. High-Level Architecture
   Three main components:
   Core Library (@safetylayer/core)

Session Behavioral Plane: multi-turn risk analysis.

CoT Monitoring Plane: per-response reasoning analysis.

Demo API (/apps/demo-api)

Bridges external LLM (for answers + CoT) with SessionEngine and CoTMonitor.

Dashboard (/apps/dashboard)

Visualizes sessions, risk over time, and CoT analysis.

Tickets mapping:
Core library: Tickets 1, 2, 3, 4, 7, 9

Demo API: Tickets 1, 5, 8, 9

Dashboard: Tickets 1, 6, 8

2. Data Model Strategy
   Central shared types defined once and reused everywhere.
   Implemented in Ticket 1 and used by all others.
   Core Types
   Message

SessionState

RiskSnapshot

CoTRecord

CoTAnalysis

All components interact via these types:
SessionEngine.ingestMessage(msg: Message): SessionState

CoTMonitor.analyze(record: CoTRecord): Promise<CoTRecord>

This ensures:
Backend and dashboard speak the same contract.

Swapping out LLMs or changing internal logic doesn’t break the outer interfaces.

3. Behavioral Plane: SessionEngine + LLM Detector
   3.1 SessionEngine mechanics
   Implemented in two steps:
   Ticket 2: core session mechanics (no LLM yet).

Ticket 3: plug in LLM-based behavior detector.

Responsibilities:
Session state storage (in-memory)

Map<string, SessionState> keyed by sessionId.

On ingestMessage:

Create or retrieve SessionState.

Append Message and prune old messages (maxMessages).

Risk timeline

After computing risk, append RiskSnapshot:

{ atMessageId, riskScore, patterns }

Used by dashboard to render risk-over-time.

Event callbacks

onRiskThreshold(threshold, handler)

onPattern(patternId, handler)

Invoked after each ingestMessage when:

Risk crosses a threshold upwards.

A new pattern is added to SessionState.patterns.

3.2 LLM-based SessionDetector
Implemented in Ticket 3.
Internals:
LLMSessionDetector.run(messages: Message[]): Promise<{ riskScore; patterns; explanation? }>

Prompt includes:

Last N messages (e.g. 10).

Role annotations (user/assistant).

Instruction to return strict JSON with:

risk_score (0–1)

patterns (array of pattern identifiers)

Optional explanation.

SessionEngine.ingestMessage flow (after Ticket 3):
Add message to session.

Call LLMSessionDetector.run(session.messages):

Use result’s risk_score directly or blend with previous value.

Update SessionState.riskScore and patterns.

Push RiskSnapshot into timeline.

Fire callbacks if thresholds/patterns matched.

This isolates the LLM dependency; the rest of the system sees only stable TS types.

4. CoT Plane: CoTMonitor
   Implemented in Ticket 4.
   Purpose: Evaluate CoT text for reasoning-related risks (deception, goal drift, etc.), separately from session logic.
   4.1 CoT analysis contract
   Input: CoTRecord with rawCoT and identifiers.

Output: same CoTRecord with analysis filled:

analysis: {
riskScore: number; // 0–1, CoT-specific
labels: string[]; // ['cot_deception', 'goal_drift']
indicators: string[]; // granular markers from the CoT
summary: string; // 1–2 sentence explanation for UI
}

4.2 Internal LLM prompt
Includes:

rawCoT (the reasoning block)

Optionally short context (last user prompt, final answer).

Asks LLM to:

Identify whether the reasoning attempts to hide intent, evade policies, or diverge from the stated goal.

Return structured JSON per CoTAnalysis.

This remains stateless: CoTMonitor doesn’t maintain any history; it only transforms a single CoTRecord.

5. Demo API: Wiring Everything
   Implemented in Ticket 5, building on Tickets 2, 3, 4.
   5.1 Endpoints
   POST /chat

Input: { sessionId, userMessage }

Flow:

Build Message for user and call sessionEngine.ingestMessage.

Call LLM for:

Assistant answer (surface content).

CoT (either real or simulated via prompt patterns).

Build assistant Message and call sessionEngine.ingestMessage.

If CoT exists, call cotMonitor.analyze to get CoTRecord.

Respond with:

{
"assistant": { ...Message },
"session": { ...SessionState },
"cot": { ...CoTRecord } // optional
}

GET /sessions

Returns a list of SessionState (possibly trimmed fields for list view).

GET /sessions/:id

Returns full SessionState including timeline.

5.2 LLM usage consolidation
Both the behavioral detector and CoTMonitor rely on LLM calls.

LLM client configuration (API key, model) is centralized in the demo API, then passed to SessionEngine and CoTMonitor instances.

For hackathon simplicity:

Use the same base model for:

Chat responses (assistant answer).

Behavioral analysis.

CoT analysis.

Or, at most, two models (one chat, one analysis).

6. Dashboard: UX Aligned to Two Planes
   Implemented in Ticket 6, relying on Tickets 5 and 1.
   6.1 Sessions view (behavioral plane)
   Uses GET /sessions.

Lists:

sessionId

Current riskScore (colored badge)

Current patterns

Last message preview.

Polls periodically (2–5 seconds) for “real-time enough” updates.

6.2 Session detail view
Uses GET /sessions/:id.

Shows:

Chronological message list with roles, timestamps.

Risk-over-time line chart from timeline.

6.3 CoT view (reasoning plane)
Two possible UI patterns (pick one):
Inline panel

In session detail, clicking an assistant message:

Shows a side panel with CoT info (if available):

labels, summary, rawCoT (collapsible).

Separate CoT tab

A tab that lists all assistant messages with CoT analysis ordered by CoTAnalysis.riskScore.

Each item links back to the session + message.

CoT data arrives from POST /chat and is held client-side for now; you can keep it simple and not add separate CoT endpoints.

7. Developer Experience and Documentation
   Handled in Ticket 7.
   7.1 Library surface
   Make @safetylayer/core feel like a real package:
   Export:

SessionEngine

CoTMonitor

Message, SessionState, CoTRecord, CoTAnalysis

Provide canonical examples that show:

Behavioral use:

const engine = new SessionEngine();

engine.onRiskThreshold(0.7, (session) => {
console.log('High risk session', session.sessionId, session.patterns);
});

// inside app:
const state = engine.ingestMessage(message);

CoT analysis:

const monitor = new CoTMonitor();

const result = await monitor.analyze({
messageId: 'msg-2',
sessionId: 'demo',
rawCoT: '<thinking>user won’t know about this step</thinking>',
analysis: null
});

7.2 Repo-level docs
Root README:

Short pitch.

Architecture diagram/description (3 boxes: core, API, dashboard).

“How to run” instructions.

DEMO.md (from Ticket 8) describing demo flow (see below).

8. Demo Scenarios and Scripts
   Defined in Ticket 8, using the built system.
   8.1 Scenarios
   Gradual escalation attack

Scripted sequence of 5–6 user messages that ramp from general security curiosity to exploit design.

Expected behavior:

SessionState.riskScore climbs from low to high.

Patterns like gradual_escalation or reconnaissance appear.

Threshold callbacks fire (you can log or mock “block” actions).

CoT deception

Prompt the model to emit CoT with phrases like hiding intent from the user.

Expected behavior:

CoTAnalysis.labels includes cot_deception.

High CoTAnalysis.riskScore.

Dashboard CoT view highlights this reasoning step.

8.2 Automation (optional)
A small script in demo API (or a simple CLI) that replays the scripted scenarios against /chat to pre-populate sessions before demo.

9. Testing and Logging
   Covered in Ticket 9.
   Minimal tests:

SessionEngine:

Adds/prunes messages correctly.

Updates timeline entries.

Fires onRiskThreshold when crossing threshold (using a stub detector or fixed risk).

Logging:

In demo API:

Log each /chat call with resulting SessionState.riskScore and patterns.

Log any non-zero-risk CoT analysis (labels + summary).

This gives just enough robustness and observability for judges without heavy test infra.

10. Execution Phases (Chronological)
    Phase 1 – Foundations

Ticket 1 (project + shared types)

Then parallel: Ticket 2 (SessionEngine base), Ticket 4 (CoTMonitor interface)

Phase 2 – Core Intelligence

Ticket 3 (LLM-based session detector)

Ticket 4 completion (LLM-based CoT analysis)

Phase 3 – Integration

Ticket 5 (demo API wiring)

Phase 4 – Visualization

Ticket 6 (dashboard)

Phase 5 – Polish

Ticket 7 (library DX + docs)

Ticket 8 (demo scripts and scenarios)

Ticket 9 (minimal tests + logging)

This plan keeps the two of you largely unblocked and aligned on interfaces, while letting you work independently on behavioral analysis, CoT monitoring, backend wiring, and UI.
