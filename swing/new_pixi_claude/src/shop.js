// Shop System with Pixi.js - Pagination Version
class Shop {
    constructor(game) {
        this.game = game;
        this.container = new PIXI.Container();
        
        // Shop state
        this.mode = 'items'; // 'items' or 'chars'
        this.currentPage = 0;
        this.itemsPerPage = 9; // 3x3 grid
        this.cards = [];
        this.selectedItem = null;
        
        // Guide state
        this.guideVisible = false;
        this.guidePage = 0;
        
        this.createShop();
    }
    
    createShop() {
        // Background
        const bg = new PIXI.Graphics();
        bg.beginFill(0x1a1a2e);
        bg.drawRect(0, 0, CONFIG.width, CONFIG.height);
        bg.endFill();
        this.container.addChild(bg);
        
        // Title
        const titleStyle = new PIXI.TextStyle({
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 16,
            fill: 0xFFFFFF,
            stroke: 0x000000,
            strokeThickness: 2
        });
        
        this.titleText = new PIXI.Text('ITEM SHOP', titleStyle);
        this.titleText.anchor.set(0.5);
        this.titleText.x = CONFIG.width / 2;
        this.titleText.y = 25;
        this.container.addChild(this.titleText);
        
        // Money display
        const moneyStyle = new PIXI.TextStyle({
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 10,
            fill: 0xFFD700,
            stroke: 0x000000,
            strokeThickness: 2
        });
        
        this.moneyText = new PIXI.Text(`$${this.game.gameData.savings}`, moneyStyle);
        this.moneyText.anchor.set(1, 0);
        this.moneyText.x = CONFIG.width - 20;
        this.moneyText.y = 50;
        this.container.addChild(this.moneyText);
        
        // Guide button
        this.createGuideButton();
        
        // Tab buttons
        this.createTabButtons();
        
        // Card display area
        this.createCardArea();
        
        // Pagination controls
        this.createPaginationControls();
        
        // Back button
        this.createBackButton();
        
        // Purchase modal
        this.createPurchaseModal();
        
        // Guide modal
        this.createGuideModal();
    }
    
    createGuideButton() {
        const guideBtn = new PIXI.Container();
        guideBtn.x = 30;
        guideBtn.y = 50;
        guideBtn.eventMode = 'static';
        guideBtn.cursor = 'pointer';
        
        const bg = new PIXI.Graphics();
        bg.lineStyle(2, 0xFFFFFF, 1);
        bg.beginFill(0x000000, 0.3);
        bg.drawCircle(0, 0, 15);
        bg.endFill();
        
        guideBtn.on('pointerdown', (e) => {
            e.stopPropagation();
            this.showGuide();
        });
        
        guideBtn.addChild(bg);
        
        const style = new PIXI.TextStyle({
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 12,
            fill: 0xFFFFFF
        });
        
        const label = new PIXI.Text('?', style);
        label.anchor.set(0.5);
        guideBtn.addChild(label);
        
        this.container.addChild(guideBtn);
    }
    
    createTabButtons() {
        const tabContainer = new PIXI.Container();
        tabContainer.y = 75;
        
        // Items tab
        this.itemsTab = this.createTab('ITEMS', CONFIG.width / 2 - 80, 15, () => {
            this.setMode('items');
        });
        tabContainer.addChild(this.itemsTab);
        
        // Characters tab
        this.charsTab = this.createTab('CHARS', CONFIG.width / 2 + 80, 15, () => {
            this.setMode('chars');
        });
        tabContainer.addChild(this.charsTab);
        
        this.container.addChild(tabContainer);
        
        // Set initial active tab
        this.updateTabVisuals();
    }
    
    createTab(text, x, y, onClick) {
        const tab = new PIXI.Container();
        tab.x = x;
        tab.y = y;
        tab.eventMode = 'static';
        tab.cursor = 'pointer';
        
        const bg = new PIXI.Graphics();
        bg.lineStyle(2, 0xFFFFFF, 1);
        bg.beginFill(0x000000, 0.3);
        bg.drawRect(-60, -15, 120, 30);
        bg.endFill();
        
        tab.on('pointerdown', (e) => {
            e.stopPropagation();
            onClick();
        });
        
        tab.addChild(bg);
        tab.bg = bg;
        
        const style = new PIXI.TextStyle({
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 8,
            fill: 0xFFFFFF
        });
        
        const label = new PIXI.Text(text, style);
        label.anchor.set(0.5);
        tab.addChild(label);
        
        return tab;
    }
    
