class ShopView {
  constructor(app) {
    this.app = app;
    this.container = new PIXI.Container();
    this.container.visible = false;
    this.mode = 'items'; // items | chars

    const titleStyle = new PIXI.TextStyle({ fontFamily: 'GameFont, "Press Start 2P", "Dalmoori", sans-serif', fontSize: 18, fill: 0xffffff, stroke: 0x000000, strokeThickness: 4 });
    this.title = new PIXI.Text('SHOP', titleStyle);
    this.title.anchor.set(0.5);
    this.title.position.set(CONFIG.width/2, 40);
    this.container.addChild(this.title);

    // 탭 버튼
    this.btnItems = this._makeButton(90, 70, 80, 28, 'ITEMS', () => { this.mode = 'items'; this.refresh(); });
    this.btnChars = this._makeButton(CONFIG.width-90, 70, 80, 28, 'CHARS', () => { this.mode = 'chars'; this.refresh(); });
    this.btnBack  = this._makeButton(50, 30, 70, 24, 'BACK', () => { this.hide(); this.app.setState('intro'); });
    this.btnHelp  = this._makeButton(CONFIG.width-50, 30, 50, 24, '?', () => this.toggleHelp());
    this.container.addChild(this.btnItems.box, this.btnChars.box, this.btnBack.box, this.btnHelp.box);

    // 카드 컨테이너 (페이지네이션)
    this.cardsLayer = new PIXI.Container();
    // 고정 뷰포트 (탭 밑 ~ 그리드 표시 영역)
    this.viewport = { x: Math.floor(CONFIG.width*0.06), y: 96, w: Math.floor(CONFIG.width*0.88), h: CONFIG.height - 96 - 80 };
    this.cardsMask = new PIXI.Graphics();
    this.cardsMask.beginFill(0x000000).drawRoundedRect(this.viewport.x, this.viewport.y, this.viewport.w, this.viewport.h, 10).endFill();
    this.cardsLayer.mask = this.cardsMask;
    this.container.addChild(this.cardsLayer, this.cardsMask);

    // 페이지 상태
    this.pageItems = 0;
    this.pageChars = 0;
    this.cols = 3;
    this.rows = 4; // 화면에 4줄만

    // 페이지 버튼
    this.btnPrev = this._makeButton(CONFIG.width/2 - 60, this.viewport.y + this.viewport.h + 18, 40, 24, '<', () => this.prevPage());
    this.btnNext = this._makeButton(CONFIG.width/2 + 60, this.viewport.y + this.viewport.h + 18, 40, 24, '>', () => this.nextPage());
    this.pageLabel = new PIXI.Text('1 / 1', { fontFamily:'GameFont, "Press Start 2P", "Dalmoori", sans-serif', fontSize: 12, fill: 0xffffff });
    this.pageLabel.anchor.set(0.5);
    this.pageLabel.position.set(CONFIG.width/2, this.viewport.y + this.viewport.h + 20);
    this.container.addChild(this.btnPrev.box, this.btnNext.box, this.pageLabel);

    // 스크롤 제거(페이지 전환만)

    // 도움말 레이어(마스크 스크롤)
    this.helpLayer = new PIXI.Container();
    this.helpLayer.visible = false;
    const mask = new PIXI.Graphics();
    mask.beginFill(0x0).drawRoundedRect(CONFIG.width*0.08, CONFIG.height*0.2, CONFIG.width*0.84, CONFIG.height*0.6, 12).endFill();
    this.helpLayer.mask = mask;
    this.helpBG = new PIXI.Graphics();
    this.helpBG.beginFill(0x000000, 0.9).drawRect(0,0,CONFIG.width, CONFIG.height).endFill();
    this.helpBox = new PIXI.Graphics();
    const hx = CONFIG.width*0.08, hy = CONFIG.height*0.2, hw = CONFIG.width*0.84, hh = CONFIG.height*0.6;
    this.helpBox.beginFill(0x222638).drawRoundedRect(hx, hy, hw, hh, 12).endFill();
    // dotted white border around help popup
    this.helpBorder = new PIXI.Graphics();
    this._dottedRect(this.helpBorder, hx, hy, hw, hh, 10, 8, 0xffffff, 1.0, 1.8);
    this.helpContent = new PIXI.Container();
    this.helpText = new PIXI.Text('', { fontFamily:'GameFont, "Press Start 2P", "Dalmoori", sans-serif', fontSize: 12, fill: 0xffffff, wordWrap: true, wordWrapWidth: CONFIG.width*0.8 });
    this.helpText.position.set(CONFIG.width*0.1, CONFIG.height*0.22);
    this.helpContent.addChild(this.helpText);
    this.helpLayer.addChild(this.helpBG, this.helpBox, this.helpBorder, this.helpContent, mask);
    this.container.addChild(this.helpLayer);
    this.helpScroll = 0;
    this.helpLayer.eventMode='static';
    this.helpLayer.on('wheel', (e)=>{ this.helpScroll += e.deltaY * 0.6; this.applyHelpScroll(); });
    this.helpLayer.on('pointerdown', (e)=>{ this.helpDragY = e.global.y; this.helpStart = this.helpScroll; });
    this.helpLayer.on('pointermove', (e)=>{ if(this.helpDragY!=null){ this.helpScroll = this.helpStart + (e.global.y - this.helpDragY); this.applyHelpScroll(); }});
    this.helpLayer.on('pointerup', ()=>{ this.helpDragY=null; });
    // click anywhere to close
    this.helpBG.eventMode = 'static';
    this.helpBG.cursor = 'pointer';
    this.helpBG.on('pointertap', ()=>{ this.helpLayer.visible = false; });

    // 바닥 여백 라인
    const bottomLine = new PIXI.Graphics();
    bottomLine.lineStyle(1, 0xffffff, 0.15).moveTo(12, CONFIG.height-40).lineTo(CONFIG.width-12, CONFIG.height-40);
    this.container.addChild(bottomLine);
  }

