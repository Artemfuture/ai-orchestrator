// adapters/openaiAdapter.js
const { OpenAI } = require('openai');

async function callOpenAI(prompt, apiKey, { timeout = 30000, stream = false } = {}) {
  const openai = new OpenAI({ apiKey });
  const start = Date.now();
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2000,
      stream,
      timeout
    });

    if (stream) {
      // Возвращаем итератор для чтения чанков
      return {
        stream: completion,
        model: 'gpt-4o',
        abort: () => completion.controller.abort()
      };
    } else {
      const choice = completion.choices[0];
      return {
        text: choice.message.content,
        model: 'gpt-4o',
        latency_ms: Date.now() - start,
        tokens: { input: completion.usage?.prompt_tokens, output: completion.usage?.completion_tokens },
        finish_reason: choice.finish_reason
      };
    }
  } catch (error) {
    // Обработка ошибок с повторными попытками (упрощённо)
    if (error.status === 429) {
      throw new Error('Rate limit exceeded');
    }
    throw error;
  }
}

module.exports = { callOpenAI };