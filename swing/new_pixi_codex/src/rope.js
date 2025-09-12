class Rope {
  constructor(app, opts) {
    this.app = app; // Game instance
    this.anchorX = opts.anchorX;
    this.anchorY = opts.anchorY;
    this.length = opts.length;
    this.amp = opts.amplitude;
    this.omega = opts.omega;
    this.phase = opts.phase || 0;

    this.container = new PIXI.Container();
    this.line = new PIXI.Graphics();
    this.anchorDot = new PIXI.Graphics();
    this.tipDot = new PIXI.Graphics();
    this.container.addChild(this.line, this.anchorDot, this.tipDot);

    this.anchorDot.beginFill(0xffffff).drawCircle(0, 0, 3).endFill();
    this.anchorDot.position.set(this.anchorX, this.anchorY);
  }

  angle(t) { return this.amp * Math.sin(this.omega * t + this.phase); }

  tip(t) {
    const a = this.angle(t);
    const x = this.anchorX + Math.sin(a) * this.length;
    const y = this.anchorY + Math.cos(a) * this.length;
    const da = this.amp * this.omega * Math.cos(this.omega * t + this.phase);
    const vx = Math.cos(a) * this.length * da;
    const vy = -Math.sin(a) * this.length * da;
    return { x, y, vx, vy, a };
  }

  update(dt) {
    const t = this.app.simTime;
    const tip = this.tip(t);

    // 라인 갱신
    this.line.clear();
    this.line.lineStyle(2, CONFIG.colors.rope);
    this.line.moveTo(this.anchorX, this.anchorY);
    this.line.lineTo(tip.x, tip.y);

    // 팁 점
    this.tipDot.clear();
    this.tipDot.beginFill(0x33ff66, 0.7).drawCircle(0, 0, 6).endFill();
    this.tipDot.position.set(tip.x, tip.y);
  }

  destroy() { this.container.destroy(true); }
}

