// WebSwing - Configuration

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
  lowRopeChance: 0.30, // chance to drop anchor lower
  lowRopeAnchorDropMinPx: 50, // fixed drop range (px)
  lowRopeAnchorDropMaxPx: 100,
  lowRopeFloorClearance: 100, // keep rope tip 100px above ground
  stageRopesPerStage: 5, // ropes per stage transition (test friendly)
  bossStageTriggers: [3, 7, 10], // 1-based stage numbers that trigger boss fights

  // Extra randomization knobs
  spacingJitterMin: 0.90, // D *= randRange(min,max)
  spacingJitterMax: 1.15,

  // Gameplay probabilities
  ropeBreakProb: 0.10, // when attached (if enabled by gating below)
  itemSpawnProb: 0.50,

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
  wizardJumpSpeed: 3,    // px/s horizontal speed for wizard detaches
  wizardJumpImpulse: 500, // upward impulse for wizard detaches
  wizardGlideTargetSpeed: 150, // px/s target glide speed while float timer active
  wizardGlideAccel: 300, // px/s^2 acceleration toward glide speed
  wizardSpinRevolutions: 5, // full rotations during float window
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
  rouletteSpinDuration: 2.4,
};
