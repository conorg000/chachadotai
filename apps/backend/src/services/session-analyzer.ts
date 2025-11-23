import type { Event } from '@safetylayer/contracts';
import { query } from '../db/connection.js';
import type {
  ThreatModel,
  SessionAnalysisInput,
  SessionAnalysisOutput,
} from './threat-model/index.js';

/**
 * Service for analyzing user sessions for security threats
 *
 * This service:
 * 1. Analyzes conversation sessions using a ThreatModel (LLM)
 * 2. Updates session risk scores in the database
 * 3. Creates risk snapshots for historical tracking
 */
export class SessionAnalyzerService {
  constructor(private threatModel: ThreatModel) {}

  /**
   * Analyze a session and update database with results
   *
   * @param input Session analysis input
   * @returns Analysis results
   */
  async analyze(
    input: SessionAnalysisInput
  ): Promise<SessionAnalysisOutput> {
    // Run threat analysis
    const analysis = await this.threatModel.analyzeSession(input);

    // Update session with new risk score and patterns
    await this.updateSession(input.projectId, input.sessionId, analysis);

    // Create risk snapshot for historical tracking
    await this.createRiskSnapshot(
      input.projectId,
      input.sessionId,
      analysis,
      input.events[input.events.length - 1]?.id // Latest event ID
    );

    return analysis;
  }

  /**
   * Update session table with latest risk assessment
   */
  private async updateSession(
    projectId: string,
    sessionId: string,
    analysis: SessionAnalysisOutput
  ): Promise<void> {
    await query(
      `
      UPDATE sessions
      SET
        current_risk_score = $1,
        current_patterns = $2,
        last_activity_at = EXTRACT(EPOCH FROM NOW()) * 1000
      WHERE project_id = $3 AND id = $4
    `,
      [analysis.riskScore, JSON.stringify(analysis.patterns), projectId, sessionId]
    );
  }

  /**
   * Create a risk snapshot for historical tracking
   */
  private async createRiskSnapshot(
    projectId: string,
    sessionId: string,
    analysis: SessionAnalysisOutput,
    eventId?: string
  ): Promise<void> {
    await query(
      `
      INSERT INTO risk_snapshots (
        project_id,
        session_id,
        event_id,
        risk_score,
        patterns,
        explanation,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, EXTRACT(EPOCH FROM NOW()) * 1000)
    `,
      [
        projectId,
        sessionId,
        eventId ?? null,
        analysis.riskScore,
        JSON.stringify(analysis.patterns),
        analysis.explanation ?? null,
      ]
    );
  }

  /**
   * Fetch recent events for a session
   *
   * Helper method to retrieve events for analysis
   */
  static async fetchSessionEvents(
    sessionId: string,
    limit: number = 50
  ): Promise<Event[]> {
    const result = await query(
      `
      SELECT
        id,
        project_id as "projectId",
        session_id as "sessionId",
        type,
        role,
        content,
        metadata,
        created_at as "createdAt"
      FROM events
      WHERE session_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `,
      [sessionId, limit]
    );

    // Reverse to get chronological order
    return result.rows.reverse() as Event[];
  }
}
