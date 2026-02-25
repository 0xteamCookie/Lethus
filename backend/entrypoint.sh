#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy

echo "Initializing Milvus collection..."
node dist/scripts/initMilvus.js || echo "Milvus init skipped or already exists"

echo "Starting Lethus backend..."
exec node dist/index.js
