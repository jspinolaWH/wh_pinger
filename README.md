# WasteHero Heartbeat Monitor

A pull-based heartbeat monitoring system for WasteHero GraphQL APIs. Monitors multiple service environments and provides real-time status updates via WebSocket.

## Prerequisites

- Node.js (v18 or higher recommended)
- npm

## Quick Start

### 1. Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client && npm install
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` to set your configuration:

```
NODE_ENV=production
PORT=3000
WS_PORT=3001
HOST=0.0.0.0

# Optional: API authentication tokens
PROD_AUTH_TOKEN=
DEV_AUTH_TOKEN=

# Logging
LOG_LEVEL=info
LOG_PATH=./data/logs

# Alerts
AUDIO_ENABLED=true
ALERT_VOLUME=0.7
```

### 3. Run the Application

**Development mode (with auto-reload):**

```bash
# Terminal 1: Start backend
npm run dev

# Terminal 2: Start frontend
cd client && npm run dev
```

**Production mode:**

```bash
# Start backend
npm start

# Build and serve frontend
cd client && npm run build && npm run preview
```

### 4. Access the Application

- **Frontend UI**: http://localhost:5173 (dev) or http://localhost:4173 (preview)
- **Backend API**: http://localhost:3000
- **WebSocket**: ws://localhost:3001

## Docker Deployment

Build and run with Docker Compose:

```bash
docker-compose up -d
```

This starts:
- Backend on port 3000 (API) and 3001 (WebSocket)
- Frontend on port 80

## Project Structure

```
wh_pinger/
├── server/           # Node.js backend
│   ├── index.js      # Main entry point
│   ├── core/         # Core modules
│   ├── scheduler/    # Health check scheduling
│   ├── services/     # Service integrations
│   ├── strategies/   # Health check strategies
│   └── utils/        # Utility functions
├── client/           # React frontend (Vite)
│   └── src/          # Source files
├── config/           # Configuration files
│   ├── config.json   # General config
│   ├── services.json # Service definitions
│   └── thresholds.json # Alert thresholds
├── docker-compose.yml
└── package.json
```

## Configuration

### Services (`config/services.json`)

Define the services to monitor with their endpoints, authentication, and check intervals.

### Thresholds (`config/thresholds.json`)

Configure alerting thresholds for response times and failure counts.

## API Endpoints

- `GET /api/health` - Health check endpoint
- `GET /api/status` - Current status of all services
- `GET /api/services` - List of monitored services

## License

MIT
