// 로컬스토리지 기반 간단 래퍼 (save/storageBridge가 존재하면 네이티브에서도 동작)
const Storage = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem(key);
      return v == null ? fallback : JSON.parse(v);
    } catch (_) {
      return fallback;
    }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch (_) {}
  },
};

// 게임 저장 상태
class GameData {
  constructor() {
    this.savings = 0;
    this.exp = 0;
    this.bestScore = 0;
    // 원본과 동일 키 구조 초기값
    this.shopInventory = {
      glowLevel: 0,
      budsLevel: 0,
      plusJump: false,
      fly: false,
      bigLevel: 0,
      gambleActive: false,
      webActive: false,
      magnetLevel: 0,
      shield: false,
      comboLevel: 0,
      slow: false,
      double: false,
      luckyLevel: 0,
      revival: false,
      rainbow: false,
      feverLevel: 0,
      bankLevel: 0,
      characters: [],
    };
    this.selectedCharacter = 'default';
    this.demoCompleted = false;
    this.fastMode = false;
    this.load();
  }

  load() {
    this.savings = Storage.get(STORAGE_KEYS.savings, 0);
    this.exp = Storage.get(STORAGE_KEYS.exp, 0);
    this.bestScore = Storage.get(STORAGE_KEYS.bestScore, 0);
    this.shopInventory = Storage.get(STORAGE_KEYS.shopInventory, {});
    this.selectedCharacter = Storage.get(STORAGE_KEYS.selectedChar, 'default');
    this.demoCompleted = Storage.get(STORAGE_KEYS.demoCompleted, false);
    this.fastMode = Storage.get(STORAGE_KEYS.fastMode, false);
  }

  save() {
    Storage.set(STORAGE_KEYS.savings, this.savings);
    Storage.set(STORAGE_KEYS.exp, this.exp);
    Storage.set(STORAGE_KEYS.bestScore, this.bestScore);
    Storage.set(STORAGE_KEYS.shopInventory, this.shopInventory);
    Storage.set(STORAGE_KEYS.selectedChar, this.selectedCharacter);
    Storage.set(STORAGE_KEYS.demoCompleted, this.demoCompleted);
    Storage.set(STORAGE_KEYS.fastMode, this.fastMode);
  }

