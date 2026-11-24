/* FEH 簡易組隊：從持有英雄挑 4 人
 * 依賴 index.html 的全域：L, owned, calc, fc, esc, COLOR, MV, PR, STAT, pushedHash
 */
const TEAM = (() => {
  const SPECIAL = {legendary:4, mythic:4, duo:3, harmonized:3, rearmed:3, attuned:2, ascended:2, emblem:3, chosen:4};
  function score(u){
    const v = owned[u.i], s = calc(u, v), b = s.reduce((p, n) => p + n, 0);
    const yr = Math.max(0, +u.rd.slice(0, 4) - 2017);
    let sc = b + yr * 4 + u.pr.reduce((p, k) => p + (SPECIAL[k] || 0), 0);
    return {u, s, b, sc, yr};
  }
  function pick(){
    const mode = document.getElementById('tmMode').value, mv = document.getElementById('tmMv').value, needRef = document.getElementById('tmRef').checked;
    const own = L.filter(u => owned[u.i] && (!mv || u.mv === mv)).map(score).sort((a, b) => b.sc - a.sc);
    const team = [], person = new Set(), used = new Set();
    const ok = x => !used.has(x.u.i) && !person.has(x.u.p);
    const add = x => { team.push(x); used.add(x.u.i); person.add(x.u.p); };
    if (needRef){ const r = own.find(x => x.u.ref && ok(x)); if (r) add(r); }
    if (mode === 'color'){
      for (const c of Object.values(COLOR)){
        if (team.some(x => x.u.c === c)) continue;
        const x = own.find(y => y.u.c === c && ok(y)); if (x) add(x);
      }
    }
    for (const x of own){ if (team.length >= 4) break; if (ok(x)) add(x); }
    return {team, own};
  }
  function mem(x){
    const u = x.u, v = owned[u.i];
    return `<div class="tm-mem" data-goto="h-${u.i}"><img src="${fc(u)}" alt=""><span class="wc c-${u.c}" style="position:static">${u.c}${u.wk}</span> <span class="tm-tag t-own">+${v[0]}</span>
      <div class="tm-nm"><b>${esc(u.n)}</b><br>${esc(u.t)}</div></div>`;
  }
  function render(){
    const out = document.getElementById('teamOut'), info = document.getElementById('teamInfo');
    const {team, own} = pick();
    if (team.length < 2){ out.innerHTML = '<div class="msg">請先在「英雄」分頁勾選持有的英雄（至少 2 位，兵種限定時需該兵種）。</div>'; info.innerHTML = ''; return; }
    info.innerHTML = `符合條件的持有英雄 ${own.length} 位：${Object.values(COLOR).map(c => c + ' ' + own.filter(x => x.u.c === c).length).join('・')}。<br>
      分數＝Lv40 能力總和（含凸、神龍之花、資質）＋實裝年份 ×4（新英雄技能較強）＋傳承／神階／神選 +4、比翼／雙界／魔器／紋章士 +3、響心／開花 +2；同一角色只選一個版本。
      不考慮技能繼承與聖印，實際隊伍請依地圖與敵人調整，僅供參考。`;
    let h = `<div class="tm-card main"><div class="tm-head"><span class="tm-b ok">推薦隊伍</span><small style="color:var(--sub)">${team.length} 人｜總分 ${team.reduce((a, x) => a + x.sc, 0)}</small></div>
      <div class="tm-mems">${team.map(mem).join('')}</div>
      <table class="tm-w"><tr><th>英雄</th><th>兵種</th>${STAT.map(s => `<th>${s}</th>`).join('')}<th>總和</th><th>分數</th></tr>
      ${team.map(x => `<tr><td>${esc(x.u.n)}</td><td>${MV[x.u.mv]}</td>${x.s.map(n => `<td>${n}</td>`).join('')}<td>${x.b}</td><td class="tm-plan">${x.sc}${x.u.pr.filter(k => SPECIAL[k]).map(k => '・' + PR[k]).join('')}</td></tr>`).join('')}</table></div>`;
    const ids = new Set(team.map(x => x.u.i));
    for (const c of Object.values(COLOR)){
      const seen = new Set(), rest = own.filter(x => x.u.c === c && !ids.has(x.u.i) && !seen.has(x.u.p) && seen.add(x.u.p)).slice(0, 8);
      if (rest.length) h += `<div class="tm-card"><div class="tm-head"><span class="tm-b mid">候補・${c}</span></div><div class="tm-mems">${rest.map(mem).join('')}</div></div>`;
    }
    out.innerHTML = h;
  }
  function init(){
    ['tmMode', 'tmMv', 'tmRef'].forEach(id => document.getElementById(id).addEventListener('change', render));
    document.getElementById('teamOut').addEventListener('click', ev => {
      const g = ev.target.closest('[data-goto]');
      if (g){ pushedHash = true; location.hash = g.dataset.goto; }
    });
  }
  return {init, render};
})();
