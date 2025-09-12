// Rope class
class Rope {
    constructor(game, config) {
        this.game = game;
        
        // Rope parameters
        this.anchorX = config.anchorX;
        this.anchorY = config.anchorY;
        this.length = config.length;
        this.amplitude = config.amplitude;
        this.omega = config.omega;
        this.phase = config.phase;
        
        // Visual state
        this.isActive = false;
        
        // Create container
        this.container = new PIXI.Container();
        this.createGraphics();
    }
    
    createGraphics() {
        // Rope line
        this.ropeGraphics = new PIXI.Graphics();
        this.container.addChild(this.ropeGraphics);
        
        // Anchor point
        this.anchorGraphics = new PIXI.Graphics();
        this.anchorGraphics.beginFill(0xFFFFFF);
        this.anchorGraphics.drawCircle(0, 0, 5);
        this.anchorGraphics.endFill();
        this.anchorGraphics.x = this.anchorX;
        this.anchorGraphics.y = this.anchorY;
        this.container.addChild(this.anchorGraphics);
        
        // Tip point
        this.tipGraphics = new PIXI.Graphics();
        this.tipGraphics.beginFill(0x00FF00);
        this.tipGraphics.drawCircle(0, 0, 8);
        this.tipGraphics.endFill();
        this.container.addChild(this.tipGraphics);
    }
    
    getAngle(time) {
        return this.amplitude * Math.sin(this.omega * time + this.phase);
    }
    
    getTip(time) {
        const angle = this.getAngle(time);
        const x = this.anchorX + Math.sin(angle) * this.length;
        const y = this.anchorY + Math.cos(angle) * this.length;
        
        // Calculate velocity
        const dAngle = this.amplitude * this.omega * Math.cos(this.omega * time + this.phase);
        const vx = Math.cos(angle) * this.length * dAngle;
        const vy = -Math.sin(angle) * this.length * dAngle;
        
        return { x, y, vx, vy, angle };
    }
    
    update(dt) {
        // Check if player is attached
        this.isActive = this.game.player.attachedRope === this;
        
        // Update graphics
        const tip = this.getTip(this.game.simTime);
        
        // Draw rope line
        this.ropeGraphics.clear();
        this.ropeGraphics.lineStyle(3, this.isActive ? CONFIG.colors.ropeActive : CONFIG.colors.rope);
        this.ropeGraphics.moveTo(this.anchorX, this.anchorY);
        this.ropeGraphics.lineTo(tip.x, tip.y);
        
        // Update tip position
        this.tipGraphics.x = tip.x;
        this.tipGraphics.y = tip.y;
        
        // Update tip color based on catchability
        const player = this.game.player;
        if (player.mode === 'free') {
            const dx = player.x - tip.x;
            const dy = player.y - tip.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // Check if player is in cooldown
            if (player.catchCooldown > 0) {
                // Show red/grey tip during cooldown
                this.tipGraphics.clear();
                this.tipGraphics.beginFill(0xFF0000, 0.3);
                this.tipGraphics.drawCircle(0, 0, 8);
                this.tipGraphics.endFill();
            } else if (dist < player.catchRadius) {
                // Green when catchable
                this.tipGraphics.clear();
                this.tipGraphics.beginFill(0x00FF00, 1);
                this.tipGraphics.drawCircle(0, 0, 10);
                this.tipGraphics.endFill();
            } else {
                // Normal green when not in range
                this.tipGraphics.clear();
                this.tipGraphics.beginFill(0x00FF00, 0.5);
                this.tipGraphics.drawCircle(0, 0, 8);
                this.tipGraphics.endFill();
            }
        }
    }
    
    break() {
        this.isBroken = true;
        
        // Detach player if attached
        if (this.game.player.attachedRope === this) {
            this.game.player.detachFromRope();
            // Create breaking effect
            this.game.particleSystem.createBurst(
                this.anchorX + Math.sin(this.getAngle(this.game.simTime)) * this.length / 2,
                this.anchorY + Math.cos(this.getAngle(this.game.simTime)) * this.length / 2,
                0xFF0000,
                15
            );
        }
        
        // Hide graphics
        this.ropeGraphics.clear();
        this.tipGraphics.visible = false;
        this.anchorGraphics.visible = false;
    }
    
    destroy() {
        if (this.container.parent) {
            this.container.parent.removeChild(this.container);
        }
        this.container.destroy({ children: true });
    }
}