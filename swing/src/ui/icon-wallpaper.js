(function () {
  const ICON_SOURCES = [
    './assets/skills/air_combo.png',
    './assets/skills/combo_master.png',
    './assets/skills/cash_magnet.png',
    './assets/skills/rope_glide.png',
    './assets/skills/void_magnet.png',
    './assets/skills/spider_guard.png',
    './assets/skills/sky_harvest.png',
    './assets/skills/stage_focus.png',
    './assets/skills/frenzy_feather.png',
    './assets/skills/fever_extension.png',
    './assets/skills/rope_shortener.png',
    './assets/skills/drone_support.png',
    './assets/skills/box.png',
    './assets/skills/power_boost.png',
    './assets/skills/drone_collector.png',
    './assets/skills/icon/air_combo_icon.png',
    './assets/skills/icon/combo_master_icon.png',
    './assets/skills/icon/cash_magnet_icon.png',
    './assets/skills/icon/rope_glide_icon.png',
    './assets/skills/icon/void_magnet_icon.png',
    './assets/skills/icon/spider_guard_icon.png',
    './assets/skills/icon/sky_harvest_icon.png',
    './assets/skills/icon/stage_focus_icon.png',
    './assets/skills/icon/frenzy_feather_icon.png',
    './assets/skills/icon/fever_extension_icon.png',
    './assets/skills/icon/rope_shortener_icon.png',
    './assets/skills/icon/drone_support_icon.png',
    './assets/skills/icon/drone_collector_icon.png',
    './assets/skills/icon/power_boost_icon.png',
  ];

  const SIZE_RANGE = [72, 140];
  const ROTATE_RANGE = [-26, 26];
  const OPACITY_RANGE = [0.14, 0.26];
  const SCALE_RANGE = [0.85, 1.25];
  const MIN_GAP_PX = 24;
  const MAX_ATTEMPTS = 60;
  const MARGIN_RATIO = 0.12;

  function randomRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  function computeCopiesPerIcon(width, height) {
    const area = width * height;
    if (area < 500000) return 1;
    if (area < 1200000) return 2;
    if (area < 2200000) return 3;
    return 4;
  }

  function sampleWithBias(min, max, preferEdgeProbability, edgeFraction, exponent) {
    const span = max - min;
    if (span <= 0) {
      return min;
    }

    const clampedEdgeFraction = Math.min(edgeFraction, 0.48);
    const edgeSpan = span * clampedEdgeFraction;
    const middleStart = min + edgeSpan;
    const middleEnd = max - edgeSpan;
    const hasMiddle = middleEnd > middleStart;

    if (!hasMiddle || Math.random() < preferEdgeProbability) {
      const useStart = Math.random() < 0.5;
      const offset = edgeSpan > 0 ? Math.pow(Math.random(), exponent) * edgeSpan : 0;
      return useStart ? min + offset : max - offset;
    }

    return middleStart + randomRange(0, middleEnd - middleStart);
  }

  function removeExisting() {
    const existing = document.querySelector('.icon-wallpaper');
    if (existing) {
      existing.remove();
    }
  }

  function createWallpaper() {
    if (!document.body) {
      return;
    }

    removeExisting();

    const viewportWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const viewportHeight = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);

    if (!viewportWidth || !viewportHeight) {
      return;
    }

    const marginX = viewportWidth * MARGIN_RATIO;
    const marginY = viewportHeight * MARGIN_RATIO;
    const effectiveWidth = viewportWidth + marginX * 2;
    const effectiveHeight = viewportHeight + marginY * 2;

    const copiesPerIcon = computeCopiesPerIcon(effectiveWidth, effectiveHeight);
    const aspectRatio = viewportWidth / viewportHeight;
    const isPortraitLike = aspectRatio <= 1.1;

    const verticalPrefer = isPortraitLike ? 0.75 : 0.5;
    const verticalEdgeFraction = isPortraitLike ? 0.5 : 0.35;
    const verticalExponent = isPortraitLike ? 1.6 : 1.3;

    let horizontalPrefer;
    let horizontalEdgeFraction;
    let horizontalExponent;

    if (aspectRatio >= 1.6) {
      horizontalPrefer = 0.65;
      horizontalEdgeFraction = 0.4;
      horizontalExponent = 1.35;
    } else if (isPortraitLike) {
      horizontalPrefer = 0.7;
      horizontalEdgeFraction = 0.45;
      horizontalExponent = 1.4;
    } else {
      horizontalPrefer = 0.55;
      horizontalEdgeFraction = 0.35;
      horizontalExponent = 1.25;
    }

    const wallpaper = document.createElement('div');
    wallpaper.className = 'icon-wallpaper';
    wallpaper.setAttribute('aria-hidden', 'true');

    const fragment = document.createDocumentFragment();
    const placed = [];

    ICON_SOURCES.forEach((src) => {
      for (let i = 0; i < copiesPerIcon; i += 1) {
        let attempts = 0;
        let placedNode = null;

        while (attempts < MAX_ATTEMPTS && !placedNode) {
          attempts += 1;

          const size = randomRange(SIZE_RANGE[0], SIZE_RANGE[1]);
          const scale = randomRange(SCALE_RANGE[0], SCALE_RANGE[1]);
          const flip = Math.random() < 0.5 ? -1 : 1;
          const scaleX = scale * flip;
          const scaleY = scale;

          const iconWidthPx = size * Math.abs(scaleX);
          const iconHeightPx = size * scaleY;
          const halfWidth = iconWidthPx / 2;
          const halfHeight = iconHeightPx / 2;

          const minLeft = -marginX + halfWidth;
          const maxLeft = viewportWidth + marginX - halfWidth;
          const minTop = -marginY + halfHeight;
          const maxTop = viewportHeight + marginY - halfHeight;

          if (maxLeft <= minLeft || maxTop <= minTop) {
            continue;
          }

          const posX = sampleWithBias(minLeft, maxLeft, horizontalPrefer, horizontalEdgeFraction, horizontalExponent);
          const posY = sampleWithBias(minTop, maxTop, verticalPrefer, verticalEdgeFraction, verticalExponent);
          const rotate = randomRange(ROTATE_RANGE[0], ROTATE_RANGE[1]);
          const opacity = randomRange(OPACITY_RANGE[0], OPACITY_RANGE[1]);

          const overlaps = placed.some((entry) => {
            const dx = Math.abs(posX - entry.x);
            const dy = Math.abs(posY - entry.y);
            const maxX = halfWidth + entry.halfWidth + MIN_GAP_PX;
            const maxY = halfHeight + entry.halfHeight + MIN_GAP_PX;
            if (dx >= maxX || dy >= maxY) {
              return false;
            }
            return true;
          });

          if (overlaps) {
            continue;
          }

          const item = document.createElement('img');
          item.className = 'icon-wallpaper__item';
          item.src = src;
          item.alt = '';
          item.decoding = 'async';
          item.loading = 'lazy';

          item.style.setProperty('--icon-size', `${size}px`);
          item.style.setProperty('--icon-left', `${(posX / viewportWidth) * 100}%`);
          item.style.setProperty('--icon-top', `${(posY / viewportHeight) * 100}%`);
          item.style.setProperty('--icon-rotate', `${rotate}deg`);
          item.style.setProperty('--icon-scale-x', scaleX.toFixed(3));
          item.style.setProperty('--icon-scale-y', scaleY.toFixed(3));
          item.style.setProperty('--icon-opacity', opacity.toFixed(2));

          placed.push({
            x: posX,
            y: posY,
            halfWidth,
            halfHeight,
          });
          placedNode = item;
        }

        if (placedNode) {
          fragment.appendChild(placedNode);
        }
      }
    });

    wallpaper.appendChild(fragment);
    document.body.insertBefore(wallpaper, document.body.firstChild);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createWallpaper, { once: true });
  } else {
    createWallpaper();
  }

  let resizeRaf = null;
  window.addEventListener('resize', () => {
    if (resizeRaf !== null) {
      window.cancelAnimationFrame(resizeRaf);
    }
    resizeRaf = window.requestAnimationFrame(() => {
      resizeRaf = null;
      createWallpaper();
    });
  });
})();
