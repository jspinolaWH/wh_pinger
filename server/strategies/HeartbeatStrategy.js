/**
 * HeartbeatStrategy - Base class for health check strategies
 * Implements strategy pattern for different types of health checks
 */
export class HeartbeatStrategy {
  /**
   * Execute health check
   * @param {Object} service - Service configuration
   * @param {Object} check - Check configuration
   * @returns {Promise<Object>} Check result
   */
  async execute(service, check) {
    throw new Error('HeartbeatStrategy.execute() must be implemented by subclass');
  }

  /**
   * Create timeout promise
   * @param {number} ms - Timeout in milliseconds
   * @returns {Promise} Promise that rejects after timeout
   */
  createTimeout(ms) {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), ms);
    });
  }
}
