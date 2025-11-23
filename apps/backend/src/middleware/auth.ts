import type { Request, Response, NextFunction } from 'express';
import { query } from '../db/connection.js';
import { config } from '../config.js';
import crypto from 'crypto';

interface AuthenticatedRequest extends Request {
  projectId?: string;
}

function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing API key',
        },
      });
      return;
    }

    // Development mode: allow dev API key
    if (config.nodeEnv === 'development' && apiKey === config.auth.devApiKey) {
      // In dev mode, allow passing projectId in header
      req.projectId = (req.headers['x-project-id'] as string) || 'proj_dev';
      next();
      return;
    }

    // Production mode: validate API key against database
    const apiKeyHash = hashApiKey(apiKey);
    const result = await query<{ id: string }>(
      'SELECT id FROM projects WHERE api_key_hash = $1',
      [apiKeyHash]
    );

    if (result.rows.length === 0) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid API key',
        },
      });
      return;
    }

    req.projectId = result.rows[0].id;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Authentication failed',
      },
    });
  }
}
