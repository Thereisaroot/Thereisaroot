class GameApp {
  constructor(pixiApp, data) {
    this.app = pixiApp;
    this.data = data;

    // 상태
    this.state = 'intro'; // intro | playing | gameover | shop
    this.score = 0;
    this.combo = 0;
    this.simTime = 0;

    // 레이어
    this.world = new PIXI.Container();
    this.uiLayer = new PIXI.Container();
    this.shopLayer = new PIXI.Container();
    this.app.stage.addChild(this.world, this.shopLayer, this.uiLayer);

    // 카메라
    this.cameraX = 0;

    // 시스템
    this.particles = new ParticleSystem();
    this.world.addChild(this.particles.container);
    // 바닥 표시
    this.ground = new PIXI.Graphics();
    this._drawGround();
    this.world.addChildAt(this.ground, 0);

    // 엔티티
    this.player = new Player(this);
    this.world.addChild(this.player.container);
    this.ropes = [];
    this.items = [];
    this.starModeActive = false;
    this.starModeEnd = 0;

    // UI/Shop
    this.ui = new UIOverlay(this);
    this.uiLayer.addChild(this.ui.container);
    this.shop = new ShopView(this);
    this.shopLayer.addChild(this.shop.container);

    // 입력
    this._setupInput();
    this.inputPressed = false;
    this.pressTime = 0;
    this.flyActive = false;
    this.flyHoldLeft = 0;
    this.catchLockUntil = 0;
    this.lastDetachedRope = null;

    // 초기화
    // 파티클 정리 (시작 잔상 제거)
    this.particles.clear();
    this._spawnInitial();
    this.setState('intro');

    // 루프
    this.app.ticker.add((delta) => this.update(delta / 60));
  }

  _setupInput() {
    const s = this.app.stage;
    s.eventMode = 'static';
    s.hitArea = this.app.screen;
    s.on('pointerdown', () => this.onPress());
    s.on('pointerup', () => this.onRelease());
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
  }

  setState(next) {
    this.state = next;
    if (next === 'intro') {
      this.world.visible = false; this.shopLayer.visible = false; this.ui.showIntro();
    } else if (next === 'playing') {
      this.resetRun(); this.world.visible = true; this.shopLayer.visible = false; this.ui.showGame();
    } else if (next === 'gameover') {
      // showGameOver는 gameOver()에서 점수와 함께 호출
      this.world.visible = true; this.shopLayer.visible = false;
    } else if (next === 'shop') {
      this.world.visible = false; this.shop.refresh(); this.shop.show(); this.shopLayer.visible = true; this.ui.showShop();
    }
  }

  resetRun() {
    // 엔티티 초기화
    this.ropes.forEach(r => r.destroy());
    this.ropes = [];
    this.player.reset();
    this.score = 0; this.combo = 0; this.simTime = 0; this.cameraX = 0;
    // 러너블 아이템/버프 초기화
    this.flyActive = false;
    this.flyHoldLeft = (this.data.shopInventory.fly ? CONFIG.flyMaxHold : 0);
    this.flyCharges = this.data.shopInventory.fly ? 1 : 0;
    this.webCharges = this.data.shopInventory.webActive ? 1 : 0;
    this.shieldCharges = this.data.shopInventory.shield ? 1 : 0;
    this.revivalCharges = this.data.shopInventory.revival ? 1 : 0;
    this.slowActive = !!this.data.shopInventory.slow; // 소모성
    if (this.slowActive) { this.data.shopInventory.slow = false; this.data.save(); }

    this._spawnInitial();
    // 시작 시 첫 번째 로프에 부착
    if (this.ropes[0]) {
      const tip = this.ropes[0].tip(this.simTime);
      this.player.mode = 'attached';
      this.player.attached = this.ropes[0];
      this.player.x = tip.x; this.player.y = tip.y;
    }
    this._bufferRopes();
  }

  _spawnInitial() {
    // 초기 로프 1개
    const r = new Rope(this, {
      anchorX: 200,
      anchorY: 160,
      length: 150,
      amplitude: 0.35,
      omega: 2.2,
      phase: 0,
    });
    this.ropes.push(r);
    this.world.addChildAt(r.container, 0);
  }

  _bufferRopes() {
    // 우측 가장자리 기준으로 채우기
    const s = 1.0; // lv 스케일 생략
    const targetEdgeX = this.cameraX + (CONFIG.maxAnchorX * s) - 8;
    const fillUntil = this.starModeActive ? (this.cameraX + (CONFIG.maxAnchorX * s) + CONFIG.width * 0.25) : targetEdgeX;
    let spawnCount = 0;
    while (true) {
      // 가장 오른쪽 일반 로프 찾기
      let prev = null;
      for (let i = this.ropes.length - 1; i >= 0; i--) { prev = this.ropes[i]; break; }
      const farthestX = prev ? prev.anchorX : -Infinity;
      if (farthestX >= fillUntil) break;
      const r = this._planNextRope(prev);
      this.ropes.push(r);
      this.world.addChildAt(r.container, 0);
      // 상자 스폰(스타 모드 아닐 때만), 레벨≥3 + Lucky 보정
      const luckyLv = this.data.shopInventory.luckyLevel || 0;
      const spawnProb = Math.min(1, (CONFIG.itemSpawnProb || 0.2) + luckyLv * 0.05);
      if (!this.starModeActive && this.data.level() >= 3 && Math.random() < spawnProb && prev) {
        const midX = prev.anchorX + (r.anchorX - prev.anchorX) * 0.5;
        const minY = CONFIG.ceilingY + 60;
        const maxY = Math.min(CONFIG.height * 0.38, (CONFIG.height - CONFIG.groundH) - 140);
        const by = rndRange(minY, maxY);
        const kinds = ['extraJump','wideCatch','bigSize'];
        const kind = (Math.random() < 0.5) ? 'star' : kinds[Math.floor(Math.random()*kinds.length)];
        const item = new BoxItem(this, midX, by, kind);
        this.items.push(item);
      }
      spawnCount++;
      if (!this.starModeActive || spawnCount >= 10) break;
    }
  }

  _planNextRope(prev) {
    // 간소화된 목표: 화면 우측 가장자리 근처에 tip이 닿도록 배치
    const speedMul = 1.0; // fast mode 미구현
    const A = deg2rad(rndRange(CONFIG.AminDeg, CONFIG.AmaxDeg));
    let L = rndRange(CONFIG.Lmin, CONFIG.Lmax);
    const kOmega = rndRange(CONFIG.kOmegaMin, CONFIG.kOmegaMax);
    const omega = Math.sqrt(CONFIG.gravity / L) * kOmega * speedMul;
    const x0 = this.player.x, y0 = this.player.y;
    const vxEst = (this.player.mode === 'free') ? Math.max(CONFIG.minVx, Math.min(CONFIG.maxVx, this.player.vx)) : (CONFIG.baseVx + 40);
    const vy0 = -CONFIG.jumpImpulse * 0.9;

    const baseX = prev ? prev.anchorX : x0;
    const desiredEdgeX = this.cameraX + CONFIG.maxAnchorX - rndRange(4, CONFIG.edgeSpawnJitter);
    let anchorX = Math.max(baseX + CONFIG.Dmin, desiredEdgeX);
    const theta_hit = rndRange(-A*0.6, A*0.6);
    const tipX = anchorX + L * Math.sin(theta_hit);
    const t_hit = Math.max(0.3, Math.min(1.0, (tipX - x0) / Math.max(120, vxEst)));
    const yProj = y0 + vy0 * t_hit + 0.5 * CONFIG.gravity * t_hit * t_hit;
    const L_target = (yProj - CONFIG.ceilingY) / Math.cos(theta_hit);
    if (isFinite(L_target)) {
      let L_jitter = L_target * (1 + rndRange(-CONFIG.lengthJitterPct, CONFIG.lengthJitterPct));
      if (Math.random() < CONFIG.shortLChance) L_jitter *= CONFIG.shortLFactor; else if (Math.random() < CONFIG.longLChance) L_jitter *= CONFIG.longLFactor;
      L = Math.max(CONFIG.Lmin, Math.min(CONFIG.Lmax, L_jitter));
    }
    const omega2 = Math.sqrt(CONFIG.gravity / L) * kOmega * speedMul;
    const phi = Math.acos(Math.max(-1, Math.min(1, theta_hit / A))) - omega2 * (this.simTime + t_hit);
    return new Rope(this, { anchorX, anchorY: CONFIG.ceilingY, length: L, amplitude: A, omega: omega2, phase: phi });
  }

  onCatch() {
    // 점수: 공중점프 사용 수에 따라 3/2/1점
    let pts = 3 - Math.min(2, this.player.usedAirJumps);
    this.score += pts;
    if (this.player.usedAirJumps === 0) {
      this.combo += 1;
      const comboLv = this.data.shopInventory.comboLevel || 0;
      if (this.combo > 1 && comboLv > 0) this.score += comboLv; // 콤보 보너스
      if (this.combo > 1) {
        this.particles.text(this.player.x, this.player.y - 40, `COMBO x${this.combo}`);
        this.particles.comboBurst(this.player.x, this.player.y);
      } else {
        this.particles.comboBurst(this.player.x, this.player.y);
      }
    } else {
      this.combo = 0;
    }
  }

  gameOver() {
    // 바닥 충돌 시 록맨 스타일 이펙트
    const groundY = CONFIG.height - CONFIG.groundH;
    if (this.player.y >= groundY - 2) {
      this.particles.megaDeath(this.player.x, groundY);
    }
    const earned = this.data.addRunResult(this.score);
    this.ui.showGameOver(this.score, earned);
    this.setState('gameover');
  }

  onPress() {
    this.inputPressed = true;
  }

  onRelease() {
    this.inputPressed = false;
    this.pressTime = 0;
    this.flyActive = false;
    if (this.state === 'intro') this.setState('playing');
    else if (this.state === 'playing') this.player.jumpOrDetach();
  }

  onKeyDown(e) {
    if (e.code === 'Space') {
      if (this.state === 'intro') this.setState('playing');
      else if (this.state === 'playing') this.player.jumpOrDetach();
      else if (this.state === 'gameover') {
        if (e.shiftKey) this.setState('shop'); else this.setState('playing');
      }
    } else if (e.code === 'Escape') {
      if (this.state === 'shop') this.setState('intro');
    }
  }

  update(dt) {
    if (this.state === 'playing') {
      // 슬로우 효과
      const slowScale = this.slowActive ? 0.8 : 1.0;
      this.simTime += dt * slowScale;
      const step = dt * slowScale;
      // 입력 홀드 시간
      if (this.inputPressed) this.pressTime += step; else this.pressTime = 0;
      // 업데이트
      for (const r of this.ropes) r.update(step);
      this._updateFly(step);
      this.player.update(step);
      // 아이템 업데이트/자력 수집 (STAR는 자력 제외: 근접에서만)
      const collectR = 50 + (this.data.shopInventory.magnetLevel||0)*30;
      const starCollectR = 24;
      this.items = this.items.filter(it => {
        it.update(step);
        const dx = this.player.x - it.x;
        const dy = this.player.y - it.y;
        const d = Math.hypot(dx, dy);
        if (it.active) {
          if (it.kind === 'star') {
            if (d < starCollectR) { it.collect(); return false; }
          } else if (d < collectR) { it.collect(); return false; }
        }
        if (!it.active || it.x < this.cameraX - 80) { return false; }
        return true;
      });
      this._bufferRopes();
      this._cleanup();
      this._updateCamera(step);
      this._maybeWebShot();
      this._checkCatch();
      this._checkGameOver();
      // 스타 모드 타이머
      if (this.starModeActive && this.simTime >= this.starModeEnd) this._endStarMode();
    } else if (this.state === 'shop') {
      this.shop.update(dt);
    }

    // 파티클/UI 갱신
    this.particles.update(dt);
    this.ui.update(dt, this.data);
  }

  _updateCamera(dt) {
    const target = this.player.x - CONFIG.cameraOffset;
    this.cameraX += (target - this.cameraX) * CONFIG.cameraSmooth;
    this.world.x = -this.cameraX;
  }

  _drawGround() {
    const y = CONFIG.height - CONFIG.groundH;
    this.ground.clear();
    this.ground.beginFill(0x222638).drawRect(-100000, y, 200000, CONFIG.groundH).endFill();
    this.ground.lineStyle(2, 0xffffff, 0.12).moveTo(-100000, y).lineTo(100000, y);
  }

  _checkCatch() {
    if (this.player.mode !== 'free') return;
    if (this.simTime < this.catchLockUntil) return;
    // 가장 가까운 로프 팁 우선 시도(간단)
    for (let i = 0; i < this.ropes.length; i++) {
      const rope = this.ropes[i];
      if (rope === this.lastDetachedRope) continue;
      if (this.player.tryCatch(rope)) break;
    }
  }

  _checkGameOver() {
    // 바닥 충돌 즉시 처리
    const groundY = CONFIG.height - CONFIG.groundH;
    if (this.player.y >= groundY) {
      this.particles.megaDeath(this.player.x, groundY);
      this.gameOver();
      return;
    }
    if (this.player.y > CONFIG.height + 120 || this.player.x < this.cameraX - 120) {
      // 보호막/부활 처리
      if (this.shieldCharges > 0) {
        this.shieldCharges -= 1;
        // 튕겨 올리기
        this.player.vy = -CONFIG.jumpImpulse * 0.8;
        this.player.y = CONFIG.height * 0.6;
        this.particles.burst(this.player.x, this.player.y, 0x66ccff, 18);
        return;
      }
      if (this.revivalCharges > 0) {
        this.revivalCharges -= 1;
        this.player.vy = -CONFIG.jumpImpulse * 0.9;
        this.player.y = CONFIG.height * 0.5;
        this.player.x = this.cameraX + CONFIG.cameraOffset + 40;
        this.particles.burst(this.player.x, this.player.y, 0xffff66, 22);
        // 즉시 안전 로프 추가
        const r = new Rope(this, { anchorX: this.player.x + 80, anchorY: CONFIG.ceilingY, length: 160, amplitude: 0.25, omega: 2.0, phase: 0 });
        this.ropes.push(r); this.world.addChildAt(r.container, 0);
        return;
      }
      this.gameOver();
    }
  }

  _cleanup() {
    const minX = this.cameraX - CONFIG.width;
    this.ropes = this.ropes.filter(r => {
      if (r.anchorX < minX) { r.destroy(); return false; }
      return true;
    });
    // 아이템은 update에서 필터링
  }

  onCollectItem(kind){
    if (kind === 'extraJump') {
      this.player.airJumpsLeft++;
      this.particles.burst(this.player.x, this.player.y, 0x00ff00, 12);
    } else if (kind === 'wideCatch') {
      // 5초간 캐치 반경 증가
      const base = CONFIG.catchBase;
      const glowBonus = (this.data.shopInventory.glowLevel||0) * 0.167 * base;
      this.player.catchRadius = base + glowBonus + 10;
      setTimeout(()=>{
        this.player.catchRadius = base + glowBonus;
      }, 5000);
      this.particles.burst(this.player.x, this.player.y, 0x00ffff, 12);
    } else if (kind === 'bigSize') {
      this.player.sizeScale *= 1.5;
      this.player.drawBody();
      setTimeout(()=>{ this.player.sizeScale /= 1.5; this.player.drawBody(); }, 5000);
      this.particles.burst(this.player.x, this.player.y, 0xff00ff, 12);
    } else if (kind === 'star') {
      this._startStarMode();
    }
  }

  _startStarMode(){
    this.starModeActive = true;
    const bonus = (this.data.shopInventory.feverLevel||0) * 0.5;
    this.starModeEnd = this.simTime + (CONFIG.starDuration||3.0) + bonus;
    // 기존 로프/아이템 정리 후 촘촘한 로프 버퍼
    this.ropes.forEach(r=>r.destroy());
    this.ropes = [];
    this.items.forEach(it=>it.collect());
    this.items = [];
    // 즉시 버퍼링
    this._bufferRopes();
    this.particles.burst(this.player.x, this.player.y, 0xffff00, 28);
  }

  onDetach(rope){
    this.lastDetachedRope = rope;
    this.catchLockUntil = this.simTime + 0.12; // 120ms 정도 락
  }

  _updateFly(dt){
    if (!this.inputPressed) { this.flyActive = false; return; }
    if (this.player.mode !== 'free') return;
    // 공중 점프 소진 후, 플라이 1회 사용 가능
    if (this.flyCharges <= 0) return;
    if (!this.flyActive && this.pressTime >= CONFIG.flyHoldThreshold) {
      this.flyActive = true;
    }
    if (this.flyActive && this.flyHoldLeft > 0) {
      this.flyHoldLeft = Math.max(0, this.flyHoldLeft - dt);
      this.player.vy = CONFIG.flyUpVy;
      this.player.vx = Math.max(this.player.vx, CONFIG.flyMinFwd);
      if (this.flyHoldLeft <= 0) {
        this.flyActive = false;
        this.flyCharges -= 1;
      }
    }
  }

  _endStarMode(){
    this.starModeActive = false;
  }

  _maybeWebShot(){
    if (this.player.mode !== 'free') return;
    if (this.webCharges <= 0) return;
    // 낙하 중이고 낮은 위치에서 1회 긴급 웹샷
    if (this.player.vy > 120 && this.player.y > CONFIG.height * 0.55) {
      const ax = this.cameraX + CONFIG.maxAnchorX - 12;
      const r = new Rope(this, { anchorX: ax, anchorY: CONFIG.ceilingY, length: 160, amplitude: 0.3, omega: 2.0, phase: 0 });
      this.ropes.push(r); this.world.addChildAt(r.container, 0);
      // 즉시 붙기
      this.player.mode = 'attached';
      this.player.attached = r;
      this.player.usedAirJumps = 0;
      this.webCharges -= 1;
      // 소비 저장 반영
      this.data.shopInventory.webActive = false; this.data.save();
      this.particles.burst(this.player.x, this.player.y, 0x99ffcc, 16);
    }
  }
}

function rndRange(a, b) { return a + Math.random() * (b - a); }
function deg2rad(d){ return d * Math.PI / 180; }
