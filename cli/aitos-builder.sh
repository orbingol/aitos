#!/bin/bash

# aitos-builder.sh — CV builder from examples
#
# Given a data directory containing cv1.pdf/cv2.pdf/... and job1.txt/job2.txt/...
# pairs, and a separate target job description, this script asks an LLM to
# synthesise a new CV tailored to the target role.
#
# Optionally accepts a story file (--story) in plain text describing what the
# candidate did at each past job, how they delivered, and their achievements.
# Expected structure (repeat for each job):
#   Job A - Job description
#   Job A - How I delivered
#   Job A - My success stories
#
# Install prerequisites (same as aitos.sh):
#  * brew install ollama-app tika poppler jq yq
#
# Usage:
#  ./aitos-builder.sh [--poppler] [--story <story.txt>] [--prompt <prompt.yaml>] <data_dir> <target_job.txt/pdf/docx>
#
# Example:
#  ./aitos-builder.sh ./data target_job.txt
#  ./aitos-builder.sh ./data target_job.pdf
#  ./aitos-builder.sh --story story.txt ./data target_job.txt
#  ./aitos-builder.sh --prompt my-prompt.yaml --story story.txt ./data target_job.txt
#  ./aitos-builder.sh --poppler --prompt my-prompt.yaml ./data target_job.txt

set -e
set -o pipefail

USE_POPPLER=false
STORY_FILE=""
PROMPT_OVERRIDE=""

while [[ "$1" == --* ]]; do
  case "$1" in
    --poppler)
      USE_POPPLER=true
      shift
      ;;
    --story)
      STORY_FILE="$2"
      shift 2
      ;;
    --prompt)
      PROMPT_OVERRIDE="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 [--poppler] [--story <story.txt>] [--prompt <prompt.yaml>] <data_dir> <target_job.txt/pdf/docx>"
  echo "Example: $0 ./data target_job.txt"
  echo "Example with PDF target job: $0 ./data target_job.pdf"
  echo "Example with story: $0 --story story.txt ./data target_job.txt"
  echo "Example with custom prompt: $0 --prompt my-prompt.yaml ./data target_job.txt"
  echo ""
  echo "data_dir must contain pairs: cv1.* + job1.*, cv2.* + job2.*, ..."
  echo "CV and job files may be .pdf, .docx, or .txt"
  echo "Default prompt: cv-builder.yaml (model and tag configured inside the YAML)"
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
      else
        tika -t "$src" 2>/dev/null > "$dest" || { echo "❌ PDF extraction failed for $src"; exit 1; }
      fi
      ;;
    docx)
      tika -t "$src" 2>/dev/null > "$dest" || { echo "❌ DOCX extraction failed for $src"; exit 1; }
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
      else
        tika -t "$src" 2>/dev/null > "$dest" || { echo "❌ Target job PDF extraction failed for $src"; exit 1; }
      fi
      ;;
    docx)
      tika -t "$src" 2>/dev/null > "$dest" || { echo "❌ Target job DOCX extraction failed for $src"; exit 1; }
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
  # Accept absolute path, path relative to cwd, or bare filename resolved in prompts/
  if [ -f "$PROMPT_OVERRIDE" ]; then
    PROMPT_FILE="$(cd "$(dirname "$PROMPT_OVERRIDE")" && pwd)/$(basename "$PROMPT_OVERRIDE")"
  elif [ -f "$SCRIPT_DIR/prompts/$PROMPT_OVERRIDE" ]; then
    PROMPT_FILE="$SCRIPT_DIR/prompts/$PROMPT_OVERRIDE"
  else
    echo "❌ Prompt file not found: $PROMPT_OVERRIDE"
    exit 1
  fi
else
  PROMPT_FILE="$SCRIPT_DIR/prompts/cv-builder.yaml"
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

ollama run "$OLLAMA_MODEL" <<< "$PROMPT" | sanitize_output_stream | tee "$OUTPUT_FILE"

echo ""
echo "--~--"
echo "✅ CV generation completed."
echo "📝 Output saved to: $OUTPUT_FILE"
