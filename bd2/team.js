/* 棕色塵埃 2 簡易組隊：從持有服裝挑 5 位不同角色
 * 依賴 index.html 的全域：CH, L, owned, has, cimg, esc, ELS, ROLE, pushedHash
 */
const TEAM = (() => {
  const PRESET = {bal:{dps:3, sup:1, sus:1}, burst:{dps:4, sup:1, sus:0}, safe:{dps:2, sup:1, sus:2}};
  const SLOT = {dps:'輸出', sup:'輔助', sus:'坦／補'};
  const TAGC = {dps:'t-dps', sup:'t-friend', sus:'t-own'};
  function kind(x){
    const r = x.ro;
    if (r.includes('heal')) return 'sus';
    if (r.includes('shield') && !r.includes('atk')) return 'sus';
    if (!r.includes('atk') && (r.includes('buff') || r.includes('sp') || r.includes('debuff'))) return 'sup';
    return 'dps';
  }
  function score(x, el, ty){
    let s = {5:10, 4:7, 3:5}[x.c.st] || 5;
    s += owned[x.id] * 1.5;
    if (x.ro.includes('debuff')) s += 1;
    if (x.ro.includes('sp')) s += 1;
    if (el && x.c.el === el) s += 6;
    if (ty && kind(x) === 'dps' && x.c.t === ty) s += 4;
    return s;
  }
  function pick(){
    const P = PRESET[document.getElementById('tmPreset').value], el = document.getElementById('tmEl').value, ty = document.getElementById('tmTy').value;
    const own = L.filter(x => has(x.id)).map(x => ({x, k:kind(x), sc:score(x, el, ty)})).sort((a, b) => b.sc - a.sc);
    const usedC = new Set(), team = [];
    const take = (k, n) => { for (const u of own){ if (n <= 0) break; if (usedC.has(u.x.c.id) || (k && u.k !== k)) continue; team.push(u); usedC.add(u.x.c.id); n--; } };
    take('sus', P.sus); take('sup', P.sup); take('dps', P.dps);
    take(null, 5 - team.length);   // 不足的職責用其他角色補
    return {team, own};
  }
  function mem(u){
    const x = u.x;
    return `<div class="tm-mem" data-goto="c-${x.id}"><img src="${cimg(x.id)}" alt=""><span class="tm-tag ${TAGC[u.k]}">${SLOT[u.k]}</span> <span class="el el-${x.c.el}">${x.c.el}</span>
      <div class="tm-nm"><b>${esc(x.c.n)}</b> +${owned[x.id]}<br>${esc(x.n)}</div></div>`;
  }
  function render(){
    const out = document.getElementById('teamOut'), info = document.getElementById('teamInfo');
    const {team, own} = pick();
    if (team.length < 3){ out.innerHTML = '<div class="msg">請先在「服裝」分頁勾選持有的服裝（至少 3 位不同角色）。</div>'; info.innerHTML = ''; return; }
    const cnt = k => new Set(own.filter(u => u.k === k).map(u => u.x.c.id)).size;
    info.innerHTML = `持有角色：輸出 ${cnt('dps')}・輔助 ${cnt('sup')}・坦／補 ${cnt('sus')}（同角色多件服裝分別計算職責）。<br>
      職責依技能效果自動判斷：有治療或純護盾＝坦／補；無傷害但有增益／減益／SP＝輔助；其餘＝輸出。
      分數＝星級（5★10・4★7・3★5）＋強化 ×1.5＋減益／SP 各 +1，指定屬性 +6、指定攻擊類型的輸出 +4；同角色只上一件服裝。
      實際隊伍請依關卡、站位與爆發搭配調整，僅供參考。`;
    const sp = team.reduce((a, u) => a + (+u.x.lv[owned[u.x.id]]?.SP || 0), 0);
    const els = ELS.map(e => [e, team.filter(u => u.x.c.el === e).length]).filter(a => a[1]).map(a => a[0] + a[1]).join('・');
    let h = `<div class="tm-card main"><div class="tm-head"><span class="tm-b ok">推薦隊伍</span><small style="color:var(--sub)">${team.length} 人｜總分 ${team.reduce((a, u) => a + u.sc, 0).toFixed(0)}｜技能 SP 合計 ${sp}｜${els}</small></div>
      <div class="tm-mems">${team.map(mem).join('')}</div>
      <table class="tm-w"><tr><th>角色</th><th>技能</th><th>SP/CD</th><th>目標</th><th>效果</th></tr>
      ${team.map(u => { const lv = u.x.lv[owned[u.x.id]] || {}; return `<tr><td>${esc(u.x.c.n)}</td><td>${esc(u.x.sn)}</td><td>${esc(lv.SP)}/${esc(lv.CD)}</td><td>${esc(u.x.tg)}</td><td class="tm-plan">${u.x.ro.map(r => ROLE[r]).join('・')}</td></tr>`; }).join('')}</table></div>`;
    const ids = new Set(team.map(u => u.x.c.id));
    for (const k of ['dps', 'sup', 'sus']){
      const seen = new Set(), rest = own.filter(u => u.k === k && !ids.has(u.x.c.id) && !seen.has(u.x.c.id) && seen.add(u.x.c.id)).slice(0, 10);
      if (rest.length) h += `<div class="tm-card"><div class="tm-head"><span class="tm-b mid">候補・${SLOT[k]}</span></div><div class="tm-mems">${rest.map(mem).join('')}</div></div>`;
    }
    out.innerHTML = h;
  }
  function init(){
    document.getElementById('tmEl').innerHTML += ELS.map(e => `<option value="${e}">${e}</option>`).join('');
    ['tmPreset', 'tmEl', 'tmTy'].forEach(id => document.getElementById(id).addEventListener('change', render));
    document.getElementById('teamOut').addEventListener('click', ev => {
      const g = ev.target.closest('[data-goto]');
      if (g){ pushedHash = true; location.hash = g.dataset.goto; }
    });
  }
  return {init, render};
})();
