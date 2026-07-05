#!/bin/bash
# AVEX Backend Replit starter
# Builds the Go binary and starts it on PORT (default 8080)
# REQUIRES: DATABASE_URL env var (PostgreSQL connection string)
set -e
cd "$(dirname "$0")/.."
cd backend

# Ensure Go is available
if ! command -v go &> /dev/null; then
  echo "❌ Go not installed. Install via replit.nix (pkgs.go)"
  exit 1
fi

# Ensure DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL environment variable is required!"
  echo "   Set it as a Replit Secret with your PostgreSQL connection string."
  echo "   Example: postgres://user:pass@host:5432/dbname?sslmode=require"
  exit 1
fi

# Build
echo "🔨 Building AVEX backend..."
go build -o avex-api ./cmd/server

# Start
PORT="${PORT:-8080}"
echo "🚀 Starting AVEX backend on :$PORT"
exec ./avex-api
