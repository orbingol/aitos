#!/bin/bash
set -euo pipefail

# AiToS Containerized Test Runner
# This script runs tests inside Docker containers using the mock Ollama service.

COMPOSE_FILES=( -f docker-compose.yml -f docker-compose.test.yml )

cleanup() {
  docker compose "${COMPOSE_FILES[@]}" down -v
}

trap cleanup EXIT

echo "🚀 Starting test environment (with Mock Ollama)..."
docker compose "${COMPOSE_FILES[@]}" up -d --build

wait_for_service() {
  local name=$1
  local url=$2
  local attempts=0
  echo "⏳ Waiting for ${name}..."
  until curl -fsS "$url" >/dev/null 2>&1 || [ "$attempts" -ge 30 ]; do
    attempts=$((attempts + 1))
    echo "  waiting for ${name} (attempt ${attempts})"
    sleep 2
  done

  if [ "$attempts" -ge 30 ]; then
    echo "❌ ${name} did not become ready in time" >&2
    exit 1
  fi
}

wait_for_service backend http://localhost:3000/health
wait_for_service ollama http://localhost:11434/api/tags

echo "📦 Running backend tests with coverage..."
docker compose "${COMPOSE_FILES[@]}" exec backend yarn db:init
docker compose "${COMPOSE_FILES[@]}" exec backend yarn test:coverage

echo "📦 Running frontend tests with coverage..."
docker compose "${COMPOSE_FILES[@]}" exec frontend yarn test:coverage

echo "📊 Coverage reports generated."
echo "✅ All tests passed!"
