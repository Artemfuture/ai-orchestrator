// services/dispatcher.js
const { callOpenAI } = require('../adapters/openaiAdapter');
const { callClaude } = require('../adapters/claudeAdapter');
const { callDeepSeek } = require('../adapters/deepseekAdapter');
const { callGemini } = require('../adapters/geminiAdapter');
const { getModelById, updateAvailability } = require('./modelRegistry');

const adapters = {
  openai: callOpenAI,
  anthropic: callClaude,
  deepseek: callDeepSeek,
  google: callGemini
};

async function dispatchParallel(selectedModels, prompt, apiKeys, timeout = 25000) {
  const promises = selectedModels.map(async (model) => {
    const adapter = adapters[model.provider];
    if (!adapter) return { status: 'rejected', reason: `No adapter for ${model.provider}` };
    const apiKey = apiKeys[model.provider];
    try {
      const result = await adapter(prompt, apiKey, { timeout });
      // Сброс счётчика ошибок при успехе
      updateAvailability(model.id, true);
      return { status: 'fulfilled', value: result };
    } catch (err) {
      console.warn(`Call to ${model.id} failed: ${err.message}`);
      // После нескольких неудач можно временно отключить модель
      // updateAvailability(model.id, false);
      return { status: 'rejected', reason: err.message };
    }
  });

  const results = await Promise.all(promises);
  const successful = results.filter(r => r.status === 'fulfilled').map(r => r.value);
  if (successful.length === 0) {
    // Fallback: пытаемся вызвать самую надёжную модель (Google Gemini Flash)
    console.warn('All selected models failed, attempting fallback to Gemini Flash');
    try {
      const fallbackModel = getModelById('gemini-flash');
      const fallbackResult = await adapters.google(prompt, apiKeys.google, { timeout });
      successful.push(fallbackResult);
    } catch (e) {
      console.error('Fallback also failed');
    }
  }
  return successful;
}

module.exports = { dispatchParallel };