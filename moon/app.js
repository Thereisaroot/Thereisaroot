// app.js - Single-file build for file:// usage (no ES modules)
// Contains RNG, Engine, Renderer, and UI wiring.

// ===== RNG (demo-only; replace with HMAC-SHA256 in production) =====
function fnv1a32(str) {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function toHex(uint32) {
  return (uint32 >>> 0).toString(16).padStart(8, '0');
}

function mixSeed(serverSeed, clientSeed, nonce) {
  const a = fnv1a32(String(serverSeed));
  const b = fnv1a32(String(clientSeed || ''));
  const c = fnv1a32(String(nonce));
  return (a ^ ((b << 7) | (b >>> 25)) ^ ((c << 13) | (c >>> 19))) >>> 0;
}

function xorshift32(seed) {
  let x = (seed >>> 0) || 2463534242;
  return function next() {
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17; x >>>= 0;
    x ^= x << 5; x >>>= 0;
    const r = (x >>> 0) / 0xffffffff;
    return r > 0 ? r : Number.MIN_VALUE;
  };
}

function crashFromUniform(r, houseEdge = 0.01, decimals = 2) {
  const denom = 1 - r;
  const raw = (1 - houseEdge) / Math.max(1e-12, denom);
  const scaled = Math.max(1.0, raw);
  const f = Math.pow(10, decimals);
  return Math.floor(scaled * f) / f;
}

// ===== Event Bus =====
class EventBus {
  constructor() { this.listeners = new Map(); }
  on(type, fn) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(fn); return () => this.off(type, fn); }
  off(type, fn) { this.listeners.get(type)?.delete(fn); }
  emit(type, payload) { this.listeners.get(type)?.forEach(fn => fn(payload)); }
}

