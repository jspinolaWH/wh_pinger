/**
 * EventBus - Central event emitter/subscriber system
 * Provides decoupled communication between components
 */
export class EventBus {
  constructor() {
    this.listeners = {};
    this.eventHistory = [];
    this.maxHistorySize = 100;
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function to remove
   */
  off(event, callback) {
    if (!this.listeners[event]) return;
    
    this.listeners[event] = this.listeners[event].filter(
      cb => cb !== callback
    );
  }

  /**
   * Subscribe to an event once
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  once(event, callback) {
    const onceWrapper = (data) => {
      callback(data);
      this.off(event, onceWrapper);
    };
    this.on(event, onceWrapper);
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    const eventData = {
      event,
      data,
      timestamp: new Date().toISOString()
    };

    // Store in history
    this.eventHistory.push(eventData);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Notify listeners
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  /**
   * Get recent event history
   * @param {string} [event] - Optional: filter by event name
   * @param {number} [limit] - Optional: limit results
   * @returns {Array} Recent events
   */
  getHistory(event = null, limit = 50) {
    let history = this.eventHistory;
    
    if (event) {
      history = history.filter(e => e.event === event);
    }
    
    return history.slice(-limit);
  }

  /**
   * Clear all listeners
   */
  clear() {
    this.listeners = {};
  }

  /**
   * Get list of registered events
   * @returns {Array<string>} Event names
   */
  getEvents() {
    return Object.keys(this.listeners);
  }

  /**
   * Get listener count for an event
   * @param {string} event - Event name
   * @returns {number} Number of listeners
   */
  listenerCount(event) {
    return this.listeners[event]?.length || 0;
  }
}
