function renderIntro(g, time) {
  drawBackground(g);
  drawCenteredText(g, t('intro.title'), CONFIG.height * 0.28, 20);
  const blink = Math.sin(time * 3) > 0 ? 1 : 0.3;
  g.globalAlpha = blink;
  drawCenteredText(g, t('intro.pressStart'), CONFIG.height * 0.52, 14);
  g.globalAlpha = 1;
  
  // Shop buttons (if level >= 2)
  const lvl = getLevelByExp(exp);
  if (lvl >= 2) {
    const bw = 100, bh = 36;
    const spacing = 10;
    const totalWidth = bw * 2 + spacing;
    const startX = (CONFIG.width - totalWidth) / 2;
    const by = CONFIG.height * 0.65;
    
    // ITEMS button
    g.fillStyle = '#22334a';
    g.strokeStyle = '#b4c0d9';
    g.lineWidth = 2;
    g.fillRect(startX, by, bw, bh);
    g.strokeRect(startX, by, bw, bh);
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(t('common.items'), startX + bw/2, by + bh/2 + 1);
    
    // CHARS button
    const charsX = startX + bw + spacing;
    g.fillStyle = '#22334a';
    g.fillRect(charsX, by, bw, bh);
    g.strokeStyle = '#b4c0d9';
    g.strokeRect(charsX, by, bw, bh);
    g.fillStyle = '#ffffff';
    g.fillText(t('common.chars'), charsX + bw/2, by + bh/2 + 1);
  }
  
  // Guide button
  const footer = footerButtonRects();
  const guideBtn = footer.guide;
  g.fillStyle = '#22334a';
  g.strokeStyle = '#b4c0d9';
  g.lineWidth = 2;
  g.fillRect(guideBtn.x, guideBtn.y, guideBtn.w, guideBtn.h);
  g.strokeRect(guideBtn.x, guideBtn.y, guideBtn.w, guideBtn.h);
  g.fillStyle = '#ffffff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
  g.fillText(t('intro.guide'), guideBtn.x + guideBtn.w/2, guideBtn.y + guideBtn.h/2 + 1);

  // Settings button
  const settingsBtn = footer.settings;
  g.fillStyle = '#22334a';
  g.strokeStyle = '#b4c0d9';
  g.lineWidth = 2;
  g.fillRect(settingsBtn.x, settingsBtn.y, settingsBtn.w, settingsBtn.h);
  g.strokeRect(settingsBtn.x, settingsBtn.y, settingsBtn.w, settingsBtn.h);
  g.fillStyle = '#ffffff';
  g.fillText(t('intro.settings'), settingsBtn.x + settingsBtn.w/2, settingsBtn.y + settingsBtn.h/2 + 1);

  // Popup overlay
  if (showGuide) {
    g.save();
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fillRect(0, 0, CONFIG.width, CONFIG.height);
    const pw = CONFIG.width * 0.86;
    const ph = 150;
    const px = (CONFIG.width - pw) / 2;
    const py = CONFIG.height * 0.34;
    g.fillStyle = '#0f1a2a';
    g.strokeStyle = '#b4c0d9';
    g.lineWidth = 2;
    g.fillRect(px, py, pw, ph);
    g.strokeRect(px, py, pw, ph);
    const lines = translateList('guide.lines');
    g.fillStyle = '#ffffff';
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.font = `9px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    const baseGuideLine = 14;
    let ly = py + baseGuideLine;
    for (const line of lines) {
      g.fillText(line, px + 12, ly);
      ly += lineAdvance(baseGuideLine, line);
    }
    g.fillStyle = '#b4c0d9';
    g.font = `8px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.textAlign = 'center';
    g.fillText(t('common.clickAnywhereToClose'), px + pw/2, py + ph - 18);
    g.restore();
  }

  if (showSettings) {
    g.save();
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fillRect(0, 0, CONFIG.width, CONFIG.height);
    const pw = CONFIG.width * 0.7;
    const ph = Math.min(200, CONFIG.height * 0.5);
    const px = (CONFIG.width - pw) / 2;
    const py = CONFIG.height * 0.32;
    settingsPopupRect = { x: px, y: py, w: pw, h: ph };
    g.fillStyle = '#0f1a2a';
    g.strokeStyle = '#b4c0d9';
    g.lineWidth = 2;
    g.fillRect(px, py, pw, ph);
    g.strokeRect(px, py, pw, ph);
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'top';
    g.font = `12px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(t('settings.title'), px + pw / 2, py + 10);
    const langs = I18N_API ? I18N_API.getAvailableLanguages() : ['en'];
    const current = I18N_API ? I18N_API.getLanguage() : 'en';
    if (settingsFocusedIndex >= langs.length) settingsFocusedIndex = langs.length - 1;
    if (settingsFocusedIndex < 0) settingsFocusedIndex = 0;
    const optionTop = py + 40;
    const optionHeight = 26;
    settingsOptionRects = [];
    g.textAlign = 'left';
    for (let i = 0; i < langs.length; i++) {
      const code = langs[i];
      const label = t(`languages.${code}.name`);
      const oy = optionTop + i * optionHeight;
      const rect = { x: px + 20, y: oy - 6, w: pw - 40, h: optionHeight };
      settingsOptionRects.push(rect);
      const isFocused = i === settingsFocusedIndex;
      const isSelected = code === current;
      g.fillStyle = isFocused ? '#22334a' : 'transparent';
      if (isFocused) {
        g.fillRect(rect.x, rect.y, rect.w, rect.h);
      }
      g.fillStyle = '#ffffff';
      g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
      g.fillText(`${label} ${isSelected ? t('settings.currentMarker') : ''}`, rect.x + 10, oy);
    }
    g.textAlign = 'center';
    g.fillStyle = '#b4c0d9';
    g.font = `9px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(t('settings.help'), px + pw/2, py + ph - 18);
    g.restore();
  } else {
    settingsPopupRect = null;
    settingsOptionRects = [];
  }
}

