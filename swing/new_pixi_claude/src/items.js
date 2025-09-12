// Item class
class Item {
    constructor(game, config) {
        this.game = game;
        
        this.x = config.x;
        this.y = config.y;
        this.type = config.type;
        this.collected = false;
        
        // Animation
        this.time = 0;
        this.baseY = config.y;
        
        // Create container
        this.container = new PIXI.Container();
        this.createSprite();
    }
    
    createSprite() {
        // Create item visual based on type
        this.sprite = new PIXI.Graphics();
        
        switch (this.type) {
            case 'extraJump':
                this.sprite.beginFill(0x00FF00);
                this.sprite.drawRect(-15, -15, 30, 30);
                this.sprite.endFill();
                this.sprite.beginFill(0xFFFFFF);
                this.sprite.drawPolygon([0, -8, -8, 8, 8, 8]);
                this.sprite.endFill();
                break;
                
            case 'wideCatch':
                this.sprite.beginFill(0x00FFFF);
                this.sprite.drawCircle(0, 0, 15);
                this.sprite.endFill();
                this.sprite.lineStyle(2, 0xFFFFFF);
                this.sprite.drawCircle(0, 0, 20);
                break;
                
            case 'bigSize':
                this.sprite.beginFill(0xFF00FF);
                this.sprite.drawRect(-20, -20, 40, 40);
                this.sprite.endFill();
                break;
                
            case 'star':
                this.drawStar(0, 0, 5, 20, 10);
                break;
                
            default:
                this.sprite.beginFill(0xFFFFFF);
                this.sprite.drawRect(-10, -10, 20, 20);
                this.sprite.endFill();
        }
        
        this.container.addChild(this.sprite);
        this.updatePosition();
    }
    
    drawStar(x, y, points, outerRadius, innerRadius) {
        this.sprite.beginFill(0xFFFF00);
        
        const angle = Math.PI / points;
        
        for (let i = 0; i < points * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const px = x + Math.cos(i * angle - Math.PI / 2) * radius;
            const py = y + Math.sin(i * angle - Math.PI / 2) * radius;
            
            if (i === 0) {
                this.sprite.moveTo(px, py);
            } else {
                this.sprite.lineTo(px, py);
            }
        }
        
        this.sprite.closePath();
        this.sprite.endFill();
    }
    
    update(dt) {
        if (!this.collected) {
            this.time += dt;
            
            // Floating animation
            this.y = this.baseY + Math.sin(this.time * 2) * 10;
            
            // Rotation
            this.sprite.rotation += dt * 2;
            
            this.updatePosition();
        }
    }
    
    updatePosition() {
        this.container.x = this.x;
        this.container.y = this.y;
    }
    
    collect() {
        if (!this.collected) {
            this.collected = true;
            
            // Animate collection
            const timeline = this.container;
            timeline.scale.set(1.5);
            timeline.alpha = 0;
            
            // Schedule removal
            setTimeout(() => this.destroy(), 100);
        }
    }
    
    destroy() {
        if (this.container.parent) {
            this.container.parent.removeChild(this.container);
        }
        this.container.destroy({ children: true });
    }
}