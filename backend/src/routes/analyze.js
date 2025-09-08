import { Router } from 'express';
import { analyzeCV } from '../services/analysisService.js';

const router = Router();

router.post('/analyze', async (req, res) => {
  try {
    const { cvId, jdId, model } = req.body;
    if (!cvId || !jdId || !model) return res.status(400).json({ error: 'cvId, jdId, model are required' });

    console.log(`Starting analysis: CV=${cvId}, JD=${jdId}, Model=${model}`);

    const report = await analyzeCV(cvId, jdId, model);

    console.log(`Analysis completed: Report ID=${report.id}`);
    res.json({ reportId: report.id });
  } catch (e) {
    console.error('Analysis error:', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
