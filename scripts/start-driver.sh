#!/bin/bash
# AVEX Driver App - start script
# Starts Go backend (port 8080) + Driver Next.js app (port 3001)

set -e
cd /home/z/my-project/backend
pkill -f avex-api 2>/dev/null || true
sleep 1
setsid nohup ./avex-api > /tmp/avex-api.log 2>&1 < /dev/null &
echo "✅ Backend started on :8080"

sleep 2
cd /home/z/my-project/apps/driver
pkill -f "next dev -p 3001" 2>/dev/null || true
sleep 1
setsid nohup npx next dev -p 3001 > /tmp/avex-driver.log 2>&1 < /dev/null &
echo "✅ Driver app started on :3001"

sleep 5
echo ""
echo "🛵 AVEX Driver ready:"
echo "   Backend: http://localhost:8080"
echo "   Driver:  http://localhost:3001"
echo ""
echo "📋 Demo drivers:"
echo "   01100000001 / 123456 (Starter tier)"
echo "   01100000002 / 123456 (Silver tier)"
