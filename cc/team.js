/* チェインクロニクル 簡易編成 — 5 人（総合＋所属別）
 * 依賴 index.html 的全域：data, owned, esc, faceHTML, rarStr, pushedHash
 * wiki 清單只有分類資料，所以只看稀有度、限界突破、登場時期（新角色通常較強）、職業平衡與所属。
 */
const TEAM = (() => {
  function score(x){
    const v = owned.arc[x.id] || 1;
    const rw = {5:5, 4:3, 3:1.5, 2:0.5, 1:0}[x.r] || 0;
    const y = x.date ? +x.date.slice(0, 4) : 2014;
    return rw + (v - 1) * 0.5 + Math.max(0, y - 2013) * 0.35;
  }
  function pick(list, needHeal){
    const sorted = list.slice().sort((a, b) => b.sc - a.sc);
    const team = [];
    if (needHeal){ const h = sorted.find(c => c.x.c === '僧侶'); if (h) team.push(h); }
    for (const c of sorted){ if (team.length >= 5) break; if (!team.includes(c)) team.push(c); }
    return {team, total: team.reduce((a, c) => a + c.sc, 0)};
  }
  function mem(c){
    const x = c.x, v = owned.arc[x.id];
    return `<div class="tm-mem" data-goto="arc-${x.id}"><div style="width:72px;height:96px;margin:0 auto;border-radius:8px;overflow:hidden">${faceHTML(x, 160)}</div>
      <span class="tm-tag t-own">${esc(x.c)} ${v - 1}凸</span><div class="tm-nm">${esc(x.n)}</div>
      <div class="tm-nm" style="color:var(--sub)">★${x.r}・${esc(x.w || '')}・${esc(x.fa || '')}</div></div>`;
  }
  function card(title, t){
    return `<div class="tm-card"><div class="tm-head">${title}</div><div class="tm-mems">${t.team.map(mem).join('')}</div></div>`;
  }
  function render(){
    const out = document.getElementById('teamOut'), info = document.getElementById('teamInfo');
    if (!Object.keys(owned.arc).length){ out.innerHTML = '<div class="msg">請先在「アルカナ」分頁勾選持有的角色。</div>'; info.innerHTML = ''; return; }
    const wp = document.getElementById('tmWp').value, heal = document.getElementById('tmHeal').checked;
    const all = data.list.filter(x => owned.arc[x.id] && (!wp || x.w === wp || x.c === '僧侶')).map(x => ({x, sc: score(x)}));
    const best = pick(all, heal);
    const groups = {};
    all.forEach(c => { if (c.x.fa) (groups[c.x.fa] = groups[c.x.fa] || []).push(c); });
    const fa = Object.entries(groups).filter(([, l]) => l.length >= 5).map(([k, l]) => ({k, t: pick(l, heal)})).sort((a, b) => b.t.total - a.t.total);
    const n = +document.getElementById('tmFa').value;
    info.innerHTML = `可用持有角色 ${all.length} 位。<br>
      wiki 清單只有分類資料，所以分數只看稀有度、限界突破、登場年份（越新通常越強）；勾「至少 1 位僧侶」會先放入分數最高的僧侶。
      不計技能、絆、武器與 LEADER ABILITY 的條件。所属編成列出同所属 5 人的組合，因為很多アビリティ會加成同所属。${wp ? `「武器限定」時僧侶不受限。` : ''}`;
    out.innerHTML = card('<span class="tm-b ok">總合</span> 分數最高的 5 人', best) +
      fa.slice(0, n).map(o => card(`<span class="tm-b mid">所属</span> ${esc(o.k)}`, o.t)).join('');
  }
  function init(){
    ['tmFa', 'tmWp', 'tmHeal'].forEach(id => document.getElementById(id).addEventListener('change', render));
    document.getElementById('teamOut').addEventListener('click', ev => {
      const g = ev.target.closest('[data-goto]');
      if (g){ pushedHash = true; location.hash = g.dataset.goto; }
    });
  }
  return {init, render};
})();
