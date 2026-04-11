# Frontend development image that runs the Vite app on port 3001.
FROM node:22-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN corepack enable && \
    corepack prepare yarn@stable --activate && \
    yarn install

# Copy source code
COPY . .

# Expose port
EXPOSE 3001

# Start development server instead of building
CMD ["yarn", "dev", "--host", "0.0.0.0", "--port", "3001"]
