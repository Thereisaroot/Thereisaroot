// WebSwing Prototype (Ropes + Multi-spawn + Catch)

// Note: CONFIG, canvas, ctx, and i18n functions are already defined in config.js and init.js

// Tuning state (can be loaded from server later)
let tuning = { ...TUNING_DEFAULTS };


// UI helper for intro interactions
const UI = {
  clicked: false,
  justReleased: false,
  mx: 0,
  my: 0,
  keyPressed: null, // 'Space' | 'Escape' | null
  reset() { this.clicked = false; this.justReleased = false; this.keyPressed = null; },
};


// Simple game state machine: intro -> run -> gameover -> shop
const State = {
  current: 'intro', // 'intro' | 'run' | 'gameover' | 'shop' | 'boss_pending' | 'boss'
};

const CapacitorRef = (typeof window !== 'undefined' ? window.Capacitor : undefined);
const CapacitorPlatform = (() => {
  if (!CapacitorRef) return 'web';
  try {
    if (typeof CapacitorRef.getPlatform === 'function') return CapacitorRef.getPlatform();
    if (typeof CapacitorRef.platform === 'string') return CapacitorRef.platform;
  } catch (_) {}
  return 'web';
})();
const IS_NATIVE_APP = Boolean(
  CapacitorRef && (
    (typeof CapacitorRef.isNativePlatform === 'function' && CapacitorRef.isNativePlatform()) ||
    (CapacitorPlatform && CapacitorPlatform !== 'web')
  )
);

let nativeAppInfo = { version: null, build: null, label: null };
let nativeAppInfoPromise = null;
let nativeAppInfoExhausted = false;

function normalizeAppInfoValue(val) {
  if (val == null) return null;
  const str = String(val).trim();
  return str.length ? str : null;
}

function composeNativeAppLabel(version, build) {
  if (version && build) return `${version} (${build})`;
  if (version) return version;
  if (build) return `build ${build}`;
  return null;
}

function applyNativeAppInfo(info) {
  if (!info || typeof info !== 'object') return nativeAppInfo;
  const version = normalizeAppInfoValue(info.version)
    || normalizeAppInfoValue(info.versionName)
    || normalizeAppInfoValue(info.appVersion)
    || normalizeAppInfoValue(info.versionNameString)
    || normalizeAppInfoValue(info.nativeVersion)
    || normalizeAppInfoValue(info.versionNumber);
  const build = normalizeAppInfoValue(info.build)
    || normalizeAppInfoValue(info.buildNumber)
    || normalizeAppInfoValue(info.versionCode)
    || normalizeAppInfoValue(info.bundleVersion)
    || normalizeAppInfoValue(info.androidVersionCode)
    || normalizeAppInfoValue(info.buildCode);
  const labelExplicit = normalizeAppInfoValue(info.label);
  const label = labelExplicit || composeNativeAppLabel(version, build);
  console.log('[AppInfo] apply', { version, build, label, raw: info });
  nativeAppInfo = { version, build, label };
  return nativeAppInfo;
}

function getInjectedNativeAppInfo() {
  if (typeof window === 'undefined') return null;
  const version = window.WEBSWING_VERSION
    || window.WEBSWING_APP_VERSION
    || window.WEBSWING_VERSION_NAME
    || window.WEBSWING_VERSIONNAME;
  const build = window.WEBSWING_BUILD
    || window.WEBSWING_BUILD_NUMBER
    || window.WEBSWING_APP_BUILD
    || window.WEBSWING_VERSION_CODE
    || window.WEBSWING_VERSIONCODE
    || window.WEBSWING_BUILD_CODE;
  const label = window.WEBSWING_BUILD_LABEL || window.WEBSWING_VERSION_LABEL || window.WEBSWING_VERSION_DISPLAY;
  if (!version && !build && !label) return null;
  const injected = { version, build, label };
  console.log('[AppInfo] injected', injected);
  return injected;
}

function getNativeAppInfo() {
  return nativeAppInfo;
}

function getCapacitorAppPlugin() {
  if (!CapacitorRef) return null;
  try {
    if (CapacitorRef.App && typeof CapacitorRef.App.getInfo === 'function') return CapacitorRef.App;
    if (CapacitorRef.Plugins && CapacitorRef.Plugins.App && typeof CapacitorRef.Plugins.App.getInfo === 'function') {
      return CapacitorRef.Plugins.App;
    }
  } catch (_) {}
  return null;
}

function getCapacitorDevicePlugin() {
  if (!CapacitorRef) return null;
  try {
    if (CapacitorRef.Device && typeof CapacitorRef.Device.getInfo === 'function') return CapacitorRef.Device;
    if (CapacitorRef.Plugins && CapacitorRef.Plugins.Device && typeof CapacitorRef.Plugins.Device.getInfo === 'function') {
      return CapacitorRef.Plugins.Device;
    }
  } catch (_) {}
  return null;
}

function maybeApplyInjectedAppInfo() {
  const injected = getInjectedNativeAppInfo();
  if (!injected) return nativeAppInfo;
  return applyNativeAppInfo(injected);
}

function maybeLoadNativeAppInfo() {
  if (nativeAppInfoExhausted) {
    return Promise.resolve(nativeAppInfo);
  }
  if (CapacitorPlatform !== 'android' || !IS_NATIVE_APP) {
    console.log('[AppInfo] skip load (platform/native?)', { CapacitorPlatform, IS_NATIVE_APP });
    nativeAppInfoExhausted = true;
    return Promise.resolve(nativeAppInfo);
  }
  if (nativeAppInfo.label) {
    console.log('[AppInfo] already cached', nativeAppInfo);
    nativeAppInfoExhausted = true;
    return Promise.resolve(nativeAppInfo);
  }
  maybeApplyInjectedAppInfo();
  if (nativeAppInfo.label) {
    console.log('[AppInfo] using injected', nativeAppInfo);
    nativeAppInfoExhausted = true;
    return Promise.resolve(nativeAppInfo);
  }
  const appPlugin = getCapacitorAppPlugin();
  if (appPlugin && typeof appPlugin.getInfo === 'function') {
    if (!nativeAppInfoPromise) {
      console.log('[AppInfo] requesting App.getInfo');
      nativeAppInfoPromise = appPlugin.getInfo().then((info) => {
        console.log('[AppInfo] App.getInfo resolved', info);
        applyNativeAppInfo(info);
        if (!nativeAppInfo.label) {
          maybeApplyInjectedAppInfo();
        }
        return nativeAppInfo;
      }).catch((err) => {
        console.log('[AppInfo] App.getInfo failed:', err);
        maybeApplyInjectedAppInfo();
        return nativeAppInfo;
      }).finally(() => {
        console.log('[AppInfo] App.getInfo settled', nativeAppInfo);
        nativeAppInfoPromise = null;
        nativeAppInfoExhausted = Boolean(nativeAppInfo.label);
      });
    }
    return nativeAppInfoPromise;
  }

  console.log('[AppInfo] App plugin unavailable, trying Device.getInfo');
  const devicePlugin = getCapacitorDevicePlugin();
  if (devicePlugin && typeof devicePlugin.getInfo === 'function') {
    if (!nativeAppInfoPromise) {
      console.log('[AppInfo] requesting Device.getInfo');
      nativeAppInfoPromise = devicePlugin.getInfo().then((info) => {
        console.log('[AppInfo] Device.getInfo resolved', info);
        const mapped = {
          version: info && (info.appVersion || info.version || info.versionName),
          build: info && (info.appBuild || info.build || info.buildNumber || info.versionCode),
          label: info && info.label,
        };
        applyNativeAppInfo(mapped);
        if (!nativeAppInfo.label) {
          maybeApplyInjectedAppInfo();
        }
        return nativeAppInfo;
      }).catch((err) => {
        console.log('[AppInfo] Device.getInfo failed:', err);
        maybeApplyInjectedAppInfo();
        return nativeAppInfo;
      }).finally(() => {
        console.log('[AppInfo] Device.getInfo settled', nativeAppInfo);
        nativeAppInfoPromise = null;
        nativeAppInfoExhausted = Boolean(nativeAppInfo.label);
      });
    }
    return nativeAppInfoPromise;
  }

  console.log('[AppInfo] No Capacitor plugin available');
  nativeAppInfoExhausted = true;
  return Promise.resolve(nativeAppInfo);
}

function ensurePlayGateStub() {
  const Cap = (typeof window !== 'undefined') ? window.Capacitor : undefined;
  if (!Cap) return null;
  Cap.Plugins = Cap.Plugins || {};
  if (!Cap.Plugins.PlayGate) {
    const invoke = (method, options) => {
      if (typeof Cap.nativePromise === 'function') {
        return Cap.nativePromise('PlayGate', method, options || {});
      }
      if (typeof Cap.nativeCallback === 'function') {
        return new Promise((resolve, reject) => {
          Cap.nativeCallback('PlayGate', method, options || {}, resolve, reject);
        });
      }
      console.warn('[PlayGate] Native bridge unavailable');
      return Promise.reject(new Error('PlayGate bridge unavailable'));
    };
    Cap.Plugins.PlayGate = {
      showRewardedAd(options) { return invoke('showRewardedAd', options); },
      showLifeAd(options) { return invoke('showLifeAd', options); },
      showAlert(options) { return invoke('showAlert', options); },  
    };
  }
  return Cap.Plugins.PlayGate;
}

function getPlayGatePlugin() {
  return ensurePlayGateStub();
}

let lastNativeNoAdAlert = 0;

function showNativeAlert(message, title) {
  if (!IS_NATIVE_APP) return false;
  if (!message || typeof message !== 'string') return false;
  const plugin = getPlayGatePlugin();
  if (!plugin || typeof plugin.showAlert !== 'function') return false;
  const payload = { message: String(message) };
  if (title && typeof title === 'string' && title.trim()) {
    payload.title = title.trim();
  }
  try {
    const result = plugin.showAlert(payload);
    if (result && typeof result.then === 'function') {
      result.catch((err) => console.warn('[PlayGate] showAlert rejected', err));
    }
    return true;
  } catch (err) {
    console.warn('[PlayGate] showAlert threw', err);
    return false;
  }
}

function notifyNativeNoAdAvailable(preferredKey = 'adsShop.noFill') {
  if (!IS_NATIVE_APP) return false;
  const now = Date.now ? Date.now() : new Date().getTime();
  if (now - lastNativeNoAdAlert < 1000) {
    return false;
  }
  lastNativeNoAdAlert = now;
  let message = '';
  if (typeof t === 'function') {
    try {
      message = t(preferredKey);
      if ((!message || typeof message !== 'string' || !message.trim()) && preferredKey !== 'adsShop.noFill') {
        message = t('adsShop.noFill');
      }
      if (!message || typeof message !== 'string' || !message.trim()) {
        message = t('ads.lifeUnavailable');
      }
    } catch (err) {
      console.warn('[PlayGate] notifyNativeNoAdAvailable translate failed', err);
    }
  }
  if (!message || typeof message !== 'string' || !message.trim()) {
    message = 'No ad available right now. Please try again later.';
  }
  return showNativeAlert(message.trim());
}

let lifeAdStatus = 'idle'; // 'idle' | 'loading' | 'rewarded' | 'partial' | 'limit' | 'error'
let lifeAdMessage = null;
let lifeAdAutoStart = false;
let lifeSpentThisRun = false;

const REWARDED_AD_UNITS = (typeof window !== 'undefined' && window.WEBSWING_AD_UNITS) || {};

const AD_REWARD_ITEMS = [
  { key: 'wizard', type: 'character', amount: 0, placement: 'wizard', adUnitId: REWARDED_AD_UNITS.wizard || null },
  { key: 'cash20', type: 'currency', amount: 20, placement: 'cash20', adUnitId: REWARDED_AD_UNITS.cash20 || null },
];

const adRewardState = {};

const MENU_TOAST_DURATION = 2.5;
let introMenuMessage = null;
let introMenuMessageTimer = 0;
let gameOverMenuMessage = null;
let gameOverMenuMessageTimer = 0;
let introMenuButtons = [];
let gameOverMenuButtons = [];
let bossOutcomeBanner = null;
let bossOutcomeTimer = 0;

function showMenuMessage(context, message) {
  if (!message) return;
  if (context === 'intro') {
    introMenuMessage = message;
    introMenuMessageTimer = MENU_TOAST_DURATION;
  } else if (context === 'gameover') {
    gameOverMenuMessage = message;
    gameOverMenuMessageTimer = MENU_TOAST_DURATION;
  }
}

const player = new Player();
let score = 0;
let best = 0;
let simTime = 0;
const camera = { x: 0 };
const SCREEN_TARGET_X = CONFIG.width * 0.22;
let savings = 0; // money for shop
let exp = 0;     // progression EXP for levels
let lastEarned = 0; // dollars earned in the most recent run
let lastExpEarned = 0;
let demoActive = false;
let lastDemoLoss = false;
let fastModeEnabled = false;
let comboCount = 0;

const RECORD_HISTORY_PER_PAGE = 4;
const RECORD_GOALS_PER_PAGE = 3;

