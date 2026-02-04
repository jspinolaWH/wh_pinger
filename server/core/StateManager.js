/**
 * StateManager - Manages service health states with sustained latency tracking
 * Tracks response history and evaluates states based on sustained patterns
 */
export class StateManager {
  constructor(eventBus, thresholds, servicesConfig) {
    this.eventBus = eventBus;
    this.thresholds = thresholds;
    this.servicesConfig = servicesConfig;
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
    const previousStatus = state.currentStatus;

    // Increment consecutive failures
    state.consecutiveFailures++;
    state.lastFailure = event.timestamp;
    state.lastCheck = event.timestamp;
    state.failureCount++;

    // Add to response history
    this.addToHistory(state, {
      timestamp: event.timestamp,
      responseTime: event.responseTime,
      status: 'critical',
      isFailure: true
    });

    // Get critical threshold for this service
    const criticalThreshold = this.getCriticalThreshold(event.service);

    // Check if service has reached critical failure threshold
    if (state.consecutiveFailures >= criticalThreshold) {
      state.currentStatus = 'critical';
      
      // Emit pulse changed event if status changed
      if (previousStatus !== 'critical') {
        this.eventBus.emit('pulse_changed', {
          service: event.service,
          oldStatus: previousStatus,
          newStatus: 'critical',
          consecutiveFailures: state.consecutiveFailures,
          timestamp: event.timestamp
        });
      }
    }
  }

  /**
   * Handle heartbeat success
   * @param {Object} event - Heartbeat received event
   */
  handleSuccess(event) {
    const state = this.getServiceState(event.service);
    const previousStatus = state.currentStatus;

    // Reset consecutive failures on success
    state.consecutiveFailures = 0;
    state.lastSuccess = event.timestamp;
    state.lastCheck = event.timestamp;
    state.successCount++;

    // Add to response history
    this.addToHistory(state, {
      timestamp: event.timestamp,
      responseTime: event.responseTime,
      status: event.pulse.status,
      isFailure: false
    });

    // Evaluate new status based on sustained patterns
    const newStatus = this.evaluateSustainedStatus(state, event.pulse.status);
    state.currentStatus = newStatus;

    // Emit pulse changed event if status changed
    if (previousStatus !== newStatus) {
      this.eventBus.emit('pulse_changed', {
        service: event.service,
        oldStatus: previousStatus,
        newStatus: newStatus,
        responseTime: event.responseTime,
        timestamp: event.timestamp
      });
    }
  }

  /**
   * Add response to service history
   * @param {Object} state - Service state
   * @param {Object} response - Response data
   */
  addToHistory(state, response) {
    state.responseHistory.push(response);

    // Keep only last 3 responses for sustained logic
    const sustainedCount = this.thresholds.default.warning.sustainedCount || 3;
    if (state.responseHistory.length > sustainedCount) {
      state.responseHistory.shift();
    }
  }

  /**
   * Evaluate sustained status based on response history
   * @param {Object} state - Service state
   * @param {string} currentPulseStatus - Current pulse status from HeartbeatEngine
   * @returns {string} Evaluated status (healthy, warning, critical)
   */
  evaluateSustainedStatus(state, currentPulseStatus) {
    const sustainedCount = this.thresholds.default.warning.sustainedCount || 3;
    const history = state.responseHistory;

    // If current pulse is critical, immediately return critical
    if (currentPulseStatus === 'critical') {
      return 'critical';
    }

    // If current pulse is healthy, immediately recover to healthy
    if (currentPulseStatus === 'healthy') {
      return 'healthy';
    }

    // Current pulse is warning - check if sustained
    if (currentPulseStatus === 'warning') {
      // Need sustained warning responses to enter warning state
      if (history.length >= sustainedCount) {
        // Check if last N responses are all in warning range
        const lastNResponses = history.slice(-sustainedCount);
        const allWarning = lastNResponses.every(r => 
          !r.isFailure && r.status === 'warning'
        );

        if (allWarning) {
          return 'warning';
        }
      }

      // Not sustained yet - stay healthy
      return 'healthy';
    }

    return 'healthy';
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
        currentStatus: 'healthy',
        responseHistory: [],
        successCount: 0,
        failureCount: 0
      });
    }
    return this.serviceStates.get(serviceName);
  }

  /**
   * Get critical failure threshold for service based on tier
   * @param {string} serviceName - Service name
   * @returns {number} Consecutive failure threshold
   */
  getCriticalThreshold(serviceName) {
    // Find service in config
    const service = this.servicesConfig.services?.find(s => s.name === serviceName);
    const tier = service?.tier || 'standard';

    // Get tier-specific threshold or default
    const tierConfig = this.thresholds.tiers?.[tier]?.critical;
    if (tierConfig?.consecutiveFailures) {
      return tierConfig.consecutiveFailures;
    }

    // Fall back to default
    return this.thresholds.default.critical.consecutiveFailures || 3;
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
    const uptime = totalChecks === 0 ? 100 : (state.successCount / totalChecks) * 100;
    
    console.log(`[UPTIME] ${serviceName}: ${uptime.toFixed(2)}% (${state.successCount} success / ${state.failureCount} failure / ${totalChecks} total)`);
    
    if (totalChecks === 0) return 100;
    
    return (state.successCount / totalChecks) * 100;
  }

  /**
   * Get current status for a service
   * @param {string} serviceName - Service name
   * @returns {string} Current status
   */
  getStatus(serviceName) {
    const state = this.getServiceState(serviceName);
    return state.currentStatus;
  }
}
