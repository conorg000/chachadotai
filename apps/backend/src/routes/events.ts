import {
  formatValidationError,
  RecordEventRequestSchema,
  validate,
  type EventType,
  type EventWithAnalysis,
  type ListEventsResponse,
  type RecordEventRequest,
  type RecordEventResponse,
  type Role,
} from "@safetylayer/contracts";
import { randomUUID } from "crypto";
import type { Request, Response } from "express";
import { Router } from "express";
import { query, pool } from "../db/connection.js";
import { CoTAnalyzerService } from '../services/cot-analyzer.js';
import { SessionAnalyzerService } from '../services/session-analyzer.js';
import { OpenAIThreatModel } from '../services/threat-model/openai-threat-model.js';
import { PolicyEngine } from '../services/policy-engine.js';
import { config } from '../config.js';

const router = Router();

// Initialize threat model and analyzer services
const threatModel = new OpenAIThreatModel(config.threatModel.openai);
const cotAnalyzer = new CoTAnalyzerService(threatModel);
const sessionAnalyzer = new SessionAnalyzerService(threatModel);
const policyEngine = new PolicyEngine(pool);

interface AuthenticatedRequest extends Request {
  projectId?: string;
}

/**
 * Trigger analysis for a new event (async, non-blocking)
 *
 * This function runs in the background and performs:
 * 1. CoT analysis (if event is CoT type)
 * 2. Session analysis (for all events)
 */
