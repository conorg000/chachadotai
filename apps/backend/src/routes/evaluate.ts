import {
  EvaluateRequestSchema,
  formatValidationError,
  validate,
  type EvaluateRequest,
  type EvaluateResponse,
} from "@safetylayer/contracts";
import { randomUUID } from "crypto";
import type { Request, Response } from "express";
import { Router } from "express";
import { config } from "../config.js";
import { pool, query } from "../db/connection.js";
import { PolicyEngine } from "../services/policy-engine.js";
import { SessionAnalyzerService } from "../services/session-analyzer.js";
import { OpenAIThreatModel } from "../services/threat-model/openai-threat-model.js";

const router = Router();

// Initialize threat model, analyzer service, and policy engine
const threatModel = new OpenAIThreatModel(config.threatModel.openai);
const sessionAnalyzer = new SessionAnalyzerService(threatModel);
const policyEngine = new PolicyEngine(pool);

interface AuthenticatedRequest extends Request {
  projectId?: string;
}

// POST /v1/evaluate - Evaluate session for risk
router.post("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = req.projectId!;

    // Validate request body
    const validationResult = validate(EvaluateRequestSchema, req.body);
    if (!validationResult.success) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: formatValidationError(validationResult.error),
        },
      });
      return;
    }

    const evaluateData: EvaluateRequest = validationResult.data;

    // Step 1: If latestMessage is provided, record it as an event first
    if (evaluateData.latestMessage) {
      const eventId = randomUUID();
      await query(
        `INSERT INTO events (id, session_id, project_id, type, role, content, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
        [
          eventId,
          evaluateData.sessionId,
          projectId,
          evaluateData.latestMessage.role === "user"
            ? "message.user"
            : "message.assistant",
          evaluateData.latestMessage.role,
          evaluateData.latestMessage.content,
          JSON.stringify({}),
        ]
      );

      // Upsert session
      await query(
        `INSERT INTO sessions (id, project_id, created_at, last_activity_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO UPDATE
         SET last_activity_at = CURRENT_TIMESTAMP`,
        [evaluateData.sessionId, projectId]
      );
    }

    // Step 2: Check if session exists
    const sessionCheck = await query(
      `SELECT id, current_risk_score, current_patterns 
       FROM sessions 
       WHERE id = $1 AND project_id = $2`,
      [evaluateData.sessionId, projectId]
    );

    if (sessionCheck.rows.length === 0) {
      // Session doesn't exist - return safe response
      const response: EvaluateResponse = {
        riskScore: 0,
        patterns: [],
        action: "allow",
        reasons: ["Session not found"],
        sessionId: evaluateData.sessionId,
        timestamp: Date.now(),
      };
      res.status(200).json(response);
      return;
    }

    const session = sessionCheck.rows[0];

    // Step 3: Determine if we need to run analysis
    let currentRiskScore = parseFloat(session.current_risk_score) || 0;
    let currentPatterns = session.current_patterns || [];

    // Run analysis if:
    // - forceAnalysis is true, OR
    // - latestMessage was provided (we just added an event), OR
    // - session has no risk score yet
    if (
      evaluateData.forceAnalysis ||
      evaluateData.latestMessage ||
      currentRiskScore === 0
    ) {
      console.log(
        `[Evaluate] Running session analysis for ${evaluateData.sessionId}`
      );

      const events = await SessionAnalyzerService.fetchSessionEvents(
        evaluateData.sessionId
      );

      if (events.length > 0) {
        const analysis = await sessionAnalyzer.analyze({
          projectId,
          sessionId: evaluateData.sessionId,
          events,
        });

        currentRiskScore = analysis.riskScore;
        currentPatterns = analysis.patterns;
      }
    }

    // Step 4: Fetch latest risk snapshot for context
    const snapshotResult = await query(
      `SELECT risk_score, patterns, explanation 
       FROM risk_snapshots 
       WHERE session_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [evaluateData.sessionId]
    );

    const latestSnapshot =
      snapshotResult.rows.length > 0 ? snapshotResult.rows[0] : undefined;

    // Step 5: Run policy evaluation
    console.log(
      `[Evaluate] Running policy evaluation for ${evaluateData.sessionId}`
    );

    const policyDecision = await policyEngine.evaluate({
      projectId,
      sessionId: evaluateData.sessionId,
      currentRiskScore,
      currentPatterns,
      latestSnapshot: latestSnapshot
        ? {
            id: "",
            sessionId: evaluateData.sessionId,
            projectId,
            eventId: "", // Optional, not always tied to specific event
            riskScore: parseFloat(latestSnapshot.risk_score),
            patterns: latestSnapshot.patterns || [],
            explanation: latestSnapshot.explanation,
            createdAt: Date.now(),
          }
        : undefined,
    });

    // Step 6: Return decision
    const response: EvaluateResponse = {
      riskScore: currentRiskScore,
      patterns: currentPatterns,
      action: policyDecision.action,
      reasons: policyDecision.reasons,
      sessionId: evaluateData.sessionId,
      timestamp: Date.now(),
    };

    console.log(
      `[Evaluate] Decision for ${evaluateData.sessionId}: ${policyDecision.action}`
    );
    res.status(200).json(response);
  } catch (error) {
    console.error("Error evaluating session:", error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to evaluate session",
      },
    });
  }
});

export default router;
