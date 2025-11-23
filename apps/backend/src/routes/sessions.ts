import { Router } from 'express';
import type { Request, Response } from 'express';
import { query } from '../db/connection.js';
import type {
  ListSessionsQuery,
  ListSessionsResponse,
  GetSessionResponse,
  SessionSummary,
  SessionDetail,
  RiskSnapshot,
} from '@safetylayer/contracts';

const router = Router();

interface AuthenticatedRequest extends Request {
  projectId?: string;
}

// GET /v1/sessions - List sessions for a project
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = req.projectId!;
    const { limit = '50', offset = '0' } = req.query as ListSessionsQuery;

    const result = await query<SessionSummary>(
      `SELECT
        id,
        project_id as "projectId",
        created_at as "createdAt",
        last_activity_at as "lastActivityAt",
        current_risk_score as "riskScore",
        current_patterns as patterns
       FROM sessions
       WHERE project_id = $1
       ORDER BY last_activity_at DESC
       LIMIT $2 OFFSET $3`,
      [projectId, parseInt(limit, 10), parseInt(offset, 10)]
    );

    const sessions: SessionSummary[] = result.rows.map((row) => ({
      id: row.id,
      projectId: row.projectId,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      lastActivityAt:
        row.lastActivityAt instanceof Date
          ? row.lastActivityAt.toISOString()
          : row.lastActivityAt,
      riskScore: parseFloat(row.riskScore as any) || 0,
      patterns: (row.patterns as any) || [],
    }));

    const response: ListSessionsResponse = {
      sessions,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error listing sessions:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list sessions',
      },
    });
  }
});

// GET /v1/sessions/:id - Get session details
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = req.projectId!;
    const { id } = req.params;

    // Get session
    const sessionResult = await query<SessionDetail>(
      `SELECT
        id,
        project_id as "projectId",
        created_at as "createdAt",
        last_activity_at as "lastActivityAt",
        current_risk_score as "riskScore",
        current_patterns as patterns,
        metadata
       FROM sessions
       WHERE id = $1 AND project_id = $2`,
      [id, projectId]
    );

    if (sessionResult.rows.length === 0) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Session not found',
        },
      });
      return;
    }

    const sessionRow = sessionResult.rows[0];

    // Get risk snapshots for this session
    const snapshotsResult = await query<RiskSnapshot>(
      `SELECT
        id,
        session_id as "sessionId",
        project_id as "projectId",
        event_id as "eventId",
        risk_score as "riskScore",
        patterns,
        explanation,
        created_at as "createdAt"
       FROM risk_snapshots
       WHERE session_id = $1
       ORDER BY created_at ASC`,
      [id]
    );

    const riskSnapshots: RiskSnapshot[] = snapshotsResult.rows.map((row) => ({
      id: row.id,
      sessionId: row.sessionId,
      projectId: row.projectId,
      eventId: row.eventId || undefined,
      riskScore: parseFloat(row.riskScore as any),
      patterns: (row.patterns as any) || [],
      explanation: row.explanation || undefined,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    }));

    const session: SessionDetail = {
      id: sessionRow.id,
      projectId: sessionRow.projectId,
      createdAt:
        sessionRow.createdAt instanceof Date
          ? sessionRow.createdAt.toISOString()
          : sessionRow.createdAt,
      lastActivityAt:
        sessionRow.lastActivityAt instanceof Date
          ? sessionRow.lastActivityAt.toISOString()
          : sessionRow.lastActivityAt,
      riskScore: parseFloat(sessionRow.riskScore as any) || 0,
      patterns: (sessionRow.patterns as any) || [],
      metadata: (sessionRow.metadata as any) || {},
      riskSnapshots,
    };

    const response: GetSessionResponse = {
      session,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error getting session:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get session',
      },
    });
  }
});

export default router;
