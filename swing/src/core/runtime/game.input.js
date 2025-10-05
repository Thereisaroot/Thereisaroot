// Simple input manager
const Input = {
  down: false,
  justPressed: false,
  anyPressed() {
    return this.justPressed;
  },
  endFrame() {
    this.justPressed = false;
  },
};

function onPress(e) {
  if (isFromDebug(e)) return; // ignore debug panel interactions
  e && e.preventDefault && e.preventDefault();
  // record pointer position for UI (intro)
  if (e && (e.clientX !== undefined || (e.touches && e.touches.length))) {
    const rect = canvas.getBoundingClientRect();
    const isTouch = e.touches && e.touches.length > 0;
    const cx = e.clientX !== undefined ? e.clientX : e.touches[0].clientX;
    const cy = e.clientY !== undefined ? e.clientY : e.touches[0].clientY;
    UI.mx = (cx - rect.left) * (CONFIG.width / rect.width);
    UI.my = (cy - rect.top) * (CONFIG.height / rect.height);
    
    // 터치 시작 위치 디버깅
    if (DEBUG && isTouch) console.log(`Touch start at: ${UI.mx.toFixed(0)}, ${UI.my.toFixed(0)} State: ${State.current}`);
    // Don't set UI.clicked on mousedown, wait for mouseup
    
    // Help popup drag disabled (no scroll)
  }
  if (!Input.down) {
    Input.down = true;
    Input.justPressed = true;
  }
}
function onRelease(e) {
  Input.down = false;
  
  // 모든 상태에서 위치 기록
  if (e && (e.clientX !== undefined || (e.changedTouches && e.changedTouches.length > 0))) {
    const rect = canvas.getBoundingClientRect();
    const isTouch = e.changedTouches && e.changedTouches.length > 0;
    
    if (e.clientX !== undefined) {
      // 마우스 이벤트
      UI.mx = (e.clientX - rect.left) * (CONFIG.width / rect.width);
      UI.my = (e.clientY - rect.top) * (CONFIG.height / rect.height);
    } else if (isTouch) {
      // 터치 이벤트
      const touch = e.changedTouches[0];
      UI.mx = (touch.clientX - rect.left) * (CONFIG.width / rect.width);
      UI.my = (touch.clientY - rect.top) * (CONFIG.height / rect.height);
      // 터치 이벤트 디버깅
      console.log(`Touch release at: ${UI.mx.toFixed(0)}, ${UI.my.toFixed(0)} State: ${State.current}`);
    }
    
    // Handle click on release for all states
    // 모바일에서도 클릭 및 버튼 터치가 잘 동작하도록 개선
    if (State.current === 'shop') {
      // Only trigger click if not dragging
      if (!shopDrag.hasMoved || shopConfirm) {
        UI.clicked = true;
        UI.justReleased = true;
      } else if (shopHelp && !helpDrag.hasMoved) {
        // For help popup, only trigger click if not dragging
        UI.clicked = true;
        UI.justReleased = true;
      }
    } else {
      // For other states, always set clicked on release
      UI.clicked = true;
      UI.justReleased = true;
    }
  } else {
    // 이벤트 정보가 없는 경우도 클릭 설정 (키보드 스페이스 등)
    UI.clicked = true;
    UI.justReleased = true;
  }
  
  // Reset drag states
  if (shopDrag.active) {
    shopDrag.active = false;
    shopDrag.hasMoved = false;
  }
  // Don't reset helpDrag.hasMoved here, we need it for the click check
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar') {
    if (isFromDebug(e)) return; // do not trigger game press from debug inputs
    onPress(e);
  }
});
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyV') {
    DEBUG = !DEBUG;
    const el = document.getElementById('debug-panel');
    if (el) el.hidden = !DEBUG;
  }
});
window.addEventListener('keydown', (e) => {
  if (isFromDebug(e)) return; // ignore UI key capture while editing debug
  if (e.code === 'Space') UI.keyPressed = 'Space';
  else if (e.code === 'Escape') UI.keyPressed = 'Escape';
  else if (e.code === 'ArrowDown') UI.keyPressed = 'ArrowDown';
  else if (e.code === 'ArrowUp') UI.keyPressed = 'ArrowUp';
  else if (e.code === 'ArrowLeft') UI.keyPressed = 'ArrowLeft';
  else if (e.code === 'ArrowRight') UI.keyPressed = 'ArrowRight';
  else if (e.code === 'Enter') UI.keyPressed = 'Enter';
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar' ) onRelease();
});
window.addEventListener('mousedown', onPress);
window.addEventListener('mouseup', (e) => onRelease(e));
window.addEventListener('touchstart', onPress, { passive: false });
window.addEventListener('touchend', (e) => {
  // 게임 캔버스에서만 preventDefault 호출
  const rect = canvas.getBoundingClientRect();
  if (e.changedTouches && e.changedTouches.length > 0) {
    const touch = e.changedTouches[0];
    const x = touch.clientX;
    const y = touch.clientY;
    // 캔버스 범위 내에서만 preventDefault
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      e.preventDefault();
    }
  }
  onRelease(e);
}, { passive: false });

// Mouse wheel support for shop scrolling
window.addEventListener('wheel', (e) => {
  if (State.current === 'shop') {
    e.preventDefault();
    // Disable all scrolling in shop (items and chars)
    return;
  }
}, { passive: false });

