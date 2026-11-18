/* 崩壞：星穹鐵道 簡易組隊 — 依持有角色、定位與流派標籤配隊
 * 依賴 index.html 的全域：data, owned, roleOv, PATH, ELEM, ELEM_COLOR, ROLE, esc, faceOf, elemDot, pushedHash
 */
const TEAM = (() => {
  // 命途預設定位；記憶、歡愉角色差異大，預設主 C，可在角色詳細資料裡改
  const PATH_ROLE = {Warrior:'dps', Rogue:'dps', Mage:'dps', Shaman:'sup', Warlock:'sup', Knight:'sus', Priest:'sus', Memory:'dps', Elation:'dps'};
  // 與命途預設不同的角色
  const ROLE_FIX = {
    1005:'dps', 1307:'dps', 1308:'dps',            // 卡芙卡、黑天鵝、黃泉（虛無輸出）
    1108:'sub', 1111:'sub', 1210:'sub',            // 桑博、盧卡、桂乃芬（持續傷害副 C）
    1112:'sub',                                    // 托帕（追擊副 C）
    8007:'sup', 8008:'sup',                        // 記憶開拓者
    1409:'sus'                                     // 風堇
  };
  // 流派標籤：同標籤的主 C 與隊友加分；any = 泛用輔助
  const TAGS = {
    1005:['dot'], 1307:['dot'], 1108:['dot'], 1111:['dot'], 1210:['dot'],
    1310:['break'], 1315:['break'], 1317:['break'], 1303:['break','any'], 8005:['break'], 8006:['break'],
    1225:['break'], 1222:['break','fua'], 1301:['break'],
    1112:['fua'], 1220:['fua'], 1223:['fua'], 1305:['fua'], 1107:['fua'], 1013:['fua'], 1314:['fua'], 1401:['fua'],
    1309:['fua','any'], 1304:['fua'],
    1308:['nihility'],
    1402:['memo'], 1407:['memo'], 8007:['memo'], 8008:['memo'], 1313:['memo','any'],
    1403:['any'], 1306:['any'], 1101:['any'], 1202:['any'], 1006:['any'], 1106:['any'], 1218:['any']
  };
  const TAG_NAME = {dot:'持續傷害', break:'擊破', fua:'追加攻擊', memo:'憶靈', nihility:'虛無（黃泉）'};
  const weak = new Set();

  /* ---------- 光錐 ---------- */
  // 限定五星光錐 → 專屬角色（23000～23044 手填，已核對命途一致；之後的用「效果或故事提到角色名且命途相同」推測）
  const LC_OWNER = {
    23000:1003, 23001:1102, 23002:1107, 23003:1101, 23004:1004, 23005:1104, 23006:1005, 23007:1006,
    23008:1203, 23009:1205, 23010:1204, 23011:1208, 23014:1212, 23015:1213, 23016:1112, 23017:1217,
    23018:1302, 23019:1303, 23020:1305, 23021:1306, 23022:1307, 23023:1304, 23024:1308, 23025:1310,
    23026:1309, 23027:1315, 23028:1314, 23029:1218, 23030:1221, 23031:1220, 23032:1222, 23033:1317,
    23034:1313, 23035:1225, 23036:1402, 23037:1401, 23038:1403, 23039:1404, 23040:1407, 23041:1405,
    23042:1409, 23043:1406, 23044:1408
  };
  const LC_KEY = 'hsr_lcinfo_v2';
  let lcInfo = {};
  try{ lcInfo = JSON.parse(localStorage.getItem(LC_KEY)) || {}; }catch(e){}
  const strip = t => String(t || '').replace(/<[^>]+>/g, '').replace(/\\n/g, ' ');

  async function ensureLC(ids, onProgress){
    const need = ids.filter(id => !lcInfo[id]);
    let done = 0;
    const worker = async () => {
      while (need.length){
        const id = need.shift();
        try{
          const r = await fetch(API + 'equipment/' + id);
          if (r.ok){ const d = (await r.json()).data; lcInfo[id] = {t: strip(d.skill && d.skill.name) + '：' + strip(d.skill && d.skill.description), s: strip(d.description)}; }
        }catch(e){}
        onProgress && onProgress(++done);
      }
    };
    if (need.length){
      await Promise.all([worker(), worker(), worker()]);
      try{ localStorage.setItem(LC_KEY, JSON.stringify(lcInfo)); }catch(e){}
    }
  }
  function ownerOf(lc){
    if (LC_OWNER[lc.id]) return LC_OWNER[lc.id];
    if (lc.r !== 5 || lc.id < 23045 || lc.id >= 24000 || !lcInfo[lc.id]) return 0;
    const txt = lcInfo[lc.id].t + (lcInfo[lc.id].s || '');
    const c = data.chr.filter(c => c.id < 8000 && c.p === lc.p && txt.includes(c.name.split(/[•＆&]/)[0]));
    return c.length === 1 ? c[0].id : 0;
  }
  function sigOf(c){ return data.lc.find(l => ownerOf(l) === c.id && l.p === c.p); }

  // 依定位與流派找關鍵字
  const KW = {
    dps: [['暴擊率','暴擊'], ['暴擊傷害','爆傷'], ['造成的傷害提高','增傷'], ['攻擊力提高','攻擊'], ['無視','穿防']],
    sub: [['暴擊率','暴擊'], ['造成的傷害提高','增傷'], ['攻擊力提高','攻擊']],
    sup: [['能量','充能'], ['速度','速度'], ['我方全體','全隊'], ['受到的傷害提高','易傷'], ['防禦力降低','減防']],
    sus: [['治療量','治療'], ['生命上限','生命'], ['護盾','護盾'], ['防禦力提高','防禦'], ['能量','充能']]
  };
  const KW_TAG = {break: [['擊破特攻','擊破'], ['弱點擊破效率','削韌']], dot: [['持續傷害','持續傷害']], fua: [['追加攻擊','追擊']], memo: [['憶靈','憶靈']]};
  function lcScore(c, r, lc){
    const s = owned.lc[lc.id] || 1;
    let sc = (lc.r === 5 ? 6 : lc.r === 4 ? 3 : 1) + (s - 1) * 0.4;
    const why = [];
    const owner = ownerOf(lc);
    if (owner === c.id){ sc += 12; why.push('專武'); }
    const txt = (lcInfo[lc.id] || {}).t || '';
    let k = 0;
    for (const [w, label] of KW[r] || []) if (txt.includes(w) && k < 3){ sc += 1; k++; why.push(label); }
    for (const tg of tags(c)) for (const [w, label] of KW_TAG[tg] || []) if (txt.includes(w)){ sc += 2; why.push(label); }
    return {lc, s, sc, why};
  }
  function assignLC(members){   // members: [{c, r}] 依序挑，同一把光錐只用一次
    const used = new Set();
    return members.map(({c, r}) => {
      const cand = data.lc.filter(l => owned.lc[l.id] && l.p === c.p && !used.has(l.id)).map(l => lcScore(c, r, l)).sort((a, b) => b.sc - a.sc);
      const best = cand[0] || null;
      if (best) used.add(best.lc.id);
      const sig = sigOf(c);
      return {best, sigMissing: sig && !owned.lc[sig.id] ? sig : null, sigTaken: sig && owned.lc[sig.id] && used.has(sig.id) && (!best || best.lc.id !== sig.id) ? sig : null};
    });
  }

  function defaultRole(c){ return ROLE_FIX[c.id] || PATH_ROLE[c.p] || 'dps'; }
  function role(c){ return roleOv[c.id] || defaultRole(c); }
  function tags(c){ return TAGS[c.id] || []; }
  function eid(c){ return (owned.chr[c.id] || 1) - 1; }

  function mateScore(dps, m){
    let s = (m.r === 5 ? 1 : 0) + eid(m) * 0.3;
    const why = [];
    const dt = tags(dps), mt = tags(m);
    const shared = dt.filter(t => t !== 'nihility' && mt.includes(t));
    if (shared.length){ s += 3; why.push(TAG_NAME[shared[0]]); }
    if (dt.includes('nihility') && m.p === 'Warlock'){ s += 3; why.push('虛無'); }
    if (mt.includes('any')){ s += 1.5; if (!shared.length) why.push('泛用'); }
    if (weak.size && weak.has(m.e) && dt.includes('break')){ s += 0.5; why.push('弱點屬性'); }
    return {s, why};
  }

  function build(){
    const own = data.chr.filter(c => owned.chr[c.id]);
    const by = r => own.filter(c => role(c) === r);
    const dpsList = by('dps'), flexBase = [...by('sup'), ...by('sub')], sus = by('sus');
    const teams = [];
    for (const d of dpsList){
      const match = weak.size ? weak.has(d.e) : true;
      if (document.getElementById('tmMatchOnly').checked && weak.size && !match) continue;
      let score = (match && weak.size ? 8 : 0) + (d.r === 5 ? 1 : 0) + eid(d) * 0.5;
      // 輔助位：輔助／副 C，不夠時用其他主 C 補（扣分）
      const flex = flexBase.map(m => ({m, ...mateScore(d, m)}));
      dpsList.filter(x => x !== d).forEach(m => { const r = mateScore(d, m); flex.push({m, s: r.s - 1.5, why: r.why, asSub: true}); });
      flex.sort((a, b) => b.s - a.s);
      const pick = flex.slice(0, 2);
      const susP = sus.map(m => ({m, ...mateScore(d, m)})).sort((a, b) => b.s - a.s)[0];
      score += pick.reduce((a, x) => a + x.s, 0) + (susP ? susP.s + 2 : 0);
      teams.push({d, pick, sus: susP, score, match});
    }
    teams.sort((a, b) => b.score - a.score);
    return {teams, nDps: dpsList.length, nSup: flexBase.length, nSus: sus.length};
  }

  function mem(c, r, why, L){
    const e = eid(c);
    let lc = '';
    if (L){
      if (L.best) lc = `<div class="tm-lc" data-goto="lc-${L.best.lc.id}"><img src="${faceOf('lc', L.best.lc)}" alt=""><div>${esc(L.best.lc.name)} <b>S${L.best.s}</b>${L.best.why.length ? `<br><small>${L.best.why.join('・')}</small>` : ''}</div></div>`;
      else lc = '<div class="tm-lc none">沒有同命途光錐</div>';
      if (L.sigMissing) lc += `<div class="tm-sig">專武「${esc(L.sigMissing.name)}」未持有</div>`;
    }
    return `<div class="tm-mem"><div data-goto="chr-${c.id}"><img src="${faceOf('chr', c)}" alt="">
      <span class="tm-tag t-${r}">${ROLE[r]} E${e}</span><div class="tm-nm">${elemDot(c.e)} ${esc(c.name)}</div>
      ${why && why.length ? `<div class="tm-nm" style="color:var(--sub)">${why.join('・')}</div>` : ''}</div>${lc}</div>`;
  }
  function teamHTML(t){
    const {d, pick, sus, match} = t;
    const reasons = [];
    if (weak.size) reasons.push(match ? `主 C 屬性（${ELEM[d.e]}）符合弱點` : `主 C 屬性（${ELEM[d.e]}）不符合弱點`);
    tags(d).forEach(tg => TAG_NAME[tg] && reasons.push(`${TAG_NAME[tg]}流派`));
    if (!sus) reasons.push('沒有持有生存位角色');
    if (pick.length < 2) reasons.push('輔助位不足');
    const ms = [{c: d, r: 'dps'}, ...pick.map(x => ({c: x.m, r: x.asSub ? 'sub' : role(x.m), why: x.why}))];
    if (sus) ms.push({c: sus.m, r: 'sus', why: sus.why});
    const Ls = useLC ? assignLC(ms) : ms.map(() => null);
    const badge = weak.size ? (match ? '<span class="tm-b ok">弱點符合</span>' : '<span class="tm-b mid">屬性不符</span>') : '';
    return `<div class="tm-card"><div class="tm-head">${badge}<span>${esc(PATH[d.p])}・${ELEM[d.e]}</span></div>
      <div class="tm-mems">${ms.map((m, i) => mem(m.c, m.r, m.why, Ls[i])).join('')}</div>
      <div class="reason">${reasons.join('；')}</div></div>`;
  }

  let useLC = false, seq = 0;
  async function render(){
    const out = document.getElementById('teamOut'), info = document.getElementById('teamInfo');
    if (!Object.keys(owned.chr).length){ out.innerHTML = '<div class="msg">請先在「角色」分頁勾選持有的角色。</div>'; info.innerHTML = ''; return; }
    const my = ++seq;
    useLC = document.getElementById('tmLC').checked && Object.keys(owned.lc).length > 0;
    if (useLC){
      const ids = Object.keys(owned.lc).map(Number);
      const miss = ids.filter(id => !lcInfo[id]).length;
      if (miss){
        out.innerHTML = `<div class="msg">讀取光錐效果中… 0 / ${miss}</div>`;
        await ensureLC(ids, n => { if (my === seq) out.innerHTML = `<div class="msg">讀取光錐效果中… ${n} / ${miss}</div>`; });
        if (my !== seq) return;
      }
    }
    const r = build();
    const show = +document.getElementById('tmShow').value;
    info.innerHTML = `持有主 C ${r.nDps} 位、輔助／副 C ${r.nSup} 位、生存 ${r.nSus} 位。定位依命途判斷，少數角色有手動修正；不對的話在角色詳細資料裡改「組隊定位」。<br>
      配隊依據：主 C 屬性是否符合弱點、流派標籤（持續傷害／擊破／追加攻擊／憶靈／黃泉＋虛無）、泛用輔助、稀有度與星魂。${useLC ? '光錐：只從同命途、持有的光錐挑，同一把不重複；專武最優先，其次依稀有度、疊影與效果關鍵字（依定位與流派）。' : '未計入光錐。'}不計遺器與實際數值。`;
    out.innerHTML = r.teams.length ? r.teams.slice(0, show).map(teamHTML).join('') : '<div class="msg">沒有符合條件的主 C。</div>';
  }

  function init(){
    const box = document.getElementById('tmWeak');
    box.innerHTML = Object.keys(ELEM).map(e => `<span class="chip" data-e="${e}">${elemDot(e)} ${ELEM[e]}</span>`).join('');
    box.addEventListener('click', ev => {
      const c = ev.target.closest('.chip'); if (!c) return;
      weak.has(c.dataset.e) ? weak.delete(c.dataset.e) : weak.add(c.dataset.e);
      c.classList.toggle('on'); render();
    });
    document.getElementById('tmShow').addEventListener('change', render);
    document.getElementById('tmMatchOnly').addEventListener('change', render);
    document.getElementById('tmLC').addEventListener('change', render);
    document.getElementById('teamOut').addEventListener('click', ev => {
      const g = ev.target.closest('[data-goto]');
      if (g){ pushedHash = true; location.hash = g.dataset.goto; }
    });
  }
  return {init, render, defaultRole};
})();
