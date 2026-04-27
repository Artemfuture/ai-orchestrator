// frontend/app.js
let authToken = '';

// Элементы интерфейса
const loginSection = document.getElementById('login-section');
const appSection = document.getElementById('app-section');
const tokenInput = document.getElementById('token-input');
const loginBtn = document.getElementById('login-btn');
const promptInput = document.getElementById('prompt');
const sendBtn = document.getElementById('send-btn');
const statusEl = document.getElementById('status');
const primaryContent = document.getElementById('primary-content');
const primaryModel = document.getElementById('primary-model');
const altList = document.getElementById('alt-list');
const metadataEl = document.getElementById('metadata');

// Вход по токену
loginBtn.addEventListener('click', () => {
  const token = tokenInput.value.trim();
  if (token) {
    authToken = token;
    loginSection.style.display = 'none';
    appSection.style.display = 'block';
  } else {
    alert('Введите JWT-токен');
  }
});

// Отправка запроса
sendBtn.addEventListener('click', async () => {
  const prompt = promptInput.value.trim();
  if (!prompt) return;

  // Очищаем предыдущие результаты
  primaryContent.textContent = '';
  primaryModel.textContent = '';
  altList.innerHTML = '';
  metadataEl.innerHTML = '';
  statusEl.textContent = '⏳ Обработка...';

  try {
    const response = await fetch('/api/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ prompt, stream: false })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    statusEl.textContent = '';

    // Основной ответ
    if (data.primary) {
      primaryContent.textContent = data.primary.text;
      primaryModel.textContent = `(модель: ${data.primary.model}, ${data.primary.latency_ms} мс)`;
    } else {
      primaryContent.textContent = data.error || 'Нет ответа';
    }

    // Альтернативы
    if (data.alternatives && data.alternatives.length > 0) {
      data.alternatives.forEach(alt => {
        const div = document.createElement('div');
        div.className = 'alternative-item';
        div.innerHTML = `
          <h4>${alt.model} <small>(${alt.latency_ms} мс)</small></h4>
          <p>${alt.text.substring(0, 500)}${alt.text.length > 500 ? '...' : ''}</p>
        `;
        altList.appendChild(div);
      });
    } else if (!data.error) {
      altList.innerHTML = '<p>Альтернативы отсутствуют</p>';
    }

    // Метаданные
    if (data.metadata) {
      metadataEl.innerHTML = `
        <p>⏱️ Общее время: ${data.metadata.total_latency_ms} мс |
        📋 Тип задачи: ${data.metadata.task_type || '—'} |
        🤖 Модели: ${data.metadata.used_models?.join(', ') || '—'}</p>
      `;
    }
  } catch (error) {
    statusEl.textContent = '';
    primaryContent.textContent = `Ошибка: ${error.message}`;
    console.error(error);
  }
});

// Возможность отправить по Enter
promptInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendBtn.click();
  }
});