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


// Simple input manager
const Input = {
  down: false,
  justPressed: false,
  anyPressed() {
    return this.justPressed;
  },
  endFrame() {
    this.justPressed = false;
  },
};

function onPress(e) {
  if (isFromDebug(e)) return; // ignore debug panel interactions
  e && e.preventDefault && e.preventDefault();
  // record pointer position for UI (intro)
  if (e && (e.clientX !== undefined || (e.touches && e.touches.length))) {
    const rect = canvas.getBoundingClientRect();
    const isTouch = e.touches && e.touches.length > 0;
    const cx = e.clientX !== undefined ? e.clientX : e.touches[0].clientX;
    const cy = e.clientY !== undefined ? e.clientY : e.touches[0].clientY;
    UI.mx = (cx - rect.left) * (CONFIG.width / rect.width);
    UI.my = (cy - rect.top) * (CONFIG.height / rect.height);
    
    // 터치 시작 위치 디버깅
    if (DEBUG && isTouch) console.log(`Touch start at: ${UI.mx.toFixed(0)}, ${UI.my.toFixed(0)} State: ${State.current}`);
    // Don't set UI.clicked on mousedown, wait for mouseup
    
    // Help popup drag disabled (no scroll)
  }
  if (!Input.down) {
    Input.down = true;
    Input.justPressed = true;
  }
}
function onRelease(e) {
  Input.down = false;
  
  // 모든 상태에서 위치 기록
  if (e && (e.clientX !== undefined || (e.changedTouches && e.changedTouches.length > 0))) {
    const rect = canvas.getBoundingClientRect();
    const isTouch = e.changedTouches && e.changedTouches.length > 0;
    
    if (e.clientX !== undefined) {
      // 마우스 이벤트
      UI.mx = (e.clientX - rect.left) * (CONFIG.width / rect.width);
      UI.my = (e.clientY - rect.top) * (CONFIG.height / rect.height);
    } else if (isTouch) {
      // 터치 이벤트
      const touch = e.changedTouches[0];
      UI.mx = (touch.clientX - rect.left) * (CONFIG.width / rect.width);
      UI.my = (touch.clientY - rect.top) * (CONFIG.height / rect.height);
      // 터치 이벤트 디버깅
      console.log(`Touch release at: ${UI.mx.toFixed(0)}, ${UI.my.toFixed(0)} State: ${State.current}`);
    }
    
    // Handle click on release for all states
    // 모바일에서도 클릭 및 버튼 터치가 잘 동작하도록 개선
    if (State.current === 'shop') {
      // Only trigger click if not dragging
      if (!shopDrag.hasMoved || shopConfirm) {
        UI.clicked = true;
        UI.justReleased = true;
      } else if (shopHelp && !helpDrag.hasMoved) {
        // For help popup, only trigger click if not dragging
        UI.clicked = true;
        UI.justReleased = true;
      }
    } else {
      // For other states, always set clicked on release
      UI.clicked = true;
      UI.justReleased = true;
    }
  } else {
    // 이벤트 정보가 없는 경우도 클릭 설정 (키보드 스페이스 등)
    UI.clicked = true;
    UI.justReleased = true;
  }
  
  // Reset drag states
  if (shopDrag.active) {
    shopDrag.active = false;
    shopDrag.hasMoved = false;
  }
  // Don't reset helpDrag.hasMoved here, we need it for the click check
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar') {
    if (isFromDebug(e)) return; // do not trigger game press from debug inputs
    onPress(e);
  }
});
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyV') {
    DEBUG = !DEBUG;
    const el = document.getElementById('debug-panel');
    if (el) el.hidden = !DEBUG;
  }
});
window.addEventListener('keydown', (e) => {
  if (isFromDebug(e)) return; // ignore UI key capture while editing debug
  if (e.code === 'Space') UI.keyPressed = 'Space';
  else if (e.code === 'Escape') UI.keyPressed = 'Escape';
  else if (e.code === 'ArrowDown') UI.keyPressed = 'ArrowDown';
  else if (e.code === 'ArrowUp') UI.keyPressed = 'ArrowUp';
  else if (e.code === 'Enter') UI.keyPressed = 'Enter';
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar' ) onRelease();
});
window.addEventListener('mousedown', onPress);
window.addEventListener('mouseup', (e) => onRelease(e));
window.addEventListener('touchstart', onPress, { passive: false });
window.addEventListener('touchend', (e) => {
  // 게임 캔버스에서만 preventDefault 호출
  const rect = canvas.getBoundingClientRect();
  if (e.changedTouches && e.changedTouches.length > 0) {
    const touch = e.changedTouches[0];
    const x = touch.clientX;
    const y = touch.clientY;
    // 캔버스 범위 내에서만 preventDefault
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      e.preventDefault();
    }
  }
  onRelease(e);
}, { passive: false });

// Mouse wheel support for shop scrolling
window.addEventListener('wheel', (e) => {
  if (State.current === 'shop') {
    e.preventDefault();
    // Disable all scrolling in shop (items and chars)
    return;
  }
}, { passive: false });

// Mouse move tracking for drag scroll
let lastMouseY = 0;
let helpDrag = { active: false, y0: 0, scroll0: 0, hasMoved: false, startY: 0 };
window.addEventListener('mousemove', (e) => {
  UI.mx = e.clientX;
  UI.my = e.clientY;
  lastMouseY = e.clientY;
  
  // Help popup drag disabled (no scroll)
  if (false) {
    const moveDistance = Math.abs(e.clientY - helpDrag.startY);
    if (moveDistance > 30) {  // Increased threshold to 30 pixels
      helpDrag.hasMoved = true;
    }
    const delta = helpDrag.y0 - e.clientY;
    const newScroll = helpDrag.scroll0 + delta;
    
    // Calculate max scroll based on shop mode
    let maxHelpScroll = 0;
    if (shopMode === 'chars') {
      // Character shop help - 5 characters at 45px each
      const chars = visibleCharacters();
      const charHeight = 45;
      const totalContentHeight = chars.length * charHeight;
      const viewportHeight = 230; // contentH from renderCharacterShop
      maxHelpScroll = Math.max(0, totalContentHeight - viewportHeight);
    } else {
      // Item shop help - calculate based on descriptions
      const lvl = getLevelByExp(exp);
      const visibleItems = getAllItemsSorted();
      const lineHeight = 14;
      const itemHeight = 36;
      const totalContentHeight = visibleItems.length * itemHeight;
      const viewportHeight = 230;
      maxHelpScroll = Math.max(0, totalContentHeight - viewportHeight);
    }
    
    shopHelpScroll = Math.max(0, Math.min(maxHelpScroll, newScroll));
  }
  // Handle shop items drag (only in character shop)
  else if (State.current === 'shop' && shopDrag.active && !shopHelp && !shopConfirm && shopMode === 'chars') {
    // Check if mouse moved enough to be considered a drag (threshold: 5px)
    const moveDistance = Math.abs(e.clientY - shopDrag.y0) + Math.abs(e.clientX - shopDrag.startX);
    if (moveDistance > 30) {  // Increased threshold to 30 pixels
      shopDrag.hasMoved = true;
    }
    
    const delta = shopDrag.y0 - e.clientY;
    shopScroll = shopDrag.scroll0 + delta;
    
    if (shopMode === 'chars') {
      // Character shop scroll limits
      const chars = visibleCharacters();
      const cols = 2;
      const cellH = CHAR_CARD_CELL_H;
      const gap = CHAR_CARD_VERTICAL_GAP;
      const titleY = CONFIG.height * 0.12;
      const top = titleY + 50;
      const rows = Math.ceil(chars.length / cols);
      const contentH = rows * (cellH + gap) - gap;
      const viewportH = CONFIG.height - top - 100;
      const maxScroll = Math.max(0, contentH - viewportH);
      shopScroll = Math.max(0, Math.min(maxScroll, shopScroll));
    } else {
      // Item shop scroll limits
      const { cols, cellW, cellH, marginX, top, paddingTop, paddingBottom } = shopGrid();
      const gap = 8;
      const lvl = getLevelByExp(exp);
      const items = getAllItemsSorted();
      const rows = Math.ceil(items.length / cols) || 1;
      const contentH = paddingTop + rows * (cellH + gap) - gap + paddingBottom;
      const viewportH = CONFIG.height - top - 90;
      const maxScroll = Math.max(0, contentH - viewportH);
      shopScroll = Math.max(0, Math.min(maxScroll, shopScroll));
    }
  }
});

// Touch move for mobile drag scroll
window.addEventListener('touchmove', (e) => {
  if (State.current === 'shop' && shopDrag.active && !shopHelp && !shopConfirm && shopMode === 'chars') {
    const touch = e.touches[0];
    // Check if touch moved enough to be considered a drag
    const moveDistance = Math.abs(touch.clientY - shopDrag.y0) + Math.abs(touch.clientX - shopDrag.startX);
    if (moveDistance > 30) {  // Increased threshold to 30 pixels
      shopDrag.hasMoved = true;
    }
    
    const delta = shopDrag.y0 - touch.clientY;
    shopScroll = shopDrag.scroll0 + delta;
    
    if (shopMode === 'chars') {
      // Character shop scroll limits
      const chars = visibleCharacters();
      const cols = 2;
      const cellH = CHAR_CARD_CELL_H;
      const gap = CHAR_CARD_VERTICAL_GAP;
      const titleY = CONFIG.height * 0.12;
      const top = titleY + 50;
      const rows = Math.ceil(chars.length / cols);
      const contentH = rows * (cellH + gap) - gap;
      const viewportH = CONFIG.height - top - 100;
      const maxScroll = Math.max(0, contentH - viewportH);
      shopScroll = Math.max(0, Math.min(maxScroll, shopScroll));
    } else {
      // Item shop scroll limits
      const { cols, cellW, cellH, marginX, top, paddingTop, paddingBottom } = shopGrid();
      const gap = 8;
      const lvl = getLevelByExp(exp);
      const items = getAllItemsSorted();
      const rows = Math.ceil(items.length / cols) || 1;
      const contentH = paddingTop + rows * (cellH + gap) - gap + paddingBottom;
      const viewportH = CONFIG.height - top - 90;
      const maxScroll = Math.max(0, contentH - viewportH);
      shopScroll = Math.max(0, Math.min(maxScroll, shopScroll));
    }
  }
}, { passive: false });



// Simple game state machine: intro -> run -> gameover -> shop
const State = {
  current: 'intro', // 'intro' | 'run' | 'gameover' | 'shop' | 'boss_pending' | 'boss'
};

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


// Level-up popup state for game over screen
let gameOverLevelUp = null; // { from, to }
let levelUpPopupTimer = 0;

// Shop state
let shopMode = 'items'; // 'items' or 'chars'
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
  const lvl = getLevelByExp(exp);
  
  // Guide button
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
  
  // Shop buttons (if level >= 2)
  if (lvl >= 2) {
    const bw = 100, bh = 36;
    const spacing = 10;
    const totalWidth = bw * 2 + spacing;
    const startX = (CONFIG.width - totalWidth) / 2;
    const by = CONFIG.height * 0.65;
    
    // ITEMS button
    uiButtons.intro.push(new UIButton(startX, by, bw, bh, () => t('common.items'), () => {
      previousState = State.current;
      State.current = 'shop';
      shopMode = 'items';
      shopScroll = 0;
      shopItemPage = 0;
    }, 'intro'));
    
    // CHARS button
    uiButtons.intro.push(new UIButton(startX + bw + spacing, by, bw, bh, () => t('common.chars'), () => {
      previousState = State.current;
      State.current = 'shop';
      shopMode = 'chars';
      shopScroll = 0;
      shopCharPage = 0;
    }, 'intro'));
  }
}

// Build game over buttons
function buildGameOverButtons() {
  uiButtons.gameover = [];
  const lvl = getLevelByExp(exp);
  
  if (lvl >= 2) {
    const bw = 100, bh = 36;
    const spacing = 10;
    const totalWidth = bw * 2 + spacing;
    const startX = (CONFIG.width - totalWidth) / 2;
    const by = CONFIG.height * 0.80;
    
    // ITEMS button
    uiButtons.gameover.push(new UIButton(startX, by, bw, bh, () => t('common.items'), () => {
      previousState = 'gameover';
      State.current = 'shop';
      shopMode = 'items';
      shopScroll = 0;
      shopItemPage = 0;
      uiButtons.gameover = []; // Clear gameover buttons
      buildShopCards(); // Build shop cards
    }, 'gameover'));
    
    // CHARS button
    uiButtons.gameover.push(new UIButton(startX + bw + spacing, by, bw, bh, () => t('common.chars'), () => {
      previousState = 'gameover';
      State.current = 'shop';
      shopMode = 'chars';
      shopScroll = 0;
      shopCharPage = 0;
      uiButtons.gameover = []; // Clear gameover buttons
      buildShopCards(); // Build shop cards
    }, 'gameover'));
  }
  
  // Fast mode toggle (if level >= 8)
  if (lvl >= 8) {
    const fw = 160, fh = 24;
    const fx = (CONFIG.width - fw) / 2;
    const fy = CONFIG.height * 0.80 + 80;
    
    uiButtons.gameover.push(new UIButton(fx, fy, fw, fh, () => t('game.fastToggle', { state: commonText(fastModeEnabled ? 'on' : 'off') }), () => {
      fastModeEnabled = !fastModeEnabled;
      localStorage.setItem('webswing_fastmode_v1', fastModeEnabled ? '1' : '0');
      buildGameOverButtons(); // Rebuild to update label
    }, 'gameover'));
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
let usedWebThisRun = false;
let robotReviveUsed = false;
let pirateBonusThisRun = 0;
let baseScoreForRewards = 0;
let wizardFloatTimer = 0;
let wizardSpinTimer = 0;
let wizardSpinRate = 0;
let activeSlowCharges = 0;   // Slow item charges remaining this run
let activeRevivalCharges = 0; // Revival charges remaining this run
let tailorCashBonusThisRun = 0; // Extra $ from Tailor rope catches this run
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

const SLOW_MO_SCALE = 0.35;
const SLOW_MO_DURATION = 0.9;
const SLOW_MO_COOLDOWN = 1.5;
const SLOW_MO_TRIGGER_VY = 140;
const SLOW_MO_TRIGGER_DISTANCE = 200;
const DOUBLE_MULTIPLIER = 1.3;
const COMBO_BONUS_PER_LEVEL = 0.5;
const LUCKY_BONUS_PER_LEVEL = 0.05;
const FEVER_BONUS_SECONDS = 2;
const TAILOR_EXTRA_ROPE_CHANCE = 0.5;

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
  spawnEffect('combo', player.x, player.y + 26, t('effects.stageBonus', { cash: STAGE_GATE_BONUS_CASH }));
  savings += STAGE_GATE_BONUS_CASH;
  try { localStorage.setItem(SAVINGS_KEY, String(savings)); } catch (_) {}
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
  bossProgress.active = true;

  const restoreCameraX = camera.x;
  const entryAnchorX = entryRope.anchorX;
  const entryBaseTipY = entryRope.anchorY + entryRope.L;

  bossState = {
    active: true,
    stageNumber,
    type,
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
    cameraTargetX: restoreCameraX,
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
  entryRope.A = 0;
  entryRope.omega = 0;
  entryRope.phi = 0;
  player.x = entryAnchorX;
  player.y = entryBaseTipY;

  State.current = 'boss_pending';
}

function updateBossPending(dt) {
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
  beginBossPop();
}

function beginBossPop() {
  if (!bossState || bossState.phase === 'pop' || bossState.phase === 'battle' || bossState.phase === 'battle_init') return;
  applyBossBackground(true);
  boxes.length = 0;
  bossState.phase = 'pop';
  bossState.timer = 0;
  bossState.popStartY = CONFIG.height + 8;
  bossState.popTargetY = CONFIG.height * 0.48;
  bossState.popDuration = 0.65;
  bossState.entryRope = null;
  State.current = 'boss';
  player.rope = null;
  player.mode = 'boss_pop';
  player.x = CONFIG.width * 0.35;
  player.y = bossState.popStartY;
  player.vx = 0;
  player.vy = 0;
}

function initBossBattle() {
  if (!bossState) return;
  const basePlayerX = CONFIG.width * 0.35;
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
  };

  if (bossState.type === 'bullet') {
    bossState.battle = {
      ...battleBase,
      bossY: CONFIG.height * 0.35,
      bossDir: 1,
      bossSpeed: 90,
      bossMinY: 60,
      bossMaxY: CONFIG.height * 0.65,
      shotsFired: 0,
      totalShots: 10,
      shotInterval: 1.0,
      shotCooldown: 0.6,
      bullets: [],
      dodged: 0,
      requiredDodges: 6,
      bulletSpeed: 220,
      failOnHit: true,
    };
  } else if (bossState.type === 'slam') {
    bossState.battle = {
      ...battleBase,
      duration: 10.0,
      bossX: CONFIG.width * 0.46,
      bossY: CONFIG.height * 0.32,
      bossRadius: 70,
      hitCount: 0,
      hitCooldown: 0,
      hitGoal: 50,
      jumpCount: 0,
      jumpGoal: 80,
      jumpPower: 320,
      baseGravity: CONFIG.gravity * 1.35,
    };
  } else if (bossState.type === 'collect') {
    bossState.battle = {
      ...battleBase,
      bossY: CONFIG.height * 0.30,
      bossDir: 1,
      bossSpeed: 70,
      bossMinY: 60,
      bossMaxY: CONFIG.height * 0.6,
      shotsFired: 0,
      totalShots: 10,
      shotInterval: 1.1,
      shotCooldown: 0.5,
      boxes: [],
      collected: 0,
      missed: 0,
      missLimit: 5,
      travelSpeedX: 160,
      travelSpeedY: 60,
    };
  }
  bossState.phase = 'battle';
  bossState.timer = 0;
}

function updateBoss(dt) {
  if (!bossState || !bossState.active) return;
  simTime += dt;

  if (bossState.phase === 'pop') {
    bossState.timer += dt;
    const duration = bossState.popDuration || 0.6;
    const t = Math.min(1, bossState.timer / duration);
    const eased = easeOutCubic(t);
    const startY = bossState.popStartY || (CONFIG.height + 60);
    const targetY = bossState.popTargetY || (CONFIG.height * 0.55);
    player.y = startY + (targetY - startY) * eased;
    player.x = camera.x + CONFIG.width * 0.35;
    player.vx = 0;
    player.vy = 0;
    camera.x += (0 - camera.x) * Math.min(1, dt * 2);
    if (t >= 1) {
      player.y = targetY;
      player.mode = 'boss';
      bossState.phase = 'battle_init';
      bossState.timer = 0;
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
        triggerBossFailure('hit');
        return;
      }
    }

    if (bullet.x < -40) {
      battle.dodged += 1;
      battle.bullets.splice(i, 1);
    }
  }

  if (battle.shotsFired >= battle.totalShots && battle.bullets.length === 0) {
    if (battle.dodged >= battle.requiredDodges) {
      const reward = battle.dodged * 2;
      triggerBossSuccess({ score: reward, cash: reward });
      return;
    } else {
      triggerBossFailure('not_enough_dodge');
      return;
    }
  }
}

