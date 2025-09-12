// Particle system
class ParticleSystem {
    constructor(game) {
        this.game = game;
        this.container = new PIXI.Container();
        this.particles = [];
    }
    
    createBurst(x, y, color = 0xFFFFFF, count = 20) {
        for (let i = 0; i < count; i++) {
            const particle = new Particle(this, {
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 200,
                vy: (Math.random() - 0.5) * 200,
                color: color,
                lifetime: 1.0,
                size: Math.random() * 5 + 2
            });
            
            this.particles.push(particle);
            this.container.addChild(particle.sprite);
        }
    }
    
    createJumpEffect(x, y) {
        for (let i = 0; i < 10; i++) {
            const angle = (i / 10) * Math.PI * 2;
            const speed = 100;
            
            const particle = new Particle(this, {
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: 0x00FFFF,
                lifetime: 0.5,
                size: 3
            });
            
            this.particles.push(particle);
            this.container.addChild(particle.sprite);
        }
    }
    
    createAttachEffect(x, y) {
        this.createBurst(x, y, 0x00FF00, 10);
    }
    
    createStarBurst(x, y) {
        for (let i = 0; i < 30; i++) {
            const particle = new Particle(this, {
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 300,
                vy: (Math.random() - 0.5) * 300,
                color: 0xFFFF00,
                lifetime: 2.0,
                size: Math.random() * 8 + 2,
                isStar: true
            });
            
            this.particles.push(particle);
            this.container.addChild(particle.sprite);
        }
    }
    
    createExplosionBurst(x, y) {
        // Create big explosion effect
        const colors = [0xFF0000, 0xFF6600, 0xFFFF00, 0xFFFFFF, 0xFF00FF];
        
        // Main explosion particles
        for (let i = 0; i < 40; i++) {
            const angle = (Math.PI * 2 * Math.random());
            const speed = 100 + Math.random() * 300;
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            const particle = new Particle(this, {
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 100,
                color: color,
                lifetime: 2.0,
                size: Math.random() * 6 + 3,
                gravity: 400
            });
            
            this.particles.push(particle);
            this.container.addChild(particle.sprite);
        }
        
        // Spark particles
        for (let i = 0; i < 20; i++) {
            const angle = (Math.PI * 2 * Math.random());
            const speed = 200 + Math.random() * 200;
            
            const particle = new Particle(this, {
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 150,
                color: 0xFFFFFF,
                lifetime: 1.5,
                size: 2,
                isSpark: true,
                gravity: 300
            });
            
            this.particles.push(particle);
            this.container.addChild(particle.sprite);
        }
    }
    
    createComboText(x, y, text) {
        const style = new PIXI.TextStyle({
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 12,
            fill: [0xFFFF00, 0xFF0000],
            stroke: 0x000000,
            strokeThickness: 3,
            dropShadow: true,
            dropShadowDistance: 2
        });
        
        const textSprite = new PIXI.Text(text, style);
        textSprite.anchor.set(0.5);
        textSprite.x = x;
        textSprite.y = y;
        
        this.container.addChild(textSprite);
        
        // Animate text
        const startY = y;
        const duration = 1.5;
        let elapsed = 0;
        
        const updateText = (dt) => {
            elapsed += dt;
            const progress = elapsed / duration;
            
            if (progress >= 1) {
                textSprite.destroy();
                return true;
            }
            
            textSprite.y = startY - progress * 50;
            textSprite.alpha = 1 - progress;
            textSprite.scale.set(1 + progress * 0.5);
            
            return false;
        };
        
        this.particles.push({ update: updateText, sprite: textSprite });
    }
    
    update(dt) {
        this.particles = this.particles.filter(particle => {
            const shouldRemove = particle.update(dt);
            if (shouldRemove) {
                if (particle.sprite && !particle.sprite.destroyed) {
                    particle.sprite.destroy();
                }
                return false;
            }
            return true;
        });
    }
}

class Particle {
    constructor(system, config) {
        this.system = system;
        
        this.x = config.x;
        this.y = config.y;
        this.vx = config.vx;
        this.vy = config.vy;
        this.lifetime = config.lifetime;
        this.maxLifetime = config.lifetime;
        this.gravity = config.gravity || 200;
        this.isSpark = config.isSpark || false;
        
        // Create sprite
        this.sprite = new PIXI.Graphics();
        
        if (config.isStar) {
            this.drawStar(config.size, config.color);
        } else if (config.isSpark) {
            // Draw spark as a line
            this.sprite.lineStyle(2, config.color, 1);
            this.sprite.moveTo(0, 0);
            this.sprite.lineTo(-this.vx * 0.05, -this.vy * 0.05);
        } else {
            this.sprite.beginFill(config.color);
            this.sprite.drawCircle(0, 0, config.size);
            this.sprite.endFill();
        }
        
        this.sprite.x = this.x;
        this.sprite.y = this.y;
    }
    
    drawStar(size, color) {
        const points = 5;
        const outerRadius = size;
        const innerRadius = size * 0.5;
        const angle = Math.PI / points;
        
        this.sprite.beginFill(color);
        
        for (let i = 0; i < points * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const px = Math.cos(i * angle - Math.PI / 2) * radius;
            const py = Math.sin(i * angle - Math.PI / 2) * radius;
            
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
        this.lifetime -= dt;
        
        if (this.lifetime <= 0) {
            return true; // Remove particle
        }
        
        // Update physics
        this.vy += this.gravity * dt; // Gravity
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        
        // Add friction
        this.vx *= 0.98;
        
        // Update visual
        this.sprite.x = this.x;
        this.sprite.y = this.y;
        this.sprite.alpha = this.lifetime / this.maxLifetime;
        
        if (!this.isSpark) {
            this.sprite.scale.set(this.lifetime / this.maxLifetime);
        } else {
            // Update spark trail
            this.sprite.clear();
            this.sprite.lineStyle(2, 0xFFFFFF, this.lifetime / this.maxLifetime);
            this.sprite.moveTo(0, 0);
            this.sprite.lineTo(-this.vx * 0.1, -this.vy * 0.1);
        }
        
        return false;
    }
}