    updateTabVisuals() {
        // Update items tab
        this.itemsTab.bg.clear();
        const itemsActive = this.mode === 'items';
        this.itemsTab.bg.lineStyle(2, itemsActive ? 0x00FF00 : 0xFFFFFF, 1);
        this.itemsTab.bg.beginFill(0x000000, itemsActive ? 0.5 : 0.3);
        this.itemsTab.bg.drawRect(-60, -15, 120, 30);
        this.itemsTab.bg.endFill();
        
        // Update chars tab
        this.charsTab.bg.clear();
        const charsActive = this.mode === 'chars';
        this.charsTab.bg.lineStyle(2, charsActive ? 0x00FF00 : 0xFFFFFF, 1);
        this.charsTab.bg.beginFill(0x000000, charsActive ? 0.5 : 0.3);
        this.charsTab.bg.drawRect(-60, -15, 120, 30);
        this.charsTab.bg.endFill();
    }
    
    createCardArea() {
        this.cardContainer = new PIXI.Container();
        this.cardContainer.y = 120;
        this.container.addChild(this.cardContainer);
    }
    
    createPaginationControls() {
        this.paginationContainer = new PIXI.Container();
        this.paginationContainer.y = CONFIG.height - 120;
        
        // Left arrow button
        this.leftArrow = new PIXI.Container();
        this.leftArrow.x = CONFIG.width / 2 - 80;
        this.leftArrow.eventMode = 'static';
        this.leftArrow.cursor = 'pointer';
        
        const leftBg = new PIXI.Graphics();
        leftBg.lineStyle(2, 0xFFFFFF, 1);
        leftBg.beginFill(0x000000, 0.3);
        leftBg.drawPolygon([-15, 0, 0, -10, 0, 10]);
        leftBg.endFill();
        
        this.leftArrow.on('pointerdown', (e) => {
            e.stopPropagation();
            this.previousPage();
        });
        
        this.leftArrow.addChild(leftBg);
        this.paginationContainer.addChild(this.leftArrow);
        
        // Page indicator
        const pageStyle = new PIXI.TextStyle({
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 10,
            fill: 0xFFFFFF
        });
        
        this.pageText = new PIXI.Text('1/1', pageStyle);
        this.pageText.anchor.set(0.5);
        this.pageText.x = CONFIG.width / 2;
        this.paginationContainer.addChild(this.pageText);
        
        // Right arrow button
        this.rightArrow = new PIXI.Container();
        this.rightArrow.x = CONFIG.width / 2 + 80;
        this.rightArrow.eventMode = 'static';
        this.rightArrow.cursor = 'pointer';
        
        const rightBg = new PIXI.Graphics();
        rightBg.lineStyle(2, 0xFFFFFF, 1);
        rightBg.beginFill(0x000000, 0.3);
        rightBg.drawPolygon([15, 0, 0, -10, 0, 10]);
        rightBg.endFill();
        
        this.rightArrow.on('pointerdown', (e) => {
            e.stopPropagation();
            this.nextPage();
        });
        
        this.rightArrow.addChild(rightBg);
        this.paginationContainer.addChild(this.rightArrow);
        
        this.container.addChild(this.paginationContainer);
    }
    
    createBackButton() {
        const backBtn = new PIXI.Container();
        backBtn.x = CONFIG.width / 2;
        backBtn.y = CONFIG.height - 40;
        backBtn.eventMode = 'static';
        backBtn.cursor = 'pointer';
        
        const bg = new PIXI.Graphics();
        bg.lineStyle(2, 0xFFFFFF, 1);
        bg.beginFill(0x000000, 0.3);
        bg.drawRect(-60, -20, 120, 40);
        bg.endFill();
        
        const drawNormal = () => {
            bg.clear();
            bg.lineStyle(2, 0xFFFFFF, 1);
            bg.beginFill(0x000000, 0.3);
            bg.drawRect(-60, -20, 120, 40);
            bg.endFill();
        };
        
        const drawHover = () => {
            bg.clear();
            bg.lineStyle(2, 0xFFFF00, 1);
            bg.beginFill(0xFFFFFF, 0.1);
            bg.drawRect(-60, -20, 120, 40);
            bg.endFill();
        };
        
        backBtn.on('pointerover', drawHover);
        backBtn.on('pointerout', drawNormal);
        backBtn.on('pointerdown', (e) => {
            e.stopPropagation();
            this.game.setState('intro');
        });
        
        backBtn.addChild(bg);
        
        const style = new PIXI.TextStyle({
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 10,
            fill: 0xFFFFFF
        });
        
        const label = new PIXI.Text('BACK', style);
        label.anchor.set(0.5);
        backBtn.addChild(label);
        
        this.container.addChild(backBtn);
    }
    
