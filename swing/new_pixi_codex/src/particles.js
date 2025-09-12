class ParticleSystem {
  constructor() {
    this.container = new PIXI.Container();
    this._parts = [];
  }

  burst(x, y, color = 0xffffff, n = 16) {
    for (let i = 0; i < n; i++) {
      const g = new PIXI.Graphics();
      g.beginFill(color).drawCircle(0, 0, 2 + Math.random() * 2).endFill();
      g.x = x; g.y = y;
      const vx = (Math.random() - 0.5) * 340;
      const vy = (Math.random() - 0.5) * 340;
      const life = 0.6 + Math.random() * 0.6;
      this.container.addChild(g);
      this._parts.push({ g, x, y, vx, vy, life, max: life });
    }
  }

  text(x, y, str) {
    const style = new PIXI.TextStyle({ fontFamily: 'GameFont, "Press Start 2P", "Dalmoori", sans-serif', fontSize: 16, fill: 0xffff66, stroke: 0x000000, strokeThickness: 3 });
    const t = new PIXI.Text(str, style);
    t.anchor.set(0.5);
    t.x = x; t.y = y;
    this.container.addChild(t);
    this._parts.push({ t, ty: y, life: 1.2, max: 1.2, update: (p, dt) => {
      p.t.y = p.ty - (1 - p.life / p.max) * 40;
      p.t.alpha = Math.max(0, p.life / p.max);
    }});
  }

  update(dt) {
    this._parts = this._parts.filter(p => {
      p.life -= dt;
      if (p.life <= 0) {
        if (p.g) p.g.destroy();
        if (p.t) p.t.destroy();
        return false;
      }
      if (p.g) {
        p.vy += 600 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.g.x = p.x; p.g.y = p.y; p.g.alpha = p.life / p.max;
      }
      if (p.update) p.update(p, dt);
      return true;
    });
  }

  clear() {
    for (const p of this._parts) {
      if (p.g && !p.g.destroyed) p.g.destroy();
      if (p.t && !p.t.destroyed) p.t.destroy();
    }
    this._parts = [];
  }

  comboBurst(x, y) {
    const colors = [0xffff66, 0xff66cc, 0x66ffcc, 0x66aaff];
    for (let i = 0; i < 36; i++) {
      const ang = (i / 36) * Math.PI * 2;
      const sp = 180 + Math.random() * 120;
      const g = new PIXI.Graphics();
      g.beginFill(colors[i % colors.length]).drawCircle(0,0,2.2).endFill();
      g.x = x; g.y = y;
      this.container.addChild(g);
      this._parts.push({ g, x, y, vx: Math.cos(ang)*sp, vy: Math.sin(ang)*sp, life: 0.8, max: 0.8 });
    }
    // ring
    this._ring(x, y, 0xffff66);
  }

  megaDeath(x, y) {
    const palette = [0xff5555, 0xffaa55, 0xffff66, 0x66ccff, 0xffffff];
    for (let i = 0; i < 64; i++) {
      const g = new PIXI.Graphics();
      g.beginFill(palette[i % palette.length]).drawRect(-1,-1,2,2).endFill();
      g.x = x; g.y = y;
      this.container.addChild(g);
      const ang = Math.random() * Math.PI * 2;
      const sp = 220 + Math.random()*220;
      const vy0 = - (200 + Math.random()*200);
      this._parts.push({ g, x, y, vx: Math.cos(ang)*sp, vy: vy0 + Math.sin(ang)*sp*0.2, life: 1.2, max: 1.2 });
    }
    this._ring(x, y, 0xff5555);
    setTimeout(()=> this._ring(x, y, 0xffffff), 60);
  }

  _ring(x, y, color) {
    const g = new PIXI.Graphics();
    g.lineStyle(3, color, 1.0);
    this.container.addChild(g);
    const part = {
      g,
      life: 0.35,
      max: 0.35,
      r: 0,
      update: (p, dt) => {
        p.r += 360 * dt;
        g.clear();
        g.lineStyle(3, color, p.life / p.max);
        g.drawCircle(x, y, p.r);
      }
    };
    this._parts.push(part);
  }
}
