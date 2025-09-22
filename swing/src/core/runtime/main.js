// Main loop with fixed timestep physics
let last = performance.now();
let acc = 0;
const dt = 1 / 120; // physics step

async function start() {
  await Fonts.load();
  // Load tuning then apply
  tuning = loadTuningLocal(tuning);
  await maybeLoadTuningFromServer();
  applyTuningToConfig(CONFIG, tuning);
  setupDebugUI(tuning, () => applyTuningToConfig(CONFIG, tuning), () => saveTuningLocal(tuning));
  // Keep panel hidden until toggled by V
  const dbg = document.getElementById('debug-panel'); if (dbg) dbg.hidden = !DEBUG;
  // Load savings and EXP from localStorage
  try {
    const rawBest = localStorage.getItem(BEST_SCORE_KEY);
    if (rawBest) {
        const val = parseInt(rawBest, 10);
        if (!Number.isNaN(val)) best = Math.max(0, val);
    }
    const rawSav = localStorage.getItem(SAVINGS_KEY);
    if (rawSav) {
      const val = parseInt(rawSav, 10);
      if (!Number.isNaN(val)) savings = Math.max(0, val);
    }
    const rawExp = localStorage.getItem(EXP_KEY);
    if (rawExp) {
      const v = parseInt(rawExp, 10);
      if (!Number.isNaN(v)) exp = Math.max(0, v);
    } else if (savings > 0) {
      // Migration: if EXP not set, seed EXP with previous savings
      exp = savings;
      localStorage.setItem(EXP_KEY, String(exp));
    }
    const demoDone = localStorage.getItem(DEMO_DONE_KEY) === '1';
    
    // Load selected character
    const savedChar = localStorage.getItem('webswing_selected_char_v1');
    if (savedChar && PIXEL_CHARACTERS[savedChar]) {
      selectedCharacter = savedChar;
    }
    if (selectedCharacter === 'bird' && !shopInv.fly) {
      selectedCharacter = 'default';
      try { localStorage.setItem('webswing_selected_char_v1', 'default'); } catch (_) {}
    }
    if (!demoDone) {
      demoActive = true;
      if (savings < 100) {
        savings = 100;
        localStorage.setItem(SAVINGS_KEY, String(savings));
      }
    }
  } catch (_) {}
  // Load shop inventory
  shopInv = loadShopInv(shopInv);
  // Demo mode: grant EXP and equip core items so the character looks different
  if (demoActive) {
    try {
      if (exp < 100) {
        exp = 100;
        localStorage.setItem(EXP_KEY, String(exp));
      }
    } catch(_){}
    // Equip Glow, +Jump, Fly during demo
    shopInv.glowLevel = 1;
    shopInv.plusJump = true;
    shopInv.fly = true;
    saveShopInv(shopInv);
  }
  requestAnimationFrame(tick);
}

function tick(now) {
  const elapsed = Math.min(0.05, (now - last) / 1000);
  last = now;
  acc += elapsed;

  // Clear
  ctx.clearRect(0, 0, CONFIG.width, CONFIG.height);

  // Update with fixed dt
  while (acc >= dt) {
    if (State.current === 'intro') updateIntro(dt);
    else if (State.current === 'run') updateRun(dt);
    else if (State.current === 'gameover') updateGameOver(dt);
    else if (State.current === 'shop') updateShop(dt);
    else if (State.current === 'boss_pending') updateBossPending(dt);
    else if (State.current === 'boss') updateBoss(dt);
    acc -= dt;
    Input.endFrame();
  }
  webRopeJustCreated = false;
    // Render
  if (State.current === 'intro') renderIntro(ctx, now / 1000);
  else if (State.current === 'run') renderRun(ctx);
  else if (State.current === 'gameover') renderGameOver(ctx);
  else if (State.current === 'shop') renderShop(ctx);
  else if (State.current === 'boss_pending') renderRun(ctx);
  else if (State.current === 'boss') renderBoss(ctx);

  requestAnimationFrame(tick);
}

// Notes for next steps:
// - Add Rope class (anchor, L, A, omega, phase) and single-rope attach/detach.
// - Then implement multi-rope spawner with reachability guarantee.
// Start the game
start();
