// UI System
class UI {
    constructor(game) {
        this.game = game;
        this.container = new PIXI.Container();
        
        // UI elements
        this.introScreen = null;
        this.gameUI = null;
        this.gameOverScreen = null;
        
        this.createUI();
    }
    
    createUI() {
        // Create intro screen
        this.createIntroScreen();
        
        // Create game UI
        this.createGameUI();
        
        // Create game over screen
        this.createGameOverScreen();
    }
    
    createIntroScreen() {
        this.introScreen = new PIXI.Container();
        
        // Background
        const bg = new PIXI.Graphics();
        bg.beginFill(0x000000, 0.7);
        bg.drawRect(0, 0, CONFIG.width, CONFIG.height);
        bg.endFill();
        this.introScreen.addChild(bg);
        
        // Title
        const titleStyle = new PIXI.TextStyle({
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 28,
            fill: 0xFFFFFF,
            stroke: 0x000000,
            strokeThickness: 3,
            align: 'center'
        });
        
        const title = new PIXI.Text('WEB SWING', titleStyle);
        title.anchor.set(0.5);
        title.x = CONFIG.width / 2;
        title.y = CONFIG.height * 0.25;
        this.introScreen.addChild(title);
        
        // Press Start text with blinking effect
        const pressStartStyle = new PIXI.TextStyle({
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 12,
            fill: 0xFFFFFF,
            align: 'center'
        });
        
        this.pressStartText = new PIXI.Text('PRESS START', pressStartStyle);
        this.pressStartText.anchor.set(0.5);
        this.pressStartText.x = CONFIG.width / 2;
        this.pressStartText.y = CONFIG.height * 0.35;
        this.introScreen.addChild(this.pressStartText);
        
        // Blinking animation
        this.blinkTimer = 0;
        
        // Start button
        const startButton = this.createButton('START GAME', CONFIG.width / 2, CONFIG.height * 0.5, () => {
            console.log('Start button clicked');
            this.game.setState('playing');
        });
        this.introScreen.addChild(startButton);
        
        // Shop button
        if (this.game.gameData.getLevel() >= 2) {
            const shopButton = this.createButton('SHOP', CONFIG.width / 2, CONFIG.height * 0.6, () => {
                console.log('Shop button clicked');
                this.game.setState('shop');
            });
            this.introScreen.addChild(shopButton);
        }
        
        // Instructions
        const instructStyle = new PIXI.TextStyle({
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 8,
            fill: 0xFFFFFF,
            align: 'center',
            wordWrap: true,
            wordWrapWidth: CONFIG.width * 0.8,
            lineHeight: 16
        });
        
        const instructions = new PIXI.Text(
            'Click or tap to jump and catch ropes!\nCollect items and earn points!',
            instructStyle
        );
        instructions.anchor.set(0.5);
        instructions.x = CONFIG.width / 2;
        instructions.y = CONFIG.height * 0.8;
        this.introScreen.addChild(instructions);
        
        this.container.addChild(this.introScreen);
    }
    
    createGameUI() {
        this.gameUI = new PIXI.Container();
        
        // Score text
        const scoreStyle = new PIXI.TextStyle({
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 14,
            fill: 0xFFFFFF,
            stroke: 0x000000,
            strokeThickness: 2
        });
        
        this.scoreText = new PIXI.Text('Score: 0', scoreStyle);
        this.scoreText.x = 10;
        this.scoreText.y = 10;
        this.gameUI.addChild(this.scoreText);
        
        // Best score
        const bestStyle = new PIXI.TextStyle({
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 10,
            fill: 0xFFFF00,
            stroke: 0x000000,
            strokeThickness: 2
        });
        
        this.bestText = new PIXI.Text(`Best: ${this.game.gameData.bestScore}`, bestStyle);
        this.bestText.x = 10;
        this.bestText.y = 35;
        this.gameUI.addChild(this.bestText);
        
        // Level indicator
        const levelStyle = new PIXI.TextStyle({
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 10,
            fill: 0x00FF00,
            stroke: 0x000000,
            strokeThickness: 2
        });
        
        this.levelText = new PIXI.Text(`LV ${this.game.gameData.getLevel()}`, levelStyle);
        this.levelText.x = 10;
        this.levelText.y = 55;
        this.gameUI.addChild(this.levelText);
        
        // Money indicator
        const moneyStyle = new PIXI.TextStyle({
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 10,
            fill: 0xFFD700,
            stroke: 0x000000,
            strokeThickness: 2
        });
        
        this.moneyText = new PIXI.Text(`$${this.game.gameData.savings}`, moneyStyle);
        this.moneyText.x = CONFIG.width - 120;
        this.moneyText.y = 20;
        this.gameUI.addChild(this.moneyText);
        
        // Catch cooldown indicator
        const cooldownStyle = new PIXI.TextStyle({
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 8,
            fill: 0xFF0000,
            stroke: 0x000000,
            strokeThickness: 2
        });
        
        this.cooldownText = new PIXI.Text('', cooldownStyle);
        this.cooldownText.anchor.set(0.5);
        this.cooldownText.x = CONFIG.width / 2;
        this.cooldownText.y = CONFIG.height - 30;
        this.cooldownText.visible = false;
        this.gameUI.addChild(this.cooldownText);
        
        this.gameUI.visible = false;
        this.container.addChild(this.gameUI);
    }
    
