import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RECOMMENDED_MODELS_PATH = path.join(__dirname, '..', '..', 'prompts', 'recommended-models.yaml');

function loadRecommendedModels() {
  if (!fs.existsSync(RECOMMENDED_MODELS_PATH)) {
    return [];
  }

  const yamlText = fs.readFileSync(RECOMMENDED_MODELS_PATH, 'utf8');
  const parsed = yaml.load(yamlText);
  const models = Array.isArray(parsed?.models) ? parsed.models : [];

  return models
    .map((item) => (typeof item === 'string' ? { name: item } : item))
    .filter((item) => typeof item?.name === 'string' && item.name.trim().length > 0)
    .map((item) => ({ name: item.name.trim() }));
}

// Proxy endpoint to get available models from Ollama
router.get('/tags', async (req, res) => {
  try {
    const response = await fetch('http://ollama:11434/api/tags');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Failed to fetch Ollama models:', error);
    res.status(500).json({ error: 'Failed to fetch models from Ollama' });
  }
});

// Get recommended models for UI suggestions
router.get('/recommended-models', (req, res) => {
  try {
    const models = loadRecommendedModels();
    res.json({ models });
  } catch (error) {
    console.error('Failed to load recommended models:', error);
    res.status(500).json({ error: 'Failed to load recommended models' });
  }
});

// Pull/install a model
router.post('/pull', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Model name is required' });
    }

    console.log(`Starting model pull for: ${name}`);

    const response = await fetch('http://ollama:11434/api/pull', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Failed to pull model ${name}:`, errorData);
      return res.status(response.status).json({
        error: `Failed to install model: ${errorData}`
      });
    }

    // Handle streaming response
    let lastStatus = '';
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.status) {
              lastStatus = data.status;
              console.log(`Model ${name} pull status:`, data.status);
            }
          } catch (e) {
            // Ignore parsing errors for non-JSON lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    console.log(`Model ${name} pull completed with status: ${lastStatus}`);
    res.json({
      success: true,
      message: `Model ${name} installation completed`,
      status: lastStatus
    });
  } catch (error) {
    console.error('Failed to install model:', error);
    res.status(500).json({ error: 'Failed to install model: ' + error.message });
  }
});

// Delete a model
router.delete('/delete', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Model name is required' });
    }

    const response = await fetch('http://ollama:11434/api/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      return res.status(response.status).json({
        error: `Failed to delete model: ${errorData}`
      });
    }

    res.json({ success: true, message: `Model ${name} deleted successfully` });
  } catch (error) {
    console.error('Failed to delete model:', error);
    res.status(500).json({ error: 'Failed to delete model: ' + error.message });
  }
});

export default router;
