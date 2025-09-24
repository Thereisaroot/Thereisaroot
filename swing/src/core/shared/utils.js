// Utility functions extracted from main.js

// ==================== STORAGE CONSTANTS ====================
const TUNING_KEY = 'webswing_tuning_v1';
const SAVINGS_KEY = 'webswing_savings_v1';
const BEST_SCORE_KEY = 'webswing_best_v1';
const EXP_KEY = 'webswing_exp_v1';
const DEMO_DONE_KEY = 'webswing_demo_done_v1';
const SHOP_INV_KEY = 'webswing_shop_inv_v1';
const LANG_KEY = 'webswing_lang';

// Daily system (UTC reset) for native builds
const DAILY_STATE_KEY = 'webswing_daily_state_v1';
const DAILY_BASE_LIVES = 20;
const DAILY_INTERSTITIAL_LIMIT = 3;
const DAILY_AD_REWARD_KEYS = {
  wizard: 'wizard',
  cash20: 'cash20',
};

let dailyStateCache = null;

const TUNING_DEFAULTS = {
  jumpImpulse: 541,
  jumpSpeed: 91,
  catchR: 22,
  budSwayMin: 8,
  budSwayMax: 32,
  Lmin: 84,
  Lmax: 338,
  LjitPct: 30,
  Dmin: 180,
  Dmax: 260,
  SJmin: 78,
  SJmax: 140,
  shortProb: 24,
  shortFactor: 73,
  longProb: 0,
  longFactor: 120,
  breakProb: 10,
  itemProb: 20,
  DshortMin: 120,
  DshortProb: 35,
};

const SHOP_INV_DEFAULTS = {
  glowLevel: 0,
  budsLevel: 0,
  plusJump: false,
  fly: false,
  bigLevel: 0,
  gambleActive: false,
  specialUnlocks: [],
  magnetLevel: 0,
  comboLevel: 0,
  slowLevel: 0,
  luckyLevel: 0,
  feverLevel: 0,
  characters: [],
  consumables: {},
};

function defaultDailyState(dateStamp = currentUtcDateStamp()) {
  const rewards = {};
  for (const key of Object.values(DAILY_AD_REWARD_KEYS)) rewards[key] = false;
  return {
    date: dateStamp,
    lives: DAILY_BASE_LIVES,
    interstitialViews: 0,
    rewards,
  };
}

function currentUtcDateStamp() {
  try { return new Date().toISOString().slice(0, 10); } catch (_) { return '1970-01-01'; }
}

function loadDailyState() {
  if (dailyStateCache) {
    const today = currentUtcDateStamp();
    if (dailyStateCache.date !== today) {
      dailyStateCache = defaultDailyState(today);
    }
    return dailyStateCache;
  }
  const today = currentUtcDateStamp();
  let parsed = null;
  try {
    const raw = localStorage.getItem(DAILY_STATE_KEY);
    if (raw) parsed = JSON.parse(raw);
  } catch (_) {
    parsed = null;
  }
  if (!parsed || typeof parsed !== 'object') {
    dailyStateCache = defaultDailyState(today);
    return dailyStateCache;
  }
  const rewards = {};
  const storedRewards = (parsed.rewards && typeof parsed.rewards === 'object') ? parsed.rewards : {};
  for (const key of Object.values(DAILY_AD_REWARD_KEYS)) rewards[key] = Boolean(storedRewards[key]);
  const storedDate = (typeof parsed.date === 'string') ? parsed.date : today;
  if (storedDate !== today) {
    dailyStateCache = defaultDailyState(today);
    return dailyStateCache;
  }
  const lives = Number.isFinite(parsed.lives) ? Math.max(0, Math.floor(parsed.lives)) : DAILY_BASE_LIVES;
  const interstitialViews = Number.isFinite(parsed.interstitialViews) ? Math.max(0, Math.floor(parsed.interstitialViews)) : 0;
  dailyStateCache = {
    date: storedDate,
    lives,
    interstitialViews,
    rewards,
  };
  return dailyStateCache;
}

function saveDailyState() {
  if (!dailyStateCache) return;
  try { localStorage.setItem(DAILY_STATE_KEY, JSON.stringify(dailyStateCache)); } catch (_) {}
}

function ensureDailyState() {
  const state = loadDailyState();
  if (state.date !== currentUtcDateStamp()) {
    dailyStateCache = defaultDailyState();
    saveDailyState();
    return dailyStateCache;
  }
  return state;
}

function dailyLivesRemaining() {
  return ensureDailyState().lives;
}

