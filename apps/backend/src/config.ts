import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'safetylayer',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },

  auth: {
    // For development: allow bypassing auth with this key
    devApiKey: process.env.DEV_API_KEY || 'dev-key-12345',
  },

  threatModel: {
    provider: (process.env.THREAT_MODEL_PROVIDER || 'openai') as 'openai' | 'mock',
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-4',
      timeout: parseInt(process.env.OPENAI_TIMEOUT || '30000', 10),
      maxEventsToAnalyze: parseInt(process.env.MAX_EVENTS_TO_ANALYZE || '50', 10),
    },
  },

  analysis: {
    // Whether to run analysis synchronously (blocks response) or asynchronously (background)
    // 'async' is recommended for production to avoid blocking event recording
    strategy: (process.env.ANALYSIS_STRATEGY || 'async') as 'sync' | 'async',
    // Whether to run session analysis on every event (can be expensive)
    enableSessionAnalysis: process.env.ENABLE_SESSION_ANALYSIS !== 'false',
    // Whether to run CoT analysis on CoT events
    enableCoTAnalysis: process.env.ENABLE_COT_ANALYSIS !== 'false',
  },
};
