import express from 'express';
import { createJD, listJDs, getJD, updateJD, deleteJD } from '../controllers/jdController.js';

const router = express.Router();

router.get('/', listJDs);
router.post('/', createJD);
router.get('/:id', getJD);
router.put('/:id', updateJD);
router.delete('/:id', deleteJD);

export default router;
