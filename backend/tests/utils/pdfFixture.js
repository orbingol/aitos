import { access, mkdir, writeFile } from 'fs/promises';
import { constants } from 'fs';

const stream = Buffer.from('BT /F1 24 Tf 72 700 Td (Resume) Tj ET\n', 'latin1');
const object4 = Buffer.concat([
  Buffer.from(`4 0 obj\n<< /Length ${stream.length} >>\nstream\n`, 'latin1'),
  stream,
  Buffer.from('endstream\nendobj\n', 'latin1'),
]);

const objects = [
  Buffer.from('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n', 'latin1'),
  Buffer.from('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n', 'latin1'),
  Buffer.from(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /ProcSet [/PDF /Text] /Font << /F1 5 0 R >> >> >>\nendobj\n',
    'latin1'
  ),
  object4,
  Buffer.from('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n', 'latin1'),
];

const MINIMAL_RESUME_PDF = buildPdf();

export async function ensureResumePdfFixture(filePath) {
  const dir = filePath.substring(0, filePath.lastIndexOf('/'));
  await mkdir(dir, { recursive: true });

  try {
    await access(filePath, constants.F_OK);
    return;
  } catch {
    await writeFile(filePath, MINIMAL_RESUME_PDF);
  }
}

function buildPdf() {
  let content = Buffer.from('%PDF-1.1\n', 'latin1');
  const offsets = [];

  for (const object of objects) {
    offsets.push(content.length);
    content = Buffer.concat([content, object]);
  }

  const xrefStart = content.length;
  let xref = Buffer.from(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`, 'latin1');

  for (const offset of offsets) {
    xref = Buffer.concat([
      xref,
      Buffer.from(`${offset.toString().padStart(10, '0')} 00000 n \n`, 'latin1'),
    ]);
  }

  const trailer = Buffer.from(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`, 'latin1');
  const startxref = Buffer.from(`startxref\n${xrefStart}\n%%EOF\n`, 'latin1');

  return Buffer.concat([content, xref, trailer, startxref]);
}