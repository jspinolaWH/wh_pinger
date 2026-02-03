import { HeartbeatStrategy } from './HeartbeatStrategy.js';

/**
 * AuthenticatedGraphQLStrategy - Authenticated GraphQL query check
 * Sends queries with authentication headers
 */
export class AuthenticatedGraphQLStrategy extends HeartbeatStrategy {
  /**
   * Execute authenticated GraphQL health check
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
          query: check.query
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      // For authenticated checks, also verify no auth errors
      const hasAuthError = data.errors?.some(err => 
        err.message?.toLowerCase().includes('auth') ||
        err.message?.toLowerCase().includes('unauthorized')
      );

      return {
        success: response.ok && response.status === 200 && !hasAuthError,
        status: response.status,
        data: data,
        error: hasAuthError ? 'Authentication error' : (!response.ok ? `HTTP ${response.status}` : null)
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
