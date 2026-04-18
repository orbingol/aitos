#!/bin/bash

# SPDX-License-Identifier: MIT
# Copyright (c) 2025-2026 Onur Rauf Bingol
# See LICENSE in the project root for full license text.

# aitos-builder.sh — Builds a CV for a target job description using the provided user data.
#
# Given a data directory containing cv1.pdf/cv2.pdf/... and job1.txt/job2.txt/...
# pairs, and a separate target job description, this script asks an LLM to
# synthesise a new CV tailored to the target role.
#
# Optionally accepts a story file (--story) in plain text. This can be used to provide
# additional context or instructions to the model, which may be relevant for CV tailoring.
#
# Install prerequisites:
#  * brew install ollama-app tika poppler jq yq
#  * or check your OS package manager for installation of the above tools
#
# Usage:
#  ./aitos-builder.sh [--poppler] [--story <story.txt>] [--prompt <prompt.yaml>] <data_dir> <target_job.txt/pdf/docx>
#
# Arguments:
#  <data_dir>                         Directory containing example pairs: cv1.* + job1.*, cv2.* + job2.*, ...
#  <target_job.txt/pdf/docx>          Target job description file used to generate the tailored CV.
#
# Options:
#  --poppler                          Use Poppler (pdftotext) for PDF extraction instead of Tika.
#  --story <story.txt>                Optional story/context file injected into the prompt.
#  --prompt <prompt.yaml>             Override default prompt file (default: prompts/cv-builder-default.yaml).
#  --model <name[:tag]>               Override model from prompt file (tag optional; defaults to latest).
#  --tika-url <url>                   Use Apache Tika server URL for extraction (instead of local tika binary).
#  --ollama-url <url>                 Use Ollama server URL (instead of local ollama binary).
#
# Examples:
#  ./aitos-builder.sh ./data target_job.txt
#  ./aitos-builder.sh ./data target_job.pdf
#  ./aitos-builder.sh --story story.txt ./data target_job.txt
#  ./aitos-builder.sh --prompt my-prompt.yaml --story story.txt ./data target_job.txt
#  ./aitos-builder.sh --model qwen3:8b ./data target_job.txt
#  ./aitos-builder.sh --model qwen3 ./data target_job.txt
#  ./aitos-builder.sh --poppler --prompt my-prompt.yaml ./data target_job.txt
#  ./aitos-builder.sh --tika-url http://localhost:9998 --ollama-url http://localhost:11434 ./data target_job.txt
#
# Build a container image and run (optional):
#  * docker build --target builder -t aitos-builder -f docker/Dockerfile .
#  * docker run -v $(pwd):/data aitos-builder /data /data/target_job.txt

set -e
set -o pipefail

USE_POPPLER=false
STORY_FILE=""
PROMPT_OVERRIDE=""
MODEL_OVERRIDE=""
TIKA_URL=""
OLLAMA_URL=""
AITOS_VERSION="${AITOS_VERSION:-dev}"

print_usage() {
  cat <<EOF
Usage: $0 [--poppler] [--story <story.txt>] [--prompt <prompt.yaml>] [--model <name[:tag]>] <data_dir> <target_job.txt/pdf/docx>
Example: $0 ./data target_job.txt
Example with PDF target job: $0 ./data target_job.pdf
Example with story: $0 --story story.txt ./data target_job.txt
Example with custom prompt: $0 --prompt cv-builder-default.yaml ./data target_job.txt
Example with model override: $0 --model qwen3:8b ./data target_job.txt
Example with model override (default latest tag): $0 --model qwen3 ./data target_job.txt
Example with remote services: $0 --tika-url http://localhost:9998 --ollama-url http://localhost:11434 ./data target_job.txt

data_dir must contain pairs: cv1.* + job1.*, cv2.* + job2.*, ...
CV and job files may be .pdf, .docx, or .txt
Default prompt: cv-builder-default.yaml
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
    --story)
      if [ -z "$2" ]; then
        echo "❌ Missing value for --story"
        exit 1
      fi
      STORY_FILE="$2"
      shift 2
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

if [ "$#" -lt 2 ]; then
  print_usage
  exit 1
fi

if [ -n "$STORY_FILE" ] && [ ! -f "$STORY_FILE" ]; then
  echo "❌ Story file not found: $STORY_FILE"
  exit 1
fi

DATA_DIR=$1
TARGET_JD=$2

if [ ! -d "$DATA_DIR" ]; then
  echo "❌ Data directory not found: $DATA_DIR"
  exit 1
fi

if [ ! -f "$TARGET_JD" ]; then
  echo "❌ Target job description file not found: $TARGET_JD"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROMPTS_DIR="${AITOS_PROMPTS_DIR:-$SCRIPT_DIR/prompts}"
DATA_DIR="$(cd "$DATA_DIR" && pwd)"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

# ── helpers ──────────────────────────────────────────────────────────────────

