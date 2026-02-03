/**
 * FlatlineDetector - Detects service flatlines (consecutive failures)
 * Tracks failures and emits flatline/recovery events
 */
export class FlatlineDetector {
  constructor(eventBus, thresholds) {
    this.eventBus = eventBus;
    this.thresholds = thresholds;
    this.serviceStates = new Map();

    // Subscribe to heartbeat events
    eventBus.on('heartbeat_failed', this.handleFailure.bind(this));
    eventBus.on('heartbeat_received', this.handleSuccess.bind(this));
  }

  /**
   * Handle heartbeat failure
   * @param {Object} event - Heartbeat failed event
   */
  handleFailure(event) {
    const state = this.getServiceState(event.service);
    state.consecutiveFailures++;
    state.lastFailure = event.timestamp;
    state.lastCheck = event.timestamp;
    state.lastHttpStatus = event.httpStatus;

    // Get flatline threshold for this service
    const flatlineThreshold = this.getFlatlineThreshold(event.service);

    // Check if service has flatlined
    if (state.consecutiveFailures >= flatlineThreshold) {
      if (!state.isFlatlined) {
        state.isFlatlined = true;
        state.flatlineStartTime = event.timestamp;

        const severity = this.calculateSeverity(state.consecutiveFailures);

        this.eventBus.emit('flatline_detected', {
          service: event.service,
          consecutiveFailures: state.consecutiveFailures,
          lastSuccess: state.lastSuccess,
          timeSinceLastSuccess: state.lastSuccess 
            ? Date.now() - new Date(state.lastSuccess).getTime()
            : null,
          severity,
          timestamp: event.timestamp
        });
      }
    }

    // Emit pulse changed event if status degraded
    if (state.lastPulseStatus && state.lastPulseStatus !== 'flatline') {
      this.eventBus.emit('pulse_changed', {
        service: event.service,
        oldStatus: state.lastPulseStatus,
        newStatus: 'flatline',
        timestamp: event.timestamp
      });
    }

    state.lastPulseStatus = 'flatline';
    state.failureCount++;
  }

  /**
   * Handle heartbeat success
   * @param {Object} event - Heartbeat received event
   */
  handleSuccess(event) {
    const state = this.getServiceState(event.service);
    const previousStatus = state.lastPulseStatus;

    // Check for recovery from flatline
    if (state.isFlatlined) {
      const downtime = new Date(event.timestamp) - new Date(state.flatlineStartTime);

      this.eventBus.emit('service_recovered', {
        service: event.service,
        downtime,
        failureCount: state.consecutiveFailures,
        timestamp: event.timestamp
      });
    }

    // Update state
    state.consecutiveFailures = 0;
    state.lastSuccess = event.timestamp;
    state.lastCheck = event.timestamp;
    state.isFlatlined = false;
    state.flatlineStartTime = null;
    state.successCount++;
    state.lastHttpStatus = event.httpStatus;

    // Emit pulse changed event if status changed
    const newStatus = event.pulse.status;
    if (previousStatus && previousStatus !== newStatus) {
      this.eventBus.emit('pulse_changed', {
        service: event.service,
        oldStatus: previousStatus,
        newStatus: newStatus,
        responseTime: event.responseTime,
        timestamp: event.timestamp
      });
    }

    state.lastPulseStatus = newStatus;
  }

  /**
   * Get or create service state
   * @param {string} serviceName - Service name
   * @returns {Object} Service state
   */
  getServiceState(serviceName) {
    if (!this.serviceStates.has(serviceName)) {
      this.serviceStates.set(serviceName, {
        consecutiveFailures: 0,
        lastSuccess: null,
        lastFailure: null,
        lastCheck: null,
        lastPulseStatus: null,
        lastHttpStatus: null,
        isFlatlined: false,
        flatlineStartTime: null,
        successCount: 0,
        failureCount: 0
      });
    }
    return this.serviceStates.get(serviceName);
  }

  /**
   * Get flatline threshold for service
   * @param {string} serviceName - Service name
   * @returns {number} Consecutive failure threshold
   */
  getFlatlineThreshold(serviceName) {
    // This will be enhanced later to look up service tier
    // For now, use default
    return this.thresholds.default.flatline.consecutiveFailures;
  }

  /**
   * Calculate severity based on failure count
   * @param {number} failures - Consecutive failures
   * @returns {string} Severity level
   */
  calculateSeverity(failures) {
    if (failures >= 10) return 'catastrophic';
    if (failures >= 5) return 'critical';
    return 'warning';
  }

  /**
   * Get current state for all services
   * @returns {Map} Service states
   */
  getAllStates() {
    return this.serviceStates;
  }

  /**
   * Reset state for a service
   * @param {string} serviceName - Service name
   */
  resetService(serviceName) {
    this.serviceStates.delete(serviceName);
  }

  /**
   * Get uptime percentage for a service
   * @param {string} serviceName - Service name
   * @returns {number} Uptime percentage
   */
  getUptime(serviceName) {
    const state = this.getServiceState(serviceName);
    const totalChecks = state.successCount + state.failureCount;
    
    if (totalChecks === 0) return 100;
    
    return (state.successCount / totalChecks) * 100;
  }
}