const recordGoalDefs = (typeof window !== 'undefined' && window.RECORD_GOALS) || [];
let playerStats = (typeof loadPlayerStats === 'function') ? loadPlayerStats() : null;
let playerStatsDirty = false;
let playerStatDefault = {
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
function ensurePlayerStats() {
  if (!playerStats) {
    playerStats = (typeof loadPlayerStats === 'function') ? loadPlayerStats() : playerStatDefault
  }
  if (!Array.isArray(playerStats.goalsClaimed)) playerStats.goalsClaimed = [];
  return playerStats;
}

function getPlayerStats() {
  return ensurePlayerStats();
}

function markPlayerStatsDirty() {
  playerStatsDirty = true;
}

function addToPlayerStat(key, amount = 1) {
  if (!key || !Number.isFinite(amount)) return;
  const stats = ensurePlayerStats();
  const current = Number.isFinite(stats[key]) ? stats[key] : 0;
  stats[key] = current + amount;
  markPlayerStatsDirty();
}

function recordGoalClaimed(goalId) {
  if (!goalId) return;
  const stats = ensurePlayerStats();
  if (!stats.goalsClaimed.includes(goalId)) {
    stats.goalsClaimed.push(goalId);
    markPlayerStatsDirty();
  }
}

function isGoalClaimed(goalId) {
  const stats = ensurePlayerStats();
  return stats.goalsClaimed.includes(goalId);
}

function flushPlayerStats() {
  if (!playerStatsDirty) return;
  if (typeof savePlayerStats === 'function') {
    savePlayerStats(ensurePlayerStats());
    playerStatsDirty = false;
  }
}

function getOwnedItemIds() {
  const owned = [];
  const specs = (typeof ITEM_SPECS !== 'undefined' && Array.isArray(ITEM_SPECS)) ? ITEM_SPECS : [];
  for (const spec of specs) {
    if (!spec || !spec.id) continue;
    const { id, type } = spec;
    let level = 0;
    if (type === 'single') {
      if (id === 'plusjump') level = shopInv.plusJump ? 1 : 0;
      else if (id === 'fly') level = shopInv.fly ? 1 : 0;
      else if (id === 'revival') level = shopInv.revival ? 1 : 0;
    } else if (type === 'level') {
      if (id === 'glow') level = shopInv.glowLevel || 0;
      else if (id === 'buds') level = shopInv.budsLevel || 0;
      else if (id === 'big') level = shopInv.bigLevel || 0;
      else if (id === 'magnet') level = shopInv.magnetLevel || 0;
      else if (id === 'combo') level = shopInv.comboLevel || 0;
      else if (id === 'slow') level = shopInv.slowLevel || 0;
      else if (id === 'lucky') level = shopInv.luckyLevel || 0;
      else if (id === 'fever') level = shopInv.feverLevel || 0;
    } else if (type === 'consumable') {
      const count = shopInv.consumables && shopInv.consumables[id];
      level = count > 0 ? count : 0;
    }
    if (level > 0) owned.push(id);
  }
  return owned;
}

function getOwnedCharacterIds() {
  const owned = new Set(['default']);
  if (Array.isArray(shopInv.characters)) {
    shopInv.characters.forEach((id) => {
      if (id) owned.add(id);
    });
  }
  if (selectedCharacter) owned.add(selectedCharacter);
  return Array.from(owned);
}

function buildRecordHistoryEntries() {
  const stats = getPlayerStats();
  const ownedItems = getOwnedItemIds();
  const ownedChars = getOwnedCharacterIds();
  return [
    { id: 'gameOverCount', labelKey: 'records.stats.gameOverCount', type: 'number', value: stats.gameOverCount || 0 },
    { id: 'totalExpEarned', labelKey: 'records.stats.totalExp', type: 'number', value: stats.totalExpEarned || 0 },
    { id: 'totalCashEarned', labelKey: 'records.stats.totalCash', type: 'number', value: stats.totalCashEarned || 0 },
    { id: 'itemsOwned', labelKey: 'records.stats.itemsOwned', type: 'list', value: ownedItems },
    { id: 'charactersOwned', labelKey: 'records.stats.charactersOwned', type: 'list', value: ownedChars },
    { id: 'ropesCaught', labelKey: 'records.stats.ropesCaught', type: 'number', value: stats.ropesCaught || 0 },
    { id: 'bossSuccessCount', labelKey: 'records.stats.bossSuccess', type: 'number', value: stats.bossSuccessCount || 0 },
    { id: 'bossFailureCount', labelKey: 'records.stats.bossFailure', type: 'number', value: stats.bossFailureCount || 0 },
    { id: 'itemsCollected', labelKey: 'records.stats.itemsCollected', type: 'number', value: stats.itemsCollected || 0 },
  ];
}

function goalMetricValue(statKey, stats, derived) {
  switch (statKey) {
    case 'itemsOwned':
      return derived.itemsOwned.length;
    case 'charactersOwned':
      return derived.charactersOwned.length;
    default:
      return Number(stats[statKey] || 0);
  }
}

function collectRecordGoalStates(filter = 'all') {
  const stats = getPlayerStats();
  const derived = {
    itemsOwned: getOwnedItemIds(),
    charactersOwned: getOwnedCharacterIds(),
  };
  const goals = [];
  for (const goal of recordGoalDefs) {
    if (!goal || !goal.id) continue;
    const value = goalMetricValue(goal.stat, stats, derived);
    const target = Math.max(0, goal.target || 0);
    const achieved = value >= target && target > 0;
    const claimed = isGoalClaimed(goal.id);
    const status = claimed ? 'completed' : (achieved ? 'achievable' : 'pending');
    if (filter === 'pending' && status !== 'pending') continue;
    if (filter === 'achievable' && status !== 'achievable') continue;
    if (filter === 'completed' && status !== 'completed') continue;
    goals.push({
      goal,
      value,
      target,
      achieved,
      claimed,
      status,
      progress: target > 0 ? Math.min(1, value / target) : 0,
    });
  }
  return goals;
}

function claimRecordGoal(goalId) {
  if (!goalId) return false;
  const goals = collectRecordGoalStates('all');
  const entry = goals.find((g) => g.goal && g.goal.id === goalId);
  if (!entry || entry.claimed || !entry.achieved) return false;
  const reward = Number(entry.goal.reward || 0);
  if (reward > 0) {
    savings += reward;
    try { localStorage.setItem(SAVINGS_KEY, String(savings)); } catch(_){}
    if (typeof addToPlayerStat === 'function') addToPlayerStat('totalCashEarned', reward);
  }
  recordGoalClaimed(goalId);
  flushPlayerStats();
  showMenuMessage('intro', t('records.goalClaimed', { amount: reward }));
  return true;
}


// Level-up popup state for game over screen
let gameOverLevelUp = null; // { from, to }
let levelUpPopupTimer = 0;

// Shop state
let shopMode = 'items'; // 'items' | 'chars' | 'ads'
let shopScroll = 0; // used only for character shop scrolling now
let shopDrag = { active: false, y0: 0, scroll0: 0 };
// Pagination states
let shopItemPage = 0;        // current page for item shop
let shopItemTotalPages = 1;  // total pages for item shop
let shopCharPage = 0;        // current page for character shop
let shopCharTotalPages = 1;  // total pages for character shop
let helpPage = 0;            // current page for item descriptions popup
let helpTotalPages = 1;      // total pages for item descriptions popup
let currentItemPageEntries = [];
let currentCharacterPageEntries = [];

function nativeLivesRemaining() {
  if (!IS_NATIVE_APP) return Number.POSITIVE_INFINITY;
  const lives = dailyLivesRemaining();
  if (lives > 0 && lifeAdStatus === 'limit') {
    lifeAdStatus = 'idle';
    lifeAdMessage = null;
  }
  return lives;
}

function nativeLivesMax() {
  return IS_NATIVE_APP ? DAILY_MAX_LIVES : Number.POSITIVE_INFINITY;
}

function formatLifeAdError(err) {
  if (!err) return '';
  if (typeof err === 'string') return err;
  if (typeof err.message === 'string' && err.message.trim()) return err.message;
  if (typeof err.reason === 'string' && err.reason.trim()) return err.reason;
  if (typeof err.code !== 'undefined') return `code ${err.code}`;
  try {
    return JSON.stringify(err);
  } catch (_) {
    return '';
  }
}

function isNoAdAvailableError(reason) {
  if (!reason || typeof reason !== 'string') return false;
  const normalized = reason.toLowerCase();
  return normalized.includes('no ad to show')
    || normalized.includes('no ad available')
    || normalized.includes('ads not available')
    || normalized.includes('no fill');
}

function triggerLifeAd(autoStart = false) {
  if (!IS_NATIVE_APP) return false;
  if (typeof ensureDailyState === 'function') ensureDailyState();
  if (lifeAdStatus === 'loading') return true;
  if (uiButtons && uiButtons.gameover) uiButtons.gameover = [];
  if (!canWatchDailyInterstitial()) {
    lifeAdStatus = 'limit';
    lifeAdMessage = t('ads.lifeLimit', { limit: DAILY_INTERSTITIAL_LIMIT });
    lifeAdAutoStart = false;
    if (uiButtons && uiButtons.gameover) uiButtons.gameover = [];
    return false;
  }
  const playGate = getPlayGatePlugin();
  if (!playGate) console.log('[LifeAd] PlayGate plugin not available', window.Capacitor);
  if (!playGate || typeof playGate.showLifeAd !== 'function') {
    lifeAdStatus = 'error';
    lifeAdMessage = t('ads.lifeUnavailable');
    lifeAdAutoStart = false;
    if (uiButtons && uiButtons.gameover) uiButtons.gameover = [];
    return false;
  }
  lifeAdStatus = 'loading';
  lifeAdMessage = null;
  lifeAdAutoStart = autoStart;
  console.log('[LifeAd] Requesting life ad, autoStart=', autoStart);
  playGate.showLifeAd({}).then((res) => {
    console.log('[LifeAd] showLifeAd resolved:', res);
    incrementDailyInterstitial();
    const rewarded = !!(res && res.rewarded);
    const gain = rewarded ? DAILY_MAX_LIVES : 2;
    grantDailyLives(gain);
    lifeAdStatus = rewarded ? 'rewarded' : 'partial';
    lifeAdMessage = t(rewarded ? 'ads.lifeRewarded' : 'ads.lifePartial', { lives: gain });
    if (uiButtons && uiButtons.gameover) uiButtons.gameover = [];
    if (lifeAdAutoStart && nativeLivesRemaining() > 0) {
      lifeAdAutoStart = false;
      setTimeout(() => resetRun(), 0);
    }
  }).catch((_err) => {
    console.log('[LifeAd] showLifeAd failed:', _err);
    const fallbackGain = 2;
    const rawReason = formatLifeAdError(_err);
    if (isNoAdAvailableError(rawReason)) {
      const noLivesBeforeAd = nativeLivesRemaining() <= 0;
      let shouldAutoRestart = false;
      if (noLivesBeforeAd) {
        grantDailyLives(fallbackGain);
        lifeAdStatus = 'partial';
        lifeAdMessage = t('ads.lifePartial', { lives: fallbackGain });
        shouldAutoRestart = lifeAdAutoStart && nativeLivesRemaining() > 0;
      } else {
        lifeAdStatus = 'error';
        lifeAdMessage = null;
      }
      lifeAdAutoStart = false;
      if (shouldAutoRestart) {
        setTimeout(() => resetRun(), 0);
      }
      if (uiButtons && uiButtons.gameover) uiButtons.gameover = [];
      notifyNativeNoAdAvailable();
      return;
    }
    const reasonText = rawReason;
    const noLivesBeforeAd = nativeLivesRemaining() <= 0;
    if (noLivesBeforeAd) {
      grantDailyLives(fallbackGain);
      lifeAdStatus = 'partial';
      lifeAdMessage = reasonText
        ? t('ads.lifeErrorWithReason', { reason: reasonText, lives: fallbackGain })
        : t('ads.lifePartial', { lives: fallbackGain });
    } else {
      lifeAdStatus = 'error';
      lifeAdMessage = reasonText
        ? `${t('ads.lifeError')} (${reasonText})`
        : t('ads.lifeError');
    }
    lifeAdAutoStart = false;
    if (uiButtons && uiButtons.gameover) uiButtons.gameover = [];
  });
  return true;
}

function getAdRewardItems() {
  return AD_REWARD_ITEMS;
}

function getAdRewardState(key) {
  if (!adRewardState[key]) {
    adRewardState[key] = { status: 'idle', message: null };
  }
  const state = adRewardState[key];
  if (state.status !== 'loading' && !isDailyRewardClaimed(key) && !state.message) {
    state.status = 'idle';
  }
  return state;
}

function startRewardAd(key) {
  const item = AD_REWARD_ITEMS.find((it) => it.key === key);
  if (!item) return;
  const state = getAdRewardState(key);
  if (state.status === 'loading') return;

  if (!IS_NATIVE_APP) {
    state.status = 'error';
    state.message = t('adsShop.nativeOnly');
    uiButtons.shop.cards = [];
    uiButtons.shop.buttons = [];
    if (typeof buildShopCards === 'function') buildShopCards();
    return;
  }

  if (typeof ensureDailyState === 'function') ensureDailyState();

  if (item.key === 'wizard' && shopInv.characters && shopInv.characters.includes('wizard')) {
    state.status = 'done';
    state.message = t('adsShop.alreadyOwned');
    uiButtons.shop.cards = [];
    uiButtons.shop.buttons = [];
    if (typeof buildShopCards === 'function') buildShopCards();
    return;
  }

  if (isDailyRewardClaimed(key)) {
    state.status = 'done';
    state.message = t('adsShop.claimedToday');
    uiButtons.shop.cards = [];
    uiButtons.shop.buttons = [];
    if (typeof buildShopCards === 'function') buildShopCards();
    return;
  }

  const playGate = getPlayGatePlugin();
  if (!playGate) console.log('[AdShop] PlayGate plugin not available', window.Capacitor);
  if (!playGate || typeof playGate.showRewardedAd !== 'function') {
    state.status = 'error';
    state.message = t('ads.lifeUnavailable');
    uiButtons.shop.cards = [];
    uiButtons.shop.buttons = [];
    if (typeof buildShopCards === 'function') buildShopCards();
    return;
  }

  state.status = 'loading';
  state.message = null;
  uiButtons.shop.cards = [];
  uiButtons.shop.buttons = [];
  if (typeof buildShopCards === 'function') buildShopCards();
  const request = {};
  if (item.adUnitId) request.adUnitId = item.adUnitId;
  if (item.placement) request.placement = item.placement;
  request.key = key;
  console.log('[AdShop] Requesting rewarded ad for key=', key, 'payload=', request);

  playGate.showRewardedAd(request).then((res) => {
    console.log('[AdShop] showRewardedAd resolved:', res);
    const rewarded = !!(res && res.rewarded);
    if (!rewarded) {
      state.status = 'error';
      state.message = t('adsShop.adNotCompleted');
      uiButtons.shop.cards = [];
      uiButtons.shop.buttons = [];
      if (typeof buildShopCards === 'function') buildShopCards();
      return;
    }

    applyAdReward(item);
    markDailyRewardClaimed(key);
    state.status = 'done';
    state.message = item.type === 'character'
      ? t('adsShop.wizardUnlocked')
      : t('adsShop.cashGranted', { amount: item.amount });
    uiButtons.shop.cards = [];
    uiButtons.shop.buttons = [];
    if (typeof buildShopCards === 'function') buildShopCards();
  }).catch((_err) => {
    console.log('[AdShop] showRewardedAd failed:', _err);
    const reasonText = formatLifeAdError(_err);
    const noFill = isNoAdAvailableError(reasonText);
    state.status = 'error';
    if (noFill) {
      state.message = null;
      notifyNativeNoAdAvailable('adsShop.noFill');
    } else {
      state.message = t('ads.lifeError');
    }
    uiButtons.shop.cards = [];
    uiButtons.shop.buttons = [];
    if (typeof buildShopCards === 'function') buildShopCards();
  });
}

function applyAdReward(item) {
  if (!item) return;
  if (item.type === 'character' && item.key === 'wizard') {
    if (!shopInv.characters) shopInv.characters = [];
    if (!shopInv.characters.includes('wizard')) {
      shopInv.characters.push('wizard');
      saveShopInv(shopInv);
    }
  } else if (item.type === 'currency') {
    const gain = Number.isFinite(item.amount) ? item.amount : 0;
    if (gain > 0) {
      savings += gain;
      try { localStorage.setItem(SAVINGS_KEY, String(savings)); } catch (_) {}
    }
  }
}

function switchShopMode(mode) {
  if (mode === 'ads' && (demoActive || !IS_NATIVE_APP)) {
    mode = 'items';
  }
  if (mode !== 'items' && mode !== 'chars' && mode !== 'ads') return;
  shopMode = mode;
  shopScroll = 0;
  shopHelp = false;
  if (mode === 'items') {
    shopItemPage = 0;
  } else if (mode === 'chars') {
    shopCharPage = 0;
  }
  uiButtons.shop.cards = [];
  uiButtons.shop.buttons = [];
  if (typeof buildShopCards === 'function') buildShopCards();
}

// Layout tuning constants for shop UIs
const CHAR_CARD_ROWS_PER_PAGE = 3;
const CHAR_CARD_VERTICAL_GAP = 20;
const CHAR_CARD_CELL_H = 115;
const ITEM_CARD_VERTICAL_GAP = CHAR_CARD_VERTICAL_GAP;
const ITEM_CARD_PADDING_TOP = 0;
const ITEM_CARD_PADDING_BOTTOM = 0;
const ITEM_CARD_EXTRA_PER_PAGE = 0;
const ITEM_CARD_HEIGHT = CHAR_CARD_CELL_H;

// Global button system for all UI elements
let uiButtons = {
  intro: [],
  gameover: [],
  shop: { cards: [], buttons: [] }
};


// Build intro buttons
function buildIntroButtons() {
  uiButtons.intro = [];
  introMenuButtons = [];

  const lvl = getLevelByExp(exp);
  const requiredLevel = 2;
  const menuWidth = 180;
  const menuHeight = 40;
  const menuSpacing = 12;
  const menuSpecs = [
    {
      key: 'records',
      label: 'records.menuButton',
      action: () => {
        showRecords = true;
        recordsView = 'menu';
        recordsMenuOptionRects = [];
        recordsCardRects = [];
        recordsFilterButtons = [];
        recordsGoalClaimButtons = [];
        recordsPaginationButtons = [];
        recordsBackButtonRect = null;
        recordsHistoryPage = 0;
        recordsGoalsPage = 0;
        recordsGoalFilter = 'all';
      },
      requiredLevel: 1,
    },
    {
      key: 'items',
      label: 'common.items',
      shopMode: 'items',
      requiredLevel,
    },
    {
      key: 'chars',
      label: 'common.chars',
      shopMode: 'chars',
      requiredLevel,
    },
  ];
  if (IS_NATIVE_APP && !demoActive) {
    menuSpecs.push({
      key: 'ads',
      label: 'common.ads',
      shopMode: 'ads',
      requiredLevel,
    });
  }

  if (menuSpecs.length) {
    const totalHeight = menuSpecs.length * menuHeight + (menuSpecs.length - 1) * menuSpacing;
    const startX = Math.floor((CONFIG.width - menuWidth) / 2);
    const startY = Math.floor(CONFIG.height * 0.58 - totalHeight / 2);

    menuSpecs.forEach((spec, idx) => {
      const y = startY + idx * (menuHeight + menuSpacing);
      const disabled = lvl < spec.requiredLevel;
      const onDisabled = () => showMenuMessage('intro', t('menu.unlockAtLevel', { level: spec.requiredLevel }));
      const action = () => {
        if (spec.key === 'records') {
          if (typeof spec.action === 'function') spec.action();
          return;
        }
        previousState = State.current;
        State.current = 'shop';
        switchShopMode(spec.shopMode);
      };
      const button = new UIButton(startX, y, menuWidth, menuHeight, () => t(spec.label), action, 'intro', {
        disabled,
        onDisabled,
        meta: { ...spec },
      });
      introMenuButtons.push(button);
      uiButtons.intro.push(button);
    });
  }

  // Guide & Settings buttons remain at footer
  const footer = footerButtonRects();
  uiButtons.intro.push(new UIButton(footer.guide.x, footer.guide.y, footer.guide.w, footer.guide.h, () => t('intro.guide'), () => {
    showGuide = true;
  }, 'intro'));
  uiButtons.intro.push(new UIButton(footer.settings.x, footer.settings.y, footer.settings.w, footer.settings.h, () => t('intro.settings'), () => {
    showSettings = true;
    settingsOptionRects = [];
    const langs = I18N_API ? I18N_API.getAvailableLanguages() : ['en'];
    const current = I18N_API ? I18N_API.getLanguage() : 'en';
    const idx = langs.indexOf(current);
    settingsFocusedIndex = idx >= 0 ? idx : 0;
  }, 'intro'));
}

// Build game over buttons
function buildGameOverButtons() {
  uiButtons.gameover = [];
  gameOverMenuButtons = [];
  const lvl = getLevelByExp(exp);
  const requiredLevel = 2;
  const menuWidth = 180;
  const menuHeight = 40;
  const menuSpacing = 12;
  const menuSpecs = [
    {
      key: 'main',
      label: 'common.mainMenu',
      action: () => {
        showRecords = false;
        previousState = 'intro';
        State.current = 'intro';
        uiButtons.gameover = [];
        uiButtons.intro = [];
      },
      requiredLevel: 1,
    },
    {
      key: 'items',
      label: 'common.items',
      shopMode: 'items',
      requiredLevel,
    },
    {
      key: 'chars',
      label: 'common.chars',
      shopMode: 'chars',
      requiredLevel,
    },
  ];
  if (IS_NATIVE_APP && !demoActive) {
    menuSpecs.push({
      key: 'ads',
      label: 'common.ads',
      shopMode: 'ads',
      requiredLevel,
    });
  }

  const activeSpecs = menuSpecs.filter(Boolean);
  if (activeSpecs.length) {
    const totalHeight = activeSpecs.length * menuHeight + (activeSpecs.length - 1) * menuSpacing;
    const startX = Math.floor((CONFIG.width - menuWidth) / 2);
    const baseY = Math.floor(CONFIG.height * 0.82 - totalHeight);
    activeSpecs.forEach((spec, idx) => {
      const y = baseY + idx * (menuHeight + menuSpacing);
      const disabled = lvl < spec.requiredLevel;
      const onDisabled = () => showMenuMessage('gameover', t('menu.unlockAtLevel', { level: spec.requiredLevel }));
      const action = () => {
        if (spec.key === 'main') {
          if (typeof spec.action === 'function') spec.action();
          return;
        }
        previousState = 'gameover';
        State.current = 'shop';
        switchShopMode(spec.shopMode);
        uiButtons.gameover = [];
      };
      const button = new UIButton(startX, y, menuWidth, menuHeight, () => t(spec.label), action, 'gameover', {
        disabled,
        onDisabled,
        meta: { ...spec },
      });
      gameOverMenuButtons.push(button);
      uiButtons.gameover.push(button);
    });
  }

  if (lvl >= 8) {
    const fw = 200;
    const fh = 32;
    const fx = Math.floor((CONFIG.width - fw) / 2);
    const fy = (gameOverMenuButtons.length > 0)
      ? gameOverMenuButtons[gameOverMenuButtons.length - 1].y + menuHeight + 28
      : Math.floor(CONFIG.height * 0.82);
    const fastButton = new UIButton(fx, fy, fw, fh, () => t('game.fastToggle', { state: commonText(fastModeEnabled ? 'on' : 'off') }), () => {
      fastModeEnabled = !fastModeEnabled;
      localStorage.setItem('webswing_fastmode_v1', fastModeEnabled ? '1' : '0');
      buildGameOverButtons();
    }, 'gameover', { meta: { type: 'fast-toggle' } });
    uiButtons.gameover.push(fastButton);
  }
}
let previousState = 'intro'; // 상점 진입 전 상태 저장
let shopConfirm = null; // { id, price }
let selectedCharacter = 'default'; // Currently selected character
let shopMsg = null;      // string message inside confirm (e.g., insufficient funds)
let shopMsgKey = null;
let shopMsgArgs = null;
let shopMsgTimer = 0;    // seconds until message auto-dismiss
let shopHelp = false;    // show help popup under SHOP
let shopHelpScroll = 0;  // scroll position for help popup
let lastShopHelpRect = null; // cached '?' button rect computed during render


// Pixel character definitions provided via external spec
function withScaledCharacterPrices(chars) {
  if (!chars) return {};
  const out = {};
  for (const [id, char] of Object.entries(chars)) {
    // Preserve original spec values without scaling while avoiding mutation.
    out[id] = { ...char };
  }
  return out;
}

const PIXEL_CHARACTERS = withScaledCharacterPrices((typeof window !== 'undefined' ? window.CHAR_SPECS : undefined) || {});
const CHARACTER_ORDER = new Map(Object.keys(PIXEL_CHARACTERS).map((id, idx) => [id, idx]));

function characterIs(id) {
  return selectedCharacter === id;
}

function visibleCharacters(includeLocked = true) {
  const lvl = getLevelByExp(exp);
  return Object.entries(PIXEL_CHARACTERS)
    .filter(([id, char]) => {
      if (id === 'bird' && !shopInv.fly) return false;
      if (!includeLocked && (char.minLevel || 1) > lvl) return false;
      return true;
    })
    .sort(([idA, charA], [idB, charB]) => {
      const minA = Number.isFinite(charA?.minLevel) ? charA.minLevel : 1;
      const minB = Number.isFinite(charB?.minLevel) ? charB.minLevel : 1;
      if (minA !== minB) return minA - minB;
      const orderA = CHARACTER_ORDER.has(idA) ? CHARACTER_ORDER.get(idA) : Number.MAX_SAFE_INTEGER;
      const orderB = CHARACTER_ORDER.has(idB) ? CHARACTER_ORDER.get(idB) : Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    });
}

function characterCardState(id, char, lvl, charInv, currentSavings) {
  const owned = charInv.includes(id) || id === 'default';
  const minLevel = char.minLevel || 1;
  const levelLocked = !owned && lvl < minLevel;
  const price = char.price || 0;
  const fundsLocked = !owned && !levelLocked && currentSavings < price;
  const locked = levelLocked || fundsLocked;
  return { owned, levelLocked, fundsLocked, locked, minLevel, price };
}

function characterAirJumpBonus() {
  let bonus = 0;
  if (characterIs('ninja')) bonus += 1;
  if (characterIs('knight')) bonus -= 1;
  return bonus;
}

// Shop inventory defaults
let rouletteState = null;
let rouletteSummary = null;

let shopInv = { ...SHOP_INV_DEFAULTS };

// Ropes and spawning
const ropes = [];
let nextRopeId = 0;
let catchLockUntil = 0; // time until which catching is disabled
let lastDetachedRope = null; // rope reference to avoid instant re-catch
let DEBUG = false;
let airJumpsLeft = 0; // limit to 2 while free
let usedAirJumps = 0; // how many flaps used since last detach
let inputLockUntil = 0; // debounce to avoid immediate state-skip
let gameOverLockUntil = 0; // ignore inputs briefly after game over
let gameOverTimer = 0; // time spent in gameover
let flyActiveRemaining = 0; // seconds of fly left for current hold
let pressStartAt = 0; // simTime when current press began
let flyLongPressTriggered = false;
let usedFlyThisRun = false; // fly can be used once per run
let robotReviveUsed = false;
let pirateBonusThisRun = 0;
let baseScoreForRewards = 0;
let wizardFloatTimer = 0;
let wizardSpinTimer = 0;
let wizardSpinRate = 0;
let activeRevivalCharges = 0; // Revival charges remaining this run
let tailorCashBonusThisRun = 0; // Extra $ from Tailor rope catches this run
let stageGateCashBonusThisRun = 0;
let stageGateExpBonusThisRun = 0;
let hudConsumables = [];
let gameOverTipKey = null;
let powerCharge = 0;
let powerChargeActive = false;
let powerChargeAvailable = true;
let powerChargeFirstJumpPending = true;
// Web rope creation marker (explicitly declared to avoid implicit globals)
let webRopeJustCreated = false;
// Prevent double rope buffering within one update step
let ropesBufferedThisStep = false;
// (removed gate based on lastBufferedAnchorX; use edge-based single-buffer strategy)
// Star mode (from star box); explicitly declared for clarity
let starModeActive = false;
let starModeEndTime = 0;
// Item/box system
const boxes = [];
let pendingExtraJump = false;
let pendingCatchR = 0;
let pendingSizeScale = 0;

// Stage bullets system (after stage 5)
let stageBullets = [];
let stageBulletTimer = 0;
let stageBulletInterval = 10; // Start at 10 seconds
let activeBudsCount = 0; // Runtime buds count (reset per run)

const SLOW_MO_SCALE = 0.65;
const SLOW_MO_DURATION = 0.9;
const SLOW_MO_COOLDOWN = 1.5;
const SLOW_MO_TRIGGER_DELAY = 0.2;
const COMBO_BONUS_PER_LEVEL = 1;
const LUCKY_BONUS_PER_LEVEL = 0.05;
const FEVER_BONUS_SECONDS = 1;
const POWER_CHARGE_SECONDS = 1.2;
const POWER_JUMP_FORWARD_BONUS = 140;
const POWER_JUMP_VERTICAL_BONUS = 240;
const TUTORIAL_STEP_DURATION = 6;
const TAILOR_EXTRA_ROPE_CHANCE = 0.5;

function onPlayerAttached() {
  powerCharge = 0;
  powerChargeActive = false;
  if (powerChargeFirstJumpPending || characterIs('springman')) {
    powerChargeAvailable = true;
  } else {
    powerChargeAvailable = false;
  }
}

function consumePowerCharge() {
  if (powerChargeFirstJumpPending) powerChargeFirstJumpPending = false;
  powerCharge = 0;
  powerChargeActive = false;
  powerChargeAvailable = false;
}

function computeBossDifficulty(stageNumber) {
  const encounterCount = bossProgress ? (bossProgress.encounterCount || 0) : 0;
  const level = Math.max(0, encounterCount - 1);
  const stageBonus = Math.max(0, stageNumber - 3) * 0.05;
  const intensity = level + stageBonus;
  const multiplier = 1 + Math.max(0, intensity) * 0.2;
  const rewardMultiplier = 1 + Math.max(0, intensity) * 0.25;
  return {
    encounterCount,
    level,
    intensity,
    multiplier,
    rewardMultiplier,
  };
}

const STAGE_COLORS = [
  '#0f1a2a', // initial default
  '#112240',
  '#1d1f4a',
  '#291e42',
  '#2f2a3f',
  '#322a33',
  '#1c2e3d',
  '#2b2234',
];
const STAGE_BANNER_DURATION = 1.5;
const STAGE_GATE_BONUS_SCORE = 5;
const STAGE_GATE_BONUS_CASH = 5;
const STAGE_GATE_BONUS_EXP = 5;
const BOSS_TYPES = ['bullet', 'slam', 'collect'];
const BOSS_FAIL_RETURN_DELAY = 1.0;

let bossState = null;
let bossProgress = null;
let bossBackgroundActive = false;

const BOSS_HUD_TEXT = {
  bullet: 'boss.hud.bullet',
  slam: 'boss.hud.slam',
  collect: 'boss.hud.collect',
};

const BOSS_SPRITES = {
  bulletProjectile: {
    palette: { '.': null, '1': '#ffed75', '2': '#ffb347', '3': '#e3642b', '4': '#ffffff' },
    pixels: [
      '..22..',
      '.2332.',
      '233332',
      '233332',
      '.2332.',
      '..22..',
    ],
  },
  cashBox: {
    palette: { '.': null, '1': '#2f2e4f', '2': '#464971', '3': '#f6d66b', '4': '#34345b', '5': '#ffffff' },
    pixels: [
      '..3333..',
      '.344443.',
      '34422243',
      '34255543',
      '34422243',
      '.344443.',
      '..3333..'
    ],
  },
  bossShooter: {
    palette: { '.': null, '1': '#1f1739', '2': '#392a62', '3': '#e05454', '4': '#ffe27a', '5': '#0b0a16' },
    pixels: [
      '..1122',
      '.12222',
      '.12332',
      '.12332',
      '.12442',
      '.15552',
      '.15552',
      '..1552',
    ],
  },
  bossCollector: {
    palette: { '.': null, '1': '#201a3d', '2': '#3a2f68', '3': '#6dd6c2', '4': '#ffe986', '5': '#0c1e2d' },
    pixels: [
      '..1122',
      '.12222',
      '.12332',
      '.12332',
      '.12442',
      '.15552',
      '.15552',
      '..1552',
    ],
  },
  bossSlam: {
    palette: { '.': null, '1': '#21173f', '2': '#3b2a6b', '3': '#f47a7a', '4': '#ffeb8a', '5': '#2b1c4f', '6': '#ffffff' },
    pixels: [
      '...3333444...',
      '..322233344..',
      '.3222223344.',
      '.3226662344.',
      '33266662344.',
      '33266662344.',
      '.3222223344.',
      '.3522222354.',
      '..35555534..',
      '..33555533..',
    ],
  },
};

let slowMoTimer = 0;
let slowMoCooldown = 0;
let slowMoPendingTimer = 0;
let slowMoPendingEffect = null;

let totalMainRopesSpawned = 0;
let currentStageIndex = 0;
let stageTransitionActive = false;
let stageTransitionProgress = 0;
let stageColorPrev = STAGE_COLORS[0];
let stageColorNext = STAGE_COLORS[0];
let stageBannerTimer = 0;
let stageBannerStage = 1;
let transitionAnchorX = 0;
let transitionStartX = 0;
let transitionEndX = 0;
let pendingStageGate = null;

function getRopesPerStage() {
  const raw = Number(CONFIG.stageRopesPerStage);
  if (!Number.isFinite(raw) || raw <= 0) return 10;
  return Math.max(1, Math.floor(raw));
}

function resetBossProgress() {
  bossProgress = {
    triggeredStages: new Set(),
    lastType: null,
    active: false,
    encounterCount: 0,
  };
  bossState = null;
  applyBossBackground(false);
}

function applyBossBackground(active) {
  bossBackgroundActive = !!active;
}

function drawBossBackground(g) {
  if (!bossBackgroundActive) return;
  const left = camera.x;
  g.fillStyle = '#050713';
  g.fillRect(left, 0, CONFIG.width, CONFIG.height);
  const grad = g.createLinearGradient(left, 0, left, CONFIG.height);
  grad.addColorStop(0, '#101b3a');
  grad.addColorStop(1, '#040308');
  g.fillStyle = grad;
  g.fillRect(left, 0, CONFIG.width, CONFIG.height);
}

function getStageColor(index) {
  const count = STAGE_COLORS.length;
  if (count === 0) return '#1c2a3a';
  const wrapped = ((index % count) + count) % count;
  return STAGE_COLORS[wrapped];
}

function resetStageState() {
  totalMainRopesSpawned = 0;
  currentStageIndex = 0;
  stageTransitionActive = false;
  stageTransitionProgress = 0;
  stageColorPrev = getStageColor(0);
  stageColorNext = stageColorPrev;
  stageBannerTimer = 0;
  stageBannerStage = 1;
  transitionAnchorX = 0;
  transitionStartX = 0;
  transitionEndX = 0;
  pendingStageGate = null;
  resetBossProgress();
}

function startStageTransition(newStageIndex) {
  stageColorPrev = stageColorNext;
  stageColorNext = getStageColor(newStageIndex);
  stageTransitionActive = true;
  stageTransitionProgress = 0;
  stageBannerStage = newStageIndex + 1;
  stageBannerTimer = STAGE_BANNER_DURATION;
  currentStageIndex = newStageIndex;
}

function registerMainRopeSpawn(anchorX, prevAnchorX) {
  const ropesPerStage = getRopesPerStage();
  const prevStage = Math.floor(Math.max(totalMainRopesSpawned - 1, 0) / ropesPerStage);
  totalMainRopesSpawned++;
  const newStage = Math.floor(Math.max(totalMainRopesSpawned - 1, 0) / ropesPerStage);
  if (newStage > prevStage) {
    transitionStartX = (typeof prevAnchorX === 'number') ? prevAnchorX : anchorX;
    transitionEndX = anchorX;
    transitionAnchorX = anchorX;
    startStageTransition(newStage);
    const gateRope = ropes.length > 0 ? ropes[ropes.length - 1] : null;
    if (gateRope) {
      gateRope.stageGateStage = newStage;
      gateRope.stageGateRewarded = false;
    }
    pendingStageGate = {
      stage: newStage,
      anchorX,
      ropeId: gateRope ? gateRope.id : null,
      rewarded: false,
    };
  }
}

function updateStageTransition(dt) {
  if (stageTransitionActive) {
    const span = Math.max(1, transitionEndX - transitionStartX);
    const camDelta = camera.x - transitionStartX;
    stageTransitionProgress = Math.max(0, Math.min(1, camDelta / span));
    const boundaryScreen = transitionAnchorX - camera.x;
    if (boundaryScreen <= 0) {
      stageTransitionActive = false;
      stageColorPrev = stageColorNext;
      stageTransitionProgress = 0;
    }
  }
  if (stageBannerTimer > 0) {
    stageBannerTimer = Math.max(0, stageBannerTimer - dt);
  }
}

function grantStageGateReward(triggerRope) {
  const hasStageRope = triggerRope && triggerRope.stageGateStage != null;
  if (triggerRope && triggerRope.stageGateRewarded) return;
  if (!pendingStageGate && !hasStageRope) return;
  const stageIndex = hasStageRope ? triggerRope.stageGateStage : (pendingStageGate ? pendingStageGate.stage : null);
  const stageNumber = stageIndex != null ? stageIndex + 1 : null;
  if (pendingStageGate && pendingStageGate.rewarded) {
    if (triggerRope) triggerRope.stageGateRewarded = true;
    if (stageNumber != null) maybeTriggerBossStage(stageNumber, triggerRope);
    return;
  }
  if (triggerRope) triggerRope.stageGateRewarded = true;
  if (pendingStageGate) pendingStageGate.rewarded = true;
  score += STAGE_GATE_BONUS_SCORE;
  exp += STAGE_GATE_BONUS_EXP;
  spawnEffect('combo', player.x, player.y + 26, t('effects.stageBonus', {
    cash: STAGE_GATE_BONUS_CASH,
  }));
  savings += STAGE_GATE_BONUS_CASH;
  stageGateCashBonusThisRun += STAGE_GATE_BONUS_CASH;
  stageGateExpBonusThisRun += STAGE_GATE_BONUS_EXP;
  try { localStorage.setItem(SAVINGS_KEY, String(savings)); } catch (_) {}
  if (typeof addToPlayerStat === 'function') addToPlayerStat('totalExpEarned', STAGE_GATE_BONUS_EXP);
  if (typeof addToPlayerStat === 'function') addToPlayerStat('totalCashEarned', STAGE_GATE_BONUS_CASH);
  try { localStorage.setItem(EXP_KEY, String(exp)); } catch (_) {}
  if (typeof SkillSystem !== 'undefined' && SkillSystem && typeof SkillSystem.queueSelection === 'function') {
    SkillSystem.queueSelection('stage_reward', { stage: stageNumber });
  }
  if (stageNumber != null) maybeTriggerBossStage(stageNumber, triggerRope);
}

function getBossStageTriggerSet() {
  if (!CONFIG.bossStageTriggers) return new Set();
  if (Array.isArray(CONFIG.bossStageTriggers)) {
    return new Set(CONFIG.bossStageTriggers.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0));
  }
  const single = Number(CONFIG.bossStageTriggers);
  if (Number.isFinite(single) && single > 0) return new Set([single]);
  return new Set();
}

