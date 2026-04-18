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
#
# Examples:
#  ./aitos-analyzer.sh resume.pdf job.txt
#  ./aitos-analyzer.sh --text-only resume.pdf job.pdf
#  ./aitos-analyzer.sh --prompt prompts/cv-analyzer-qwen.yaml resume.pdf job.docx
#  ./aitos-analyzer.sh --poppler resume.pdf job.pdf
#
# Build a container image and run (optional):
#  * docker build --target analyzer -t aitos-analyzer -f docker/Dockerfile .
#  * docker run -v $(pwd):/data aitos-analyzer /data/resume.pdf /data/job.txt

set -e
set -o pipefail

USE_POPPLER=false
TEXT_ONLY=false
PROMPT_OVERRIDE=""
AITOS_VERSION="${AITOS_VERSION:-dev}"

print_usage() {
  cat <<EOF
Usage: $0 [--poppler] [--text-only] [--prompt <yaml-file>] <resume.pdf/docx/txt> <job_description.pdf/docx/txt>
Example: $0 resume.pdf job.txt
Example with custom prompt: $0 --prompt cv-analyzer-qwen.yaml resume.pdf job.txt
Default prompt: cv-analyzer-default.yaml
EOF
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
  else
    echo "📄 Extracting text from PDF using Tika..."
    tika -t "$RESUME" 2>/dev/null > "$TMP_RESUME" || { echo "❌ PDF extraction failed"; exit 1; }
  fi
elif [ "$EXT" = "docx" ]; then
  TMP_RESUME="$RESUME_DIR/${BASENAME}_${TIMESTAMP}.txt"
  echo "📄 Extracting text from DOCX using Tika..."
  tika -t "$RESUME" 2>/dev/null > "$TMP_RESUME" || { echo "❌ DOCX extraction failed"; exit 1; }
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
  else
    echo "📄 Extracting job description from PDF using Tika..."
    tika -t "$JD" 2>/dev/null > "$TMP_JD" || { echo "❌ Job description PDF extraction failed"; exit 1; }
  fi
elif [ "$JD_EXT" = "docx" ]; then
  TMP_JD="$JD_DIR/${JD_BASENAME}_${TIMESTAMP}.txt"
  echo "📄 Extracting job description from DOCX using Tika..."
  tika -t "$JD" 2>/dev/null > "$TMP_JD" || { echo "❌ Job description DOCX extraction failed"; exit 1; }
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
  ollama run "$OLLAMA_MODEL" <<< "$PROMPT" | awk '/^- Parsing clarity:/ {print_it=1} print_it'
else
  # Show full output including JSON
  ollama run "$OLLAMA_MODEL" <<< "$PROMPT"
fi
echo ""
echo "--~--"
echo "✅ ATS analysis completed."
