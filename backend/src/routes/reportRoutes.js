import express from 'express';
import { createReport, listReports, getReport, reanalyzeReport, deleteReport } from '../controllers/reportController.js';

const router = express.Router();

router.get('/', listReports);
router.get('/:id', getReport);
router.post('/:id/reanalyze', reanalyzeReport);
router.delete('/:id', deleteReport);

export default router;
