(function (global) {
  const STORAGE_KEY = 'webswing_lang';
  const languages = {};
  const listeners = new Set();
  let currentLang = 'en';

  function isObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value);
  }

  function mergeDeep(target, source) {
    const out = { ...target };
    for (const [key, value] of Object.entries(source || {})) {
      if (isObject(value) && isObject(out[key])) {
        out[key] = mergeDeep(out[key], value);
      } else {
        out[key] = value;
      }
    }
    return out;
  }

  function getValue(obj, path) {
    if (!path) return undefined;
    const parts = String(path).split('.');
    let cur = obj;
    for (const part of parts) {
      if (!cur || typeof cur !== 'object' || !(part in cur)) return undefined;
      cur = cur[part];
    }
    return cur;
  }

  function format(template, params) {
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      if (Object.prototype.hasOwnProperty.call(params, key)) {
        const value = params[key];
        return value == null ? '' : String(value);
      }
      return match;
    });
  }

  function readStoredLanguage() {
    try {
      if (!global.localStorage) return null;
      const raw = global.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      if (languages[raw]) return raw;
      if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (!trimmed) return null;
        if (languages[trimmed]) return trimmed;
        try {
          const parsed = JSON.parse(trimmed);
          if (typeof parsed === 'string' && languages[parsed]) return parsed;
        } catch (_) {}
        if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
          const unwrapped = trimmed.slice(1, -1);
          if (languages[unwrapped]) return unwrapped;
        }
        return trimmed;
      }
      return raw;
    } catch (_) {
      return null;
    }
  }

  function resolveLang(preferred) {
    if (preferred && languages[preferred]) return preferred;
    const stored = readStoredLanguage();
    if (stored && languages[stored]) return stored;
    if (stored && typeof stored === 'string' && stored.includes('-')) {
      const baseStored = stored.split('-')[0];
      if (languages[baseStored]) return baseStored;
    }
    if (preferred && preferred.includes('-')) {
      const base = preferred.split('-')[0];
      if (languages[base]) return base;
    }
    if (typeof navigator !== 'undefined') {
      const navLangs = navigator.languages || [navigator.language || navigator.userLanguage];
      for (const lang of navLangs) {
        if (languages[lang]) return lang;
        if (lang && lang.includes('-')) {
          const base = lang.split('-')[0];
          if (languages[base]) return base;
        }
      }
    }
    if (languages.en) return 'en';
    const first = Object.keys(languages)[0];
    return first || 'en';
  }

  function notify() {
    try {
      if (typeof document !== 'undefined') {
        document.documentElement.lang = currentLang;
      }
    } catch (_) {}
    listeners.forEach((cb) => {
      try { cb(currentLang); } catch (_) {}
    });
  }

  function applyDom(root) {
    if (typeof document === 'undefined') return;
    const scope = root || document;
    const elements = scope.querySelectorAll('[data-i18n]');
    elements.forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (!key) return;
      const text = api.t(key);
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        el.value = text;
      } else {
        el.textContent = text;
      }
    });
    const attrElements = scope.querySelectorAll('[data-i18n-attrs]');
    attrElements.forEach((el) => {
      const raw = el.getAttribute('data-i18n-attrs');
      if (!raw) return;
      for (const pair of raw.split(',')) {
        const [attr, key] = pair.split(':').map((s) => s && s.trim()).filter(Boolean);
        if (!attr || !key) continue;
        const value = api.t(key);
        el.setAttribute(attr, value);
      }
    });
    const titleEl = scope.querySelector('title[data-i18n]');
    if (titleEl) {
      const key = titleEl.getAttribute('data-i18n');
      if (key) {
        const text = api.t(key);
        titleEl.textContent = text;
        if (typeof document !== 'undefined') document.title = text;
      }
    }
  }

  function registerLanguage(lang, messages) {
    if (!lang) return;
    const base = languages[lang] || {};
    languages[lang] = mergeDeep(base, messages || {});
    if (!currentLang) {
      currentLang = lang;
    }
  }

  function setLanguage(lang) {
    if (!lang || !languages[lang]) return;
    if (lang === currentLang) return;
    currentLang = lang;
    try {
      if (global.localStorage) {
        global.localStorage.setItem(STORAGE_KEY, lang);
      }
    } catch (_) {}
    notify();
    applyDom(document);
  }

  function getLanguage() {
    return currentLang;
  }

  function getAvailableLanguages() {
    return Object.keys(languages);
  }

  function onChange(cb) {
    if (typeof cb === 'function') listeners.add(cb);
    return () => listeners.delete(cb);
  }

  function offChange(cb) {
    listeners.delete(cb);
  }

  function translate(key, params) {
    if (!key) return '';
    const langData = languages[currentLang] || languages.en || {};
    let template = getValue(langData, key);
    if (template == null) {
      const fallback = languages.en && getValue(languages.en, key);
      if (fallback != null) template = fallback;
    }
    if (template == null) {
      return key;
    }
    return format(String(template), params);
  }

  function init(defaultLang) {
    if (!defaultLang) defaultLang = currentLang;
    currentLang = resolveLang(defaultLang);
    notify();
    if (typeof document !== 'undefined') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => applyDom(document));
      } else {
        applyDom(document);
      }
    }
  }

  const api = {
    registerLanguage,
    setLanguage,
    getLanguage,
    getAvailableLanguages,
    onChange,
    offChange,
    t: translate,
    applyDom,
    init,
  };

  global.I18N = api;
})(typeof window !== 'undefined' ? window : globalThis);
