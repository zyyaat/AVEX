#!/bin/bash
set -e
echo "🚀 Starting AVEX - Driver App"

# Start Go backend
cd /home/z/my-project/backend
pkill -f avex-api 2>/dev/null; sleep 1
setsid nohup ./avex-api > /tmp/avex-api.log 2>&1 < /dev/null &
sleep 3
if curl -s http://localhost:8080/api/health > /dev/null 2>&1; then
  echo "✅ Go backend ready (8080)"
else
  echo "⚠️ Go backend not responding"
fi

# Start Next.js driver
cd /home/z/my-project/apps/driver
echo "🌐 Starting Driver app (3001)..."
exec bun run dev -- -p 3001
