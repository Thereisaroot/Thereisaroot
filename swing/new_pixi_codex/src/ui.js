class UIOverlay {
  constructor(app) {
    this.app = app;
    this.container = new PIXI.Container();

    // 상단 점수/정보
    const style = new PIXI.TextStyle({ fontFamily: 'GameFont, "Press Start 2P", "Dalmoori", sans-serif', fontSize: 14, fill: CONFIG.colors.ui, stroke: 0x000000, strokeThickness: 3 });
    this.scoreText = new PIXI.Text('SCORE 0', style);
    this.bestText = new PIXI.Text('', style);
    this.moneyText = new PIXI.Text('', style);
    this.scoreText.x = 8; this.scoreText.y = 8;
    this.bestText.x = 8; this.bestText.y = 30;
    this.moneyText.x = 8; this.moneyText.y = 52;
    this.container.addChild(this.scoreText, this.bestText, this.moneyText);

    // 센터 오버레이 텍스트
    const big = new PIXI.TextStyle({ fontFamily: 'GameFont, "Press Start 2P", "Dalmoori", sans-serif', fontSize: 28, fill: 0xffffff, stroke: 0x000000, strokeThickness: 4 });
    // 메인 타이틀/게임오버 타이틀
    this.centerTitle = new PIXI.Text('', big);
    this.centerTitle.anchor.set(0.5);
    this.centerTitle.position.set(CONFIG.width/2, CONFIG.height*0.32);
    this.container.addChild(this.centerTitle);
    // 서브 텍스트(스코어 등)
    const subStyle = new PIXI.TextStyle({ fontFamily: 'GameFont, "Press Start 2P", "Dalmoori", sans-serif', fontSize: 12, fill: 0xffffff, stroke: 0x000000, strokeThickness: 3 });
    this.centerInfo = new PIXI.Text('', subStyle);
    this.centerInfo.anchor.set(0.5);
    this.centerInfo.position.set(CONFIG.width/2, CONFIG.height*0.40);
    this.container.addChild(this.centerInfo);
    // 게임오버 배경 디밍
    this.shade = new PIXI.Graphics();
    this.shade.visible = false;
    this.container.addChildAt(this.shade, 0);

    // 블링크 텍스트 (인트로)
    const blinkStyle = new PIXI.TextStyle({ fontFamily: 'GameFont, "Press Start 2P", "Dalmoori", sans-serif', fontSize: 12, fill: 0xffff66, stroke: 0x000000, strokeThickness: 3 });
    this.blinkText = new PIXI.Text('PRESS START', blinkStyle);
    this.blinkText.anchor.set(0.5);
    this.blinkText.position.set(CONFIG.width/2, CONFIG.height*0.40);
    this.container.addChild(this.blinkText);
    this._blinkTime = 0;

    // 메뉴 버튼 그룹(인트로)
    this.menuLayer = new PIXI.Container();
    this.container.addChild(this.menuLayer);
    this.btnStart = this._makeButton(CONFIG.width/2, CONFIG.height*0.48, 180, 40, 'START', () => this.app.setState('playing'));
    this.btnItems = this._makeButton(CONFIG.width/2, CONFIG.height*0.58, 180, 40, 'ITEMS', () => { this.app.setState('shop'); this.app.shop.mode='items'; this.app.shop.refresh(); });
    this.btnChars = this._makeButton(CONFIG.width/2, CONFIG.height*0.68, 180, 40, 'CHARS', () => { this.app.setState('shop'); this.app.shop.mode='chars'; this.app.shop.refresh(); });
    this.menuLayer.addChild(this.btnStart.box, this.btnItems.box, this.btnChars.box);

    // 게임오버 버튼 그룹
    this.gameoverLayer = new PIXI.Container();
    this.container.addChild(this.gameoverLayer);
    this.btnRetry = this._makeButton(CONFIG.width/2, CONFIG.height*0.58, 180, 40, 'RESTART', () => this.app.setState('playing'));
    this.btnGoItems = this._makeButton(CONFIG.width/2 - 100, CONFIG.height*0.68, 120, 36, 'ITEMS', () => { this.app.setState('shop'); this.app.shop.mode='items'; this.app.shop.refresh(); });
    this.btnGoChars = this._makeButton(CONFIG.width/2 + 100, CONFIG.height*0.68, 120, 36, 'CHARS', () => { this.app.setState('shop'); this.app.shop.mode='chars'; this.app.shop.refresh(); });
    this.gameoverLayer.addChild(this.btnRetry.box, this.btnGoItems.box, this.btnGoChars.box);

    // 게임오버 설명 텍스트
    const small = new PIXI.TextStyle({ fontFamily: 'GameFont, "Press Start 2P", "Dalmoori", sans-serif', fontSize: 12, fill: 0xdddddd });
    this.hintText = new PIXI.Text('', small);
    this.hintText.anchor.set(0.5);
    this.hintText.position.set(CONFIG.width/2, CONFIG.height*0.8);
    this.container.addChild(this.hintText);

    this._showNone();
  }

  _makeButton(x, y, w, h, label, onClick){
    const box = new PIXI.Graphics();
    box.beginFill(0x34495e).drawRoundedRect(-w/2,-h/2,w,h,10).endFill();
    box.lineStyle(2, 0x223246).drawRoundedRect(-w/2,-h/2,w,h,10);
    const t = new PIXI.Text(label, { fontFamily:'GameFont, "Press Start 2P", "Dalmoori", sans-serif', fontSize: 14, fill: 0xffffff });
    t.anchor.set(0.5); t.position.set(0,0);
    box.addChild(t);
    box.position.set(x,y);
    box.eventMode='static'; box.cursor='pointer';
    box.on('pointertap', onClick);
    return { box, t };
  }

  _showNone(){
    this.menuLayer.visible = false;
    this.gameoverLayer.visible = false;
  }

  showIntro() {
    this.centerTitle.text = 'WEB SWING';
    this.centerInfo.text = '';
    // 제목 스타일 원복
    this.centerTitle.style.fill = 0xffffff;
    this.centerTitle.style.fontSize = 28;
    this._showNone();
    this.menuLayer.visible = true;
    this.hintText.text = '';
    this.blinkText.visible = true;
    }

  showGame() {
    this.centerTitle.text = '';
    this.centerInfo.text = '';
    this._showNone();
    this.hintText.text = '';
    this.blinkText.visible = false;
    // HUD on
    this.scoreText.visible = true;
    this.bestText.visible = true;
    this.moneyText.visible = true;
    this.shade.visible = false;
  }

  showGameOver(score, earned) {
    this.centerTitle.style.fill = 0xff5555;
    this.centerTitle.style.fontSize = 24;
    this.centerTitle.text = `GAME OVER`;
    this.centerInfo.text = `SCORE ${score}   +$${earned}`;
    this._showNone();
    this.gameoverLayer.visible = true;
    this.hintText.text = '';
    this.hintText.visible = false;
    this.blinkText.visible = false;
    // dim background
    this.shade.clear();
    this.shade.beginFill(0x000000, 0.8).drawRect(0,0,CONFIG.width, CONFIG.height).endFill();
    this.shade.visible = true;
  }

  showShop(){
    this.centerTitle.text = '';
    this.centerInfo.text = '';
    this._showNone();
    this.blinkText.visible = false;
    // HUD off in shop
    this.scoreText.visible = false;
    this.bestText.visible = false;
    this.moneyText.visible = false;
    this.shade.visible = false;
  }

  update(dt, data) {
    // HUD
    this.scoreText.text = `SCORE ${this.app.score}`;
    this.bestText.text = `BEST ${data.bestScore}`;
    this.moneyText.text = `$ ${data.savings}   LV ${this.app.data.level()}`;
    // Blink
    this._blinkTime += dt || 0;
    const a = 0.5 + 0.5 * Math.sin(this._blinkTime * 6.0);
    if (this.blinkText.visible) this.blinkText.alpha = a;
  }
}
