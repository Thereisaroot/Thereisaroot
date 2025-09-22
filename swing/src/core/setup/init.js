// WebSwing - Canvas and Core Initialization

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const I18N_API = typeof window !== 'undefined' ? window.I18N : null;

function t(key, params) {
  if (I18N_API && typeof I18N_API.t === 'function') {
    return I18N_API.t(key, params);
  }
  return key;
}

function translateList(key) {
  const raw = t(key);
  if (!raw) return [];
  return String(raw).split('\n');
}

function itemName(it) {
  return t(`items.${it.id}.name`);
}

function itemDescriptionKey(id) {
  return `items.${id}.description`;
}

function itemDescription(it) {
  return t(itemDescriptionKey(it.id));
}

function characterName(id) {
  return t(`chars.${id}.name`);
}

function characterSummaryLines(id) {
  return translateList(`chars.${id}.summary`);
}

function commonText(key, params) {
  return t(`common.${key}`, params);
}

let dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

function setupCanvas() {
  dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = Math.floor(CONFIG.width * dpr);
  canvas.height = Math.floor(CONFIG.height * dpr);
  canvas.style.width = CONFIG.width + 'px';
  canvas.style.height = CONFIG.height + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function applyLocalizedAccessibility() {
  if (canvas) {
    canvas.setAttribute('aria-label', t('meta.canvasLabel'));
  }
}

const HANGUL_REGEX = /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7A3]/;
const HANGUL_LINE_SPACING_PX = 5;

function containsHangul(text) {
  return HANGUL_REGEX.test(text || '');
}

function lineAdvance(base, text) {
  return base + (containsHangul(text) ? HANGUL_LINE_SPACING_PX : 0);
}

const Fonts = {
  loaded: false,
  async load() {
    try {
      // Attempt to load; browser will no-op if unsupported
      if (document.fonts && document.fonts.load) {
        try { await document.fonts.load('12px "GameFont"'); } catch {}
        try { await document.fonts.load('12px "Press Start 2P"'); } catch {}
        try { await document.fonts.load('12px "Dalmoori"'); } catch {}
      } else {
        // Fallback small delay
        await new Promise((r) => setTimeout(r, 300));
      }
      this.loaded = true;
    } catch (_) {
      this.loaded = true;
    }
  },
};

// Ensure Hangul text rendered with Dalmoori reads slightly larger than Latin glyphs.
(function patchCanvasFontSizing() {
  if (typeof CanvasRenderingContext2D === 'undefined') return;

  const FONT_DELTA_PX = 3;

  const proto = CanvasRenderingContext2D.prototype;
  const originals = {
    fillText: proto.fillText,
    strokeText: proto.strokeText,
    measureText: proto.measureText,
  };

  function adjustFontString(font) {
    if (!font || typeof font !== 'string') return null;
    if (!font.includes('GameFont') && !font.includes('Dalmoori')) return null;
    return font.replace(/(^|\s)(\d+(?:\.\d+)?)px/, (full, prefix, size) => {
      const adjusted = Math.max(0, parseFloat(size) + FONT_DELTA_PX);
      return `${prefix}${adjusted}px`;
    });
  }

  function withAdjustedFont(ctx, text, fn) {
    const content = text == null ? '' : String(text);
    if (!containsHangul(content)) {
      return fn();
    }
    const originalFont = ctx.font;
    const adjusted = adjustFontString(originalFont);
    if (!adjusted || adjusted === originalFont) {
      return fn();
    }
    ctx.font = adjusted;
    try {
      return fn();
    } finally {
      ctx.font = originalFont;
    }
  }

  proto.fillText = function patchedFillText(text, x, y, maxWidth) {
    return withAdjustedFont(this, text, () => originals.fillText.call(this, text, x, y, maxWidth));
  };

  proto.strokeText = function patchedStrokeText(text, x, y, maxWidth) {
    return withAdjustedFont(this, text, () => originals.strokeText.call(this, text, x, y, maxWidth));
  };

  proto.measureText = function patchedMeasureText(text) {
    return withAdjustedFont(this, text, () => originals.measureText.call(this, text));
  };
})();

// Setup i18n change listener
if (I18N_API && typeof I18N_API.onChange === 'function') {
  I18N_API.onChange(() => {
    applyLocalizedAccessibility();
    if (typeof buildIntroButtons === 'function') buildIntroButtons();
    if (typeof buildGameOverButtons === 'function') buildGameOverButtons();
    if (typeof buildShopCards === 'function') buildShopCards();
    if (shopMsgKey) shopMsg = t(shopMsgKey, shopMsgArgs);
  });
}

// Initialize
setupCanvas();
window.addEventListener('resize', setupCanvas);
applyLocalizedAccessibility();