import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROMPTS_DIR = path.join(__dirname, '..', '..', 'prompts');

const PROMPT_FILE_BY_MODEL = {
  'gpt-oss': 'cv-analyzer-gpt-oss.yaml',
};

const DEFAULT_PROMPT_FILE = 'cv-analyzer-default.yaml';
const promptTemplateCache = new Map();

function getPromptTemplate(fileName) {
  if (promptTemplateCache.has(fileName)) {
    return promptTemplateCache.get(fileName);
  }

  const promptPath = path.join(PROMPTS_DIR, fileName);
  if (!fs.existsSync(promptPath)) {
    throw new Error(`Prompt file not found: ${promptPath}`);
  }

  const promptFileText = fs.readFileSync(promptPath, 'utf8');
  const parsed = yaml.load(promptFileText);
  const template = parsed?.prompt;

  if (!template || typeof template !== 'string') {
    throw new Error(`Prompt file ${promptPath} must contain a string 'prompt' field`);
  }

  promptTemplateCache.set(fileName, template);
  return template;
}

function renderPromptTemplate(template, resumeText, jdText) {
  return template
    .replaceAll('{{resumeText}}', resumeText)
    .replaceAll('{{jdText}}', jdText);
}

export function buildPrompt(model, resumeText, jdText) {
  const promptFile = PROMPT_FILE_BY_MODEL[model] || DEFAULT_PROMPT_FILE;
  const template = getPromptTemplate(promptFile);
  return renderPromptTemplate(template, resumeText, jdText);
}

export async function runOllama(model, prompt) {
  try {
    console.log(`Running Ollama with model: ${model}`);
    console.log(`Prompt length: ${prompt.length} characters`);

    const ollamaUrl = process.env.OLLAMA_URL || 'http://ollama:11434';
    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false
      })
    });

    console.log(`Ollama response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Ollama API error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`Ollama response received, length: ${data.response?.length || 0} characters`);

    if (!data.response) {
      console.error('No response field in Ollama data:', data);
      throw new Error('No response received from Ollama');
    }

    return data.response;
  } catch (error) {
    console.error('runOllama error:', error);
    throw new Error(`Failed to run Ollama model: ${error.message}`);
  }
}

export function splitJsonAndReport(output) {
  console.log(`splitJsonAndReport called with output length: ${output?.length || 0}`);
  console.log(`First 200 chars of output:`, output?.slice(0, 200));

  // Attempts to parse the first JSON block from the output and return [jsonObj, reportString]
  // Robust against trailing text after JSON, using brace matching.
  const start = output.indexOf('{');
  if (start === -1) {
    console.error('JSON start not found in model output');
    throw new Error('JSON start not found in model output');
  }

  console.log(`JSON start found at position: ${start}`);

  let depth = 0;
  for (let i = start; i < output.length; i++) {
    const ch = output[i];
    if (ch === '{') depth++;
    if (ch === '}') depth--;
    if (depth === 0) {
      const jsonStr = output.slice(start, i + 1);
      console.log(`Extracted JSON string length: ${jsonStr.length}`);

      try {
        const json = JSON.parse(jsonStr);
        const report = cleanReportText(output.slice(i + 1).trim());
        console.log(`Successfully parsed JSON, cleaned report length: ${report.length}`);
        return [json, report];
      } catch (e) {
        console.error('JSON parse error:', e.message);
        // continue scanning (unlikely if brace match succeeded)
      }
    }
  }
  console.error('Failed to parse JSON from model output');
  throw new Error('Failed to parse JSON from model output');
}

// Clean unwanted characters and formatting from report text
function cleanReportText(text) {
  if (!text || typeof text !== 'string') {
    return text;
  }

  return text
    // Remove markdown code blocks (with optional language specifier)
    .replace(/```[\w]*\s*[\s\S]*?```/g, '')
    .replace(/```/g, '')
    // Remove single and double backticks
    .replace(/`{1,2}/g, '')
    // Remove any remaining code fence markers
    .replace(/^~~~.*$/gm, '')
    .replace(/~~~[\s\S]*?~~~/g, '')
    // Clean up HTML-like tags that might appear
    .replace(/<\/?[^>]+(>|$)/g, '')
    // Clean up extra whitespace and empty lines
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/^\s+|\s+$/g, '')
    // Remove any remaining markdown artifacts
    .replace(/^\s*[-*+]\s*$/gm, '')
    .trim();
}
