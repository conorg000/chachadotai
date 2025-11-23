# ChaCha Transformation Plan

## Overview

This is a high-level technical plan for evolving from the current hackathon setup to a "control plane SaaS + SDK" architecture. The plan is organized into phases, each building on what already exists.

---

## Phase 0 – Where You Are Now

### Current State

**Node package:**

- Holds all session logic and detectors in-process

**Demo API:**

- Wraps the package and calls OpenAI for model + analysis

**Demo dashboard:**

- Talks directly to that demo API and renders sessions/risk

This is effectively a monolithic dev tool: it works, but there is no separation between:

- SDK vs backend service
- Customer app vs your control plane
- Ephemeral state vs persistent multi-tenant data

### The Goal

Move towards:

**A thin SDK** that records events

**A central control plane backend (EC2 + RDS)** that:

- Stores sessions/events
- Runs threat analysis (OpenAI now, your gpt-oss-120b later)

**A hosted dashboard** that talks only to your backend

### Context: Where You Sit in the Stack

- **Tools like Langfuse/LangSmith** provide observability and tracing for LLM apps
- **OpenTelemetry** defines standard semantics for GenAI traces/metrics/events
- **You** are the behavioral security / threat-intel layer, not generic tracing

---

## Phase 1 – Split SDK from Engine and Introduce a Real Backend

### 1.1 Turn the Node Package into an SDK Client

Today your package is the engine. You want it to become a client of your backend.

**Changes:**

Refactor the package to expose something like:

```typescript
import { SafetyLayer } from "@safetylayer/node";

const safety = new SafetyLayer({
  apiKey: process.env.SAFETY_LAYER_KEY,
  projectId: "proj_123",
  endpoint: "https://api.safetylayer.dev", // your backend
});

const result = await safety.recordEvent({
  sessionId,
  message,
  metadata,
});

// Optionally:
const decision = await safety.evaluate({
  sessionId,
  latestMessage: message,
});
```

**Responsibilities of SDK v1:**

- Generate/propagate sessionId where needed
- Batch and send events (messages, tool calls, CoT snippets) to your backend
- Provide a simple `evaluate` helper for synchronous risk decisions (but you can initially just `recordEvent` and ignore the decision call)
- All detection and storage moves to the backend

### 1.2 Stand Up a Control Plane Backend (EC2 + RDS)

On the backend, you introduce:

**API service (EC2, Node/TS or Python)**

**Public endpoints** (for SDK / customer apps):

- `POST /v1/events` – ingest events (messages, metadata)
- `POST /v1/evaluate` – optional synchronous risk evaluation

**Private/admin endpoints** (for dashboard):

- `GET /v1/sessions`
- `GET /v1/sessions/:id`
- `GET /v1/events?sessionId=...`
- etc.

**Persistent storage (RDS)**

Schema (conceptually):

**`projects`** (tenant/project separation)

**`sessions`:**

- `id`, `project_id`, `created_at`, `last_activity_at`
- `current_risk_score`, `current_patterns`

**`events`:**

- `id`, `session_id`, `type` (message, tool_call, cot, policy_decision, etc.)
- `role`, `content`, `metadata`, `timestamps`

**`risk_snapshots`** (optional):

- `session_id`, `event_id`, `risk_score`, `patterns`, `created_at`

Later: policies, alerts, etc.

**This establishes the single source of truth:** all session data and risk lives in your RDS-backed backend, not customer memory.

---

## Phase 2 – Move the Threat Analysis into a Dedicated Service Layer

### 2.1 Extract the Detection Logic from the Package into Backend Services

Take your existing detectors (session analysis + CoT analysis) and move them into backend modules:

**SessionAnalyzerService:**

- Consumes a sequence of events for a session
- Calls OpenAI (initially) with a structured prompt to assess:
  - `risk_score`
  - `patterns`
  - short explanation
- Persists updated `current_risk_score`/`patterns` to sessions table
- Optionally writes `risk_snapshots`

**CoTAnalyzerService:**

- Consumes CoT snippets (events of type `cot`)
- Calls OpenAI to produce `CoTAnalysis`:
  - `risk_score`, `labels` (e.g., `cot_deception`, `goal_drift`), `indicators`, `summary`
- Stores results as part of the CoT event or in a separate `cot_analyses` table

These services are now part of your backend, not the SDK.

### 2.2 Introduce an Internal Event Pipeline

You don't need Kafka on day one; keep it simple:

**On `POST /v1/events`:**

1. Insert event into `events` table
2. Enqueue a lightweight job (e.g., in Redis, SQS, or even an in-process queue) to:
   - Recompute the session's risk using `SessionAnalyzerService`
   - Run `CoTAnalyzerService` if event includes CoT

**That gives you:**

- Decoupling between ingestion and analysis
- Room to grow into worker processes later without changing the public API

---

## Phase 3 – Evolve the Dashboard into a Multi-Tenant Control Plane UI

Right now your dashboard hits the demo API directly and reads in-memory state. You want:

- Hosted dashboard that talks only to your control plane API
- Project-aware and tenant-aware views

### Changes:

**Auth + projects**

- Simple auth first:
  - Email/password or magic link + per-project API keys
  - Every view in the dashboard is scoped to a `project_id`

