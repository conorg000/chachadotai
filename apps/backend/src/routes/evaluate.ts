import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  EvaluateRequestSchema,
  validate,
  formatValidationError,
  type EvaluateRequest,
  type EvaluateResponse,
} from '@safetylayer/contracts';

const router = Router();

interface AuthenticatedRequest extends Request {
  projectId?: string;
}

// POST /v1/evaluate - Evaluate session for risk
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = req.projectId!;

    // Validate request body
    const validationResult = validate(EvaluateRequestSchema, req.body);
    if (!validationResult.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: formatValidationError(validationResult.error),
        },
      });
      return;
    }

    const evaluateData: EvaluateRequest = validationResult.data;

    // TODO: In future tickets (4, 6, 9), this will:
    // 1. Fetch session events
    // 2. Run SessionAnalyzerService
    // 3. Run PolicyEngine
    // 4. Return actual risk assessment and policy decision

    // For now, return stub response
    const response: EvaluateResponse = {
      riskScore: 0,
      patterns: [],
      action: 'allow',
      reasons: [],
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error evaluating session:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to evaluate session',
      },
    });
  }
});

export default router;
