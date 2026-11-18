/* 鳴潮 簡易組隊＋武器搭配
 * 依賴 index.html 的全域：data, owned, API, ELEM, WT, esc, elemDot, pushedHash
 * 角色定位與配合來自遊戲內的角色標籤（主力輸出／生存治療／X傷害加深…），需要讀持有角色的詳細資料（會快取）。
 */
const TEAM = (() => {
  /* ---------- 專武 ---------- */
  // 手動對照（已確認武器類型一致）
  const SIG = {'蒼鱗千嶂':'忌炎','掣傀之手':'吟霖','時和歲稔':'今汐','赫奕流明':'長離','瓊枝冰綃':'折枝','諸方玄樞':'相里要','星序協響':'守岸人',
    '裁春':'椿','悲喜劇':'洛可可','死與舞':'珂萊塔','不滅航路':'布蘭特','和光回唱':'菲比','海的呢喃':'坎特蕾拉','焰光裁定':'贊妮','林間的詠嘆調':'夏空',
    '不屈命定之冠':'卡提希婭','幽冥的忘憂章':'弗洛洛','馭冕鑄雷之權':'奧古斯塔','萬物持存的注釋':'尤諾','焰痕':'露帕'};
  const STD = ['維里奈','安可','卡卡羅','凌陽','鑒心'];   // 常駐五星
  let sigMap = null;   // charId -> {w, guess}
  function buildSig(){
    sigMap = {};
    const byName = n => data.chr.find(c => c.name === n);
    const usedW = new Set(), usedC = new Set();
    for (const [wn, cn] of Object.entries(SIG)){
      const w = data.wp.find(x => x.name === wn), c = byName(cn);
      if (w && c && w.w === c.w){ sigMap[c.id] = {w, guess:false}; usedW.add(w.id); usedC.add(c.id); }
    }
    // 其餘限定五星：同武器類型依實裝順序配對（推測），數量對得上才配
    for (const t of Object.keys(WT).map(Number)){
      const ws = data.wp.filter(w => w.r === 5 && w.w === t && /[67]$/.test(String(w.id)) && !usedW.has(w.id)).sort((a, b) => a.id - b.id);
      const cs = data.chr.filter(c => c.r === 5 && c.w === t && !usedC.has(c.id) && !STD.includes(c.name) && !/^漂泊者/.test(c.name)).sort((a, b) => a.ord - b.ord);
      const wl = ws.slice(-cs.length);
      if (cs.length && wl.length === cs.length) cs.forEach((c, i) => sigMap[c.id] = {w: wl[i], guess:true});
    }
  }
  function sigOf(c){ if (!data) return null; if (!sigMap) buildSig(); return sigMap[c.id] || null; }
  function ownerOf(wid){ if (!data) return null; if (!sigMap) buildSig(); for (const [cid, s] of Object.entries(sigMap)) if (s.w.id === wid) return {c: data.chr.find(c => c.id === +cid), guess: s.guess}; return null; }

  /* ---------- 標籤／武器效果快取 ---------- */
  const TAG_KEY = 'ww_tags_v1', WD_KEY = 'ww_wdesc_v1';
  let tagsOf = {}, wdesc = {};
  try{ tagsOf = JSON.parse(localStorage.getItem(TAG_KEY)) || {}; }catch(e){}
  try{ wdesc = JSON.parse(localStorage.getItem(WD_KEY)) || {}; }catch(e){}
  async function ensure(ids, kind, onP){
    const store = kind === 'chr' ? tagsOf : wdesc;
    const need = ids.filter(id => !store[id]);
    let done = 0;
    const worker = async () => {
      while (need.length){
        const id = need.shift();
        try{
          const r = await fetch(API + (kind === 'chr' ? 'character/' : 'weapon/') + id);
          if (r.ok){
            const d = await r.json();
            store[id] = kind === 'chr' ? (d.Tags || []).map(t => t.TagName) : String(d.Desc || '').replace(/<[^>]*>/g, '');
          }
        }catch(e){}
        onP && onP(++done, need.length + done);
      }
    };
    if (need.length){
      await Promise.all([worker(), worker(), worker()]);
      try{ localStorage.setItem(kind === 'chr' ? TAG_KEY : WD_KEY, JSON.stringify(store)); }catch(e){}
    }
  }

  /* ---------- 評分 ---------- */
  const DMG = ['普攻傷害', '重擊傷害', '共鳴技能傷害', '共鳴解放傷害', '聲骸技能傷害', '協同攻擊'];
  const STATUS = ['光噪', '風蝕', '電磁', '虛湮', '霜漸', '聚爆', '凝滯'];
  const elemSel = new Set();
  const T = c => tagsOf[c.id] || [];
  const isDps = c => T(c).includes('主力輸出');
  const isHeal = c => T(c).includes('生存治療');
  const S = c => (owned.chr[c.id] || 1) - 1;

  function mate(dps, m){
    const dt = T(dps), mt = T(m), why = [];
    let s = (m.r === 5 ? 1 : 0) + S(m) * 0.3;
    if (mt.includes(ELEM[dps.e] + '傷害加深')){ s += 4; why.push(ELEM[dps.e] + '加深'); }
    const amp = DMG.filter(t => dt.includes(t) && mt.includes(t.replace('傷害', '') + '傷害加深'));
    if (amp.length){ s += 4; why.push(amp[0].replace('傷害', '') + '加深'); }
    if (mt.includes('傷害加深')){ s += 2; why.push('全傷加深'); }
    const st = STATUS.filter(t => dt.includes(t) && mt.includes(t));
    if (st.length){ s += 3; why.push(st[0]); }
    if (mt.includes('快速協奏')) s += 1;
    if (isDps(m)) s -= 1.5;
    return {m, s, why};
  }
  function build(){
    const own = data.chr.filter(c => owned.chr[c.id]);
    const heal = document.getElementById('tmHeal').checked;
    const dpsList = own.filter(c => isDps(c) && (!elemSel.size || elemSel.has(c.e)));
    const teams = [];
    for (const d of dpsList){
      const base = (d.r === 5 ? 1 : 0) + S(d) * 0.5 + (elemSel.size ? 3 : 0);
      const mates = own.filter(c => c.id !== d.id).map(c => mate(d, c));
      let best = null;
      for (let i = 0; i < mates.length; i++) for (let j = 0; j < mates.length; j++){
        if (i === j) continue;
        const a = mates[i], b = mates[j];
        let sc = base + a.s + b.s;
        if (heal && isHeal(b.m)) sc += 3;
        if (!best || sc > best.sc) best = {d, sub:a, sus:b, sc};
      }
      if (!best) best = {d, sub: mates[0] || null, sus: null, sc: base};
      teams.push(best);
    }
    teams.sort((a, b) => b.sc - a.sc);
    return {teams, nDps: dpsList.length, nOwn: own.length};
  }

  /* ---------- 武器 ---------- */
  const KW = {
    dps: [['攻擊提升','攻擊'], ['暴擊','暴擊'], ['傷害加成','增傷'], ['傷害提升','增傷']],
    sup: [['共鳴效率','共鳴效率'], ['登場角色','延奏'], ['隊伍','全隊'], ['治療','治療'], ['協奏','協奏']]
  };
  function wpScore(c, role, w){
    const r = owned.wp[w.id] || 1, txt = wdesc[w.id] || '', why = [];
    let sc = ({5:6, 4:3, 3:1}[w.r] || 0) + (r - 1) * 0.4;
    const sig = sigOf(c);
    if (sig && sig.w.id === w.id){ sc += 12; why.push(sig.guess ? '專武(推測)' : '專武'); }
    let k = 0;
    for (const [kw, l] of KW[role]) if (txt.includes(kw) && k < 3){ sc += 1; k++; why.push(l); }
    for (const t of DMG) if (T(c).includes(t) && txt.includes(t.replace('傷害', ''))){ sc += 2; why.push(t.replace('傷害', '')); break; }
    return {w, r, sc, why};
  }
  function assign(members){
    const used = new Set();
    return members.map(({c, role}) => {
      const cand = data.wp.filter(w => owned.wp[w.id] && w.w === c.w && !used.has(w.id)).map(w => wpScore(c, role, w)).sort((a, b) => b.sc - a.sc);
      const best = cand[0] || null;
      if (best) used.add(best.w.id);
      const sig = sigOf(c);
      return {best, sigMissing: sig && !owned.wp[sig.w.id] ? sig : null};
    });
  }

  /* ---------- 畫面 ---------- */
  function mem(c, role, label, why, L){
    let wp = '';
    if (L){
      wp = L.best ? `<div class="tm-lc" data-goto="wp-${L.best.w.id}"><img src="${L.best.w.icon}" alt=""><div>${esc(L.best.w.name)} <b>R${L.best.r}</b>${L.best.why.length ? `<br><small>${L.best.why.join('・')}</small>` : ''}</div></div>`
                  : `<div class="tm-lc none">沒有${WT[c.w]}</div>`;
      if (L.sigMissing) wp += `<div class="tm-sig">專武「${esc(L.sigMissing.w.name)}」${L.sigMissing.guess ? '(推測)' : ''}未持有</div>`;
    }
    return `<div class="tm-mem"><div data-goto="chr-${c.id}"><img src="${c.icon}" alt="">
      <span class="tm-tag t-${role}">${label} S${S(c)}</span><div class="tm-nm">${elemDot(c.e)} ${esc(c.name)}</div>
      ${why && why.length ? `<div class="tm-nm" style="color:var(--sub)">${why.join('・')}</div>` : ''}</div>${wp}</div>`;
  }
  let seq = 0;
  async function render(){
    const out = document.getElementById('teamOut'), info = document.getElementById('teamInfo');
    const ownIds = Object.keys(owned.chr).map(Number);
    if (!ownIds.length){ out.innerHTML = '<div class="msg">請先在「共鳴者」分頁勾選持有的角色。</div>'; info.innerHTML = ''; return; }
    const my = ++seq, useWp = document.getElementById('tmWp').checked;
    const needC = ownIds.filter(id => !tagsOf[id]).length, wIds = Object.keys(owned.wp).map(Number), needW = useWp ? wIds.filter(id => !wdesc[id]).length : 0;
    if (needC || needW){
      out.innerHTML = '<div class="msg">讀取角色標籤與武器效果中…</div>';
      await ensure(ownIds, 'chr', (n, t) => { if (my === seq) out.innerHTML = `<div class="msg">讀取角色標籤 ${n} / ${t}</div>`; });
      if (useWp) await ensure(wIds, 'wp', (n, t) => { if (my === seq) out.innerHTML = `<div class="msg">讀取武器效果 ${n} / ${t}</div>`; });
      if (my !== seq) return;
    }
    const r = build(), show = +document.getElementById('tmShow').value;
    info.innerHTML = `持有 ${r.nOwn} 位，其中「主力輸出」${r.nDps} 位${elemSel.size ? '（屬性已篩選）' : ''}。<br>
      依遊戲內角色標籤配隊：隊友有主 C 屬性或傷害類型的「加深」標籤 +4、全傷害加深 +2、同異常狀態（光噪、風蝕、電磁、虛湮…）+3、快速協奏 +1；第三位優先放「生存治療」。
      ${useWp ? '武器：只挑同類型、持有的，同一把不重複；專武最優先（部分為依實裝順序推測），其次稀有度、精煉與效果關鍵字。' : ''}不計聲骸與實際數值。`;
    out.innerHTML = r.teams.length ? r.teams.slice(0, show).map(t => {
      const ms = [{c:t.d, role:'dps', label:'主C', why:[]}];
      if (t.sub) ms.push({c:t.sub.m, role:isDps(t.sub.m) ? 'sub' : 'sup', label:isDps(t.sub.m) ? '副C' : '輔助', why:t.sub.why});
      if (t.sus) ms.push({c:t.sus.m, role:isHeal(t.sus.m) ? 'sus' : 'sup', label:isHeal(t.sus.m) ? '治療' : '輔助', why:t.sus.why});
      const Ls = useWp ? assign(ms.map(m => ({c:m.c, role: m.role === 'dps' || m.role === 'sub' ? 'dps' : 'sup'}))) : ms.map(() => null);
      return `<div class="tm-card"><div class="tm-head">${elemDot(t.d.e)} ${ELEM[t.d.e]}・${WT[t.d.w]}　<small style="color:var(--sub)">${esc(T(t.d).filter(x => x !== '主力輸出').join('／'))}</small></div>
        <div class="tm-mems">${ms.map((m, i) => mem(m.c, m.role, m.label, m.why, Ls[i])).join('')}</div></div>`;
    }).join('') : '<div class="msg">持有角色中沒有「主力輸出」標籤的角色。</div>';
  }
  function init(){
    const box = document.getElementById('tmElem');
    box.innerHTML = Object.keys(ELEM).map(e => `<span class="chip" data-e="${e}">${elemDot(+e)} ${ELEM[e]}</span>`).join('');
    box.addEventListener('click', ev => {
      const c = ev.target.closest('.chip'); if (!c) return;
      const e = +c.dataset.e; elemSel.has(e) ? elemSel.delete(e) : elemSel.add(e);
      c.classList.toggle('on'); render();
    });
    ['tmShow', 'tmHeal', 'tmWp'].forEach(id => document.getElementById(id).addEventListener('change', render));
    document.getElementById('teamOut').addEventListener('click', ev => {
      const g = ev.target.closest('[data-goto]');
      if (g){ pushedHash = true; location.hash = g.dataset.goto; }
    });
  }
  return {init, render, sigOf, ownerOf};
})();
