// services/classifier.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const CLASSIFICATION_PROMPT = `
Определи тип запроса пользователя одним словом из списка:
CODE_GENERATION, TEXT_GENERATION, CREATIVE_WRITING, TRANSLATION, SUMMARIZATION, DATA_ANALYSIS, FACTUAL_QA.
Ответь только категорией.
Запрос: `;

async function classifyWithLLM(prompt) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const result = await model.generateContent(CLASSIFICATION_PROMPT + prompt);
  const response = await result.response;
  return response.text().trim();
}

function heuristicClassify(prompt) {
  const lower = prompt.toLowerCase();
  if (/(напиши код|функци[яй]|class |def |function |алгоритм|программ|реализуй|import )/.test(lower))
    return { type: 'CODE_GENERATION', confidence: 0.9 };
  if (/(переведи|перевод|translate|на .* язык)/.test(lower))
    return { type: 'TRANSLATION', confidence: 0.9 };
  if (/(кратко|суммир|резюме|выжимка|основн.. мысл|abstract)/.test(lower))
    return { type: 'SUMMARIZATION', confidence: 0.8 };
  if (/(анализ|данные|таблиц|график|статистик|вывод|тенденц)/.test(lower))
    return { type: 'DATA_ANALYSIS', confidence: 0.7 };
  if (/(стих|рассказ|сценарий|креатив|творческ|придумай|историю)/.test(lower))
    return { type: 'CREATIVE_WRITING', confidence: 0.8 };
  return { type: 'TEXT_GENERATION', confidence: 0.5 };
}

async function classifyRequest(prompt) {
  const heuristic = heuristicClassify(prompt);
  if (heuristic.confidence >= 0.8) {
    return heuristic.type;
  }
  try {
    return await classifyWithLLM(prompt);
  } catch (err) {
    console.warn('LLM classification failed, using heuristic:', err.message);
    return heuristic.type; // fallback
  }
}

module.exports = { classifyRequest };