import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { SessionEngine, CoTMonitor } from '@safetylayer/core';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize core components (placeholder for now)
const sessionEngine = new SessionEngine({ maxMessages: 50 });
const cotMonitor = new CoTMonitor();

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Placeholder endpoints (to be implemented in Ticket 5)

/**
 * POST /chat
 * Handles chat interactions, ingests messages, and returns risk analysis
 */
app.post('/chat', async (req: Request, res: Response) => {
  res.status(501).json({
    error: 'Not implemented',
    message: 'Chat endpoint will be implemented in Ticket 5'
  });
});

/**
 * GET /sessions
 * Returns list of all active sessions
 */
app.get('/sessions', (req: Request, res: Response) => {
  try {
    const sessions = sessionEngine.listSessions();
    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve sessions' });
  }
});

/**
 * GET /sessions/:id
 * Returns detailed information about a specific session
 */
app.get('/sessions/:id', (req: Request, res: Response) => {
  try {
    const session = sessionEngine.getSession(req.params.id);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json({ session });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve session' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Demo API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