    createPurchaseModal() {
        this.modal = new PIXI.Container();
        this.modal.visible = false;
        
        // Modal background
        const modalBg = new PIXI.Graphics();
        modalBg.beginFill(0x000000, 0.8);
        modalBg.drawRect(0, 0, CONFIG.width, CONFIG.height);
        modalBg.endFill();
        modalBg.eventMode = 'static';
        modalBg.on('pointerdown', (e) => {
            if (e.target === modalBg) {
                e.stopPropagation();
                this.modal.visible = false;
            }
        });
        this.modal.addChild(modalBg);
        
        // Modal panel
        const panel = new PIXI.Container();
        panel.x = CONFIG.width / 2;
        panel.y = CONFIG.height / 2;
        panel.eventMode = 'static';
        
        const panelBg = new PIXI.Graphics();
        panelBg.beginFill(0x2C3E50);
        panelBg.drawRoundedRect(-150, -120, 300, 240, 15);
        panelBg.endFill();
        panel.addChild(panelBg);
        
        panel.on('pointerdown', (e) => {
            e.stopPropagation();
        });
        
        // Item name
        const nameStyle = new PIXI.TextStyle({
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 12,
            fill: 0xFFFFFF
        });
        
        this.modalItemName = new PIXI.Text('Item Name', nameStyle);
        this.modalItemName.anchor.set(0.5);
        this.modalItemName.y = -60;
        panel.addChild(this.modalItemName);
        
        // Price
        const priceStyle = new PIXI.TextStyle({
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 10,
            fill: 0xFFD700
        });
        
        this.modalPrice = new PIXI.Text('$100', priceStyle);
        this.modalPrice.anchor.set(0.5);
        this.modalPrice.y = -20;
        panel.addChild(this.modalPrice);
        
        // Description
        const descStyle = new PIXI.TextStyle({
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 8,
            fill: 0xECF0F1,
            wordWrap: true,
            wordWrapWidth: 250,
            align: 'center',
            lineHeight: 14
        });
        
        this.modalDesc = new PIXI.Text('Description', descStyle);
        this.modalDesc.anchor.set(0.5);
        this.modalDesc.y = 10;
        panel.addChild(this.modalDesc);
        
        // Current balance
        const balanceStyle = new PIXI.TextStyle({
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 8,
            fill: 0x00FF00
        });
        
        this.modalBalance = new PIXI.Text('Balance: $0', balanceStyle);
        this.modalBalance.anchor.set(0.5);
        this.modalBalance.y = 40;
        panel.addChild(this.modalBalance);
        
        // Error message
        const errorStyle = new PIXI.TextStyle({
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 8,
            fill: 0xFF0000
        });
        
        this.modalError = new PIXI.Text('Not enough money!', errorStyle);
        this.modalError.anchor.set(0.5);
        this.modalError.y = 60;
        this.modalError.visible = false;
        panel.addChild(this.modalError);
        
        // Buy button
        this.buyBtn = this.createModalButton('BUY', -60, 85, () => {
            this.purchaseSelectedItem();
        });
        panel.addChild(this.buyBtn);
        
        // Cancel button
        const cancelBtn = this.createModalButton('CANCEL', 60, 85, () => {
            this.modal.visible = false;
            this.modalError.visible = false;
        });
        panel.addChild(cancelBtn);
        
        this.modal.addChild(panel);
        this.container.addChild(this.modal);
    }
    