function consumeDailyLife() {
  const state = ensureDailyState();
  if (state.lives <= 0) return false;
  state.lives = Math.max(0, state.lives - 1);
  saveDailyState();
  return true;
}

function grantDailyLives(amount) {
  if (!Number.isFinite(amount) || amount <= 0) return ensureDailyState().lives;
  const state = ensureDailyState();
  state.lives = Math.max(0, Math.min(999, state.lives + Math.floor(amount)));
  saveDailyState();
  return state.lives;
}

function dailyInterstitialViews() {
  return ensureDailyState().interstitialViews;
}

function incrementDailyInterstitial() {
  const state = ensureDailyState();
  state.interstitialViews = Math.max(0, Math.min(DAILY_INTERSTITIAL_LIMIT, state.interstitialViews + 1));
  saveDailyState();
  return state.interstitialViews;
}

function resetDailyInterstitial() {
  const state = ensureDailyState();
  state.interstitialViews = 0;
  saveDailyState();
}

function canWatchDailyInterstitial() {
  return dailyInterstitialViews() < DAILY_INTERSTITIAL_LIMIT;
}

function markDailyRewardClaimed(key) {
  if (!key) return;
  const normKey = DAILY_AD_REWARD_KEYS[key] || key;
  const state = ensureDailyState();
  if (!state.rewards) state.rewards = {};
  state.rewards[normKey] = true;
  saveDailyState();
}

function isDailyRewardClaimed(key) {
  if (!key) return false;
  const normKey = DAILY_AD_REWARD_KEYS[key] || key;
  const state = ensureDailyState();
  return Boolean(state.rewards && state.rewards[normKey]);
}

// Level system based on EXP thresholds
const LEVEL_THRESHOLDS = (() => {
  const arr = [];
  let current = 10;
  for (let lvl = 1; lvl < 99; lvl++) {
    arr.push(current);
    current += Math.floor(10 + lvl * 10);
  }
  return arr;
})();

function getLevelByExp(val) {
  let lvl = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (val >= LEVEL_THRESHOLDS[i]) lvl++; else break;
  }
  return lvl; // Level 1..13
}

// ==================== MATH UTILITIES ====================
function randRange(a, b) {
  return a + Math.random() * (b - a);
}

function deg2rad(d) { return (d * Math.PI) / 180; }

function easeOutCubic(t) {
  const clamped = Math.max(0, Math.min(1, t));
  const inv = 1 - clamped;
  return 1 - inv * inv * inv;
}

function easeInCubic(t) {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped * clamped * clamped;
}

function easeInOutCubic(t) {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped < 0.5 ? 4 * clamped * clamped * clamped : 1 - Math.pow(-2 * clamped + 2, 3) / 2;
}

// Effective scaling for level 1 ease (rope position/length/spacing only)
function lv1Scale(exp) {
  return getLevelByExp(exp) === 1 ? 0.8 : 1.0;
}

// ==================== STORAGE/SAVE UTILITIES ====================
function loadTuningLocal(tuning) {
  try {
    const raw = localStorage.getItem(TUNING_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      return { ...tuning, ...saved };
    }
  } catch(_) {}
  return tuning;
}

function saveTuningLocal(tuning) {
  try { localStorage.setItem(TUNING_KEY, JSON.stringify(tuning)); } catch(_) {}
}

function loadLanguagePreference() {
  try {
    const raw = localStorage.getItem(LANG_KEY);
    if (!raw) return null;
    if (typeof raw !== 'string') return raw;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'string' && parsed) return parsed;
    } catch (_) {}
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      const unwrapped = trimmed.slice(1, -1);
      if (unwrapped) return unwrapped;
    }
    return trimmed;
  } catch (_) {
    return null;
  }
}

async function maybeLoadTuningFromServer() {
  // Placeholder for future server fetch; merge into tuning and apply
  // Example:
  // const res = await fetch('/api/tuning');
  // const remote = await res.json();
  // tuning = { ...tuning, ...remote };
}

