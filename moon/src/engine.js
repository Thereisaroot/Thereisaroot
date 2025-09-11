import { mixSeed, xorshift32, fnv1a32, toHex, crashFromUniform } from './rng.js';

export class EventBus {
  constructor() { this.listeners = new Map(); }
  on(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(fn); return () => this.off(type, fn);
  }
  off(type, fn) { this.listeners.get(type)?.delete(fn); }
  emit(type, payload) { this.listeners.get(type)?.forEach(fn => fn(payload)); }
}

export class CrashEngine {
  constructor({ houseEdge = 0.01 } = {}) {
    this.houseEdge = houseEdge;
    this.events = new EventBus();
    this.reset();
  }

  reset() {
    this.state = 'idle'; // idle | running | crashed | cashed
    this.serverSeed = this._randomSeed();
    this.serverSeedHash = toHex(fnv1a32(this.serverSeed));
    this.clientSeed = '';
    this.nonce = 0;
    this.currentMultiplier = 1.0;
    this.crashAt = 1.0;
    this.time = 0;
    this.duration = 5; // seconds to reach crash visually
  }

  setClientSeed(seed) { this.clientSeed = seed || ''; }

  startRound({ durationHint = 6 } = {}) {
    if (this.state === 'running') return;
    this.state = 'running';
    this.time = 0; this.nonce += 1;
    const seed32 = mixSeed(this.serverSeed, this.clientSeed, this.nonce);
    const prng = xorshift32(seed32);
    const r = prng.next().value;
    this.crashAt = crashFromUniform(r, this.houseEdge, 2);
    // Visual pacing: clamp to 2..10s; scale by log of target
    const base = durationHint;
    const scale = Math.min(10, Math.max(2, Math.log(Math.max(1.01, this.crashAt)) * base));
    this.duration = scale;
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
    // Exponential growth matching end at crashAt
    const k = Math.log(Math.max(1.0001, this.crashAt));
    const t = Math.min(this.time / this.duration, 1);
    const m = Math.exp(k * t);
    this.currentMultiplier = Math.min(m, this.crashAt + 0.0001);
    this.events.emit('tick', this.snapshot());
    if (t >= 1 - 1e-6) {
      this.state = 'crashed';
      this.events.emit('crash', this.snapshot());
      // Prepare next server seed for following rounds
      this.serverSeed = this._randomSeed();
      this.serverSeedHash = toHex(fnv1a32(this.serverSeed));
    }
  }

  snapshot() {
    return {
      state: this.state,
      multiplier: this.currentMultiplier,
      crashAt: this.crashAt,
      serverSeedHash: this.serverSeedHash,
      nonce: this.nonce,
      duration: this.duration,
      time: this.time,
    };
  }

  _randomSeed() {
    const bytes = new Uint8Array(16);
    (globalThis.crypto || window.crypto).getRandomValues(bytes);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

