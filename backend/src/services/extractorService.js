import mammoth from 'mammoth';
import fs from 'fs/promises';

const useTika = typeof process.env.TIKA_ENABLE === 'string'
  ? process.env.TIKA_ENABLE.toLowerCase() === 'true'
  : true;
const TIKA_URL = process.env.TIKA_URL || 'http://tika:9998';
const TIKA_TIMEOUT_MS = Number(process.env.TIKA_TIMEOUT_MS) || 10_000;

export async function extractTextFromFile(filePath, originalName) {
  const ext = (originalName.split('.').pop() || '').toLowerCase();

  if (useTika) {
    return await runTikaServer(filePath);
  }

  if (ext === 'pdf') {
    const buf = await fs.readFile(filePath);
    const pdfParse = await import('pdf-parse');
    const data = await pdfParse.default(buf);
    return data.text || '';
  }

  if (ext === 'docx') {
    const { value } = await mammoth.extractRawText({ path: filePath });
    return value || '';
  }

  if (!useTika) {
    throw new Error(`Unsupported file type: ${ext}. Enable Tika or upload PDF/DOCX.`);
  }

  try {
    return await runTikaServer(filePath);
  } catch (e) {
    throw new Error(`Tika extraction failed: ${e.message}`);
  }
}

async function runTikaServer(filePath) {
  const fileBuffer = await fs.readFile(filePath);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIKA_TIMEOUT_MS);

  try {
    const response = await fetch(`${TIKA_URL}/tika`, {
      method: 'PUT',
      headers: {
        'Accept': 'text/plain',
        'Content-Type': 'application/octet-stream',
      },
      body: fileBuffer,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Tika server error: ${response.statusText}`);
    }

    const text = await response.text();
    return cleanAndFormatText(text);
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Tika request timed out');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function cleanAndFormatText(text) {
  if (!text) return '';

  // Remove HTML/XML entities and tags
  text = text.replace(/&[a-zA-Z]+;/g, ' ');
  text = text.replace(/<[^>]*>/g, ' ');

  // Normalize whitespace but preserve line breaks for better formatting
  text = text.replace(/\t/g, ' '); // Convert tabs to spaces
  text = text.replace(/[ \u00A0]+/g, ' '); // Multiple spaces/non-breaking spaces to single space

  // Fix common formatting issues
  text = text.replace(/([a-z])([A-Z])/g, '$1 $2'); // Add space between camelCase words
  text = text.replace(/(\w)([•·▪▫■□○●])/g, '$1\n• '); // Fix bullet points
  text = text.replace(/([•·▪▫■□○●])(\w)/g, '• $2'); // Fix bullet points

  // Split into lines and process each line
  const lines = text.split(/\r?\n/);
  const processedLines = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    if (!line) {
      // Preserve intentional empty lines but don't add too many
      if (processedLines.length > 0 && processedLines[processedLines.length - 1] !== '') {
        processedLines.push('');
      }
      continue;
    }

    // Detect section headers (usually in caps or starting with caps)
    if (line.length < 50 && (line === line.toUpperCase() || /^[A-Z][^a-z]*$/.test(line))) {
      if (processedLines.length > 0) processedLines.push(''); // Add space before section
      processedLines.push(line);
      processedLines.push(''); // Add space after section
      continue;
    }

    // Detect bullet points or list items
    if (/^[•·▪▫■□○●\-\*]\s/.test(line) || /^\d+[\.\)]\s/.test(line)) {
      processedLines.push(line);
      continue;
    }

    // Regular content
    processedLines.push(line);
  }

  // Join lines back together
  text = processedLines.join('\n');

  // Clean up excessive empty lines (max 2 consecutive)
  text = text.replace(/\n{3,}/g, '\n\n');

  // Trim the final result
  return text.trim();
}
