import { buildPrompt, runOllama, splitJsonAndReport } from './ollama.js';
import { prisma } from '../utils/db.js';

export async function analyzeCV(cvId, jdId, model) {
  console.log(`analyzeCV called with: cvId=${cvId}, jdId=${jdId}, model=${model}`);

  const cv = await prisma.resume.findUnique({
    where: { id: cvId }
  });

  const jd = await prisma.jobDescription.findUnique({
    where: { id: jdId }
  });

  console.log(`CV found: ${!!cv}, JD found: ${!!jd}`);

  if (!cv || !jd) {
    throw new Error('CV or Job Description not found');
  }

  console.log(`Building prompt for model: ${model}`);
  const prompt = buildPrompt(model, cv.content, jd.content);

  console.log(`Running Ollama analysis...`);
  const raw = await runOllama(model, prompt);

  console.log(`Parsing Ollama response...`);
  const [jsonObj, human] = splitJsonAndReport(raw);

  console.log(`Creating report in database...`);
  const report = await prisma.report.create({
    data: {
      model,
      jsonReport: JSON.stringify(jsonObj),
      humanReport: human,
      resumeId: cvId,
      jobDescriptionId: jdId
    }
  });

  console.log(`Report created with ID: ${report.id}`);
  return report;
}
