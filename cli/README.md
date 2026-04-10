# AiToS CLI

A standalone command-line interface for AiToS that performs AI-powered resume analysis and CV generation without
requiring the web interface. Both tools connect directly to a running Ollama instance and are driven by YAML
prompt files, making it straightforward to swap models or customise the prompts.

## Table of Contents

- [aitos-analyzer.sh](#aitos-analyzersh)
- [aitos-builder.sh](#aitos-buildersh)
- [Prompt YAML Format](#prompt-yaml-format)

---

## aitos-analyzer.sh

Analyzes a resume against a target job description and produces two outputs: a structured JSON ATS-style report
and a human-readable summary. Input files may be plain text, PDF, or DOCX; PDF extraction uses Apache Tika by
default, with Poppler available as an alternative.

### Dependencies

- `tika` — document text extraction (PDF, DOCX)
- `poppler` (`pdftotext`) — alternative PDF extraction (optional)
- `ollama` — local AI model runtime
- `jq` — JSON processing
- `yq` — YAML processing

### Arguments

| Argument / Option | Description |
|---|---|
| `<resume>` | Path to the resume file (TXT, PDF, or DOCX) |
| `<job_description>` | Path to the job description file (TXT, PDF, or DOCX) |
| `--poppler` | Use Poppler (`pdftotext`) for PDF extraction instead of Tika |
| `--text-only` | Print only the human-readable report, suppressing JSON output |
| `--prompt <file>` | Override the default prompt file (path, relative path, or filename inside `prompts/`) |

### Running Locally

```bash
./aitos-analyzer.sh [--poppler] [--text-only] [--prompt <prompt.yaml>] <resume> <job_description>
```

```bash
# Basic analysis
./aitos-analyzer.sh resume.pdf job.txt

# Human-readable report only
./aitos-analyzer.sh --text-only resume.pdf job.txt

# Alternative PDF extractor
./aitos-analyzer.sh --poppler resume.pdf job.pdf

# Custom prompt
./aitos-analyzer.sh --prompt prompts/cv-analyzer-qwen.yaml resume.pdf job.txt
```

### Running with Docker

Build the analyzer image from the shared Dockerfile:

```bash
docker build --target analyzer -t aitos-analyzer -f docker/Dockerfile .
```

Run by mounting a local directory to `/data`:

```bash
docker run --rm -v $(pwd):/data aitos-analyzer /data/resume.pdf /data/job.txt
```

The container reaches Ollama on the host at `http://host.docker.internal:11434`.

### Default Prompt

When `--prompt` is not supplied the script loads `prompts/cv-analyzer-default.yaml`. Additional bundled prompts
are available in the `prompts/` directory (`cv-analyzer-qwen.yaml`, `cv-analyzer-gpt-oss.yaml`).

---

## aitos-builder.sh

Generates a tailored CV in plain text by studying a set of the candidate's existing CV and job-description pairs,
then applying the learned profile to a new target job description. An optional story file can be provided to
supply richer context such as concrete achievements and outcomes per role.

The data directory must contain numbered pairs — `cv1.pdf` paired with `job1.txt`, `cv2.docx` paired with
`job2.pdf`, and so on. Each CV and its matching job description share the same number. Supported file formats
for each file in a pair are `.pdf`, `.docx`, and `.txt`.

### Dependencies

- `tika` — document text extraction (PDF, DOCX)
- `poppler` (`pdftotext`) — alternative PDF extraction (optional)
- `ollama` — local AI model runtime
- `jq` — JSON processing
- `yq` — YAML processing

### Arguments

| Argument / Option | Description |
|---|---|
| `<data_dir>` | Directory containing numbered CV + job pairs (`cv1.*` + `job1.*`, `cv2.*` + `job2.*`, …) |
| `<target_job>` | Target job description file (TXT, PDF, or DOCX) |
| `--poppler` | Use Poppler (`pdftotext`) for PDF extraction instead of Tika |
| `--story <file>` | Plain-text file with per-role context (responsibilities, delivery approach, achievements) |
| `--prompt <file>` | Override the default prompt file (path, relative path, or filename inside `prompts/`) |

### Running Locally

```bash
./aitos-builder.sh [--poppler] [--story <story.txt>] [--prompt <prompt.yaml>] <data_dir> <target_job>
```

```bash
# Basic usage
./aitos-builder.sh ./data target_job.txt

# With a PDF target job description
./aitos-builder.sh ./data target_job.pdf

# With additional story context
./aitos-builder.sh --story story.txt ./data target_job.txt

# Custom prompt and story
./aitos-builder.sh --prompt my-prompt.yaml --story story.txt ./data target_job.txt
```

### Running with Docker

Build the builder image from the shared Dockerfile:

```bash
docker build --target builder -t aitos-builder -f docker/Dockerfile .
```

Run by mounting a local directory to `/data`:

```bash
docker run --rm -v $(pwd):/data aitos-builder /data /data/target_job.txt
```

The container reaches Ollama on the host at `http://host.docker.internal:11434`.

### Default Prompt

When `--prompt` is not supplied the script loads `prompts/cv-builder-default.yaml`.

---

## Prompt YAML Format

Both scripts are driven by YAML prompt files. Creating a custom file lets you change the model, its tag, or
the full prompt without touching the scripts.

### Fields

| Field | Required | Description |
|---|---|---|
| `model` | Yes | Model name as registered in Ollama (e.g. `gemma4`, `qwen3`) |
| `tag` | No | Model tag; defaults to `latest` when omitted |
| `prompt` | Yes | Prompt template string containing placeholder tokens |

### Placeholder Tokens

**aitos-analyzer.sh** prompts:

| Token | Replaced with |
|---|---|
| `{{RESUME}}` | Extracted resume text |
| `{{JD}}` | Extracted job description text |

**aitos-builder.sh** prompts:

| Token | Replaced with |
|---|---|
| `{{EXAMPLES}}` | All extracted CV + job pairs from the data directory |
| `{{STORY}}` | Content of the story file (empty string when not provided) |
| `{{TARGET_JD}}` | Extracted target job description text |

### Example

```yaml
model: gemma4
tag: 12b
prompt: |
  You are an ATS resume analyzer.

  Resume:
  {{RESUME}}

  Job description:
  {{JD}}

  Provide a brief assessment and a score out of 100.
```

Pass the file via `--prompt`:

```bash
./aitos-analyzer.sh --prompt my-prompt.yaml resume.pdf job.txt
```
