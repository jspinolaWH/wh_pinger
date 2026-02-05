import { jest } from '@jest/globals';
import { HeartbeatEngine } from '../core/HeartbeatEngine.js';
import { EventBus } from '../core/EventBus.js';

describe('HeartbeatEngine', () => {
  let eventBus;
  let engine;
  let thresholds;
  let mockStrategies;

  beforeEach(() => {
    eventBus = new EventBus();
    thresholds = {
      default: {
        healthy: { max: 200 },
        warning: { max: 500 },
        degraded: { max: 1000 }
      },
      tiers: {
        critical: { healthy: { max: 100 } }
      }
    };
    mockStrategies = {
      basic: {
        execute: jest.fn()
      }
    };
    engine = new HeartbeatEngine(eventBus, mockStrategies, thresholds);
  });

  describe('evaluatePulse()', () => {
    it('should return healthy for response <= 200ms', () => {
      const response = { success: true, hasResponse: true };

      const pulse = engine.evaluatePulse(100, response);

      expect(pulse.status).toBe('healthy');
      expect(pulse.responseTime).toBe(100);
    });

    it('should return warning for response 200-500ms', () => {
      const response = { success: true, hasResponse: true };

      const pulse = engine.evaluatePulse(300, response);

      expect(pulse.status).toBe('warning');
    });

    it('should return degraded for response 500-1000ms', () => {
      const response = { success: true, hasResponse: true };

      const pulse = engine.evaluatePulse(750, response);

      expect(pulse.status).toBe('degraded');
    });

    it('should return critical for response > 1000ms', () => {
      const response = { success: true, hasResponse: true };

      const pulse = engine.evaluatePulse(1500, response);

      expect(pulse.status).toBe('critical');
    });

    it('should return flatline for timeout/no response', () => {
      const response = { success: false, hasResponse: false };

      const pulse = engine.evaluatePulse(5000, response);

      expect(pulse.status).toBe('flatline');
    });

    it('should return critical for HTTP errors with response', () => {
      const response = { success: false, hasResponse: true, status: 503 };

      const pulse = engine.evaluatePulse(100, response);

      expect(pulse.status).toBe('critical');
    });
  });

  describe('getStrategy()', () => {
    it('should return the correct strategy', () => {
      const strategy = engine.getStrategy('basic');

      expect(strategy).toBe(mockStrategies.basic);
    });

    it('should return undefined for unknown strategy', () => {
      const strategy = engine.getStrategy('unknown');

      expect(strategy).toBeUndefined();
    });
  });

  describe('sendHeartbeat()', () => {
    const service = { name: 'test-service' };
    const check = { name: 'health-check', strategy: 'basic' };

    it('should emit heartbeat_sent event', async () => {
      const sentHandler = jest.fn();
      eventBus.on('heartbeat_sent', sentHandler);

      mockStrategies.basic.execute.mockResolvedValue({
        success: true,
        hasResponse: true,
        status: 200
      });

      await engine.sendHeartbeat(service, check);

      expect(sentHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'test-service',
          check: 'health-check'
        })
      );
    });

    it('should emit heartbeat_received on success', async () => {
      const receivedHandler = jest.fn();
      eventBus.on('heartbeat_received', receivedHandler);

      mockStrategies.basic.execute.mockResolvedValue({
        success: true,
        hasResponse: true,
        status: 200
      });

      await engine.sendHeartbeat(service, check);

      expect(receivedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'test-service',
          success: true
        })
      );
    });

    it('should emit heartbeat_received for HTTP errors with response', async () => {
      const receivedHandler = jest.fn();
      const failedHandler = jest.fn();
      eventBus.on('heartbeat_received', receivedHandler);
      eventBus.on('heartbeat_failed', failedHandler);

      mockStrategies.basic.execute.mockResolvedValue({
        success: false,
        hasResponse: true,
        status: 503
      });

      await engine.sendHeartbeat(service, check);

      expect(receivedHandler).toHaveBeenCalled();
      expect(failedHandler).not.toHaveBeenCalled();
    });

    it('should emit heartbeat_failed for network errors', async () => {
      const failedHandler = jest.fn();
      eventBus.on('heartbeat_failed', failedHandler);

      mockStrategies.basic.execute.mockResolvedValue({
        success: false,
        hasResponse: false,
        error: 'TIMEOUT'
      });

      await engine.sendHeartbeat(service, check);

      expect(failedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'test-service',
          success: false
        })
      );
    });

    it('should emit heartbeat_failed on exception', async () => {
      const failedHandler = jest.fn();
      eventBus.on('heartbeat_failed', failedHandler);

      mockStrategies.basic.execute.mockRejectedValue(new Error('Network error'));

      const result = await engine.sendHeartbeat(service, check);

      expect(failedHandler).toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.pulse.status).toBe('flatline');
    });

    it('should throw error for unknown strategy', async () => {
      const failedHandler = jest.fn();
      eventBus.on('heartbeat_failed', failedHandler);

      const result = await engine.sendHeartbeat(service, {
        name: 'test',
        strategy: 'unknown'
      });

      expect(failedHandler).toHaveBeenCalled();
      expect(result.error).toContain('Unknown strategy');
    });

    it('should return result with correct structure', async () => {
      mockStrategies.basic.execute.mockResolvedValue({
        success: true,
        hasResponse: true,
        status: 200
      });

      const result = await engine.sendHeartbeat(service, check);

      expect(result).toMatchObject({
        service: 'test-service',
        check: 'health-check',
        success: true,
        httpStatus: 200
      });
      expect(result.timestamp).toBeDefined();
      expect(result.responseTime).toBeDefined();
      expect(result.pulse).toBeDefined();
    });
  });

  describe('getThresholdsForTier()', () => {
    it('should return default thresholds for unknown tier', () => {
      const result = engine.getThresholdsForTier('unknown');

      expect(result.healthy.max).toBe(200);
    });

    it('should merge tier overrides with defaults', () => {
      const result = engine.getThresholdsForTier('critical');

      expect(result.healthy.max).toBe(100);
      expect(result.warning.max).toBe(500);
    });
  });
});
