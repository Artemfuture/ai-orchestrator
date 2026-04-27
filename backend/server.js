// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const { rateLimit } = require('express-rate-limit');
const { classifyRequest } = require('./services/classifier');
const { selectModels } = require('./services/modelRegistry');
const { dispatchParallel } = require('./services/dispatcher');
const { aggregateResults } = require('./services/aggregator');
const { createRateLimiter } = require('./middleware/rateLimiter');
const authMiddleware = require('./middleware/auth');
const app = express();

// Стандартный rate limiter без кастомного keyGenerator (убирает ошибку IPv6)
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 минута
  max: 30,             // максимум 30 запросов за минуту
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

app.use(express.json());

// Правильный путь к статике: из backend/../frontend получаем frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Корневой маршрут для подстраховки (отдаёт index.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Ключи API из переменных окружения
const apiKeys = {
  openai: process.env.OPENAI_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
  deepseek: process.env.DEEPSEEK_API_KEY,
  google: process.env.GEMINI_API_KEY
};

// Маршрут с аутентификацией (JWT в заголовке Authorization: Bearer <token>)
app.post('/api/ask', authMiddleware, async (req, res) => {
  const startTime = Date.now();
  const { prompt, stream: requestStream = false } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

  try {
    const taskType = await classifyRequest(prompt);
    const selected = selectModels(taskType, 3);
    console.log(`Task: ${taskType}, models: ${selected.map(m => m.id)}`);

    if (requestStream && selected.some(m => m.streaming_supported)) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      });
      const streamModel = selected.find(m => m.streaming_supported);
      // Заглушка потокового режима
      res.write(`event: done\ndata: ${JSON.stringify({ total_latency_ms: Date.now() - startTime })}\n\n`);
      res.end();
    } else {
      const responses = await dispatchParallel(selected, prompt, apiKeys, 25000);
      const aggregated = await aggregateResults(responses, prompt, true);
      aggregated.metadata.total_latency_ms = Date.now() - startTime;
      aggregated.metadata.task_type = taskType;
      res.json(aggregated);
    }
  } catch (err) {
    console.error('Orchestration error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Orchestrator running on port ${PORT}`));
