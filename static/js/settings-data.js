(function () {
  const STORAGE_KEY = 'shiva_assistant_settings';

  const DEFAULT_SETTINGS = {
    general: {
      theme: 'dark',
      pasteTextLen: 2500,
      sendOnEnter: true,
      copyAttachmentsPlain: false,
      enableContinue: true,
      confirmTitleChange: false
    },
    display: {
      showGenStats: true,
      showThought: true,
      showToolCalls: true,
      keepStatsVisible: true,
      renderMarkdown: false,
      disableAutoscroll: false,
      alwaysShowDesktopSidebar: true,
      alwaysShowAgenticTurns: false
    },
    sampling: {
      temperature: 0.7,
      dynTempRange: 0,
      topK: 40,
      topP: 0.95,
      minP: 0.05,
      xtcProb: 0,
      xtcThresh: 0.1,
      typicalP: 1,
      maxTokens: 2048,
      samplerOrder: 'top_k;typ_p;top_p;min_p;temperature',
      backendSampling: true
    },
    penalties: {
      repeatLastN: 64,
      repeatPenalty: 1.1,
      presencePenalty: 0,
      frequencyPenalty: 0,
      dryMultiplier: 0,
      dryBase: 1.75,
      dryAllowedLen: 2,
      dryLastN: 128
    },
    agentic: {
      agenticTurns: 10,
      maxLinesToolPreview: 50
    },
    developer: {
      prefillKvCache: true,
      disableReasoning: false,
      excludeReasoningContext: false,
      enableRawOutput: false
    },
    serverUrl: 'http://tmlpnewskc31137.tmindia.tatamotors.com:4244',
    systemPrompt: 'You are Shiva, a helpful and premium AI coding assistant.'
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function mergeSettings(saved) {
    const defaults = clone(DEFAULT_SETTINGS);
    if (!saved || typeof saved !== 'object') return defaults;

    return {
      ...defaults,
      ...saved,
      general: { ...defaults.general, ...(saved.general || {}) },
      display: { ...defaults.display, ...(saved.display || {}) },
      sampling: { ...defaults.sampling, ...(saved.sampling || {}) },
      penalties: { ...defaults.penalties, ...(saved.penalties || {}) },
      agentic: { ...defaults.agentic, ...(saved.agentic || {}) },
      developer: { ...defaults.developer, ...(saved.developer || {}) }
    };
  }

  function loadSettings() {
    try {
      return mergeSettings(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'));
    } catch (error) {
      console.warn('Failed to load settings:', error);
      return clone(DEFAULT_SETTINGS);
    }
  }

  function saveSettings(settings) {
    const merged = mergeSettings(settings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  }

  function resetSettings() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
    return clone(DEFAULT_SETTINGS);
  }

  function getPath(target, path) {
    return path.split('.').reduce((value, key) => value && value[key], target);
  }

  function setPath(target, path, value) {
    const parts = path.split('.');
    const leaf = parts.pop();
    const parent = parts.reduce((object, key) => {
      object[key] = object[key] || {};
      return object[key];
    }, target);
    parent[leaf] = value;
  }

  window.ShivaSettings = {
    DEFAULT_SETTINGS,
    loadSettings,
    saveSettings,
    resetSettings,
    getPath,
    setPath
  };
})();
