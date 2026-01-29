# AiToS Frontend

React web interface for AI-powered resume analysis.

## Features

- **Resume Management**: Upload, view, edit CVs (PDF/DOCX)
- **Job Descriptions**: Create and manage job requirements
- **AI Analysis**: Analyze resumes with multiple AI models
- **Reports**: View detailed scoring and recommendations
- **Model Management**: Install and manage Ollama models
- **Responsive Design**: Mobile-friendly interface

## Tech Stack

- React 18 + Vite
- Modern CSS (Grid, Flexbox)
- API integration with backend

## Quick Start

```bash
# Install and start development server
yarn install
yarn dev
```

Runs on `http://localhost:3001` and connects to backend on port 3000.

## Testing

- **Vitest** (unit/DOM specs):
  ```bash
  yarn test
  yarn test:coverage
  ```
  Vitest runs in `jsdom` and produces `text/json/html` coverage via the V8 provider. Each spec lives alongside its implementation under `src/`.

See `./run-tests.sh` for a containerized flow that runs both backend and frontend coverage inside Docker, which is also the target of the `.github/workflows/app-tests.yml` workflow.

## Main Components

- **Dashboard**: Overview and navigation
- **CVManager**: Resume upload and management
- **JDManager**: Job description creation
- **AnalysisManager**: AI analysis workflow
- **ReportsManager**: View analysis results
- **ModelManager**: Ollama model management
