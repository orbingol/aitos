# AiToS - Technical Reference

This document covers the full feature set, API reference, scoring system, deployment options, local development
setup, and testing. For a quick overview see [README.md](README.md).

## Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Local Development](#local-development)
- [Docker Deployment](#docker-deployment)
- [API Reference](#api-reference)
- [Scoring System](#scoring-system)
- [Testing](#testing)

---

## Features

### Backend (Node.js + Express + SQLite/Prisma)

- Upload and parse resumes in PDF and DOCX format via Apache Tika
- Create and manage job descriptions
- AI-powered ATS analysis using Ollama models
- Comprehensive scoring: keyword matching, formatting safety, parsing clarity
- RESTful API with OpenAPI documentation (Swagger UI)
- Full CRUD for CVs, job descriptions, and reports

### Frontend (React + Vite)

- Responsive web interface built with Tailwind CSS
- Drag-and-drop file upload for CVs
- Job description management
- Analysis results with detailed per-metric scoring
- Report management and side-by-side comparison
- Model selection and management

### CLI Tools

- `aitos-analyzer.sh` — standalone analysis against a job description; outputs a JSON report and a human-readable summary
- `aitos-builder.sh` — generates a tailored CV in plain text from example CV/job pairs and a target job description
- Both tools accept PDF, DOCX, and plain text; PDF extraction uses Apache Tika by default with Poppler as an alternative
- Driven by YAML prompt files — swap models or customise prompts without touching the scripts

See [cli/README.md](cli/README.md) for full CLI documentation.

---

## Project Structure

```
aitos/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── services/        # Business logic & Ollama integration
│   │   ├── routes/          # Express route definitions
│   │   └── utils/           # Database utilities
│   ├── prisma/              # Database schema
│   ├── docker/              # Backend Dockerfile and entrypoint
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── services/        # API client layer
│   │   └── App.jsx
│   ├── docker/              # Frontend Dockerfile
│   └── package.json
├── cli/
│   ├── aitos-analyzer.sh
│   ├── aitos-builder.sh
│   ├── prompts/             # YAML prompt files
│   ├── docker/              # CLI Dockerfile
│   └── README.md
├── docker-compose.yml
├── docker-compose.test.yml
└── package.json             # Yarn workspace root
```

---

## Local Development

**Prerequisites:** Node.js 18+, Yarn, Ollama

```bash
# Install dependencies
yarn install

# Copy and adjust environment
cp backend/.env.example backend/.env

# Start Ollama and pull models
ollama serve
ollama pull gemma3:latest

# Initialise the database
yarn db:init

# Start both servers in watch mode
yarn dev
```

- Frontend: http://localhost:3001
- Backend: http://localhost:3000

### Useful workspace scripts

| Script | What it does |
|---|---|
| `yarn dev` | Start backend and frontend in parallel (watch mode) |
| `yarn dev:backend` | Backend only |
| `yarn dev:frontend` | Frontend only |
| `yarn db:init` | Generate Prisma client and push schema |
| `yarn docker:up` | Start the full Docker stack |
| `yarn docker:up:bg` | Same, detached |
| `yarn docker:down` | Stop and remove containers |
| `yarn docker:logs` | Tail all container logs |

---

## Docker Deployment

The recommended way to run AiToS. All services — backend, frontend, Ollama, and Apache Tika — are included.

```bash
# Build and start everything
docker compose up --build

# Detached
docker compose up -d --build

# Tail logs (optionally filter by service name)
docker compose logs -f

# Stop and clean up volumes
docker compose down --volumes
```

Services and their defaults:

| Service | URL |
|---|---|
| Frontend | http://localhost:3001 |
| Backend API | http://localhost:3000 |
| Ollama | http://localhost:11434 |

Services communicate over Docker's internal network using their service names.

---

## API Reference

Full OpenAPI specification: `backend/openapi.yaml`
Interactive Swagger UI: http://localhost:3000 (when the backend is running)

### CV Management

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/cv` | Upload a CV (`multipart/form-data`) |
| `GET` | `/api/cv` | List all CVs with text previews |
| `GET` | `/api/cv/:id` | Get CV details and full extracted text |
| `PUT` | `/api/cv/:id` | Update CV content |
| `DELETE` | `/api/cv/:id` | Delete a CV |

### Job Description Management

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/jd` | Create a job description |
| `GET` | `/api/jd` | List all job descriptions with previews |
| `GET` | `/api/jd/:id` | Get job description details |
| `PUT` | `/api/jd/:id` | Update job description content |
| `DELETE` | `/api/jd/:id` | Delete a job description |

### Analysis & Reports

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/analyze` | Analyze a CV against a JD with a specified model |
| `GET` | `/api/report` | List all analysis reports |
| `GET` | `/api/report/:id` | Get a detailed report with all scores |
| `POST` | `/api/report/:id/reanalyze` | Re-run analysis with a different model |
| `DELETE` | `/api/report/:id` | Delete a report |

### Model Management

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/ollama/tags` | List available Ollama models |
| `POST` | `/api/ollama/pull` | Pull a model into Ollama |

---

## Scoring System

Each analysis produces five numeric scores (0–100) and a set of qualitative outputs.

| Score | Description |
|---|---|
| `parsing_clarity_score` | How completely an ATS can parse the resume |
| `keyword_match_score` | Alignment between resume content and job description requirements |
| `formatting_safety_score` | Absence of ATS-hostile formatting (tables, columns, graphics) |
| `overall_score` | Model's own holistic assessment |
| `weighted_overall_score` | `0.4 × keyword_match + 0.3 × parsing_clarity + 0.3 × formatting_safety` |

Qualitative outputs:

- **Top missing keywords** — terms present in the JD but absent from the resume
- **Technical questions** — job-specific interview questions the candidate could expect or ask
- **Cultural questions** — culture and values questions based on the JD
- **Summary** — one or two sentence overall assessment

---

## Testing

### Full stack (recommended for CI)

Combines the main Compose file with a test override that substitutes a mock Ollama service, waits for health
endpoints, runs coverage inside the containers, then tears everything down:

```bash
./run-tests.sh
```

### Backend only (Jest)

```bash
cd backend
yarn test
yarn test:coverage
```

Uses `NODE_OPTIONS=--experimental-vm-modules` for ESM compatibility. Tests run in-band (`--runInBand`) to avoid
SQLite concurrency issues.

### Frontend only (Vitest)

```bash
cd frontend
yarn test
yarn test:coverage
```

Uses `jsdom` as the test environment. Coverage is collected via V8 and written as text, JSON, and HTML.

### CI

GitHub Actions runs the `App Tests` workflow on pushes and pull requests that touch the backend, frontend, or
the Compose / test scripts. The workflow executes `run-tests.sh` and uploads coverage artifacts.
