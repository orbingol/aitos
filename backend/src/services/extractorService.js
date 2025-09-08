import mammoth from 'mammoth';
import { exec } from 'child_process';
import fs from 'fs/promises';

const useTika = process.env.TIKA_ENABLE || true; // Always use Tika since it's available as a separate service
const TIKA_URL = process.env.TIKA_URL || 'http:/localhost:9998'; // External Tika service

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

  // Fallback to Tika if available
  try {
    return await runTikaServer(filePath);
  } catch (e) {
    throw new Error(`Unsupported file type: ${ext}. Install Tika or upload PDF/DOCX.`);
  }
}

async function runTikaServer(filePath) {
  const formData = new FormData();
  const fileBuffer = await fs.readFile(filePath);
  formData.append('file', new Blob([fileBuffer]));

  const response = await fetch(`${TIKA_URL}/tika`, {
    method: 'PUT',
    headers: {
      'Accept': 'text/plain',
    },
    body: fileBuffer
  });

  if (!response.ok) {
    throw new Error(`Tika server error: ${response.statusText}`);
  }

  let text = await response.text();

  // Clean up and format the text properly
  text = cleanAndFormatText(text);

  return text;
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
