// Test the text cleaning functionality

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

- Parsing clarity: The resume is well-structured and ATS-friendly
- Keyword match: Strong alignment with job requirements
- Formatting: Clean and professional layout`;

const expectedCleanedText = `Here is some analysis:

The candidate shows strong technical skills. Some inline code here.

- Parsing clarity: The resume is well-structured and ATS-friendly
- Keyword match: Strong alignment with job requirements
- Formatting: Clean and professional layout`;

// This would be used in a testing framework
console.log('Test text cleaning functionality');
console.log('Original length:', testText.length);
console.log('Expected cleaned text:', expectedCleanedText);