    createGameOverScreen() {
        this.gameOverScreen = new PIXI.Container();
        
        // Background - make it non-interactive to prevent blocking
        const bg = new PIXI.Graphics();
        bg.beginFill(0x000000, 0.8);
        bg.drawRect(0, 0, CONFIG.width, CONFIG.height);
        bg.endFill();
        // Don't make background interactive at all
        this.gameOverScreen.addChild(bg);
        
        // Game over text - use pixel font
        const gameOverStyle = new PIXI.TextStyle({
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 24,
            fill: 0xFF0000,
            stroke: 0x000000,
            strokeThickness: 3
        });
        
        const gameOverText = new PIXI.Text('GAME OVER', gameOverStyle);
        gameOverText.anchor.set(0.5);
        gameOverText.x = CONFIG.width / 2;
        gameOverText.y = CONFIG.height * 0.2;
        this.gameOverScreen.addChild(gameOverText);
        
        // Score display
        const scoreStyle = new PIXI.TextStyle({
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 16,
            fill: 0xFFFFFF,
            stroke: 0x000000,
            strokeThickness: 2
        });
        
        this.finalScoreText = new PIXI.Text('Score: 0', scoreStyle);
        this.finalScoreText.anchor.set(0.5);
        this.finalScoreText.x = CONFIG.width / 2;
        this.finalScoreText.y = CONFIG.height * 0.35;
        this.gameOverScreen.addChild(this.finalScoreText);
        
        // Earnings display
        const earningsStyle = new PIXI.TextStyle({
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 12,
            fill: 0xFFD700,
            stroke: 0x000000,
            strokeThickness: 2
        });
        
        this.earningsText = new PIXI.Text('Earned: $0', earningsStyle);
        this.earningsText.anchor.set(0.5);
        this.earningsText.x = CONFIG.width / 2;
        this.earningsText.y = CONFIG.height * 0.45;
        this.gameOverScreen.addChild(this.earningsText);
        
        // Store references to buttons for later removal
        this.gameOverButtons = [];
        this.countdownInterval = null;
        
        this.gameOverScreen.visible = false;
        this.container.addChild(this.gameOverScreen);
    }
    
    createButton(text, x, y, onClick) {
        const button = new PIXI.Container();
        button.eventMode = 'static';
        button.cursor = 'pointer';
        
        // Button background - transparent with white border (retro style)
        const bg = new PIXI.Graphics();
        bg.lineStyle(2, 0xFFFFFF, 1);
        bg.beginFill(0x000000, 0.3);
        bg.drawRect(-60, -20, 120, 40);
        bg.endFill();
        
        // Store original style for restoration
        const drawNormal = () => {
            bg.clear();
            bg.lineStyle(2, 0xFFFFFF, 1);
            bg.beginFill(0x000000, 0.3);
            bg.drawRect(-60, -20, 120, 40);
            bg.endFill();
        };
        
        const drawHover = () => {
            bg.clear();
            bg.lineStyle(2, 0xFFFF00, 1); // Yellow on hover
            bg.beginFill(0xFFFFFF, 0.1);
            bg.drawRect(-60, -20, 120, 40);
            bg.endFill();
        };
        
        // Set up events on the container, not the graphics
        button.on('pointerover', drawHover);
        button.on('pointerout', drawNormal);
        button.on('pointerdown', (e) => {
            e.stopPropagation();
            onClick();
        });
        
        button.addChild(bg);
        
        // Button text - use retro font
        const style = new PIXI.TextStyle({
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 10,
            fill: 0xFFFFFF
        });
        
        const label = new PIXI.Text(text, style);
        label.anchor.set(0.5);
        button.addChild(label);
        
        button.x = x;
        button.y = y;
        
        return button;
    }
    
