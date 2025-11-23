import { Router } from 'express';
import type { Request, Response } from 'express';
import { query } from '../db/connection.js';
import {
  RecordEventRequestSchema,
  validate,
  formatValidationError,
  type RecordEventRequest,
  type RecordEventResponse,
  type ListEventsQuery,
  type ListEventsResponse,
  type EventWithAnalysis,
} from '@safetylayer/contracts';
import { randomUUID } from 'crypto';

const router = Router();

interface AuthenticatedRequest extends Request {
  projectId?: string;
}

// POST /v1/events - Record a new event
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = req.projectId!;

    // Validate request body
    const validationResult = validate(RecordEventRequestSchema, req.body);
    if (!validationResult.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
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

    const response: RecordEventResponse = {
      ok: true,
      eventId,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error recording event:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to record event',
      },
    });
  }
});

// GET /v1/events - List events for a session
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = req.projectId!;
    const { sessionId } = req.query as ListEventsQuery;

    if (!sessionId) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'sessionId query parameter is required',
        },
      });
      return;
    }

    // Verify session belongs to project
    const sessionCheck = await query(
      'SELECT id FROM sessions WHERE id = $1 AND project_id = $2',
      [sessionId, projectId]
    );

    if (sessionCheck.rows.length === 0) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Session not found',
        },
      });
      return;
    }

    // Get events
    const result = await query<EventWithAnalysis>(
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
      ...row,
      metadata: row.metadata as any,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    }));

    const response: ListEventsResponse = {
      events,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error listing events:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list events',
      },
    });
  }
});

export default router;
