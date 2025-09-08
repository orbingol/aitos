import { prisma } from '../utils/db.js';
import { analyzeCV } from '../services/analysisService.js';
import { buildPrompt, runOllama, splitJsonAndReport } from '../services/ollama.js';

export async function createReport(req, res) {
  try {
    const { cvId, jdId, model } = req.body;

    if (!cvId || !jdId || !model) {
      return res.status(400).json({ error: 'cvId, jdId, and model are required' });
    }

    const report = await analyzeCV(cvId, jdId, model);

    res.json({ reportId: report.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function listReports(req, res) {
  try {
    const reports = await prisma.report.findMany({
      select: {
        id: true,
        model: true,
        createdAt: true,
        resumeId: true,
        jobDescriptionId: true,
        jsonReport: true,
        resume: {
          select: {
            filename: true
          }
        },
        jobDescription: {
          select: {
            title: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Extract score from jsonReport for each report
    const reportsWithScore = reports.map(report => {
      let score = 0;
      try {
        const jsonReport = JSON.parse(report.jsonReport);
        score = jsonReport.overall_score || 0;
      } catch (error) {
        console.error('Error parsing jsonReport for report', report.id, error);
      }

      return {
        id: report.id,
        model: report.model,
        createdAt: report.createdAt,
        resumeId: report.resumeId,
        jobDescriptionId: report.jobDescriptionId,
        cvFilename: report.resume.filename,
        jdTitle: report.jobDescription.title || `JD ${report.jobDescriptionId.slice(0, 8)}...`,
        score: score
      };
    });

    res.json(reportsWithScore);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getReport(req, res) {
  try {
    const report = await prisma.report.findUnique({
      where: { id: req.params.id },
      include: {
        resume: true,
        jobDescription: true
      }
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Parse JSON report
    try {
      report.jsonReport = JSON.parse(report.jsonReport);
    } catch {
      // Leave as string if parsing fails
    }

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function reanalyzeReport(req, res) {
  try {
    const { model } = req.body;

    if (!model) {
      return res.status(400).json({ error: 'Model is required' });
    }

    const report = await prisma.report.findUnique({
      where: { id: req.params.id },
      include: {
        resume: true,
        jobDescription: true
      }
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const prompt = buildPrompt(model, report.resume.content, report.jobDescription.content);
    const raw = await runOllama(model, prompt);
    const [jsonObj, human] = splitJsonAndReport(raw);

    const updatedReport = await prisma.report.update({
      where: { id: req.params.id },
      data: {
        model,
        jsonReport: JSON.stringify(jsonObj),
        humanReport: human
      }
    });

    res.json({ id: updatedReport.id, status: 'updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function deleteReport(req, res) {
  try {
    await prisma.report.delete({
      where: { id: req.params.id }
    });

    res.json({ ok: true });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.status(500).json({ error: error.message });
  }
}
