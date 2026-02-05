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

    it('should emit alert_triggered event on degradation', () => {
      const alertHandler = jest.fn();
      eventBus.on('alert_triggered', alertHandler);

      const event = {
        service: 'test-service',
        oldStatus: 'healthy',
        newStatus: 'critical',
        timestamp: new Date().toISOString()
      };

      alertManager.handlePulseChange(event);

      expect(alertHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'degraded',
          service: 'test-service'
        })
      );
    });

    it('should not create alert when status improves (non-healthy)', () => {
      const event = {
        service: 'test-service',
        oldStatus: 'critical',
        newStatus: 'warning',
        timestamp: new Date().toISOString()
      };

      alertManager.handlePulseChange(event);

      const history = alertManager.getAlertHistory();
      expect(history.length).toBe(0);
    });

    it('should create recovery alert when status becomes healthy', () => {
      const event = {
        service: 'test-service',
        oldStatus: 'warning',
        newStatus: 'healthy',
        timestamp: new Date().toISOString()
      };

      alertManager.handlePulseChange(event);

      const history = alertManager.getAlertHistory();
      expect(history.length).toBe(1);
      expect(history[0].type).toBe('recovery');
      expect(history[0].severity).toBe('info');
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

  describe('isStatusDegraded()', () => {
    it('should return true when status worsens', () => {
      expect(alertManager.isStatusDegraded('healthy', 'warning')).toBe(true);
      expect(alertManager.isStatusDegraded('healthy', 'critical')).toBe(true);
      expect(alertManager.isStatusDegraded('warning', 'critical')).toBe(true);
    });

    it('should return false when status improves', () => {
      expect(alertManager.isStatusDegraded('warning', 'healthy')).toBe(false);
      expect(alertManager.isStatusDegraded('critical', 'warning')).toBe(false);
      expect(alertManager.isStatusDegraded('critical', 'healthy')).toBe(false);
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

    it('should map warning to medium', () => {
      expect(alertManager.getSeverityForStatus('warning')).toBe('medium');
    });

    it('should map critical to high', () => {
      expect(alertManager.getSeverityForStatus('critical')).toBe('high');
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

  describe('clearHistory()', () => {
    it('should clear all alerts', () => {
      alertManager.logAlert({ type: 'test', message: 'test' });
      alertManager.logAlert({ type: 'test', message: 'test' });

      alertManager.clearHistory();

      expect(alertManager.getAlertHistory().length).toBe(0);
    });
  });

  describe('triggerAlert()', () => {
    it('should emit alert_triggered event', () => {
      const alertHandler = jest.fn();
      eventBus.on('alert_triggered', alertHandler);

      const alert = {
        type: 'test',
        service: 'test-service',
        message: 'Test alert',
        timestamp: new Date().toISOString()
      };

      alertManager.triggerAlert(alert);

      expect(alertHandler).toHaveBeenCalledWith(alert);
    });
  });
});
