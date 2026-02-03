import express from 'express';
import { WebSocketServer } from 'ws';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Core components
import { EventBus } from './core/EventBus.js';
import { HeartbeatEngine } from './core/HeartbeatEngine.js';
import { FlatlineDetector } from './core/FlatlineDetector.js';

// Strategies
import { BasicGraphQLStrategy } from './strategies/BasicGraphQLStrategy.js';
import { AuthenticatedGraphQLStrategy } from './strategies/AuthenticatedGraphQLStrategy.js';
import { QueryGraphQLStrategy } from './strategies/QueryGraphQLStrategy.js';

// Services
import { DataLogger } from './services/DataLogger.js';
import { AlertManager } from './services/AlertManager.js';
import { WebSocketBroadcaster } from './services/WebSocketBroadcaster.js';

// Scheduler
import { HeartbeatScheduler } from './scheduler/HeartbeatScheduler.js';

// Utils
import { ConfigLoader } from './utils/ConfigLoader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * WasteHero Heartbeat Monitor Server
 * Main application entry point
 */
class HeartbeatMonitorServer {
  constructor() {
    this.app = express();
    this.eventBus = null;
    this.scheduler = null;
    this.config = null;
  }

  /**
   * Initialize the server
   */
  async init() {
    try {
      console.log('🚀 Starting WasteHero Heartbeat Monitor...\n');

      // Load configurations
      console.log('📝 Loading configurations...');
      const configs = await ConfigLoader.loadAllConfigs(path.join(__dirname, '../config'));
      this.config = configs;
      console.log(`   ✓ Loaded ${configs.services.length} services`);
      console.log(`   ✓ Loaded thresholds and config\n`);

      // Initialize event bus
      console.log('🔌 Initializing event bus...');
      this.eventBus = new EventBus();
      console.log('   ✓ Event bus ready\n');

      // Initialize strategies
      console.log('⚙️  Initializing health check strategies...');
      const strategies = {
        basic: new BasicGraphQLStrategy(),
        authenticated: new AuthenticatedGraphQLStrategy(),
        query: new QueryGraphQLStrategy()
      };
      console.log('   ✓ Strategies registered\n');

      // Initialize heartbeat engine
      console.log('💓 Initializing heartbeat engine...');
      const heartbeatEngine = new HeartbeatEngine(
        this.eventBus,
        strategies,
        configs.thresholds
      );
      console.log('   ✓ Heartbeat engine ready\n');

      // Initialize flatline detector
      console.log('📡 Initializing flatline detector...');
      const flatlineDetector = new FlatlineDetector(
        this.eventBus,
        configs.thresholds
      );
      this.flatlineDetector = flatlineDetector;
      console.log('   ✓ Flatline detector active\n');

      // Initialize data logger
      console.log('📊 Initializing data logger...');
      const dataLogger = new DataLogger(
        this.eventBus,
        configs.config
      );
      this.dataLogger = dataLogger;
      console.log('   ✓ Data logger ready\n');

      // Initialize alert manager
      console.log('🔔 Initializing alert manager...');
      const alertManager = new AlertManager(
        this.eventBus,
        configs.config
      );
      this.alertManager = alertManager;
      console.log('   ✓ Alert manager ready\n');

      // Set up Express middleware
      this.app.use(express.json());
      this.app.use(express.urlencoded({ extended: true }));

      // CORS middleware
      this.app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        next();
      });

      // Set up REST API routes
      this.setupRoutes(flatlineDetector, dataLogger, alertManager);

      // Start Express server
      const port = configs.config.server.port;
      this.server = this.app.listen(port, () => {
        console.log(`🌐 HTTP server listening on port ${port}`);
      });

      // Start WebSocket server
      const wsPort = configs.config.server.websocketPort;
      this.wsServer = new WebSocketServer({ port: wsPort });
      console.log(`🔌 WebSocket server listening on port ${wsPort}\n`);

      // Initialize WebSocket broadcaster
      const wsBroadcaster = new WebSocketBroadcaster(
        this.eventBus,
        this.wsServer
      );
      this.wsBroadcaster = wsBroadcaster;

      // Initialize scheduler
      console.log('⏰ Initializing heartbeat scheduler...');
      this.scheduler = new HeartbeatScheduler(
        this.eventBus,
        heartbeatEngine,
        configs.services
      );
      console.log('   ✓ Scheduler ready\n');

      // Start monitoring
      console.log('🏁 Starting heartbeat monitoring...\n');
      this.scheduler.start();

