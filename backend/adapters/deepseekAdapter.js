// adapters/deepseekAdapter.js
const OpenAI = require('openai');

async function callDeepSeek(prompt, apiKey, { timeout = 30000 } = {}) {
  const client = new OpenAI({
    baseURL: 'https://api.deepseek.com/v1',
    apiKey
  });
  const start = Date.now();
  const completion = await client.chat.completions.create({
    model: 'deepseek-coder',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.0,
    max_tokens: 2000,
    stream: false
  }, { timeout });
  const choice = completion.choices[0];
  return {
    text: choice.message.content,
    model: 'deepseek-coder',
    latency_ms: Date.now() - start,
    tokens: { input: completion.usage?.prompt_tokens, output: completion.usage?.completion_tokens },
    finish_reason: choice.finish_reason
  };
}

module.exports = { callDeepSeek };