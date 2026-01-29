import request from 'supertest';
import app from '../src/index.js';

describe('Health Check API', () => {
  it('should return 200 and system status', async () => {
    const res = await request(app).get('/health');

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('database');
    expect(res.body).toHaveProperty('tika');
    expect(res.body).toHaveProperty('ollama');
  });

  it('should have database connected', async () => {
    const res = await request(app).get('/health');
    expect(res.body.database).toBe(true);
  });
});