function maybeTriggerBossStage(stageNumber, entryRope) {
  if (!bossProgress) resetBossProgress();
  const triggers = getBossStageTriggerSet();
  if (!triggers.has(stageNumber)) return;
  if (bossProgress.triggeredStages.has(stageNumber)) return;
  if (bossState && bossState.active) return;
  if (starModeActive) {
    starModeActive = false;
    starModeEndTime = 0;
  }
  startBossStage(stageNumber, entryRope);
}

function pickBossType(stageNumber) {
  if (!bossProgress) resetBossProgress();
  let candidates = BOSS_TYPES;
  if (bossProgress.lastType && BOSS_TYPES.length > 1) {
    candidates = BOSS_TYPES.filter((t) => t !== bossProgress.lastType);
    if (candidates.length === 0) candidates = BOSS_TYPES.slice();
  }
  const idx = Math.floor(Math.random() * candidates.length);
  const type = candidates[Math.max(0, Math.min(candidates.length - 1, idx))] || BOSS_TYPES[0];
  bossProgress.lastType = type;
  return type;
}

function startBossStage(stageNumber, entryRope) {
  if (!entryRope) return;
  applyBossBackground(false);
  const type = pickBossType(stageNumber);
  bossProgress.triggeredStages.add(stageNumber);
  bossProgress.encounterCount = (bossProgress.encounterCount || 0) + 1;
  bossProgress.active = true;
  const difficulty = computeBossDifficulty(stageNumber);

  const restoreCameraX = camera.x;
  const entryAnchorX = entryRope.anchorX;
  const entryBaseTipY = entryRope.anchorY + entryRope.L;

  const battleCameraX = entryAnchorX - CONFIG.width * 0.35;

  bossState = {
    active: true,
    stageNumber,
    type,
    difficulty,
    phase: 'bounce',
    timer: 0,
    entryDuration: 1.8,
    savedCameraX: restoreCameraX,
    entryRope,
    entryRetractSpeed: 240,
    entryTargetLength: Math.max(60, entryRope.L * 0.35),
    entryOriginalLength: entryRope.L,
    entryAnchorX,
    entryAnchorY: entryRope.anchorY,
    entryStableTipY: entryRope.anchorY + entryRope.L,
    bounceDuration: 0.32,
    bounceAmplitude: Math.min(64, entryRope.L * 0.22),
    cameraTargetX: battleCameraX,
    battle: null,
    returnDelay: 0,
  };

  ropes.length = 0;
  boxes.length = 0;
  ropes.push(entryRope);

  player.rope = entryRope;
  player.mode = 'ascend';
  player.vx = 0;
  player.vy = 0;
  consumePowerCharge();
  entryRope.A = 0;
  entryRope.omega = 0;
  entryRope.phi = 0;
  player.x = entryAnchorX;
  player.y = entryBaseTipY;

  State.current = 'boss_pending';
}

