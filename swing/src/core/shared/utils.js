// Utility functions extracted from main.js

// ==================== STORAGE CONSTANTS ====================
const TUNING_KEY = 'webswing_tuning_v1';
const SAVINGS_KEY = 'webswing_savings_v1';
const BEST_SCORE_KEY = 'webswing_best_v1';
const EXP_KEY = 'webswing_exp_v1';
const DEMO_DONE_KEY = 'webswing_demo_done_v1';
const DEMO_RUN_COUNT_KEY = 'webswing_demo_runs_v1';
const SHOP_INV_KEY = 'webswing_shop_inv_v1';
const LANG_KEY = 'webswing_lang';
const STATS_KEY = 'webswing_stats_v1';
const CODE_STATE_KEY = 'webswing_codes_v1';

// Daily system (UTC reset) for native builds
const DAILY_STATE_KEY = 'webswing_daily_state_v1';
const DAILY_BASE_LIVES = 30;
const DAILY_MAX_LIVES = 30;
const DAILY_INTERSTITIAL_LIMIT = 5;
const DAILY_AD_REWARD_KEYS = {
  wizard: 'wizard',
  cash20: 'cash20',
  stone: 'stone',
};

const AD_REWARD_COOLDOWNS = {
  cash20: 30 * 60 * 1000, // 30 minutes
};

const TOSS_AD_REWARD_COUNT_KEY = 'webswing_toss_rewarded_count_v1';

let dailyStateCache = null;
let tossAdRewardCountCache = null;
let codeStateCache = null;

function loadTossAdRewardCount() {
  if (Number.isFinite(tossAdRewardCountCache)) {
    return tossAdRewardCountCache;
  }
  let value = 0;
  try {
    const raw = localStorage.getItem(TOSS_AD_REWARD_COUNT_KEY);
    if (raw !== null && raw !== undefined) {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) value = parsed;
      else {
        const parsedInt = parseInt(raw, 10);
        if (Number.isFinite(parsedInt)) value = parsedInt;
      }
    }
  } catch (_) {
    value = 0;
  }
  tossAdRewardCountCache = Math.max(0, Math.floor(value));
  return tossAdRewardCountCache;
}

function setTossAdRewardCount(nextValue) {
  const normalized = Math.max(0, Math.floor(Number(nextValue) || 0));
  tossAdRewardCountCache = normalized;
  try { localStorage.setItem(TOSS_AD_REWARD_COUNT_KEY, String(normalized)); } catch (_) {}
  return tossAdRewardCountCache;
}

function getTossAdRewardCount() {
  return loadTossAdRewardCount();
}

function incrementTossAdRewardCount() {
  const current = loadTossAdRewardCount();
  return setTossAdRewardCount(current + 1);
}

function decrementTossAdRewardCount() {
  const current = loadTossAdRewardCount();
  const next = Math.max(0, current - 1);
  return setTossAdRewardCount(next);
}

function normalizeCouponCode(code) {
  return String(code || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 32);
}

function loadCodeState() {
  if (codeStateCache && typeof codeStateCache === 'object') return codeStateCache;
  let state = { used: [] };
  try {
    const raw = localStorage.getItem(CODE_STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') state = parsed;
    }
  } catch (_) {}
  if (!Array.isArray(state.used)) state.used = [];
  state.used = Array.from(new Set(state.used.map((item) => normalizeCouponCode(item)).filter(Boolean)));
  codeStateCache = state;
  return codeStateCache;
}

function saveCodeState(state) {
  if (!state || typeof state !== 'object') return;
  const normalized = {
    used: Array.isArray(state.used)
      ? state.used.map((code) => normalizeCouponCode(code)).filter(Boolean)
      : [],
  };
  codeStateCache = normalized;
  try { localStorage.setItem(CODE_STATE_KEY, JSON.stringify(normalized)); } catch (_) {}
}

function isCodeUsed(code) {
  const normalized = normalizeCouponCode(code);
  if (!normalized) return false;
  const state = loadCodeState();
  return state.used.includes(normalized);
}

function markCodeUsed(code) {
  const normalized = normalizeCouponCode(code);
  if (!normalized) return;
  const state = loadCodeState();
  if (!state.used.includes(normalized)) {
    state.used.push(normalized);
    saveCodeState(state);
  }
}

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
  stageRopesPerStage: 10,
};

