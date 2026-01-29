import request from 'supertest';
import app from '../src/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { ensureResumePdfFixture } from './utils/pdfFixture.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const resumePdfPath = path.join(__dirname, 'fixtures', 'resume.pdf');

beforeAll(() => ensureResumePdfFixture(resumePdfPath));

describe('CV API', () => {
  it('should return an empty list of CVs initially', async () => {
    const res = await request(app).get('/api/cv');

    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should upload a CV and create a database entry', async () => {
    const filePath = resumePdfPath;

    const response = await request(app)
      .post('/api/cv')
      .attach('file', filePath);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body.filename).toBe('resume.pdf');
  });

  it('should return 400 if no file is provided', async () => {
    const response = await request(app).post('/api/cv');
    expect(response.status).toBe(400);
  });
});