// Mouse move tracking for drag scroll
let lastMouseY = 0;
let helpDrag = { active: false, y0: 0, scroll0: 0, hasMoved: false, startY: 0 };
window.addEventListener('mousemove', (e) => {
  UI.mx = e.clientX;
  UI.my = e.clientY;
  lastMouseY = e.clientY;
  
  // Help popup drag disabled (no scroll)
  if (false) {
    const moveDistance = Math.abs(e.clientY - helpDrag.startY);
    if (moveDistance > 30) {  // Increased threshold to 30 pixels
      helpDrag.hasMoved = true;
    }
    const delta = helpDrag.y0 - e.clientY;
    const newScroll = helpDrag.scroll0 + delta;
    
    // Calculate max scroll based on shop mode
    let maxHelpScroll = 0;
    if (shopMode === 'chars') {
      // Character shop help - 5 characters at 45px each
      const chars = visibleCharacters();
      const charHeight = 45;
      const totalContentHeight = chars.length * charHeight;
      const viewportHeight = 230; // contentH from renderCharacterShop
      maxHelpScroll = Math.max(0, totalContentHeight - viewportHeight);
    } else {
      // Item shop help - calculate based on descriptions
      const lvl = getLevelByExp(exp);
      const visibleItems = getAllItemsSorted();
      const lineHeight = 14;
      const itemHeight = 36;
      const totalContentHeight = visibleItems.length * itemHeight;
      const viewportHeight = 230;
      maxHelpScroll = Math.max(0, totalContentHeight - viewportHeight);
    }
    
    shopHelpScroll = Math.max(0, Math.min(maxHelpScroll, newScroll));
  }
  // Handle shop items drag (only in character shop)
  else if (State.current === 'shop' && shopDrag.active && !shopHelp && !shopConfirm && shopMode === 'chars') {
    // Check if mouse moved enough to be considered a drag (threshold: 5px)
    const moveDistance = Math.abs(e.clientY - shopDrag.y0) + Math.abs(e.clientX - shopDrag.startX);
    if (moveDistance > 30) {  // Increased threshold to 30 pixels
      shopDrag.hasMoved = true;
    }
    
    const delta = shopDrag.y0 - e.clientY;
    shopScroll = shopDrag.scroll0 + delta;
    
    if (shopMode === 'chars') {
      // Character shop scroll limits
      const chars = visibleCharacters();
      const cols = 2;
      const cellH = CHAR_CARD_CELL_H;
      const gap = CHAR_CARD_VERTICAL_GAP;
      const titleY = CONFIG.height * 0.12;
      const top = titleY + 50;
      const rows = Math.ceil(chars.length / cols);
      const contentH = rows * (cellH + gap) - gap;
      const viewportH = CONFIG.height - top - 100;
      const maxScroll = Math.max(0, contentH - viewportH);
      shopScroll = Math.max(0, Math.min(maxScroll, shopScroll));
    } else {
      // Item shop scroll limits
      const { cols, cellW, cellH, marginX, top, paddingTop, paddingBottom } = shopGrid();
      const gap = 8;
      const lvl = getLevelByExp(exp);
      const items = getAllItemsSorted();
      const rows = Math.ceil(items.length / cols) || 1;
      const contentH = paddingTop + rows * (cellH + gap) - gap + paddingBottom;
      const viewportH = CONFIG.height - top - 90;
      const maxScroll = Math.max(0, contentH - viewportH);
      shopScroll = Math.max(0, Math.min(maxScroll, shopScroll));
    }
  }
});

// Touch move for mobile drag scroll
window.addEventListener('touchmove', (e) => {
  if (State.current === 'shop' && shopDrag.active && !shopHelp && !shopConfirm && shopMode === 'chars') {
    const touch = e.touches[0];
    // Check if touch moved enough to be considered a drag
    const moveDistance = Math.abs(touch.clientY - shopDrag.y0) + Math.abs(touch.clientX - shopDrag.startX);
    if (moveDistance > 30) {  // Increased threshold to 30 pixels
      shopDrag.hasMoved = true;
    }
    
    const delta = shopDrag.y0 - touch.clientY;
    shopScroll = shopDrag.scroll0 + delta;
    
    if (shopMode === 'chars') {
      // Character shop scroll limits
      const chars = visibleCharacters();
      const cols = 2;
      const cellH = CHAR_CARD_CELL_H;
      const gap = CHAR_CARD_VERTICAL_GAP;
      const titleY = CONFIG.height * 0.12;
      const top = titleY + 50;
      const rows = Math.ceil(chars.length / cols);
      const contentH = rows * (cellH + gap) - gap;
      const viewportH = CONFIG.height - top - 100;
      const maxScroll = Math.max(0, contentH - viewportH);
      shopScroll = Math.max(0, Math.min(maxScroll, shopScroll));
    } else {
      // Item shop scroll limits
      const { cols, cellW, cellH, marginX, top, paddingTop, paddingBottom } = shopGrid();
      const gap = 8;
      const lvl = getLevelByExp(exp);
      const items = getAllItemsSorted();
      const rows = Math.ceil(items.length / cols) || 1;
      const contentH = paddingTop + rows * (cellH + gap) - gap + paddingBottom;
      const viewportH = CONFIG.height - top - 90;
      const maxScroll = Math.max(0, contentH - viewportH);
      shopScroll = Math.max(0, Math.min(maxScroll, shopScroll));
    }
  }
}, { passive: false });