function updateBossPending(dt) {
  if (typeof SkillSystem !== 'undefined' && SkillSystem && typeof SkillSystem.getPopupState === 'function' && SkillSystem.getPopupState()) {
    return;
  }
  if (!bossState || !bossState.active) {
    State.current = 'run';
    return;
  }
  simTime += dt;
  updateParticles(dt);
  if (bossState.phase === 'bounce') {
    const rope = bossState.entryRope;
    if (!rope) {
      beginBossPop();
      return;
    }
    bossState.timer += dt;
    const duration = bossState.bounceDuration || 0.45;
    const t = Math.min(1, bossState.timer / duration);
    const baseL = bossState.entryOriginalLength || rope.L;
    rope.L = baseL;
    rope.A = 0;
    rope.omega = 0;
    rope.phi = 0;
    const anchorX = bossState.entryAnchorX != null ? bossState.entryAnchorX : rope.anchorX;
    const baseTipY = bossState.entryStableTipY != null ? bossState.entryStableTipY : (rope.anchorY + baseL);
    player.x = anchorX;
    player.y = baseTipY;
    player.vx = 0;
    player.vy = 0;
    const camTarget = bossState.cameraTargetX != null ? bossState.cameraTargetX : (rope.anchorX - SCREEN_TARGET_X);
    camera.x += (camTarget - camera.x) * Math.min(1, dt * 1.5);
    if (t >= 1) {
      rope.L = baseL;
      bossState.ascendSpeed = bossState.ascendSpeed || 520;
      bossState.ascendStartY = player.y;
      bossState.ascendTargetY = -CONFIG.height * 0.6;
      bossState.ascendDuration = bossState.ascendDuration || 0.48;
      bossState.ascendX = player.x;
      bossState.entryRope = rope;
      player.rope = null;
      bossState.phase = 'ascend';
      bossState.timer = 0;
    }
    return;
  }
  if (bossState.phase === 'ascend') {
    bossState.timer += dt;
    const duration = bossState.ascendDuration || 0.48;
    const t = Math.min(1, bossState.timer / Math.max(0.0001, duration));
    const eased = easeInOutCubic(t);
    const startY = bossState.ascendStartY != null ? bossState.ascendStartY : player.y;
    const targetY = bossState.ascendTargetY != null ? bossState.ascendTargetY : -CONFIG.height * 0.6;
    const ascendX = bossState.ascendX != null ? bossState.ascendX : player.x;
    player.x = ascendX;
    player.y = startY + (targetY - startY) * eased;
    player.vx = 0;
    player.vy = (targetY - startY) / Math.max(0.0001, duration);
    const camTarget = bossState.cameraTargetX != null ? bossState.cameraTargetX : camera.x;
    camera.x += (camTarget - camera.x) * Math.min(1, dt * 2.4);
    if (t >= 1) {
      beginBossPop();
    }
    return;
  }
  if (bossState.phase === 'pop') {
    bossState.timer += dt;
    const duration = bossState.popDuration || 0.65;
    const t = Math.max(0, Math.min(1, bossState.timer / Math.max(0.0001, duration)));
    const eased = easeOutCubic(t);

    const startY = bossState.popStartY != null ? bossState.popStartY : (CONFIG.height + 60);
    const targetY = bossState.popTargetY != null ? bossState.popTargetY : (CONFIG.height * 0.5);
    const startX = bossState.popStartX != null ? bossState.popStartX : player.x;
    const targetX = bossState.popTargetX != null ? bossState.popTargetX : (CONFIG.width * 0.35);
    const camStart = bossState.popCamStartX != null ? bossState.popCamStartX : camera.x;
    const camTarget = bossState.popCamTargetX != null ? bossState.popCamTargetX : 0;

    player.x = startX + (targetX - startX) * eased;
    player.y = startY + (targetY - startY) * eased;
    player.vx = 0;
    player.vy = 0;
    camera.x = camStart + (camTarget - camStart) * eased;

    if (t >= 1) {
      initBossBattle();
    }
    return;
  }
  beginBossPop();
}

