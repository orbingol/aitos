#!/bin/bash
set -e

# AiToS Containerized Test Runner
# This script runs tests inside Docker containers using the mock Ollama service.

echo "🚀 Starting test environment (with Mock Ollama)..."
docker compose -f docker-compose.yml -f docker-compose.test.yml up -d --build

echo "⏳ Waiting for services to be ready..."
sleep 5

echo "📦 Installing dependencies and running backend tests with coverage..."
docker compose exec backend yarn install
docker compose exec backend yarn db:init
docker compose exec backend yarn test:coverage

echo "📦 Installing dependencies and running frontend tests with coverage..."
docker compose exec frontend yarn install
docker compose exec frontend yarn test:coverage

echo "📊 Coverage reports generated."
echo "✅ All tests passed!"
