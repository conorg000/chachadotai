import { Message, SessionState, RiskSnapshot } from './types';
import { LLMSessionDetector } from './LLMSessionDetector';

export interface SessionEngineOptions {
  maxMessages?: number;
  detector?: LLMSessionDetector;
  useLLMDetection?: boolean;
}

type RiskThresholdCallback = (session: SessionState) => void;
type PatternCallback = (session: SessionState) => void;

export class SessionEngine {
  private sessions: Map<string, SessionState>;
  private maxMessages: number;
  private thresholdCallbacks: Map<number, RiskThresholdCallback[]>;
  private patternCallbacks: Map<string, PatternCallback[]>;
  private detector?: LLMSessionDetector;
  private useLLMDetection: boolean;

  constructor(opts?: SessionEngineOptions) {
    this.sessions = new Map();
    this.maxMessages = opts?.maxMessages ?? 50;
    this.thresholdCallbacks = new Map();
    this.patternCallbacks = new Map();
    this.detector = opts?.detector;
    this.useLLMDetection = opts?.useLLMDetection ?? false;
  }

  /**
   * Ingests a new message into a session and returns the updated session state.
   * Creates a new session if one doesn't exist for the given sessionId.
   * Updates risk score, prunes old messages, and fires callbacks as needed.
   */
  async ingestMessage(msg: Message): Promise<SessionState> {
    // 1. Get or create session
    let session = this.sessions.get(msg.sessionId);

    if (!session) {
      session = {
        sessionId: msg.sessionId,
        messages: [],
        riskScore: 0,
        patterns: [],
        timeline: []
      };
      this.sessions.set(msg.sessionId, session);
    }

    // Store previous risk score and patterns for threshold/pattern detection
    const previousRiskScore = session.riskScore;
    const previousPatterns = new Set(session.patterns);

    // 2. Append message
    session.messages.push(msg);

    // 3. Prune old messages if beyond maxMessages
    if (session.messages.length > this.maxMessages) {
      session.messages = session.messages.slice(-this.maxMessages);
    }

    // 4. Compute risk score
    let newRiskScore: number;
    let newPatterns: string[];

    if (this.useLLMDetection && this.detector) {
      // Use LLM-based detection
      const detectorResult = await this.detector.run(session.messages);
      newRiskScore = detectorResult.riskScore;
      newPatterns = detectorResult.patterns;
    } else {
      // Fallback to stub: messages.length / 20, clamped to [0, 1]
      newRiskScore = Math.min(session.messages.length / 20, 1);
      newPatterns = session.patterns; // Keep existing patterns
    }

    session.riskScore = newRiskScore;
    session.patterns = newPatterns;

    // 5. Append RiskSnapshot to timeline
    const snapshot: RiskSnapshot = {
      atMessageId: msg.id,
      riskScore: newRiskScore,
      patterns: [...newPatterns]
    };
    session.timeline.push(snapshot);

    // 6. Fire threshold callbacks if risk crossed upward
    this.fireThresholdCallbacks(session, previousRiskScore, newRiskScore);

    // 7. Fire pattern callbacks for newly detected patterns
    this.firePatternCallbacks(session, previousPatterns);

    return session;
  }

  /**
   * Fires threshold callbacks when risk crosses a threshold upward.
   * @private
   */
  private fireThresholdCallbacks(
    session: SessionState,
    previousRisk: number,
    currentRisk: number
  ): void {
    // Fire callbacks for thresholds that were crossed upward
    this.thresholdCallbacks.forEach((callbacks, threshold) => {
      if (previousRisk < threshold && currentRisk >= threshold) {
        callbacks.forEach(callback => callback(session));
      }
    });
  }

  /**
   * Fires pattern callbacks for newly detected patterns.
   * @private
   */
  private firePatternCallbacks(
    session: SessionState,
    previousPatterns: Set<string>
  ): void {
    // Fire callbacks for newly detected patterns
    session.patterns.forEach(pattern => {
      if (!previousPatterns.has(pattern)) {
        const callbacks = this.patternCallbacks.get(pattern);
        if (callbacks) {
          callbacks.forEach(callback => callback(session));
        }
      }
    });
  }

  /**
   * Retrieves the current state of a session by ID.
   * @returns Session state or undefined if not found
   */
  getSession(sessionId: string): SessionState | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Returns a list of all active sessions.
   */
  listSessions(): SessionState[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Registers a callback to be invoked when session risk exceeds a threshold.
   * @param threshold Risk score threshold (0-1)
   * @param handler Callback function receiving the session state
   */
  onRiskThreshold(threshold: number, handler: (session: SessionState) => void): void {
    if (!this.thresholdCallbacks.has(threshold)) {
      this.thresholdCallbacks.set(threshold, []);
    }
    this.thresholdCallbacks.get(threshold)!.push(handler);
  }

  /**
   * Registers a callback to be invoked when a specific pattern is detected.
   * @param patternId Pattern identifier
   * @param handler Callback function receiving the session state
   */
  onPattern(patternId: string, handler: (session: SessionState) => void): void {
    if (!this.patternCallbacks.has(patternId)) {
      this.patternCallbacks.set(patternId, []);
    }
    this.patternCallbacks.get(patternId)!.push(handler);
  }
}

