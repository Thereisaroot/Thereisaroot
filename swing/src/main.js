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
  maxAnchorX: 352,
  edgeSpawnJitter: 48, // px, randomness from the right edge inward
  lengthJitterPct: 0.30, // ±30% length jitter after planning
  shortLChance: 0.10, // 10% chance to shorten rope
  shortLFactor: 0.70, // shorten to 70% (30% shorter)

  // Camera follow smoothing (1/s)
  camFollowAttach: 6.0,
  camFollowFree: 2.5,
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

// UI helper for intro interactions
const UI = {
  clicked: false,
  mx: 0,
  my: 0,
  keyPressed: null, // 'Space' | 'Escape' | null
  reset() { this.clicked = false; this.keyPressed = null; },
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
  if (e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar' ) onPress(e);
});
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyV') {
    DEBUG = !DEBUG;
  }
});
window.addEventListener('keydown', (e) => {
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
    this.vy = Math.min(this.vy, 0) - CONFIG.jumpImpulse * 0.85;
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
      this.x += this.vx * dt;
      // simple horizontal damping
      this.vx += -this.vx * CONFIG.airDragX * dt;
      this.vy += CONFIG.gravity * dt;
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

    // Determine morph stage by savings total
    const stage = (savings >= 100) ? 3 : (savings >= 50) ? 2 : (savings >= 10) ? 1 : 0;
    const size = this.r * 2 * this.sizeScale;
    if (stage === 0) {
      // Body circle
      g.fillStyle = '#ffffff';
      g.strokeStyle = '#e53d3d';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(0, 0, this.r, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      // Direction pointer (small triangle)
      g.fillStyle = '#e53d3d';
      g.beginPath();
      g.moveTo(this.r * 0.6, 0);
      g.lineTo(this.r * 0.1, -5);
      g.lineTo(this.r * 0.1, 5);
      g.closePath();
      g.fill();
    } else {
      // Rounded rect with segmented fill
      const half = size / 2;
      const rr = stage === 1 ? this.r * 0.7 : stage === 2 ? this.r * 0.35 : this.r * 0.12;
      // Path helper
      function roundedRectPath(ctx, x, y, w, h, r) {
        const x0 = x - w/2, y0 = y - h/2;
        const x1 = x + w/2, y1 = y + h/2;
        const cr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
        ctx.beginPath();
        ctx.moveTo(x0 + cr, y0);
        ctx.lineTo(x1 - cr, y0);
        ctx.quadraticCurveTo(x1, y0, x1, y0 + cr);
        ctx.lineTo(x1, y1 - cr);
        ctx.quadraticCurveTo(x1, y1, x1 - cr, y1);
        ctx.lineTo(x0 + cr, y1);
        ctx.quadraticCurveTo(x0, y1, x0, y1 - cr);
        ctx.lineTo(x0, y0 + cr);
        ctx.quadraticCurveTo(x0, y0, x0 + cr, y0);
        ctx.closePath();
      }
      // Clip to body shape
      roundedRectPath(g, 0, 0, size, size, rr);
      g.save();
      g.clip();
      // Fill base
      g.fillStyle = '#ffffff';
      g.fillRect(-half, -half, size, size);
      // Fill color segments depending on stage
      const third = size / 3;
      if (stage >= 1) {
        g.fillStyle = '#e53d3d'; // red left third
        g.fillRect(-half, -half, third, size);
      }
      if (stage >= 2) {
        g.fillStyle = '#6aa8ff'; // blue middle
        g.fillRect(-half + third, -half, third, size);
      }
      if (stage >= 3) {
        g.fillStyle = '#ffa24d'; // orange right
        g.fillRect(-half + third*2, -half, third, size);
      }
      g.restore();
      // Outline
      roundedRectPath(g, 0, 0, size, size, rr);
      g.strokeStyle = '#e53d3d';
      g.lineWidth = 2;
      g.stroke();
    }

    g.restore();
  }
}

// Simple game state machine: intro -> run -> gameover
const State = {
  current: 'intro', // 'intro' | 'run' | 'gameover'
};

const player = new Player();
let score = 0;
let best = 0;
let simTime = 0;
const camera = { x: 0 };
const SCREEN_TARGET_X = CONFIG.width * 0.22;
const SAVINGS_KEY = 'webswing_savings_v1';
let savings = 0; // persistent $ saved across runs
let lastEarned = 0; // dollars earned in the most recent run
const DEMO_DONE_KEY = 'webswing_demo_done_v1';
let demoActive = false;
let lastDemoLoss = false;

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
    let D = useShort ? randRange(CONFIG.DshortMin, CONFIG.Dmin) : randRange(CONFIG.Dmin, CONFIG.Dmax);
    D *= randRange(0.9, 1.15);
    const baseX = prev ? prev.anchorX : x0;
    // Prefer spawning near the right edge with inward jitter
    const desiredEdgeX = camera.x + CONFIG.maxAnchorX - randRange(8, CONFIG.edgeSpawnJitter);
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
    let L = randRange(CONFIG.Lmin, CONFIG.Lmax);
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
      L = Math.max(CONFIG.Lmin, Math.min(CONFIG.Lmax, L_jitter));
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
  let L = Math.min(CONFIG.Lmax, Math.max(CONFIG.Lmin, 180 * randRange(0.9, 1.1)));
  if (Math.random() < CONFIG.shortLChance) {
    L = Math.max(CONFIG.Lmin, L * CONFIG.shortLFactor);
  }
  const kOmega = 1.0;
  const omega = Math.sqrt(CONFIG.gravity / L) * kOmega;
  const theta_hit = 0;
  const t_hit = 0.8;
  const desiredEdgeX2 = camera.x + CONFIG.maxAnchorX - randRange(8, CONFIG.edgeSpawnJitter);
  let anchorX = Math.max((prev ? prev.anchorX + CONFIG.Dmin : x0 + CONFIG.Dmin), desiredEdgeX2);
  const phi = Math.acos(Math.max(-1, Math.min(1, (theta_hit || 1e-6) / A))) - omega * (simTime + t_hit);
  return new Rope({ anchorX, anchorY: CONFIG.ceilingY, L, A, omega, phi, createdAt: simTime, id: `r${nextRopeId++}` });
}

