#!/bin/bash
set -e
set -o pipefail

# AiToS CLI Test Runner
# This script runs success and failure tests for aitos-analyzer.sh and
# aitos-builder.sh by mocking the ollama binary.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLI_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
FIXTURES_DIR="$SCRIPT_DIR/fixtures"
MOCK_BIN_DIR="$SCRIPT_DIR/mock_bin"
TEST_WORK_DIR="$SCRIPT_DIR/test_work"
OUTPUT_DIR="$SCRIPT_DIR/test_output"

mkdir -p "$MOCK_BIN_DIR" "$TEST_WORK_DIR" "$OUTPUT_DIR"
cd "$SCRIPT_DIR"

pass() {
    echo "✅ $1 Passed"
}

fail() {
    echo "❌ $1 Failed: $2"
    exit 1
}

assert_contains() {
    local test_name="$1"
    local file_path="$2"
    local pattern="$3"

    if ! grep -q -- "$pattern" "$file_path"; then
        echo "--- Output for $test_name ---"
        cat "$file_path"
        fail "$test_name" "output missing expected pattern: $pattern"
    fi
}

assert_not_contains() {
    local test_name="$1"
    local file_path="$2"
    local pattern="$3"

    if grep -q -- "$pattern" "$file_path"; then
        echo "--- Output for $test_name ---"
        cat "$file_path"
        fail "$test_name" "output unexpectedly contained pattern: $pattern"
    fi
}

run_expect_success() {
    local test_name="$1"
    local output_file="$2"
    shift 2

    echo "Running $test_name..."
    if "$@" > "$output_file" 2>&1; then
        pass "$test_name"
    else
        echo "--- Output for $test_name ---"
        cat "$output_file"
        fail "$test_name" "command exited with failure"
    fi
}

run_expect_failure() {
    local test_name="$1"
    local expected_pattern="$2"
    local output_file="$3"
    shift 3

    echo "Running $test_name..."
    if "$@" > "$output_file" 2>&1; then
        echo "--- Output for $test_name ---"
        cat "$output_file"
        fail "$test_name" "command unexpectedly succeeded"
    fi

    if [ -n "$expected_pattern" ]; then
        assert_contains "$test_name" "$output_file" "$expected_pattern"
    fi

    pass "$test_name"
}

cat <<'EOF' > "$MOCK_BIN_DIR/ollama"
#!/bin/bash
INPUT=$(cat)
if [ -z "$INPUT" ]; then
    echo "Error: Empty prompt received via stdin" >&2
    exit 1
fi

if [ "$1" = "run" ]; then
    if [[ "$2" == fail-model* ]]; then
        echo "Error: simulated failure" >&2
        exit 1
    fi

    echo '{"status": "success"}'
    echo ""
    echo "- Parsing clarity: High - The resume is well-structured."
    echo "- Keyword & skills match: Strong match for Python and Docker."
    echo "- Formatting risks: None detected."
    echo "- Improvement suggestions: Add more metrics."
    echo "- Suggested company questions: What is the team size?"
    echo "Generated CV output body."
fi
EOF
chmod +x "$MOCK_BIN_DIR/ollama"

cat <<'EOF' > "$MOCK_BIN_DIR/tika"
#!/bin/bash
if [ "$1" = "-t" ]; then
    INPUT_FILE="$2"
else
    INPUT_FILE="$1"
fi

if [ ! -f "$INPUT_FILE" ]; then
    echo "tika: file not found: $INPUT_FILE" >&2
    exit 1
fi

if grep -q "__EXTRACT_FAIL__" "$INPUT_FILE"; then
    echo "tika: simulated extraction failure" >&2
    exit 1
fi

if grep -q "__EMPTY__" "$INPUT_FILE"; then
    exit 0
fi

cat "$INPUT_FILE"
EOF
chmod +x "$MOCK_BIN_DIR/tika"

cat <<'EOF' > "$MOCK_BIN_DIR/pdftotext"
#!/bin/bash
SRC="$1"
DST="$2"

if [ ! -f "$SRC" ]; then
    echo "pdftotext: file not found: $SRC" >&2
    exit 1
fi

