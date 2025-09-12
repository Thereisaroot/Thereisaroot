class BoxItem {
  constructor(app, x, y, kind) {
    this.app = app;
    this.x = x; this.y = y; this.kind = kind;
    this.active = true;
    this.phase = Math.random() * Math.PI * 2;
    this.container = new PIXI.Container();
    this.g = new PIXI.Graphics();
    this.container.addChild(this.g);
    this.app.world.addChild(this.container);
    this._draw();
    this.update(0);
  }

  _draw() {
    const g = this.g; g.clear();
    const sz = 14;
    if (this.kind === 'extraJump') {
      g.beginFill(0x00ff00).drawRoundedRect(-sz, -sz, sz*2, sz*2, 4).endFill();
      g.beginFill(0xffffff).drawPolygon([0,-8, -6,6, 6,6]).endFill();
    } else if (this.kind === 'wideCatch') {
      g.beginFill(0x00ffff).drawCircle(0,0,sz).endFill();
      g.lineStyle(2, 0xffffff).drawCircle(0,0,sz+4);
    } else if (this.kind === 'bigSize') {
      g.beginFill(0xff00ff).drawRoundedRect(-sz-3, -sz-3, (sz+3)*2, (sz+3)*2, 6).endFill();
    } else if (this.kind === 'star') {
      this._drawStar(g, 5, 18, 9, 0xffff00);
    } else {
      g.beginFill(0xffffff).drawRect(-10,-10,20,20).endFill();
    }
  }

  _drawStar(g, points, outerR, innerR, color) {
    g.beginFill(color);
    const a = Math.PI / points;
    for (let i=0;i<points*2;i++){
      const r = i%2===0 ? outerR : innerR;
      const x = Math.cos(i*a - Math.PI/2)*r;
      const y = Math.sin(i*a - Math.PI/2)*r;
      if (i===0) g.moveTo(x,y); else g.lineTo(x,y);
    }
    g.closePath(); g.endFill();
  }

  update(dt){
    if (!this.active) return;
    this.phase += dt*2;
    const b = Math.sin(this.phase)*6;
    this.container.position.set(this.x, this.y + b);
    this.g.rotation += dt*1.5;
  }

  collect(){
    if (!this.active) return;
    this.active = false;
    this.app.onCollectItem(this.kind);
    this.g.alpha = 0.0;
    this.container.destroy();
  }
}

