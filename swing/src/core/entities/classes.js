// Extracted classes from main.js

class Rope {
  constructor(params) {
    this.anchorX = params.anchorX;
    this.anchorY = params.anchorY;
    this.L = params.L;
    this.A = params.A; // radians
    this.omega = params.omega; // rad/s
    this.phi = params.phi; // phase
    this.createdAt = params.createdAt || 0;
    this.id = params.id || Math.random().toString(36).slice(2);
    this.breakAt = null; // time when rope will snap (if scheduled)
    this.isWebRope = params.isWebRope || false;
    this.webTargetL = params.webTargetL || null;
    this.retractSpeed = params.retractSpeed || 250;
    this.tailorBonus = params.tailorBonus || 0;
    this.countsForStage = (params.countsForStage !== undefined) ? params.countsForStage : !this.isWebRope;
  }
  // θ(t) = A cos(ω t + φ)
  theta(t) {
    return this.A * Math.cos(this.omega * t + this.phi);
  }
  tip(t) {
    const th = this.theta(t);
    const x = this.anchorX + this.L * Math.sin(th);
    const y = this.anchorY + this.L * Math.cos(th);
    const dth = -this.A * this.omega * Math.sin(this.omega * t + this.phi);
    const vx = this.L * Math.cos(th) * dth;
    const vy = -this.L * Math.sin(th) * dth;
    return { x, y, vx, vy, th };
  }
}

