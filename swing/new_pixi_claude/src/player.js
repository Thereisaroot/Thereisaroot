// Player class
class Player {
    constructor(game) {
        this.game = game;
        
        // Position and physics
        this.x = 100;
        this.y = CONFIG.height / 2;
        this.vx = 0;
        this.vy = 0;
        
        // State
        this.mode = 'free'; // 'free' or 'attached'
        this.attachedRope = null;
        this.previousRope = null; // Track last rope for scoring
        this.angle = 0;
        this.rotation = 0;
        
        // Jump mechanics
        this.airJumpsLeft = 0;
        this.maxAirJumps = 1;
        this.usedAirJumps = 0;
        
        // Rope catch cooldown
        this.catchCooldown = 0;
        this.catchCooldownDuration = 0.5; // 0.5 seconds after detaching
        
        // Jump cooldown (prevent jumping right after game start)
        this.jumpCooldown = 0;
        
        // Track if this is the first detach/catch (for scoring and effects)
        this.isFirstDetach = true;
        this.isFirstCatch = true;
        
        // Visual
        this.sizeMultiplier = 1.0;
        this.catchRadius = CONFIG.catchRadius;
        
        // Create container
        this.container = new PIXI.Container();
        this.createSprite();
        
        // Shop items effects
        this.applyShopEffects();
    }
    
    createSprite() {
        // Clean up existing sprites properly
        if (this.sprite) {
            this.container.removeChild(this.sprite);
            this.sprite.destroy();
            this.sprite = null;
        }
        if (this.glowSprite) {
            this.container.removeChild(this.glowSprite);
            this.glowSprite.destroy();
            this.glowSprite = null;
        }
        
        // Clean up buds
        if (this.buds && this.buds.length > 0) {
            this.buds.forEach(bud => {
                this.container.removeChild(bud);
                bud.destroy();
            });
            this.buds = [];
        }
        
        // Create base shape based on character
        const character = this.game.gameData.selectedCharacter || 'default';
        
        // Create new sprite
        this.sprite = new PIXI.Graphics();
        
        if (character === 'default') {
            // Draw polygon based on level
            this.drawPolygon();
        } else {
            // Draw pixel character
            this.drawPixelCharacter(character);
        }
        
        this.container.addChild(this.sprite);
        
        // Add glow effect if purchased
        if (this.game.gameData && this.game.gameData.getItemLevel('glow') > 0) {
            this.addGlowEffect();
        }
        
        // Add buds if purchased
        if (this.game.gameData && this.game.gameData.getItemLevel('buds') > 0) {
            this.addBuds();
        }
    }
    
    drawPolygon() {
        const level = this.game.gameData.getLevel();
        const sides = Math.min(3 + Math.floor((level - 1) / 3), 8);
        const radius = 20 * this.sizeMultiplier;
        
        this.sprite.clear();
        this.sprite.beginFill(CONFIG.colors.player);
        
        const points = [];
        for (let i = 0; i < sides; i++) {
            const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            points.push(x, y);
        }
        
        this.sprite.drawPolygon(points);
        this.sprite.endFill();
    }
    