    createGuideModal() {
        this.guideModal = new PIXI.Container();
        this.guideModal.visible = false;
        
        // Background
        const guideBg = new PIXI.Graphics();
        guideBg.beginFill(0x000000, 0.9);
        guideBg.drawRect(0, 0, CONFIG.width, CONFIG.height);
        guideBg.endFill();
        guideBg.eventMode = 'static';
        guideBg.on('pointerdown', (e) => {
            if (e.target === guideBg) {
                e.stopPropagation();
                this.guideModal.visible = false;
            }
        });
        this.guideModal.addChild(guideBg);
        
        // Guide panel
        const panel = new PIXI.Container();
        panel.x = CONFIG.width / 2;
        panel.y = CONFIG.height / 2;
        panel.eventMode = 'static';
        
        const panelBg = new PIXI.Graphics();
        panelBg.beginFill(0x2C3E50);
        panelBg.drawRoundedRect(-180, -250, 360, 500, 15);
        panelBg.endFill();
        panel.addChild(panelBg);
        
        panel.on('pointerdown', (e) => {
            e.stopPropagation();
        });
        
        // Title
        const titleStyle = new PIXI.TextStyle({
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 14,
            fill: 0xFFFFFF
        });
        
        this.guideTitle = new PIXI.Text('ITEM GUIDE', titleStyle);
        this.guideTitle.anchor.set(0.5);
        this.guideTitle.y = -220;
        panel.addChild(this.guideTitle);
        
        // Guide content container
        this.guideContent = new PIXI.Container();
        this.guideContent.y = -180;
        panel.addChild(this.guideContent);
        
        // Guide pagination
        this.guidePagination = new PIXI.Container();
        this.guidePagination.y = 200;
        
        // Left arrow
        this.guideLeftArrow = new PIXI.Container();
        this.guideLeftArrow.x = -80;
        this.guideLeftArrow.eventMode = 'static';
        this.guideLeftArrow.cursor = 'pointer';
        
        const guideLeftBg = new PIXI.Graphics();
        guideLeftBg.lineStyle(2, 0xFFFFFF, 1);
        guideLeftBg.beginFill(0x000000, 0.3);
        guideLeftBg.drawPolygon([-15, 0, 0, -10, 0, 10]);
        guideLeftBg.endFill();
        
        this.guideLeftArrow.on('pointerdown', (e) => {
            e.stopPropagation();
            this.previousGuidePage();
        });
        
        this.guideLeftArrow.addChild(guideLeftBg);
        this.guidePagination.addChild(this.guideLeftArrow);
        
        // Page text
        const pageStyle = new PIXI.TextStyle({
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 10,
            fill: 0xFFFFFF
        });
        
        this.guidePageText = new PIXI.Text('1/1', pageStyle);
        this.guidePageText.anchor.set(0.5);
        this.guidePagination.addChild(this.guidePageText);
        
        // Right arrow
        this.guideRightArrow = new PIXI.Container();
        this.guideRightArrow.x = 80;
        this.guideRightArrow.eventMode = 'static';
        this.guideRightArrow.cursor = 'pointer';
        
        const guideRightBg = new PIXI.Graphics();
        guideRightBg.lineStyle(2, 0xFFFFFF, 1);
        guideRightBg.beginFill(0x000000, 0.3);
        guideRightBg.drawPolygon([15, 0, 0, -10, 0, 10]);
        guideRightBg.endFill();
        
        this.guideRightArrow.on('pointerdown', (e) => {
            e.stopPropagation();
            this.nextGuidePage();
        });
        
        this.guideRightArrow.addChild(guideRightBg);
        this.guidePagination.addChild(this.guideRightArrow);
        
        panel.addChild(this.guidePagination);
        
        // Close button (X at top right)
        const closeBtn = new PIXI.Container();
        closeBtn.x = 160;
        closeBtn.y = -230;
        closeBtn.eventMode = 'static';
        closeBtn.cursor = 'pointer';
        
        const closeBg = new PIXI.Graphics();
        closeBg.lineStyle(2, 0xFFFFFF, 1);
        closeBg.beginFill(0xFF0000, 0.8);
        closeBg.drawCircle(0, 0, 12);
        closeBg.endFill();
        closeBtn.addChild(closeBg);
        
        const xStyle = new PIXI.TextStyle({
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 10,
            fill: 0xFFFFFF
        });
        const xText = new PIXI.Text('X', xStyle);
        xText.anchor.set(0.5);
        closeBtn.addChild(xText);
        
        closeBtn.on('pointerdown', (e) => {
            e.stopPropagation();
            this.guideModal.visible = false;
        });
        
        panel.addChild(closeBtn);
        
        this.guideModal.addChild(panel);
        this.container.addChild(this.guideModal);
    }
    
    createModalButton(text, x, y, onClick) {
        const btn = new PIXI.Container();
        btn.x = x;
        btn.y = y;
        btn.eventMode = 'static';
        btn.cursor = 'pointer';
        
        const bg = new PIXI.Graphics();
        bg.beginFill(text === 'BUY' ? 0x27AE60 : 0x7F8C8D);
        bg.drawRoundedRect(-40, -20, 80, 40, 8);
        bg.endFill();
        
        btn.on('pointerdown', (e) => {
            e.stopPropagation();
            onClick();
        });
        
        btn.addChild(bg);
        
        const style = new PIXI.TextStyle({
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 8,
            fill: 0xFFFFFF
        });
        
        const label = new PIXI.Text(text, style);
        label.anchor.set(0.5);
        btn.addChild(label);
        
        return btn;
    }
    
