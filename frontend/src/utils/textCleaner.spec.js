import { describe, it, expect } from 'vitest';
import { cleanReportText } from './textCleaner';

describe('textCleaner', () => {
  it('should remove markdown code blocks and backticks', () => {
    const testText = `Here is some analysis:

\`\`\`json
{
  "score": 85,
  "analysis": "Good match"
}
\`\`\`

The candidate shows strong technical skills. \`Some inline code\` here.

\`\`\`
More code blocks
\`\`\`

- Parsing clarity: Any resume information`;

    const cleaned = cleanReportText(testText);

    expect(cleaned).not.toContain('```json');
    expect(cleaned).not.toContain('{');
    expect(cleaned).not.toContain('}');
    expect(cleaned).not.toContain('`');
    expect(cleaned).toContain('Here is some analysis:');
    expect(cleaned).toContain('The candidate shows strong technical skills. Some inline code here.');
  });

  it('should handle undefined or empty strings', () => {
    expect(cleanReportText(undefined)).toBeUndefined();
    expect(cleanReportText('')).toBe('');
  });
});