    drawPixelCharacter(character) {
        const charData = CONFIG.characters[character];
        const pixelSize = 2 * this.sizeMultiplier;
        
        this.sprite.clear();
        
        // Character-specific pixel art patterns
        const patterns = {
            robot: [
                [0,0,1,1,1,0,0],
                [0,1,0,1,0,1,0],
                [0,1,1,1,1,1,0],
                [0,0,1,1,1,0,0],
                [0,0,1,0,1,0,0],
                [0,1,0,0,0,1,0],
                [1,0,0,0,0,0,1]
            ],
            ninja: [
                [0,0,1,1,1,0,0],
                [0,1,0,0,0,1,0],
                [0,1,1,0,1,1,0],
                [0,0,1,1,1,0,0],
                [0,1,0,1,0,1,0],
                [0,1,0,0,0,1,0],
                [1,0,0,0,0,0,1]
            ],
            pirate: [
                [0,1,1,1,1,1,0],
                [0,1,0,1,0,1,0],
                [0,1,1,1,1,1,0],
                [0,0,1,1,1,0,0],
                [0,0,1,0,1,0,0],
                [0,1,0,0,0,1,0],
                [1,0,0,0,0,0,1]
            ],
            wizard: [
                [0,0,0,1,0,0,0],
                [0,0,1,1,1,0,0],
                [0,1,0,1,0,1,0],
                [0,1,1,1,1,1,0],
                [0,0,1,0,1,0,0],
                [0,0,1,0,1,0,0],
                [0,1,0,0,0,1,0]
            ],
            knight: [
                [0,1,0,1,0,1,0],
                [0,1,1,1,1,1,0],
                [0,0,1,1,1,0,0],
                [0,1,1,1,1,1,0],
                [0,0,1,0,1,0,0],
                [0,1,0,0,0,1,0],
                [1,0,0,0,0,0,1]
            ]
        };
        
        const pattern = patterns[character];
        if (pattern) {
            const color = charData.color || 0xFFFFFF;
            this.sprite.beginFill(color);
            
            for (let y = 0; y < pattern.length; y++) {
                for (let x = 0; x < pattern[y].length; x++) {
                    if (pattern[y][x]) {
                        this.sprite.drawRect(
                            (x - 3.5) * pixelSize * 2,
                            (y - 3.5) * pixelSize * 2,
                            pixelSize * 1.5,
                            pixelSize * 1.5
                        );
                    }
                }
            }
            this.sprite.endFill();
        } else {
            // Fallback to simple square
            this.sprite.beginFill(charData.color || 0xFFFFFF);
            this.sprite.drawRect(-pixelSize * 4, -pixelSize * 4, pixelSize * 8, pixelSize * 8);
            this.sprite.endFill();
        }
    }
    
    addGlowEffect() {
        // Skip if game data is not available
        if (!this.game.gameData) return;
        
        const glowLevel = this.game.gameData.getItemLevel('glow');
        if (glowLevel <= 0) return;
        
        const colors = [0xFFFFFF, 0xFFFF00, 0x00FFFF];
        const color = colors[Math.min(glowLevel - 1, 2)];
        
        // Clean up existing glow sprite
        if (this.glowSprite) {
            this.container.removeChild(this.glowSprite);
            this.glowSprite.destroy();
            this.glowSprite = null;
        }
        
        // Create new glow sprite
        this.glowSprite = new PIXI.Graphics();
        this.glowSprite.alpha = 0.5;
        
        // Draw the same shape but larger for glow effect
        const level = this.game.gameData.getLevel();
        const sides = Math.min(3 + Math.floor((level - 1) / 3), 8);
        const radius = 25 * this.sizeMultiplier; // Slightly larger than main sprite
        
        this.glowSprite.beginFill(color);
        const points = [];
        for (let i = 0; i < sides; i++) {
            const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            points.push(x, y);
        }
        this.glowSprite.drawPolygon(points);
        this.glowSprite.endFill();
        
        // Apply blur filter for glow effect
        try {
            const blurFilter = new PIXI.BlurFilter();
            blurFilter.blur = 8;
            this.glowSprite.filters = [blurFilter];
        } catch (e) {
            console.warn('Could not apply blur filter:', e);
        }
        
        // Add glow behind the main sprite
        this.container.addChildAt(this.glowSprite, 0);
    }
    
    addBuds() {
        if (!this.game.gameData) return;
        
        const budLevel = this.game.gameData.getItemLevel('buds');
        if (budLevel <= 0) return;
        
        const level = this.game.gameData.getLevel();
        const sides = Math.min(3 + Math.floor((level - 1) / 3), 8);
        
        // Remove old buds
        if (this.buds && this.buds.length > 0) {
            this.buds.forEach(bud => {
                this.container.removeChild(bud);
                bud.destroy();
            });
        }
        
        this.buds = [];
        
        for (let i = 0; i < Math.min(budLevel, sides); i++) {
            const bud = new PIXI.Graphics();
            bud.beginFill(0xFFFFFF, 0.8);
            bud.drawCircle(0, 0, 5);
            bud.endFill();
            
            const angle = (i / sides) * Math.PI * 2;
            const dist = 30 + i * 5;
            bud.x = Math.cos(angle) * dist;
            bud.y = Math.sin(angle) * dist;
            
            this.container.addChild(bud);
            this.buds.push(bud);
        }
    }
    
