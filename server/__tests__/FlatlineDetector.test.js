import { jest } from '@jest/globals';
import { FlatlineDetector } from '../core/FlatlineDetector.js';
import { EventBus } from '../core/EventBus.js';

describe('FlatlineDetector', () => {
  let eventBus;
  let detector;
  let thresholds;

  beforeEach(() => {
    eventBus = new EventBus();
    thresholds = {
      default: {
        flatline: {
          consecutiveFailures: 3
        }
      }
    };
    detector = new FlatlineDetector(eventBus, thresholds);
  });

  describe('handleFailure()', () => {
    it('should track consecutive failures', () => {
      const event = {
        service: 'test-service',
        timestamp: new Date().toISOString(),
        httpStatus: 500
      };

      detector.handleFailure(event);
      const state = detector.getServiceState('test-service');

      expect(state.consecutiveFailures).toBe(1);
      expect(state.failureCount).toBe(1);
    });

    it('should trigger flatline after reaching threshold', () => {
      const flatlineHandler = jest.fn();
      eventBus.on('flatline_detected', flatlineHandler);

      const event = {
        service: 'test-service',
        timestamp: new Date().toISOString(),
        httpStatus: 500
      };

      // Fire enough failures to trigger flatline
      for (let i = 0; i < 3; i++) {
        detector.handleFailure(event);
      }

      expect(flatlineHandler).toHaveBeenCalledTimes(1);
      expect(flatlineHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'test-service',
          consecutiveFailures: 3
        })
      );
    });

    it('should only emit flatline once while flatlined', () => {
      const flatlineHandler = jest.fn();
      eventBus.on('flatline_detected', flatlineHandler);

      const event = {
        service: 'test-service',
        timestamp: new Date().toISOString(),
        httpStatus: 500
      };

      // Fire more failures than threshold
      for (let i = 0; i < 5; i++) {
        detector.handleFailure(event);
      }

      expect(flatlineHandler).toHaveBeenCalledTimes(1);
    });

    it('should emit pulse_changed when transitioning to flatline', () => {
      const pulseChangedHandler = jest.fn();
      eventBus.on('pulse_changed', pulseChangedHandler);

      // Set initial state to simulate previous status
      const state = detector.getServiceState('test-service');
      state.lastPulseStatus = 'healthy';

      const event = {
        service: 'test-service',
        timestamp: new Date().toISOString(),
        httpStatus: 500
      };

      detector.handleFailure(event);

      expect(pulseChangedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'test-service',
          oldStatus: 'healthy',
          newStatus: 'flatline'
        })
      );
    });
  });

  describe('handleSuccess()', () => {
    it('should reset failure count on success', () => {
      const failEvent = {
        service: 'test-service',
        timestamp: new Date().toISOString(),
        httpStatus: 500
      };

      detector.handleFailure(failEvent);
      detector.handleFailure(failEvent);

      const successEvent = {
        service: 'test-service',
        timestamp: new Date().toISOString(),
        httpStatus: 200,
        pulse: { status: 'healthy' }
      };

      detector.handleSuccess(successEvent);

      const state = detector.getServiceState('test-service');
      expect(state.consecutiveFailures).toBe(0);
      expect(state.successCount).toBe(1);
    });

    it('should emit recovery event after flatline', () => {
      const recoveryHandler = jest.fn();
      eventBus.on('service_recovered', recoveryHandler);

      const failEvent = {
        service: 'test-service',
        timestamp: new Date().toISOString(),
        httpStatus: 500
      };

      // Trigger flatline
      for (let i = 0; i < 3; i++) {
        detector.handleFailure(failEvent);
      }

      // Recover
      const successEvent = {
        service: 'test-service',
        timestamp: new Date().toISOString(),
        httpStatus: 200,
        pulse: { status: 'healthy' }
      };

      detector.handleSuccess(successEvent);

      expect(recoveryHandler).toHaveBeenCalledTimes(1);
      expect(recoveryHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'test-service',
          failureCount: 3
        })
      );
    });

    it('should emit pulse_changed when status changes', () => {
      const pulseChangedHandler = jest.fn();
      eventBus.on('pulse_changed', pulseChangedHandler);

      // Set initial state
      const state = detector.getServiceState('test-service');
      state.lastPulseStatus = 'warning';

      const successEvent = {
        service: 'test-service',
        timestamp: new Date().toISOString(),
        httpStatus: 200,
        pulse: { status: 'healthy' }
      };

      detector.handleSuccess(successEvent);

      expect(pulseChangedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'test-service',
          oldStatus: 'warning',
          newStatus: 'healthy'
        })
      );
    });

    it('should clear flatline state on recovery', () => {
      const failEvent = {
        service: 'test-service',
        timestamp: new Date().toISOString(),
        httpStatus: 500
      };

      // Trigger flatline
      for (let i = 0; i < 3; i++) {
        detector.handleFailure(failEvent);
      }

      const successEvent = {
        service: 'test-service',
        timestamp: new Date().toISOString(),
        httpStatus: 200,
        pulse: { status: 'healthy' }
      };

      detector.handleSuccess(successEvent);

      const state = detector.getServiceState('test-service');
      expect(state.isFlatlined).toBe(false);
      expect(state.flatlineStartTime).toBe(null);
    });
  });

  describe('getUptime()', () => {
    it('should return 100% for new services with no checks', () => {
      const uptime = detector.getUptime('new-service');
      expect(uptime).toBe(100);
    });

    it('should calculate correct uptime percentage', () => {
      const state = detector.getServiceState('test-service');
      state.successCount = 7;
      state.failureCount = 3;

      const uptime = detector.getUptime('test-service');
      expect(uptime).toBe(70);
    });

    it('should return 0% when all checks failed', () => {
      const state = detector.getServiceState('test-service');
      state.successCount = 0;
      state.failureCount = 10;

      const uptime = detector.getUptime('test-service');
      expect(uptime).toBe(0);
    });
  });

  describe('calculateSeverity()', () => {
    it('should return warning for less than 5 failures', () => {
      expect(detector.calculateSeverity(3)).toBe('warning');
      expect(detector.calculateSeverity(4)).toBe('warning');
    });

    it('should return critical for 5-9 failures', () => {
      expect(detector.calculateSeverity(5)).toBe('critical');
      expect(detector.calculateSeverity(9)).toBe('critical');
    });

    it('should return catastrophic for 10+ failures', () => {
      expect(detector.calculateSeverity(10)).toBe('catastrophic');
      expect(detector.calculateSeverity(15)).toBe('catastrophic');
    });
  });
});