extract_cv() {
  local src="$1"
  local dest="$2"
  local ext="${src##*.}"

  case "$ext" in
    txt)
      cp "$src" "$dest"
      ;;
    pdf)
      if [ "$USE_POPPLER" = true ]; then
        pdftotext "$src" "$dest" || { echo "❌ PDF extraction failed for $src"; exit 1; }
      elif [ -n "$TIKA_URL" ]; then
        extract_with_tika_server "$src" "$dest" || { echo "❌ PDF extraction failed for $src"; exit 1; }
      else
        tika -t "$src" 2>/dev/null > "$dest" || { echo "❌ PDF extraction failed for $src"; exit 1; }
      fi
      ;;
    docx)
      if [ -n "$TIKA_URL" ]; then
        extract_with_tika_server "$src" "$dest" || { echo "❌ DOCX extraction failed for $src"; exit 1; }
      else
        tika -t "$src" 2>/dev/null > "$dest" || { echo "❌ DOCX extraction failed for $src"; exit 1; }
      fi
      ;;
    *)
      echo "❌ Unsupported CV format: $src"
      exit 1
      ;;
  esac

  if [ ! -s "$dest" ]; then
    echo "❌ Extraction produced an empty file for: $src"
    exit 1
  fi
}

extract_job_description() {
  local src="$1"
  local dest="$2"
  local ext="${src##*.}"

  case "$ext" in
    txt)
      cp "$src" "$dest"
      ;;
    pdf)
      if [ "$USE_POPPLER" = true ]; then
        pdftotext "$src" "$dest" || { echo "❌ Target job PDF extraction failed for $src"; exit 1; }
      elif [ -n "$TIKA_URL" ]; then
        extract_with_tika_server "$src" "$dest" || { echo "❌ Target job PDF extraction failed for $src"; exit 1; }
      else
        tika -t "$src" 2>/dev/null > "$dest" || { echo "❌ Target job PDF extraction failed for $src"; exit 1; }
      fi
      ;;
    docx)
      if [ -n "$TIKA_URL" ]; then
        extract_with_tika_server "$src" "$dest" || { echo "❌ Target job DOCX extraction failed for $src"; exit 1; }
      else
        tika -t "$src" 2>/dev/null > "$dest" || { echo "❌ Target job DOCX extraction failed for $src"; exit 1; }
      fi
      ;;
    *)
      echo "❌ Unsupported target job format: $src"
      echo "   Supported formats: .txt, .pdf, .docx"
      exit 1
      ;;
  esac

  if [ ! -s "$dest" ]; then
    echo "❌ Target job extraction produced an empty file for: $src"
    exit 1
  fi
}

