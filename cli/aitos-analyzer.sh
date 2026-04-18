#!/bin/bash

# SPDX-License-Identifier: MIT
# Copyright (c) 2025-2026 Onur Rauf Bingol
# See LICENSE in the project root for full license text.

# aitos-analyzer.sh — Generates ATS-like reports for a given CV against a target job description.
#
# Analyze a resume against a target job description and produce both a JSON
# ATS-style report and a human-readable summary.
#
# Supports plain text, PDF, and DOCX resume input. PDF extraction can use
# Apache Tika by default or Poppler with --poppler.
#
# Install prerequisites:
#  * brew install ollama-app tika poppler jq yq
#  * or check your OS package manager for installation of the above tools
#
# Usage:
#  ./aitos-analyzer.sh [--poppler] [--text-only] [--prompt <prompt.yaml>] <resume.pdf/docx/txt> <job_description.pdf/docx/txt>
#
# Arguments:
#  <resume.pdf/docx/txt>              Path to resume file (TXT, PDF, or DOCX).
#  <job_description.pdf/docx/txt>     Path to target job description (TXT, PDF, or DOCX).
#
# Options:
#  --poppler                          Use Poppler (pdftotext) for PDF extraction instead of Tika.
#  --text-only                        Print only the human-readable report section.
#  --prompt <prompt.yaml>             Override default prompt file (default: prompts/cv-analyzer-default.yaml).
#  --model <name>                     Override model name from prompt file.
#  --model-tag <tag>                  Override model tag from prompt file.
#  --tika-url <url>                   Use Apache Tika server URL for extraction (instead of local tika binary).
#  --ollama-url <url>                 Use Ollama server URL (instead of local ollama binary).
#
# Examples:
#  ./aitos-analyzer.sh resume.pdf job.txt
#  ./aitos-analyzer.sh --text-only resume.pdf job.pdf
#  ./aitos-analyzer.sh --prompt prompts/cv-analyzer-qwen.yaml resume.pdf job.docx
#  ./aitos-analyzer.sh --model qwen3 --model-tag 8b resume.pdf job.txt
#  ./aitos-analyzer.sh --poppler resume.pdf job.pdf
#  ./aitos-analyzer.sh --tika-url http://localhost:9998 --ollama-url http://localhost:11434 resume.pdf job.txt
#
# Build a container image and run (optional):
#  * docker build --target analyzer -t aitos-analyzer -f docker/Dockerfile .
#  * docker run -v $(pwd):/data aitos-analyzer /data/resume.pdf /data/job.txt

set -e
set -o pipefail

USE_POPPLER=false
TEXT_ONLY=false
PROMPT_OVERRIDE=""
MODEL_OVERRIDE=""
MODEL_TAG_OVERRIDE=""
TIKA_URL=""
OLLAMA_URL=""
AITOS_VERSION="${AITOS_VERSION:-dev}"

print_usage() {
  cat <<EOF
Usage: $0 [--poppler] [--text-only] [--prompt <yaml-file>] [--model <name>] [--model-tag <tag>] <resume.pdf/docx/txt> <job_description.pdf/docx/txt>
Example: $0 resume.pdf job.txt
Example with custom prompt: $0 --prompt cv-analyzer-qwen.yaml resume.pdf job.txt
Example with model override: $0 --model qwen3 --model-tag 8b resume.pdf job.txt
Example with remote services: $0 --tika-url http://localhost:9998 --ollama-url http://localhost:11434 resume.pdf job.txt
Default prompt: cv-analyzer-default.yaml
EOF
}

