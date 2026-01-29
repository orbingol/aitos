# AiToS Backend

Node.js REST API for AI-powered resume analysis using Ollama models.

## Features

- Resume/CV upload and text extraction (PDF/DOCX)
- Job description management
- AI analysis with multiple models (Gemma3, Qwen3, GPT-OSS)
- Multi-metric ATS compatibility scoring
- SQLite database with Prisma ORM
- OpenAPI documentation at `/`

## Quick Start

```bash
# Install and initialize
yarn install
yarn db:init

# Start development server
yarn dev
```

Runs on `http://localhost:3000` with Swagger UI documentation.

## Testing

- **Jest unit tests**:
  ```bash
  yarn test
  yarn test:coverage
  ```
  The scripts set `NODE_OPTIONS=--experimental-vm-modules` so Jest can run under the current ESM build. Use the `backend/tests` folder for fixture-based coverage.
- **Integrated/coverage run (mock Ollama)**: from the repo root run `./run-tests.sh`, which starts the full Docker stack with `docker-compose.yml` + `docker-compose.test.yml`, waits for healthy backend/OLLAMA endpoints, and runs the backend (`yarn test:coverage`) before continuing with the frontend coverage.

## Key API Endpoints

- **CVs**: `POST/GET/PUT/DELETE /api/cv` - Resume management
- **Job Descriptions**: `POST/GET/PUT/DELETE /api/jd` - Job description management
- **Analysis**: `POST /api/analyze` - Analyze CV against JD
- **Reports**: `GET /api/report` - View analysis results
- **Models**: `GET /api/ollama/tags` - List available AI models

Complete API documentation available at `http://localhost:3000/`

## Database Models

- **Resume**: ID, filename, content, timestamps
- **JobDescription**: ID, title, content, timestamps
- **Report**: ID, model, scores, analysis, timestamps

## Scoring System

- **Parsing Clarity** (0-100): Resume structure and ATS readability
- **Keyword Match** (0-100): Alignment with job requirements
- **Formatting Safety** (0-100): ATS-friendly formatting
- **Overall Score** (0-100): AI model's holistic assessment