// Player entity (shape renderer)
class Player {
  constructor() {
    this.r = 14;
    this.reset();
  }
  reset() {
    this.x = CONFIG.width * 0.32;
    this.y = CONFIG.height * 0.45;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.mode = 'attached'; // 'attached' | 'free' | 'drone'
    this.rope = null; // current attached rope
    this.sizeScale = 1;
    this.droneRide = null;
  }
  airFlap() {
    // In-air flap: mainly vertical impulse, minimal horizontal change
    this.vy = Math.min(this.vy, 0) - CONFIG.jumpImpulse * 0.85 * (CONFIG.jumpSpeedScale || 1);
  }
  update(dt, t) {
    if (this.mode === 'drone') {
      const ride = this.droneRide;
      if (!ride) {
        this.mode = 'free';
      } else {
        const offsetY = ride.rideOffset || 36;
        this.x = ride.x;
        this.y = ride.y + offsetY;
        this.vx = ride.vx || 0;
        this.vy = ride.vy || 0;
        this.angle += (0 - this.angle) * Math.min(1, dt * 8);
      }
    } else if (this.mode === 'attached' && this.rope) {
    if (this.rope.isWebRope && this.rope.webTargetL != null && this.rope.L > this.rope.webTargetL) {
      this.rope.L -= this.rope.retractSpeed * dt; // Retract speed
      if (this.rope.L < this.rope.webTargetL) {
          this.rope.L = this.rope.webTargetL;
      }
    }
      if (characterIs('wizard')) {
        wizardFloatTimer = 0;
        wizardSpinTimer = 0;
        wizardSpinRate = 0;
      }
      const tip = this.rope.tip(t);
      this.x = tip.x;
      this.y = tip.y;
      // Angle from rope tip velocity
      const targetAngle = Math.atan2(tip.vy, tip.vx || 1e-6);
      const maxTilt = Math.PI * 0.6;
      const clamped = Math.max(-maxTilt, Math.min(maxTilt, targetAngle));
      this.angle += (clamped - this.angle) * Math.min(1, dt * 10);
      // vy follows tip vy (for smooth transition on detach)
      this.vy = tip.vy;
    } else {
      // Free flight (flappy-like): vertical physics only; horizontal is via camera
      const s = (CONFIG.jumpSpeedScale || 1);
      const wizardFloating = characterIs('wizard') && wizardFloatTimer > 0;
      const floatFactor = wizardFloating ? 0.3 : 1;
      this.x += this.vx * dt;
      // horizontal damping scaled to preserve distance under time dilation
      this.vx += -this.vx * (CONFIG.airDragX * s * floatFactor) * dt;
      if (wizardFloating) {
        const target = Math.min(CONFIG.maxVx, Math.max(CONFIG.minVx, CONFIG.wizardGlideTargetSpeed || CONFIG.baseVx));
        const accel = Math.max(0, CONFIG.wizardGlideAccel || 0);
        if (this.vx < target) {
          this.vx += accel * dt;
          if (this.vx > target) this.vx = target;
        }
      }
      // gravity scaled by s^2 to preserve trajectory distance while slowing motion
      this.vy += (CONFIG.gravity * s * s * floatFactor) * dt;
      this.y += this.vy * dt;
      const spinning = wizardFloating && wizardSpinRate > 0;
      if (spinning) {
        this.angle += wizardSpinRate * dt;
      } else {
        const targetAngle = Math.atan2(this.vy, 260);
        const maxTilt = Math.PI * 0.45;
        const baseLerp = 12;
        const spinBoost = wizardFloating ? (Math.abs(this.vy) * 0.005 + Math.abs(this.vx) * 0.003) : 0;
        const clamped = Math.max(-maxTilt, Math.min(maxTilt, targetAngle));
        const lerpRate = Math.min(1, dt * (baseLerp + spinBoost));
        this.angle += (clamped - this.angle) * lerpRate;
      }
      if (wizardFloating) {
        wizardFloatTimer = Math.max(0, wizardFloatTimer - dt);
        wizardSpinTimer = Math.max(0, wizardSpinTimer - dt);
        if (wizardFloatTimer <= 0 || wizardSpinTimer <= 0) {
          wizardSpinTimer = 0;
          wizardSpinRate = 0;
        }
      }
    }
  }
  draw(g) {
    g.save();

    // Move to player position first
    g.translate(this.x, this.y);

    // Apply boss fade-in/scale animation if in boss fade-in phase
    if (typeof bossState !== 'undefined' && bossState && bossState.phase === 'boss_fade_in') {
      const alpha = bossState.fadeAlpha !== undefined ? bossState.fadeAlpha : 1;
      const scale = bossState.fadeScale !== undefined ? bossState.fadeScale : 1;
      g.globalAlpha = alpha;
      g.scale(scale, scale);
    }

    // Apply rotation after scale
    g.rotate(this.angle);
    const level = getLevelByExp(exp);
    // Level 1: pure white circle. Level 2+: every 3 levels shape changes; add one color segment per level (max 3)
    const segCount = (level <= 1) ? 0 : (((level - 2) % 3) + 1);
    const segColors = ['#e53d3d', '#6aa8ff', '#ffa24d'];
    const size = this.r * 2 * this.sizeScale;
    const levelScale = (level > 1) ? 1.3 : 1.0;

    // Check if using pixel character
    const isPixelChar = selectedCharacter !== 'default' && PIXEL_CHARACTERS[selectedCharacter];

    function drawPolygonPath(ctx, sides, radius, rotationRad) {
      const r = radius;
      ctx.beginPath();
      for (let i = 0; i < sides; i++) {
        const a = rotationRad + i * (Math.PI * 2 / sides);
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
    }

    // Glow effect if purchased (3 levels with different colors and alpha)
    if (shopInv.glowLevel && shopInv.glowLevel > 0) {
      const glowLv = shopInv.glowLevel;
      // Level 1: white, fast blink, low alpha
      // Level 2: yellow, medium blink, medium alpha
      // Level 3: sky blue, slow blink, high alpha
      const colors = ['#ffffff', '#ffff88', '#88ddff'];
      const speeds = [5.0, 3.5, 2.0]; // Blink speed
      const minAlphas = [0.05, 0.08, 0.1]; // Lower min alphas for pixel chars
      const maxAlphas = [0.2, 0.25, 0.3]; // Max alpha 0.3 for level 3

      const color = colors[Math.min(glowLv - 1, 2)];
      const speed = speeds[Math.min(glowLv - 1, 2)];
      const minAlpha = minAlphas[Math.min(glowLv - 1, 2)];
      const maxAlpha = maxAlphas[Math.min(glowLv - 1, 2)];

      const pulse = (Math.sin(simTime * speed) + 1) / 2; // 0 to 1
      const alpha = minAlpha + (maxAlpha - minAlpha) * pulse;

      g.save();
      // Use screen blend mode for better glow effect
      g.globalCompositeOperation = 'screen';
      g.globalAlpha = alpha;
      g.fillStyle = color;
      const bigScale = 1 + 0.025 * (shopInv.bigLevel || 0);
      const gr = (this.r * this.sizeScale * bigScale) * ((level > 1) ? 1.3 : 1.0) * 1.6;

      // Draw glow shape
      if (isPixelChar) {
        // Sunburst/starburst effect for pixel characters with varying ray sizes
        const rays = 12;
        const innerR = gr * 0.5;

        // Different sizes for each ray for more organic look
        const rayScales = [1.0, 0.7, 0.9, 0.6, 1.1, 0.8, 0.95, 0.65, 1.05, 0.75, 0.85, 0.7];

        g.beginPath();
        for (let i = 0; i < rays; i++) {
          const angle = (i / rays) * Math.PI * 2;
          const nextAngle = ((i + 0.5) / rays) * Math.PI * 2;

          // Vary the outer radius for each ray
          const outerR = gr * rayScales[i];

          // Outer point
          const x1 = Math.cos(angle) * outerR;
          const y1 = Math.sin(angle) * outerR;

          // Inner point (also vary slightly)
          const innerScale = 0.9 + Math.sin(i * 1.7) * 0.1;
          const x2 = Math.cos(nextAngle) * innerR * innerScale;
          const y2 = Math.sin(nextAngle) * innerR * innerScale;

          if (i === 0) {
            g.moveTo(x1, y1);
          } else {
            g.lineTo(x1, y1);
          }
          g.lineTo(x2, y2);
        }
        g.closePath();
        g.fill();
      } else if (level === 1) {
        // Circle for level 1
        g.beginPath();
        g.arc(0, 0, gr, 0, Math.PI * 2);
        g.fill();
      } else {
        // Polygon for level 2+
        const groupIdx = Math.floor((level - 2) / 3);
        const sides = 3 + Math.max(0, groupIdx);
        const rot = Math.PI / 10; // Match player's rotation
        drawPolygonPath(g, sides, gr, rot);
        g.fill();
      }
      g.restore();
    }

    // Draw character (pixel or default)
    if (isPixelChar) {
      // Draw pixel character with animation
      const charData = PIXEL_CHARACTERS[selectedCharacter];
      const bigScale = 1 + 0.025 * (shopInv.bigLevel || 0);
      const pixelSize = 3 * this.sizeScale * bigScale * levelScale;

      // Animation effects based on player state
      const isSwinging = this.mode === 'attached';
      const isFalling = this.mode === 'free' && this.vy > 50;
      const isJumping = this.mode === 'free' && this.vy < -50;

      // Squash and stretch animation
      let scaleX = 1;
      let scaleY = 1;
      let offsetY = 0;

      if (isSwinging) {
        // Subtle swing animation
        scaleX = 1 + Math.sin(simTime * 8) * 0.05;
        scaleY = 1 - Math.sin(simTime * 8) * 0.05;
      } else if (isJumping) {
        // Stretch when jumping up
        scaleX = 0.9;
        scaleY = 1.15;
      } else if (isFalling) {
        // Squash when falling down
        scaleX = 1.1;
        scaleY = 0.9;
      }

      // Eye blink animation
      const blinkCycle = Math.floor(simTime * 0.3) % 20;
      const isBlinking = blinkCycle === 0;

      // Apply animation transforms
      g.save();
      g.scale(scaleX, scaleY);

      // Draw pixels with animation
      // Robot turns rusty brown after using its ground rescue once per run.
      const robotRustColors = ['#8B5A2B', '#D9B382', '#5D3A1A'];
      const activeColors = (characterIs('robot') && robotReviveUsed) ? robotRustColors : charData.colors;

      charData.pixels.forEach((row, ry) => {
        row.forEach((pixel, rx) => {
          if (pixel) {
            // Special handling for eyes (usually pixel value 2)
            if (pixel === 2 && isBlinking) {
              // Don't draw eyes when blinking
              return;
            }

            // Add slight wobble for certain characters
            let pixelOffsetX = 0;
            let pixelOffsetY = 0;

            if (selectedCharacter === 'ninja' && isSwinging) {
              // Ninja's scarf/ribbon effect - animate bottom pixels
              if (ry >= 6) {
                pixelOffsetX = Math.sin(simTime * 10 + ry) * 1;
              }
            } else if (selectedCharacter === 'wizard' && isSwinging) {
              // Wizard's robe flutter - animate bottom pixels
              if (ry >= 5) {
                pixelOffsetX = Math.cos(simTime * 8 + ry * 0.5) * 0.8;
              }
            }

            g.fillStyle = activeColors[pixel - 1] || '#ffffff';
            g.fillRect(
              (rx - charData.pixels[0].length / 2) * pixelSize + pixelOffsetX,
              (ry - charData.pixels.length / 2) * pixelSize + pixelOffsetY + offsetY,
              pixelSize,
              pixelSize
            );
          }
        });
      });

      g.restore();

      // No outline for pixel characters to avoid black border

    } else if (level === 1) {
      // Pure white circle (egg)
      const bigScale = 1 + 0.025 * (shopInv.bigLevel || 0);
      const r = this.r * this.sizeScale * bigScale * levelScale;
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(0, 0, r, 0, Math.PI * 2);
      g.fill();
      // Outline and pointer
      g.strokeStyle = '#e53d3d';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(0, 0, r, 0, Math.PI * 2);
      g.stroke();
      // Direction pointer
      g.fillStyle = '#e53d3d';
      g.beginPath();
      g.moveTo(r * 0.6, 0);
      g.lineTo(r * 0.1, -5);
      g.lineTo(r * 0.1, 5);
      g.closePath();
      g.fill();
    } else {
      // Shape mapping: L2-4 triangle (3), L5-7 square (4), L8-10 pentagon (5), ...
      const groupIdx = Math.floor((level - 2) / 3); // 0 for L2-4, 1 for L5-7, ...
      const sides = 3 + groupIdx;
      const bigScale = 1 + 0.025 * (shopInv.bigLevel || 0);
      const r = this.r * this.sizeScale * bigScale * levelScale;
      const rot = Math.PI / 10; // slight rotation
      // Clip to polygon
      g.save();
      drawPolygonPath(g, sides, r, rot);
      g.clip();
      // Base
      g.fillStyle = '#ffffff';
      g.fillRect(-r, -r, r*2, r*2);
      // Segments
      const third = (r * 2) / 3;
      for (let i = 0; i < segCount; i++) {
        g.fillStyle = segColors[i % segColors.length];
        g.fillRect(-r + third * i, -r, third, r*2);
      }
      g.restore();
      // Outline
      g.strokeStyle = '#e53d3d';
      g.lineWidth = 2;
      drawPolygonPath(g, sides, r, rot);
      g.stroke();
    }

    // Buds - works with both pixel and polygon characters
    const budsLevel = shopInv.budsLevel || 0;
    const runtimeBuds = (typeof activeBudsCount === 'number')
      ? Math.max(0, Math.min(activeBudsCount, budsLevel))
      : budsLevel;
    const budsCount = Math.min(6, runtimeBuds);
    if (budsCount > 0) {
      const spin = simTime * 0.8;
      const budPalette = ['#e53d3d', '#6aa8ff', '#ffa24d'];

      if (isPixelChar) {
        const charData = PIXEL_CHARACTERS[selectedCharacter];
        const bigScale = 1 + 0.025 * (shopInv.bigLevel || 0);
        const pixelSize = 3 * this.sizeScale * bigScale * levelScale;
        const width = (charData.pixels[0].length || 8) * pixelSize;
        const height = (charData.pixels.length || 8) * pixelSize;
        const orbitR = Math.max(width, height) * 0.6 + 6;
        const budRadius = 4.5;
        for (let i = 0; i < budsCount; i++) {
          const baseAngle = spin + i * (Math.PI * 2 / budsCount);
          const wobble = Math.sin(simTime * 1.4 + i) * 0.2;
          const angle = baseAngle + wobble;
          const px = Math.cos(angle) * orbitR;
          const py = Math.sin(angle) * orbitR * 0.9;
          const pulse = 1 + Math.sin(simTime * 2.5 + i) * 0.1;
          g.save();
          g.translate(px, py);
          const paletteColor = budPalette[i % budPalette.length];
          g.fillStyle = paletteColor;
          g.beginPath();
          g.arc(0, 0, budRadius * pulse, 0, Math.PI * 2);
          g.fill();
          g.strokeStyle = '#2d2d2d';
          g.lineWidth = 1;
          g.stroke();
          g.restore();
        }
      } else if (level > 1) {
        const bigScale = 1 + 0.025 * (shopInv.bigLevel || 0);
        const baseR = this.r * this.sizeScale * bigScale * ((level > 1) ? 1.3 : 1.0);
        const childR = baseR * 0.32;
        const orbitR = baseR + childR * 1.6;
        const third = (baseR * 2) / 3;
        const segColorsLocal = budPalette;
        const segCountLocal = (level <= 1) ? 0 : (((level - 2) % 3) + 1);
        for (let i = 0; i < budsCount; i++) {
          const baseAngle = spin + i * (Math.PI * 2 / budsCount);
          const wobble = Math.sin(simTime * 1.6 + i * 0.8) * 0.25;
          const angle = baseAngle + wobble;
          const px = Math.cos(angle) * orbitR;
          const py = Math.sin(angle) * orbitR * 0.92;
          let col = '#ffffff';
          if (segCountLocal > 0) {
            const idx = Math.max(0, Math.min(2, Math.floor((px + baseR) / third)));
            if (idx < segCountLocal) col = segColorsLocal[idx];
          }
          g.save();
          g.translate(px, py);
          g.fillStyle = col;
          g.strokeStyle = '#e53d3d';
          g.lineWidth = 2;
          g.beginPath();
          g.arc(0, 0, childR, 0, Math.PI * 2);
          g.fill();
          g.stroke();
          g.restore();
        }
      }
    }

    g.restore();
  }
}

// Effective player collision radius (level-scaled)
function playerCollisionRadius() {
  const level = getLevelByExp(exp);
  const levelScale = (level > 1) ? 1.3 : 1.0;
  const bigScale = 1 + 0.05 * (shopInv.bigLevel || 0);
  return player.r * player.sizeScale * bigScale * levelScale;
}

class UIButton {
  constructor(x, y, w, h, label, action, state, options = {}) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.label = label;
    this.action = action;
    this.state = state; // Which state this button belongs to
    this.disabled = Boolean(options.disabled);
    this.onDisabled = typeof options.onDisabled === 'function' ? options.onDisabled : null;
    this.meta = options.meta || null;
  }

