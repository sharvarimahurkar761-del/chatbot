(function () {
  const settingsApi = window.ShivaSettings;
  let settings = settingsApi.loadSettings();
  let controller = null;
  let messages = [];

  const form = document.querySelector('#chatForm');
  const input = document.querySelector('#promptInput');
  const messagesEl = document.querySelector('#messages');
  const sendButton = document.querySelector('#sendButton');
  const stopButton = document.querySelector('#stopButton');
  const statusDot = document.querySelector('#statusDot');
  const statusLabel = document.querySelector('#statusLabel');
  const serverLabel = document.querySelector('#serverLabel');
  const newChatButton = document.querySelector('#newChatButton');
  const sidebarToggle = document.querySelector('#sidebarToggle');
  const sidebar = document.querySelector('.sidebar');
  const appShell = document.querySelector('.app-shell');
  const modelToggleButton = document.querySelector('#modelToggleButton');
  const modelMenu = document.querySelector('#modelMenu');
  const modelDropdownWrapper = document.querySelector('.model-dropdown-wrapper');
  let modelItems = Array.from(document.querySelectorAll('.model-item'));
  const deepAnalysisToggle = document.querySelector('#deepAnalysisToggle');

  function ensureModelIcons() {
    modelItems.forEach(item => {
      const icon = item.querySelector('.model-item-icon');
      if (!icon) return;
      const img = icon.querySelector('img');
      // If there is no image, or it failed to load (display:none or naturalWidth==0), show initial
      if (!img || img.style.display === 'none' || (img.naturalWidth !== undefined && img.naturalWidth === 0)) {
        const title = item.dataset.model || (item.querySelector('.model-item-title') || {}).textContent || '';
        icon.textContent = (title && title[0]) ? title[0].toUpperCase() : '?';
      }
    });
  }

  // ensure icons for static markup once images have loaded
  window.addEventListener('load', ensureModelIcons);

  let selectedModel = localStorage.getItem('shiva-selected-model') || 'bhairava';
  if (selectedModel === 'akshara' || selectedModel === 'reranker') {
    selectedModel = selectedModel === 'akshara' ? 'durga' : 'bhairava';
    localStorage.setItem('shiva-selected-model', selectedModel);
  }
  let sidebarCollapsed = localStorage.getItem('shiva-sidebar-collapsed') === 'true';
  let deepAnalysisEnabled = false;
  
  const LLAMA_SERVER_URL = 'http://tmlpnewskc31137.tmindia.tatamotors.com:4244';

  const startupPrompts = [
    'Explain quantum computing in simple terms',
    'Write a business plan for a SaaS startup',
    'Debug this Python code snippet',
    'Summarize the latest AI research trends'
  ];

  function normalizeModelName(modelName) {
    const normalized = String(modelName || '').trim().toLowerCase();
    return normalized === 'akshara' ? 'durga' : normalized;
  }

  function shouldHideModel(modelName) {
    return String(modelName || '').trim().toLowerCase() === 'reranker';
  }

  function updateModelSelection() {
    if (modelItems.length && !modelItems.some((item) => !item.hidden && item.dataset.model === selectedModel)) {
      selectedModel = modelItems.find((item) => !item.hidden)?.dataset.model || selectedModel;
      localStorage.setItem('shiva-selected-model', selectedModel);
    }

    const modelText = selectedModel.toUpperCase();
    modelToggleButton.textContent = `${modelText} ▼`;
    modelItems.forEach((item) => {
      item.classList.toggle('active', item.dataset.model === selectedModel);
    });
  }

  async function fetchAndPopulateModels() {
    try {
      const response = await fetch(`${LLAMA_SERVER_URL}/v1/models`, { 
        signal: AbortSignal.timeout(5000) 
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      const models = data.data || [];
      
      if (models.length === 0) {
        console.warn('No models found in llama-server response');
        return;
      }

      // Generate HTML for each model
      const seenModels = new Set();
      const modelsHtml = models.map((model, index) => {
        const modelName = model.id || model.model || '';
        if (shouldHideModel(modelName)) return '';

        const modelNameLower = normalizeModelName(modelName);
        if (!modelNameLower || seenModels.has(modelNameLower)) return '';
        seenModels.add(modelNameLower);

        const displayNameUpper = modelNameLower.toUpperCase();
        const subtitle = modelNameLower === 'durga' ? 'General purpose AI assistant' : (model.description || model.name || 'AI Model');
        const isActive = index === 0 ? 'active' : '';
        return `
          <div class="model-item ${isActive}" data-model="${modelNameLower}">
            <div class="model-item-icon">
              <img src="./static/assets/${modelNameLower}.png" alt="${displayNameUpper} icon" onerror="this.style.display='none'; this.parentElement.classList.add('no-img')" />
            </div>
            <div class="model-item-info">
              <div class="model-item-title">${escapeHtml(displayNameUpper)}</div>
              <div class="model-item-subtitle">${escapeHtml(subtitle)}</div>
            </div>
            <div class="model-item-actions">
              <span class="model-action" data-modelname="${modelNameLower}">♥</span>
              <span class="model-action">⏻</span>
            </div>
          </div>
        `;
      }).join('');

      // Replace modelMenu content
      modelMenu.innerHTML = modelsHtml;

      // Update modelItems reference
      modelItems = Array.from(modelMenu.querySelectorAll('.model-item'));

      // Provide fallback initials for any model icons that failed to load
      modelItems.forEach(item => {
        const icon = item.querySelector('.model-item-icon');
        if (!icon) return;
        const img = icon.querySelector('img');
        if (!img || img.style.display === 'none') {
          // set initial letter from model name
          const title = item.dataset.model || (item.querySelector('.model-item-title') || {}).textContent || '';
          icon.textContent = (title && title[0]) ? title[0].toUpperCase() : '?';
        }
      });

      // Reattach event listeners to new model items
      modelItems.forEach((item) => {
        item.addEventListener('click', () => {
          selectedModel = item.dataset.model;
          localStorage.setItem('shiva-selected-model', selectedModel);
          updateModelSelection();
          closeModelMenu();
        });
      });

      // Set the first model as default if not already set
      if (modelItems.length > 0 && !localStorage.getItem('shiva-selected-model')) {
        selectedModel = modelItems[0].dataset.model;
        localStorage.setItem('shiva-selected-model', selectedModel);
      }

      updateModelSelection();
    } catch (error) {
      console.error('Failed to fetch models from llama-server:', error);
      // Keep the static models as fallback
    }
  }

  function updateSidebarState() {
    if (sidebarCollapsed) {
      sidebar.classList.add('collapsed');
      appShell.classList.add('collapsed');
      sidebarToggle.textContent = '»';
      sidebarToggle.setAttribute('aria-label', 'Expand sidebar');
    } else {
      sidebar.classList.remove('collapsed');
      appShell.classList.remove('collapsed');
      sidebarToggle.textContent = '«';
      sidebarToggle.setAttribute('aria-label', 'Collapse sidebar');
    }
  }

  function updateDeepAnalysisState() {
    if (!deepAnalysisToggle) return;
    deepAnalysisToggle.classList.toggle('enabled', deepAnalysisEnabled);
    deepAnalysisToggle.setAttribute('aria-pressed', String(deepAnalysisEnabled));
  }

  if (deepAnalysisToggle) {
    deepAnalysisToggle.addEventListener('click', () => {
      deepAnalysisEnabled = !deepAnalysisEnabled;
      updateDeepAnalysisState();
    });
    updateDeepAnalysisState();
  }

  function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
    localStorage.setItem('shiva-sidebar-collapsed', sidebarCollapsed);
    updateSidebarState();
  }

  function toggleModelMenu() {
    const isOpen = !modelMenu.classList.contains('hidden');
    if (isOpen) {
      closeModelMenu();
    } else {
      openModelMenu();
    }
  }

  function openModelMenu() {
    modelMenu.classList.remove('hidden');
    modelToggleButton.setAttribute('aria-expanded', 'true');
  }

  function closeModelMenu() {
    modelMenu.classList.add('hidden');
    modelToggleButton.setAttribute('aria-expanded', 'false');
  }

  function applyTheme() {
    const theme = settings.general.theme;
    const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
  }

  function renderMessages() {
    if (!messages.length) {
      const promptsHtml = startupPrompts.map(prompt => `
        <div class="prompt-card">${escapeHtml(prompt)}</div>
      `).join('');

      messagesEl.innerHTML = `
        <div class="empty-state">
          <h2 class="empty-state-title">How can I help you, User?</h2>
          <p>Select a model and type a message or upload files to get started.</p>
          <div class="startup-prompts">
            ${promptsHtml}
          </div>
        </div>
      `;
      return;
    }

    messagesEl.innerHTML = messages.map((message) => `
      <article class="message ${message.role}">
        <div class="message-role">${message.role === 'user' ? 'You' : 'Shiva'}</div>
        <pre>${escapeHtml(message.content)}</pre>
        ${message.stats ? `<div class="message-stats">${escapeHtml(message.stats)}</div>` : ''}
      </article>
    `).join('');

    if (!settings.display.disableAutoscroll) {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function setBusy(isBusy) {
    sendButton.disabled = isBusy;
    stopButton.disabled = !isBusy;
    input.disabled = isBusy;
  }

  function setStatus(kind, label) {
    statusDot.className = `status-dot ${kind}`;
    statusLabel.textContent = label;
    serverLabel.textContent = settings.serverUrl;
  }

  async function checkHealth() {
    setStatus('checking', 'Checking server');
    try {
      const response = await fetch(`${settings.serverUrl}/health`, { signal: AbortSignal.timeout(3000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json().catch(() => ({}));
      setStatus(data.status === 'ok' ? 'online' : 'checking', data.status || 'Server responded');
    } catch (error) {
      setStatus('error', 'Server unavailable');
    }
  }

  function buildRequest() {
    return {
      model: selectedModel,
      messages: [
        { role: 'system', content: settings.systemPrompt },
        ...messages
          .filter((message) => message.role === 'user' || message.content.trim())
          .map((message) => ({ role: message.role, content: message.content }))
      ],
      stream: true,
      temperature: Number(settings.sampling.temperature),
      max_tokens: Number(settings.sampling.maxTokens),
      top_p: Number(settings.sampling.topP),
      top_k: Number(settings.sampling.topK),
      min_p: Number(settings.sampling.minP),
      repeat_penalty: Number(settings.penalties.repeatPenalty),
      stream_options: { include_usage: true }
    };
  }

  async function sendPrompt(prompt) {
    messages.push({ role: 'user', content: prompt });
    const assistantMessage = { role: 'assistant', content: '' };
    messages.push(assistantMessage);
    renderMessages();

    controller = new AbortController();
    setBusy(true);

    const started = performance.now();
    const payload = JSON.stringify(buildRequest());
    try {
      const response = await fetch(`${settings.serverUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        signal: controller.signal
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      if (!response.body) throw new Error('The model server did not return a stream.');

      await readStream(response.body, assistantMessage);
      const seconds = Math.max((performance.now() - started) / 1000, 0.1);
      if (settings.display.showGenStats) {
        assistantMessage.stats = `${seconds.toFixed(1)}s`;
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        assistantMessage.content = `Could not reach the live model server. ${error.message}`;
      }
    } finally {
      controller = null;
      setBusy(false);
      renderMessages();
    }
  }

  async function readStream(body, assistantMessage) {
    const reader = body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;

        const raw = trimmed.slice(6);
        if (raw === '[DONE]') return;

        try {
          const chunk = JSON.parse(raw);
          const delta = chunk.choices && chunk.choices[0] && chunk.choices[0].delta;
          const text = (delta && (delta.content || delta.reasoning_content)) || '';
          if (text) {
            assistantMessage.content += text;
            renderMessages();
          }
        } catch {
          // Ignore malformed stream fragments and keep reading.
        }
      }
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const prompt = input.value.trim();
    if (!prompt) return;
    input.value = '';
    sendPrompt(prompt);
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && settings.general.sendOnEnter) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  stopButton.addEventListener('click', () => {
    if (controller) controller.abort();
  });

  newChatButton.addEventListener('click', () => {
    messages = [];
    renderMessages();
  });

  sidebarToggle.addEventListener('click', () => {
    toggleSidebar();
  });

  modelToggleButton.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleModelMenu();
  });

  modelItems.forEach((item) => {
    item.addEventListener('click', () => {
      selectedModel = item.dataset.model;
      localStorage.setItem('shiva-selected-model', selectedModel);
      updateModelSelection();
      closeModelMenu();
    });
  });

  document.addEventListener('click', (event) => {
    if (modelDropdownWrapper && !modelDropdownWrapper.contains(event.target)) {
      closeModelMenu();
    }
    if (event.target.classList.contains('prompt-card')) {
      input.value = event.target.textContent;
      input.focus();
    }
  });

  applyTheme();
  updateModelSelection();
  updateSidebarState();
  renderMessages();
  checkHealth();
  fetchAndPopulateModels();
})();
