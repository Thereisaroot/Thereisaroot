// WebSwing Prototype (Ropes + Multi-spawn + Catch)
 
const CONFIG = {
  width: 360,
  height: 640,
  groundH: 72,
  gravity: 2400, // px/s^2
  jumpImpulse: 642, // px/s upward base impulse (~30% stronger than current)
  baseVx: 208, // reduced base forward carry (20% less)
  minVx: 200,
  maxVx: 420,
  airDragX: 0.5, // stronger horizontal damping while free
  ceilingY: 84, // rope anchor Y (ceiling line)

  // Rope params
  Lmin: 84,   // 30% smaller than before
  Lmax: 338,  // 30% larger than before
  AminDeg: 6,
  AmaxDeg: 18,
  kOmegaMin: 0.85,
  kOmegaMax: 1.35,
  Dmin: 180, // wider spacing
  Dmax: 260,
  DshortMin: 120, // occasionally allow shorter spacing
  DshortProb: 0.35, // probability to choose a short spacing
  catchBase: 22, // px (fixed)
  catchBonusMax: 10, // unused when velScale=0
  catchVelScale: 0.0, // fixed radius (no scaling)
  // Spawn new rope anchors near the right edge of the screen
  minAnchorX: 300,
  maxAnchorX: 332,
  edgeSpawnJitter: 48, // px, randomness from the right edge inward
  lengthJitterPct: 0.30, // ±30% length jitter after planning
  shortLChance: 0.10, // 10% chance to shorten rope
  shortLFactor: 0.70, // shorten to 70% (30% shorter)
  longLChance: 0.00, // 0% chance to extend rope
  longLFactor: 1.20, // extend to 120%

  // Extra randomization knobs
  spacingJitterMin: 0.90, // D *= randRange(min,max)
  spacingJitterMax: 1.15,

  // Gameplay probabilities
  ropeBreakProb: 0.10, // when attached (if enabled by gating below)
  itemSpawnProb: 0.20,

  // Camera follow smoothing (1/s)
  camFollowAttach: 6.0,
  camFollowFree: 2.5,
  // Jump speed scaling (1.0 = 기본)
  jumpSpeedScale: 1.0,
  // Game over wait seconds before retry is enabled
  gameOverWait: 3.0,
  // Fly control
  flyHoldThreshold: 0.2, // seconds to differentiate long press
  flyMaxHold: 1.3,       // seconds of fly per hold
  flyUpVy: -180,         // upward velocity during fly (1.5x)
  flyMinFwd: 180,        // minimal forward speed during fly (1.5x)
  // Buds sway (as percentage of body radius)
  budSwayMinPct: 0.08,
  budSwayMaxPct: 0.32,
  // Star (fever) mode rope pattern
  starDuration: 3.0,
  starL: 160,           // fixed rope length
  starAdeg: 10,         // swing amplitude (degrees)
  starDmin: 70,         // dense spacing min
  starDmax: 110,        // dense spacing max
  starEdgeJitter: 10,   // smaller edge jitter for uniform look
};

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

function setupCanvas() {
  dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = Math.floor(CONFIG.width * dpr);
  canvas.height = Math.floor(CONFIG.height * dpr);
  canvas.style.width = CONFIG.width + 'px';
  canvas.style.height = CONFIG.height + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

setupCanvas();
window.addEventListener('resize', setupCanvas);

const Fonts = {
  loaded: false,
  async load() {
    try {
      // Attempt to load; browser will no-op if unsupported
      if (document.fonts && document.fonts.load) {
        try { await document.fonts.load('12px "GameFont"'); } catch {}
        try { await document.fonts.load('12px "Press Start 2P"'); } catch {}
        try { await document.fonts.load('12px "Dalmoori"'); } catch {}
      } else {
        // Fallback small delay
        await new Promise((r) => setTimeout(r, 300));
      }
      this.loaded = true;
    } catch (_) {
      this.loaded = true;
    }
  },
};

// Tuning state (can be loaded from server later)
const TUNING_KEY = 'webswing_tuning_v1';
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
let tuning = { ...TUNING_DEFAULTS };

function loadTuningLocal() {
  try {
    const raw = localStorage.getItem(TUNING_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      tuning = { ...tuning, ...saved };
    }
  } catch(_) {}
}
function saveTuningLocal() {
  try { localStorage.setItem(TUNING_KEY, JSON.stringify(tuning)); } catch(_) {}
}
async function maybeLoadTuningFromServer() {
  // Placeholder for future server fetch; merge into tuning and apply
  // Example:
  // const res = await fetch('/api/tuning');
  // const remote = await res.json();
  // tuning = { ...tuning, ...remote };
}
function applyTuningToConfig() {
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
  CONFIG.longLChance = Math.max(0, Math.min(1, (Number(tuning.longProb) || 0) / 100));
  CONFIG.longLFactor = Math.max(1.0, (Number(tuning.longFactor) || Math.round(CONFIG.longLFactor*100)) / 100);
  CONFIG.ropeBreakProb = Math.max(0, Math.min(1, (Number(tuning.breakProb) || 0) / 100));
  CONFIG.itemSpawnProb = Math.max(0, Math.min(1, (Number(tuning.itemProb) || 0) / 100));
  CONFIG.DshortMin = Number(tuning.DshortMin) || CONFIG.DshortMin;
  CONFIG.DshortProb = Math.max(0, Math.min(1, (Number(tuning.DshortProb) || 0) / 100));
}
function setupDebugUI() {
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
    ['dbg-Ljit', 'LjitPct'],
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
  // Initialize slider positions
  for (const [id, key] of map) {
    const el = get(id);
    if (!el) continue;
    el.value = String(tuning[key]);
    el.addEventListener('input', () => {
      tuning[key] = Number(el.value);
      applyTuningToConfig();
      saveTuningLocal();
    });
  }
}

// UI helper for intro interactions
const UI = {
  clicked: false,
  justReleased: false,
  mx: 0,
  my: 0,
  keyPressed: null, // 'Space' | 'Escape' | null
  reset() { this.clicked = false; this.justReleased = false; this.keyPressed = null; },
};

function isFromDebug(e) {
  const t = e && (e.target || e.srcElement);
  if (!t || typeof t.closest !== 'function') return false;
  return !!t.closest('#debug-panel');
}

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
    
    // Start help popup drag if clicking in help area
    if (State.current === 'shop' && shopHelp) {
      helpDrag.active = true;
      helpDrag.y0 = cy;
      helpDrag.startY = cy;
      helpDrag.scroll0 = shopHelpScroll;
      helpDrag.hasMoved = false;
    }
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
      if (DEBUG) console.log(`Touch release at: ${UI.mx.toFixed(0)}, ${UI.my.toFixed(0)} State: ${State.current}`);
    }
    
    // Handle click on release for all states
    // 모바일에서도 클릭 및 버튼 터치가 잘 동작하도록 개선
    if (State.current === 'shop') {
      // Only trigger click if not dragging
      if (!shopDrag.hasMoved || shopConfirm) {
        UI.clicked = true;
        UI.justReleased = true;
        // 터치 이벤트의 경우 즉시 처리를 위해 frameEndReset 사용
        if (isTouch) frameEndReset = true;
      } else if (shopHelp && !helpDrag.hasMoved) {
        // For help popup, only trigger click if not dragging
        UI.clicked = true;
        UI.justReleased = true;
        if (isTouch) frameEndReset = true;
      }
    } else {
      // For other states, always set clicked on release
      UI.clicked = true;
      UI.justReleased = true;
      // 터치 이벤트의 경우 프레임 끝에서 리셋
      if (isTouch) frameEndReset = true;
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
    
    if (shopHelp) {
      // Scroll help popup
      shopHelpScroll += e.deltaY * 0.5;
      
      // Calculate max scroll based on shop mode
      let maxHelpScroll = 0;
      if (shopMode === 'chars') {
        // Character shop help - 5 characters at 45px each
        const chars = Object.entries(PIXEL_CHARACTERS);
        const charHeight = 55; // Updated for 2-line descriptions
        const totalContentHeight = chars.length * charHeight;
        const viewportHeight = 230; // contentH from renderCharacterShop
        maxHelpScroll = Math.max(0, totalContentHeight - viewportHeight);
      } else {
        // Item shop help - calculate based on descriptions
        const lvl = getLevelByExp(exp);
        const visibleItems = SHOP_ITEMS.filter(it => (it.minLevel || 1) <= lvl);
        const itemHeight = 36; // name + desc + price + spacing
        const totalContentHeight = visibleItems.length * itemHeight;
        const viewportHeight = 230;
        maxHelpScroll = Math.max(0, totalContentHeight - viewportHeight);
      }
      
      shopHelpScroll = Math.max(0, Math.min(maxHelpScroll, shopHelpScroll));
    } else if (!shopConfirm) {
      // Scroll shop items/characters
      shopScroll += e.deltaY * 0.5;
      
      if (shopMode === 'chars') {
        // Character shop scroll limits
        const chars = Object.entries(PIXEL_CHARACTERS);
        const cols = 2;
        const cellH = 100;
        const gap = 10;
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
        const items = SHOP_ITEMS.filter(it => (it.minLevel || 1) <= lvl);
        const rows = Math.ceil(items.length / cols) || 1;
        const contentH = paddingTop + rows * (cellH + gap) - gap + paddingBottom;
        const viewportH = CONFIG.height - top - 90;
        const maxScroll = Math.max(0, contentH - viewportH);
        shopScroll = Math.max(0, Math.min(maxScroll, shopScroll));
      }
    }
  }
}, { passive: false });

