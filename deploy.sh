#!/bin/bash

# WasteHero Heartbeat Monitor - Deployment Script

set -e  # Exit on error

echo "🚀 WasteHero Heartbeat Monitor - Docker Deployment"
echo "=================================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Function to show menu
show_menu() {
    echo ""
    echo "Select an option:"
    echo "1) Build and start (fresh deployment)"
    echo "2) Start existing containers"
    echo "3) Stop containers"
    echo "4) Restart containers"
    echo "5) View logs"
    echo "6) Check status"
    echo "7) Rebuild (no cache)"
    echo "8) Clean up (remove containers and volumes)"
    echo "9) Exit"
    echo ""
}

# Main deployment function
deploy() {
    echo "📦 Building Docker images..."
    docker-compose build

    echo ""
    echo "🚀 Starting containers..."
    docker-compose up -d

    echo ""
    echo "⏳ Waiting for services to be healthy..."
    sleep 5

    echo ""
    echo "✅ Deployment complete!"
    echo ""
    echo "🌐 Access the application:"
    echo "   Frontend: http://localhost"
    echo "   Backend API: http://localhost:3000"
    echo "   WebSocket: ws://localhost:3001"
    echo ""
    echo "📊 Check status: docker-compose ps"
    echo "📝 View logs: docker-compose logs -f"
}

# Start existing containers
start() {
    echo "🚀 Starting containers..."
    docker-compose start
    echo "✅ Containers started!"
}

# Stop containers
stop() {
    echo "🛑 Stopping containers..."
    docker-compose stop
    echo "✅ Containers stopped!"
}

# Restart containers
restart() {
    echo "🔄 Restarting containers..."
    docker-compose restart
    echo "✅ Containers restarted!"
}

# View logs
logs() {
    echo "📝 Showing logs (Ctrl+C to exit)..."
    docker-compose logs -f
}

# Check status
status() {
    echo "📊 Container Status:"
    docker-compose ps
    echo ""
    echo "💾 Disk Usage:"
    docker system df
}

# Rebuild without cache
rebuild() {
    echo "🔨 Rebuilding without cache..."
    docker-compose build --no-cache
    docker-compose up -d
    echo "✅ Rebuild complete!"
}

# Clean up
cleanup() {
    echo "🧹 Cleaning up..."
    read -p "⚠️  This will remove all containers and volumes. Continue? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker-compose down -v
        docker system prune -f
        echo "✅ Cleanup complete!"
    else
        echo "❌ Cleanup cancelled."
    fi
}

# Interactive mode
if [ $# -eq 0 ]; then
    while true; do
        show_menu
        read -p "Enter choice [1-9]: " choice
        case $choice in
            1) deploy ;;
            2) start ;;
            3) stop ;;
            4) restart ;;
            5) logs ;;
            6) status ;;
            7) rebuild ;;
            8) cleanup ;;
            9) echo "👋 Goodbye!"; exit 0 ;;
            *) echo "❌ Invalid option. Please try again." ;;
        esac
    done
else
    # Command line mode
    case "$1" in
        deploy) deploy ;;
        start) start ;;
        stop) stop ;;
        restart) restart ;;
        logs) logs ;;
        status) status ;;
        rebuild) rebuild ;;
        cleanup) cleanup ;;
        *)
            echo "Usage: $0 {deploy|start|stop|restart|logs|status|rebuild|cleanup}"
            echo "   Or run without arguments for interactive mode"
            exit 1
            ;;
    esac
fi
