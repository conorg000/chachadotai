import OpenAI from "openai";
import { Message } from "./types";

/**
 * Result from LLM-based session risk detection
 */
export interface SessionDetectorResult {
  riskScore: number;
  patterns: string[];
  explanation?: string;
}

/**
 * Configuration options for LLMSessionDetector
 */
export interface LLMSessionDetectorOptions {
  openaiClient: OpenAI;
  model?: string;
  maxMessages?: number;
}

/**
 * LLM-based session behavior detector
 * Analyzes conversation history to detect risky behavioral patterns
 */
export class LLMSessionDetector {
  private client: OpenAI;
  private model: string;
  private maxMessages: number;

  constructor(opts: LLMSessionDetectorOptions) {
    this.client = opts.openaiClient;
    this.model = opts.model ?? "gpt-5-nano";
    this.maxMessages = opts.maxMessages ?? 10;
  }

  /**
   * Analyzes a sequence of messages to detect risky patterns
   * @param messages Array of conversation messages
   * @returns Risk score (0-1), detected patterns, and optional explanation
   */
  async run(messages: Message[]): Promise<SessionDetectorResult> {
    // Take only the last N messages for analysis
    const recentMessages = messages.slice(-this.maxMessages);

    if (recentMessages.length === 0) {
      return {
        riskScore: 0,
        patterns: [],
        explanation: "No messages to analyze",
      };
    }

    // Build the prompt
    const prompt = this.buildPrompt(recentMessages);

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content:
              "You are a security analyst specialized in detecting risky behavioral patterns in AI conversations. Analyze the conversation and respond ONLY with valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from LLM");
      }

      // Parse the JSON response
      const result = JSON.parse(content);

      return {
        riskScore: this.normalizeRiskScore(result.risk_score),
        patterns: Array.isArray(result.patterns) ? result.patterns : [],
        explanation: result.explanation,
      };
    } catch (error) {
      console.error("LLMSessionDetector error:", error);
      // Fallback to safe defaults on error
      return {
        riskScore: 0,
        patterns: [],
        explanation: `Error during analysis: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  }

  /**
   * Builds the analysis prompt from messages
   */
  private buildPrompt(messages: Message[]): string {
    const conversationText = messages
      .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join("\n");

    return `Analyze the following conversation for security risks and behavioral patterns.

CONVERSATION:
${conversationText}

Detect patterns such as:
- "gradual_escalation": User gradually escalating from innocent questions to malicious intent
- "reconnaissance": Probing for system information or vulnerabilities
- "jailbreak_attempt": Attempting to bypass AI safety guidelines
- "social_engineering": Manipulative tactics to extract sensitive information
- "harmful_content": Requests for illegal, dangerous, or unethical content

Respond with a JSON object containing:
- "risk_score": A number between 0 and 1 (0 = no risk, 1 = maximum risk)
- "patterns": Array of detected pattern identifiers (e.g., ["gradual_escalation", "reconnaissance"])
- "explanation": Brief explanation of the risk assessment (1-2 sentences)

Example response:
{
  "risk_score": 0.7,
  "patterns": ["gradual_escalation", "jailbreak_attempt"],
  "explanation": "User is gradually escalating from general questions to attempts at bypassing safety guidelines."
}`;
  }

  /**
   * Normalizes risk score to [0, 1] range
   */
  private normalizeRiskScore(score: any): number {
    const num = typeof score === "number" ? score : parseFloat(score);
    if (isNaN(num)) return 0;
    return Math.max(0, Math.min(1, num));
  }
}