  _makeButton(x, y, w, h, label, onClick){
    const box = new PIXI.Graphics();
    box.beginFill(0x34495e).drawRoundedRect(-w/2,-h/2,w,h,8).endFill();
    const t = new PIXI.Text(label, { fontFamily:'GameFont, "Press Start 2P", "Dalmoori", sans-serif', fontSize: 12, fill: 0xffffff });
    t.anchor.set(0.5); t.position.set(0,0);
    box.position.set(x,y); box.addChild(t);
    box.eventMode = 'static'; box.cursor='pointer'; box.on('pointertap', onClick);
    return { box, t };
  }

  refresh() {
    this.cardsLayer.removeChildren();
    // 제목: 아이템/캐릭터 구분
    this.title.text = (this.mode === 'items') ? 'ITEM SHOP' : 'CHAR SHOP';

    const cols = this.cols;
    const rows = (this.mode === 'chars') ? (this.rows + 1) : this.rows; // 캐릭터 한 줄 추가
    const gap = 10, cw = 100, ch = 84;
    const startX = this.viewport.x + Math.floor((this.viewport.w - (cols * cw + (cols-1)*gap)) / 2);
    const startY = this.viewport.y + 6;
    const dataList = this.mode === 'items' ? this._visibleItems() : this._characters();
    const page = (this.mode === 'items') ? this.pageItems : this.pageChars;
    const pageSize = cols * rows;
    const totalPages = Math.max(1, Math.ceil(dataList.length / pageSize));
    const safePage = Math.max(0, Math.min(totalPages - 1, page));
    if (this.mode === 'items') this.pageItems = safePage; else this.pageChars = safePage;
    const startIdx = safePage * pageSize;
    const slice = dataList.slice(startIdx, startIdx + pageSize);
    slice.forEach((info, idx) => {
      const c = idx % cols, r = Math.floor(idx / cols);
      const gx = startX + c * (cw + gap);
      const gy = startY + r * (ch + gap);
      const card = this._makeCard(info, cw, ch);
      card.position.set(gx, gy);
      this.cardsLayer.addChild(card);
    });
    // 페이지 버튼 가시성 + 페이지 번호
    this.btnPrev.box.visible = safePage > 0;
    this.btnNext.box.visible = safePage < totalPages - 1;
    if (this.pageLabel) this.pageLabel.text = `${safePage + 1} / ${totalPages}`;
  }

