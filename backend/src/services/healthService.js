import fetch from "node-fetch";
import { prisma } from "../utils/db.js";

export async function checkHealth() {
  const result = {
    database: false,
    tika: false,
    ollama: false,
  };

  try {
    await prisma.resume.count();
    result.database = true;
  } catch (_) {}

  try {
    const tikaHost = process.env.TIKA_URL || 'http://localhost:9998';
    const tikaRes = await fetch(tikaHost + "/version");
    result.tika = tikaRes.ok;
  } catch (_) {}

  try {
    const ollamaHost = process.env.OLLAMA_URL || 'http://localhost:11434';
    const ollamaRes = await fetch(ollamaHost + "/api/tags");
    result.ollama = ollamaRes.ok;
  } catch (_) {}

  return result;
}
