#!/bin/bash

# Create necessary directories
echo "Creating necessary directories..."
mkdir -p tmp/db tmp/uploads

# Ensure yarn dependencies are properly installed
echo "Ensuring yarn dependencies are up to date..."
corepack enable && corepack prepare yarn@stable --activate
yarn config set nodeLinker node-modules
yarn install

# Wait for Tika server to be available
echo "Waiting for Tika server to be available..."
for i in {1..30}; do
  if curl -sf ${TIKA_URL:-http://tika:9998}/version > /dev/null 2>&1; then
    echo "Tika server is ready!"
    break
  fi
  echo "Waiting for Tika server... (attempt $i/30)"
  sleep 2
done

# Run DB migrations
echo "Running Prisma migrations..."
if [ ! -d "prisma/migrations" ]; then
  echo "No migrations directory found. Running db push to sync schema..."
  yarn prisma db push
else
  yarn db:deploy
fi

# Start backend
yarn start
