import { query } from '../db/connection.js';
import type {
  ThreatModel,
  CoTAnalysisInput,
  CoTAnalysisOutput,
} from './threat-model/index.js';

/**
 * Service for analyzing chain-of-thought (CoT) reasoning
 *
 * This service:
 * 1. Analyzes CoT events using a ThreatModel (LLM)
 * 2. Stores analysis results in the database (events.metadata)
 * 3. Detects deception, harmful intent, and safety bypasses
 */
export class CoTAnalyzerService {
  constructor(private threatModel: ThreatModel) {}

  /**
   * Analyze a CoT event and store results
   *
   * @param input CoT analysis input
   * @returns Analysis results
   */
  async analyze(input: CoTAnalysisInput): Promise<CoTAnalysisOutput> {
    // Run CoT threat analysis
    const analysis = await this.threatModel.analyzeCoT(input);

    // Store analysis in the event's metadata
    await this.updateEventWithAnalysis(input.eventId, analysis);

    return analysis;
  }

  /**
   * Update event metadata with CoT analysis results
   */
  private async updateEventWithAnalysis(
    eventId: string,
    analysis: CoTAnalysisOutput
  ): Promise<void> {
    // Store analysis in event metadata as cotAnalysis field
    const cotAnalysisData = {
      riskScore: analysis.riskScore,
      labels: analysis.labels,
      indicators: analysis.indicators,
      summary: analysis.summary,
      analyzedAt: Date.now(),
    };

    await query(
      `
      UPDATE events
      SET metadata = COALESCE(metadata, '{}'::jsonb) || $1::jsonb
      WHERE id = $2
    `,
      [JSON.stringify({ cotAnalysis: cotAnalysisData }), eventId]
    );
  }

  /**
   * Fetch CoT analysis for an event
   *
   * Helper method to retrieve stored analysis
   */
  static async fetchCoTAnalysis(
    eventId: string
  ): Promise<CoTAnalysisOutput | null> {
    const result = await query(
      `
      SELECT metadata->'cotAnalysis' as cot_analysis
      FROM events
      WHERE id = $1
    `,
      [eventId]
    );

    if (result.rows.length === 0 || !result.rows[0].cot_analysis) {
      return null;
    }

    const data = result.rows[0].cot_analysis;
    return {
      riskScore: data.riskScore,
      labels: data.labels,
      indicators: data.indicators,
      summary: data.summary,
    };
  }

  /**
   * Fetch events with CoT analysis for a session
   *
   * Returns all CoT events with their analysis results
   */
  static async fetchCoTEventsForSession(sessionId: string): Promise<
    Array<{
      eventId: string;
      rawCoT: string;
      analysis: CoTAnalysisOutput | null;
      createdAt: number;
    }>
  > {
    const result = await query(
      `
      SELECT
        id,
        content,
        metadata->'cotAnalysis' as cot_analysis,
        created_at as "createdAt"
      FROM events
      WHERE session_id = $1 AND type = 'cot'
      ORDER BY created_at ASC
    `,
      [sessionId]
    );

    return result.rows.map((row) => ({
      eventId: row.id,
      rawCoT: row.content || '',
      analysis: row.cot_analysis
        ? {
            riskScore: row.cot_analysis.riskScore,
            labels: row.cot_analysis.labels,
            indicators: row.cot_analysis.indicators,
            summary: row.cot_analysis.summary,
          }
        : null,
      createdAt: row.createdAt,
    }));
  }
}
