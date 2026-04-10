# AiToS

## Developer Note

Hi there! 👋 This is a small experimental project I hacked together over a weekend to turn a shell script into a web application.

I’m not a web developer by trade (my background is in other fields) so most of the web app code was generated with GitHub Copilot
and refined by me. The real work was in validating and adjusting what Copilot produced. I also designed the initial LLM prompts
myself and iterated on them a bit using ChatGPT.

The app runs fine on Linux (and should on macOS). With Docker Compose, you might get it working on Windows via WSL,
but that’s outside the scope of what I tested.

⚠️ **Important:** This project is not under active development. I don’t plan to add features, fix bugs, update dependencies,
or review pull requests. It was a personal learning exercise. I especially enjoyed working with Tailwind CSS and
experimenting with Ollama’s API.

### For users

- Outputs are for educational purposes only: no guarantees, positive or negative.
- Suggestions come from publicly available LLM models and may not reflect reality. Always double-check the results.
- Resume/CV parsing quality depends on the structure of your document. (Tip: try Apache Tika to preview parsing results)
- Please don’t blame me for anything. 😉

### For developers

- This project is MIT licensed. Fork and modify as you wish.
- Treat it as a starting point or a learning resource. It is not a finished product.

## Introduction

A comprehensive full-stack application for analyzing resumes and CVs against job descriptions using AI models via Ollama.
AiToS simulates Applicant Tracking System (ATS) behavior to help job seekers optimize their resumes.

![Dashboard](/docs/assets/aitos-dashboard.png?raw=true "AiToS Dashboard")

## Features

- **Backend (Node.js + Express + SQLite/Prisma)**
  - Upload and parse resumes (PDF/DOCX → text extraction)
  - Create and manage job descriptions
  - AI-powered ATS analysis using Ollama models (Gemma3, Qwen3, GPT-OSS)
  - Comprehensive scoring system (keyword matching, formatting safety, parsing clarity)
  - RESTful API with OpenAPI documentation
  - Full CRUD operations for CVs, job descriptions, and reports
  - Docker support with embedded services

- **Frontend (React + Vite)**
  - Clean, responsive web interface
  - Drag-and-drop file upload for CVs
  - Job description management
  - Real-time analysis results with detailed scoring
  - Report management and comparison
  - Model selection and management

- **CLI Tool**
  - Standalone command-line interface for quick analysis
  - Direct integration with Ollama models
  - Support for PDF and DOCX files
  - Optional Poppler integration for PDF processing

## Quick Start

### Option 1: Docker (Recommended - Everything Included)

```bash
# Start all services (includes Ollama, Tika, backend, frontend)
docker-compose up --build

# Access the application:
# - Frontend: http://localhost:3001
# - Backend API: http://localhost:3000
# - Ollama: http://localhost:11434
```

That's it! Docker includes all dependencies and AI models.

### Option 2: Local Development

**Prerequisites:**
- Node.js 18+ and Yarn
- Ollama installed locally

```bash
# 1. Install dependencies
yarn install

# 2. Setup environment (copy and modify if needed)
cp backend/.env.example backend/.env

# 3. Start Ollama and install models
ollama serve
ollama pull gemma3:latest
ollama pull qwen3:latest
ollama pull gpt-oss:latest

# 4. Initialize database
yarn db:init

# 5. Start development servers
yarn dev
```

**Available at:**
- Frontend: http://localhost:3001
- Backend: http://localhost:3000

### Docker Commands

```bash
# Start all services
yarn docker:up

# Run in background
yarn docker:up:bg

# Stop services
yarn docker:down

# View logs
yarn docker:logs
```

### CLI Usage (Optional)

See [cli/README.md](cli/README.md) for all CLI commands and usage examples.

## Project Structure

```
aitos/
├── backend/           # Node.js API server
│   ├── src/
│   │   ├── controllers/     # API route handlers
│   │   ├── services/        # Business logic & integrations
│   │   ├── routes/          # Express route definitions
│   │   └── utils/           # Database utilities
│   ├── prisma/        # Database schema and migrations
│   ├── docker/        # Docker configuration
│   ├── db/            # Legacy database schema files
│   └── package.json
├── frontend/          # React web application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── services/        # API service layer
│   │   └── App.jsx
│   ├── docker/        # Frontend Docker configuration
│   └── package.json
├── cli/               # Command-line interface
│   ├── aitos-analyzer.sh  # Standalone CLI analysis script
│   └── README.md      # CLI documentation
└── package.json       # Root workspace configuration
```

