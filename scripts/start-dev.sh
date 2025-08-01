#!/bin/bash

echo "🚀 Starting LINE Webhook Development Environment..."

# Check Redis
echo "📡 Checking Redis connection..."
if ! command -v redis-cli &> /dev/null; then
    echo "❌ Redis is not installed. Please install first:"
    echo "   sudo apt update && sudo apt install -y redis-server redis-tools"
    exit 1
fi

redis-cli ping > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "⚠️  Redis is not running. Trying to start..."
    
    # Try service first
    sudo service redis-server start > /dev/null 2>&1
    
    # If service fails (common in WSL), try direct start
    if [ $? -ne 0 ]; then
        echo "📌 Starting Redis in background mode (WSL)..."
        redis-server --daemonize yes
    fi
    
    sleep 2
    
    # Test again
    redis-cli ping > /dev/null 2>&1
    if [ $? -ne 0 ]; then
        echo "❌ Failed to start Redis. Please start manually:"
        echo "   redis-server --daemonize yes"
        exit 1
    fi
fi

echo "✅ Redis is running!"

# Check PostgreSQL
echo "🗄️  Checking PostgreSQL connection..."
source .env.local
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Cannot connect to PostgreSQL"
    exit 1
fi

echo "✅ All services are ready!"
echo ""
echo "📌 Starting server..."
echo "   - Web server: http://localhost:3002"
echo "   - Webhook endpoint: http://localhost:3002/api/chat/line/webhook"
echo "   - Monitoring: http://localhost:3002/api/monitoring/status"
echo ""

# Start web server
npm run dev