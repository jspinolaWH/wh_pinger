/**
 * HeartbeatEngine - Core heartbeat execution and pulse evaluation
 * Executes health checks and evaluates pulse status based on thresholds
 */
export class HeartbeatEngine {
  constructor(eventBus, strategies, thresholds) {
    this.eventBus = eventBus;
    this.strategies = strategies;
    this.thresholds = thresholds;
  }

  /**
   * Send heartbeat check to service
   * @param {Object} service - Service configuration
   * @param {Object} check - Check configuration
   * @returns {Promise<Object>} Heartbeat result
   */
  async sendHeartbeat(service, check) {
    const startTime = Date.now();

    // Emit heartbeat_sent event
    this.eventBus.emit('heartbeat_sent', {
      service: service.name,
      check: check.name,
      timestamp: new Date().toISOString()
    });

    try {
      // Get appropriate strategy
      const strategy = this.getStrategy(check.strategy);
      if (!strategy) {
        throw new Error(`Unknown strategy: ${check.strategy}`);
      }

      // Execute strategy
      const response = await strategy.execute(service, check);
      const responseTime = Date.now() - startTime;

      // Evaluate pulse status
      const pulse = this.evaluatePulse(responseTime, response);

      const result = {
        service: service.name,
        check: check.name,
        timestamp: new Date().toISOString(),
        pulse,
        responseTime,
        success: response.success,
        httpStatus: response.status,
        error: response.error,
        hasResponse: response.hasResponse
      };

      // Emit appropriate event
      if (response.success) {
        this.eventBus.emit('heartbeat_received', result);
      } else {
        // Only treat as failure for flatline detection if it's a true network error
        // HTTP errors (503, etc.) should not trigger flatline
        if (response.hasResponse) {
          // Got a response but it wasn't successful - treat as degraded heartbeat
          this.eventBus.emit('heartbeat_received', result);
        } else {
          // No response (timeout/network error) - treat as failure
          this.eventBus.emit('heartbeat_failed', result);
        }
      }

      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;

      const result = {
        service: service.name,
        check: check.name,
        timestamp: new Date().toISOString(),
        pulse: { status: 'flatline' },
        responseTime,
        success: false,
        error: error.message
      };

      this.eventBus.emit('heartbeat_failed', result);
      return result;
    }
  }

  /**
   * Evaluate pulse status based on response time and success
   * @param {number} responseTime - Response time in milliseconds
   * @param {Object} response - Response from strategy
   * @returns {Object} Pulse status
   */
  evaluatePulse(responseTime, response) {
    const thresholds = this.thresholds.default;

    // If request failed but we got a response (HTTP error like 503), 
    // evaluate based on response time, not flatline
    if (!response.success) {
      // True flatline: timeout or network error (no response received)
      if (!response.hasResponse) {
        return {
          status: 'flatline',
          responseTime: responseTime
        };
      }
      
      // HTTP error (got response, but not successful)
      // Treat as critical since the service is returning errors
      return {
        status: 'critical',
        responseTime: responseTime
      };
    }

    // Evaluate successful responses based on response time thresholds
    if (responseTime <= thresholds.healthy.max) {
      return {
        status: 'healthy',
        responseTime
      };
    } else if (responseTime <= thresholds.warning.max) {
      return {
        status: 'warning',
        responseTime
      };
    } else if (responseTime <= thresholds.degraded.max) {
      return {
        status: 'degraded',
        responseTime
      };
    } else {
      return {
        status: 'critical',
        responseTime
      };
    }
  }

  /**
   * Get strategy by name
   * @param {string} strategyName - Strategy name
   * @returns {HeartbeatStrategy} Strategy instance
   */
  getStrategy(strategyName) {
    return this.strategies[strategyName];
  }

  /**
   * Get threshold configuration for a tier
   * @param {string} tier - Service tier (critical, standard, low)
   * @returns {Object} Threshold configuration
   */
  getThresholdsForTier(tier) {
    const defaultThresholds = this.thresholds.default;
    const tierOverrides = this.thresholds.tiers[tier] || {};

    return {
      ...defaultThresholds,
      ...tierOverrides
    };
  }
}