function beginBossPop() {
  if (!bossState || bossState.phase === 'battle' || bossState.phase === 'battle_init') return;
  applyBossBackground(true);
  boxes.length = 0;
  bossState.phase = 'boss_fade_in';  // Changed to distinguish from boss_pending's pop
  bossState.timer = 0;
  bossState.popTargetY = CONFIG.height * 0.48;
  bossState.popDuration = 2.0;  // Changed from 0.65 to 2 seconds
  bossState.entryRope = null;
  bossState.fadeAlpha = 0;  // Start with invisible
  bossState.fadeScale = 1.3; // Start at 1.3x scale
  State.current = 'boss';
  player.rope = null;
  player.mode = 'boss_pop';
  bossState.popTargetX = CONFIG.width * 0.35;
  bossState.popCamStartX = camera.x;
  bossState.popCamTargetX = 0;
  // Set player to target position immediately
  player.y = bossState.popTargetY;
  player.x = bossState.popTargetX;
  player.vx = 0;
  player.vy = 0;
}

function initBossBattle() {
  if (!bossState) return;
  const basePlayerX = CONFIG.width * 0.35;
  const difficulty = bossState.difficulty || computeBossDifficulty(bossState.stageNumber || 3);
  const diffIntensity = Math.max(0, difficulty.intensity || 0);
  const rewardMultiplier = Math.max(1, difficulty.rewardMultiplier || 1);
  ropes.length = 0;
  boxes.length = 0;
  player.rope = null;
  player.mode = 'boss';
  player.x = basePlayerX;
  player.y = CONFIG.height * 0.55;
  player.vx = 0;
  player.vy = 0;
  player.angle = 0;
  camera.x = 0;

  const topClamp = 40;
  const bottomFailY = CONFIG.height + 80;
  const battleBase = {
    topClamp,
    bottomFailY,
    playerX: basePlayerX,
    gravity: CONFIG.gravity,
    jumpPower: CONFIG.jumpImpulse * 0.9,
    bossTimer: 0,
    hudMessage: '',
    rewardMultiplier,
  };

  if (bossState.type === 'bullet') {
    const bulletTotalShots = Math.max(10, Math.round(12 + diffIntensity * 6));
    const bulletShotInterval = Math.max(0.5, 1.0 - diffIntensity * 0.12);
    const bulletShotCooldown = Math.max(0.3, bulletShotInterval * 0.6);
    const bulletHitLimit = Math.max(2, Math.round(4 - diffIntensity * 0.5));
    const bulletBossSpeed = 90 + diffIntensity * 20;
    const bulletSpeed = 220 + diffIntensity * 45;
    const bulletVolleyMax = Math.max(2, Math.min(3, 1 + Math.floor(diffIntensity)));
    const bulletAimFrequency = Math.max(2, Math.round(4 - diffIntensity * 0.5));
    bossState.battle = {
      ...battleBase,
      bossY: CONFIG.height * 0.35,
      bossDir: 1,
      bossSpeed: bulletBossSpeed,
      bossMinY: 60,
      bossMaxY: CONFIG.height * 0.65,
      bossOffsetX: CONFIG.width - 8,
      shotsFired: 0,
      totalShots: bulletTotalShots,
      shotInterval: bulletShotInterval,
      shotCooldown: bulletShotCooldown,
      bullets: [],
      dodged: 0,
      hitsTaken: 0,
      hitLimit: bulletHitLimit,
      bulletSpeed,
      failOnHit: false,
      nextVolleySize: 1,
      volleyMax: bulletVolleyMax,
      topLeftAimFrequency: bulletAimFrequency,
      topLeftTarget: { x: 40, y: 48 },
    };
  } else if (bossState.type === 'slam') {
    const slamDuration = Math.max(6, 10 - diffIntensity * 1.0);
    const slamSuccessThreshold = Math.round(50 + diffIntensity * 12);
    const slamMaxScoreJumps = Math.round(slamSuccessThreshold + 30 + diffIntensity * 15);
    const slamJumpPower = 320 + diffIntensity * 30;
    const slamBaseGravity = CONFIG.gravity * (1.35 + diffIntensity * 0.12);
    bossState.battle = {
      ...battleBase,
      duration: slamDuration,
      bossX: CONFIG.width * 0.46,
      bossY: CONFIG.height * 0.32,
      bossRadius: 70,
      hitCount: 0,
      hitCooldown: 0,
      jumpCount: 0,
      successThreshold: slamSuccessThreshold,
      maxScoreJumps: slamMaxScoreJumps,
      jumpPower: slamJumpPower,
      baseGravity: slamBaseGravity,
    };
  } else if (bossState.type === 'collect') {
    const collectTotalShots = Math.max(8, Math.round(10 + diffIntensity * 4));
    const collectShotInterval = Math.max(0.6, 1.1 - diffIntensity * 0.12);
    const collectShotCooldown = Math.max(0.3, collectShotInterval * 0.5);
    const collectMissLimit = Math.max(2, Math.round(5 - diffIntensity * 0.7));
    const collectTravelSpeedX = 160 + diffIntensity * 35;
    const collectTravelSpeedY = 60 + diffIntensity * 20;
    const collectBossSpeed = 70 + diffIntensity * 18;
    bossState.battle = {
      ...battleBase,
      bossY: CONFIG.height * 0.30,
      bossDir: 1,
      bossSpeed: collectBossSpeed,
      bossMinY: 60,
      bossMaxY: CONFIG.height * 0.6,
      shotsFired: 0,
      totalShots: collectTotalShots,
      shotInterval: collectShotInterval,
      shotCooldown: collectShotCooldown,
      boxes: [],
      collected: 0,
      missed: 0,
      missLimit: collectMissLimit,
      travelSpeedX: collectTravelSpeedX,
      travelSpeedY: collectTravelSpeedY,
    };
  }
  bossState.phase = 'battle';
  bossState.timer = 0;
}

function updateBoss(dt) {
  if (typeof SkillSystem !== 'undefined' && SkillSystem && typeof SkillSystem.getPopupState === 'function' && SkillSystem.getPopupState()) {
    return;
  }
  if (!bossState || !bossState.active) return;
  simTime += dt;

  if (bossState.phase === 'boss_fade_in') {
    bossState.timer += dt;
    const duration = bossState.popDuration || 2.0;
    const t = Math.min(1, bossState.timer / duration);
    const eased = easeOutCubic(t);

    // Keep player at target location
    const targetY = bossState.popTargetY || (CONFIG.height * 0.48);
    const targetX = bossState.popTargetX || (CONFIG.width * 0.35);
    player.y = targetY;
    player.x = targetX;
    player.vx = 0;
    player.vy = 0;

    // Fade in and scale down animation
    bossState.fadeAlpha = eased; // 0 -> 1
    bossState.fadeScale = 1.3 - (0.3 * eased); // 1.3 -> 1.0

    camera.x += (0 - camera.x) * Math.min(1, dt * 2);
    if (t >= 1) {
      player.mode = 'boss';
      bossState.phase = 'battle_init';
      bossState.timer = 0;
      bossState.fadeAlpha = 1;
      bossState.fadeScale = 1;
    }
  } else if (bossState.phase === 'battle_init') {
    initBossBattle();
  } else if (bossState.phase === 'battle') {
    updateBossBattle(dt);
  } else if (bossState.phase === 'falling') {
    bossState.timer += dt;
    player.vy += CONFIG.gravity * dt;
    player.y += player.vy * dt;
    if (bossState.timer >= (bossState.fallDuration || 1.0) || player.y >= CONFIG.height + 40) {
      bossState.phase = 'returning';
      bossState.returnDelay = BOSS_FAIL_RETURN_DELAY;
    }
  } else if (bossState.phase === 'returning') {
    bossState.returnDelay -= dt;
    if (bossState.returnDelay <= 0) {
      applyBossReturn(bossState.returnPayload || { success: false });
    }
  }

  updateParticles(dt);
}

function updateBossBattle(dt) {
  if (!bossState || !bossState.battle) return;
  const battle = bossState.battle;

  if (!handleBossPlayerMovement(dt, battle)) return;
  if (bossState.phase === 'returning') return;

  if (bossState.type === 'bullet') {
    updateBossTypeBullet(dt, battle);
  } else if (bossState.type === 'slam') {
    updateBossTypeSlam(dt, battle);
  } else if (bossState.type === 'collect') {
    updateBossTypeCollect(dt, battle);
  }
}

function handleBossPlayerMovement(dt, battle) {
  if (!bossState || bossState.phase !== 'battle') return false;
  if (Input.justPressed) {
    const jumpPower = bossState.type === 'slam' ? (battle.jumpPower || 160) : battle.jumpPower;
    if (bossState.type === 'slam') {
      battle.jumpCount = (battle.jumpCount || 0) + 1;
    }
    player.vy = -jumpPower;
  }
  const gravity = (bossState.type === 'slam') ? (battle.baseGravity || battle.gravity || CONFIG.gravity) : battle.gravity;
  player.vy += gravity * dt;
  player.y += player.vy * dt;
  player.vx = 0;
  player.x = battle.playerX;

  if (player.y < battle.topClamp) {
    player.y = battle.topClamp;
    if (player.vy < 0) player.vy *= -0.4;
  }
  if (player.y > battle.bottomFailY) {
    triggerBossFailure('fell');
    return false;
  }
  return true;
}

function updateBossTypeBullet(dt, battle) {
  battle.shotCooldown -= dt;
  battle.bossY += battle.bossDir * battle.bossSpeed * dt;
  if (battle.bossY < battle.bossMinY) {
    battle.bossY = battle.bossMinY;
    battle.bossDir = 1;
  } else if (battle.bossY > battle.bossMaxY) {
    battle.bossY = battle.bossMaxY;
    battle.bossDir = -1;
  }

  if (battle.shotsFired < battle.totalShots && battle.shotCooldown <= 0) {
    spawnBossBullet(battle);
  }

  for (let i = battle.bullets.length - 1; i >= 0; i--) {
    const bullet = battle.bullets[i];
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life += dt;

    if (!bullet.hit) {
      const dx = bullet.x - player.x;
      const dy = bullet.y - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= player.r + bullet.radius) {
        bullet.hit = true;
        battle.hitsTaken = (battle.hitsTaken || 0) + 1;
        spawnEffect('burst', bullet.x, bullet.y);
        battle.bullets.splice(i, 1);
        if (battle.hitsTaken >= (battle.hitLimit || 1)) {
          triggerBossFailure('hit');
          return;
        }
        continue;
      }
    }

    if (bullet.x < camera.x - 40) {
      battle.dodged += 1;
      battle.bullets.splice(i, 1);
    }
  }

  if (battle.shotsFired >= battle.totalShots && battle.bullets.length === 0) {
    if ((battle.hitsTaken || 0) < (battle.hitLimit || 1)) {
      const accuracy = battle.totalShots > 0 ? Math.max(0, Math.min(1, battle.dodged / battle.totalShots)) : 0;
      const rewardBase = Math.max(0, Math.round(accuracy * 20));
      const rewardMultiplier = battle.rewardMultiplier || (bossState && bossState.difficulty && bossState.difficulty.rewardMultiplier) || 1;
      const reward = Math.max(rewardBase, Math.round(rewardBase * rewardMultiplier));
      triggerBossSuccess({ score: reward, cash: reward });
    } else {
      triggerBossFailure('hit');
    }
    return;
  }
}

function spawnBossBullet(battle) {
  const desiredVolley = battle.nextVolleySize || 1;
  const remaining = Math.max(0, battle.totalShots - battle.shotsFired);
  const volleySize = Math.min(desiredVolley, remaining);
  battle.shotCooldown = battle.shotInterval;
  if (volleySize <= 0) {
    return;
  }
  const speed = battle.bulletSpeed || 220;
  const bossOffsetX = battle.bossOffsetX != null ? battle.bossOffsetX : (CONFIG.width - 8);
  const spawnBaseX = (camera.x + bossOffsetX) - 12;
  const spawnBaseY = battle.bossY;
  const topLeftTarget = battle.topLeftTarget || { x: 40, y: 48 };
  for (let i = 0; i < volleySize; i += 1) {
    const shotIndex = battle.shotsFired + 1;
    const spawnY = spawnBaseY + ((i - (volleySize - 1) / 2) * 18);
    const aimEvery = Math.max(2, battle.topLeftAimFrequency || 4);
    const aimTopLeft = (shotIndex % aimEvery) === 0;
    let targetX;
    let targetY;
    if (aimTopLeft) {
      targetX = camera.x + (topLeftTarget.x != null ? topLeftTarget.x : 40);
      targetY = topLeftTarget.y != null ? topLeftTarget.y : 48;
    } else {
      targetX = player.x + randRange(-20, 20);
      targetY = (player.y - 10) + randRange(-12, 12);
    }
    const dx = targetX - spawnBaseX;
    const dy = targetY - spawnY;
    const mag = Math.hypot(dx, dy) || 1;
    const vx = (dx / mag) * speed;
    const vy = (dy / mag) * speed;
    battle.shotsFired += 1;
    battle.bullets.push({
      x: spawnBaseX,
      y: spawnY,
      vx,
      vy,
      radius: 10,
      life: 0,
      hit: false,
      target: aimTopLeft ? 'topLeft' : 'player',
    });
  }
  const volleyMax = Math.max(2, battle.volleyMax || 2);
  const nextVolley = desiredVolley >= volleyMax ? 1 : Math.min(volleyMax, desiredVolley + 1);
  battle.nextVolleySize = nextVolley;
}

