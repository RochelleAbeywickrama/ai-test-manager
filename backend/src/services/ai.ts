import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-6';

export async function generateTestPlan(requirements: string, projectName: string): Promise<string> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `You are a senior QA engineer. Generate a comprehensive test plan for the following requirements.

Project: ${projectName}
Requirements:
${requirements}

Produce a structured test plan in Markdown with these sections:
1. **Overview** - Brief summary of what is being tested
2. **Scope** - What is in and out of scope
3. **Test Strategy** - Approach (functional, integration, e2e, regression, performance)
4. **Test Areas** - Breakdown of functional areas with sub-areas and priority (High/Medium/Low)
5. **Entry & Exit Criteria** - When to start/stop testing
6. **Risk Analysis** - Potential risks and mitigations
7. **Test Data Requirements** - Data needed for testing
8. **Environment Requirements** - Setup needed

Be specific, practical, and thorough.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type from AI');
  return content.text;
}

export async function generateTestCase(
  description: string,
  framework: 'playwright' | 'cypress',
  projectName: string,
  context?: string
): Promise<{ title: string; code: string }> {
  const frameworkGuide =
    framework === 'playwright'
      ? 'Use Playwright with TypeScript. Use @playwright/test, page fixtures, expect assertions, and async/await.'
      : 'Use Cypress with TypeScript. Use cy.* commands, describe/it blocks, and Cypress assertions.';

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `You are a senior QA automation engineer. Generate a complete, runnable test case.

Project: ${projectName}
Framework: ${framework}
${context ? `Context/Additional info:\n${context}\n` : ''}
Test to write:
${description}

${frameworkGuide}

Respond with a JSON object (no markdown, just raw JSON) with exactly these fields:
{
  "title": "Short descriptive test title",
  "code": "Complete test file code here"
}

Requirements for the code:
- Include all necessary imports
- Use descriptive test names
- Include setup/teardown where appropriate
- Add comments explaining key steps
- Handle async operations correctly
- Include meaningful assertions
- Make it production-ready`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type from AI');

  try {
    const raw = content.text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(raw);
  } catch {
    // Fallback: extract code from the response
    return {
      title: description.slice(0, 80),
      code: content.text,
    };
  }
}

export async function improveTestCase(
  existingCode: string,
  feedback: string,
  framework: 'playwright' | 'cypress'
): Promise<string> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `You are a senior QA automation engineer. Improve the following ${framework} test based on the feedback.

Existing test:
\`\`\`typescript
${existingCode}
\`\`\`

Feedback / Changes requested:
${feedback}

Return only the improved code, no explanations.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type from AI');
  return content.text.replace(/```typescript\n?|\n?```/g, '').trim();
}
