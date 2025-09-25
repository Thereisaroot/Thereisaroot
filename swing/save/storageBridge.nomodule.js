// Non-module variant: exposes window.setupStorageBridge

(function(){
  const DEBUG = Boolean(typeof window !== 'undefined' && window.STORAGE_BRIDGE_DEBUG === true);
  const log = DEBUG ? console.log.bind(console) : null;
  async function setupStorageBridge(namespace) {
    const Cap = (typeof window !== 'undefined' ? window.Capacitor : undefined) || {};
    const platform = (() => {
      try {
        if (typeof Cap.getPlatform === 'function') return Cap.getPlatform();
        if (typeof Cap.platform === 'string' && Cap.platform.length > 0) return Cap.platform;
      } catch (_) {}
      return 'web';
    })();
    const isNative = !!((typeof Cap.isNativePlatform === 'function' && Cap.isNativePlatform()) || (platform && platform !== 'web'));
    const prefPlugin = Cap && Cap.Plugins && Cap.Plugins.Preferences;
    const hasPreferences = Boolean(
      prefPlugin &&
      typeof prefPlugin.get === 'function' &&
      typeof prefPlugin.set === 'function'
    );

    const SafeStorage = (typeof window !== 'undefined') ? window.SafeStorage : undefined;
    if (!SafeStorage) {
      throw new Error('SafeStorage is not loaded. Include safeStorage.nomodule.js first');
    }

    await SafeStorage.init({ namespace, mirrorLocalStorage: hasPreferences ? false : true });

    const storageState = (typeof SafeStorage.getState === 'function') ? SafeStorage.getState() : null;
    const usingNative = Boolean(storageState && storageState.usingNative);

    if (log) {
      log('[StorageBridge] init', {
        platform,
        isNative,
        hasPreferences,
        usingNative,
        mirrorLocalStorage: storageState ? storageState.mirrorLocalStorage : undefined,
      });
    }

    if (!isNative || !usingNative) {
      if (DEBUG) console.warn('[StorageBridge] skipping native bridge; state:', { isNative, usingNative });
      return;
    }

    const rawLS = window.localStorage;

    function serializeForLocal(value) {
      if (value === undefined) return 'undefined';
      if (value === null) return 'null';
      if (typeof value === 'string') return value;
      if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
        return String(value);
      }
      try { return JSON.stringify(value); }
      catch (_) { return String(value); }
    }

    // Re-inject Preferences -> localStorage
    try {
      const all = await SafeStorage.exportAll();
      for (const k in (all || {})) {
        const serialized = serializeForLocal(all[k]);
        try { rawLS.setItem(k, serialized); } catch (err) {
          if (DEBUG) console.warn('[StorageBridge] reinject failed', k, err);
        }
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
      getItem(key) {
        return rawLS.getItem(key);
      },
      setItem(key, value) {
        try { rawLS.setItem(key, value); } catch (_) {}
        let v = value;
        try { v = JSON.parse(value); } catch (_) {}
        SafeStorage.set(key, v)
          .then(() => { if (log) log('[StorageBridge] mirrored set', key); })
          .catch((err) => {
            if (DEBUG) console.warn('[StorageBridge] set failed', key, err);
          });
      },
      removeItem(key) {
        try { rawLS.removeItem(key); } catch (_) {}
        SafeStorage.remove(key)
          .then(() => { if (log) log('[StorageBridge] mirrored remove', key); })
          .catch((err) => {
            if (DEBUG) console.warn('[StorageBridge] remove failed', key, err);
          });
      },
    };

    let patchedSuccessfully = false;

    try {
      window.localStorage = patched;
      if (window.localStorage === patched) {
        patchedSuccessfully = true;
        if (log) log('[StorageBridge] localStorage patched via assignment');
      }
    }
    catch (errAssign) {
      if (DEBUG) console.warn('[StorageBridge] direct localStorage patch failed', errAssign && errAssign.message ? errAssign.message : errAssign);
    }

    if (!patchedSuccessfully) {
      try {
        Object.defineProperty(window, 'localStorage', { value: patched, configurable: true });
        if (window.localStorage === patched) {
          patchedSuccessfully = true;
          if (log) log('[StorageBridge] localStorage patched via defineProperty');
        }
      } catch (errDefine) {
        if (DEBUG) console.warn('[StorageBridge] defineProperty patch failed', errDefine && errDefine.message ? errDefine.message : errDefine);
      }
    }

    if (!patchedSuccessfully) {
      if (DEBUG) console.warn('[StorageBridge] falling back to method-level patch');
      const rawSetItem = rawLS.setItem ? rawLS.setItem.bind(rawLS) : null;
      const rawRemoveItem = rawLS.removeItem ? rawLS.removeItem.bind(rawLS) : null;
      const rawClear = rawLS.clear ? rawLS.clear.bind(rawLS) : null;
      const rawKey = rawLS.key ? rawLS.key.bind(rawLS) : null;

      if (rawSetItem) {
        const original = window.localStorage;
        original.setItem = function(key, value) {
          if (rawSetItem) {
            try { rawSetItem(key, value); } catch (err) { if (DEBUG) console.warn('[StorageBridge] raw setItem failed', err); }
          }
          let parsed = value;
          try { parsed = JSON.parse(value); } catch (_) {}
          SafeStorage.set(key, parsed)
            .then(() => { if (log) log('[StorageBridge] mirrored set (fallback)', key); })
            .catch((err) => {
              if (DEBUG) console.warn('[StorageBridge] set failed (fallback)', key, err);
            });
        };
      }

      if (rawRemoveItem) {
        const original = window.localStorage;
        original.removeItem = function(key) {
          if (rawRemoveItem) {
            try { rawRemoveItem(key); } catch (err) { if (DEBUG) console.warn('[StorageBridge] raw removeItem failed', err); }
          }
          SafeStorage.remove(key)
            .then(() => { if (log) log('[StorageBridge] mirrored remove (fallback)', key); })
            .catch((err) => {
              if (DEBUG) console.warn('[StorageBridge] remove failed (fallback)', key, err);
            });
        };
      }

      if (rawClear) {
        const original = window.localStorage;
        original.clear = function() {
          if (rawClear) {
            try { rawClear(); } catch (err) { if (DEBUG) console.warn('[StorageBridge] raw clear failed', err); }
          }
          SafeStorage.exportAll()
            .then(all => Promise.all(Object.keys(all || {}).map(k => SafeStorage.remove(k))))
            .catch((err) => { if (DEBUG) console.warn('[StorageBridge] clear failed (fallback)', err); });
        };
      }

      if (rawKey) {
        const original = window.localStorage;
        original.key = function(n) {
          try { return rawKey(n); }
          catch (err) {
            if (DEBUG) console.warn('[StorageBridge] raw key failed', err);
            return null;
          }
        };
      }
    }
  }

  window.setupStorageBridge = setupStorageBridge;
})();
