# AiToS

## Introduction

AiToS is a full-stack web application and CLI tool that analyzes resumes against job descriptions using local AI models via Ollama,
simulating Applicant Tracking System (ATS) behavior to help job seekers understand how their resume may be scored.

![Dashboard](/docs/assets/aitos-dashboard.png?raw=true "AiToS Dashboard")

## Features

- Upload and analyze resumes (PDF, DOCX) against job descriptions
- ATS-style scoring: keyword match, parsing clarity, formatting safety
- Manage CVs, job descriptions, and analysis reports through a web interface
- Standalone CLI tools for quick analysis and tailored CV generation
- Fully containerized — bring your own Ollama models

## Quick Start

### Web Application

```bash
docker compose up --build
```

- Frontend: http://localhost:3001
- Backend API: http://localhost:3000

Docker pulls all required services. No local Node.js or Ollama installation needed.

### CLI Tools

See [cli/README.md](cli/README.md) for more details.

To run only CLI dependencies (Tika + Ollama), use:

```bash
docker compose -f docker-compose.cli.yml up -d
```

To pre-pull model(s) first:

```bash
OLLAMA_INIT_MODELS="gemma4:31b" docker compose -f docker-compose.cli.yml --profile init up ollama-init
```

To reuse models from a local Ollama install, mount the local model directory:

```bash
OLLAMA_MODELS_PATH="$HOME/.ollama" docker compose -f docker-compose.cli.yml up -d
```

Then pass `--tika-url` and `--ollama-url` to the CLI scripts.

### Extended Documentation

For the full feature breakdown, API reference, scoring details, local development setup, and deployment options see [README_DEV.md](README_DEV.md).

## License

[MIT License](LICENSE)

---

## Note From the Author

Hi there! 👋 This is a small experimental project I hacked together over a weekend to turn a shell script into a web application.

I'm not a web developer by trade, so most of the web app code was generated with GitHub Copilot and refined by me.
The real work was in validating what Copilot produced and designing the LLM prompts, which I iterated on with a bit of help from ChatGPT.

The app runs on Linux and should work on macOS. Docker Compose may also work on Windows via WSL, though that's untested.

⚠️ **Important:** This project is not under active development. It was a personal learning exercise — I don't plan to add features,
fix bugs, or review pull requests. That said, I genuinely enjoyed working with Tailwind CSS and experimenting with Ollama's API.

### For users

- Outputs are provided as-is for experimentation and learning.
- Analysis quality is not guaranteed, and suggestions may be incomplete or incorrect.
- You are fully responsible for reviewing and validating any CV or job application material you submit or generate.
- This project is not a career advisory service, and the author accepts no responsibility for application outcomes.

### For developers

- This project is shared as-is and is working in its current form.
- Feel free to fork and adapt it in your own way and at your own pace.
