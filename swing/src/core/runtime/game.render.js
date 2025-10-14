function drawUIButtonRect(g, button, options = {}) {
  if (!button) return;
  const disabled = options.disabled ?? button.disabled;
  const labelRaw = typeof button.labelText === 'function'
    ? button.labelText()
    : (typeof button.label === 'function' ? button.label() : button.label);
  const label = labelRaw != null ? String(labelRaw) : '';
  const font = options.font || `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
  const fill = options.fill || (disabled ? '#192235' : '#22334a');
  const stroke = options.stroke || (disabled ? '#3a4358' : '#b4c0d9');
  const textColor = options.textColor || (disabled ? '#7a849c' : '#ffffff');
  g.fillStyle = fill;
  g.strokeStyle = stroke;
  g.lineWidth = options.lineWidth || 2;
  g.fillRect(button.x, button.y, button.w, button.h);
  g.strokeRect(button.x, button.y, button.w, button.h);
  g.fillStyle = textColor;
  g.textAlign = options.textAlign || 'center';
  g.textBaseline = options.textBaseline || 'middle';
  g.font = font;
  const textX = button.x + (options.textOffsetX || button.w / 2);
  const textY = button.y + (options.textOffsetY || button.h / 2 + 1);
  if (label) g.fillText(label, textX, textY);
}

const GAME_OVER_TIP_KEYS = [
  'gameOver.tips.jumpItem',
  'gameOver.tips.wizard',
  'gameOver.tips.fever',
  'gameOver.tips.records',
  'gameOver.tips.scoreHint',
  'gameOver.tips.airJump',
];

const ROPE_GLIDE_CATCH_BONUS = [0, 5, 10, 20];
const ROPE_GLIDE_HANDLE_SCALE = [1, 1.25, 1.45, 1.65];
const AIR_COMBO_TRIGGER_CHANCE = [0, 0.2, 0.4, 0.6];
const CASH_MAGNET_PULL_BONUS = [0, 15, 30, 50];
const SKY_HARVEST_CASH_BONUS = [0, 1, 2, 3];
const FEVER_EXTENSION_BONUS = [0, 0.2, 0.35, 0.5];
const VOID_MAGNET_INTERVAL_SEC = (typeof VOID_MAGNET_INTERVAL === 'number') ? VOID_MAGNET_INTERVAL : 20;
const VOID_MAGNET_LIFETIME_SEC = (typeof VOID_MAGNET_LIFETIME === 'number') ? VOID_MAGNET_LIFETIME : 3;
const VOID_MAGNET_RADIUS_PX = (typeof VOID_MAGNET_RADIUS === 'number') ? VOID_MAGNET_RADIUS : 200;
const VOID_MAGNET_PULL_SPEED_PX = (typeof VOID_MAGNET_PULL_SPEED === 'number') ? VOID_MAGNET_PULL_SPEED : 260;

function performDetach(powerRatio = 0) {
  const tip = player.rope ? player.rope.tip(simTime) : { vx: 0, vy: 0, th: 0 };
  player.mode = 'free';
  const upFactor = 0.8 + 0.2 * Math.cos(tip.th || 0);
  const js = CONFIG.jumpSpeedScale || 1;
  const speedMultiplier = fastModeEnabled ? 1.5 : 1.0;
  const baseForward = CONFIG.baseVx * js;
  let detVx = Math.max(
    CONFIG.minVx,
    Math.min(CONFIG.maxVx, ((tip.vx || 0) * js + baseForward) * speedMultiplier)
  );
  let detVy = (tip.vy || 0) * js - (CONFIG.jumpImpulse * upFactor * js);

  if (powerRatio > 0) {
    const clampedRatio = Math.max(0, Math.min(1, powerRatio));
    detVx = Math.max(
      CONFIG.minVx,
      Math.min(CONFIG.maxVx, detVx + POWER_JUMP_FORWARD_BONUS * clampedRatio)
    );
    detVy -= POWER_JUMP_VERTICAL_BONUS * clampedRatio;
  }

  lastDetachedRope = player.rope;
  player.rope = null;
  catchLockUntil = simTime + 0.2;

  const abilityBonus = characterAirJumpBonus();
  const baseAir = Math.max(0, 1 + (shopInv.plusJump ? 1 : 0) + abilityBonus);
  airJumpsLeft = baseAir + (pendingExtraJump ? 1 : 0);
  usedFlyThisRun = false;
  usedAirJumps = 0;

  if (pendingSizeScale && pendingSizeScale > 0) {
    player.sizeScale = pendingSizeScale;
    pendingSizeScale = 0;
  } else {
    player.sizeScale = 1;
  }
  pendingExtraJump = false;

  if (characterIs('wizard')) {
    const wizardSpeed = Math.max(0, CONFIG.wizardJumpSpeed || 0);
    const wizardImpulse = Math.max(0, CONFIG.wizardJumpImpulse || CONFIG.jumpImpulse);
    detVx = Math.max(CONFIG.minVx, Math.min(CONFIG.maxVx, wizardSpeed * speedMultiplier));
    detVy = -wizardImpulse;
    wizardFloatTimer = 2.0;
    wizardSpinTimer = wizardFloatTimer;
    const spinRevs = CONFIG.wizardSpinRevolutions || 0;
    wizardSpinRate = (spinRevs > 0 && wizardSpinTimer > 0)
      ? ((Math.PI * 2 * spinRevs) / wizardSpinTimer)
      : 0;
  } else {
    wizardFloatTimer = 0;
    wizardSpinTimer = 0;
    wizardSpinRate = 0;
  }

  if (typeof SkillSystem !== 'undefined' && SkillSystem && typeof SkillSystem.getSkillLevel === 'function') {
    const boostLevel = SkillSystem.getSkillLevel('power_boost');
    if (boostLevel > 0) {
      const multiplier = 1 + 0.3 * boostLevel;
      detVx *= multiplier;
      detVy *= multiplier;
      detVx = Math.max(CONFIG.minVx, Math.min(CONFIG.maxVx, detVx));
    }
  }

  const slowLevel = shopInv.slowLevel || 0;
  if (slowLevel > 0 && slowMoTimer <= 0 && slowMoCooldown <= 0 && slowMoPendingTimer <= 0) {
    const slowChance = Math.min(1, slowLevel * 0.1);
    if (Math.random() < slowChance) {
      slowMoPendingTimer = SLOW_MO_TRIGGER_DELAY;
      slowMoPendingEffect = { x: player.x, y: player.y - 24 };
      slowMoCooldown = SLOW_MO_COOLDOWN + SLOW_MO_TRIGGER_DELAY;
    }
  }

  player.vx = detVx;
  player.vy = detVy;
  consumePowerCharge();
}

function triggerSlowMoImmediate(effectX, effectY, cooldown = SLOW_MO_COOLDOWN) {
  slowMoPendingTimer = 0;
  slowMoPendingEffect = null;
  slowMoTimer = SLOW_MO_DURATION;
  slowMoCooldown = cooldown;
  spawnEffect('combo', effectX, effectY, t('effects.slow'));
}

const BOSS_FAIL_REASON_KEYS = {
  hit: 'bossOutcome.reason.hit',
  not_enough_dodge: 'bossOutcome.reason.notEnoughDodge',
  missed_boxes: 'bossOutcome.reason.missedBoxes',
};

function translateBossOutcomeReason(reason) {
  if (!reason) return null;
  const key = BOSS_FAIL_REASON_KEYS[reason];
  return key ? t(key) : null;
}

function hslToHex(h, s, l) {
  const sat = Math.max(0, Math.min(1, s / 100));
  const lig = Math.max(0, Math.min(1, l / 100));
  const k = (n) => (n + h / 30) % 12;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n) => lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

function nativeBuildLabelText() {
  if (typeof IS_NATIVE_APP === 'undefined' || !IS_NATIVE_APP) return null;
  if (typeof CapacitorPlatform === 'undefined' || CapacitorPlatform !== 'android') return null;
  if (typeof getNativeAppInfo !== 'function') return null;
  if (typeof maybeLoadNativeAppInfo === 'function') {
    const infoPeek = getNativeAppInfo();
    const pending = (typeof nativeAppInfoPromise !== 'undefined') ? nativeAppInfoPromise : null;
    const exhausted = (typeof nativeAppInfoExhausted !== 'undefined') ? nativeAppInfoExhausted : false;
    if ((!infoPeek || (!infoPeek.label && !infoPeek.version && !infoPeek.build)) && !pending && !exhausted) {
      try { maybeLoadNativeAppInfo(); } catch (err) {}
    }
  }
  const info = getNativeAppInfo();
  if (!info || (!info.label && !info.version && !info.build)) return null;
  const label = info.label
    || (info.version && info.build ? `${info.version} (${info.build})`
      : (info.version || (info.build ? `build ${info.build}` : null)));
  if (!label) return null;
  return label;
}

function renderIntro(g, time) {
  tutorialButtonRect = null;
  drawBackground(g);

  const bridgeActive = typeof isBridgeViewActive === 'function' && isBridgeViewActive();
  const bridgeProgress = bridgeActive && typeof getBridgeFlipProgress === 'function'
    ? getBridgeFlipProgress()
    : 0;

  const centerX = CONFIG.width / 2;
  const titleY = CONFIG.height * 0.26;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const title = t('intro.title');
  const isHangulTitle = /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7A3]/.test(title);
  const titleWords = title.split(/\s+/).filter(Boolean);
  const leftWord = titleWords[0] || title;
  const rightWord = titleWords.length > 1 ? titleWords.slice(1).join(' ') : '';
  const baseFontSize = isHangulTitle ? 46 : 36;
  const leftFontSize = baseFontSize + 20;
  const rightFontSize = baseFontSize;
  const gap = 70;
  const baseShiftX = 20;
  const leftBaseX = (rightWord ? centerX - gap : centerX) + baseShiftX;
  const rightBaseX = centerX + gap + baseShiftX;
  const hueBase = (time * 30) % 360;

  const leftPulse = 1 + 0.16 * Math.sin(time * 1.45);
  const leftStretch = 1 + 0.10 * Math.cos(time * 1.18);
  const leftWobble = 0.12 * Math.sin(time * 2.6);
  const leftDriftX = Math.cos(time * 0.85) * 16;
  const leftDriftY = Math.sin(time * 1.05) * 18;

  g.save();
  g.translate(leftBaseX + leftDriftX, titleY + leftDriftY);
  g.rotate(leftWobble);
  g.scale(leftPulse, leftStretch);
  g.font = `${leftFontSize}px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
  const leftY = -20;
  g.fillStyle = '#1d1436';
  g.fillText(leftWord, 4, leftY + 4);
  g.fillStyle = hslToHex(hueBase, 70, 62);
  g.fillText(leftWord, 0, leftY);
  g.restore();

  if (rightWord) {
    const rightPulse = 1 + 0.12 * Math.sin(time * 1.72 + Math.PI / 4);
    const rightStretch = 1 + 0.08 * Math.cos(time * 1.34 + Math.PI / 6);
    const rightWobble = 0.1 * Math.sin(time * 2.9 + Math.PI / 3);
    const rightDriftX = Math.cos(time * 0.9 + Math.PI / 2) * 12;
    const rightDriftY = Math.sin(time * 1.12 + Math.PI / 4) * 14;

    g.save();
    g.translate(rightBaseX + rightDriftX, titleY + rightDriftY);
    g.rotate(rightWobble);
    g.scale(rightPulse, rightStretch);
    g.font = `${rightFontSize}px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    const rightY = 20;
    g.fillStyle = '#1d1436';
    g.fillText(rightWord, 4, rightY + 4);
    g.fillStyle = hslToHex((hueBase + 60) % 360, 70, 65);
    g.fillText(rightWord, 0, rightY);
    g.restore();
  }

  const scanlineAlpha = Math.min(0.2, 0.08 + 0.05 * Math.sin(time * 3.0));
  g.save();
  g.fillStyle = `rgba(255,255,255,${scanlineAlpha.toFixed(3)})`;
  for (let y = 0; y < CONFIG.height; y += 4) {
    g.fillRect(0, y, CONFIG.width, 1);
  }
  g.restore();

  if (typeof IS_NATIVE_APP !== 'undefined' && IS_NATIVE_APP) {
    const rawLives = nativeLivesRemaining();
    const maxLives = nativeLivesMax();
    const lives = Math.max(0, rawLives);
    const displayCurrent = (rawLives === Number.POSITIVE_INFINITY) ? '∞' : lives;
    const maxText = (maxLives === Number.POSITIVE_INFINITY) ? '∞' : maxLives;
    g.fillStyle = '#b4c0d9';
    g.textAlign = 'right';
    g.textBaseline = 'top';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(t('ads.lifeCounter', { current: displayCurrent, max: maxText }), CONFIG.width - 12, 12);
    if (lives <= 0) {
    const msg = lifeAdStatus === 'loading'
      ? t('ads.lifeLoading')
      : (lifeAdMessage || t('ads.lifePrompt'));
    drawCenteredText(g, msg, CONFIG.height * 0.58 - 5, 10, '#ffb347');
      if (lifeAdStatus !== 'loading' && lifeAdStatus !== 'limit') {
        drawCenteredText(g, t('ads.lifeTapToWatch'), CONFIG.height * 0.62, 9, '#b4c0d9');
      }
    } else if (lifeAdStatus === 'loading') {
      drawCenteredText(g, t('ads.lifeLoading'), CONFIG.height * 0.58, 10, '#b4c0d9');
    } else if (lifeAdMessage) {
      drawCenteredText(g, lifeAdMessage, CONFIG.height * 0.58 - 5, 10, '#b4c0d9');
    }
  }

  if (introMenuButtons && introMenuButtons.length) {
    introMenuButtons.forEach((button) => drawUIButtonRect(g, button));
    if (introMenuMessage) {
      const lastButton = introMenuButtons[introMenuButtons.length - 1];
      const msgY = lastButton ? lastButton.y + lastButton.h + 18 : CONFIG.height * 0.58;
      drawCenteredText(g, introMenuMessage, msgY, 9, '#ffb347');
    }
  }

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

  const settingsBtn = footer.settings;
  g.fillStyle = '#22334a';
  g.strokeStyle = '#b4c0d9';
  g.lineWidth = 2;
  g.fillRect(settingsBtn.x, settingsBtn.y, settingsBtn.w, settingsBtn.h);
  g.strokeRect(settingsBtn.x, settingsBtn.y, settingsBtn.w, settingsBtn.h);
  g.fillStyle = '#ffffff';
  g.fillText(t('intro.settings'), settingsBtn.x + settingsBtn.w/2, settingsBtn.y + settingsBtn.h/2 + 1);

  if (showRecords) {
    g.save();
    g.fillStyle = 'rgba(0, 0, 0, 0.55)';
    g.fillRect(0, 0, CONFIG.width, CONFIG.height);

    recordsMenuOptionRects = [];
    recordsFilterButtons = [];
    recordsGoalClaimButtons = [];
    recordsPaginationButtons = [];
    recordsBackButtonRect = null;

    const formatNumber = (value) => {
      const n = Number(value) || 0;
      try { return n.toLocaleString(); } catch (_) { return String(n); }
    };

    if (recordsView === 'menu') {
      const popupW = CONFIG.width * 0.78;
      const popupH = Math.min(CONFIG.height * 0.6, 260);
      const popupX = (CONFIG.width - popupW) / 2;
      const popupY = (CONFIG.height - popupH) / 2;
      recordsPopupRect = { x: popupX, y: popupY, w: popupW, h: popupH };

      g.fillStyle = '#0f1a2a';
      g.strokeStyle = '#b4c0d9';
      g.lineWidth = 2;
      g.fillRect(popupX, popupY, popupW, popupH);
      g.strokeRect(popupX, popupY, popupW, popupH);

      g.fillStyle = '#ffffff';
      g.textAlign = 'center';
      g.textBaseline = 'top';
      g.font = `14px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
      g.fillText(t('records.title'), popupX + popupW / 2, popupY + 16);

      const optionSpecs = [
        { view: 'history', label: t('records.menu.history'), hint: t('records.menu.historyHint') },
        { view: 'goals', label: t('records.menu.goals'), hint: t('records.menu.goalsHint') },
      ];
      const optionHeight = 68;
      const optionGap = 18;
      const optionWidth = popupW - 48;
      let rowY = popupY + 58;
      g.textAlign = 'left';
      for (const option of optionSpecs) {
        const rect = { x: popupX + 24, y: rowY, w: optionWidth, h: optionHeight };
        g.fillStyle = '#22334a';
        g.strokeStyle = '#b4c0d9';
        g.lineWidth = 2;
        g.fillRect(rect.x, rect.y, rect.w, rect.h);
        g.strokeRect(rect.x, rect.y, rect.w, rect.h);
        g.fillStyle = '#ffe066';
        g.font = `12px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
        g.fillText(option.label, rect.x + 16, rect.y + 20);
        g.fillStyle = '#b4c0d9';
        g.font = `9px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
        g.fillText(option.hint, rect.x + 16, rect.y + 40);
        recordsMenuOptionRects.push({ rect, view: option.view });
        rowY += optionHeight + optionGap;
      }

      g.textAlign = 'center';
      g.fillStyle = '#b4c0d9';
      g.font = `9px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
      g.fillText(t('records.menu.closeHint'), popupX + popupW / 2, popupY + popupH - 24);

      g.restore();
      return;
    }

    // Full-screen layout for history/goals views
    const frameX = CONFIG.width * 0.06;
    const frameY = CONFIG.height * 0.07;
    const frameW = CONFIG.width * 0.88;
    const frameH = CONFIG.height * 0.9;
    recordsPopupRect = { x: frameX, y: frameY, w: frameW, h: frameH };

    const headerH = 60;
    const bottomBarH = 72;
    const innerLeft = frameX + 28;
    const innerRight = frameX + frameW - 28;
    const innerWidth = innerRight - innerLeft;
    const contentTop = frameY + headerH + 24;
    const contentBottom = frameY + frameH - bottomBarH;

    g.fillStyle = '#0f1a2a';
    g.strokeStyle = '#b4c0d9';
    g.lineWidth = 3;
    g.fillRect(frameX, frameY, frameW, frameH);
    g.strokeRect(frameX, frameY, frameW, frameH);

    g.fillStyle = '#182844';
    g.fillRect(frameX, frameY, frameW, headerH);
    g.strokeRect(frameX, frameY, frameW, headerH);

    g.fillStyle = '#ffe066';
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.font = `16px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(t(recordsView === 'history' ? 'records.menu.history' : 'records.menu.goals'), innerLeft, frameY + headerH / 2 + 1);
    const closeRect = { x: frameX + frameW / 2 - 90, y: frameY + frameH - bottomBarH + 30, w: 180, h: 30 };

    if (recordsView === 'history') {
      const entries = buildRecordHistoryEntries();
      recordsHistoryTotalPages = Math.max(1, Math.ceil(entries.length / RECORD_HISTORY_PER_PAGE));
      recordsHistoryPage = Math.max(0, Math.min(recordsHistoryTotalPages - 1, recordsHistoryPage));
      const sliceStart = recordsHistoryPage * RECORD_HISTORY_PER_PAGE;
      const pageEntries = entries.slice(sliceStart, sliceStart + RECORD_HISTORY_PER_PAGE);

      const cardGap = 16;
      const cardW = innerWidth;
      const cardH = 84;
      let cy = contentTop;
      for (const entry of pageEntries) {
        const rect = { x: innerLeft, y: cy, w: cardW, h: cardH };
        g.fillStyle = '#22334a';
        g.strokeStyle = '#3f4e68';
        g.lineWidth = 2;
        g.fillRect(rect.x, rect.y, rect.w, rect.h);
        g.strokeRect(rect.x, rect.y, rect.w, rect.h);

        g.fillStyle = '#ffffff';
        g.textAlign = 'left';
        g.font = `11px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
        g.fillText(t(entry.labelKey), rect.x + 18, rect.y + 24);
        g.font = `9px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
        if (entry.type === 'list') {
          const ids = Array.isArray(entry.value) ? entry.value : [];
          let label = ids.length ? ids.map((id) => {
            if (entry.id === 'itemsOwned') return t(`items.${id}.name`) || id;
            if (entry.id === 'charactersOwned') return t(`chars.${id}.name`) || id;
            return id;
          }).join(', ') : t('records.common.none');
          if (label.length > 60) label = `${label.slice(0, 57)}...`;
          g.fillStyle = '#b4c0d9';
          g.fillText(label, rect.x + 18, rect.y + 48);
          g.fillStyle = '#ffe066';
          g.fillText(`${formatNumber(ids.length)}`, rect.x + 18, rect.y + 68);
        } else {
          g.fillStyle = '#ffe066';
          g.fillText(formatNumber(entry.value), rect.x + 18, rect.y + 58);
        }
        cy += cardH + cardGap;
      }

      const pagerY = frameY + frameH - bottomBarH - 18;
      const prevRect = { x: innerLeft, y: pagerY, w: 36, h: 26 };
      const nextRect = { x: innerRight - 36, y: pagerY, w: 36, h: 26 };
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
      const historyLabel = `${recordsHistoryPage + 1}/${recordsHistoryTotalPages}`;
      if (recordsHistoryPage > 0) {
        g.fillStyle = '#22334a';
        g.fillRect(prevRect.x, prevRect.y, prevRect.w, prevRect.h);
        g.strokeStyle = '#b4c0d9';
        g.strokeRect(prevRect.x, prevRect.y, prevRect.w, prevRect.h);
        g.fillStyle = '#ffffff';
        g.fillText('<', prevRect.x + prevRect.w / 2, prevRect.y + prevRect.h / 2 + 1);
        recordsPaginationButtons.push({ rect: prevRect, dir: -1, view: 'history' });
      }
      if (recordsHistoryPage < recordsHistoryTotalPages - 1) {
        g.fillStyle = '#22334a';
        g.fillRect(nextRect.x, nextRect.y, nextRect.w, nextRect.h);
        g.strokeStyle = '#b4c0d9';
        g.strokeRect(nextRect.x, nextRect.y, nextRect.w, nextRect.h);
        g.fillStyle = '#ffffff';
        g.fillText('>', nextRect.x + nextRect.w / 2, nextRect.y + nextRect.h / 2 + 1);
        recordsPaginationButtons.push({ rect: nextRect, dir: 1, view: 'history' });
      }
      g.fillStyle = '#b4c0d9';
      g.fillText(`< ${historyLabel} >`, frameX + frameW / 2, pagerY + 13);

    } else if (recordsView === 'goals') {
      const filters = [
        { filter: 'all', label: t('records.filters.all') },
        { filter: 'pending', label: t('records.filters.pending') },
        { filter: 'achievable', label: t('records.filters.achievable') },
        { filter: 'completed', label: t('records.filters.completed') },
      ];

      const filterGap = 6;
      const filterW = (innerWidth - filterGap * (filters.length - 1)) / filters.length;
      const filterH = 32;
      const filterY = contentTop;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `9px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
      for (let i = 0; i < filters.length; i++) {
        const fx = innerLeft + i * (filterW + filterGap);
        const rect = { x: fx, y: filterY, w: filterW, h: filterH };
        const active = recordsGoalFilter === filters[i].filter;
        g.fillStyle = active ? '#31507a' : '#22334a';
        g.strokeStyle = active ? '#ffe066' : '#b4c0d9';
        g.fillRect(rect.x, rect.y, rect.w, rect.h);
        g.strokeRect(rect.x, rect.y, rect.w, rect.h);
        g.fillStyle = '#ffffff';
        g.fillText(filters[i].label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
        recordsFilterButtons.push({ rect, filter: filters[i].filter });
      }

      const goals = collectRecordGoalStates(recordsGoalFilter);
      recordsGoalsTotalPages = Math.max(1, Math.ceil(goals.length / RECORD_GOALS_PER_PAGE));
      recordsGoalsPage = Math.max(0, Math.min(recordsGoalsTotalPages - 1, recordsGoalsPage));
      const goalStart = recordsGoalsPage * RECORD_GOALS_PER_PAGE;
      const goalEntries = goals.slice(goalStart, goalStart + RECORD_GOALS_PER_PAGE);

      const cardW = innerWidth;
      const cardH = 98;
      const statusWidth = 80;
      let gy = filterY + filterH + 18;
      g.textAlign = 'left';
      for (const entry of goalEntries) {
        const rect = { x: innerLeft, y: gy, w: cardW, h: cardH };
        g.fillStyle = '#22334a';
        g.strokeStyle = '#3f4e68';
        g.lineWidth = 2;
        g.fillRect(rect.x, rect.y, rect.w, rect.h);
        g.strokeRect(rect.x, rect.y, rect.w, rect.h);

        g.fillStyle = '#ffffff';
        g.font = `11px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
        g.fillText(t(entry.goal.titleKey), rect.x + 18, rect.y + 24);
        g.fillStyle = '#b4c0d9';
        g.font = `8px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
        const descLines = String(t(entry.goal.descriptionKey) || '').split('\n');
        let descY = rect.y + 46;
        for (const line of descLines) {
          g.fillText(line, rect.x + 18, descY);
          descY += 12;
        }

        const barX = rect.x + 18;
        const barY = rect.y + rect.h - 21;
        const barW = rect.w - 190;
        const barH = 10;
        g.fillStyle = '#1a273b';
        g.fillRect(barX, barY, barW, barH);
        g.fillStyle = '#ffe066';
        g.fillRect(barX, barY, barW * Math.min(1, entry.progress), barH);
        g.fillStyle = '#b4c0d9';
        g.font = `9px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
        g.fillText(`${formatNumber(entry.value)} / ${formatNumber(entry.target)}`, barX, barY - 12);

        const bottomY = rect.y + rect.h - 20;
        const rewardY = bottomY - 12;
        const rewardLabel = `${t('records.goals.rewardPrefix')}${entry.goal.reward}`;
        const statusLabel = entry.claimed
          ? t('records.goals.status.completed')
          : entry.achieved
            ? t('records.filters.achievable')
            : t('records.filters.pending');
        const statusColor = entry.claimed ? '#9cffc7' : entry.achieved ? '#ffe066' : '#ff9c9c';

        let statusX = rect.x + rect.w - statusWidth - 32;
        if (entry.achieved && !entry.claimed) {
          const claimButtonRect = { x: rect.x + rect.w - statusWidth - 24, y: rect.y + rect.h - 32, w: statusWidth, h: 18 };
          g.fillStyle = '#31507a';
          g.fillRect(claimButtonRect.x, claimButtonRect.y, claimButtonRect.w, claimButtonRect.h);
          g.strokeStyle = '#ffe066';
          g.strokeRect(claimButtonRect.x, claimButtonRect.y, claimButtonRect.w, claimButtonRect.h);
          g.fillStyle = '#ffffff';
          g.textAlign = 'center';
          g.fillText(t('records.goals.claim'), claimButtonRect.x + claimButtonRect.w / 2, claimButtonRect.y + claimButtonRect.h / 2 + 1);
          recordsGoalClaimButtons.push({ rect: claimButtonRect, goalId: entry.goal.id });
        } else {
          statusX = rect.x + rect.w - 18;
        }

        g.textAlign = 'right';
        g.fillStyle = entry.achieved && !entry.claimed ? '#ffe066' : (entry.claimed ? '#9cffc7' : '#b4c0d9');
        g.font = `9px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
        const showRawReward = entry.claimed || !entry.achieved;
        if (showRawReward) {
          g.fillStyle = '#b4c0d9';
          g.textAlign = 'right';
          g.font = `9px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
          g.fillText(rewardLabel, statusX, rewardY);
        } else if (entry.goal.reward) {
          g.textAlign = 'right';
          g.font = `9px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
          g.fillText(`$${formatNumber(entry.goal.reward)}`, statusX, rewardY);
        }

        g.fillStyle = statusColor;
        g.fillText(statusLabel, statusX, bottomY);
        g.textAlign = 'left';
        gy += cardH + 20;
      }

      const pagerYGoals = frameY + frameH - bottomBarH - 18;
      const prevRectG = { x: innerLeft, y: pagerYGoals, w: 36, h: 26 };
      const nextRectG = { x: innerRight - 36, y: pagerYGoals, w: 36, h: 26 };
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
      const goalsLabel = `${recordsGoalsPage + 1}/${recordsGoalsTotalPages}`;
      if (recordsGoalsPage > 0) {
        g.fillStyle = '#22334a';
        g.fillRect(prevRectG.x, prevRectG.y, prevRectG.w, prevRectG.h);
        g.strokeStyle = '#b4c0d9';
        g.strokeRect(prevRectG.x, prevRectG.y, prevRectG.w, prevRectG.h);
        g.fillStyle = '#ffffff';
        g.fillText('<', prevRectG.x + prevRectG.w / 2, prevRectG.y + prevRectG.h / 2 + 1);
        recordsPaginationButtons.push({ rect: prevRectG, dir: -1, view: 'goals' });
      }
      if (recordsGoalsPage < recordsGoalsTotalPages - 1) {
        g.fillStyle = '#22334a';
        g.fillRect(nextRectG.x, nextRectG.y, nextRectG.w, nextRectG.h);
        g.strokeStyle = '#b4c0d9';
        g.strokeRect(nextRectG.x, nextRectG.y, nextRectG.w, nextRectG.h);
        g.fillStyle = '#ffffff';
        g.fillText('>', nextRectG.x + nextRectG.w / 2, nextRectG.y + nextRectG.h / 2 + 1);
        recordsPaginationButtons.push({ rect: nextRectG, dir: 1, view: 'goals' });
      }
      g.fillStyle = '#b4c0d9';
      g.fillText(`< ${goalsLabel} >`, frameX + frameW / 2, pagerYGoals + 13);
    }

    recordsBackButtonRect = closeRect;

    g.textAlign = 'center';
    g.fillStyle = '#22334a';
    g.fillRect(closeRect.x, closeRect.y, closeRect.w, closeRect.h);
    g.strokeStyle = '#b4c0d9';
    g.strokeRect(closeRect.x, closeRect.y, closeRect.w, closeRect.h);
    g.fillStyle = '#ffffff';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(t('records.back'), closeRect.x + closeRect.w / 2, closeRect.y + closeRect.h / 2 + 1);

    g.restore();
    return;
  }

  if (showGuide) {
    g.save();
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fillRect(0, 0, CONFIG.width, CONFIG.height);
    const pw = CONFIG.width * 0.86;
    const ph = 190;
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
    tutorialButtonRect = null;
    g.fillStyle = '#b4c0d9';
    g.font = `8px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.textAlign = 'center';
    g.fillText(t('common.clickAnywhereToClose'), px + pw/2, py + ph - 18);
    g.restore();
    return;
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

    const buildLabel = nativeBuildLabelText();
    if (buildLabel) {
      g.textAlign = 'right';
      g.textBaseline = 'middle';
      g.font = `8px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
      g.fillStyle = '#8fa3c9';
      g.fillText(buildLabel, px + pw - 16, py + ph - 34);
    }
    g.restore();
  } else {
    settingsPopupRect = null;
    settingsOptionRects = [];
  }

  if (!showSettings) {
    const hasMenu = introMenuButtons && introMenuButtons.length;
    const pressY = hasMenu
      ? Math.min(CONFIG.height * 0.82, introMenuButtons[introMenuButtons.length - 1].y + introMenuButtons[introMenuButtons.length - 1].h + 40)
      : CONFIG.height * 0.62;
    const blink = Math.sin(time * 3) > 0 ? 1 : 0.2;
    g.save();
    g.globalAlpha = blink;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `12px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillStyle = '#0f1a2a';
    g.fillText(t('intro.pressStart'), centerX, pressY + 2);
    g.fillStyle = '#ffd966';
    g.fillText(t('intro.pressStart'), centerX, pressY);
    g.restore();
  }

  renderSkillHud(g);

  if (bridgeActive) {
    drawBridgeView(g, bridgeProgress);
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

  // Handle grip near rope tip
  const dx = tx - sx;
  const dy = ty - sy;
  const length = Math.hypot(dx, dy) || 1;
  let ropeGlideVisualLevel = 0;
  if (typeof SkillSystem !== 'undefined' && SkillSystem && typeof SkillSystem.getSkillLevel === 'function') {
    const lvl = SkillSystem.getSkillLevel('rope_glide');
    if (Number.isFinite(lvl) && lvl > 0) {
      ropeGlideVisualLevel = Math.max(0, Math.floor(lvl));
    }
  }
  const handleScale = ROPE_GLIDE_HANDLE_SCALE[Math.min(ropeGlideVisualLevel, ROPE_GLIDE_HANDLE_SCALE.length - 1)] || 1;
  const gripOffset = 12 * handleScale;
  const hx = tx - (dx / length) * gripOffset;
  const hy = ty - (dy / length) * gripOffset;
  g.save();
  g.translate(hx, hy);
  g.rotate(Math.atan2(dy, dx));
  g.scale(handleScale, handleScale);
  const gripW = 18;
  const gripH = 6;
  g.fillStyle = '#132235';
  g.fillRect(-gripW / 2 - 1, -gripH / 2 - 1, gripW + 2, gripH + 2);
  g.fillStyle = starModeActive ? '#ffe066' : '#4c668a';
  g.fillRect(-gripW / 2, -gripH / 2, gripW, gripH);
  g.fillStyle = starModeActive ? '#fff3b0' : '#89a5cc';
  g.fillRect(-gripW / 2 + 3, -gripH / 2 + 1, gripW - 6, gripH - 2);
  g.restore();

  // Anchor dot
  g.fillStyle = starModeActive ? '#ffd966' : '#92a0bb';
  g.beginPath();
  g.arc(sx, sy, 3, 0, Math.PI * 2);
  g.fill();
  // Debug: tip-only catch radius and distance readout
  if (DEBUG) {
    const glowBonus = shopInv.glowLevel ? (shopInv.glowLevel * 0.1 * CONFIG.catchBase) : 0;
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


const skillIconCache = new Map();
const INTRO_BRIDGE_IMAGE_PATH = 'assets/etc/intro.png';
const BOX_ITEM_IMAGE_PATH = 'assets/etc/box.png';
let introBridgeImageCache = null;
let boxItemImageCache = null;
const SUPPORT_DRONE_IMAGE_PATH = 'assets/etc/drone.png';
const SPIDER_IMAGE_PATH = 'assets/etc/spider.png';
const SPIDER_WEB_IMAGE_PATH = 'assets/etc/web.png';
const DRONE_RIDE_OFFSET = 38;
const DRONE_FORWARD_OFFSET = 320;
const DRONE_VERTICAL_ORIGIN_OFFSET = 70;
const DRONE_INITIAL_VERTICAL_OFFSET = 30;
const DRONE_AUTO_MOUNT_PROBABILITY = 0.5;
const DRONE_MOUNT_RETRY_COOLDOWN = 0.25;
const BRIDGE_VIEW_DEFAULT_DURATION = 5;
const BRIDGE_VIEW_FLIP_DURATION = 0.35;
const BRIDGE_VIEW_BACKGROUND_COLOR = 'rgb(0, 199, 236)';

let bridgeOverlayElement = null;
let bridgeOverlayInner = null;
let bridgeOverlayImageEl = null;
let bridgeOverlayStylesApplied = false;
let bridgeOverlayVisible = false;

const RUNTIME_IMAGE_PRELOADERS = [
  {
    path: INTRO_BRIDGE_IMAGE_PATH,
    getCache: () => introBridgeImageCache,
    setCache: (img) => { introBridgeImageCache = img; },
  },
  {
    path: BOX_ITEM_IMAGE_PATH,
    getCache: () => boxItemImageCache,
    setCache: (img) => { boxItemImageCache = img; },
  },
  {
    path: SUPPORT_DRONE_IMAGE_PATH,
    getCache: () => supportDroneImageCache,
    setCache: (img) => { supportDroneImageCache = img; },
  },
  {
    path: SPIDER_IMAGE_PATH,
    getCache: () => spiderDroneImageCache,
    setCache: (img) => { spiderDroneImageCache = img; },
  },
  {
    path: SPIDER_WEB_IMAGE_PATH,
    getCache: () => spiderWebImageCache,
    setCache: (img) => { spiderWebImageCache = img; },
  },
];

let runtimeImagePreloadPromise = null;
let bridgeViewTimer = 0;
let bridgeViewDuration = 0;
let supportDroneImageCache = null;
let spiderDroneImageCache = null;
let spiderWebImageCache = null;
let lastSkillOverlayLayout = null;
const renderSupportDroneState = {
  spiderGuardActive: false,
};

function getIntroBridgeImage() {
  if (typeof Image === 'undefined') return null;
  if (!introBridgeImageCache) {
    introBridgeImageCache = new Image();
    introBridgeImageCache.src = INTRO_BRIDGE_IMAGE_PATH;
  } else if (!introBridgeImageCache.src) {
    introBridgeImageCache.src = INTRO_BRIDGE_IMAGE_PATH;
  }
  return introBridgeImageCache;
}

function updateBridgeOverlayAspect() {
  if (!bridgeOverlayImageEl) return;
  const imgEl = bridgeOverlayImageEl;
  const naturalWidth = imgEl.naturalWidth || (introBridgeImageCache && introBridgeImageCache.naturalWidth) || 0;
  const naturalHeight = imgEl.naturalHeight || (introBridgeImageCache && introBridgeImageCache.naturalHeight) || 0;
  if (!naturalWidth || !naturalHeight) return;
  const ratio = naturalWidth / naturalHeight;
  if (!Number.isFinite(ratio) || ratio <= 0) return;
  imgEl.style.setProperty('--bridge-aspect', `${ratio}`);
}

function handleBridgeOverlayImageLoad() {
  updateBridgeOverlayAspect();
}

function ensureBridgeOverlay(img) {
  if (typeof document === 'undefined') return null;
  if (!bridgeOverlayStylesApplied) {
    const existingStyle = document.getElementById('bridge-overlay-style');
    if (existingStyle) {
      bridgeOverlayStylesApplied = true;
    }
  }
  if (!bridgeOverlayStylesApplied) {
    const styleEl = document.createElement('style');
    styleEl.type = 'text/css';
    styleEl.id = 'bridge-overlay-style';
    styleEl.textContent = `
#bridge-overlay{position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;background:${BRIDGE_VIEW_BACKGROUND_COLOR};perspective:1600px;pointer-events:auto;}
#bridge-overlay.bridge-visible{display:flex;}
#bridge-overlay .bridge-overlay-inner{position:relative;display:flex;align-items:center;justify-content:center;transform-style:preserve-3d;transform-origin:center;will-change:transform,opacity;}
#bridge-overlay .bridge-overlay-inner img{width:min(96vw,calc(96vh * var(--bridge-aspect, 1)));aspect-ratio:var(--bridge-aspect, 1);height:auto;object-fit:contain;backface-visibility:hidden;image-rendering:auto;max-width:none;max-height:none;}
`;
    if (document.head) document.head.appendChild(styleEl);
    bridgeOverlayStylesApplied = true;
    const bootstrapStyle = document.getElementById('bridge-overlay-bootstrap');
    if (bootstrapStyle && bootstrapStyle.parentNode) {
      bootstrapStyle.parentNode.removeChild(bootstrapStyle);
    }
  }
  if (!bridgeOverlayElement) {
    const existingRoot = document.getElementById('bridge-overlay');
    if (existingRoot) {
      bridgeOverlayElement = existingRoot;
      bridgeOverlayInner = existingRoot.querySelector('.bridge-overlay-inner');
      bridgeOverlayImageEl = (bridgeOverlayInner && bridgeOverlayInner.querySelector('img')) || existingRoot.querySelector('img');
      bridgeOverlayVisible = existingRoot.classList.contains('bridge-visible');
      existingRoot.removeAttribute('data-bootstrap');
    }
  }
  if (!bridgeOverlayElement) {
    const root = document.createElement('div');
    root.id = 'bridge-overlay';
    root.setAttribute('aria-hidden', 'true');
    const inner = document.createElement('div');
    inner.className = 'bridge-overlay-inner';
    const imgEl = document.createElement('img');
    imgEl.alt = '';
    inner.appendChild(imgEl);
    root.appendChild(inner);
    if (document.body) document.body.appendChild(root);
    bridgeOverlayElement = root;
    bridgeOverlayInner = inner;
    bridgeOverlayImageEl = imgEl;
  }
  if (bridgeOverlayImageEl) {
    bridgeOverlayImageEl.setAttribute('loading', 'eager');
    try { bridgeOverlayImageEl.decoding = 'async'; } catch (_) {}
    if (!bridgeOverlayImageEl.dataset.bridgeAspectApplied) {
      bridgeOverlayImageEl.addEventListener('load', handleBridgeOverlayImageLoad, { passive: true });
      bridgeOverlayImageEl.dataset.bridgeAspectApplied = '1';
    }
  }
  const desiredSrc = img && img.src ? img.src : INTRO_BRIDGE_IMAGE_PATH;
  if (bridgeOverlayImageEl && desiredSrc && bridgeOverlayImageEl.src !== desiredSrc) {
    bridgeOverlayImageEl.src = desiredSrc;
  }
  if (bridgeOverlayElement) bridgeOverlayElement.style.background = BRIDGE_VIEW_BACKGROUND_COLOR;
  updateBridgeOverlayAspect();
  return bridgeOverlayElement;
}

function showBridgeOverlay(img) {
  const root = ensureBridgeOverlay(img);
  if (!root || !bridgeOverlayInner) return;
  if (!root.classList.contains('bridge-visible')) {
    root.classList.add('bridge-visible');
  }
  root.style.opacity = '1';
  bridgeOverlayInner.style.transform = 'rotateY(0deg)';
  bridgeOverlayInner.style.opacity = '1';
  bridgeOverlayVisible = true;
}

function hideBridgeOverlay() {
  if (!bridgeOverlayElement || !bridgeOverlayInner) return;
  if (!bridgeOverlayVisible) return;
  bridgeOverlayVisible = false;
  const root = bridgeOverlayElement;
  const inner = bridgeOverlayInner;
  root.classList.remove('bridge-visible');
  root.style.opacity = '0';
  inner.style.transform = 'rotateY(0deg)';
  inner.style.opacity = '1';

  const cleanup = () => {
    if (bridgeOverlayVisible) return;
    if (root.parentNode) root.parentNode.removeChild(root);
    bridgeOverlayElement = null;
    bridgeOverlayInner = null;
    bridgeOverlayImageEl = null;
  };

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => requestAnimationFrame(cleanup));
  } else {
    setTimeout(cleanup, 50);
  }
}

function updateBridgeOverlay(img, flipProgress) {
  const root = ensureBridgeOverlay(img);
  if (!root || !bridgeOverlayInner) return;
  showBridgeOverlay(img);
  const clamped = Math.max(0, Math.min(1, flipProgress || 0));
  const angle = clamped * 180;
  bridgeOverlayInner.style.transform = `rotateY(${angle}deg)`;
  const fadeStart = 0.5;
  const fadeRange = 1 - fadeStart;
  const fadeProgress = clamped <= fadeStart ? 0 : (clamped - fadeStart) / (fadeRange > 0 ? fadeRange : 1);
  const opacity = 1 - Math.min(1, fadeProgress);
  bridgeOverlayInner.style.opacity = `${opacity}`;
  root.style.opacity = `${opacity}`;
  if (clamped >= 1) {
    hideBridgeOverlay();
  }
}

function activateBridgeView(duration = BRIDGE_VIEW_DEFAULT_DURATION) {
  const sec = Number.isFinite(duration) ? Math.max(0, duration) : BRIDGE_VIEW_DEFAULT_DURATION;
  bridgeViewTimer = sec;
  bridgeViewDuration = sec;
  getIntroBridgeImage();
  showBridgeOverlay(introBridgeImageCache);
}

function updateBridgeView(dt) {
  if (bridgeViewTimer <= 0) return;
  bridgeViewTimer = Math.max(0, bridgeViewTimer - Math.max(0, dt || 0));
  if (bridgeViewTimer <= 0) {
    bridgeViewDuration = 0;
    hideBridgeOverlay();
  }
}

function isBridgeViewActive() {
  return bridgeViewTimer > 0;
}

function getBridgeFlipProgress() {
  if (bridgeViewDuration <= 0) return 0;
  const flipDuration = Math.max(0.1, BRIDGE_VIEW_FLIP_DURATION);
  if (bridgeViewTimer > flipDuration) return 0;
  const remaining = Math.max(0, bridgeViewTimer);
  const progress = 1 - (remaining / flipDuration);
  return Math.max(0, Math.min(1, progress));
}

function drawBridgeView(g, providedProgress = null) {
  const img = getIntroBridgeImage();
  const flipProgressRaw = (providedProgress != null) ? providedProgress : getBridgeFlipProgress();
  const flipProgress = Math.max(0, Math.min(1, flipProgressRaw));
  const imgReady = img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0;

  updateBridgeOverlay(img, flipProgress);

  g.save();
  const overlayAlpha = Math.max(0, 1 - Math.min(1, flipProgress));
  if (overlayAlpha > 0) {
    g.save();
    g.globalAlpha = overlayAlpha;
    g.fillStyle = BRIDGE_VIEW_BACKGROUND_COLOR;
    g.fillRect(0, 0, CONFIG.width, CONFIG.height);
    g.restore();
  }

  if (!imgReady) {
    g.restore();
    return;
  }

  const baseScale = Math.min(
    CONFIG.width / img.naturalWidth,
    CONFIG.height / img.naturalHeight,
  );
  const drawW = img.naturalWidth * baseScale;
  const drawH = img.naturalHeight * baseScale;
  const centerX = CONFIG.width / 2;
  const centerY = CONFIG.height / 2;

  if (flipProgress <= 0) {
    g.fillStyle = BRIDGE_VIEW_BACKGROUND_COLOR;
    g.fillRect(0, 0, CONFIG.width, CONFIG.height);
    g.drawImage(img, (CONFIG.width - drawW) / 2, (CONFIG.height - drawH) / 2, drawW, drawH);
    g.restore();
    return;
  }

  const angle = Math.min(1, flipProgress) * Math.PI;
  let scaleX = Math.cos(angle);
  const minScale = 0.12;
  if (scaleX >= 0 && scaleX < minScale) scaleX = minScale;
  if (scaleX < 0 && scaleX > -minScale) scaleX = -minScale;
  const isBackFace = scaleX < 0;
  const shear = Math.sin(angle) * 0.35;
  const depthScale = 1 + Math.abs(Math.sin(angle)) * 0.2;

  g.translate(centerX, centerY);
  g.transform(scaleX, 0, shear, depthScale, 0, 0);

  if (isBackFace) {
    const backPhase = Math.min(1, Math.max(0, (flipProgress - 0.5) / 0.5));
    const backAlpha = 1 - backPhase;
    const source = (typeof canvas !== 'undefined') ? canvas : null;
    if (source && backAlpha > 0) {
      g.globalAlpha = 0.85 * backAlpha;
      g.drawImage(source, 0, 0, CONFIG.width, CONFIG.height, -drawW / 2, -drawH / 2, drawW, drawH);
      g.globalAlpha = 0.25 * backAlpha;
      g.strokeStyle = 'rgba(12, 18, 32, 0.6)';
      g.lineWidth = 2;
      g.strokeRect(-drawW / 2, -drawH / 2, drawW, drawH);
    }
  } else {
    const alpha = Math.max(0.6, 1 - flipProgress * 0.2);
    g.globalAlpha = alpha;
    g.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  }

  g.restore();
}

function ensureImageForPreload(descriptor) {
  if (!descriptor || !descriptor.path) return Promise.resolve(null);
  if (typeof Image === 'undefined') return Promise.resolve(null);

  const getCache = descriptor.getCache;
  const setCache = descriptor.setCache;
  let cache = typeof getCache === 'function' ? getCache() : null;

  if (!cache) {
    cache = new Image();
    if (typeof setCache === 'function') setCache(cache);
    cache.src = descriptor.path;
  } else if (!cache.src) {
    cache.src = descriptor.path;
  }

  if (cache.complete && cache.naturalWidth > 0) {
    return Promise.resolve(cache);
  }

  return new Promise((resolve) => {
    const finalize = () => {
      cache.removeEventListener('load', finalize);
      cache.removeEventListener('error', finalize);
      resolve(cache);
    };
    cache.addEventListener('load', finalize, { once: true });
    cache.addEventListener('error', finalize, { once: true });
  });
}

function preloadRuntimeImages() {
  if (runtimeImagePreloadPromise) return runtimeImagePreloadPromise;
  if (!Array.isArray(RUNTIME_IMAGE_PRELOADERS) || !RUNTIME_IMAGE_PRELOADERS.length) {
    runtimeImagePreloadPromise = Promise.resolve();
    return runtimeImagePreloadPromise;
  }
  runtimeImagePreloadPromise = Promise.all(RUNTIME_IMAGE_PRELOADERS.map(ensureImageForPreload))
    .then(() => undefined)
    .catch(() => undefined);
  return runtimeImagePreloadPromise;
}

if (typeof window !== 'undefined') {
  window.preloadRuntimeImages = preloadRuntimeImages;
  window.activateBridgeView = activateBridgeView;
  window.updateBridgeView = updateBridgeView;
  window.isBridgeViewActive = isBridgeViewActive;
  window.getBridgeFlipProgress = getBridgeFlipProgress;
}

function getBoxItemImage() {
  if (typeof Image === 'undefined') return null;
  if (!boxItemImageCache) {
    boxItemImageCache = new Image();
    boxItemImageCache.src = BOX_ITEM_IMAGE_PATH;
  }
  if (boxItemImageCache.complete && boxItemImageCache.naturalWidth > 0) {
    return boxItemImageCache;
  }
  return null;
}

function getSupportDroneImage(spiderForm) {
  if (typeof Image === 'undefined') return null;
  if (spiderForm) {
    if (!spiderDroneImageCache) {
      spiderDroneImageCache = new Image();
      spiderDroneImageCache.src = SPIDER_IMAGE_PATH;
    }
    if (spiderDroneImageCache.complete && spiderDroneImageCache.naturalWidth > 0) {
      return spiderDroneImageCache;
    }
    return null;
  }
  if (!supportDroneImageCache) {
    supportDroneImageCache = new Image();
    supportDroneImageCache.src = SUPPORT_DRONE_IMAGE_PATH;
  }
  if (supportDroneImageCache.complete && supportDroneImageCache.naturalWidth > 0) {
    return supportDroneImageCache;
  }
  return null;
}

function getSpiderWebImage() {
  if (typeof Image === 'undefined') return null;
  if (!spiderWebImageCache) {
    spiderWebImageCache = new Image();
    spiderWebImageCache.src = SPIDER_WEB_IMAGE_PATH;
  }
  if (spiderWebImageCache.complete && spiderWebImageCache.naturalWidth > 0) {
    return spiderWebImageCache;
  }
  return null;
}

function releaseSupportDrone(drone) {
  if (!drone) return;
  if (drone.rope) {
    if (player.rope === drone.rope) {
      player.mode = 'free';
      player.rope = null;
      comboCount = 0;
    }
    const idx = ropes.indexOf(drone.rope);
    if (idx >= 0) ropes.splice(idx, 1);
    drone.rope = null;
  }
  drone.state = 'patrol';
  if (typeof drone.angle !== 'number') {
    drone.angle = Math.random() * Math.PI * 2;
  } else {
    drone.angle += Math.PI * 0.3;
  }
}

function anchorSupportDrone(drone) {
  if (!drone || drone.state === 'anchored') return;
  const ropeLength = Math.max(90, Math.min(160, drone.y - (CONFIG.ceilingY + 40)));
  const anchorX = drone.x;
  const anchorY = drone.y - ropeLength;
  const rope = new Rope({
    anchorX,
    anchorY,
    L: ropeLength,
    A: 0,
    omega: 0,
    phi: 0,
    createdAt: simTime,
    id: `sd${drone.id}`,
    countsForStage: false,
  });
  rope.isSupportDroneRope = true;
  rope.droneId = drone.id;
  ropes.push(rope);
  drone.state = 'anchored';
  drone.rope = rope;
  drone.anchorX = anchorX;
  drone.anchorY = anchorY;
}

function spawnSpiderWeb(x) {
  const groundY = CONFIG.height - CONFIG.groundH - 12;
  const spawnY = groundY - 100;
  if (spiderWebs.length >= 6) spiderWebs.shift();
  spiderWebs.push({
    id: `web${Date.now()}${Math.floor(Math.random() * 1000)}`,
    x,
    y: spawnY,
    radius: 44,
    ttl: 7,
  });
}

function createSupportDrone(level) {
  const orbitRadius = 80 + level * 10;
  const verticalRadius = 42 + level * 6;
  const drone = {
    id: nextSupportDroneId++,
    angle: Math.random() * Math.PI * 2,
    originX: player.x + DRONE_FORWARD_OFFSET,
    originY: player.y - DRONE_VERTICAL_ORIGIN_OFFSET,
    x: player.x + DRONE_FORWARD_OFFSET,
    y: player.y - DRONE_INITIAL_VERTICAL_OFFSET,
    prevX: player.x,
    prevY: player.y - DRONE_INITIAL_VERTICAL_OFFSET,
    vx: 0,
    vy: 0,
    orbitRadius,
    verticalRadius,
    radius: level >= 2 ? 36 : 28,
    collectRadius: (level >= 2 ? 36 : 28) * 1.2,
    rideOffset: DRONE_RIDE_OFFSET,
    rider: false,
    direction: Math.random() < 0.5 ? -1 : 1,
    groundY: CONFIG.height - CONFIG.groundH - 16,
    webTimer: 4 + Math.random() * 2,
    mountCooldown: 0,
    rideTimeLeft: 0,
    warningTimer: 0,
  };
  supportDrones.push(drone);
  return drone;
}

function updateSupportDrones(dt, level, collectorActive, spiderGuardActive) {
  if (!supportDrones) supportDrones = [];
  if (!spiderWebs) spiderWebs = [];

  if (level <= 0) {
    while (supportDrones.length) {
      const drone = supportDrones.pop();
      if (player.droneRide === drone) {
        player.mode = 'free';
        player.droneRide = null;
      }
    }
    spiderWebs.length = 0;
    return;
  }

  const desiredCount = level >= 3 ? 2 : 1;
  while (supportDrones.length > desiredCount) {
    const drone = supportDrones.pop();
    if (player.droneRide === drone) {
      player.mode = 'free';
      player.droneRide = null;
    }
  }
  while (supportDrones.length < desiredCount) {
    createSupportDrone(level);
  }

  const baseRadius = level >= 2 ? 36 : 28;
  const collectMultiplier = collectorActive ? 1.8 : 1.2;

  for (let i = 0; i < supportDrones.length; i++) {
    const drone = supportDrones[i];
    drone.radius = baseRadius;
    drone.collectRadius = baseRadius * collectMultiplier;

    if (!Number.isFinite(drone.originX)) drone.originX = player.x + DRONE_FORWARD_OFFSET;
    if (!Number.isFinite(drone.originY)) drone.originY = player.y - DRONE_VERTICAL_ORIGIN_OFFSET;
    const prevX = drone.x;
    const prevY = drone.y;
    if (drone.mountCooldown > 0) drone.mountCooldown = Math.max(0, drone.mountCooldown - dt);
    if (drone.rider) {
      drone.rideTimeLeft = (drone.rideTimeLeft || 0) - dt;
      if (drone.rideTimeLeft <= 3) {
        drone.warningTimer = (drone.warningTimer || 0) - dt;
        if (drone.warningTimer <= 0) {
          spawnEffect('sparkle', drone.x, drone.y - 18);
          drone.warningTimer = 0.3;
        }
      } else {
        drone.warningTimer = 0;
      }
      if (drone.rideTimeLeft <= 0) {
        dismountDrone(false, true);
        drone.mountCooldown = 1.5;
        drone.rideTimeLeft = 0;
        drone.warningTimer = 0;
      }
    }

    if (spiderGuardActive) {
      drone.originY = Math.min(drone.originY, drone.groundY - 20);
      drone.originX = player.x + DRONE_FORWARD_OFFSET;
      const speed = (80 + level * 18) * 1.1;
      const range = 80 + level * 14;
      drone.x += drone.direction * speed * dt;
      const offset = drone.x - drone.originX;
      if (offset > range) {
        drone.x = drone.originX + range;
        drone.direction = -Math.abs(drone.direction);
      } else if (offset < -range) {
        drone.x = drone.originX - range;
        drone.direction = Math.abs(drone.direction);
      }
      drone.y = drone.groundY;
        if (!drone.rider) {
          drone.webTimer -= dt;
          if (drone.webTimer <= 0) {
            spawnSpiderWeb(drone.x);
            drone.webTimer = (5 + Math.random() * 4) * 0.7;
          }
        }
    } else {
      drone.webTimer = 4 + Math.random() * 2;
      const targetOriginX = player.x + DRONE_FORWARD_OFFSET;
      drone.originX += (targetOriginX - drone.originX) * Math.min(1, dt * 0.5);
      drone.angle += dt * (0.8 + level * 0.25) * 1.3;
      const offsetPhase = i === 0 ? 0 : Math.PI;
      const ang = drone.angle + offsetPhase;
      drone.x = drone.originX + Math.cos(ang) * drone.orbitRadius;
      drone.y = drone.originY + Math.sin(ang) * drone.verticalRadius;
    }

    drone.vx = (drone.x - prevX) / Math.max(1e-6, dt);
    drone.vy = (drone.y - prevY) / Math.max(1e-6, dt);
    drone.prevX = drone.x;
    drone.prevY = drone.y;
    if (!drone.rider && (drone.rideTimeLeft || 0) !== 0) {
      drone.rideTimeLeft = 0;
      drone.warningTimer = 0;
    }
  }
}

function updateSpiderWebs(dt) {
  if (!spiderWebs || !spiderWebs.length) return;
  for (let i = spiderWebs.length - 1; i >= 0; i--) {
    const web = spiderWebs[i];
    web.ttl -= dt;
    if (web.ttl <= 0) {
      spiderWebs.splice(i, 1);
    }
  }
}

function computeSupportDroneZones() {
  if (!supportDrones || !supportDrones.length) return [];
  const zones = [];
  for (const drone of supportDrones) {
    if (!drone) continue;
    const baseRadius = drone.collectRadius || drone.radius || 30;
    const radius = drone.rider ? Math.max(baseRadius, (drone.radius || 30) + 12) : baseRadius;
    zones.push({ x: drone.x, y: drone.y, r: radius, drone });
  }
  return zones;
}

function drawSpiderWebs(g) {
  if (!spiderWebs || !spiderWebs.length) return;
  const img = getSpiderWebImage();
  for (const web of spiderWebs) {
    const sx = web.x - camera.x;
    if (sx < -80 || sx > CONFIG.width + 80) continue;
    const size = web.radius * 2;
    g.save();
    g.imageSmoothingEnabled = false;
    if (img) {
      g.drawImage(img, sx - size / 2, web.y - size / 2, size, size);
    } else {
      g.fillStyle = 'rgba(204, 227, 255, 0.85)';
      g.beginPath();
      g.arc(sx, web.y, web.radius, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }
}

function drawSupportDrones(g, spiderGuardActive) {
  if (!supportDrones || !supportDrones.length) return;
  const imgDrone = getSupportDroneImage(false);
  const imgSpider = getSupportDroneImage(true);
  for (const drone of supportDrones) {
    const sx = drone.x - camera.x;
    if (sx < -80 || sx > CONFIG.width + 80) continue;
    const sy = drone.y;
    const size = drone.state === 'anchored' ? 40 : 32;
    g.save();
    g.imageSmoothingEnabled = false;
    const img = spiderGuardActive ? imgSpider : imgDrone;
    if (img) {
      g.drawImage(img, sx - size / 2, sy - size / 2, size, size);
    } else {
      g.fillStyle = spiderGuardActive ? '#f4b942' : '#8ec5ff';
      g.beginPath();
      g.arc(sx, sy, drone.radius, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }
}

function mountDrone(drone) {
  if (!drone || drone.rider || player.mode === 'dead') return;
  drone.rider = true;
  drone.mountCooldown = 0;
  drone.rideTimeLeft = 4;
  drone.warningTimer = 0;
  player.mode = 'drone';
  player.droneRide = drone;
  player.vx = 0;
  player.vy = 0;
  player.angle = 0;
}

function dismountDrone(applyImpulse = true, forceDrop = false) {
  const ride = player.droneRide;
  if (!ride) return;
  ride.rider = false;
  ride.mountCooldown = Math.max(ride.mountCooldown || 0, forceDrop ? 1.5 : 0.6);
  ride.rideTimeLeft = 0;
  ride.warningTimer = 0;
  player.droneRide = null;
  player.mode = 'free';
  if (forceDrop) {
    player.vx = 0;
    player.vy = Math.max(player.vy, 240);
    player.angle = 0;
  } else if (applyImpulse) {
    const forward = Math.max(CONFIG.minVx, CONFIG.baseVx * 0.75);
    player.vx = (ride.vx || 0) + forward;
    player.vy = -CONFIG.jumpImpulse * 0.85;
  }
}

function getSkillIconImage(skillId) {
  if (!SkillSystem || typeof SkillSystem.getSkillIconPath !== 'function') return null;
  const key = skillId; // Key is just the ID now
  let cached = skillIconCache.get(key);
  if (!cached) {
    const path = SkillSystem.getSkillIconPath(skillId); // No mode passed
    if (!path) return null;
    const img = new Image();
    img.src = path;
    cached = { img, path }; // No mode stored
    skillIconCache.set(key, cached);
  }
  return cached.img;
}

function pointInRect(px, py, rect) {
  if (!rect) return false;
  return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
}

function computeSkillOverlayLayout(popup) {
  if (!popup) {
    lastSkillOverlayLayout = null;
    return null;
  }
  const marginX = Math.max(12, CONFIG.width * 0.05);
  const containerW = Math.max(360, CONFIG.width - marginX * 2);
  const maxContainerH = Math.min(CONFIG.height * 0.85, 680); // Increased max height for more cards
  const headerH = 72;
  const footerH = 76;
  const cardCount = Math.max(1, popup.cards.length);

  const cardHeight = 94; // A fixed, consistent height for each skill card.
  const verticalGap = 16; // The space between cards.

  // Calculate the total height required for the container based on the number of cards.
  const requiredAreaH = (cardHeight * cardCount) + (verticalGap * Math.max(0, cardCount - 1));
  const requiredContainerH = headerH + footerH + requiredAreaH;

  // The final container height is the required height, but clamped to the maximum allowed.
  let containerH = Math.min(maxContainerH, requiredContainerH);
  if (cardCount === 4) {
    containerH = Math.min(maxContainerH, containerH + 70);
  }
  const containerX = marginX;
  const containerY = Math.max(12, (CONFIG.height - containerH) / 2);

  // The area available for cards is the container height minus header and footer.
  const cardAreaH = containerH - headerH - footerH;

  let cardWidth = Math.min(containerW - 48, Math.max(320, CONFIG.width * 0.6));
  cardWidth = Math.min(cardWidth + 10, containerW - 24); // Add 10px, but keep at least 12px side padding
  const cards = [];
  
  // Center the block of cards vertically within the available card area.
  const cardBlockH = (cardHeight * cardCount) + (verticalGap * Math.max(0, cardCount - 1));
  let cardY = containerY + headerH + Math.max(0, (cardAreaH - cardBlockH) / 2);
  const cardX = containerX + (containerW - cardWidth) / 2;

  for (let i = 0; i < cardCount; i++) {
    cards.push({ x: cardX, y: cardY, w: cardWidth, h: cardHeight });
    cardY += cardHeight + verticalGap;
  }

  const buttonHeight = 31;
  const buttonWidth = Math.min(210, containerW * 0.3 + 10);
  const buttonY = containerY + containerH - footerH + (footerH - buttonHeight) / 2 + 15;
  
  const rerollButton = popup.rerollsRemaining > 0 ? {
    x: containerX + containerW - buttonWidth - 24,
    y: buttonY,
    w: buttonWidth,
    h: buttonHeight,
  } : null;
  
  lastSkillOverlayLayout = {
    container: { x: containerX, y: containerY, w: containerW, h: containerH },
    cards,
    rerollButton,
    headerH,
    footerH,
  };
  return lastSkillOverlayLayout;
}

function wrapSkillLines(str, maxWidth, g) {
  if (!str) return [];
  const lines = [];
  const approxCharWidth = (g && typeof g.measureText === 'function') ? (g.measureText('Ｍ').width || g.measureText('가').width || 10) : 10;
  let langBuffer = 8;
  if (typeof I18N !== 'undefined' && I18N && typeof I18N.getLanguage === 'function') {
    const currentLang = I18N.getLanguage();
    if (currentLang && currentLang.toLowerCase().startsWith('ko')) {
      langBuffer = 15;
    }
  }
  const maxChars = Math.max(6, Math.floor(maxWidth / (approxCharWidth || 1)) - langBuffer);
  const segments = String(str).split(/\n+/);
  for (const segment of segments) {
    const words = segment.split(/\s+/);
    let current = '';
    for (const rawWord of words) {
      let word = rawWord.trim();
      if (!word) continue;
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length > maxChars) {
        if (current) {
          lines.push(current);
          current = word;
        } else {
          current = word;
        }
        while (current.length > maxChars) {
          lines.push(current.slice(0, maxChars));
          current = current.slice(maxChars);
        }
      } else {
        current = candidate;
        continue;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

function renderSkillSelectionOverlay(g) {
  if (!SkillSystem || typeof SkillSystem.getPopupState !== 'function') return;
  const popup = SkillSystem.getPopupState();
  if (!popup) {
    lastSkillOverlayLayout = null;
    return;
  }
  const layout = computeSkillOverlayLayout(popup);
  const container = layout.container;

  g.save();
  g.fillStyle = 'rgba(0, 0, 0, 0.45)';
  g.fillRect(0, 0, CONFIG.width, CONFIG.height);
  g.restore();

  g.save();
  g.fillStyle = 'rgba(14,22,34,0.96)';
  g.strokeStyle = '#8aa4ff';
  g.lineWidth = 2;
  g.beginPath();
  g.rect(container.x, container.y, container.w, container.h);
  g.fill();
  g.stroke();
  g.restore();

  g.save();
  g.textAlign = 'center';
  g.textBaseline = 'top';
  const rolling = popup.rollTimer && popup.rollTimer > 0;
  g.fillStyle = '#ffffff';
  g.font = `14px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
  g.fillText(t('skills.overlay.title'), container.x + container.w / 2, container.y + 16);
  if (!rolling) {
    g.fillStyle = '#b4c0d9';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    const timerText = t('skills.overlay.timer', { seconds: Math.max(0, Math.ceil(popup.timer)) });
    g.fillText(timerText, container.x + container.w / 2, container.y + 36);
  }
  g.restore();

  if (layout.rerollButton) {
    const rerollRect = layout.rerollButton;
    g.save();
    if (rolling) g.globalAlpha = 1;
    g.fillStyle = 'rgba(36,52,74,0.86)';
    g.strokeStyle = '#9fb5d8';
    g.lineWidth = 2;
    g.beginPath();
    g.rect(rerollRect.x, rerollRect.y, rerollRect.w, rerollRect.h);
    g.fill();
    g.stroke();
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    const label = popup.rerollsRemaining > 1
      ? t('skills.overlay.rerollCount', { count: popup.rerollsRemaining })
      : t('skills.overlay.reroll');
    g.fillStyle = '#ffffff';
    g.fillText(label, rerollRect.x + rerollRect.w / 2, rerollRect.y + rerollRect.h / 2 + 1);
    g.restore();
  }

  const cardNameFont = `12px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
  const levelFont = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
  const descFont = `7px "GameFont", "Press Start 2P", "Dalmoori", monospace`;

  const rollDuration = popup.rollDuration || 0;
  const flipDuration = (popup.rollFlipDuration || 0.6) * 0.6;
  const flipStagger = (popup.rollFlipStagger || 0.25) * 0.6;
  const elapsedRoll = rolling ? Math.max(0, rollDuration - popup.rollTimer) : rollDuration;

  layout.cards.forEach((rect, index) => {
    const card = popup.cards[index];
    const selected = !rolling && index === popup.selectedIndex;
    const flipStart = index * flipStagger;
    const cardProgress = rolling ? Math.max(0, Math.min(1, (elapsedRoll - flipStart) / flipDuration)) : 1;
    const flipping = rolling && cardProgress < 1;
    const facingFront = !rolling || cardProgress >= 0.5;
    const angle = Math.PI * (1 - Math.min(1, cardProgress));
    const absScale = flipping ? Math.max(0.08, Math.abs(Math.cos(angle))) : 1;

    g.save();
    g.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
    if (flipping) g.scale(absScale, 1);
    g.translate(-rect.w / 2, -rect.h / 2);

    g.fillStyle = selected ? 'rgba(96,132,255,0.42)' : 'rgba(22,34,52,0.88)';
    g.strokeStyle = selected ? '#9ab4ff' : 'rgba(60,77,112,0.9)';
    g.lineWidth = selected ? 3 : 2;
    g.beginPath();
    g.rect(0, 0, rect.w, rect.h);
    g.fill();
    g.stroke();

    const padding = 10;
    const iconSide = Math.min(rect.h - padding * 2, 96);
    const iconX = padding;
    const iconY = (rect.h - iconSide) / 2;

    if (facingFront) {
      const img = getSkillIconImage(card.id);
      if (img && img.complete) {
        g.drawImage(img, iconX, iconY, iconSide, iconSide);
      } else {
        g.fillStyle = 'rgba(25,38,60,0.6)';
        g.fillRect(iconX, iconY, iconSide, iconSide);
      }
    } else {
      g.fillStyle = 'rgba(36,48,70,0.9)';
      g.fillRect(iconX, iconY, iconSide, iconSide);
      g.strokeStyle = 'rgba(124,146,192,0.7)';
      g.lineWidth = 2;
      g.strokeRect(iconX + 4, iconY + 4, iconSide - 8, iconSide - 8);
      g.font = `18px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
      g.fillStyle = '#9ab4ff';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('?', iconX + iconSide / 2, iconY + iconSide / 2 + 1);
    }

    if (facingFront) {
      const textX = iconX + iconSide + padding;
      const textWidth = rect.w - padding - textX;
      const nameKey = SkillData.getSkillNameKey(card.id);
      const name = nameKey ? t(nameKey) : card.id;
      g.fillStyle = '#ffffff';
      g.textAlign = 'left';
      g.textBaseline = 'top';
      g.font = cardNameFont;
      g.fillText(name, textX, padding);

      const currentLevel = SkillSystem.getSkillLevel ? (SkillSystem.getSkillLevel(card.id) || 0) : 0;
      const levelLabel = t('skills.overlay.levelLabel', { level: currentLevel });
      g.font = levelFont;
      g.fillStyle = '#b4c0d9';
      g.fillText(levelLabel, textX, padding + 22);

      let descY = padding + 42;
      const def = SkillData.getSkillDefinition(card.id);
      const maxLevel = def ? (def.maxLevel || 1) : 1;
      const nextLevel = Math.min(maxLevel, currentLevel + 1);
      const descKey = SkillData.getSkillLevelKey(card.id, nextLevel);
      const descText = descKey ? t(descKey) : '';
      if (descText) {
        g.font = descFont;
        g.fillStyle = '#c5d4f1';
        const descLines = wrapSkillLines(descText, textWidth, g);
        const lineGap = 12;
        descLines.forEach((line) => {
          g.fillText(line, textX, descY);
          descY += lineGap;
        });
      }

      // Hidden skill requirements are intentionally not shown to keep the UI uncluttered.
    } else if (flipping) {
      g.font = descFont;
      g.fillStyle = '#8aa4ff';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(t('skills.overlay.flipping'), rect.w / 2, rect.h / 2);
    }

    g.restore();
  });
}

function renderSkillHud(g) {
  if (typeof State !== 'undefined' && State && State.current) {
    const phase = State.current;
    if (phase !== 'run' && phase !== 'boss' && phase !== 'boss_pending') return;
  }
  if (!SkillSystem || typeof SkillSystem.getActiveSkills !== 'function') return;
  const skills = SkillSystem.getActiveSkills();
  const panelW = 200;
  const lineGap = 14;
  const baseH = 34;
  const panelH = skills.length > 0 ? baseH + skills.length * lineGap : baseH + lineGap;
  const px = CONFIG.width - panelW - 12;
  const py = CONFIG.height - panelH - 12;
  g.save();
  g.fillStyle = 'rgba(14,22,34,0.82)';
  g.strokeStyle = '#5c82ff';
  g.lineWidth = 2;
  g.beginPath();
  g.rect(px, py, panelW, panelH);
  g.fill();
  g.stroke();
  g.textAlign = 'left';
  g.textBaseline = 'top';
  g.fillStyle = '#9fb5d8';
  g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
  g.fillText(t('skills.overlay.hudTitle'), px + 12, py + 10);
  if (!skills.length) {
    g.fillStyle = '#c5d4f1';
    g.font = `9px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(t('skills.overlay.emptyHud'), px + 12, py + 24);
    g.restore();
    return;
  }
  let offsetY = py + 24;
  skills.forEach((entry) => {
    const nameKey = SkillData.getSkillNameKey(entry.id);
    const name = nameKey ? t(nameKey) : entry.id;
    const levelLabel = t('skills.overlay.levelLabel', { level: entry.level });
    g.fillStyle = '#ffffff';
    g.font = `9px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(name, px + 12, offsetY);
    g.textAlign = 'right';
    g.fillStyle = '#ffe066';
    g.fillText(levelLabel, px + panelW - 12, offsetY);
    g.textAlign = 'left';
    offsetY += lineGap;
  });
  g.restore();
}

function handleSkillSelectionInput(dt) {
  if (!SkillSystem || typeof SkillSystem.getPopupState !== 'function') return;
  const popup = SkillSystem.getPopupState();
  if (!popup) return;
  if (popup.rollTimer && popup.rollTimer > 0) {
    if (UI && UI.reset) UI.reset();
    if (UI) UI.keyPressed = null;
    return;
  }
  const layout = computeSkillOverlayLayout(popup) || lastSkillOverlayLayout;
  if (!layout) return;

  const now = performance.now ? performance.now() : Date.now();
  const lockMillis = popup.createdAtMillis != null ? popup.createdAtMillis : (popup.createdAt || 0);
  const lockActive = now - lockMillis < 1000;
  if (lockActive) {
    if (UI && UI.reset) UI.reset();
    if (UI) UI.keyPressed = null;
    return;
  }

  const key = UI ? UI.keyPressed : null;
  if (key) {
    if (key === 'ArrowRight') {
      SkillSystem.moveSelection(1);
    } else if (key === 'ArrowLeft') {
      SkillSystem.moveSelection(-1);
    } else if (key === 'Space' || key === 'Enter') {
      if (popup.selectedIndex < 0 && !(SkillSystem.setSelectionIndex && popup.cards.length === 1)) {
        if (UI) UI.keyPressed = null;
        return;
      }
      const index = popup.selectedIndex >= 0 ? popup.selectedIndex : 0;
      if (SkillSystem.setSelectionIndex && popup.selectedIndex < 0) SkillSystem.setSelectionIndex(index);
      const card = popup.cards[index];
      if (card) {
        if (SkillSystem.completeSelectionById) SkillSystem.completeSelectionById(card.id);
        else SkillSystem.completeSelection(index);
      }
      if (UI && UI.reset) UI.reset();
      if (UI) UI.keyPressed = null;
      return;
    }
    if (UI) UI.keyPressed = null;
  }

  if (Input && Input.justPressed && (!UI || !UI.clicked)) {
    if (popup.selectedIndex < 0) {
      return;
    }
    const index = popup.selectedIndex;
    const card = popup.cards[index];
    if (card) {
      if (SkillSystem.completeSelectionById) SkillSystem.completeSelectionById(card.id);
      else SkillSystem.completeSelection(index);
    }
    if (UI && UI.reset) UI.reset();
    return;
  }

  if (UI && UI.clicked) {
    const mx = UI.mx;
    const my = UI.my;
    let handled = false;
    if (layout.rerollButton && pointInRect(mx, my, layout.rerollButton)) {
      if (SkillSystem.rerollSelection && popup.rerollsRemaining > 0) {
        handled = Boolean(SkillSystem.rerollSelection());
      }
    } else if (layout.cards && layout.cards.length) {
      layout.cards.forEach((rect, index) => {
        if (!handled && pointInRect(mx, my, rect)) {
          const card = popup.cards[index];
          if (SkillSystem.setSelectionIndex) SkillSystem.setSelectionIndex(index);
          if (SkillSystem.completeSelectionById) SkillSystem.completeSelectionById(card.id);
          else SkillSystem.completeSelection(index);
          handled = true;
        }
      });
    }
    if (UI.reset) UI.reset();
    if (handled) return;
  }
}

function updateRun(dt) {
  const baseDt = dt;
  if (slowMoTimer > 0) {
    dt *= SLOW_MO_SCALE;
  }
  simTime += dt;
  let ropeGlideLevel = 0;
  let airComboLevel = 0;
  let cashMagnetLevel = 0;
  let skyHarvestLevel = 0;
  let feverExtensionLevel = 0;
  let voidMagnetActive = false;
  let frenzyFeatherActive = false;
  let comboMasterActive = false;
  let droneSupportLevel = 0;
  let droneCollectorActive = false;
  let spiderGuardActive = false;
  if (typeof SkillSystem !== 'undefined' && SkillSystem && typeof SkillSystem.getSkillLevel === 'function') {
    const ropeGlideRaw = SkillSystem.getSkillLevel('rope_glide');
    if (Number.isFinite(ropeGlideRaw) && ropeGlideRaw > 0) {
      ropeGlideLevel = Math.max(0, Math.floor(ropeGlideRaw));
    }
    const airComboRaw = SkillSystem.getSkillLevel('air_combo');
    if (Number.isFinite(airComboRaw) && airComboRaw > 0) {
      airComboLevel = Math.max(0, Math.floor(airComboRaw));
    }
    const cashMagnetRaw = SkillSystem.getSkillLevel('cash_magnet');
    if (Number.isFinite(cashMagnetRaw) && cashMagnetRaw > 0) {
      cashMagnetLevel = Math.max(0, Math.floor(cashMagnetRaw));
    }
    const skyHarvestRaw = SkillSystem.getSkillLevel('sky_harvest');
    if (Number.isFinite(skyHarvestRaw) && skyHarvestRaw > 0) {
      skyHarvestLevel = Math.max(0, Math.floor(skyHarvestRaw));
    }
    const feverRaw = SkillSystem.getSkillLevel('fever_extension');
    if (Number.isFinite(feverRaw) && feverRaw > 0) {
      feverExtensionLevel = Math.max(0, Math.floor(feverRaw));
    }
    voidMagnetActive = SkillSystem.getSkillLevel('void_magnet') > 0;
    frenzyFeatherActive = SkillSystem.getSkillLevel('frenzy_feather') > 0;
    comboMasterActive = SkillSystem.getSkillLevel('combo_master') > 0;
    const droneSupportRaw = SkillSystem.getSkillLevel('drone_support');
    if (Number.isFinite(droneSupportRaw) && droneSupportRaw > 0) {
      droneSupportLevel = Math.max(0, Math.floor(droneSupportRaw));
    }
    droneCollectorActive = SkillSystem.getSkillLevel('drone_collector') > 0;
    spiderGuardActive = SkillSystem.getSkillLevel('spider_guard') > 0;
  }
  const ropeGlideCatchBonus = ROPE_GLIDE_CATCH_BONUS[Math.min(ropeGlideLevel, ROPE_GLIDE_CATCH_BONUS.length - 1)] || 0;
  const airComboChance = AIR_COMBO_TRIGGER_CHANCE[Math.min(airComboLevel, AIR_COMBO_TRIGGER_CHANCE.length - 1)] || 0;
  const cashMagnetPullBonus = CASH_MAGNET_PULL_BONUS[Math.min(cashMagnetLevel, CASH_MAGNET_PULL_BONUS.length - 1)] || 0;
  const feverDurationBonusPct = FEVER_EXTENSION_BONUS[Math.min(feverExtensionLevel, FEVER_EXTENSION_BONUS.length - 1)] || 0;
  updateSupportDrones(baseDt, droneSupportLevel, droneCollectorActive, spiderGuardActive);
  updateSpiderWebs(baseDt);
  renderSupportDroneState.spiderGuardActive = spiderGuardActive;
  if (voidMagnetActive) {
    voidMagnetTimer -= baseDt;
    if (voidMagnetTimer <= 0) {
      voidMagnetTimer += VOID_MAGNET_INTERVAL_SEC;
      const node = {
        x: player.x,
        y: player.y,
        life: VOID_MAGNET_LIFETIME_SEC,
      };
      voidMagnetNodes.push(node);
      spawnEffect('burst', node.x, node.y - 12);
    }
  } else {
    voidMagnetTimer = VOID_MAGNET_INTERVAL_SEC;
    if (voidMagnetNodes.length) voidMagnetNodes.length = 0;
  }
  for (let i = voidMagnetNodes.length - 1; i >= 0; i--) {
    const node = voidMagnetNodes[i];
    node.life -= baseDt;
    if (node.life <= 0) {
      voidMagnetNodes.splice(i, 1);
    }
  }
  if (!starModeActive || !frenzyFeatherActive) {
    frenzyFeatherQueue = 0;
    frenzyFeatherTickTimer = 0;
  } else if (frenzyFeatherQueue > 0) {
    frenzyFeatherTickTimer -= baseDt;
    while (frenzyFeatherQueue > 0 && frenzyFeatherTickTimer <= 0) {
      frenzyFeatherTickTimer += 0.2;
      frenzyFeatherQueue -= 1;
      skillCashBonusThisRun += 1;
      spawnEffect('combo', player.x, player.y - 18, t('effects.cashEarned', { cash: 1 }));
    }
  }
  if (slowMoPendingTimer > 0) {
    slowMoPendingTimer = Math.max(0, slowMoPendingTimer - baseDt);
    if (slowMoPendingTimer <= 0) {
      triggerSlowMoImmediate(
        (slowMoPendingEffect && slowMoPendingEffect.x != null) ? slowMoPendingEffect.x : player.x,
        (slowMoPendingEffect && slowMoPendingEffect.y != null) ? slowMoPendingEffect.y : (player.y - 24)
      );
      slowMoPendingEffect = null;
    }
  }
  if (slowMoTimer > 0) slowMoTimer = Math.max(0, slowMoTimer - baseDt);
  if (slowMoCooldown > 0) slowMoCooldown = Math.max(0, slowMoCooldown - baseDt);
  if (tutorialEnabled) {
    const steps = tutorialSteps();
    const total = steps.length || 0;
    if (total > 0 && tutorialStepIndex < total) {
      tutorialStepTimer += baseDt;
      if (tutorialStepTimer >= TUTORIAL_STEP_DURATION) {
        tutorialStepTimer -= TUTORIAL_STEP_DURATION;
        tutorialStepIndex += 1;
      }
    }
  }
  if (bossOutcomeTimer > 0) {
    bossOutcomeTimer = Math.max(0, bossOutcomeTimer - baseDt);
    if (bossOutcomeTimer <= 0) bossOutcomeBanner = null;
  }
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
  const justPressed = Input.anyPressed();
  let dronePressConsumed = false;

  if (player.mode === 'drone') {
    const ride = player.droneRide;
    if (!ride || ride.rider !== true) {
      dismountDrone(false, true);
    } else if (justPressed) {
      dismountDrone(true);
      dronePressConsumed = true;
    }
  } else if (player.mode === 'free' && supportDrones && supportDrones.length) {
    for (let i = 0; i < supportDrones.length; i++) {
      const drone = supportDrones[i];
      if (!drone || drone.rider || (drone.mountCooldown && drone.mountCooldown > 0)) continue;
      const offsetY = drone.rideOffset || DRONE_RIDE_OFFSET;
      const dx = player.x - drone.x;
      const dy = (player.y - (drone.y + offsetY));
      const mountRadius = Math.max(drone.radius || 30, 30);
      if (Math.hypot(dx, dy) <= mountRadius) {
        if (Math.random() < DRONE_AUTO_MOUNT_PROBABILITY) {
          mountDrone(drone);
          break;
        }
        drone.mountCooldown = Math.max(drone.mountCooldown || 0, DRONE_MOUNT_RETRY_COOLDOWN);
      }
    }
  }

  if (justPressed) {
    pressStartAt = simTime;
    flyLongPressTriggered = false;
  }

  if (player.mode === 'attached') {
    if (powerChargeActive) {
      if (Input.down) {
        powerCharge = Math.min(1, powerCharge + baseDt / POWER_CHARGE_SECONDS);
      }
      if (!Input.down) {
        performDetach(powerCharge);
      }
    } else if (powerChargeAvailable && justPressed) {
      powerChargeActive = true;
      powerCharge = 0;
    } else if (justPressed) {
      performDetach(0);
    }
  } else if (justPressed && !dronePressConsumed) {
    if (airJumpsLeft > 0) {
      player.airFlap();
      airJumpsLeft -= 1;
      usedAirJumps += 1;
    }
  }
  // Reset fly when not holding
  if (!Input.down) flyActiveRemaining = 0;

  // Update ropes buffer
  if (!webRopeJustCreated) {
    ensureRopesBuffered();
  }
  cleanupRopes();

  // Update stage bullets (after stage 5, or forced infinite mode)
  const stageNumber = (typeof currentStageIndex === 'number') ? (currentStageIndex + 1) : (Math.floor(score / 20) + 1);
  const stageDiff = (typeof stageDifficultyState !== 'undefined') ? stageDifficultyState : null;
  const bulletsActive = (stageNumber > 5 || (stageDiff && stageDiff.infiniteBulletMode)) && !starModeActive;
  if (bulletsActive) {
    const baseInterval = Math.max(3, 6 - Math.floor((Math.max(stageNumber, 6) - 1) / 5));
    const intervalOverride = stageDiff && stageDiff.bulletIntervalOverride != null ? stageDiff.bulletIntervalOverride : null;
    stageBulletInterval = intervalOverride != null ? intervalOverride : baseInterval;

    // Spawn bullets
    stageBulletTimer += baseDt;
    if (stageBulletTimer >= stageBulletInterval) {
      stageBulletTimer = 0;
      const volley = stageDiff ? stageDiff.bulletVolley : 1;
      const speedMultiplier = stageDiff ? stageDiff.bulletSpeedMultiplier : 1;
      const speed = 220 * speedMultiplier;
      const baseAngle = Math.PI; // shoot from right to left
      const spawnBaseY = (CONFIG.height * 0.5) + randRange(-50, 50);
      for (let n = 0; n < volley; n += 1) {
        const angleOffset = ((Math.random() * 20) - 10) * (Math.PI / 180);
        const angle = baseAngle + angleOffset;
        const verticalSpread = (volley > 1) ? (n - (volley - 1) / 2) * 18 : 0;
        stageBullets.push({
          x: camera.x + CONFIG.width + 40,
          y: spawnBaseY + verticalSpread,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: 12,
          life: 0,
        });
      }
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
          consumePowerCharge();
          continue;
        }
      }

      // Remove off-screen bullets
      if (bullet.x < camera.x - 100) {
        if (stageDiff && stageDiff.cashPerDodgedBullet > 0) {
          const cashReward = stageDiff.cashPerDodgedBullet;
          savings += cashReward;
          skillCashBonusThisRun += cashReward;
          if (typeof addToPlayerStat === 'function') addToPlayerStat('totalCashEarned', cashReward);
          const effectX = camera.x + 48;
          const effectY = Math.max(CONFIG.height * 0.25, Math.min(CONFIG.height - 80, bullet.y));
          spawnEffect('combo', effectX, effectY, t('effects.cashEarned', { cash: cashReward }));
          try { localStorage.setItem(SAVINGS_KEY, String(savings)); } catch (_) {}
        }
        stageBullets.splice(i, 1);
      }
    }
  }

  // Box pickup
  const magnetLevel = shopInv.magnetLevel || 0;
  const baseCatchR = CONFIG.catchBase;
  const magnetPullR = baseCatchR + magnetLevel * 10 + cashMagnetPullBonus;
  const magnetPullSpeed = 140 + magnetLevel * 60; // px/s pull toward player when within magnet radius
  const budHitZones = computeBudHitZones();
  const droneCatchZones = computeSupportDroneZones();

  for (const b of boxes) {
    if (!b.active) continue;
    if (voidMagnetActive && voidMagnetNodes.length && b.kind !== 'star') {
      let consumedByVoid = false;
      for (const node of voidMagnetNodes) {
        const ndx = node.x - b.x;
        const ndy = node.y - b.y;
        const distNode = Math.hypot(ndx, ndy);
        if (distNode <= VOID_MAGNET_RADIUS_PX) {
          const pullStep = VOID_MAGNET_PULL_SPEED_PX * dt;
          if (distNode <= Math.max(12, pullStep)) {
            b.active = false;
            consumedByVoid = true;
            skillCashBonusThisRun += 1;
            spawnEffect('combo', node.x, node.y - 12, t('effects.cashEarned', { cash: 1 }));
            break;
          }
          const nx = ndx / (distNode || 1);
          const ny = ndy / (distNode || 1);
          b.x += nx * pullStep;
          b.y += ny * pullStep;
        }
      }
      if (consumedByVoid) {
        continue;
      }
    }
    let dx = b.x - player.x;
    let dy = b.y - player.y;
    let dist = Math.hypot(dx, dy);
    let caughtByDrone = null;

    if ((magnetLevel > 0 || cashMagnetLevel > 0) && dist > baseCatchR && dist <= magnetPullR) {
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
    if (!caught && droneCatchZones.length > 0) {
      for (let i = 0; i < droneCatchZones.length; i++) {
        const zone = droneCatchZones[i];
        const ddx = b.x - zone.x;
        const ddy = b.y - zone.y;
        if (Math.hypot(ddx, ddy) <= zone.r) {
          caught = true;
          caughtByDrone = zone;
          break;
        }
      }
    }

    if (!caught) continue;

    b.active = false;
    addToPlayerStat && addToPlayerStat('itemsCollected', 1);
    const wobble = Math.sin(simTime * 3 + (b.phase || 0)) * 6;
    const displayY = caughtByDrone ? caughtByDrone.y : (b.y + wobble);
    const displayX = caughtByDrone ? caughtByDrone.x : player.x;
    const caughtInAir = caughtByDrone ? true : (player.mode === 'free');

    if (b.kind === 'star') {
      starModeActive = true;
      const feverBonus = (shopInv.feverLevel || 0) * FEVER_BONUS_SECONDS;
      const baseFeverDuration = (CONFIG.starDuration || 3.0);
      const skillBonus = baseFeverDuration * feverDurationBonusPct;
      starModeEndTime = simTime + baseFeverDuration + feverBonus + skillBonus;
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
      onPlayerAttached();
      player.x = targetWorldX - camera.x;
      player.y = targetWorldY;
      player.vx = 0;
      player.vy = -140;
      lastDetachedRope = null;
      catchLockUntil = simTime + 0.2;
      webRopeJustCreated = true;
      spawnEffect('big', b.x, displayY);
    } else {
      const burstX = caughtByDrone ? caughtByDrone.x : b.x;
      spawnEffect('burst', burstX, displayY);
      if (b.kind === 'extraJump') pendingExtraJump = true;
      else if (b.kind === 'wideCatch') pendingCatchR = 50;
      else if (b.kind === 'bigSize') pendingSizeScale = 1.5;
      else if (b.kind === 'slow') {
        spawnEffect('sparkle', player.x, player.y - 18);
        triggerSlowMoImmediate(player.x, player.y - 24, 0);
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
      if (skyHarvestLevel > 0 && caughtInAir) {
        const bonusCash = SKY_HARVEST_CASH_BONUS[Math.min(skyHarvestLevel, SKY_HARVEST_CASH_BONUS.length - 1)] || 0;
        if (bonusCash > 0) {
          skillCashBonusThisRun += bonusCash;
          spawnEffect('combo', player.x, player.y - 18, t('effects.cashEarned', { cash: bonusCash }));
        }
        if (skyHarvestLevel >= 3) {
          exp += 1;
          if (typeof addToPlayerStat === 'function') addToPlayerStat('totalExpEarned', 1);
          try { localStorage.setItem(EXP_KEY, String(exp)); } catch (_) {}
          spawnEffect('combo', player.x, player.y - 6, '+1 EXP');
        }
      }
      if (frenzyFeatherActive && starModeActive && caughtInAir) {
        if (frenzyFeatherQueue === 0) frenzyFeatherTickTimer = 0;
        frenzyFeatherQueue += 1;
      }
    }
  }

  // Update player
  player.update(dt, simTime);
  if (spiderGuardActive && spiderWebs && spiderWebs.length > 0 && player.mode === 'free' && player.vy > 0) {
    for (let i = 0; i < spiderWebs.length; i++) {
      const web = spiderWebs[i];
      const dx = player.x - web.x;
      const dy = player.y - web.y;
      if (Math.abs(dx) <= web.radius && Math.abs(dy) <= 24) {
        player.vy = -Math.max(420, Math.abs(player.vy) * 0.8 + 320);
        player.mode = 'free';
        usedAirJumps = 0;
        spawnEffect('burst', web.x, web.y - 12);
        web.ttl = Math.min(web.ttl, 1.5);
        break;
      }
    }
  }
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
    consumePowerCharge();
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
      const glowBonus = shopInv.glowLevel ? (shopInv.glowLevel * 0.1 * CONFIG.catchBase) : 0;
      let catchR = (pendingCatchR > 0 ? pendingCatchR : CONFIG.catchBase) + glowBonus;
      catchR += ropeGlideCatchBonus;
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
        onPlayerAttached();
        addToPlayerStat && addToPlayerStat('ropesCaught', 1);
        wizardFloatTimer = 0;
        wizardSpinTimer = 0;
        wizardSpinRate = 0;
        const baseGained = starModeActive ? 3 : ((usedAirJumps === 0) ? 3 : (usedAirJumps === 1) ? 2 : 1);
        let rewardGain = baseGained;
        const kind = (baseGained === 3) ? 'big' : (baseGained === 2) ? 'medium' : 'small';
        const tipNow = rope.tip(simTime);
        spawnEffect(kind, tipNow.x, tipNow.y);

        let comboEligible = starModeActive || usedAirJumps === 0;
        let airComboTriggered = false;
        if (!comboEligible && airComboLevel > 0 && usedAirJumps > 0 && airComboChance > 0) {
          if (Math.random() < airComboChance) {
            comboEligible = true;
            airComboTriggered = true;
          }
        }
        if (comboMasterActive) {
          comboEligible = true;
        }
        const comboBonusMultiplier = (frenzyFeatherActive && starModeActive) ? 5 : 1;

        if (comboEligible) {
          comboCount++;
          if (characterIs('pirate') && comboCount >= 2) {
            const pirateCashGain = 2 * comboBonusMultiplier;
            pirateBonusThisRun += pirateCashGain;
            if (comboBonusMultiplier > 1) {
              spawnEffect('combo', player.x, player.y - 48, t('effects.cashEarned', { cash: pirateCashGain }));
            }
          }
          if (comboCount >= 2) {
            spawnEffect('combo', player.x, player.y - 30, t('effects.comboCount', { combo: comboCount }));
          }
        } else {
          comboCount = 0;
        }
        if (airComboTriggered && airComboLevel >= 3) {
          const airComboCash = comboBonusMultiplier;
          skillCashBonusThisRun += airComboCash;
          spawnEffect('combo', player.x, player.y - 18, t('effects.cashEarned', { cash: airComboCash }));
        }
        const comboLevel = shopInv.comboLevel || 0;
        rewardGain = Math.max(1, Math.round(rewardGain));
        if (comboLevel > 0 && comboEligible && comboCount >= 2) {
          const baseBonus = comboLevel * Math.max(1, comboCount - 1) * COMBO_BONUS_PER_LEVEL;
          const bonus = baseBonus * comboBonusMultiplier;
          rewardGain += bonus;
        }
        const tailorCatchBonus = (rope.tailorBonus && characterIs('tailor')) ? rope.tailorBonus : 0;
        baseScoreForRewards += rewardGain;
        let scoreGain = rewardGain;
        if (characterIs('knight')) scoreGain *= 2;
        score += scoreGain;
        if (comboMasterActive && comboEligible && comboCount > 0) {
          const comboCash = 1;
          skillCashBonusThisRun += comboCash;
          spawnEffect('combo', player.x, player.y - 42, t('effects.cashEarned', { cash: comboCash }));
        }
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
      onPlayerAttached();
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
      onPlayerAttached();
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
    let earnedMoneyCore = baseEarned;
    let earnedExpCore = baseEarned;
    if (characterIs('pirate')) earnedMoneyCore += pirateBonusThisRun;
    earnedMoneyCore += tailorCashBonusThisRun;
    earnedMoneyCore += skillCashBonusThisRun;
    if (characterIs('knight')) {
      earnedMoneyCore *= 2;
      earnedExpCore *= 2;
    }
    if (shopInv.gambleActive) {
      earnedMoneyCore = Math.floor(earnedMoneyCore * 1.5);
      earnedExpCore = Math.floor(earnedExpCore * 1.5);
      shopInv.gambleActive = false; // Consume gamble
      saveShopInv(shopInv);
      hudConsumables = (hudConsumables || []).filter((entry) => entry && entry.id !== 'gamble');
    }

    if (rouletteState && rouletteState.active) {
      finalizeRouletteSpin();
      if (rouletteState.finalOp != null && !rouletteState.applied) {
        const beforeMoney = earnedMoneyCore;
        let afterMoney = beforeMoney;
        const op = rouletteState.finalOp;
        const val = rouletteState.finalValue || 0;
        if (op === '+') afterMoney = beforeMoney + val;
        else if (op === '-') afterMoney = beforeMoney - val;
        else if (op === 'x') afterMoney = beforeMoney * Math.max(1, val);
        afterMoney = Math.max(0, Math.floor(afterMoney));
        earnedMoneyCore = afterMoney;
        rouletteSummary = { before: beforeMoney, after: afterMoney, op, value: val };
        rouletteState.applied = true;
      }
    }

    const summaryMoney = earnedMoneyCore + stageGateCashBonusThisRun;
    const summaryExp = earnedExpCore + stageGateExpBonusThisRun;
    lastEarned = summaryMoney;
    lastExpEarned = summaryExp;
    if (summaryMoney <= 0 && summaryExp <= 0) {
      const availableTips = GAME_OVER_TIP_KEYS.filter((key) => t(key) !== key);
      if (availableTips.length) {
        gameOverTipKey = availableTips[Math.floor(Math.random() * availableTips.length)];
      } else {
        gameOverTipKey = null;
      }
    } else {
      gameOverTipKey = null;
    }
    // Compute potential level-up BEFORE applying demo resets (based on EXP)
    const prevLevel = getLevelByExp(exp);
    const newLevel = getLevelByExp(exp + earnedExpCore);
    if (newLevel > prevLevel) {
      gameOverLevelUp = { from: prevLevel, to: newLevel };
      levelUpPopupTimer = 0;
      // celebratory particles near screen center
      const cx = camera.x + CONFIG.width / 2;
      const cy = CONFIG.height * 0.36;
      spawnEffect('big', cx, cy);
    }
    if (earnedMoneyCore > 0 || earnedExpCore > 0) {
      savings += earnedMoneyCore;
      exp += earnedExpCore;
      if (earnedMoneyCore > 0 && typeof addToPlayerStat === 'function') addToPlayerStat('totalCashEarned', earnedMoneyCore);
      if (earnedExpCore > 0 && typeof addToPlayerStat === 'function') addToPlayerStat('totalExpEarned', earnedExpCore);
      try {
        localStorage.setItem(SAVINGS_KEY, String(savings));
        localStorage.setItem(EXP_KEY, String(exp));
      } catch(_){}
    }
      tailorCashBonusThisRun = 0;
      skillCashBonusThisRun = 0;
      pirateBonusThisRun = 0;
      stageGateCashBonusThisRun = 0;
      stageGateExpBonusThisRun = 0;
    baseScoreForRewards = 0;
    wizardFloatTimer = 0;
    wizardSpinTimer = 0;
    wizardSpinRate = 0;
    if (demoActive) {
      demoRunCount += 1;
      // Demo rule: require both 111P and minimum runs before graduating from demo
      if (exp > 110 && demoRunCount >= DEMO_REQUIRED_RUNS) {
        lastDemoLoss = true;
        demoActive = false;
        if (typeof setTutorialEnabled === 'function') setTutorialEnabled(false);
        savings = 0;
        try {
          localStorage.setItem(SAVINGS_KEY, '0');
          localStorage.setItem(DEMO_DONE_KEY, '1');
          localStorage.removeItem(DEMO_RUN_COUNT_KEY);
          // Reset EXP and clear all items when demo ends
          exp = 0;
          localStorage.setItem(EXP_KEY, '0');
          shopInv = { ...SHOP_INV_DEFAULTS };
          saveShopInv(shopInv);
          saveShopInv(shopInv);
          selectedCharacter = 'default';
          localStorage.setItem('webswing_selected_char_v1', 'default');
        } catch(_){}
        demoRunCount = 0;
      } else {
        try { localStorage.setItem(DEMO_RUN_COUNT_KEY, String(demoRunCount)); } catch (_) {}
      }
    }
    best = Math.max(best, score);
    try {
      localStorage.setItem(BEST_SCORE_KEY, String(best));
    } catch(_) {}
    // End fever state on game over
    starModeActive = false;
    starModeEndTime = 0;
    if (!demoActive && typeof IS_NATIVE_APP !== 'undefined' && IS_NATIVE_APP && typeof consumeDailyLife === 'function') {
      if (!lifeSpentThisRun) {
        if (typeof ensureDailyState === 'function') ensureDailyState();
        const currentLevel = (typeof getLevelByExp === 'function') ? getLevelByExp(exp) : 1;
        if (currentLevel > 1) consumeDailyLife();
        lifeSpentThisRun = true;
      }
    }
    if (typeof addToPlayerStat === 'function') addToPlayerStat('gameOverCount', 1);
    if (typeof flushPlayerStats === 'function') flushPlayerStats();
    if(exp == 0 && savings == 0 && demoActive == false) {
      savePlayerStats(playerStatDefault);
    }
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
  let tutorialOverlayLines = null;
  let tutorialOverlayIndex = 0;
  let tutorialOverlayTotal = 0;
  if (tutorialEnabled) {
    const steps = tutorialSteps();
    tutorialOverlayTotal = steps.length || 0;
    if (tutorialOverlayTotal > 0 && tutorialStepIndex < tutorialOverlayTotal) {
      const stepRaw = steps[tutorialStepIndex] || '';
      tutorialOverlayLines = String(stepRaw).split('\n');
      tutorialOverlayIndex = tutorialStepIndex;
    }
  }
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
      const alphaBase = 0.2;
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
    const boxImg = getBoxItemImage();
    if (boxImg) {
      const ratio = (boxImg.width > 0 && boxImg.height > 0) ? (boxImg.height / boxImg.width) : 1;
      const drawW = 26;
      const drawH = drawW * ratio;
      g.save();
      g.imageSmoothingEnabled = false;
      g.drawImage(boxImg, sx - drawW / 2, sy - drawH / 2, drawW, drawH);
      g.restore();
    } else {
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
        // Fallback to text if no asset is ready
        g.fillStyle = '#fff';
        g.font = `11px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText('?', sx, sy + 1);
      }
    }
    g.restore();
  }

  drawSpiderWebs(g);

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

  drawSupportDrones(g, renderSupportDroneState.spiderGuardActive);

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

  if (tutorialOverlayLines) {
    const px = 18;
    const py = CONFIG.height * 0.38 + 100;
    const lineGap = 14;
    const bodyHeight = tutorialOverlayLines.length * lineGap;
    const panelWidth = Math.min(CONFIG.width - 36, 320);
    const panelHeight = 60 + bodyHeight;
    g.save();
    g.fillStyle = 'rgba(15,26,42,0.78)';
    g.strokeStyle = '#ffe066';
    g.lineWidth = 2;
    g.fillRect(px, py, panelWidth, panelHeight);
    g.strokeRect(px, py, panelWidth, panelHeight);
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.fillStyle = '#ffe066';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(t('guide.tutorialTitle'), px + 12, py + 10);
    g.fillStyle = '#b4c0d9';
    g.font = `8px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(t('guide.tutorialStep', { current: tutorialOverlayIndex + 1, total: tutorialOverlayTotal }), px + 12, py + 24);
    g.fillStyle = '#ffffff';
    g.font = `9px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    let ty = py + 48;
    for (const line of tutorialOverlayLines) {
      g.fillText(line, px + 12, ty);
      ty += lineGap;
    }
    g.restore();
  }

  if (bossOutcomeBanner && bossOutcomeTimer > 0) {
    const lines = [];
    if (bossOutcomeBanner.customMessage) {
      lines.push(bossOutcomeBanner.customMessage);
    } else {
      const primaryKey = bossOutcomeBanner.success ? 'bossOutcome.success' : 'bossOutcome.failure';
      lines.push(t(primaryKey));
    }
    if (bossOutcomeBanner.success) {
      const cash = bossOutcomeBanner.rewardCash || 0;
      const score = bossOutcomeBanner.rewardScore || 0;
      if (!bossOutcomeBanner.customMessage) {
        if (cash > 0 && score > 0) {
          lines.push(t('bossOutcome.rewardCashScore', { cash, score }));
        } else if (cash > 0) {
          lines.push(t('bossOutcome.rewardCash', { cash }));
        } else if (score > 0) {
          lines.push(t('bossOutcome.rewardScore', { score }));
        }
      }
    } else if (!bossOutcomeBanner.customMessage) {
      const reasonText = translateBossOutcomeReason(bossOutcomeBanner.reason);
      if (reasonText) lines.push(reasonText);
    }
    const panelWidth = Math.min(CONFIG.width * 0.72, 320);
    const panelHeight = 34 + Math.max(0, lines.length - 1) * 18;
    const px = (CONFIG.width - panelWidth) / 2;
    const py = CONFIG.height * 0.18;
    g.save();
    g.fillStyle = 'rgba(15,26,42,0.78)';
    g.strokeStyle = bossOutcomeBanner.success ? '#6fffb0' : '#ff8a8a';
    g.lineWidth = 2;
    g.fillRect(px, py, panelWidth, panelHeight);
    g.strokeRect(px, py, panelWidth, panelHeight);
    lines.forEach((text, idx) => {
      const color = idx === 0
        ? (bossOutcomeBanner.success ? '#9cffc7' : '#ff9c9c')
        : '#ffffff';
      const size = idx === 0 ? 14 : 11;
      const lineY = py + 18 + idx * 18;
      drawCenteredText(g, text, lineY, size, color);
    });
    g.restore();
  }

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
  } else if (player.mode === 'attached' && (powerChargeActive || (powerCharge > 0 && powerChargeAvailable))) {
    g.textAlign = 'center';
    g.fillStyle = '#8fd6ff';
    g.font = `12px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(t('hud.power'), CONFIG.width / 2, 10);
    const bw = 120, bh = 6;
    const bx = (CONFIG.width - bw) / 2;
    const by = 26;
    g.fillStyle = 'rgba(255,255,255,0.15)';
    g.fillRect(bx, by, bw, bh);
    g.fillStyle = '#8fd6ff';
    g.fillRect(bx, by, bw * Math.max(0, Math.min(1, powerCharge)), bh);
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

  renderSkillHud(g);
  renderSkillSelectionOverlay(g);
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
      const shotsDisplay = (b.shotsDisplay != null) ? b.shotsDisplay : b.shotsFired;
      g.fillText(t('boss.bulletHud', {
        shots: shotsDisplay,
        total: b.totalShots,
        hits: b.hitsTaken || 0,
        limit: b.hitLimit || 4,
      }), CONFIG.width / 2, 40);
    } else if (bossState.type === 'slam') {
      const b = bossState.battle;
      const jumpCount = b ? (b.jumpCount || 0) : 0;
      g.save();
      g.textBaseline = 'middle';
      g.font = `36px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
      g.fillText(String(jumpCount), CONFIG.width / 2, CONFIG.height * 0.42);
      g.restore();
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
  renderSkillHud(g);
}

if (typeof globalThis !== 'undefined') {
  globalThis.renderIntro = renderIntro;
  globalThis.activateBridgeView = activateBridgeView;
  globalThis.updateBridgeView = updateBridgeView;
  globalThis.isBridgeViewActive = isBridgeViewActive;
  globalThis.getBridgeFlipProgress = getBridgeFlipProgress;
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
  const originX = 28;
  const x1 = originX;
  const x2 = originX + boxW + gap;
  const y = groundY + 8;

  g.save();
  g.textAlign = 'left';
  g.textBaseline = 'top';
  g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
  g.fillStyle = '#ffffff';
  g.fillText(t('roulette.title'), originX, y - 14);

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

  g.textAlign = 'left';
  g.textBaseline = 'top';
  g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
  const textY = y + boxH + 6;
  if (rouletteState.spinning) {
    g.fillText(t('roulette.spinning'), originX, textY);
  } else if (rouletteSummary && rouletteState.applied) {
    const opSymbol = rouletteSummary.op === 'x' ? '×' : rouletteSummary.op;
    g.fillText(t('roulette.formula', {
      before: rouletteSummary.before,
      op: opSymbol,
      value: rouletteSummary.value,
      after: rouletteSummary.after,
    }), originX, textY);
  } else if (settled) {
    g.fillText(t('roulette.locked'), originX, textY);
  }

  g.restore();
}

function computeBudHitZones() {
  const budsLevel = shopInv.budsLevel || 0;
  if (!budsLevel) return [];
  const runtimeBuds = (typeof activeBudsCount === 'number')
    ? Math.max(0, Math.min(activeBudsCount, budsLevel))
    : budsLevel;
  const budsCount = Math.min(6, runtimeBuds);
  if (!budsCount) return [];
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
  if (gameOverMenuMessageTimer > 0) {
    gameOverMenuMessageTimer = Math.max(0, gameOverMenuMessageTimer - dt);
    if (gameOverMenuMessageTimer <= 0) gameOverMenuMessage = null;
  }
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

  const lvl = getLevelByExp(exp);
  if (gameOverMenuButtons && gameOverMenuButtons.length) {
    for (const button of gameOverMenuButtons) {
      if (!button || !button.meta || typeof button.meta.requiredLevel !== 'number') continue;
      const shouldDisable = lvl < button.meta.requiredLevel;
      button.disabled = shouldDisable;
    }
  }

  const outOfLives = typeof IS_NATIVE_APP !== 'undefined' && IS_NATIVE_APP && nativeLivesRemaining() <= 0;

  // Build buttons if not exist
  if (outOfLives) {
    if (uiButtons && Array.isArray(uiButtons.gameover) && uiButtons.gameover.length) uiButtons.gameover = [];
    gameOverMenuButtons = [];
  } else if (uiButtons && Array.isArray(uiButtons.gameover) && uiButtons.gameover.length === 0) {
    buildGameOverButtons();
  }

  // Check button clicks
  if (UI.clicked && State.current === 'gameover') {
    if (!outOfLives && uiButtons && Array.isArray(uiButtons.gameover)) {
      for (const button of uiButtons.gameover) {
        if (button.isClicked(UI.mx, UI.my)) {
          button.onClick();
          UI.reset();
          Input.down = false; Input.justPressed = false;
          return;
        }
      }
    }

    // If no button clicked, restart game
    UI.reset();
    Input.down = false; Input.justPressed = false;
    if (outOfLives) {
      triggerLifeAd(false);
    } else {
      resetRun();
    }
    return;
  }

  // Restart on Space or Escape
  if (UI.keyPressed === 'Space' || UI.keyPressed === 'Escape') {
    UI.reset();
    Input.down = false; Input.justPressed = false;
    if (outOfLives) {
      triggerLifeAd(false);
    } else {
      resetRun();
    }
  }
}

function renderGameOver(g) {
  drawBackground(g);
  drawParticles(g);
  const yAdjust = -100;
  const adjust = (val) => val + yAdjust;
  const isNative = typeof IS_NATIVE_APP !== 'undefined' && IS_NATIVE_APP;
  const rawLives = isNative ? nativeLivesRemaining() : Number.POSITIVE_INFINITY;
  const lives = Math.max(0, rawLives);
  const outOfLives = isNative && lives <= 0;
  if (isNative) {
    const maxLives = nativeLivesMax();
    const displayCurrent = (rawLives === Number.POSITIVE_INFINITY) ? '∞' : lives;
    const maxText = (maxLives === Number.POSITIVE_INFINITY) ? '∞' : maxLives;
    g.fillStyle = '#b4c0d9';
    g.textAlign = 'right';
    g.textBaseline = 'top';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(t('ads.lifeCounter', { current: displayCurrent, max: maxText }), CONFIG.width - 12, 12);
  }
  if (lastDemoLoss) {
    drawCenteredText(g, t('gameOver.title'), adjust(CONFIG.height * 0.30), 18, '#ff6666');
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'top';
    g.font = `12px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(t('gameOver.demoLossLine1'), CONFIG.width / 2, adjust(CONFIG.height * 0.40 - 20));
    g.fillText(t('gameOver.demoLossLine2'), CONFIG.width / 2, adjust(CONFIG.height * 0.46 - 20));
  } else {
    drawCenteredText(g, t('gameOver.title'), adjust(CONFIG.height * 0.30), 18, '#ff6666');
    drawCenteredText(g, t('hud.score', { score }), adjust(CONFIG.height * 0.40 - 20), 12);

    // Savings summary and next target
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'top';
    const y0 = adjust(CONFIG.height * 0.46 - 20);
    function nextLevelThreshold(val) {
      for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
        if (val < LEVEL_THRESHOLDS[i]) return LEVEL_THRESHOLDS[i];
      }
      return null;
    }
    let nextText;
    if (demoActive) {
      const runsRemaining = Math.max(0, DEMO_REQUIRED_RUNS - demoRunCount);
      if (exp > 110 && runsRemaining > 0) {
        nextText = t('gameOver.nextDemoRuns', { runs: runsRemaining });
      } else {
        nextText = t('gameOver.nextDemo');
      }
    } else {
      const next = nextLevelThreshold(exp);
      if (next) {
        const remaining = Math.max(0, next - exp);
        nextText = t('gameOver.nextLevel', { remaining });
      } else {
        nextText = t('gameOver.maxLevel');
      }
    }
    let earnedText;
    if (lastEarned > 0 || lastExpEarned > 0) {
      earnedText = t('gameOver.earned', { money: lastEarned, exp: lastExpEarned });
    } else if (gameOverTipKey) {
      const tipLabel = t('gameOver.tipLabel');
      earnedText = `${tipLabel}: ${t(gameOverTipKey)}`;
    } else {
      earnedText = t('gameOver.earnedHint');
    }
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
    const cy = adjust(CONFIG.height * 0.22);
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
    drawCenteredText(g, t('gameOver.retryCountdown', { seconds: sec }), adjust(CONFIG.height * 0.74 - 20), 10, '#b4c0d9');
  } else {
    drawCenteredText(g, t('gameOver.retryReady'), adjust(CONFIG.height * 0.74 - 20), 10, '#b4c0d9');
    if (!outOfLives) {
      const menuSet = new Set(gameOverMenuButtons || []);
      if (gameOverMenuButtons && gameOverMenuButtons.length) {
        gameOverMenuButtons.forEach((button) => drawUIButtonRect(g, button));
        const messageAnchor = gameOverMenuButtons[gameOverMenuButtons.length - 1];
        if (gameOverMenuMessage && messageAnchor) {
          const msgY = messageAnchor.y + messageAnchor.h + 8;
          drawCenteredText(g, gameOverMenuMessage, msgY, 9, '#ffb347');
        }
      }
      if (uiButtons.gameover && uiButtons.gameover.length) {
        uiButtons.gameover.forEach((button) => {
          if (!button || menuSet.has(button)) return;
          const isFastToggle = button.meta && button.meta.type === 'fast-toggle';
          drawUIButtonRect(g, button, isFastToggle ? {
            fill: fastModeEnabled ? '#4a6e33' : '#22334a',
          } : {});
        });
      }
    }
  }

  if (isNative) {
    const panelY = adjust(CONFIG.height * 0.66);
    if (outOfLives) {
      const panelMargin = 20;
      const panelW = CONFIG.width - panelMargin * 2;
      const panelH = 120;
      const panelX = panelMargin;
      const panelTop = panelY - panelH / 2;
      g.fillStyle = 'rgba(21, 32, 54, 0.92)';
      g.strokeStyle = '#b4c0d9';
      g.lineWidth = 3;
      g.fillRect(panelX, panelTop, panelW, panelH);
      g.strokeRect(panelX, panelTop, panelW, panelH);

      const headline = lifeAdStatus === 'loading'
        ? t('ads.lifeLoading')
        : (lifeAdMessage || t('ads.lifePrompt'));
      g.fillStyle = lifeAdStatus === 'loading' ? '#b4c0d9' : '#ffb347';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `12px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
      g.fillText(headline, panelX + panelW / 2, panelTop + 36);

      let detail = '';
      let detailColor = '#b4c0d9';
      if (lifeAdStatus === 'loading') {
        detail = '';
      } else if (lifeAdStatus === 'limit' && !lifeAdMessage) {
        detail = t('ads.lifeLimit', { limit: DAILY_INTERSTITIAL_LIMIT });
        detailColor = '#ff8888';
      } else if (!lifeAdMessage) {
        detail = t('ads.lifeTapToWatch');
      }
      if (detail) {
        g.fillStyle = detailColor;
        g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
        g.fillText(detail, panelX + panelW / 2, panelTop + 72);
      }
    } else if (lifeAdStatus === 'loading') {
      drawCenteredText(g, t('ads.lifeLoading'), panelY, 10, '#b4c0d9');
    } else if (lifeAdMessage) {
      drawCenteredText(g, lifeAdMessage, panelY - 5, 10, '#b4c0d9');
    }
  }

}
