import { HeartbeatStrategy } from './HeartbeatStrategy.js';

/**
 * BasicGraphQLStrategy - Basic GraphQL introspection check
 * Sends { __typename } query to verify GraphQL is responding
 */
export class BasicGraphQLStrategy extends HeartbeatStrategy {
  /**
   * Execute basic GraphQL health check
   * @param {Object} service - Service configuration
   * @param {Object} check - Check configuration
   * @returns {Promise<Object>} Check result
   */
  async execute(service, check) {
    const timeout = check.timeout || 10000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(service.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: check.query || '{ __typename }'
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Try to parse JSON, but don't fail if it's HTML or other content
      let data = null;
      let parseError = null;
      try {
        data = await response.json();
      } catch (e) {
        parseError = e.message;
      }

      return {
        success: response.ok && response.status === 200 && !parseError,
        status: response.status,
        data: data,
        error: !response.ok ? `HTTP ${response.status}` : (parseError ? `Invalid JSON response: ${parseError}` : null),
        hasResponse: true  // Indicate we got a response (not a timeout/network error)
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      return {
        success: false,
        status: 0,
        data: null,
        error: error.name === 'AbortError' ? 'Request timeout' : error.message,
        hasResponse: false  // Network error or timeout
      };
    }
  }
}