function updateBossTypeSlam(dt, battle) {
  battle.bossTimer += dt;
  if (battle.hitCooldown > 0) battle.hitCooldown -= dt;

  if (Input.justPressed) {
    spawnEffect('sparkle', player.x, player.y - 12);
  }

  const jumps = battle.jumpCount || 0;
  const successThreshold = battle.successThreshold ?? 50;
  const maxScoreJumps = Math.max(successThreshold, battle.maxScoreJumps || successThreshold);
  if (battle.bossTimer >= battle.duration) {
    const clamped = Math.min(jumps, maxScoreJumps);
    const span = Math.max(1, maxScoreJumps - successThreshold);
    const rawReward = (clamped - successThreshold) / span * 20;
    const rewardBase = jumps >= successThreshold ? Math.max(0, Math.min(20, Math.round(rawReward))) : 0;
    const rewardMultiplier = (battle && battle.rewardMultiplier) || (bossState && bossState.difficulty && bossState.difficulty.rewardMultiplier) || 1;
    const reward = Math.max(rewardBase, Math.round(rewardBase * rewardMultiplier));
    triggerBossOutcome({ success: jumps >= successThreshold, score: reward, cash: reward });
    return;
  }
}

function updateBossTypeCollect(dt, battle) {
  battle.shotCooldown -= dt;
  battle.bossY += battle.bossDir * battle.bossSpeed * dt;
  if (battle.bossY < battle.bossMinY) {
    battle.bossY = battle.bossMinY;
    battle.bossDir = 1;
  } else if (battle.bossY > battle.bossMaxY) {
    battle.bossY = battle.bossMaxY;
    battle.bossDir = -1;
  }

  if (battle.shotsFired < battle.totalShots && battle.shotCooldown <= 0) {
    spawnBossTreasure(battle);
  }

  for (let i = battle.boxes.length - 1; i >= 0; i--) {
    const box = battle.boxes[i];
    box.x += box.vx * dt;
    box.y += box.vy * dt;
    box.vy += 30 * dt;

    const dx = box.x - player.x;
    const dy = box.y - player.y;
    if (!box.caught && Math.hypot(dx, dy) <= player.r + 12) {
      box.caught = true;
      battle.collected += 1;
      spawnEffect('combo', box.x, box.y - 12, t('effects.cashPickup'));
      battle.boxes.splice(i, 1);
      continue;
    }

    if (box.x < -40 || box.y > CONFIG.height + 40) {
      if (!box.caught) battle.missed += 1;
      battle.boxes.splice(i, 1);
    }
  }

  if (battle.missed >= battle.missLimit) {
    triggerBossFailure('missed_boxes');
    return;
  }

  if (battle.collected >= battle.totalShots) {
    const rewardBase = battle.collected * 2;
    const rewardMultiplier = (battle && battle.rewardMultiplier) || (bossState && bossState.difficulty && bossState.difficulty.rewardMultiplier) || 1;
    const reward = Math.max(rewardBase, Math.round(rewardBase * rewardMultiplier));
    triggerBossSuccess({ score: reward, cash: reward });
    return;
  }

  if (battle.shotsFired >= battle.totalShots && battle.boxes.length === 0) {
    const rewardBase = battle.collected * 2;
    const rewardMultiplier = (battle && battle.rewardMultiplier) || (bossState && bossState.difficulty && bossState.difficulty.rewardMultiplier) || 1;
    const reward = Math.max(rewardBase, Math.round(rewardBase * rewardMultiplier));
    if (battle.missed >= battle.missLimit) {
      triggerBossFailure('missed_boxes');
    } else {
      triggerBossSuccess({ score: reward, cash: reward });
    }
  }
}

function spawnBossTreasure(battle) {
  battle.shotsFired += 1;
  battle.shotCooldown = battle.shotInterval;
  battle.boxes.push({
    x: camera.x + CONFIG.width + 20,
    y: battle.bossY,
    vx: -battle.travelSpeedX,
    vy: randRange(-battle.travelSpeedY, battle.travelSpeedY * 0.2),
    caught: false,
  });
}

function triggerBossSuccess(reward) {
  triggerBossOutcome({ success: true, ...reward });
}

function triggerBossFailure(reason) {
  triggerBossOutcome({ success: false, reason });
}

function triggerBossOutcome({ success, score: rewardScore = 0, cash: rewardCash = 0, reason }) {
  if (!bossState || bossState.phase === 'returning' || bossState.phase === 'falling') return;
  bossState.returnPayload = { success, rewardScore, rewardCash, reason };
  if (bossState.battle) {
    if (bossState.battle.bullets) bossState.battle.bullets.length = 0;
    if (bossState.battle.boxes) bossState.battle.boxes.length = 0;
  }
  if (bossState.type === 'bullet') {
    bossState.phase = 'falling';
    bossState.timer = 0;
    bossState.fallDuration = 1.2;
    player.vx = 0;
    player.vy = 200;
    bossState.battle = null;
  } else {
    bossState.phase = 'returning';
    bossState.returnDelay = BOSS_FAIL_RETURN_DELAY;
  }
  applyBossBackground(true);
}

function applyBossReturn(payload) {
  const { success, rewardScore = 0, rewardCash = 0, reason = null } = payload || {};
  if (typeof addToPlayerStat === 'function') {
    addToPlayerStat(success ? 'bossSuccessCount' : 'bossFailureCount', 1);
    if (success && rewardCash > 0) addToPlayerStat('totalCashEarned', rewardCash);
  }
  bossOutcomeBanner = { success, rewardScore, rewardCash, reason };
  bossOutcomeTimer = 2.0;
  bossProgress.active = false;
  if (bossState) bossState.active = false;
  applyBossBackground(false);

  if (rewardScore > 0) {
    score += rewardScore;
    baseScoreForRewards += rewardScore;
    spawnEffect('combo', player.x, player.y - 24, t('effects.pointsEarned', { points: rewardScore }));
  }
  if (rewardCash > 0) {
    savings += rewardCash;
    try { localStorage.setItem(SAVINGS_KEY, String(savings)); } catch (_) {}
    spawnEffect('combo', player.x, player.y - 42, t('effects.cashEarned', { cash: rewardCash }));
  }

  ropes.length = 0;
  boxes.length = 0;

  const resumeCameraX = bossState && Number.isFinite(bossState.savedCameraX) ? bossState.savedCameraX : camera.x;
  camera.x = resumeCameraX;
  const anchorX = camera.x + SCREEN_TARGET_X;
  const anchorY = CONFIG.ceilingY;
  const L = 240;
  const stableRope = new Rope({
    anchorX,
    anchorY,
    L,
    A: deg2rad(3),
    omega: Math.sqrt(CONFIG.gravity / L) * 0.4,
    phi: 0,
    createdAt: simTime,
    id: `boss_return_${Date.now()}`,
  });
  ropes.push(stableRope);
  const tip = stableRope.tip(simTime);
  player.rope = null;
  player.mode = 'free';
  player.x = tip.x;
  player.y = tip.y - 260;
  player.vx = 0;
  player.vy = 260;
  catchLockUntil = simTime + 0.2;

  if (typeof flushPlayerStats === 'function') flushPlayerStats();
  State.current = 'run';
  ensureRopesBuffered();
  bossState = null;
}

resetStageState();

