import { CoTMonitor, Message, SessionEngine } from "@safetylayer/core";
import cors from "cors";
import dotenv from "dotenv";
import express, { Request, Response } from "express";
import { getResponseWithReasoning } from "./utils/openai.js";

// Load environment variables
dotenv.config({ path: "../../.env" });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize core components
const sessionEngine = new SessionEngine({ maxMessages: 50 });
const cotMonitor = new CoTMonitor({
  apiKey: process.env.OPENAI_KEY || process.env.OPENAI_API_KEY,
});

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

/**
 * POST /chat
 * Handles chat interactions with CoT monitoring
 *
 * Body: { sessionId: string, userMessage: string }
 * Returns: { assistant: Message, session: SessionState, cot?: CoTRecord }
 */
app.post("/chat", async (req: Request, res: Response) => {
  try {
    const { sessionId, userMessage } = req.body;

    // Validation
    if (!sessionId || !userMessage) {
      res.status(400).json({
        error: "Missing required fields",
        message: "Both sessionId and userMessage are required",
      });
      return;
    }

    // 1. Create user message and ingest into session
    const userMsg: Message = {
      id: `msg-${Date.now()}-user`,
      sessionId,
      role: "user",
      content: userMessage,
      timestamp: Date.now(),
    };

    sessionEngine.ingestMessage(userMsg);

    // 2. Call OpenAI Responses API with reasoning
    const { content, reasoning } = await getResponseWithReasoning(
      userMessage,
      "medium"
    );

    // 3. Create assistant message with CoT analysis (if present)
    const assistantMsg: Message = {
      id: `msg-${Date.now()}-assistant`,
      sessionId,
      role: "assistant",
      content,
      timestamp: Date.now(),
      cotRecord: reasoning
        ? await cotMonitor.analyze({
            messageId: `msg-${Date.now()}-assistant`,
            sessionId,
            rawCoT: reasoning,
            userInput: userMessage,
            finalOutput: content,
            analysis: null,
          })
        : undefined,
    };

    // 4. Ingest message (with CoT attached)
    const sessionState = sessionEngine.ingestMessage(assistantMsg);

    // 5. Return response
    res.json({
      assistant: assistantMsg,
      session: sessionState,
      cot: assistantMsg.cotRecord,
    });
  } catch (error: any) {
    console.error("Error in /chat endpoint:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message || "Failed to process chat request",
    });
  }
});

/**
 * GET /sessions
 * Returns list of all active sessions
 */
app.get("/sessions", (req: Request, res: Response) => {
  try {
    const sessions = sessionEngine.listSessions();

    // Format for list view
    const sessionList = sessions.map((session) => ({
      sessionId: session.sessionId,
      riskScore: session.riskScore,
      patterns: session.patterns,
      messageCount: session.messages.length,
      lastMessage:
        session.messages.length > 0
          ? {
              timestamp:
                session.messages[session.messages.length - 1].timestamp,
              preview: session.messages[
                session.messages.length - 1
              ].content.substring(0, 100),
            }
          : null,
    }));

    res.json({ sessions: sessionList });
  } catch (error: any) {
    console.error("Error in /sessions endpoint:", error);
    res.status(500).json({ error: "Failed to retrieve sessions" });
  }
});

/**
 * GET /sessions/:id
 * Returns detailed information about a specific session
 */
app.get("/sessions/:id", (req: Request, res: Response) => {
  try {
    const session = sessionEngine.getSession(req.params.id);

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    res.json({ session });
  } catch (error: any) {
    console.error("Error in /sessions/:id endpoint:", error);
    res.status(500).json({ error: "Failed to retrieve session" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Demo API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`\nEndpoints:`);
  console.log(`  POST   /chat`);
  console.log(`  GET    /sessions`);
  console.log(`  GET    /sessions/:id`);
});