const SHOP_INV_DEFAULTS = {
  glowLevel: 0,
  budsLevel: 0,
  powerJump: false,
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
  startSkill: false,
  gambleUnlimited: false,
  revival: false,
  characters: [],
  consumables: {},
};

const PLAYER_STATS_DEFAULTS = {
  version: 1,
  gameOverCount: 0,
  totalExpEarned: 0,
  totalCashEarned: 0,
  ropesCaught: 0,
  bossSuccessCount: 0,
  bossFailureCount: 0,
  itemsCollected: 0,
  goalsClaimed: [],
};

function defaultDailyState(dateStamp = currentUtcDateStamp()) {
  const rewards = {};
  for (const key of Object.values(DAILY_AD_REWARD_KEYS)) rewards[key] = false;
  return {
    date: dateStamp,
    lives: DAILY_BASE_LIVES,
    interstitialViews: 0,
    rewards,
    rewardTimes: {},
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
  const storedRewardTimes = (parsed.rewardTimes && typeof parsed.rewardTimes === 'object') ? parsed.rewardTimes : {};
  const rewardTimes = {};
  for (const key of Object.values(DAILY_AD_REWARD_KEYS)) {
    const value = storedRewardTimes[key];
    rewardTimes[key] = Number.isFinite(value) ? Number(value) : 0;
  }
  const storedDate = (typeof parsed.date === 'string') ? parsed.date : today;
  if (storedDate !== today) {
    dailyStateCache = defaultDailyState(today);
    return dailyStateCache;
  }
  const livesLimit = DAILY_MAX_LIVES + 1;
  const lives = Number.isFinite(parsed.lives)
    ? Math.max(0, Math.min(livesLimit, Math.floor(parsed.lives)))
    : DAILY_BASE_LIVES;
  const interstitialViews = Number.isFinite(parsed.interstitialViews) ? Math.max(0, Math.floor(parsed.interstitialViews)) : 0;
  dailyStateCache = {
    date: storedDate,
    lives,
    interstitialViews,
    rewards,
    rewardTimes,
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

function grantDailyLives(amount, options = {}) {
  if (!Number.isFinite(amount) || amount <= 0) return ensureDailyState().lives;
  const state = ensureDailyState();
  const override = options && Number.isFinite(options.max) ? Math.floor(options.max) : DAILY_MAX_LIVES;
  let limit = Math.max(0, override);
  if (limit < state.lives) limit = state.lives;
  state.lives = Math.max(0, Math.min(limit, state.lives + Math.floor(amount)));
  saveDailyState();
  return state.lives;
}

function setDailyLives(lives) {
  const state = ensureDailyState();
  const next = Number.isFinite(lives) ? Math.max(0, Math.min(DAILY_MAX_LIVES, Math.floor(lives))) : state.lives;
  state.lives = next;
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
  if (!state.rewardTimes) state.rewardTimes = {};
  if (AD_REWARD_COOLDOWNS[normKey]) {
    state.rewardTimes[normKey] = Date.now();
    if (state.rewards && state.rewards[normKey]) {
      state.rewards[normKey] = false;
    }
  } else {
    if (!state.rewards) state.rewards = {};
    state.rewards[normKey] = true;
  }
  saveDailyState();
}

function isDailyRewardClaimed(key) {
  if (!key) return false;
  const normKey = DAILY_AD_REWARD_KEYS[key] || key;
  const state = ensureDailyState();
  const cooldown = AD_REWARD_COOLDOWNS[normKey];
  if (cooldown) {
    const ts = state.rewardTimes && Number.isFinite(state.rewardTimes[normKey])
      ? Number(state.rewardTimes[normKey])
      : 0;
    if (!ts) return false;
    return Date.now() - ts < cooldown;
  }
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
  const level = getLevelByExp(exp);
  return level <= 3 ? 0.8 : 1.0;
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

function setLocaleFromEnvironment(api) {
  if (!api || typeof api.setLanguage !== 'function') return false;
  if (typeof IS_NATIVE_APP === 'undefined' || !IS_NATIVE_APP) return false;
  const locale = (typeof window !== 'undefined' && window.WEBSWING_DEVICE_LOCALE)
    ? String(window.WEBSWING_DEVICE_LOCALE).toLowerCase()
    : '';
  if (locale.startsWith('ko')) {
    try { api.setLanguage('ko', { manual: false }); } catch (_) {}
    return true;
  }
  try { api.setLanguage('en', { manual: false }); } catch (_) {}
  return true;
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
  let revivalOwned = Boolean(shopInv.revival);
  if (shopInv.consumables && shopInv.consumables.revival) {
    revivalOwned = true;
    delete shopInv.consumables.revival;
    migrated = true;
  }
  if (shopInv.revival !== revivalOwned) {
    shopInv.revival = revivalOwned;
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

function loadPlayerStats(existing = {}) {
  const base = { ...PLAYER_STATS_DEFAULTS, ...(existing && typeof existing === 'object' ? existing : {}) };
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        Object.assign(base, parsed);
      }
    }
  } catch (_) {}
  base.version = PLAYER_STATS_DEFAULTS.version;
  if (!Array.isArray(base.goalsClaimed)) base.goalsClaimed = [];
  else base.goalsClaimed = Array.from(new Set(base.goalsClaimed));
  return base;
}

function savePlayerStats(stats) {
  if (!stats || typeof stats !== 'object') return;
  try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch(_){}
}

function applyRunConsumables(shopInv) {
  shopInv.consumables = { ...(shopInv.consumables || {}) };
  const cons = shopInv.consumables;
  let dirty = false;

  // Reset runtime flags before applying
  shopInv.gambleActive = false;
  const hudConsumables = [];

  const hasInfiniteGamble = Boolean(shopInv.gambleUnlimited);

  // Auto-apply certain consumables
  if (hasInfiniteGamble) {
    shopInv.gambleActive = true;
    hudConsumables.push({ id: 'gamble' });
  } else if (cons.gamble && cons.gamble > 0) {
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

if (typeof window !== 'undefined') {
  window.loadCodeState = loadCodeState;
  window.markCodeUsed = markCodeUsed;
  window.isCodeUsed = isCodeUsed;
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
  const stageRopes = Number(tuning.stageRopesPerStage);
  if (Number.isFinite(stageRopes)) {
    CONFIG.stageRopesPerStage = Math.max(3, Math.min(10, Math.floor(stageRopes)));
  }
}

function setupDebugUI(tuning, applyTuningCallback, saveTuningCallback) {
  const root = document.getElementById('debug-panel');
  if (!root) return;
  // Block game input when interacting with debug UI
  const blockTypes = ['mousedown','mouseup','mousemove','click','dblclick','touchstart','touchmove','touchend'];
  for (const tp of blockTypes) {
    root.addEventListener(tp, (e) => { e.stopPropagation(); }, false);
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
    ['dbg-stageRopes', 'stageRopesPerStage'],
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

  const debugOptions = (typeof window !== 'undefined')
    ? (window.DEBUG_OPTIONS = window.DEBUG_OPTIONS || { forceHiddenSkills: false })
    : null;
  const hiddenToggleBtn = get('dbg-hidden-toggle');
  const i18nApi = (typeof window !== 'undefined' && window.I18N && typeof window.I18N.t === 'function')
    ? window.I18N
    : null;

  if (debugOptions && typeof debugOptions.forceHiddenSkills !== 'boolean') {
    debugOptions.forceHiddenSkills = Boolean(debugOptions.forceHiddenSkills);
  }

  function translateDebug(key, params) {
    if (!i18nApi || typeof i18nApi.t !== 'function') return key;
    try {
      return i18nApi.t(key, params);
    } catch (_) {
      return key;
    }
  }

  if (hiddenToggleBtn && debugOptions) {
    const updateHiddenToggle = () => {
      const enabled = !!debugOptions.forceHiddenSkills;
      hiddenToggleBtn.dataset.state = enabled ? 'on' : 'off';
      hiddenToggleBtn.textContent = enabled
        ? translateDebug('debug.hiddenToggleOn')
        : translateDebug('debug.hiddenToggleOff');
    };
    hiddenToggleBtn.addEventListener('click', () => {
      debugOptions.forceHiddenSkills = !debugOptions.forceHiddenSkills;
      updateHiddenToggle();
    });
    updateHiddenToggle();
    if (i18nApi && typeof i18nApi.onChange === 'function' && hiddenToggleBtn.dataset.i18nWatcher !== '1') {
      hiddenToggleBtn.dataset.i18nWatcher = '1';
      i18nApi.onChange(() => updateHiddenToggle());
    }
  }

  const tossRewardBtn = get('dbg-toss-reward');
  const tossRewardDecBtn = get('dbg-toss-reward-dec');
  if (tossRewardBtn || tossRewardDecBtn) {
    const updateTossRewardDisplay = () => {
      const count = (typeof getTossAdRewardCount === 'function') ? getTossAdRewardCount() : 0;
      if (tossRewardBtn) tossRewardBtn.textContent = translateDebug('debug.tossRewardButton', { count });
      if (tossRewardDecBtn) tossRewardDecBtn.textContent = translateDebug('debug.tossRewardDecButton', { count });
    };
    if (tossRewardBtn) {
      tossRewardBtn.addEventListener('click', () => {
        if (typeof incrementTossAdRewardCount === 'function') {
          incrementTossAdRewardCount();
          updateTossRewardDisplay();
          if (typeof buildShopCards === 'function') {
            try {
              buildShopCards();
            } catch (_) {}
          }
        }
      });
    }
    if (tossRewardDecBtn) {
      tossRewardDecBtn.addEventListener('click', () => {
        if (typeof decrementTossAdRewardCount === 'function') {
          decrementTossAdRewardCount();
          updateTossRewardDisplay();
          if (typeof buildShopCards === 'function') {
            try {
              buildShopCards();
            } catch (_) {}
          }
        }
      });
    }
    updateTossRewardDisplay();
    if (i18nApi && typeof i18nApi.onChange === 'function') {
      i18nApi.onChange(() => updateTossRewardDisplay());
    }
  }

  const submitLeaderboardBtn = get('dbg-submit-leaderboard');
  if (submitLeaderboardBtn) {
    const updateSubmitLeaderboardButton = () => {
      submitLeaderboardBtn.textContent = translateDebug('debug.submitLeaderboardButton');
    };
    submitLeaderboardBtn.addEventListener('click', () => {
      const isTossRuntime = (typeof window !== 'undefined')
        ? (Boolean(window.IS_TOSS_PLATFORM) && !Boolean(window.IS_NATIVE_APP))
        : false;
      if (!isTossRuntime) return;
      if (typeof submitTossLeaderboardScore === 'function') {
        try {
          submitTossLeaderboardScore(10);
        } catch (error) {
          console.warn('[GameCenter] debug submit leaderboard failed', error);
        }
      }
    });
    updateSubmitLeaderboardButton();
    if (i18nApi && typeof i18nApi.onChange === 'function') {
      i18nApi.onChange(() => updateSubmitLeaderboardButton());
    }
  }

  const setBestButton = get('dbg-set-best');
  if (setBestButton) {
    const updateSetBestButton = () => {
      setBestButton.textContent = translateDebug('debug.setBestButton');
    };
    setBestButton.addEventListener('click', () => {
      if (typeof window === 'undefined') return;
      if (typeof window.debugSetBestScore === 'function') {
        try {
          window.debugSetBestScore(10);
        } catch (error) {
          console.warn('[Debug] set best score failed', error);
        }
      }
    });
    updateSetBestButton();
    if (i18nApi && typeof i18nApi.onChange === 'function') {
      i18nApi.onChange(() => updateSetBestButton());
    }
  }

  const livesResetBtn = get('dbg-lives-reset');
  const livesAddBtn = get('dbg-lives-add');
  const updateLivesButtons = () => {
    const lives = (typeof dailyLivesRemaining === 'function') ? dailyLivesRemaining() : null;
    const params = { lives: lives != null ? lives : '?' };
    if (livesResetBtn) {
      livesResetBtn.textContent = translateDebug('debug.livesResetButton', params);
    }
    if (livesAddBtn) {
      livesAddBtn.textContent = translateDebug('debug.livesAddButton', params);
    }
  };
  if (livesResetBtn) {
    livesResetBtn.addEventListener('click', () => {
      if (typeof setDailyLives === 'function') {
        setDailyLives(1);
      }
      updateLivesButtons();
    });
  }
  if (livesAddBtn) {
    livesAddBtn.addEventListener('click', () => {
      if (typeof grantDailyLives === 'function') {
        grantDailyLives(10);
      }
      updateLivesButtons();
    });
  }
  if (livesResetBtn || livesAddBtn) {
    updateLivesButtons();
    if (i18nApi && typeof i18nApi.onChange === 'function') {
      i18nApi.onChange(() => updateLivesButtons());
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
  try { localStorage.setItem(SAVINGS_KEY, String(next)); }
  catch (_) {}
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
  try { localStorage.setItem(EXP_KEY, String(next)); }
  catch (_) {}
    });
  }
}

function isFromDebug(e) {
  const t = e && (e.target || e.srcElement);
  if (!t || typeof t.closest !== 'function') return false;
  return !!t.closest('#debug-panel');
}
