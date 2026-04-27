// adapters/geminiAdapter.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Вызов Google Gemini API.
 * @param {string} prompt
 * @param {string} apiKey
 * @param {object} options - { timeout }
 * @returns {Promise<{text, model, latency_ms, tokens, finish_reason}>}
 */
async function callGemini(prompt, apiKey, { timeout = 30000 } = {}) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const startTime = Date.now();

  try {
    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Gemini request timeout')), timeout)
      )
    ]);

    const response = result.response;
    const text = response.text();
    const latency = Date.now() - startTime;

    // Gemini не всегда возвращает usage, поэтому используем заглушки
    return {
      text,
      model: 'gemini-flash',
      latency_ms: latency,
      tokens: {
        input: response.usageMetadata?.promptTokenCount ?? null,
        output: response.usageMetadata?.candidatesTokenCount ?? null
      },
      finish_reason: response.candidates?.[0]?.finishReason || 'STOP'
    };
  } catch (error) {
    console.error('Gemini error:', error.message);
    throw error;
  }
}

module.exports = { callGemini };