// Mouse move tracking for drag scroll
let lastMouseY = 0;
let helpDrag = { active: false, y0: 0, scroll0: 0, hasMoved: false, startY: 0 };
window.addEventListener('mousemove', (e) => {
  UI.mx = e.clientX;
  UI.my = e.clientY;
  lastMouseY = e.clientY;
  
  // Handle help popup drag
  if (State.current === 'shop' && shopHelp && helpDrag.active) {
    const moveDistance = Math.abs(e.clientY - helpDrag.startY);
    if (moveDistance > 5) {
      helpDrag.hasMoved = true;
      console.log('Help drag detected:', moveDistance);
    }
    const delta = helpDrag.y0 - e.clientY;
    const newScroll = helpDrag.scroll0 + delta;
    
    // Calculate max scroll based on shop mode
    let maxHelpScroll = 0;
    if (shopMode === 'chars') {
      // Character shop help - 5 characters at 45px each
      const chars = Object.entries(PIXEL_CHARACTERS);
      const charHeight = 45;
      const totalContentHeight = chars.length * charHeight;
      const viewportHeight = 230; // contentH from renderCharacterShop
      maxHelpScroll = Math.max(0, totalContentHeight - viewportHeight);
    } else {
      // Item shop help - calculate based on descriptions
      const lvl = getLevelByExp(exp);
      const visibleItems = SHOP_ITEMS.filter(it => (it.minLevel || 1) <= lvl);
      const lineHeight = 14;
      const itemHeight = 36;
      const totalContentHeight = visibleItems.length * itemHeight;
      const viewportHeight = 230;
      maxHelpScroll = Math.max(0, totalContentHeight - viewportHeight);
    }
    
    shopHelpScroll = Math.max(0, Math.min(maxHelpScroll, newScroll));
  }
  // Handle shop items drag
  else if (State.current === 'shop' && shopDrag.active && !shopHelp && !shopConfirm) {
    // Check if mouse moved enough to be considered a drag (threshold: 5px)
    const moveDistance = Math.abs(e.clientY - shopDrag.y0) + Math.abs(e.clientX - shopDrag.startX);
    if (moveDistance > 5) {
      shopDrag.hasMoved = true;
    }
    
    const delta = shopDrag.y0 - e.clientY;
    shopScroll = shopDrag.scroll0 + delta;
    
    if (shopMode === 'chars') {
      // Character shop scroll limits
      const chars = Object.entries(PIXEL_CHARACTERS);
      const cols = 2;
      const cellH = 100;
      const gap = 10;
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
      const items = SHOP_ITEMS.filter(it => (it.minLevel || 1) <= lvl);
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
  if (State.current === 'shop' && shopDrag.active && !shopHelp && !shopConfirm) {
    const touch = e.touches[0];
    // Check if touch moved enough to be considered a drag
    const moveDistance = Math.abs(touch.clientY - shopDrag.y0) + Math.abs(touch.clientX - shopDrag.startX);
    if (moveDistance > 5) {
      shopDrag.hasMoved = true;
    }
    
    const delta = shopDrag.y0 - touch.clientY;
    shopScroll = shopDrag.scroll0 + delta;
    
    if (shopMode === 'chars') {
      // Character shop scroll limits
      const chars = Object.entries(PIXEL_CHARACTERS);
      const cols = 2;
      const cellH = 100;
      const gap = 10;
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
      const items = SHOP_ITEMS.filter(it => (it.minLevel || 1) <= lvl);
      const rows = Math.ceil(items.length / cols) || 1;
      const contentH = paddingTop + rows * (cellH + gap) - gap + paddingBottom;
      const viewportH = CONFIG.height - top - 90;
      const maxScroll = Math.max(0, contentH - viewportH);
      shopScroll = Math.max(0, Math.min(maxScroll, shopScroll));
    }
  }
}, { passive: false });

// Rope entity
class Rope {
  constructor(params) {
    this.anchorX = params.anchorX;
    this.anchorY = params.anchorY;
    this.L = params.L;
    this.A = params.A; // radians
    this.omega = params.omega; // rad/s
    this.phi = params.phi; // phase
    this.createdAt = params.createdAt || 0;
    this.id = params.id || Math.random().toString(36).slice(2);
    this.breakAt = null; // time when rope will snap (if scheduled)
    this.isWebRope = params.isWebRope || false;
    this.webTargetL = params.webTargetL || null;
  }
  // θ(t) = A cos(ω t + φ)
  theta(t) {
    return this.A * Math.cos(this.omega * t + this.phi);
  }
  tip(t) {
    const th = this.theta(t);
    const x = this.anchorX + this.L * Math.sin(th);
    const y = this.anchorY + this.L * Math.cos(th);
    const dth = -this.A * this.omega * Math.sin(this.omega * t + this.phi);
    const vx = this.L * Math.cos(th) * dth;
    const vy = -this.L * Math.sin(th) * dth;
    return { x, y, vx, vy, th };
  }
}

// Player entity (shape renderer)
class Player {
  constructor() {
    this.r = 14;
    this.reset();
  }
  reset() {
    this.x = CONFIG.width * 0.32;
    this.y = CONFIG.height * 0.45;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.mode = 'attached'; // 'attached' | 'free'
    this.rope = null; // current attached rope
    this.sizeScale = 1;
  }
  airFlap() {
    // In-air flap: mainly vertical impulse, minimal horizontal change
    this.vy = Math.min(this.vy, 0) - CONFIG.jumpImpulse * 0.85 * (CONFIG.jumpSpeedScale || 1);
  }
  update(dt, t) {
    if (this.mode === 'attached' && this.rope) {
    if (this.rope.isWebRope && this.rope.webTargetL != null && this.rope.L > this.rope.webTargetL) {
      this.rope.L -= 250 * dt; // Retract speed
      if (this.rope.L < this.rope.webTargetL) {
          this.rope.L = this.rope.webTargetL;
      }
    }
      const tip = this.rope.tip(t);
      this.x = tip.x;
      this.y = tip.y;
      // Angle from rope tip velocity
      const targetAngle = Math.atan2(tip.vy, tip.vx || 1e-6);
      const maxTilt = Math.PI * 0.6;
      const clamped = Math.max(-maxTilt, Math.min(maxTilt, targetAngle));
      this.angle += (clamped - this.angle) * Math.min(1, dt * 10);
      // vy follows tip vy (for smooth transition on detach)
      this.vy = tip.vy;
    } else {
      // Free flight (flappy-like): vertical physics only; horizontal is via camera
      const s = (CONFIG.jumpSpeedScale || 1);
      this.x += this.vx * dt;
      // horizontal damping scaled to preserve distance under time dilation
      this.vx += -this.vx * (CONFIG.airDragX * s) * dt;
      // gravity scaled by s^2 to preserve trajectory distance while slowing motion
      this.vy += (CONFIG.gravity * s * s) * dt;
      this.y += this.vy * dt;
      const targetAngle = Math.atan2(this.vy, 260);
      const maxTilt = Math.PI * 0.45;
      const clamped = Math.max(-maxTilt, Math.min(maxTilt, targetAngle));
      this.angle += (clamped - this.angle) * Math.min(1, dt * 12);
    }
  }
  draw(g) {
    g.save();
    g.translate(this.x, this.y);
    g.rotate(this.angle);
    const level = getLevelByExp(exp);
    // Level 1: pure white circle. Level 2+: every 3 levels shape changes; add one color segment per level (max 3)
    const segCount = (level <= 1) ? 0 : (((level - 2) % 3) + 1);
    const segColors = ['#e53d3d', '#6aa8ff', '#ffa24d'];
    const size = this.r * 2 * this.sizeScale;
    const levelScale = (level > 1) ? 1.3 : 1.0;
    
    // Check if using pixel character
    const isPixelChar = selectedCharacter !== 'default' && PIXEL_CHARACTERS[selectedCharacter];

    function drawPolygonPath(ctx, sides, radius, rotationRad) {
      const r = radius;
      ctx.beginPath();
      for (let i = 0; i < sides; i++) {
        const a = rotationRad + i * (Math.PI * 2 / sides);
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
    }

    // Glow effect if purchased (3 levels with different colors and alpha)
    if (shopInv.glowLevel && shopInv.glowLevel > 0) {
      const glowLv = shopInv.glowLevel;
      // Level 1: white, fast blink, low alpha
      // Level 2: yellow, medium blink, medium alpha  
      // Level 3: sky blue, slow blink, high alpha
      const colors = ['#ffffff', '#ffff88', '#88ddff'];
      const speeds = [5.0, 3.5, 2.0]; // Blink speed
      const minAlphas = [0.05, 0.08, 0.1]; // Lower min alphas for pixel chars
      const maxAlphas = [0.2, 0.25, 0.3]; // Max alpha 0.3 for level 3
      
      const color = colors[Math.min(glowLv - 1, 2)];
      const speed = speeds[Math.min(glowLv - 1, 2)];
      const minAlpha = minAlphas[Math.min(glowLv - 1, 2)];
      const maxAlpha = maxAlphas[Math.min(glowLv - 1, 2)];
      
      const pulse = (Math.sin(simTime * speed) + 1) / 2; // 0 to 1
      const alpha = minAlpha + (maxAlpha - minAlpha) * pulse;
      
      g.save();
      // Use screen blend mode for better glow effect
      g.globalCompositeOperation = 'screen';
      g.globalAlpha = alpha;
      g.fillStyle = color;
      const bigScale = 1 + 0.025 * (shopInv.bigLevel || 0);
      const gr = (this.r * this.sizeScale * bigScale) * ((level > 1) ? 1.3 : 1.0) * 1.6;
      
      // Draw glow shape
      if (isPixelChar) {
        // Sunburst/starburst effect for pixel characters with varying ray sizes
        const rays = 12;
        const innerR = gr * 0.5;
        
        // Different sizes for each ray for more organic look
        const rayScales = [1.0, 0.7, 0.9, 0.6, 1.1, 0.8, 0.95, 0.65, 1.05, 0.75, 0.85, 0.7];
        
        g.beginPath();
        for (let i = 0; i < rays; i++) {
          const angle = (i / rays) * Math.PI * 2;
          const nextAngle = ((i + 0.5) / rays) * Math.PI * 2;
          
          // Vary the outer radius for each ray
          const outerR = gr * rayScales[i];
          
          // Outer point
          const x1 = Math.cos(angle) * outerR;
          const y1 = Math.sin(angle) * outerR;
          
          // Inner point (also vary slightly)
          const innerScale = 0.9 + Math.sin(i * 1.7) * 0.1;
          const x2 = Math.cos(nextAngle) * innerR * innerScale;
          const y2 = Math.sin(nextAngle) * innerR * innerScale;
          
          if (i === 0) {
            g.moveTo(x1, y1);
          } else {
            g.lineTo(x1, y1);
          }
          g.lineTo(x2, y2);
        }
        g.closePath();
        g.fill();
      } else if (level === 1) {
        // Circle for level 1
        g.beginPath();
        g.arc(0, 0, gr, 0, Math.PI * 2);
        g.fill();
      } else {
        // Polygon for level 2+
        const groupIdx = Math.floor((level - 2) / 3);
        const sides = 3 + Math.max(0, groupIdx);
        const rot = Math.PI / 10; // Match player's rotation
        drawPolygonPath(g, sides, gr, rot);
        g.fill();
      }
      g.restore();
    }
    
    // Draw character (pixel or default)
    if (isPixelChar) {
      // Draw pixel character with animation
      const charData = PIXEL_CHARACTERS[selectedCharacter];
      const bigScale = 1 + 0.025 * (shopInv.bigLevel || 0);
      const pixelSize = 3 * this.sizeScale * bigScale * levelScale;
      
      // Animation effects based on player state
      const isSwinging = this.mode === 'attached';
      const isFalling = this.mode === 'free' && this.vy > 50;
      const isJumping = this.mode === 'free' && this.vy < -50;
      
      // Squash and stretch animation
      let scaleX = 1;
      let scaleY = 1;
      let offsetY = 0;
      
      if (isSwinging) {
        // Subtle swing animation
        scaleX = 1 + Math.sin(simTime * 8) * 0.05;
        scaleY = 1 - Math.sin(simTime * 8) * 0.05;
      } else if (isJumping) {
        // Stretch when jumping up
        scaleX = 0.9;
        scaleY = 1.15;
      } else if (isFalling) {
        // Squash when falling down
        scaleX = 1.1;
        scaleY = 0.9;
      }
      
      // Eye blink animation
      const blinkCycle = Math.floor(simTime * 0.3) % 20;
      const isBlinking = blinkCycle === 0;
      
      // Apply animation transforms
      g.save();
      g.scale(scaleX, scaleY);
      
      // Draw pixels with animation
      charData.pixels.forEach((row, ry) => {
        row.forEach((pixel, rx) => {
          if (pixel) {
            // Special handling for eyes (usually pixel value 2)
            if (pixel === 2 && isBlinking) {
              // Don't draw eyes when blinking
              return;
            }
            
            // Add slight wobble for certain characters
            let pixelOffsetX = 0;
            let pixelOffsetY = 0;
            
            if (selectedCharacter === 'ninja' && isSwinging) {
              // Ninja's scarf/ribbon effect - animate bottom pixels
              if (ry >= 6) {
                pixelOffsetX = Math.sin(simTime * 10 + ry) * 1;
              }
            } else if (selectedCharacter === 'wizard' && isSwinging) {
              // Wizard's robe flutter - animate bottom pixels
              if (ry >= 5) {
                pixelOffsetX = Math.cos(simTime * 8 + ry * 0.5) * 0.8;
              }
            }
            
            g.fillStyle = charData.colors[pixel - 1] || '#ffffff';
            g.fillRect(
              (rx - charData.pixels[0].length / 2) * pixelSize + pixelOffsetX,
              (ry - charData.pixels.length / 2) * pixelSize + pixelOffsetY + offsetY,
              pixelSize,
              pixelSize
            );
          }
        });
      });
      
      g.restore();
      
      // No outline for pixel characters to avoid black border
      
    } else if (level === 1) {
      // Pure white circle (egg)
      const bigScale = 1 + 0.025 * (shopInv.bigLevel || 0);
      const r = this.r * this.sizeScale * bigScale * levelScale;
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(0, 0, r, 0, Math.PI * 2);
      g.fill();
      // Outline and pointer
      g.strokeStyle = '#e53d3d';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(0, 0, r, 0, Math.PI * 2);
      g.stroke();
      // Direction pointer
      g.fillStyle = '#e53d3d';
      g.beginPath();
      g.moveTo(r * 0.6, 0);
      g.lineTo(r * 0.1, -5);
      g.lineTo(r * 0.1, 5);
      g.closePath();
      g.fill();
    } else {
      // Shape mapping: L2-4 triangle (3), L5-7 square (4), L8-10 pentagon (5), ...
      const groupIdx = Math.floor((level - 2) / 3); // 0 for L2-4, 1 for L5-7, ...
      const sides = 3 + groupIdx;
      const bigScale = 1 + 0.025 * (shopInv.bigLevel || 0);
      const r = this.r * this.sizeScale * bigScale * levelScale;
      const rot = Math.PI / 10; // slight rotation
      // Clip to polygon
      g.save();
      drawPolygonPath(g, sides, r, rot);
      g.clip();
      // Base
      g.fillStyle = '#ffffff';
      g.fillRect(-r, -r, r*2, r*2);
      // Segments
      const third = (r * 2) / 3;
      for (let i = 0; i < segCount; i++) {
        g.fillStyle = segColors[i % segColors.length];
        g.fillRect(-r + third * i, -r, third, r*2);
      }
      g.restore();
      // Outline
      g.strokeStyle = '#e53d3d';
      g.lineWidth = 2;
      drawPolygonPath(g, sides, r, rot);
      g.stroke();
    }

    // Buds - works with both pixel and polygon characters
    if (shopInv.budsLevel && shopInv.budsLevel > 0) {
      if (isPixelChar) {
        // For pixel characters, place buds at corners
        const charData = PIXEL_CHARACTERS[selectedCharacter];
        const bigScale = 1 + 0.025 * (shopInv.bigLevel || 0);
        const pixelSize = 3 * this.sizeScale * bigScale * levelScale;
        const width = charData.pixels[0].length * pixelSize;
        const height = charData.pixels.length * pixelSize;
        const positions = [
          {x: -width/2, y: -height/2}, // top-left
          {x: width/2, y: -height/2},  // top-right
          {x: width/2, y: height/2},   // bottom-right
          {x: -width/2, y: height/2},  // bottom-left
        ];
        const maxBuds = Math.min(4, shopInv.budsLevel);
        for (let i = 0; i < maxBuds; i++) {
          const pos = positions[i];
          const phase = simTime * 3 + i * (Math.PI * 0.5);
          const swayX = Math.sin(phase) * 4;
          const swayY = Math.cos(phase * 1.3) * 2;
          g.save();
          g.translate(pos.x + swayX, pos.y + swayY);
          g.fillStyle = i < segCount ? segColors[i] : '#ffffff';
          g.beginPath();
          g.arc(0, 0, 4, 0, Math.PI * 2);
          g.fill();
          g.strokeStyle = '#333333';
          g.lineWidth = 1;
          g.stroke();
          g.restore();
        }
      } else if (level > 1) {
      const groupIdx = Math.floor((level - 2) / 3);
      const sides = 3 + Math.max(0, groupIdx);
      const bigScale = 1 + 0.025 * (shopInv.bigLevel || 0);
      const baseR = this.r * this.sizeScale * bigScale * ((level > 1) ? 1.3 : 1.0);
      const childR = baseR * 0.40;
      const rot2 = Math.PI / 10; // body polygon rotation offset
      const maxBuds = Math.min(sides, shopInv.budsLevel);
      const third = (baseR * 2) / 3; // for stripe color bands
      const segColorsLocal = ['#e53d3d', '#6aa8ff', '#ffa24d'];
      const segCountLocal = (level <= 1) ? 0 : (((level - 2) % 3) + 1);
      // sway amplitude range (lerp across buds)
      const minA = CONFIG.budSwayMinPct * baseR;
      const maxA = CONFIG.budSwayMaxPct * baseR;
      const velScale = 0.4 + Math.min(1.2, Math.abs(this.vy) / 260);
      for (let i = 0; i < maxBuds; i++) {
        const a = rot2 + i * (Math.PI * 2 / sides);
        const nx = Math.cos(a), ny = Math.sin(a);
        // base attach point just outside vertex
        let px = nx * (baseR + childR * 0.86);
        let py = ny * (baseR + childR * 0.86);
        // add gentle sway along tangent and normal for life-like motion
        const tnx = -ny, tny = nx; // tangent
        const k = (maxBuds <= 1) ? 1 : (i / (maxBuds - 1));
        const amp = (minA + (maxA - minA) * k) * velScale;
        const w = 2.0 + 0.6 * i;
        px += tnx * amp * Math.sin(simTime * w + i * 0.5) + nx * 0.3 * amp * Math.cos(simTime * (w*0.9) + i * 0.3);
        py += tny * amp * Math.sin(simTime * (w*0.8) + i * 0.4) + ny * 0.3 * amp * Math.cos(simTime * (w*1.1) + i * 0.2);
        // color pick based on local x band
        let col = '#ffffff';
        if (segCountLocal > 0) {
          const idx = Math.max(0, Math.min(2, Math.floor((px + baseR) / third)));
          if (idx < segCountLocal) col = segColorsLocal[idx];
        }
        g.save();
        g.translate(px, py);
        g.fillStyle = col;
        g.strokeStyle = '#e53d3d';
        g.lineWidth = 2;
        g.beginPath();
        g.arc(0, 0, childR, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        g.restore();
      }
      }
    }

    g.restore();
  }
}

// Effective player collision radius (level-scaled)
function playerCollisionRadius() {
  const level = getLevelByExp(exp);
  const levelScale = (level > 1) ? 1.3 : 1.0;
  const bigScale = 1 + 0.05 * (shopInv.bigLevel || 0);
  return player.r * player.sizeScale * bigScale * levelScale;
}

// Simple game state machine: intro -> run -> gameover -> shop
const State = {
  current: 'intro', // 'intro' | 'run' | 'gameover' | 'shop'
};

const player = new Player();
let score = 0;
let best = 0;
let simTime = 0;
const camera = { x: 0 };
const SCREEN_TARGET_X = CONFIG.width * 0.22;
const SAVINGS_KEY = 'webswing_savings_v1';
const BEST_SCORE_KEY = 'webswing_best_v1';
const EXP_KEY = 'webswing_exp_v1';
let savings = 0; // money for shop
let exp = 0;     // progression EXP for levels
let lastEarned = 0; // dollars earned in the most recent run
const DEMO_DONE_KEY = 'webswing_demo_done_v1';
const SHOP_INV_KEY = 'webswing_shop_inv_v1';
let demoActive = false;
let lastDemoLoss = false;
let fastModeEnabled = false;
let comboCount = 0;

// Level system based on EXP thresholds
const LEVEL_THRESHOLDS = [10, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
function getLevelByExp(val) {
  let lvl = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (val >= LEVEL_THRESHOLDS[i]) lvl++; else break;
  }
  return lvl; // Level 1..13
}

// Level-up popup state for game over screen
let gameOverLevelUp = null; // { from, to }
let levelUpPopupTimer = 0;

// Shop state
let shopMode = 'items'; // 'items' or 'chars'
let shopScroll = 0;
let shopDrag = { active: false, y0: 0, scroll0: 0 };
let previousState = 'intro'; // 상점 진입 전 상태 저장
let shopConfirm = null; // { id, price }
let selectedCharacter = 'default'; // Currently selected character
let shopMsg = null;      // string message inside confirm (e.g., insufficient funds)
let shopMsgTimer = 0;    // seconds until message auto-dismiss
let shopHelp = false;    // show help popup under SHOP
let shopHelpScroll = 0;  // scroll position for help popup
let lastShopHelpRect = null; // cached '?' button rect computed during render


// Pixel character definitions (8x8 grids)
const PIXEL_CHARACTERS = {
  default: {
    name: 'Polygon',
    price: 0,
    minLevel: 1,
    pixels: [], // Empty - uses the normal polygon rendering
    colors: [],
    description: 'Classic geometric shape that evolves with level'
  },
  robot: {
    name: 'Robot',
    price: 1000,
    minLevel: 3,
    pixels: [
      [0,0,1,1,1,1,0,0],
      [0,1,2,1,1,2,1,0],
      [0,1,1,1,1,1,1,0],
      [0,0,1,1,1,1,0,0],
      [1,1,1,1,1,1,1,1],
      [1,0,1,1,1,1,0,1],
      [1,0,1,0,0,1,0,1],
      [0,0,1,0,0,1,0,0]
    ],
    colors: ['#8B93AF', '#4A90E2', '#2E5266'], // 0: transparent, 1: body, 2: eyes
    description: 'Mechanical precision'
  },
  ninja: {
    name: 'Ninja',
    price: 1500,
    minLevel: 5,
    pixels: [
      [0,0,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,0],
      [0,1,2,1,1,2,1,0],
      [0,1,1,1,1,1,1,0],
      [0,0,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,0],
      [0,1,0,1,1,0,1,0],
      [1,0,0,0,0,0,0,1]
    ],
    colors: ['#1a1a1a', '#ffffff', '#ff0000'], // black body, white eyes, red band
    description: 'Silent and deadly'
  },
  pirate: {
    name: 'Pirate',
    price: 2000,
    minLevel: 7,
    pixels: [
      [0,1,1,1,1,1,1,0],
      [1,1,1,1,1,1,1,1],
      [0,1,2,1,3,1,1,0],
      [0,1,1,1,1,1,1,0],
      [0,0,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,0],
      [0,1,0,1,1,0,1,0],
      [1,0,0,0,0,0,0,1]
    ],
    colors: ['#8B4513', '#ffffff', '#000000', '#FFD700'], // brown, white, black (eyepatch), gold
    description: 'Arr! +15% gold'
  },
  wizard: {
    name: 'Wizard',
    price: 2500,
    minLevel: 10,
    pixels: [
      [0,0,0,1,0,0,0,0],
      [0,0,1,1,1,0,0,0],
      [0,1,1,1,1,1,0,0],
      [0,1,2,1,2,1,0,0],
      [0,1,1,1,1,1,0,0],
      [0,1,3,3,3,1,0,0],
      [0,1,1,1,1,1,0,0],
      [0,1,0,0,0,1,0,0]
    ],
    colors: ['#4B0082', '#ffffff', '#FFD700', '#C0C0C0'], // purple, white, gold stars, silver beard
    description: 'Magical powers'
  },
  knight: {
    name: 'Knight',
    price: 3000,
    minLevel: 12,
    pixels: [
      [0,1,1,1,1,1,1,0],
      [0,1,1,2,2,1,1,0],
      [0,1,1,1,1,1,1,0],
      [0,1,3,1,1,3,1,0],
      [0,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,0],
      [0,1,0,1,1,0,1,0],
      [1,0,0,0,0,0,0,1]
    ],
    colors: ['#C0C0C0', '#808080', '#FF0000', '#FFD700'], // silver, dark gray, red cross, gold
    description: 'Heavy armor protection'
  }
};

// Shop inventory
let shopInv = { glow: false, budsLevel: 0, plusJump: false, fly: false, bigLevel: 0, gambleActive: false, webActive: false, characters: [] };
function loadShopInv() {
  try {
    const raw = localStorage.getItem(SHOP_INV_KEY);
    if (raw) shopInv = { ...shopInv, ...JSON.parse(raw) };
  } catch(_){}
}
function saveShopInv() {
  try { localStorage.setItem(SHOP_INV_KEY, JSON.stringify(shopInv)); } catch(_){}
}

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

function randRange(a, b) {
  return a + Math.random() * (b - a);
}
function deg2rad(d) { return (d * Math.PI) / 180; }

// Effective scaling for level 1 ease (rope position/length/spacing only)
function lv1Scale() {
  return getLevelByExp(exp) === 1 ? 0.8 : 1.0;
}

function spawnInitialRope() {
  // Create a rope whose tip passes through player's screenX at t=0 (attached start)
  const speedMultiplier = fastModeEnabled ? 1.5 : 1.0;
  const A = deg2rad(CONFIG.AmaxDeg);
  const L = 180;
  const kOmega = CONFIG.kOmegaMax; // Use max speed factor
  const omega = Math.sqrt(CONFIG.gravity / L) * kOmega * speedMultiplier;
  const t = simTime;
  // choose theta0 near 0 (bottom) for a calm start
  const theta0 = -A; // Start at the peak for maximum initial swing
  const phi = Math.acos(Math.max(-1, Math.min(1, theta0 / A))) - omega * t;
  const desiredX = camera.x + SCREEN_TARGET_X;
  const anchorX = desiredX - L * Math.sin(theta0);
  const r = new Rope({ anchorX, anchorY: CONFIG.ceilingY, L, A, omega, phi, createdAt: simTime, id: `r${nextRopeId++}` });
  ropes.push(r);
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
  const s = lv1Scale();
  // estimate velocities after detach
  const vxEst = (player.mode === 'free') ? Math.max(CONFIG.minVx, Math.min(CONFIG.maxVx, player.vx)) : ((CONFIG.baseVx + 40) * speedMultiplier);
  const vy0 = -CONFIG.jumpImpulse * 0.9; // rough estimate for planning

  // Try multiple candidates for robust reachability
  // Use the last NORMAL rope (ignore any web rope) as the spacing base
  let prev = null;
  for (let i = ropes.length - 1; i >= 0; i--) {
    if (!ropes[i].isWebRope) { prev = ropes[i]; break; }
  }

  // Star (fever) mode: fixed-length, dense spacing, small jitter; loosen catch acceptance
  if (starModeActive) {
    const A = deg2rad(CONFIG.starAdeg);
    let L = CONFIG.starL * s;
    const kOmega = 1.0;
    const desiredEdgeX = camera.x + (CONFIG.maxAnchorX * s) - randRange(4, CONFIG.starEdgeJitter * s);
    for (let tries = 0; tries < 60; tries++) {
      const useShort = true;
      let D = randRange(CONFIG.starDmin * s, CONFIG.starDmax * s);
      const baseX = prev ? prev.anchorX : x0;
      let anchorX = Math.max(baseX + D, desiredEdgeX);
      const kOmega2 = kOmega * (fastModeEnabled ? 1.4 : 1.0);
      const omega = Math.sqrt(CONFIG.gravity / L) * kOmega2;
      const theta_hit = randRange(-A * 0.6, A * 0.6);
      const tipX = anchorX + L * Math.sin(theta_hit);
      const t_hit = (tipX - x0) / Math.max(120, vxEst);
      if (t_hit < 0.30 || t_hit > 1.00) continue;
      const yProj = y0 + vy0 * t_hit + 0.5 * CONFIG.gravity * t_hit * t_hit;
      const L_target = (yProj - CONFIG.ceilingY) / Math.cos(theta_hit);
      if (isFinite(L_target)) {
        L = Math.max(CONFIG.Lmin * s, Math.min(CONFIG.Lmax * s, CONFIG.starL * s));
      }
      const omega2 = Math.sqrt(CONFIG.gravity / L) * kOmega2;
      const tipX2 = anchorX + L * Math.sin(theta_hit);
      const yTip2 = CONFIG.ceilingY + L * Math.cos(theta_hit);
      const dy = Math.abs(yTip2 - yProj);
      const phi = Math.acos(Math.max(-1, Math.min(1, theta_hit / A))) - omega2 * (simTime + t_hit);
      const glowBonus = shopInv.glowLevel ? (shopInv.glowLevel * 0.167 * CONFIG.catchBase) : 0;
      const catchR = ((pendingCatchR > 0 ? pendingCatchR : CONFIG.catchBase) + glowBonus) * 1.2;
      if (Math.abs(tipX2 - (x0 + vxEst * t_hit)) < 12 && dy <= catchR) {
        return new Rope({ anchorX, anchorY: CONFIG.ceilingY, L, A, omega: omega2, phi, createdAt: simTime, id: `r${nextRopeId++}` });
      }
    }
    // Fallback for star mode
    const A2 = A;
    const L2 = Math.max(CONFIG.Lmin * s, Math.min(CONFIG.Lmax * s, CONFIG.starL * s));
    const omega = Math.sqrt(CONFIG.gravity / L2) * (fastModeEnabled ? 1.4 : 1.0);
    const theta_hit = 0;
    const t_hit = 0.6;
    const desiredEdgeX2 = camera.x + (CONFIG.maxAnchorX * s) - randRange(4, CONFIG.starEdgeJitter * s);
    const baseX = prev ? prev.anchorX : x0;
    let anchorX = Math.max(baseX + CONFIG.starDmin * s, desiredEdgeX2);
    const phi = Math.acos(Math.max(-1, Math.min(1, (theta_hit || 1e-6) / A2))) - omega * (simTime + t_hit);
    return new Rope({ anchorX, anchorY: CONFIG.ceilingY, L: L2, A: A2, omega, phi, createdAt: simTime, id: `r${nextRopeId++}` });
  }
  for (let tries = 0; tries < 60; tries++) {
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
    // If clamped to edge, still attempt with smaller step
    const A = deg2rad(randRange(CONFIG.AminDeg, CONFIG.AmaxDeg));
    let L = randRange(CONFIG.Lmin * s, CONFIG.Lmax * s);
    const kOmega = randRange(CONFIG.kOmegaMin, CONFIG.kOmegaMax);
    const omega = Math.sqrt(CONFIG.gravity / L) * kOmega * speedMultiplier;

    // choose target swing angle near bottom, but allow wider variety
    const theta_hit = randRange(-A * 0.75, A * 0.75);
    const tipX = anchorX + L * Math.sin(theta_hit);
    // t to reach that x with vx
    const t_hit = (tipX - x0) / vxEst;
    if (t_hit < 0.50 || t_hit > 1.10) continue;

    // y alignment: choose L so that tipY close to projectile y
    const yProj = y0 + vy0 * t_hit + 0.5 * CONFIG.gravity * t_hit * t_hit;
    // target L from y: yTip = ceiling + L*cos(theta)
    const L_target = (yProj - CONFIG.ceilingY) / Math.cos(theta_hit);
    if (isFinite(L_target)) {
      // Add ±length jitter to avoid uniformity
      let L_jitter = L_target * (1 + randRange(-CONFIG.lengthJitterPct, CONFIG.lengthJitterPct));
      if (shortPick) L_jitter *= CONFIG.shortLFactor; // deterministically short when picked
      else if (Math.random() < CONFIG.longLChance) L_jitter *= CONFIG.longLFactor;
      L = Math.max(CONFIG.Lmin * s, Math.min(CONFIG.Lmax * s, L_jitter));
    }
    const omega2 = Math.sqrt(CONFIG.gravity / L) * kOmega * speedMultiplier;
    const tipX2 = anchorX + L * Math.sin(theta_hit);
    const yTip2 = CONFIG.ceilingY + L * Math.cos(theta_hit);
    const dy = Math.abs(yTip2 - yProj);
    const phi = Math.acos(Math.max(-1, Math.min(1, theta_hit / A))) - omega2 * (simTime + t_hit);

    // Accept if vertical error within catch window
    const vtipApprox = L * omega2 * A; // rough
    const catchR = CONFIG.catchBase + Math.min(CONFIG.catchBonusMax, vtipApprox * CONFIG.catchVelScale);
    if (Math.abs(tipX2 - (x0 + vxEst * t_hit)) < 8 && dy <= catchR * 0.95) {
      return new Rope({ anchorX, anchorY: CONFIG.ceilingY, L, A, omega: omega2, phi, createdAt: simTime, id: `r${nextRopeId++}` });
    }
  }
  // Fallback: place a moderate rope slightly to the right; catch will rely on generous radius
  const A = deg2rad(randRange(8, 16));
  let L = Math.min(CONFIG.Lmax * s, Math.max(CONFIG.Lmin * s, 180 * randRange(0.9, 1.1) * s));
  if (Math.random() < CONFIG.shortLChance) {
    L = Math.max(CONFIG.Lmin * s, L * CONFIG.shortLFactor);
  } else if (Math.random() < CONFIG.longLChance) {
    L = Math.min(CONFIG.Lmax * s, L * CONFIG.longLFactor);
  }
  const kOmega = 1.0;
  const omega = Math.sqrt(CONFIG.gravity / L) * kOmega * speedMultiplier;
  const theta_hit = 0;
  const t_hit = 0.8;
  const desiredEdgeX2 = camera.x + (CONFIG.maxAnchorX * s) - randRange(8, CONFIG.edgeSpawnJitter * s);
  let anchorX = Math.max((prev ? prev.anchorX + CONFIG.Dmin * s : x0 + CONFIG.Dmin * s), desiredEdgeX2);
  const phi = Math.acos(Math.max(-1, Math.min(1, (theta_hit || 1e-6) / A))) - omega * (simTime + t_hit);
  return new Rope({ anchorX, anchorY: CONFIG.ceilingY, L, A, omega, phi, createdAt: simTime, id: `r${nextRopeId++}` });
}

function ensureRopesBuffered() {
  const s = lv1Scale();
  // Spawn only when the farthest NORMAL rope is behind the target edge position
  const targetEdgeX = camera.x + (CONFIG.maxAnchorX * s) - 8;
  const fillUntil = starModeActive ? (camera.x + (CONFIG.maxAnchorX * s) + CONFIG.width * 0.25) : targetEdgeX;
  let spawnCount = 0;
  while (true) {
    let prev = null;
    for (let i = ropes.length - 1; i >= 0; i--) {
      if (!ropes[i].isWebRope) { prev = ropes[i]; break; }
    }
    const farthestX = prev ? prev.anchorX : -Infinity;
    if (farthestX >= fillUntil) break;
    const r = planNextRope();
    ropes.push(r);
    ropesBufferedThisStep = true;
    // Maybe spawn a box between prev and new rope if eligible
    if (!starModeActive && prev && exp >= 50 && Math.random() < CONFIG.itemSpawnProb) {
      const midX = prev.anchorX + (r.anchorX - prev.anchorX) * 0.5;
      // Place much higher, with vertical randomness
      const minY = CONFIG.ceilingY + 60;
      const maxY = Math.min(CONFIG.height * 0.38, (CONFIG.height - CONFIG.groundH) - 140);
      const by = randRange(minY, maxY);
      const kinds = ['extraJump', 'wideCatch', 'bigSize'];
      // Test: 50% chance to spawn a star box, else pick from normal kinds
      const kind = (Math.random() < 0.5) ? 'star' : kinds[Math.floor(Math.random() * kinds.length)];
      boxes.push({ x: midX, y: by, kind, active: true, phase: Math.random() * Math.PI * 2 });
    }
    spawnCount++;
    if (!starModeActive || spawnCount >= 10) break; // safety cap
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
  spawnInitialRope();
  ensureRopesBuffered();
  airJumpsLeft = 0;
  usedAirJumps = 0;
  particles.length = 0; // clear lingering effects on restart
  lastEarned = 0;
  pendingExtraJump = false;
  pendingCatchR = 0;
  pendingSizeScale = 0;
  lastDemoLoss = false;
  gameOverLevelUp = null;
  levelUpPopupTimer = 0;
  usedFlyThisRun = false;
  usedWebThisRun = false;
}

function drawBackground(g) {
  // Sky already via body background; draw ground and horizon
  const groundY = CONFIG.height - CONFIG.groundH;

  // Horizon line
  g.strokeStyle = 'rgba(255,255,255,0.05)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(0, groundY + 0.5);
  g.lineTo(CONFIG.width, groundY + 0.5);
  g.stroke();

  // Ground
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
let frameEndReset = false; // UI 클릭 상태 프레임 끝에서 리셋
function guideButtonRect() {
  const w = 92, h = 24;
  const x = (CONFIG.width - w) / 2;
  const y = CONFIG.height * 0.85;  // Moved down significantly to avoid overlap
  return { x, y, w, h };
}
function pointInRect(px, py, r) { return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h; }

function updateIntro(dt) {
  // Debounce to ensure we show intro at least a moment after transitions
  if (simTime < inputLockUntil) { UI.reset && UI.reset(); return; }
  const btn = guideButtonRect();
  if (showGuide) {
    if (UI.clicked || UI.keyPressed === 'Escape' || UI.keyPressed === 'Space') {
      showGuide = false;
      UI.reset();
    }
    return;
  }
  if (UI.clicked && pointInRect(UI.mx, UI.my, btn)) {
    showGuide = true;
    UI.reset();
    return;
  }
  
  // Check for shop button clicks (if level >= 2)
  const lvl = getLevelByExp(exp);
  if (lvl >= 2 && UI.clicked) {
    const bw = 100, bh = 36;
    const spacing = 10;
    const totalWidth = bw * 2 + spacing;
    const startX = (CONFIG.width - totalWidth) / 2;
    const by = CONFIG.height * 0.65;
    
    // ITEMS button
    if (UI.mx >= startX && UI.mx <= startX + bw && UI.my >= by && UI.my <= by + bh) {
      previousState = State.current; // 이전 상태 저장
      State.current = 'shop';
      shopMode = 'items';
      shopScroll = 0;
      UI.reset();
      return;
    }
    
    // CHARS button
    const charsX = startX + bw + spacing;
    if (UI.mx >= charsX && UI.mx <= charsX + bw && UI.my >= by && UI.my <= by + bh) {
      previousState = State.current; // 이전 상태 저장
      State.current = 'shop';
      shopMode = 'chars';
      shopScroll = 0;
      UI.reset();
      return;
    }
  }
  
  // Start game on space or click outside buttons
  if (UI.keyPressed === 'Space' || UI.clicked) {
    UI.reset();
    resetRun();
    return;
  }
}

function renderIntro(g, t) {
  drawBackground(g);
  drawCenteredText(g, '쩜푸 쩜푸', CONFIG.height * 0.28, 20);
  const blink = Math.sin(t * 3) > 0 ? 1 : 0.3;
  g.globalAlpha = blink;
  drawCenteredText(g, 'PRESS START', CONFIG.height * 0.52, 14);
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
    g.fillText('ITEMS', startX + bw/2, by + bh/2 + 1);
    
    // CHARS button
    const charsX = startX + bw + spacing;
    g.fillStyle = '#22334a';
    g.fillRect(charsX, by, bw, bh);
    g.strokeStyle = '#b4c0d9';
    g.strokeRect(charsX, by, bw, bh);
    g.fillStyle = '#ffffff';
    g.fillText('CHARS', charsX + bw/2, by + bh/2 + 1);
  }
  
  // Guide button
  const btn = guideButtonRect();
  g.fillStyle = '#22334a';
  g.strokeStyle = '#b4c0d9';
  g.lineWidth = 2;
  g.fillRect(btn.x, btn.y, btn.w, btn.h);
  g.strokeRect(btn.x, btn.y, btn.w, btn.h);
  g.fillStyle = '#ffffff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
  g.fillText('GUIDE', btn.x + btn.w/2, btn.y + btn.h/2 + 1);

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
    const lines = [
      'Game Guide',
      '',
      '- Go as far as possible',
      '- Use multiple jumps each run',
      '- Catch the rope tip to attach',
    ];
    g.fillStyle = '#ffffff';
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.font = `9px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    let ly = py + 14;
    for (const line of lines) {
      g.fillText(line, px + 12, ly);
      ly += 14;
    }
    g.fillStyle = '#b4c0d9';
    g.font = `8px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.textAlign = 'center';
    g.fillText('Click anywhere to close', px + pw/2, py + ph - 18);
    g.restore();
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
  simTime += dt;
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
      player.vx = Math.max(CONFIG.minVx, Math.min(CONFIG.maxVx, ((tip.vx || 0) * js + CONFIG.baseVx * js) * speedMultiplier));
      player.vy = (tip.vy || 0) * js - CONFIG.jumpImpulse * upFactor * js;
      // prevent instant re-catch on the same rope
      lastDetachedRope = player.rope;
      player.rope = null;
      catchLockUntil = simTime + 0.2; // 200ms lock
      // Base additional jumps: 1 for all levels; items can add more
      const baseAir = 1 + (shopInv.plusJump ? 1 : 0);
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
        saveShopInv();
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
        saveShopInv();
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

  // Box pickup
  for (const b of boxes) {
    if (!b.active) continue;
    const wobble = Math.sin(simTime * 3 + (b.phase || 0)) * 6;
    const dx = b.x - player.x;
    const dy = (b.y + wobble) - player.y;
    if (Math.hypot(dx, dy) <= 22) {
      // collect
      b.active = false;
      if (b.kind === 'star') {
        // Activate fever and immediately attach a web rope like web item
        starModeActive = true;
        starModeEndTime = simTime + (CONFIG.starDuration || 3.0);
        const webAnchorY = player.y - 400;
        const newWebRope = new Rope({
            anchorX: player.x,
            anchorY: webAnchorY,
            L: 400,
            A: 0, omega: 0, phi: 0,
            isWebRope: true,
            // Do NOT retract for star-start attach (starts at same height)
            webTargetL: null,
            id: `r${nextRopeId++}`
        });
        // Reset ropes to only this web rope, clear boxes
        ropes.length = 0;
        ropes.push(newWebRope);
        boxes.length = 0;
        // Attach player
        player.rope = newWebRope;
        player.mode = 'attached';
        lastDetachedRope = null;
        catchLockUntil = simTime + 0.2;
        webRopeJustCreated = true;
        spawnEffect('big', b.x, b.y);
      } else {
          spawnEffect('burst', b.x, b.y);
          if (b.kind === 'extraJump') pendingExtraJump = true;
          else if (b.kind === 'wideCatch') pendingCatchR = 50;
          else if (b.kind === 'bigSize') pendingSizeScale = 1.5;
      }
    }
  }

  // Update player
  player.update(dt, simTime);
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
    if (player.mode === 'free' && airJumpsLeft <= 0) {
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
      const catchR = (pendingCatchR > 0 ? pendingCatchR : CONFIG.catchBase) + glowBonus;
      if (Math.hypot(dx, dy) <= catchR) {
        // Attach
        player.mode = 'attached';
        player.rope = rope;
        const gained = starModeActive ? 3 : ((usedAirJumps === 0) ? 3 : (usedAirJumps === 1) ? 2 : 1);
        score += gained;
        const kind = (gained === 3) ? 'big' : (gained === 2) ? 'medium' : 'small';
        const tipNow = rope.tip(simTime);
        spawnEffect(kind, tipNow.x, tipNow.y);

        if (starModeActive || usedAirJumps === 0) {
          comboCount++;
          if (comboCount >= 2) {
            spawnEffect('combo', player.x, player.y - 30, `${comboCount} COMBO`);
          }
        } else {
          comboCount = 0;
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
  const groundY = CONFIG.height - CONFIG.groundH;
  const collR = playerCollisionRadius();
  if (player.y + collR >= groundY) {
    player.y = groundY - collR;
    comboCount = 0; // Reset combo on death
    // Ground break effect at impact
    spawnEffect('break', player.x, groundY);
    // Earnings and EXP: $1 and 1 EXP per point beyond 5 this run
    let earned = Math.max(0, Math.floor(score - 5));
    if (shopInv.gambleActive) {
      earned = Math.floor(earned * 1.5);
      shopInv.gambleActive = false; // Consume gamble
      saveShopInv();
    }
    lastEarned = earned;
    // Compute potential level-up BEFORE applying demo resets (based on EXP)
    const prevLevel = getLevelByExp(exp);
    const newLevel = getLevelByExp(exp + earned);
    if (newLevel > prevLevel) {
      gameOverLevelUp = { from: prevLevel, to: newLevel };
      levelUpPopupTimer = 0;
      // celebratory particles near screen center
      const cx = camera.x + CONFIG.width / 2;
      const cy = CONFIG.height * 0.36;
      spawnEffect('big', cx, cy);
    }
    if (earned > 0) {
      // Add to money and EXP
      savings += earned;
      exp += earned;
      try {
        localStorage.setItem(SAVINGS_KEY, String(savings));
        localStorage.setItem(EXP_KEY, String(exp));
      } catch(_){}
    }
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
        shopInv = { glow: false, budsLevel: 0, plusJump: false, fly: false, bigLevel: 0, gambleActive: false, webActive: false };
        saveShopInv();
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
  // Fever overlay
  if (starModeActive) {
    g.save();
    const pulse = 0.08 + 0.06 * (Math.sin(simTime * 6) * 0.5 + 0.5);
    g.fillStyle = `rgba(255,217,102,${pulse.toFixed(3)})`;
    g.fillRect(0, 0, CONFIG.width, CONFIG.height);
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

  // HUD
  g.fillStyle = '#ffffff';
  g.textAlign = 'left';
  g.textBaseline = 'top';
  g.font = `12px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
  g.fillText(`SCORE ${score}`, 12, 10);
  g.fillText(`BEST ${best}`, 12, 28);
  g.textAlign = 'right';
  g.fillText(`SAV ${savings}`, CONFIG.width - 12, 10);
  // Fever badge and timer
  if (starModeActive) {
    const rem = Math.max(0, starModeEndTime - simTime);
    g.textAlign = 'center';
    g.fillStyle = '#ffd966';
    g.font = `12px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText('FEVER', CONFIG.width / 2, 10);
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
  g.fillText(`LV ${getLevelByExp(exp)}`, 12, 46);
}

function updateGameOver(dt) {
  // allow particles to continue animating on game over
  updateParticles(dt);
  // advance gameover local timer
  gameOverTimer += dt;
  levelUpPopupTimer += dt;
  const wait = CONFIG.gameOverWait || 5.0;
  // 잠금 기간 동안 입력을 소비/지우기 (나중에 자동 트리거되지 않도록)
  if (gameOverTimer < wait) {
    if (typeof UI !== 'undefined') UI.reset();
    Input.down = false; Input.justPressed = false;
    return; // 타이머가 준비되지 않았으면 여기서 종료
  }
  
  // 타이머가 준비되면 버튼 클릭 확인
  const lvl = getLevelByExp(exp);
  
  // 우선순위 1: ITEMS 또는 CHARS 버튼 클릭 확인 (레벨>=2)
  if (typeof UI !== 'undefined' && (UI.clicked || UI.justReleased) && lvl >= 2) {
    const bw = 100, bh = 36;
    const spacing = 10;
    const totalWidth = bw * 2 + spacing;
    const startX = (CONFIG.width - totalWidth) / 2;
    const by = CONFIG.height * 0.80;
    
    
    // ITEMS 버튼 확인
    const itemsBx = startX;
    if (UI.mx >= itemsBx && UI.mx <= itemsBx + bw && UI.my >= by && UI.my <= by + bh) {
      previousState = State.current; // 이전 상태 저장
      State.current = 'shop';
      shopMode = 'items'; // 아이템 상점 모드로 설정
      shopScroll = 0; shopDrag.active = false; shopConfirm = null; shopHelp = false;
      if (typeof UI !== 'undefined') UI.reset();
      Input.down = false; Input.justPressed = false;
      return;
    }
    
    // CHARS 버튼 확인
    const charsBx = startX + bw + spacing;
    if (UI.mx >= charsBx && UI.mx <= charsBx + bw && UI.my >= by && UI.my <= by + bh) {
      previousState = State.current; // 이전 상태 저장
      State.current = 'shop'; 
      shopMode = 'chars'; // 캐릭터 상점 모드로 설정
      shopScroll = 0; shopDrag.active = false; shopConfirm = null; shopHelp = false;
      if (typeof UI !== 'undefined') UI.reset();
      Input.down = false; Input.justPressed = false;
      return;
    }
  }
  
  // 우선순위 2: 빠른 모드 토글 클릭 확인 (레벨>=8)
  if (lvl >= 8 && typeof UI !== 'undefined' && (UI.clicked || UI.justReleased)) {
    const bw = 140, bh = 24;
    const bx = (CONFIG.width - bw) / 2;
    const by = CONFIG.height * 0.80 + 80; // moved down by 30px
    if (UI.mx >= bx && UI.mx <= bx + bw && UI.my >= by && UI.my <= by + bh) {
      fastModeEnabled = !fastModeEnabled;
      UI.reset();
      return; // 이 클릭에서 다른 동작 방지
    }
  }
  
  // 우선순위 3: 다른 입력으로 직접 재시작 (버튼을 클릭하지 않은 경우에만)
  // Input.anyPressed()를 제거하고 mouseup 이벤트(UI.clicked)만 사용
  if (typeof UI !== 'undefined' && (UI.clicked || UI.keyPressed === 'Space' || UI.keyPressed === 'Escape')) {
    if (typeof UI !== 'undefined') UI.reset();
    Input.down = false; Input.justPressed = false;
    resetRun();
  }
}

function renderGameOver(g) {
  drawBackground(g);
  drawParticles(g);
  if (lastDemoLoss) {
    drawCenteredText(g, 'GAME OVER', CONFIG.height * 0.30 - 20, 18, '#ff6666');
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'top';
    g.font = `12px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText('YOU LOSE EVERYTHING.', CONFIG.width / 2, CONFIG.height * 0.40 - 20);
    g.fillText('YOU WILL BECOME A SMALL EGG.', CONFIG.width / 2, CONFIG.height * 0.46 - 20);
  } else {
    drawCenteredText(g, 'GAME OVER', CONFIG.height * 0.30 - 20, 18, '#ff6666');
    drawCenteredText(g, `SCORE ${score}`, CONFIG.height * 0.40 - 20, 12);

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
      nextText = 'Try to exceed 111P';
    } else {
      const next = nextLevelThreshold(exp);
      nextText = next ? `Next Level: ${next}P` : 'Max level reached!';
    }
    const earnedText = (lastEarned > 0) ? `Gained: $${lastEarned} / +${lastEarned}P` : 'Earn $ and P by scoring over 5';
    // Next Target line with Score font size (12px)
    g.font = `12px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(nextText, CONFIG.width / 2, y0);
    // Other lines with default small font (10px)
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    // EXP and SAV in one line
    g.fillText(`EXP: ${exp}P | SAV: $${savings}`, CONFIG.width / 2, y0 + 32);
    // Earn explanation three lines below
    g.fillText(earnedText, CONFIG.width / 2, y0 + 80);
  }

  // Level-up popup when level increased this game over
  if (gameOverLevelUp) {
    const cx = CONFIG.width / 2;
    const cy = CONFIG.height * 0.22 - 20;
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `12px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(`LEVEL UP! LV ${gameOverLevelUp.to}`, cx, cy);
  }
  const wait = CONFIG.gameOverWait || 5.0;
  const rem = Math.max(0, wait - gameOverTimer);
  if (rem > 0) {
    // Countdown until retry is enabled
    const sec = Math.ceil(rem);
    drawCenteredText(g, `RETRY IN ${sec}`, CONFIG.height * 0.74 - 20, 10, '#b4c0d9');
  } else {
    drawCenteredText(g, 'CLICK / SPACE TO RETRY', CONFIG.height * 0.74 - 20, 10, '#b4c0d9');
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
      g.fillText('ITEMS', itemsBx + bw/2, by + bh/2 + 1);
      
      // CHARS button
      const charsBx = startX + bw + spacing;
      g.fillStyle = '#22334a';
      g.fillRect(charsBx, by, bw, bh);
      g.strokeStyle = '#b4c0d9';
      g.strokeRect(charsBx, by, bw, bh);
      g.fillStyle = '#ffffff';
      g.fillText('CHARS', charsBx + bw/2, by + bh/2 + 1);

      // Fast mode toggle (Level >= 8)
      if (lvl >= 8) {
        const bw = 140, bh = 24;
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
        g.fillText(`FAST MODE: ${fastModeEnabled ? 'ON' : 'OFF'}`, bx + bw/2, by + bh/2 + 1);
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
  loadTuningLocal();
  await maybeLoadTuningFromServer();
  applyTuningToConfig();
  setupDebugUI();
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
    if (!demoDone) {
      demoActive = true;
      if (savings < 100) {
        savings = 100;
        localStorage.setItem(SAVINGS_KEY, String(savings));
      }
    }
  } catch (_) {}
  // Load shop inventory
  loadShopInv();
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
    saveShopInv();
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
    acc -= dt;
    Input.endFrame();
    
    // UI 클릭 상태를 프레임 끝에서 리셋
    // setTimeout 대신 프레임 끝에서 처리하여 안정성 향상
    if (frameEndReset) {
      UI.clicked = false;
      UI.justReleased = false;
      frameEndReset = false;
    }
    if (UI.clicked || UI.justReleased) {
      frameEndReset = true;
    }
  }
  webRopeJustCreated = false;
    // Render
  if (State.current === 'intro') renderIntro(ctx, now / 1000);
  else if (State.current === 'run') renderRun(ctx);
  else if (State.current === 'gameover') renderGameOver(ctx);
  else if (State.current === 'shop') renderShop(ctx);

  requestAnimationFrame(tick);
}

// Notes for next steps:
// - Add Rope class (anchor, L, A, omega, phase) and single-rope attach/detach.
// - Then implement multi-rope spawner with reachability guarantee.
// Shop item definitions
const SHOP_ITEMS = [
  { id: 'glow', name: 'Glow', type: 'level', maxLevel: 3, price: 20, minLevel: 2 },
  { id: 'buds', name: 'Buds', type: 'level', maxLevel: 5, price: 10, minLevel: 2 },
  { id: 'plusjump', name: '+Jump', type: 'single', price: 100, minLevel: 2 },
  { id: 'fly', name: 'Fly', type: 'single', price: 100, minLevel: 2 },
  { id: 'big', name: 'Big', type: 'level', price: 20, minLevel: 5 },
  { id: 'gamble', name: 'Gamble', type: 'single', price: 10, minLevel: 1 },
  { id: 'web', name: 'Web', type: 'single', price: 3, minLevel: 1 },
  { id: 'magnet', name: 'Magnet', type: 'level', maxLevel: 5, price: 30, minLevel: 3 },
  { id: 'shield', name: 'Shield', type: 'single', price: 100, minLevel: 4 },
  { id: 'combo', name: 'Combo+', type: 'level', maxLevel: 3, price: 80, minLevel: 6 },
  { id: 'slow', name: 'Slow', type: 'single', price: 100, minLevel: 3 },
  { id: 'double', name: 'Double', type: 'single', price: 100, minLevel: 8 },
  { id: 'lucky', name: 'Lucky', type: 'level', maxLevel: 5, price: 40, minLevel: 2 },
  { id: 'revival', name: 'Revival', type: 'single', price: 100, minLevel: 10 },
  { id: 'rainbow', name: 'Rainbow', type: 'single', price: 30, minLevel: 3 },
  { id: 'fever', name: 'Fever+', type: 'level', maxLevel: 3, price: 60, minLevel: 5 },
  { id: 'bank', name: 'Bank', type: 'level', maxLevel: 5, price: 100, minLevel: 1 },
];

function getItemLevel(it) {
  if (it.id === 'buds') return shopInv.budsLevel || 0;
  if (it.id === 'glow') return shopInv.glowLevel || 0;
  if (it.id === 'plusjump') return shopInv.plusJump ? 1 : 0;
  if (it.id === 'fly') return shopInv.fly ? 1 : 0;
  if (it.id === 'big') return shopInv.bigLevel || 0;
  if (it.id === 'gamble') return shopInv.gambleActive ? 1 : 0;
  if (it.id === 'web') return shopInv.webActive ? 1 : 0;
  if (it.id === 'magnet') return shopInv.magnetLevel || 0;
  if (it.id === 'shield') return shopInv.shield ? 1 : 0;
  if (it.id === 'combo') return shopInv.comboLevel || 0;
  if (it.id === 'slow') return shopInv.slow ? 1 : 0;
  if (it.id === 'double') return shopInv.double ? 1 : 0;
  if (it.id === 'lucky') return shopInv.luckyLevel || 0;
  if (it.id === 'revival') return shopInv.revival ? 1 : 0;
  if (it.id === 'rainbow') return shopInv.rainbow ? 1 : 0;
  if (it.id === 'fever') return shopInv.feverLevel || 0;
  if (it.id === 'bank') return shopInv.bankLevel || 0;
  return 0;
}
function currentBodySides() {
  const lvl = getLevelByExp(exp);
  if (lvl <= 1) return 0;
  const groupIdx = Math.floor((lvl - 2) / 3);
  return 3 + Math.max(0, groupIdx);
}
function isItemSoldOut(it) {
  if (it.id === 'gamble') return !!shopInv.gambleActive;
  if (it.id === 'web') return !!shopInv.webActive;
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
  // Big: 20$, 30$, 40$... per purchase; Buds: flat per level
  if (it.id === 'big') return 20 + 10 * lvl;
  return it.price;
}

function shopGrid() {
  const cols = 3;
  const cellW = Math.floor((CONFIG.width * 0.86) / cols);
  const cellH = 64;
  const marginX = Math.floor((CONFIG.width - cols * cellW) / 2);
  const top = Math.floor(CONFIG.height * 0.20);
  const paddingTop = 20; // Add top padding
  const paddingBottom = 20; // Add bottom padding
  return { cols, cellW, cellH, marginX, top, paddingTop, paddingBottom };
}

function shopHelpRect() { return lastShopHelpRect; }

function itemDescription(id) {
  if (id === 'fly') return 'Hold to fly upward once per run.';
  if (id === 'plusjump') return 'Extra air jump during free fall.';
  if (id === 'glow') return 'Glow effect and +5% catch range per level (max 3).';
  if (id === 'buds') return 'Adds trailing orbs to vertices (max = sides).';
  if (id === 'big') return 'Grows by 2.5% per level (max = player level).';
  if (id === 'gamble') return 'Next run earns 1.5x money (one-time use).';
  if (id === 'web') return 'Emergency web when falling (one-time use).';
  if (id === 'magnet') return 'Auto-collect items +30px range per level (max 5).';
  if (id === 'shield') return 'Blocks rope snap once per run.';
  if (id === 'combo') return 'Combo score +0.5x per level (max 3).';
  if (id === 'slow') return 'Auto slow-mo when falling (3 times per run).';
  if (id === 'double') return 'Jump boost 1.3x stronger from ropes.';
  if (id === 'lucky') return 'Item spawn chance +5% per level (max 5).';
  if (id === 'revival') return 'Revive once when falling to ground.';
  if (id === 'rainbow') return 'Rainbow color animation effect.';
  if (id === 'fever') return 'Star mode duration +2 sec per level (max 3).';
  if (id === 'bank') return 'Earnings +10% interest per level (max 5).';
  return 'No description.';
}

function renderCharacterShop(g) {
  // Character shop UI
  const titleY = CONFIG.height * 0.12;
  drawCenteredText(g, 'CHARACTERS', titleY, 14);
  
  // Show SAV at top-right
  g.fillStyle = '#ffffff';
  g.textAlign = 'right';
  g.textBaseline = 'top';
  g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
  g.fillText(`SAV: $${savings}`, CONFIG.width - 12, titleY + 24);
  
  // Help button '?' for character shop
  {
    g.font = `14px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    const tw = g.measureText('CHARACTERS').width;
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
  
  // Get purchased characters from inventory
  const charInv = shopInv.characters || [];
  
  // Character grid
  const chars = Object.entries(PIXEL_CHARACTERS);
  const cols = 2;
  const cellW = CONFIG.width / cols;
  const cellH = 100;
  const marginX = 20;
  const top = titleY + 50;
  const gap = 10;
  
  // Calculate content height and max scroll
  const rows = Math.ceil(chars.length / cols);
  const contentH = rows * (cellH + gap) - gap;
  const viewportH = CONFIG.height - top - 100; // Leave space for buttons
  const maxScroll = Math.max(0, contentH - viewportH);
  shopScroll = Math.max(0, Math.min(maxScroll, shopScroll));
  
  // Clip to viewport
  g.save();
  g.beginPath();
  g.rect(0, top, CONFIG.width, viewportH);
  g.clip();
  
  // Draw character cards
  chars.forEach(([id, char], i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const x = marginX + c * cellW;
    const y = top + r * (cellH + 10) - shopScroll;
    
    // Card background
    g.fillStyle = '#0f1a2a';
    g.strokeStyle = '#b4c0d9';
    g.lineWidth = 2;
    g.fillRect(x + 6, y, cellW - 40, cellH);
    g.strokeRect(x + 6, y, cellW - 40, cellH);
    
    // Character preview
    const px = x + 20;
    const py = y + 15;
    
    if (id === 'default') {
      // Draw current polygon shape for Polygon character
      const sides = currentBodySides();
      const radius = 12;
      const centerX = px + 8;
      const centerY = py + 8;
      
      if (sides === 0) {
        // Circle for level 1
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.arc(centerX, centerY, radius, 0, Math.PI * 2);
        g.fill();
      } else {
        // Polygon for level 2+
        g.fillStyle = '#ffffff';
        g.beginPath();
        for (let i = 0; i <= sides; i++) {
          const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
          const vx = centerX + Math.cos(angle) * radius;
          const vy = centerY + Math.sin(angle) * radius;
          if (i === 0) g.moveTo(vx, vy);
          else g.lineTo(vx, vy);
        }
        g.closePath();
        g.fill();
      }
    } else {
      // Pixel art for other characters
      const pixScale = 2;
      char.pixels.forEach((row, ry) => {
        row.forEach((pixel, rx) => {
          if (pixel) {
            g.fillStyle = char.colors[pixel - 1] || '#ffffff';
            g.fillRect(px + rx * pixScale, py + ry * pixScale, pixScale, pixScale);
          }
        });
      });
    }
    
    // Character name
    g.fillStyle = '#ffffff';
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(char.name, x + 14, y + 50);
    
    // Price or status
    const isPurchased = charInv.includes(id) || id === 'default';
    const isSelected = selectedCharacter === id;
    
    g.textAlign = 'center';
    g.textBaseline = 'top';
    if (isPurchased) {
      if (isSelected) {
        g.fillStyle = '#ffff88';
        g.fillText('SELECTED', x + cellW/2 - 20, y + 70);
      } else {
        g.fillStyle = '#88ff88';
        g.fillText('OWNED', x + cellW/2 - 20, y + 70);
      }
    } else {
      g.fillStyle = '#ffffff';
      g.fillText(`$${char.price}`, x + cellW/2 - 20, y + 70);
    }
  });
  
  g.restore(); // End clip
  
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
  g.fillText('BACK', startX + bw/2, by + bh/2 + 1);
  
  // ITEMS button  
  const itemsX = startX + bw + spacing;
  g.fillStyle = '#22334a';
  g.fillRect(itemsX, by, bw, bh);
  g.strokeStyle = '#b4c0d9';
  g.strokeRect(itemsX, by, bw, bh);
  g.fillStyle = '#ffffff';
  g.fillText('ITEMS', itemsX + bw/2, by + bh/2 + 1);
  
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
      g.fillText(`Select ${char.name}?`, px + pw/2, py + 20);
    } else {
      g.fillText(`Buy ${char.name} for $${char.price}?`, px + pw/2, py + 10);
      g.font = `8px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
      g.fillText(`SAV: $${savings}`, px + pw/2, py + 38);
    }
    
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
    g.fillText('YES', bx2 + bw2/2, by2 + bh2/2);
    g.fillText('NO', bx3 + bw2/2, by2 + bh2/2);
  }
  
  // Help popup for character shop
  if (shopHelp) {
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fillRect(0, 0, CONFIG.width, CONFIG.height);
    const pw = CONFIG.width * 0.86, ph = Math.min(320, CONFIG.height * 0.65);
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
    g.fillText('CHARACTER INFO', px + pw/2, py + 10);
    
    // Content area with scroll
    const contentY = py + 35;
    const contentH = ph - 45;
    
    g.save();
    g.beginPath();
    g.rect(px, contentY, pw, contentH);
    g.clip();
    
    // Character descriptions
    const chars = Object.entries(PIXEL_CHARACTERS);
    const lineHeight = 14;
    const charHeight = 55; // Height per character entry (increased for 2-line descriptions)
    let yPos = contentY + 5 - shopHelpScroll;
    
    g.textAlign = 'left';
    g.textBaseline = 'top';
    
    chars.forEach(([id, char]) => {
      // Character name
      g.fillStyle = '#fffa75';
      g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
      g.fillText(char.name.toUpperCase(), px + 10, yPos);
      
      // Price or status
      if (id === 'default') {
        g.fillStyle = '#88ff88';
        g.fillText('[OWNED]', px + pw - 80, yPos);
      } else {
        const charInv = shopInv.characters || [];
        if (charInv.includes(id)) {
          g.fillStyle = '#88ff88';
          g.fillText('[OWNED]', px + pw - 80, yPos);
        } else {
          g.fillStyle = '#ffffff';
          g.fillText(`$${char.price}`, px + pw - 80, yPos);
        }
      }
      
      // Description
      g.fillStyle = '#b4c0d9';
      g.font = `8px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
      
      let descLines = [];
      if (id === 'default') {
        descLines = ['Classic geometric shape that', 'evolves with level'];
      } else if (id === 'robot') {
        descLines = ['Mechanical precision with', 'enhanced durability'];
      } else if (id === 'ninja') {
        descLines = ['Swift and silent,', 'moves with grace'];
      } else if (id === 'pirate') {
        descLines = ['Arr! Collects 15% more', 'gold per run'];
      } else if (id === 'wizard') {
        descLines = ['Magical powers enhance', 'item effects'];
      } else if (id === 'knight') {
        descLines = ['Heavy armor provides', 'extra protection'];
      }
      
      // Draw each line of description
      descLines.forEach((line, lineIdx) => {
        g.fillText(line, px + 10, yPos + lineHeight + (lineIdx * 10));
      });
      
      yPos += charHeight; // Fixed height for consistent scrolling
    });
    
    g.restore();
    
    // Scroll indicator if needed
    const totalContentHeight = chars.length * charHeight;
    if (totalContentHeight > contentH) {
      const scrollBarHeight = 40;
      const scrollBarY = contentY + (shopHelpScroll / (totalContentHeight - contentH)) * (contentH - scrollBarHeight);
      g.fillStyle = '#b4c0d9';
      g.fillRect(px + pw - 8, scrollBarY, 4, scrollBarHeight);
    }
  }
}

function renderShop(g) {
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
  drawCenteredText(g, 'ITEMS', titleY, 14);
  // Show SAV at top-right, two lines below the SHOP title
  {
    const headerY = CONFIG.height * 0.12;
    g.fillStyle = '#ffffff';
    g.textAlign = 'right';
    g.textBaseline = 'top';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(`SAV: $${savings}`, CONFIG.width - 12, headerY + 24);
  }
  // Help button '?' positioned 20px to the right of the SHOP title
  {
    // measure SHOP text width to place the '?' with 20px gap
    g.font = `14px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    const tw = g.measureText('SHOP').width;
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
  const { cols, cellW, cellH, marginX, top, paddingTop, paddingBottom } = shopGrid();
  const gap = 8;
  // Filter items by level visibility
  const lvl = getLevelByExp(exp);
  const items = SHOP_ITEMS.filter(it => (it.minLevel || 1) <= lvl);
  // content height with padding
  const rows = Math.ceil(items.length / cols) || 1;
  const contentH = paddingTop + rows * (cellH + gap) - gap + paddingBottom;
  const viewportH = CONFIG.height - top - 90;
  // clamp scroll
  shopScroll = Math.max(0, Math.min(Math.max(0, contentH - viewportH), shopScroll));
  // draw items
  g.save();
  g.beginPath();
  g.rect(0, top, CONFIG.width, viewportH);
  g.clip();
  for (let i = 0; i < items.length; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const x = marginX + c * cellW;
    const y = top + paddingTop + r * (cellH + gap) - shopScroll;
    // card
    g.fillStyle = '#0f1a2a';
    g.strokeStyle = '#b4c0d9';
    g.lineWidth = 2;
    g.fillRect(x + 6, y, cellW - 12, cellH);
    g.strokeRect(x + 6, y, cellW - 12, cellH);
    // content
    // 1) Name
    g.fillStyle = '#ffffff';
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(items[i].name, x + 14, y + 6);
    // 2) Price (right aligned), dynamic for level-type
    g.textAlign = 'right';
    const ptext = `$${nextPriceForItem(items[i])}`;
    g.fillText(ptext, x + cellW - 14, y + 20);
    // 3) Icon (center)
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `12px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    let label;
    if (items[i].id === 'glow') label = '*';
    else if (items[i].id === 'buds') label = '+';
    else if (items[i].id === 'plusjump') label = 'J';
    else if (items[i].id === 'fly') label = '^';
    else if (items[i].id === 'gamble') label = '$';
    else if (items[i].id === 'web') label = 'W';
    else if (items[i].id === 'big') label = 'B';
    else if (items[i].id === 'magnet') label = 'M';
    else if (items[i].id === 'shield') label = 'S';
    else if (items[i].id === 'combo') label = 'C';
    else if (items[i].id === 'slow') label = '~';
    else if (items[i].id === 'double') label = '2';
    else if (items[i].id === 'lucky') label = 'L';
    else if (items[i].id === 'revival') label = 'R';
    else if (items[i].id === 'rainbow') label = '=';
    else if (items[i].id === 'fever') label = 'F';
    else if (items[i].id === 'bank') label = '%';
    else label = '?';
    g.fillText(label, x + cellW/2, y + Math.floor(cellH * 0.60));
    // 4) Level line (no max display)
    g.textAlign = 'center';
    g.textBaseline = 'bottom';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    const lvVal = getItemLevel(items[i]);
    g.fillText(`Lv. ${lvVal}`, x + cellW/2, y + cellH - 6);
    // sold out overlay
    if (isItemSoldOut(items[i])) {
      g.fillStyle = 'rgba(0,0,0,0.5)';
      g.fillRect(x + 6, y, cellW - 12, cellH);
      g.textAlign = 'center';
      g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
      if (items[i].type === 'single' || (items[i].id === 'gamble' || items[i].id === 'web')) {
        g.fillStyle = '#ff6666';
        g.fillText('SOLD OUT', x + cellW/2, y + cellH/2 + 2);
      } else {
        g.fillStyle = '#a6ffc1';
        g.fillText('MAX', x + cellW/2, y + cellH/2 + 2);
      }
    }
  }
  g.restore();
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
  g.fillText('BACK', startX + bw/2, by + bh/2 + 1);
  
  // CHARS button
  const charsX = startX + bw + spacing;
  g.fillStyle = '#22334a';
  g.fillRect(charsX, by, bw, bh);
  g.strokeStyle = '#b4c0d9';
  g.strokeRect(charsX, by, bw, bh);
  g.fillStyle = '#ffffff';
  g.fillText('CHARS', charsX + bw/2, by + bh/2 + 1);

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
    const itName = (SHOP_ITEMS.find(x=>x.id===shopConfirm.id)?.name || shopConfirm.id).toString();
    g.fillText(`Buy ${itName} for $${shopConfirm.price}?`, px + pw/2, py + 10);
    // Current SAV centered two lines below, font 2px smaller
    g.textAlign = 'center';
    g.font = `8px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(`SAV: $${savings}`, px + pw/2, py + 38);
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
    g.fillText('YES', bx2 + bw2/2, by2 + bh2/2);
    g.fillStyle = '#ffffff';
    g.fillText('NO', bx3 + bw2/2, by2 + bh2/2);
  }

  // Help popup (shows all items' descriptions with scroll)
  if (shopHelp) {
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fillRect(0, 0, CONFIG.width, CONFIG.height);
    const pw = CONFIG.width * 0.86, ph = Math.min(320, CONFIG.height * 0.65);
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
    g.fillText('ITEM DESCRIPTIONS', px + pw/2, py + 10);
    
    // Content area with scroll
    const contentTop = py + 35;
    const contentBottom = py + ph - 35; // Leave space for close instruction
    const contentHeight = contentBottom - contentTop;
    
    g.save();
    g.beginPath();
    g.rect(px, contentTop, pw, contentHeight);
    g.clip();
    
    g.fillStyle = '#ffffff';
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.font = `9px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    
    // Get all items (not just visible ones) for help
    const allItems = SHOP_ITEMS;
    
    // Calculate content dimensions
    const leftPad = 10, rightPad = 10, gap = 8;
    let nameColW = 0;
    for (const it of allItems) {
      const w = g.measureText(it.name || it.id).width;
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
    
    // Calculate total content height
    let totalContentH = 0;
    const itemHeights = [];
    for (const it of allItems) {
      const desc = itemDescription(it.id);
      const wrapped = wrapText(g, desc, descMaxW);
      const h = Math.max(14, wrapped.length * 14) + 8;
      itemHeights.push(h);
      totalContentH += h;
    }
    
    // Clamp scroll
    const maxScroll = Math.max(0, totalContentH - contentHeight);
    shopHelpScroll = Math.max(0, Math.min(maxScroll, shopHelpScroll));
    
    // Draw items
    let yy = contentTop + 5 - shopHelpScroll;
    for (let i = 0; i < allItems.length; i++) {
      const it = allItems[i];
      const name = it.name || it.id;
      const desc = itemDescription(it.id);
      const wrapped = wrapText(g, desc, descMaxW);
      
      // Skip if completely outside view
      if (yy + itemHeights[i] < contentTop || yy > contentBottom) {
        yy += itemHeights[i];
        continue;
      }
      
      // Draw name (right aligned)
      g.textAlign = 'right';
      g.fillStyle = '#ffa24d';
      g.fillText(name, nameRightX, yy);
      
      // Draw description (wrapped)
      g.textAlign = 'left';
      g.fillStyle = '#ffffff';
      for (let j = 0; j < wrapped.length; j++) {
        g.fillText(wrapped[j], descX, yy + j * 14);
      }
      
      yy += itemHeights[i];
    }
    g.restore();
    
    // Bottom close instruction (outside clipping area)
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#b4c0d9';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText('Click anywhere to close', px + pw/2, py + ph - 16);
  }
}

function updateShop(dt) {
  // auto-dismiss message after timer
  if (shopMsgTimer > 0) {
    shopMsgTimer = Math.max(0, shopMsgTimer - dt);
    if (shopMsgTimer === 0) {
      shopMsg = null;
      shopConfirm = null;
    }
  }
  // handle drag scroll start
  if (Input.down && !shopDrag.active && !shopHelp && !shopConfirm) {
    shopDrag.active = true; 
    shopDrag.y0 = UI.my; 
    shopDrag.scroll0 = shopScroll;
    shopDrag.startX = UI.mx;
    shopDrag.startY = UI.my;
    shopDrag.hasMoved = false;
  }
  
  // Click handling - process on release instead of press
  // 터치 이벤트와 마우스 이벤트 모두 처리
  if ((UI.justReleased || UI.clicked) && !shopDrag.hasMoved) {
    // 디버깅용 로그
    if (DEBUG) console.log(`Shop click detected at: ${UI.mx?.toFixed(0)}, ${UI.my?.toFixed(0)} Mode: ${shopMode}`);
    // Help popup toggle/close
    const hr = shopHelpRect();
    if (shopHelp) {
      // Only close if not dragging
      if (!helpDrag.hasMoved) {
        shopHelp = false; 
        shopHelpScroll = 0; // Reset scroll when closing
        helpDrag.active = false;
        helpDrag.hasMoved = false;
        UI.reset(); 
        return;
      } else {
        // Was dragging, don't close, just reset the flag
        helpDrag.hasMoved = false;
        helpDrag.active = false;
        UI.reset();
        return;
      }
    }
    if (hr && UI.mx>=hr.x && UI.mx<=hr.x+hr.w && UI.my>=hr.y && UI.my<=hr.y+hr.h) {
      shopHelp = true; UI.reset(); return;
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
        shopConfirm = null; shopMsg = null; shopMsgTimer = 0; UI.reset(); return;
      }
      UI.reset();
      return;
    }
    
    // Only process card/button clicks if not dragging
    if (shopDrag.hasMoved) {
      UI.reset();
      return;
    }
    
    // Handle character shop mode
    if (shopMode === 'chars') {
      // Character cards
      const chars = Object.entries(PIXEL_CHARACTERS);
      const cols = 2;
      const cellW = CONFIG.width / cols;
      const cellH = 100;
      const marginX = 20;
      const top = CONFIG.height * 0.12 + 50;
      
      for (let i = 0; i < chars.length; i++) {
        const [id, char] = chars[i];
        const r = Math.floor(i / cols);
        const c = i % cols;
        const x = marginX + c * cellW + 6;
        const y = top + r * (cellH + 10) - shopScroll;
        const w = cellW - 40;
        const h = cellH;
        
        if (UI.mx >= x && UI.mx <= x + w && UI.my >= y && UI.my <= y + h) {
          const charInv = shopInv.characters || [];
          const isPurchased = charInv.includes(id) || id === 'default';
          
          if (isPurchased) {
            // Open selection confirm for all owned characters including default
            shopConfirm = { id: id, price: 0, type: 'character' };
          } else {
            // Open purchase confirm
            shopConfirm = { id: id, price: char.price, type: 'character' };
          }
          UI.reset();
          return;
        }
      }
      
      // Bottom buttons for character shop
      const bw = 86, bh = 26;
      const spacing = 10;
      const totalWidth = bw * 2 + spacing;
      const startX = (CONFIG.width - totalWidth) / 2;
      const by = CONFIG.height - 50;
      
      // BACK button
      if (UI.mx >= startX && UI.mx <= startX + bw && UI.my >= by && UI.my <= by + bh) {
        if (DEBUG) console.log('BACK button clicked');
        State.current = previousState; // 이전 상태로 돌아가기
        UI.reset();
        return;
      }
      
      // ITEMS button
      const itemsX = startX + bw + spacing;
      if (UI.mx >= itemsX && UI.mx <= itemsX + bw && UI.my >= by && UI.my <= by + bh) {
        shopMode = 'items';
        shopScroll = 0;
        UI.reset();
        return;
      }
    } else {
      // Item shop mode - handle item card clicks first
      const items = getVisibleShopItems();
      const cols = 2;
      const cellW = CONFIG.width / cols;
      const cellH = 120;
      const marginX = 20;
      const top = CONFIG.height * 0.12 + 50;
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const r = Math.floor(i / cols);
        const c = i % cols;
        const x = marginX + c * cellW + 6;
        const y = top + r * (cellH + 10) - shopScroll;
        const w = cellW - 40;
        const h = cellH;
        
        // 아이템 카드 클릭 검사
        if (UI.mx >= x && UI.mx <= x + w && UI.my >= y && UI.my <= y + h) {
          if (DEBUG) console.log(`Item card clicked: ${item.id}`);
          const si = SHOP_ITEMS.find(s => s.id === item.id);
          if (si) {
            if (item.soldOut) {
              shopMsg = 'Already purchased';
              shopMsgTimer = 1.5;
            } else {
              shopConfirm = { id: item.id, price: item.price };
            }
          }
          UI.reset();
          return;
        }
      }
      
      // Item shop mode - handle bottom buttons
      const bw = 100, bh = 36;
      const spacing = 10;
      const totalWidth = bw * 2 + spacing;
      const startX = (CONFIG.width - totalWidth) / 2;
      const by = CONFIG.height - 60;
      
      // BACK button
      if (UI.mx >= startX && UI.mx <= startX + bw && UI.my >= by && UI.my <= by + bh) {
        if (DEBUG) console.log('BACK button clicked');
        State.current = previousState; // 이전 상태로 돌아가기
        UI.reset();
        return;
      }
      
      // CHARS button
      const charsX = startX + bw + spacing;
      if (UI.mx >= charsX && UI.mx <= charsX + bw && UI.my >= by && UI.my <= by + bh) {
        shopMode = 'chars';
        shopScroll = 0;
        UI.reset();
        return;
      }
      
      // 아이템 카드 클릭은 위에서 이미 처리함
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
      shopMsg = 'Insufficient funds';
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
      saveShopInv();
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
    shopMsg = 'Insufficient funds';
    shopMsgTimer = 2.0;
    return;
  }
  if (isItemSoldOut(it)) { shopConfirm = null; return; }
  if (id === 'glow') {
    const current = shopInv.glowLevel || 0;
    if (current >= 3) { shopConfirm = null; return; }
    savings -= price; shopInv.glowLevel = current + 1; saveShopInv();
  } else if (id === 'buds') {
    const maxLv = currentBodySides();
    savings -= price; shopInv.budsLevel = Math.min(maxLv, (shopInv.budsLevel || 0) + 1); saveShopInv();
  } else if (id === 'plusjump') {
    savings -= price; shopInv.plusJump = true; saveShopInv();
  } else if (id === 'fly') {
    savings -= price; shopInv.fly = true; saveShopInv();
  } else if (id === 'big') {
    const maxLv = getLevelByExp(exp);
    const current = shopInv.bigLevel || 0;
    const dynPrice = 20 + 10 * current;
    if (savings < dynPrice) { shopMsg = 'Insufficient funds'; shopMsgTimer = 2.0; return; }
    savings -= dynPrice;
    shopInv.bigLevel = Math.min(maxLv, current + 1);
    saveShopInv();
  } else if (id === 'gamble') {
    savings -= price; shopInv.gambleActive = true; saveShopInv();
  } else if (id === 'web') {
    savings -= price; shopInv.webActive = true; saveShopInv();
  } else if (id === 'magnet') {
    const current = shopInv.magnetLevel || 0;
    if (current >= 5) { shopConfirm = null; return; }
    savings -= price; shopInv.magnetLevel = current + 1; saveShopInv();
  } else if (id === 'shield') {
    savings -= price; shopInv.shield = true; saveShopInv();
  } else if (id === 'combo') {
    const current = shopInv.comboLevel || 0;
    if (current >= 3) { shopConfirm = null; return; }
    savings -= price; shopInv.comboLevel = current + 1; saveShopInv();
  } else if (id === 'slow') {
    savings -= price; shopInv.slow = true; saveShopInv();
  } else if (id === 'double') {
    savings -= price; shopInv.double = true; saveShopInv();
  } else if (id === 'lucky') {
    const current = shopInv.luckyLevel || 0;
    if (current >= 5) { shopConfirm = null; return; }
    savings -= price; shopInv.luckyLevel = current + 1; saveShopInv();
  } else if (id === 'revival') {
    savings -= price; shopInv.revival = true; saveShopInv();
  } else if (id === 'rainbow') {
    savings -= price; shopInv.rainbow = true; saveShopInv();
  } else if (id === 'fever') {
    const current = shopInv.feverLevel || 0;
    if (current >= 3) { shopConfirm = null; return; }
    savings -= price; shopInv.feverLevel = current + 1; saveShopInv();
  } else if (id === 'bank') {
    const current = shopInv.bankLevel || 0;
    if (current >= 5) { shopConfirm = null; return; }
    savings -= price; shopInv.bankLevel = current + 1; saveShopInv();
  }
  try { localStorage.setItem(SAVINGS_KEY, String(savings)); } catch(_){}
  shopConfirm = null;
}
}

// Start the game
start();
