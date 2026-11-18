/* 学マス：サポカ編成（6 枚，可借 1 張完凸 SSR）＋ コンテスト編成（3 人）
 * 依賴 index.html 的全域：data, owned, PLAN, STYPE, STYPE_S, EXAM, POT, LB, esc, idolImg, supImg, imgTag, ensureFeat, pushedHash
 */
const TEAM = (() => {
  const TI = {vo:0, da:1, vi:2};
  const TYPE_MUL = [1, 1, 0.9, 0.6, 0.4, 0.3];
  const RB = {SSR:4, SR:2, R:0};

  /* ---- サポカ編成 ---- */
  function typeWeight(idol){
    const order = [0, 1, 2].sort((a, b) => idol.gr[b] - idol.gr[a]);
    const w = {as:0.8}; ['vo', 'da', 'vi'].forEach(t => w[t] = [1, 0.85, 0.45][order.indexOf(TI[t])]);
    return w;
  }
  function cardScore(s, lb, idol, feat, w){
    let v = RB[s.r] + (feat[s.id] ? feat[s.id][lb] : 0) + lb * 0.5;
    v *= w[s.type];
    if (s.plan && s.plan === idol.plan) v += 1.5;
    else if (s.plan && s.plan !== idol.plan) v *= 0.3;
    return v;
  }
  function pick(pool, n, fixed){
    const deck = fixed ? [fixed] : [], cnt = {};
    deck.forEach(p => cnt[p.s.type] = (cnt[p.s.type] || 0) + 1);
    let total = deck.reduce((a, p) => a + p.v, 0);
    while (deck.length < n){
      let best = null, bv = -1;
      for (const p of pool){
        if (deck.some(d => d.s.id === p.s.id)) continue;
        const val = p.v * TYPE_MUL[Math.min(cnt[p.s.type] || 0, 5)];
        if (val > bv){ bv = val; best = p; }
      }
      if (!best) break;
      deck.push(best); cnt[best.s.type] = (cnt[best.s.type] || 0) + 1; total += bv;
    }
    return {deck, total};
  }
  async function renderDeck(){
    const out = document.getElementById('teamOut'), info = document.getElementById('deckInfo');
    const idol = data.idols.find(x => x.id === document.getElementById('dkIdol').value);
    if (!idol){ out.innerHTML = '<div class="msg">請先在「Pアイドル」分頁勾選持有的Pアイドル。</div>'; info.innerHTML = ''; return; }
    const mine = data.sups.filter(s => owned.s[s.id]);
    const rent = document.getElementById('dkRent').value === '1';
    if (mine.length < (rent ? 5 : 6)){ out.innerHTML = `<div class="msg">持有的サポカ不足（目前 ${mine.length} 張），請先在「サポートカード」分頁勾選。</div>`; info.innerHTML = ''; return; }
    out.innerHTML = '<div class="msg">讀取サポートスキル資料中（第一次約 11MB，之後會快取估分）…</div>';
    let feat;
    try{ feat = await ensureFeat(); }catch(err){ out.innerHTML = `<div class="msg">スキル資料讀取失敗：${esc(err.message)}</div>`; return; }
    const w = typeWeight(idol);
    const pool = mine.map(s => ({s, lb:owned.s[s.id] - 1, v:cardScore(s, owned.s[s.id] - 1, idol, feat, w)}));
    let best = pick(pool, 6, null), rental = null;
    if (rent){
      const cands = data.sups.filter(s => s.r === 'SSR').map(s => ({s, lb:4, rent:true, v:cardScore(s, 4, idol, feat, w)})).sort((a, b) => b.v - a.v).slice(0, 40);
      best = null;
      for (const c of cands){
        const r = pick(pool.filter(p => p.s.id !== c.s.id), 6, c);
        if (!best || r.total > best.total){ best = r; rental = c; }
      }
    }
    const order = [0, 1, 2].sort((a, b) => idol.gr[b] - idol.gr[a]).map(i => ['Vo', 'Da', 'Vi'][i]);
    info.innerHTML = `Pアイドル：<b>${esc(idol.cname)}［${esc(idol.title)}］</b>｜<span class="pl pl-${idol.plan}">${PLAN[idol.plan]}</span>｜成長率 ${order.join(' > ')}｜持有サポカ ${mine.length} 張。<br>
      估分＝稀有度＋目前凸數最大 Lv 的サポートスキル（SPレッスン発生率、パラメータ上昇、イベント強化等，從技能文字估算）×タイプ權重（成長率第 1／2／3 高＝1／0.85／0.45，アシスト 0.8）；
      同プラン ＋1.5、不同プラン ×0.3；同タイプ第 3 張起遞減。${rent ? '借用卡以完凸 SSR 計算。' : ''}僅供參考，不考慮スキルカード構成與シナリオ。`;
    const mem = p => `<div class="tm-mem sup${p.rent ? ' rent' : ''}" data-goto="s/${p.s.id}">${imgTag(supImg(p.s), p.s.name)}
      <span class="tm-tag t-${p.rent ? 'friend' : 'own'}">${p.rent ? 'レンタル' : p.s.r} ${LB[p.lb]}</span>
      <div class="tm-nm"><span class="ty ty-${p.s.type}">${STYPE_S[p.s.type]}</span>${p.s.plan ? `<span class="pl pl-${p.s.plan}">${PLAN[p.s.plan].slice(0, 2)}</span>` : ''} ${esc(p.s.name)}</div><div class="tm-nm" style="color:var(--sub)">估分 ${p.v.toFixed(1)}</div></div>`;
    const deck = best.deck.slice().sort((a, b) => (a.rent ? 1 : 0) - (b.rent ? 1 : 0) || ['vo', 'da', 'vi', 'as'].indexOf(a.s.type) - ['vo', 'da', 'vi', 'as'].indexOf(b.s.type));
    const cnt = {}; deck.forEach(p => cnt[p.s.type] = (cnt[p.s.type] || 0) + 1);
    const idolMem = `<div class="tm-mem" data-goto="i/${idol.id}">${imgTag(idolImg(idol), idol.title)}<span class="tm-tag t-dps">${POT[(owned.i[idol.id] || 1) - 1]}</span><div class="tm-nm">${esc(idol.cname)}</div><div class="tm-nm" style="color:var(--sub)">${esc(idol.title)}</div></div>`;
    let h = `<div class="tm-card"><div class="tm-head"><span class="tm-b ok">推薦編成</span><small style="color:var(--sub)">${Object.entries(cnt).map(([t, n]) => STYPE_S[t] + n).join('・')}｜估分 ${best.total.toFixed(1)}</small></div>
      <div class="tm-mems">${idolMem}${deck.map(mem).join('')}</div></div>`;
    const byType = ['vo', 'da', 'vi', 'as'].map(t => [t, pool.filter(p => p.s.type === t).sort((a, b) => b.v - a.v).slice(0, 6)]).filter(([, l]) => l.length);
    h += `<div class="tm-card"><div class="tm-head"><span class="tm-b mid">各タイプ持有前 6</span></div><table class="tm-w"><tr><th>タイプ</th><th>サポカ（凸・估分）</th></tr>` +
      byType.map(([t, l]) => `<tr><th><span class="ty ty-${t}">${STYPE[t]}</span></th><td class="tm-plan">${l.map(p => `<span class="dlink" data-goto="s/${p.s.id}">${esc(p.s.name)}</span>（${p.lb === 4 ? '完' : p.lb}・${p.v.toFixed(1)}）`).join('、')}</td></tr>`).join('') + '</table></div>';
    out.innerHTML = h;
  }

  /* ---- コンテスト編成 ---- */
  function ctScore(x, attr, plan){
    const pot = (owned.i[x.id] || 1) - 1;
    let sc = {SSR:6, SR:3, R:0}[x.r] + pot * 1.2 + x.st.reduce((a, b) => a + b, 0) / 100;
    if (attr){ const i = TI[attr]; sc += x.gr[i] / 40 + x.st[i] / 50; }
    if (plan) sc += x.plan === +plan ? 4 : -4;
    return {x, sc, pot};
  }
  function renderCT(){
    const out = document.getElementById('teamOut'), info = document.getElementById('ctInfo');
    const attr = document.getElementById('ctAttr').value, plan = document.getElementById('ctPlan').value, diff = document.getElementById('ctDiff').checked;
    const pool = data.idols.filter(x => owned.i[x.id]).map(x => ctScore(x, attr, plan)).sort((a, b) => b.sc - a.sc);
    const top = pool.slice(0, 20);
    const res = [];
    for (let i = 0; i < top.length; i++) for (let j = i + 1; j < top.length; j++) for (let k = j + 1; k < top.length; k++){
      const m = [top[i], top[j], top[k]];
      if (diff && new Set(m.map(p => p.x.cid)).size < 3) continue;
      res.push({m, sc:m.reduce((a, p) => a + p.sc, 0)});
    }
    if (!res.length){ out.innerHTML = `<div class="msg">持有的Pアイドル不足 3 位${diff ? '（不同アイドル）' : ''}，請先在「Pアイドル」分頁勾選。</div>`; info.innerHTML = ''; return; }
    res.sort((a, b) => b.sc - a.sc);
    const picks = [];
    for (const r of res){ if (picks.length >= 3) break; if (picks.every(p => p.m.filter(x => r.m.includes(x)).length <= 1)) picks.push(r); }
    info.innerHTML = `分數＝稀有度＋才能開花＋初期パラメータ合計${attr ? `＋${STYPE[attr]}成長率與初期值` : ''}${plan ? `＋プラン「${PLAN[plan]}」相符 +4／不符 −4` : ''}。
      實際コンテスト用的是プロデュース後的メモリー，這裡只依Pアイドル本身挑出適合去培育／出場的 3 位，僅供參考。`;
    const mem = p => `<div class="tm-mem" data-goto="i/${p.x.id}">${imgTag(idolImg(p.x), p.x.title)}
      <span class="tm-tag t-own">${p.x.r} ${POT[p.pot]}</span><div class="tm-nm">${esc(p.x.cname)}</div>
      <div class="tm-nm"><span class="pl pl-${p.x.plan}">${PLAN[p.x.plan]}</span> ${esc(EXAM[p.x.ex] || '')}</div>
      <div class="tm-nm" style="color:var(--sub)">${esc(p.x.title)}</div></div>`;
    out.innerHTML = picks.map((r, i) => `<div class="tm-card"><div class="tm-head"><span class="tm-b ${i ? 'mid' : 'ok'}">${i ? '替代 ' + i : '推薦'}</span><small style="color:var(--sub)">分數 ${r.sc.toFixed(1)}</small></div><div class="tm-mems">${r.m.map(mem).join('')}</div></div>`).join('');
  }

  function setup(){
    const u = document.getElementById('dkIdol'), prev = u.value;
    const own = data.idols.filter(x => owned.i[x.id]).sort((a, b) => a.cname.localeCompare(b.cname, 'ja') || b.vst - a.vst);
    u.innerHTML = own.length ? own.map(x => `<option value="${x.id}">${esc(x.cname)}［${esc(x.title)}］${x.r}</option>`).join('') : '<option value="">（尚未勾選持有的Pアイドル）</option>';
    if (prev && own.some(x => x.id === prev)) u.value = prev;
  }
  function render(t){
    if (!data) return;
    setup();
    if (t === 'deck') renderDeck(); else renderCT();
  }
  function init(){
    ['dkIdol', 'dkRent'].forEach(id => document.getElementById(id).addEventListener('change', () => renderDeck()));
    ['ctAttr', 'ctPlan', 'ctDiff'].forEach(id => document.getElementById(id).addEventListener('change', () => renderCT()));
    document.getElementById('teamOut').addEventListener('click', ev => {
      const g = ev.target.closest('[data-goto]');
      if (g){ pushedHash = true; location.hash = g.dataset.goto; }
    });
  }
  return {init, render, setup};
})();
