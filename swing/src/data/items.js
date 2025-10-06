(function (global) {
  const ITEM_SPECS = [
    { id: 'glow', type: 'level', maxLevel: 3, price: 50, minLevel: 2, unlock: { type: 'level', value: 2 } },
    { id: 'buds', type: 'level', maxLevel: 6, price: 50, minLevel: 5, unlock: { type: 'level', value: 5 } },
    { id: 'plusjump', type: 'single', price: 150, minLevel: 2, unlock: { type: 'level', value: 2 } },
    { id: 'fly', type: 'single', price: 300, minLevel: 10, unlock: { type: 'level', value: 2 } },
    //big's maxLevel is players level
    { id: 'big', type: 'level', maxLevel: 10, price: 20, minLevel: 5, unlock: { type: 'level', value: 5 } }, // NOTE: maxLevel is dynamically capped by player's current level in game.shop.js
    { id: 'gamble', type: 'consumable', price: 10, minLevel: 1, unlock: { type: 'level', value: 1 } },
    { id: 'magnet', type: 'level', maxLevel: 5, price: 50, minLevel: 5, unlock: { type: 'level', value: 5 } },
    { id: 'combo', type: 'level', maxLevel: 3, price: 80, minLevel: 10, unlock: { type: 'level', value: 10 } },
    { id: 'slow', type: 'level', maxLevel: 5, price: 100, minLevel: 15, unlock: { type: 'level', value: 15 } },
    { id: 'lucky', type: 'level', maxLevel: 5, price: 50, minLevel: 2, unlock: { type: 'level', value: 2 } },
    { id: 'revival', type: 'single', price: 999, minLevel: 10, unlock: { type: 'level', value: 10 } },
    { id: 'fever', type: 'level', maxLevel: 3, price: 50, minLevel: 5, unlock: { type: 'level', value: 5 } },
    { id: 'skill_card_plus', type: 'single', price: 1000, minLevel: 6, unlock: { type: 'level', value: 6 } },
    { id: 'skill_reroll', type: 'level', maxLevel: 3, price: 500, minLevel: 6, unlock: { type: 'level', value: 6 } },
  ];

  const ITEM_ART = {
    glow: {
      palette: {
        '.': null,
        Y: '#ffe066',
        O: '#ff922b',
      },
      pixels: [
        '..YYYY..',
        '.YYYYYY.',
        'YYYOOYYY',
        'YYOOOOYY',
        'YYYOOYYY',
        '.YYYYYY.',
        '..YYYY..',
        '........',
      ],
    },
    buds: {
      palette: {
        '.': null,
        B: '#87ceeb',
        D: '#4682b4',
      },
      pixels: [
        '........',
        '..BB....',
        '.BDDB...',
        '..BB.BB.',
        '....BDDB',
        '.....BB.',
        '........',
        '........',
      ],
    },
    plusjump: {
      palette: {
        '.': null,
        A: '#3498db',
        B: '#2980b9',
        W: '#ecf0f1',
      },
      pixels: [
        '...AA...',
        '..AWWA..',
        '.AWWWWA.',
        'AWWWWWWA',
        '..ABBA..',
        '..ABBA..',
        '..ABBA..',
        '..ABBA..',
      ],
    },
    fly: {
      palette: {
        '.': null,
        W: '#ffffff',
        C: '#b3e5fc',
        B: '#81d4fa',
      },
      pixels: [
        '..WWWW..',
        '.WCCCWW.',
        'WCCCCCCW',
        'WCCCCCW.',
        '.WWWWW..',
        '..WW....',
        '........',
        '........',
      ],
    },
    big: {
      palette: {
        '.': null,
        B: '#2c3e50',
        G: '#95a5a6',
        L: '#bdc3c7',
      },
      pixels: [
        '..BBB...',
        '.BLLLB..',
        'BLLGLLB.',
        'BLGGGLB.',
        'BLLGLLB.',
        '.BLLLB..',
        '..BBB...',
        '...B....',
      ],
    },
    gamble: {
      palette: {
        '.': null,
        W: '#ffffff',
        B: '#2c3e50',
        D: '#34495e',
      },
      pixels: [
        'DDDDDDDD',
        'DWWWWWWD',
        'DWBWWBWD',
        'DWWWWWWD',
        'DWBWWBWD',
        'DWWWWWWD',
        'DDDDDDDD',
        '........',
      ],
    },
    magnet: {
      palette: {
        '.': null,
        R: '#ff6b6b',
        B: '#4d908e',
        S: '#adb5bd',
      },
      pixels: [
        'RR....BB',
        'RR....BB',
        'RR....BB',
        'RR....BB',
        '.RSSSSS.',
        '.SSSSSS.',
        '..SSSS..',
        '........',
      ],
    },
    combo: {
      palette: {
        '.': null,
        P: '#eeeeee',
        R: '#c0392b',
      },
      pixels: [
        '...PP...',
        '...PP...',
        '.PPRRPP.',
        '.PRRRRP.',
        '.PPRRPP.',
        '...PP...',
        '...PP...',
        '........',
      ],
    },
    slow: {
      palette: {
        '.': null,
        G: '#27ae60',
        S: '#2ecc71',
      },
      pixels: [
        'GGGGGGGG',
        'GSSSSSSG',
        '.GSSSSG.',
        '..GSSG..',
        '..GSSG..',
        '.GSSSSG.',
        'GSSSSSSG',
        'GGGGGGGG',
      ],
    },
    lucky: {
  palette: {
    '.': null,          // transparent
    O: '#2c3e50',       // outline
    T: '#8e5a2b',       // timber wood
    G: '#f1c40f',       // gold band
    Y: '#ffd23c',       // gold lock highlight
    K: '#1b2631'        // keyhole dark
  },
  pixels: [
    'OOOOOOOO',
    'OTTTTTTO',
    'OTGGGGTO',
    'OTTTTTTO',
    'OTTTTTTO',
    'OTTYYTTO',
    'OTTKKTTO',
    'OOOOOOOO',
  ],
    },
    revival: {
      palette: {
        '.': null,
        R: '#e63946',
        P: '#ffb3c1',
      },
      pixels: [
        '.RR..RR.',
        'RRRRRRRR',
        'RPPPPPRR',
        'RRPPPRR.',
        '.RRRRR..',
        '..RRR...',
        '...R....',
        '........',
      ],
    },
    fever: {
      palette: {
        '.': null,
        Y: '#f1c40f',
        O: '#f39c12',
      },
      pixels: [
        'YYYYYYYY',
        'YOOOOOOY',
        '.YOOOOY.',
        '..YOOY..',
        '..YOOY..',
        '.YOOOOY.',
        'YOOOOOOY',
        'YYYYYYYY',
      ],
    },
    skill_card_plus: {
      palette: {
        '.': null,
        B: '#2c3e50',
        C: '#4a90e2',
        L: '#a4c2f4',
        P: '#f7fbff',
      },
      pixels: [
        '..BBBB..',
        '.BCCCB..',
        'BCPPLCBB',
        'BCPPLCBB',
        'BCPPLCBB',
        '.BCCCB..',
        '..BBBB..',
        '...BB...',
      ],
    },
    skill_reroll: {
      palette: {
        '.': null,
        B: '#2c3e50',
        G: '#2ecc71',
        L: '#a2f2c2',
        W: '#f7fbff',
      },
      pixels: [
        '..BBBB..',
        '.BGGGB..',
        'BGWWWGGB',
        'BGWGGWGB',
        'BGWWWGGB',
        '.BGGGB..',
        '..BBBB..',
        '...BB...',
      ],
    },
  };

  // In-game item box pixel art - unified question mark box
  const BOX_ITEM_ART = {
    itemBox: {
      palette: {
        '.': null,
        Y: '#ffd60a',
        O: '#ff9500',
        W: '#ffffff',
        B: '#2c3e50',
      },
      pixels: [
        'YYYYYYYY',
        'YOWWWWOY',
        'YOWBBWOY',
        'YOOOBWOY',
        'YOOBBOOY',
        'YOOOOOYY',
        'YOOBBOOY',
        'YYYYYYYY',
      ],
    },
  };

  global.ITEM_SPECS = ITEM_SPECS;
  global.ITEM_ART = ITEM_ART;
  global.BOX_ITEM_ART = BOX_ITEM_ART;
})(typeof window !== 'undefined' ? window : globalThis);