    showIntro() {
        this.hideAll();
        this.introScreen.visible = true;
    }
    
    showGame() {
        this.hideAll();
        this.gameUI.visible = true;
    }
    
    showGameOver(score) {
        this.hideAll();
        
        // Remove old buttons
        this.gameOverButtons.forEach(btn => btn.destroy());
        this.gameOverButtons = [];
        
        // Create retry countdown text
        const countdownStyle = new PIXI.TextStyle({
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 8,
            fill: 0xFFFF00,
            stroke: 0x000000,
            strokeThickness: 2
        });
        
        this.retryCountdown = new PIXI.Text('Wait...', countdownStyle);
        this.retryCountdown.anchor.set(0.5);
        this.retryCountdown.x = CONFIG.width / 2;
        this.retryCountdown.y = CONFIG.height * 0.55;
        this.gameOverScreen.addChild(this.retryCountdown);
        
        // Start countdown timer
        let countdown = 3;
        this.retryCountdown.text = `Wait ${countdown}s`;
        
        const countdownInterval = setInterval(() => {
            countdown--;
            if (countdown > 0) {
                this.retryCountdown.text = `Wait ${countdown}s`;
            } else {
                clearInterval(countdownInterval);
                
                // Remove countdown text
                this.retryCountdown.destroy();
                
                // Create retry button after countdown
                const retryButton = this.createButton('RETRY', CONFIG.width / 2, CONFIG.height * 0.55, () => {
                    console.log('Retry button clicked');
                    this.game.setState('playing');
                });
                this.gameOverScreen.addChild(retryButton);
                this.gameOverButtons.push(retryButton);
            }
        }, 1000);
        
        // Create shop and menu buttons immediately (no wait)
        if (this.game.gameData.getLevel() >= 2) {
            const shopButton = this.createButton('SHOP', CONFIG.width / 2 - 70, CONFIG.height * 0.65, () => {
                console.log('Shop button from gameover clicked');
                this.game.setState('shop');
            });
            this.gameOverScreen.addChild(shopButton);
            this.gameOverButtons.push(shopButton);
            
            const menuButton = this.createButton('MENU', CONFIG.width / 2 + 70, CONFIG.height * 0.65, () => {
                console.log('Menu button from gameover clicked');
                this.game.setState('intro');
            });
            this.gameOverScreen.addChild(menuButton);
            this.gameOverButtons.push(menuButton);
        } else {
            const menuButton = this.createButton('MENU', CONFIG.width / 2, CONFIG.height * 0.65, () => {
                console.log('Menu button from gameover clicked');
                this.game.setState('intro');
            });
            this.gameOverScreen.addChild(menuButton);
            this.gameOverButtons.push(menuButton);
        }
        
        this.gameOverScreen.visible = true;
        this.finalScoreText.text = `Score: ${score}`;
    }
    
    showEarnings(earned) {
        this.earningsText.text = `Earned: $${earned}`;
    }
    
    hideAll() {
        this.introScreen.visible = false;
        this.gameUI.visible = false;
        this.gameOverScreen.visible = false;
        
        // Clear any running countdown
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
    }
    
    updateScore(score) {
        this.scoreText.text = `Score: ${score}`;
    }
    
    update(dt) {
        // Update blinking animation for Press Start text
        if (this.pressStartText && this.pressStartText.visible !== undefined) {
            this.blinkTimer += dt;
            // Toggle visibility every 0.5 seconds
            this.pressStartText.visible = Math.floor(this.blinkTimer * 2) % 2 === 0;
        }
        
        // Update cooldown display
        if (this.game.state === 'playing' && this.game.player) {
            if (this.game.player.jumpCooldown > 0) {
                this.cooldownText.visible = true;
                this.cooldownText.text = `Can't jump: ${this.game.player.jumpCooldown.toFixed(1)}s`;
            } else if (this.game.player.catchCooldown > 0) {
                this.cooldownText.visible = true;
                this.cooldownText.text = `Can't catch: ${this.game.player.catchCooldown.toFixed(1)}s`;
            } else {
                this.cooldownText.visible = false;
            }
        }
    }
}