/* アズールレーン 簡易編成 — 前衛 3＋主力 3（潜水艦除外）
 * 依賴 index.html 的全域：data, owned, O, esc, faceOf, typeName, natName, NAT, RAR, rarName, pushedHash
 */
const TEAM = (() => {
  // s = Lv.100 完全突破能力值：[耐久,火力,雷装,対空,航空,装填,-,命中,回避,速力,幸運,対潜]
  function power(x){
    const s = x.s, team = (data.types[x.t] || {}).team;
    return team === 'vanguard'
      ? s[1] + s[2] + s[3] * 0.5 + s[0] / 20 + s[8] * 0.5
      : s[1] + s[4] + s[3] * 0.5 + s[0] / 25;
  }
  function score(x){
    const v = O(x.id);
    const rw = {2:0, 3:0.5, 4:1, 5:2, 6:3}[x.r] || 0;
    return power(x) / 100 + rw + v.b * 0.8 + (v.r ? 1.5 : 0) + (v.o ? 0.3 : 0);
  }
  function pool(){
    const full = document.getElementById('tmFullOnly').checked;
    return data.ship.filter(x => { const v = O(x.id); return v && (!full || v.b === 3); })
      .map(x => ({x, team:(data.types[x.t] || {}).team, sc:score(x)}))
      .filter(c => c.team === 'vanguard' || c.team === 'main')
      .sort((a, b) => b.sc - a.sc);
  }
  function pick(list){
    const van = list.filter(c => c.team === 'vanguard').slice(0, 3), main = list.filter(c => c.team === 'main').slice(0, 3);
    return {van, main, total: [...van, ...main].reduce((a, c) => a + c.sc, 0)};
  }
  function mem(c){
    const x = c.x, v = O(x.id);
    return `<div class="tm-mem" data-goto="ship-${x.id}"><img src="${faceOf(x, v.r)}" alt="" onerror="this.style.visibility='hidden'">
      <span class="tm-tag t-${c.team === 'vanguard' ? 'own' : 'dps'}">${esc(typeName(x.t))} ${v.b === 3 ? '完突' : '★' + v.b}${v.r ? '・改' : ''}</span>
      <div class="tm-nm">${esc(x.name)}</div><div class="tm-nm" style="color:var(--sub)">${rarName(x)}・${esc(natName(x.n))}</div></div>`;
  }
  function card(title, t, note){
    return `<div class="tm-card"><div class="tm-head">${title}</div>
      <div class="tm-sec">前衛</div><div class="tm-mems">${t.van.map(mem).join('') || '<span style="color:var(--sub);font-size:13px">沒有前衛</span>'}</div>
      <div class="tm-sec">主力</div><div class="tm-mems">${t.main.map(mem).join('') || '<span style="color:var(--sub);font-size:13px">沒有主力</span>'}</div>
      ${note ? `<div class="reason" style="font-size:12px;color:var(--sub);margin-top:6px">${note}</div>` : ''}</div>`;
  }
  function render(){
    const out = document.getElementById('teamOut'), info = document.getElementById('teamInfo');
    if (!Object.keys(owned.ship).length){ out.innerHTML = '<div class="msg">請先在「艦船」分頁勾選持有的艦船。</div>'; info.innerHTML = ''; return; }
    const all = pool();
    const best = pick(all);
    // 陣營編成：同陣營技能常互相加成，所以另外列出各陣營的最佳 3＋3
    const groups = {};
    all.forEach(c => { const k = NAT[c.x.n] ? c.x.n : null; if (k != null && k !== 98) (groups[k] = groups[k] || []).push(c); });
    const natTeams = Object.entries(groups).map(([n, l]) => ({n:+n, t:pick(l)}))
      .filter(o => o.t.van.length >= 2 && o.t.main.length >= 2).sort((a, b) => b.t.total - a.t.total);
    const showN = +document.getElementById('tmNat').value;
    info.innerHTML = `可編成的持有艦 ${all.length} 艘（不含潛艇）。<br>
      分數＝Lv.100 完全突破能力值（前衛看火力＋雷装＋對空＋耐久＋迴避，主力看火力＋航空＋對空＋耐久）＋稀有度＋突破＋改造＋誓約。
      不計技能、裝備與艦種間的配合；陣營編成是因為同陣營技能常互相加成，列出來給你參考。`;
    out.innerHTML = card('<span class="tm-b ok">總合</span> 分數最高的 3＋3', best) +
      natTeams.slice(0, showN).map(o => card(`<span class="tm-b mid">陣營</span> ${esc(NAT[o.n])}`, o.t)).join('');
  }
  function init(){
    document.getElementById('tmNat').addEventListener('change', render);
    document.getElementById('tmFullOnly').addEventListener('change', render);
    document.getElementById('teamOut').addEventListener('click', ev => {
      const g = ev.target.closest('[data-goto]');
      if (g){ pushedHash = true; location.hash = g.dataset.goto; }
    });
  }
  return {init, render};
})();
