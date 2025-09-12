// Storage management
class Storage {
    static get(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(key);
            return value !== null ? JSON.parse(value) : defaultValue;
        } catch (e) {
            console.error('Storage get error:', e);
            return defaultValue;
        }
    }
    
    static set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Storage set error:', e);
            return false;
        }
    }
    
    static remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('Storage remove error:', e);
            return false;
        }
    }
}

// Game data management
class GameData {
    constructor() {
        this.savings = 0;
        this.exp = 0;
        this.bestScore = 0;
        this.shopInventory = {};
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
    
    getLevel() {
        let level = 1;
        for (let i = 0; i < CONFIG.levelThresholds.length; i++) {
            if (this.exp >= CONFIG.levelThresholds[i]) {
                level = i + 2;
            } else {
                break;
            }
        }
        return level;
    }
    
    addScore(score) {
        // Add to exp and savings
        const earned = Math.max(0, score - 5);
        this.exp += earned;
        
        // Check for gamble bonus
        if (this.shopInventory.gambleActive) {
            this.savings += Math.floor(earned * 1.5);
            this.shopInventory.gambleActive = false;
        } else {
            this.savings += earned;
        }
        
        // Update best score
        if (score > this.bestScore) {
            this.bestScore = score;
        }
        
        this.save();
        return earned;
    }
    
    canAfford(price) {
        return this.savings >= price;
    }
    
    purchase(itemId, price) {
        if (!this.canAfford(price)) return false;
        
        this.savings -= price;
        
        // Handle different item types
        const item = CONFIG.shopItems.find(it => it.id === itemId);
        if (!item) return false;
        
        if (item.type === 'level') {
            const currentLevel = this.shopInventory[itemId + 'Level'] || 0;
            this.shopInventory[itemId + 'Level'] = currentLevel + 1;
        } else if (item.type === 'single') {
            this.shopInventory[itemId] = true;
        }
        
        this.save();
        return true;
    }
    
    purchaseCharacter(charId, price) {
        if (!this.canAfford(price)) return false;
        
        this.savings -= price;
        
        if (!this.shopInventory.characters) {
            this.shopInventory.characters = [];
        }
        
        if (!this.shopInventory.characters.includes(charId)) {
            this.shopInventory.characters.push(charId);
        }
        
        this.selectedCharacter = charId;
        this.save();
        return true;
    }
    
    ownsCharacter(charId) {
        if (charId === 'default') return true;
        return this.shopInventory.characters && this.shopInventory.characters.includes(charId);
    }
    
    selectCharacter(charId) {
        if (this.ownsCharacter(charId)) {
            this.selectedCharacter = charId;
            this.save();
            return true;
        }
        return false;
    }
    
    getItemLevel(itemId) {
        const item = CONFIG.shopItems.find(it => it.id === itemId);
        if (!item) return 0;
        
        if (item.type === 'level') {
            return this.shopInventory[itemId + 'Level'] || 0;
        } else if (item.type === 'single') {
            return this.shopInventory[itemId] ? 1 : 0;
        }
        
        return 0;
    }
    
    isItemMaxed(itemId) {
        const item = CONFIG.shopItems.find(it => it.id === itemId);
        if (!item) return false;
        
        const level = this.getItemLevel(itemId);
        
        if (item.type === 'single') {
            return level >= 1;
        } else if (item.type === 'level' && item.maxLevel) {
            return level >= item.maxLevel;
        }
        
        return false;
    }
}