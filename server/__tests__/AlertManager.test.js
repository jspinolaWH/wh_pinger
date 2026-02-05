import { jest } from '@jest/globals';
import { AlertManager } from '../services/AlertManager.js';
import { EventBus } from '../core/EventBus.js';

describe('AlertManager', () => {
  let eventBus;
  let alertManager;
  let config;

  beforeEach(() => {
    eventBus = new EventBus();
    config = {
      alerts: {
        audio: false
      }
    };
    alertManager = new AlertManager(eventBus, config);

    // Suppress console.log during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('handleFlatline()', () => {
    it('should create and log alert', () => {
      const event = {
        service: 'test-service',
        consecutiveFailures: 3,
        severity: 'warning',
        timestamp: new Date().toISOString()
      };

      alertManager.handleFlatline(event);

      const history = alertManager.getAlertHistory();
      expect(history.length).toBe(1);
      expect(history[0]).toMatchObject({
        type: 'flatline',
        service: 'test-service',
        severity: 'warning'
      });
    });

    it('should emit alert_triggered event', () => {
      const alertHandler = jest.fn();
      eventBus.on('alert_triggered', alertHandler);

      const event = {
        service: 'test-service',
        consecutiveFailures: 3,
        severity: 'warning',
        timestamp: new Date().toISOString()
      };

      alertManager.handleFlatline(event);

      expect(alertHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'flatline',
          service: 'test-service'
        })
      );
    });

    it('should skip muted services', () => {
      alertManager.muteService('test-service');

      const event = {
        service: 'test-service',
        consecutiveFailures: 3,
        severity: 'warning',
        timestamp: new Date().toISOString()
      };

      alertManager.handleFlatline(event);

      const history = alertManager.getAlertHistory();
      expect(history.length).toBe(0);
    });

    it('should include consecutive failures in message', () => {
      const event = {
        service: 'test-service',
        consecutiveFailures: 5,
        severity: 'critical',
        timestamp: new Date().toISOString()
      };

      alertManager.handleFlatline(event);

      const history = alertManager.getAlertHistory();
      expect(history[0].message).toContain('5 consecutive failures');
    });
  });

  describe('isStatusDegraded()', () => {
    it('should return true when status worsens', () => {
      expect(alertManager.isStatusDegraded('healthy', 'warning')).toBe(true);
      expect(alertManager.isStatusDegraded('healthy', 'critical')).toBe(true);
      expect(alertManager.isStatusDegraded('warning', 'degraded')).toBe(true);
      expect(alertManager.isStatusDegraded('degraded', 'flatline')).toBe(true);
    });

    it('should return false when status improves', () => {
      expect(alertManager.isStatusDegraded('warning', 'healthy')).toBe(false);
      expect(alertManager.isStatusDegraded('critical', 'warning')).toBe(false);
      expect(alertManager.isStatusDegraded('flatline', 'healthy')).toBe(false);
    });

    it('should return false when status stays the same', () => {
      expect(alertManager.isStatusDegraded('healthy', 'healthy')).toBe(false);
      expect(alertManager.isStatusDegraded('warning', 'warning')).toBe(false);
    });
  });

  describe('getSeverityForStatus()', () => {
    it('should map healthy to info', () => {
      expect(alertManager.getSeverityForStatus('healthy')).toBe('info');
    });

    it('should map warning to low', () => {
      expect(alertManager.getSeverityForStatus('warning')).toBe('low');
    });

    it('should map degraded to medium', () => {
      expect(alertManager.getSeverityForStatus('degraded')).toBe('medium');
    });

    it('should map critical to high', () => {
      expect(alertManager.getSeverityForStatus('critical')).toBe('high');
    });

    it('should map flatline to critical', () => {
      expect(alertManager.getSeverityForStatus('flatline')).toBe('critical');
    });

    it('should return info for unknown status', () => {
      expect(alertManager.getSeverityForStatus('unknown')).toBe('info');
    });
  });

  describe('muteService() / unmuteService()', () => {
    it('should mute a service', () => {
      alertManager.muteService('test-service');

      expect(alertManager.isMuted('test-service')).toBe(true);
    });

    it('should unmute a service', () => {
      alertManager.muteService('test-service');
      alertManager.unmuteService('test-service');

      expect(alertManager.isMuted('test-service')).toBe(false);
    });

    it('should handle unmuting non-muted service', () => {
      expect(() => alertManager.unmuteService('test-service')).not.toThrow();
      expect(alertManager.isMuted('test-service')).toBe(false);
    });
  });

  describe('getAlertHistory()', () => {
    it('should return empty array when no alerts', () => {
      const history = alertManager.getAlertHistory();
      expect(history).toEqual([]);
    });

    it('should return limited history', () => {
      // Add multiple alerts
      for (let i = 0; i < 10; i++) {
        alertManager.logAlert({
          type: 'test',
          message: `Alert ${i}`,
          timestamp: new Date().toISOString()
        });
      }

      const history = alertManager.getAlertHistory(5);
      expect(history.length).toBe(5);
      expect(history[4].message).toBe('Alert 9');
    });

    it('should limit stored history to 100 alerts', () => {
      for (let i = 0; i < 120; i++) {
        alertManager.logAlert({
          type: 'test',
          message: `Alert ${i}`,
          timestamp: new Date().toISOString()
        });
      }

      const history = alertManager.getAlertHistory(200);
      expect(history.length).toBe(100);
    });
  });

  describe('handlePulseChange()', () => {
    it('should create alert when status degrades', () => {
      const event = {
        service: 'test-service',
        oldStatus: 'healthy',
        newStatus: 'warning',
        timestamp: new Date().toISOString()
      };

      alertManager.handlePulseChange(event);

      const history = alertManager.getAlertHistory();
      expect(history.length).toBe(1);
      expect(history[0].type).toBe('degraded');
    });

    it('should not create alert when status improves', () => {
      const event = {
        service: 'test-service',
        oldStatus: 'warning',
        newStatus: 'healthy',
        timestamp: new Date().toISOString()
      };

      alertManager.handlePulseChange(event);

      const history = alertManager.getAlertHistory();
      expect(history.length).toBe(0);
    });

    it('should skip muted services', () => {
      alertManager.muteService('test-service');

      const event = {
        service: 'test-service',
        oldStatus: 'healthy',
        newStatus: 'critical',
        timestamp: new Date().toISOString()
      };

      alertManager.handlePulseChange(event);

      const history = alertManager.getAlertHistory();
      expect(history.length).toBe(0);
    });
  });

  describe('handleRecovery()', () => {
    it('should create recovery alert', () => {
      const event = {
        service: 'test-service',
        downtime: 300000, // 5 minutes
        timestamp: new Date().toISOString()
      };

      alertManager.handleRecovery(event);

      const history = alertManager.getAlertHistory();
      expect(history.length).toBe(1);
      expect(history[0].type).toBe('recovery');
      expect(history[0].severity).toBe('info');
    });

    it('should include downtime in message', () => {
      const event = {
        service: 'test-service',
        downtime: 600000, // 10 minutes
        timestamp: new Date().toISOString()
      };

      alertManager.handleRecovery(event);

      const history = alertManager.getAlertHistory();
      expect(history[0].message).toContain('10 minutes');
    });
  });

  describe('clearHistory()', () => {
    it('should clear all alerts', () => {
      alertManager.logAlert({ type: 'test', message: 'test' });
      alertManager.logAlert({ type: 'test', message: 'test' });

      alertManager.clearHistory();

      expect(alertManager.getAlertHistory().length).toBe(0);
    });
  });
});
