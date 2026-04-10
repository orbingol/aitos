# AiToS CLI

A standalone command-line interface for AiToS (AI-powered ATS Resume Analyzer) that provides quick resume analysis
without requiring the web interface.
This tool directly integrates with Ollama models to simulate ATS behavior and provide comprehensive resume scoring.
The active model and prompt are defined by the selected YAML prompt file.

## Features

- **Direct AI Analysis**: Bypasses web interface for quick analysis
- **Multiple Document Formats**: Supports PDF and DOCX files
- **Flexible Text Extraction**: Choose between Apache Tika (default) or Poppler for PDF processing
- **Multiple AI Models**: Support for Gemma3, Qwen3, and GPT-OSS models
- **Comprehensive Scoring**: Multi-metric ATS compatibility analysis
- **Detailed Reports**: JSON structured data and human-readable analysis
- **Standalone Operation**: No database or web server required

## Prerequisites

Install required dependencies via Homebrew (macOS):

```bash
# Essential dependencies
brew install tika          # Document text extraction
brew install poppler       # Alternative PDF processing (optional)
brew install ollama-app    # AI model runtime
brew install jq            # JSON processing
brew install yq            # YAML processing (required for prompts)

# Pull required AI models
ollama pull gemma3:latest
ollama pull qwen3:latest
ollama pull gpt-oss:latest
```

For other platforms, install equivalent packages:
- **Tika**: Apache Tika command-line tool
- **Poppler**: PDF processing utilities (pdftotext)
- **Ollama**: Local AI model runtime
- **jq**: JSON command-line processor (required for prompt construction)

## Usage

### Basic Syntax

```bash
./aitos-analyzer.sh [OPTIONS] <resume_file> <job_description_file>
```

### Parameters

- **resume_file**: Path to resume (PDF or DOCX format)
- **job_description_file**: Path to job description (TXT, PDF, or DOCX format)

By default, the CLI loads `prompts/cv-analyzer-default.yaml`.

### Options

- `--poppler`: Use Poppler (pdftotext) instead of Tika for PDF extraction
- `--text-only`: Filter out the JSON data and only display the human-readable report
- `--prompt <yaml-file>`: Override the default prompt file

### Examples

```bash
# Basic analysis (shows full output including JSON)
./aitos-analyzer.sh resume.pdf job.txt

# Show only the human-readable report
./aitos-analyzer.sh --text-only resume.pdf job.txt

# Use a different prompt file
./aitos-analyzer.sh --prompt prompts/qwen3.yaml resume.pdf job.txt

# Use Poppler for PDF processing
./aitos-analyzer.sh --poppler resume.pdf job.txt

# Make script executable (if needed)
chmod +x aitos-analyzer.sh
```

## Docker Support

You can run the CLI tool using Docker to avoid local dependency issues.

### Build

```bash
docker build --target analyzer -t aitos-analyzer -f docker/Dockerfile .
docker build --target builder -t aitos-builder -f docker/Dockerfile .
```

### Run

Mount your local files as a volume to the container:

```bash
docker run --rm -v $(pwd):/data aitos-analyzer /data/resume.pdf /data/job.txt
docker run --rm -v $(pwd):/data aitos-builder /data /data/target_job.txt
```

*Note: The container connects to Ollama on the host via `http://host.docker.internal:11434` by default.*

## Output

The CLI tool provides two types of output:

### 1. JSON Report
Structured data including:
```json
{
  "parsing_clarity_score": 85,
  "keyword_match_score": 72,
  "formatting_safety_score": 90,
  "overall_score": 78,
  "weighted_overall_score": 80,
  "top_missing_keywords": ["Python", "Docker", "AWS"],
  "technical_questions": ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6"],
  "cultural_questions": ["CQ1", "CQ2", "CQ3"],
  "summary": "Strong technical background with minor keyword gaps"
}
```

### 2. Human-Readable Report
Detailed analysis including:
- **Parsing Clarity**: ATS parsing assessment
- **Keyword & Skills Match**: Job alignment analysis
- **Formatting Risks**: ATS compatibility issues
- **Improvement Suggestions**: Actionable recommendations
- **Suggested Company Questions**: Interview preparation

## Scoring System

### Core Metrics (0-100 scale)

