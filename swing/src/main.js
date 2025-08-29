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
        await document.fonts.load('12px "Press Start 2P"');
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
  mx: 0,
  my: 0,
  keyPressed: null, // 'Space' | 'Escape' | null
  reset() { this.clicked = false; this.keyPressed = null; },
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
    const cx = e.clientX !== undefined ? e.clientX : e.touches[0].clientX;
    const cy = e.clientY !== undefined ? e.clientY : e.touches[0].clientY;
    UI.mx = (cx - rect.left) * (CONFIG.width / rect.width);
    UI.my = (cy - rect.top) * (CONFIG.height / rect.height);
    UI.clicked = true;
  }
  if (!Input.down) {
    Input.down = true;
    Input.justPressed = true;
  }
}
function onRelease() {
  Input.down = false;
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
window.addEventListener('mouseup', onRelease);
window.addEventListener('touchstart', onPress, { passive: false });
window.addEventListener('touchend', onRelease);

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

    // Glow effect if purchased
    if (shopInv.glow) {
      const base = 0.3 + 0.2 * Math.sin(simTime * 3.1);
      g.save();
      g.globalAlpha = Math.max(0.1, Math.min(0.5, base));
      g.fillStyle = '#ffffff';
      const gr = (this.r * this.sizeScale) * ((level > 1) ? 1.3 : 1.0) * 1.6;
      g.beginPath();
      g.arc(0, 0, gr, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
    if (level === 1) {
      // Pure white circle (egg)
      const r = this.r * this.sizeScale * levelScale;
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
      const r = this.r * this.sizeScale * levelScale;
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

    // Buds attached to polygon vertices; max count equals current vertex count
    if (shopInv.budsLevel && shopInv.budsLevel > 0 && level > 1) {
      const groupIdx = Math.floor((level - 2) / 3);
      const sides = 3 + Math.max(0, groupIdx);
      const baseR = this.r * this.sizeScale * ((level > 1) ? 1.3 : 1.0);
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

    g.restore();
  }
}

// Effective player collision radius (level-scaled)
function playerCollisionRadius() {
  const level = getLevelByExp(exp);
  const levelScale = (level > 1) ? 1.3 : 1.0;
  return player.r * player.sizeScale * levelScale;
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
const EXP_KEY = 'webswing_exp_v1';
let savings = 0; // money for shop
let exp = 0;     // progression EXP for levels
let lastEarned = 0; // dollars earned in the most recent run
const DEMO_DONE_KEY = 'webswing_demo_done_v1';
const SHOP_INV_KEY = 'webswing_shop_inv_v1';
let demoActive = false;
let lastDemoLoss = false;

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
let shopScroll = 0;
let shopDrag = { active: false, y0: 0, scroll0: 0 };
let shopConfirm = null; // { id, price }

// Shop inventory
let shopInv = { glow: false, budsLevel: 0, plusJump: false, fly: false };
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
// Item/box system
const boxes = [];
let pendingExtraJump = false;
let pendingCatchR = 0;
let pendingSizeScale = 0;

// Simple particle system for catch effects
const particles = [];
function spawnEffect(kind, x, y) {
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
    if (p.type === 'sparkle') continue;
    const a = Math.max(0, 1 - p.life / p.ttl);
    g.globalAlpha = a;
    g.fillStyle = p.color;
    g.beginPath();
    g.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    g.fill();
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
  return getLevelByExp(exp) === 1 ? 0.7 : 1.0;
}

function spawnInitialRope() {
  // Create a rope whose tip passes through player's screenX at t=0 (attached start)
  const A = deg2rad(randRange(CONFIG.AminDeg, CONFIG.AmaxDeg));
  const L = 180;
  const kOmega = randRange(CONFIG.kOmegaMin, CONFIG.kOmegaMax);
  const omega = Math.sqrt(CONFIG.gravity / L) * kOmega;
  const t = simTime;
  // choose theta0 near 0 (bottom) for a calm start
  const theta0 = randRange(-A * 0.4, A * 0.4);
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
  const currentTip = player.rope ? player.rope.tip(simTime) : { x: player.x, y: player.y };
  const x0 = currentTip.x;
  const y0 = currentTip.y;
  const s = lv1Scale();
  // estimate velocities after detach
  const vxEst = (player.mode === 'free') ? Math.max(CONFIG.minVx, Math.min(CONFIG.maxVx, player.vx)) : (CONFIG.baseVx + 40);
  const vy0 = -CONFIG.jumpImpulse * 0.9; // rough estimate for planning

  // Try multiple candidates for robust reachability
  const prev = ropes[ropes.length - 1] || null;
  for (let tries = 0; tries < 60; tries++) {
    // Decide if this candidate should be a short rope; tie spacing accordingly
    const shortPick = Math.random() < CONFIG.shortLChance;
    // Mix short and normal spacings (force short spacing when short rope is picked)
    const useShort = shortPick || (Math.random() < CONFIG.DshortProb);
    let D = useShort ? randRange(CONFIG.DshortMin * s, CONFIG.Dmin * s) : randRange(CONFIG.Dmin * s, CONFIG.Dmax * s);
    D *= randRange(CONFIG.spacingJitterMin, CONFIG.spacingJitterMax);
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
    const omega = Math.sqrt(CONFIG.gravity / L) * kOmega;

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
    const omega2 = Math.sqrt(CONFIG.gravity / L) * kOmega;
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
  const omega = Math.sqrt(CONFIG.gravity / L) * kOmega;
  const theta_hit = 0;
  const t_hit = 0.8;
  const desiredEdgeX2 = camera.x + (CONFIG.maxAnchorX * s) - randRange(8, CONFIG.edgeSpawnJitter * s);
  let anchorX = Math.max((prev ? prev.anchorX + CONFIG.Dmin * s : x0 + CONFIG.Dmin * s), desiredEdgeX2);
  const phi = Math.acos(Math.max(-1, Math.min(1, (theta_hit || 1e-6) / A))) - omega * (simTime + t_hit);
  return new Rope({ anchorX, anchorY: CONFIG.ceilingY, L, A, omega, phi, createdAt: simTime, id: `r${nextRopeId++}` });
}

function ensureRopesBuffered() {
  // Ensure one rope is queued near the right edge area, with jitter window
  const s = lv1Scale();
  const edgeMin = camera.x + ((CONFIG.maxAnchorX * s) - (CONFIG.edgeSpawnJitter * s));
  const edgeMax = camera.x + (CONFIG.maxAnchorX * s);
  let count = ropes.filter(r => r.anchorX >= edgeMin && r.anchorX <= edgeMax).length;
  if (count < 1) {
    const prev = ropes.length ? ropes[ropes.length - 1] : null;
    const r = planNextRope();
    ropes.push(r);
    // Maybe spawn a box between prev and new rope if eligible
    if (prev && exp >= 50 && Math.random() < CONFIG.itemSpawnProb) {
      const midX = prev.anchorX + (r.anchorX - prev.anchorX) * 0.5;
      // Place much higher, with vertical randomness
      const minY = CONFIG.ceilingY + 60;
      const maxY = Math.min(CONFIG.height * 0.38, (CONFIG.height - CONFIG.groundH) - 140);
      const by = randRange(minY, maxY);
      const kinds = ['extraJump', 'wideCatch', 'bigSize'];
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      boxes.push({ x: midX, y: by, kind, active: true, phase: Math.random() * Math.PI * 2 });
    }
  }
  cleanupRopes();
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
  State.current = 'run';
  simTime = 0;
  camera.x = 0;
  ropes.length = 0;
  boxes.length = 0;
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
  g.font = `${size}px "Press Start 2P", monospace`;
  g.fillText(text, CONFIG.width / 2, y);
}

let showGuide = false;
function guideButtonRect() {
  const w = 92, h = 24;
  const x = (CONFIG.width - w) / 2;
  const y = CONFIG.height * 0.68;
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
  // Start game on space or click outside guide
  if (UI.keyPressed === 'Space' || UI.clicked) {
    UI.reset();
    resetRun();
    return;
  }
}

function renderIntro(g, t) {
  drawBackground(g);
  drawCenteredText(g, 'WEB SWING', CONFIG.height * 0.28, 20);
  const blink = Math.sin(t * 3) > 0 ? 1 : 0.3;
  g.globalAlpha = blink;
  drawCenteredText(g, 'PRESS START', CONFIG.height * 0.52, 14);
  g.globalAlpha = 1;
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
  g.font = `10px "Press Start 2P", monospace`;
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
      '- Use up to 3 jumps each run',
      '- Catch the rope tip to attach',
    ];
    g.fillStyle = '#ffffff';
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.font = `9px "Press Start 2P", monospace`;
    let ly = py + 14;
    for (const line of lines) {
      g.fillText(line, px + 12, ly);
      ly += 14;
    }
    g.fillStyle = '#b4c0d9';
    g.font = `8px "Press Start 2P", monospace`;
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
  g.fillStyle = '#92a0bb';
  g.beginPath();
  g.arc(sx, sy, 3, 0, Math.PI * 2);
  g.fill();
  // Debug: tip-only catch radius and distance readout
  if (DEBUG) {
    const catchR = CONFIG.catchBase;
    g.save();
    g.fillStyle = 'rgba(255,105,180,0.12)';
    g.strokeStyle = 'rgba(255,105,180,0.5)';
    g.lineWidth = 1;
    g.beginPath();
    g.arc(tx, ty, catchR, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    // numeric debug
    g.font = `10px "Press Start 2P", monospace`;
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
    g.font = `10px "Press Start 2P", monospace`;
    g.textAlign = 'center';
    g.textBaseline = 'bottom';
    g.fillText('!', tx, ty - 6);
    g.restore();
  }
}

function updateRun(dt) {
  simTime += dt;

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
      player.vx = Math.max(CONFIG.minVx, Math.min(CONFIG.maxVx, (tip.vx || 0) * js + CONFIG.baseVx * js));
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
      }
    }
  }
  // Reset fly when not holding
  if (!Input.down) flyActiveRemaining = 0;

  // Update ropes buffer
  ensureRopesBuffered();
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
      spawnEffect('burst', b.x, b.y);
      if (b.kind === 'extraJump') pendingExtraJump = true;
      else if (b.kind === 'wideCatch') pendingCatchR = 50;
      else if (b.kind === 'bigSize') pendingSizeScale = 1.5;
    }
  }

  // Update player
  player.update(dt, simTime);
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
      const catchR = pendingCatchR > 0 ? pendingCatchR : CONFIG.catchBase;
      if (Math.hypot(dx, dy) <= catchR) {
        // Attach
        player.mode = 'attached';
        player.rope = rope;
        const gained = (usedAirJumps === 0) ? 3 : (usedAirJumps === 1) ? 2 : 1;
        score += gained;
        const kind = (gained === 3) ? 'big' : (gained === 2) ? 'medium' : 'small';
        const tipNow = rope.tip(simTime);
        spawnEffect(kind, tipNow.x, tipNow.y);
        // Schedule snap if EXP milestone reached (>= 10)
        if (exp >= 10) {
          if (Math.random() < CONFIG.ropeBreakProb) {
            rope.breakAt = simTime + 1.0; // snap after 1s unless player jumps
          } else {
            rope.breakAt = null;
          }
        } else {
          rope.breakAt = null;
        }
        ensureRopesBuffered();
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
    // Ground break effect at impact
    spawnEffect('break', player.x, groundY);
    // Earnings and EXP: $1 and 1 EXP per point beyond 5 this run
    const earned = Math.max(0, Math.floor(score - 5));
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
    // Demo rule: if demo active and savings exceeded $110, on game over you lose everything
    if (demoActive && savings > 110) {
      lastDemoLoss = true;
      demoActive = false;
      savings = 0;
      try {
        localStorage.setItem(SAVINGS_KEY, '0');
        localStorage.setItem(DEMO_DONE_KEY, '1');
        // Reset EXP and clear all items when demo ends
        exp = 0;
        localStorage.setItem(EXP_KEY, '0');
        shopInv = { glow: false, budsLevel: 0, plusJump: false, fly: false };
        saveShopInv();
      } catch(_){}
    }
    best = Math.max(best, score);
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
    g.font = `11px "Press Start 2P", monospace`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const label = b.kind === 'extraJump' ? 'J' : (b.kind === 'wideCatch' ? 'R' : 'S');
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
  g.font = `12px "Press Start 2P", monospace`;
  g.fillText(`SCORE ${score}`, 12, 10);
  g.fillText(`BEST ${best}`, 12, 28);
  g.textAlign = 'right';
  g.fillText(`SAV $${savings}`, CONFIG.width - 12, 10);
  // Pending item indicators
  g.textAlign = 'right';
  g.font = `10px "Press Start 2P", monospace`;
  const itemText = `${pendingExtraJump ? '+J ' : ''}${pendingCatchR ? 'R50 ' : ''}${pendingSizeScale ? 'S+ ' : ''}`.trim();
  if (itemText) g.fillText(itemText, CONFIG.width - 12, 28);
  // Level display
  g.textAlign = 'left';
  g.font = `10px "Press Start 2P", monospace`;
  g.fillText(`LV ${getLevelByExp(exp)}`, 12, 46);
}

function updateGameOver(dt) {
  // allow particles to continue animating on game over
  updateParticles(dt);
  // advance gameover local timer
  gameOverTimer += dt;
  levelUpPopupTimer += dt;
  const wait = CONFIG.gameOverWait || 5.0;
  // During lock period, consume/clear any inputs so they don't auto-trigger later
  if (gameOverTimer < wait) {
    if (typeof UI !== 'undefined') UI.reset();
    Input.down = false; Input.justPressed = false;
  }
  // Direct restart on input; avoid any intro flicker
  if (gameOverTimer >= wait && (Input.anyPressed() || (typeof UI !== 'undefined' && (UI.clicked || UI.keyPressed === 'Space' || UI.keyPressed === 'Escape')))) {
    // If clicked inside SHOP button (and lvl>=2), go to shop; else restart
    const lvl = getLevelByExp(exp);
    let intoShop = false;
    if (typeof UI !== 'undefined' && UI.clicked && lvl >= 2) {
      const bw = 86, bh = 22;
      const bx = (CONFIG.width - bw) / 2;
      const by = CONFIG.height * 0.80;
      if (UI.mx >= bx && UI.mx <= bx + bw && UI.my >= by && UI.my <= by + bh) intoShop = true;
    }
    if (intoShop) {
      State.current = 'shop';
      // init shop scroll
      shopScroll = 0; shopDrag.active = false; shopConfirm = null;
      if (typeof UI !== 'undefined') UI.reset();
      Input.down = false; Input.justPressed = false;
      return;
    } else {
      if (typeof UI !== 'undefined') UI.reset();
      Input.down = false; Input.justPressed = false;
      resetRun();
    }
  }
}

function renderGameOver(g) {
  drawBackground(g);
  drawParticles(g);
  if (lastDemoLoss) {
    drawCenteredText(g, 'GAME OVER', CONFIG.height * 0.30, 18, '#ff6666');
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'top';
    g.font = `12px "Press Start 2P", monospace`;
    g.fillText('YOU LOSE EVERYTHING.', CONFIG.width / 2, CONFIG.height * 0.40);
    g.fillText('YOU WILL BECOME A SMALL EGG.', CONFIG.width / 2, CONFIG.height * 0.46);
  } else {
    drawCenteredText(g, 'GAME OVER', CONFIG.height * 0.30, 18, '#ff6666');
    drawCenteredText(g, `SCORE ${score}`, CONFIG.height * 0.40, 12);

    // Savings summary and next target
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'top';
    const y0 = CONFIG.height * 0.46;
    function nextLevelThreshold(val) {
      for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
        if (val < LEVEL_THRESHOLDS[i]) return LEVEL_THRESHOLDS[i];
      }
      return null;
    }
    let nextText;
    if (demoActive) {
      nextText = 'Try to exceed $111';
    } else {
      const next = nextLevelThreshold(exp);
      nextText = next ? `Next Level: ${next}P` : 'Max level reached!';
    }
    const earnedText = (lastEarned > 0) ? `Gained: $${lastEarned} / +${lastEarned}P` : 'Earn $ and P by scoring over 5';
    // Next Target line with Score font size (12px)
    g.font = `12px "Press Start 2P", monospace`;
    g.fillText(nextText, CONFIG.width / 2, y0);
    // Other lines with default small font (10px)
    g.font = `10px "Press Start 2P", monospace`;
    // EXP and SAV in one line
    g.fillText(`EXP: ${exp}P | SAV: $${savings}`, CONFIG.width / 2, y0 + 32);
    // Earn explanation three lines below
    g.fillText(earnedText, CONFIG.width / 2, y0 + 80);
  }

  // Level-up popup when level increased this game over
  if (gameOverLevelUp) {
    const cx = CONFIG.width / 2;
    const cy = CONFIG.height * 0.22;
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `12px "Press Start 2P", monospace`;
    g.fillText(`LEVEL UP! LV ${gameOverLevelUp.to}`, cx, cy);
  }
  const wait = CONFIG.gameOverWait || 5.0;
  const rem = Math.max(0, wait - gameOverTimer);
  if (rem > 0) {
    // Countdown until retry is enabled
    const sec = Math.ceil(rem);
    drawCenteredText(g, `RETRY IN ${sec}`, CONFIG.height * 0.74, 10, '#b4c0d9');
  } else {
    drawCenteredText(g, 'CLICK / SPACE TO RETRY', CONFIG.height * 0.74, 10, '#b4c0d9');
    // Shop button (Level >= 2)
    const lvl = getLevelByExp(exp);
    if (lvl >= 2) {
      const bw = 86, bh = 22;
      const bx = (CONFIG.width - bw) / 2;
      const by = CONFIG.height * 0.80;
      g.fillStyle = '#22334a';
      g.strokeStyle = '#b4c0d9';
      g.lineWidth = 2;
      g.fillRect(bx, by, bw, bh);
      g.strokeRect(bx, by, bw, bh);
      g.fillStyle = '#ffffff';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `10px "Press Start 2P", monospace`;
      g.fillText('SHOP', bx + bw/2, by + bh/2 + 1);
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
    shopInv.glow = true;
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
  }

  // Render
  if (State.current === 'intro') renderIntro(ctx, now / 1000);
  else if (State.current === 'run') renderRun(ctx);
  else if (State.current === 'gameover') renderGameOver(ctx);
  else if (State.current === 'shop') renderShop(ctx);

  requestAnimationFrame(tick);
}

start();

// Notes for next steps:
// - Add Rope class (anchor, L, A, omega, phase) and single-rope attach/detach.
// - Then implement multi-rope spawner with reachability guarantee.
// Shop item definitions
const SHOP_ITEMS = [
  { id: 'glow', name: 'Glow', type: 'single', price: 10, minLevel: 2 },
  { id: 'buds', name: 'Buds', type: 'level', maxLevel: 5, price: 1, minLevel: 2 },
  { id: 'plusjump', name: '+Jump', type: 'single', price: 10, minLevel: 2 },
  { id: 'fly', name: 'Fly', type: 'single', price: 10, minLevel: 2 },
];

function getItemLevel(it) {
  if (it.id === 'buds') return shopInv.budsLevel || 0;
  if (it.id === 'glow') return shopInv.glow ? 1 : 0;
  if (it.id === 'plusjump') return shopInv.plusJump ? 1 : 0;
  if (it.id === 'fly') return shopInv.fly ? 1 : 0;
  return 0;
}
function currentBodySides() {
  const lvl = getLevelByExp(exp);
  if (lvl <= 1) return 0;
  const groupIdx = Math.floor((lvl - 2) / 3);
  return 3 + Math.max(0, groupIdx);
}
function isItemSoldOut(it) {
  if (it.type === 'single') return getItemLevel(it) >= 1;
  if (it.type === 'level') {
    const maxLv = currentBodySides();
    return getItemLevel(it) >= maxLv;
  }
  return false;
}

function shopGrid() {
  const cols = 3;
  const cellW = Math.floor((CONFIG.width * 0.86) / cols);
  const cellH = 64;
  const marginX = Math.floor((CONFIG.width - cols * cellW) / 2);
  const top = Math.floor(CONFIG.height * 0.20);
  return { cols, cellW, cellH, marginX, top };
}

function renderShop(g) {
  // backdrop
  g.fillStyle = 'rgba(0,0,0,0.6)';
  g.fillRect(0, 0, CONFIG.width, CONFIG.height);
  drawCenteredText(g, 'SHOP', CONFIG.height * 0.12, 14);
  // Show SAV at top-right, two lines below the SHOP title
  {
    const headerY = CONFIG.height * 0.12;
    g.fillStyle = '#ffffff';
    g.textAlign = 'right';
    g.textBaseline = 'top';
    g.font = `10px "Press Start 2P", monospace`;
    g.fillText(`SAV: $${savings}`, CONFIG.width - 12, headerY + 24);
  }
  const { cols, cellW, cellH, marginX, top } = shopGrid();
  const gap = 8;
  // Filter items by level visibility
  const lvl = getLevelByExp(exp);
  const items = SHOP_ITEMS.filter(it => (it.minLevel || 1) <= lvl);
  // content height
  const rows = Math.ceil(items.length / cols) || 1;
  const contentH = rows * (cellH + gap) - gap;
  // clamp scroll
  shopScroll = Math.max(0, Math.min(Math.max(0, contentH - (CONFIG.height - top - 90)), shopScroll));
  // draw items
  g.save();
  g.beginPath();
  g.rect(0, top, CONFIG.width, CONFIG.height - top - 90);
  g.clip();
  for (let i = 0; i < items.length; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const x = marginX + c * cellW;
    const y = top + r * (cellH + gap) - shopScroll;
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
    g.font = `10px "Press Start 2P", monospace`;
    g.fillText(items[i].name, x + 14, y + 6);
    // 2) Price (right aligned)
    g.textAlign = 'right';
    g.fillText(`$${items[i].price}`, x + cellW - 14, y + 20);
    // 3) Icon (center)
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `12px "Press Start 2P", monospace`;
    let label;
    if (items[i].id === 'glow') label = '*';
    else if (items[i].id === 'buds') label = '+';
    else if (items[i].id === 'plusjump') label = 'J';
    else if (items[i].id === 'fly') label = '^';
    else label = '?';
    g.fillText(label, x + cellW/2, y + Math.floor(cellH * 0.60));
    // 4) Level line (no max display)
    g.textAlign = 'center';
    g.textBaseline = 'bottom';
    g.font = `10px "Press Start 2P", monospace`;
    const lvVal = getItemLevel(items[i]);
    g.fillText(`Lv. ${lvVal}`, x + cellW/2, y + cellH - 6);
    // sold out overlay
    if (isItemSoldOut(items[i])) {
      g.fillStyle = 'rgba(0,0,0,0.5)';
      g.fillRect(x + 6, y, cellW - 12, cellH);
      g.textAlign = 'center';
      g.font = `10px "Press Start 2P", monospace`;
      if (items[i].type === 'single') {
        g.fillStyle = '#ff6666';
        g.fillText('SOLD OUT', x + cellW/2, y + cellH/2 + 2);
      } else {
        g.fillStyle = '#a6ffc1';
        g.fillText('MAX', x + cellW/2, y + cellH/2 + 2);
      }
    }
  }
  g.restore();
  // Start button
  const bw = 110, bh = 24;
  const bx = (CONFIG.width - bw) / 2;
  const by = CONFIG.height - 42;
  g.fillStyle = '#22334a';
  g.strokeStyle = '#b4c0d9';
  g.lineWidth = 2;
  g.fillRect(bx, by, bw, bh);
  g.strokeRect(bx, by, bw, bh);
  g.fillStyle = '#ffffff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `10px "Press Start 2P", monospace`;
  g.fillText('START GAME', bx + bw/2, by + bh/2 + 1);

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
    g.font = `12px "Press Start 2P", monospace`;
    const itName = (SHOP_ITEMS.find(x=>x.id===shopConfirm.id)?.name || shopConfirm.id).toString();
    g.fillText(`Buy ${itName} for $${shopConfirm.price}?`, px + pw/2, py + 10);
    // Current SAV at top-right inside popup
    g.textAlign = 'right';
    g.font = `10px "Press Start 2P", monospace`;
    g.fillText(`SAV: $${savings}`, px + pw - 10, py + 10);
    // buttons
    const bw2 = 78, bh2 = 26;
    const gapB = 12;
    const by2 = py + ph - 36;
    const bx2 = px + pw/2 - bw2 - gapB;
    const bx3 = px + pw/2 + gapB;
    g.fillStyle = '#22334a'; g.fillRect(bx2, by2, bw2, bh2); g.strokeRect(bx2, by2, bw2, bh2);
    g.fillStyle = '#22334a'; g.fillRect(bx3, by2, bw2, bh2); g.strokeRect(bx3, by2, bw2, bh2);
    // button labels centered
    g.fillStyle = '#ffffff';
    g.textBaseline = 'middle';
    g.font = `10px "Press Start 2P", monospace`;
    g.fillText('YES', bx2 + bw2/2, by2 + bh2/2);
    g.fillText('NO', bx3 + bw2/2, by2 + bh2/2);
  }
}

