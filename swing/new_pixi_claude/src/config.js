// Game configuration
const CONFIG = {
    // Screen dimensions
    width: 400,
    height: 600,
    backgroundColor: 0x1a1a2e,
    
    // Physics
    gravity: 600,
    jumpImpulse: 400,
    baseVx: 120,
    airResistance: 0.98,
    groundY: 750,
    
    // Rope settings
    ropeLength: { min: 80, max: 200 },
    ropeAmplitude: { min: 0.3, max: 0.8 },
    ropeOmega: { min: 1.5, max: 3.0 },
    ropeSpacing: { min: 100, max: 250 },
    
    // Catch mechanics
    catchRadius: 50,
    catchRadiusExpanded: 100,
    
    // Camera
    cameraSmooth: 0.1,
    cameraOffset: 150,
    
    // Star/Fever mode
    starDuration: 10,
    starRopeLength: 120,
    starSpacing: 80,
    
    // Shop items
    shopItems: [
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
    ],
    
    // Characters
    characters: {
        default: { name: 'Polygon', price: 0, minLevel: 1, description: 'Classic geometric shape' },
        robot: { name: 'Robot', price: 1000, minLevel: 3, color: 0x4ECDC4 },
        ninja: { name: 'Ninja', price: 2000, minLevel: 5, color: 0x2C3E50 },
        pirate: { name: 'Pirate', price: 1500, minLevel: 4, color: 0xE74C3C },
        wizard: { name: 'Wizard', price: 3000, minLevel: 6, color: 0x9B59B6 },
        knight: { name: 'Knight', price: 2500, minLevel: 5, color: 0x95A5A6 }
    },
    
    // Level thresholds
    levelThresholds: [10, 50, 100, 200, 350, 550, 800, 1100, 1500, 2000],
    
    // Colors
    colors: {
        rope: 0xFFFFFF,
        ropeActive: 0x00FF00,
        player: 0xFFD700,
        item: 0x00FFFF,
        star: 0xFFFF00,
        ui: 0xFFFFFF,
        shopCard: 0x2C3E50,
        shopCardHover: 0x34495E,
        shopCardOwned: 0x27AE60,
        shopCardLocked: 0x7F8C8D
    }
};

// Storage keys
const STORAGE_KEYS = {
    savings: 'webswing_savings_v1',
    exp: 'webswing_exp_v1',
    bestScore: 'webswing_best_v1',
    shopInventory: 'webswing_shop_inv_v1',
    selectedChar: 'webswing_selected_char_v1',
    demoCompleted: 'webswing_demo_done_v1',
    fastMode: 'webswing_fastmode_v1'
};