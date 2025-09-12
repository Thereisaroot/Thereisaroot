// Pixi 마이그레이션 CONFIG (원본 값 최대 반영)
const CONFIG = {
  width: 360,
  height: 640,
  backgroundColor: 0x0f1020,

  // 월드 경계/중력/점프/속도
  groundH: 72,
  gravity: 2400,
  jumpImpulse: 642,
  baseVx: 208,
  minVx: 200,
  maxVx: 420,
  airDragX: 0.5,
  ceilingY: 84,

  // 로프 파라미터(계획/스폰)
  Lmin: 84,
  Lmax: 338,
  AminDeg: 6,
  AmaxDeg: 18,
  kOmegaMin: 0.85,
  kOmegaMax: 1.35,
  Dmin: 180,
  Dmax: 260,
  DshortMin: 120,
  DshortProb: 0.35,
  catchBase: 22,
  catchBonusMax: 10,
  catchVelScale: 0.0,
  minAnchorX: 300,
  maxAnchorX: 332,
  edgeSpawnJitter: 48,
  lengthJitterPct: 0.30,
  shortLChance: 0.10,
  shortLFactor: 0.70,
  longLChance: 0.00,
  longLFactor: 1.20,
  spacingJitterMin: 0.90,
  spacingJitterMax: 1.15,

  // 확률/카메라/스타
  ropeBreakProb: 0.10,
  itemSpawnProb: 0.20,
  camFollowAttach: 6.0,
  camFollowFree: 2.5,
  jumpSpeedScale: 1.0,
  gameOverWait: 3.0,
  flyHoldThreshold: 0.2,
  flyMaxHold: 1.3,
  flyUpVy: -180,
  flyMinFwd: 180,
  budSwayMinPct: 0.08,
  budSwayMaxPct: 0.32,
  starDuration: 3.0,
  starL: 160,
  starAdeg: 10,
  starDmin: 70,
  starDmax: 110,
  starEdgeJitter: 10,

  // 카메라 픽시 보간(별도)
  cameraSmooth: 0.12,
  cameraOffset: 80,

  // 색상
  colors: { rope: 0xffffff, ropeActive: 0x33ff66, player: 0xffe066, ui: 0xffffff, badge: 0x222638 },
};

// 저장 키(기존과 동일 키 유지)
const STORAGE_KEYS = {
  savings: 'webswing_savings_v1',
  exp: 'webswing_exp_v1',
  bestScore: 'webswing_best_v1',
  shopInventory: 'webswing_shop_inv_v1',
  selectedChar: 'webswing_selected_char_v1',
  demoCompleted: 'webswing_demo_done_v1',
  fastMode: 'webswing_fastmode_v1',
};

// 레벨 임계값(원본과 호환)
const LEVEL_THRESHOLDS = [10,50,100,200,300,400,500,600,700,800,900,1000];

// 샵 아이템(원본 이식)
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

// 픽셀 캐릭터(원본 이식; default는 폴리곤 사용)
const PIXEL_CHARACTERS = {
  default: { name: 'Polygon', price: 0, minLevel: 1, pixels: [], colors: [], description: 'Classic geometric shape that evolves with level' },
  robot: {
    name: 'Robot', price: 1000, minLevel: 3,
    pixels: [ [0,0,1,1,1,1,0,0],[0,1,2,1,1,2,1,0],[0,1,1,1,1,1,1,0],[0,0,1,1,1,1,0,0],[1,1,1,1,1,1,1,1],[1,0,1,1,1,1,0,1],[1,0,1,0,0,1,0,1],[0,0,1,0,0,1,0,0] ],
    colors: ['#8B93AF', '#4A90E2', '#2E5266'], description: 'Mechanical precision'
  },
  ninja: {
    name: 'Ninja', price: 1500, minLevel: 5,
    pixels: [ [0,0,1,1,1,1,0,0],[0,1,1,1,1,1,1,0],[0,1,2,1,1,2,1,0],[0,1,1,1,1,1,1,0],[0,0,1,1,1,1,0,0],[0,1,1,1,1,1,1,0],[0,1,0,1,1,0,1,0],[1,0,0,0,0,0,0,1] ],
    colors: ['#1a1a1a', '#ffffff', '#ff0000'], description: 'Silent and deadly'
  },
  pirate: {
    name: 'Pirate', price: 2000, minLevel: 7,
    pixels: [ [0,1,1,1,1,1,1,0],[1,1,1,1,1,1,1,1],[0,1,2,1,3,1,1,0],[0,1,1,1,1,1,1,0],[0,0,1,1,1,1,0,0],[0,1,1,1,1,1,1,0],[0,1,0,1,1,0,1,0],[1,0,0,0,0,0,0,1] ],
    colors: ['#8B4513', '#ffffff', '#000000', '#FFD700'], description: 'Arr! +15% gold'
  },
  wizard: {
    name: 'Wizard', price: 2500, minLevel: 10,
    pixels: [ [0,0,0,1,0,0,0,0],[0,0,1,1,1,0,0,0],[0,1,1,1,1,1,0,0],[0,1,2,1,2,1,0,0],[0,1,1,1,1,1,0,0],[0,1,3,3,3,1,0,0],[0,1,1,1,1,1,0,0],[0,1,0,0,0,1,0,0] ],
    colors: ['#4B0082', '#ffffff', '#FFD700', '#C0C0C0'], description: 'Magical powers'
  },
  knight: {
    name: 'Knight', price: 3000, minLevel: 12,
    pixels: [ [0,1,1,1,1,1,1,0],[0,1,1,2,2,1,1,0],[0,1,1,1,1,1,1,0],[0,1,3,1,1,3,1,0],[0,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,0],[0,1,0,1,1,0,1,0],[1,0,0,0,0,0,0,1] ],
    colors: ['#C0C0C0', '#808080', '#FF0000', '#FFD700'], description: 'Heavy armor protection'
  },
};
