#!/bin/sh
set -e

echo "🚀 Starting AeroAssist backend..."

# Wait for dependencies
echo "⏳ Waiting for PostgreSQL..."
./scripts/wait-for-it.sh postgres:5432 --timeout=60 --strict -- echo "✅ PostgreSQL is ready"

echo "⏳ Waiting for Redis..."
./scripts/wait-for-it.sh redis:6379 --timeout=30 --strict -- echo "✅ Redis is ready"

echo "⏳ Waiting for OpenBSP..."
./scripts/wait-for-it.sh openbsp:3001 --timeout=45 -- echo "✅ OpenBSP is ready"

# Run database migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Start the application
echo "✅ All systems ready. Starting server..."
exec "$@"
