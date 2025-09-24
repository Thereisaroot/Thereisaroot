(function (global) {
  // Optional global override example (define before this script loads):
  //   window.WEBSWING_AD_UNITS_BY_PLATFORM = {
  //     android: { wizard: 'ca-app-pub-xxxx/...', cash20: 'ca-app-pub-xxxx/...' },
  //     ios:     { wizard: '...', cash20: '...' },
  //   };
  const platform = (() => {
    try {
      const cap = global.Capacitor || {};
      if (typeof cap.getPlatform === 'function') return cap.getPlatform();
      return cap.platform || 'web';
    } catch (_) {
      return 'web';
    }
  })();

  const defaults = {
    wizard: null,
    cash20: null,
  };

  const perPlatform = (global.WEBSWING_AD_UNITS_BY_PLATFORM && global.WEBSWING_AD_UNITS_BY_PLATFORM[platform]) || {};
  const existing = global.WEBSWING_AD_UNITS || {};

  global.WEBSWING_AD_UNITS = { ...defaults, ...perPlatform, ...existing };
})(typeof window !== 'undefined' ? window : globalThis);