function spawnBossBullet(battle) {
  battle.shotsFired += 1;
  battle.shotCooldown = battle.shotInterval;
  const aimY = randRange(battle.bossMinY, battle.bossMaxY);
  const dy = aimY - battle.bossY;
  const dx = (camera.x + CONFIG.width + 40) - player.x;
  const ang = Math.atan2(dy, Math.abs(dx));
  const vx = -battle.bulletSpeed;
  const vy = Math.tan(ang) * Math.abs(vx);
  battle.bullets.push({
    x: camera.x + CONFIG.width + 24,
    y: battle.bossY,
    vx,
    vy,
    radius: 10,
    life: 0,
    hit: false,
  });
}

function updateBossTypeSlam(dt, battle) {
  battle.bossTimer += dt;
  if (battle.hitCooldown > 0) battle.hitCooldown -= dt;

  if (Input.justPressed) {
    spawnEffect('sparkle', player.x, player.y - 12);
  }

  const jumps = battle.jumpCount || 0;
  const goal = battle.jumpGoal || 80;
  if (jumps >= goal) {
    const reward = Math.floor(jumps / 10) * 4;
    triggerBossSuccess({ score: reward, cash: reward });
    return;
  }

  if (battle.bossTimer >= battle.duration) {
    const reward = Math.floor(jumps / 10) * 4;
    triggerBossOutcome({ success: jumps >= goal, score: reward, cash: reward });
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
    const reward = battle.collected * 2;
    triggerBossSuccess({ score: reward, cash: reward });
    return;
  }

  if (battle.shotsFired >= battle.totalShots && battle.boxes.length === 0) {
    const reward = battle.collected * 2;
    if (battle.collected >= battle.totalShots) {
      triggerBossSuccess({ score: reward, cash: reward });
    } else {
      triggerBossOutcome({ success: false, score: reward, cash: reward });
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
  const { success, rewardScore = 0, rewardCash = 0 } = payload || {};
  bossProgress.active = false;
  if (bossState) bossState.active = false;
  applyBossBackground(false);

  if (rewardScore > 0) {
    score += rewardScore;
    spawnEffect('combo', player.x, player.y - 24, t('effects.pointsEarned', { points: rewardScore }));
  }
  if (rewardCash > 0) {
    savings += rewardCash;
    try { localStorage.setItem(SAVINGS_KEY, String(savings)); } catch (_) {}
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
  const r = new Rope({ anchorX, anchorY, L, A, omega, phi, createdAt: simTime, id: `r${nextRopeId++}` });
  ropes.push(r);
  registerMainRopeSpawn(anchorX);
  player.rope = r;
  player.mode = 'attached';
  // Place player at tip now
  const tip = r.tip(simTime);
  player.x = tip.x;
  player.y = tip.y;
  player.vy = tip.vy;
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
      return new Rope({ anchorX, anchorY, L, A, omega: omega2, phi, createdAt: simTime, id: `r${nextRopeId++}` });
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
  return new Rope({ anchorX, anchorY, L, A, omega, phi, createdAt: simTime, id: `r${nextRopeId++}` });
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
            id: `r${nextRopeId++}`
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
    if (!r.isWebRope) registerMainRopeSpawn(r.anchorX, prev ? prev.anchorX : undefined);
    ropesBufferedThisStep = true;
    // Maybe spawn a box between prev and new rope if eligible
    if (!starModeActive && prev && exp >= 50 && Math.random() < itemSpawnChance) {
      const midX = prev.anchorX + (r.anchorX - prev.anchorX) * 0.5;
      // Place much higher, with vertical randomness
      const minY = CONFIG.ceilingY + 60;
      const maxY = Math.min(CONFIG.height * 0.38, (CONFIG.height - CONFIG.groundH) - 140);
      const by = randRange(minY, maxY);
      let kind;
      if (Math.random() < 0.5) {
        kind = 'star';
      } else {
        if (Math.random() < 0.5) {
          kind = 'roulette';
        } else {
          const kinds = ['extraJump', 'wideCatch', 'bigSize'];
          kind = kinds[Math.floor(Math.random() * kinds.length)];
        }
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
  // Clear all UI buttons when resetting
  uiButtons.gameover = [];
  uiButtons.shop.cards = [];
  uiButtons.shop.buttons = [];
  rouletteState = null;
  rouletteSummary = null;

  resetStageState();

  player.reset();
  score = 0;
  comboCount = 0;
  State.current = 'run';
  simTime = 0;
  camera.x = 0;
  ropes.length = 0;
  boxes.length = 0;
  // Ensure fever state is cleared on fresh run
  starModeActive = false;
  starModeEndTime = 0;
  const consumableResult = applyRunConsumables(shopInv);
  shopInv = consumableResult.shopInv;
  activeSlowCharges = consumableResult.activeSlowCharges;
  activeRevivalCharges = consumableResult.activeRevivalCharges;
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
  usedWebThisRun = false;
  robotReviveUsed = false;
  pirateBonusThisRun = 0;
  baseScoreForRewards = 0;
  wizardFloatTimer = 0;
  wizardSpinTimer = 0;
  wizardSpinRate = 0;
  tailorCashBonusThisRun = 0;
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
let settingsPopupRect = null;
let settingsOptionRects = [];
let settingsFocusedIndex = 0;

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

function updateIntro(dt) {
  updateStageTransition(dt);
  // Debounce to ensure we show intro at least a moment after transitions
  if (simTime < inputLockUntil) { UI.reset && UI.reset(); return; }
  
  // Build buttons if not exist
  if (uiButtons.intro.length === 0) {
    buildIntroButtons();
  }
  
  if (showGuide) {
    if (UI.clicked || UI.keyPressed === 'Escape' || UI.keyPressed === 'Space') {
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

function renderIntro(g, time) {
  drawBackground(g);
  drawCenteredText(g, t('intro.title'), CONFIG.height * 0.28, 20);
  const blink = Math.sin(time * 3) > 0 ? 1 : 0.3;
  g.globalAlpha = blink;
  drawCenteredText(g, t('intro.pressStart'), CONFIG.height * 0.52, 14);
  g.globalAlpha = 1;
  
  // Shop buttons (if level >= 2)
  const lvl = getLevelByExp(exp);
  if (lvl >= 2) {
    const bw = 100, bh = 36;
    const spacing = 10;
    const totalWidth = bw * 2 + spacing;
    const startX = (CONFIG.width - totalWidth) / 2;
    const by = CONFIG.height * 0.65;
    
    // ITEMS button
    g.fillStyle = '#22334a';
    g.strokeStyle = '#b4c0d9';
    g.lineWidth = 2;
    g.fillRect(startX, by, bw, bh);
    g.strokeRect(startX, by, bw, bh);
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(t('common.items'), startX + bw/2, by + bh/2 + 1);
    
    // CHARS button
    const charsX = startX + bw + spacing;
    g.fillStyle = '#22334a';
    g.fillRect(charsX, by, bw, bh);
    g.strokeStyle = '#b4c0d9';
    g.strokeRect(charsX, by, bw, bh);
    g.fillStyle = '#ffffff';
    g.fillText(t('common.chars'), charsX + bw/2, by + bh/2 + 1);
  }
  
  // Guide button
  const footer = footerButtonRects();
  const guideBtn = footer.guide;
  g.fillStyle = '#22334a';
  g.strokeStyle = '#b4c0d9';
  g.lineWidth = 2;
  g.fillRect(guideBtn.x, guideBtn.y, guideBtn.w, guideBtn.h);
  g.strokeRect(guideBtn.x, guideBtn.y, guideBtn.w, guideBtn.h);
  g.fillStyle = '#ffffff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
  g.fillText(t('intro.guide'), guideBtn.x + guideBtn.w/2, guideBtn.y + guideBtn.h/2 + 1);

  // Settings button
  const settingsBtn = footer.settings;
  g.fillStyle = '#22334a';
  g.strokeStyle = '#b4c0d9';
  g.lineWidth = 2;
  g.fillRect(settingsBtn.x, settingsBtn.y, settingsBtn.w, settingsBtn.h);
  g.strokeRect(settingsBtn.x, settingsBtn.y, settingsBtn.w, settingsBtn.h);
  g.fillStyle = '#ffffff';
  g.fillText(t('intro.settings'), settingsBtn.x + settingsBtn.w/2, settingsBtn.y + settingsBtn.h/2 + 1);

  // Popup overlay
  if (showGuide) {
    g.save();
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fillRect(0, 0, CONFIG.width, CONFIG.height);
    const pw = CONFIG.width * 0.86;
    const ph = 150;
    const px = (CONFIG.width - pw) / 2;
    const py = CONFIG.height * 0.34;
    g.fillStyle = '#0f1a2a';
    g.strokeStyle = '#b4c0d9';
    g.lineWidth = 2;
    g.fillRect(px, py, pw, ph);
    g.strokeRect(px, py, pw, ph);
    const lines = translateList('guide.lines');
    g.fillStyle = '#ffffff';
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.font = `9px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    const baseGuideLine = 14;
    let ly = py + baseGuideLine;
    for (const line of lines) {
      g.fillText(line, px + 12, ly);
      ly += lineAdvance(baseGuideLine, line);
    }
    g.fillStyle = '#b4c0d9';
    g.font = `8px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.textAlign = 'center';
    g.fillText(t('common.clickAnywhereToClose'), px + pw/2, py + ph - 18);
    g.restore();
  }

  if (showSettings) {
    g.save();
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fillRect(0, 0, CONFIG.width, CONFIG.height);
    const pw = CONFIG.width * 0.7;
    const ph = Math.min(200, CONFIG.height * 0.5);
    const px = (CONFIG.width - pw) / 2;
    const py = CONFIG.height * 0.32;
    settingsPopupRect = { x: px, y: py, w: pw, h: ph };
    g.fillStyle = '#0f1a2a';
    g.strokeStyle = '#b4c0d9';
    g.lineWidth = 2;
    g.fillRect(px, py, pw, ph);
    g.strokeRect(px, py, pw, ph);
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'top';
    g.font = `12px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(t('settings.title'), px + pw / 2, py + 10);
    const langs = I18N_API ? I18N_API.getAvailableLanguages() : ['en'];
    const current = I18N_API ? I18N_API.getLanguage() : 'en';
    if (settingsFocusedIndex >= langs.length) settingsFocusedIndex = langs.length - 1;
    if (settingsFocusedIndex < 0) settingsFocusedIndex = 0;
    const optionTop = py + 40;
    const optionHeight = 26;
    settingsOptionRects = [];
    g.textAlign = 'left';
    for (let i = 0; i < langs.length; i++) {
      const code = langs[i];
      const label = t(`languages.${code}.name`);
      const oy = optionTop + i * optionHeight;
      const rect = { x: px + 20, y: oy - 6, w: pw - 40, h: optionHeight };
      settingsOptionRects.push(rect);
      const isFocused = i === settingsFocusedIndex;
      const isSelected = code === current;
      g.fillStyle = isFocused ? '#22334a' : 'transparent';
      if (isFocused) {
        g.fillRect(rect.x, rect.y, rect.w, rect.h);
      }
      g.fillStyle = '#ffffff';
      g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
      g.fillText(`${label} ${isSelected ? t('settings.currentMarker') : ''}`, rect.x + 10, oy);
    }
    g.textAlign = 'center';
    g.fillStyle = '#b4c0d9';
    g.font = `9px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(t('settings.help'), px + pw/2, py + ph - 18);
    g.restore();
  } else {
    settingsPopupRect = null;
    settingsOptionRects = [];
  }
}

function drawRope(g, rope) {
  const tip = rope.tip(simTime);
  const sx = rope.anchorX - camera.x;
  const sy = rope.anchorY;
  const tx = tip.x - camera.x;
  const ty = tip.y;
  // Line
  let stroke = '#b4c0d9';
  let lw = 2;
  if (starModeActive) {
    const pulse = 0.6 + 0.4 * Math.sin(simTime * 8);
    stroke = '#ffd966';
    lw = 3 + pulse;
    g.save();
    const prevComp = g.globalCompositeOperation;
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = 'rgba(255,217,102,0.35)';
    g.lineWidth = lw * 2.2;
    g.beginPath(); g.moveTo(sx, sy); g.lineTo(tx, ty); g.stroke();
    g.globalCompositeOperation = prevComp;
    g.restore();
  }
  // Flashing warning if this rope is about to snap while attached
  if (player.rope === rope && rope.breakAt) {
    const rem = Math.max(0, rope.breakAt - simTime);
    const pulse = (Math.sin(simTime * 12) * 0.5 + 0.5);
    stroke = rem < 0.5 ? '#ff5a5a' : '#ffa64d';
    lw = 2 + 1.5 * pulse;
  }
  g.strokeStyle = stroke;
  g.lineWidth = lw;
  g.beginPath();
  g.moveTo(sx, sy);
  g.lineTo(tx, ty);
  g.stroke();
  // Anchor dot
  g.fillStyle = starModeActive ? '#ffd966' : '#92a0bb';
  g.beginPath();
  g.arc(sx, sy, 3, 0, Math.PI * 2);
  g.fill();
  // Debug: tip-only catch radius and distance readout
  if (DEBUG) {
    const glowBonus = shopInv.glowLevel ? (shopInv.glowLevel * 0.167 * CONFIG.catchBase) : 0;
    const catchR = CONFIG.catchBase + glowBonus;
    g.save();
    g.fillStyle = 'rgba(255,105,180,0.12)';
    g.strokeStyle = 'rgba(255,105,180,0.5)';
    g.lineWidth = 1;
    g.beginPath();
    g.arc(tx, ty, catchR, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    // numeric debug
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.fillStyle = '#ff69b4';
    const dist = Math.hypot((tip.x - player.x), (tip.y - player.y));
    g.fillText(`d:${dist.toFixed(1)} r:${catchR.toFixed(1)}`, tx + 6, ty + 6);
    g.restore();
  }
  // Snap warning icon near tip if scheduled
  if (player.rope === rope && rope.breakAt) {
    const rem = Math.max(0, rope.breakAt - simTime);
    g.save();
    g.fillStyle = rem < 0.5 ? '#ff5a5a' : '#ffa64d';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.textAlign = 'center';
    g.textBaseline = 'bottom';
    g.fillText('!', tx, ty - 6);
    g.restore();
  }
}

function updateRun(dt) {
  const baseDt = dt;
  if (slowMoTimer > 0) {
    dt *= SLOW_MO_SCALE;
  }
  simTime += dt;
  if (slowMoTimer > 0) slowMoTimer = Math.max(0, slowMoTimer - baseDt);
  if (slowMoCooldown > 0) slowMoCooldown = Math.max(0, slowMoCooldown - baseDt);
  updateStageTransition(baseDt);
  const groundY = CONFIG.height - CONFIG.groundH;
  const collR = playerCollisionRadius();
  // reset per-step rope buffering flag
  ropesBufferedThisStep = false;

  // Star mode timeout
  if (starModeActive && simTime >= starModeEndTime) {
    starModeActive = false;
    // Keep existing ropes; normal spawning will take over
  }

  // Input
  if (Input.anyPressed()) {
    // Record press start for long-press detection
    pressStartAt = simTime;
    flyLongPressTriggered = false;
    if (player.mode === 'attached') {
      // Detach with momentum-carry jump
      const tip = player.rope ? player.rope.tip(simTime) : { vx: 0, vy: 0, th: 0 };
      player.mode = 'free';
      // carry over momentum from swing and add forward + upward impulse
      const upFactor = 0.8 + 0.2 * Math.cos(tip.th || 0); // near bottom stronger
      const js = CONFIG.jumpSpeedScale || 1;
      const speedMultiplier = fastModeEnabled ? 1.5 : 1.0;
      const jumpBoost = shopInv.double ? DOUBLE_MULTIPLIER : 1;
      const baseForward = CONFIG.baseVx * js * jumpBoost;
      let detVx = Math.max(CONFIG.minVx, Math.min(CONFIG.maxVx, ((tip.vx || 0) * js + baseForward) * speedMultiplier));
      let detVy = (tip.vy || 0) * js - (CONFIG.jumpImpulse * upFactor * js * jumpBoost);
      // prevent instant re-catch on the same rope
      lastDetachedRope = player.rope;
      player.rope = null;
      catchLockUntil = simTime + 0.2; // 200ms lock
      // Base additional jumps: 1 for all levels; items can add more
      const abilityBonus = characterAirJumpBonus();
      const baseAir = Math.max(0, 1 + (shopInv.plusJump ? 1 : 0) + abilityBonus);
      airJumpsLeft = baseAir + (pendingExtraJump ? 1 : 0);
      // Reset per-jump fly availability on jump count reset (new jump phase)
      usedFlyThisRun = false;
      usedAirJumps = 0;
      // consume pending size scale on detach
      if (pendingSizeScale && pendingSizeScale > 0) {
        player.sizeScale = pendingSizeScale;
        pendingSizeScale = 0;
      } else {
        player.sizeScale = 1;
      }
      pendingExtraJump = false; // consume
      if (characterIs('wizard')) {
        const wizardSpeed = Math.max(0, CONFIG.wizardJumpSpeed || 0);
        const wizardImpulse = Math.max(0, CONFIG.wizardJumpImpulse || CONFIG.jumpImpulse);
        detVx = Math.max(CONFIG.minVx, Math.min(CONFIG.maxVx, wizardSpeed * speedMultiplier * jumpBoost));
        detVy = -wizardImpulse * jumpBoost;
        wizardFloatTimer = 2.0;
        wizardSpinTimer = wizardFloatTimer;
        const spinRevs = CONFIG.wizardSpinRevolutions || 0;
        wizardSpinRate = (spinRevs > 0 && wizardSpinTimer > 0) ? ((Math.PI * 2 * spinRevs) / wizardSpinTimer) : 0;
      } else {
        wizardFloatTimer = 0;
        wizardSpinTimer = 0;
        wizardSpinRate = 0;
      }
      player.vx = detVx;
      player.vy = detVy;
    } else {
      // allow air flaps? keep as single impulse only when pressed; optional
      if (airJumpsLeft > 0) {
        player.airFlap();
        airJumpsLeft -= 1;
        usedAirJumps += 1;
      } else if (shopInv.webActive && !usedWebThisRun && !shopInv.fly) {
        // Web shot (if no fly ability)
        usedWebThisRun = true;
        shopInv.webActive = false;
        saveShopInv(shopInv);
        const webAnchorY = player.y - 400;
        const newWebRope = new Rope({
            anchorX: player.x,
            anchorY: webAnchorY,
            L: 400,
            A: 0, omega: 0, phi: 0,
            isWebRope: true,
                        webTargetL: 275,
            id: `r${nextRopeId++}`
        });
        ropes.push(newWebRope);
        player.rope = newWebRope;
        player.mode = 'attached';
        lastDetachedRope = null;
        catchLockUntil = simTime + 0.2;
        webRopeJustCreated = true;
      } else if (shopInv.webActive && !usedWebThisRun && usedFlyThisRun) {
        // Web shot (after fly is used)
        usedWebThisRun = true;
        shopInv.webActive = false;
        saveShopInv(shopInv);
        const webAnchorY = player.y - 400;
        const newWebRope = new Rope({
            anchorX: player.x,
            anchorY: webAnchorY,
            L: 400,
            A: 0, omega: 0, phi: 0,
            isWebRope: true,
                        webTargetL: 275,
            id: `r${nextRopeId++}`
        });
        ropes.push(newWebRope);
        player.rope = newWebRope;
        player.mode = 'attached';
        lastDetachedRope = null;
        catchLockUntil = simTime + 0.2;
        webRopeJustCreated = true;
      }
    }
  }
  // Reset fly when not holding
  if (!Input.down) flyActiveRemaining = 0;

  // Update ropes buffer
  if (!webRopeJustCreated) {
    ensureRopesBuffered();
  }
  cleanupRopes();

  if (activeSlowCharges > 0 && slowMoTimer <= 0 && slowMoCooldown <= 0 && player.mode === 'free') {
    const distanceToGround = groundY - (player.y + collR);
    if (player.vy > SLOW_MO_TRIGGER_VY && distanceToGround > 0 && distanceToGround <= SLOW_MO_TRIGGER_DISTANCE) {
      slowMoTimer = SLOW_MO_DURATION;
      slowMoCooldown = SLOW_MO_COOLDOWN;
      activeSlowCharges = Math.max(0, activeSlowCharges - 1);
      spawnEffect('combo', player.x, player.y - 24, t('effects.slow'));
    }
  }

  // Box pickup
  const magnetLevel = shopInv.magnetLevel || 0;
  const baseCatchR = CONFIG.catchBase;
  const magnetPullR = baseCatchR + magnetLevel * 10;
  const magnetPullSpeed = 140 + magnetLevel * 60; // px/s pull toward player when within magnet radius
  const budHitZones = computeBudHitZones();

  for (const b of boxes) {
    if (!b.active) continue;
    let dx = b.x - player.x;
    let dy = b.y - player.y;
    let dist = Math.hypot(dx, dy);

    if (magnetLevel > 0 && dist > baseCatchR && dist <= magnetPullR) {
      const pullStep = magnetPullSpeed * dt;
      const nx = dx / (dist || 1);
      const ny = dy / (dist || 1);
      b.x -= nx * pullStep;
      b.y -= ny * pullStep;
      dx = b.x - player.x;
      dy = b.y - player.y;
      dist = Math.hypot(dx, dy);
    }
    let caught = dist <= baseCatchR;
    if (!caught && budHitZones.length > 0) {
      for (let i = 0; i < budHitZones.length; i++) {
        const bud = budHitZones[i];
        const bdx = b.x - bud.x;
        const bdy = b.y - bud.y;
        if (Math.hypot(bdx, bdy) <= bud.r) {
          caught = true;
          break;
        }
      }
    }

    if (!caught) continue;

    b.active = false;
    const wobble = Math.sin(simTime * 3 + (b.phase || 0)) * 6;
    const displayY = b.y + wobble;

    if (b.kind === 'star') {
      starModeActive = true;
      const feverBonus = (shopInv.feverLevel || 0) * FEVER_BONUS_SECONDS;
      starModeEndTime = simTime + (CONFIG.starDuration || 3.0) + feverBonus;
      const worldX = b.x;
      const worldY = b.y;
      const targetWorldX = worldX;
      const targetWorldY = worldY;
      const anchorX = worldX + 110;
      const anchorY = CONFIG.ceilingY;
      const dxTip = targetWorldX - anchorX;
      const dyTip = targetWorldY - anchorY;
      let ropeLength = Math.hypot(dxTip, dyTip);
      let theta = Math.atan2(dxTip, dyTip);
      if (Math.abs(theta) < 0.02) theta = theta >= 0 ? 0.02 : -0.02;
      const A = Math.abs(theta);
      const phi = theta >= 0 ? 0 : Math.PI;
      const newWebRope = new Rope({
        anchorX,
        anchorY,
        L: ropeLength,
        A,
        omega: 0,
        phi,
        createdAt: simTime,
        isWebRope: true,
        webTargetL: Math.max(60, ropeLength - 100),
        retractSpeed: 240,
        id: `r${nextRopeId++}`
      });
      ropes.length = 0;
      ropes.push(newWebRope);
      boxes.length = 0;
      player.rope = newWebRope;
      player.mode = 'attached';
      player.x = targetWorldX - camera.x;
      player.y = targetWorldY;
      player.vx = 0;
      player.vy = -140;
      lastDetachedRope = null;
      catchLockUntil = simTime + 0.2;
      webRopeJustCreated = true;
      spawnEffect('big', b.x, displayY);
    } else {
      spawnEffect('burst', b.x, displayY);
      if (b.kind === 'extraJump') pendingExtraJump = true;
      else if (b.kind === 'wideCatch') pendingCatchR = 50;
      else if (b.kind === 'bigSize') pendingSizeScale = 1.5;
      else if (b.kind === 'roulette') {
        const spinDuration = CONFIG.rouletteSpinDuration || 2.4;
        rouletteState = {
          active: true,
          spinning: true,
          spinTimer: 0,
          spinDuration,
          displayOp: '?',
          displayValue: null,
          finalOp: null,
          finalValue: null,
          applied: false,
          nextShuffle: 0,
        };
        rouletteSummary = null;
      }
    }
  }

  // Update player
  player.update(dt, simTime);
  updateRoulette(dt);
  // Star trail particles while in fever mode
  if (starModeActive) {
    const px = player.x, py = player.y;
    const count = 2;
    for (let i = 0; i < count; i++) {
      particles.push({
        x: px + randRange(-4, 4),
        y: py + randRange(-4, 4),
        vx: randRange(-20, 20),
        vy: randRange(-10, 10),
        life: 0,
        ttl: 0.35 + Math.random() * 0.25,
        size: 1.2 + Math.random() * 1.6,
        color: '#ffd966',
        type: 'sparkle',
        twinkleFreq: 8 + Math.random() * 6,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }
  }
  // Detect long press for fly activation (only once per run, only when no jumps left)
  if (shopInv.fly && Input.down && !flyLongPressTriggered && !usedFlyThisRun) {
    const canTriggerFlyNow = characterIs('bird') ? (player.mode === 'free') : (player.mode === 'free' && airJumpsLeft <= 0);
    if (canTriggerFlyNow) {
      if (simTime - pressStartAt >= (CONFIG.flyHoldThreshold || 0.2)) {
        flyActiveRemaining = CONFIG.flyMaxHold || 1.0;
        flyLongPressTriggered = true;
        usedFlyThisRun = true; // consume fly ability for this run
      }
    }
  }
  // Apply fly effect while holding (free state only)
  if (shopInv.fly && Input.down && flyActiveRemaining > 0 && player.mode === 'free') {
    flyActiveRemaining = Math.max(0, flyActiveRemaining - dt);
    // gentle diagonal up: keep slight forward, negate gravity feel
    const upV = CONFIG.flyUpVy || -120; // px/s upwards
    const fwd = Math.max(CONFIG.minVx * 0.6, CONFIG.flyMinFwd || 120);
    player.vy = upV;
    player.vx = Math.max(player.vx, fwd);
  }

  // If rope is scheduled to snap and player is still attached, enforce snap after timer
  if (player.mode === 'attached' && player.rope && player.rope.breakAt && simTime >= player.rope.breakAt) {
    const tipNow = player.rope.tip(simTime);
    // Force detach without upward impulse (penalty)
    player.mode = 'free';
    comboCount = 0; // Reset combo on snap
    // carry minimal forward from tip, no extra upward boost
    const js = CONFIG.jumpSpeedScale || 1;
    player.vx = Math.max(CONFIG.minVx, Math.min(CONFIG.maxVx, (tipNow.vx || 0) * js + CONFIG.baseVx * 0.2 * js));
    player.vy = (tipNow.vy || 0) * js;
    spawnEffect('snap', tipNow.x, tipNow.y);
    lastDetachedRope = player.rope;
    player.rope.breakAt = null;
    player.rope = null;
    catchLockUntil = simTime + 0.1;
  }

  // Update effects
  updateParticles(dt);

  // Camera smoothing: avoid instant snap. Slide during both states.
  {
    const target = player.x - SCREEN_TARGET_X;
    const rate = (player.mode === 'attached') ? CONFIG.camFollowAttach : CONFIG.camFollowFree;
    const a = Math.min(1, rate * dt);
    camera.x += (target - camera.x) * a;
  }

  // Catch check (tip-only)
  if (player.mode === 'free') {
    for (let i = 0; i < ropes.length; i++) {
      const rope = ropes[i];
      // skip catch during cooldown or same rope immediately after detach
      if (simTime < catchLockUntil) continue;
      if (rope === lastDetachedRope) continue;
      const tip = rope.tip(simTime);
      const bx = tip.x, by = tip.y;
      const dx = bx - player.x;
      const dy = by - player.y;
      const glowBonus = shopInv.glowLevel ? (shopInv.glowLevel * 0.167 * CONFIG.catchBase) : 0;
      let catchR = (pendingCatchR > 0 ? pendingCatchR : CONFIG.catchBase) + glowBonus;
      if (starModeActive) catchR *= 1.5;
      let withinCatch = Math.hypot(dx, dy) <= catchR;

      if (!withinCatch && budHitZones.length > 0) {
        // Buds trailing orbs can snag ropes for the player
        for (let j = 0; j < budHitZones.length; j++) {
          const bud = budHitZones[j];
          const budDx = bx - bud.x;
          const budDy = by - bud.y;
          if (Math.hypot(budDx, budDy) <= bud.r) {
            withinCatch = true;
            break;
          }
        }
      }

      if (withinCatch) {
        // Attach
        player.mode = 'attached';
        player.rope = rope;
        wizardFloatTimer = 0;
        wizardSpinTimer = 0;
        wizardSpinRate = 0;
        const baseGained = starModeActive ? 3 : ((usedAirJumps === 0) ? 3 : (usedAirJumps === 1) ? 2 : 1);
        let rewardGain = baseGained;
        const kind = (baseGained === 3) ? 'big' : (baseGained === 2) ? 'medium' : 'small';
        const tipNow = rope.tip(simTime);
        spawnEffect(kind, tipNow.x, tipNow.y);

        const comboEligible = starModeActive || usedAirJumps === 0;
        if (comboEligible) {
          comboCount++;
          if (characterIs('pirate') && comboCount >= 2) {
            pirateBonusThisRun += 2;
          }
          if (comboCount >= 2) {
            spawnEffect('combo', player.x, player.y - 30, t('effects.comboCount', { combo: comboCount }));
          }
        } else {
          comboCount = 0;
        }
        const comboLevel = shopInv.comboLevel || 0;
        if (comboLevel > 0 && comboEligible && comboCount >= 2) {
          const comboMultiplier = 1 + comboLevel * COMBO_BONUS_PER_LEVEL;
          rewardGain = Math.max(1, Math.round(rewardGain * comboMultiplier));
        } else {
          rewardGain = Math.max(1, Math.round(rewardGain));
        }
        const tailorCatchBonus = (rope.tailorBonus && characterIs('tailor')) ? rope.tailorBonus : 0;
        baseScoreForRewards += rewardGain;
        let scoreGain = rewardGain;
        if (characterIs('knight')) scoreGain *= 2;
        score += scoreGain;
        if (tailorCatchBonus > 0) {
          tailorCashBonusThisRun += tailorCatchBonus;
          spawnEffect('combo', player.x, player.y - 18, t('effects.tailorBonus', { amount: `$${tailorCatchBonus}` }));
          rope.tailorBonus = 0;
        }
        if (rope.stageGateStage != null && !rope.stageGateRewarded) {
          grantStageGateReward(rope);
        }
        // Schedule snap if EXP milestone reached (>= 10)
        if (exp >= 10 && !starModeActive) {
          if (Math.random() < CONFIG.ropeBreakProb) {
            rope.breakAt = simTime + 1.0; // snap after 1s unless player jumps
          } else {
            rope.breakAt = null;
          }
        } else {
          rope.breakAt = null;
        }
        // Avoid spawning two ropes in the same step due to camera shift
        if (!ropesBufferedThisStep) ensureRopesBuffered();
        lastDetachedRope = null;
        airJumpsLeft = 0; // reset jump count on attach
        usedAirJumps = 0;
        // reset size to normal on attach
        player.sizeScale = 1;
        // consume pending catch radius if used
        if (pendingCatchR > 0) pendingCatchR = 0;
        break;
      }
    }
  }

  // Game over if grounded while free
  if (player.y + collR >= groundY) {
    player.y = groundY - collR;
    comboCount = 0; // Reset combo on death
    if (characterIs('robot') && !robotReviveUsed) {
      robotReviveUsed = true;
      spawnEffect('robotBreak', player.x, groundY);
      const anchorX = player.x;
      const anchorY = CONFIG.ceilingY;
      const safeTipY = groundY - (collR + 12);
      // Rescue rope starts with its tip just above the ground so the robot doesn't instantly collide again.
      const ropeLength = Math.max(240, safeTipY - anchorY);
      const extraLift = 150;
      const retractAmount = 160 + extraLift;
      const ropeRetractTarget = Math.max(200, ropeLength - retractAmount);
      const webRope = new Rope({
        anchorX,
        anchorY,
        L: ropeLength,
        A: 0,
        omega: 0,
        phi: 0,
        createdAt: simTime,
        isWebRope: true,
        webTargetL: ropeRetractTarget,
        retractSpeed: 180,
        id: `r${nextRopeId++}`
      });
      ropes.push(webRope);
      player.rope = webRope;
      player.mode = 'attached';
      const tipNow = webRope.tip(simTime);
      player.x = tipNow.x;
      player.y = tipNow.y;
      player.vx = 0;
      player.vy = -100;
      lastDetachedRope = null;
      catchLockUntil = simTime + 0.2;
      airJumpsLeft = 0;
      usedAirJumps = 0;
      webRopeJustCreated = true;
      ensureRopesBuffered();
      return;
    }
    if (activeRevivalCharges > 0) {
      activeRevivalCharges = Math.max(0, activeRevivalCharges - 1);
      spawnEffect('combo', player.x, player.y - 30, t('effects.revive'));
      const anchorX = player.x;
      const anchorY = CONFIG.ceilingY;
      const tipTarget = groundY - (collR + 24);
      const ropeLength = Math.max(220, tipTarget - anchorY);
      const retractTarget = Math.max(160, ropeLength - 200);
      const revivalRope = new Rope({
        anchorX,
        anchorY,
        L: ropeLength,
        A: 0,
        omega: 0,
        phi: 0,
        createdAt: simTime,
        isWebRope: true,
        webTargetL: retractTarget,
        retractSpeed: 220,
        id: `r${nextRopeId++}`
      });
      ropes.push(revivalRope);
      player.rope = revivalRope;
      player.mode = 'attached';
      const tipNow = revivalRope.tip(simTime);
      player.x = tipNow.x;
      player.y = tipNow.y;
      player.vx = 0;
      player.vy = -120;
      lastDetachedRope = null;
      catchLockUntil = simTime + 0.2;
      airJumpsLeft = 0;
      usedAirJumps = 0;
      webRopeJustCreated = true;
      ensureRopesBuffered();
      return;
    }
    // Ground break effect at impact
    spawnEffect('break', player.x, groundY);
    // Earnings and EXP: $1 and 1 EXP per point beyond 5 this run
    const baseEarned = Math.max(0, Math.floor(baseScoreForRewards - 5));
    let earnedMoney = baseEarned;
    let earnedExp = baseEarned;
    if (characterIs('pirate')) earnedMoney += pirateBonusThisRun;
    earnedMoney += tailorCashBonusThisRun;
    if (characterIs('knight')) {
      earnedMoney *= 2;
      earnedExp *= 2;
    }
    if (shopInv.gambleActive) {
      earnedMoney = Math.floor(earnedMoney * 1.5);
      earnedExp = Math.floor(earnedExp * 1.5);
      shopInv.gambleActive = false; // Consume gamble
      saveShopInv(shopInv);
    }

    if (rouletteState && rouletteState.active) {
      finalizeRouletteSpin();
      if (rouletteState.finalOp != null && !rouletteState.applied) {
        const beforeMoney = earnedMoney;
        let afterMoney = beforeMoney;
        const op = rouletteState.finalOp;
        const val = rouletteState.finalValue || 0;
        if (op === '+') afterMoney = beforeMoney + val;
        else if (op === '-') afterMoney = beforeMoney - val;
        else if (op === 'x') afterMoney = beforeMoney * Math.max(1, val);
        afterMoney = Math.max(0, Math.floor(afterMoney));
        earnedMoney = afterMoney;
        rouletteSummary = { before: beforeMoney, after: afterMoney, op, value: val };
        rouletteState.applied = true;
      }
    }

    lastEarned = earnedMoney;
    lastExpEarned = earnedExp;
    // Compute potential level-up BEFORE applying demo resets (based on EXP)
    const prevLevel = getLevelByExp(exp);
    const newLevel = getLevelByExp(exp + earnedExp);
    if (newLevel > prevLevel) {
      gameOverLevelUp = { from: prevLevel, to: newLevel };
      levelUpPopupTimer = 0;
      // celebratory particles near screen center
      const cx = camera.x + CONFIG.width / 2;
      const cy = CONFIG.height * 0.36;
      spawnEffect('big', cx, cy);
    }
    if (earnedMoney > 0 || earnedExp > 0) {
      // Add to money and EXP
      savings += earnedMoney;
      exp += earnedExp;
      try {
        localStorage.setItem(SAVINGS_KEY, String(savings));
        localStorage.setItem(EXP_KEY, String(exp));
      } catch(_){}
    }
    tailorCashBonusThisRun = 0;
    pirateBonusThisRun = 0;
    baseScoreForRewards = 0;
    wizardFloatTimer = 0;
    wizardSpinTimer = 0;
    wizardSpinRate = 0;
    // Demo rule: if demo active and EXP exceeded 110P (>=111P), on game over you lose everything
    if (demoActive && exp > 110) {
      lastDemoLoss = true;
      demoActive = false;
      savings = 0;
      try {
        localStorage.setItem(SAVINGS_KEY, '0');
        localStorage.setItem(DEMO_DONE_KEY, '1');
        // Reset EXP and clear all items when demo ends
        exp = 0;
        localStorage.setItem(EXP_KEY, '0');
        shopInv = { ...SHOP_INV_DEFAULTS };
        saveShopInv(shopInv);
        saveShopInv(shopInv);
      } catch(_){}
    }
    best = Math.max(best, score);
    try {
      localStorage.setItem(BEST_SCORE_KEY, String(best));
    } catch(_) {}
    // End fever state on game over
    starModeActive = false;
    starModeEndTime = 0;
    State.current = 'gameover';
    // Clear current input edges and lock inputs briefly to avoid instant restart
    if (typeof UI !== 'undefined') UI.reset();
    Input.down = false; Input.justPressed = false;
    gameOverLockUntil = simTime + 0.2;
    gameOverTimer = 0;
    // Clear pending item effects on game over
    pendingExtraJump = false;
    pendingCatchR = 0;
    pendingSizeScale = 0;
    player.sizeScale = 1;
  }
}

function renderRun(g) {
  drawBackground(g);
  const rouletteGlint = rouletteState && rouletteState.active && rouletteState.spinning;
  // Fever overlay (star mode) or roulette glint
  if (starModeActive || rouletteGlint) {
    g.save();
    const time = simTime;
    if (starModeActive) {
      const pulse = 0.08 + 0.06 * (Math.sin(time * 6) * 0.5 + 0.5);
      g.fillStyle = `rgba(255,217,102,${pulse.toFixed(3)})`;
      g.fillRect(0, 0, CONFIG.width, CONFIG.height);
    }
    if (rouletteGlint) {
      const colors = ['#ff6ec7', '#ffd966', '#7dd3ff', '#9cff9c'];
      const segments = 9;
      const alphaBase = 0.4;
      const alphaPulse = 0.3;
      for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2 + time * 3.8;
        const grad = g.createLinearGradient(
          CONFIG.width / 2,
          CONFIG.height / 2,
          CONFIG.width / 2 + Math.cos(angle) * CONFIG.width,
          CONFIG.height / 2 + Math.sin(angle) * CONFIG.height
        );
        const color = colors[i % colors.length];
        const alpha = alphaBase + alphaPulse * (Math.sin(time * 12 + i) * 0.5 + 0.5);
        grad.addColorStop(0, color + '00');
        grad.addColorStop(0.35, color + '55');
        grad.addColorStop(1, color + Math.floor(alpha * 255).toString(16).padStart(2, '0'));
        g.fillStyle = grad;
        g.fillRect(0, 0, CONFIG.width, CONFIG.height);
      }
    }
    g.restore();
  }
  // Ropes behind player
  for (let i = 0; i < ropes.length; i++) drawRope(g, ropes[i]);
  // Draw boxes
  for (const b of boxes) {
    const sx = b.x - camera.x;
    const wobble = Math.sin(simTime * 3 + (b.phase || 0)) * 6;
    const sy = b.y + wobble;
    g.save();
    const size = 26;
    g.fillStyle = '#334d6e';
    g.strokeStyle = '#c8d6f0';
    g.lineWidth = 2;
    g.beginPath();
    g.rect(sx - size/2, sy - size/2, size, size);
    g.fill();
    g.stroke();
    // icon
    g.fillStyle = '#fff';
    g.font = `11px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const label = (b.kind === 'extraJump') ? 'J'
                  : (b.kind === 'wideCatch') ? 'R'
                  : (b.kind === 'bigSize') ? 'S'
                  : (b.kind === 'star') ? '*'
                  : (b.kind === 'roulette') ? '$$'
                  : '?';
    g.fillText(label, sx, sy + 1);
    g.restore();
  }
  // Draw player with camera offset
  ctx.save();
  ctx.translate(-camera.x, 0);
  player.draw(g);
  if (DEBUG) {
    g.save();
    g.fillStyle = 'rgba(255,105,180,0.12)';
    g.strokeStyle = 'rgba(255,105,180,0.5)';
    g.lineWidth = 1;
    g.beginPath();
    const effR = pendingCatchR > 0 ? pendingCatchR : CONFIG.catchBase;
    g.arc(player.x, player.y, effR, 0, Math.PI*2);
    g.fill();
    g.stroke();
    g.restore();
  }
  ctx.restore();
  // Draw catch effects on top
  drawParticles(g);
  renderRouletteOverlay(g);

  // HUD
  g.fillStyle = '#ffffff';
  g.textAlign = 'left';
  g.textBaseline = 'top';
  g.font = `12px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
  g.fillText(t('hud.score', { score }), 12, 10);
  g.fillText(t('hud.best', { best }), 12, 28);
  g.textAlign = 'right';
  g.fillText(t('hud.savings', { amount: savings }), CONFIG.width - 12, 10);
  // Fever badge and timer
  if (starModeActive) {
    const rem = Math.max(0, starModeEndTime - simTime);
    g.textAlign = 'center';
    g.fillStyle = '#ffd966';
    g.font = `12px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(t('hud.fever'), CONFIG.width / 2, 10);
    // Timer bar under the title
    const bw = 120, bh = 6;
    const bx = (CONFIG.width - bw) / 2;
    const by = 26;
    g.fillStyle = 'rgba(255,255,255,0.15)';
    g.fillRect(bx, by, bw, bh);
    const ratio = Math.max(0, Math.min(1, rem / (CONFIG.starDuration || 3.0)));
    g.fillStyle = '#ffd966';
    g.fillRect(bx, by, bw * ratio, bh);
  }
  // Pending item indicators
  g.textAlign = 'right';
  g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
  const itemText = `${pendingExtraJump ? '+J ' : ''}${pendingCatchR ? 'R50 ' : ''}${pendingSizeScale ? 'S+ ' : ''}`.trim();
  if (itemText) g.fillText(itemText, CONFIG.width - 12, 28);
  // Level display
  g.textAlign = 'left';
  g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
  g.fillText(t('hud.level', { level: getLevelByExp(exp) }), 12, 46);
}

function renderBoss(g) {
  g.save();
  g.translate(-camera.x, 0);
  if (bossBackgroundActive) drawBossBackground(g); else drawBackground(g);

  const battle = bossState ? bossState.battle : null;
  if (bossState) {
    const fallbackY = CONFIG.height * 0.4;
    if (bossState.type === 'bullet') {
      const villainY = battle ? battle.bossY : fallbackY;
      drawPixelSprite(g, camera.x + CONFIG.width - 8, villainY, BOSS_SPRITES.bossShooter, 4, 'right');
    } else if (bossState.type === 'collect') {
      const villainY = battle ? battle.bossY : fallbackY;
      drawPixelSprite(g, camera.x + CONFIG.width - 8, villainY, BOSS_SPRITES.bossCollector, 4, 'right');
    }
  }

  if (battle) {
    if (bossState.type === 'bullet') {
      for (const bullet of battle.bullets) {
        drawPixelSprite(g, bullet.x, bullet.y, BOSS_SPRITES.bulletProjectile, 3);
      }
    } else if (bossState.type === 'collect') {
      for (const box of battle.boxes) {
        drawPixelSprite(g, box.x, box.y, BOSS_SPRITES.cashBox, 3);
      }
    }
  }

  player.draw(g);

  g.restore();

  drawParticles(g);

  g.save();
  g.fillStyle = '#ffffff';
  g.textAlign = 'center';
  g.textBaseline = 'top';
  g.font = `16px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
  const title = bossState ? t('boss.stageWithNumber', { stage: bossState.stageNumber }) : t('boss.stage');
  g.fillText(title, CONFIG.width / 2, 16);
  g.font = `12px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
  if (bossState && bossState.battle) {
    if (bossState.type === 'bullet') {
      const b = bossState.battle;
      g.fillText(t('boss.bulletHud', { shots: b.shotsFired, total: b.totalShots, dodged: b.dodged, required: b.requiredDodges }), CONFIG.width / 2, 40);
    } else if (bossState.type === 'slam') {
      const b = bossState.battle;
      const remain = Math.max(0, b.duration - b.bossTimer).toFixed(1);
      g.font = `26px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
      g.fillText(t('boss.slamHudProgress', { current: b.jumpCount || 0, goal: b.jumpGoal || 80 }), CONFIG.width / 2, CONFIG.height * 0.42);
      g.font = `12px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
      g.fillText(t('boss.slamHudTime', { seconds: remain }), CONFIG.width / 2, 40);
    } else if (bossState.type === 'collect') {
      const b = bossState.battle;
      g.fillText(t('boss.collectHud', { collected: b.collected, total: b.totalShots, missed: b.missed, allowed: b.missLimit }), CONFIG.width / 2, 40);
    }
  }
  if (bossState) {
    const infoKey = BOSS_HUD_TEXT[bossState.type];
    if (infoKey) {
      g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
      g.fillText(t(infoKey), CONFIG.width / 2, 56);
    }
  }
  g.restore();
}

function renderRouletteOverlay(g) {
  if (!rouletteState || !rouletteState.active) return;
  const rawOp = rouletteState.displayOp || '?';
  const displayOp = rawOp === 'x' ? '×' : rawOp;
  const displayValue = (rouletteState.displayValue !== null && rouletteState.displayValue !== undefined) ? rouletteState.displayValue : '?';
  const groundY = CONFIG.height - CONFIG.groundH;
  const boxW = 60;
  const boxH = 42;
  const gap = 16;
  const centerX = CONFIG.width / 2;
  const x1 = centerX - boxW - gap / 2;
  const x2 = centerX + gap / 2;
  const y = groundY + 8;

  g.save();
  g.textAlign = 'center';
  g.textBaseline = 'top';
  g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
  g.fillStyle = '#ffffff';
  g.fillText(t('roulette.title'), centerX, y - 14);

  function drawCell(x, label, highlight) {
    g.fillStyle = highlight ? 'rgba(47,71,99,0.42)' : 'rgba(34,51,74,0.32)';
    g.strokeStyle = '#9fb5d8';
    g.lineWidth = 2;
    g.beginPath();
    g.rect(x, y, boxW, boxH);
    g.fill();
    g.stroke();
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `20px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(label, x + boxW / 2, y + boxH / 2 + 2);
  }

  const settled = !rouletteState.spinning && rouletteState.finalOp != null;
  drawCell(x1, displayOp, settled);
  drawCell(x2, String(displayValue), settled);

  g.textAlign = 'center';
  g.textBaseline = 'top';
  g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
  if (rouletteState.spinning) {
    g.fillText(t('roulette.spinning'), centerX, y + boxH + 6);
  } else if (rouletteSummary && rouletteState.applied) {
    const opSymbol = rouletteSummary.op === 'x' ? '×' : rouletteSummary.op;
    g.fillText(t('roulette.formula', {
      before: rouletteSummary.before,
      op: opSymbol,
      value: rouletteSummary.value,
      after: rouletteSummary.after,
    }), centerX, y + boxH + 6);
  } else if (settled) {
    g.fillText(t('roulette.locked'), centerX, y + boxH + 6);
  }

  g.restore();
}

function computeBudHitZones() {
  const budsLevel = shopInv.budsLevel || 0;
  if (!budsLevel) return [];
  const budsCount = Math.min(6, budsLevel);
  const zones = [];
  const spin = simTime * 0.8;
  const level = getLevelByExp(exp);
  const levelScale = (level > 1) ? 1.3 : 1.0;
  const bigScale = 1 + 0.025 * (shopInv.bigLevel || 0);
  const baseX = player.x;
  const baseY = player.y;
  const isPixelChar = selectedCharacter !== 'default' && PIXEL_CHARACTERS[selectedCharacter];

  if (isPixelChar) {
    const charData = PIXEL_CHARACTERS[selectedCharacter];
    const pixelSize = 3 * player.sizeScale * bigScale * levelScale;
    const width = (charData.pixels[0]?.length || 8) * pixelSize;
    const height = (charData.pixels.length || 8) * pixelSize;
    const orbitR = Math.max(width, height) * 0.6 + 6;
    const baseRadius = 5.5 * player.sizeScale;
    for (let i = 0; i < budsCount; i++) {
      const baseAngle = spin + i * (Math.PI * 2 / budsCount);
      const wobble = Math.sin(simTime * 1.4 + i) * 0.2;
      const angle = baseAngle + wobble;
      const pulse = 1 + Math.sin(simTime * 2.5 + i) * 0.1;
      const offsetX = Math.cos(angle) * orbitR;
      const offsetY = Math.sin(angle) * orbitR * 0.9;
      zones.push({ x: baseX + offsetX, y: baseY + offsetY, r: baseRadius * pulse });
    }
  } else {
    const baseR = player.r * player.sizeScale * bigScale * levelScale;
    const childR = baseR * 0.32;
    const orbitR = baseR + childR * 1.6;
    for (let i = 0; i < budsCount; i++) {
      const baseAngle = spin + i * (Math.PI * 2 / budsCount);
      const wobble = Math.sin(simTime * 1.6 + i * 0.8) * 0.25;
      const angle = baseAngle + wobble;
      const offsetX = Math.cos(angle) * orbitR;
      const offsetY = Math.sin(angle) * orbitR * 0.92;
      const radius = childR;
      zones.push({ x: baseX + offsetX, y: baseY + offsetY, r: radius });
    }
  }

  return zones;
}

function updateGameOver(dt) {
  // allow particles to continue animating on game over
  updateParticles(dt);
  updateStageTransition(dt);
  // advance gameover local timer
  gameOverTimer += dt;
  levelUpPopupTimer += dt;
  const wait = CONFIG.gameOverWait || 5.0;
  // 잠금 기간 동안 입력을 소비/지우기
  if (gameOverTimer < wait) {
    if (typeof UI !== 'undefined') UI.reset();
    Input.down = false; Input.justPressed = false;
    return;
  }
  
  // Build buttons if not exist
  if (uiButtons.gameover.length === 0) {
    buildGameOverButtons();
  }
  
  // Check button clicks
  if (UI.clicked && State.current === 'gameover') {
    for (const button of uiButtons.gameover) {
      if (button.isClicked(UI.mx, UI.my)) {
        button.onClick();
        UI.reset();
        Input.down = false; Input.justPressed = false;
        return;
      }
    }
    
    // If no button clicked, restart game
    UI.reset();
    Input.down = false; Input.justPressed = false;
    resetRun();
    return;
  }
  
  // Restart on Space or Escape
  if (UI.keyPressed === 'Space' || UI.keyPressed === 'Escape') {
    UI.reset();
    Input.down = false; Input.justPressed = false;
    resetRun();
  }
}

function renderGameOver(g) {
  drawBackground(g);
  drawParticles(g);
  if (lastDemoLoss) {
    drawCenteredText(g, t('gameOver.title'), CONFIG.height * 0.30 - 20, 18, '#ff6666');
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'top';
    g.font = `12px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(t('gameOver.demoLossLine1'), CONFIG.width / 2, CONFIG.height * 0.40 - 20);
    g.fillText(t('gameOver.demoLossLine2'), CONFIG.width / 2, CONFIG.height * 0.46 - 20);
  } else {
    drawCenteredText(g, t('gameOver.title'), CONFIG.height * 0.30 - 20, 18, '#ff6666');
    drawCenteredText(g, t('hud.score', { score }), CONFIG.height * 0.40 - 20, 12);

    // Savings summary and next target
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'top';
    const y0 = CONFIG.height * 0.46 - 20;
    function nextLevelThreshold(val) {
      for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
        if (val < LEVEL_THRESHOLDS[i]) return LEVEL_THRESHOLDS[i];
      }
      return null;
    }
    let nextText;
    if (demoActive) {
      nextText = t('gameOver.nextDemo');
    } else {
      const next = nextLevelThreshold(exp);
      if (next) {
        const remaining = Math.max(0, next - exp);
        nextText = t('gameOver.nextLevel', { remaining });
      } else {
        nextText = t('gameOver.maxLevel');
      }
    }
    const earnedText = (lastEarned > 0 || lastExpEarned > 0)
      ? t('gameOver.earned', { money: lastEarned, exp: lastExpEarned })
      : t('gameOver.earnedHint');
    // Next Target line with Score font size (12px)
    g.font = `12px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(nextText, CONFIG.width / 2, y0);
    // Other lines with default small font (10px)
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    // EXP and $ in one line
    g.fillText(t('gameOver.stats', { exp, savings }), CONFIG.width / 2, y0 + 32);
    // Earn explanation three lines below
    g.fillText(earnedText, CONFIG.width / 2, y0 + 80);
    if (rouletteSummary) {
      const opSymbol = rouletteSummary.op === 'x' ? '×' : rouletteSummary.op;
      g.fillText(t('gameOver.rouletteResult', {
        before: rouletteSummary.before,
        op: opSymbol,
        value: rouletteSummary.value,
        after: rouletteSummary.after,
      }), CONFIG.width / 2, y0 + 96);
    } else if (rouletteState && rouletteState.active && rouletteState.finalOp != null) {
      const opSymbol = rouletteState.finalOp === 'x' ? '×' : rouletteState.finalOp;
      g.fillText(t('gameOver.roulettePending', { op: opSymbol, value: rouletteState.finalValue }), CONFIG.width / 2, y0 + 96);
    }
  }

  // Level-up popup when level increased this game over
  if (gameOverLevelUp) {
    const cx = CONFIG.width / 2;
    const cy = CONFIG.height * 0.22 - 20;
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `12px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(t('gameOver.levelUp', { level: gameOverLevelUp.to }), cx, cy);
  }
  const wait = CONFIG.gameOverWait || 5.0;
  const rem = Math.max(0, wait - gameOverTimer);
  if (rem > 0) {
    // Countdown until retry is enabled
    const sec = Math.ceil(rem);
    drawCenteredText(g, t('gameOver.retryCountdown', { seconds: sec }), CONFIG.height * 0.74 - 20, 10, '#b4c0d9');
  } else {
    drawCenteredText(g, t('gameOver.retryReady'), CONFIG.height * 0.74 - 20, 10, '#b4c0d9');
    // Shop buttons (Level >= 2)
    const lvl = getLevelByExp(exp);
    if (lvl >= 2) {
      const bw = 100, bh = 36;
      const spacing = 10;
      const totalWidth = bw * 2 + spacing;
      const startX = (CONFIG.width - totalWidth) / 2;
      const by = CONFIG.height * 0.80;
      
      // ITEMS button
      const itemsBx = startX;
      g.fillStyle = '#22334a';
      g.strokeStyle = '#b4c0d9';
      g.lineWidth = 2;
      g.fillRect(itemsBx, by, bw, bh);
      g.strokeRect(itemsBx, by, bw, bh);
      g.fillStyle = '#ffffff';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
      g.fillText(t('common.items'), itemsBx + bw/2, by + bh/2 + 1);
      
      // CHARS button
      const charsBx = startX + bw + spacing;
      g.fillStyle = '#22334a';
      g.fillRect(charsBx, by, bw, bh);
      g.strokeStyle = '#b4c0d9';
      g.strokeRect(charsBx, by, bw, bh);
      g.fillStyle = '#ffffff';
      g.fillText(t('common.chars'), charsBx + bw/2, by + bh/2 + 1);

      // Fast mode toggle (Level >= 8)
      if (lvl >= 8) {
        const bw = 160, bh = 24;
        const bx = (CONFIG.width - bw) / 2;
        const by = CONFIG.height * 0.80 + 80; // moved down by 30px
        g.fillStyle = fastModeEnabled ? '#4a6e33' : '#22334a';
        g.strokeStyle = '#b4c0d9';
        g.lineWidth = 2;
        g.fillRect(bx, by, bw, bh);
        g.strokeRect(bx, by, bw, bh);
        g.fillStyle = '#ffffff';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.font = `10px "Press Start 2P", monospace`;
        g.fillText(t('game.fastToggle', { state: commonText(fastModeEnabled ? 'on' : 'off') }), bx + bw/2, by + bh/2 + 1);
      }
    }
  }
}

// Main loop with fixed timestep physics
let last = performance.now();
let acc = 0;
const dt = 1 / 120; // physics step

async function start() {
  await Fonts.load();
  // Load tuning then apply
  tuning = loadTuningLocal(tuning);
  await maybeLoadTuningFromServer();
  applyTuningToConfig(CONFIG, tuning);
  setupDebugUI(tuning, () => applyTuningToConfig(CONFIG, tuning), () => saveTuningLocal(tuning));
  // Keep panel hidden until toggled by V
  const dbg = document.getElementById('debug-panel'); if (dbg) dbg.hidden = !DEBUG;
  // Load savings and EXP from localStorage
  try {
    const rawBest = localStorage.getItem(BEST_SCORE_KEY);
    if (rawBest) {
        const val = parseInt(rawBest, 10);
        if (!Number.isNaN(val)) best = Math.max(0, val);
    }
    const rawSav = localStorage.getItem(SAVINGS_KEY);
    if (rawSav) {
      const val = parseInt(rawSav, 10);
      if (!Number.isNaN(val)) savings = Math.max(0, val);
    }
    const rawExp = localStorage.getItem(EXP_KEY);
    if (rawExp) {
      const v = parseInt(rawExp, 10);
      if (!Number.isNaN(v)) exp = Math.max(0, v);
    } else if (savings > 0) {
      // Migration: if EXP not set, seed EXP with previous savings
      exp = savings;
      localStorage.setItem(EXP_KEY, String(exp));
    }
    const demoDone = localStorage.getItem(DEMO_DONE_KEY) === '1';
    
    // Load selected character
    const savedChar = localStorage.getItem('webswing_selected_char_v1');
    if (savedChar && PIXEL_CHARACTERS[savedChar]) {
      selectedCharacter = savedChar;
    }
    if (selectedCharacter === 'bird' && !shopInv.fly) {
      selectedCharacter = 'default';
      try { localStorage.setItem('webswing_selected_char_v1', 'default'); } catch (_) {}
    }
    if (!demoDone) {
      demoActive = true;
      if (savings < 100) {
        savings = 100;
        localStorage.setItem(SAVINGS_KEY, String(savings));
      }
    }
  } catch (_) {}
  // Load shop inventory
  shopInv = loadShopInv(shopInv);
  // Demo mode: grant EXP and equip core items so the character looks different
  if (demoActive) {
    try {
      if (exp < 100) {
        exp = 100;
        localStorage.setItem(EXP_KEY, String(exp));
      }
    } catch(_){}
    // Equip Glow, +Jump, Fly during demo
    shopInv.glowLevel = 1;
    shopInv.plusJump = true;
    shopInv.fly = true;
    saveShopInv(shopInv);
  }
  requestAnimationFrame(tick);
}

function tick(now) {
  const elapsed = Math.min(0.05, (now - last) / 1000);
  last = now;
  acc += elapsed;

  // Clear
  ctx.clearRect(0, 0, CONFIG.width, CONFIG.height);

  // Update with fixed dt
  while (acc >= dt) {
    if (State.current === 'intro') updateIntro(dt);
    else if (State.current === 'run') updateRun(dt);
    else if (State.current === 'gameover') updateGameOver(dt);
    else if (State.current === 'shop') updateShop(dt);
    else if (State.current === 'boss_pending') updateBossPending(dt);
    else if (State.current === 'boss') updateBoss(dt);
    acc -= dt;
    Input.endFrame();
  }
  webRopeJustCreated = false;
    // Render
  if (State.current === 'intro') renderIntro(ctx, now / 1000);
  else if (State.current === 'run') renderRun(ctx);
  else if (State.current === 'gameover') renderGameOver(ctx);
  else if (State.current === 'shop') renderShop(ctx);
  else if (State.current === 'boss_pending') renderRun(ctx);
  else if (State.current === 'boss') renderBoss(ctx);

  requestAnimationFrame(tick);
}

// Notes for next steps:
// - Add Rope class (anchor, L, A, omega, phase) and single-rope attach/detach.
// - Then implement multi-rope spawner with reachability guarantee.
// Shop item definitions provided via external spec
const SHOP_ITEMS = (typeof window !== 'undefined' ? window.ITEM_SPECS : undefined) || [];
const SHOP_ITEM_ORDER = new Map(SHOP_ITEMS.map((item, idx) => [item, idx]));
const ITEM_ART = (typeof window !== 'undefined' ? window.ITEM_ART : undefined) || {};

function getAllItemsSorted() {
  return sortItemsByMinLevel(SHOP_ITEMS);
}

function unlockInfoForItem(item) {
  if (!item) return { type: 'level', value: 1 };
  return item.unlock || { type: 'level', value: item.minLevel || 1 };
}

function isItemSpecialUnlocked(item, unlockInfo = unlockInfoForItem(item)) {
  if (!unlockInfo || unlockInfo.type !== 'special') return true;
  const key = unlockInfo.key || item.id;
  const specials = shopInv.specialUnlocks || [];
  if (Array.isArray(specials)) return specials.includes(key);
  return Boolean(specials && specials[key]);
}

function itemCardState(item, lvl, currentSavings) {
  const unlock = unlockInfoForItem(item);
  const price = nextPriceForItem(item);
  let levelLocked = false;
  let specialLocked = false;
  let requiredLevel = item.minLevel || 1;
  if (unlock.type === 'level') {
    requiredLevel = unlock.value ?? requiredLevel;
    levelLocked = lvl < requiredLevel;
  } else if (unlock.type === 'special') {
    specialLocked = !isItemSpecialUnlocked(item, unlock);
  }
  const soldOut = isItemSoldOut(item);
  const fundsLocked = !soldOut && !levelLocked && !specialLocked && currentSavings < price;
  return {
    levelLocked,
    specialLocked,
    fundsLocked,
    soldOut,
    price,
    minLevel: requiredLevel,
    locked: levelLocked || specialLocked || fundsLocked,
  };
}

function sortItemsByMinLevel(list) {
  const arr = list.slice();
  arr.sort((a, b) => {
    const minA = Number.isFinite(a?.minLevel) ? a.minLevel : 1;
    const minB = Number.isFinite(b?.minLevel) ? b.minLevel : 1;
    if (minA !== minB) return minA - minB;
    const orderA = SHOP_ITEM_ORDER.get(a) ?? Number.MAX_SAFE_INTEGER;
    const orderB = SHOP_ITEM_ORDER.get(b) ?? Number.MAX_SAFE_INTEGER;
    return orderA - orderB;
  });
  return arr;
}

function availableItems(level = getLevelByExp(exp)) {
  return getAllItemsSorted().filter((it) => {
    const unlock = unlockInfoForItem(it);
    if (unlock.type === 'level') {
      const required = unlock.value ?? it.minLevel ?? 1;
      return level >= required;
    }
    if (unlock.type === 'special') {
      return isItemSpecialUnlocked(it, unlock);
    }
    return true;
  });
}

function getItemSprite(id) {
  return ITEM_ART[id] || null;
}

function getItemLevel(it) {
  if (it.type === 'consumable') {
    return (shopInv.consumables && shopInv.consumables[it.id]) || 0;
  }
  if (it.id === 'buds') return shopInv.budsLevel || 0;
  if (it.id === 'glow') return shopInv.glowLevel || 0;
  if (it.id === 'plusjump') return shopInv.plusJump ? 1 : 0;
  if (it.id === 'fly') return shopInv.fly ? 1 : 0;
  if (it.id === 'big') return shopInv.bigLevel || 0;
  if (it.id === 'magnet') return shopInv.magnetLevel || 0;
  if (it.id === 'combo') return shopInv.comboLevel || 0;
  if (it.id === 'double') return shopInv.double ? 1 : 0;
  if (it.id === 'lucky') return shopInv.luckyLevel || 0;
  if (it.id === 'fever') return shopInv.feverLevel || 0;
  return 0;
}
function currentBodySides() {
  const lvl = getLevelByExp(exp);
  if (lvl <= 1) return 0;
  const groupIdx = Math.floor((lvl - 2) / 3);
  return 3 + Math.max(0, groupIdx);
}
function isItemSoldOut(it) {
  if (it.type === 'consumable') {
    const count = (shopInv.consumables && shopInv.consumables[it.id]) || 0;
    return count >= 1;
  }
  if (it.type === 'single') return getItemLevel(it) >= 1;
  if (it.type === 'level') {
    // dynamic caps by item
    let maxLv;
    if (it.id === 'buds') maxLv = currentBodySides();
    else if (it.id === 'big') maxLv = getLevelByExp(exp);
    else maxLv = it.maxLevel || 1;
    return getItemLevel(it) >= maxLv;
  }
  return false;
}

function nextPriceForItem(it) {
  if (it.type !== 'level') return it.price;
  const lvl = getItemLevel(it);
  // Big: 20$, 30$, 40$... per purchase
  if (it.id === 'big') return 20 + 10 * lvl;
  // Glow, Magnet, Combo+, Slow, Lucky, Fever+: flat price per level
  return it.price;
}

function shopGrid() {
  const cols = 2;
  const cellW = CONFIG.width / cols;
  const cellH = ITEM_CARD_HEIGHT;
  const marginX = 20;
  const top = CONFIG.height * 0.12 + 50;
  const paddingTop = ITEM_CARD_PADDING_TOP;
  const paddingBottom = ITEM_CARD_PADDING_BOTTOM;
  const gap = ITEM_CARD_VERTICAL_GAP;
  return { cols, cellW, cellH, marginX, top, paddingTop, paddingBottom, gap };
}

function shopHelpRect() { return lastShopHelpRect; }

function renderCharacterShop(g) {
  currentItemPageEntries = [];
  // Character shop UI
  const titleY = CONFIG.height * 0.12;
  const charactersTitle = t('shop.charactersTitle');
  drawCenteredText(g, charactersTitle, titleY, 14);
  
  const lvl = getLevelByExp(exp);
  const charInv = shopInv.characters || [];

  // Show $ at top-right
  g.fillStyle = '#ffffff';
  g.textAlign = 'right';
  g.textBaseline = 'top';
  g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
  g.fillText(t('shop.balance', { amount: savings }), CONFIG.width - 12, titleY + 24);

  const showShopMsg = shopMsg && shopMsgTimer > 0 && (!shopConfirm || shopConfirm.type === 'character');
  if (showShopMsg) {
    g.textAlign = 'center';
    g.textBaseline = 'top';
    g.fillStyle = '#ff6666';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(shopMsg, CONFIG.width / 2, titleY - 50);
  }
  
  // Help button '?' for character shop
  {
    g.font = `14px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    const tw = g.measureText(charactersTitle).width;
    const cx = CONFIG.width / 2;
    const left = cx - tw / 2;
    const w = 20, h = 20;
    const x = Math.floor(left + tw + 20);
    const y = Math.floor(titleY - h / 2);
    lastShopHelpRect = { x, y, w, h };
    g.fillStyle = '#22334a';
    g.strokeStyle = '#b4c0d9';
    g.lineWidth = 2;
    g.fillRect(x, y, w, h);
    g.strokeRect(x, y, w, h);
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText('?', x + w/2, y + h/2 + 1);
  }
  
  // Character grid (pagination)
  const chars = visibleCharacters();
  const cols = 2;
  const cellW = CONFIG.width / cols;
  const cellH = CHAR_CARD_CELL_H;
  const marginX = 20;
  const top = titleY + 50;
  const gap = CHAR_CARD_VERTICAL_GAP;
  const rowsPerPage = CHAR_CARD_ROWS_PER_PAGE;
  const itemsPerPage = cols * rowsPerPage;
  shopCharTotalPages = Math.max(1, Math.ceil(chars.length / itemsPerPage));
  if (shopCharPage >= shopCharTotalPages) shopCharPage = shopCharTotalPages - 1;
  if (shopCharPage < 0) shopCharPage = 0;
  const startIdx = shopCharPage * itemsPerPage;
  const endIdx = Math.min(chars.length, startIdx + itemsPerPage);
  currentCharacterPageEntries = chars.slice(startIdx, endIdx);

  // Draw character cards for current page
  for (let i = startIdx; i < endIdx; i++) {
    const [id, char] = chars[i];
    const state = characterCardState(id, char, lvl, charInv, savings);
    const local = i - startIdx;
    const row = Math.floor(local / cols);
    const col = local % cols;
    const x = marginX + col * cellW;
    const y = top + row * (cellH + gap);
    const shrink = 3;
    
    // Card background with solid border
    const cardX = x + 6 + shrink;
    const cardW = cellW - 40 - shrink * 2;
    const cardY = y + shrink;
    const cardH = cellH - shrink * 2;
    g.fillStyle = '#0f1a2a';
    g.fillRect(cardX, cardY, cardW, cardH);
    g.save();
    g.strokeStyle = '#8a96ad';
    g.lineWidth = 3;
    g.lineCap = 'butt';
    g.strokeRect(cardX, cardY, cardW, cardH);
    g.restore();

    // Centered layout: 1) Name, 2) Pixel art, 3) Text
    const centerX = cardX + cardW / 2;
    const cardCenterY = cardY + cardH / 2;
    // 1) Name top-centered
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'top';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(characterName(id), centerX, cardY + 6);

    // 2) Pixel art centered
    if (id === 'default') {
      const sides = currentBodySides();
      const radius = 18;
      const centerY = cardCenterY;
      g.fillStyle = '#ffffff';
      if (sides === 0) { g.beginPath(); g.arc(centerX, centerY, radius, 0, Math.PI * 2); g.fill(); }
      else {
        g.beginPath();
        for (let k = 0; k <= sides; k++) {
          const angle = (k / sides) * Math.PI * 2 - Math.PI / 2;
          const vx = centerX + Math.cos(angle) * radius;
          const vy = centerY + Math.sin(angle) * radius;
          if (k === 0) g.moveTo(vx, vy); else g.lineTo(vx, vy);
        }
        g.closePath(); g.fill();
      }
    } else {
      const pixScale = 4;
      const artW = (char.pixels[0]?.length || 8) * pixScale;
      const artH = (char.pixels.length || 8) * pixScale;
      const ox = Math.floor(centerX - artW / 2);
      const oy = Math.floor(cardCenterY - artH / 2);
      char.pixels.forEach((row, ry) => {
        row.forEach((pixel, rx) => {
          if (pixel) {
            g.fillStyle = char.colors[pixel - 1] || '#ffffff';
            g.fillRect(ox + rx * pixScale, oy + ry * pixScale, pixScale, pixScale);
          }
        });
      });
    }

    // Locked overlay (drawn after artwork to dim card)
    if (state.locked) {
      g.save();
      g.fillStyle = 'rgba(8, 12, 20, 0.78)';
      g.fillRect(cardX, cardY, cardW, cardH);
      if (state.levelLocked) {
        g.translate(centerX, cardY + cardH / 2);
        g.rotate(-Math.PI / 6);
        g.fillStyle = '#ff5c5c';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.font = `18px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
        g.fillText(t('shop.lockTag', { level: state.minLevel }), 0, 0);
      }
      g.restore();
    }

    // 3) Text bottom-centered (owned/price/state)
    const isSelected = selectedCharacter === id;
    g.textAlign = 'center';
    g.textBaseline = 'bottom';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    if (state.owned) {
      if (isSelected) {
        g.fillStyle = '#ffff88';
        g.fillText(t('shop.selected'), centerX, cardY + cardH - 6);
      } else {
        g.fillStyle = '#88ff88';
        g.fillText(t('shop.owned'), centerX, cardY + cardH - 6);
      }
    } else if (state.locked) {
      g.fillStyle = '#ffb0b0';
      const footText = state.levelLocked
        ? t('shop.lockedLevel', { level: state.minLevel })
        : t('shop.lockedFunds', { amount: state.price });
      g.fillText(footText, centerX, cardY + cardH - 6);
    } else {
      g.fillStyle = '#ffffff';
      g.fillText(t('shop.price', { amount: char.price }), centerX, cardY + cardH - 6);
    }
  }

  // Pagination UI for character shop
  const byPag = CONFIG.height - 60 - 18 - 20;
  const indicator = `${shopCharPage + 1}/${shopCharTotalPages}`;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffffff';
  g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
  g.fillText(indicator, CONFIG.width/2, byPag);
  const btnW = 36, btnH = 36; const offset = 60;
  const leftX = Math.floor(CONFIG.width/2 - offset - btnW/2);
  const rightX = Math.floor(CONFIG.width/2 + offset - btnW/2);
  if (shopCharPage > 0) {
    g.fillStyle = '#22334a'; g.strokeStyle = '#b4c0d9'; g.lineWidth = 2;
    g.fillRect(leftX, byPag - btnH/2, btnW, btnH); g.strokeRect(leftX, byPag - btnH/2, btnW, btnH);
    g.fillStyle = '#ffffff'; g.fillText('<', leftX + btnW/2, byPag);
  }
  if (shopCharPage < shopCharTotalPages - 1) {
    g.fillStyle = '#22334a'; g.strokeStyle = '#b4c0d9'; g.lineWidth = 2;
    g.fillRect(rightX, byPag - btnH/2, btnW, btnH); g.strokeRect(rightX, byPag - btnH/2, btnW, btnH);
    g.fillStyle = '#ffffff'; g.fillText('>', rightX + btnW/2, byPag);
  }
  
  // Buttons at bottom
  const bw = 100, bh = 36;
  const spacing = 10;
  const totalWidth = bw * 2 + spacing;
  const startX = (CONFIG.width - totalWidth) / 2;
  const by = CONFIG.height - 60;
  
  // BACK button
  g.fillStyle = '#22334a';
  g.strokeStyle = '#b4c0d9';
  g.lineWidth = 2;
  g.fillRect(startX, by, bw, bh);
  g.strokeRect(startX, by, bw, bh);
  g.fillStyle = '#ffffff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
  g.fillText(t('common.back'), startX + bw/2, by + bh/2 + 1);
  
  // ITEMS button  
  const itemsX = startX + bw + spacing;
  g.fillStyle = '#22334a';
  g.fillRect(itemsX, by, bw, bh);
  g.strokeStyle = '#b4c0d9';
  g.strokeRect(itemsX, by, bw, bh);
  g.fillStyle = '#ffffff';
  g.fillText(t('common.items'), itemsX + bw/2, by + bh/2 + 1);
  
  // Character purchase/selection confirmation
  if (shopConfirm && shopConfirm.type === 'character') {
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fillRect(0, 0, CONFIG.width, CONFIG.height);
    const pw = CONFIG.width * 0.88, ph = 112;
    const px = (CONFIG.width - pw)/2, py = CONFIG.height * 0.40;
    g.fillStyle = '#0f1a2a';
    g.strokeStyle = '#b4c0d9';
    g.lineWidth = 2;
    g.fillRect(px, py, pw, ph);
    g.strokeRect(px, py, pw, ph);
    
    const char = PIXEL_CHARACTERS[shopConfirm.id];
    if (!char) {
      shopConfirm = null;
      return;
    }
    const charInv = shopInv.characters || [];
    const isPurchased = charInv.includes(shopConfirm.id) || shopConfirm.id === 'default';
    
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'top';
    g.font = `12px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    
    if (isPurchased) {
      g.fillText(t('shop.confirmSelectCharacter', { name: characterName(shopConfirm.id) }), px + pw/2, py + 20);
    } else {
      g.fillText(t('shop.confirmPurchase', { name: characterName(shopConfirm.id), amount: char.price }), px + pw/2, py + 10);
    }
    g.font = `8px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(t('shop.balance', { amount: savings }), px + pw/2, py + 38);
    
    // YES/NO buttons
    const bw2 = 78, bh2 = 26;
    const gapB = 12;
    const by2 = py + ph - 36;
    const bx2 = px + pw/2 - bw2 - gapB;
    const bx3 = px + pw/2 + gapB;
    
    g.fillStyle = '#22334a';
    g.fillRect(bx2, by2, bw2, bh2);
    g.strokeRect(bx2, by2, bw2, bh2);
    g.fillRect(bx3, by2, bw2, bh2);
    g.strokeRect(bx3, by2, bw2, bh2);
    
    g.fillStyle = '#ffffff';
    g.textBaseline = 'middle';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(t('common.yes'), bx2 + bw2/2, by2 + bh2/2);
    g.fillText(t('common.no'), bx3 + bw2/2, by2 + bh2/2);
  }
  
  // Help popup for character shop (pagination, no scroll)
  if (shopHelp) {
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fillRect(0, 0, CONFIG.width, CONFIG.height);
    const pw = CONFIG.width * 0.86;
    const phBase = Math.min(320, CONFIG.height * 0.65);
    const ph = Math.min(phBase + 60, CONFIG.height - 20); // taller to fit close hint
    const px = (CONFIG.width - pw)/2, py = CONFIG.height * 0.18;
    g.fillStyle = '#0f1a2a';
    g.strokeStyle = '#b4c0d9';
    g.lineWidth = 2;
    g.fillRect(px, py, pw, ph);
    g.strokeRect(px, py, pw, ph);
    
    // Title
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'top';
    g.font = `12px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(t('shop.characterInfoTitle'), px + pw/2, py + 10);
    // Content area (no scroll)
    const contentY = py + 35;
    const contentBottom = py + ph - 70;
    const contentH = contentBottom - contentY;
    const chars = (currentCharacterPageEntries && currentCharacterPageEntries.length) ? currentCharacterPageEntries : visibleCharacters();
    const entriesPerPage = 5;
    const totalPages = Math.max(1, Math.ceil(chars.length / entriesPerPage));
    // reuse helpPage/helpTotalPages for consistency when switching menus
    helpTotalPages = totalPages;
    if (helpPage >= helpTotalPages) helpPage = helpTotalPages - 1;
    if (helpPage < 0) helpPage = 0;
    const start = helpPage * entriesPerPage;
    const end = Math.min(chars.length, start + entriesPerPage);
    const lineHeight = 14;
    const entryH = 50;
    let yPos = contentY + 5;
    g.textAlign = 'left';
    g.textBaseline = 'top';
    for (let i = start; i < end; i++) {
      const [id, char] = chars[i];
      // Name
      g.fillStyle = '#fffa75';
      g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
      g.fillText(characterName(id).toUpperCase(), px + 10, yPos);
      // Price/owned/locked state
      const state = characterCardState(id, char, lvl, charInv, savings);
      if (state.owned) {
        g.fillStyle = '#88ff88';
        g.fillText(t('shop.ownedTag'), px + pw - 80, yPos);
      } else if (state.levelLocked) {
        g.fillStyle = '#ff8888';
        g.fillText(t('shop.levelTag', { level: state.minLevel }), px + pw - 80, yPos);
      } else if (state.fundsLocked) {
        g.fillStyle = '#ffb0b0';
        g.fillText(t('shop.price', { amount: char.price }), px + pw - 80, yPos);
      } else {
        g.fillStyle = '#ffffff';
        g.fillText(t('shop.price', { amount: char.price }), px + pw - 80, yPos);
      }
      // Desc lines (two-line summary)
      g.fillStyle = '#b4c0d9';
      g.font = `8px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
      const summary = t(`chars.${id}.help`);
      const descLines = String(summary || '').split('\n');
      let descY = yPos + lineHeight;
      const baseGap = 10;
      for (const line of descLines) {
        g.fillText(line, px + 10, descY);
        descY += lineAdvance(baseGap, line);
      }
      yPos += entryH;
      if (yPos > contentY + contentH - 10) break;
    }
    // Pagination controls for char help
    const byH = py + ph - 44;
    const indicatorH = `${helpPage + 1}/${helpTotalPages}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#ffffff';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(indicatorH, px + pw/2, byH);
    const btnW = 18, btnH = 18;
    const tw2 = g.measureText(indicatorH).width;
    const gapBtn2 = 8;
    const leftHX = Math.floor(px + pw/2 - tw2/2 - gapBtn2 - btnW);
    const rightHX = Math.floor(px + pw/2 + tw2/2 + gapBtn2);
    if (helpPage > 0) { g.fillStyle = '#22334a'; g.strokeStyle = '#b4c0d9'; g.lineWidth = 2; g.fillRect(leftHX, byH - btnH/2, btnW, btnH); g.strokeRect(leftHX, byH - btnH/2, btnW, btnH); g.fillStyle = '#ffffff'; g.fillText('<', leftHX + btnW/2, byH); }
    if (helpPage < helpTotalPages - 1) { g.fillStyle = '#22334a'; g.strokeStyle = '#b4c0d9'; g.lineWidth = 2; g.fillRect(rightHX, byH - btnH/2, btnW, btnH); g.strokeRect(rightHX, byH - btnH/2, btnW, btnH); g.fillStyle = '#ffffff'; g.fillText('>', rightHX + btnW/2, byH); }

    // Close hint
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#b4c0d9';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(t('common.clickOutsideToClose'), px + pw/2, py + ph - 18);
  }
}

function renderShop(g) {
  currentCharacterPageEntries = [];
  // backdrop
  g.fillStyle = 'rgba(0,0,0,0.6)';
  g.fillRect(0, 0, CONFIG.width, CONFIG.height);
  
  // Render based on shop mode
  if (shopMode === 'chars') {
    renderCharacterShop(g);
    return;
  }
  
  // Original item shop
  const titleY = CONFIG.height * 0.12;
  const itemsTitle = t('shop.itemsTitle');
  drawCenteredText(g, itemsTitle, titleY, 14);
  const showShopMsg = shopMsg && shopMsgTimer > 0 && (!shopConfirm || shopConfirm.type === 'item');
  if (showShopMsg) {
    g.textAlign = 'center';
    g.textBaseline = 'top';
    g.fillStyle = '#ff6666';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(shopMsg, CONFIG.width / 2, titleY - 50);
  }
  // Show $ at top-right, two lines below the SHOP title
  {
    const headerY = CONFIG.height * 0.12;
    g.fillStyle = '#ffffff';
    g.textAlign = 'right';
    g.textBaseline = 'top';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(t('shop.balance', { amount: savings }), CONFIG.width - 12, headerY + 24);
  }
  // Help button '?' positioned 20px to the right of the SHOP title
  {
    // measure SHOP text width to place the '?' with 20px gap
    g.font = `14px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    const tw = g.measureText(itemsTitle).width;
    const cx = CONFIG.width / 2;
    const left = cx - tw / 2;
    const w = 20, h = 20;
    const x = Math.floor(left + tw + 20);
    const y = Math.floor(titleY - h / 2);
    lastShopHelpRect = { x, y, w, h };
    g.fillStyle = '#22334a';
    g.strokeStyle = '#b4c0d9';
    g.lineWidth = 2;
    g.fillRect(x, y, w, h);
    g.strokeRect(x, y, w, h);
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText('?', x + w/2, y + h/2 + 1);
  }
  const { cols, cellW, cellH, marginX, top, gap } = shopGrid();
  const lvl = getLevelByExp(exp);
  const allItems = getAllItemsSorted();
  const rowsPerPage = CHAR_CARD_ROWS_PER_PAGE;
  const itemsPerPage = cols * rowsPerPage + ITEM_CARD_EXTRA_PER_PAGE;
  shopItemTotalPages = Math.max(1, Math.ceil(allItems.length / itemsPerPage));
  if (shopItemPage >= shopItemTotalPages) shopItemPage = shopItemTotalPages - 1;
  if (shopItemPage < 0) shopItemPage = 0;
  const startIdx = shopItemPage * itemsPerPage;
  const endIdx = Math.min(allItems.length, startIdx + itemsPerPage);
  currentItemPageEntries = allItems.slice(startIdx, endIdx);
  for (let i = startIdx; i < endIdx; i++) {
    const local = i - startIdx;
    const r = Math.floor(local / cols);
    const c = local % cols;
    const shrink = 3;
    const cardX = marginX + c * cellW + 6 + shrink;
    const cardY = top + r * (cellH + gap) + shrink;
    const cardW = cellW - 40 - shrink * 2;
    const cardH = cellH - shrink * 2;
    const centerX = cardX + cardW / 2;

    // card background with solid border
    g.fillStyle = '#0f1a2a';
    g.fillRect(cardX, cardY, cardW, cardH);
    g.save();
    g.strokeStyle = '#8a96ad';
    g.lineWidth = 3;
    g.lineCap = 'butt';
    g.strokeRect(cardX, cardY, cardW, cardH);
    g.restore();
    // content
    const state = itemCardState(allItems[i], lvl, savings);

    // 1) Name top-centered
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'top';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(itemName(allItems[i]), centerX, cardY + 6);
    // 2) Price (top-right inside card)
    g.textAlign = 'right';
    g.fillStyle = '#ffffff';
    const priceText = t('shop.price', { amount: state.price });
    g.fillText(priceText, cardX + cardW - 8, cardY + 20);
    // 3) Pixel art icon (center)
    const sprite = getItemSprite(allItems[i].id);
    if (sprite && sprite.pixels && sprite.pixels.length && sprite.pixels[0]) {
      const rows = sprite.pixels.length;
      const cols = sprite.pixels[0].length;
      const availableW = Math.max(8, cardW - 24);
      const availableH = Math.max(8, cardH * 0.45);
      let scale = Math.floor(Math.min(availableW / cols, availableH / rows));
      if (!Number.isFinite(scale) || scale < 1) scale = 1;
      const spriteCx = centerX;
      const spriteCy = cardY + cardH * 0.55;
      drawPixelSprite(g, spriteCx, spriteCy, sprite, scale);
    } else {
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `12px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
      g.fillText('?', centerX, cardY + Math.floor(cardH * 0.60));
    }
    // Lock overlays
    if (state.levelLocked || state.specialLocked) {
      g.save();
      g.fillStyle = 'rgba(8,12,20,0.78)';
      g.fillRect(cardX, cardY, cardW, cardH);
      g.translate(centerX, cardY + cardH / 2);
      g.rotate(-Math.PI / 6);
      g.fillStyle = state.levelLocked ? '#ff5c5c' : '#f7b731';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `18px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
      const bannerText = state.levelLocked ? t('shop.lockTag', { level: state.minLevel }) : t('shop.specialTag');
      g.fillText(bannerText, 0, 0);
      g.restore();
    }
    // sold out overlay
    if (state.soldOut) {
      g.fillStyle = 'rgba(0,0,0,0.5)';
      g.fillRect(cardX, cardY, cardW, cardH);
      g.textAlign = 'center';
      g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
      if (allItems[i].type === 'single' || allItems[i].type === 'consumable') {
        g.fillStyle = '#ff6666';
        g.fillText(t('shop.soldOut'), centerX, cardY + cardH / 2 + 2);
      } else {
        g.fillStyle = '#a6ffc1';
        g.fillText(t('shop.maxed'), centerX, cardY + cardH / 2 + 2);
      }
      g.fillStyle = '#ffffff';
    }

    // 4) Status / level line
    g.textAlign = 'center';
    g.textBaseline = 'bottom';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    if (state.specialLocked) {
      g.fillStyle = '#f7b731';
      g.fillText(t('shop.lockedSpecial'), centerX, cardY + cardH - 6);
    } else if (state.levelLocked) {
      g.fillStyle = '#ff6666';
      g.fillText(t('shop.lockedLevel', { level: state.minLevel }), centerX, cardY + cardH - 6);
    } else if (state.fundsLocked) {
      g.fillStyle = '#f7b731';
      g.fillText(t('shop.lockedFunds', { amount: state.price }), centerX, cardY + cardH - 6);
    } else {
      g.fillStyle = '#ffffff';
      const lvVal = getItemLevel(allItems[i]);
      g.fillText(t('shop.itemLevel', { level: lvVal }), centerX, cardY + cardH - 6);
    }
    g.fillStyle = '#ffffff';
  }
  // Pagination UI: < 1/N > (move 30px up and double button size)
  const byPag = CONFIG.height - 60 - 18 - 20;
  const indicator = `${shopItemPage + 1}/${shopItemTotalPages}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#ffffff';
  g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
  g.fillText(indicator, CONFIG.width/2, byPag);
  const btnW = 36, btnH = 36;
  const offset = 60;
  const leftX = Math.floor(CONFIG.width/2 - offset - btnW/2);
  const rightX = Math.floor(CONFIG.width/2 + offset - btnW/2);
  // Draw buttons only when applicable (click areas were registered in buildShopCards)
  if (shopItemPage > 0) {
    g.fillStyle = '#22334a';
    g.strokeStyle = '#b4c0d9';
    g.lineWidth = 2;
    g.fillRect(leftX, byPag - btnH/2, btnW, btnH);
    g.strokeRect(leftX, byPag - btnH/2, btnW, btnH);
    g.fillStyle = '#ffffff';
    g.fillText('<', leftX + btnW/2, byPag);
  }
  if (shopItemPage < shopItemTotalPages - 1) {
    g.fillStyle = '#22334a';
    g.strokeStyle = '#b4c0d9';
    g.lineWidth = 2;
    g.fillRect(rightX, byPag - btnH/2, btnW, btnH);
    g.strokeRect(rightX, byPag - btnH/2, btnW, btnH);
    g.fillStyle = '#ffffff';
    g.fillText('>', rightX + btnW/2, byPag);
  }
  // Bottom buttons (START GAME and CHARS)
  const bw = 100, bh = 36;
  const spacing = 10;
  const totalWidth = bw * 2 + spacing;
  const startX = (CONFIG.width - totalWidth) / 2;
  const by = CONFIG.height - 60;
  
  // BACK button
  g.fillStyle = '#22334a';
  g.strokeStyle = '#b4c0d9';
  g.lineWidth = 2;
  g.fillRect(startX, by, bw, bh);
  g.strokeRect(startX, by, bw, bh);
  g.fillStyle = '#ffffff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
  g.fillText(t('common.back'), startX + bw/2, by + bh/2 + 1);
  
  // CHARS button
  const charsX = startX + bw + spacing;
  g.fillStyle = '#22334a';
  g.fillRect(charsX, by, bw, bh);
  g.strokeStyle = '#b4c0d9';
  g.strokeRect(charsX, by, bw, bh);
  g.fillStyle = '#ffffff';
  g.fillText(t('common.chars'), charsX + bw/2, by + bh/2 + 1);

  // Confirm popup
  if (shopConfirm) {
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fillRect(0, 0, CONFIG.width, CONFIG.height);
    const pw = CONFIG.width * 0.88, ph = 112;
    const px = (CONFIG.width - pw)/2, py = CONFIG.height * 0.40;
    g.fillStyle = '#0f1a2a';
    g.strokeStyle = '#b4c0d9';
    g.lineWidth = 2;
    g.fillRect(px, py, pw, ph);
    g.strokeRect(px, py, pw, ph);
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'top';
    g.font = `12px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    const confirmedItem = SHOP_ITEMS.find(x => x.id === shopConfirm.id);
    const itName = confirmedItem ? itemName(confirmedItem) : shopConfirm.id;
    g.fillText(t('shop.confirmPurchase', { name: itName, amount: shopConfirm.price }), px + pw/2, py + 10);
    // Current $ centered two lines below, font 2px smaller
    g.textAlign = 'center';
    g.font = `8px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(t('shop.balance', { amount: savings }), px + pw/2, py + 38);
    // Message (e.g., insufficient funds)
    if (shopMsg && shopMsgTimer > 0) {
      g.textAlign = 'center';
      g.fillStyle = '#ff6666';
      g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
      g.fillText(shopMsg, px + pw/2, py + 50);
      g.fillStyle = '#ffffff';
    }
    // buttons
    const bw2 = 78, bh2 = 26;
    const gapB = 12;
    const by2 = py + ph - 36;
    const bx2 = px + pw/2 - bw2 - gapB;
    const bx3 = px + pw/2 + gapB;
    // Buttons (YES/NO). If showing message (e.g., insufficient), disable YES and keep NO active
    const showingMsg = !!(shopMsg && shopMsgTimer > 0);
    // YES button
    g.fillStyle = showingMsg ? '#1a2739' : '#22334a';
    g.fillRect(bx2, by2, bw2, bh2); g.strokeRect(bx2, by2, bw2, bh2);
    // NO button
    g.fillStyle = '#22334a';
    g.fillRect(bx3, by2, bw2, bh2); g.strokeRect(bx3, by2, bw2, bh2);
    // button labels centered
    g.fillStyle = showingMsg ? '#8a98ad' : '#ffffff';
    g.textBaseline = 'middle';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(t('common.yes'), bx2 + bw2/2, by2 + bh2/2);
    g.fillStyle = '#ffffff';
    g.fillText(t('common.no'), bx3 + bw2/2, by2 + bh2/2);
  }

  // Help popup (items) with pagination instead of scroll
  if (shopHelp) {
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fillRect(0, 0, CONFIG.width, CONFIG.height);
    const pw = CONFIG.width * 0.86;
    const phBase = Math.min(320, CONFIG.height * 0.65);
    const ph = Math.min(phBase + 90, CONFIG.height - 20);
    const px = (CONFIG.width - pw)/2, py = CONFIG.height * 0.18;
    g.fillStyle = '#0f1a2a';
    g.strokeStyle = '#b4c0d9';
    g.lineWidth = 2;
    g.fillRect(px, py, pw, ph);
    g.strokeRect(px, py, pw, ph);
    
    // Title
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'top';
    g.font = `12px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(t('shop.itemsHelpTitle'), px + pw/2, py + 10);
    
    // Content area (no scroll)
    const contentTop = py + 35;
    const contentBottom = py + ph - 70; // Leave more space for pagination + close hint
    const contentHeight = contentBottom - contentTop;
    
    g.fillStyle = '#ffffff';
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.font = `9px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    const helpItems = (currentItemPageEntries && currentItemPageEntries.length) ? currentItemPageEntries : getAllItemsSorted();
    const leftPad = 10, rightPad = 10, gap = 8;
    let nameColW = 0;
    for (const it of helpItems) {
      const w = g.measureText(itemName(it)).width;
      nameColW = Math.max(nameColW, w);
    }
    nameColW = Math.max(50, Math.min(100, Math.floor(nameColW + 6)));
    const nameRightX = px + leftPad + nameColW;
    const descX = nameRightX + gap;
    const descMaxW = px + pw - rightPad - descX;
    function wrapText(ctx, text, maxW) {
      const words = String(text).split(' ');
      const lines = [];
      let line = '';
      for (const w of words) {
        const test = line ? (line + ' ' + w) : w;
        if (ctx.measureText(test).width <= maxW) line = test; else {
          if (line) lines.push(line);
          line = w;
        }
      }
      if (line) lines.push(line);
      return lines;
    }
    // Fixed items per page for help
    const helpItemsPerPage = 7;
    helpTotalPages = Math.max(1, Math.ceil(helpItems.length / helpItemsPerPage));
    if (helpPage >= helpTotalPages) helpPage = helpTotalPages - 1;
    if (helpPage < 0) helpPage = 0;
    const hs = helpPage * helpItemsPerPage;
    const he = Math.min(helpItems.length, hs + helpItemsPerPage);
    let yy = contentTop + 5;
    for (let i = hs; i < he; i++) {
      const it = helpItems[i];
      const name = itemName(it);
      const desc = itemDescription(it);
      const wrapped = wrapText(g, desc, descMaxW);
      // Name
      g.textAlign = 'right';
      g.fillStyle = '#ffa24d';
      g.fillText(name, nameRightX, yy);
      // Desc
      g.textAlign = 'left';
      g.fillStyle = '#ffffff';
      const baseLine = 14;
      let textY = yy;
      if (wrapped.length === 0) {
        textY += baseLine;
      } else {
        for (const line of wrapped) {
          g.fillText(line, descX, textY);
          textY += lineAdvance(baseLine, line);
        }
      }
      yy = textY + 8;
      if (yy > contentBottom - 14) break;
    }
    // Pagination controls for help
    const byHelp = py + ph - 44;
    const indicatorH = `${helpPage + 1}/${helpTotalPages}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#ffffff';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(indicatorH, px + pw/2, byHelp);
    const btnW = 18, btnH = 18;
    const tw2 = g.measureText(indicatorH).width;
    const gapBtn2 = 8;
    const leftHX = Math.floor(px + pw/2 - tw2/2 - gapBtn2 - btnW);
    const rightHX = Math.floor(px + pw/2 + tw2/2 + gapBtn2);
    if (helpPage > 0) {
      g.fillStyle = '#22334a'; g.strokeStyle = '#b4c0d9'; g.lineWidth = 2;
      g.fillRect(leftHX, byHelp - btnH/2, btnW, btnH); g.strokeRect(leftHX, byHelp - btnH/2, btnW, btnH);
      g.fillStyle = '#ffffff'; g.fillText('<', leftHX + btnW/2, byHelp);
    }
    if (helpPage < helpTotalPages - 1) {
      g.fillStyle = '#22334a'; g.strokeStyle = '#b4c0d9'; g.lineWidth = 2;
      g.fillRect(rightHX, byHelp - btnH/2, btnW, btnH); g.strokeRect(rightHX, byHelp - btnH/2, btnW, btnH);
      g.fillStyle = '#ffffff'; g.fillText('>', rightHX + btnW/2, byHelp);
    }
    
    // Bottom close instruction (outside clipping area)
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#b4c0d9';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(t('common.clickOutsideToClose'), px + pw/2, py + ph - 18);
  }
}

function buildShopCards() {
  uiButtons.shop.cards = [];
  uiButtons.shop.buttons = [];
  
  if (shopMode === 'chars') {
    // Character cards (pagination)
    const chars = visibleCharacters();
    const cols = 2;
    const cellW = CONFIG.width / cols;
    const cellH = CHAR_CARD_CELL_H;
    const marginX = 20;
    const top = CONFIG.height * 0.12 + 50;
    const rowsPerPage = CHAR_CARD_ROWS_PER_PAGE;
    const gapY = CHAR_CARD_VERTICAL_GAP;
    const itemsPerPage = cols * rowsPerPage;
    shopCharTotalPages = Math.max(1, Math.ceil(chars.length / itemsPerPage));
    if (shopCharPage >= shopCharTotalPages) shopCharPage = shopCharTotalPages - 1;
    if (shopCharPage < 0) shopCharPage = 0;
    const startIdx = shopCharPage * itemsPerPage;
    const endIdx = Math.min(chars.length, startIdx + itemsPerPage);
    for (let i = startIdx; i < endIdx; i++) {
      const [id, char] = chars[i];
      const local = i - startIdx;
      const r = Math.floor(local / cols);
      const c = local % cols;
      const shrink = 3;
      const x = marginX + c * cellW + 6 + shrink;
      const baseY = top + r * (cellH + gapY) + shrink;
      const w = cellW - 40 - shrink * 2;
      const h = cellH - shrink * 2;
      const card = new ShopCard(x, baseY, w, h, id, i, 'char');
      card.updateScroll(0);
      uiButtons.shop.cards.push(card);
    }
    // Pagination controls first
    const py = CONFIG.height - 60 - 18 - 20;
    const btnW = 36, btnH = 36; const cx = CONFIG.width / 2; const offset = 60;
    const leftX = Math.floor(cx - offset - btnW/2);
    const rightX = Math.floor(cx + offset - btnW/2);
    if (shopCharPage > 0) uiButtons.shop.buttons.push(new UIButton(leftX, py - btnH/2, btnW, btnH, () => t('pagination.prev'), () => { shopCharPage = Math.max(0, shopCharPage - 1); buildShopCards(); }, 'shop'));
    if (shopCharPage < shopCharTotalPages - 1) uiButtons.shop.buttons.push(new UIButton(rightX, py - btnH/2, btnW, btnH, () => t('pagination.next'), () => { shopCharPage = Math.min(shopCharTotalPages - 1, shopCharPage + 1); buildShopCards(); }, 'shop'));

    // Character shop nav buttons after pagination
    const bw = 86, bh = 26;
    const spacing = 10;
    const totalWidth = bw * 2 + spacing;
    const startX = (CONFIG.width - totalWidth) / 2;
    const by = CONFIG.height - 50;
    uiButtons.shop.buttons.push(new UIButton(startX, by, bw, bh, () => t('common.back'), () => { State.current = previousState; }, 'shop'));
    uiButtons.shop.buttons.push(new UIButton(startX + bw + spacing, by, bw, bh, () => t('common.items'), () => { shopMode = 'items'; shopScroll = 0; shopItemPage = 0; buildShopCards(); }, 'shop'));
  } else {
    // Item cards (pagination)
    const { cols, cellW, cellH, marginX, top, gap } = shopGrid();
    const rowsPerPage = CHAR_CARD_ROWS_PER_PAGE;
    const lvl = getLevelByExp(exp);
    const allItems = getAllItemsSorted();
    const itemsPerPage = cols * rowsPerPage + ITEM_CARD_EXTRA_PER_PAGE;
    shopItemTotalPages = Math.max(1, Math.ceil(allItems.length / itemsPerPage));
    if (shopItemPage >= shopItemTotalPages) shopItemPage = shopItemTotalPages - 1;
    if (shopItemPage < 0) shopItemPage = 0;
    const startIdx = shopItemPage * itemsPerPage;
    const endIdx = Math.min(allItems.length, startIdx + itemsPerPage);
    for (let i = startIdx; i < endIdx; i++) {
      const item = allItems[i];
      const local = i - startIdx;
      const r = Math.floor(local / cols);
      const c = local % cols;
      const shrink = 3;
      const x = marginX + c * cellW + 6 + shrink;
      const baseY = top + r * (cellH + gap) + shrink;
      const w = cellW - 40 - shrink * 2;
      const h = cellH - shrink * 2;
      const card = new ShopCard(x, baseY, w, h, item, i, 'item');
      card.updateScroll(0);
      uiButtons.shop.cards.push(card);
    }

    // Item shop buttons (+ pagination)
    const bw = 100, bh = 36;
    const spacing = 10;
    const totalWidth = bw * 2 + spacing;
    const startX = (CONFIG.width - totalWidth) / 2;
    const by = CONFIG.height - 60;

    // Pagination controls first (so they win in overlap)
    const py = by - 18 - 25; // lowered slightly
    const indicator = `${shopItemPage + 1}/${shopItemTotalPages}`;
    // Compute indicator width roughly (12px font per char)
    const cx = CONFIG.width / 2;
    const btnW = 36, btnH = 36; // slightly smaller buttons
    const offset = 60; // fixed horizontal offset from center
    const leftX = Math.floor(cx - offset - btnW / 2);
    const rightX = Math.floor(cx + offset - btnW / 2);
    // Left button only if not first page
    if (shopItemPage > 0) {
      uiButtons.shop.buttons.push(new UIButton(leftX, py - btnH / 2, btnW, btnH, () => t('pagination.prev'), () => {
        shopItemPage = Math.max(0, shopItemPage - 1);
        buildShopCards();
      }, 'shop'));
    }
    // Right button only if not last page
    if (shopItemPage < shopItemTotalPages - 1) {
      uiButtons.shop.buttons.push(new UIButton(rightX, py - btnH / 2, btnW, btnH, () => t('pagination.next'), () => {
        shopItemPage = Math.min(shopItemTotalPages - 1, shopItemPage + 1);
        buildShopCards();
      }, 'shop'));
    }

    // Navigation buttons after pagination
    uiButtons.shop.buttons.push(new UIButton(startX, by, bw, bh, () => t('common.back'), () => {
      State.current = previousState;
    }, 'shop'));
    uiButtons.shop.buttons.push(new UIButton(startX + bw + spacing, by, bw, bh, () => t('common.chars'), () => {
      shopMode = 'chars';
      shopScroll = 0;
      shopCharPage = 0;
      buildShopCards();
    }, 'shop'));
  }
}

function updateShop(dt) {
  updateStageTransition(dt);
  // Only process if in shop state
  if (State.current !== 'shop') return;
  
  // auto-dismiss message after timer
  if (shopMsgTimer > 0) {
    shopMsgTimer = Math.max(0, shopMsgTimer - dt);
    if (shopMsgTimer === 0) {
      shopMsg = null;
      shopMsgKey = null;
      shopMsgArgs = null;
      shopConfirm = null;
    }
  }
  
  
  // 초기화 또는 모드 변경 시 카드 생성
  if (uiButtons.shop.cards.length === 0) {
    buildShopCards();
  }
  
  // drag scroll disabled for all shops
  
  // Click handling - process on release instead of press
  // 터치 이벤트와 마우스 이벤트 모두 처리
  if (UI.clicked) {
    // 드래그 중이 아닐 때만 클릭으로 처리
    if (!shopDrag.hasMoved) {
      // Help popup toggle/close
    const hr = shopHelpRect();
    if (shopHelp) {
      // When help popup is open, handle pagination or close
      const pw = CONFIG.width * 0.86; const phBase = Math.min(320, CONFIG.height * 0.65);
      const ph = (shopMode === 'items') ? Math.min(phBase + 90, CONFIG.height - 20) : Math.min(phBase + 60, CONFIG.height - 20);
      const px = (CONFIG.width - pw)/2, py = CONFIG.height * 0.18;
      const contentTop = py + 35;
      const contentBottom = (shopMode === 'items') ? (py + ph - 70) : (py + ph - 70);
      const byHelp = (shopMode === 'items') ? (py + ph - 44) : (py + ph - 44);
      const indicatorH = `${helpPage + 1}/${helpTotalPages}`;
      // Buttons rects
      // approximate width based on indicator length
      const ctxW = 8 * indicatorH.length;
      const btnW = 18, btnH = 18;
      const gapBtn2 = 8;
      const leftHX = Math.floor(px + pw/2 - ctxW/2 - gapBtn2 - btnW);
      const rightHX = Math.floor(px + pw/2 + ctxW/2 + gapBtn2);
      const mx = UI.mx, my = UI.my;
      const insidePopup = (mx >= px && mx <= px + pw && my >= py && my <= py + ph);
      // Prev/Next inside popup
      if (insidePopup) {
        // Prev
        if (helpPage > 0 && mx >= leftHX && mx <= leftHX + btnW && my >= byHelp - btnH/2 && my <= byHelp + btnH/2) {
          helpPage = Math.max(0, helpPage - 1);
          UI.reset();
          return;
        }
        // Next
        if (helpPage < helpTotalPages - 1 && mx >= rightHX && mx <= rightHX + btnW && my >= byHelp - btnH/2 && my <= byHelp + btnH/2) {
          helpPage = Math.min(helpTotalPages - 1, helpPage + 1);
          UI.reset();
          return;
        }
        // Click inside popup area but not on buttons: ignore (do not close)
        UI.reset();
        return;
      }
      // Click outside popup closes it
      shopHelp = false;
      shopHelpScroll = 0;
      helpPage = 0;
      UI.reset();
      return;
    }
    if (hr && UI.mx>=hr.x && UI.mx<=hr.x+hr.w && UI.my>=hr.y && UI.my<=hr.y+hr.h) {
      shopHelp = true; helpPage = 0; UI.reset(); return;
    }
    // If confirm open, handle YES/NO
    if (shopConfirm) {
      const pw = CONFIG.width * 0.88, ph = 112;
      const px = (CONFIG.width - pw)/2, py = CONFIG.height * 0.40;
      const bw2 = 78, bh2 = 26; const by2 = py + ph - 36;
      const gapB = 12; const bx2 = px + pw/2 - bw2 - gapB; const bx3 = px + pw/2 + gapB;
      const x = UI.mx, y = UI.my;
      const showingMsg = !!(shopMsg && shopMsgTimer > 0);
      if (!showingMsg && x>=bx2 && x<=bx2+bw2 && y>=by2 && y<=by2+bh2) {
        // YES (only when not showing message)
        tryPurchase(shopConfirm.id);
        // If purchase succeeded, tryPurchase closes confirm; else message set
      } else if (x>=bx3 && x<=bx3+bw2 && y>=by2 && y<=by2+bh2) {
        // NO closes immediately
        shopConfirm = null; shopMsg = null; shopMsgKey = null; shopMsgArgs = null; shopMsgTimer = 0; UI.reset(); return;
      }
      UI.reset();
      return;
    }
    
    // Only process card/button clicks if not dragging
    if (shopDrag.hasMoved) {
      UI.reset();
      return;
    }
    
    // 객체 기반 클릭 처리
    // 먼저 버튼 클릭 검사 (버튼은 스크롤되지 않음)
    for (const button of uiButtons.shop.buttons) {
      if (button.isClicked(UI.mx, UI.my)) {
        button.onClick();
        UI.reset();
        return;
      }
    }
    
    // 현재 모드에 맞는 카드만 클릭 검사
    const { top } = shopGrid();
    const viewportBottom = CONFIG.height - 90;
    
    for (const card of uiButtons.shop.cards) {
      // 현재 모드와 카드 타입이 일치하는지 확인
      const correctType = (shopMode === 'items' && card.type === 'item') ||
                         (shopMode === 'chars' && card.type === 'char');
      
      if (!correctType) continue; // 타입이 맞지 않으면 건너뛰기
      
      // 뷰포트 내에 완전히 또는 부분적으로 보이는 카드만 클릭 가능
      const cardTop = card.y;
      const cardBottom = card.y + card.h;
      
      // 카드가 뷰포트 내에 있는지 확인
      if (cardBottom >= top && cardTop <= viewportBottom) {
        if (card.isClicked(UI.mx, UI.my)) {
          card.onClick();
          UI.reset();
          return;
        }
      }
    }
    
    // 클릭 처리 후 플래그 리셋
    UI.reset();
    }
  }
  
  // 스크롤 변경 시 카드 위치 업데이트
  if (shopDrag.active) {
    const dy = UI.my - shopDrag.y0;
    const newScroll = shopDrag.scroll0 - dy;
    
    // 스크롤 범위 계산
    let cols, cellH, paddingTop, paddingBottom, gap;
    const lvl = getLevelByExp(exp);
    let items;
    if (shopMode === 'items') {
      ({ cols, cellH, paddingTop, paddingBottom, gap } = shopGrid());
      items = getAllItemsSorted();
    } else {
      cols = 2;
      cellH = CHAR_CARD_CELL_H;
      paddingTop = 0;
      paddingBottom = 0;
      gap = CHAR_CARD_VERTICAL_GAP;
      items = visibleCharacters();
    }
    const rows = Math.ceil(items.length / cols) || 1;
    const contentH = paddingTop + rows * (cellH + gap) - gap + paddingBottom;
    const viewportH = CONFIG.height - (CONFIG.height * 0.12 + 50) - 90;
    
    const prevScroll = shopScroll;
    shopScroll = Math.max(0, Math.min(Math.max(0, contentH - viewportH), newScroll));
    
    // 스크롤 변경 시 모든 카드의 Y 위치 업데이트
    if (shopScroll !== prevScroll) {
      for (const card of uiButtons.shop.cards) {
        card.updateScroll(shopScroll);
      }
    }
  }
}

function tryPurchase(id) {
  // Check if it's a character purchase or selection
  if (shopConfirm && shopConfirm.type === 'character') {
    const char = PIXEL_CHARACTERS[id];
    if (!char) return;
    
    const charInv = shopInv.characters || [];
    const isPurchased = charInv.includes(id) || id === 'default';
    
    if (isPurchased) {
      // Just selecting an owned character
      selectedCharacter = id;
      localStorage.setItem('webswing_selected_char_v1', id);
      shopConfirm = null;
      return;
    }
    
    // Purchasing a new character
    const price = char.price;
    if (savings < price) {
      shopMsgKey = 'shop.error.funds';
      shopMsgArgs = { amount: price };
      shopMsg = t(shopMsgKey, shopMsgArgs);
      shopMsgTimer = 2.0;
      shopConfirm = null;
      return;
    }
    
    // Purchase character
    savings -= price;
    localStorage.setItem(SAVINGS_KEY, savings); // Save the deducted amount
    if (!charInv.includes(id)) {
      charInv.push(id);
      shopInv.characters = charInv;
      saveShopInv(shopInv);
    }
    
    // Auto-select the purchased character
    selectedCharacter = id;
    localStorage.setItem('webswing_selected_char_v1', id);
    
    shopConfirm = null;
    return;
  }
  
  // Original item purchase logic
  const it = SHOP_ITEMS.find(x => x.id === id);
  if (!it) return;
  let price = nextPriceForItem(it);
  // enforce affordability
  if (savings < price) {
    shopMsgKey = 'shop.error.funds';
    shopMsgArgs = { amount: price };
    shopMsg = t(shopMsgKey, shopMsgArgs);
    shopMsgTimer = 2.0;
    return;
  }
  if (isItemSoldOut(it)) { shopConfirm = null; return; }
  if (it.type === 'consumable') {
    const current = (shopInv.consumables && shopInv.consumables[id]) || 0;
    if (current >= 1) { shopConfirm = null; return; }
    savings -= price;
    if (!shopInv.consumables) shopInv.consumables = {};
    shopInv.consumables[id] = current + 1;
    saveShopInv(shopInv);
  } else if (id === 'glow') {
    const current = shopInv.glowLevel || 0;
    if (current >= 3) { shopConfirm = null; return; }
    savings -= price; shopInv.glowLevel = current + 1; saveShopInv(shopInv);
  } else if (id === 'buds') {
    const maxLv = currentBodySides();
    savings -= price; shopInv.budsLevel = Math.min(maxLv, (shopInv.budsLevel || 0) + 1); saveShopInv(shopInv);
  } else if (id === 'plusjump') {
    savings -= price; shopInv.plusJump = true; saveShopInv(shopInv);
  } else if (id === 'fly') {
    savings -= price; shopInv.fly = true; saveShopInv(shopInv);
  } else if (id === 'big') {
    const maxLv = getLevelByExp(exp);
    const current = shopInv.bigLevel || 0;
    const dynPrice = 20 + 10 * current;
    if (savings < dynPrice) { shopMsgKey = 'shop.error.funds'; shopMsgArgs = { amount: dynPrice }; shopMsg = t(shopMsgKey, shopMsgArgs); shopMsgTimer = 2.0; return; }
    savings -= dynPrice;
    shopInv.bigLevel = Math.min(maxLv, current + 1);
    saveShopInv(shopInv);
  } else if (id === 'magnet') {
    const current = shopInv.magnetLevel || 0;
    if (current >= 5) { shopConfirm = null; return; }
    savings -= price; shopInv.magnetLevel = current + 1; saveShopInv(shopInv);
  } else if (id === 'combo') {
    const current = shopInv.comboLevel || 0;
    if (current >= 3) { shopConfirm = null; return; }
    savings -= price; shopInv.comboLevel = current + 1; saveShopInv(shopInv);
  } else if (id === 'double') {
    savings -= price; shopInv.double = true; saveShopInv(shopInv);
  } else if (id === 'lucky') {
    const current = shopInv.luckyLevel || 0;
    if (current >= 5) { shopConfirm = null; return; }
    savings -= price; shopInv.luckyLevel = current + 1; saveShopInv(shopInv);
  } else if (id === 'fever') {
    const current = shopInv.feverLevel || 0;
    if (current >= 3) { shopConfirm = null; return; }
    savings -= price; shopInv.feverLevel = current + 1; saveShopInv(shopInv);
  }
  try { localStorage.setItem(SAVINGS_KEY, String(savings)); } catch(_){}
  shopConfirm = null;
}

// Start the game
start();
