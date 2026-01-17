#!/bin/bash
set -e

echo "🚀 Starting Unified Backend (Electric SQL + NestJS)..."

# Export DATABASE_URL for both processes
export DATABASE_URL=${DATABASE_URL:-"postgresql://admin:password@postgres:5432/chatup"}

# 1. Start Electric SQL in the background
echo "📡 Starting Electric SQL Sync Service on port ${ELECTRIC_PORT:-5133}..."
# Set PORT only for Electric sub-process to avoid conflict with NestJS
env PORT=${ELECTRIC_PORT:-5133} /app/bin/entrypoint start &

# 2. Give Electric some time to initialize its internal state
echo "⏳ Waiting for Electric to initialize..."
sleep 15

# 3. Start NestJS Backend
echo "💻 Starting NestJS Backend on port ${NEST_PORT:-3000}..."
# Export PORT for NestJS to listen on its dedicated port
export PORT=${NEST_PORT:-3000}
exec node dist/main.js