function updateShop(dt) {
  // handle drag scroll
  if (Input.down && !shopDrag.active && UI.clicked) {
    shopDrag.active = true; shopDrag.y0 = UI.my; shopDrag.scroll0 = shopScroll;
  }
  if (!Input.down) shopDrag.active = false;
  // We don't have continuous move tracking; simulate with clicks only for now
  // Click handling
  if (Input.anyPressed() && typeof UI !== 'undefined' && UI.clicked) {
    // If confirm open, handle YES/NO
    if (shopConfirm) {
      const pw = CONFIG.width * 0.88, ph = 112;
      const px = (CONFIG.width - pw)/2, py = CONFIG.height * 0.40;
      const bw2 = 78, bh2 = 26; const by2 = py + ph - 36;
      const gapB = 12; const bx2 = px + pw/2 - bw2 - gapB; const bx3 = px + pw/2 + gapB;
      const x = UI.mx, y = UI.my;
      if (x>=bx2 && x<=bx2+bw2 && y>=by2 && y<=by2+bh2) {
        // YES
        tryPurchase(shopConfirm.id);
      }
      // NO or outside
      shopConfirm = null; UI.reset(); return;
    }
    // Start button
    const bw = 110, bh = 24; const bx = (CONFIG.width - bw)/2; const by = CONFIG.height - 42;
    if (UI.mx>=bx && UI.mx<=bx+bw && UI.my>=by && UI.my<=by+bh) {
      UI.reset();
      resetRun();
      return;
    }
    // Item cards
    const { cols, cellW, cellH, marginX, top } = shopGrid();
    const gap = 8;
    const lvl = getLevelByExp(exp);
    const items = SHOP_ITEMS.filter(it => (it.minLevel || 1) <= lvl);
    for (let i = 0; i < items.length; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const x = marginX + c * cellW + 6;
      const y = top + r * (cellH + gap) - shopScroll;
      const w = cellW - 12; const h = cellH;
      if (UI.mx>=x && UI.mx<=x+w && UI.my>=y && UI.my<=y+h) {
        // open confirm if purchasable
        const it = items[i];
        if (isItemSoldOut(it)) { UI.reset(); return; }
        const price = it.type === 'level' ? it.price : it.price;
        shopConfirm = { id: it.id, price };
        UI.reset();
        return;
      }
    }
  }
}

function tryPurchase(id) {
  const it = SHOP_ITEMS.find(x => x.id === id);
  if (!it) return;
  let price = it.price;
  // enforce affordability
  if (savings < price) { shopConfirm = null; return; }
  if (isItemSoldOut(it)) { shopConfirm = null; return; }
  if (id === 'glow') {
    savings -= price; shopInv.glow = true; saveShopInv();
  } else if (id === 'buds') {
    const maxLv = currentBodySides();
    savings -= price; shopInv.budsLevel = Math.min(maxLv, (shopInv.budsLevel || 0) + 1); saveShopInv();
  } else if (id === 'plusjump') {
    savings -= price; shopInv.plusJump = true; saveShopInv();
  } else if (id === 'fly') {
    savings -= price; shopInv.fly = true; saveShopInv();
  }
  try { localStorage.setItem(SAVINGS_KEY, String(savings)); } catch(_){}
  shopConfirm = null;
}
