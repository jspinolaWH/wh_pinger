import { HeartbeatStrategy } from './HeartbeatStrategy.js';

/**
 * QueryGraphQLStrategy - Custom GraphQL query check
 * Executes specific queries and validates response structure
 */
export class QueryGraphQLStrategy extends HeartbeatStrategy {
  /**
   * Execute custom GraphQL query health check
   * @param {Object} service - Service configuration
   * @param {Object} check - Check configuration
   * @returns {Promise<Object>} Check result
   */
  async execute(service, check) {
    const timeout = check.timeout || 10000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const headers = {
        'Content-Type': 'application/json',
      };

      // Add auth token if configured
      if (service.authToken) {
        headers['Authorization'] = `Bearer ${service.authToken}`;
      }

      const response = await fetch(service.url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: check.query,
          variables: check.variables || {}
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      // Check for GraphQL errors
      const hasErrors = data.errors && data.errors.length > 0;

      return {
        success: response.ok && response.status === 200 && !hasErrors,
        status: response.status,
        data: data,
        error: hasErrors ? data.errors[0].message : (!response.ok ? `HTTP ${response.status}` : null)
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      return {
        success: false,
        status: 0,
        data: null,
        error: error.name === 'AbortError' ? 'Request timeout' : error.message
      };
    }
  }
}