if grep -q "__EXTRACT_FAIL__" "$SRC"; then
    echo "pdftotext: simulated extraction failure" >&2
    exit 1
fi

if grep -q "__EMPTY__" "$SRC"; then
    : > "$DST"
    exit 0
fi

cat "$SRC" > "$DST"
EOF
chmod +x "$MOCK_BIN_DIR/pdftotext"

mkdir -p "$CLI_DIR/prompts"
cp "$SCRIPT_DIR/test-model.yaml" "$CLI_DIR/prompts/test-model.yaml"
sed 's/^model: test-model$/model: fail-model/' "$SCRIPT_DIR/test-model.yaml" > "$CLI_DIR/prompts/fail-model.yaml"

cat <<'EOF' > "$CLI_DIR/prompts/invalid-analyzer-model.yaml"
last_update: "2026-04-06T00:00:00Z"
prompt: |
  Missing model field for analyzer tests.
EOF

cat <<'EOF' > "$CLI_DIR/prompts/test-builder.yaml"
last_update: "2026-04-06T00:00:00Z"
model: test-builder
tag: latest
prompt: |
  BUILD TEST
  Examples: {{EXAMPLES}}
  Target: {{TARGET_JD}}
  Story: {{STORY}}
EOF

cat <<'EOF' > "$CLI_DIR/prompts/fail-builder.yaml"
last_update: "2026-04-06T00:00:00Z"
model: fail-model
tag: latest
prompt: |
  BUILD FAILURE TEST
  Examples: {{EXAMPLES}}
  Target: {{TARGET_JD}}
  Story: {{STORY}}
EOF

cat <<'EOF' > "$CLI_DIR/prompts/invalid-builder-model.yaml"
last_update: "2026-04-06T00:00:00Z"
prompt: |
  BUILD INVALID MODEL TEST
  Examples: {{EXAMPLES}}
  Target: {{TARGET_JD}}
  Story: {{STORY}}
EOF

mkdir -p "$TEST_WORK_DIR/builder-data" "$TEST_WORK_DIR/empty-data"
cp "$FIXTURES_DIR/resume.txt" "$TEST_WORK_DIR/builder-data/cv1.txt"
cp "$FIXTURES_DIR/job.txt" "$TEST_WORK_DIR/builder-data/job1.txt"
cp "$FIXTURES_DIR/job.txt" "$TEST_WORK_DIR/target-job.txt"
cp "$FIXTURES_DIR/job.txt" "$TEST_WORK_DIR/builder-story.txt"
printf '' > "$TEST_WORK_DIR/empty.txt"
cp "$FIXTURES_DIR/resume.txt" "$TEST_WORK_DIR/resume.unsupported"
cp "$FIXTURES_DIR/job.txt" "$TEST_WORK_DIR/target.unsupported"
cp "$FIXTURES_DIR/job.txt" "$TEST_WORK_DIR/job.pdf"
cp "$FIXTURES_DIR/job.txt" "$TEST_WORK_DIR/job.docx"
cp "$FIXTURES_DIR/job.txt" "$TEST_WORK_DIR/job_empty.pdf"
echo "__EMPTY__" >> "$TEST_WORK_DIR/job_empty.pdf"
cp "$FIXTURES_DIR/job.txt" "$TEST_WORK_DIR/job_extract_fail.pdf"
echo "__EXTRACT_FAIL__" >> "$TEST_WORK_DIR/job_extract_fail.pdf"