    applyShopEffects() {
        if (!this.game.gameData) return;
        
        const inv = this.game.gameData.shopInventory || {};
        
        // Plus jump
        if (inv.plusJump) {
            this.maxAirJumps++;
        }
        
        // Big level
        const bigLevel = inv.bigLevel || 0;
        this.sizeMultiplier = 1.0 + bigLevel * 0.05;
        
        // Don't recreate sprite during initialization
        // It will be created separately
    }
    
    reset() {
        this.x = 100;
        this.y = CONFIG.height / 2;
        this.vx = 0;
        this.vy = 0;
        this.mode = 'free';
        this.attachedRope = null;
        this.previousRope = null;
        this.angle = 0;
        this.rotation = 0;
        this.airJumpsLeft = this.maxAirJumps;
        this.usedAirJumps = 0;
        this.catchCooldown = 0;
        this.jumpCooldown = 0;
        this.isFirstDetach = true; // Reset first detach flag
        this.isFirstCatch = true; // Reset first catch flag
        
        this.updatePosition();
    }
    
    attachToRope(rope) {
        this.mode = 'attached';
        this.attachedRope = rope;
        // Don't reset usedAirJumps here - it should track jumps between ropes
        
        // Calculate attachment angle
        const tip = rope.getTip(this.game.simTime);
        this.angle = Math.atan2(tip.y - rope.anchorY, tip.x - rope.anchorX);
        
        // Visual feedback only if not first catch (game start)
        if (!this.isFirstCatch) {
            this.game.particleSystem.createAttachEffect(this.x, this.y);
        } else {
            this.isFirstCatch = false;
        }
    }
    
    detachFromRope() {
        if (this.mode === 'attached' && this.attachedRope) {
            const tip = this.attachedRope.getTip(this.game.simTime);
            
            // Inherit rope velocity
            this.vx = tip.vx + CONFIG.baseVx;
            this.vy = tip.vy - CONFIG.jumpImpulse;
            
            // Track previous rope
            this.previousRope = this.attachedRope;
            
            this.mode = 'free';
            this.attachedRope = null;
            this.airJumpsLeft = this.maxAirJumps;
            // Reset usedAirJumps when leaving rope
            this.usedAirJumps = 0;
            
            // Start catch cooldown to prevent immediate re-catch
            this.catchCooldown = this.catchCooldownDuration;
            
            // Don't add score here anymore - will be added when catching next rope
            this.isFirstDetach = false;
        }
    }
    
    jump() {
        // Check if jump is allowed (cooldown)
        if (this.jumpCooldown > 0) {
            return;
        }
        
        if (this.mode === 'attached') {
            // Detach and jump from rope
            this.detachFromRope();
            // Visual feedback for rope jump
            this.game.particleSystem.createJumpEffect(this.x, this.y);
        } else if (this.mode === 'free' && this.airJumpsLeft > 0) {
            // Air jump
            this.vy = -CONFIG.jumpImpulse;
            this.vx = CONFIG.baseVx;
            this.airJumpsLeft--;
            this.usedAirJumps++;
            
            // Visual feedback
            this.game.particleSystem.createJumpEffect(this.x, this.y);
        }
    }
    
    update(dt) {
        // Update catch cooldown
        if (this.catchCooldown > 0) {
            this.catchCooldown = Math.max(0, this.catchCooldown - dt);
        }
        
        // Update jump cooldown
        if (this.jumpCooldown > 0) {
            this.jumpCooldown = Math.max(0, this.jumpCooldown - dt);
        }
        
        if (this.mode === 'attached' && this.attachedRope) {
            // Follow rope tip
            const tip = this.attachedRope.getTip(this.game.simTime);
            this.x = tip.x;
            this.y = tip.y;
            
            // Update rotation based on swing
            this.rotation = tip.angle;
        } else if (this.mode === 'free') {
            // Apply physics
            this.vy += CONFIG.gravity * dt;
            
            // Apply air resistance
            this.vx *= Math.pow(CONFIG.airResistance, dt);
            this.vy *= Math.pow(CONFIG.airResistance, dt);
            
            // Update position
            this.x += this.vx * dt;
            this.y += this.vy * dt;
            
            // Update rotation based on velocity
            this.rotation += dt * 5;
        }
        
        this.updatePosition();
    }
    
    updatePosition() {
        this.container.x = this.x;
        this.container.y = this.y;
        this.container.rotation = this.rotation;
        this.container.scale.set(this.sizeMultiplier);
    }
}