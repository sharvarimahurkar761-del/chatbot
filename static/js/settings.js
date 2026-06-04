(function () {
  const settingsApi = window.ShivaSettings;
  const form = document.querySelector('#settingsForm');
  const resetButton = document.querySelector('#resetButton');
  const toast = document.querySelector('#toast');
  let settings = settingsApi.loadSettings();

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('visible');
    window.setTimeout(() => toast.classList.remove('visible'), 1800);
  }

  function applyTheme() {
    const theme = settings.general.theme;
    const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
  }

  function readForm() {
    const next = settingsApi.loadSettings();
    Array.from(form.elements).forEach((field) => {
      if (!field.name) return;

      let value = field.value;
      if (field.type === 'checkbox') {
        value = field.checked;
      } else if (field.type === 'number') {
        value = Number(field.value);
      }

      settingsApi.setPath(next, field.name, value);
    });
    return next;
  }

  const themeSelect = form.querySelector('select[name="general.theme"]');
  const themePills = Array.from(document.querySelectorAll('.pill-option'));

  function setThemeSelection(theme) {
    if (themeSelect) {
      themeSelect.value = theme;
    }

    themePills.forEach((pill) => {
      pill.classList.toggle('pill-option-selected', pill.dataset.theme === theme);
    });
  }

  themePills.forEach((pill) => {
    pill.addEventListener('click', () => {
      setThemeSelection(pill.dataset.theme);
    });
  });

  function fillForm() {
    Array.from(form.elements).forEach((field) => {
      if (!field.name) return;
      const value = settingsApi.getPath(settings, field.name);
      if (field.type === 'checkbox') {
        field.checked = Boolean(value);
      } else {
        field.value = value == null ? '' : value;
      }
    });
    setThemeSelection(settingsApi.getPath(settings, 'general.theme') || 'dark');
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    settings = settingsApi.saveSettings(readForm());
    applyTheme();
    showToast('Settings saved');
  });

  resetButton.addEventListener('click', () => {
    if (!window.confirm('Reset all settings to defaults?')) return;
    settings = settingsApi.resetSettings();
    fillForm();
    applyTheme();
    showToast('Defaults restored');
  });

  fillForm();
  applyTheme();
})();
