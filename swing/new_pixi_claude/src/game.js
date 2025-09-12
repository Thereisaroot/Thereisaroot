// Main game class
class Game {
    constructor(app, gameData) {
        this.app = app;
        this.gameData = gameData;
        
        // Game state
        this.state = 'intro'; // intro, playing, gameover, shop
        this.score = 0;
        this.combo = 0;
        this.simTime = 0;
        this.shakeAmount = 0;
        this.shakeTimer = 0;
        
        // Containers for different layers
        this.gameContainer = new PIXI.Container();
        this.uiContainer = new PIXI.Container();
        this.shopContainer = new PIXI.Container();
        
        // Game objects
        this.player = null;
        this.ropes = [];
        this.items = [];
        this.particles = [];
        this.camera = { x: 0, y: 0 };
        this.ground = null;
        this.isExploding = false;
        this.explosionTimer = 0;
        
        // UI elements
        this.ui = null;
        this.shop = null;
        
        // Input state
        this.input = {
            pressed: false,
            x: 0,
            y: 0,
            dragStart: null
        };
        
        this.setupContainers();
        this.setupInput();
    }
    
    setupContainers() {
        this.app.stage.addChild(this.gameContainer);
        this.app.stage.addChild(this.shopContainer);
        this.app.stage.addChild(this.uiContainer);
        
        // Initially hide shop
        this.shopContainer.visible = false;
    }
    
