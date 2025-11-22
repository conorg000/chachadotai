import { describe, it, expect, jest, beforeAll, afterAll, beforeEach } from "@jest/globals";
import request from "supertest";
import express, { Express } from "express";
import cors from "cors";
import { SessionEngine, CoTMonitor } from "@safetylayer/core";

// Mock the OpenAI helper
const mockGetResponse = jest.fn<any>();
jest.mock("../utils/openai.js", () => ({
  getResponseWithReasoning: mockGetResponse,
}));

describe("Demo API Endpoints", () => {
  let app: Express;
  let sessionEngine: SessionEngine;

  beforeAll(async () => {

    // Set up Express app (similar to index.ts but without starting server)
    app = express();
    app.use(cors());
    app.use(express.json());

    sessionEngine = new SessionEngine({ maxMessages: 50 });
    const cotMonitor = new CoTMonitor({ useMock: true });

    // Health check
    app.get("/health", (req, res) => {
      res.json({ status: "ok", timestamp: Date.now() });
    });

    // Chat endpoint
    app.post("/chat", async (req, res) => {
      try {
        const { sessionId, userMessage } = req.body;

        if (!sessionId || !userMessage) {
          res.status(400).json({
            error: "Missing required fields",
            message: "Both sessionId and userMessage are required",
          });
          return;
        }

        const userMsg = {
          id: `msg-${Date.now()}-user`,
          sessionId,
          role: "user" as const,
          content: userMessage,
          timestamp: Date.now(),
        };

        sessionEngine.ingestMessage(userMsg);

        const { content, reasoning } = await mockGetResponse(userMessage, "medium");

        const assistantMsg = {
          id: `msg-${Date.now()}-assistant`,
          sessionId,
          role: "assistant" as const,
          content,
          timestamp: Date.now(),
        };

        const sessionState = sessionEngine.ingestMessage(assistantMsg);

        let cotRecord = null;
        if (reasoning) {
          cotRecord = await cotMonitor.analyze({
            messageId: assistantMsg.id,
            sessionId,
            rawCoT: reasoning,
            userInput: userMessage,
            finalOutput: content,
            analysis: null,
          });
        }

        res.json({
          assistant: assistantMsg,
          session: sessionState,
          cot: cotRecord,
        });
      } catch (error: any) {
        res.status(500).json({
          error: "Internal server error",
          message: error.message,
        });
      }
    });

    // Sessions list
    app.get("/sessions", (req, res) => {
      try {
        const sessions = sessionEngine.listSessions();
        const sessionList = sessions.map((session) => ({
          sessionId: session.sessionId,
          riskScore: session.riskScore,
          patterns: session.patterns,
          messageCount: session.messages.length,
          lastMessage:
            session.messages.length > 0
              ? {
                  timestamp: session.messages[session.messages.length - 1].timestamp,
                  preview: session.messages[session.messages.length - 1].content.substring(
                    0,
                    100
                  ),
                }
              : null,
        }));
        res.json({ sessions: sessionList });
      } catch (error) {
        res.status(500).json({ error: "Failed to retrieve sessions" });
      }
    });

    // Session detail
    app.get("/sessions/:id", (req, res) => {
      try {
        const session = sessionEngine.getSession(req.params.id);
        if (!session) {
          res.status(404).json({ error: "Session not found" });
          return;
        }
        res.json({ session });
      } catch (error) {
        res.status(500).json({ error: "Failed to retrieve session" });
      }
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe("GET /health", () => {
    it("should return ok status", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("ok");
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe("POST /chat", () => {
    it("should process a chat message successfully", async () => {
      mockGetResponse.mockResolvedValue({
        content: "The answer is 42",
        reasoning: "Let me calculate: 40 + 2 = 42",
      });

      const response = await request(app)
        .post("/chat")
        .send({
          sessionId: "test-session-1",
          userMessage: "What is 40 + 2?",
        });

      expect(response.status).toBe(200);
      expect(response.body.assistant).toBeDefined();
      expect(response.body.assistant.content).toBe("The answer is 42");
      expect(response.body.assistant.sessionId).toBe("test-session-1");
      expect(response.body.session).toBeDefined();
      expect(response.body.cot).toBeDefined();
      expect(response.body.cot.rawCoT).toBe("Let me calculate: 40 + 2 = 42");
    });

    it("should return 400 if sessionId is missing", async () => {
      const response = await request(app).post("/chat").send({
        userMessage: "Hello",
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Missing required fields");
    });

    it("should return 400 if userMessage is missing", async () => {
      const response = await request(app).post("/chat").send({
        sessionId: "test-session",
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Missing required fields");
    });

    it("should handle responses without reasoning", async () => {
      mockGetResponse.mockResolvedValue({
        content: "Hello!",
        reasoning: null,
      });

      const response = await request(app)
        .post("/chat")
        .send({
          sessionId: "test-session-2",
          userMessage: "Hi",
        });

      expect(response.status).toBe(200);
      expect(response.body.assistant.content).toBe("Hello!");
      expect(response.body.cot).toBeNull();
    });
  });

  describe("GET /sessions", () => {
    it("should return list of sessions", async () => {
      const response = await request(app).get("/sessions");

      expect(response.status).toBe(200);
      expect(response.body.sessions).toBeDefined();
      expect(Array.isArray(response.body.sessions)).toBe(true);
    });

    it("should include session metadata in list", async () => {
      // Create a session first
      mockGetResponse.mockResolvedValue({
        content: "Test response",
        reasoning: "Test reasoning",
      });

      await request(app)
        .post("/chat")
        .send({
          sessionId: "metadata-test",
          userMessage: "Test",
        });

      const response = await request(app).get("/sessions");
      const session = response.body.sessions.find(
        (s: any) => s.sessionId === "metadata-test"
      );

      expect(session).toBeDefined();
      expect(session.messageCount).toBeGreaterThan(0);
      expect(session.riskScore).toBeDefined();
      expect(session.lastMessage).toBeDefined();
    });
  });

  describe("GET /sessions/:id", () => {
    it("should return session details", async () => {
      // Create a session first
      mockGetResponse.mockResolvedValue({
        content: "Detail test response",
        reasoning: "Detail test reasoning",
      });

      await request(app)
        .post("/chat")
        .send({
          sessionId: "detail-test",
          userMessage: "Test",
        });

      const response = await request(app).get("/sessions/detail-test");

      expect(response.status).toBe(200);
      expect(response.body.session).toBeDefined();
      expect(response.body.session.sessionId).toBe("detail-test");
      expect(response.body.session.messages).toBeDefined();
      expect(response.body.session.timeline).toBeDefined();
    });

    it("should return 404 for non-existent session", async () => {
      const response = await request(app).get("/sessions/non-existent-session");

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Session not found");
    });
  });
});