// ===== Engine =====
class CrashEngine {
  constructor({ houseEdge = 0.01 } = {}) {
    this.houseEdge = houseEdge;
    this.events = new EventBus();
    this.reset();
  }
  reset() {
    this.state = 'idle';
    this.serverSeed = this._randomSeed();
    this.serverSeedHash = toHex(fnv1a32(this.serverSeed));
    this.clientSeed = '';
    this.nonce = 0;
    this.currentMultiplier = 1.0;
    this.crashAt = 2.0;
    this.time = 0;
    this.duration = 6; // seconds to reach crashAt visually
    this.k = Math.log(Math.max(1.01, this.crashAt));
  }
  setClientSeed(seed) { this.clientSeed = seed || ''; }
  startRound({ base = 6 } = {}) {
    if (this.state === 'running') return;
    this.state = 'running';
    this.time = 0; this.nonce += 1;
    const seed32 = mixSeed(this.serverSeed, this.clientSeed, this.nonce);
    const next = xorshift32(seed32);
    const r = next();
    // Heavy-tail crash distribution; P(M > x) ~= (1 - houseEdge)/x
    this.crashAt = crashFromUniform(r, this.houseEdge, 2);
    // Visual pacing ~ proportional to ln(crashAt)
    const scale = Math.min(12, Math.max(3, Math.log(Math.max(1.01, this.crashAt)) * base));
    this.duration = scale;
    this.k = Math.log(Math.max(1.01, this.crashAt));
    this.events.emit('round_start', this.snapshot());
  }
  cashOutAt(threshold) {
    if (this.state !== 'running') return { ok: false };
    if (this.currentMultiplier >= threshold && this.currentMultiplier < this.crashAt) {
      this.state = 'cashed';
      this.events.emit('cashout', { ...this.snapshot(), at: this.currentMultiplier });
      return { ok: true };
    }
    return { ok: false };
  }
  tick(dt) {
    if (this.state !== 'running') return;
    this.time += dt;
    const t01 = Math.min(1, this.time / this.duration);
    const m = Math.exp(this.k * t01);
    this.currentMultiplier = Math.min(m, this.crashAt + 0.0001);
    this.events.emit('tick', this.snapshot());
    if (t01 >= 1 - 1e-6) {
      this.state = 'crashed';
      this.events.emit('crash', this.snapshot());
      this.serverSeed = this._randomSeed();
      this.serverSeedHash = toHex(fnv1a32(this.serverSeed));
    }
  }
  snapshot() {
    return { state: this.state, multiplier: this.currentMultiplier, crashAt: this.crashAt, serverSeedHash: this.serverSeedHash, nonce: this.nonce, duration: this.duration, time: this.time };
  }
  _randomSeed() {
    try {
      const cryptoObj = (typeof globalThis !== 'undefined' ? globalThis.crypto : (window && window.crypto));
      if (cryptoObj && cryptoObj.getRandomValues) {
        const bytes = new Uint8Array(16);
        cryptoObj.getRandomValues(bytes);
        return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (_) {}
    // fallback (non-crypto) for file:// if needed
    let s = '';
    for (let i = 0; i < 16; i++) s += Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
    return s;
  }
}

// ===== Renderer (WebGL) =====
class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl', { antialias: true });
    if (!this.gl) throw new Error('WebGL not supported');
    this._init();
    this.points = [];
    // Camera in world space: x=time(s), y=ln(mult)
    this.camera = { widthSec: 6, heightY: Math.log(4.0), centerX: 0, centerY: Math.log(4.0)/2 };
    this.wallY = Math.log(5.0);
  }
  _init() {
    const { gl } = this;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const w = Math.floor(this.canvas.clientWidth * dpr);
    const h = Math.floor(this.canvas.clientHeight * dpr);
    this.canvas.width = w; this.canvas.height = h;
    gl.viewport(0, 0, w, h);
    const vsSource = 'attribute vec2 a_pos; uniform vec2 u_scale; void main(){ gl_Position = vec4(a_pos * u_scale, 0.0, 1.0);}';
    const fsSource = 'precision mediump float; uniform vec3 u_color; void main(){ gl_FragColor = vec4(u_color, 1.0);}';
    const vs = gl.createShader(gl.VERTEX_SHADER); gl.shaderSource(vs, vsSource); gl.compileShader(vs);
    const fs = gl.createShader(gl.FRAGMENT_SHADER); gl.shaderSource(fs, fsSource); gl.compileShader(fs);
    const prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    this.prog = prog;
    this.a_pos = gl.getAttribLocation(prog, 'a_pos');
    this.u_scale = gl.getUniformLocation(prog, 'u_scale');
    this.u_color = gl.getUniformLocation(prog, 'u_color');
    this.buf = gl.createBuffer();
  }
  reset() { this.points.length = 0; }
  setViewWidthSec(w) { this.camera.widthSec = Math.max(2, w || 6); }
  setViewHeightByMultiplier(mult) { this.camera.heightY = Math.log(Math.max(1.5, mult)); }
  setCenterX(cx) { this.camera.centerX = cx; }
  setCenterY(cy) { this.camera.centerY = cy; }
  setWallYFromCrash(mult) { this.wallY = Math.log(Math.max(1.01, mult)); }
  addPoint(worldX, worldY) { this.points.push({ x: worldX, y: worldY }); }
  worldToCSS(x, y) {
    const halfW = this.camera.widthSec / 2;
    const halfH = this.camera.heightY / 2;
    const ndcX = (x - this.camera.centerX) / halfW;
    const ndcY = (y - this.camera.centerY) / halfH;
    const cw = this.canvas.clientWidth;
    const ch = this.canvas.clientHeight;
    const px = (ndcX * 0.5 + 0.5) * cw;
    const py = (1 - (ndcY * 0.5 + 0.5)) * ch;
    return { x: px, y: py };
  }
  _worldToNDC(x, y) {
    const halfW = this.camera.widthSec / 2;
    const halfH = this.camera.heightY / 2;
    return [ (x - this.camera.centerX) / halfW, (y - this.camera.centerY) / halfH ];
  }
  _drawLines(data, color) {
    const { gl } = this;
    gl.useProgram(this.prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(this.a_pos);
    gl.vertexAttribPointer(this.a_pos, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(this.u_scale, 1.0, 1.0);
    gl.uniform3fv(this.u_color, color);
    gl.drawArrays(gl.LINES, 0, data.length / 2);
  }
  draw(currentState = 'running') {
    const { gl } = this;
    gl.clearColor(0.04, 0.06, 0.12, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    const halfW = this.camera.widthSec / 2;
    const halfH = this.camera.heightY / 2;
    const xMin = this.camera.centerX - halfW;
    const xMax = this.camera.centerX + halfW;
    const yMin = this.camera.centerY - halfH;
    const yMax = this.camera.centerY + halfH;
    // Grid: vertical at 1s, horizontal at common multipliers
    const grid = [];
    const xStart = Math.floor(xMin);
    for (let x = xStart; x <= Math.ceil(xMax); x += 1) {
      const [gx1, gy1] = this._worldToNDC(x, yMin);
      const [gx2, gy2] = this._worldToNDC(x, yMax);
      grid.push(gx1, gy1, gx2, gy2);
    }
    const levels = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
    for (const lv of levels) {
      const y = Math.log(lv);
      if (y >= yMin && y <= yMax) {
        const [gx1, gy1] = this._worldToNDC(xMin, y);
        const [gx2, gy2] = this._worldToNDC(xMax, y);
        grid.push(gx1, gy1, gx2, gy2);
      }
    }
    if (grid.length) this._drawLines(grid, [0.18, 0.22, 0.35]);
    // Wall line at crashAt multiplier
    const wall = [];
    const [wx1, wy1] = this._worldToNDC(xMin, this.wallY);
    const [wx2, wy2] = this._worldToNDC(xMax, this.wallY);
    wall.push(wx1, wy1, wx2, wy2);
    this._drawLines(wall, [1.0, 0.36, 0.48]);

    if (this.points.length < 2) return;
    const data = new Float32Array(this.points.length * 2);
    for (let i = 0; i < this.points.length; i++) {
      const [X, Y] = this._worldToNDC(this.points[i].x, this.points[i].y);
      data[i * 2] = X; data[i * 2 + 1] = Y;
    }
    gl.useProgram(this.prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(this.a_pos);
    gl.vertexAttribPointer(this.a_pos, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(this.u_scale, 1.0, 1.0);
    const color = currentState === 'crashed' ? [1.0, 0.36, 0.48] : [0.43, 0.91, 1.0];
    gl.uniform3fv(this.u_color, color);
    gl.drawArrays(gl.LINE_STRIP, 0, this.points.length);
  }
}

// ===== UI & Game Loop =====
(function main() {
  const els = {
    canvas: document.getElementById('glcanvas'),
    tipLabel: document.getElementById('tipLabel'),
    multiplier: document.getElementById('multiplier'),
    status: document.getElementById('status'),
    round: document.getElementById('round'),
    betAmount: document.getElementById('betAmount'),
    autoCashout: document.getElementById('autoCashout'),
    placeBet: document.getElementById('placeBet'),
    cashOut: document.getElementById('cashOut'),
    restart: document.getElementById('restart'),
    balance: document.getElementById('balance'),
    clientSeed: document.getElementById('clientSeed'),
    serverSeedHash: document.getElementById('serverSeedHash'),
    nonce: document.getElementById('nonce'),
  };

  const engine = new CrashEngine({ houseEdge: 0.01 });
  const renderer = new Renderer(els.canvas);

  let balance = 10000;
  let roundId = 0;
  let betActive = false;
  let betAmount = 0;
  let cashedOut = false;

  function fmt(x) { return x.toFixed(2) + 'x'; }
  function fmtInt(x) { return Math.max(0, Math.floor(x)); }

  function resetUIForNewRound() {
    cashedOut = false;
    betActive = false;
    els.placeBet.disabled = false;
    els.cashOut.disabled = true;
    els.status.textContent = '대기';
  }

  function startRound() {
    roundId += 1;
    engine.setClientSeed(els.clientSeed.value.trim());
    engine.startRound();
  }

  engine.events.on('round_start', (snap) => {
    els.round.textContent = String(roundId);
    els.serverSeedHash.textContent = snap.serverSeedHash;
    els.nonce.textContent = String(snap.nonce);
    els.status.textContent = `진행 중 • 종료 배율 ${snap.crashAt.toFixed(2)}x`;
    renderer.reset();
    renderer.setViewWidthSec(6);
    renderer.setViewHeightByMultiplier(Math.min(4.0, snap.crashAt));
    renderer.setWallYFromCrash(snap.crashAt);
    const halfW = renderer.camera.widthSec / 2;
    const halfH = renderer.camera.heightY / 2;
    renderer.setCenterX(halfW); // 시작 시 좌측 경계가 t=0
    renderer.setCenterY(halfH); // 시작 시 하단 경계가 y=ln(1)
    // 초기 팁 라벨 위치 (t=0, y=ln(1))
    const p0 = renderer.worldToCSS(0, Math.log(1.0));
    els.tipLabel.style.left = `${p0.x}px`;
    els.tipLabel.style.top = `${p0.y}px`;
    els.tipLabel.textContent = '1.00x';
  });

  engine.events.on('tick', (snap) => {
    els.multiplier.textContent = fmt(snap.multiplier);
    const autoAt = parseFloat(els.autoCashout.value || '0');
    if (betActive && !cashedOut && autoAt >= 1.01 && snap.multiplier >= autoAt && snap.multiplier < snap.crashAt) {
      performCashout(snap.multiplier);
    }
    renderer.addPoint(snap.time, Math.log(snap.multiplier));
    const halfW = renderer.camera.widthSec / 2;
    const halfH = renderer.camera.heightY / 2;
    // 가로 스크롤: 중간 넘기면 팁을 중앙에 위치
    renderer.setCenterX(snap.time > halfW ? snap.time : halfW);
    // 세로 스크롤: y=ln(mult). 절반 넘기면 팁을 중앙에 위치.
    // 종료 직전에는 벽(종료 배율)도 중앙에 오도록 보정.
    const yTip = Math.log(Math.max(1.0001, snap.multiplier));
    let desiredCY = yTip > halfH ? yTip : halfH;
    const remainT = Math.max(0, (snap.duration || 0) - snap.time);
    if (remainT < 0.05) desiredCY = renderer.wallY; // 마지막 프레임은 벽을 정확히 중앙
    renderer.setCenterY(desiredCY);
    // Tip label follow
    const cssPos = renderer.worldToCSS(snap.time, Math.log(Math.max(1.0001, snap.multiplier)));
    els.tipLabel.style.left = `${cssPos.x}px`;
    els.tipLabel.style.top = `${cssPos.y}px`;
    els.tipLabel.textContent = fmt(snap.multiplier);
    // Show simple ETA in status
    const remain = Math.max(0, (snap.duration || 0) - snap.time);
    els.status.textContent = `진행 중 • 종료 배율 ${snap.crashAt.toFixed(2)}x • 남은 ${remain.toFixed(1)}s`;
    renderer.draw(engine.state);
  });

  engine.events.on('crash', (snap) => {
    els.status.textContent = `벽 도달 @ ${fmt(snap.crashAt)}`;
    renderer.draw('crashed');
    setTimeout(() => { resetUIForNewRound(); }, 1000);
  });

  engine.events.on('cashout', ({ at }) => {
    els.status.textContent = `캐시아웃 @ ${fmt(at)}`;
  });

  function performBet() {
    if (engine.state === 'running') return;
    betAmount = Math.max(1, parseInt(els.betAmount.value || '0', 10));
    if (balance < betAmount) return;
    balance -= betAmount;
    betActive = true;
    els.balance.textContent = String(fmtInt(balance));
    els.placeBet.disabled = true;
    els.cashOut.disabled = false;
    startRound();
  }

  function performCashout(at) {
    if (!betActive || cashedOut) return;
    const ok = engine.cashOutAt(at || engine.currentMultiplier).ok;
    if (!ok) return;
    cashedOut = true;
    const payout = Math.floor(betAmount * engine.currentMultiplier);
    balance += payout;
    els.balance.textContent = String(fmtInt(balance));
    els.cashOut.disabled = true;
  }

  els.placeBet.addEventListener('click', () => performBet());
  els.cashOut.addEventListener('click', () => performCashout());
  els.restart.addEventListener('click', () => {
    // Optional: refund current active bet for convenience in dev
    if (betActive && !cashedOut) {
      balance += betAmount;
      els.balance.textContent = String(fmtInt(balance));
    }
    betActive = false; cashedOut = false; betAmount = 0;
    engine.reset();
    renderer.reset();
    renderer.setViewWidthSec(6);
    renderer.setViewHeightByMultiplier(4.0);
    renderer.setWallYFromCrash(4.0);
    const halfW = renderer.camera.widthSec / 2;
    const halfH = renderer.camera.heightY / 2;
    renderer.setCenterX(halfW);
    renderer.setCenterY(halfH);
    const p0 = renderer.worldToCSS(0, Math.log(1.0));
    els.tipLabel.style.left = `${p0.x}px`;
    els.tipLabel.style.top = `${p0.y}px`;
    els.tipLabel.textContent = '1.00x';
    els.round.textContent = '-';
    els.multiplier.textContent = '1.00x';
    els.status.textContent = '대기';
    els.serverSeedHash.textContent = engine.serverSeedHash;
    els.nonce.textContent = '0';
    els.placeBet.disabled = false;
    els.cashOut.disabled = true;
  });

  // Main loop
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    engine.tick(dt);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // Resize handling
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => { try { renderer._init(); } catch (_) {} });
    ro.observe(els.canvas);
  } else {
    window.addEventListener('resize', () => { try { renderer._init(); } catch (_) {} });
  }

  resetUIForNewRound();
})();
