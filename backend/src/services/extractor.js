import mammoth from 'mammoth';
import { exec } from 'child_process';
import fs from 'fs/promises';

const useTika = process.env.TIKA_ENABLE || true; // Always use Tika since it runs as a separate container
const TIKA_CMD = process.env.TIKA_CMD || 'tika -t';

export async function extractText(filePath, originalName) {
  const ext = (originalName.split('.').pop() || '').toLowerCase();

  console.log(`Extracting text from ${originalName} (${ext}), useTika: ${useTika}`);

  if (useTika) {
    return runTika(filePath);
  }

  if (ext === 'pdf') {
    try {
      const buf = await fs.readFile(filePath);
      const pdfParse = await import('pdf-parse');
      const data = await pdfParse.default(buf);
      return data.text || '';
    } catch (e) {
      console.error('PDF parsing failed:', e.message);
      // Fallback to Tika for PDF
      try {
        return await runTika(filePath);
      } catch (tikaError) {
        throw new Error(`PDF processing failed: ${e.message}`);
      }
    }
  }

  if (ext === 'docx') {
    try {
      const { value } = await mammoth.extractRawText({ path: filePath });
      return value || '';
    } catch (e) {
      console.error('DOCX parsing failed:', e.message);
      // Fallback to Tika for DOCX
      try {
        return await runTika(filePath);
      } catch (tikaError) {
        throw new Error(`DOCX processing failed: ${e.message}`);
      }
    }
  }

  // Fallback to Tika if available
  try {
    return await runTika(filePath);
  } catch (e) {
    throw new Error(`Unsupported file type: ${ext}. Install Tika or upload PDF/DOCX.`);
  }
}

function runTika(filePath) {
  return new Promise(async (resolve, reject) => {
    try {
      // Use Tika HTTP server if available
      const tikaHost = process.env.TIKA_URL || 'http://localhost:9998';

      const fs = await import('fs');
      const fetch = (await import('node-fetch')).default;

      const fileBuffer = await fs.promises.readFile(filePath);

      // Use /tika endpoint which returns plain text by default
      const response = await fetch(`${tikaHost}/tika`, {
        method: 'PUT',
        body: fileBuffer,
        headers: {
          'Content-Type': 'application/octet-stream',
          'Accept': 'text/plain'
        }
      });

      if (!response.ok) {
        throw new Error(`Tika server error: ${response.status}`);
      }

      const text = await response.text();

      // Clean up any remaining HTML/XML tags
      const cleanText = text
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/&[^;]+;/g, ' ') // Remove HTML entities
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();

      resolve(cleanText);
    } catch (e) {
      // Fallback to CLI if HTTP fails
      exec(`${TIKA_CMD} "${filePath}"`, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
        if (err) return reject(e); // Return original error

        // Clean up CLI output as well
        const cleanText = stdout
          .replace(/<[^>]*>/g, '')
          .replace(/&[^;]+;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        resolve(cleanText);
      });
    }
  });
}
