#!/bin/bash
# AVEX <APP> Replit starter
# Usage: scripts/replit-app.sh <app-name> <port>
# Example: scripts/replit-app.sh customer 3000
set -e
APP="${1:-customer}"
PORT="${2:-3000}"
cd "$(dirname "$0")/.."
cd "apps/$APP"

# Install deps
if command -v bun &> /dev/null; then
  echo "📦 Installing deps (bun)..."
  bun install 2>&1 | tail -3
else
  echo "📦 Installing deps (npm)..."
  npm install 2>&1 | tail -3
fi

# Build
echo "🔨 Building $APP..."
npx next build 2>&1 | tail -10

# Start
echo "🚀 Starting $APP on :$PORT"
exec npx next start -p "$PORT"
