// services/aggregator.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function evaluateWithLLMJudge(originalPrompt, responses) {
  const judgeModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const formattedAnswers = responses.map((r, i) => 
    `Answer ${i+1} (model ${r.model}):\n${r.text.substring(0, 2000)}`
  ).join('\n\n');
  const judgePrompt = `
Оцени качество ответов на запрос пользователя. Запрос: "${originalPrompt}"
${formattedAnswers}
Для каждого ответа поставь оценку от 1 до 10. Учитывай релевантность, точность, полноту и ясность.
Верни JSON-массив вида [{"index":0, "score":8.5}, ...].`;
  const result = await judgeModel.generateContent(judgePrompt);
  const response = await result.response;
  const text = response.text();
  try {
    const scores = JSON.parse(text);
    return scores;
  } catch {
    console.warn('LLM judge returned unparseable output, falling back to heuristic');
    return null;
  }
}

function heuristicScore(response) {
  let score = 0;
  const len = response.text.length;
  if (len > 100 && len < 5000) score += 1;
  if (len > 500) score += 1;
  if (response.text.includes('```')) score += 2;
  if (response.text.includes('##') || response.text.includes('**')) score += 1;
  if (/(я не уверен|возможно|мне кажется|I am not sure)/i.test(response.text)) score -= 1;
  return score;
}

async function aggregateResults(responses, prompt, useJudge = true) {
  const valid = responses.filter(r => r.text?.trim().length > 0);
  if (valid.length === 0) return { primary: null, alternatives: [], error: 'No responses' };

  let ranked;
  if (useJudge && valid.length > 1) {
    const judgeScores = await evaluateWithLLMJudge(prompt, valid);
    if (judgeScores) {
      valid.forEach((r, i) => (r.externalScore = judgeScores.find(s => s.index === i)?.score ?? 0));
      valid.sort((a, b) => b.externalScore - a.externalScore);
      ranked = valid;
    } else {
      // fallback to heuristic
      valid.forEach(r => (r.heuristicScore = heuristicScore(r)));
      valid.sort((a, b) => b.heuristicScore - a.heuristicScore);
      ranked = valid;
    }
  } else {
    valid.forEach(r => (r.heuristicScore = heuristicScore(r)));
    valid.sort((a, b) => b.heuristicScore - a.heuristicScore);
    ranked = valid;
  }

  return {
    primary: ranked[0],
    alternatives: ranked.slice(1),
    metadata: { total_responses: responses.length, used_models: valid.map(r => r.model) }
  };
}

module.exports = { aggregateResults };