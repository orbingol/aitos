# AiToS CLI

A standalone command-line interface for AiToS (AI-powered ATS Resume Analyzer) that provides quick resume analysis
without requiring the web interface.
This tool directly integrates with Ollama models to simulate ATS behavior and provide comprehensive resume scoring.

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
- **jq**: JSON command-line processor (optional, for pretty-printing)

## Usage

### Basic Syntax

```bash
./aitos.sh [OPTIONS] <resume_file> <job_description_file> <model>
```

### Parameters

- **resume_file**: Path to resume (PDF or DOCX format)
- **job_description_file**: Path to job description (plain text file)
- **model**: AI model to use (`gemma3`, `qwen3`, or `gpt-oss`)

### Options

- `--poppler`: Use Poppler (pdftotext) instead of Tika for PDF extraction
- `--text-only`: Filter out the JSON data and only display the human-readable report

### Examples

```bash
# Basic analysis (shows full output including JSON)
./aitos.sh resume.pdf job.txt gemma3

# Show only the human-readable report
./aitos.sh --text-only resume.pdf job.txt gemma3

# Use Poppler for PDF processing
./aitos.sh --poppler resume.pdf job.txt qwen3

# Make script executable (if needed)
chmod +x aitos.sh
```

## Docker Support

You can run the CLI tool using Docker to avoid local dependency issues.

### Build

```bash
docker build -t aitos-cli -f docker/Dockerfile .
```

### Run

Mount your local files as a volume to the container:

```bash
docker run --rm -v $(pwd):/data aitos-cli /data/resume.pdf /data/job.txt gemma3
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
chmod +x aitos.sh

# Run with explicit shell
bash aitos.sh resume.pdf job.txt gemma3
```

**PDF extraction issues:**
```bash
# Try alternative PDF processor
./aitos.sh --poppler resume.pdf job.txt gemma3

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
    ./aitos.sh "$resume" job_description.txt gemma3 > "reports/$(basename "$resume" .pdf)_report.txt"
done
```

### CI/CD Integration
The CLI tool can be integrated into automated workflows for resume screening and analysis.

## Tips & Tricks

### Model Comparison
To see how different models evaluate the same resume:
```bash
for model in gemma3 qwen3 gpt-oss; do
    echo "--- $model ---"
    ./aitos.sh --text-only resume.pdf job.txt $model
done
```

### Automation & Extraction
Since the default output includes JSON, you can use `jq` to extract specific data:
```bash
# Save the JSON report to a file
./aitos.sh resume.pdf job.txt gemma3 | jq '.' > report.json

# Get only the weighted score
./aitos.sh resume.pdf job.txt gemma3 | jq '.weighted_overall_score'
```

## Support

For issues related to:
- **CLI script**: Check file permissions and dependencies
- **Ollama models**: Ensure models are pulled and Ollama is running
- **Document processing**: Try alternative extraction methods
- **Analysis quality**: Consider different models for comparison

The CLI tool provides the same analysis quality as the web interface but with the convenience of command-line operation.
