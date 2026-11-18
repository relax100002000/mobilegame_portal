/* FLOWER KNIGHT GIRL 簡易編隊 — 5 人（總合＋各國家）
 * 依賴 index.html 的全域：data, owned, TYPE, NATION, STAGE, esc, iconUrl, pushedHash
 * 分數＝持有階段的最大 Lv 能力值（含好感度 MAX 加成）＋稀有度＋屬性符合敵弱點。不計スキル與アビリティ。
 */
const TEAM = (() => {
  function power(x){
    const v = owned.k[x.id] || 1, s = x.st[v] || x.st[1];
    const base = s[1] || [0, 0, 0], a1 = s[2] || [0, 0, 0], a2 = s[3] || [0, 0, 0];
    const hp = base[0] + a1[0] + a2[0], atk = base[1] + a1[1] + a2[1], def = base[2] + a1[2] + a2[2];
    return {hp, atk, def, p: (atk + hp / 5 + def / 2) / 1000};
  }
  function score(x, weak){
    const pw = power(x);
    return {x, pw, match: weak && x.t === weak, sc: pw.p + (x.r === 6 ? 1 : 0) + (weak && x.t === weak ? 3 : 0)};
  }
  function mem(c){
    const x = c.x, v = owned.k[x.id];
    return `<div class="tm-mem" data-goto="k-${x.id}"><img src="${iconUrl(x, v)}" onerror="if(!this.dataset.f){this.dataset.f=1;this.src='${iconUrl(x, 1)}'}" alt="">
      <span class="tm-tag t-${c.match ? 'own' : 'dps'}">★${x.r} ${STAGE[v]}</span><div class="tm-nm">${esc(x.name)}</div>
      <div class="tm-nm"><span class="ty ty${x.t}">${TYPE[x.t] || '?'}</span> 攻 ${c.pw.atk.toLocaleString()}</div></div>`;
  }
  function card(title, list){
    const tot = list.reduce((a, c) => a + c.pw.atk, 0);
    return `<div class="tm-card"><div class="tm-head">${title}<small style="color:var(--sub)">　攻撃合計 ${tot.toLocaleString()}</small></div><div class="tm-mems">${list.map(mem).join('')}</div></div>`;
  }
  function render(){
    const out = document.getElementById('teamOut'), info = document.getElementById('teamInfo');
    const own = data.list.filter(x => owned.k[x.id] && !x.sp);
    if (!own.length){ out.innerHTML = '<div class="msg">請先在「花騎士」分頁勾選持有的角色。</div>'; info.innerHTML = ''; return; }
    const weak = +document.getElementById('tmType').value || 0;
    const all = own.map(x => score(x, weak)).sort((a, b) => b.sc - a.sc);
    info.innerHTML = `持有 ${own.length} 位（不含 4コマ劇場・衣裝等特別版）。<br>
      分數＝目前成長階段的最大 Lv 能力值（含好感度 MAX 加成，攻撃為主、HP 與防御為輔）＋★6 加分${weak ? `＋屬性為「${TYPE[weak]}」加分` : ''}。
      不計スキル、アビリティ、裝備；國家編隊列出同國 5 人，因為不少アビリティ以同國為條件。`;
    let h = card('<span class="tm-b ok">總合</span>', all.slice(0, 5));
    if (+document.getElementById('tmNat').value){
      const g = {};
      all.forEach(c => (g[c.x.n] = g[c.x.n] || []).push(c));
      Object.entries(g).filter(([, l]) => l.length >= 5).map(([n, l]) => ({n, l: l.slice(0, 5)}))
        .sort((a, b) => b.l.reduce((s, c) => s + c.sc, 0) - a.l.reduce((s, c) => s + c.sc, 0))
        .forEach(o => h += card(`<span class="tm-b mid">國家</span> ${esc(NATION[o.n] || '')}`, o.l));
    }
    out.innerHTML = h;
  }
  function init(){
    ['tmType', 'tmNat'].forEach(id => document.getElementById(id).addEventListener('change', render));
    document.getElementById('teamOut').addEventListener('click', ev => {
      const g = ev.target.closest('[data-goto]');
      if (g){ pushedHash = true; location.hash = g.dataset.goto; }
    });
  }
  return {init, render};
})();