**Dashboard querying your backend**

- Replace direct `SessionEngine` calls with:
  - `GET /v1/sessions?projectId=...`
  - `GET /v1/sessions/:id`
  - `GET /v1/events?sessionId=...`
- Existing visualizations (session list, risk timeline) now work off persisted data

**Introduce CoT view**

- Reuse your existing CoT panel UI, but now fetch analysis from:
  - CoT fields in events or `cot_analyses` table via API
- That makes CoT truly a separate lens on top of persisted data

**At this point**, your product shape matches the existing LLM observability patterns—central backend + UI—seen in tools like Langfuse, but specialized for security/threat intel instead of generic tracing.

---

## Phase 4 – Make the AI Analysis Layer Pluggable (OpenAI → gpt-oss-120b)

You want to start with OpenAI and later run your own gpt-oss-120b on Lambda AI GPUs.

### 4.1 Introduce an Abstraction for "Analysis Models"

Inside the backend, define an internal interface, e.g.:

```typescript
interface ThreatModel {
  analyzeSession(input: SessionAnalysisInput): Promise<SessionAnalysisOutput>;
  analyzeCoT(input: CoTAnalysisInput): Promise<CoTAnalysisOutput>;
}
```

Then implement two concrete backends:

- **OpenAIThreatModel** – calls OpenAI's APIs
- **Oss120bThreatModel** – calls your gpt-oss-120b served from Lambda AI GPU

`SessionAnalyzerService` and `CoTAnalyzerService` depend only on `ThreatModel`, not on OpenAI directly.

### 4.2 Switching and Routing

With that abstraction:

**You can select the model per-project or per-environment in configuration:**

- Start with OpenAI as default
- Allow advanced customers or your own production to use `Oss120bThreatModel`

**Eventually you can support:**

- A/B testing between models
- Fallback: if OSS model is slow/unavailable, fall back to OpenAI

This aligns with OpenTelemetry's approach to GenAI metrics/telemetry, which is provider-agnostic and uses attributes like `gen_ai.provider.name` to distinguish OpenAI vs custom providers.

---

## Phase 5 – Tighten Product Surfaces for "Automation and Actions"

Your stated vision is:

> Users log into a dashboard to view their data and use the package to automate responses/actions to threats.

Once the control plane exists, you add:

### 5.1 Policy / Rules Engine (Minimal v1)

**Backend:**

Add a `policies` table, e.g.:

- `id`, `project_id`, `name`, `conditions`, `actions`, `enabled`

`conditions` could initially be JSON/YAML describing simple rules:

- "If `risk_score >= 0.8` then action `block`"
- "If pattern includes `cot_deception`, then tag session and send webhook"

**A "policy evaluator" runs whenever:**

- Session risk is updated
- New patterns are detected
- New CoT analysis arrives

**Actions (v1):**

- Emit a decision attached to the session (e.g., `action: "block"`)
- Optionally send a webhook to the customer app with the decision

### 5.2 SDK Hooks for Decisions

Update the SDK so it can:

**Option 1 (sync):**

- `safety.evaluate({ sessionId, message })` returns `{ riskScore, patterns, action }`
- The app can then block or alter behavior in the request path

**Option 2 (async):**

- `recordEvent` returns quickly
- A webhook from your backend notifies the app of a decision
- The app stores this and applies it on subsequent requests

**That closes the loop:**

```
SDK → backend → analysis → policy → decision → SDK/app behavior
```

---

## Phase 6 – Observability & Standards (Without "Becoming LangSmith")

Even though you're not building a LangSmith-style product, you should play nicely with the observability ecosystem:

### Internally Align to OpenTelemetry GenAI Semantic Conventions

When you store or emit metrics/traces about your own operations (optional for v1), follow the GenAI specs for traces/metrics/events.

This keeps you interoperable with other tools later (Datadog, Langfuse, etc.).

### Expose Risk Signals in a Way They Can Be Scraped

Even in v1, consider:

- A simple metrics endpoint (Prometheus/OTel) with counts of high-risk sessions, distribution of risk scores, etc.
- Later, you can integrate with external observability stacks if customers ask

**You are not building full tracing or dashboards for latency/cost like Langfuse**; you're adding a security/risk dimension that can become an input into those systems later.

---

## Summary of the Transformation

### From:

- Node library + demo API + demo dashboard, all in one box

### To:

**SDK client** (`@safetylayer/node`) that:

- Records events and optionally queries decisions

**Control plane backend** (EC2 + RDS) that:

- Stores sessions/events
- Runs OpenAI/gpt-oss-120b-based threat analysis
- Evaluates policies

**Hosted dashboard** that:

- Reads from the backend only
- Provides security-focused views (sessions, risk, CoT, policies)

**Pluggable analysis layer** so you can switch from OpenAI → your own GPU-hosted model without touching SDKs

**Automation hooks** (evaluate API, webhooks, SDK helpers) so customers can act on your risk signals, not just see them

---

## Next Steps

If you'd like, the next step can be: a concrete v1 API spec (`/v1/events`, `/v1/evaluate`, `/v1/sessions`) and an updated SDK interface that maps exactly to that.