      console.log('═══════════════════════════════════════════════');
      console.log('✨ WasteHero Heartbeat Monitor is running!');
      console.log('═══════════════════════════════════════════════');
      console.log(`📊 Monitoring ${configs.services.length} services`);
      console.log(`🌐 API available at: http://localhost:${port}`);
      console.log(`🔌 WebSocket available at: ws://localhost:${wsPort}`);
      console.log('═══════════════════════════════════════════════\n');

    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Set up REST API routes
   */
  setupRoutes(flatlineDetector, dataLogger, alertManager) {
    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      });
    });

    // Get all services status
    this.app.get('/api/services', (req, res) => {
      const services = this.config.services.map(service => {
        const state = flatlineDetector.getServiceState(service.name);
        return {
          name: service.name,
          url: service.url,
          tier: service.tier,
          heartbeatInterval: service.heartbeatInterval,
          status: state.lastPulseStatus || 'unknown',
          lastCheck: state.lastCheck,
          lastSuccess: state.lastSuccess,
          consecutiveFailures: state.consecutiveFailures,
          isFlatlined: state.isFlatlined,
          uptime: flatlineDetector.getUptime(service.name),
          httpStatus: state.lastHttpStatus
        };
      });

      res.json({ services });
    });

    // Get specific service details
    this.app.get('/api/services/:name', async (req, res) => {
      const serviceName = req.params.name;
      const service = this.config.services.find(s => s.name === serviceName);

      if (!service) {
        return res.status(404).json({ error: 'Service not found' });
      }

      const state = flatlineDetector.getServiceState(serviceName);
      const summary = await dataLogger.getSummary(serviceName);

      res.json({
        name: service.name,
        url: service.url,
        tier: service.tier,
        currentStatus: state.lastPulseStatus || 'unknown',
        lastCheck: state.lastCheck,
        lastSuccess: state.lastSuccess,
        consecutiveFailures: state.consecutiveFailures,
        isFlatlined: state.isFlatlined,
        checks: service.checks,
        stats: summary
      });
    });

    // Get historical data
    this.app.get('/api/history/:name', async (req, res) => {
      const serviceName = req.params.name;
      const hours = parseInt(req.query.hours) || 24;

      try {
        const history = await dataLogger.getHistory(serviceName, hours);
        res.json({
          service: serviceName,
          hours,
          entries: history
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get configuration
    this.app.get('/api/config', (req, res) => {
      res.json({
        services: this.config.services,
        thresholds: this.config.thresholds,
        config: this.config.config
      });
    });

    // Mute alerts for service
    this.app.post('/api/alerts/mute/:name', (req, res) => {
      const serviceName = req.params.name;
      alertManager.muteService(serviceName);
      res.json({
        success: true,
        service: serviceName,
        muted: true
      });
    });

    // Unmute alerts for service
    this.app.post('/api/alerts/unmute/:name', (req, res) => {
      const serviceName = req.params.name;
      alertManager.unmuteService(serviceName);
      res.json({
        success: true,
        service: serviceName,
        muted: false
      });
    });

    // Get alert history
    this.app.get('/api/alerts', (req, res) => {
      const limit = parseInt(req.query.limit) || 50;
      const alerts = alertManager.getAlertHistory(limit);
      res.json({ alerts });
    });

    // Trigger manual check
    this.app.post('/api/services/:name/check', async (req, res) => {
      const serviceName = req.params.name;
      try {
        const results = await this.scheduler.triggerCheck(serviceName);
        res.json({ success: true, results });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get scheduler status
    this.app.get('/api/scheduler', (req, res) => {
      const jobs = this.scheduler.getJobStatuses();
      res.json({
        running: this.scheduler.isRunning,
        jobs
      });
    });

    // Configuration API Endpoints
    
    // Get services configuration
    this.app.get('/api/config/services', (req, res) => {
      res.json({ services: this.config.services });
    });

    // Update services configuration
    this.app.post('/api/config/services', async (req, res) => {
      try {
        const { services } = req.body;
        
        // Validate services
        if (!Array.isArray(services)) {
          return res.status(400).json({ error: 'Services must be an array' });
        }

        // Write to services.json
        const fs = await import('fs/promises');
        const path = await import('path');
        const __dirname = path.dirname(new URL(import.meta.url).pathname);
        const configPath = path.join(__dirname, '../config/services.json');
        
        await fs.writeFile(
          configPath,
          JSON.stringify({ services }, null, 2),
          'utf8'
        );

        res.json({ success: true, message: 'Services configuration updated. Restart required.' });
      } catch (error) {
        console.error('Error updating services config:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Get thresholds configuration
    this.app.get('/api/config/thresholds', (req, res) => {
      res.json(this.config.thresholds);
    });

    // Update thresholds configuration
    this.app.post('/api/config/thresholds', async (req, res) => {
      try {
        const { healthy, warning, degraded } = req.body;
        
        // Validate thresholds
        if (typeof healthy !== 'number' || typeof warning !== 'number' || typeof degraded !== 'number') {
          return res.status(400).json({ error: 'Invalid threshold values' });
        }

        // Update in-memory thresholds
        this.config.thresholds.default.healthy.max = healthy;
        this.config.thresholds.default.warning.min = healthy;
        this.config.thresholds.default.warning.max = warning;
        this.config.thresholds.default.degraded.min = warning;
        this.config.thresholds.default.degraded.max = degraded;
        this.config.thresholds.default.critical.min = degraded;

        // Write to thresholds.json
        const fs = await import('fs/promises');
        const path = await import('path');
        const __dirname = path.dirname(new URL(import.meta.url).pathname);
        const configPath = path.join(__dirname, '../config/thresholds.json');
        
        await fs.writeFile(
          configPath,
          JSON.stringify(this.config.thresholds, null, 2),
          'utf8'
        );

        res.json({ success: true, message: 'Thresholds updated successfully' });
      } catch (error) {
        console.error('Error updating thresholds config:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Get full configuration
    this.app.get('/api/config', (req, res) => {
      res.json({
        services: this.config.services,
        thresholds: this.thresholds,
      });
    });
  }

  /**
   * Shutdown gracefully
   */
  async shutdown() {
    console.log('\n🛑 Shutting down gracefully...');

    if (this.scheduler) {
      this.scheduler.stop();
    }

    if (this.wsBroadcaster) {
      this.wsBroadcaster.closeAll();
    }

    if (this.server) {
      this.server.close();
    }

    console.log('👋 Goodbye!\n');
    process.exit(0);
  }
}

// Create and start server
const server = new HeartbeatMonitorServer();
server.init();

// Handle shutdown signals
process.on('SIGINT', () => server.shutdown());
process.on('SIGTERM', () => server.shutdown());

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  server.shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
});
