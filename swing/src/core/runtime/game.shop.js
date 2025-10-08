// Shop item definitions provided via external spec
const SHOP_ITEMS = (typeof window !== 'undefined' ? window.ITEM_SPECS : undefined) || [];
const SHOP_ITEM_ORDER = new Map(SHOP_ITEMS.map((item, idx) => [item, idx]));
const ITEM_ART = (typeof window !== 'undefined' ? window.ITEM_ART : undefined) || {};

function getBigMaxLevel() {
  const level = getLevelByExp(exp);
  return Math.max(1, Math.floor((level + 1) / 2));
}

function getAllItemsSorted() {
  return sortItemsByMinLevel(SHOP_ITEMS);
}

function unlockInfoForItem(item) {
  if (!item) return { type: 'level', value: 1 };
  return item.unlock || { type: 'level', value: item.minLevel || 1 };
}

function isItemSpecialUnlocked(item, unlockInfo = unlockInfoForItem(item)) {
  if (!unlockInfo || unlockInfo.type !== 'special') return true;
  const key = unlockInfo.key || item.id;
  const specials = shopInv.specialUnlocks || [];
  if (Array.isArray(specials)) return specials.includes(key);
  return Boolean(specials && specials[key]);
}

function itemCardState(item, lvl, currentSavings) {
  const unlock = unlockInfoForItem(item);
  const price = nextPriceForItem(item);
  let levelLocked = false;
  let specialLocked = false;
  let requiredLevel = item.minLevel || 1;
  if (unlock.type === 'level') {
    requiredLevel = unlock.value ?? requiredLevel;
    levelLocked = lvl < requiredLevel;
  } else if (unlock.type === 'special') {
    specialLocked = !isItemSpecialUnlocked(item, unlock);
  }
  const soldOut = isItemSoldOut(item);
  const fundsLocked = !soldOut && !levelLocked && !specialLocked && currentSavings < price;
  return {
    levelLocked,
    specialLocked,
    fundsLocked,
    soldOut,
    price,
    minLevel: requiredLevel,
    locked: levelLocked || specialLocked || fundsLocked,
  };
}

function sortItemsByMinLevel(list) {
  const arr = list.slice();
  arr.sort((a, b) => {
    const minA = Number.isFinite(a?.minLevel) ? a.minLevel : 1;
    const minB = Number.isFinite(b?.minLevel) ? b.minLevel : 1;
    if (minA !== minB) return minA - minB;
    const orderA = SHOP_ITEM_ORDER.get(a) ?? Number.MAX_SAFE_INTEGER;
    const orderB = SHOP_ITEM_ORDER.get(b) ?? Number.MAX_SAFE_INTEGER;
    return orderA - orderB;
  });
  return arr;
}

function availableItems(level = getLevelByExp(exp)) {
  return getAllItemsSorted().filter((it) => {
    const unlock = unlockInfoForItem(it);
    if (unlock.type === 'level') {
      const required = unlock.value ?? it.minLevel ?? 1;
      return level >= required;
    }
    if (unlock.type === 'special') {
      return isItemSpecialUnlocked(it, unlock);
    }
    return true;
  });
}

function getItemSprite(id) {
  return ITEM_ART[id] || null;
}

function getItemLevel(it) {
  if (it.type === 'consumable') {
    return (shopInv.consumables && shopInv.consumables[it.id]) || 0;
  }
  if (it.id === 'buds') return shopInv.budsLevel || 0;
  if (it.id === 'glow') return shopInv.glowLevel || 0;
  if (it.id === 'powerjump') return shopInv.powerJump ? 1 : 0;
  if (it.id === 'plusjump') return shopInv.plusJump ? 1 : 0;
  if (it.id === 'fly') return shopInv.fly ? 1 : 0;
  if (it.id === 'big') return shopInv.bigLevel || 0;
  if (it.id === 'magnet') return shopInv.magnetLevel || 0;
  if (it.id === 'combo') return shopInv.comboLevel || 0;
  if (it.id === 'slow') return shopInv.slowLevel || 0;
  if (it.id === 'lucky') return shopInv.luckyLevel || 0;
  if (it.id === 'fever') return shopInv.feverLevel || 0;
  if (it.id === 'revival') return shopInv.revival ? 1 : 0;
  if (it.id === 'startskill') return shopInv.startSkill ? 1 : 0;
  if (it.id === 'skill_reroll') return shopInv.skillRerollLevel || 0;
  if (it.id === 'skill_card_plus') return shopInv.skillCardPlus ? 1 : 0;
  return 0;
}
function currentBodySides() {
  const lvl = getLevelByExp(exp);
  if (lvl <= 1) return 0;
  const groupIdx = Math.floor((lvl - 2) / 3);
  return 3 + Math.max(0, groupIdx);
}
function isItemSoldOut(it) {
  if (it.type === 'consumable') {
    const count = (shopInv.consumables && shopInv.consumables[it.id]) || 0;
    return count >= 1;
  }
  if (it.type === 'single') return getItemLevel(it) >= 1;
  if (it.type === 'level') {
    // dynamic caps by item
    let maxLv;
    if (it.id === 'big') maxLv = getBigMaxLevel();
    else maxLv = it.maxLevel || 1;
    return getItemLevel(it) >= maxLv;
  }
  return false;
}

function nextPriceForItem(it) {
  if (it.type !== 'level') return it.price;
  const lvl = getItemLevel(it);
  // Big: 20$, 30$, 40$... per purchase
  if (it.id === 'big') return 20 + 10 * lvl;
  // Glow, Magnet, Combo+, Slow, Lucky, Fever+: flat price per level
  return it.price;
}

function shopGrid() {
  const cols = 2;
  const cellW = CONFIG.width / cols;
  const cellH = ITEM_CARD_HEIGHT;
  const marginX = 20;
  const top = CONFIG.height * 0.12 + 50;
  const paddingTop = ITEM_CARD_PADDING_TOP;
  const paddingBottom = ITEM_CARD_PADDING_BOTTOM;
  const gap = ITEM_CARD_VERTICAL_GAP;
  return { cols, cellW, cellH, marginX, top, paddingTop, paddingBottom, gap };
}

function shopHelpRect() { return lastShopHelpRect; }