## API Documentation

The backend includes comprehensive OpenAPI documentation available at `backend/openapi.yaml`.
Access the interactive Swagger UI at: http://localhost:3000

### Key API Endpoints

**CV Management:**
- `POST /api/cv` - Upload CV (multipart/form-data)
- `GET /api/cv` - List all CVs with previews
- `GET /api/cv/:id` - Get CV details and full text
- `PUT /api/cv/:id` - Update CV content
- `DELETE /api/cv/:id` - Delete CV

**Job Description Management:**
- `POST /api/jd` - Create job description
- `GET /api/jd` - List all job descriptions with previews
- `GET /api/jd/:id` - Get job description details
- `PUT /api/jd/:id` - Update job description content
- `DELETE /api/jd/:id` - Delete job description

**Analysis & Reports:**
- `POST /api/analyze` - Analyze CV against JD with specified model
- `GET /api/report` - List all analysis reports
- `GET /api/report/:id` - Get detailed report with scores
- `POST /api/report/:id/reanalyze` - Reanalyze with different model
- `DELETE /api/report/:id` - Delete report

**Model Management:**
- `GET /api/ollama/tags` - List available Ollama models
- `POST /api/ollama/pull` - Download/install new models

## Scoring System

AiToS provides comprehensive ATS simulation with multiple scoring metrics:

- **Parsing Clarity Score (0-100)**: How well can ATS systems parse the resume
- **Keyword Match Score (0-100)**: Alignment with job description requirements
- **Formatting Safety Score (0-100)**: ATS-friendly formatting assessment
- **Overall Score (0-100)**: Model's holistic assessment
- **Weighted Overall Score**: Calculated as (0.4 × keyword_match + 0.3 × parsing_clarity + 0.3 × formatting_safety)

Additional insights include missing keywords, suggested improvements, and company-specific interview questions.

## Docker Deployment

The application supports full containerization with Docker Compose:

```bash
# Complete stack deployment (recommended)
docker-compose up --build

# Background deployment
docker-compose up -d --build

# View logs
docker-compose logs -f [service_name]

# Scale services
docker-compose up --scale backend=2

# Clean shutdown
docker-compose down --volumes
```

The Docker setup includes:
- **Backend**: Node.js API with Prisma ORM
- **Frontend**: React application with Vite
- **Ollama**: AI model service with persistent storage
- **Automatic networking**: Services can communicate using service names

## Available Models

Supported Ollama models for analysis:
- **gemma3**: Google's Gemma 3 model (lightweight, fast)
- **qwen3**: Alibaba's Qwen 3 model (balanced performance)
- **gpt-oss**: Open-source GPT variant (comprehensive analysis)

## Testing

- **Containerized smoke & coverage run** (uses mock Ollama + real stack):
  ```bash
  ./run-tests.sh
  ```
  This script combines `docker-compose.yml` with `docker-compose.test.yml`, waits for backend/ollama health endpoints, and then runs `yarn test:coverage` inside the backend and frontend containers while cleaning up afterward. Use it in CI or when you want reproducible coverage reports.
- **Backend unit tests** (Jest/Prisma):
  ```bash
  cd backend
  yarn test
  yarn test:coverage
  ```
  Ensure `NODE_ENV=test` is set when needed; the Jest config already maps `.js` modules and enables in-band execution for compatibility with SQLite.
- **Frontend unit tests** (Vitest/UI):
  ```bash
  cd frontend
  yarn test
  yarn test:coverage
  ```
  The Vitest config uses `jsdom` and outputs `text/json/html` coverage via V8.

GitHub Actions now runs the `App Tests` workflow on pushes or pull requests that touch the backend, frontend, or the compose/scripts controlling this test suite, so the coverage run is automated for mainline changes.

Install models using:
```bash
ollama pull gemma3:latest
ollama pull qwen3:latest
ollama pull gpt-oss:latest
```

## License

[MIT License](LICENSE)