    setMode(mode) {
        this.mode = mode;
        this.currentPage = 0;
        this.updateTabVisuals();
        this.titleText.text = mode === 'items' ? 'ITEM SHOP' : 'CHAR SHOP';
        this.populateCards();
    }
    
    populateCards() {
        // Clear existing cards
        this.cards.forEach(card => card.destroy());
        this.cards = [];
        this.cardContainer.removeChildren();
        
        // Get items for current page
        const items = this.getCurrentPageItems();
        
        // Create cards for current page
        items.forEach((item, index) => {
            const card = new ShopCard(this, item, index, this.mode === 'items' ? 'item' : 'char');
            this.cards.push(card);
            this.cardContainer.addChild(card.container);
        });
        
        // Update pagination
        this.updatePagination();
    }
    
    getCurrentPageItems() {
        let allItems;
        if (this.mode === 'items') {
            allItems = CONFIG.shopItems.filter(item => 
                (item.minLevel || 1) <= this.game.gameData.getLevel()
            );
        } else {
            allItems = Object.entries(CONFIG.characters).map(([id, data]) => ({
                ...data,
                id
            }));
        }
        
        const start = this.currentPage * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        return allItems.slice(start, end);
    }
    
    getTotalPages() {
        let totalItems;
        if (this.mode === 'items') {
            totalItems = CONFIG.shopItems.filter(item => 
                (item.minLevel || 1) <= this.game.gameData.getLevel()
            ).length;
        } else {
            totalItems = Object.keys(CONFIG.characters).length;
        }
        return Math.ceil(totalItems / this.itemsPerPage);
    }
    
    updatePagination() {
        const totalPages = this.getTotalPages();
        this.pageText.text = `${this.currentPage + 1}/${totalPages}`;
        
        // Show/hide arrows
        this.leftArrow.visible = this.currentPage > 0;
        this.rightArrow.visible = this.currentPage < totalPages - 1;
    }
    
    previousPage() {
        if (this.currentPage > 0) {
            this.currentPage--;
            this.populateCards();
        }
    }
    
    nextPage() {
        if (this.currentPage < this.getTotalPages() - 1) {
            this.currentPage++;
            this.populateCards();
        }
    }
    
    showGuide() {
        this.guideModal.visible = true;
        this.guidePage = 0;
        this.guideTitle.text = this.mode === 'items' ? 'ITEM GUIDE' : 'CHAR GUIDE';
        this.updateGuideContent();
    }
    
    updateGuideContent() {
        // Clear existing content
        this.guideContent.removeChildren();
        
        // Get items for guide page
        let allItems;
        if (this.mode === 'items') {
            allItems = CONFIG.shopItems.filter(item => 
                (item.minLevel || 1) <= this.game.gameData.getLevel()
            );
        } else {
            allItems = Object.entries(CONFIG.characters).map(([id, data]) => ({
                ...data,
                id
            }));
        }
        
        const itemsPerGuidePage = 4;
        const start = this.guidePage * itemsPerGuidePage;
        const end = start + itemsPerGuidePage;
        const pageItems = allItems.slice(start, end);
        
        // Display items
        pageItems.forEach((item, index) => {
            const itemContainer = new PIXI.Container();
            itemContainer.y = index * 90;
            
            // Item name
            const nameStyle = new PIXI.TextStyle({
                fontFamily: '"Press Start 2P", monospace',
                fontSize: 10,
                fill: 0xFFFFFF
            });
            
            const name = new PIXI.Text(item.name, nameStyle);
            name.anchor.set(0.5);
            name.x = 0;
            name.y = 0;
            itemContainer.addChild(name);
            
            // Description
            const descStyle = new PIXI.TextStyle({
                fontFamily: '"Press Start 2P", monospace',
                fontSize: 8,
                fill: 0xAAAAAA,
                wordWrap: true,
                wordWrapWidth: 300,
                align: 'center',
                lineHeight: 12
            });
            
            const description = this.getItemDescription(item);
            const desc = new PIXI.Text(description, descStyle);
            desc.anchor.set(0.5);
            desc.x = 0;
            desc.y = 25;
            itemContainer.addChild(desc);
            
            // Effect
            if (item.type === 'level') {
                const effectStyle = new PIXI.TextStyle({
                    fontFamily: '"Press Start 2P", monospace',
                    fontSize: 6,
                    fill: 0x00FF00
                });
                
                const level = this.game.gameData.getItemLevel(item.id);
                const effect = new PIXI.Text(`Level: ${level}/${item.maxLevel}`, effectStyle);
                effect.anchor.set(0.5);
                effect.x = 0;
                effect.y = 50;
                itemContainer.addChild(effect);
            }
            
            this.guideContent.addChild(itemContainer);
        });
        
        // Update guide pagination
        const totalGuidePages = Math.ceil(allItems.length / itemsPerGuidePage);
        this.guidePageText.text = `${this.guidePage + 1}/${totalGuidePages}`;
        this.guideLeftArrow.visible = this.guidePage > 0;
        this.guideRightArrow.visible = this.guidePage < totalGuidePages - 1;
    }
    
