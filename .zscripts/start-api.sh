#!/bin/bash
# Start AVEX Go API server - runs in background with setsid+nohup for persistence

cd /home/z/my-project/backend

# Kill existing
pkill -f avex-api 2>/dev/null
pkill -f franks-api 2>/dev/null
sleep 1

# Start with setsid+nohup for maximum persistence
setsid nohup ./avex-api > /tmp/avex-api.log 2>&1 < /dev/null &
echo "[API] Go backend started (PID: $!)"
sleep 2

# Verify
if curl -s http://localhost:8080/api/health > /dev/null 2>&1; then
  echo "[API] ✅ Healthy"
else
  echo "[API] ❌ Failed to start"
fi
