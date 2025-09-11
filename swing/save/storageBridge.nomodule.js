// Non-module variant: exposes window.setupStorageBridge

(function(){
  async function setupStorageBridge(namespace) {
    const Cap = (typeof window !== 'undefined' ? window.Capacitor : undefined) || {};
    const isNative = !!(Cap && typeof Cap.isNativePlatform === 'function' && Cap.isNativePlatform());

    const SafeStorage = (typeof window !== 'undefined') ? window.SafeStorage : undefined;
    if (!SafeStorage) {
      throw new Error('SafeStorage is not loaded. Include safeStorage.nomodule.js first');
    }

    await SafeStorage.init({ namespace, mirrorLocalStorage: false });

    if (!isNative) return; // Web: nothing else

    const rawLS = window.localStorage;

    // Re-inject Preferences -> localStorage
    try {
      const all = await SafeStorage.exportAll();
      for (const k in (all || {})) {
        try { rawLS.setItem(k, JSON.stringify(all[k])); } catch (_) {}
      }
    } catch (_) {}

    // One-time migration of existing localStorage -> Preferences
    try {
      for (let i = 0; i < rawLS.length; i++) {
        const key = rawLS.key(i);
        if (!key) continue;
        if (key === '__index__' || key === '__initialized__' || key.startsWith(namespace + ':')) continue;
        const raw = rawLS.getItem(key);
        if (raw == null) continue;
        let val = raw;
        try { val = JSON.parse(raw); } catch (_) {}
        try { await SafeStorage.set(key, val); } catch (_) {}
      }
    } catch (_) {}

    // Patch localStorage to mirror writes/removes
    const patched = {
      get length() { return rawLS.length; },
      clear() {
        try { rawLS.clear(); } catch (_) {}
        SafeStorage.exportAll()
          .then(all => Promise.all(Object.keys(all || {}).map(k => SafeStorage.remove(k))))
          .catch(() => {});
      },
      key(n) { return rawLS.key(n); },
      getItem(key) { return rawLS.getItem(key); },
      setItem(key, value) {
        try { rawLS.setItem(key, value); } catch (_) {}
        let v = value;
        try { v = JSON.parse(value); } catch (_) {}
        SafeStorage.set(key, v).catch(() => {});
      },
      removeItem(key) {
        try { rawLS.removeItem(key); } catch (_) {}
        SafeStorage.remove(key).catch(() => {});
      },
    };

    try { window.localStorage = patched; }
    catch (_) {
      try { Object.defineProperty(window, 'localStorage', { value: patched, configurable: true }); } catch (_) {}
    }
  }

  window.setupStorageBridge = setupStorageBridge;
})();

