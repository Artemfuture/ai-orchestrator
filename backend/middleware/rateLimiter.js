// middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

/**
 * Настраиваемый ограничитель частоты запросов.
 * По умолчанию: 20 запросов в минуту на IP.
 */
const createRateLimiter = (options = {}) => {
  const {
    windowMs = 60 * 1000,       // 1 минута
    max = 20,                   // максимум запросов за окно
    message = { error: 'Too many requests, please try again later.' }
  } = options;

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,   // возвращает RateLimit-* заголовки
    legacyHeaders: false,
    message,
    keyGenerator: (req) => {
      // Можно использовать IP или ID пользователя из JWT
      return req.ip || req.headers['x-forwarded-for'] || 'unknown';
    }
  });
};

module.exports = { createRateLimiter };