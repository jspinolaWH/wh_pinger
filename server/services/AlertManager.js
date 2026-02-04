/**
 * AlertManager - Handles alerts for critical events
 * Manages alert history and muting functionality
 * Note: Audio playback requires platform-specific implementation
 */
export class AlertManager {
  constructor(eventBus, config) {
    this.eventBus = eventBus;
    this.config = config;
    this.alertHistory = [];
    this.mutedServices = new Set();
    this.audioEnabled = config.alerts?.audio ?? true;

    // Subscribe to critical events
    eventBus.on('pulse_changed', this.handlePulseChange.bind(this));
  }

  /**
   * Handle pulse change event
   * @param {Object} event - Pulse change event
   */
  handlePulseChange(event) {
    if (this.mutedServices.has(event.service)) {
      return;
    }

    // Only alert on degradation
    if (this.isStatusDegraded(event.oldStatus, event.newStatus)) {
      const alert = {
        type: 'degraded',
        service: event.service,
        message: `⚠️ ${event.service} pulse degraded: ${event.oldStatus} → ${event.newStatus}`,
        severity: this.getSeverityForStatus(event.newStatus),
        timestamp: event.timestamp
      };

      this.triggerAlert(alert);
      this.logAlert(alert);

      if (this.audioEnabled) {
        this.playSound('warning');
      }
    }

    // Alert on recovery to healthy
    if (event.newStatus === 'healthy' && event.oldStatus !== 'healthy') {
      const alert = {
        type: 'recovery',
        service: event.service,
        message: `✅ ${event.service} has recovered to healthy status`,
        severity: 'info',
        timestamp: event.timestamp
      };

      this.triggerAlert(alert);
      this.logAlert(alert);

      if (this.audioEnabled) {
        this.playSound('recovery');
      }
    }
  }

  /**
   * Trigger alert by emitting event
   * @param {Object} alert - Alert object
   */
  triggerAlert(alert) {
    console.log(`[ALERT] ${alert.message}`);
    
    this.eventBus.emit('alert_triggered', alert);
  }

  /**
   * Log alert to history
   * @param {Object} alert - Alert object
   */
  logAlert(alert) {
    this.alertHistory.push(alert);
    
    // Keep only last 100 alerts
    if (this.alertHistory.length > 100) {
      this.alertHistory.shift();
    }
  }

  /**
   * Play alert sound (placeholder)
   * @param {string} type - Sound type (flatline, warning, recovery)
   * @param {Object} options - Play options
   */
  playSound(type, options = {}) {
    // Placeholder for sound playback
    // On Raspberry Pi, this would use aplay or play-sound library
    // For now, just log
    console.log(`[SOUND] Would play ${type} sound`, options);
    
    // Example implementation for Raspberry Pi:
    // const player = require('play-sound')();
    // const soundFile = this.config.alerts.sounds[type];
    // player.play(soundFile, (err) => {
    //   if (err) console.error('Error playing sound:', err);
    // });
  }

  /**
   * Check if status change is a degradation
   * @param {string} oldStatus - Old status
   * @param {string} newStatus - New status
   * @returns {boolean} True if degraded
   */
  isStatusDegraded(oldStatus, newStatus) {
    const statusHierarchy = {
      'healthy': 0,
      'warning': 1,
      'critical': 2
    };

    return statusHierarchy[newStatus] > statusHierarchy[oldStatus];
  }

  /**
   * Get severity for pulse status
   * @param {string} status - Pulse status
   * @returns {string} Severity level
   */
  getSeverityForStatus(status) {
    const severityMap = {
      'healthy': 'info',
      'warning': 'medium',
      'critical': 'high'
    };

    return severityMap[status] || 'info';
  }

  /**
   * Mute alerts for a service
   * @param {string} serviceName - Service name
   */
  muteService(serviceName) {
    this.mutedServices.add(serviceName);
    console.log(`Muted alerts for ${serviceName}`);
  }

  /**
   * Unmute alerts for a service
   * @param {string} serviceName - Service name
   */
  unmuteService(serviceName) {
    this.mutedServices.delete(serviceName);
    console.log(`Unmuted alerts for ${serviceName}`);
  }

  /**
   * Check if service is muted
   * @param {string} serviceName - Service name
   * @returns {boolean} True if muted
   */
  isMuted(serviceName) {
    return this.mutedServices.has(serviceName);
  }

  /**
   * Get alert history
   * @param {number} limit - Maximum number of alerts to return
   * @returns {Array} Recent alerts
   */
  getAlertHistory(limit = 50) {
    return this.alertHistory.slice(-limit);
  }

  /**
   * Clear alert history
   */
  clearHistory() {
    this.alertHistory = [];
  }

  /**
   * Enable or disable audio alerts
   * @param {boolean} enabled - Enable audio
   */
  setAudioEnabled(enabled) {
    this.audioEnabled = enabled;
    console.log(`Audio alerts ${enabled ? 'enabled' : 'disabled'}`);
  }
}
