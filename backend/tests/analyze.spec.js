import request from 'supertest';
import app from '../src/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Analysis API', () => {
  it('should take a CV and JD and return a report', async () => {
    // 1. Upload a CV first
    const cvPath = path.join(__dirname, 'fixtures/resume.pdf');
    const cvRes = await request(app)
      .post('/api/cv')
      .attach('file', cvPath);

    const cvId = cvRes.body.id;

    // 2. Create a JD
    const jdRes = await request(app)
      .post('/api/jd')
      .send({
        title: 'Software Engineer',
        text: 'React, Node.js, and Kubernetes experience required.'
      });

    const jdId = jdRes.body.id;

    // 3. Run analysis
    const analyzeRes = await request(app)
      .post('/api/analyze')
      .send({
        cvId: cvId,
        jdId: jdId,
        model: 'gemma3'
      });

    expect(analyzeRes.statusCode).toEqual(200);
    expect(analyzeRes.body).toHaveProperty('reportId');
  }, 15000); // Give it some time for mock Ollama network call
});
