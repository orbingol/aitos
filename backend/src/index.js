import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import yaml from 'js-yaml';
import swaggerUi from 'swagger-ui-express';
import cvRoutes from './routes/cvRoutes.js';
import jdRoutes from './routes/jdRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import analyzeRoutes from './routes/analyze.js';
import ollamaRoutes from './routes/ollama.js';
import healthRoutes from './routes/healthRoutes.js';

const app = express();
app.use(express.json({ limit: '2mb' }));

// Load OpenAPI spec
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const openapiPath = path.join(__dirname, '..', 'openapi.yaml');
const openapiSpec = yaml.load(fs.readFileSync(openapiPath, 'utf8'));

// Serve OpenAPI docs at root
app.use('/', swaggerUi.serve);
app.get('/', swaggerUi.setup(openapiSpec, {
  customSiteTitle: 'AiToS API Documentation',
  customCss: '.swagger-ui .topbar { display: none }'
}));

// Static for uploads (optional)
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'tmp', 'uploads');
app.use('/uploads', express.static(uploadsDir));

// Health
app.use('/health', healthRoutes);

// Routes
app.use('/api/cv', cvRoutes);
app.use('/api/jd', jdRoutes);
app.use('/api/report', reportRoutes);
app.use('/api', analyzeRoutes); // /analyze
app.use('/api/ollama', ollamaRoutes);

const BACKEND_PORT = process.env.BACKEND_PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(BACKEND_PORT, () => console.log(`🚀 Server listening on port ${BACKEND_PORT}`));
}

export default app;
