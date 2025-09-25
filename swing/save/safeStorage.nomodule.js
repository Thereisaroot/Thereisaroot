// Non-module build of safeStorage for classic <script> usage
// Based on save/safeStorage.js but without ESM exports

// Cross‑platform save/load for pure JS (no bundler)
// - Web: localStorage
// - Native (iOS/Android): Capacitor Preferences (primary) + Filesystem JSON backup

const INDEX_KEY = '__index__';
const INIT_KEY = '__initialized__';

const SafeStorage = (() => {
  let ns = 'app';
  let file = 'save.json';
  let mirrorLS = true;
  let cache = {};
  let pendingWrite = null;

  const Cap = (typeof window !== 'undefined' ? window.Capacitor : undefined) || undefined;
  const isNative = !!(Cap && typeof Cap.isNativePlatform === 'function' && Cap.isNativePlatform());
  const Plugins = (Cap && Cap.Plugins) || {};
  const Pref = Plugins && Plugins.Preferences;
  const FS = Plugins && Plugins.Filesystem;

  async function init(opts) {
    const platformName = (typeof PLATFORM !== 'undefined')
      ? PLATFORM
      : (Cap && typeof Cap.getPlatform === 'function')
        ? Cap.getPlatform()
        : (Cap && Cap.platform) || 'web';
    if (typeof PLATFORM === 'undefined') {
      try { globalThis.PLATFORM = platformName; } catch (_) {}
    }
    console.log('[SafeStorage] platform', platformName, 'isNative', isNative);
    console.log('[SafeStorage] init start', opts);
    ns = opts && opts.namespace || ns;
    file = (opts && opts.fileName) || file;
    mirrorLS = (opts && typeof opts.mirrorLocalStorage === 'boolean') ? opts.mirrorLocalStorage : mirrorLS;

    const [pIndex, lIndex] = await Promise.all([
      preferencesGet(INDEX_KEY),
      localGet(INDEX_KEY),
    ]);

    if (isNative) {
      if (!pIndex) {
        const fsState = await readBackupFile();
        if (fsState) {
          await bulkWrite(fsState);
        } else if (lIndex) {
          const all = await dumpFromLocal();
          await bulkWrite(all);
        }
      }
      const all = await dumpFromPreferences();
      cache = all;
      await writeBackupDebounced();
    } else {
      const all = await dumpFromLocal();
      cache = all;
    }

    await preferencesSet(INIT_KEY, true);
    if (mirrorLS) await localSet(INIT_KEY, true);
  }

  async function set(key, value) {
    const k = prefKey(key);
    console.log(`[SafeStorage] set ${k} ${JSON.stringify(value)}`);
    cache[key] = value;
    await preferencesSet(k, value);
    if (mirrorLS) await localSet(k, value);
    await addToIndex(key);
    await writeBackupDebounced();
  }

  async function get(key, fallback) {
    if (Object.prototype.hasOwnProperty.call(cache, key)) return cache[key];
    const k = prefKey(key);
    const p = await preferencesGet(k);
    if (p !== undefined) {
      console.log(`[SafeStorage] hit pref ${k} ${JSON.stringify(p)}`);
      cache[key] = p;
      return p;
    }
    const l = await localGet(k);
    if (l !== undefined) {
      console.log(`[SafeStorage] hit local ${k} ${JSON.stringify(l)}`);
      cache[key] = l;
      await preferencesSet(k, l);
      await addToIndex(key);
      await writeBackupDebounced();
      return l;
    }
    return fallback;
  }

  async function remove(key) {
    delete cache[key];
    const k = prefKey(key);
    await preferencesRemove(k);
    if (mirrorLS) localRemove(k);
    await removeFromIndex(key);
    await writeBackupDebounced();
  }

  async function exportAll() { return { ...cache }; }
  async function importAll(data, overwrite = true) {
    if (!data || typeof data !== 'object') return;
    cache = overwrite ? { ...data } : { ...data, ...cache };
    await bulkWrite(cache);
  }

  // Internals
  function prefKey(key) { return key.includes(':') ? key : `${ns}:${key}`; }

  async function addToIndex(key) {
    const idx = new Set(await getIndex());
    idx.add(key);
    const arr = Array.from(idx);
    await preferencesSet(INDEX_KEY, arr);
    if (mirrorLS) await localSet(INDEX_KEY, arr);
  }

  async function removeFromIndex(key) {
    const idx = new Set(await getIndex());
    idx.delete(key);
    const arr = Array.from(idx);
    await preferencesSet(INDEX_KEY, arr);
    if (mirrorLS) await localSet(INDEX_KEY, arr);
  }

  async function getIndex() {
    const p = await preferencesGet(INDEX_KEY);
    if (p && Array.isArray(p)) return p;
    const l = await localGet(INDEX_KEY);
    if (l && Array.isArray(l)) return l;
    return [];
  }

  async function bulkWrite(map) {
    const keys = Object.keys(map);
    await preferencesSet(INDEX_KEY, keys);
    if (mirrorLS) await localSet(INDEX_KEY, keys);
    for (const key of keys) {
      const k = prefKey(key);
      await preferencesSet(k, map[key]);
      if (mirrorLS) await localSet(k, map[key]);
    }
    await writeBackupDebounced();
  }

  async function dumpFromPreferences() {
    const out = {};
    const idx = await getIndex();
    for (const key of idx) {
      const k = prefKey(key);
      const v = await preferencesGet(k);
      if (v !== undefined) out[key] = v;
    }
    return out;
  }

  async function dumpFromLocal() {
    const out = {};
    const idx = await localGet(INDEX_KEY);
    if (idx && Array.isArray(idx)) {
      for (const key of idx) {
        const k = prefKey(key);
        const v = await localGet(k);
        if (v !== undefined) out[key] = v;
      }
    } else {
      for (let i = 0; i < (localStorage?.length || 0); i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        if (k.startsWith(`${ns}:`)) {
          try {
            const raw = localStorage.getItem(k);
            if (raw != null) out[k.slice(ns.length + 1)] = JSON.parse(raw);
          } catch (_) {}
        }
      }
    }
    return out;
  }

  // Preferences helpers
  async function preferencesSet(key, value) {
    if (!isNative || !Pref) return;
    const k = key.includes(':') ? key : prefKey(key);
    try { await Pref.set({ key: k, value: JSON.stringify(value) }); } catch (_) {}
  }
  async function preferencesGet(key) {
    if (!isNative || !Pref) return undefined;
    const k = key.includes(':') ? key : prefKey(key);
    try {
      const { value } = await Pref.get({ key: k });
      if (value == null) return undefined;
      return JSON.parse(value);
    } catch (_) { return undefined; }
  }
  async function preferencesRemove(key) {
    if (!isNative || !Pref) return;
    const k = key.includes(':') ? key : prefKey(key);
    try { await Pref.remove({ key: k }); } catch (_) {}
  }

  // localStorage helpers
  async function localSet(key, value) {
    const k = key.includes(':') ? key : prefKey(key);
    try { localStorage.setItem(k, JSON.stringify(value)); } catch (_) {}
  }
  async function localGet(key) {
    const k = key.includes(':') ? key : prefKey(key);
    try {
      const raw = localStorage.getItem(k);
      if (raw == null) return undefined;
      return JSON.parse(raw);
    } catch (_) { return undefined; }
  }
  function localRemove(key) {
    const k = key.includes(':') ? key : prefKey(key);
    try { localStorage.removeItem(k); } catch (_) {}
  }

  async function writeBackupDebounced() {
    if (!isNative || !FS) return;
    if (pendingWrite) clearTimeout(pendingWrite);
    pendingWrite = setTimeout(async () => {
      pendingWrite = null;
      try {
        await FS.writeFile({
          path: file,
          data: JSON.stringify(cache),
          directory: 'DATA',
          encoding: 'utf8',
        });
      } catch (_) {}
    }, 150);
  }

  async function readBackupFile() {
    if (!isNative || !FS) return null;
    try {
      const { data } = await FS.readFile({ path: file, directory: 'DATA', encoding: 'utf8' });
      return JSON.parse(data);
    } catch (_) { return null; }
  }

  return {
    init,
    set,
    get,
    remove,
    exportAll,
    importAll,
  };
})();

// Expose globals for classic scripts
if (typeof window !== 'undefined') {
  window.SafeStorage = SafeStorage;
  window.saveInit = (ns) => SafeStorage.init({ namespace: ns });
  window.saveSet = (key, value) => SafeStorage.set(key, value);
  window.saveGet = (key, fallback) => SafeStorage.get(key, fallback);
  window.saveRemove = (key) => SafeStorage.remove(key);
  window.saveExport = () => SafeStorage.exportAll();
  window.saveImport = (data, overwrite = true) => SafeStorage.importAll(data, overwrite);
}
