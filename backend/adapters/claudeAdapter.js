// adapters/claudeAdapter.js
const Anthropic = require('@anthropic-ai/sdk');

/**
 * Вызов API Anthropic Claude.
 * @param {string} prompt - промпт пользователя
 * @param {string} apiKey - ключ доступа
 * @param {object} options - { timeout, maxTokens }
 * @returns {Promise<{text, model, latency_ms, tokens, finish_reason}>}
 */
async function callClaude(prompt, apiKey, { timeout = 30000, maxTokens = 2000 } = {}) {
  const anthropic = new Anthropic({ apiKey });
  const startTime = Date.now();

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514', // актуальная модель Sonnet
      max_tokens: maxTokens,
      temperature: 0.7,
      system: 'You are a helpful AI assistant.',
      messages: [{ role: 'user', content: prompt }]
    }, {
      timeout
    });

    const latency = Date.now() - startTime;
    const textContent = message.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n');

    return {
      text: textContent,
      model: 'claude-sonnet',
      latency_ms: latency,
      tokens: {
        input: message.usage?.input_tokens,
        output: message.usage?.output_tokens
      },
      finish_reason: message.stop_reason
    };
  } catch (error) {
    if (error.status === 429) {
      throw new Error('Claude rate limit exceeded');
    }
    throw error;
  }
}

module.exports = { callClaude };