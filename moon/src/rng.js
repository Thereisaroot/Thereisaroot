// Simple non-cryptographic utilities for a demo-only provably-fair-like flow.
// For production, replace with HMAC-SHA256(serverSeed, clientSeed:nonce) → crash.

export function fnv1a32(str) {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0; // uint32
}

export function toHex(uint32) {
  return (uint32 >>> 0).toString(16).padStart(8, '0');
}

// Combine serverSeed, clientSeed, and nonce into a 32-bit seed
export function mixSeed(serverSeed, clientSeed, nonce) {
  const a = fnv1a32(String(serverSeed));
  const b = fnv1a32(String(clientSeed || ''));
  const c = fnv1a32(String(nonce));
  // XOR + mix
  return (a ^ ((b << 7) | (b >>> 25)) ^ ((c << 13) | (c >>> 19))) >>> 0;
}

// Xorshift32 PRNG
export function* xorshift32(seed) {
  let x = seed >>> 0 || 2463534242;
  while (true) {
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17; x >>>= 0;
    x ^= x << 5; x >>>= 0;
    // map to (0, 1)
    const r = (x >>> 0) / 0xffffffff;
    yield r > 0 ? r : Number.MIN_VALUE;
  }
}

// Crash multiplier from uniform r in (0,1).
// Heavy-tail approx; with house edge 1%.
export function crashFromUniform(r, houseEdge = 0.01, decimals = 2) {
  const denom = 1 - r;
  const raw = (1 - houseEdge) / Math.max(1e-12, denom);
  const scaled = Math.max(1.0, raw);
  const f = Math.pow(10, decimals);
  return Math.floor(scaled * f) / f;
}

