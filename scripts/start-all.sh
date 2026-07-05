#!/bin/bash
# AVEX - start all apps locally (backend + customer + driver + admin + support + merchant)
# REQUIRES: DATABASE_URL env var (PostgreSQL connection string)
set -e

# Check DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL is required!"
  echo "   Example: export DATABASE_URL='postgres://user:pass@localhost:5432/avex?sslmode=disable'"
  exit 1
fi

cd /home/z/my-project/backend
pkill -f avex-api 2>/dev/null || true
sleep 1
setsid nohup ./avex-api > /tmp/avex-api.log 2>&1 < /dev/null &
echo "✅ Backend started on :8080"
sleep 2

declare -A APPS=(
  [customer]=3000
  [driver]=3001
  [admin]=3002
  [support]=3003
  [merchant]=3004
)
for app in "${!APPS[@]}"; do
  port=${APPS[$app]}
  pkill -f "next dev -p $port" 2>/dev/null || true
  cd /home/z/my-project/apps/$app
  setsid nohup npx next dev -p $port > /tmp/avex-$app.log 2>&1 < /dev/null &
  echo "✅ $app app started on :$port"
done

sleep 5
echo ""
echo "🚀 AVEX platform ready:"
echo "   Backend:  http://localhost:8080"
echo "   Customer: http://localhost:3000"
echo "   Driver:   http://localhost:3001"
echo "   Admin:    http://localhost:3002"
echo "   Support:  http://localhost:3003"
echo "   Merchant: http://localhost:3004"
echo ""
echo "📋 Demo accounts:"
echo "   Admin:    01000000000 / admin123"
echo "   Driver:   01100000001 / 123456  (or 01100000002)"
echo "   Support:  01500000001 / 123456  (or 01500000002)"
echo "   Merchant: 01200000001 / 123456  (or 01200000002-005)"
