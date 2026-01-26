#!/bin/bash
set -e

# AiToS CLI Test Runner
# This script runs tests for aitos.sh by mocking the ollama binary.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLI_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
FIXTURES_DIR="$SCRIPT_DIR/fixtures"
MOCK_BIN_DIR="$SCRIPT_DIR/mock_bin"

# Setup mock environment
mkdir -p "$MOCK_BIN_DIR"
cat <<EOF > "$MOCK_BIN_DIR/ollama"
#!/bin/bash
if [ "\$1" = "run" ]; then
    if [ "\$2" = "fail-model" ]; then
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
fi
EOF
chmod +x "$MOCK_BIN_DIR/ollama"

# Ensure prompts directory has the test model
mkdir -p "$CLI_DIR/prompts"
cp "$SCRIPT_DIR/test-model.yaml" "$CLI_DIR/prompts/test-model.yaml"

# Cleanup function
cleanup() {
    rm -f "$FIXTURES_DIR"/*.pdf "$FIXTURES_DIR"/*.txt_*
    rm -rf "$MOCK_BIN_DIR"
    rm -f "$CLI_DIR/prompts/test-model.yaml"
    rm -f test1_out.txt test2_out.txt test5_out.txt
}
trap cleanup EXIT

# Export PATH to use mock ollama
export PATH="$MOCK_BIN_DIR:$PATH"

# Test 1: Verification of basic run
echo "Running Test 1: Basic execution..."
"$CLI_DIR/aitos.sh" "$FIXTURES_DIR/resume.txt" "$FIXTURES_DIR/job.txt" test-model > test1_out.txt
if grep -q "Parsing clarity" test1_out.txt && grep -q "status" test1_out.txt; then
    echo "✅ Test 1 Passed"
else
    echo "❌ Test 1 Failed: Output missing expected content"
    exit 1
fi

# Test 2: Verification of --text-only filter
echo "Running Test 2: Text-only filter..."
"$CLI_DIR/aitos.sh" --text-only "$FIXTURES_DIR/resume.txt" "$FIXTURES_DIR/job.txt" test-model > test2_out.txt
if grep -q "Parsing clarity" test2_out.txt && ! grep -q "status" test2_out.txt; then
    echo "✅ Test 2 Passed"
else
    echo "❌ Test 2 Failed: Output filtering failed"
    exit 1
fi

# Test 3: Simulation of Ollama failure
echo "Running Test 3: Ollama failure handling..."
if "$CLI_DIR/aitos.sh" "$FIXTURES_DIR/resume.txt" "$FIXTURES_DIR/job.txt" fail-model > /dev/null 2>&1; then
    echo "❌ Test 3 Failed: Script did not exit with error on model failure"
    exit 1
else
    echo "✅ Test 3 Passed"
fi

# Test 4: Verify that no extracted file is created for plain text input
echo "Running Test 4: No extracted file for plain text input..."
BASENAME=$(basename "$FIXTURES_DIR/resume.txt")
if compgen -G "$FIXTURES_DIR/${BASENAME}_*.txt" > /dev/null; then
    echo "❌ Test 4 Failed: Unexpected extracted file(s) created for plain text input"
    exit 1
else
    echo "✅ Test 4 Passed: No extracted files created for plain text input"
fi
# Test 5: Verify PDF extraction (if PDF exists)
if [ -f "$FIXTURES_DIR/resume.pdf" ]; then
    echo "Running Test 5: PDF extraction..."
    "$CLI_DIR/aitos.sh" --text-only "$FIXTURES_DIR/resume.pdf" "$FIXTURES_DIR/job.txt" test-model > test5_out.txt
    if grep -q "Parsing clarity" test5_out.txt; then
        echo "✅ Test 5 Passed: PDF text extracted and filtered"
    else
        echo "❌ Test 5 Failed: PDF extraction failed"
        exit 1
    fi
fi

echo "All tests completed successfully!"
