// Utility functions for cleaning text content

export function cleanReportText(text) {
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

export function cleanAnalysisContent(content) {
  if (!content) return content;

  return cleanReportText(content);
}