function ensureRopesBuffered() {
  // Ensure one rope is queued near the right edge area, with jitter window
  const edgeMin = camera.x + (CONFIG.maxAnchorX - CONFIG.edgeSpawnJitter);
  const edgeMax = camera.x + CONFIG.maxAnchorX;
  let count = ropes.filter(r => r.anchorX >= edgeMin && r.anchorX <= edgeMax).length;
  if (count < 1) {
    const prev = ropes.length ? ropes[ropes.length - 1] : null;
    const r = planNextRope();
    ropes.push(r);
    // Maybe spawn a box between prev and new rope if eligible
    if (prev && savings >= 50 && Math.random() < 0.20) {
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
    if (player.mode === 'attached') {
      // Detach with momentum-carry jump
      const tip = player.rope ? player.rope.tip(simTime) : { vx: 0, vy: 0, th: 0 };
      player.mode = 'free';
      // carry over momentum from swing and add forward + upward impulse
      const upFactor = 0.8 + 0.2 * Math.cos(tip.th || 0); // near bottom stronger
      player.vx = Math.max(CONFIG.minVx, Math.min(CONFIG.maxVx, (tip.vx || 0) + CONFIG.baseVx));
      player.vy = (tip.vy || 0) - CONFIG.jumpImpulse * upFactor;
      // prevent instant re-catch on the same rope
      lastDetachedRope = player.rope;
      player.rope = null;
      catchLockUntil = simTime + 0.2; // 200ms lock
      airJumpsLeft = 2 + (pendingExtraJump ? 1 : 0); // allow up to 2(+1) flaps
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

  // If rope is scheduled to snap and player is still attached, enforce snap after timer
  if (player.mode === 'attached' && player.rope && player.rope.breakAt && simTime >= player.rope.breakAt) {
    const tipNow = player.rope.tip(simTime);
    // Force detach without upward impulse (penalty)
    player.mode = 'free';
    // carry minimal forward from tip, no extra upward boost
    player.vx = Math.max(CONFIG.minVx, Math.min(CONFIG.maxVx, (tipNow.vx || 0) + CONFIG.baseVx * 0.2));
    player.vy = tipNow.vy;
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
        // Schedule snap if savings milestone reached (>= $10): 10% chance
        if (savings >= 10) {
          if (Math.random() < 0.10) {
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
  if (player.y + player.r >= groundY) {
    player.y = groundY - player.r;
    // Ground break effect at impact
    spawnEffect('break', player.x, groundY);
    // Savings: earn $1 per point beyond 5 this run
    const earned = Math.max(0, Math.floor(score - 5));
    lastEarned = earned;
    if (earned > 0) {
      savings += earned;
      try { localStorage.setItem(SAVINGS_KEY, String(savings)); } catch(_){}
    }
    // Demo rule: if demo active and savings exceeded $110, on game over you lose everything
    if (demoActive && savings > 110) {
      lastDemoLoss = true;
      demoActive = false;
      savings = 0;
      try {
        localStorage.setItem(SAVINGS_KEY, '0');
        localStorage.setItem(DEMO_DONE_KEY, '1');
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
}

function updateGameOver(dt) {
  // allow particles to continue animating on game over
  updateParticles(dt);
  // advance gameover local timer
  gameOverTimer += dt;
  // Direct restart on input; avoid any intro flicker
  if (gameOverTimer >= 0.2 && (Input.anyPressed() || (typeof UI !== 'undefined' && (UI.clicked || UI.keyPressed === 'Space' || UI.keyPressed === 'Escape')))) {
    if (typeof UI !== 'undefined') UI.reset();
    Input.down = false; Input.justPressed = false;
    resetRun();
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
    const nextTarget = (savings < 10) ? 10 : (savings < 50) ? 50 : (savings < 100) ? 100 : 100;
    const nextText = (savings >= 100) ? 'All targets reached!' : `Next Target: $${nextTarget}`;
    const earnedText = (lastEarned > 0) ? `Earned this run: $${lastEarned}` : 'Earn dollars by scoring over 5';
    // Next Target line with Score font size (12px)
    g.font = `12px "Press Start 2P", monospace`;
    g.fillText(nextText, CONFIG.width / 2, y0);
    // Other lines with default small font (10px)
    g.font = `10px "Press Start 2P", monospace`;
    g.fillText(`Savings: $${savings}`, CONFIG.width / 2, y0 + 32);
    g.fillText(earnedText, CONFIG.width / 2, y0 + 64);
  }

  drawCenteredText(g, 'CLICK / SPACE TO RETRY', CONFIG.height * 0.74, 10, '#b4c0d9');
}

// Main loop with fixed timestep physics
let last = performance.now();
let acc = 0;
const dt = 1 / 120; // physics step

async function start() {
  await Fonts.load();
  // Load savings from localStorage
  try {
    const raw = localStorage.getItem(SAVINGS_KEY);
    if (raw) {
      const val = parseInt(raw, 10);
      if (!Number.isNaN(val)) savings = Math.max(0, val);
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
    acc -= dt;
    Input.endFrame();
  }

  // Render
  if (State.current === 'intro') renderIntro(ctx, now / 1000);
  else if (State.current === 'run') renderRun(ctx);
  else if (State.current === 'gameover') renderGameOver(ctx);

  requestAnimationFrame(tick);
}

start();

// Notes for next steps:
// - Add Rope class (anchor, L, A, omega, phase) and single-rope attach/detach.
// - Then implement multi-rope spawner with reachability guarantee.