async function triggerEventAnalysis(
  projectId: string,
  sessionId: string,
  eventId: string,
  eventType: EventType,
  eventContent?: string,
  eventMetadata?: Record<string, any>
): Promise<void> {
  try {
    // Step 1: If this is a CoT event, analyze it
    if (config.analysis.enableCoTAnalysis && eventType === 'cot' && eventContent) {
      console.log(`[Analysis] Starting CoT analysis for event ${eventId}`);
      await cotAnalyzer.analyze({
        projectId,
        sessionId,
        eventId,
        rawCoT: eventContent,
        context: {
          lastUserMessage: eventMetadata?.userInput,
          answer: eventMetadata?.finalOutput,
        },
      });
      console.log(`[Analysis] CoT analysis completed for event ${eventId}`);
    }

    // Step 2: Run session analysis for all events
    if (config.analysis.enableSessionAnalysis) {
      console.log(`[Analysis] Starting session analysis for session ${sessionId}`);

      // Fetch recent events for the session
      const events = await SessionAnalyzerService.fetchSessionEvents(sessionId);

      if (events.length > 0) {
        await sessionAnalyzer.analyze({
          projectId,
          sessionId,
          events,
        });
        console.log(`[Analysis] Session analysis completed for session ${sessionId} (${events.length} events)`);

        // Step 3: Run policy evaluation after session analysis
        console.log(`[Policy] Starting policy evaluation for session ${sessionId}`);

        // Fetch updated session data
        const sessionResult = await query(
          `SELECT current_risk_score, current_patterns FROM sessions WHERE id = $1`,
          [sessionId]
        );

        if (sessionResult.rows.length > 0) {
          const session = sessionResult.rows[0];

          // Fetch latest risk snapshot (optional but helpful context)
          const snapshotResult = await query(
            `SELECT risk_score, patterns, explanation 
             FROM risk_snapshots 
             WHERE session_id = $1 
             ORDER BY created_at DESC 
             LIMIT 1`,
            [sessionId]
          );

          const latestSnapshot = snapshotResult.rows.length > 0 
            ? snapshotResult.rows[0]
            : undefined;

          // Evaluate policies
          const policyDecision = await policyEngine.evaluate({
            projectId,
            sessionId,
            currentRiskScore: parseFloat(session.current_risk_score) || 0,
            currentPatterns: session.current_patterns || [],
            latestSnapshot: latestSnapshot ? {
              id: '',
              sessionId,
              projectId,
              eventId: '', // Optional, not always tied to specific event
              riskScore: parseFloat(latestSnapshot.risk_score),
              patterns: latestSnapshot.patterns || [],
              explanation: latestSnapshot.explanation,
              createdAt: Date.now(),
            } : undefined,
          });

          console.log(`[Policy] Policy evaluation completed: action=${policyDecision.action}, triggered=${policyDecision.triggeredPolicies.length}`);

          // Store policy decision as event if action is not 'allow'
          if (policyDecision.action !== 'allow') {
            const policyEventId = randomUUID();
            await query(
              `INSERT INTO events (id, session_id, project_id, type, metadata, created_at)
               VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
              [
                policyEventId,
                sessionId,
                projectId,
                'policy_decision',
                JSON.stringify({
                  action: policyDecision.action,
                  reasons: policyDecision.reasons,
                  triggeredPolicies: policyDecision.triggeredPolicies,
                  riskScore: policyDecision.riskScore,
                  patterns: policyDecision.patterns,
                }),
              ]
            );
            console.log(`[Policy] Stored policy decision event: ${policyEventId}`);

            // TODO: Send webhook if configured (future enhancement)
          }
        }
      }
    }
  } catch (error) {
    console.error(`[Analysis] Analysis failed for event ${eventId}:`, error);
    // Don't throw - we don't want to crash the event recording
  }
}

// POST /v1/events - Record a new event
router.post("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = req.projectId!;

    // Validate request body
    const validationResult = validate(RecordEventRequestSchema, req.body);
    if (!validationResult.success) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: formatValidationError(validationResult.error),
        },
      });
      return;
    }

    const eventData: RecordEventRequest = validationResult.data;

    // Generate event ID
    const eventId = randomUUID();

    // Upsert session (create if doesn't exist, update last_activity_at if exists)
    await query(
      `INSERT INTO sessions (id, project_id, created_at, last_activity_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE
       SET last_activity_at = CURRENT_TIMESTAMP`,
      [eventData.sessionId, projectId]
    );

    // Insert event
    await query(
      `INSERT INTO events (id, session_id, project_id, type, role, content, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
      [
        eventId,
        eventData.sessionId,
        projectId,
        eventData.type,
        eventData.role || null,
        eventData.content || null,
        JSON.stringify(eventData.metadata || {}),
      ]
    );

    // Trigger analysis asynchronously (don't await to avoid blocking response)
    triggerEventAnalysis(
      projectId,
      eventData.sessionId,
      eventId,
      eventData.type,
      eventData.content,
      eventData.metadata
    ).catch((error) => {
      // This should never happen since triggerEventAnalysis catches all errors
      console.error('[Analysis] Unexpected error in analysis pipeline:', error);
    });

    const response: RecordEventResponse = {
      ok: true,
      eventId,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error recording event:", error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to record event",
      },
    });
  }
});

// GET /v1/events - List events for a session
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = req.projectId!;
    const sessionId = req.query.sessionId as string | undefined;

    if (!sessionId) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "sessionId query parameter is required",
        },
      });
      return;
    }

    // Verify session belongs to project
    const sessionCheck = await query(
      "SELECT id FROM sessions WHERE id = $1 AND project_id = $2",
      [sessionId, projectId]
    );

    if (sessionCheck.rows.length === 0) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Session not found",
        },
      });
      return;
    }

    // Get events
    interface EventRow {
      id: string;
      sessionId: string;
      projectId: string;
      type: EventType;
      role?: Role;
      content?: string;
      metadata: any;
      createdAt: Date | string;
    }

    const result = await query<EventRow>(
      `SELECT
        id,
        session_id as "sessionId",
        project_id as "projectId",
        type,
        role,
        content,
        metadata,
        created_at as "createdAt"
       FROM events
       WHERE session_id = $1
       ORDER BY created_at ASC`,
      [sessionId]
    );

    const events: EventWithAnalysis[] = result.rows.map((row) => ({
      id: row.id,
      sessionId: row.sessionId,
      projectId: row.projectId,
      type: row.type as EventType,
      role: row.role as Role | undefined,
      content: row.content,
      metadata: row.metadata as any,
      createdAt:
        row.createdAt instanceof Date
          ? row.createdAt.getTime()
          : new Date(row.createdAt).getTime(),
    }));

    const response: ListEventsResponse = {
      events,
      total: events.length,
      sessionId,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error listing events:", error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to list events",
      },
    });
  }
});

export default router;
