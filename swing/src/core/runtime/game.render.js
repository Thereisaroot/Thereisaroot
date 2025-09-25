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

function renderIntro(g, time) {
  tutorialButtonRect = null;
  drawBackground(g);

  const centerX = CONFIG.width / 2;
  const titleY = CONFIG.height * 0.26;
  const pulse = 1 + 0.06 * Math.sin(time * 1.6);
  const stretch = 1 + 0.04 * Math.cos(time * 1.2);
  const wobble = 0.03 * Math.sin(time * 2.8);

  g.save();
  g.translate(centerX, titleY);
  g.rotate(wobble);
  g.scale(pulse, stretch);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `26px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
  g.fillStyle = '#24163f';
  g.fillText(t('intro.title'), 3, 3);
  g.fillStyle = '#ffe066';
  g.fillText(t('intro.title'), 0, 0);
  g.restore();

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
      drawCenteredText(g, msg, CONFIG.height * 0.58, 10, '#ffb347');
      if (lifeAdStatus !== 'loading' && lifeAdStatus !== 'limit') {
        drawCenteredText(g, t('ads.lifeTapToWatch'), CONFIG.height * 0.62, 9, '#b4c0d9');
      }
    } else if (lifeAdStatus === 'loading') {
      drawCenteredText(g, t('ads.lifeLoading'), CONFIG.height * 0.58, 10, '#b4c0d9');
    } else if (lifeAdMessage) {
      drawCenteredText(g, lifeAdMessage, CONFIG.height * 0.58, 10, '#b4c0d9');
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

        let claimButtonRect = null;
        if (entry.achieved && !entry.claimed) {
          claimButtonRect = { x: rect.x + rect.w - 124, y: rect.y + rect.h - 36, w: 110, h: 24 };
          g.fillStyle = '#31507a';
          g.fillRect(claimButtonRect.x, claimButtonRect.y, claimButtonRect.w, claimButtonRect.h);
          g.strokeStyle = '#ffe066';
          g.strokeRect(claimButtonRect.x, claimButtonRect.y, claimButtonRect.w, claimButtonRect.h);
          g.fillStyle = '#ffffff';
          g.textAlign = 'center';
          g.fillText(t('records.goals.claim'), claimButtonRect.x + claimButtonRect.w / 2, claimButtonRect.y + claimButtonRect.h / 2 + 1);
          recordsGoalClaimButtons.push({ rect: claimButtonRect, goalId: entry.goal.id });
        }

        const statusX = claimButtonRect ? claimButtonRect.x - 12 : rect.x + rect.w - 18;

        g.textAlign = 'right';
        g.fillStyle = entry.achieved && !entry.claimed ? '#ffe066' : (entry.claimed ? '#9cffc7' : '#b4c0d9');
        g.font = `9px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
        g.fillText(rewardLabel, statusX, rewardY);

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

function updateRun(dt) {
  const baseDt = dt;
  if (slowMoTimer > 0) {
    dt *= SLOW_MO_SCALE;
  }
  simTime += dt;
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
      const speed = 220;
      const angleOffset = ((Math.random() * 20) - 10) * (Math.PI / 180);
      const baseAngle = Math.PI; // shoot from right to left
      const angle = baseAngle + angleOffset;
      stageBullets.push({
        x: camera.x + CONFIG.width + 40,
        y: (CONFIG.height * 0.5) + randRange(-50, 50),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
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
    addToPlayerStat && addToPlayerStat('itemsCollected', 1);
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
      const glowBonus = shopInv.glowLevel ? (shopInv.glowLevel * 0.1 * CONFIG.catchBase) : 0;
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
        addToPlayerStat && addToPlayerStat('ropesCaught', 1);
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
      if (earnedMoney > 0 && typeof addToPlayerStat === 'function') addToPlayerStat('totalCashEarned', earnedMoney);
      if (earnedExp > 0 && typeof addToPlayerStat === 'function') addToPlayerStat('totalExpEarned', earnedExp);
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
      if (typeof setTutorialEnabled === 'function') setTutorialEnabled(false);
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
        selectedCharacter = 'default';
        localStorage.setItem('webswing_selected_char_v1', 'default');
      } catch(_){}
    }
    best = Math.max(best, score);
    try {
      localStorage.setItem(BEST_SCORE_KEY, String(best));
    } catch(_) {}
    // End fever state on game over
    starModeActive = false;
    starModeEndTime = 0;
    if (typeof IS_NATIVE_APP !== 'undefined' && IS_NATIVE_APP && typeof consumeDailyLife === 'function') {
      if (!lifeSpentThisRun) {
        if (typeof ensureDailyState === 'function') ensureDailyState();
        consumeDailyLife();
        lifeSpentThisRun = true;
      }
    }
    if (typeof addToPlayerStat === 'function') addToPlayerStat('gameOverCount', 1);
    if (typeof flushPlayerStats === 'function') flushPlayerStats();
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
    const primaryKey = bossOutcomeBanner.success ? 'bossOutcome.success' : 'bossOutcome.failure';
    lines.push(t(primaryKey));
    if (bossOutcomeBanner.success) {
      const cash = bossOutcomeBanner.rewardCash || 0;
      const score = bossOutcomeBanner.rewardScore || 0;
      if (cash > 0 && score > 0) {
        lines.push(t('bossOutcome.rewardCashScore', { cash, score }));
      } else if (cash > 0) {
        lines.push(t('bossOutcome.rewardCash', { cash }));
      } else if (score > 0) {
        lines.push(t('bossOutcome.rewardScore', { score }));
      }
    } else {
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
      g.fillText(t('boss.bulletHud', { shots: b.shotsFired, total: b.totalShots, hits: b.hitsTaken || 0, limit: b.hitLimit || 4 }), CONFIG.width / 2, 40);
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
}

if (typeof globalThis !== 'undefined') {
  globalThis.renderIntro = renderIntro;
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
  }
  if (lastDemoLoss) {
    drawCenteredText(g, t('gameOver.title'), adjust(CONFIG.height * 0.30 - 20), 18, '#ff6666');
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'top';
    g.font = `12px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(t('gameOver.demoLossLine1'), CONFIG.width / 2, adjust(CONFIG.height * 0.40 - 20));
    g.fillText(t('gameOver.demoLossLine2'), CONFIG.width / 2, adjust(CONFIG.height * 0.46 - 20));
  } else {
    drawCenteredText(g, t('gameOver.title'), adjust(CONFIG.height * 0.30 - 20), 18, '#ff6666');
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
    const cy = adjust(CONFIG.height * 0.22 - 20);
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
    const menuSet = new Set(gameOverMenuButtons || []);
    if (gameOverMenuButtons && gameOverMenuButtons.length) {
      gameOverMenuButtons.forEach((button) => drawUIButtonRect(g, button));
      const messageAnchor = gameOverMenuButtons[gameOverMenuButtons.length - 1];
      if (gameOverMenuMessage && messageAnchor) {
        const msgY = messageAnchor.y + messageAnchor.h + 18;
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

  if (typeof IS_NATIVE_APP !== 'undefined' && IS_NATIVE_APP) {
    const lives = Math.max(0, nativeLivesRemaining());
    const messageY = adjust(CONFIG.height * 0.66);
    if (lives <= 0) {
      const msg = lifeAdStatus === 'loading'
        ? t('ads.lifeLoading')
        : (lifeAdMessage || t('ads.lifePrompt'));
      drawCenteredText(g, msg, messageY, 10, lifeAdStatus === 'loading' ? '#b4c0d9' : '#ffb347');
      if (lifeAdStatus !== 'loading' && lifeAdStatus !== 'limit') {
        drawCenteredText(g, t('ads.lifeTapToWatch'), messageY + 20, 9, '#b4c0d9');
      } else if (lifeAdStatus === 'limit' && !lifeAdMessage) {
        drawCenteredText(g, t('ads.lifeLimit', { limit: DAILY_INTERSTITIAL_LIMIT }), messageY + 20, 9, '#ff8888');
      }
    } else if (lifeAdStatus === 'loading') {
      drawCenteredText(g, t('ads.lifeLoading'), messageY, 10, '#b4c0d9');
    } else if (lifeAdMessage) {
      drawCenteredText(g, lifeAdMessage, messageY, 10, '#b4c0d9');
    }
  }
}
