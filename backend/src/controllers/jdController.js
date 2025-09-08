import { prisma } from '../utils/db.js';

export async function createJD(req, res) {
  try {
    const { title, text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'text is required' });
    }

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    const jobDescription = await prisma.jobDescription.create({
      data: {
        title: title,
        content: text
      }
    });

    res.json({ id: jobDescription.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function listJDs(req, res) {
  try {
    const jobDescriptions = await prisma.jobDescription.findMany({
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const jdsWithPreview = jobDescriptions.map(jd => ({
      id: jd.id,
      title: jd.title,
      preview: jd.content.slice(0, 200),
      createdAt: jd.createdAt
    }));

    res.json(jdsWithPreview);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getJD(req, res) {
  try {
    const jobDescription = await prisma.jobDescription.findUnique({
      where: { id: req.params.id }
    });

    if (!jobDescription) {
      return res.status(404).json({ error: 'Job Description not found' });
    }

    // Return with frontend-expected field names
    res.json({
      id: jobDescription.id,
      title: jobDescription.title,
      text: jobDescription.content,
      createdAt: jobDescription.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function updateJD(req, res) {
  try {
    const { title, text } = req.body;

    if (typeof text !== 'string') {
      return res.status(400).json({ error: 'text is required' });
    }

    if (typeof title !== 'string') {
      return res.status(400).json({ error: 'title is required' });
    }

    const jobDescription = await prisma.jobDescription.update({
      where: { id: req.params.id },
      data: {
        title: title,
        content: text
      }
    });

    res.json({ ok: true });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Job Description not found' });
    }
    res.status(500).json({ error: error.message });
  }
}

export async function deleteJD(req, res) {
  try {
    await prisma.jobDescription.delete({
      where: { id: req.params.id }
    });

    res.json({ ok: true });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Job Description not found' });
    }
    res.status(500).json({ error: error.message });
  }
}