    setupInput() {
        // Make stage interactive
        this.app.stage.eventMode = 'static';
        this.app.stage.hitArea = this.app.screen;
        
        // Unified pointer events (mouse + touch)
        this.app.stage.on('pointerdown', (e) => {
            this.input.pressed = true;
            this.input.x = e.global.x;
            this.input.y = e.global.y;
            this.input.dragStart = { x: e.global.x, y: e.global.y };
            
            this.handlePointerDown(e);
        });
        
        this.app.stage.on('pointermove', (e) => {
            this.input.x = e.global.x;
            this.input.y = e.global.y;
            
            this.handlePointerMove(e);
        });
        
        this.app.stage.on('pointerup', (e) => {
            this.input.pressed = false;
            this.input.dragStart = null;
            
            this.handlePointerUp(e);
        });
        
        // Keyboard input
        window.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });
        
        window.addEventListener('keyup', (e) => {
            this.handleKeyUp(e);
        });
    }
    
    async init() {
        // Create ground
        this.createGround();
        
        // Create player
        this.player = new Player(this);
        this.gameContainer.addChild(this.player.container);
        
        // Create UI
        this.ui = new UI(this);
        this.uiContainer.addChild(this.ui.container);
        
        // Create shop
        this.shop = new Shop(this);
        this.shopContainer.addChild(this.shop.container);
        
        // Create particle system
        this.particleSystem = new ParticleSystem(this);
        this.gameContainer.addChild(this.particleSystem.container);
        
        // Start intro state
        this.setState('intro');
        
        // Start game loop
        this.app.ticker.add((delta) => {
            this.update(delta / 60); // Convert to seconds
        });
    }
    
    setState(newState) {
        const oldState = this.state;
        this.state = newState;
        
        // Handle state transitions
        switch (newState) {
            case 'intro':
                this.ui.showIntro();
                this.gameContainer.visible = false;
                this.shopContainer.visible = false;
                break;
                
            case 'playing':
                this.resetGame();
                this.ui.showGame();
                this.gameContainer.visible = true;
                this.shopContainer.visible = false;
                break;
                
            case 'gameover':
                this.ui.showGameOver(this.score);
                this.gameContainer.visible = true;
                this.shopContainer.visible = false;
                break;
                
            case 'shop':
                this.shop.refresh();
                this.ui.hideAll();
                this.gameContainer.visible = false;
                this.shopContainer.visible = true;
                break;
        }
    }
    
    resetGame() {
        // Clear existing objects
        this.ropes.forEach(rope => rope.destroy());
        this.ropes = [];
        
        this.items.forEach(item => item.destroy());
        this.items = [];
        
        this.particles.forEach(particle => {
            if (particle.parent) {
                particle.parent.removeChild(particle);
            }
            particle.destroy();
        });
        this.particles = [];
        
        // Reset game state
        this.score = 0;
        this.combo = 0;
        this.simTime = 0;
        this.camera.x = 0;
        this.isExploding = false;
        this.explosionTimer = 0;
        this.shakeAmount = 0;
        this.shakeTimer = 0;
        this.gameContainer.y = 0;
        
        // Reset player and update sprite for selected character
        this.player.container.visible = true;
        this.player.reset();
        this.player.createSprite(); // Recreate sprite with selected character
        
        // Spawn initial rope
        this.spawnInitialRope();
        
        // Attach player to the initial rope
        if (this.ropes.length > 0) {
            this.player.attachToRope(this.ropes[0]);
            // Set jump cooldown to prevent immediate jump
            this.player.jumpCooldown = 0.5;
        }
        
        // Ensure ropes are buffered
        this.ensureRopesBuffered();
    }
    
    spawnInitialRope() {
        const rope = new Rope(this, {
            anchorX: 200,
            anchorY: CONFIG.height / 2 - 100,
            length: 150,
            amplitude: 0.5,
            omega: 2,
            phase: 0
        });
        
        this.ropes.push(rope);
        this.gameContainer.addChild(rope.container);
    }
    
    ensureRopesBuffered() {
        // Get rightmost rope
        let rightmostX = 0;
        if (this.ropes.length > 0) {
            rightmostX = Math.max(...this.ropes.map(r => r.anchorX));
        }
        
        // Buffer distance
        const bufferDistance = CONFIG.width * 2;
        const targetX = this.camera.x + bufferDistance;
        
        // Spawn ropes until we reach target
        while (rightmostX < targetX) {
            const spacing = CONFIG.ropeSpacing.min + 
                          Math.random() * (CONFIG.ropeSpacing.max - CONFIG.ropeSpacing.min);
            
            const nextX = rightmostX + spacing;
            // Ensure rope anchor is at least 50 pixels above ground considering rope length
            const groundY = CONFIG.height - 20;
            const ropeLength = CONFIG.ropeLength.min + 
                             Math.random() * (CONFIG.ropeLength.max - CONFIG.ropeLength.min);
            // Calculate max Y position so rope tip stays 50px above ground
            const maxY = groundY - ropeLength - 50;
            const minY = CONFIG.height * 0.2;
            const nextY = Math.min(maxY, minY + Math.random() * (maxY - minY));
            
            const rope = new Rope(this, {
                anchorX: nextX,
                anchorY: nextY,
                length: ropeLength,
                amplitude: CONFIG.ropeAmplitude.min + 
                          Math.random() * (CONFIG.ropeAmplitude.max - CONFIG.ropeAmplitude.min),
                omega: CONFIG.ropeOmega.min + 
                      Math.random() * (CONFIG.ropeOmega.max - CONFIG.ropeOmega.min),
                phase: Math.random() * Math.PI * 2
            });
            
            this.ropes.push(rope);
            this.gameContainer.addChild(rope.container);
            
            // Chance to spawn item
            if (Math.random() < 0.3 && this.gameData.getLevel() >= 3) {
                const item = new Item(this, {
                    x: nextX - spacing / 2,
                    y: nextY,
                    type: this.getRandomItemType()
                });
                
                this.items.push(item);
                this.gameContainer.addChild(item.container);
            }
            
            rightmostX = nextX;
        }
    }
    
    getRandomItemType() {
        const types = ['extraJump', 'wideCatch', 'bigSize'];
        if (this.gameData.getLevel() >= 5) {
            types.push('star');
        }
        return types[Math.floor(Math.random() * types.length)];
    }
    
    cleanupObjects() {
        // Remove ropes that are too far behind
        const cleanupX = this.camera.x - CONFIG.width;
        
        this.ropes = this.ropes.filter(rope => {
            if (rope.anchorX < cleanupX) {
                rope.destroy();
                return false;
            }
            return true;
        });
        
        this.items = this.items.filter(item => {
            if (item.x < cleanupX || item.collected) {
                item.destroy();
                return false;
            }
            return true;
        });
        
        this.particles = this.particles.filter(particle => {
            if (particle.lifetime <= 0) {
                particle.destroy();
                return false;
            }
            return true;
        });
    }
    
    updateCamera(dt) {
        // Follow player with smoothing
        const targetX = this.player.x - CONFIG.cameraOffset;
        this.camera.x += (targetX - this.camera.x) * CONFIG.cameraSmooth;
        
        // Update game container position
        this.gameContainer.x = -this.camera.x;
        
        // Update ground to follow camera
        this.updateGround();
    }
    
    createGround() {
        // Create ground visual container
        this.ground = new PIXI.Graphics();
        this.groundY = CONFIG.height - 20;
        this.gameContainer.addChild(this.ground);
        this.updateGround();
    }
    
    updateGround() {
        if (!this.ground) return;
        
        // Clear and redraw ground based on camera position
        this.ground.clear();
        this.ground.lineStyle(3, 0xFF0000, 1);
        this.ground.beginFill(0x8B4513, 0.8);
        
        // Draw ground covering visible area plus buffer
        const startX = this.camera.x - CONFIG.width;
        const endX = this.camera.x + CONFIG.width * 2;
        this.ground.drawRect(startX, this.groundY, endX - startX, 20);
        
        // Add danger stripes
        this.ground.lineStyle(2, 0xFFFF00, 0.8);
        const stripeStart = Math.floor(startX / 20) * 20;
        for (let i = stripeStart; i < endX; i += 20) {
            this.ground.moveTo(i, this.groundY);
            this.ground.lineTo(i + 10, this.groundY + 20);
        }
        
        this.ground.endFill();
    }
    
    checkCatch() {
        // Only check for catch if player is free and cooldown has expired
        if (this.player.mode === 'free' && this.player.catchCooldown <= 0) {
            const catchRadius = this.player.catchRadius || CONFIG.catchRadius;
            
            for (const rope of this.ropes) {
                const tip = rope.getTip(this.simTime);
                const dx = this.player.x - tip.x;
                const dy = this.player.y - tip.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < catchRadius) {
                    // Check if it's the same rope or going backwards
                    const isSameRope = rope === this.player.previousRope;
                    const isGoingBackward = this.player.previousRope && 
                                           rope.anchorX <= this.player.previousRope.anchorX;
                    
                    this.player.attachToRope(rope);
                    
                    // Only add score and combo if not same rope and going forward
                    if (!this.player.isFirstCatch && !isSameRope && !isGoingBackward) {
                        // Add score for successful rope catch
                        this.addScore();
                        
                        // Handle combo when catching rope (if no air jumps used)
                        if (this.player.usedAirJumps === 0) {
                            this.combo++;
                            if (this.combo > 1) {
                                this.particleSystem.createComboText(
                                    this.player.x, 
                                    this.player.y - 50, 
                                    `COMBO x${this.combo}`
                                );
                            }
                        } else {
                            this.combo = 0;
                        }
                    } else if (isSameRope || isGoingBackward) {
                        // Reset combo if catching same rope or going backward
                        this.combo = 0;
                    } else {
                        // First catch - no combo
                        this.player.isFirstCatch = false;
                    }
                    
                    break;
                }
            }
        }
    }
    
    checkItemCollection() {
        const collectRadius = 50;
        
        for (const item of this.items) {
            if (!item.collected) {
                const dx = this.player.x - item.x;
                const dy = this.player.y - item.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < collectRadius) {
                    item.collect();
                    this.handleItemEffect(item.type);
                }
            }
        }
    }
    
    handleItemEffect(type) {
        switch (type) {
            case 'extraJump':
                this.player.airJumpsLeft++;
                this.particleSystem.createBurst(this.player.x, this.player.y, 0x00FF00);
                break;
                
            case 'wideCatch':
                this.player.catchRadius = CONFIG.catchRadiusExpanded;
                setTimeout(() => {
                    this.player.catchRadius = CONFIG.catchRadius;
                }, 5000);
                this.particleSystem.createBurst(this.player.x, this.player.y, 0x00FFFF);
                break;
                
            case 'bigSize':
                this.player.sizeMultiplier = 1.5;
                setTimeout(() => {
                    this.player.sizeMultiplier = 1.0;
                }, 5000);
                this.particleSystem.createBurst(this.player.x, this.player.y, 0xFF00FF);
                break;
                
            case 'star':
                this.startStarMode();
                break;
        }
    }
    
    startStarMode() {
        // TODO: Implement star/fever mode
        this.particleSystem.createStarBurst(this.player.x, this.player.y);
    }
    
    addScore() {
        let points = 3 - Math.min(2, this.player.usedAirJumps);
        
        // Double points in star mode
        if (this.starMode) {
            points *= 2;
        }
        
        this.score += points;
        
        // Combo logic moved to checkCatch method
        
        this.ui.updateScore(this.score);
    }
    
    endStarMode() {
        this.starMode = false;
        this.starModeTimer = 0;
        
        if (this.starOverlay) {
            this.starOverlay.clear();
        }
        
        // Remove special star mode ropes if they still exist
        this.starModeRopes.forEach(rope => {
            const index = this.ropes.indexOf(rope);
            if (index !== -1) {
                this.ropes.splice(index, 1);
                rope.destroy();
            }
        });
        this.starModeRopes = [];
    }
    
    checkGameOver() {
        // Check if player hits the ground
        const groundY = CONFIG.height - 20;
        
        if (this.player.y >= groundY && !this.isExploding) {
            this.startExplosion();
        } else if (this.player.x < this.camera.x - 100 && !this.isExploding) {
            this.startExplosion();
        }
    }
    
    startExplosion() {
        if (this.isExploding) return;
        
        this.isExploding = true;
        this.explosionTimer = 2.0; // 2 seconds
        
        // Hide player
        this.player.container.visible = false;
        
        // Create explosion effect at player position
        this.createExplosionEffect(this.player.x, this.player.y);
    }
    
    createExplosionEffect(x, y) {
        // Use particle system for explosion
        this.particleSystem.createExplosionBurst(x, y);
        
        // Create shockwave effect
        const shockwave = new PIXI.Graphics();
        shockwave.lineStyle(3, 0xFFFFFF, 0.8);
        shockwave.drawCircle(0, 0, 10);
        shockwave.x = x;
        shockwave.y = y;
        shockwave.scale.set(0.1);
        shockwave.alpha = 1;
        shockwave.lifetime = 0.5;
        shockwave.isShockwave = true;
        
        this.particles.push(shockwave);
        this.gameContainer.addChild(shockwave);
        
        // Screen shake effect
        this.shakeAmount = 20;
        this.shakeTimer = 0.5;
    }
    
    gameOver() {
        this.setState('gameover');
        
        // Save score and earnings
        const earned = this.gameData.addScore(this.score);
        
        // Show game over UI with earnings
        this.ui.showEarnings(earned);
    }
    
    update(dt) {
        if (this.state === 'playing') {
            this.simTime += dt;
            
            // Handle explosion timer
            if (this.isExploding) {
                this.explosionTimer -= dt;
                
                // Update shockwave
                this.particles.forEach(particle => {
                    if (particle.isShockwave) {
                        particle.scale.set(particle.scale.x + dt * 10);
                        particle.alpha -= dt * 2;
                        particle.lifetime -= dt;
                    }
                });
                
                // Screen shake
                if (this.shakeTimer > 0) {
                    this.shakeTimer -= dt;
                    this.shakeAmount *= 0.95;
                    this.gameContainer.x = -this.camera.x + (Math.random() - 0.5) * this.shakeAmount;
                    this.gameContainer.y = (Math.random() - 0.5) * this.shakeAmount;
                } else {
                    this.gameContainer.y = 0;
                }
                
                // Update particle system even during explosion
                this.particleSystem.update(dt);
                
                if (this.explosionTimer <= 0) {
                    this.gameOver();
                }
                return; // Don't update other game logic during explosion
            }
            
            // Update game objects
            this.player.update(dt);
            
            // Update star mode
            if (this.starMode) {
                this.starModeTimer -= dt;
                
                // Update star overlay
                if (this.starOverlay) {
                    this.starOverlay.clear();
                    this.starOverlay.beginFill(0xFFFF00, 0.1 * (this.starModeTimer / CONFIG.starDuration));
                    this.starOverlay.drawRect(0, 0, CONFIG.width, CONFIG.height);
                    this.starOverlay.endFill();
                }
                
                if (this.starModeTimer <= 0) {
                    this.endStarMode();
                }
            }
            
            this.ropes.forEach(rope => rope.update(dt));
            this.items.forEach(item => item.update(dt));
            
            // Update particle system
            this.particleSystem.update(dt);
            
            // Game logic
            this.checkCatch();
            this.checkItemCollection();
            this.ensureRopesBuffered();
            this.cleanupObjects();
            this.updateCamera(dt);
            this.checkGameOver();
        } else if (this.state === 'shop') {
            this.shop.update(dt);
        }
        
        // Always update UI
        this.ui.update(dt);
    }
    
    handlePointerDown(e) {
        if (this.state === 'playing') {
            // Handled by player
        }
    }
    
    handlePointerMove(e) {
        // Handled by specific components
    }
    
    handlePointerUp(e) {
        // Only handle jump in playing state
        if (this.state === 'playing') {
            this.player.jump();
        }
        // All other states handle their own clicks through buttons
    }
    
    handleKeyDown(e) {
        if (e.code === 'Space') {
            if (this.state === 'intro') {
                this.setState('playing');
            } else if (this.state === 'playing') {
                this.player.jump();
            } else if (this.state === 'gameover') {
                if (e.shiftKey) {
                    this.setState('shop');
                } else {
                    this.setState('playing');
                }
            }
        } else if (e.code === 'Escape') {
            if (this.state === 'shop') {
                this.setState('intro');
            }
        }
    }
    
    handleKeyUp(e) {
        // Handle key up if needed
    }
}