    getItemDescription(item) {
        const descriptions = {
            'glow': 'Makes your character glow with power',
            'buds': 'Adds floating orbs around you',
            'plusjump': 'Gives you an extra air jump',
            'fly': 'Temporary flight ability',
            'big': 'Increases your size',
            'gamble': 'Random bonus or penalty',
            'web': 'Shoot webs to catch ropes',
            'magnet': 'Attracts items to you',
            'shield': 'Protects from one fall',
            'combo': 'Increases combo multiplier',
            'slow': 'Slows down time briefly',
            'double': 'Doubles your score',
            'lucky': 'Increases item spawn rate',
            'revival': 'Revive once after falling',
            'rainbow': 'Rainbow trail effect',
            'fever': 'Extended fever mode duration',
            'bank': 'Earn interest on savings'
        };
        
        return descriptions[item.id] || item.description || 'Special ability';
    }
    
    previousGuidePage() {
        if (this.guidePage > 0) {
            this.guidePage--;
            this.updateGuideContent();
        }
    }
    
    nextGuidePage() {
        const allItems = this.mode === 'items' ? 
            CONFIG.shopItems.filter(item => (item.minLevel || 1) <= this.game.gameData.getLevel()) :
            Object.keys(CONFIG.characters);
        const totalPages = Math.ceil(allItems.length / 4);
        
        if (this.guidePage < totalPages - 1) {
            this.guidePage++;
            this.updateGuideContent();
        }
    }
    
    showPurchaseModal(item) {
        this.selectedItem = item;
        this.modalError.visible = false;
        
        this.modalItemName.text = item.name;
        
        // Show current balance
        this.modalBalance.text = `Balance: $${this.game.gameData.savings}`;
        
        let price = 0;
        let canAfford = true;
        
        if (item.type === 'level') {
            const level = this.game.gameData.getItemLevel(item.id);
            price = item.price * (level + 1);
            this.modalPrice.text = `$${price}`;
            this.modalDesc.text = `Level ${level} → ${level + 1}\n${this.getItemDescription(item)}`;
            canAfford = this.game.gameData.canAfford(price);
        } else if (item.price !== undefined) {
            price = item.price;
            this.modalPrice.text = `$${price}`;
            this.modalDesc.text = this.getItemDescription(item);
            canAfford = this.game.gameData.canAfford(price);
        } else {
            // Character - only show modal for unowned characters
            const owned = this.game.gameData.ownsCharacter(item.id);
            if (owned) {
                // This shouldn't happen as owned characters bypass the modal
                this.modal.visible = false;
                return;
            }
            this.modalPrice.text = `$${item.price}`;
            this.modalDesc.text = item.description || 'Unique character with special appearance';
            canAfford = this.game.gameData.canAfford(item.price);
        }
        
        // Update buy button color
        if (!canAfford && !this.game.gameData.ownsCharacter(item.id)) {
            this.buyBtn.children[0].clear();
            this.buyBtn.children[0].beginFill(0x7F8C8D);
            this.buyBtn.children[0].drawRoundedRect(-40, -20, 80, 40, 8);
            this.buyBtn.children[0].endFill();
        } else {
            this.buyBtn.children[0].clear();
            this.buyBtn.children[0].beginFill(0x27AE60);
            this.buyBtn.children[0].drawRoundedRect(-40, -20, 80, 40, 8);
            this.buyBtn.children[0].endFill();
        }
        
        this.modal.visible = true;
    }
    
