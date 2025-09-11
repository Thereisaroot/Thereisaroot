import { CrashEngine } from './engine.js';
import { Renderer } from './renderer.js';

const els = {
  canvas: document.getElementById('glcanvas'),
  multiplier: document.getElementById('multiplier'),
  status: document.getElementById('status'),
  round: document.getElementById('round'),
  betAmount: document.getElementById('betAmount'),
  autoCashout: document.getElementById('autoCashout'),
  placeBet: document.getElementById('placeBet'),
  cashOut: document.getElementById('cashOut'),
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
  els.status.textContent = '진행 중';
  renderer.reset(Math.max(2, snap.crashAt));
});

engine.events.on('tick', (snap) => {
  els.multiplier.textContent = fmt(snap.multiplier);
  // auto cashout
  const autoAt = parseFloat(els.autoCashout.value || '0');
  if (betActive && !cashedOut && autoAt >= 1.01 && snap.multiplier >= autoAt && snap.multiplier < snap.crashAt) {
    performCashout(snap.multiplier);
  }

  const t01 = Math.min(1, snap.time / snap.duration);
  renderer.addPoint(t01, snap.multiplier, snap.crashAt);
  renderer.draw(engine.state);
});

engine.events.on('crash', (snap) => {
  els.status.textContent = `크래시 @ ${fmt(snap.crashAt)}`;
  renderer.draw('crashed');
  // if bet and not cashed, player loses
  if (betActive && !cashedOut) {
    // already deducted at bet time
  }
  // prepare next round after short delay
  setTimeout(() => { resetUIForNewRound(); }, 1000);
});

engine.events.on('cashout', ({ at }) => {
  els.status.textContent = `캐시아웃 @ ${fmt(at)}`;
});

function performBet() {
  if (engine.state === 'running') return; // wait
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
const ro = new ResizeObserver(() => {
  // Reinit GL viewport on resize
  renderer._init();
});
ro.observe(els.canvas);

resetUIForNewRound();