  prevPage(){ if (this.mode==='items') { if (this.pageItems>0) { this.pageItems--; this.refresh(); } } else { if (this.pageChars>0) { this.pageChars--; this.refresh(); } } }
  nextPage(){ const data = this.mode==='items'?this._visibleItems():this._characters(); const totalPages = Math.max(1, Math.ceil(data.length / (this.cols*this.rows))); if (this.mode==='items') { if (this.pageItems < totalPages-1) { this.pageItems++; this.refresh(); } } else { if (this.pageChars < totalPages-1) { this.pageChars++; this.refresh(); } } }

  _visibleItems(){
    const lvl = this.app.data.level();
    return SHOP_ITEMS.filter(it => (it.minLevel||1) <= lvl).map(it => ({ type:'item', it }));
  }

  _characters(){
    const lvl = this.app.data.level();
    return Object.entries(PIXEL_CHARACTERS).map(([id, c]) => ({ type:'char', id, c, locked: (c.minLevel||1) > lvl }));
  }

  _makeCard(info, cw, ch){
    const g = new PIXI.Graphics();
    g.hitArea = new PIXI.Rectangle(0,0,cw,ch);
    // 배경 없음, 경계선만(아이템은 도트 테두리)
    if (info.type === 'item') {
      // 더 굵은 점선: 간격 6, 점 반지름 2.4
      this._dottedRect(g, 0, 0, cw, ch, 8, 6, 0xffffff, 1.0, 2.4);
    } else {
      // 캐릭터샵도 통일감 있게 도트 테두리(기본 굵기)
      this._dottedRect(g, 0, 0, cw, ch, 8, 8, 0xffffff, 1.0, 1.6);
    }
    const title = new PIXI.Text('', { fontFamily:'GameFont, "Press Start 2P", "Dalmoori", sans-serif', fontSize: 12, fill: 0xffffff });
    title.anchor.set(0.5,0);
    title.position.set(cw/2, 6);
    g.addChild(title);

    const label = new PIXI.Text('', { fontFamily:'GameFont, "Press Start 2P", "Dalmoori", sans-serif', fontSize: 10, fill: 0xdddddd });
    label.anchor.set(0.5,1);
    label.position.set(cw/2, ch-6);
    g.addChild(label);
    // 아이콘 레이어 (센터)
    const icon = new PIXI.Container();
    icon.position.set(cw/2, ch/2);
    g.addChild(icon);

    if (info.type === 'item') {
      const it = info.it;
      title.text = it.name;
      const lv = this.app.data.itemLevel(it.id);
      const price = this.app.data.nextPriceForItem(it.id);
      const maxed = this.app.data.isItemMaxed(it.id);
      const afford = this.app.data.savings >= price;
      label.text = maxed ? '' : `$${price}`;

      this._drawItemIcon(icon, it.id, 4); // 아이템 아이콘 크기 절반
      g.eventMode='static'; g.cursor='pointer';
      g.on('pointertap', () => { if(!maxed && afford) this.confirmPurchase({ kind:'item', id: it.id, price }); });

      // SOLD OUT / MAX 스탬프
      if (maxed) {
        const txt = (it.type === 'level') ? 'MAX' : 'SOLD OUT';
        // 배경만 어둡게: 반투명 박스 + 텍스트 스탬프(완전 불투명)
        this._dimBackground(g, cw, ch, 0.3);
        this._stampText(g, cw, ch, txt, (it.type==='level')?0x27ae60:0xff5555);
        g.cursor = 'default';
      } else if (!afford) {
        this._dimBackground(g, cw, ch, 0.2);
      }
    } else {
      const { id, c, locked } = info;
      title.text = c.name || id;
      const owned = this.app.data.ownsCharacter(id);
      const price = c.price || 0;
      // 캐릭터: 하단 라벨은 가격/레벨만, OWNED/SELECTED는 중앙 표기
      const isSelected = (this.app.data.selectedCharacter === id);
      label.text = locked ? `LV ${c.minLevel}` : (owned ? '' : `$${price}`);
      if (owned) {
        // 가운데에 OWNED 표기, 선택된 경우 SELECTED도 함께 표시(위쪽 오프셋)
        this._centerMark(g, cw, ch, 'OWNED', 0x27ae60, 10);
        if (isSelected) {
          this._centerMark(g, cw, ch, 'SELECTED', 0x66ccff, -10);
        }
      }
      if (locked) this._badge(g, cw, ch, 'LOCKED', 0x7f8c8d);
      this._drawCharacterIcon(icon, id, 2.5);
    
      g.eventMode='static'; g.cursor='pointer';
      g.on('pointertap', () => {
        if (locked) return;
        if (owned) {
          this.app.data.selectedCharacter = id; this.app.data.save();
          this.app.player.drawBody();
          this.app.particles.burst(CONFIG.width/2, CONFIG.height*0.85, 0x66ccff, 14);
          this.refresh();
          return;
        }
        this.confirmPurchase({ kind:'char', id, price: price||0 });
      });
    }

    return g;
  }