// Simple particle system for catch effects
const particles = [];
function spawnEffect(kind, x, y, text = '') {
  if (kind === 'combo') {
    particles.push({
      x, y,
      vx: randRange(-30, 30),
      vy: -120,
      life: 0,
      ttl: 1.1,
      size: 14,
      color: '#fffa75',
      type: 'text',
      text: text,
    });
    return;
  }
  if (kind === 'robotBreak') {
    const shardColors = ['#b37a37', '#8c5523'];
    for (let i = 0; i < 24; i++) {
      const ang = -Math.PI + Math.random() * Math.PI;
      const spd = 1.5 * (0.6 + Math.random() * 1.2) * 120;
      particles.push({
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 0,
        ttl: 0.7 + Math.random() * 0.5,
        size: 2.4 * (0.7 + Math.random()*0.6),
        color: shardColors[i % shardColors.length],
        type: 'shard',
      });
    }
    for (let i = 0; i < 22; i++) {
      const ang = -Math.PI + Math.random() * Math.PI;
      const spd = 0.4 * (0.5 + Math.random() * 1.0) * 120;
      particles.push({
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 0,
        ttl: 1.2 + Math.random() * 0.8,
        size: 1.4 * (0.7 + Math.random()*0.8),
        color: '#d8b26a',
        type: 'sparkle',
        twinkleFreq: 5 + Math.random() * 5,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }
    return;
  }
  // Dedicated break effect: lingering sparkles + shards
  if (kind === 'break') {
    // Shards: quick bright burst upwards
    const shardColors = ['#ffffff', '#a6e3ff'];
    for (let i = 0; i < 28; i++) {
      const ang = -Math.PI + Math.random() * Math.PI; // upper half
      const spd = 1.6 * (0.6 + Math.random() * 1.3) * 120;
      particles.push({
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 0,
        ttl: 0.7 + Math.random() * 0.6,
        size: 2.2 * (0.8 + Math.random()*0.6),
        color: shardColors[i % shardColors.length],
        type: 'shard',
      });
    }
    // Sparkles: long-lived, twinkling, additive blending
    for (let i = 0; i < 26; i++) {
      const ang = -Math.PI + Math.random() * Math.PI;
      const spd = 0.55 * (0.5 + Math.random() * 1.0) * 120;
      particles.push({
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 0,
        ttl: 1.4 + Math.random() * 0.9,
        size: 1.2 * (0.7 + Math.random()*0.8),
        color: '#bde3ff',
        type: 'sparkle',
        twinkleFreq: 6 + Math.random() * 6,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }
    return;
  }
  if (kind === 'snap') {
    // Rope snap: quick small shards around tip
    const shardColors = ['#ffffff'];
    for (let i = 0; i < 16; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 1.2 * (0.6 + Math.random() * 1.0) * 100;
      particles.push({
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 0,
        ttl: 0.5 + Math.random() * 0.4,
        size: 1.6 * (0.8 + Math.random()*0.6),
        color: shardColors[0],
        type: 'shard',
      });
    }
    return;
  }

  // Default catch effects
  let count = 0, base = 0, colors = [], sizeBase = 1.0;
  if (kind === 'big') {
    count = 42; base = 2.2; sizeBase = 3.0;
    colors = ['#fffa75', '#ff69b4', '#7cf6ff', '#ffffff'];
  } else if (kind === 'medium') {
    // Less flashy, single color (red-ish)
    count = 14; base = 1.1; sizeBase = 1.4;
    colors = ['#ff6b6b'];
  } else {
    // Minimal, single color
    count = 8; base = 0.8; sizeBase = 1.0;
    colors = ['#ffe8a6'];
  }
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = base * (0.6 + Math.random() * 1.4) * 120; // px/s
    const color = colors.length > 1 ? colors[i % colors.length] : colors[0];
    particles.push({
      x, y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life: 0,
      ttl: 0.5 + Math.random() * (kind === 'big' ? 0.6 : kind === 'medium' ? 0.3 : 0.25),
      size: sizeBase * (0.8 + Math.random()*0.6),
      color,
      type: 'burst',
    });
  }
}

function pickRouletteOperator() {
  const ops = ['+', '-', 'x'];
  return ops[Math.floor(Math.random() * ops.length)];
}

function pickRouletteValue(op) {
  if (op === 'x') {
    const r = Math.random();
    if (r < 0.03) return 3;
    return (r < 0.515) ? 1 : 2;
  }
  return Math.floor(Math.random() * 10);
}

function finalizeRouletteSpin() {
  if (!rouletteState || !rouletteState.active) return;
  if (!rouletteState.finalOp) {
    rouletteState.finalOp = pickRouletteOperator();
    rouletteState.finalValue = pickRouletteValue(rouletteState.finalOp);
  }
  rouletteState.displayOp = rouletteState.finalOp;
  rouletteState.displayValue = rouletteState.finalValue;
  rouletteState.spinning = false;
  if (!rouletteState.celebrated) {
    spawnEffect('big', player.x, player.y - 30);
    rouletteState.celebrated = true;
  }
}

function updateRoulette(dt) {
  if (!rouletteState || !rouletteState.active) return;
  if (rouletteState.spinning) {
    rouletteState.spinTimer += dt;
    if (!rouletteState.nextShuffle || rouletteState.spinTimer >= rouletteState.nextShuffle) {
      const op = pickRouletteOperator();
      rouletteState.displayOp = op;
      rouletteState.displayValue = (op === 'x') ? (1 + Math.floor(Math.random() * 3)) : Math.floor(Math.random() * 10);
      rouletteState.nextShuffle = rouletteState.spinTimer + 0.06;
    }
    if (rouletteState.spinTimer >= rouletteState.spinDuration) {
      finalizeRouletteSpin();
    }
  } else if (rouletteState.finalOp != null) {
    rouletteState.displayOp = rouletteState.finalOp;
    rouletteState.displayValue = rouletteState.finalValue;
  }
}
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    // damping
    const damp = (p.type === 'sparkle') ? 1.0 : 2.0;
    p.vx *= (1 - damp * dt);
    p.vy *= (1 - damp * dt);
    if (p.type === 'text') p.vy += 200 * dt; // gravity on text
    // slight upward float for sparkles
    if (p.type === 'sparkle') p.vy -= 10 * dt;
    if (p.life >= p.ttl) particles.splice(i, 1);
  }
}
function drawParticles(g) {
  g.save();
  g.translate(-camera.x, 0);
  // Draw non-additive first
  for (const p of particles) {
    if (p.type === 'sparkle' || p.type === 'text') continue;
    const a = Math.max(0, 1 - p.life / p.ttl);
    g.globalAlpha = a;
    g.fillStyle = p.color;
    g.beginPath();
    g.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    g.fill();
  }
  // Draw text particles
  for (const p of particles) {
    if (p.type !== 'text') continue;
    const a = Math.max(0, 1 - p.life / p.ttl);
    g.globalAlpha = a;
    g.fillStyle = p.color;
    g.font = `${p.size}px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(p.text, p.x, p.y);
  }
  // Additive sparkles with twinkle
  const prevComp = g.globalCompositeOperation;
  g.globalCompositeOperation = 'lighter';
  for (const p of particles) {
    if (p.type !== 'sparkle') continue;
    const baseA = Math.max(0, 1 - p.life / p.ttl);
    const tw = 0.5 + 0.5 * Math.sin((p.twinkleFreq || 8) * p.life + (p.twinklePhase || 0));
    g.globalAlpha = baseA * (0.5 + 0.5 * tw);
    g.fillStyle = p.color;
    g.beginPath();
    g.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    g.fill();
  }
  g.globalCompositeOperation = prevComp;
  g.restore();
  g.globalAlpha = 1;
}


function drawPixelSprite(g, cx, cy, sprite, scale = 4, align = 'center') {
  if (!sprite || !sprite.pixels || !sprite.palette) return;
  const rows = sprite.pixels.length;
  if (rows === 0) return;
  const cols = sprite.pixels[0].length;
  let originX = cx - (cols * scale) / 2;
  if (align === 'right') originX = cx - cols * scale;
  else if (align === 'left') originX = cx;
  let originY = cy - (rows * scale) / 2;
  for (let r = 0; r < rows; r++) {
    const row = sprite.pixels[r];
    for (let c = 0; c < cols; c++) {
      const key = row[c];
      const color = sprite.palette[key];
      if (!color) continue;
      g.fillStyle = color;
      g.fillRect(originX + c * scale, originY + r * scale, scale, scale);
    }
  }
}


function spawnInitialRope() {
  // Create a rope whose tip passes through player's screenX at t=0 (attached start)
  const speedMultiplier = fastModeEnabled ? 1.5 : 1.0;
  const A = deg2rad(CONFIG.AmaxDeg);
  let L = 180;
  const kOmega = CONFIG.kOmegaMax; // Use max speed factor
  const anchorY = CONFIG.ceilingY;
  L = Math.max(CONFIG.Lmin, Math.min(CONFIG.Lmax, L));
  const omega = Math.sqrt(CONFIG.gravity / L) * kOmega * speedMultiplier;
  const t = simTime;
  // choose theta0 near 0 (bottom) for a calm start
  const theta0 = -A; // Start at the peak for maximum initial swing
  const phi = Math.acos(Math.max(-1, Math.min(1, theta0 / A))) - omega * t;
  const desiredX = camera.x + SCREEN_TARGET_X;
  const anchorX = desiredX - L * Math.sin(theta0);
  const r = new Rope({ anchorX, anchorY, L, A, omega, phi, createdAt: simTime, id: `r${nextRopeId++}`, countsForStage: true });
  ropes.push(r);
  registerMainRopeSpawn(anchorX);
  player.rope = r;
  player.mode = 'attached';
  // Place player at tip now
  const tip = r.tip(simTime);
  player.x = tip.x;
  player.y = tip.y;
  player.vy = tip.vy;
  onPlayerAttached();
}

function planNextRope() {
  // Plan next rope within screen so that a jump now with vx, vy0 reaches the tip around t_hit
  const speedMultiplier = fastModeEnabled ? 1.5 : 1.0;
  const currentTip = player.rope ? player.rope.tip(simTime) : { x: player.x, y: player.y };
  const x0 = currentTip.x;
  const y0 = currentTip.y;
  const s = lv1Scale(exp);
  const anchorBaseY = CONFIG.ceilingY;
  // estimate velocities after detach
  const vxEst = (player.mode === 'free') ? Math.max(CONFIG.minVx, Math.min(CONFIG.maxVx, player.vx)) : ((CONFIG.baseVx + 40) * speedMultiplier);
  const vy0 = -CONFIG.jumpImpulse * 0.9; // rough estimate for planning

  // Try multiple candidates for robust reachability
  // Use the last NORMAL rope (ignore any web rope) as the spacing base
  let prev = null;
  for (let i = ropes.length - 1; i >= 0; i--) {
    if (!ropes[i].isWebRope) { prev = ropes[i]; break; }
  }

  const groundY = CONFIG.height - CONFIG.groundH;
  for (let tries = 0; tries < 60; tries++) {
    const lowVariant = Math.random() < CONFIG.lowRopeChance;
    const dropPx = lowVariant ? randRange(CONFIG.lowRopeAnchorDropMinPx, CONFIG.lowRopeAnchorDropMaxPx) : 0;
    const anchorYBase = anchorBaseY + dropPx;
    const LminVariant = CONFIG.Lmin * s;
    let LmaxVariant = CONFIG.Lmax * s;
    if (lowVariant) {
      const clearanceLimit = groundY - CONFIG.lowRopeFloorClearance - anchorYBase;
      if (clearanceLimit < LminVariant) continue;
      LmaxVariant = Math.min(LmaxVariant, clearanceLimit);
    }
    if (LmaxVariant < LminVariant) continue;

    // Decide if this candidate should be a short rope; tie spacing accordingly
    const shortPick = Math.random() < CONFIG.shortLChance;
    // Mix short and normal spacings (force short spacing when short rope is picked)
    const useShort = shortPick || (Math.random() < CONFIG.DshortProb);
    let D = useShort ? randRange(CONFIG.DshortMin * s, CONFIG.Dmin * s) : randRange(CONFIG.Dmin * s, CONFIG.Dmax * s);
    D *= randRange(CONFIG.spacingJitterMin, CONFIG.spacingJitterMax);
    if (demoActive) D *= 0.7; // Demo mode spacing reduction
    const baseX = prev ? prev.anchorX : x0;
    // Prefer spawning near the right edge with inward jitter
    const desiredEdgeX = camera.x + (CONFIG.maxAnchorX * s) - randRange(8, CONFIG.edgeSpawnJitter * s);
    let anchorX;
    if (useShort && shortPick) {
      // For short ropes, keep spacing tight and avoid forcing to the edge
      anchorX = baseX + D;
      if (anchorX > desiredEdgeX - 6) anchorX = desiredEdgeX - 6; // keep slight margin from edge
    } else {
      // For normal ropes, ensure it appears near the right edge
      anchorX = Math.max(baseX + D, desiredEdgeX);
    }
    // Ensure minimum gap from previous rope if exists
    if (prev) {
      const minGap = useShort ? CONFIG.DshortMin * 0.9 : CONFIG.Dmin * 0.7;
      if (anchorX - prev.anchorX < minGap) {
        continue;
      }
    }
    const A = deg2rad(randRange(CONFIG.AminDeg, CONFIG.AmaxDeg));
    let L = randRange(LminVariant, LmaxVariant);
    const kOmega = randRange(CONFIG.kOmegaMin, CONFIG.kOmegaMax);

    // choose target swing angle near bottom, but allow wider variety
    const theta_hit = randRange(-A * 0.75, A * 0.75);
    const sinTheta = Math.sin(theta_hit);
    const cosTheta = Math.cos(theta_hit);
    const tipX = anchorX + L * sinTheta;
    // t to reach that x with vx
    const t_hit = (tipX - x0) / vxEst;
    if (t_hit < 0.50 || t_hit > 1.10) continue;

    // y alignment: choose L so that tipY close to projectile y
    const yProj = y0 + vy0 * t_hit + 0.5 * CONFIG.gravity * t_hit * t_hit;
    if (Math.abs(cosTheta) > 1e-6) {
      let L_target = (yProj - anchorYBase) / cosTheta;
      if (isFinite(L_target)) {
        // Add ±length jitter to avoid uniformity
        let L_jitter = L_target * (1 + randRange(-CONFIG.lengthJitterPct, CONFIG.lengthJitterPct));
        if (shortPick) L_jitter *= CONFIG.shortLFactor; // deterministically short when picked
        else if (Math.random() < CONFIG.longLChance) L_jitter *= CONFIG.longLFactor;
        L = Math.max(LminVariant, Math.min(LmaxVariant, L_jitter));
      }
    }
    if (lowVariant) {
      L = Math.min(L, LmaxVariant);
    }
    const omega2 = Math.sqrt(CONFIG.gravity / L) * kOmega * speedMultiplier;
    const anchorY = anchorYBase;
    const tipX2 = anchorX + L * sinTheta;
    const yTip2 = anchorY + L * cosTheta;
    const dy = Math.abs(yTip2 - yProj);
    const phi = Math.acos(Math.max(-1, Math.min(1, theta_hit / A))) - omega2 * (simTime + t_hit);

    // Accept if vertical error within catch window
    const vtipApprox = L * omega2 * A; // rough
    const catchR = CONFIG.catchBase + Math.min(CONFIG.catchBonusMax, vtipApprox * CONFIG.catchVelScale);
    if (Math.abs(tipX2 - (x0 + vxEst * t_hit)) < 8 && dy <= catchR * 0.95) {
      return new Rope({ anchorX, anchorY, L, A, omega: omega2, phi, createdAt: simTime, id: `r${nextRopeId++}`, countsForStage: !starModeActive });
    }
  }
  // Fallback: place a moderate rope slightly to the right; catch will rely on generous radius
  const lowVariant = Math.random() < CONFIG.lowRopeChance;
  const dropPx = lowVariant ? randRange(CONFIG.lowRopeAnchorDropMinPx, CONFIG.lowRopeAnchorDropMaxPx) : 0;
  const A = deg2rad(randRange(8, 16));
  let L = Math.min(CONFIG.Lmax * s, Math.max(CONFIG.Lmin * s, 180 * randRange(0.9, 1.1) * s));
  if (Math.random() < CONFIG.shortLChance) {
    L = Math.max(CONFIG.Lmin * s, L * CONFIG.shortLFactor);
  } else if (Math.random() < CONFIG.longLChance) {
    L = Math.min(CONFIG.Lmax * s, L * CONFIG.longLFactor);
  }
  const kOmega = 1.0;
  const theta_hit = 0;
  const t_hit = 0.8;
  const desiredEdgeX2 = camera.x + (CONFIG.maxAnchorX * s) - randRange(8, CONFIG.edgeSpawnJitter * s);
  let anchorX = Math.max((prev ? prev.anchorX + CONFIG.Dmin * s : x0 + CONFIG.Dmin * s), desiredEdgeX2);
  let anchorY = anchorBaseY + dropPx;
  if (lowVariant) {
    const clearanceLimit = groundY - CONFIG.lowRopeFloorClearance - anchorY;
    if (clearanceLimit >= CONFIG.Lmin * s) {
      L = Math.min(L, clearanceLimit);
    } else {
      anchorY = anchorBaseY;
    }
  }
  const omega = Math.sqrt(CONFIG.gravity / L) * kOmega * speedMultiplier;
  const phi = Math.acos(Math.max(-1, Math.min(1, (theta_hit || 1e-6) / A))) - omega * (simTime + t_hit);
  return new Rope({ anchorX, anchorY, L, A, omega, phi, createdAt: simTime, id: `r${nextRopeId++}`, countsForStage: !starModeActive });
}

function ensureRopesBuffered() {
  const s = lv1Scale(exp);
  // Spawn only when the farthest NORMAL rope is behind the target edge position
  const targetEdgeX = camera.x + (CONFIG.maxAnchorX * s) - 8;
  const fillUntil = targetEdgeX;
  const luckyLevel = shopInv.luckyLevel || 0;
  const itemSpawnChance = Math.min(1, CONFIG.itemSpawnProb + luckyLevel * LUCKY_BONUS_PER_LEVEL);
  const tailorActive = characterIs('tailor');
  let spawnCount = 0;
  while (true) {
    let prev = null;
    for (let i = ropes.length - 1; i >= 0; i--) {
      if (!ropes[i].isWebRope) { prev = ropes[i]; break; }
    }
    const farthestX = prev ? prev.anchorX : -Infinity;
    if (farthestX >= fillUntil) break;
    const r = planNextRope();

    let midRope = null;
    if (prev && tailorActive && Math.random() < TAILOR_EXTRA_ROPE_CHANCE) {
      // Tailor ability: stitch a midway rope between anchors at mid height with matched swing profile
      const midAnchorX = prev.anchorX + (r.anchorX - prev.anchorX) * 0.5;
      const groundY = CONFIG.height - CONFIG.groundH;
      const anchorY = CONFIG.ceilingY + 0.5 * (groundY - CONFIG.ceilingY);
      const maxTipY = groundY - 150;
      const maxLengthFromAnchor = Math.max(0, maxTipY - anchorY);
      if (maxLengthFromAnchor > 0) {
        let desiredL = r.L * 0.7;
        desiredL = Math.min(desiredL, maxLengthFromAnchor);
        if (desiredL >= CONFIG.Lmin) {
          const A = r.A;
          const baseKOmega = r.omega / Math.sqrt(CONFIG.gravity / r.L);
          const L = desiredL;
          const omega = Math.sqrt(CONFIG.gravity / L) * baseKOmega;
          let phi = r.phi;
          if (A > 0 && omega > 0) {
            const timeNow = simTime;
            const basePhase = r.omega * timeNow + r.phi;
            const baseTheta = r.A * Math.cos(basePhase);
            const baseDTheta = -r.A * r.omega * Math.sin(basePhase);
            let cosVal = A !== 0 ? (baseTheta / A) : 1;
            let sinVal = -baseDTheta / (A * omega);
            if (!isFinite(cosVal)) cosVal = 1;
            if (!isFinite(sinVal)) sinVal = 0;
            const mag = Math.hypot(cosVal, sinVal);
            if (mag > 1e-6) {
              cosVal /= mag;
              sinVal /= mag;
            }
            phi = Math.atan2(sinVal, cosVal) - omega * timeNow;
          }
          midRope = new Rope({
            anchorX: midAnchorX,
            anchorY,
            L,
            A,
            omega,
            phi,
            createdAt: simTime,
            tailorBonus: 1,
            id: `r${nextRopeId++}`,
            countsForStage: !starModeActive,
          });
        }
      }
    }

    if (pendingStageGate && !pendingStageGate.rewarded) {
      const stageIndex = pendingStageGate.stage;
      if (midRope) {
        midRope.stageGateStage = stageIndex;
        midRope.stageGateRewarded = false;
      }
      if (r) {
        r.stageGateStage = stageIndex;
        r.stageGateRewarded = false;
      }
    }
 
    if (midRope) ropes.push(midRope);
    ropes.push(r);
    if (r.countsForStage !== false) registerMainRopeSpawn(r.anchorX, prev ? prev.anchorX : undefined);
    ropesBufferedThisStep = true;
    // Maybe spawn a box between prev and new rope if eligible
    if (!starModeActive && prev && exp >= 50 && Math.random() < itemSpawnChance) {
      const midX = prev.anchorX + (r.anchorX - prev.anchorX) * 0.5;
      // Place much higher, with vertical randomness
      const minY = CONFIG.ceilingY + 60;
      const maxY = Math.min(CONFIG.height * 0.38, (CONFIG.height - CONFIG.groundH) - 140);
      const by = randRange(minY, maxY);
      // Star 60%, others 10% each
      // JACK:확률계산
      let kind;
      const rand = Math.random();
      if (rand < 0.2) {
        kind = 'star';
      } else if (rand < 0.4) {
        kind = 'roulette';
      } else if (rand < 0.6) {
        kind = 'slow';
      } else if (rand < 0.8) {
        kind = 'wideCatch';
      } else {
        kind = 'bigSize';
      }
      boxes.push({ x: midX, y: by, kind, active: true, phase: Math.random() * Math.PI * 2 });
    }
    spawnCount++;
    if (spawnCount >= 10) break; // safety cap
  }
}

function cleanupRopes() {
  // Remove ropes far behind the camera and not attached
  while (ropes.length > 0) {
    const r0 = ropes[0];
    if (r0 === player.rope) break;
    if (r0.anchorX < camera.x - 200) ropes.shift(); else break;
  }
  // Cleanup boxes behind camera
  for (let i = boxes.length - 1; i >= 0; i--) {
    if (boxes[i].x < camera.x - 60 || boxes[i].active === false) {
      boxes.splice(i, 1);
    }
  }
}

function resetRun() {
  if (IS_NATIVE_APP) {
    if (typeof ensureDailyState === 'function') ensureDailyState();
    if (nativeLivesRemaining() <= 0) {
      lifeSpentThisRun = false;
      triggerLifeAd(true);
      return;
    }
    // clear status for a fresh run
    lifeAdStatus = 'idle';
    lifeAdMessage = null;
    lifeAdAutoStart = false;
  }
  lifeSpentThisRun = false;
  // Clear all UI buttons when resetting
  uiButtons.gameover = [];
  uiButtons.shop.cards = [];
  uiButtons.shop.buttons = [];
  gameOverMenuButtons = [];
  gameOverMenuMessage = null;
  gameOverMenuMessageTimer = 0;
  bossOutcomeBanner = null;
  bossOutcomeTimer = 0;
  if (typeof gameOverTipKey !== 'undefined') gameOverTipKey = null;
  showGuide = false;
  tutorialButtonRect = null;
  tutorialStepIndex = 0;
  tutorialStepTimer = 0;
  rouletteState = null;
  rouletteSummary = null;
  powerCharge = 0;
  powerChargeActive = false;
  powerChargeAvailable = true;
  powerChargeFirstJumpPending = true;

  resetStageState();

  player.reset();
  score = 0;
  comboCount = 0;
  State.current = 'run';
  simTime = 0;
  camera.x = 0;
  ropes.length = 0;
  boxes.length = 0;
  stageBullets = [];
  stageBulletTimer = 0;
  activeBudsCount = shopInv.budsLevel || 0; // Reset buds count from shop level
  // Ensure fever state is cleared on fresh run
  starModeActive = false;
  starModeEndTime = 0;
  const consumableResult = applyRunConsumables(shopInv);
  shopInv = consumableResult.shopInv;
  activeRevivalCharges = consumableResult.activeRevivalCharges;
  hudConsumables = consumableResult.hudConsumables || [];
  stageGateCashBonusThisRun = 0;
  stageGateExpBonusThisRun = 0;
  spawnInitialRope();
  ensureRopesBuffered();
  airJumpsLeft = 0;
  usedAirJumps = 0;
  particles.length = 0; // clear lingering effects on restart
  lastEarned = 0;
  lastExpEarned = 0;
  pendingExtraJump = false;
  pendingCatchR = 0;
  pendingSizeScale = 0;
  lastDemoLoss = false;
  gameOverLevelUp = null;
  levelUpPopupTimer = 0;
  usedFlyThisRun = false;
  robotReviveUsed = false;
  pirateBonusThisRun = 0;
  baseScoreForRewards = 0;
  wizardFloatTimer = 0;
  wizardSpinTimer = 0;
  wizardSpinRate = 0;
  tailorCashBonusThisRun = 0;

  if (typeof SkillSystem !== 'undefined' && SkillSystem && typeof SkillSystem.resetRunState === 'function') {
    SkillSystem.resetRunState();
    SkillSystem.queueSelection('start');
  }
}

function drawBackground(g) {
  const groundY = CONFIG.height - CONFIG.groundH;

  g.fillStyle = stageColorPrev;
  g.fillRect(0, 0, CONFIG.width, groundY);

  if (stageTransitionActive) {
    const boundaryScreen = transitionAnchorX - camera.x;
    const rectStart = Math.min(CONFIG.width, Math.max(boundaryScreen, 0));
    const maxWidth = Math.max(0, CONFIG.width - rectStart);
    const rectWidth = maxWidth;
    if (rectWidth > 0) {
      g.fillStyle = stageColorNext;
      g.fillRect(rectStart, 0, rectWidth, groundY);
    }
  } else {
    g.fillStyle = stageColorNext;
    g.fillRect(0, 0, CONFIG.width, groundY);
  }

  if (stageTransitionActive || stageBannerTimer > 0) {
    const bannerWorldX = transitionAnchorX;
    const screenBannerX = bannerWorldX - camera.x;
    if (screenBannerX >= -24 && screenBannerX <= CONFIG.width + 24) {
      const alpha = stageTransitionActive ? 1 : Math.min(1, stageBannerTimer / STAGE_BANNER_DURATION);
      g.save();
      g.translate(screenBannerX, groundY * 0.35);
      g.rotate(-Math.PI / 2);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `18px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
      const bannerText = t('stage.banner', { stage: stageBannerStage });
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.fillText(bannerText, 2, 2);
      g.globalAlpha = alpha;
      g.fillStyle = '#ffffff';
      g.fillText(bannerText, 0, 0);
      g.restore();
      g.globalAlpha = 1;
    }
  }

  g.strokeStyle = 'rgba(255,255,255,0.05)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(0, groundY + 0.5);
  g.lineTo(CONFIG.width, groundY + 0.5);
  g.stroke();

  g.fillStyle = '#1c2a3a';
  g.fillRect(0, groundY, CONFIG.width, CONFIG.groundH);
}

