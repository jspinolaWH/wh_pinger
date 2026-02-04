import { promises as fs } from 'fs';
import fsSync from 'fs';
import path from 'path';

/**
 * DataLogger - Logs heartbeat data to JSON files
 * Handles log rotation and historical data retrieval
 */
export class DataLogger {
  constructor(eventBus, config) {
    this.eventBus = eventBus;
    this.config = config;
    this.logPath = config.monitoring?.logPath || './data/logs';
    this.historyRetention = config.monitoring?.historyRetention || 24; // hours
    this.logCache = new Map(); // In-memory cache for current day's logs

    // Ensure log directory exists SYNCHRONOUSLY before any events can fire
    this.ensureLogDirectorySync();

    // Subscribe to events
    eventBus.on('heartbeat_received', this.logHeartbeat.bind(this));
    eventBus.on('heartbeat_failed', this.logHeartbeat.bind(this));

    // Schedule daily log rotation
    this.scheduleLogRotation();
  }

  /**
   * Ensure log directory exists synchronously (called during constructor)
   */
  ensureLogDirectorySync() {
    try {
      if (!fsSync.existsSync(this.logPath)) {
        fsSync.mkdirSync(this.logPath, { recursive: true });
        console.log(`   ✓ Created log directory: ${this.logPath}`);
      }
    } catch (error) {
      console.error('Error creating log directory:', error);
      throw error; // Fail fast if we can't create log directory
    }
  }

  /**
   * Ensure log directory exists (async version for runtime use)
   */
  async ensureLogDirectory() {
    try {
      await fs.mkdir(this.logPath, { recursive: true });
    } catch (error) {
      console.error('Error creating log directory:', error);
    }
  }

  /**
   * Log heartbeat result
   * @param {Object} event - Heartbeat event
   */
  async logHeartbeat(event) {
    const logEntry = {
      timestamp: event.timestamp,
      service: event.service,
      check: event.check,
      pulse: event.pulse.status,
      responseTime: event.responseTime,
      success: event.success,
      error: event.error || null,
      httpStatus: event.httpStatus || null
    };

    await this.appendToLog(event.service, logEntry);
  }



  /**
   * Append entry to log file
   * @param {string} serviceName - Service name
   * @param {Object} entry - Log entry
   * @param {string} logType - Log type (default: 'heartbeats')
   */
  async appendToLog(serviceName, entry, logType = 'heartbeats') {
    try {
      const date = new Date().toISOString().split('T')[0];
      const fileName = `${serviceName.replace(/\s+/g, '_')}-${date}.json`;
      const filePath = path.join(this.logPath, fileName);

      // Get or load log file
      let logData = this.logCache.get(filePath);
      
      if (!logData) {
        try {
          const fileContent = await fs.readFile(filePath, 'utf-8');
          logData = JSON.parse(fileContent);
        } catch (error) {
          // File doesn't exist, create new structure
          logData = {
            service: serviceName,
            date: date,
            heartbeats: [],
            events: [],
            summary: {
              checkCount: 0,
              successCount: 0,
              failureCount: 0,
              avgResponseTime: 0,
              uptime: 100
            }
          };
        }
      }

      // Add entry to appropriate array
      if (logType === 'heartbeats') {
        logData.heartbeats.push(entry);
        
        // Update summary
        logData.summary.checkCount++;
        if (entry.success) {
          logData.summary.successCount++;
        } else {
          logData.summary.failureCount++;
        }
        
        // Calculate average response time (only for successful checks)
        if (entry.success && entry.responseTime) {
          const successfulChecks = logData.heartbeats.filter(h => h.success && h.responseTime);
          const totalTime = successfulChecks.reduce((sum, h) => sum + h.responseTime, 0);
          logData.summary.avgResponseTime = Math.round(totalTime / successfulChecks.length);
        }
        
        // Calculate uptime
        logData.summary.uptime = (logData.summary.successCount / logData.summary.checkCount) * 100;
      } else {
        logData.events.push(entry);
      }

      // Cache and write to disk
      this.logCache.set(filePath, logData);
      await fs.writeFile(filePath, JSON.stringify(logData, null, 2));

    } catch (error) {
      console.error(`Error appending to log for ${serviceName}:`, error);
    }
  }