    purchaseSelectedItem() {
        if (!this.selectedItem) return;
        
        const item = this.selectedItem;
        this.modalError.visible = false;
        
        if (item.id && CONFIG.shopItems.find(it => it.id === item.id)) {
            // Regular item
            const price = item.type === 'level' ? 
                item.price * (this.game.gameData.getItemLevel(item.id) + 1) : 
                item.price;
            
            if (this.game.gameData.purchase(item.id, price)) {
                this.refresh();
                this.modal.visible = false;
            } else {
                this.modalError.visible = true;
                this.modalError.text = 'Not enough money!';
            }
        } else {
            // Character - only purchase, no selection through modal
            if (this.game.gameData.purchaseCharacter(item.id, item.price)) {
                // Update player sprite immediately after purchase
                if (this.game.player) {
                    this.game.player.createSprite();
                }
                this.refresh();
                this.modal.visible = false;
            } else {
                this.modalError.visible = true;
                this.modalError.text = 'Not enough money!';
            }
        }
    }
    
    refresh() {
        this.moneyText.text = `$${this.game.gameData.savings}`;
        this.populateCards();
    }
    
    update(dt) {
        // Update any animations
    }
}

// Individual shop card
class ShopCard {
    constructor(shop, item, index, type) {
        this.shop = shop;
        this.item = item;
        this.index = index;
        this.type = type;
        
        // Position in 3x3 grid
        const col = index % 3;
        const row = Math.floor(index / 3);
        const cardWidth = 90;
        const cardHeight = 100;
        const spacing = 15;
        const totalWidth = (cardWidth * 3) + (spacing * 2);
        const marginX = (CONFIG.width - totalWidth) / 2;
        
        // Create container
        this.container = new PIXI.Container();
        this.container.x = marginX + col * (cardWidth + spacing) + cardWidth / 2;
        this.container.y = row * (cardHeight + spacing) + cardHeight / 2;
        
        this.createCard();
    }
    
    createCard() {
        // Determine card state
        const isOwned = this.type === 'char' ? 
            this.shop.game.gameData.ownsCharacter(this.item.id) :
            this.shop.game.gameData.isItemMaxed(this.item.id);
        
        const isSelected = this.type === 'char' && 
            this.shop.game.gameData.selectedCharacter === this.item.id;
        
        const canAfford = this.type === 'char' ?
            (isOwned || this.shop.game.gameData.canAfford(this.item.price)) :
            this.shop.game.gameData.canAfford(this.item.price);
        
        // Card background
        const bg = new PIXI.Graphics();
        const lineColor = isSelected ? 0x00FF00 : 
                         isOwned ? 0x00FFFF :
                         canAfford ? 0xFFFFFF : 0x666666;
        const fillAlpha = isOwned ? 0.2 : 0.1;
        
        bg.lineStyle(2, lineColor, 1);
        bg.beginFill(0x000000, fillAlpha);
        bg.drawRect(-45, -50, 90, 100);
        bg.endFill();
        
        // Make interactive
        bg.eventMode = 'static';
        bg.cursor = 'pointer';
        
        // Hover effect
        bg.on('pointerover', () => {
            bg.clear();
            bg.lineStyle(2, 0xFFFF00, 1);
            bg.beginFill(0xFFFFFF, 0.15);
            bg.drawRect(-45, -50, 90, 100);
            bg.endFill();
        });
        
        bg.on('pointerout', () => {
            bg.clear();
            bg.lineStyle(2, lineColor, 1);
            bg.beginFill(0x000000, fillAlpha);
            bg.drawRect(-45, -50, 90, 100);
            bg.endFill();
        });
        
        // Click handler
        bg.on('pointerdown', (e) => {
            e.stopPropagation();
            
            // If character is owned, select it directly without popup
            if (this.type === 'char' && this.shop.game.gameData.ownsCharacter(this.item.id)) {
                this.shop.game.gameData.selectCharacter(this.item.id);
                // Update player sprite immediately
                if (this.shop.game.player) {
                    this.shop.game.player.createSprite();
                }
                this.shop.refresh();
            } else {
                // Show purchase modal for unowned items
                this.shop.showPurchaseModal(this.item);
            }
        });
        
        this.container.addChild(bg);
        
        // Item name
        const nameStyle = new PIXI.TextStyle({
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 7,
            fill: 0xFFFFFF
        });
        
        const name = new PIXI.Text(this.item.name, nameStyle);
        name.anchor.set(0.5);
        name.y = -35;
        this.container.addChild(name);
        
        // Pixel art icon
        this.createPixelArt();
        
        // Level/Status
        if (this.type === 'item' && this.item.type === 'level') {
            const level = this.shop.game.gameData.getItemLevel(this.item.id);
            const maxLevel = this.item.maxLevel || 999;
            
            const levelStyle = new PIXI.TextStyle({
                fontFamily: '"Press Start 2P", monospace',
                fontSize: 6,
                fill: 0xFFFF00
            });
            
            const levelText = new PIXI.Text(`Lv ${level}/${maxLevel}`, levelStyle);
            levelText.anchor.set(0.5);
            levelText.y = 15;
            this.container.addChild(levelText);
        }
        
        // Price or status
        if (this.type === 'char' && isOwned) {
            // Show OWNED status for owned characters
            const ownedStyle = new PIXI.TextStyle({
                fontFamily: '"Press Start 2P", monospace',
                fontSize: 6,
                fill: 0x00FFFF
            });
            
            const ownedText = new PIXI.Text('OWNED', ownedStyle);
            ownedText.anchor.set(0.5);
            ownedText.y = 25;
            this.container.addChild(ownedText);
            
            // Show SELECTED if this is the selected character
            if (isSelected) {
                const selectedStyle = new PIXI.TextStyle({
                    fontFamily: '"Press Start 2P", monospace',
                    fontSize: 6,
                    fill: 0x00FF00
                });
                
                const selectedText = new PIXI.Text('SELECTED', selectedStyle);
                selectedText.anchor.set(0.5);
                selectedText.y = 35;
                this.container.addChild(selectedText);
            }
        } else {
            // Show price for unowned items or all shop items
            const price = this.type === 'item' && this.item.type === 'level' ?
                this.item.price * (this.shop.game.gameData.getItemLevel(this.item.id) + 1) :
                this.item.price;
            
            const priceStyle = new PIXI.TextStyle({
                fontFamily: '"Press Start 2P", monospace',
                fontSize: 7,
                fill: 0xFFD700
            });
            
            const priceText = new PIXI.Text(`$${price}`, priceStyle);
            priceText.anchor.set(0.5);
            priceText.y = 35;
            this.container.addChild(priceText);
        }
    }
    
