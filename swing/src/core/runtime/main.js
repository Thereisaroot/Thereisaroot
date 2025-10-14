// Main loop with fixed timestep physics
let last = performance.now();
let acc = 0;
const dt = 1 / 120; // physics step

function applyStoredLanguagePreference() {
  const api = (typeof window !== 'undefined') ? window.I18N : null;
  if (!api || typeof api.setLanguage !== 'function') return;
  const stored = (typeof loadLanguagePreference === 'function') ? loadLanguagePreference() : null;
  if (stored) {
    let manualStored = false;
    try {
      manualStored = localStorage.getItem('webswing_lang_manual') === '1';
    } catch (_) {}
    if (!manualStored) {
      const current = (typeof api.getLanguage === 'function') ? api.getLanguage() : null;
      if (current && current !== stored) {
        try {
          localStorage.setItem('webswing_lang', current);
        } catch (_) {}
      }
      return;
    }
    const available = typeof api.getAvailableLanguages === 'function'
      ? api.getAvailableLanguages()
      : null;
    if (Array.isArray(available) && available.length > 0 && !available.includes(stored)) return;
    if (typeof api.getLanguage === 'function' && api.getLanguage() === stored) return;
    api.setLanguage(stored);
    return;
  }
  if (typeof setLocaleFromEnvironment === 'function') {
    const applied = setLocaleFromEnvironment(api);
    if (applied) return;
  }
  const current = (typeof api.getLanguage === 'function') ? api.getLanguage() : null;
  if (!current) {
    api.setLanguage('en', { manual: false });
  }
}

async function start() {
  applyStoredLanguagePreference();
  if (typeof maybeLoadNativeAppInfo === 'function') {
    try {
      await maybeLoadNativeAppInfo();
    } catch (_) {}
  }
  await Fonts.load();
  if (typeof preloadRuntimeImages === 'function') {
    try {
      await preloadRuntimeImages();
    } catch (_) {}
  }
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
    let storedDemoRuns = 0;
    try {
      const rawRuns = localStorage.getItem(DEMO_RUN_COUNT_KEY);
      if (rawRuns) {
        const val = parseInt(rawRuns, 10);
        if (!Number.isNaN(val)) storedDemoRuns = Math.max(0, val);
      }
    } catch (_) {}
    demoRunCount = storedDemoRuns;
    
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
      selectedCharacter = 'wizard';
      try { localStorage.setItem('webswing_selected_char_v1', 'wizard'); } catch (_) {}
    }
    if (demoDone) {
      demoRunCount = 0;
      try { localStorage.removeItem(DEMO_RUN_COUNT_KEY); } catch (_) {}
    }
    const hasPref = (typeof hasTutorialPreference === 'function') && hasTutorialPreference();
    if (!demoDone && !hasPref) {
      if (typeof setTutorialEnabled === 'function') setTutorialEnabled(true, false);
    }
  } catch (_) {}
  // Load shop inventory
  shopInv = loadShopInv(shopInv);
  if (typeof ensurePlayerStats === 'function') ensurePlayerStats();
  if (typeof getPlayerStats === 'function') {
    const stats = getPlayerStats();
    if (stats) {
      const expGap = Math.max(0, exp - (Number(stats.totalExpEarned) || 0));
      if (expGap > 0) addToPlayerStat && addToPlayerStat('totalExpEarned', expGap);
      const cashGap = Math.max(0, savings - (Number(stats.totalCashEarned) || 0));
      if (cashGap > 0) addToPlayerStat && addToPlayerStat('totalCashEarned', cashGap);
      if (!stats.recordsBootstrapped) {
        stats.recordsBootstrapped = true;
        markPlayerStatsDirty && markPlayerStatsDirty();
        flushPlayerStats && flushPlayerStats();
      }
    }
  }
  if (selectedCharacter === 'wizard') {
    const ownsWizard = shopInv.characters && shopInv.characters.includes('wizard');
    if (!ownsWizard && !demoActive) {
      selectedCharacter = 'default';
      try { localStorage.setItem('webswing_selected_char_v1', 'default'); } catch (_) {}
    }
  }
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
    shopInv.powerJump = true;
    shopInv.startSkill = true;
    shopInv.fly = true;
    shopInv.characters = Array.isArray(shopInv.characters) ? shopInv.characters.slice() : [];
    if (!shopInv.characters.includes('wizard')) {
      shopInv.characters.push('wizard');
    }
    saveShopInv(shopInv);
  }

  let forceGameOver = false;
  if (typeof IS_NATIVE_APP !== 'undefined' && IS_NATIVE_APP && typeof nativeLivesRemaining === 'function') {
    try {
      if (typeof ensureDailyState === 'function') ensureDailyState();
    } catch (_) {}
    const livesRemaining = nativeLivesRemaining();
    if (Number.isFinite(livesRemaining) && livesRemaining <= 0) {
      forceGameOver = true;
    }
  }

  if (forceGameOver) {
    State.current = 'gameover';
    const wait = typeof CONFIG !== 'undefined' && CONFIG && Number.isFinite(CONFIG.gameOverWait)
      ? Math.max(0, CONFIG.gameOverWait)
      : 5;
    gameOverTimer = wait;
    if (uiButtons && uiButtons.gameover) uiButtons.gameover = [];
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
    let popupActive = false;
    if (typeof SkillSystem !== 'undefined' && SkillSystem && typeof SkillSystem.update === 'function') {
      const skillStatus = SkillSystem.update(dt);
      if (skillStatus && skillStatus.active) {
        popupActive = true;
        if (typeof handleSkillSelectionInput === 'function') {
          handleSkillSelectionInput(dt);
        }
      }
    }

    if (!popupActive) {
      if (State.current === 'intro') updateIntro(dt);
      else if (State.current === 'run') updateRun(dt);
      else if (State.current === 'gameover') updateGameOver(dt);
      else if (State.current === 'shop') updateShop(dt);
      else if (State.current === 'boss_pending') updateBossPending(dt);
      else if (State.current === 'boss') updateBoss(dt);
    }
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
