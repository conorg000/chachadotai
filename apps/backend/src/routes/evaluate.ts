import {
  EvaluateRequestSchema,
  formatValidationError,
  validate,
  type EvaluateRequest,
  type EvaluateResponse,
} from "@safetylayer/contracts";
import { config } from "../config.js";
import { SessionAnalyzerService } from "../services/session-analyzer.js";
import { OpenAIThreatModel } from "../services/threat-model/openai-threat-model.js";

const router = Router();

// Initialize threat model and analyzer service
const threatModel = new OpenAIThreatModel(config.threatModel.openai);
const sessionAnalyzer = new SessionAnalyzerService(threatModel);

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

    // Fetch session events for analysis
    const events = await SessionAnalyzerService.fetchSessionEvents(
      evaluateData.sessionId
    );

    if (events.length === 0) {
      // No events to analyze - return safe response
      const response: EvaluateResponse = {
        riskScore: 0,
        patterns: [],
        action: "allow",
        reasons: ["No events in session"],
        sessionId: evaluateData.sessionId,
        timestamp: Date.now(),
      };
      res.status(200).json(response);
      return;
    }

    // Run session analysis
    const analysis = await sessionAnalyzer.analyze({
      projectId,
      sessionId: evaluateData.sessionId,
      events,
    });

    // TODO (Ticket 9): Run PolicyEngine to determine action
    // For now, simple threshold-based action
    let action: "allow" | "block" | "flag" = "allow";
    const reasons: string[] = [];

    if (analysis.riskScore >= 0.8) {
      action = "block";
      reasons.push("Critical risk score detected");
    } else if (analysis.riskScore >= 0.6) {
      action = "flag";
      reasons.push("High risk score detected");
    }

    if (analysis.patterns.length > 0) {
      reasons.push(`Patterns detected: ${analysis.patterns.join(", ")}`);
    }

    const response: EvaluateResponse = {
      riskScore: analysis.riskScore,
      patterns: analysis.patterns,
      action,
      reasons,
      sessionId: evaluateData.sessionId,
      timestamp: Date.now(),
    };

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