normalize_url() {
  local input="$1"
  if [ -z "$input" ]; then
    echo ""
    return
  fi
  local trimmed="${input%/}"
  if [[ ! "$trimmed" =~ ^https?:// ]]; then
    echo "❌ URL must start with http:// or https://: $input" >&2
    exit 1
  fi
  echo "$trimmed"
}

extract_with_tika_server() {
  local src="$1"
  local dest="$2"

  curl -fsS \
    -X PUT \
    -H 'Accept: text/plain' \
    -H 'Content-Type: application/octet-stream' \
    --data-binary "@$src" \
    "$TIKA_URL/tika" > "$dest" || return 1
}

run_ollama_prompt() {
  local model="$1"
  local prompt="$2"

  if [ -n "$OLLAMA_URL" ]; then
    local payload
    payload=$(jq -n \
      --arg model "$model" \
      --arg prompt "$prompt" \
      '{model: $model, prompt: $prompt, stream: false}')

    local response_file
    response_file=$(mktemp)

    local http_code
    http_code=$(curl -sS \
      -o "$response_file" \
      -w '%{http_code}' \
      -X POST \
      -H 'Content-Type: application/json' \
      --data "$payload" \
      "$OLLAMA_URL/api/generate") || {
      rm -f "$response_file"
      echo "❌ Failed to connect to Ollama server: $OLLAMA_URL" >&2
      return 1
    }

    if [ "$http_code" -lt 200 ] || [ "$http_code" -ge 300 ]; then
      local api_error
      api_error=$(jq -r '.error // .message // empty' "$response_file" 2>/dev/null || true)

      if [ -n "$api_error" ]; then
        echo "❌ Ollama API error ($http_code): $api_error" >&2
      else
        echo "❌ Ollama API error ($http_code) from $OLLAMA_URL/api/generate" >&2
      fi

      if [[ "$api_error" == *"model"* && "$api_error" == *"not found"* ]]; then
        echo "💡 Model '$model' is not available on that Ollama server. Pull it with: ollama pull $model" >&2
      fi

      rm -f "$response_file"
      return 1
    fi

    local response_text
    response_text=$(cat "$response_file")
    rm -f "$response_file"

    local generated
    generated=$(jq -r '.response // empty' <<< "$response_text" 2>/dev/null || true)
    if [ -z "$generated" ]; then
      echo "❌ Ollama response did not include a 'response' field." >&2
      return 1
    fi

    printf '%s\n' "$generated"
    return
  fi

  ollama run "$model" <<< "$prompt"
}

while [[ "$1" == --* ]]; do
  case "$1" in
    --poppler)
      USE_POPPLER=true
      shift
      ;;
    --text-only)
      TEXT_ONLY=true
      shift
      ;;
    --prompt)
      if [ -z "$2" ]; then
        echo "❌ Missing value for --prompt"
        exit 1
      fi
      PROMPT_OVERRIDE="$2"
      shift 2
      ;;
    --model)
      if [ -z "$2" ]; then
        echo "❌ Missing value for --model"
        exit 1
      fi
      MODEL_OVERRIDE="$2"
      shift 2
      ;;
    --model-tag)
      if [ -z "$2" ]; then
        echo "❌ Missing value for --model-tag"
        exit 1
      fi
      MODEL_TAG_OVERRIDE="$2"
      shift 2
      ;;
    --tika-url)
      if [ -z "$2" ]; then
        echo "❌ Missing value for --tika-url"
        exit 1
      fi
      TIKA_URL="$(normalize_url "$2")"
      shift 2
      ;;
    --ollama-url)
      if [ -z "$2" ]; then
        echo "❌ Missing value for --ollama-url"
        exit 1
      fi
      OLLAMA_URL="$(normalize_url "$2")"
      shift 2
      ;;
    --help)
      print_usage
      exit 0
      ;;
    --version)
      echo "$AITOS_VERSION"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

if [ "$#" -ne 2 ]; then
  print_usage
  exit 1
fi

RESUME=$1
JD=$2

if [ ! -f "$RESUME" ]; then
  echo "❌ Resume file not found: $RESUME"
  exit 1
fi

if [ ! -f "$JD" ]; then
  echo "❌ Job description file not found: $JD"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROMPTS_DIR="${AITOS_PROMPTS_DIR:-$SCRIPT_DIR/prompts}"
RESUME_DIR="$(cd "$(dirname "$RESUME")" && pwd)"
JD_DIR="$(cd "$(dirname "$JD")" && pwd)"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BASENAME=$(basename "$RESUME")
JD_BASENAME=$(basename "$JD")

# 1. Extract text
EXT="${RESUME##*.}"

if [ "$EXT" = "txt" ]; then
  echo "📄 Using existing text file..."
  TMP_RESUME="$RESUME"
elif [ "$EXT" = "pdf" ]; then
  TMP_RESUME="$RESUME_DIR/${BASENAME}_${TIMESTAMP}.txt"
  if [ "$USE_POPPLER" = true ]; then
    echo "📄 Extracting text from PDF using Poppler..."
    pdftotext "$RESUME" "$TMP_RESUME" || { echo "❌ PDF extraction failed"; exit 1; }
  elif [ -n "$TIKA_URL" ]; then
    echo "📄 Extracting text from PDF using Tika server: $TIKA_URL"
    extract_with_tika_server "$RESUME" "$TMP_RESUME" || { echo "❌ PDF extraction failed"; exit 1; }
  else
    echo "📄 Extracting text from PDF using Tika..."
    tika -t "$RESUME" 2>/dev/null > "$TMP_RESUME" || { echo "❌ PDF extraction failed"; exit 1; }
  fi
elif [ "$EXT" = "docx" ]; then
  TMP_RESUME="$RESUME_DIR/${BASENAME}_${TIMESTAMP}.txt"
  if [ -n "$TIKA_URL" ]; then
    echo "📄 Extracting text from DOCX using Tika server: $TIKA_URL"
    extract_with_tika_server "$RESUME" "$TMP_RESUME" || { echo "❌ DOCX extraction failed"; exit 1; }
  else
    echo "📄 Extracting text from DOCX using Tika..."
    tika -t "$RESUME" 2>/dev/null > "$TMP_RESUME" || { echo "❌ DOCX extraction failed"; exit 1; }
  fi
else
  echo "❌ Unsupported file format: $EXT"
  exit 1
fi

