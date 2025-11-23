/**
 * Dashboard configuration
 * Reads environment variables and provides typed config values
 */

/** API base URL for backend requests */
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001";

/** API key for authentication */
export const API_KEY = import.meta.env.VITE_API_KEY || "";

/** Default project ID (can be overridden by user selection) */
export const DEFAULT_PROJECT_ID =
  import.meta.env.VITE_PROJECT_ID || "dev-project";

/** Use mock data instead of real API (for development without backend) */
export const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === "true";

/**
 * Validate that required configuration is present
 * @throws Error if required config is missing
 */
export function validateConfig(): void {
  if (USE_MOCK_DATA) {
    console.info("🎭 Mock mode enabled - using test data");
    console.info("   Set VITE_USE_MOCK_DATA=false to use real backend");
    return; // Skip validation in mock mode
  }

  if (!API_KEY) {
    console.warn("⚠️  VITE_API_KEY is not set. API requests may fail.");
    console.warn(
      "   Set VITE_API_KEY in your .env file or environment variables."
    );
    console.warn("   Or set VITE_USE_MOCK_DATA=true to use test data");
  }

  if (!API_BASE_URL) {
    throw new Error("VITE_API_URL is required but not set");
  }
}

/** Run validation on import */
validateConfig();

export const config = {
  apiBaseUrl: API_BASE_URL,
  apiKey: API_KEY,
  defaultProjectId: DEFAULT_PROJECT_ID,
  useMockData: USE_MOCK_DATA,
} as const;
