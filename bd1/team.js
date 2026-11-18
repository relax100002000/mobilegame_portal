/* 棕色塵埃 1 簡易布陣：依類型配置 5／6 人，排在 3×3 格（右為前排）
 * 依賴 index.html 的全域：L, owned, curStg, stgLab, TAB, CLS, icon, esc, pushedHash
 */
const TEAM = (() => {
  const PRESET = {bal:{CT_DEFENSE:1, AM:3, CT_SUPPORT:1}, atk:{CT_DEFENSE:1, AM:4, CT_SUPPORT:0}, def:{CT_DEFENSE:2, AM:2, CT_SUPPORT:1}, sup:{CT_DEFENSE:1, AM:2, CT_SUPPORT:2}};
  function score(x){
    const v = owned[x.h], s = x.stg[v[0]];
    return (s.bv || s.s * 8) + v[1] * 0.6 + (x.t <= 2 ? 3 : 0);
  }
  function pick(){
    const n = +document.getElementById('tmN').value, P = {...PRESET[document.getElementById('tmPreset').value]};
    if (n === 6) P.AM += 1;
    const own = L.filter(x => owned[x.h] && x.c !== 'CT_RECOVERY').map(x => ({x, sc:score(x)})).sort((a, b) => b.sc - a.sc);
    const used = new Set(), base = new Set(), team = [];
    const baseName = u => u.x.nk.replace(/^.*\s/, '');
    const take = (filter, k) => { for (const u of own){ if (k <= 0) break; if (used.has(u.x.h) || base.has(baseName(u)) || !filter(u.x)) continue; team.push(u); used.add(u.x.h); base.add(baseName(u)); k--; } };
    take(x => x.c === 'CT_DEFENSE', P.CT_DEFENSE);
    take(x => x.c === 'CT_ATTACK' || x.c === 'CT_MAGIC', P.AM);
    take(x => x.c === 'CT_SUPPORT', P.CT_SUPPORT);
    take(() => true, n - team.length);   // 不足的類型用其他人補
    return {team, own};
  }
  function place(team){
    // 3×3：col 0＝後排（左）、1＝中排、2＝前排（右，面向敵人）
    const cells = Array(9).fill(null);
    const col = u => u.x.c === 'CT_DEFENSE' ? 2 : u.x.c === 'CT_ATTACK' ? 1 : 0;
    const order = [1, 0, 2];   // 先放中列，再上、下
    const sorted = team.slice().sort((a, b) => col(b) - col(a) || b.sc - a.sc);
    for (const u of sorted){
      let c = col(u), placed = false;
      for (const tryC of [c, c === 2 ? 1 : c === 0 ? 1 : 2, c === 1 ? 0 : c === 2 ? 0 : 2]){
        for (const r of order){ const i = r * 3 + tryC; if (!cells[i]){ cells[i] = u; placed = true; break; } }
        if (placed) break;
      }
    }
    return cells;
  }
  function mem(u){
    const x = u.x, v = owned[x.h], s = x.stg[v[0]];
    return `<div class="tm-mem" data-goto="m-${x.h}"><img src="${icon(s.icon)}" alt=""><span class="tm-tag t-own">${stgLab(s)} +${v[1]}</span><div class="tm-nm">${esc(s.fn)}</div></div>`;
  }
  function render(){
    const out = document.getElementById('teamOut'), info = document.getElementById('teamInfo');
    const {team, own} = pick();
    if (team.length < 3){ out.innerHTML = '<div class="msg">請先在「傭兵」分頁勾選持有的傭兵（至少 3 位）。</div>'; info.innerHTML = ''; return; }
    const cnt = c => own.filter(u => u.x.c === c).length;
    info.innerHTML = `持有：攻擊 ${cnt('CT_ATTACK')}・防禦 ${cnt('CT_DEFENSE')}・魔法 ${cnt('CT_MAGIC')}・支援 ${cnt('CT_SUPPORT')}。<br>
      分數＝目前階段的戰鬥力（遊戲內數值）＋強化 ×0.6＋神話／超越／傳說 +3；依陣型挑出各類型最高分，同名傭兵（不同版本）只選一位。
      位置：防禦型前排、攻擊型中排、魔法／支援型後排，同排先放中間格。實際配置請依技能範圍與對手調整，僅供參考。`;
    const cells = place(team);
    let h = `<div class="tm-card"><div class="tm-head"><span class="tm-b ok">推薦布陣</span><small style="color:var(--sub)">${team.length} 人｜總分 ${team.reduce((a, u) => a + u.sc, 0).toFixed(0)}</small></div>
      <div class="gridlab"><div>後排</div><div>中排</div><div>前排 → 敵方</div></div>
      <div class="grid9">${cells.map(u => `<div class="cell">${u ? mem(u) : ''}</div>`).join('')}</div></div>`;
    const rest = own.filter(u => !team.includes(u)).slice(0, 12);
    if (rest.length) h += `<div class="tm-card"><div class="tm-head"><span class="tm-b mid">候補（分數高→低）</span></div><div class="tm-mems" style="flex-wrap:wrap">${rest.map(mem).join('')}</div></div>`;
    out.innerHTML = h;
  }
  function init(){
    ['tmPreset', 'tmN'].forEach(id => document.getElementById(id).addEventListener('change', render));
    document.getElementById('teamOut').addEventListener('click', ev => {
      const g = ev.target.closest('[data-goto]');
      if (g){ pushedHash = true; location.hash = g.dataset.goto; }
    });
  }
  return {init, render};
})();
