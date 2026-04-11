# Lightweight mock Ollama server image used by backend integration tests.
FROM node:18-alpine
WORKDIR /app
COPY server.js .
EXPOSE 11434
CMD ["node", "server.js"]
