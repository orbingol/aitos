import express from 'express';
import multer from 'multer';
import { uploadCV, listCVs, getCV, updateCV, deleteCV } from '../controllers/cvController.js';

const router = express.Router();
const upload = multer({ dest: process.env.UPLOADS_DIR || 'tmp/uploads/' });

router.get('/', listCVs);
router.post('/', upload.single('file'), uploadCV);
router.get('/:id', getCV);
router.put('/:id', updateCV);
router.delete('/:id', deleteCV);

export default router;
