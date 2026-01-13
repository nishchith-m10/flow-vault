/**
 * Safe JSON operations with comprehensive error handling
 * Prevents application crashes from malformed JSON data
 */

const MAX_JSON_SIZE = 1024 * 1024; // 1MB limit

export interface JSONParseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface JSONStringifyResult {
  success: boolean;
  json?: string;
  error?: string;
}

/**
 * Safely parse JSON with typed return
 * @param jsonString - JSON string to parse
 * @param fallback - Optional fallback value if parse fails
 * @returns Parsed data or fallback with success indicator
 */
export function safeJSONParse<T>(
  jsonString: string,
  fallback?: T
): JSONParseResult<T> {
  // Add size check
  if (jsonString.length > MAX_JSON_SIZE) {
    const error = `JSON string too large: ${jsonString.length} bytes (max ${MAX_JSON_SIZE})`;
    if (fallback !== undefined) {
      return { success: false, data: fallback, error };
    }
    return { success: false, error };
  }
  
  try {
    const data = JSON.parse(jsonString) as T;
    return { success: true, data };
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? `JSON parse error: ${error.message}` 
      : 'Failed to parse JSON';
    
    if (fallback !== undefined) {
      return { success: false, data: fallback, error: errorMessage };
    }
    
    return { success: false, error: errorMessage };
  }
}

/**
 * Safely stringify JSON with circular reference handling
 * @param data - Data to stringify
 * @param space - Optional indentation spaces
 * @returns Stringified JSON or error
 */
export function safeJSONStringify(
  data: unknown,
  space?: number
): JSONStringifyResult {
  try {
    const json = JSON.stringify(data, null, space);
    return { success: true, json };
  } catch (error) {
    const errorMessage = error instanceof Error
      ? `JSON stringify error: ${error.message}`
      : 'Failed to stringify JSON';
    return { success: false, error: errorMessage };
  }
}