    createPixelArt() {
        const pixelArt = new PIXI.Graphics();
        const pixelSize = 2;
        
        // Pixel art patterns for items and characters
        const patterns = {
            // Items
            'glow': [
                [0,1,1,1,0],
                [1,0,0,0,1],
                [1,0,1,0,1],
                [1,0,0,0,1],
                [0,1,1,1,0]
            ],
            'buds': [
                [0,1,0,1,0],
                [1,0,0,0,1],
                [0,0,1,0,0],
                [1,0,0,0,1],
                [0,1,0,1,0]
            ],
            'plusjump': [
                [0,0,1,0,0],
                [0,1,1,1,0],
                [0,0,1,0,0],
                [0,1,0,1,0],
                [1,0,0,0,1]
            ],
            // Characters
            'robot': [
                [0,1,1,1,0],
                [1,0,1,0,1],
                [1,1,1,1,1],
                [0,1,0,1,0],
                [1,0,0,0,1]
            ],
            'ninja': [
                [0,1,1,1,0],
                [1,0,0,0,1],
                [1,1,0,1,1],
                [0,1,1,1,0],
                [1,0,0,0,1]
            ],
            'pirate': [
                [1,1,1,1,1],
                [1,0,1,0,1],
                [1,1,1,1,1],
                [0,1,0,1,0],
                [1,0,0,0,1]
            ],
            'wizard': [
                [0,0,1,0,0],
                [0,1,1,1,0],
                [1,0,1,0,1],
                [1,1,1,1,1],
                [0,1,0,1,0]
            ],
            'knight': [
                [1,0,1,0,1],
                [1,1,1,1,1],
                [0,1,1,1,0],
                [1,1,1,1,1],
                [1,0,0,0,1]
            ],
            'default': [
                [0,1,1,1,0],
                [1,1,1,1,1],
                [1,1,1,1,1],
                [1,1,1,1,1],
                [0,1,1,1,0]
            ]
        };
        
        const pattern = patterns[this.item.id] || patterns['default'];
        const color = this.item.color || 0xFFFFFF;
        
        pixelArt.beginFill(color);
        for (let y = 0; y < pattern.length; y++) {
            for (let x = 0; x < pattern[y].length; x++) {
                if (pattern[y][x]) {
                    pixelArt.drawRect(
                        (x - 2.5) * pixelSize * 3,
                        (y - 2.5) * pixelSize * 3 - 5,
                        pixelSize * 2,
                        pixelSize * 2
                    );
                }
            }
        }
        pixelArt.endFill();
        
        this.container.addChild(pixelArt);
    }
    
    destroy() {
        if (this.container.parent) {
            this.container.parent.removeChild(this.container);
        }
        this.container.destroy({ children: true });
    }
}