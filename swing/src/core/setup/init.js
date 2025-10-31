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

const CANVAS_MARGIN_X = 15;
const CANVAS_MARGIN_Y = 15;
const MAX_CANVAS_WIDTH = 800;
let dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
let canvasScaleX = 1;
let canvasScaleY = 1;
let adResizeObserver = null;
let adMutationObserver = null;

function visibleElementHeight(el) {
  if (!el) return 0;
  const style = window.getComputedStyle ? window.getComputedStyle(el) : null;
  if (style && (style.display === 'none' || style.visibility === 'hidden')) return 0;
  if (el.offsetParent === null && (!style || style.position !== 'fixed')) return 0;
  const rect = el.getBoundingClientRect();
  return Math.max(0, rect.height);
}

function setupCanvas() {
  dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

  const adEl = document.querySelector('.kakao_ad_area');
  const adHeight = visibleElementHeight(adEl);

  const reservedVertical = CANVAS_MARGIN_Y * 2 + adHeight;
  const rawAvailableWidth = Math.max(1, (window.innerWidth || CONFIG.width) - CANVAS_MARGIN_X * 2);
  const availableWidth = Math.min(MAX_CANVAS_WIDTH, rawAvailableWidth);
  const availableHeight = Math.max(1, (window.innerHeight || CONFIG.height) - reservedVertical);

  const nextScaleX = availableWidth / CONFIG.width;
  const nextScaleY = availableHeight / CONFIG.height;
  const nextScale = Math.min(nextScaleX, nextScaleY);
  const normalizedScale = Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1;
  canvasScaleX = normalizedScale;
  canvasScaleY = normalizedScale;

  const scaledWidth = CONFIG.width * canvasScaleX;
  const scaledHeight = CONFIG.height * canvasScaleY;
  const renderWidth = Math.max(1, Math.round(CONFIG.width * canvasScaleX * dpr));
  const renderHeight = Math.max(1, Math.round(CONFIG.height * canvasScaleY * dpr));

  canvas.width = renderWidth;
  canvas.height = renderHeight;
  canvas.style.width = `${scaledWidth}px`;
  canvas.style.height = `${scaledHeight}px`;
  canvas.style.margin = `${CANVAS_MARGIN_Y}px ${CANVAS_MARGIN_X}px`;
  document.documentElement.style.setProperty('--game-scaled-height', `${scaledHeight}px`);

  ctx.setTransform(canvasScaleX * dpr, 0, 0, canvasScaleY * dpr, 0, 0);
  if ('imageSmoothingEnabled' in ctx) {
    ctx.imageSmoothingEnabled = false;
  }
}

function observeAdArea() {
  const adEl = document.querySelector('.kakao_ad_area');
  if (!adEl) return;
  if (typeof ResizeObserver !== 'undefined' && !adResizeObserver) {
    adResizeObserver = new ResizeObserver(() => setupCanvas());
    adResizeObserver.observe(adEl);
  } else if (typeof MutationObserver !== 'undefined' && !adMutationObserver) {
    adMutationObserver = new MutationObserver(() => setupCanvas());
    adMutationObserver.observe(adEl, { attributes: true, childList: true, subtree: true });
  }
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
window.addEventListener('load', setupCanvas, { once: true });
observeAdArea();
applyLocalizedAccessibility();