if [ ! -s "$TMP_RESUME" ]; then
  echo "❌ Extraction failed: Resulting file is empty"
  exit 1
fi

echo "✅ Extracted text saved to: $TMP_RESUME"

# 1b. Extract job description text
JD_EXT="${JD##*.}"

if [ "$JD_EXT" = "txt" ]; then
  echo "📄 Using existing job description text file..."
  TMP_JD="$JD"
elif [ "$JD_EXT" = "pdf" ]; then
  TMP_JD="$JD_DIR/${JD_BASENAME}_${TIMESTAMP}.txt"
  if [ "$USE_POPPLER" = true ]; then
    echo "📄 Extracting job description from PDF using Poppler..."
    pdftotext "$JD" "$TMP_JD" || { echo "❌ Job description PDF extraction failed"; exit 1; }
  elif [ -n "$TIKA_URL" ]; then
    echo "📄 Extracting job description from PDF using Tika server: $TIKA_URL"
    extract_with_tika_server "$JD" "$TMP_JD" || { echo "❌ Job description PDF extraction failed"; exit 1; }
  else
    echo "📄 Extracting job description from PDF using Tika..."
    tika -t "$JD" 2>/dev/null > "$TMP_JD" || { echo "❌ Job description PDF extraction failed"; exit 1; }
  fi
elif [ "$JD_EXT" = "docx" ]; then
  TMP_JD="$JD_DIR/${JD_BASENAME}_${TIMESTAMP}.txt"
  if [ -n "$TIKA_URL" ]; then
    echo "📄 Extracting job description from DOCX using Tika server: $TIKA_URL"
    extract_with_tika_server "$JD" "$TMP_JD" || { echo "❌ Job description DOCX extraction failed"; exit 1; }
  else
    echo "📄 Extracting job description from DOCX using Tika..."
    tika -t "$JD" 2>/dev/null > "$TMP_JD" || { echo "❌ Job description DOCX extraction failed"; exit 1; }
  fi
else
  echo "❌ Unsupported job description file format: $JD_EXT"
  exit 1
fi

if [ ! -s "$TMP_JD" ]; then
  echo "❌ Job description extraction failed: Resulting file is empty"
  exit 1
fi

echo "✅ Job description text ready: $TMP_JD"

# 2. Run Ollama with working prompt
PROMPT_FILE="$PROMPTS_DIR/cv-analyzer-default.yaml"
if [ -n "$PROMPT_OVERRIDE" ]; then
  if [ -f "$PROMPT_OVERRIDE" ]; then
    PROMPT_FILE="$PROMPT_OVERRIDE"
  elif [ -f "$PROMPTS_DIR/$PROMPT_OVERRIDE" ]; then
    PROMPT_FILE="$PROMPTS_DIR/$PROMPT_OVERRIDE"
  else
    echo "❌ Prompt file not found: $PROMPT_OVERRIDE"
    exit 1
  fi
fi

if [ ! -f "$PROMPT_FILE" ]; then
  echo "❌ Prompt file not found: $PROMPT_FILE"
  exit 1
fi

OLLAMA_MODEL_NAME=$(yq -r '.model // ""' "$PROMPT_FILE")
OLLAMA_MODEL_TAG=$(yq -r '.tag // "latest"' "$PROMPT_FILE")
if [ -z "$OLLAMA_MODEL_NAME" ]; then
  echo "❌ Prompt file must define a model: $PROMPT_FILE"
  exit 1
fi

if [ -n "$MODEL_OVERRIDE" ]; then
  OLLAMA_MODEL_NAME="$MODEL_OVERRIDE"
fi
if [ -n "$MODEL_TAG_OVERRIDE" ]; then
  OLLAMA_MODEL_TAG="$MODEL_TAG_OVERRIDE"
fi

OLLAMA_MODEL="${OLLAMA_MODEL_NAME}:${OLLAMA_MODEL_TAG}"

echo "🤖 Running ATS analysis with model: $OLLAMA_MODEL"

PROMPT_TEMPLATE=$(yq -r '.prompt' "$PROMPT_FILE")
RES_CONTENT=$(cat "$TMP_RESUME")
JD_CONTENT=$(cat "$TMP_JD")

PROMPT=$(jq -rn \
  --arg resume "$RES_CONTENT" \
  --arg jd "$JD_CONTENT" \
  --arg template "$PROMPT_TEMPLATE" \
  '$template | gsub("{{RESUME}}"; $resume) | gsub("{{JD}}"; $jd)')

# Run Ollama
echo "--~--"
echo ""
if [ "$TEXT_ONLY" = true ]; then
  # Filter out the JSON part and only show the human-readable report
  run_ollama_prompt "$OLLAMA_MODEL" "$PROMPT" | awk '/^- Parsing clarity:/ {print_it=1} print_it'
else
  # Show full output including JSON
  run_ollama_prompt "$OLLAMA_MODEL" "$PROMPT"
fi
echo ""
echo "--~--"
echo "✅ ATS analysis completed."
