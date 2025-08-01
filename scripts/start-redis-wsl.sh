#!/bin/bash

echo "🚀 Starting Redis for WSL..."

# Check if redis-server is installed
if ! command -v redis-server &> /dev/null; then
    echo "❌ Redis is not installed. Please run: ./scripts/install-redis.sh"
    exit 1
fi

# Start Redis in background mode
echo "📡 Starting Redis server in background..."
redis-server --daemonize yes

# Wait a moment
sleep 2

# Test connection
echo "🧪 Testing Redis connection..."
redis-cli ping

if [ $? -eq 0 ]; then
    echo "✅ Redis is running!"
    echo "📌 To stop Redis: redis-cli shutdown"
else
    echo "❌ Failed to start Redis"
fi