function drawRope(g, rope) {
  const tip = rope.tip(simTime);
  const sx = rope.anchorX - camera.x;
  const sy = rope.anchorY;
  const tx = tip.x - camera.x;
  const ty = tip.y;
  // Line
  let stroke = '#b4c0d9';
  let lw = 2;
  if (starModeActive) {
    const pulse = 0.6 + 0.4 * Math.sin(simTime * 8);
    stroke = '#ffd966';
    lw = 3 + pulse;
    g.save();
    const prevComp = g.globalCompositeOperation;
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = 'rgba(255,217,102,0.35)';
    g.lineWidth = lw * 2.2;
    g.beginPath(); g.moveTo(sx, sy); g.lineTo(tx, ty); g.stroke();
    g.globalCompositeOperation = prevComp;
    g.restore();
  }
  // Flashing warning if this rope is about to snap while attached
  if (player.rope === rope && rope.breakAt) {
    const rem = Math.max(0, rope.breakAt - simTime);
    const pulse = (Math.sin(simTime * 12) * 0.5 + 0.5);
    stroke = rem < 0.5 ? '#ff5a5a' : '#ffa64d';
    lw = 2 + 1.5 * pulse;
  }
  g.strokeStyle = stroke;
  g.lineWidth = lw;
  g.beginPath();
  g.moveTo(sx, sy);
  g.lineTo(tx, ty);
  g.stroke();
  // Anchor dot
  g.fillStyle = starModeActive ? '#ffd966' : '#92a0bb';
  g.beginPath();
  g.arc(sx, sy, 3, 0, Math.PI * 2);
  g.fill();
  // Debug: tip-only catch radius and distance readout
  if (DEBUG) {
    const glowBonus = shopInv.glowLevel ? (shopInv.glowLevel * 0.167 * CONFIG.catchBase) : 0;
    const catchR = CONFIG.catchBase + glowBonus;
    g.save();
    g.fillStyle = 'rgba(255,105,180,0.12)';
    g.strokeStyle = 'rgba(255,105,180,0.5)';
    g.lineWidth = 1;
    g.beginPath();
    g.arc(tx, ty, catchR, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    // numeric debug
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.fillStyle = '#ff69b4';
    const dist = Math.hypot((tip.x - player.x), (tip.y - player.y));
    g.fillText(`d:${dist.toFixed(1)} r:${catchR.toFixed(1)}`, tx + 6, ty + 6);
    g.restore();
  }
  // Snap warning icon near tip if scheduled
  if (player.rope === rope && rope.breakAt) {
    const rem = Math.max(0, rope.breakAt - simTime);
    g.save();
    g.fillStyle = rem < 0.5 ? '#ff5a5a' : '#ffa64d';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.textAlign = 'center';
    g.textBaseline = 'bottom';
    g.fillText('!', tx, ty - 6);
    g.restore();
  }
}

function updateRun(dt) {
  const baseDt = dt;
  if (slowMoTimer > 0) {
    dt *= SLOW_MO_SCALE;
  }
  simTime += dt;
  if (slowMoTimer > 0) slowMoTimer = Math.max(0, slowMoTimer - baseDt);
  if (slowMoCooldown > 0) slowMoCooldown = Math.max(0, slowMoCooldown - baseDt);
  updateStageTransition(baseDt);
  const groundY = CONFIG.height - CONFIG.groundH;
  const collR = playerCollisionRadius();
  // reset per-step rope buffering flag
  ropesBufferedThisStep = false;

  // Star mode timeout
  if (starModeActive && simTime >= starModeEndTime) {
    starModeActive = false;
    // Keep existing ropes; normal spawning will take over
  }

  // Input
  if (Input.anyPressed()) {
    // Record press start for long-press detection
    pressStartAt = simTime;
    flyLongPressTriggered = false;
    if (player.mode === 'attached') {
      // Detach with momentum-carry jump
      const tip = player.rope ? player.rope.tip(simTime) : { vx: 0, vy: 0, th: 0 };
      player.mode = 'free';
      // carry over momentum from swing and add forward + upward impulse
      const upFactor = 0.8 + 0.2 * Math.cos(tip.th || 0); // near bottom stronger
      const js = CONFIG.jumpSpeedScale || 1;
      const speedMultiplier = fastModeEnabled ? 1.5 : 1.0;
      const baseForward = CONFIG.baseVx * js;
      let detVx = Math.max(CONFIG.minVx, Math.min(CONFIG.maxVx, ((tip.vx || 0) * js + baseForward) * speedMultiplier));
      let detVy = (tip.vy || 0) * js - (CONFIG.jumpImpulse * upFactor * js);
      // prevent instant re-catch on the same rope
      lastDetachedRope = player.rope;
      player.rope = null;
      catchLockUntil = simTime + 0.2; // 200ms lock
      // Base additional jumps: 1 for all levels; items can add more
      const abilityBonus = characterAirJumpBonus();
      const baseAir = Math.max(0, 1 + (shopInv.plusJump ? 1 : 0) + abilityBonus);
      airJumpsLeft = baseAir + (pendingExtraJump ? 1 : 0);
      // Reset per-jump fly availability on jump count reset (new jump phase)
      usedFlyThisRun = false;
      usedAirJumps = 0;
      // consume pending size scale on detach
      if (pendingSizeScale && pendingSizeScale > 0) {
        player.sizeScale = pendingSizeScale;
        pendingSizeScale = 0;
      } else {
        player.sizeScale = 1;
      }
      pendingExtraJump = false; // consume
      if (characterIs('wizard')) {
        const wizardSpeed = Math.max(0, CONFIG.wizardJumpSpeed || 0);
        const wizardImpulse = Math.max(0, CONFIG.wizardJumpImpulse || CONFIG.jumpImpulse);
        detVx = Math.max(CONFIG.minVx, Math.min(CONFIG.maxVx, wizardSpeed * speedMultiplier));
        detVy = -wizardImpulse;
        wizardFloatTimer = 2.0;
        wizardSpinTimer = wizardFloatTimer;
        const spinRevs = CONFIG.wizardSpinRevolutions || 0;
        wizardSpinRate = (spinRevs > 0 && wizardSpinTimer > 0) ? ((Math.PI * 2 * spinRevs) / wizardSpinTimer) : 0;
      } else {
        wizardFloatTimer = 0;
        wizardSpinTimer = 0;
        wizardSpinRate = 0;
      }
      const slowLevel = shopInv.slowLevel || 0;
      if (slowLevel > 0 && slowMoTimer <= 0 && slowMoCooldown <= 0) {
        const slowChance = Math.min(1, slowLevel * 0.1);
        if (Math.random() < slowChance) {
          slowMoTimer = SLOW_MO_DURATION;
          slowMoCooldown = SLOW_MO_COOLDOWN;
          spawnEffect('combo', player.x, player.y - 24, t('effects.slow'));
        }
      }
      player.vx = detVx;
      player.vy = detVy;
    } else {
      // allow air flaps? keep as single impulse only when pressed; optional
      if (airJumpsLeft > 0) {
        player.airFlap();
        airJumpsLeft -= 1;
        usedAirJumps += 1;
      }
    }
  }
  // Reset fly when not holding
  if (!Input.down) flyActiveRemaining = 0;

  // Update ropes buffer
  if (!webRopeJustCreated) {
    ensureRopesBuffered();
  }
  cleanupRopes();

  // Update stage bullets (after stage 5)
  const currentStage = Math.floor(score / 20) + 1;
  if (currentStage > 5 && !starModeActive) {
    // Calculate bullet interval: starts at 10s, decreases by 1s every 5 stages, minimum 5s
    const stagesAbove5 = Math.floor((currentStage - 1) / 5);
    stageBulletInterval = Math.max(5, 10 - stagesAbove5);

    // Spawn bullets
    stageBulletTimer += baseDt;
    if (stageBulletTimer >= stageBulletInterval) {
      stageBulletTimer = 0;
      // Spawn bullet from random position on right side
      const fromTop = Math.random() < 0.3; // 30% chance from top
      const fromBottom = !fromTop && Math.random() < 0.5; // 35% chance from bottom
      // 35% chance from right side

      let bulletX, bulletY, targetX, targetY;

      if (fromTop) {
        bulletX = camera.x + CONFIG.width * randRange(0.3, 0.9);
        bulletY = -20;
      } else if (fromBottom) {
        bulletX = camera.x + CONFIG.width * randRange(0.3, 0.9);
        bulletY = CONFIG.height + 20;
      } else {
        bulletX = camera.x + CONFIG.width + 40;
        bulletY = randRange(50, CONFIG.height - 50);
      }

      // Target near player with some randomness
      targetX = player.x + randRange(-30, 30);
      targetY = player.y + randRange(-30, 30);

      // Calculate velocity to aim at target
      const dx = targetX - bulletX;
      const dy = targetY - bulletY;
      const dist = Math.hypot(dx, dy);
      const speed = 220;

      stageBullets.push({
        x: bulletX,
        y: bulletY,
        vx: (dx / dist) * speed,
        vy: (dy / dist) * speed,
        radius: 12,
        life: 0
      });
    }

    // Update bullets
    for (let i = stageBullets.length - 1; i >= 0; i--) {
      const bullet = stageBullets[i];
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life += dt;

      // Check collision with player
      if (player.mode !== 'dead') {
        const dx = bullet.x - player.x;
        const dy = bullet.y - player.y;
        const dist = Math.hypot(dx, dy);

        // Check if buds can protect
        if (activeBudsCount > 0 && dist <= collR + bullet.radius) {
          // Buds takes the hit
          activeBudsCount = Math.max(0, activeBudsCount - 1);
          stageBullets.splice(i, 1);
          spawnEffect('burst', bullet.x, bullet.y);
          spawnEffect('combo', player.x, player.y - 24, t('effects.budsProtect'));
          continue;
        }

        // Direct hit on player
        if (dist <= collR + bullet.radius) {
          player.mode = 'dead';
          player.vx = 0;
          player.vy = 100;
          stageBullets.splice(i, 1);
          spawnEffect('burst', player.x, player.y);
          continue;
        }
      }

      // Remove off-screen bullets
      if (bullet.x < camera.x - 100) {
        stageBullets.splice(i, 1);
      }
    }
  }

  // Box pickup
  const magnetLevel = shopInv.magnetLevel || 0;
  const baseCatchR = CONFIG.catchBase;
  const magnetPullR = baseCatchR + magnetLevel * 10;
  const magnetPullSpeed = 140 + magnetLevel * 60; // px/s pull toward player when within magnet radius
  const budHitZones = computeBudHitZones();

  for (const b of boxes) {
    if (!b.active) continue;
    let dx = b.x - player.x;
    let dy = b.y - player.y;
    let dist = Math.hypot(dx, dy);

    if (magnetLevel > 0 && dist > baseCatchR && dist <= magnetPullR) {
      const pullStep = magnetPullSpeed * dt;
      const nx = dx / (dist || 1);
      const ny = dy / (dist || 1);
      b.x -= nx * pullStep;
      b.y -= ny * pullStep;
      dx = b.x - player.x;
      dy = b.y - player.y;
      dist = Math.hypot(dx, dy);
    }
    let caught = dist <= baseCatchR;
    if (!caught && budHitZones.length > 0) {
      for (let i = 0; i < budHitZones.length; i++) {
        const bud = budHitZones[i];
        const bdx = b.x - bud.x;
        const bdy = b.y - bud.y;
        if (Math.hypot(bdx, bdy) <= bud.r) {
          caught = true;
          break;
        }
      }
    }

    if (!caught) continue;

    b.active = false;
    const wobble = Math.sin(simTime * 3 + (b.phase || 0)) * 6;
    const displayY = b.y + wobble;

    if (b.kind === 'star') {
      starModeActive = true;
      const feverBonus = (shopInv.feverLevel || 0) * FEVER_BONUS_SECONDS;
      starModeEndTime = simTime + (CONFIG.starDuration || 3.0) + feverBonus;
      const worldX = b.x;
      const worldY = b.y;
      const targetWorldX = worldX;
      const targetWorldY = worldY;
      const anchorX = worldX + 80;
      const anchorY = CONFIG.ceilingY+40;
      const dxTip = targetWorldX - anchorX;
      const dyTip = targetWorldY - anchorY;
      let ropeLength = Math.hypot(dxTip, dyTip);
      let theta = Math.atan2(dxTip, dyTip);
      if (Math.abs(theta) < 0.02) theta = theta >= 0 ? 0.02 : -0.02;
      const A = Math.abs(theta);
      const phi = theta >= 0 ? 0 : Math.PI;
      const newWebRope = new Rope({
        anchorX,
        anchorY,
        L: ropeLength,
        A,
        omega: 0,
        phi,
        createdAt: simTime,
        isWebRope: true,
        webTargetL: 1,
        retractSpeed: 300,
        id: `r${nextRopeId++}`
      });
      ropes.length = 0;
      ropes.push(newWebRope);
      boxes.length = 0;
      player.rope = newWebRope;
      player.mode = 'attached';
      player.x = targetWorldX - camera.x;
      player.y = targetWorldY;
      player.vx = 0;
      player.vy = -140;
      lastDetachedRope = null;
      catchLockUntil = simTime + 0.2;
      webRopeJustCreated = true;
      spawnEffect('big', b.x, displayY);
    } else {
      spawnEffect('burst', b.x, displayY);
      if (b.kind === 'extraJump') pendingExtraJump = true;
      else if (b.kind === 'wideCatch') pendingCatchR = 50;
      else if (b.kind === 'bigSize') pendingSizeScale = 1.5;
      else if (b.kind === 'slow') {
        // Activate slow motion effect immediately
        slowMoTimer = SLOW_MO_DURATION;
        slowMoCooldown = 0; // Reset cooldown to allow immediate effect
        spawnEffect('sparkle', b.x, displayY);
        spawnEffect('combo', b.x, displayY - 24, t('effects.slow'));
      }
      else if (b.kind === 'roulette') {
        const spinDuration = CONFIG.rouletteSpinDuration || 2.4;
        rouletteState = {
          active: true,
          spinning: true,
          spinTimer: 0,
          spinDuration,
          displayOp: '?',
          displayValue: null,
          finalOp: null,
          finalValue: null,
          applied: false,
          nextShuffle: 0,
        };
        rouletteSummary = null;
      }
    }
  }

  // Update player
  player.update(dt, simTime);
  updateRoulette(dt);
  // Star trail particles while in fever mode
  if (starModeActive) {
    const px = player.x, py = player.y;
    const count = 2;
    for (let i = 0; i < count; i++) {
      particles.push({
        x: px + randRange(-4, 4),
        y: py + randRange(-4, 4),
        vx: randRange(-20, 20),
        vy: randRange(-10, 10),
        life: 0,
        ttl: 0.35 + Math.random() * 0.25,
        size: 1.2 + Math.random() * 1.6,
        color: '#ffd966',
        type: 'sparkle',
        twinkleFreq: 8 + Math.random() * 6,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }
  }
  // Detect long press for fly activation (only once per run, only when no jumps left)
  if (shopInv.fly && Input.down && !flyLongPressTriggered && !usedFlyThisRun) {
    const canTriggerFlyNow = characterIs('bird') ? (player.mode === 'free') : (player.mode === 'free' && airJumpsLeft <= 0);
    if (canTriggerFlyNow) {
      if (simTime - pressStartAt >= (CONFIG.flyHoldThreshold || 0.2)) {
        flyActiveRemaining = CONFIG.flyMaxHold || 1.0;
        flyLongPressTriggered = true;
        usedFlyThisRun = true; // consume fly ability for this run
      }
    }
  }
  // Apply fly effect while holding (free state only)
  if (shopInv.fly && Input.down && flyActiveRemaining > 0 && player.mode === 'free') {
    flyActiveRemaining = Math.max(0, flyActiveRemaining - dt);
    // gentle diagonal up: keep slight forward, negate gravity feel
    const upV = CONFIG.flyUpVy || -120; // px/s upwards
    const fwd = Math.max(CONFIG.minVx * 0.6, CONFIG.flyMinFwd || 120);
    player.vy = upV;
    player.vx = Math.max(player.vx, fwd);
  }

  // If rope is scheduled to snap and player is still attached, enforce snap after timer
  if (player.mode === 'attached' && player.rope && player.rope.breakAt && simTime >= player.rope.breakAt) {
    const tipNow = player.rope.tip(simTime);
    // Force detach without upward impulse (penalty)
    player.mode = 'free';
    comboCount = 0; // Reset combo on snap
    // carry minimal forward from tip, no extra upward boost
    const js = CONFIG.jumpSpeedScale || 1;
    player.vx = Math.max(CONFIG.minVx, Math.min(CONFIG.maxVx, (tipNow.vx || 0) * js + CONFIG.baseVx * 0.2 * js));
    player.vy = (tipNow.vy || 0) * js;
    spawnEffect('snap', tipNow.x, tipNow.y);
    lastDetachedRope = player.rope;
    player.rope.breakAt = null;
    player.rope = null;
    catchLockUntil = simTime + 0.1;
  }

  // Update effects
  updateParticles(dt);

  // Camera smoothing: avoid instant snap. Slide during both states.
  {
    const target = player.x - SCREEN_TARGET_X;
    const rate = (player.mode === 'attached') ? CONFIG.camFollowAttach : CONFIG.camFollowFree;
    const a = Math.min(1, rate * dt);
    camera.x += (target - camera.x) * a;
  }

  // Catch check (tip-only)
  if (player.mode === 'free') {
    for (let i = 0; i < ropes.length; i++) {
      const rope = ropes[i];
      // skip catch during cooldown or same rope immediately after detach
      if (simTime < catchLockUntil) continue;
      if (rope === lastDetachedRope) continue;
      const tip = rope.tip(simTime);
      const bx = tip.x, by = tip.y;
      const dx = bx - player.x;
      const dy = by - player.y;
      const glowBonus = shopInv.glowLevel ? (shopInv.glowLevel * 0.167 * CONFIG.catchBase) : 0;
      let catchR = (pendingCatchR > 0 ? pendingCatchR : CONFIG.catchBase) + glowBonus;
      if (starModeActive) catchR *= 1.5;
      let withinCatch = Math.hypot(dx, dy) <= catchR;

      if (!withinCatch && budHitZones.length > 0) {
        // Buds trailing orbs can snag ropes for the player
        for (let j = 0; j < budHitZones.length; j++) {
          const bud = budHitZones[j];
          const budDx = bx - bud.x;
          const budDy = by - bud.y;
          if (Math.hypot(budDx, budDy) <= bud.r) {
            withinCatch = true;
            break;
          }
        }
      }

      if (withinCatch) {
        // Attach
        player.mode = 'attached';
        player.rope = rope;
        wizardFloatTimer = 0;
        wizardSpinTimer = 0;
        wizardSpinRate = 0;
        const baseGained = starModeActive ? 3 : ((usedAirJumps === 0) ? 3 : (usedAirJumps === 1) ? 2 : 1);
        let rewardGain = baseGained;
        const kind = (baseGained === 3) ? 'big' : (baseGained === 2) ? 'medium' : 'small';
        const tipNow = rope.tip(simTime);
        spawnEffect(kind, tipNow.x, tipNow.y);

        const comboEligible = starModeActive || usedAirJumps === 0;
        if (comboEligible) {
          comboCount++;
          if (characterIs('pirate') && comboCount >= 2) {
            pirateBonusThisRun += 2;
          }
          if (comboCount >= 2) {
            spawnEffect('combo', player.x, player.y - 30, t('effects.comboCount', { combo: comboCount }));
          }
        } else {
          comboCount = 0;
        }
        const comboLevel = shopInv.comboLevel || 0;
        rewardGain = Math.max(1, Math.round(rewardGain));
        if (comboLevel > 0 && comboEligible && comboCount >= 2) {
          const bonus = comboLevel * Math.max(1, comboCount - 1) * COMBO_BONUS_PER_LEVEL;
          rewardGain += bonus;
        }
        const tailorCatchBonus = (rope.tailorBonus && characterIs('tailor')) ? rope.tailorBonus : 0;
        baseScoreForRewards += rewardGain;
        let scoreGain = rewardGain;
        if (characterIs('knight')) scoreGain *= 2;
        score += scoreGain;
        if (tailorCatchBonus > 0) {
          tailorCashBonusThisRun += tailorCatchBonus;
          spawnEffect('combo', player.x, player.y - 18, t('effects.tailorBonus', { amount: `$${tailorCatchBonus}` }));
          rope.tailorBonus = 0;
        }
        if (rope.stageGateStage != null && !rope.stageGateRewarded) {
          grantStageGateReward(rope);
        }
        // Schedule snap if EXP milestone reached (>= 10)
        if (exp >= 10 && !starModeActive) {
          if (Math.random() < CONFIG.ropeBreakProb) {
            rope.breakAt = simTime + 1.0; // snap after 1s unless player jumps
          } else {
            rope.breakAt = null;
          }
        } else {
          rope.breakAt = null;
        }
        // Avoid spawning two ropes in the same step due to camera shift
        if (!ropesBufferedThisStep) ensureRopesBuffered();
        lastDetachedRope = null;
        airJumpsLeft = 0; // reset jump count on attach
        usedAirJumps = 0;
        // reset size to normal on attach
        player.sizeScale = 1;
        // consume pending catch radius if used
        if (pendingCatchR > 0) pendingCatchR = 0;
        break;
      }
    }
  }

  // Game over if grounded while free
  if (player.y + collR >= groundY) {
    player.y = groundY - collR;
    comboCount = 0; // Reset combo on death
    if (characterIs('robot') && !robotReviveUsed) {
      robotReviveUsed = true;
      spawnEffect('robotBreak', player.x, groundY);
      const anchorX = player.x;
      const anchorY = CONFIG.ceilingY;
      const safeTipY = groundY - (collR + 12);
      // Rescue rope starts with its tip just above the ground so the robot doesn't instantly collide again.
      const ropeLength = Math.max(240, safeTipY - anchorY);
      const extraLift = 150;
      const retractAmount = 160 + extraLift;
      const ropeRetractTarget = Math.max(200, ropeLength - retractAmount);
      const webRope = new Rope({
        anchorX,
        anchorY,
        L: ropeLength,
        A: 0,
        omega: 0,
        phi: 0,
        createdAt: simTime,
        isWebRope: true,
        webTargetL: ropeRetractTarget,
        retractSpeed: 180,
        id: `r${nextRopeId++}`
      });
      ropes.push(webRope);
      player.rope = webRope;
      player.mode = 'attached';
      const tipNow = webRope.tip(simTime);
      player.x = tipNow.x;
      player.y = tipNow.y;
      player.vx = 0;
      player.vy = -100;
      lastDetachedRope = null;
      catchLockUntil = simTime + 0.2;
      airJumpsLeft = 0;
      usedAirJumps = 0;
      webRopeJustCreated = true;
      ensureRopesBuffered();
      return;
    }
    if (activeRevivalCharges > 0) {
      activeRevivalCharges = Math.max(0, activeRevivalCharges - 1);
      // Revival is now a single purchase, not consumable - don't modify shopInv
      hudConsumables = (hudConsumables || []).map((entry) => {
        if (!entry) return entry;
        if (entry.id !== 'revival') return entry;
        return { ...entry, count: activeRevivalCharges };
      }).filter((entry) => entry && (entry.count === undefined || entry.count > 0));
      spawnEffect('combo', player.x, player.y - 30, t('effects.revive'));
      const anchorX = player.x;
      const anchorY = CONFIG.ceilingY;
      const tipTarget = groundY - (collR + 24);
      const ropeLength = Math.max(220, tipTarget - anchorY);
      const retractTarget = Math.max(160, ropeLength - 200);
      const revivalRope = new Rope({
        anchorX,
        anchorY,
        L: ropeLength,
        A: 0,
        omega: 0,
        phi: 0,
        createdAt: simTime,
        isWebRope: true,
        webTargetL: retractTarget,
        retractSpeed: 220,
        id: `r${nextRopeId++}`
      });
      ropes.push(revivalRope);
      player.rope = revivalRope;
      player.mode = 'attached';
      const tipNow = revivalRope.tip(simTime);
      player.x = tipNow.x;
      player.y = tipNow.y;
      player.vx = 0;
      player.vy = -120;
      lastDetachedRope = null;
      catchLockUntil = simTime + 0.2;
      airJumpsLeft = 0;
      usedAirJumps = 0;
      webRopeJustCreated = true;
      ensureRopesBuffered();
      return;
    }
    // Ground break effect at impact
    spawnEffect('break', player.x, groundY);
    // Earnings and EXP: $1 and 1 EXP per point beyond 5 this run
    const baseEarned = Math.max(0, Math.floor(baseScoreForRewards - 5));
    let earnedMoney = baseEarned;
    let earnedExp = baseEarned;
    if (characterIs('pirate')) earnedMoney += pirateBonusThisRun;
    earnedMoney += tailorCashBonusThisRun;
    if (characterIs('knight')) {
      earnedMoney *= 2;
      earnedExp *= 2;
    }
    if (shopInv.gambleActive) {
      earnedMoney = Math.floor(earnedMoney * 1.5);
      earnedExp = Math.floor(earnedExp * 1.5);
      shopInv.gambleActive = false; // Consume gamble
      saveShopInv(shopInv);
      hudConsumables = (hudConsumables || []).filter((entry) => entry && entry.id !== 'gamble');
    }

    if (rouletteState && rouletteState.active) {
      finalizeRouletteSpin();
      if (rouletteState.finalOp != null && !rouletteState.applied) {
        const beforeMoney = earnedMoney;
        let afterMoney = beforeMoney;
        const op = rouletteState.finalOp;
        const val = rouletteState.finalValue || 0;
        if (op === '+') afterMoney = beforeMoney + val;
        else if (op === '-') afterMoney = beforeMoney - val;
        else if (op === 'x') afterMoney = beforeMoney * Math.max(1, val);
        afterMoney = Math.max(0, Math.floor(afterMoney));
        earnedMoney = afterMoney;
        rouletteSummary = { before: beforeMoney, after: afterMoney, op, value: val };
        rouletteState.applied = true;
      }
    }

    lastEarned = earnedMoney;
    lastExpEarned = earnedExp;
    // Compute potential level-up BEFORE applying demo resets (based on EXP)
    const prevLevel = getLevelByExp(exp);
    const newLevel = getLevelByExp(exp + earnedExp);
    if (newLevel > prevLevel) {
      gameOverLevelUp = { from: prevLevel, to: newLevel };
      levelUpPopupTimer = 0;
      // celebratory particles near screen center
      const cx = camera.x + CONFIG.width / 2;
      const cy = CONFIG.height * 0.36;
      spawnEffect('big', cx, cy);
    }
    if (earnedMoney > 0 || earnedExp > 0) {
      // Add to money and EXP
      savings += earnedMoney;
      exp += earnedExp;
      try {
        localStorage.setItem(SAVINGS_KEY, String(savings));
        localStorage.setItem(EXP_KEY, String(exp));
      } catch(_){}
    }
    tailorCashBonusThisRun = 0;
    pirateBonusThisRun = 0;
    baseScoreForRewards = 0;
    wizardFloatTimer = 0;
    wizardSpinTimer = 0;
    wizardSpinRate = 0;
    // Demo rule: if demo active and EXP exceeded 110P (>=111P), on game over you lose everything
    if (demoActive && exp > 110) {
      lastDemoLoss = true;
      demoActive = false;
      savings = 0;
      try {
        localStorage.setItem(SAVINGS_KEY, '0');
        localStorage.setItem(DEMO_DONE_KEY, '1');
        // Reset EXP and clear all items when demo ends
        exp = 0;
        localStorage.setItem(EXP_KEY, '0');
        shopInv = { ...SHOP_INV_DEFAULTS };
        saveShopInv(shopInv);
        saveShopInv(shopInv);
      } catch(_){}
    }
    best = Math.max(best, score);
    try {
      localStorage.setItem(BEST_SCORE_KEY, String(best));
    } catch(_) {}
    // End fever state on game over
    starModeActive = false;
    starModeEndTime = 0;
    State.current = 'gameover';
    // Clear current input edges and lock inputs briefly to avoid instant restart
    if (typeof UI !== 'undefined') UI.reset();
    Input.down = false; Input.justPressed = false;
    gameOverLockUntil = simTime + 0.2;
    gameOverTimer = 0;
    // Clear pending item effects on game over
    pendingExtraJump = false;
    pendingCatchR = 0;
    pendingSizeScale = 0;
    player.sizeScale = 1;
  }
}

function renderRun(g) {
  drawBackground(g);
  const rouletteGlint = rouletteState && rouletteState.active && rouletteState.spinning;
  // Fever overlay (star mode) or roulette glint
  if (starModeActive || rouletteGlint) {
    g.save();
    const time = simTime;
    if (starModeActive) {
      const pulse = 0.08 + 0.06 * (Math.sin(time * 6) * 0.5 + 0.5);
      g.fillStyle = `rgba(255,217,102,${pulse.toFixed(3)})`;
      g.fillRect(0, 0, CONFIG.width, CONFIG.height);
    }
    if (rouletteGlint) {
      const colors = ['#ff6ec7', '#ffd966', '#7dd3ff', '#9cff9c'];
      const segments = 9;
      const alphaBase = 0.4;
      const alphaPulse = 0.3;
      for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2 + time * 3.8;
        const grad = g.createLinearGradient(
          CONFIG.width / 2,
          CONFIG.height / 2,
          CONFIG.width / 2 + Math.cos(angle) * CONFIG.width,
          CONFIG.height / 2 + Math.sin(angle) * CONFIG.height
        );
        const color = colors[i % colors.length];
        const alpha = alphaBase + alphaPulse * (Math.sin(time * 12 + i) * 0.5 + 0.5);
        grad.addColorStop(0, color + '00');
        grad.addColorStop(0.35, color + '55');
        grad.addColorStop(1, color + Math.floor(alpha * 255).toString(16).padStart(2, '0'));
        g.fillStyle = grad;
        g.fillRect(0, 0, CONFIG.width, CONFIG.height);
      }
    }
    g.restore();
  }
  // Ropes behind player
  for (let i = 0; i < ropes.length; i++) drawRope(g, ropes[i]);
  // Draw boxes
  for (const b of boxes) {
    const sx = b.x - camera.x;
    const wobble = Math.sin(simTime * 3 + (b.phase || 0)) * 6;
    const sy = b.y + wobble;
    g.save();
    const size = 26;
    g.fillStyle = '#334d6e';
    g.strokeStyle = '#c8d6f0';
    g.lineWidth = 2;
    g.beginPath();
    g.rect(sx - size/2, sy - size/2, size, size);
    g.fill();
    g.stroke();
    // Draw unified question mark box pixel art for all items
    const boxArt = (typeof BOX_ITEM_ART !== 'undefined' && BOX_ITEM_ART.itemBox) ? BOX_ITEM_ART.itemBox : null;
    if (boxArt && boxArt.pixels && boxArt.palette) {
      const pixelSize = 2;
      const artWidth = boxArt.pixels[0].length * pixelSize;
      const artHeight = boxArt.pixels.length * pixelSize;
      const artX = sx - artWidth / 2;
      const artY = sy - artHeight / 2;

      for (let row = 0; row < boxArt.pixels.length; row++) {
        const line = boxArt.pixels[row];
        for (let col = 0; col < line.length; col++) {
          const char = line[col];
          const color = boxArt.palette[char];
          if (color) {
            g.fillStyle = color;
            g.fillRect(artX + col * pixelSize, artY + row * pixelSize, pixelSize, pixelSize);
          }
        }
      }
    } else {
      // Fallback to text if no pixel art
      g.fillStyle = '#fff';
      g.font = `11px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('?', sx, sy + 1);
    }
    g.restore();
  }

  // Draw stage bullets
  if (stageBullets && stageBullets.length > 0) {
    for (const bullet of stageBullets) {
      const sx = bullet.x - camera.x;
      const sy = bullet.y;

      // Draw bullet using the boss bullet sprite
      const sprite = BOSS_SPRITES && BOSS_SPRITES.bulletProjectile;
      if (sprite && sprite.pixels) {
        drawPixelSprite(g, sx, sy, sprite, 3);
      } else {
        // Fallback to simple circle
        g.save();
        g.fillStyle = '#ff6b6b';
        g.strokeStyle = '#ff3333';
        g.lineWidth = 2;
        g.beginPath();
        g.arc(sx, sy, bullet.radius, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        g.restore();
      }
    }
  }

  // Draw player with camera offset
  ctx.save();
  ctx.translate(-camera.x, 0);
  player.draw(g);
  if (DEBUG) {
    g.save();
    g.fillStyle = 'rgba(255,105,180,0.12)';
    g.strokeStyle = 'rgba(255,105,180,0.5)';
    g.lineWidth = 1;
    g.beginPath();
    const effR = pendingCatchR > 0 ? pendingCatchR : CONFIG.catchBase;
    g.arc(player.x, player.y, effR, 0, Math.PI*2);
    g.fill();
    g.stroke();
    g.restore();
  }
  ctx.restore();
  // Draw catch effects on top
  drawParticles(g);
  renderRouletteOverlay(g);

  // HUD
  g.fillStyle = '#ffffff';
  g.textAlign = 'left';
  g.textBaseline = 'top';
  g.font = `12px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
  g.fillText(t('hud.score', { score }), 12, 10);
  g.fillText(t('hud.best', { best }), 12, 28);
  g.textAlign = 'right';
  g.fillText(t('hud.savings', { amount: savings }), CONFIG.width - 12, 10);
  if (hudConsumables && hudConsumables.length > 0) {
    const iconScale = 3;
    const iconGap = 6;
    let offsetY = 26;
    for (const entry of hudConsumables) {
      if (!entry) continue;
      const sprite = getItemSprite(entry.id);
      if (!sprite || !sprite.pixels || !sprite.pixels.length) continue;
      const rows = sprite.pixels.length;
      const cols = sprite.pixels[0].length;
      const iconHeight = rows * iconScale;
      const iconWidth = cols * iconScale;
      const drawX = CONFIG.width - 12 - iconWidth;
      const drawY = offsetY;
      drawPixelSprite(g, drawX, drawY + iconHeight / 2, sprite, iconScale, 'left');
      if (entry.count && entry.count > 1) {
        g.textAlign = 'right';
        g.textBaseline = 'top';
        g.font = `8px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
        g.fillStyle = '#ffffff';
        g.fillText(`x${entry.count}`, CONFIG.width - 12, drawY + iconHeight + 2);
      }
      offsetY += iconHeight + iconGap;
    }
  }
  // Fever badge and timer
  if (starModeActive) {
    const rem = Math.max(0, starModeEndTime - simTime);
    g.textAlign = 'center';
    g.fillStyle = '#ffd966';
    g.font = `12px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(t('hud.fever'), CONFIG.width / 2, 10);
    // Timer bar under the title
    const bw = 120, bh = 6;
    const bx = (CONFIG.width - bw) / 2;
    const by = 26;
    g.fillStyle = 'rgba(255,255,255,0.15)';
    g.fillRect(bx, by, bw, bh);
    const ratio = Math.max(0, Math.min(1, rem / (CONFIG.starDuration || 3.0)));
    g.fillStyle = '#ffd966';
    g.fillRect(bx, by, bw * ratio, bh);
  }
  // Pending item indicators (move to left side, below level)
  g.textAlign = 'left';
  g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
  const itemText = `${pendingExtraJump ? '+J ' : ''}${pendingCatchR ? 'R+ ' : ''}${pendingSizeScale ? 'S+ ' : ''}`.trim();
  if (itemText) {
    g.fillStyle = '#ffd966';  // Yellow color for in-game items
    g.fillText(itemText, 12, 64);
  }
  // Level display
  g.fillStyle = '#ffffff';
  g.textAlign = 'left';
  g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
  g.fillText(t('hud.level', { level: getLevelByExp(exp) }), 12, 46);
}

function renderBoss(g) {
  g.save();
  g.translate(-camera.x, 0);
  if (bossBackgroundActive) drawBossBackground(g); else drawBackground(g);

  const battle = bossState ? bossState.battle : null;
  if (bossState) {
    const fallbackY = CONFIG.height * 0.4;
    if (bossState.type === 'bullet') {
      const villainY = battle ? battle.bossY : fallbackY;
      drawPixelSprite(g, camera.x + CONFIG.width - 8, villainY, BOSS_SPRITES.bossShooter, 4, 'right');
    } else if (bossState.type === 'collect') {
      const villainY = battle ? battle.bossY : fallbackY;
      drawPixelSprite(g, camera.x + CONFIG.width - 8, villainY, BOSS_SPRITES.bossCollector, 4, 'right');
    }
  }

  if (battle) {
    if (bossState.type === 'bullet') {
      for (const bullet of battle.bullets) {
        drawPixelSprite(g, bullet.x, bullet.y, BOSS_SPRITES.bulletProjectile, 3);
      }
    } else if (bossState.type === 'collect') {
      for (const box of battle.boxes) {
        drawPixelSprite(g, box.x, box.y, BOSS_SPRITES.cashBox, 3);
      }
    }
  }

  player.draw(g);

  g.restore();

  drawParticles(g);

  g.save();

  // Draw WARNING text during fade-in phase
  if (bossState && bossState.phase === 'boss_fade_in') {
    const blinkSpeed = 8; // Fast blinking speed
    const blink = Math.sin(simTime * blinkSpeed) > 0 ? 1 : 0.3;
    g.globalAlpha = blink * (bossState.fadeAlpha || 1); // Fade in with the character
    g.fillStyle = '#ff3333';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `32px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText('WARNING', CONFIG.width / 2, CONFIG.height / 2); // Centered vertically
    g.globalAlpha = 1;
  }

  g.fillStyle = '#ffffff';
  g.textAlign = 'center';
  g.textBaseline = 'top';
  g.font = `16px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
  const title = bossState ? t('boss.stageWithNumber', { stage: bossState.stageNumber }) : t('boss.stage');
  g.fillText(title, CONFIG.width / 2, 16);
  g.font = `12px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
  if (bossState && bossState.battle) {
    if (bossState.type === 'bullet') {
      const b = bossState.battle;
      g.fillText(t('boss.bulletHud', { shots: b.shotsFired, total: b.totalShots, dodged: b.dodged, required: b.requiredDodges }), CONFIG.width / 2, 40);
    } else if (bossState.type === 'slam') {
      const b = bossState.battle;
      const remain = Math.max(0, b.duration - b.bossTimer).toFixed(1);
      g.font = `26px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
      g.fillText(t('boss.slamHudProgress', { current: b.jumpCount || 0, goal: b.jumpGoal || 80 }), CONFIG.width / 2, CONFIG.height * 0.42);
      g.font = `12px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
      g.fillText(t('boss.slamHudTime', { seconds: remain }), CONFIG.width / 2, 40);
    } else if (bossState.type === 'collect') {
      const b = bossState.battle;
      g.fillText(t('boss.collectHud', { collected: b.collected, total: b.totalShots, missed: b.missed, allowed: b.missLimit }), CONFIG.width / 2, 40);
    }
  }
  if (bossState) {
    const infoKey = BOSS_HUD_TEXT[bossState.type];
    if (infoKey) {
      g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
      g.fillText(t(infoKey), CONFIG.width / 2, 56);
    }
  }
  g.restore();
}

function renderRouletteOverlay(g) {
  if (!rouletteState || !rouletteState.active) return;
  const rawOp = rouletteState.displayOp || '?';
  const displayOp = rawOp === 'x' ? '×' : rawOp;
  const displayValue = (rouletteState.displayValue !== null && rouletteState.displayValue !== undefined) ? rouletteState.displayValue : '?';
  const groundY = CONFIG.height - CONFIG.groundH;
  const boxW = 60;
  const boxH = 42;
  const gap = 16;
  const centerX = CONFIG.width / 2;
  const x1 = centerX - boxW - gap / 2;
  const x2 = centerX + gap / 2;
  const y = groundY + 8;

  g.save();
  g.textAlign = 'center';
  g.textBaseline = 'top';
  g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
  g.fillStyle = '#ffffff';
  g.fillText(t('roulette.title'), centerX, y - 14);

  function drawCell(x, label, highlight) {
    g.fillStyle = highlight ? 'rgba(47,71,99,0.42)' : 'rgba(34,51,74,0.32)';
    g.strokeStyle = '#9fb5d8';
    g.lineWidth = 2;
    g.beginPath();
    g.rect(x, y, boxW, boxH);
    g.fill();
    g.stroke();
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `20px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(label, x + boxW / 2, y + boxH / 2 + 2);
  }

  const settled = !rouletteState.spinning && rouletteState.finalOp != null;
  drawCell(x1, displayOp, settled);
  drawCell(x2, String(displayValue), settled);

  g.textAlign = 'center';
  g.textBaseline = 'top';
  g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
  if (rouletteState.spinning) {
    g.fillText(t('roulette.spinning'), centerX, y + boxH + 6);
  } else if (rouletteSummary && rouletteState.applied) {
    const opSymbol = rouletteSummary.op === 'x' ? '×' : rouletteSummary.op;
    g.fillText(t('roulette.formula', {
      before: rouletteSummary.before,
      op: opSymbol,
      value: rouletteSummary.value,
      after: rouletteSummary.after,
    }), centerX, y + boxH + 6);
  } else if (settled) {
    g.fillText(t('roulette.locked'), centerX, y + boxH + 6);
  }

  g.restore();
}

function computeBudHitZones() {
  const budsLevel = shopInv.budsLevel || 0;
  if (!budsLevel) return [];
  const budsCount = Math.min(6, budsLevel);
  const zones = [];
  const spin = simTime * 0.8;
  const level = getLevelByExp(exp);
  const levelScale = (level > 1) ? 1.3 : 1.0;
  const bigScale = 1 + 0.025 * (shopInv.bigLevel || 0);
  const baseX = player.x;
  const baseY = player.y;
  const isPixelChar = selectedCharacter !== 'default' && PIXEL_CHARACTERS[selectedCharacter];

  if (isPixelChar) {
    const charData = PIXEL_CHARACTERS[selectedCharacter];
    const pixelSize = 3 * player.sizeScale * bigScale * levelScale;
    const width = (charData.pixels[0]?.length || 8) * pixelSize;
    const height = (charData.pixels.length || 8) * pixelSize;
    const orbitR = Math.max(width, height) * 0.6 + 6;
    const baseRadius = 5.5 * player.sizeScale;
    for (let i = 0; i < budsCount; i++) {
      const baseAngle = spin + i * (Math.PI * 2 / budsCount);
      const wobble = Math.sin(simTime * 1.4 + i) * 0.2;
      const angle = baseAngle + wobble;
      const pulse = 1 + Math.sin(simTime * 2.5 + i) * 0.1;
      const offsetX = Math.cos(angle) * orbitR;
      const offsetY = Math.sin(angle) * orbitR * 0.9;
      zones.push({ x: baseX + offsetX, y: baseY + offsetY, r: baseRadius * pulse });
    }
  } else {
    const baseR = player.r * player.sizeScale * bigScale * levelScale;
    const childR = baseR * 0.32;
    const orbitR = baseR + childR * 1.6;
    for (let i = 0; i < budsCount; i++) {
      const baseAngle = spin + i * (Math.PI * 2 / budsCount);
      const wobble = Math.sin(simTime * 1.6 + i * 0.8) * 0.25;
      const angle = baseAngle + wobble;
      const offsetX = Math.cos(angle) * orbitR;
      const offsetY = Math.sin(angle) * orbitR * 0.92;
      const radius = childR;
      zones.push({ x: baseX + offsetX, y: baseY + offsetY, r: radius });
    }
  }

  return zones;
}

function updateGameOver(dt) {
  // allow particles to continue animating on game over
  updateParticles(dt);
  updateStageTransition(dt);
  // advance gameover local timer
  gameOverTimer += dt;
  levelUpPopupTimer += dt;
  const wait = CONFIG.gameOverWait || 5.0;
  // 잠금 기간 동안 입력을 소비/지우기
  if (gameOverTimer < wait) {
    if (typeof UI !== 'undefined') UI.reset();
    Input.down = false; Input.justPressed = false;
    return;
  }
  
  // Build buttons if not exist
  if (uiButtons.gameover.length === 0) {
    buildGameOverButtons();
  }
  
  // Check button clicks
  if (UI.clicked && State.current === 'gameover') {
    for (const button of uiButtons.gameover) {
      if (button.isClicked(UI.mx, UI.my)) {
        button.onClick();
        UI.reset();
        Input.down = false; Input.justPressed = false;
        return;
      }
    }
    
    // If no button clicked, restart game
    UI.reset();
    Input.down = false; Input.justPressed = false;
    resetRun();
    return;
  }
  
  // Restart on Space or Escape
  if (UI.keyPressed === 'Space' || UI.keyPressed === 'Escape') {
    UI.reset();
    Input.down = false; Input.justPressed = false;
    resetRun();
  }
}

function renderGameOver(g) {
  drawBackground(g);
  drawParticles(g);
  if (lastDemoLoss) {
    drawCenteredText(g, t('gameOver.title'), CONFIG.height * 0.30 - 20, 18, '#ff6666');
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'top';
    g.font = `12px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(t('gameOver.demoLossLine1'), CONFIG.width / 2, CONFIG.height * 0.40 - 20);
    g.fillText(t('gameOver.demoLossLine2'), CONFIG.width / 2, CONFIG.height * 0.46 - 20);
  } else {
    drawCenteredText(g, t('gameOver.title'), CONFIG.height * 0.30 - 20, 18, '#ff6666');
    drawCenteredText(g, t('hud.score', { score }), CONFIG.height * 0.40 - 20, 12);

    // Savings summary and next target
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'top';
    const y0 = CONFIG.height * 0.46 - 20;
    function nextLevelThreshold(val) {
      for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
        if (val < LEVEL_THRESHOLDS[i]) return LEVEL_THRESHOLDS[i];
      }
      return null;
    }
    let nextText;
    if (demoActive) {
      nextText = t('gameOver.nextDemo');
    } else {
      const next = nextLevelThreshold(exp);
      if (next) {
        const remaining = Math.max(0, next - exp);
        nextText = t('gameOver.nextLevel', { remaining });
      } else {
        nextText = t('gameOver.maxLevel');
      }
    }
    const earnedText = (lastEarned > 0 || lastExpEarned > 0)
      ? t('gameOver.earned', { money: lastEarned, exp: lastExpEarned })
      : t('gameOver.earnedHint');
    // Next Target line with Score font size (12px)
    g.font = `12px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(nextText, CONFIG.width / 2, y0);
    // Other lines with default small font (10px)
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    // EXP and $ in one line
    g.fillText(t('gameOver.stats', { exp, savings }), CONFIG.width / 2, y0 + 32);
    // Earn explanation three lines below
    g.fillText(earnedText, CONFIG.width / 2, y0 + 80);
    if (rouletteSummary) {
      const opSymbol = rouletteSummary.op === 'x' ? '×' : rouletteSummary.op;
      g.fillText(t('gameOver.rouletteResult', {
        before: rouletteSummary.before,
        op: opSymbol,
        value: rouletteSummary.value,
        after: rouletteSummary.after,
      }), CONFIG.width / 2, y0 + 96);
    } else if (rouletteState && rouletteState.active && rouletteState.finalOp != null) {
      const opSymbol = rouletteState.finalOp === 'x' ? '×' : rouletteState.finalOp;
      g.fillText(t('gameOver.roulettePending', { op: opSymbol, value: rouletteState.finalValue }), CONFIG.width / 2, y0 + 96);
    }
  }

  // Level-up popup when level increased this game over
  if (gameOverLevelUp) {
    const cx = CONFIG.width / 2;
    const cy = CONFIG.height * 0.22 - 20;
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `12px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(t('gameOver.levelUp', { level: gameOverLevelUp.to }), cx, cy);
  }
  const wait = CONFIG.gameOverWait || 5.0;
  const rem = Math.max(0, wait - gameOverTimer);
  if (rem > 0) {
    // Countdown until retry is enabled
    const sec = Math.ceil(rem);
    drawCenteredText(g, t('gameOver.retryCountdown', { seconds: sec }), CONFIG.height * 0.74 - 20, 10, '#b4c0d9');
  } else {
    drawCenteredText(g, t('gameOver.retryReady'), CONFIG.height * 0.74 - 20, 10, '#b4c0d9');
    // Shop buttons (Level >= 2)
    const lvl = getLevelByExp(exp);
    if (lvl >= 2) {
      const bw = 100, bh = 36;
      const spacing = 10;
      const totalWidth = bw * 2 + spacing;
      const startX = (CONFIG.width - totalWidth) / 2;
      const by = CONFIG.height * 0.80;
      
      // ITEMS button
      const itemsBx = startX;
      g.fillStyle = '#22334a';
      g.strokeStyle = '#b4c0d9';
      g.lineWidth = 2;
      g.fillRect(itemsBx, by, bw, bh);
      g.strokeRect(itemsBx, by, bw, bh);
      g.fillStyle = '#ffffff';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
      g.fillText(t('common.items'), itemsBx + bw/2, by + bh/2 + 1);
      
      // CHARS button
      const charsBx = startX + bw + spacing;
      g.fillStyle = '#22334a';
      g.fillRect(charsBx, by, bw, bh);
      g.strokeStyle = '#b4c0d9';
      g.strokeRect(charsBx, by, bw, bh);
      g.fillStyle = '#ffffff';
      g.fillText(t('common.chars'), charsBx + bw/2, by + bh/2 + 1);

      // Fast mode toggle (Level >= 8)
      if (lvl >= 8) {
        const bw = 160, bh = 24;
        const bx = (CONFIG.width - bw) / 2;
        const by = CONFIG.height * 0.80 + 80; // moved down by 30px
        g.fillStyle = fastModeEnabled ? '#4a6e33' : '#22334a';
        g.strokeStyle = '#b4c0d9';
        g.lineWidth = 2;
        g.fillRect(bx, by, bw, bh);
        g.strokeRect(bx, by, bw, bh);
        g.fillStyle = '#ffffff';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.font = `10px "Press Start 2P", monospace`;
        g.fillText(t('game.fastToggle', { state: commonText(fastModeEnabled ? 'on' : 'off') }), bx + bw/2, by + bh/2 + 1);
      }
    }
  }
}