cleanup() {
    rm -f "$FIXTURES_DIR"/*.pdf "$FIXTURES_DIR"/*.txt_*
    rm -rf "$MOCK_BIN_DIR" "$TEST_WORK_DIR" "$OUTPUT_DIR"
    rm -f "$CLI_DIR/prompts/test-model.yaml"
    rm -f "$CLI_DIR/prompts/fail-model.yaml"
    rm -f "$CLI_DIR/prompts/invalid-analyzer-model.yaml"
    rm -f "$CLI_DIR/prompts/test-builder.yaml"
    rm -f "$CLI_DIR/prompts/fail-builder.yaml"
    rm -f "$CLI_DIR/prompts/invalid-builder-model.yaml"
    rm -f "$SCRIPT_DIR"/cv_output_*.txt
}
trap cleanup EXIT

export PATH="$MOCK_BIN_DIR:$PATH"

run_expect_success "Test 1: Analyzer default prompt" "$OUTPUT_DIR/test1.txt" \
    "$CLI_DIR/aitos-analyzer.sh" "$FIXTURES_DIR/resume.txt" "$FIXTURES_DIR/job.txt"
assert_contains "Test 1: Analyzer default prompt" "$OUTPUT_DIR/test1.txt" "status"
assert_contains "Test 1: Analyzer default prompt" "$OUTPUT_DIR/test1.txt" "Parsing clarity"

run_expect_success "Test 2: Analyzer text-only custom prompt" "$OUTPUT_DIR/test2.txt" \
    "$CLI_DIR/aitos-analyzer.sh" --text-only --prompt test-model.yaml "$FIXTURES_DIR/resume.txt" "$FIXTURES_DIR/job.txt"
assert_contains "Test 2: Analyzer text-only custom prompt" "$OUTPUT_DIR/test2.txt" "Parsing clarity"
assert_not_contains "Test 2: Analyzer text-only custom prompt" "$OUTPUT_DIR/test2.txt" "status"

run_expect_success "Test 3: Analyzer absolute prompt path" "$OUTPUT_DIR/test3.txt" \
    "$CLI_DIR/aitos-analyzer.sh" --prompt "$CLI_DIR/prompts/test-model.yaml" "$FIXTURES_DIR/resume.txt" "$FIXTURES_DIR/job.txt"
assert_contains "Test 3: Analyzer absolute prompt path" "$OUTPUT_DIR/test3.txt" "status"

run_expect_success "Test 3b: Analyzer job description PDF" "$OUTPUT_DIR/test3b.txt" \
    "$CLI_DIR/aitos-analyzer.sh" "$FIXTURES_DIR/resume.txt" "$TEST_WORK_DIR/job.pdf"
assert_contains "Test 3b: Analyzer job description PDF" "$OUTPUT_DIR/test3b.txt" "status"

run_expect_success "Test 3c: Analyzer job description DOCX" "$OUTPUT_DIR/test3c.txt" \
    "$CLI_DIR/aitos-analyzer.sh" "$FIXTURES_DIR/resume.txt" "$TEST_WORK_DIR/job.docx"
assert_contains "Test 3c: Analyzer job description DOCX" "$OUTPUT_DIR/test3c.txt" "status"

run_expect_success "Test 3d: Analyzer job description PDF with Poppler" "$OUTPUT_DIR/test3d.txt" \
    "$CLI_DIR/aitos-analyzer.sh" --poppler "$FIXTURES_DIR/resume.txt" "$TEST_WORK_DIR/job.pdf"
assert_contains "Test 3d: Analyzer job description PDF with Poppler" "$OUTPUT_DIR/test3d.txt" "status"

run_expect_failure "Test 4: Analyzer ollama failure" "simulated failure" "$OUTPUT_DIR/test4.txt" \
    "$CLI_DIR/aitos-analyzer.sh" --prompt fail-model.yaml "$FIXTURES_DIR/resume.txt" "$FIXTURES_DIR/job.txt"

run_expect_failure "Test 5: Analyzer missing prompt value" "Missing value for --prompt" "$OUTPUT_DIR/test5.txt" \
    "$CLI_DIR/aitos-analyzer.sh" --prompt

run_expect_failure "Test 6: Analyzer unknown option" "Unknown option" "$OUTPUT_DIR/test6.txt" \
    "$CLI_DIR/aitos-analyzer.sh" --bogus "$FIXTURES_DIR/resume.txt" "$FIXTURES_DIR/job.txt"

run_expect_failure "Test 7: Analyzer missing args" "Usage:" "$OUTPUT_DIR/test7.txt" \
    "$CLI_DIR/aitos-analyzer.sh"

run_expect_failure "Test 8: Analyzer missing resume" "Resume file not found" "$OUTPUT_DIR/test8.txt" \
    "$CLI_DIR/aitos-analyzer.sh" "$TEST_WORK_DIR/missing-resume.txt" "$FIXTURES_DIR/job.txt"

run_expect_failure "Test 9: Analyzer missing job description" "Job description file not found" "$OUTPUT_DIR/test9.txt" \
    "$CLI_DIR/aitos-analyzer.sh" "$FIXTURES_DIR/resume.txt" "$TEST_WORK_DIR/missing-job.txt"

run_expect_failure "Test 10: Analyzer unsupported format" "Unsupported file format" "$OUTPUT_DIR/test10.txt" \
    "$CLI_DIR/aitos-analyzer.sh" "$TEST_WORK_DIR/resume.unsupported" "$FIXTURES_DIR/job.txt"

run_expect_failure "Test 10b: Analyzer unsupported job description format" "Unsupported job description file format" "$OUTPUT_DIR/test10b.txt" \
    "$CLI_DIR/aitos-analyzer.sh" "$FIXTURES_DIR/resume.txt" "$TEST_WORK_DIR/target.unsupported"

run_expect_failure "Test 11: Analyzer empty text input" "Extraction failed: Resulting file is empty" "$OUTPUT_DIR/test11.txt" \
    "$CLI_DIR/aitos-analyzer.sh" "$TEST_WORK_DIR/empty.txt" "$FIXTURES_DIR/job.txt"

run_expect_failure "Test 11b: Analyzer empty extracted job description" "Job description extraction failed: Resulting file is empty" "$OUTPUT_DIR/test11b.txt" \
    "$CLI_DIR/aitos-analyzer.sh" "$FIXTURES_DIR/resume.txt" "$TEST_WORK_DIR/job_empty.pdf"

run_expect_failure "Test 11c: Analyzer failed job description PDF extraction" "Job description PDF extraction failed" "$OUTPUT_DIR/test11c.txt" \
    "$CLI_DIR/aitos-analyzer.sh" "$FIXTURES_DIR/resume.txt" "$TEST_WORK_DIR/job_extract_fail.pdf"

run_expect_failure "Test 12: Analyzer prompt file not found" "Prompt file not found" "$OUTPUT_DIR/test12.txt" \
    "$CLI_DIR/aitos-analyzer.sh" --prompt does-not-exist.yaml "$FIXTURES_DIR/resume.txt" "$FIXTURES_DIR/job.txt"

run_expect_failure "Test 13: Analyzer prompt missing model" "Prompt file must define a model" "$OUTPUT_DIR/test13.txt" \
    "$CLI_DIR/aitos-analyzer.sh" --prompt invalid-analyzer-model.yaml "$FIXTURES_DIR/resume.txt" "$FIXTURES_DIR/job.txt"

echo "Running Test 14: Analyzer plain text should not create extracted files..."
BASENAME=$(basename "$FIXTURES_DIR/resume.txt")
if compgen -G "$FIXTURES_DIR/${BASENAME}_*.txt" > /dev/null; then
    fail "Test 14: Analyzer plain text should not create extracted files" "unexpected extracted file(s) created"
fi
pass "Test 14: Analyzer plain text should not create extracted files"

if [ -f "$FIXTURES_DIR/resume.pdf" ]; then
    run_expect_success "Test 15: Analyzer PDF extraction" "$OUTPUT_DIR/test15.txt" \
        "$CLI_DIR/aitos-analyzer.sh" --text-only --prompt test-model.yaml "$FIXTURES_DIR/resume.pdf" "$FIXTURES_DIR/job.txt"
    assert_contains "Test 15: Analyzer PDF extraction" "$OUTPUT_DIR/test15.txt" "Parsing clarity"
fi

run_expect_success "Test 16: Builder default prompt" "$OUTPUT_DIR/test16.txt" \
    "$CLI_DIR/aitos-builder.sh" "$TEST_WORK_DIR/builder-data" "$TEST_WORK_DIR/target-job.txt"
assert_contains "Test 16: Builder default prompt" "$OUTPUT_DIR/test16.txt" "Loaded 1 CV+job pair"
assert_contains "Test 16: Builder default prompt" "$OUTPUT_DIR/test16.txt" "Generating CV with model"

echo "Running Test 17: Builder writes output file..."
LATEST_OUTPUT=$(ls -1t "$SCRIPT_DIR"/cv_output_*.txt 2>/dev/null | head -n 1)
if [ -z "$LATEST_OUTPUT" ] || [ ! -f "$LATEST_OUTPUT" ]; then
    fail "Test 17: Builder writes output file" "expected generated CV output file was not created"
fi
assert_contains "Test 17: Builder writes output file" "$LATEST_OUTPUT" "Generated CV output body"
pass "Test 17: Builder writes output file"

run_expect_success "Test 18: Builder custom prompt with story" "$OUTPUT_DIR/test18.txt" \
    "$CLI_DIR/aitos-builder.sh" --prompt test-builder.yaml --story "$TEST_WORK_DIR/builder-story.txt" "$TEST_WORK_DIR/builder-data" "$TEST_WORK_DIR/target-job.txt"
assert_contains "Test 18: Builder custom prompt with story" "$OUTPUT_DIR/test18.txt" "Story file loaded"

run_expect_failure "Test 19: Builder missing story value" "Missing value for --story" "$OUTPUT_DIR/test19.txt" \
    "$CLI_DIR/aitos-builder.sh" --story

run_expect_failure "Test 20: Builder missing prompt value" "Missing value for --prompt" "$OUTPUT_DIR/test20.txt" \
    "$CLI_DIR/aitos-builder.sh" --prompt

run_expect_failure "Test 21: Builder unknown option" "Unknown option" "$OUTPUT_DIR/test21.txt" \
    "$CLI_DIR/aitos-builder.sh" --bogus "$TEST_WORK_DIR/builder-data" "$TEST_WORK_DIR/target-job.txt"

run_expect_failure "Test 22: Builder missing args" "Usage:" "$OUTPUT_DIR/test22.txt" \
    "$CLI_DIR/aitos-builder.sh"

run_expect_failure "Test 23: Builder missing story file" "Story file not found" "$OUTPUT_DIR/test23.txt" \
    "$CLI_DIR/aitos-builder.sh" --story "$TEST_WORK_DIR/missing-story.txt" "$TEST_WORK_DIR/builder-data" "$TEST_WORK_DIR/target-job.txt"

run_expect_failure "Test 24: Builder missing data dir" "Data directory not found" "$OUTPUT_DIR/test24.txt" \
    "$CLI_DIR/aitos-builder.sh" "$TEST_WORK_DIR/missing-data" "$TEST_WORK_DIR/target-job.txt"

run_expect_failure "Test 25: Builder missing target job" "Target job description file not found" "$OUTPUT_DIR/test25.txt" \
    "$CLI_DIR/aitos-builder.sh" "$TEST_WORK_DIR/builder-data" "$TEST_WORK_DIR/missing-target.txt"

run_expect_failure "Test 26: Builder no pairs found" "No cv+job pairs found" "$OUTPUT_DIR/test26.txt" \
    "$CLI_DIR/aitos-builder.sh" "$TEST_WORK_DIR/empty-data" "$TEST_WORK_DIR/target-job.txt"

run_expect_failure "Test 27: Builder prompt file not found" "Prompt file not found" "$OUTPUT_DIR/test27.txt" \
    "$CLI_DIR/aitos-builder.sh" --prompt does-not-exist.yaml "$TEST_WORK_DIR/builder-data" "$TEST_WORK_DIR/target-job.txt"

run_expect_failure "Test 28: Builder prompt missing model" "'model' field is missing" "$OUTPUT_DIR/test28.txt" \
    "$CLI_DIR/aitos-builder.sh" --prompt invalid-builder-model.yaml "$TEST_WORK_DIR/builder-data" "$TEST_WORK_DIR/target-job.txt"

run_expect_failure "Test 29: Builder target unsupported format" "Unsupported target job format" "$OUTPUT_DIR/test29.txt" \
    "$CLI_DIR/aitos-builder.sh" "$TEST_WORK_DIR/builder-data" "$TEST_WORK_DIR/target.unsupported"

run_expect_failure "Test 30: Builder ollama failure" "simulated failure" "$OUTPUT_DIR/test30.txt" \
    "$CLI_DIR/aitos-builder.sh" --prompt fail-builder.yaml "$TEST_WORK_DIR/builder-data" "$TEST_WORK_DIR/target-job.txt"

echo "All CLI tests completed successfully!"
