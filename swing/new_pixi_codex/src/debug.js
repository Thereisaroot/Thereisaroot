// 간단 튜닝 패널 (DOM) - V 키 토글
(function(){
  const KEY = 'webswing_tuning_v1';
  const defaults = { jumpImpulse: CONFIG.jumpImpulse, catchR: CONFIG.catchBase, Dmin: CONFIG.Dmin, Dmax: CONFIG.Dmax };
  let state = { ...defaults };
  try { const raw = localStorage.getItem(KEY); if (raw) state = { ...state, ...JSON.parse(raw) }; } catch(_){ }
  apply();

  const root = document.createElement('div');
  root.id = 'dbg';
  root.style.cssText = 'position:fixed;right:8px;top:8px;background:#111a;backdrop-filter:blur(4px);padding:8px;border-radius:8px;color:#fff;font-family:GameFont,\"Press Start 2P\",\"Dalmoori\",sans-serif;font-size:12px;display:none;z-index:1000;';
  root.innerHTML = `
    <div style="margin-bottom:4px">Tuning (V)</div>
    <label>Jump <input id="dbg-j" type="range" min="300" max="1000" step="1"></label><br>
    <label>CatchR <input id="dbg-c" type="range" min="8" max="80" step="1"></label><br>
    <label>Dmin <input id="dbg-dmin" type="range" min="60" max="300" step="1"></label><br>
    <label>Dmax <input id="dbg-dmax" type="range" min="100" max="420" step="1"></label>
  `;
  document.body.appendChild(root);
  const $ = (id)=>root.querySelector(id);
  $('#dbg-j').value = String(state.jumpImpulse);
  $('#dbg-c').value = String(state.catchR);
  $('#dbg-dmin').value = String(state.Dmin);
  $('#dbg-dmax').value = String(state.Dmax);
  root.addEventListener('input', ()=>{
    state.jumpImpulse = Number($('#dbg-j').value)||defaults.jumpImpulse;
    state.catchR = Number($('#dbg-c').value)||defaults.catchR;
    state.Dmin = Number($('#dbg-dmin').value)||defaults.Dmin;
    state.Dmax = Number($('#dbg-dmax').value)||defaults.Dmax;
    save(); apply();
  });

  function save(){ try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(_){} }
  function apply(){
    CONFIG.jumpImpulse = state.jumpImpulse;
    CONFIG.catchBase = state.catchR;
    CONFIG.Dmin = state.Dmin;
    CONFIG.Dmax = state.Dmax;
  }

  window.addEventListener('keydown', (e)=>{
    if (e.code === 'KeyV') { root.style.display = (root.style.display==='none')?'block':'none'; }
  });
})();

