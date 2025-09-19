(function (global) {
  const ITEM_SPECS = [
    { id: 'glow', type: 'level', maxLevel: 3, price: 20, minLevel: 2 },
    { id: 'buds', type: 'level', maxLevel: 5, price: 10, minLevel: 2 },
    { id: 'plusjump', type: 'single', price: 100, minLevel: 2 },
    { id: 'fly', type: 'single', price: 100, minLevel: 2 },
    { id: 'big', type: 'level', price: 20, minLevel: 5 },
    { id: 'gamble', type: 'consumable', price: 10, minLevel: 1 },
    { id: 'web', type: 'consumable', price: 3, minLevel: 1 },
    { id: 'magnet', type: 'level', maxLevel: 5, price: 30, minLevel: 3 },
    { id: 'combo', type: 'level', maxLevel: 3, price: 80, minLevel: 6 },
    { id: 'slow', type: 'consumable', price: 100, minLevel: 3 },
    { id: 'double', type: 'single', price: 100, minLevel: 8 },
    { id: 'lucky', type: 'level', maxLevel: 5, price: 40, minLevel: 2 },
    { id: 'revival', type: 'consumable', price: 100, minLevel: 10 },
    { id: 'fever', type: 'level', maxLevel: 3, price: 60, minLevel: 5 },
  ];

  global.ITEM_SPECS = ITEM_SPECS;
})(typeof window !== 'undefined' ? window : globalThis);