function renderCharacterShop(g) {
  currentItemPageEntries = [];
  // Character shop UI
  const titleY = CONFIG.height * 0.12;
  const charactersTitle = t('shop.charactersTitle');
  drawCenteredText(g, charactersTitle, titleY, 14);
  
  const lvl = getLevelByExp(exp);
  const charInv = shopInv.characters || [];

  // Show $ at top-right
  g.fillStyle = '#ffffff';
  g.textAlign = 'right';
  g.textBaseline = 'top';
  g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
  g.fillText(t('shop.balance', { amount: savings }), CONFIG.width - 12, titleY + 24);

  const showShopMsg = shopMsg && shopMsgTimer > 0 && (!shopConfirm || shopConfirm.type === 'character');
  if (showShopMsg) {
    g.textAlign = 'center';
    g.textBaseline = 'top';
    g.fillStyle = '#ff6666';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(shopMsg, CONFIG.width / 2, titleY - 50);
  }
  
  // Help button '?' for character shop
  {
    g.font = `14px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    const tw = g.measureText(charactersTitle).width;
    const cx = CONFIG.width / 2;
    const left = cx - tw / 2;
    const w = 20, h = 20;
    const x = Math.floor(left + tw + 20);
    const y = Math.floor(titleY - h / 2);
    lastShopHelpRect = { x, y, w, h };
    g.fillStyle = '#22334a';
    g.strokeStyle = '#b4c0d9';
    g.lineWidth = 2;
    g.fillRect(x, y, w, h);
    g.strokeRect(x, y, w, h);
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText('?', x + w/2, y + h/2 + 1);
  }
  
  // Character grid (pagination)
  const chars = visibleCharacters();
  const cols = 2;
  const cellW = CONFIG.width / cols;
  const cellH = CHAR_CARD_CELL_H;
  const marginX = 20;
  const top = titleY + 50;
  const gap = CHAR_CARD_VERTICAL_GAP;
  const rowsPerPage = CHAR_CARD_ROWS_PER_PAGE;
  const itemsPerPage = cols * rowsPerPage;
  shopCharTotalPages = Math.max(1, Math.ceil(chars.length / itemsPerPage));
  if (shopCharPage >= shopCharTotalPages) shopCharPage = shopCharTotalPages - 1;
  if (shopCharPage < 0) shopCharPage = 0;
  const startIdx = shopCharPage * itemsPerPage;
  const endIdx = Math.min(chars.length, startIdx + itemsPerPage);
  currentCharacterPageEntries = chars.slice(startIdx, endIdx);

  // Draw character cards for current page
  for (let i = startIdx; i < endIdx; i++) {
    const [id, char] = chars[i];
    const state = characterCardState(id, char, lvl, charInv, savings);
    const local = i - startIdx;
    const row = Math.floor(local / cols);
    const col = local % cols;
    const x = marginX + col * cellW;
    const y = top + row * (cellH + gap);
    const shrink = 3;
    
    // Card background with solid border
    const cardX = x + 6 + shrink;
    const cardW = cellW - 40 - shrink * 2;
    const cardY = y + shrink;
    const cardH = cellH - shrink * 2;
    g.fillStyle = '#0f1a2a';
    g.fillRect(cardX, cardY, cardW, cardH);
    g.save();
    g.strokeStyle = '#8a96ad';
    g.lineWidth = 3;
    g.lineCap = 'butt';
    g.strokeRect(cardX, cardY, cardW, cardH);
    g.restore();

    // Centered layout: 1) Name, 2) Pixel art, 3) Text
    const centerX = cardX + cardW / 2;
    const cardCenterY = cardY + cardH / 2;
    // 1) Name top-centered
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'top';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(characterName(id), centerX, cardY + 6);

    // 2) Pixel art centered
    if (id === 'default') {
      const sides = currentBodySides();
      const radius = 18;
      const centerY = cardCenterY;
      g.fillStyle = '#ffffff';
      if (sides === 0) { g.beginPath(); g.arc(centerX, centerY, radius, 0, Math.PI * 2); g.fill(); }
      else {
        g.beginPath();
        for (let k = 0; k <= sides; k++) {
          const angle = (k / sides) * Math.PI * 2 - Math.PI / 2;
          const vx = centerX + Math.cos(angle) * radius;
          const vy = centerY + Math.sin(angle) * radius;
          if (k === 0) g.moveTo(vx, vy); else g.lineTo(vx, vy);
        }
        g.closePath(); g.fill();
      }
    } else {
      const pixScale = 4;
      const artW = (char.pixels[0]?.length || 8) * pixScale;
      const artH = (char.pixels.length || 8) * pixScale;
      const ox = Math.floor(centerX - artW / 2);
      const oy = Math.floor(cardCenterY - artH / 2);
      char.pixels.forEach((row, ry) => {
        row.forEach((pixel, rx) => {
          if (pixel) {
            g.fillStyle = char.colors[pixel - 1] || '#ffffff';
            g.fillRect(ox + rx * pixScale, oy + ry * pixScale, pixScale, pixScale);
          }
        });
      });
    }

    // Locked overlay (drawn after artwork to dim card)
    if (state.locked) {
      g.save();
      g.fillStyle = 'rgba(8, 12, 20, 0.78)';
      g.fillRect(cardX, cardY, cardW, cardH);
      if (state.levelLocked) {
        g.translate(centerX, cardY + cardH / 2);
        g.rotate(-Math.PI / 6);
        g.fillStyle = '#ff5c5c';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.font = `18px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
        g.fillText(t('shop.lockTag', { level: state.minLevel }), 0, 0);
      }
      g.restore();
    }

    // 3) Text bottom-centered (owned/price/state)
    const isSelected = selectedCharacter === id;
    g.textAlign = 'center';
    g.textBaseline = 'bottom';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    if (state.owned) {
      if (isSelected) {
        g.fillStyle = '#ffff88';
        g.fillText(t('shop.selected'), centerX, cardY + cardH - 6);
      } else {
        g.fillStyle = '#88ff88';
        g.fillText(t('shop.owned'), centerX, cardY + cardH - 6);
      }
    } else if (state.locked) {
      g.fillStyle = '#ffb0b0';
      const footText = state.levelLocked
        ? t('shop.lockedLevel', { level: state.minLevel })
        : t('shop.lockedFunds', { amount: state.price });
      g.fillText(footText, centerX, cardY + cardH - 6);
    } else {
      g.fillStyle = '#ffffff';
      g.fillText(t('shop.price', { amount: char.price }), centerX, cardY + cardH - 6);
    }
  }

  // Pagination UI for character shop
  const byPag = CONFIG.height - 60 - 18 - 20;
  const indicator = `${shopCharPage + 1}/${shopCharTotalPages}`;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffffff';
  g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
  g.fillText(indicator, CONFIG.width/2, byPag);
  const btnW = 36, btnH = 36; const offset = 60;
  const leftX = Math.floor(CONFIG.width/2 - offset - btnW/2);
  const rightX = Math.floor(CONFIG.width/2 + offset - btnW/2);
  if (shopCharPage > 0) {
    g.fillStyle = '#22334a'; g.strokeStyle = '#b4c0d9'; g.lineWidth = 2;
    g.fillRect(leftX, byPag - btnH/2, btnW, btnH); g.strokeRect(leftX, byPag - btnH/2, btnW, btnH);
    g.fillStyle = '#ffffff'; g.fillText('<', leftX + btnW/2, byPag);
  }
  if (shopCharPage < shopCharTotalPages - 1) {
    g.fillStyle = '#22334a'; g.strokeStyle = '#b4c0d9'; g.lineWidth = 2;
    g.fillRect(rightX, byPag - btnH/2, btnW, btnH); g.strokeRect(rightX, byPag - btnH/2, btnW, btnH);
    g.fillStyle = '#ffffff'; g.fillText('>', rightX + btnW/2, byPag);
  }
  
  drawShopNavButtons(g);
  
  // Character purchase/selection confirmation
  if (shopConfirm && shopConfirm.type === 'character') {
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fillRect(0, 0, CONFIG.width, CONFIG.height);
    const pw = CONFIG.width * 0.88, ph = 112;
    const px = (CONFIG.width - pw)/2, py = CONFIG.height * 0.40;
    g.fillStyle = '#0f1a2a';
    g.strokeStyle = '#b4c0d9';
    g.lineWidth = 2;
    g.fillRect(px, py, pw, ph);
    g.strokeRect(px, py, pw, ph);
    
    const char = PIXEL_CHARACTERS[shopConfirm.id];
    if (!char) {
      shopConfirm = null;
      return;
    }
    const charInv = shopInv.characters || [];
    const isPurchased = charInv.includes(shopConfirm.id) || shopConfirm.id === 'default';
    
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'top';
    g.font = `12px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    
    if (isPurchased) {
      g.fillText(t('shop.confirmSelectCharacter', { name: characterName(shopConfirm.id) }), px + pw/2, py + 20);
    } else {
      g.fillText(t('shop.confirmPurchase', { name: characterName(shopConfirm.id), amount: char.price }), px + pw/2, py + 10);
    }
    g.font = `8px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(t('shop.balance', { amount: savings }), px + pw/2, py + 38);
    
    // YES/NO buttons
    const bw2 = 78, bh2 = 26;
    const gapB = 12;
    const by2 = py + ph - 36;
    const bx2 = px + pw/2 - bw2 - gapB;
    const bx3 = px + pw/2 + gapB;
    
    g.fillStyle = '#22334a';
    g.fillRect(bx2, by2, bw2, bh2);
    g.strokeRect(bx2, by2, bw2, bh2);
    g.fillRect(bx3, by2, bw2, bh2);
    g.strokeRect(bx3, by2, bw2, bh2);
    
    g.fillStyle = '#ffffff';
    g.textBaseline = 'middle';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(t('common.yes'), bx2 + bw2/2, by2 + bh2/2);
    g.fillText(t('common.no'), bx3 + bw2/2, by2 + bh2/2);
  }
  
  // Help popup for character shop (pagination, no scroll)
  if (shopHelp) {
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fillRect(0, 0, CONFIG.width, CONFIG.height);
    const pw = CONFIG.width * 0.86;
    const phBase = Math.min(320, CONFIG.height * 0.65);
    const ph = Math.min(phBase + 60, CONFIG.height - 20); // taller to fit close hint
    const px = (CONFIG.width - pw)/2, py = CONFIG.height * 0.18;
    g.fillStyle = '#0f1a2a';
    g.strokeStyle = '#b4c0d9';
    g.lineWidth = 2;
    g.fillRect(px, py, pw, ph);
    g.strokeRect(px, py, pw, ph);
    
    // Title
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'top';
    g.font = `12px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(t('shop.characterInfoTitle'), px + pw/2, py + 10);
    // Content area (no scroll)
    const contentY = py + 35;
    const contentBottom = py + ph - 70;
    const contentH = contentBottom - contentY;
    const chars = (currentCharacterPageEntries && currentCharacterPageEntries.length) ? currentCharacterPageEntries : visibleCharacters();
    const entriesPerPage = 5;
    const totalPages = Math.max(1, Math.ceil(chars.length / entriesPerPage));
    // reuse helpPage/helpTotalPages for consistency when switching menus
    helpTotalPages = totalPages;
    if (helpPage >= helpTotalPages) helpPage = helpTotalPages - 1;
    if (helpPage < 0) helpPage = 0;
    const start = helpPage * entriesPerPage;
    const end = Math.min(chars.length, start + entriesPerPage);
    const lineHeight = 14;
    const entryH = 50;
    let yPos = contentY + 5;
    g.textAlign = 'left';
    g.textBaseline = 'top';
    for (let i = start; i < end; i++) {
      const [id, char] = chars[i];
      // Name
      g.fillStyle = '#fffa75';
      g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
      g.fillText(characterName(id).toUpperCase(), px + 10, yPos);
      // Price/owned/locked state
      const state = characterCardState(id, char, lvl, charInv, savings);
      if (state.owned) {
        g.fillStyle = '#88ff88';
        g.fillText(t('shop.ownedTag'), px + pw - 80, yPos);
      } else if (state.levelLocked) {
        g.fillStyle = '#ff8888';
        g.fillText(t('shop.levelTag', { level: state.minLevel }), px + pw - 80, yPos);
      } else if (state.fundsLocked) {
        g.fillStyle = '#ffb0b0';
        g.fillText(t('shop.price', { amount: char.price }), px + pw - 80, yPos);
      } else {
        g.fillStyle = '#ffffff';
        g.fillText(t('shop.price', { amount: char.price }), px + pw - 80, yPos);
      }
      // Desc lines (two-line summary)
      g.fillStyle = '#b4c0d9';
      g.font = `8px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
      const summary = t(`chars.${id}.help`);
      const descLines = String(summary || '').split('\n');
      let descY = yPos + lineHeight;
      const baseGap = 10;
      for (const line of descLines) {
        g.fillText(line, px + 10, descY);
        descY += lineAdvance(baseGap, line);
      }
      yPos += entryH;
      if (yPos > contentY + contentH - 10) break;
    }
    // Pagination controls for char help
    const byH = py + ph - 44;
    const indicatorH = `${helpPage + 1}/${helpTotalPages}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#ffffff';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(indicatorH, px + pw/2, byH);
    const btnW = 18, btnH = 18;
    const tw2 = g.measureText(indicatorH).width;
    const gapBtn2 = 8;
    const leftHX = Math.floor(px + pw/2 - tw2/2 - gapBtn2 - btnW);
    const rightHX = Math.floor(px + pw/2 + tw2/2 + gapBtn2);
    if (helpPage > 0) { g.fillStyle = '#22334a'; g.strokeStyle = '#b4c0d9'; g.lineWidth = 2; g.fillRect(leftHX, byH - btnH/2, btnW, btnH); g.strokeRect(leftHX, byH - btnH/2, btnW, btnH); g.fillStyle = '#ffffff'; g.fillText('<', leftHX + btnW/2, byH); }
    if (helpPage < helpTotalPages - 1) { g.fillStyle = '#22334a'; g.strokeStyle = '#b4c0d9'; g.lineWidth = 2; g.fillRect(rightHX, byH - btnH/2, btnW, btnH); g.strokeRect(rightHX, byH - btnH/2, btnW, btnH); g.fillStyle = '#ffffff'; g.fillText('>', rightHX + btnW/2, byH); }

    // Close hint
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#b4c0d9';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(t('common.clickOutsideToClose'), px + pw/2, py + ph - 18);
  }

}

function wrapTextLines(g, text, maxWidth, maxLines = Infinity) {
  if (!text) return [''];
  const words = String(text).split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines = [];
  let index = 0;
  while (index < words.length) {
    let line = words[index];
    index += 1;
    while (index < words.length) {
      const candidate = `${line} ${words[index]}`;
      if (g.measureText(candidate).width <= maxWidth) {
        line = candidate;
        index += 1;
      } else {
        break;
      }
    }
    lines.push(line);
    if (lines.length === maxLines) break;
  }
  const consumedAll = index >= words.length;
  if (!consumedAll && lines.length) {
    const ellipsis = '…';
    let last = lines[lines.length - 1];
    if (g.measureText(`${last} ${ellipsis}`).width <= maxWidth) {
      lines[lines.length - 1] = `${last} ${ellipsis}`.trim();
    } else {
      let trimmed = last;
      while (trimmed.length && g.measureText(`${trimmed}${ellipsis}`).width > maxWidth) {
        trimmed = trimmed.replace(/\s*\S+$/, '').trim();
      }
      lines[lines.length - 1] = trimmed ? `${trimmed}${ellipsis}` : ellipsis;
    }
  }
  return lines;
}

function renderAdShop(g) {
  currentCharacterPageEntries = [];
  currentItemPageEntries = [];
  const titleY = CONFIG.height * 0.12;
  drawCenteredText(g, t('adsShop.title'), titleY, 14);

  g.fillStyle = '#ffffff';
  g.textAlign = 'right';
  g.textBaseline = 'top';
  g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
  g.fillText(t('shop.balance', { amount: savings }), CONFIG.width - 12, titleY + 24);

  lastShopHelpRect = null;

  const items = getAdRewardItems();
  const cardW = CONFIG.width * 0.86;
  const cardH = 120;
  const startY = titleY + 50;

  items.forEach((item, idx) => {
    const cardX = (CONFIG.width - cardW) / 2;
    const cardY = startY + idx * (cardH + 24);
    const centerX = cardX + cardW / 2;

    g.fillStyle = '#0f1a2a';
    g.fillRect(cardX, cardY, cardW, cardH);
    g.strokeStyle = '#8a96ad';
    g.lineWidth = 3;
    g.strokeRect(cardX, cardY, cardW, cardH);

    const titleKey = item.key === 'wizard' ? 'adsShop.wizardTitle' : 'adsShop.cashTitle';
    const descKey = item.key === 'wizard' ? 'adsShop.wizardDesc' : 'adsShop.cashDesc';

    g.fillStyle = '#ffffff';
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.font = `12px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(t(titleKey), cardX + 16, cardY + 12);

    g.fillStyle = '#b4c0d9';
    g.font = `9px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    const desc = t(descKey);
    const descLines = wrapTextLines(g, desc, cardW - 32, 2);
    let descY = cardY + 36;
    descLines.forEach((line) => {
      g.fillText(line, cardX + 16, descY);
      descY += 12;
    });

    const state = getAdRewardState(item.key);
    const claimed = isDailyRewardClaimed(item.key);
    const alreadyOwned = item.key === 'wizard' && shopInv.characters && shopInv.characters.includes('wizard');

    let message = state.message || null;
    let messageColor = '#b4c0d9';

    if (!message) {
      if (state.status === 'loading') {
        message = t('adsShop.loading');
        messageColor = '#b4c0d9';
      } else if (alreadyOwned) {
        message = t('adsShop.alreadyOwned');
        messageColor = '#88ff88';
      } else if (claimed) {
        message = t('adsShop.claimedToday');
        messageColor = '#ffb347';
      }
    }

    const buttonWidth = cardW - 32;
    const buttonHeight = 32;
    const buttonX = cardX + 16;
    const buttonY = cardY + cardH - buttonHeight - 12;

    const actionAvailable = !alreadyOwned && !claimed && state.status !== 'loading';

    if (actionAvailable) {
      g.fillStyle = '#22334a';
      g.strokeStyle = '#b4c0d9';
      g.lineWidth = 2;
      g.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
      g.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
      g.fillStyle = '#ffffff';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
      g.fillText(t('adsShop.watch'), buttonX + buttonWidth / 2, buttonY + buttonHeight / 2 + 1);
    } else {
      g.strokeStyle = '#444d66';
      g.lineWidth = 2;
      g.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
    }

    if (message) {
      g.fillStyle = messageColor;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `9px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
      const textY = actionAvailable ? buttonY - 12 : buttonY + buttonHeight / 2;
      g.fillText(message, centerX, textY);
    }
  });

  drawShopNavButtons(g);

}

