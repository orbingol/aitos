export function buildPrompt(model, resumeText, jdText) {
  if (model === 'gpt-oss') {
    return `You are simulating a commercial Applicant Tracking System (ATS).\nAnalyze the resume and the job description.\nScores must be integers between 0 and 100.\n\n### INPUTS\nResume text:\n${resumeText}\n\nJob description:\n${jdText}\n\n### OUTPUT FORMAT\n1. JSON report with keys:\n{\n  "parsing_clarity_score": 0-100,\n  "keyword_match_score": 0-100,\n  "formatting_safety_score": 0-100,\n  "overall_score": 0-100,\n  "weighted_overall_score": 0-100,\n  "top_missing_keywords": ["kw1","kw2","kw3"],\n  "technical_questions": ["q1","q2","q3","q4","q5","q6"],\n  "cultural_questions": ["cq1","cq2","cq3"],\n  "summary": "short 1-2 sentence overview"\n}\n2. Human-readable report in this format:\n- Parsing clarity: Provide an analysis of whether the resume can be fully parsed by common ATS systems. Highlight any problematic areas.\n- Keyword & skills match: Evaluate how well the resume matches the job description. List strong matches and missing critical keywords or skills.\n- Formatting risks: Identify formatting elements (tables, columns, graphics, headers/footers) that may confuse ATS parsing.\n- Improvement suggestions: Offer actionable advice to improve ATS readability and alignment.\n- Suggested company questions: Provide 5-6 technical questions and 2-3 cultural questions that the candidate could ask the company.\nDo not include any extra text.`;
  }

  // Gemma3 / Qwen3 prompt
  return `You are an ATS resume analyzer and company question generator.\nDo NOT provide career advice or cover letter suggestions.\nRespond exactly in the requested format.\n\n### INPUTS\nResume text:\n${resumeText}\n\nJob description:\n${jdText}\n\n### TASK\n1. Analyze parsing clarity: can ATS parse it fully? Is anything missing?\n2. Analyze keyword & skills match with the job description.\n3. Identify formatting risks: tables, columns, graphics, headers/footers, etc.\n4. Compute scores:\n   - parsing_clarity_score (0-100)\n   - keyword_match_score (0-100)\n   - formatting_safety_score (0-100)\n   - overall_score (0-100, model's own overall assessment)\n   - weighted_overall_score = 0.4*keyword_match + 0.3*parsing_clarity + 0.3*formatting_safety\n5. List top missing keywords relevant to the job.\n6. Generate 5-6 technical questions and 2-3 cultural questions for the company.\n7. Provide a short 1-2 sentence summary.\n\n### OUTPUT ORDER\n1. First, output the JSON exactly as specified.\n2. Then, output the human-readable report in the exact format below.\n3. Do NOT add any other text outside these two outputs.\n\n### OUTPUT FORMAT\n1. JSON report with keys:\n{\n  "parsing_clarity_score": <0-100>,\n  "keyword_match_score": <0-100>,\n  "formatting_safety_score": <0-100>,\n  "overall_score": <0-100>,\n  "weighted_overall_score": <0-100>,\n  "top_missing_keywords": ["kw1","kw2","kw3"],\n  "technical_questions": ["q1","q2","q3","q4","q5","q6"],\n  "cultural_questions": ["cq1","cq2","cq3"],\n  "summary": "short 1-2 sentence overview"\n}\n2. Human-readable report in this format:\n- Parsing clarity: Provide an analysis of whether the resume can be fully parsed by common ATS systems. Highlight any areas or sections that might be problematic.\n- Keyword & skills match: Evaluate how well the resume matches the job description. List both strong matches and missing critical keywords or skills.\n- Formatting risks: Identify any formatting elements (tables, columns, graphics, headers/footers) that may confuse ATS parsing.\n- Improvement suggestions: Offer concrete, actionable advice to improve ATS readability and alignment with the job description.\n- Suggested company questions: Provide 5-6 technical questions and 2-3 cultural questions that the candidate could ask the company based on the job description and company values.`;
}

export async function runOllama(model, prompt) {
  try {
    console.log(`Running Ollama with model: ${model}`);
    console.log(`Prompt length: ${prompt.length} characters`);

    const ollamaUrl = process.env.OLLAMA_URL || 'http://ollama:11434';
    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false
      })
    });

    console.log(`Ollama response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Ollama API error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`Ollama response received, length: ${data.response?.length || 0} characters`);

    if (!data.response) {
      console.error('No response field in Ollama data:', data);
      throw new Error('No response received from Ollama');
    }

    return data.response;
  } catch (error) {
    console.error('runOllama error:', error);
    throw new Error(`Failed to run Ollama model: ${error.message}`);
  }
}

export function splitJsonAndReport(output) {
  console.log(`splitJsonAndReport called with output length: ${output?.length || 0}`);
  console.log(`First 200 chars of output:`, output?.slice(0, 200));

  // Attempts to parse the first JSON block from the output and return [jsonObj, reportString]
  // Robust against trailing text after JSON, using brace matching.
  const start = output.indexOf('{');
  if (start === -1) {
    console.error('JSON start not found in model output');
    throw new Error('JSON start not found in model output');
  }

  console.log(`JSON start found at position: ${start}`);

  let depth = 0;
  for (let i = start; i < output.length; i++) {
    const ch = output[i];
    if (ch === '{') depth++;
    if (ch === '}') depth--;
    if (depth === 0) {
      const jsonStr = output.slice(start, i + 1);
      console.log(`Extracted JSON string length: ${jsonStr.length}`);

      try {
        const json = JSON.parse(jsonStr);
        const report = cleanReportText(output.slice(i + 1).trim());
        console.log(`Successfully parsed JSON, cleaned report length: ${report.length}`);
        return [json, report];
      } catch (e) {
        console.error('JSON parse error:', e.message);
        // continue scanning (unlikely if brace match succeeded)
      }
    }
  }
  console.error('Failed to parse JSON from model output');
  throw new Error('Failed to parse JSON from model output');
}

// Clean unwanted characters and formatting from report text
function cleanReportText(text) {
  if (!text || typeof text !== 'string') {
    return text;
  }

  return text
    // Remove markdown code blocks (with optional language specifier)
    .replace(/```[\w]*\s*[\s\S]*?```/g, '')
    .replace(/```/g, '')
    // Remove single and double backticks
    .replace(/`{1,2}/g, '')
    // Remove any remaining code fence markers
    .replace(/^~~~.*$/gm, '')
    .replace(/~~~[\s\S]*?~~~/g, '')
    // Clean up HTML-like tags that might appear
    .replace(/<\/?[^>]+(>|$)/g, '')
    // Clean up extra whitespace and empty lines
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/^\s+|\s+$/g, '')
    // Remove any remaining markdown artifacts
    .replace(/^\s*[-*+]\s*$/gm, '')
    .trim();
}
