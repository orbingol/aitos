FROM node:22-slim

# Install dependencies for document processing + build tools
RUN apt-get update && apt-get install -y \
  sqlite3 \
  curl \
  bash \
  build-essential \
  python3 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Enable corepack for yarn
RUN corepack enable && corepack prepare yarn@stable --activate

COPY package*.json ./

# Install dependencies with explicit node-modules mode
RUN yarn config set nodeLinker node-modules
RUN yarn install --mode=skip-build

# Generate Prisma client for the current platform
COPY prisma ./prisma/
RUN yarn prisma generate

COPY src ./src/
COPY openapi.yaml ./
COPY docker/docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
