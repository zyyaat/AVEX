#!/bin/bash
set -e
echo "🚀 Starting AVEX - Customer App"

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

# Start Next.js customer
cd /home/z/my-project/apps/customer
echo "🌐 Starting Customer app (3000)..."
exec bun run dev
