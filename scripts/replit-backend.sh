#!/bin/bash
# AVEX Backend Replit starter
# Builds the Go binary and starts it on PORT (default 8080)
set -e
cd "$(dirname "$0")/.."
cd backend

# Ensure Go is available
if ! command -v go &> /dev/null; then
  echo "❌ Go not installed. Install via replit.nix (pkgs.go)"
  exit 1
fi

# Build
echo "🔨 Building AVEX backend..."
go build -o avex-api ./cmd/server

# Start
PORT="${PORT:-8080}"
echo "🚀 Starting AVEX backend on :$PORT"
exec ./avex-api
