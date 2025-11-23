import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { authenticate } from './middleware/auth.js';
import eventsRouter from './routes/events.js';
import sessionsRouter from './routes/sessions.js';
import evaluateRouter from './routes/evaluate.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint (no auth required)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API v1 routes (all require authentication)
app.use('/v1/events', authenticate, eventsRouter);
app.use('/v1/sessions', authenticate, sessionsRouter);
app.use('/v1/evaluate', authenticate, evaluateRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
    },
  });
});

// Error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: config.nodeEnv === 'development' ? err.message : 'Internal server error',
      },
    });
  }
);

// Start server
const server = app.listen(config.port, () => {
  console.log(`SafetyLayer Backend running on port ${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Database: ${config.db.host}:${config.db.port}/${config.db.database}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
