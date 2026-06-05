(function () {
  const settingsApi = window.ShivaSettings;
  let settings = settingsApi.loadSettings();
  let controller = null;
  let messages = [];

  const form = document.querySelector('#chatForm');
  const input = document.querySelector('#promptInput');
  const messagesEl = document.querySelector('#messages');
  const emptyState = document.querySelector('#emptyState');
  const agenticConversation = document.querySelector('#agenticConversation');
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
  const toast = document.querySelector('#toast');
  const LLAMA_SERVER_URL = 'http://tmlpnewskc31137.tmindia.tatamotors.com:4244';
  settings.serverUrl = LLAMA_SERVER_URL;
  let toastTimer = null;

  function ensureModelIcons() {
    modelItems.forEach(item => {
      const icon = item.querySelector('.model-item-icon');
      if (!icon) return;

      const modelName = item.dataset.model || (item.querySelector('.model-item-title') || {}).textContent || '';
      const img = icon.querySelector('img');

      function showInitial() {
        icon.classList.add('no-img');
        icon.innerHTML = `<span class="model-icon-initial">${getModelInitial(modelName)}</span>`;
      }

      if (!img) {
        if (!icon.textContent.trim()) showInitial();
        return;
      }

      img.addEventListener('error', showInitial, { once: true });

      if (img.complete && img.naturalWidth === 0) {
        showInitial();
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
  
  const startupPrompts = [
    'Explain quantum computing in simple terms',
    'Write a business plan for a SaaS startup',
    'Debug this Python code snippet',
    'Summarize the latest AI research trends'
  ];

  if (window.marked) {
    window.marked.setOptions({
      breaks: true,
      gfm: true
    });
  }

  const MODEL_ICON_PATHS = {
    bhairava: './static/assets/bhairava.png',
    durga: './static/assets/durga.png',
    ishaan: './static/assets/ishaan.png',
    nandi: './static/assets/Nandi.png',
    rudra: './static/assets/rudra.png',
    shakti: './static/assets/shakti.png'
  };

  function normalizeModelName(modelName) {
    const normalized = String(modelName || '').trim().toLowerCase();
    return normalized === 'akshara' ? 'durga' : normalized;
  }

  function shouldHideModel(modelName) {
    return String(modelName || '').trim().toLowerCase() === 'reranker';
  }

  function getModelInitial(modelName) {
    const normalized = normalizeModelName(modelName);
    return normalized ? normalized[0].toUpperCase() : '?';
  }

  function renderModelIcon(modelName) {
    const normalized = normalizeModelName(modelName);
    const embeddedIcon = window.ASSETS && window.ASSETS[normalized] && window.ASSETS[normalized].data;
    const iconPath = MODEL_ICON_PATHS[normalized];

    if (embeddedIcon) {
      return embeddedIcon;
    }

    if (!iconPath) {
      return `<span class="model-icon-initial">${getModelInitial(normalized)}</span>`;
    }

    return `<img src="${iconPath}" alt="${escapeHtml(normalized.toUpperCase())} icon">`;
  }

  function showToast(message, type = 'info') {
    if (!toast) return;
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.className = `toast visible ${type}`;
    toastTimer = window.setTimeout(() => {
      toast.classList.remove('visible');
    }, 2600);
  }

  function getModelId(item) {
    return item && (item.dataset.modelId || item.dataset.model);
  }

  function getModelDisplayName(modelId) {
    const item = modelItems.find((modelItem) => getModelId(modelItem) === modelId || modelItem.dataset.model === modelId);
    const title = item && item.querySelector('.model-item-title');
    return title ? title.textContent.trim() : String(modelId || '').toUpperCase();
  }

  function getModelStatus(model) {
    const status = model && model.status;
    if (status && typeof status === 'object' && status.value) return String(status.value).toLowerCase();
    if (typeof status === 'string') return status.toLowerCase();
    if (model && model.loaded === true) return 'loaded';
    return 'loaded';
  }

  function isUnloadActionStatus(status) {
    return status === 'loaded' || status === 'loading' || status === 'sleeping';
  }

  function renderModelStatus(status) {
    const normalized = String(status || 'loaded').toLowerCase();
    const label = normalized === 'failed' ? 'failed' : normalized;
    return `<span class="model-status ${escapeHtml(normalized)}">${escapeHtml(label)}</span>`;
  }

  function updateModelItemRuntimeState(item, status, isBusy = false) {
    if (!item) return;
    const normalized = String(status || item.dataset.status || 'loaded').toLowerCase();
    const action = item.querySelector('.start-stop');
    const badge = item.querySelector('.model-status');

    item.dataset.status = normalized;
    item.classList.toggle('model-loading', isBusy || normalized === 'loading');
    item.classList.toggle('model-loaded', normalized === 'loaded');
    item.classList.toggle('model-unloaded', normalized === 'unloaded' || normalized === 'failed');

    if (badge) {
      badge.textContent = normalized;
      badge.className = `model-status ${normalized}`;
    }

    if (action) {
      action.textContent = isUnloadActionStatus(normalized) ? '⏻' : '▶';
      action.title = isUnloadActionStatus(normalized) ? 'Unload model' : 'Load model';
      action.setAttribute('aria-label', action.title);
      action.setAttribute('role', 'button');
      action.setAttribute('tabindex', '0');
      action.classList.toggle('busy', isBusy || normalized === 'loading');
      action.setAttribute('aria-busy', String(isBusy || normalized === 'loading'));
    }
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
            <div class="model-item-icon">${renderModelIcon(modelNameLower)}</div>
            <div class="model-item-info">
              <div class="model-item-title">${escapeHtml(displayNameUpper)}</div>
              <div class="model-item-subtitle">${escapeHtml(subtitle)}</div>
            </div>
            <div class="model-item-actions" >
              <span class ="model-action set-favourite"  data-modelname="${modelNameLower}">♥</span>
              <span class="model-action start-stop"  data-modelname="${modelNameLower}">⏻</span>
            </div>
          </div>
        `;
      }).join('');

      // Replace modelMenu content
      modelMenu.innerHTML = modelsHtml;

      // Update modelItems reference
      modelItems = Array.from(modelMenu.querySelectorAll('.model-item'));

      ensureModelIcons();

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

  function updateModelSelection() {
    if (modelItems.length && !modelItems.some((item) => !item.hidden && getModelId(item) === selectedModel)) {
      selectedModel = getModelId(modelItems.find((item) => !item.hidden)) || selectedModel;
      localStorage.setItem('shiva-selected-model', selectedModel);
    }

    const modelText = getModelDisplayName(selectedModel);
    modelToggleButton.textContent = `${modelText} v`;
    modelItems.forEach((item) => {
      item.classList.toggle('active', getModelId(item) === selectedModel);
    });
  }

  async function fetchModels() {
    const response = await fetch(`${LLAMA_SERVER_URL}/models`, {
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async function fetchOpenAiModelsFallback() {
    const response = await fetch(`${LLAMA_SERVER_URL}/v1/models`, {
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async function fetchAndPopulateModels(options = {}) {
    try {
      let data;
      try {
        data = await fetchModels();
      } catch {
        data = await fetchOpenAiModelsFallback();
      }

      const models = data.data || [];
      if (models.length === 0) {
        console.warn('No models found in llama-server response');
        return;
      }

      const seenModels = new Set();
      const modelsHtml = models.map((model, index) => {
        const modelName = model.id || model.model || '';
        if (shouldHideModel(modelName)) return '';

        const modelNameLower = normalizeModelName(modelName);
        if (!modelNameLower || seenModels.has(modelNameLower)) return '';
        seenModels.add(modelNameLower);

        const displayNameUpper = modelNameLower.toUpperCase();
        const subtitle = modelNameLower === 'durga' ? 'General purpose AI assistant' : (model.description || model.name || 'AI Model');
        const status = getModelStatus(model);
        const isActive = selectedModel === modelName || (!localStorage.getItem('shiva-selected-model') && index === 0) ? 'active' : '';

        return `
          <div class="model-item ${isActive}" data-model="${escapeHtml(modelNameLower)}" data-model-id="${escapeHtml(modelName)}" data-status="${escapeHtml(status)}">
            <div class="model-item-icon">${renderModelIcon(modelNameLower)}</div>
            <div class="model-item-info">
              <div class="model-item-title">${escapeHtml(displayNameUpper)}</div>
              <div class="model-item-subtitle">${escapeHtml(subtitle)}</div>
              ${renderModelStatus(status)}
            </div>
            <div class="model-item-actions">
              <span class="model-action set-favourite" data-modelname="${escapeHtml(modelName)}">♥</span>
              <span class="model-action start-stop" data-modelname="${escapeHtml(modelName)}" role="button" tabindex="0">${isUnloadActionStatus(status) ? '⏻' : '▶'}</span>
            </div>
          </div>
        `;
      }).join('');

      modelMenu.innerHTML = modelsHtml;
      modelItems = Array.from(modelMenu.querySelectorAll('.model-item'));
      ensureModelIcons();
      modelItems.forEach((item) => updateModelItemRuntimeState(item, item.dataset.status));

      if (modelItems.length > 0 && !localStorage.getItem('shiva-selected-model')) {
        selectedModel = getModelId(modelItems[0]);
        localStorage.setItem('shiva-selected-model', selectedModel);
      }

      updateModelSelection();
    } catch (error) {
      console.error('Failed to fetch models from llama-server:', error);
      if (!options.silent) showToast(`Could not refresh models. ${error.message}`, 'error');
      modelItems.forEach((item) => updateModelItemRuntimeState(item, item.dataset.status || 'loaded'));
    }
  }

  function findModelStatus(modelsData, modelId) {
    const model = (modelsData.data || []).find((candidate) => {
      const candidateId = candidate.id || candidate.model || '';
      return candidateId === modelId || normalizeModelName(candidateId) === normalizeModelName(modelId);
    });

    return model ? getModelStatus(model) : '';
  }

  async function waitForModelLifecycle(modelId, action) {
    const deadline = Date.now() + 90000;

    while (Date.now() < deadline) {
      const data = await fetchModels();
      const status = findModelStatus(data, modelId);

      if (action === 'load') {
        if (status === 'loaded' || status === 'sleeping') return status;
        if (status === 'failed') throw new Error(`model status is ${status}`);
      } else {
        if (status === 'unloaded' || status === 'failed') return status;
      }

      await new Promise((resolve) => window.setTimeout(resolve, 1000));
    }

    throw new Error(`timed out waiting for model to ${action}`);
  }

  async function toggleModelRuntime(item) {
    const modelId = getModelId(item);
    if (!modelId) return;

    const currentStatus = String(item.dataset.status || 'loaded').toLowerCase();
    if (currentStatus === 'loading') {
      showToast(`${getModelDisplayName(modelId)} is already loading.`, 'info');
      return;
    }

    const action = isUnloadActionStatus(currentStatus) ? 'unload' : 'load';
    const displayName = getModelDisplayName(modelId);

    updateModelItemRuntimeState(item, action === 'load' ? 'loading' : currentStatus, true);
    showToast(`${action === 'load' ? 'Loading' : 'Unloading'} ${displayName}...`, 'info');

    try {
      const response = await fetch(`${LLAMA_SERVER_URL}/models/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelId })
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success === false) {
        const message = data.error && data.error.message ? data.error.message : `HTTP ${response.status}`;
        throw new Error(message);
      }

      const finalStatus = await waitForModelLifecycle(modelId, action);
      showToast(`${action === 'load' ? 'Model loaded' : 'Model unloaded'}: ${displayName}`, finalStatus === 'failed' ? 'error' : 'success');
      await fetchAndPopulateModels({ silent: true });
    } catch (error) {
      updateModelItemRuntimeState(item, currentStatus, false);
      showToast(`${action === 'load' ? 'Model loading failed' : 'Model unload failed'}: ${error.message}`, 'error');
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
    const conversationEl = agenticConversation || messagesEl;

    if (messages.length === 0) {
      if (emptyState) emptyState.hidden = false;
      if (conversationEl) conversationEl.innerHTML = '';
      return;
    }

    if (emptyState) emptyState.hidden = true;

    conversationEl.innerHTML = messages.map((message, index) => renderMessage(message, index)).join('');

    if (!settings.display.disableAutoscroll) {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  }

  function renderMessage(message, index) {
    const roleLabel = message.role === 'user' ? 'You' : 'Shiva';
    const contentHtml = message.role === 'assistant'
      ? renderMarkdown(message.content || '')
      : `<pre>${escapeHtml(message.content || '')}</pre>`;
    const reasoningHtml = message.role === 'assistant' ? renderReasoningBlock(message, index) : '';
    const isStreaming = message.role === 'assistant' && message.streaming;

    return `
      <article class="message ${message.role}${isStreaming ? ' streaming' : ''}">
        <div class="message-role">${roleLabel}</div>
        ${reasoningHtml}
        <div class="message-content markdown-body">${contentHtml || renderAssistantPlaceholder(message)}</div>
        ${message.stats ? `<div class="message-stats">${escapeHtml(message.stats)}</div>` : ''}
      </article>
    `;
  }

  function renderReasoningBlock(message, index) {
    if (!message.reasoning && !message.streaming) return '';

    const stateLabel = message.reasoningDone ? 'Reasoning complete' : 'Reasoning';
    const reasoningText = message.reasoning || (message.streaming ? 'Waiting for model reasoning...' : '');

    return `
      <details class="reasoning-accordion" data-message-index="${index}"${message.reasoningOpen ? ' open' : ''}>
        <summary>
          <span class="reasoning-title">${escapeHtml(stateLabel)}</span>
          <span class="reasoning-status">${message.reasoningDone ? 'Completed' : 'Streaming'}</span>
        </summary>
        <pre class="reasoning-content">${escapeHtml(reasoningText)}</pre>
      </details>
    `;
  }

  function renderAssistantPlaceholder(message) {
    if (message.role !== 'assistant' || !message.streaming) return '';
    return '<p class="assistant-placeholder">Waiting for response...</p>';
  }

  function renderMarkdown(value) {
    const text = String(value || '');
    if (!text.trim()) return '';
    if (!window.marked) return `<pre>${escapeHtml(text)}</pre>`;
    return window.marked.parse(text);
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
   if(!statusDot || !statusLabel || !serverLabel) return;
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
      reasoning_format: 'auto',
      stream_options: { include_usage: true }
    };
  }

  async function sendPrompt(prompt) {
    messages.push({ role: 'user', content: prompt });
    const assistantMessage = {
      role: 'assistant',
      content: '',
      reasoning: '',
      serverReasoning: '',
      rawContent: '',
      reasoningDone: false,
      streaming: true,
      inReasoningTag: false
    };
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
      assistantMessage.reasoningDone = true;
      const seconds = Math.max((performance.now() - started) / 1000, 0.1);
      if (settings.display.showGenStats) {
        assistantMessage.stats = `${seconds.toFixed(1)}s`;
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        assistantMessage.reasoningDone = true;
        assistantMessage.content = `Could not reach the live model server. ${error.message}`;
      }
    } finally {
      controller = null;
      assistantMessage.streaming = false;
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
        if (!trimmed.startsWith('data:')) continue;

        const raw = trimmed.slice(5).trim();
        if (raw === '[DONE]') return;

        processChatCompletionChunk(raw, assistantMessage);
      }
    }

    const tail = decoder.decode();
    if (tail) buffer += tail;
    processRemainingStreamBuffer(buffer, assistantMessage);
  }

  function processRemainingStreamBuffer(buffer, assistantMessage) {
    const trimmed = String(buffer || '').trim();
    if (!trimmed || trimmed === '[DONE]') return;

    if (trimmed.startsWith('data:')) {
      processChatCompletionChunk(trimmed.slice(5).trim(), assistantMessage);
      return;
    }

    processChatCompletionChunk(trimmed, assistantMessage);
  }

  function processChatCompletionChunk(raw, assistantMessage) {
    if (!raw || raw === '[DONE]') return;

    let chunk;
    try {
      chunk = JSON.parse(raw);
    } catch {
      return;
    }

    if (chunk.error) {
      const message = chunk.error.message || 'The model server returned an error.';
      throw new Error(message);
    }

    const choices = Array.isArray(chunk.choices) ? chunk.choices : [];
    if (!choices.length && chunk.message) {
      appendChatMessageObject(chunk.message, assistantMessage);
      return;
    }

    choices.forEach((choice) => {
      const delta = choice.delta || {};
      const message = choice.message || null;

      appendReasoningText(assistantMessage, extractReasoningText(delta));
      appendAssistantContent(assistantMessage, extractContentText(delta.content));

      if (message) appendChatMessageObject(message, assistantMessage);
      if (choice.finish_reason) assistantMessage.reasoningDone = true;
    });

    if (chunk.usage) assistantMessage.usage = chunk.usage;
    renderMessages();
  }

  function appendChatMessageObject(message, assistantMessage) {
    appendReasoningText(assistantMessage, extractReasoningText(message));
    appendAssistantContent(assistantMessage, extractContentText(message.content));
    assistantMessage.reasoningDone = true;
    renderMessages();
  }

  function extractReasoningText(source) {
    if (!source) return '';
    return [
      source.reasoning_content,
      source.reasoning,
      source.thinking_content,
      source.thinking
    ].map(extractContentText).join('');
  }

  function extractContentText(content) {
    if (content == null) return '';
    if (typeof content === 'string') return content;
    if (typeof content === 'number' || typeof content === 'boolean') return String(content);

    if (Array.isArray(content)) {
      return content.map((part) => {
        if (typeof part === 'string') return part;
        if (!part || typeof part !== 'object') return '';
        return part.text || part.content || part.value || '';
      }).join('');
    }

    if (typeof content === 'object') {
      return content.text || content.content || content.value || '';
    }

    return '';
  }

  function appendReasoningText(assistantMessage, text) {
    const value = String(text || '');
    if (!value) return;
    assistantMessage.serverReasoning = (assistantMessage.serverReasoning || '') + value;
    assistantMessage.reasoning = (assistantMessage.serverReasoning || '') + extractTaggedReasoning(assistantMessage.rawContent || '');
    assistantMessage.reasoningDone = false;
  }

  function appendAssistantContent(assistantMessage, text) {
    const value = String(text || '');
    if (!value) return;

    assistantMessage.rawContent = (assistantMessage.rawContent || '') + value;
    const parsed = parseThinkTaggedText(assistantMessage.rawContent);

    assistantMessage.content = parsed.content;
    assistantMessage.reasoning = (assistantMessage.serverReasoning || '') + parsed.reasoning;
    assistantMessage.inReasoningTag = parsed.inReasoning;
    if (assistantMessage.content.trim()) assistantMessage.reasoningDone = true;
  }

  function extractTaggedReasoning(value) {
    return parseThinkTaggedText(value).reasoning;
  }

  function parseThinkTaggedText(value) {
    const source = String(value || '');
    const tagPattern = /<\/?think>/ig;
    let content = '';
    let reasoning = '';
    let cursor = 0;
    let inReasoning = false;
    let match;

    while ((match = tagPattern.exec(source))) {
      const text = source.slice(cursor, match.index);
      if (inReasoning) reasoning += text;
      else content += text;

      inReasoning = !match[0].startsWith('</');
      cursor = tagPattern.lastIndex;
    }

    const tail = source.slice(cursor);
    if (inReasoning) reasoning += tail;
    else content += stripDanglingThinkTagPrefix(tail);

    return { content, reasoning, inReasoning };
  }

  function stripDanglingThinkTagPrefix(value) {
    const text = String(value || '');
    const lower = text.toLowerCase();
    const tagPrefixes = ['<think>', '</think>'];

    for (const tag of tagPrefixes) {
      for (let length = tag.length - 1; length > 0; length -= 1) {
        if (lower.endsWith(tag.slice(0, length))) {
          return text.slice(0, -length);
        }
      }
    }

    return text;
  }

  if (agenticConversation) {
    agenticConversation.addEventListener('toggle', (event) => {
      const details = event.target.closest && event.target.closest('.reasoning-accordion');
      if (!details) return;

      const index = Number(details.dataset.messageIndex);
      const message = messages[index];
      if (message && message.role === 'assistant') {
        message.reasoningOpen = details.open;
      }
    }, true);
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
      selectedModel = getModelId(item);
      localStorage.setItem('shiva-selected-model', selectedModel);
      updateModelSelection();
      closeModelMenu();
    });
  });

  modelMenu.addEventListener('click', (event) => {
    const action = event.target.closest('.start-stop');
    if (action) {
      event.preventDefault();
      event.stopPropagation();
      const item = action.closest('.model-item');
      toggleModelRuntime(item);
      return;
    }

    const item = event.target.closest('.model-item');
    if (!item) return;
    selectedModel = getModelId(item);
    localStorage.setItem('shiva-selected-model', selectedModel);
    updateModelSelection();
    closeModelMenu();
  }, true);

  modelMenu.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const action = event.target.closest('.start-stop');
    if (!action) return;
    event.preventDefault();
    const item = action.closest('.model-item');
    toggleModelRuntime(item);
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