function loadShopInv(shopInv = {}) {
  try {
    const raw = localStorage.getItem(SHOP_INV_KEY);
    if (raw) shopInv = { ...shopInv, ...JSON.parse(raw) };
  } catch(_){}
  shopInv = { ...SHOP_INV_DEFAULTS, ...shopInv };
  shopInv.consumables = { ...(shopInv.consumables || {}) };
  shopInv.specialUnlocks = Array.isArray(shopInv.specialUnlocks)
    ? [...shopInv.specialUnlocks]
    : (shopInv.specialUnlocks ? { ...shopInv.specialUnlocks } : []);
  // Legacy migration: convert one-time booleans to consumable counts
  let migrated = false;
  if (shopInv.shield) {
    delete shopInv.shield;
    migrated = true;
  }
  if ('rainbow' in shopInv) {
    delete shopInv.rainbow;
    migrated = true;
  }
  if ('bankLevel' in shopInv) {
    delete shopInv.bankLevel;
    migrated = true;
  }
  if (shopInv.consumables && shopInv.consumables.shield) {
    delete shopInv.consumables.shield;
    migrated = true;
  }
  if (shopInv.consumables && shopInv.consumables.rainbow) {
    delete shopInv.consumables.rainbow;
    migrated = true;
  }
  let legacySlowLevel = 0;
  if (shopInv.slow) {
    legacySlowLevel = Math.max(legacySlowLevel, 1);
    delete shopInv.slow;
    migrated = true;
  }
  if (shopInv.consumables && shopInv.consumables.slow) {
    legacySlowLevel = Math.max(legacySlowLevel, shopInv.consumables.slow || 0);
    delete shopInv.consumables.slow;
    migrated = true;
  }
  if (legacySlowLevel > 0) {
    shopInv.slowLevel = Math.max(shopInv.slowLevel || 0, legacySlowLevel);
  }
  if (shopInv.revival) {
    shopInv.consumables.revival = Math.max(1, shopInv.consumables.revival || 0);
    delete shopInv.revival;
    migrated = true;
  }
  if (shopInv.webActive) {
    delete shopInv.webActive;
    migrated = true;
  }
  if (shopInv.double) {
    delete shopInv.double;
    migrated = true;
  }
  if (shopInv.consumables && shopInv.consumables.web) {
    delete shopInv.consumables.web;
    migrated = true;
  }
  if (migrated) saveShopInv(shopInv);
  return shopInv;
}

function saveShopInv(shopInv) {
  try { localStorage.setItem(SHOP_INV_KEY, JSON.stringify(shopInv)); } catch(_){}
}

function applyRunConsumables(shopInv) {
  shopInv.consumables = { ...(shopInv.consumables || {}) };
  const cons = shopInv.consumables;
  let dirty = false;

  // Reset runtime flags before applying
  shopInv.gambleActive = false;
  const hudConsumables = [];

  // Auto-apply certain consumables
  if (cons.gamble && cons.gamble > 0) {
    shopInv.gambleActive = true;
    cons.gamble -= 1;
    hudConsumables.push({ id: 'gamble', count: 1 });
    dirty = true;
  }

  // Revival is now a single purchase item, not consumable
  let finalRevivalCharges = 0;
  if (shopInv.revival) {
    finalRevivalCharges = 1; // Always 1 charge per run if purchased
    hudConsumables.push({ id: 'revival', count: 1 });
  }

  if (dirty) saveShopInv(shopInv);

  return {
    shopInv,
    activeRevivalCharges: finalRevivalCharges,
    hudConsumables,
  };
}

// ==================== DEBUG/TUNING UTILITIES ====================
function applyTuningToConfig(CONFIG, tuning) {
  CONFIG.jumpImpulse = Number(tuning.jumpImpulse) || CONFIG.jumpImpulse;
  CONFIG.jumpSpeedScale = Math.max(0.2, (Number(tuning.jumpSpeed) || 100) / 100);
  CONFIG.catchBase = Number(tuning.catchR) || CONFIG.catchBase;
  // buds sway percent
  CONFIG.budSwayMinPct = Math.max(0, (Number(tuning.budSwayMin) || Math.round(CONFIG.budSwayMinPct*100)) / 100);
  CONFIG.budSwayMaxPct = Math.max(CONFIG.budSwayMinPct, (Number(tuning.budSwayMax) || Math.round(CONFIG.budSwayMaxPct*100)) / 100);
  CONFIG.Lmin = Number(tuning.Lmin) || CONFIG.Lmin;
  CONFIG.Lmax = Number(tuning.Lmax) || CONFIG.Lmax;
  CONFIG.lengthJitterPct = Math.max(0, (Number(tuning.LjitPct) || 0) / 100);
  CONFIG.Dmin = Number(tuning.Dmin) || CONFIG.Dmin;
  CONFIG.Dmax = Number(tuning.Dmax) || CONFIG.Dmax;
  CONFIG.spacingJitterMin = Math.max(0.5, (Number(tuning.SJmin) || Math.round(CONFIG.spacingJitterMin*100)) / 100);
  CONFIG.spacingJitterMax = Math.max(CONFIG.spacingJitterMin, (Number(tuning.SJmax) || Math.round(CONFIG.spacingJitterMax*100)) / 100);
  CONFIG.shortLChance = Math.max(0, Math.min(1, (Number(tuning.shortProb) || 0) / 100));
  CONFIG.shortLFactor = Math.max(0.4, (Number(tuning.shortFactor) || Math.round(CONFIG.shortLFactor*100)) / 100);
  // CONFIG.longLChance = Math.max(0, Math.min(1, (Number(tuning.longProb) || 0) / 100));
  // CONFIG.longLFactor = Math.max(1.0, (Number(tuning.longFactor) || Math.round(CONFIG.longLFactor*100)) / 100);
  CONFIG.ropePausePct = Math.max(0, Math.min(1, (Number(tuning.breakProb) || 0) / 100));
  CONFIG.itemChancePct = Math.max(0, Math.min(1, (Number(tuning.itemProb) || 0) / 100));
  CONFIG.minSpacingShort = Number(tuning.DshortMin) || CONFIG.minSpacingShort;
  CONFIG.shortSpacingChance = Math.max(0, Math.min(1, (Number(tuning.DshortProb) || 0) / 100));
}

