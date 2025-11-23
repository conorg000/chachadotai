/**
 * API client service for SafetyLayer dashboard
 * Provides typed methods for all backend API calls
 */

import type {
  ErrorResponse,
  GetSessionResponse,
  ListEventsResponse,
  ListSessionsResponse,
} from "@safetylayer/contracts";
import { ENDPOINTS, buildUrl } from "@safetylayer/contracts";
import axios, { AxiosError, AxiosInstance } from "axios";
import { config } from "../config";

/** Options for listSessions */
export interface ListSessionsOptions {
  limit?: number;
  offset?: number;
  minRiskScore?: number;
  maxRiskScore?: number;
  patterns?: string[];
  sortBy?: "riskScore" | "lastActivityAt" | "createdAt";
  sortOrder?: "asc" | "desc";
}

/** Options for listEvents */
export interface ListEventsOptions {
  types?: string[];
  limit?: number;
  offset?: number;
  after?: number;
  before?: number;
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.apiBaseUrl,
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000, // 30 seconds
    });

    // Add API key header if available
    if (config.apiKey) {
      this.client.defaults.headers.common["x-api-key"] = config.apiKey;
    }

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ErrorResponse>) => {
        console.error("API Error:", error);

        if (error.response?.data) {
          const errorData = error.response.data;
          throw new Error(errorData.message || "API request failed");
        }

        if (error.code === "ECONNABORTED") {
          throw new Error("Request timeout - server may be down");
        }

        if (!error.response) {
          throw new Error("Network error - cannot connect to API");
        }

        throw new Error(error.message || "Unknown error occurred");
      }
    );
  }

  /**
   * List sessions for a project
   * @param projectId Project ID to filter by
   * @param options Optional query parameters
   */
  async listSessions(
    projectId: string,
    options?: ListSessionsOptions
  ): Promise<ListSessionsResponse> {
    const params: Record<string, string | number> = {
      projectId,
    };

    if (options?.limit) params.limit = options.limit;
    if (options?.offset) params.offset = options.offset;
    if (options?.minRiskScore !== undefined)
      params.minRiskScore = options.minRiskScore;
    if (options?.maxRiskScore !== undefined)
      params.maxRiskScore = options.maxRiskScore;
    if (options?.patterns) params.patterns = options.patterns.join(",");
    if (options?.sortBy) params.sortBy = options.sortBy;
    if (options?.sortOrder) params.sortOrder = options.sortOrder;

    const response = await this.client.get<ListSessionsResponse>(
      ENDPOINTS.SESSIONS.LIST,
      { params }
    );

    return response.data;
  }

  /**
   * Get detailed information about a specific session
   * @param sessionId Session ID to fetch
   */
  async getSession(sessionId: string): Promise<GetSessionResponse> {
    const url = buildUrl(ENDPOINTS.SESSIONS.GET, { id: sessionId });
    const response = await this.client.get<GetSessionResponse>(url);
    return response.data;
  }

  /**
   * List events for a session
   * @param sessionId Session ID to filter by
   * @param projectId Project ID (required for auth)
   * @param options Optional query parameters
   */
  async listEvents(
    sessionId: string,
    projectId: string,
    options?: ListEventsOptions
  ): Promise<ListEventsResponse> {
    const params: Record<string, string | number> = {
      sessionId,
      projectId,
    };

    if (options?.types) params.types = options.types.join(",");
    if (options?.limit) params.limit = options.limit;
    if (options?.offset) params.offset = options.offset;
    if (options?.after) params.after = options.after;
    if (options?.before) params.before = options.before;

    const response = await this.client.get<ListEventsResponse>(
      ENDPOINTS.EVENTS_LIST,
      { params }
    );

    return response.data;
  }

  /**
   * Update API key (e.g., when user logs in or switches projects)
   * @param apiKey New API key
   */
  setApiKey(apiKey: string): void {
    this.client.defaults.headers.common["x-api-key"] = apiKey;
  }

  /**
   * Check if API is reachable
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try a simple GET request to the base URL or sessions endpoint
      await this.client.get("/health", { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance (either mock or real based on config)
import { MockApiClient } from "./api-mock";

export const api = config.useMockData
  ? (new MockApiClient() as any as ApiClient)
  : new ApiClient();

// Export classes for testing
export { ApiClient };
