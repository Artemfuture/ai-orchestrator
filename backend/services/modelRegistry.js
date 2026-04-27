// services/modelRegistry.js
const fs = require('fs');
const path = require('path');
const configPath = path.join(__dirname, '..', 'config', 'models.json');
let models = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// In-memory статус, можно синхронизировать с Redis
const availability = new Map(models.map(m => [m.id, true]));

function updateAvailability(modelId, status) {
  availability.set(modelId, status);
}

function selectModels(taskType, limit = 3) {
  const candidates = models.filter(model =>
    model.competencies.includes(taskType) && availability.get(model.id) === true
  );
  candidates.sort((a, b) => a.priority - b.priority || a.cost_per_1k_tokens - b.cost_per_1k_tokens);
  return candidates.slice(0, limit);
}

function getModelById(id) {
  return models.find(m => m.id === id);
}

module.exports = { selectModels, getModelById, updateAvailability };