  level() {
    let lv = 1;
    for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
      if (this.exp >= LEVEL_THRESHOLDS[i]) lv = i + 2; else break;
    }
    return lv;
  }

  addRunResult(score) {
    const earned = Math.max(0, score - 5);
    this.exp += earned;
    // 수익 보정: Gamble(1.5x 1회), Double(2x 1회), Bank(레벨당 +5%)
    let gain = earned;
    if (this.shopInventory.gambleActive) {
      gain = Math.floor(gain * 1.5);
      this.shopInventory.gambleActive = false;
    }
    if (this.shopInventory.double) {
      gain = gain * 2;
      this.shopInventory.double = false;
    }
    const bankLv = this.shopInventory.bankLevel || 0;
    if (bankLv > 0) {
      gain = Math.floor(gain * (1 + 0.05 * bankLv));
    }
    this.savings += gain;
    if (score > this.bestScore) this.bestScore = score;
    this.save();
    return gain;
  }

  ownsCharacter(id) {
    if (id === 'default') return true;
    const list = this.shopInventory.characters || [];
    return list.includes(id);
  }

  purchaseCharacter(id, price) {
    if (this.savings < price) return false;
    const list = this.shopInventory.characters || [];
    if (!list.includes(id)) list.push(id);
    this.shopInventory.characters = list;
    this.savings -= price;
    this.selectedCharacter = id;
    this.save();
    return true;
  }

  itemLevel(id) {
    if (id === 'glow') return this.shopInventory.glowLevel || 0;
    if (id === 'buds') return this.shopInventory.budsLevel || 0;
    if (id === 'plusjump') return this.shopInventory.plusJump ? 1 : 0;
    if (id === 'fly') return this.shopInventory.fly ? 1 : 0;
    if (id === 'big') return this.shopInventory.bigLevel || 0;
    if (id === 'gamble') return this.shopInventory.gambleActive ? 1 : 0;
    if (id === 'web') return this.shopInventory.webActive ? 1 : 0;
    if (id === 'magnet') return this.shopInventory.magnetLevel || 0;
    if (id === 'shield') return this.shopInventory.shield ? 1 : 0;
    if (id === 'combo') return this.shopInventory.comboLevel || 0;
    if (id === 'slow') return this.shopInventory.slow ? 1 : 0;
    if (id === 'double') return this.shopInventory.double ? 1 : 0;
    if (id === 'lucky') return this.shopInventory.luckyLevel || 0;
    if (id === 'revival') return this.shopInventory.revival ? 1 : 0;
    if (id === 'rainbow') return this.shopInventory.rainbow ? 1 : 0;
    if (id === 'fever') return this.shopInventory.feverLevel || 0;
    if (id === 'bank') return this.shopInventory.bankLevel || 0;
    return 0;
  }

  isItemMaxed(itemId) {
    const it = SHOP_ITEMS.find(x => x.id === itemId);
    if (!it) return false;
    const lv = this.itemLevel(itemId);
    if (it.type === 'single') return lv >= 1;
    if (it.id === 'buds') return lv >= this.currentBodySides();
    if (it.id === 'big') return lv >= this.level();
    if (it.maxLevel) return lv >= it.maxLevel;
    return false;
  }

  currentBodySides() {
    const lvl = this.level();
    if (lvl <= 1) return 0;
    const groupIdx = Math.floor((lvl - 2) / 3);
    return 3 + Math.max(0, groupIdx);
  }

  nextPriceForItem(itemId) {
    const it = SHOP_ITEMS.find(x => x.id === itemId);
    if (!it) return 0;
    if (it.type !== 'level') return it.price;
    const lv = this.itemLevel(itemId);
    if (itemId === 'big') return 20 + 10 * lv;
    return it.price;
  }

  canPurchase(itemId) {
    const price = this.nextPriceForItem(itemId);
    return this.savings >= price && !this.isItemMaxed(itemId);
  }

  purchaseItem(itemId) {
    const it = SHOP_ITEMS.find(x => x.id === itemId);
    if (!it) return { ok: false, reason: 'not_found' };
    const price = this.nextPriceForItem(itemId);
    if (this.savings < price) return { ok: false, reason: 'funds' };
    if (this.isItemMaxed(itemId)) return { ok: false, reason: 'maxed' };
    this.savings -= price;
    if (itemId === 'glow') this.shopInventory.glowLevel = (this.shopInventory.glowLevel || 0) + 1;
    else if (itemId === 'buds') this.shopInventory.budsLevel = Math.min(this.currentBodySides(), (this.shopInventory.budsLevel || 0) + 1);
    else if (itemId === 'plusjump') this.shopInventory.plusJump = true;
    else if (itemId === 'fly') this.shopInventory.fly = true;
    else if (itemId === 'big') this.shopInventory.bigLevel = Math.min(this.level(), (this.shopInventory.bigLevel || 0) + 1);
    else if (itemId === 'gamble') this.shopInventory.gambleActive = true;
    else if (itemId === 'web') this.shopInventory.webActive = true;
    else if (itemId === 'magnet') this.shopInventory.magnetLevel = (this.shopInventory.magnetLevel || 0) + 1;
    else if (itemId === 'shield') this.shopInventory.shield = true;
    else if (itemId === 'combo') this.shopInventory.comboLevel = (this.shopInventory.comboLevel || 0) + 1;
    else if (itemId === 'slow') this.shopInventory.slow = true;
    else if (itemId === 'double') this.shopInventory.double = true;
    else if (itemId === 'lucky') this.shopInventory.luckyLevel = (this.shopInventory.luckyLevel || 0) + 1;
    else if (itemId === 'revival') this.shopInventory.revival = true;
    else if (itemId === 'rainbow') this.shopInventory.rainbow = true;
    else if (itemId === 'fever') this.shopInventory.feverLevel = (this.shopInventory.feverLevel || 0) + 1;
    else if (itemId === 'bank') this.shopInventory.bankLevel = (this.shopInventory.bankLevel || 0) + 1;
    this.save();
    return { ok: true };
  }
}
