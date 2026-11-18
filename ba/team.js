/* ブルーアーカイブ 編成推薦 — 敵の装甲と地形から、持有學生で STRIKER 4＋SPECIAL 2 を組む
 * 依賴 index.html 的全域：data, owned, L, TE, esc, faceOf, bt, ar, lvText, ADAPT, ADAPT_COLOR, pushedHash
 */
const TEAM = (() => {
  const ARMORS = ['LightArmor','HeavyArmor','Unarmed','ElasticArmor','CompositeArmor','Normal'];
  const TI = {Street:0, Outdoor:1, Indoor:2};

  function eff(x, armor){ return ((TE[x.bullet] || {})[armor] ?? 10000) / 10000; }
  function adapt(x, terrain){
    const v = owned.stu[x.id] || 0;
    let a = x.ad[TI[terrain]];
    if (v >= 7 && x.wad && x.wad[0] === terrain) a += x.wad[1];   // 専用武器★2 で地形適性アップ
    return Math.min(5, a);
  }
  const EFF_PT = e => e >= 2 ? 8 : e >= 1.5 ? 4 : e >= 1 ? 0 : -6;

  // 一人ずつの評価
  function score(x, o){
    const v = owned.stu[x.id] || 0, e = eff(x, o.armor), a = adapt(x, o.terrain);
    let s = (v - 1) * 0.6, why = [];
    const st = x.squad === 'Main';
    if (x.role === 'DamageDealer' || x.role === 'Vehicle'){
      s += EFF_PT(e);
      if (st) s += (a - 2) * 1.5;
    } else if (x.role === 'Tanker'){
      s += (st ? (a - 2) * 1.2 : 0) + (e >= 1 ? 1 : 0);
    } else {
      s += (st ? (a - 2) * 0.8 : 0) + (e - 1) * 0.5;
    }
    if (e >= 2) why.push('有利');
    else if (e < 1) why.push('不利');
    return {x, s, e, a, why};
  }

  function build(o){
    const own = data.stu.filter(x => owned.stu[x.id]).map(x => score(x, o)).sort((a, b) => b.s - a.s);
    const main = own.filter(c => c.x.squad === 'Main'), sup = own.filter(c => c.x.squad === 'Support');
    const take = (list, used, pred, n) => { const r = []; for (const c of list){ if (r.length >= n) break; if (!used.has(c.x.id) && pred(c)){ r.push(c); used.add(c.x.id); } } return r; };
    const used = new Set();
    const isDps = c => c.x.role === 'DamageDealer' || c.x.role === 'Vehicle';
    const tank = take(main, used, c => c.x.role === 'Tanker', 1);
    const dps = take(main, used, c => isDps(c) && c.e >= 1, 2);
    if (dps.length < 2) dps.push(...take(main, used, isDps, 2 - dps.length));
    const flex = take(main, used, () => true, 4 - tank.length - dps.length);
    const heal = take(sup, used, c => c.x.role === 'Healer', 1);
    const sp = take(sup, used, () => true, 2 - heal.length);
    return {
      strikers: [...tank, ...dps, ...flex], specials: [...heal, ...sp],
      lists: {
        dps: main.filter(isDps).slice(0, 10), tank: main.filter(c => c.x.role === 'Tanker').slice(0, 6),
        mainSup: main.filter(c => c.x.role === 'Supporter' || c.x.role === 'Healer').slice(0, 8),
        spDps: sup.filter(isDps).slice(0, 8), spSup: sup.filter(c => !isDps(c)).slice(0, 10)
      },
      counts: {main: main.length, sup: sup.length}
    };
  }

  function mem(c, o){
    const x = c.x, v = owned.stu[x.id];
    const ec = c.e >= 2 ? 'tm-ok' : c.e < 1 ? 'tm-ng' : '';
    return `<div class="tm-mem" data-goto="stu-${x.id}"><img src="${faceOf(x)}" alt="">
      <span class="tm-tag t-${x.role === 'Tanker' ? 'own' : x.role === 'Healer' ? 'friend' : x.role === 'Supporter' ? 'sup' : 'dps'}">${esc(L.TacticRole[x.role] || x.role)} ${lvText(v)}</span>
      <div class="tm-nm">${esc(x.name)}</div>
      <div class="tm-nm">${bt(x.bullet)} <span class="${ec}">×${c.e}</span>${x.squad === 'Main' ? ` <span class="adp" style="color:${ADAPT_COLOR[c.a]}">${ADAPT[c.a]}</span>` : ''}</div></div>`;
  }

  function render(){
    const out = document.getElementById('teamOut'), info = document.getElementById('teamInfo');
    if (!Object.keys(owned.stu).length){ out.innerHTML = '<div class="msg">請先在「学生」分頁勾選持有的學生。</div>'; info.innerHTML = ''; return; }
    const o = {armor: document.getElementById('tmArmor').value, terrain: document.getElementById('tmTerrain').value};
    const r = build(o);
    info.innerHTML = `持有 STRIKER ${r.counts.main} 人、SPECIAL ${r.counts.sup} 人。<br>
      規則：STRIKER＝タンク 1＋攻擊屬性不吃虧的アタッカー 2＋剩下最高分 1；SPECIAL＝ヒーラー 1＋最高分 1。
      分數看攻擊屬性對${esc(L.ArmorType[o.armor])}的倍率（×2 大加分、×0.5 大扣分）、STRIKER 的${esc(L.AdaptationType[o.terrain])}適性（專武★2 的適性提升有算）、星級與專武。不計技能內容與相互配合。`;
    const sec = (title, list) => list.length ? `<div class="tm-sec">${title}</div><div class="tm-list">${list.map(c => mem(c, o)).join('')}</div>` : '';
    out.innerHTML = `<div class="tm-card" style="grid-column:1/-1">
        <div class="tm-head"><span class="tm-b ok">推薦編成</span> 敵：${ar(o.armor)}｜${esc(L.AdaptationType[o.terrain])}</div>
        <div class="tm-sec">STRIKER</div><div class="tm-mems">${r.strikers.map(c => mem(c, o)).join('') || '<span class="msg">沒有 STRIKER</span>'}</div>
        <div class="tm-sec">SPECIAL</div><div class="tm-mems">${r.specials.map(c => mem(c, o)).join('') || '<span class="msg">沒有 SPECIAL</span>'}</div>
      </div>
      <div class="tm-card" style="grid-column:1/-1"><div class="tm-head">替換候補（依分數排序）</div>
        ${sec('STRIKER アタッカー', r.lists.dps)}${sec('STRIKER タンク', r.lists.tank)}${sec('STRIKER サポーター／ヒーラー', r.lists.mainSup)}
        ${sec('SPECIAL アタッカー', r.lists.spDps)}${sec('SPECIAL サポーター／ヒーラー', r.lists.spSup)}</div>`;
  }

  function setup(){
    const sel = document.getElementById('tmArmor');
    const cur = sel.value;
    sel.innerHTML = ARMORS.map(a => `<option value="${a}">${esc((L.ArmorType || {})[a] || a)}</option>`).join('');
    if (cur) sel.value = cur;
  }
  function init(){
    document.getElementById('tmArmor').addEventListener('change', render);
    document.getElementById('tmTerrain').addEventListener('change', render);
    document.getElementById('teamOut').addEventListener('click', ev => {
      const g = ev.target.closest('[data-goto]');
      if (g){ pushedHash = true; location.hash = g.dataset.goto; }
    });
  }
  return {init, setup, render};
})();
