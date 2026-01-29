const http = require('http');

const PORT = 11434;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'POST' && req.url === '/api/generate') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      console.log('Mock Ollama received /api/generate request');

      const mockResponse = JSON.stringify({
        response: JSON.stringify({
          parsing_clarity_score: 85,
          keyword_match_score: 80,
          formatting_safety_score: 90,
          overall_score: 85,
          weighted_overall_score: 84,
          top_missing_keywords: ["Kubernetes", "GraphQL"],
          technical_questions: ["Explain React lifecycles.", "Node.js event loop?"],
          cultural_questions: ["Team conflict resolution?"],
          summary: "This is a mock analysis for testing purposes."
        }),
        done: true
      });

      res.writeHead(200);
      res.end(mockResponse);
    });
  } else if (req.method === 'GET' && req.url === '/api/tags') {
    console.log('Mock Ollama received /api/tags request');
    res.writeHead(200);
    res.end(JSON.stringify({
      models: [
        { name: "gemma3:latest" },
        { name: "qwen3:latest" }
      ]
    }));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
  }
});

server.listen(PORT, () => {
  console.log(`Mock Ollama running on port ${PORT}`);
});
