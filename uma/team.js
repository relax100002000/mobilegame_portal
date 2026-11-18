/* ウマ娘：サポカ編成（6 枚，含 1 枚フレンド借用）＋ チャンミ出走 3 人
 * 依賴 index.html 的全域：data, owned, TYPE, TYPE_S, SRAR, APT_LAB, STYLE, DIST, GV, TRACK, distCat, esc, umaThumb, supThumb, maxLevel, supEffects, aptCell, pushedHash
 */
const TEAM = (() => {
  const TI = {speed:0, stamina:1, power:2, guts:3, intelligence:4};
  // 目標距離別：各能力（スピ／スタ／パワ／根性／賢さ）的權重
  const W = [
    [3.0, 0.4, 2.0, 1.0, 1.6],   // 短距離
    [3.0, 0.7, 2.0, 1.0, 1.6],   // マイル
    [3.0, 1.4, 1.6, 1.0, 1.5],   // 中距離
    [2.6, 2.4, 1.3, 1.0, 1.4],   // 長距離
  ];
  const TYPE_MUL = [1, 0.92, 0.8, 0.5, 0.3];

  function bestDist(c){
    let b = 2;
    [2, 3, 4, 5].forEach(i => { if (GV[c.apt[i]] > GV[c.apt[b + 2]] || (GV[c.apt[i]] === GV[c.apt[b + 2]] && i === 4)) b = i - 2; });
    return b;
  }
  function bestStyle(c){ let b = 0; [0, 1, 2, 3].forEach(i => { if (GV[c.apt[6 + i]] > GV[c.apt[6 + b]]) b = i; }); return b; }

  /* ---- サポカ價值：用目前凸數的最大 Lv 效果估算 ---- */
  function supValue(s, lb, dist){
    const E = supEffects(s, maxLevel(s, lb)), w = W[dist];
    const avgW = w.reduce((a, b) => a + b, 0) / 5;
    const statB = [3, 4, 5, 6, 7].reduce((a, t, i) => a + (E[t] || 0) * w[i] / avgW, 0) + (E[41] || 0) * 5;
    let v = (E[1] || 0) * 1.0 + (E[8] || 0) * 1.0 + (E[2] || 0) * 0.2 + (E[19] || 0) * 0.12 + statB * 3
      + (E[15] || 0) * 0.25 + (E[30] || 0) * 1.5 + (E[14] || 0) * 0.08 + (E[27] || 0) * 0.1 + (E[28] || 0) * 0.1 + (E[17] || 0) * 1 + (E[18] || 0) * 0.05;
    if (s.type in TI) v *= w[TI[s.type]] / avgW;
    else v = v * 0.8 + (E[25] || 0) * 0.3 + (E[26] || 0) * 0.2;
    return {v, E};
  }
  function pickDeck(pool, n, uma, dist, fixed){
    const deck = fixed ? [fixed] : [];
    const usedC = new Set([uma.cid, ...deck.map(d => d.s.cid)]);
    const cnt = {}; deck.forEach(d => cnt[d.s.type] = (cnt[d.s.type] || 0) + 1);
    let total = deck.reduce((a, d) => a + d.v, 0);
    while (deck.length < n){
      let best = null, bv = -1;
      for (const p of pool){
        if (usedC.has(p.s.cid) || deck.includes(p)) continue;
        const k = cnt[p.s.type] || 0;
        const mul = (p.s.type === 'friend' || p.s.type === 'group') ? (k ? 0.2 : 1) : TYPE_MUL[Math.min(k, 4)];
        const need = dist >= 2 && p.s.type === 'stamina' && !cnt.stamina ? 1.25 : 1;
        const val = p.v * mul * need;
        if (val > bv){ bv = val; best = p; }
      }
      if (!best) break;
      deck.push(best); usedC.add(best.s.cid); cnt[best.s.type] = (cnt[best.s.type] || 0) + 1; total += bv;
    }
    return {deck, total};
  }
  function renderDeck(){
    const out = document.getElementById('teamOut'), info = document.getElementById('deckInfo');
    const umaId = +document.getElementById('dkUma').value;
    const uma = data.cards.find(c => c.id === umaId);
    if (!uma){ out.innerHTML = '<div class="msg">請先在「育成ウマ娘」分頁勾選持有的ウマ娘。</div>'; info.innerHTML = ''; return; }
    const dSel = document.getElementById('dkDist').value, dist = dSel === '' ? bestDist(uma) : +dSel;
    const allowF = document.getElementById('dkFriend').checked, rent = document.getElementById('dkRent').value === '1';
    const ok = s => allowF || (s.type !== 'friend' && s.type !== 'group');
    const mine = data.sups.filter(s => owned.s[s.id] && ok(s)).map(s => ({s, lb:owned.s[s.id] - 1, ...supValue(s, owned.s[s.id] - 1, dist)}));
    if (mine.length < (rent ? 5 : 6)){ out.innerHTML = `<div class="msg">持有的サポカ不足（目前 ${mine.length} 張），請先在「サポートカード」分頁勾選。</div>`; info.innerHTML = ''; return; }
    let best = pickDeck(mine, 6, uma, dist, null), rental = null;
    if (rent){
      const cands = data.sups.filter(s => s.r === 3 && ok(s) && s.cid !== uma.cid).map(s => ({s, lb:4, rent:true, ...supValue(s, 4, dist)})).sort((a, b) => b.v - a.v).slice(0, 40);
      best = null;
      for (const c of cands){
        const r = pickDeck(mine, 6, uma, dist, c);
        if (!best || r.total > best.total){ best = r; rental = c; }
      }
    }
    const sty = bestStyle(uma);
    info.innerHTML = `目標：<b>${DIST[dist]}</b>${dSel === '' ? '（依適性自動）' : ''}｜建議脚質 ${STYLE[sty]} ${aptCell(uma.apt[6 + sty])}｜持有サポカ ${mine.length} 張。<br>
      估分＝目前凸數最大 Lv 的友情ボーナス、トレーニング効果、能力ボーナス、得意率、スキルPt 等加權，再依目標距離調整各タイプ權重；同タイプ第 2 張起遞減、同一角色不重複、不能帶育成ウマ娘本人的サポカ。${rent ? '借用卡以完凸 SSR 計算。' : ''}
      僅供參考，不考慮シナリオ與ヒントスキル。`;
    const deck = best.deck.slice().sort((a, b) => (a.rent ? 1 : 0) - (b.rent ? 1 : 0) || Object.keys(TYPE).indexOf(a.s.type) - Object.keys(TYPE).indexOf(b.s.type));
    const mem = p => `<div class="tm-mem${p.rent ? ' rent' : ''}" data-goto="s-${p.s.id}"><img src="${supThumb(p.s)}" alt="">
      <span class="tm-tag t-${p.rent ? 'friend' : 'own'}">${p.rent ? '借用' : SRAR[p.s.r]} ${p.lb === 4 ? '完凸' : p.lb + '凸'}</span>
      <div class="tm-nm"><span class="ty ty-${p.s.type}">${TYPE_S[p.s.type]}</span> ${esc(p.s.name)}</div><div class="tm-nm" style="color:var(--sub)">友情 ${p.E[1] || 0}%・練習 ${p.E[8] || 0}%</div></div>`;
    const cnt = {}; deck.forEach(p => cnt[p.s.type] = (cnt[p.s.type] || 0) + 1);
    const umaMem = `<div class="tm-mem" data-goto="c-${uma.id}"><img src="${umaThumb(uma)}" alt=""><span class="tm-tag t-dps">育成</span><div class="tm-nm">${esc(uma.name)}</div><div class="tm-nm" style="color:var(--sub)">${esc(uma.title)}</div></div>`;
    let h = `<div class="tm-card"><div class="tm-head"><span class="tm-b ok">推薦編成</span><small style="color:var(--sub)">${Object.entries(cnt).map(([t, n]) => TYPE_S[t] + n).join('・')}｜估分 ${best.total.toFixed(0)}</small></div>
      <div class="tm-mems">${umaMem}${deck.map(mem).join('')}</div></div>`;
    // 依タイプ列出持有的前幾名，方便手動替換
    const byType = Object.keys(TYPE).map(t => [t, mine.filter(p => p.s.type === t && p.s.cid !== uma.cid).sort((a, b) => b.v - a.v).slice(0, 5)]).filter(([, l]) => l.length);
    h += `<div class="tm-card"><div class="tm-head"><span class="tm-b mid">各タイプ持有前 5</span></div><table class="tm-w"><tr><th>タイプ</th><th>サポカ（估分）</th></tr>` +
      byType.map(([t, l]) => `<tr><th><span class="ty ty-${t}">${TYPE[t]}</span></th><td class="tm-plan">${l.map(p => `<span class="dlink" data-goto="s-${p.s.id}">${esc(p.s.name)}</span>（${p.lb === 4 ? '完' : p.lb}・${p.v.toFixed(0)}）`).join('、')}</td></tr>`).join('') + '</table></div>';
    out.innerHTML = h;
  }

  /* ---- チャンミ 3 人 ---- */
  function cmTarget(){
    const dIn = +document.getElementById('cmDist').value;
    const ev = data.cm.find(e => e.id === +document.getElementById('cmEv').value);
    if (dIn >= 1000) return {dist:dIn, ground:+document.getElementById('cmGround').value, label:`自訂 ${dIn}m ${document.getElementById('cmGround').value === '2' ? 'ダート' : '芝'}`};
    if (ev) return {dist:ev.dist, ground:ev.ground, label:`${ev.name}（${TRACK[ev.track] || '海外'} ${ev.ground === 2 ? 'ダート' : '芝'} ${ev.dist}m）`};
    return {dist:2400, ground:1, label:'芝 2400m'};
  }
  function cmScore(c, T){
    const dc = distCat(T.dist), gd = GV[c.apt[T.ground === 2 ? 1 : 0]], dd = GV[c.apt[2 + dc]];
    const sty = bestStyle(c), sv = GV[c.apt[6 + sty]];
    const star = owned.c[c.id] || c.r;
    const st = c.st[star >= 5 ? 2 : star === 4 ? 1 : 0] || c.st[0];
    let sc = gd * 3 + dd * 3 + sv * 1.2 + (star - 3) * 0.8 + st.reduce((a, b) => a + b, 0) / 100;
    if (gd < 7) sc -= (7 - gd) * 4;
    if (dd < 7) sc -= (7 - dd) * 4;
    return {c, sc, gd, dd, sty, star, dc};
  }
  function renderCM(){
    const out = document.getElementById('teamOut'), info = document.getElementById('cmInfo');
    const T = cmTarget(), ownOnly = document.getElementById('cmOwnOnly').checked;
    const pool = data.cards.filter(c => !ownOnly || owned.c[c.id]).map(c => cmScore(c, T)).sort((a, b) => b.sc - a.sc);
    const top = [];
    for (const p of pool){ if (!top.some(q => q.c.cid === p.c.cid)) top.push(p); if (top.length >= 24) break; }
    if (top.length < 3){ out.innerHTML = '<div class="msg">持有的ウマ娘不足 3 人（同一角色只能出 1 人），請先在「育成ウマ娘」分頁勾選。</div>'; info.innerHTML = ''; return; }
    const res = [];
    for (let i = 0; i < top.length; i++) for (let j = i + 1; j < top.length; j++) for (let k = j + 1; k < top.length; k++){
      const m = [top[i], top[j], top[k]];
      const cnt = [0, 0, 0, 0]; m.forEach(p => cnt[p.sty]++);
      let sc = m.reduce((a, p) => a + p.sc, 0);
      if (cnt[0] >= 2) sc -= 4 * (cnt[0] - 1);   // 逃げ同士でハナを争う
      if (Math.max(...cnt) === 3) sc -= 2;
      res.push({m, sc});
    }
    res.sort((a, b) => b.sc - a.sc);
    const picks = [];
    for (const r of res){ if (picks.length >= 3) break; if (picks.every(p => p.m.filter(x => r.m.includes(x)).length <= 1)) picks.push(r); }
    info.innerHTML = `目標：<b>${esc(T.label)}</b>（${DIST[distCat(T.dist)]}）。分數＝バ場與距離適性（B 以下大幅扣分）＋最佳脚質適性＋星數初期能力；同一角色只出 1 人，逃げ 2 人以上扣分。
      適性可用因子繼承補強，B 也能用；僅供參考，不考慮スキル與育成結果。`;
    const mem = p => `<div class="tm-mem" data-goto="c-${p.c.id}"><img src="${umaThumb(p.c)}" alt="">
      <span class="tm-tag t-own">${STYLE[p.sty]} ${p.c.apt[6 + p.sty]}</span><div class="tm-nm">${esc(p.c.name)}</div>
      <div class="tm-nm">${T.ground === 2 ? 'ダ' : '芝'}${aptCell(p.c.apt[T.ground === 2 ? 1 : 0])} ${DIST[p.dc].slice(0, 2)}${aptCell(p.c.apt[2 + p.dc])} ★${p.star}</div>
      <div class="tm-nm" style="color:var(--sub)">${esc(p.c.title)}</div></div>`;
    let h = picks.map((r, i) => `<div class="tm-card"><div class="tm-head"><span class="tm-b ${i ? 'mid' : 'ok'}">${i ? '替代 ' + i : '推薦'}</span><small style="color:var(--sub)">分數 ${r.sc.toFixed(1)}</small></div><div class="tm-mems">${r.m.map(mem).join('')}</div></div>`).join('');
    h += `<div class="tm-card"><div class="tm-head"><span class="tm-b mid">適性 A 以上候補</span></div><div class="tm-plan" style="font-size:13px;line-height:1.8">` +
      pool.filter(p => p.gd >= 9 && p.dd >= 9).slice(0, 30).map(p => `<span class="dlink" data-goto="c-${p.c.id}">${esc(p.c.name)}</span><small style="color:var(--sub)">［${esc(p.c.title)}］${STYLE[p.sty]}</small>`).join('、') + '</div></div>';
    out.innerHTML = h;
  }

  function setup(){
    const u = document.getElementById('dkUma'), prev = u.value;
    const own = data.cards.filter(c => owned.c[c.id]).sort((a, b) => a.name.localeCompare(b.name, 'ja') || a.id - b.id);
    u.innerHTML = own.length ? own.map(c => `<option value="${c.id}">${esc(c.name)}［${esc(c.title)}］</option>`).join('') : '<option value="">（尚未勾選持有的ウマ娘）</option>';
    if (prev && own.some(c => String(c.id) === prev)) u.value = prev;
    const e = document.getElementById('cmEv'), pe = e.value;
    const now = Date.now() / 1000;
    e.innerHTML = data.cm.slice().sort((a, b) => b.start - a.start).map(v => `<option value="${v.id}">${v.start > now ? '［予定］' : ''}第${v.id}回 ${esc(v.name)}｜${TRACK[v.track] || '海外'} ${v.ground === 2 ? 'ダート' : '芝'} ${v.dist}m</option>`).join('');
    if (pe) e.value = pe;
  }
  function render(t){
    if (!data) return;
    setup();
    if (t === 'deck') renderDeck(); else renderCM();
  }
  function init(){
    ['dkUma', 'dkDist', 'dkRent', 'dkFriend'].forEach(id => document.getElementById(id).addEventListener('change', () => renderDeck()));
    ['cmEv', 'cmGround', 'cmOwnOnly'].forEach(id => document.getElementById(id).addEventListener('change', () => renderCM()));
    document.getElementById('cmDist').addEventListener('input', () => renderCM());
    document.getElementById('teamOut').addEventListener('click', ev => {
      const g = ev.target.closest('[data-goto]');
      if (g){ pushedHash = true; location.hash = g.dataset.goto; }
    });
  }
  return {init, render, setup};
})();