function renderShop(g) {
  currentCharacterPageEntries = [];
  // backdrop
  g.fillStyle = 'rgba(0,0,0,0.6)';
  g.fillRect(0, 0, CONFIG.width, CONFIG.height);
  
  // Render based on shop mode
  if (shopMode === 'chars') {
    renderCharacterShop(g);
    return;
  }
  if (shopMode === 'ads') {
    renderAdShop(g);
    return;
  }
  
  // Original item shop
  const titleY = CONFIG.height * 0.12;
  const itemsTitle = t('shop.itemsTitle');
  drawCenteredText(g, itemsTitle, titleY, 14);
  const showShopMsg = shopMsg && shopMsgTimer > 0 && (!shopConfirm || shopConfirm.type === 'item');
  if (showShopMsg) {
    g.textAlign = 'center';
    g.textBaseline = 'top';
    g.fillStyle = '#ff6666';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(shopMsg, CONFIG.width / 2, titleY - 50);
  }
  // Show $ at top-right, two lines below the SHOP title
  {
    const headerY = CONFIG.height * 0.12;
    g.fillStyle = '#ffffff';
    g.textAlign = 'right';
    g.textBaseline = 'top';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(t('shop.balance', { amount: savings }), CONFIG.width - 12, headerY + 24);
  }
  // Help button '?' positioned 20px to the right of the SHOP title
  {
    // measure SHOP text width to place the '?' with 20px gap
    g.font = `14px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    const tw = g.measureText(itemsTitle).width;
    const cx = CONFIG.width / 2;
    const left = cx - tw / 2;
    const w = 20, h = 20;
    const x = Math.floor(left + tw + 20);
    const y = Math.floor(titleY - h / 2);
    lastShopHelpRect = { x, y, w, h };
    g.fillStyle = '#22334a';
    g.strokeStyle = '#b4c0d9';
    g.lineWidth = 2;
    g.fillRect(x, y, w, h);
    g.strokeRect(x, y, w, h);
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText('?', x + w/2, y + h/2 + 1);
  }
  const { cols, cellW, cellH, marginX, top, gap } = shopGrid();
  const lvl = getLevelByExp(exp);
  const allItems = getAllItemsSorted();
  const rowsPerPage = CHAR_CARD_ROWS_PER_PAGE;
  const itemsPerPage = cols * rowsPerPage + ITEM_CARD_EXTRA_PER_PAGE;
  shopItemTotalPages = Math.max(1, Math.ceil(allItems.length / itemsPerPage));
  if (shopItemPage >= shopItemTotalPages) shopItemPage = shopItemTotalPages - 1;
  if (shopItemPage < 0) shopItemPage = 0;
  const startIdx = shopItemPage * itemsPerPage;
  const endIdx = Math.min(allItems.length, startIdx + itemsPerPage);
  currentItemPageEntries = allItems.slice(startIdx, endIdx);
  for (let i = startIdx; i < endIdx; i++) {
    const item = allItems[i];
    const local = i - startIdx;
    const r = Math.floor(local / cols);
    const c = local % cols;
    const shrink = 3;
    const cardX = marginX + c * cellW + 6 + shrink;
    const cardY = top + r * (cellH + gap) + shrink;
    const cardW = cellW - 40 - shrink * 2;
    const cardH = cellH - shrink * 2;
    const centerX = cardX + cardW / 2;

    // card background with solid border
    g.fillStyle = '#0f1a2a';
    g.fillRect(cardX, cardY, cardW, cardH);
    g.save();
    g.strokeStyle = '#8a96ad';
    g.lineWidth = 3;
    g.lineCap = 'butt';
    g.strokeRect(cardX, cardY, cardW, cardH);
    g.restore();
    // content
    const state = itemCardState(item, lvl, savings);

    // 1) Name top-centered
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'top';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(itemName(item), centerX, cardY + 6);
    // 2) Price (top-right inside card)
    g.textAlign = 'right';
    g.fillStyle = '#ffffff';
    const priceText = t('shop.price', { amount: state.price });
    g.fillText(priceText, cardX + cardW - 8, cardY + 25);
    // 3) Pixel art icon (center)
    const sprite = getItemSprite(item.id);
    if (sprite && sprite.pixels && sprite.pixels.length && sprite.pixels[0]) {
      const rows = sprite.pixels.length;
      const cols = sprite.pixels[0].length;
      const availableW = Math.max(8, cardW - 24);
      const availableH = Math.max(8, cardH * 0.45);
      let scale = Math.floor(Math.min(availableW / cols, availableH / rows));
      if (!Number.isFinite(scale) || scale < 1) scale = 1;
      const spriteCx = centerX;
      const spriteCy = cardY + cardH * 0.55;
      drawPixelSprite(g, spriteCx, spriteCy, sprite, scale);
    } else {
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `12px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
      g.fillText('?', centerX, cardY + Math.floor(cardH * 0.60));
    }
    // Lock overlays
    if (state.levelLocked || state.specialLocked) {
      g.save();
      g.fillStyle = 'rgba(8,12,20,0.78)';
      g.fillRect(cardX, cardY, cardW, cardH);
      g.translate(centerX, cardY + cardH / 2);
      g.rotate(-Math.PI / 6);
      g.fillStyle = state.levelLocked ? '#ff5c5c' : '#f7b731';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `18px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
      const bannerText = state.levelLocked ? t('shop.lockTag', { level: state.minLevel }) : t('shop.specialTag');
      g.fillText(bannerText, 0, 0);
      g.restore();
    }
    // sold out overlay
    if (state.soldOut) {
      g.fillStyle = 'rgba(0,0,0,0.5)';
      g.fillRect(cardX, cardY, cardW, cardH);
      g.textAlign = 'center';
      g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
      if (item.type === 'single' || item.type === 'consumable') {
        g.fillStyle = '#ff6666';
        g.fillText(t('shop.soldOut'), centerX, cardY + cardH / 2 + 2);
      } else {
        g.fillStyle = '#a6ffc1';
        g.fillText(t('shop.maxed'), centerX, cardY + cardH / 2 + 2);
      }
      g.fillStyle = '#ffffff';
    }

    // 4) Status / level line
    g.textAlign = 'center';
    g.textBaseline = 'bottom';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    if (state.specialLocked) {
      g.fillStyle = '#f7b731';
      g.fillText(t('shop.lockedSpecial'), centerX, cardY + cardH - 6);
    } else if (state.levelLocked) {
      g.fillStyle = '#ff6666';
      g.fillText(t('shop.lockedLevel', { level: state.minLevel }), centerX, cardY + cardH - 6);
    } else if (state.fundsLocked) {
      g.fillStyle = '#f7b731';
      g.fillText(t('shop.lockedFunds', { amount: state.price }), centerX, cardY + cardH - 6);
    } else {
      g.fillStyle = '#ffffff';
      const lvlValue = getItemLevel(item);
      const showLevel = item.type === 'level' && lvlValue > 0;
      if (showLevel) {
        g.fillText(t('shop.itemLevel', { level: lvlValue }), centerX, cardY + cardH - 6);
      }
    }
    g.fillStyle = '#ffffff';
  }
  // Pagination UI: < 1/N > (move 30px up and double button size)
  const byPag = CONFIG.height - 60 - 18 - 20;
  const indicator = `${shopItemPage + 1}/${shopItemTotalPages}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#ffffff';
  g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
  g.fillText(indicator, CONFIG.width/2, byPag);
  const btnW = 36, btnH = 36;
  const offset = 60;
  const leftX = Math.floor(CONFIG.width/2 - offset - btnW/2);
  const rightX = Math.floor(CONFIG.width/2 + offset - btnW/2);
  // Draw buttons only when applicable (click areas were registered in buildShopCards)
  if (shopItemPage > 0) {
    g.fillStyle = '#22334a';
    g.strokeStyle = '#b4c0d9';
    g.lineWidth = 2;
    g.fillRect(leftX, byPag - btnH/2, btnW, btnH);
    g.strokeRect(leftX, byPag - btnH/2, btnW, btnH);
    g.fillStyle = '#ffffff';
    g.fillText('<', leftX + btnW/2, byPag);
  }
  if (shopItemPage < shopItemTotalPages - 1) {
    g.fillStyle = '#22334a';
    g.strokeStyle = '#b4c0d9';
    g.lineWidth = 2;
    g.fillRect(rightX, byPag - btnH/2, btnW, btnH);
    g.strokeRect(rightX, byPag - btnH/2, btnW, btnH);
    g.fillStyle = '#ffffff';
    g.fillText('>', rightX + btnW/2, byPag);
  }
  drawShopNavButtons(g);

  // Confirm popup
  if (shopConfirm) {
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fillRect(0, 0, CONFIG.width, CONFIG.height);
    const pw = CONFIG.width * 0.88, ph = 112;
    const px = (CONFIG.width - pw)/2, py = CONFIG.height * 0.40;
    g.fillStyle = '#0f1a2a';
    g.strokeStyle = '#b4c0d9';
    g.lineWidth = 2;
    g.fillRect(px, py, pw, ph);
    g.strokeRect(px, py, pw, ph);
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'top';
    g.font = `12px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    const confirmedItem = SHOP_ITEMS.find(x => x.id === shopConfirm.id);
    const itName = confirmedItem ? itemName(confirmedItem) : shopConfirm.id;
    g.fillText(t('shop.confirmPurchase', { name: itName, amount: shopConfirm.price }), px + pw/2, py + 10);
    // Current $ centered two lines below, font 2px smaller
    g.textAlign = 'center';
    g.font = `8px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(t('shop.balance', { amount: savings }), px + pw/2, py + 38);
    // Message (e.g., insufficient funds)
    if (shopMsg && shopMsgTimer > 0) {
      g.textAlign = 'center';
      g.fillStyle = '#ff6666';
      g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
      g.fillText(shopMsg, px + pw/2, py + 50);
      g.fillStyle = '#ffffff';
    }
    // buttons
    const bw2 = 78, bh2 = 26;
    const gapB = 12;
    const by2 = py + ph - 36;
    const bx2 = px + pw/2 - bw2 - gapB;
    const bx3 = px + pw/2 + gapB;
    // Buttons (YES/NO). If showing message (e.g., insufficient), disable YES and keep NO active
    const showingMsg = !!(shopMsg && shopMsgTimer > 0);
    // YES button
    g.fillStyle = showingMsg ? '#1a2739' : '#22334a';
    g.fillRect(bx2, by2, bw2, bh2); g.strokeRect(bx2, by2, bw2, bh2);
    // NO button
    g.fillStyle = '#22334a';
    g.fillRect(bx3, by2, bw2, bh2); g.strokeRect(bx3, by2, bw2, bh2);
    // button labels centered
    g.fillStyle = showingMsg ? '#8a98ad' : '#ffffff';
    g.textBaseline = 'middle';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(t('common.yes'), bx2 + bw2/2, by2 + bh2/2);
    g.fillStyle = '#ffffff';
    g.fillText(t('common.no'), bx3 + bw2/2, by2 + bh2/2);
  }

  // Help popup (items) with pagination instead of scroll
  if (shopHelp) {
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fillRect(0, 0, CONFIG.width, CONFIG.height);
    const pw = CONFIG.width * 0.86;
    const phBase = Math.min(320, CONFIG.height * 0.65);
    const ph = Math.min(phBase + 90, CONFIG.height - 20);
    const px = (CONFIG.width - pw)/2, py = CONFIG.height * 0.18;
    g.fillStyle = '#0f1a2a';
    g.strokeStyle = '#b4c0d9';
    g.lineWidth = 2;
    g.fillRect(px, py, pw, ph);
    g.strokeRect(px, py, pw, ph);
    
    // Title
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'top';
    g.font = `12px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(t('shop.itemsHelpTitle'), px + pw/2, py + 10);
    
    // Content area (no scroll)
    const contentTop = py + 35;
    const contentBottom = py + ph - 70; // Leave more space for pagination + close hint
    const contentHeight = contentBottom - contentTop;
    
    g.fillStyle = '#ffffff';
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.font = `9px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    const helpItems = (currentItemPageEntries && currentItemPageEntries.length) ? currentItemPageEntries : getAllItemsSorted();
    const leftPad = 10, rightPad = 10, gap = 8;
    let nameColW = 0;
    for (const it of helpItems) {
      const w = g.measureText(itemName(it)).width;
      nameColW = Math.max(nameColW, w);
    }
    nameColW = Math.max(50, Math.min(100, Math.floor(nameColW + 6)));
    const nameRightX = px + leftPad + nameColW;
    const descX = nameRightX + gap;
    const descMaxW = px + pw - rightPad - descX;
    function wrapText(ctx, text, maxW) {
      const words = String(text).split(' ');
      const lines = [];
      let line = '';
      for (const w of words) {
        const test = line ? (line + ' ' + w) : w;
        if (ctx.measureText(test).width <= maxW) line = test; else {
          if (line) lines.push(line);
          line = w;
        }
      }
      if (line) lines.push(line);
      return lines;
    }
    // Fixed items per page for help
    const helpItemsPerPage = 7;
    helpTotalPages = Math.max(1, Math.ceil(helpItems.length / helpItemsPerPage));
    if (helpPage >= helpTotalPages) helpPage = helpTotalPages - 1;
    if (helpPage < 0) helpPage = 0;
    const hs = helpPage * helpItemsPerPage;
    const he = Math.min(helpItems.length, hs + helpItemsPerPage);
    let yy = contentTop + 5;
    for (let i = hs; i < he; i++) {
      const it = helpItems[i];
      const name = itemName(it);
      const desc = itemDescription(it);
      const wrapped = wrapText(g, desc, descMaxW);
      // Name
      g.textAlign = 'right';
      g.fillStyle = '#ffa24d';
      g.fillText(name, nameRightX, yy);
      // Desc
      g.textAlign = 'left';
      g.fillStyle = '#ffffff';
      const baseLine = 14;
      let textY = yy;
      if (wrapped.length === 0) {
        textY += baseLine;
      } else {
        for (const line of wrapped) {
          g.fillText(line, descX, textY);
          textY += lineAdvance(baseLine, line);
        }
      }
      yy = textY + 8;
      if (yy > contentBottom - 14) break;
    }
    // Pagination controls for help
    const byHelp = py + ph - 44;
    const indicatorH = `${helpPage + 1}/${helpTotalPages}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#ffffff';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(indicatorH, px + pw/2, byHelp);
    const btnW = 18, btnH = 18;
    const tw2 = g.measureText(indicatorH).width;
    const gapBtn2 = 8;
    const leftHX = Math.floor(px + pw/2 - tw2/2 - gapBtn2 - btnW);
    const rightHX = Math.floor(px + pw/2 + tw2/2 + gapBtn2);
    if (helpPage > 0) {
      g.fillStyle = '#22334a'; g.strokeStyle = '#b4c0d9'; g.lineWidth = 2;
      g.fillRect(leftHX, byHelp - btnH/2, btnW, btnH); g.strokeRect(leftHX, byHelp - btnH/2, btnW, btnH);
      g.fillStyle = '#ffffff'; g.fillText('<', leftHX + btnW/2, byHelp);
    }
    if (helpPage < helpTotalPages - 1) {
      g.fillStyle = '#22334a'; g.strokeStyle = '#b4c0d9'; g.lineWidth = 2;
      g.fillRect(rightHX, byHelp - btnH/2, btnW, btnH); g.strokeRect(rightHX, byHelp - btnH/2, btnW, btnH);
      g.fillStyle = '#ffffff'; g.fillText('>', rightHX + btnW/2, byHelp);
    }
    
    // Bottom close instruction (outside clipping area)
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#b4c0d9';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(t('common.clickOutsideToClose'), px + pw/2, py + ph - 18);
  }

}

function shopNavSpecs() {
  return [
    {
      key: 'back',
      label: 'common.back',
      action: () => {
        const targetState = previousState || 'intro';
        State.current = targetState;
        shopHelp = false;
      },
    },
  ];
}

function registerShopNavButtons() {
  const specs = shopNavSpecs();
  if (!specs.length) return;
  const bw = 160;
  const bh = 40;
  const y = CONFIG.height - 60;
  const x = Math.floor((CONFIG.width - bw) / 2);
  specs.forEach((spec) => {
    uiButtons.shop.buttons.push(new UIButton(x, y, bw, bh, () => t(spec.label), () => {
      spec.action();
    }, 'shop'));
  });
}

function drawShopNavButtons(g) {
  const specs = shopNavSpecs();
  if (!specs.length) return;
  const bw = 160;
  const bh = 40;
  const y = CONFIG.height - 60;
  const x = Math.floor((CONFIG.width - bw) / 2);
  specs.forEach((spec) => {
    g.fillStyle = '#22334a';
    g.strokeStyle = '#b4c0d9';
    g.lineWidth = 2;
    g.fillRect(x, y, bw, bh);
    g.strokeRect(x, y, bw, bh);
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `10px "GameFont", "Press Start 2P", "Dalmoori", monospace`;
    g.fillText(t(spec.label), x + bw / 2, y + bh / 2 + 1);
  });
}

function buildShopCards() {
  uiButtons.shop.cards = [];
  uiButtons.shop.buttons = [];
  
  if (shopMode === 'ads') {
    const items = getAdRewardItems();
    const cardW = CONFIG.width * 0.86;
    const cardH = 120;
    const startY = CONFIG.height * 0.22;
    items.forEach((item, idx) => {
      const cardX = (CONFIG.width - cardW) / 2;
      const cardY = startY + idx * (cardH + 24);
      const card = new ShopCard(cardX, cardY, cardW, cardH, item, idx, 'ad');
      card.updateScroll(0);
      uiButtons.shop.cards.push(card);
    });
    registerShopNavButtons();
    return;
  }

  if (shopMode === 'chars') {
    // Character cards (pagination)
    const chars = visibleCharacters();
    const cols = 2;
    const cellW = CONFIG.width / cols;
    const cellH = CHAR_CARD_CELL_H;
    const marginX = 20;
    const top = CONFIG.height * 0.12 + 50;
    const rowsPerPage = CHAR_CARD_ROWS_PER_PAGE;
    const gapY = CHAR_CARD_VERTICAL_GAP;
    const itemsPerPage = cols * rowsPerPage;
    shopCharTotalPages = Math.max(1, Math.ceil(chars.length / itemsPerPage));
    if (shopCharPage >= shopCharTotalPages) shopCharPage = shopCharTotalPages - 1;
    if (shopCharPage < 0) shopCharPage = 0;
    const startIdx = shopCharPage * itemsPerPage;
    const endIdx = Math.min(chars.length, startIdx + itemsPerPage);
    for (let i = startIdx; i < endIdx; i++) {
      const [id, char] = chars[i];
      const local = i - startIdx;
      const r = Math.floor(local / cols);
      const c = local % cols;
      const shrink = 3;
      const x = marginX + c * cellW + 6 + shrink;
      const baseY = top + r * (cellH + gapY) + shrink;
      const w = cellW - 40 - shrink * 2;
      const h = cellH - shrink * 2;
      const card = new ShopCard(x, baseY, w, h, id, i, 'char');
      card.updateScroll(0);
      uiButtons.shop.cards.push(card);
    }
    // Pagination controls first
    const py = CONFIG.height - 60 - 18 - 20;
    const btnW = 36, btnH = 36; const cx = CONFIG.width / 2; const offset = 60;
    const leftX = Math.floor(cx - offset - btnW/2);
    const rightX = Math.floor(cx + offset - btnW/2);
    if (shopCharPage > 0) uiButtons.shop.buttons.push(new UIButton(leftX, py - btnH/2, btnW, btnH, () => t('pagination.prev'), () => { shopCharPage = Math.max(0, shopCharPage - 1); buildShopCards(); }, 'shop'));
    if (shopCharPage < shopCharTotalPages - 1) uiButtons.shop.buttons.push(new UIButton(rightX, py - btnH/2, btnW, btnH, () => t('pagination.next'), () => { shopCharPage = Math.min(shopCharTotalPages - 1, shopCharPage + 1); buildShopCards(); }, 'shop'));

    registerShopNavButtons();
  } else {
    // Item cards (pagination)
    const { cols, cellW, cellH, marginX, top, gap } = shopGrid();
    const rowsPerPage = CHAR_CARD_ROWS_PER_PAGE;
    const lvl = getLevelByExp(exp);
    const allItems = getAllItemsSorted();
    const itemsPerPage = cols * rowsPerPage + ITEM_CARD_EXTRA_PER_PAGE;
    shopItemTotalPages = Math.max(1, Math.ceil(allItems.length / itemsPerPage));
    if (shopItemPage >= shopItemTotalPages) shopItemPage = shopItemTotalPages - 1;
    if (shopItemPage < 0) shopItemPage = 0;
    const startIdx = shopItemPage * itemsPerPage;
    const endIdx = Math.min(allItems.length, startIdx + itemsPerPage);
    for (let i = startIdx; i < endIdx; i++) {
      const item = allItems[i];
      const local = i - startIdx;
      const r = Math.floor(local / cols);
      const c = local % cols;
      const shrink = 3;
      const x = marginX + c * cellW + 6 + shrink;
      const baseY = top + r * (cellH + gap) + shrink;
      const w = cellW - 40 - shrink * 2;
      const h = cellH - shrink * 2;
      const card = new ShopCard(x, baseY, w, h, item, i, 'item');
      card.updateScroll(0);
      uiButtons.shop.cards.push(card);
    }

    // Item shop buttons (+ pagination)
    const bw = 100, bh = 36;
    const spacing = 10;
    const totalWidth = bw * 2 + spacing;
    const startX = (CONFIG.width - totalWidth) / 2;
    const by = CONFIG.height - 60;

    // Pagination controls first (so they win in overlap)
    const py = by - 18 - 25; // lowered slightly
    const indicator = `${shopItemPage + 1}/${shopItemTotalPages}`;
    // Compute indicator width roughly (12px font per char)
    const cx = CONFIG.width / 2;
    const btnW = 36, btnH = 36; // slightly smaller buttons
    const offset = 60; // fixed horizontal offset from center
    const leftX = Math.floor(cx - offset - btnW / 2);
    const rightX = Math.floor(cx + offset - btnW / 2);
    // Left button only if not first page
    if (shopItemPage > 0) {
      uiButtons.shop.buttons.push(new UIButton(leftX, py - btnH / 2, btnW, btnH, () => t('pagination.prev'), () => {
        shopItemPage = Math.max(0, shopItemPage - 1);
        buildShopCards();
      }, 'shop'));
    }
    // Right button only if not last page
    if (shopItemPage < shopItemTotalPages - 1) {
      uiButtons.shop.buttons.push(new UIButton(rightX, py - btnH / 2, btnW, btnH, () => t('pagination.next'), () => {
        shopItemPage = Math.min(shopItemTotalPages - 1, shopItemPage + 1);
        buildShopCards();
      }, 'shop'));
    }

    registerShopNavButtons();
  }
}

function updateShop(dt) {
  updateStageTransition(dt);
  // Only process if in shop state
  if (State.current !== 'shop') return;
  
  // auto-dismiss message after timer
  if (shopMsgTimer > 0) {
    shopMsgTimer = Math.max(0, shopMsgTimer - dt);
    if (shopMsgTimer === 0) {
      shopMsg = null;
      shopMsgKey = null;
      shopMsgArgs = null;
      shopConfirm = null;
    }
  }
  
  
  // 초기화 또는 모드 변경 시 카드 생성
  if (uiButtons.shop.cards.length === 0) {
    buildShopCards();
  }
  
  // drag scroll disabled for all shops
  
  // Click handling - process on release instead of press
  // 터치 이벤트와 마우스 이벤트 모두 처리
  if (UI.clicked) {
    // 드래그 중이 아닐 때만 클릭으로 처리
    if (!shopDrag.hasMoved) {
      // Help popup toggle/close
    const hr = shopHelpRect();
    if (shopHelp) {
      // When help popup is open, handle pagination or close
      const pw = CONFIG.width * 0.86; const phBase = Math.min(320, CONFIG.height * 0.65);
      const ph = (shopMode === 'items') ? Math.min(phBase + 90, CONFIG.height - 20) : Math.min(phBase + 60, CONFIG.height - 20);
      const px = (CONFIG.width - pw)/2, py = CONFIG.height * 0.18;
      const contentTop = py + 35;
      const contentBottom = (shopMode === 'items') ? (py + ph - 70) : (py + ph - 70);
      const byHelp = (shopMode === 'items') ? (py + ph - 44) : (py + ph - 44);
      const indicatorH = `${helpPage + 1}/${helpTotalPages}`;
      // Buttons rects
      // approximate width based on indicator length
      const ctxW = 8 * indicatorH.length;
      const btnW = 18, btnH = 18;
      const gapBtn2 = 8;
      const leftHX = Math.floor(px + pw/2 - ctxW/2 - gapBtn2 - btnW);
      const rightHX = Math.floor(px + pw/2 + ctxW/2 + gapBtn2);
      const mx = UI.mx, my = UI.my;
      const insidePopup = (mx >= px && mx <= px + pw && my >= py && my <= py + ph);
      // Prev/Next inside popup
      if (insidePopup) {
        // Prev
        if (helpPage > 0 && mx >= leftHX && mx <= leftHX + btnW && my >= byHelp - btnH/2 && my <= byHelp + btnH/2) {
          helpPage = Math.max(0, helpPage - 1);
          UI.reset();
          return;
        }
        // Next
        if (helpPage < helpTotalPages - 1 && mx >= rightHX && mx <= rightHX + btnW && my >= byHelp - btnH/2 && my <= byHelp + btnH/2) {
          helpPage = Math.min(helpTotalPages - 1, helpPage + 1);
          UI.reset();
          return;
        }
        // Click inside popup area but not on buttons: ignore (do not close)
        UI.reset();
        return;
      }
      // Click outside popup closes it
      shopHelp = false;
      shopHelpScroll = 0;
      helpPage = 0;
      UI.reset();
      return;
    }
    if (hr && UI.mx>=hr.x && UI.mx<=hr.x+hr.w && UI.my>=hr.y && UI.my<=hr.y+hr.h) {
      shopHelp = true; helpPage = 0; UI.reset(); return;
    }
    // If confirm open, handle YES/NO
    if (shopConfirm) {
      const pw = CONFIG.width * 0.88, ph = 112;
      const px = (CONFIG.width - pw)/2, py = CONFIG.height * 0.40;
      const bw2 = 78, bh2 = 26; const by2 = py + ph - 36;
      const gapB = 12; const bx2 = px + pw/2 - bw2 - gapB; const bx3 = px + pw/2 + gapB;
      const x = UI.mx, y = UI.my;
      const showingMsg = !!(shopMsg && shopMsgTimer > 0);
      if (!showingMsg && x>=bx2 && x<=bx2+bw2 && y>=by2 && y<=by2+bh2) {
        // YES (only when not showing message)
        tryPurchase(shopConfirm.id);
        // If purchase succeeded, tryPurchase closes confirm; else message set
      } else if (x>=bx3 && x<=bx3+bw2 && y>=by2 && y<=by2+bh2) {
        // NO closes immediately
        shopConfirm = null; shopMsg = null; shopMsgKey = null; shopMsgArgs = null; shopMsgTimer = 0; UI.reset(); return;
      }
      UI.reset();
      return;
    }
    
    // Only process card/button clicks if not dragging
    if (shopDrag.hasMoved) {
      UI.reset();
      return;
    }
    
    // 객체 기반 클릭 처리
    // 먼저 버튼 클릭 검사 (버튼은 스크롤되지 않음)
    for (const button of uiButtons.shop.buttons) {
      if (button.isClicked(UI.mx, UI.my)) {
        button.onClick();
        UI.reset();
        return;
      }
    }
    
    // 현재 모드에 맞는 카드만 클릭 검사
    let viewportTop = 0;
    if (shopMode === 'items') {
      viewportTop = shopGrid().top;
    } else if (shopMode === 'chars') {
      viewportTop = CONFIG.height * 0.12 + 50;
    }
    const viewportBottom = CONFIG.height - 90;
    
    for (const card of uiButtons.shop.cards) {
      // 현재 모드와 카드 타입이 일치하는지 확인
      const correctType = (shopMode === 'items' && card.type === 'item') ||
                         (shopMode === 'chars' && card.type === 'char') ||
                         (shopMode === 'ads' && card.type === 'ad');
      
      if (!correctType) continue; // 타입이 맞지 않으면 건너뛰기
      
      // 뷰포트 내에 완전히 또는 부분적으로 보이는 카드만 클릭 가능
      const cardTop = card.y;
      const cardBottom = card.y + card.h;
      
      // 카드가 뷰포트 내에 있는지 확인
      if (cardBottom >= viewportTop && cardTop <= viewportBottom) {
        if (card.isClicked(UI.mx, UI.my)) {
          card.onClick();
          UI.reset();
          return;
        }
      }
    }
    
    // 클릭 처리 후 플래그 리셋
    UI.reset();
    }
  }
  
  // 스크롤 변경 시 카드 위치 업데이트
  if (shopDrag.active) {
    const dy = UI.my - shopDrag.y0;
    const newScroll = shopDrag.scroll0 - dy;
    
    // 스크롤 범위 계산
    let cols, cellH, paddingTop, paddingBottom, gap;
    const lvl = getLevelByExp(exp);
    let items;
    if (shopMode === 'items') {
      ({ cols, cellH, paddingTop, paddingBottom, gap } = shopGrid());
      items = getAllItemsSorted();
    } else {
      cols = 2;
      cellH = CHAR_CARD_CELL_H;
      paddingTop = 0;
      paddingBottom = 0;
      gap = CHAR_CARD_VERTICAL_GAP;
      items = visibleCharacters();
    }
    const rows = Math.ceil(items.length / cols) || 1;
    const contentH = paddingTop + rows * (cellH + gap) - gap + paddingBottom;
    const viewportH = CONFIG.height - (CONFIG.height * 0.12 + 50) - 90;
    
    const prevScroll = shopScroll;
    shopScroll = Math.max(0, Math.min(Math.max(0, contentH - viewportH), newScroll));
    
    // 스크롤 변경 시 모든 카드의 Y 위치 업데이트
    if (shopScroll !== prevScroll) {
      for (const card of uiButtons.shop.cards) {
        card.updateScroll(shopScroll);
      }
    }
  }
}

function tryPurchase(id) {
  // Check if it's a character purchase or selection
  if (shopConfirm && shopConfirm.type === 'character') {
    const char = PIXEL_CHARACTERS[id];
    if (!char) return;
    
    const charInv = shopInv.characters || [];
    const isPurchased = charInv.includes(id) || id === 'default';
    
    if (isPurchased) {
      // Just selecting an owned character
      selectedCharacter = id;
      localStorage.setItem('webswing_selected_char_v1', id);
      shopConfirm = null;
      return;
    }
    
    // Purchasing a new character
    const price = char.price;
    if (savings < price) {
      shopMsgKey = 'shop.error.funds';
      shopMsgArgs = { amount: price };
      shopMsg = t(shopMsgKey, shopMsgArgs);
      shopMsgTimer = 2.0;
      shopConfirm = null;
      return;
    }
    
    // Purchase character
    savings -= price;
    localStorage.setItem(SAVINGS_KEY, savings); // Save the deducted amount
    if (!charInv.includes(id)) {
      charInv.push(id);
      shopInv.characters = charInv;
      saveShopInv(shopInv);
    }
    
    // Auto-select the purchased character
    selectedCharacter = id;
    localStorage.setItem('webswing_selected_char_v1', id);
    
    shopConfirm = null;
    return;
  }
  
  // Original item purchase logic
  const it = SHOP_ITEMS.find(x => x.id === id);
  if (!it) return;
  let price = nextPriceForItem(it);
  // enforce affordability
  if (savings < price) {
    shopMsgKey = 'shop.error.funds';
    shopMsgArgs = { amount: price };
    shopMsg = t(shopMsgKey, shopMsgArgs);
    shopMsgTimer = 2.0;
    return;
  }
  if (isItemSoldOut(it)) { shopConfirm = null; return; }
  if (it.type === 'consumable') {
    const current = (shopInv.consumables && shopInv.consumables[id]) || 0;
    if (current >= 1) { shopConfirm = null; return; }
    savings -= price;
    if (!shopInv.consumables) shopInv.consumables = {};
    shopInv.consumables[id] = current + 1;
    saveShopInv(shopInv);
  } else if (id === 'glow') {
    const current = shopInv.glowLevel || 0;
    if (current >= 3) { shopConfirm = null; return; }
    savings -= price; shopInv.glowLevel = current + 1; saveShopInv(shopInv);
  } else if (id === 'buds') {
    const maxLv = it.maxLevel || 6;
    const current = shopInv.budsLevel || 0;
    if (current >= maxLv) { shopConfirm = null; return; }
    savings -= price;
    shopInv.budsLevel = current + 1;
    saveShopInv(shopInv);
  } else if (id === 'powerjump') {
    savings -= price; shopInv.powerJump = true; saveShopInv(shopInv);
  } else if (id === 'plusjump') {
    savings -= price; shopInv.plusJump = true; saveShopInv(shopInv);
  } else if (id === 'fly') {
    savings -= price; shopInv.fly = true; saveShopInv(shopInv);
  } else if (id === 'big') {
    const maxLv = getBigMaxLevel();
    const current = shopInv.bigLevel || 0;
    const dynPrice = 20 + 10 * current;
    if (savings < dynPrice) { shopMsgKey = 'shop.error.funds'; shopMsgArgs = { amount: dynPrice }; shopMsg = t(shopMsgKey, shopMsgArgs); shopMsgTimer = 2.0; return; }
    savings -= dynPrice;
    shopInv.bigLevel = Math.min(maxLv, current + 1);
    saveShopInv(shopInv);
  } else if (id === 'magnet') {
    const current = shopInv.magnetLevel || 0;
    if (current >= 5) { shopConfirm = null; return; }
    savings -= price; shopInv.magnetLevel = current + 1; saveShopInv(shopInv);
  } else if (id === 'combo') {
    const current = shopInv.comboLevel || 0;
    if (current >= 3) { shopConfirm = null; return; }
    savings -= price; shopInv.comboLevel = current + 1; saveShopInv(shopInv);
  } else if (id === 'slow') {
    const current = shopInv.slowLevel || 0;
    const maxLv = it.maxLevel || 1;
    if (current >= maxLv) { shopConfirm = null; return; }
    savings -= price;
    shopInv.slowLevel = Math.min(maxLv, current + 1);
    saveShopInv(shopInv);
  } else if (id === 'lucky') {
    const current = shopInv.luckyLevel || 0;
    if (current >= 5) { shopConfirm = null; return; }
    savings -= price; shopInv.luckyLevel = current + 1; saveShopInv(shopInv);
  } else if (id === 'fever') {
    const current = shopInv.feverLevel || 0;
    if (current >= 3) { shopConfirm = null; return; }
    savings -= price; shopInv.feverLevel = current + 1; saveShopInv(shopInv);
  } else if (id === 'revival') {
    // Revival is now a single-purchase item
    if (shopInv.revival) { shopConfirm = null; return; }
    savings -= price;
    shopInv.revival = true;
    saveShopInv(shopInv);
  } else if (id === 'startskill') {
    savings -= price;
    shopInv.startSkill = true;
    saveShopInv(shopInv);
  } else if (id === 'skill_reroll') {
    const maxLv = it.maxLevel || 3;
    const current = shopInv.skillRerollLevel || 0;
    if (current >= maxLv) { shopConfirm = null; return; }
    savings -= price;
    shopInv.skillRerollLevel = Math.min(maxLv, current + 1);
    saveShopInv(shopInv);
  } else if (id === 'skill_card_plus') {
    if (shopInv.skillCardPlus) { shopConfirm = null; return; }
    savings -= price;
    shopInv.skillCardPlus = true;
    saveShopInv(shopInv);
  }
  try { localStorage.setItem(SAVINGS_KEY, String(savings)); } catch(_){}
  shopConfirm = null;
}
