import { Router } from 'express';

const router = Router();

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