function drawCenteredText(g, text, y, size = 18, color = '#fff') {
  g.fillStyle = color;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `${size}px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
  g.fillText(text, CONFIG.width / 2, y);
}

let showGuide = false;
let showSettings = false;
let showRecords = false;
let recordsView = 'menu';
let recordsMenuOptionRects = [];
let recordsCardRects = [];
let recordsFilterButtons = [];
let recordsBackButtonRect = null;
let recordsGoalClaimButtons = [];
let recordsPaginationButtons = [];
let recordsPopupRect = null;
let recordsHistoryPage = 0;
let recordsHistoryTotalPages = 1;
let recordsGoalsPage = 0;
let recordsGoalsTotalPages = 1;
let recordsGoalFilter = 'all';
let settingsPopupRect = null;
let settingsOptionRects = [];
let settingsFocusedIndex = 0;
const TUTORIAL_ENABLED_KEY = 'webswing_tutorial_enabled';

function loadTutorialPreference() {
  try {
    const stored = localStorage.getItem(TUTORIAL_ENABLED_KEY);
    if (stored === '1') return { value: true, stored: true };
    if (stored === '0') return { value: false, stored: true };
  } catch (_) {}
  return { value: false, stored: false };
}

const tutorialPref = loadTutorialPreference();
let tutorialEnabled = tutorialPref.value;
let tutorialPreferenceStored = tutorialPref.stored;
let tutorialButtonRect = null;
let tutorialStepIndex = 0;
let tutorialStepTimer = 0;

function footerButtonRects() {
  const w = 92, h = 24;
  const spacing = 12;
  const totalWidth = w * 2 + spacing;
  const groundY = CONFIG.height - CONFIG.groundH;
  const baseX = (CONFIG.width - totalWidth) / 2;
  const y = Math.floor(groundY + (CONFIG.groundH - h) / 2);
  return {
    guide: { x: baseX, y, w, h },
    settings: { x: baseX + w + spacing, y, w, h }
  };
}
function pointInRect(px, py, r) { return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h; }

function persistTutorialPreference(flag) {
  try { localStorage.setItem(TUTORIAL_ENABLED_KEY, flag ? '1' : '0'); } catch (_) {}
}

function setTutorialEnabled(flag, persist = true) {
  const next = !!flag;
  tutorialEnabled = next;
  tutorialStepIndex = 0;
  tutorialStepTimer = 0;
  if (persist) {
    persistTutorialPreference(next);
    tutorialPreferenceStored = true;
  }
}

function hasTutorialPreference() {
  return tutorialPreferenceStored;
}

function updateIntro(dt) {
  updateStageTransition(dt);
  tutorialButtonRect = null;
  if (introMenuMessageTimer > 0) {
    introMenuMessageTimer = Math.max(0, introMenuMessageTimer - dt);
    if (introMenuMessageTimer <= 0) introMenuMessage = null;
  }
  const lvl = getLevelByExp(exp);
  if (introMenuButtons && introMenuButtons.length) {
    for (const button of introMenuButtons) {
      if (!button || !button.meta || typeof button.meta.requiredLevel !== 'number') continue;
      const shouldDisable = lvl < button.meta.requiredLevel;
      button.disabled = shouldDisable;
    }
  }
  // Debounce to ensure we show intro at least a moment after transitions
  if (simTime < inputLockUntil) { UI.reset && UI.reset(); return; }
  
  // Build buttons if not exist
  if (uiButtons.intro.length === 0) {
    buildIntroButtons();
  }

  if (showRecords) {
    if (UI.keyPressed === 'Escape') {
      if (recordsView !== 'menu') recordsView = 'menu';
      else showRecords = false;
      UI.reset();
      return;
    }
    if (UI.clicked) {
      const { mx, my } = UI;
      let handled = false;
      if (recordsView === 'menu') {
        for (const entry of recordsMenuOptionRects) {
          if (entry && entry.rect && pointInRect(mx, my, entry.rect)) {
            if (entry.view === 'history' || entry.view === 'goals') {
              recordsView = entry.view;
              recordsHistoryPage = 0;
              recordsGoalsPage = 0;
              handled = true;
            }
            break;
          }
        }
        if (!handled && recordsPopupRect && !pointInRect(mx, my, recordsPopupRect)) {
          showRecords = false;
          handled = true;
        }
      } else {
        if (recordsBackButtonRect && pointInRect(mx, my, recordsBackButtonRect)) {
          if (recordsView === 'menu') showRecords = false;
          else recordsView = 'menu';
          handled = true;
        }
        if (!handled && recordsView === 'goals') {
          for (const btn of recordsFilterButtons) {
            if (btn && btn.rect && pointInRect(mx, my, btn.rect)) {
              if (btn.filter !== recordsGoalFilter) {
                recordsGoalFilter = btn.filter;
                recordsGoalsPage = 0;
              }
              handled = true;
              break;
            }
          }
          if (!handled) {
            for (const btn of recordsGoalClaimButtons) {
              if (btn && btn.rect && pointInRect(mx, my, btn.rect)) {
                if (claimRecordGoal(btn.goalId)) {
                  recordsGoalsPage = Math.min(recordsGoalsPage, Math.max(0, recordsGoalsTotalPages - 1));
                }
                handled = true;
                break;
              }
            }
          }
        }
        if (!handled) {
          for (const btn of recordsPaginationButtons) {
            if (btn && btn.rect && pointInRect(mx, my, btn.rect)) {
              if (btn.view === 'history') {
                recordsHistoryPage = Math.max(0, Math.min(recordsHistoryTotalPages - 1, recordsHistoryPage + btn.dir));
              } else if (btn.view === 'goals') {
                recordsGoalsPage = Math.max(0, Math.min(recordsGoalsTotalPages - 1, recordsGoalsPage + btn.dir));
              }
              handled = true;
              break;
            }
          }
        }
      }
      if (!handled) {
        if (!recordsPopupRect || !pointInRect(mx, my, recordsPopupRect)) {
          showRecords = false;
        }
      }
      UI.reset();
    }
    return;
  }

  if (showGuide) {
    if (UI.clicked) {
      showGuide = false;
      UI.reset();
      return;
    }
    if (UI.keyPressed === 'Escape' || UI.keyPressed === 'Space') {
      showGuide = false;
      UI.reset();
    }
    return;
  }

  if (showSettings) {
    const langs = I18N_API ? I18N_API.getAvailableLanguages() : ['en'];
    if (UI.keyPressed === 'Escape') {
      showSettings = false;
      UI.reset();
      return;
    }
    if ((UI.keyPressed === 'Space' || UI.keyPressed === 'Enter') && langs[settingsFocusedIndex]) {
      if (I18N_API) I18N_API.setLanguage(langs[settingsFocusedIndex]);
      showSettings = false;
      UI.reset();
      return;
    }
    if (UI.keyPressed === 'ArrowDown') {
      settingsFocusedIndex = Math.min(langs.length - 1, settingsFocusedIndex + 1);
      UI.reset();
    } else if (UI.keyPressed === 'ArrowUp') {
      settingsFocusedIndex = Math.max(0, settingsFocusedIndex - 1);
      UI.reset();
    }
    if (UI.clicked) {
      if (settingsPopupRect && pointInRect(UI.mx, UI.my, settingsPopupRect)) {
        for (let i = 0; i < settingsOptionRects.length; i++) {
          const rect = settingsOptionRects[i];
          if (rect && pointInRect(UI.mx, UI.my, rect)) {
            if (I18N_API) I18N_API.setLanguage(langs[i]);
            showSettings = false;
            break;
          }
        }
      } else {
        showSettings = false;
      }
      UI.reset();
    }
    return;
  }
  
  // Check button clicks
  if (UI.clicked) {
    for (const button of uiButtons.intro) {
      if (button.isClicked(UI.mx, UI.my)) {
        button.onClick();
        UI.reset();
        return;
      }
    }
    
    // If no button clicked, start game
    UI.reset();
    resetRun();
    return;
  }
  
  // Start game on space
  if (UI.keyPressed === 'Space') {
    UI.reset();
    resetRun();
    return;
  }
}

function tutorialSteps() {
  const raw = t('guide.tutorial.steps');
  if (!raw) return [];
  return String(raw).split(/\n\s*\n/);
}

if (typeof globalThis !== 'undefined') {
  globalThis.setTutorialEnabled = setTutorialEnabled;
  globalThis.getTutorialEnabled = () => tutorialEnabled;
  globalThis.hasTutorialPreference = hasTutorialPreference;
}