  _badge(g, cw, ch, text, color){
    const b = new PIXI.Graphics();
    b.beginFill(color).drawRoundedRect(6, ch-22, 64, 16, 6).endFill();
    const t = new PIXI.Text(text, { fontFamily:'GameFont, "Press Start 2P", "Dalmoori", sans-serif', fontSize: 10, fill: 0x000000 });
    t.anchor.set(0.5); t.position.set(6+32, ch-22+8);
    b.addChild(t); g.addChild(b);
  }

  show() { this.container.visible = true; }
  hide() { this.container.visible = false; }

  update(dt){}

  // 도움말/확인 모달/스크롤
  toggleHelp(){
    if (this.helpLayer.visible) { this.helpLayer.visible=false; return; }
    const lines = [];
    if (this.mode === 'items') {
      for (const it of this._visibleItems().map(x=>x.it)) {
        lines.push(`${it.name} - ${this._itemDesc(it.id)} (LV≥${it.minLevel||1})`);
      }
    } else {
      for (const [id, c] of Object.entries(PIXEL_CHARACTERS)) {
        const name = c.name || id; const desc = c.description || '';
        lines.push(`${name} - ${desc} (LV≥${c.minLevel||1})`);
      }
    }
    this.helpText.text = lines.join('\n\n');
    this.helpScroll = 0; this.applyHelpScroll();
    this.helpLayer.visible = true;
  }

  applyHelpScroll(){
    const maxScroll = Math.max(0, (this.helpText.height + 20) - (CONFIG.height*0.6));
    this.helpScroll = Math.max(0, Math.min(maxScroll, this.helpScroll));
    this.helpContent.y = -this.helpScroll;
  }

