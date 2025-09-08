import { prisma } from '../utils/db.js';
import { extractTextFromFile } from '../services/extractorService.js';

export async function uploadCV(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'File is required' });
    }

    const content = await extractTextFromFile(req.file.path, req.file.originalname);

    const resume = await prisma.resume.create({
      data: {
        filename: req.file.originalname,
        content: content.trim()
      }
    });

    res.json({
      id: resume.id,
      filename: resume.filename,
      preview: content.slice(0, 500)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function listCVs(req, res) {
  try {
    const resumes = await prisma.resume.findMany({
      select: {
        id: true,
        filename: true,
        createdAt: true,
        content: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const resumesWithPreview = resumes.map(resume => ({
      ...resume,
      preview: resume.content.slice(0, 200),
      content: undefined
    }));

    res.json(resumesWithPreview);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getCV(req, res) {
  try {
    const resume = await prisma.resume.findUnique({
      where: { id: req.params.id }
    });

    if (!resume) {
      return res.status(404).json({ error: 'CV not found' });
    }

    // Return with 'text' field for frontend compatibility
    res.json({
      ...resume,
      text: resume.content
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function updateCV(req, res) {
  try {
    const { content } = req.body;

    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'Content is required' });
    }

    const resume = await prisma.resume.update({
      where: { id: req.params.id },
      data: { content }
    });

    res.json({ ok: true });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'CV not found' });
    }
    res.status(500).json({ error: error.message });
  }
}

export async function deleteCV(req, res) {
  try {
    await prisma.resume.delete({
      where: { id: req.params.id }
    });

    res.json({ ok: true });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'CV not found' });
    }
    res.status(500).json({ error: error.message });
  }
}