function setupDebugUI(tuning, applyTuningCallback, saveTuningCallback) {
  const root = document.getElementById('debug-panel');
  if (!root) return;
  // Block game input when interacting with debug UI
  const blockTypes = ['mousedown','mouseup','mousemove','click','dblclick','touchstart','touchmove','touchend'];
  for (const tp of blockTypes) {
    root.addEventListener(tp, (e) => { e.stopPropagation(); }, true);
  }
  const get = (id) => document.getElementById(id);
  const map = [
    ['dbg-jumpSpeed', 'jumpSpeed'],
    ['dbg-jumpImpulse', 'jumpImpulse'],
    ['dbg-catchR', 'catchR'],
    ['dbg-budSwayMin', 'budSwayMin'],
    ['dbg-budSwayMax', 'budSwayMax'],
    ['dbg-Lmin', 'Lmin'],
    ['dbg-Lmax', 'Lmax'],
    ['dbg-LjitPct', 'LjitPct'],
    ['dbg-Dmin', 'Dmin'],
    ['dbg-Dmax', 'Dmax'],
    ['dbg-SJmin', 'SJmin'],
    ['dbg-SJmax', 'SJmax'],
    ['dbg-shortProb', 'shortProb'],
    ['dbg-shortFactor', 'shortFactor'],
    ['dbg-longProb', 'longProb'],
    ['dbg-longFactor', 'longFactor'],
    ['dbg-breakProb', 'breakProb'],
    ['dbg-itemProb', 'itemProb'],
    ['dbg-DshortMin', 'DshortMin'],
    ['dbg-DshortProb', 'DshortProb'],
  ];
  for (const [elemId, propName] of map) {
    const elem = get(elemId);
    if (elem && propName in tuning) {
      elem.value = tuning[propName];
      elem.addEventListener('input', () => {
        tuning[propName] = Number(elem.value) || 0;
        applyTuningCallback();
        saveTuningCallback();
      });
    }
  }

  function clampSliderValue(elem, value) {
    let next = Number(value);
    if (!Number.isFinite(next)) next = 0;
    const min = Number(elem.min);
    if (Number.isFinite(min)) next = Math.max(min, next);
    const max = Number(elem.max);
    if (Number.isFinite(max)) next = Math.min(max, next);
    return Math.round(next);
  }

  const savingsInput = get('dbg-savings');
  if (savingsInput) {
    const current = clampSliderValue(savingsInput, typeof savings === 'number' ? savings : Number(savings) || 0);
    savingsInput.value = current;
    savingsInput.addEventListener('input', () => {
      const next = clampSliderValue(savingsInput, savingsInput.value);
      savings = next;
      savingsInput.value = next;
      try { localStorage.setItem(SAVINGS_KEY, String(next)); } catch (_) {}
    });
  }

  const expInput = get('dbg-exp');
  if (expInput) {
    const current = clampSliderValue(expInput, typeof exp === 'number' ? exp : Number(exp) || 0);
    expInput.value = current;
    expInput.addEventListener('input', () => {
      const next = clampSliderValue(expInput, expInput.value);
      exp = next;
      expInput.value = next;
      try { localStorage.setItem(EXP_KEY, String(next)); } catch (_) {}
    });
  }
}

function isFromDebug(e) {
  const t = e && (e.target || e.srcElement);
  if (!t || typeof t.closest !== 'function') return false;
  return !!t.closest('#debug-panel');
}
