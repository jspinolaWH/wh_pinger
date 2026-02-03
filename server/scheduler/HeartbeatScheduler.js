import schedule from 'node-schedule';

/**
 * HeartbeatScheduler - Manages scheduled health checks
 * Schedules checks at different intervals based on service tier
 */
export class HeartbeatScheduler {
  constructor(eventBus, heartbeatEngine, services) {
    this.eventBus = eventBus;
    this.heartbeatEngine = heartbeatEngine;
    this.services = services;
    this.jobs = new Map();
    this.isRunning = false;
  }

  /**
   * Start all scheduled checks
   */
  start() {
    if (this.isRunning) {
      console.log('Scheduler already running');
      return;
    }

    console.log('Starting heartbeat scheduler...');
    this.isRunning = true;

    // Schedule checks for each service
    for (const service of this.services) {
      this.scheduleService(service);
    }

    console.log(`Scheduled ${this.jobs.size} health check jobs`);
  }

  /**
   * Stop all scheduled checks
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('Stopping heartbeat scheduler...');
    
    // Cancel all jobs
    for (const [key, job] of this.jobs) {
      job.cancel();
    }
    
    this.jobs.clear();
    this.isRunning = false;
    
    console.log('Scheduler stopped');
  }

  /**
   * Schedule checks for a service
   * @param {Object} service - Service configuration
   */
  scheduleService(service) {
    // Schedule each check for the service
    for (const check of service.checks) {
      const jobKey = `${service.name}-${check.name}`;
      
      // Cancel existing job if any
      if (this.jobs.has(jobKey)) {
        this.jobs.get(jobKey).cancel();
      }

      // Create cron expression for interval
      const cronExpression = this.createCronExpression(service.heartbeatInterval);
      
      // Schedule job
      const job = schedule.scheduleJob(cronExpression, async () => {
        try {
          await this.heartbeatEngine.sendHeartbeat(service, check);
        } catch (error) {
          console.error(`Error in scheduled check for ${service.name}:`, error);
        }
      });

      this.jobs.set(jobKey, job);
      
      console.log(`Scheduled ${jobKey} every ${service.heartbeatInterval}s`);

      // Execute immediately on start
      setTimeout(async () => {
        try {
          await this.heartbeatEngine.sendHeartbeat(service, check);
        } catch (error) {
          console.error(`Error in initial check for ${service.name}:`, error);
        }
      }, 1000); // Wait 1 second before first check
    }
  }

  /**
   * Create cron expression from interval in seconds
   * @param {number} intervalSeconds - Interval in seconds
   * @returns {string} Cron expression
   */
  createCronExpression(intervalSeconds) {
    // For intervals < 60 seconds, use seconds pattern
    if (intervalSeconds < 60) {
      return `*/${intervalSeconds} * * * * *`;
    }
    
    // For intervals in minutes
    const minutes = Math.floor(intervalSeconds / 60);
    if (minutes < 60) {
      return `0 */${minutes} * * * *`;
    }
    
    // For longer intervals, use minutes
    return `0 */${minutes} * * * *`;
  }

  /**
   * Update interval for a service
   * @param {string} serviceName - Service name
   * @param {number} newInterval - New interval in seconds
   */
  updateInterval(serviceName, newInterval) {
    const service = this.services.find(s => s.name === serviceName);
    if (!service) {
      throw new Error(`Service not found: ${serviceName}`);
    }

    // Update service configuration
    service.heartbeatInterval = newInterval;

    // Reschedule if running
    if (this.isRunning) {
      this.scheduleService(service);
    }

    this.eventBus.emit('config_updated', {
      service: serviceName,
      field: 'heartbeatInterval',
      value: newInterval
    });
  }

  /**
   * Pause monitoring for a service
   * @param {string} serviceName - Service name
   */
  pauseService(serviceName) {
    for (const [key, job] of this.jobs) {
      if (key.startsWith(serviceName + '-')) {
        job.cancel();
        this.jobs.delete(key);
      }
    }
    
    console.log(`Paused monitoring for ${serviceName}`);
  }

  /**
   * Resume monitoring for a service
   * @param {string} serviceName - Service name
   */
  resumeService(serviceName) {
    const service = this.services.find(s => s.name === serviceName);
    if (!service) {
      throw new Error(`Service not found: ${serviceName}`);
    }

    this.scheduleService(service);
    console.log(`Resumed monitoring for ${serviceName}`);
  }

  /**
   * Get status of all scheduled jobs
   * @returns {Array} Job statuses
   */
  getJobStatuses() {
    const statuses = [];
    
    for (const [key, job] of this.jobs) {
      statuses.push({
        key,
        nextInvocation: job.nextInvocation()
      });
    }
    
    return statuses;
  }

  /**
   * Trigger immediate check for a service
   * @param {string} serviceName - Service name
   */
  async triggerCheck(serviceName) {
    const service = this.services.find(s => s.name === serviceName);
    if (!service) {
      throw new Error(`Service not found: ${serviceName}`);
    }

    const results = [];
    for (const check of service.checks) {
      const result = await this.heartbeatEngine.sendHeartbeat(service, check);
      results.push(result);
    }
    
    return results;
  }
}