  /**
   * Get historical data for a service
   * @param {string} serviceName - Service name
   * @param {number} hours - Number of hours to retrieve (default: 24)
   * @returns {Promise<Array>} Log entries
   */
  async getHistory(serviceName, hours = 24) {
    try {
      const entries = [];
      const now = new Date();
      
      // Calculate how many days to look back
      const daysToCheck = Math.ceil(hours / 24);
      
      for (let i = 0; i < daysToCheck; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const fileName = `${serviceName.replace(/\s+/g, '_')}-${dateStr}.json`;
        const filePath = path.join(this.logPath, fileName);
        
        try {
          const fileContent = await fs.readFile(filePath, 'utf-8');
          const logData = JSON.parse(fileContent);
          
          // Filter entries within time range
          const cutoffTime = new Date(now.getTime() - (hours * 60 * 60 * 1000));
          const filteredEntries = logData.heartbeats.filter(entry => {
            return new Date(entry.timestamp) >= cutoffTime;
          });
          
          entries.push(...filteredEntries);
        } catch (error) {
          // File doesn't exist, skip
          continue;
        }
      }
      
      // Sort by timestamp
      return entries.sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      );
      
    } catch (error) {
      console.error(`Error getting history for ${serviceName}:`, error);
      return [];
    }
  }

  /**
   * Get summary for a service
   * @param {string} serviceName - Service name
   * @returns {Promise<Object>} Summary data
   */
  async getSummary(serviceName) {
    try {
      const date = new Date().toISOString().split('T')[0];
      const fileName = `${serviceName.replace(/\s+/g, '_')}-${date}.json`;
      const filePath = path.join(this.logPath, fileName);
      
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const logData = JSON.parse(fileContent);
      
      return logData.summary;
    } catch (error) {
      return {
        checkCount: 0,
        successCount: 0,
        failureCount: 0,
        avgResponseTime: 0,
        uptime: 100
      };
    }
  }

  /**
   * Schedule daily log rotation
   */
  scheduleLogRotation() {
    // Run rotation check at midnight
    const checkRotation = async () => {
      await this.rotateLogsIfNeeded();
      
      // Schedule next check in 24 hours
      setTimeout(checkRotation, 24 * 60 * 60 * 1000);
    };
    
    // Calculate time until next midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const msUntilMidnight = tomorrow - now;
    
    // Start rotation cycle
    setTimeout(checkRotation, msUntilMidnight);
  }

  /**
   * Rotate old log files
   */
  async rotateLogsIfNeeded() {
    try {
      const files = await fs.readdir(this.logPath);
      const now = new Date();
      const cutoffTime = now.getTime() - (this.historyRetention * 60 * 60 * 1000);
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const filePath = path.join(this.logPath, file);
        const stats = await fs.stat(filePath);
        
        // Delete files older than retention period
        if (stats.mtime.getTime() < cutoffTime) {
          await fs.unlink(filePath);
          console.log(`Deleted old log file: ${file}`);
          
          // Remove from cache
          this.logCache.delete(filePath);
        }
      }
    } catch (error) {
      console.error('Error rotating logs:', error);
    }
  }

  /**
   * Clear log cache
   */
  clearCache() {
    this.logCache.clear();
  }

  /**
   * Get all log files
   * @returns {Promise<Array<string>>} List of log files
   */
  async getLogFiles() {
    try {
      const files = await fs.readdir(this.logPath);
      return files.filter(f => f.endsWith('.json'));
    } catch (error) {
      console.error('Error reading log files:', error);
      return [];
    }
  }
}