  isClicked(mx, my) {
    return mx >= this.x && mx <= this.x + this.w &&
           my >= this.y && my <= this.y + this.h;
  }

  labelText() {
    return typeof this.label === 'function' ? this.label() : this.label;
  }

  onClick() {
    console.log(`Button clicked: ${this.labelText()} in ${this.state}`);
    if (this.disabled) {
      if (this.onDisabled) this.onDisabled(this);
      return;
    }
    this.action();
  }
}

class ShopCard {
  constructor(x, y, w, h, item, index, type) {
    this.x = x;
    this.baseY = y; // 기본 Y 위치 (스크롤 없을 때)
    this.y = y; // 실제 Y 위치 (스크롤 반영)
    this.w = w;
    this.h = h;
    this.item = item;
    this.index = index;
    this.type = type; // 'item' | 'char' | 'ad'
  }

  updateScroll(scrollY) {
    this.y = this.baseY - scrollY;
  }

  isClicked(mx, my) {
    return mx >= this.x && mx <= this.x + this.w &&
           my >= this.y && my <= this.y + this.h;
  }

  onClick() {
    // 타입에 따라 다른 처리
    if (this.type === 'char') {
      // 캐릭터 구매/선택 처리
      const charId = typeof this.item === 'string' ? this.item : this.item.id;
      const char = PIXEL_CHARACTERS[charId];
      if (!char) return;

      const charInv = shopInv.characters || [];
      const lvl = getLevelByExp(exp);
      const state = characterCardState(charId, char, lvl, charInv, savings);

      if (state.levelLocked) {
        shopMsgKey = 'shop.error.level';
        shopMsgArgs = { level: state.minLevel };
        shopMsg = t(shopMsgKey, shopMsgArgs);
        shopMsgTimer = 2.0;
        shopConfirm = null;
        return;
      }

      if (state.fundsLocked) {
        shopMsgKey = 'shop.error.funds';
        shopMsgArgs = { amount: state.price };
        shopMsg = t(shopMsgKey, shopMsgArgs);
        shopMsgTimer = 2.0;
        shopConfirm = null;
        return;
      }

      const isOwned = state.owned;

      shopConfirm = {
        id: charId,
        type: 'character',
        isOwned: isOwned,
        price: isOwned ? 0 : char.price
      };
    } else if (this.type === 'ad') {
      const key = this.item && this.item.key;
      if (!key) return;
      const state = (typeof getAdRewardState === 'function') ? getAdRewardState(key) : null;
      const claimed = (typeof isDailyRewardClaimed === 'function') ? isDailyRewardClaimed(key) : false;
      const alreadyOwned = (key === 'wizard' && shopInv.characters && shopInv.characters.includes('wizard'))
        || (key === 'startSkill' && shopInv.startSkill);
      const requiredCount = Number(this.item && this.item.requiresRewardCount) || 0;
      const rewardCount = (typeof getTossAdRewardCount === 'function') ? getTossAdRewardCount() : 0;
      if (requiredCount > 0 && rewardCount < requiredCount) {
        return;
      }
      if (alreadyOwned || claimed) return;
      if (state && state.status === 'loading') return;
      if (typeof startRewardAd === 'function') startRewardAd(key);
    } else {
      // 일반 아이템 구매 처리
      const lvl = getLevelByExp(exp);
      const state = itemCardState(this.item, lvl, savings);

      if (state.soldOut) {
        shopMsgKey = 'shop.error.alreadyPurchased';
        shopMsgArgs = null;
        shopMsg = t(shopMsgKey);
        shopMsgTimer = 1.5;
        shopConfirm = null;
        return;
      }

      if (state.levelLocked) {
        shopMsgKey = 'shop.error.level';
        shopMsgArgs = { level: state.minLevel };
        shopMsg = t(shopMsgKey, shopMsgArgs);
        shopMsgTimer = 2.0;
        shopConfirm = null;
        return;
      }

      if (state.specialLocked) {
        shopMsgKey = 'shop.error.special';
        shopMsgArgs = null;
        shopMsg = t(shopMsgKey);
        shopMsgTimer = 2.0;
        shopConfirm = null;
        return;
      }

      if (state.fundsLocked) {
        shopMsgKey = 'shop.error.funds';
        shopMsgArgs = { amount: state.price };
        shopMsg = t(shopMsgKey, shopMsgArgs);
        shopMsgTimer = 2.0;
        shopConfirm = null;
        return;
      }

      shopConfirm = { id: this.item.id, price: state.price, type: 'item' };
    }
  }
}