- **Parsing Clarity Score**: How well ATS systems can parse the resume
- **Keyword Match Score**: Alignment with job description requirements
- **Formatting Safety Score**: ATS-friendly formatting assessment
- **Overall Score**: Model's holistic evaluation
- **Weighted Overall Score**: Calculated as:
  ```
  0.4 × keyword_match + 0.3 × parsing_clarity + 0.3 × formatting_safety
  ```

### Additional Insights

- **Missing Keywords**: Critical terms absent from resume
- **Technical Questions**: Job-specific interview questions
- **Cultural Questions**: Company culture and fit questions
- **Summary**: Concise overall assessment

## Model Comparison

### Gemma3
- **Best for**: Fast analysis, general assessment
- **Strengths**: Quick processing, balanced scoring
- **Use case**: Initial resume screening

### Qwen3
- **Best for**: Detailed technical analysis
- **Strengths**: Thorough keyword analysis, technical depth
- **Use case**: Technical role evaluation

### GPT-OSS
- **Best for**: Comprehensive analysis with detailed feedback
- **Strengths**: Detailed improvement suggestions, nuanced scoring
- **Use case**: Final resume optimization

## Troubleshooting

### Common Issues

**"Command not found" errors:**
```bash
# Ensure dependencies are installed
brew install tika poppler ollama

# Check Ollama is running
ollama serve
```

**"Model not found" errors:**
```bash
# Pull missing models
ollama pull gemma3:latest
ollama pull qwen3:latest
ollama pull gpt-oss:latest

# List available models
ollama list
```

**"Permission denied" errors:**
```bash
# Make script executable
chmod +x aitos-analyzer.sh

# Run with explicit shell
bash aitos-analyzer.sh resume.pdf job.txt
```

**PDF extraction issues:**
```bash
# Try alternative PDF processor
./aitos-analyzer.sh --poppler resume.pdf job.txt

# Check PDF file integrity
file resume.pdf
```

### Text Extraction Comparison

**Apache Tika (default):**
- Handles both PDF and DOCX
- Better formatting preservation
- More robust with complex documents

**Poppler (--poppler flag):**
- PDF only
- Faster processing
- Better for simple text extraction
- Good fallback for problematic PDFs

## File Management

The script creates extracted text files in the same directory as the source resume:
- Pattern: `{resume_filename}_{timestamp}.txt`
- Contains the raw text extracted for AI analysis
- Useful for verifying extraction quality
- Clean up manually if needed

## Integration

### With Web Interface
The CLI tool is independent but uses the same analysis prompts as the web interface, ensuring consistent results.

### Batch Processing
```bash
#!/bin/bash
# Example batch script
for resume in resumes/*.pdf; do
  ./aitos-analyzer.sh "$resume" job_description.txt > "reports/$(basename "$resume" .pdf)_report.txt"
done
```

### CI/CD Integration
The CLI tool can be integrated into automated workflows for resume screening and analysis.

## Tips & Tricks

### Development & Testing
You can run the local test suite to verify script logic without requiring a full Ollama setup:
```bash
# From the cli directory
chmod +x tests/test_runner.sh
./tests/test_runner.sh
```
This script tests extraction logic, prompt generation, and output filtering using a mock Ollama binary.

### Model Comparison
To see how different prompt files evaluate the same resume:
```bash
for prompt in prompts/cv-analyzer-default.yaml prompts/cv-analyzer-qwen.yaml prompts/cv-analyzer-gpt-oss.yaml; do
  echo "--- $prompt ---"
  ./aitos-analyzer.sh --text-only --prompt "$prompt" resume.pdf job.txt
done
```

### Automation & Extraction
Since the default output includes JSON, you can use `jq` to extract specific data:
```bash
# Save the JSON report to a file
./aitos-analyzer.sh resume.pdf job.txt | jq '.' > report.json

# Get only the weighted score
./aitos-analyzer.sh resume.pdf job.txt | jq '.weighted_overall_score'
```

## Support

For issues related to:
- **CLI script**: Check file permissions and dependencies
- **Ollama models**: Ensure models are pulled and Ollama is running
- **Document processing**: Try alternative extraction methods
- **Analysis quality**: Consider different models for comparison

The CLI tool provides the same analysis quality as the web interface but with the convenience of command-line operation.
