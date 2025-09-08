#!/bin/bash

# Dependencies:
# brew install tika poppler ollama-app jq
# ollama pull gpt-oss:latest
# ollama pull gemma3:latest
# ollama pull qwen3:latest

set -e

if [ "$#" -lt 3 ]; then
  echo "Usage: $0 [--poppler] <resume.pdf/docx> <job_description.txt> <model>"
  echo "Example: $0 resume.pdf job.txt gemma3"
  echo "Example with Poppler: $0 --poppler resume.pdf job.txt qwen3"
  echo "Available models: gemma3, qwen3, gpt-oss"
  exit 1
fi

USE_POPPLER=false
if [ "$1" = "--poppler" ]; then
  USE_POPPLER=true
  shift
fi

RESUME=$1
JD=$2
MODEL=$3

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BASENAME=$(basename "$RESUME")
TMP_RESUME="$SCRIPT_DIR/${BASENAME}_${TIMESTAMP}.txt"

# 1. Extract text
EXT="${RESUME##*.}"

if [ "$EXT" = "pdf" ]; then
  if [ "$USE_POPPLER" = true ]; then
    echo "📄 Extracting text from PDF using Poppler..."
    pdftotext "$RESUME" "$TMP_RESUME"
  else
    echo "📄 Extracting text from PDF using Tika..."
    tika -t "$RESUME" > "$TMP_RESUME"
  fi
elif [ "$EXT" = "docx" ]; then
  echo "📄 Extracting text from DOCX using Tika..."
  tika -t "$RESUME" > "$TMP_RESUME"
else
  echo "❌ Unsupported file format: $EXT"
  exit 1
fi

echo "✅ Extracted text saved to: $TMP_RESUME"

# 2. Run Ollama with working prompt
echo "🤖 Running ATS analysis with model: $MODEL"

if [[ "$MODEL" == "gpt-oss" ]]; then
  PROMPT=$(cat <<EOF
You are simulating a commercial Applicant Tracking System (ATS).
Analyze the resume and the job description.
Scores must be integers between 0 and 100.

### INPUTS
Resume text:
$(cat "$TMP_RESUME")

Job description:
$(cat "$JD")

### OUTPUT FORMAT
1. JSON report with keys:
{
  "parsing_clarity_score": 0-100,
  "keyword_match_score": 0-100,
  "formatting_safety_score": 0-100,
  "overall_score": 0-100,
  "weighted_overall_score": 0-100,
  "top_missing_keywords": ["kw1","kw2","kw3"],
  "technical_questions": ["q1","q2","q3","q4","q5","q6"],
  "cultural_questions": ["cq1","cq2","cq3"],
  "summary": "short 1-2 sentence overview"
}
2. Human-readable report in this format:
- Parsing clarity: Provide an analysis of whether the resume can be fully parsed by common ATS systems. Highlight any problematic areas.
- Keyword & skills match: Evaluate how well the resume matches the job description. List strong matches and missing critical keywords or skills.
- Formatting risks: Identify formatting elements (tables, columns, graphics, headers/footers) that may confuse ATS parsing.
- Improvement suggestions: Offer actionable advice to improve ATS readability and alignment.
- Suggested company questions: Provide 5-6 technical questions and 2-3 cultural questions that the candidate could ask the company.
Do not include any extra text.
EOF
)
else
  # Gemma3/Qwen3
  PROMPT=$(cat <<EOF
You are an ATS resume analyzer and company question generator.
Do NOT provide career advice or cover letter suggestions.
Respond exactly in the requested format.

### INPUTS
Resume text:
$(cat "$TMP_RESUME")

Job description:
$(cat "$JD")

### TASK
1. Analyze parsing clarity: can ATS parse it fully? Is anything missing?
2. Analyze keyword & skills match with the job description.
3. Identify formatting risks: tables, columns, graphics, headers/footers, etc.
4. Compute scores:
   - parsing_clarity_score (0-100)
   - keyword_match_score (0-100)
   - formatting_safety_score (0-100)
   - overall_score (0-100, model’s own overall assessment)
   - weighted_overall_score = 0.4*keyword_match + 0.3*parsing_clarity + 0.3*formatting_safety
5. List top missing keywords relevant to the job.
6. Generate 5-6 technical questions and 2-3 cultural questions for the company.
7. Provide a short 1-2 sentence summary.

### OUTPUT ORDER
1. First, output the JSON exactly as specified.
2. Then, output the human-readable report in the exact format below.
3. Do NOT add any other text outside these two outputs.

### OUTPUT FORMAT
1. JSON report with keys:
{
  "parsing_clarity_score": <0-100>,
  "keyword_match_score": <0-100>,
  "formatting_safety_score": <0-100>,
  "overall_score": <0-100>,
  "weighted_overall_score": <0-100>,
  "top_missing_keywords": ["kw1","kw2","kw3"],
  "technical_questions": ["q1","q2","q3","q4","q5","q6"],
  "cultural_questions": ["cq1","cq2","cq3"],
  "summary": "short 1-2 sentence overview"
}
2. Human-readable report in this format:
- Parsing clarity: Provide an analysis of whether the resume can be fully parsed by common ATS systems. Highlight any areas or sections that might be problematic.
- Keyword & skills match: Evaluate how well the resume matches the job description. List both strong matches and missing critical keywords or skills.
- Formatting risks: Identify any formatting elements (tables, columns, graphics, headers/footers) that may confuse ATS parsing.
- Improvement suggestions: Offer concrete, actionable advice to improve ATS readability and alignment with the job description.
- Suggested company questions: Provide 5-6 technical questions and 2-3 cultural questions that the candidate could ask the company based on the job description and company values.
EOF
)
fi

# Run Ollama
ollama run "$MODEL" <<< "$PROMPT"
echo "✅ ATS analysis completed."
