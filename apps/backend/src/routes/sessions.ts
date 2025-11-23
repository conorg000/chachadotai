import type {
  GetSessionResponse,
  ListSessionsResponse,
  RiskSnapshot,
  SessionDetail,
  SessionSummary,
} from "@safetylayer/contracts";
import type { Request, Response } from "express";
import { Router } from "express";
import { query } from "../db/connection.js";

const router = Router();

interface AuthenticatedRequest extends Request {
  projectId?: string;
}

// GET /v1/sessions - List sessions for a project
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = req.projectId!;
    const limitParam = (req.query.limit as string) || "50";
    const offsetParam = (req.query.offset as string) || "0";
    const limit = parseInt(limitParam, 10);
    const offset = parseInt(offsetParam, 10);

    interface SessionRow {
      id: string;
      projectId: string;
      createdAt: Date | string;
      lastActivityAt: Date | string;
      currentRiskScore: number;
      currentPatterns: any;
      eventCount: string;
    }

    const result = await query<SessionRow>(
      `SELECT
        s.id,
        s.project_id as "projectId",
        s.created_at as "createdAt",
        s.last_activity_at as "lastActivityAt",
        s.current_risk_score as "currentRiskScore",
        s.current_patterns as "currentPatterns",
        COUNT(e.id)::text as "eventCount"
       FROM sessions s
       LEFT JOIN events e ON s.id = e.session_id
       WHERE s.project_id = $1
       GROUP BY s.id
       ORDER BY s.last_activity_at DESC
       LIMIT $2 OFFSET $3`,
      [projectId, limit, offset]
    );

    // Get total count
    const countResult = await query<{ count: string }>(
      "SELECT COUNT(*)::text as count FROM sessions WHERE project_id = $1",
      [projectId]
    );
    const total = parseInt(countResult.rows[0]?.count || "0", 10);

    const sessions: SessionSummary[] = result.rows.map((row) => ({
      id: row.id,
      projectId: row.projectId,
      currentRiskScore: parseFloat(row.currentRiskScore as any) || 0,
      currentPatterns: (row.currentPatterns as any) || [],
      lastActivityAt:
        row.lastActivityAt instanceof Date
          ? row.lastActivityAt.getTime()
          : new Date(row.lastActivityAt).getTime(),
      eventCount: parseInt(row.eventCount, 10),
    }));

    const response: ListSessionsResponse = {
      sessions,
      total,
      offset,
      limit,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error listing sessions:", error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to list sessions",
      },
    });
  }
});

// GET /v1/sessions/:id - Get session details
router.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = req.projectId!;
    const { id } = req.params;

    interface SessionRow {
      id: string;
      projectId: string;
      createdAt: Date | string;
      lastActivityAt: Date | string;
      currentRiskScore: number;
      currentPatterns: any;
      metadata: any;
      eventCount: string;
    }

    // Get session with event count
    const sessionResult = await query<SessionRow>(
      `SELECT
        s.id,
        s.project_id as "projectId",
        s.created_at as "createdAt",
        s.last_activity_at as "lastActivityAt",
        s.current_risk_score as "currentRiskScore",
        s.current_patterns as "currentPatterns",
        s.metadata,
        COUNT(e.id)::text as "eventCount"
       FROM sessions s
       LEFT JOIN events e ON s.id = e.session_id
       WHERE s.id = $1 AND s.project_id = $2
       GROUP BY s.id`,
      [id, projectId]
    );

    if (sessionResult.rows.length === 0) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Session not found",
        },
      });
      return;
    }

    const sessionRow = sessionResult.rows[0];

    interface RiskSnapshotRow {
      id: string;
      sessionId: string;
      projectId: string;
      eventId: string | null;
      riskScore: number;
      patterns: any;
      explanation: string | null;
      createdAt: Date | string;
    }

    // Get risk snapshots for this session
    const snapshotsResult = await query<RiskSnapshotRow>(
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
      eventId: row.eventId || "",
      riskScore: parseFloat(row.riskScore as any),
      patterns: (row.patterns as any) || [],
      explanation: row.explanation || undefined,
      createdAt:
        row.createdAt instanceof Date
          ? row.createdAt.getTime()
          : new Date(row.createdAt).getTime(),
    }));

    const session: SessionDetail = {
      id: sessionRow.id,
      projectId: sessionRow.projectId,
      createdAt:
        sessionRow.createdAt instanceof Date
          ? sessionRow.createdAt.getTime()
          : new Date(sessionRow.createdAt).getTime(),
      lastActivityAt:
        sessionRow.lastActivityAt instanceof Date
          ? sessionRow.lastActivityAt.getTime()
          : new Date(sessionRow.lastActivityAt).getTime(),
      currentRiskScore: parseFloat(sessionRow.currentRiskScore as any) || 0,
      currentPatterns: (sessionRow.currentPatterns as any) || [],
      metadata: (sessionRow.metadata as any) || {},
      riskSnapshots,
      eventCount: parseInt(sessionRow.eventCount, 10),
    };

    const response: GetSessionResponse = {
      session,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error getting session:", error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to get session",
      },
    });
  }
});

export default router;
