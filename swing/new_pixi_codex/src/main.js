// 안전 저장 브릿지 초기화 후 Pixi 앱 시작
(async function init() {
  try {
    if (window.setupStorageBridge) {
      await window.setupStorageBridge('webswing');
    }
  } catch (e) {
    console.warn('Storage bridge init failed:', e);
  }

  // 폰트 로드 대기 (GameFont/Press Start 2P/Dalmoori)
  async function waitForFonts() {
    if (!document.fonts || !document.fonts.load) return;
    const samples = [
      '16px "GameFont"',
      '16px "Press Start 2P"',
      '16px "Dalmoori"',
    ];
    try {
      await Promise.all(samples.map(s => document.fonts.load(s)));
    } catch (_) {}
  }
  await waitForFonts();

  // Pixi Application 생성
  const app = new PIXI.Application({
    width: CONFIG.width,
    height: CONFIG.height,
    backgroundColor: CONFIG.backgroundColor,
    antialias: true,
    resolution: Math.min(2, window.devicePixelRatio || 1),
    autoDensity: true,
  });
  document.getElementById('game-root').appendChild(app.view);

  // 크기 맞춤(보이는 뷰포트에 맞춰 letterbox)
  function fit() {
    const parent = app.view.parentElement;
    const ratio = CONFIG.width / CONFIG.height;
    let w = parent.clientWidth, h = parent.clientHeight;
    if (w / h > ratio) w = h * ratio; else h = w / ratio;
    app.renderer.resize(w, h);
    app.stage.scale.set(w / CONFIG.width, h / CONFIG.height);
  }
  window.addEventListener('resize', fit); fit();

  // GameData + GameApp 초기화
  const data = new GameData();
  const game = new GameApp(app, data);

  // 로딩 가리기
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'none';
})();
