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