sanitize_output_stream() {
  # Clean streamed model output and merge visually wrapped / overlap-duplicated lines.
  perl -ne '
    s/\r$//;
    s/\e\[[0-9;?]*[ -\/]*[@-~]//g;
    chomp;
    my $line = $_;

    if (!defined $prev) {
      $prev = $line;
      next;
    }

    if ($line =~ /^\s*$/) {
      print "$prev\n\n";
      undef $prev;
      next;
    }

    my $max = length($prev) < length($line) ? length($prev) : length($line);
    my $overlap = 0;
    for (my $k = $max; $k >= 4; $k--) {
      if (substr($prev, -$k) eq substr($line, 0, $k)) {
        $overlap = $k;
        last;
      }
    }

    if ($overlap > 0) {
      $prev .= substr($line, $overlap);
      next;
    }

    my $line_new_block = ($line =~ /^\s*[-*]\s/ || $line =~ /^\s*###/);
    my $prev_complete = ($prev =~ /[.!?:;]$/);

    if (!$line_new_block && !$prev_complete) {
      $line =~ s/^\s+//;
      $prev .= " " . $line;
      next;
    }

    print "$prev\n";
    $prev = $line;
    END {
      print "$prev\n" if defined $prev;
    }
  '
}

# ── collect CV+job pairs from data_dir ───────────────────────────────────────

EXAMPLES=""
PAIR_COUNT=0

for i in $(seq 1 999); do
  JOB_FILE=""
  for ext in txt pdf docx; do
    candidate="$DATA_DIR/job${i}.${ext}"
    if [ -f "$candidate" ]; then
      JOB_FILE="$candidate"
      break
    fi
  done

  [ -n "$JOB_FILE" ] || break   # stop at the first gap

  CV_FILE=""
  for ext in pdf docx txt; do
    candidate="$DATA_DIR/cv${i}.${ext}"
    if [ -f "$candidate" ]; then
      CV_FILE="$candidate"
      break
    fi
  done

  if [ -z "$CV_FILE" ]; then
    echo "⚠️  $(basename "$JOB_FILE") found but no matching cv${i}.pdf/docx/txt — skipping"
    continue
  fi

  echo "📄 Extracting CV $i: $(basename "$CV_FILE")"
  TMP_CV="$TMP_DIR/cv${i}.txt"
  extract_cv "$CV_FILE" "$TMP_CV"

  echo "📄 Extracting Job $i: $(basename "$JOB_FILE")"
  TMP_JOB="$TMP_DIR/job${i}.txt"
  extract_job_description "$JOB_FILE" "$TMP_JOB"

  CV_TEXT=$(cat "$TMP_CV")
  JOB_TEXT=$(cat "$TMP_JOB")

  EXAMPLES="${EXAMPLES}
=== EXAMPLE ${i} ===

-- CV ${i} --
${CV_TEXT}

-- JOB ${i} --
${JOB_TEXT}

"
  PAIR_COUNT=$((PAIR_COUNT + 1))
done

if [ "$PAIR_COUNT" -eq 0 ]; then
  echo "❌ No cv+job pairs found in: $DATA_DIR"
  echo "   Expected files: cv1.(pdf|docx|txt) + job1.(pdf|docx|txt), cv2.* + job2.*, ..."
  exit 1
fi

echo "✅ Loaded $PAIR_COUNT CV+job pair(s)"

# ── load prompt template ──────────────────────────────────────────────────────

if [ -n "$PROMPT_OVERRIDE" ]; then
  # Accept absolute path, path relative to cwd, or bare filename resolved in the bundled prompt directory.
  if [ -f "$PROMPT_OVERRIDE" ]; then
    PROMPT_FILE="$(cd "$(dirname "$PROMPT_OVERRIDE")" && pwd)/$(basename "$PROMPT_OVERRIDE")"
  elif [ -f "$PROMPTS_DIR/$PROMPT_OVERRIDE" ]; then
    PROMPT_FILE="$PROMPTS_DIR/$PROMPT_OVERRIDE"
  else
    echo "❌ Prompt file not found: $PROMPT_OVERRIDE"
    exit 1
  fi
else
  PROMPT_FILE="$PROMPTS_DIR/cv-builder-default.yaml"
fi

if [ ! -f "$PROMPT_FILE" ]; then
  echo "❌ Prompt file not found: $PROMPT_FILE"
  exit 1
fi

echo "📋 Using prompt: $PROMPT_FILE"

OLLAMA_MODEL_NAME=$(yq -r '.model' "$PROMPT_FILE")
OLLAMA_MODEL_TAG=$(yq -r '.tag // "latest"' "$PROMPT_FILE")
if [ -z "$OLLAMA_MODEL_NAME" ] || [ "$OLLAMA_MODEL_NAME" = "null" ]; then
  echo "❌ 'model' field is missing in prompt file: $PROMPT_FILE"
  exit 1
fi

if [ -n "$MODEL_OVERRIDE" ]; then
  if [[ "$MODEL_OVERRIDE" == *:* ]]; then
    OLLAMA_MODEL_NAME="${MODEL_OVERRIDE%%:*}"
    OLLAMA_MODEL_TAG="${MODEL_OVERRIDE#*:}"
    if [ -z "$OLLAMA_MODEL_TAG" ]; then
      OLLAMA_MODEL_TAG="latest"
      echo "ℹ️  --model provided without a tag value; using tag: latest"
    fi
  else
    OLLAMA_MODEL_NAME="$MODEL_OVERRIDE"
    OLLAMA_MODEL_TAG="latest"
    echo "ℹ️  --model provided without a tag; using tag: latest"
  fi

  if [ -z "$OLLAMA_MODEL_NAME" ]; then
    echo "❌ --model must include a model name, e.g. qwen3 or qwen3:8b"
    exit 1
  fi
fi

OLLAMA_MODEL="${OLLAMA_MODEL_NAME}:${OLLAMA_MODEL_TAG}"

PROMPT_TEMPLATE=$(yq -r '.prompt' "$PROMPT_FILE")
TARGET_JD_TEXT="$TMP_DIR/target_job.txt"
echo "📄 Extracting target job description: $(basename "$TARGET_JD")"
extract_job_description "$TARGET_JD" "$TARGET_JD_TEXT"
TARGET_JD_CONTENT=$(cat "$TARGET_JD_TEXT")

if [ -n "$STORY_FILE" ]; then
  STORY_CONTENT=$(cat "$STORY_FILE")
  echo "📖 Story file loaded: $STORY_FILE"
else
  STORY_CONTENT=""
fi

PROMPT=$(jq -rn \
  --arg examples "$EXAMPLES" \
  --arg target_jd "$TARGET_JD_CONTENT" \
  --arg story "$STORY_CONTENT" \
  --arg template "$PROMPT_TEMPLATE" \
  '$template | gsub("{{EXAMPLES}}"; $examples) | gsub("{{TARGET_JD}}"; $target_jd) | gsub("{{STORY}}"; $story)')

# ── run Ollama ────────────────────────────────────────────────────────────────

OUTPUT_FILE="$(pwd)/cv_output_${TIMESTAMP}.txt"

echo "🤖 Generating CV with model: $OLLAMA_MODEL"
echo "--~--"
echo ""

run_ollama_prompt "$OLLAMA_MODEL" "$PROMPT" | sanitize_output_stream | tee "$OUTPUT_FILE"

echo ""
echo "--~--"
echo "✅ CV generation completed."
echo "📝 Output saved to: $OUTPUT_FILE"
