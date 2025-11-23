/**
 * Session ID generation utility for SafetyLayer SDK
 */

/**
 * Generate a unique session identifier
 * 
 * Format: sess_{timestamp}_{random}
 * 
 * @returns A unique session ID string
 * 
 * @example
 * ```typescript
 * const sessionId = generateSessionId();
 * // => "sess_lk9x2a_8f4e2b3c"
 * ```
 */
export function generateSessionId(): string {
  // Convert timestamp to base36 for shorter strings
  const timestamp = Date.now().toString(36);
  
  // Generate random string (8 characters)
  const random = Math.random().toString(36).substring(2, 10);
  
  return `sess_${timestamp}_${random}`;
}

