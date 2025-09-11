// JS-only storage bridge for Capacitor apps
// - Keeps existing localStorage-based code working unchanged
// - On iOS/Android: mirrors localStorage writes/deletes to Capacitor Preferences via SafeStorage
// - On app start: re-injects Preferences data back into raw localStorage for synchronous reads

/**
 * Setup the storage bridge.
 * Usage from index.html (recommended to run before main.js):
 * <script src="./save/safeStorage.js"></script>
 * <script type="module">
 *   import { setupStorageBridge } from './save/storageBridge.js';
 *   await setupStorageBridge('webswing');
 *   import './src/main.js';
 * </script>
 */
export async function setupStorageBridge(namespace) {
  const Cap = (typeof window !== 'undefined' ? window.Capacitor : undefined) || {};
  const isNative = !!(Cap && typeof Cap.isNativePlatform === 'function' && Cap.isNativePlatform());

  const SafeStorage = (typeof window !== 'undefined') ? window.SafeStorage : undefined;
  if (!SafeStorage) {
    throw new Error('SafeStorage (safeStorage.js) is not loaded. Include it before storageBridge.js');
  }

  // Initialize SafeStorage without mirroring to localStorage to avoid recursion when patching
  await SafeStorage.init({ namespace, mirrorLocalStorage: false });

  // Web: nothing else to do
  if (!isNative) return;

  const rawLS = window.localStorage;

  // 1) Re-inject Preferences -> raw localStorage so getItem() works synchronously
  try {
    const all = await SafeStorage.exportAll();
    for (const [k, v] of Object.entries(all || {})) {
      try { rawLS.setItem(k, JSON.stringify(v)); } catch (_) {}
    }
  } catch (_) {}

  // 2) One-time migration: copy existing raw localStorage keys into Preferences
  try {
    for (let i = 0; i < rawLS.length; i++) {
      const key = rawLS.key(i);
      if (!key) continue;
      if (key === '__index__' || key === '__initialized__' || key.startsWith(namespace + ':')) continue;
      const raw = rawLS.getItem(key);
      if (raw == null) continue;
      let val = raw;
      try { val = JSON.parse(raw); } catch (_) { /* keep as string */ }
      try { await SafeStorage.set(key, val); } catch (_) {}
    }
  } catch (_) {}

  // 3) Patch window.localStorage to mirror writes/removes to Preferences (fire-and-forget)
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
      try { v = JSON.parse(value); } catch (_) { /* keep as string */ }
      SafeStorage.set(key, v).catch(() => {});
    },
    removeItem(key) {
      try { rawLS.removeItem(key); } catch (_) {}
      SafeStorage.remove(key).catch(() => {});
    },
  };

  try {
    // Direct replacement (works in most environments)
    window.localStorage = patched;
  } catch (_) {
    // Fallback: defineProperty
    try { Object.defineProperty(window, 'localStorage', { value: patched, configurable: true }); } catch (_) {}
  }
}

