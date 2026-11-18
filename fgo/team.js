/* FGO 周回（3T）組隊推薦 — 依持有從者 + 1 位好友輔助估算
 * 依賴 index.html 的全域：data, owned, CLASS_LABEL, esc
 */
const TEAM = (() => {
  const CACHE = 'fgo_jp_team_v1';
  const API = 'https://api.atlasacademy.io/export/JP/';
  const CARD_TRAIT = {'1': 4001, '2': 4002, '3': 4003};
  const CARD_MOD = {'1': 1.0, '2': 1.5, '3': 0.8};
  const CARD_REFUND = {'1': 3, '2': 0, '3': 1};
  const CARD_TXT = {'1': ['Arts', 'card-a'], '2': ['Buster', 'card-b'], '3': ['Quick', 'card-q']};
  const KEEP = new Set(['upAtk', 'upCommandall', 'upNpdamage', 'upDropnp', 'downDefence', 'upDamage']);

  /* ---------- 資料萃取 ---------- */
  // 目標代碼：s=自己 o=我方單體(選主力) a=我方全體 x=自己以外全體 e=敵方
  function tgtOf(t){
    if (t === 'self') return 's';
    if (t === 'ptOne' || t === 'ptAnother' || t === 'ptOneOther') return 'o';
    if (t === 'ptAll' || t === 'ptFull') return 'a';
    if (t === 'ptOther' || t === 'ptOtherFull') return 'x';
    if (/^enemy/.test(t)) return 'e';
    return null;
  }
  function effects(funcs, lv){
    const out = [];
    for (const f of funcs || []){
      if (f.funcTargetTeam === 'enemy') continue;
      const t = tgtOf(f.funcTargetType); if (!t) continue;
      const sv = f.svals && (f.svals[lv] || f.svals[f.svals.length - 1]); if (!sv) continue;
      if (f.funcType === 'gainNp' && t !== 'e'){ out.push({k: 'np', t, v: sv.Value / 100}); continue; }
      if (f.funcType === 'shortenSkill' && t !== 'e'){ out.push({k: 'cd', t, v: sv.Value}); continue; }
      if (/^addState/.test(f.funcType)){
        const b = f.buffs && f.buffs[0]; if (!b || !KEEP.has(b.type)) continue;
        if (b.ckOpIndv && b.ckOpIndv.length) continue;               // 對特定特性才有效 → 不計
        if ((b.type === 'downDefence') !== (t === 'e')) continue;
        const self = (b.ckSelfIndv || []).map(x => x.id);
        const card = self.filter(id => id >= 4001 && id <= 4003);
        if (self.length && !card.length) continue;                    // 其他條件 → 不計
        out.push({k: 'b', t, b: b.type, v: sv.Value / 1000, d: sv.Turn > 0 ? sv.Turn : 9, c: card.length ? card : null});
      }
    }
    return out;
  }
  function topVer(arr){
    const m = {};
    arr.forEach(x => { if (!m[x.num] || x.priority > m[x.num].priority) m[x.num] = x; });
    return Object.values(m).sort((a, b) => a.num - b.num);
  }
  function extract(all){
    const res = {};
    for (const s of all){
      if (!(s.collectionNo > 0) || !(s.type === 'normal' || s.type === 'heroine')) continue;
      const sk = topVer(s.skills || []).map(k => ({n: k.num, cd: k.coolDown[k.coolDown.length - 1], e: effects(k.functions, 9)})).filter(k => k.e.length);
      const ps = (s.classPassive || []).flatMap(p => effects(p.functions, 0)).filter(e => e.k === 'b' && e.t === 's');
      let np = null;
      for (const n of (s.noblePhantasms || []).slice().sort((a, b) => b.priority - a.priority)){
        const df = n.functions.find(f => /^damageNp/.test(f.funcType));
        if (df){
          np = {card: n.card, aoe: df.funcTargetType === 'enemyAll', mult: df.svals.map(v => (v.Value || 0) / 1000),
                hits: n.npDistribution || [100], rate: ((n.npGain && n.npGain.np) || [0]).map(v => v / 100)};
          break;
        }
      }
      res[s.id] = {id: s.id, cls: s.className, attr: s.attribute, atk: s.atkMax, np, sk, ps};
    }
    return res;
  }

  /* ---------- 模擬 ---------- */
  function hitsDps(e, mi, d){ return e.t === 'a' || e.t === 'e' || (e.t === 's' && mi === d) || ((e.t === 'o' || e.t === 'x') && mi !== d); }
  function chargeOf(sk, mi, d){ let v = 0; for (const e of sk.e) if (e.k === 'np' && hitsDps(e, mi, d)) v += e.v; return v; }
  function allyCharge(p){ let v = 0; for (const sk of p.sk) for (const e of sk.e) if (e.k === 'np' && (e.t === 'o' || e.t === 'a' || e.t === 'x')) v += e.v; return v; }

  // team: [{p, lv(np), tag}]，team[0] 為主力
  // 每回合列舉「剛好補滿 100%」的最小充能技能組合（最多取 6 種），往下搜尋 3 回合，取最佳結果
  function simulate(team, env, o){
    const D = 0, P = team[0].p, np = P.np, lv = Math.min(5, Math.max(1, team[0].lv || 1));
    const trait = CARD_TRAIT[np.card];
    const charge = team.map((m, mi) => m.p.sk.map(sk => chargeOf(sk, mi, D)));
    const useful = team.map((m, mi) => m.p.sk.map(sk => sk.e.some(e => hitsDps(e, mi, D))));
    const atk = P.atk + o.fou + o.ceAtk;
    const base = atk * 0.23 * (np.mult[lv - 1] || np.mult[0]) * CARD_MOD[np.card]
               * env.classRate(P.cls) * env.adv(P.cls) * env.attrAdv(P.attr);
    const rate = (np.rate[lv - 1] ?? np.rate[0]) * CARD_REFUND[np.card];
    let best = null;

    function use(st, mi, si, turn){
      const sk = team[mi].p.sk[si];
      for (const e of sk.e){
        if (!hitsDps(e, mi, D)) continue;
        if (e.k === 'np') st.gauge += e.v;
        else if (e.k === 'cd') st.cd[D] = st.cd[D].map(c => Math.max(0, c - e.v));
        else st.buffs.push({b: e.b, v: e.v, c: e.c, until: turn + e.d - 1});
      }
      st.cd[mi][si] = sk.cd;
      st.used.push([mi, sk.n]);
    }
    function finish(st){
      const fired = st.waves.filter(w => w.fired).length;
      const minDmg = Math.min(...st.waves.map(w => w.dmg));
      const kill = o.hp > 0 ? st.waves.length === 3 && st.waves.every(w => w.fired && w.dmg >= o.hp) : null;
      const score = fired * 1e10 + (kill ? 1e9 : 0) + minDmg;
      if (!best || score > best.score) best = {score, waves: st.waves, ok: fired === 3, kill, minDmg};
    }
    function step(st, turn){
      if (turn > 3){ finish(st); return; }
      const need = 100 - st.gauge;
      let opts = [[]];
      const av = [];
      team.forEach((m, mi) => m.p.sk.forEach((sk, si) => { if (!st.cd[mi][si] && charge[mi][si] > 0) av.push([mi, si, charge[mi][si]]); }));
      if (need > 0.005){
        const n = Math.min(av.length, 10), subs = [];
        for (let mask = 1; mask < (1 << n); mask++){
          let s = 0, minC = 1e9;
          for (let i = 0; i < n; i++) if (mask & (1 << i)){ s += av[i][2]; minC = Math.min(minC, av[i][2]); }
          if (s >= need - 0.005 && s - minC < need - 0.005) subs.push({mask, waste: s - need});
        }
        subs.sort((x, y) => x.waste - y.waste);
        opts = subs.length ? subs.slice(0, 6).map(x => av.filter((_, i) => x.mask & (1 << i))) : [av];
      }
      for (const pick of opts){
        const s2 = {gauge: st.gauge, cd: st.cd.map(r => r.slice()), buffs: st.buffs.slice(), waves: st.waves, used: []};
        pick.forEach(a => use(s2, a[0], a[1], turn));
        // 增益技能：長效的早用、短效（<3T）留到第 3 波；最後一波把剩下的全部用掉
        team.forEach((m, mi) => m.p.sk.forEach((sk, si) => {
          if (s2.cd[mi][si] || !useful[mi][si]) return;
          if (turn < 3){
            if (charge[mi][si] > 0) return;
            if (sk.e.some(e => e.k === 'b' && e.d < 3)) return;
          }
          use(s2, mi, si, turn);
        }));
        const pre = s2.gauge;
        const act = s2.buffs.filter(b => b.until >= turn);
        const sum = (type, cardOnly) => act.reduce((a, b) => a + (b.b === type && (!cardOnly || !b.c || b.c.includes(trait)) ? b.v : 0), 0);
        const cardUp = sum('upCommandall', true);
        const dmg = base * Math.max(0, 1 + cardUp) * Math.max(0, 1 + sum('upAtk') + sum('downDefence'))
                  * Math.max(0.001, 1 + sum('upDamage', true) + sum('upNpdamage'));
        const fired = pre >= 99.995;
        let refund = 0;
        if (fired){
          // 回收：每 hit × 敵人數；有填 HP 時，擊殺後的 hit 以 1.5 倍計
          const per = rate * (1 + cardUp) * (1 + sum('upDropnp'));
          let cum = 0;
          for (const h of np.hits){ refund += per * (o.hp > 0 && cum >= o.hp ? 1.5 : 1); cum += dmg * h / 100; }
          refund *= o.enemies;
          s2.gauge = refund;
        }
        s2.waves = st.waves.concat([{pre, dmg, refund, used: s2.used, fired}]);
        s2.cd.forEach(r => r.forEach((c, i) => { if (c > 0) r[i] = c - 1; }));
        if (!fired) finish(s2); else step(s2, turn + 1);
      }
    }
    step({gauge: o.startNp, cd: team.map(m => m.p.sk.map(() => 0)), buffs: P.ps.map(e => ({b: e.b, v: e.v, c: e.c, until: 99})), waves: [], used: []}, 1);
    return best;
  }

  function recommend(prof, ownedSvt, o, env){
    const own = Object.keys(ownedSvt).map(Number).filter(id => prof[id]);
    const dpsList = own.filter(id => prof[id].np && prof[id].np.aoe);
    const ownSup = own.filter(id => allyCharge(prof[id]) >= 20);   // 能幫隊友充能 20% 以上的才當輔助候選
    const friendPool = Object.values(prof).filter(p => allyCharge(p) >= 20)
      .sort((a, b) => allyCharge(b) - allyCharge(a)).slice(0, o.friendPool).map(p => p.id);
    const results = [];
    for (const d of dpsList){
      if (o.only && d !== o.only) continue;
      const dps = {p: prof[d], lv: ownedSvt[d], tag: 'dps'};
      let best = null;
      const consider = team => {
        const r = simulate(team, env, o);
        const score = r.score;
        if (!best || score > best.score) best = {score, team, r};
      };
      if (o.friend){
        const sups = [null, ...ownSup.filter(id => id !== d)];
        for (const s of sups) for (const f of friendPool){
          const team = [dps];
          if (s) team.push({p: prof[s], tag: 'own'});
          team.push({p: prof[f], tag: 'friend'});
          consider(team);
        }
      } else {
        const sups = ownSup.filter(id => id !== d);
        consider([dps]);
        for (let i = 0; i < sups.length; i++){
          consider([dps, {p: prof[sups[i]], tag: 'own'}]);
          for (let j = i + 1; j < sups.length; j++) consider([dps, {p: prof[sups[i]], tag: 'own'}, {p: prof[sups[j]], tag: 'own'}]);
        }
      }
      if (best) results.push(best);
    }
    results.sort((a, b) => b.score - a.score);
    return results;
  }

  /* ---------- 介面 ---------- */
  let store = null; // {time, prof, rel, rate, attr}
  function load(){ try{ store = JSON.parse(localStorage.getItem(CACHE)); }catch(e){ store = null; } }

  async function build(btn){
    btn.disabled = true; btn.textContent = '下載中（約 60MB，請稍候）…';
    try{
      const [all, rel, rate, attr] = await Promise.all(
        ['nice_servant.json', 'NiceClassRelation.json', 'NiceClassAttackRate.json', 'NiceAttributeRelation.json']
          .map(f => fetch(API + f, {cache: 'no-cache'}).then(r => { if (!r.ok) throw new Error(f + ' HTTP ' + r.status); return r.json(); })));
      btn.textContent = '分析中…';
      await new Promise(r => setTimeout(r, 30));
      const keep = ['saber','archer','lancer','rider','caster','assassin','berserker','shielder','ruler','avenger','alterEgo','moonCancer','foreigner','pretender','beast'];
      const prof = extract(all);
      const clsSet = new Set([...keep, ...Object.values(prof).map(p => p.cls)]);
      const relS = {};
      clsSet.forEach(c => { if (rel[c]) relS[c] = Object.fromEntries(keep.map(k => [k, rel[c][k] ?? 1000])); });
      const rateS = {}; clsSet.forEach(c => rateS[c] = rate[c] ?? 1000);
      store = {time: Date.now(), prof, rel: relS, rate: rateS, attr};
      try{ localStorage.setItem(CACHE, JSON.stringify(store)); }catch(e){ console.warn('team cache not saved', e); }
      render();
    }catch(err){
      alert('建立失敗：' + err.message);
      btn.disabled = false; btn.textContent = '重試';
    }
  }

  function opts(){
    const g = id => document.getElementById(id);
    return {
      enemy: g('tmEnemy').value, attr: g('tmAttr').value, hp: +g('tmHp').value || 0,
      startNp: +g('tmCe').value + +g('tmAppend').value, fou: +g('tmFou').value, ceAtk: 0,
      friend: g('tmFriend').value === '1', friendPool: 15, enemies: 3, show: 20
    };
  }
  function envOf(o){
    return {
      classRate: c => (store.rate[c] ?? 1000) / 1000,
      adv: c => o.enemy ? ((store.rel[c] && store.rel[c][o.enemy]) ?? 1000) / 1000 : 1,
      attrAdv: a => o.attr && store.attr[a] ? (store.attr[a][o.attr] ?? 1000) / 1000 : 1
    };
  }

  function face(id){ const x = data.svt.find(s => s.id === id); return x ? x.face : ''; }
  function nm(id){ const x = data.svt.find(s => s.id === id); return x ? x.name : String(id); }
  function fmt(n){ return Math.round(n).toLocaleString(); }

  function teamHTML(res, o){
    const {team, r} = res;
    const label = {dps: '主力', own: '輔助', friend: '好友'};
    const who = mi => mi === 0 ? '主力' : (team[mi].tag === 'friend' ? '好友' : '輔助' + (team.filter((t, i) => i <= mi && t.tag === 'own').length));
    const P = team[0].p, ct = CARD_TXT[P.np.card] || ['?', ''];
    const mem = team.map((m, mi) => `<div class="tm-mem" data-goto="svt-${m.p.id}">
        <img src="${face(m.p.id)}" alt=""><span class="tm-tag t-${m.tag}">${label[m.tag]}${m.tag === 'dps' ? ' 寶' + m.lv : ''}</span>
        <div class="tm-nm">${esc(nm(m.p.id))}</div></div>`).join('');
    const waves = r.waves.map((w, i) => {
      const plan = w.used.length ? w.used.map(([mi, n]) => who(mi) + ' S' + n).join('、') : '—';
      const kill = o.hp > 0 ? (w.dmg >= o.hp ? ' tm-ok' : ' tm-ng') : '';
      return `<tr><td>W${i + 1}</td><td class="${w.fired ? '' : 'tm-ng'}">${w.pre.toFixed(0)}%</td>
        <td class="${w.fired ? kill : ''}">${w.fired ? fmt(w.dmg) : '-'}</td><td>${w.fired ? w.refund.toFixed(0) + '%' : '-'}</td><td class="tm-plan">${plan}</td></tr>`;
    }).join('');
    const badge = r.ok ? (o.hp > 0 ? (r.kill ? '<span class="tm-b ok">3T 可行</span>' : '<span class="tm-b mid">NP 夠、傷害不足</span>') : '<span class="tm-b ok">NP 可 3 連發</span>')
                       : `<span class="tm-b ng">第 ${r.waves.findIndex(w => !w.fired) + 1} 波 NP 不足</span>`;
    return `<div class="tm-card">
      <div class="tm-head">${badge}<span class="${ct[1]}">${ct[0]}</span> ${CLASS_LABEL[classGroup(P.cls)] || P.cls}</div>
      <div class="tm-mems">${mem}</div>
      <table class="tm-w"><tr><th></th><th>開寶前 NP</th><th>預估傷害</th><th>回收</th><th>使用技能</th></tr>${waves}</table>
    </div>`;
  }

  let timer;
  function render(){
    const box = document.getElementById('teamOut');
    const info = document.getElementById('teamInfo');
    if (!store){
      info.innerHTML = '';
      box.innerHTML = `<div class="msg">組隊推薦需要完整的從者技能資料（Atlas Academy 約 60MB），只需下載一次，之後存在瀏覽器。<br><br>
        <button class="btn" id="tmBuild">建立組隊資料</button></div>`;
      document.getElementById('tmBuild').onclick = e => build(e.target);
      return;
    }
    const o = opts();
    const ownedCnt = Object.keys(owned.svt).length;
    if (!ownedCnt){ box.innerHTML = '<div class="msg">請先在「從者」分頁勾選持有的從者。</div>'; return; }
    box.innerHTML = '<div class="msg">計算中…</div>';
    clearTimeout(timer);
    timer = setTimeout(() => {
      const t0 = performance.now();
      const res = recommend(store.prof, owned.svt, o, envOf(o));
      const okN = res.filter(x => x.r.ok).length;
      info.innerHTML = `持有可當主力（全體寶具）${res.length} 位，其中 ${okN} 位能 3 連發寶具｜計算 ${(performance.now() - t0).toFixed(0)}ms｜技能資料：${new Date(store.time).toLocaleDateString()} <span class="dlink" id="tmRebuild">重新下載</span><br>估算前提：技能皆 Lv10、每波 3 隻敵人、不計暴擊與特攻、未填 HP 時回收不計擊殺加成；好友輔助從充能量最高的 15 位中挑。結果僅供參考。`;
      document.getElementById('tmRebuild').onclick = () => { localStorage.removeItem(CACHE); store = null; render(); };
      box.innerHTML = res.length ? res.slice(0, o.show).map(x => teamHTML(x, o)).join('') : '<div class="msg">持有的從者中沒有全體寶具的主力。</div>';
    }, 20);
  }

  function init(){
    load();
    ['tmEnemy', 'tmAttr', 'tmHp', 'tmCe', 'tmAppend', 'tmFou', 'tmFriend'].forEach(id =>
      document.getElementById(id).addEventListener('change', render));
    document.getElementById('teamOut').addEventListener('click', ev => {
      const g = ev.target.closest('[data-goto]');
      if (g){ pushedHash = true; location.hash = g.dataset.goto; }
    });
  }

  return {init, render, extract, simulate, recommend};
})();
