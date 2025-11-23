/**
 * API endpoint paths as constants
 * Ensures consistency between SDK and backend
 */

export const ENDPOINTS = {
  // Public endpoints (SDK → Backend)
  EVENTS: {
    RECORD: '/v1/events',
  },
  
  EVALUATE: '/v1/evaluate',
  
  // Private endpoints (Dashboard → Backend)
  SESSIONS: {
    LIST: '/v1/sessions',
    GET: '/v1/sessions/:id',
  },
  
  EVENTS_LIST: '/v1/events',
  
  // Admin endpoints (future)
  PROJECTS: {
    LIST: '/v1/projects',
    GET: '/v1/projects/:id',
    CREATE: '/v1/projects',
  },
  
  POLICIES: {
    LIST: '/v1/policies',
    GET: '/v1/policies/:id',
    CREATE: '/v1/policies',
    UPDATE: '/v1/policies/:id',
    DELETE: '/v1/policies/:id',
  },
} as const;

/** Helper to build parameterized URLs */
export function buildUrl(template: string, params: Record<string, string>): string {
  let url = template;
  for (const [key, value] of Object.entries(params)) {
    url = url.replace(`:${key}`, encodeURIComponent(value));
  }
  return url;
}

