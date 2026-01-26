#!/bin/bash

# Install Ollama:
#  * brew install ollama-app
#  * or visit https://ollama.com/download
#
# Download models:
#  * ollama pull gpt-oss:latest
#  * ollama pull gemma3:latest
#  * ollama pull qwen3:latest
#
# Use script on your local machine:
#  * brew install tika poppler jq yq
#  * or check your OS package manager for installation of the above tools
#
# Build a container image and run (optional):
#  * docker build -t aitos -f docker/Dockerfile .
#  * docker run -v $(pwd):/data aitos /data/resume.pdf /data/job.txt gemma3

set -e
set -o pipefail

if [ "$#" -lt 3 ]; then
  echo "Usage: $0 [--poppler] [--text-only] <resume.pdf/docx> <job_description.txt> <model>"
  echo "Example: $0 resume.pdf job.txt gemma3"
  echo "Example with Poppler and Text-only: $0 --poppler --text-only resume.pdf job.txt qwen3"
  echo "Available models: gemma3, qwen3, gpt-oss"
  exit 1
fi

USE_POPPLER=false
TEXT_ONLY=false

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
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

RESUME=$1
JD=$2
MODEL=$3

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RESUME_DIR="$(cd "$(dirname "$RESUME")" && pwd)"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BASENAME=$(basename "$RESUME")

# 1. Extract text
EXT="${RESUME##*.}"

if [ "$EXT" = "txt" ]; then
  echo "📄 Using existing text file..."
  TMP_RESUME="$RESUME"
elif [ "$EXT" = "pdf" ]; then
  TMP_RESUME="$RESUME_DIR/${BASENAME}_${TIMESTAMP}.txt"
  if [ "$USE_POPPLER" = true ]; then
    echo "📄 Extracting text from PDF using Poppler..."
    pdftotext "$RESUME" "$TMP_RESUME"
  else
    echo "📄 Extracting text from PDF using Tika..."
    tika -t "$RESUME" 2>/dev/null > "$TMP_RESUME"
  fi
elif [ "$EXT" = "docx" ]; then
  TMP_RESUME="$RESUME_DIR/${BASENAME}_${TIMESTAMP}.txt"
  echo "📄 Extracting text from DOCX using Tika..."
  tika -t "$RESUME" 2>/dev/null > "$TMP_RESUME"
else
  echo "❌ Unsupported file format: $EXT"
  exit 1
fi

echo "✅ Extracted text saved to: $TMP_RESUME"

# 2. Run Ollama with working prompt
echo "🤖 Running ATS analysis with model: $MODEL"

PROMPT_FILE="$SCRIPT_DIR/prompts/$MODEL.yaml"
if [ ! -f "$PROMPT_FILE" ]; then
  echo "❌ Prompt file not found: $PROMPT_FILE"
  exit 1
fi

PROMPT_TEMPLATE=$(yq -r '.prompt' "$PROMPT_FILE")
RES_CONTENT=$(cat "$TMP_RESUME")
JD_CONTENT=$(cat "$JD")

PROMPT=$(jq -rn \
  --arg resume "$RES_CONTENT" \
  --arg jd "$JD_CONTENT" \
  --arg template "$PROMPT_TEMPLATE" \
  '$template | sub("\\{\\{RESUME\\}\\}"; $resume) | sub("\\{\\{JD\\}\\}"; $jd)')

# Run Ollama
echo "--~--"
echo ""
if [ "$TEXT_ONLY" = true ]; then
  # Filter out the JSON part and only show the human-readable report
  ollama run "$MODEL" <<< "$PROMPT" | awk '/^- Parsing clarity:/ {print_it=1} print_it'
else
  # Show full output including JSON
  ollama run "$MODEL" <<< "$PROMPT"
fi
echo ""
echo "--~--"
echo "✅ ATS analysis completed."
