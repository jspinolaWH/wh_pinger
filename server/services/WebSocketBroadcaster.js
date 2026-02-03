/**
 * WebSocketBroadcaster - Broadcasts events to WebSocket clients
 * Manages WebSocket connections and real-time updates
 */
export class WebSocketBroadcaster {
  constructor(eventBus, wsServer) {
    this.eventBus = eventBus;
    this.wsServer = wsServer;
    this.clients = new Set();

    // Subscribe to all events that should update UI
    eventBus.on('heartbeat_received', this.broadcastHeartbeat.bind(this));
    eventBus.on('heartbeat_failed', this.broadcastHeartbeat.bind(this));
    eventBus.on('flatline_detected', this.broadcastFlatline.bind(this));
    eventBus.on('pulse_changed', this.broadcastPulseChange.bind(this));
    eventBus.on('service_recovered', this.broadcastRecovery.bind(this));
    eventBus.on('alert_triggered', this.broadcastAlert.bind(this));

    // Set up WebSocket server event handlers
    this.setupWebSocketServer();
  }

  /**
   * Set up WebSocket server
   */
  setupWebSocketServer() {
    this.wsServer.on('connection', (ws) => {
      console.log('WebSocket client connected');
      this.clients.add(ws);

      // Handle client messages (optional)
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleClientMessage(ws, data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        console.log('WebSocket client disconnected');
        this.clients.delete(ws);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });

      // Send initial connection success message
      this.sendToClient(ws, {
        type: 'connected',
        message: 'Connected to WasteHero Heartbeat Monitor',
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Handle message from client
   * @param {WebSocket} ws - WebSocket client
   * @param {Object} data - Message data
   */
  handleClientMessage(ws, data) {
    switch (data.type) {
      case 'subscribe':
        // Client wants to subscribe to specific services
        // Could be implemented for filtering
        break;
      case 'ping':
        this.sendToClient(ws, { type: 'pong', timestamp: new Date().toISOString() });
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  }

  /**
   * Broadcast heartbeat update
   * @param {Object} event - Heartbeat event
   */
  broadcastHeartbeat(event) {
    this.broadcast({
      type: 'heartbeat_update',
      timestamp: new Date().toISOString(),
      data: event
    });
  }

  /**
   * Broadcast flatline alert
   * @param {Object} event - Flatline event
   */
  broadcastFlatline(event) {
    this.broadcast({
      type: 'flatline',
      timestamp: new Date().toISOString(),
      urgent: true,
      data: event
    });
  }

  /**
   * Broadcast pulse change
   * @param {Object} event - Pulse change event
   */
  broadcastPulseChange(event) {
    this.broadcast({
      type: 'pulse_changed',
      timestamp: new Date().toISOString(),
      data: event
    });
  }

  /**
   * Broadcast service recovery
   * @param {Object} event - Recovery event
   */
  broadcastRecovery(event) {
    this.broadcast({
      type: 'service_recovered',
      timestamp: new Date().toISOString(),
      data: event
    });
  }

  /**
   * Broadcast alert
   * @param {Object} event - Alert event
   */
  broadcastAlert(event) {
    this.broadcast({
      type: 'alert',
      timestamp: new Date().toISOString(),
      urgent: event.severity === 'critical' || event.severity === 'high',
      data: event
    });
  }

  /**
   * Broadcast message to all connected clients
   * @param {Object} message - Message to broadcast
   */
  broadcast(message) {
    const payload = JSON.stringify(message);
    
    this.clients.forEach((client) => {
      if (client.readyState === 1) { // OPEN state
        try {
          client.send(payload);
        } catch (error) {
          console.error('Error sending to client:', error);
          this.clients.delete(client);
        }
      }
    });
  }

  /**
   * Send message to specific client
   * @param {WebSocket} client - WebSocket client
   * @param {Object} message - Message to send
   */
  sendToClient(client, message) {
    if (client.readyState === 1) { // OPEN state
      try {
        client.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending to client:', error);
      }
    }
  }

  /**
   * Get number of connected clients
   * @returns {number} Client count
   */
  getClientCount() {
    return this.clients.size;
  }

  /**
   * Close all client connections
   */
  closeAll() {
    this.clients.forEach((client) => {
      try {
        client.close();
      } catch (error) {
        console.error('Error closing client:', error);
      }
    });
    this.clients.clear();
  }
}
