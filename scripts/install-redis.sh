#!/bin/bash

echo "📦 Installing Redis on Ubuntu/WSL..."

# Update package list
echo "📋 Updating package list..."
sudo apt update

# Install Redis
echo "🔧 Installing Redis server and tools..."
sudo apt install -y redis-server redis-tools

# Configure Redis for WSL (if needed)
echo "⚙️  Configuring Redis..."
sudo sed -i 's/^# bind 127.0.0.1/bind 127.0.0.1/' /etc/redis/redis.conf
sudo sed -i 's/^protected-mode yes/protected-mode no/' /etc/redis/redis.conf

# Start Redis
echo "🚀 Starting Redis service..."
sudo service redis-server start

# Test Redis
echo "🧪 Testing Redis connection..."
redis-cli ping

if [ $? -eq 0 ]; then
    echo "✅ Redis installed and running successfully!"
    echo ""
    echo "📌 Redis commands:"
    echo "   Start:   sudo service redis-server start"
    echo "   Stop:    sudo service redis-server stop"
    echo "   Status:  sudo service redis-server status"
    echo "   Test:    redis-cli ping"
else
    echo "❌ Redis installation might have issues. Please check manually."
fi