  confirmPurchase(info){
    // 모달 구성
    if (this.modal) { this.modal.destroy(); }
    const g = new PIXI.Container();
    const bg = new PIXI.Graphics();
    bg.beginFill(0x000000, 0.7).drawRect(0,0,CONFIG.width,CONFIG.height).endFill();
    const box = new PIXI.Graphics();
    const bw = CONFIG.width*0.86, bh = 120;
    const bx = (CONFIG.width-bw)/2, by = CONFIG.height*0.42;
    box.beginFill(0x222638).drawRoundedRect(bx,by,bw,bh,12).endFill();
    const title = new PIXI.Text('CONFIRM', { fontFamily:'GameFont, "Press Start 2P", "Dalmoori", sans-serif', fontSize: 14, fill: 0xffffff });
    title.anchor.set(0.5); title.position.set(CONFIG.width/2, by+20);
    const label = new PIXI.Text('', { fontFamily:'GameFont, "Press Start 2P", "Dalmoori", sans-serif', fontSize: 12, fill: 0xffffff, wordWrap:true, wordWrapWidth:bw-40 });
    label.anchor.set(0.5); label.position.set(CONFIG.width/2, by+54);
    const name = info.kind==='item' ? (SHOP_ITEMS.find(x=>x.id===info.id)?.name||info.id) : (PIXEL_CHARACTERS[info.id]?.name||info.id);
    label.text = `${name}  $${info.price}`;
    const yes = this._makeButton(CONFIG.width/2-60, by+bh-26, 90, 28, 'YES', ()=>{
      if (info.kind==='item') {
        const res = this.app.data.purchaseItem(info.id);
        if (!res.ok) this.app.particles.text(CONFIG.width/2, CONFIG.height*0.85, res.reason==='funds'?'Insufficient funds':'Maxed');
        else this.app.particles.burst(CONFIG.width/2, CONFIG.height*0.85, 0x66ff99, 16);
      } else {
        const ok = this.app.data.purchaseCharacter(info.id, info.price||0);
        if (ok) { this.app.player.drawBody(); } else { this.app.particles.text(CONFIG.width/2, CONFIG.height*0.85, 'Insufficient funds'); }
      }
      this.refresh(); this.container.removeChild(g); g.destroy();
    });
    const no = this._makeButton(CONFIG.width/2+60, by+bh-26, 90, 28, 'NO', ()=>{ this.container.removeChild(g); g.destroy(); });
    g.addChild(bg, box, title, label, yes.box, no.box);
    this.container.addChild(g); this.modal = g;
  }

  _itemDesc(id){
    const map = {
      fly: 'Hold to fly upward once per run.',
      plusjump: 'Extra air jump during free fall.',
      glow: 'Glow effect and +catch range per level.',
      buds: 'Adds trailing orbs to vertices (max = sides).',
      big: 'Grows by 2.5% per level (max = player level).',
      gamble: 'Next run earns 1.5x money (one-time).',
      web: 'Emergency web when falling (one-time).',
      magnet: 'Auto-collect items +30px per level.',
      shield: 'Prevent one fatal fall.',
      combo: 'Extra points when comboing catches.',
      slow: 'Slightly slow next run.',
      double: 'Double earnings this run (one-time).',
      lucky: 'More item spawns.',
      revival: 'Revive once on fail.',
      rainbow: 'Cosmetic effect.',
      fever: 'Longer fever mode.',
      bank: 'Earn +5% per level.',
    };
    return map[id] || '';
  }

  _dottedRect(g, x, y, w, h, r, step, color=0xffffff, alpha=1, dotR=1.5){
    g.lineStyle(0);
    g.beginFill(0x000000, 0.0).drawRoundedRect(x,y,w,h,r).endFill();
    g.beginFill(color, alpha);
    // 상하단
    for (let i = x + r; i <= x + w - r; i += step) {
      g.drawCircle(i, y + 2, dotR);
      g.drawCircle(i, y + h - 2, dotR);
    }
    // 좌우
    for (let j = y + r; j <= y + h - r; j += step) {
      g.drawCircle(x + 2, j, dotR);
      g.drawCircle(x + w - 2, j, dotR);
    }
    // 모서리
    g.drawCircle(x + r/2, y + r/2, dotR);
    g.drawCircle(x + w - r/2, y + r/2, dotR);
    g.drawCircle(x + r/2, y + h - r/2, dotR);
    g.drawCircle(x + w - r/2, y + h - r/2, dotR);
    g.endFill();
  }

  _stamp(g, cw, ch, text, color){
    // Deprecated: replaced by _stampText
  }

  _stampText(g, cw, ch, text, color){
    const t = new PIXI.Text(text, { fontFamily:'GameFont, "Press Start 2P", "Dalmoori", sans-serif', fontSize: 14, fill: color });
    t.anchor.set(0.5); t.position.set(cw/2, ch/2); t.rotation = -Math.PI/4;
    g.addChild(t);
  }

  _dimBackground(g, cw, ch, alpha){
    const dim = new PIXI.Graphics();
    dim.beginFill(0x000000, alpha).drawRoundedRect(2,2,cw-4,ch-4,6).endFill();
    g.addChild(dim);
  }

