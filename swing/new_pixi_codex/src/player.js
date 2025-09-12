class Player {
  constructor(app) {
    this.app = app; // Game instance
    this.x = 100;
    this.y = CONFIG.height * 0.5;
    this.vx = 0;
    this.vy = 0;
    this.mode = 'free'; // 'free' | 'attached'
    this.attached = null; // Rope
    this.usedAirJumps = 0;
    this.maxAirJumps = 1;
    this.airJumpsLeft = this.maxAirJumps;
    this.catchRadius = CONFIG.catchRadius;
    this.sizeScale = 1.0;

    this.container = new PIXI.Container();
    this.sprite = new PIXI.Container();
    this.container.addChild(this.sprite);
    this._body = new PIXI.Graphics();
    this.sprite.addChild(this._body);
    this._glow = new PIXI.Graphics();
    this.sprite.addChild(this._glow);
    this._buds = new PIXI.Container();
    this.sprite.addChild(this._buds);
    this.drawBody();
    this.sync();
  }

  drawBody() {
    // reset
    this._body.clear();
    this._glow.clear();
    this._buds.removeChildren();

    const charId = this.app.data.selectedCharacter || 'default';
    const char = PIXEL_CHARACTERS[charId];
    const r = 14 * this.sizeScale;
    if (!char || charId === 'default' || !char.pixels || char.pixels.length === 0) {
      // 기본 폴리곤/원
      this._body.beginFill(CONFIG.colors.player).drawCircle(0, 0, r).endFill();
    } else {
      // 8x8 픽셀 렌더
      const px = 3 * this.sizeScale;
      const off = -4 * px;
      for (let y = 0; y < char.pixels.length; y++) {
        const row = char.pixels[y];
        for (let x = 0; x < row.length; x++) {
          const v = row[x];
          if (!v) continue;
          const color = char.colors[v] || '#ffffff';
          this._body.beginFill(PIXI.utils.string2hex(color));
          this._body.drawRect(off + x * px, off + y * px, px, px);
          this._body.endFill();
        }
      }
    }

    // glow(레벨당 강도 증가) - 필터 대신 반투명 원으로 표현
    const glowLv = this.app.data.shopInventory.glowLevel || 0;
    if (glowLv > 0) {
      const colorHex = [0xffffff, 0xffff66, 0x66ffff][Math.min(glowLv - 1, 2)];
      const base = r * 1.6;
      for (let i = 0; i < glowLv + 1; i++) {
        const rr = base + i * 6;
        this._glow.beginFill(colorHex, 0.12).drawCircle(0, 0, rr).endFill();
      }
    }

    // buds(변 개수만큼 배치)
    const budsLv = this.app.data.shopInventory.budsLevel || 0;
    const sides = this.app.data.currentBodySides();
    const count = Math.min(budsLv, sides);
    for (let i = 0; i < count; i++) {
      const g = new PIXI.Graphics();
      g.beginFill(0xffffff, 0.85).drawCircle(0, 0, 3).endFill();
      const ang = (i / Math.max(1, count)) * Math.PI * 2;
      const dist = r + 8;
      g.x = Math.cos(ang) * dist;
      g.y = Math.sin(ang) * dist;
      this._buds.addChild(g);
    }
  }

  reset() {
    this.x = 100;
    this.y = CONFIG.height * 0.5;
    this.vx = 0; this.vy = 0;
    this.mode = 'free'; this.attached = null;
    this.usedAirJumps = 0;
    this.maxAirJumps = 1 + (this.app.data.shopInventory?.plusJump ? 1 : 0);
    this.airJumpsLeft = this.maxAirJumps;
    this.sizeScale = 1.0 + (this.app.data.shopInventory?.bigLevel || 0) * 0.025; // 원본 2.5%
    const base = CONFIG.catchBase;
    const glowBonus = (this.app.data.shopInventory?.glowLevel || 0) * 0.167 * base;
    this.catchRadius = base + glowBonus;
    this.drawBody();
    this.sync();
  }

  jumpOrDetach() {
    if (this.mode === 'attached' && this.attached) {
      const tip = this.attached.tip(this.app.simTime);
      this.vx = tip.vx + CONFIG.baseVx;
      this.vy = tip.vy - CONFIG.jumpImpulse;
      this.mode = 'free';
      const prevRope = this.attached;
      this.attached = null;
      this.airJumpsLeft = this.maxAirJumps;
      this.app.onDetach(prevRope);
      return;
    }
    if (this.mode === 'free' && this.airJumpsLeft > 0) {
      this.vy = -CONFIG.jumpImpulse;
      this.vx = Math.max(this.vx, CONFIG.baseVx);
      this.airJumpsLeft -= 1;
      this.usedAirJumps += 1;
      this.app.particles.burst(this.x, this.y, 0x00ffff, 8);
    }
  }

  tryCatch(rope) {
    if (this.mode !== 'free') return false;
    const tip = rope.tip(this.app.simTime);
    const dx = this.x - tip.x; const dy = this.y - tip.y;
    const d = Math.hypot(dx, dy);
    if (d <= this.catchRadius) {
      this.mode = 'attached';
      this.attached = rope;
      this.usedAirJumps = 0;
      this.app.onCatch();
      return true;
    }
    return false;
  }

  update(dt) {
    if (this.mode === 'attached' && this.attached) {
      const tip = this.attached.tip(this.app.simTime);
      this.x = tip.x; this.y = tip.y;
      // 부착 중 로프 스냅 확률
      const allowSnap = this.app.data.level() >= 2;
      if (allowSnap && Math.random() < (CONFIG.ropeBreakProb || 0) * dt) {
        this.vx = tip.vx + CONFIG.baseVx * 0.8;
        this.vy = tip.vy - CONFIG.jumpImpulse * 0.6;
        this.mode = 'free';
        const prevRope = this.attached; this.attached = null;
        this.airJumpsLeft = this.maxAirJumps;
        this.usedAirJumps = 2; // 콤보 방지
        this.app.onDetach(prevRope);
        this.app.particles.burst(this.x, this.y, 0xff6666, 12);
      }
    } else {
      // 공중 물리
      this.vy += CONFIG.gravity * dt;
      this.vx += (0 - this.vx) * CONFIG.airDragX * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    }
    this.sync();
  }

  sync() {
    this.container.position.set(this.x, this.y);
  }
}
