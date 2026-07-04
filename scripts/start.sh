#!/bin/bash
# AVEX - Start script for Replit / Production
# Starts Go backend + Next.js frontend together

set -e

echo "🚀 Starting AVEX..."

# ===== 1. Start Go Backend (port 8080) =====
echo "📦 Starting Go API backend on port 8080..."

cd /home/z/my-project/backend

# Install Go deps and build if needed
if [ ! -f avex-api ] || [ main.go -nt avex-api ]; then
  echo "🔨 Building Go backend..."
  export GOPATH=/home/z/go
  export GOMODCACHE=/home/z/go/pkg/mod
  go mod tidy 2>/dev/null || true
  go build -o avex-api . 2>&1 || {
    echo "❌ Go build failed!"
    exit 1
  }
  echo "✅ Go build complete"
fi

# Kill existing instance
pkill -f avex-api 2>/dev/null || true
pkill -f franks-api 2>/dev/null || true
sleep 1

# Start Go in background
setsid nohup ./avex-api > /tmp/avex-api.log 2>&1 < /dev/null &
GO_PID=$!
echo "✅ Go API started (PID: $GO_PID)"

# Wait for Go to be ready
for i in $(seq 1 15); do
  if curl -s http://localhost:8080/api/health > /dev/null 2>&1; then
    echo "✅ Go API healthy"
    break
  fi
  echo "   Waiting for Go API... ($i/15)"
  sleep 1
done

# ===== 2. Start Next.js (port 3000) =====
cd /home/z/my-project
echo "🌐 Starting Next.js on port 3000..."

# Install deps if needed
if [ ! -d node_modules ]; then
  echo "📦 Installing Node dependencies..."
  npm install 2>/dev/null || bun install 2>/dev/null || yarn install
fi

# Start Next.js
if command -v bun &> /dev/null; then
  exec bun run dev
elif command -v npm &> /dev/null; then
  exec npm run dev
else
  exec npx next dev
fi