  _centerMark(g, cw, ch, text, color, yOffset=0){
    const t = new PIXI.Text(text, { fontFamily:'GameFont, "Press Start 2P", "Dalmoori", sans-serif', fontSize: 12, fill: color });
    t.anchor.set(0.5);
    t.position.set(cw/2, ch/2 + yOffset);
    g.addChild(t);
  }

  _drawPixels(container, grid, palette, pixelSize){
    const pix = new PIXI.Graphics();
    const rows = grid.length; const cols = grid[0].length;
    const ps = pixelSize || 2;
    const halfW = (cols * ps) / 2; const halfH = (rows * ps) / 2;
    for (let y=0;y<rows;y++){
      const row = grid[y];
      for (let x=0;x<cols;x++){
        const ch = row[x];
        const idx = parseInt(ch, 36);
        if (!idx || !palette[idx]) continue;
        pix.beginFill(palette[idx]).drawRect(x*ps - halfW, y*ps - halfH, ps, ps).endFill();
      }
    }
    container.addChild(pix);
  }

  _drawItemIcon(container, id, scale){
    const P = (hex)=>PIXI.utils.string2hex(hex);
    const pal = [0, P('#ffffff'), P('#00ff00'), P('#ff00ff'), P('#00ffff'), P('#ffcc00'), P('#ff5555'), P('#66ccff'), P('#00aaee')];
    const icons = {
      plusjump: [ '00020000','00020000','00222000','02222200','00020000','00020000','00020000','00000000' ],
      fly:      [ '20000002','22000022','02200220','00222200','00022000','00022000','00000000','00000000' ],
      web:      [ '00111100','01000010','10011001','10100101','10100101','10011001','01000010','00111100' ],
      magnet:   [ '06600060','66100666','66000666','66000666','66000666','06666660','00666600','00000000' ],
      shield:   [ '00060000','00666000','06666600','06666600','06666600','00666600','00066000','00000000' ],
      big:      [ '00000000','00222200','02222220','02222220','02222220','02222220','00222200','00000000' ],
      glow:     [ '00050000','00050000','05555550','00555000','05555550','00050000','00050000','00000000' ],
      buds:     [ '02000020','00020200','00022000','00255200','00022000','00020200','02000020','00000000' ],
      gamble:   [ '00000000','00050000','00505000','00050000','00050000','00505000','00050000','00000000' ],
      combo:    [ '00000000','00555500','05000500','05000000','05000000','05000500','00555500','00000000' ],
      slow:     [ '00000000','04444000','04000000','04444000','00000400','04444000','00000000','00000000' ],
      double:   [ '00000000','05000000','05000000','05555000','00005000','05005000','00000000','00000000' ],
      lucky:    [ '00000000','00222000','02202200','02222200','00222000','00020000','00000000','00000000' ],
      revival:  [ '00000000','06600660','66666666','66666666','06666660','00666600','00066000','00000000' ],
      rainbow:  [ '18888881','17777771','15555551','13333331','12222221','11111111','00000000','00000000' ],
      fever:    [ '00060000','00066000','00666600','06666660','00666600','00066000','00060000','00000000' ],
      bank:     [ '00000000','00555500','05000500','05555000','05000500','05555500','00000000','00000000' ],
    };
    const grid = icons[id] || ['00000000','00000000','00055000','00055000','00000000','00000000','00000000','00000000'];
    this._drawPixels(container, grid, pal, scale);
  }

  _drawCharacterIcon(container, id, scale){
    const ch = PIXEL_CHARACTERS[id];
    if (!ch || !ch.pixels || ch.pixels.length === 0) {
      const g = new PIXI.Graphics(); g.beginFill(0xffe066).drawCircle(0,0,10).endFill(); container.addChild(g); return;
    }
    const pal = [0];
    for (let i=0;i<ch.colors.length;i++) pal[i+1] = PIXI.utils.string2hex(ch.colors[i]);
    const grid = ch.pixels.map(row => row.map(v => (v||0).toString(10)).join(''));
    this._drawPixels(container, grid, pal, scale||2);
  }
}
