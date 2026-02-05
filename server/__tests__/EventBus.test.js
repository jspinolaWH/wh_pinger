import { jest } from '@jest/globals';
import { EventBus } from '../core/EventBus.js';

describe('EventBus', () => {
  let eventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  describe('on()', () => {
    it('should register a listener for an event', () => {
      const callback = jest.fn();
      eventBus.on('test', callback);

      expect(eventBus.listenerCount('test')).toBe(1);
    });

    it('should allow multiple listeners for the same event', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      eventBus.on('test', callback1);
      eventBus.on('test', callback2);

      expect(eventBus.listenerCount('test')).toBe(2);
    });
  });

  describe('off()', () => {
    it('should remove a specific listener', () => {
      const callback = jest.fn();
      eventBus.on('test', callback);
      eventBus.off('test', callback);

      expect(eventBus.listenerCount('test')).toBe(0);
    });

    it('should not affect other listeners when removing one', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      eventBus.on('test', callback1);
      eventBus.on('test', callback2);
      eventBus.off('test', callback1);

      expect(eventBus.listenerCount('test')).toBe(1);
    });

    it('should do nothing if event does not exist', () => {
      const callback = jest.fn();
      expect(() => eventBus.off('nonexistent', callback)).not.toThrow();
    });
  });

  describe('once()', () => {
    it('should fire callback only once', () => {
      const callback = jest.fn();
      eventBus.once('test', callback);

      eventBus.emit('test', { data: 1 });
      eventBus.emit('test', { data: 2 });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({ data: 1 });
    });

    it('should remove itself after firing', () => {
      const callback = jest.fn();
      eventBus.once('test', callback);

      eventBus.emit('test', {});

      expect(eventBus.listenerCount('test')).toBe(0);
    });
  });

  describe('emit()', () => {
    it('should call all registered listeners with data', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      eventBus.on('test', callback1);
      eventBus.on('test', callback2);
      eventBus.emit('test', { value: 42 });

      expect(callback1).toHaveBeenCalledWith({ value: 42 });
      expect(callback2).toHaveBeenCalledWith({ value: 42 });
    });

    it('should store event in history', () => {
      eventBus.emit('test', { data: 'test' });

      const history = eventBus.getHistory();
      expect(history.length).toBe(1);
      expect(history[0].event).toBe('test');
      expect(history[0].data).toEqual({ data: 'test' });
      expect(history[0].timestamp).toBeDefined();
    });

    it('should limit history to maxHistorySize', () => {
      eventBus.maxHistorySize = 5;

      for (let i = 0; i < 10; i++) {
        eventBus.emit('test', { index: i });
      }

      const history = eventBus.getHistory();
      expect(history.length).toBe(5);
      expect(history[0].data.index).toBe(5);
    });

    it('should continue execution even if a listener throws', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Test error');
      });
      const successCallback = jest.fn();

      eventBus.on('test', errorCallback);
      eventBus.on('test', successCallback);

      expect(() => eventBus.emit('test', {})).not.toThrow();
      expect(successCallback).toHaveBeenCalled();
    });
  });

  describe('getHistory()', () => {
    it('should return all events when no filter is provided', () => {
      eventBus.emit('event1', {});
      eventBus.emit('event2', {});
      eventBus.emit('event1', {});

      const history = eventBus.getHistory();
      expect(history.length).toBe(3);
    });

    it('should filter by event name', () => {
      eventBus.emit('event1', {});
      eventBus.emit('event2', {});
      eventBus.emit('event1', {});

      const history = eventBus.getHistory('event1');
      expect(history.length).toBe(2);
      expect(history.every(e => e.event === 'event1')).toBe(true);
    });

    it('should limit results', () => {
      for (let i = 0; i < 10; i++) {
        eventBus.emit('test', { index: i });
      }

      const history = eventBus.getHistory(null, 3);
      expect(history.length).toBe(3);
      expect(history[0].data.index).toBe(7);
    });
  });

  describe('listenerCount()', () => {
    it('should return 0 for events with no listeners', () => {
      expect(eventBus.listenerCount('nonexistent')).toBe(0);
    });

    it('should return correct count for registered listeners', () => {
      eventBus.on('test', () => {});
      eventBus.on('test', () => {});
      eventBus.on('other', () => {});

      expect(eventBus.listenerCount('test')).toBe(2);
      expect(eventBus.listenerCount('other')).toBe(1);
    });
  });

  describe('clear()', () => {
    it('should remove all listeners', () => {
      eventBus.on('event1', () => {});
      eventBus.on('event2', () => {});
      eventBus.clear();

      expect(eventBus.listenerCount('event1')).toBe(0);
      expect(eventBus.listenerCount('event2')).toBe(0);
      expect(eventBus.getEvents().length).toBe(0);
    });
  });
});
