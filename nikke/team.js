/* 勝利女神：妮姬 爆裂組隊 — 5 人，確保爆裂 Ⅰ→Ⅱ→Ⅲ 能連續轉起來，再依敵人代碼加分
 * 依賴 index.html 的全域：data, owned, favOf, getJson, LOC, EL, EL_ORDER, STRONG, CLS, BURST, WP, esc, elTag, miUrl, pushedHash, lvLabel, pool
 * 冷卻需讀各妮姬的 roledata（只讀持有的，結果存 localStorage）。
 */
const TEAM = (() => {
  const ROLE_KEY = 'nikke_role_v1';
  let role = {};
  try{ role = JSON.parse(localStorage.getItem(ROLE_KEY)) || {}; }catch(e){ role = {}; }
  let loading = false;
  const STEP = {Step1:1, Step2:2, Step3:3};

  function digest(d){
    const txt = [d.skill1_detail, d.skill2_detail, d.ulti_skill_detail].filter(Boolean).map(s => s.description_localkey || '').join('\n');
    return {
      cd: d.ulti_skill_detail ? d.ulti_skill_detail.skill_cooltime / 100 : 40,
      heal: /恢復/.test(txt), shield: /屏障/.test(txt), taunt: /嘲諷/.test(txt),
      buff: /全體隊友[\s\S]{0,60}攻擊力[^▼\n]{0,25}▲/.test(txt),
      cdr: /爆裂技能冷卻時間[^▲\n]{0,20}▼|冷卻時間[^▲\n]{0,10}減少/.test(txt),
      gen: /爆裂量表|爆裂能量|爆裂充能/.test(txt),
      t: Date.now()
    };
  }
  async function loadRoles(list){
    const need = list.filter(x => !role[x.rid] || Date.now() - role[x.rid].t > 7 * 86400000);
    if (!need.length) return;
    loading = true;
    const info = document.getElementById('teamInfo');
    let done = 0;
    await pool(need, 6, async x => {
      const d = await getJson(`roledata/${x.rid}-v2-${LOC}.json`);
      role[x.rid] = digest(d);
      info.textContent = `讀取持有妮姬的技能資料… ${++done}/${need.length}`;
    });
    try{ localStorage.setItem(ROLE_KEY, JSON.stringify(role)); }catch(e){}
    loading = false;
  }
  function clearCache(){ role = {}; try{ localStorage.removeItem(ROLE_KEY); }catch(e){} }

  function unit(x, enemy){
    const v = owned.n[x.id] || 1, R = role[x.rid] || {cd:40};
    const f = favOf(x), fv = f ? owned.f[f.id] || 0 : 0;
    let sc = {SSR:10, SR:4, R:1}[x.r] + (Math.min(v, 4) - 1) * 0.8 + Math.max(0, v - 4) * 0.35 + fv * 1.2;
    const adv = enemy && STRONG[x.el] === enemy;
    if (x.cls === 'Attacker' && (x.b === 'Step3' || x.b === 'AllStep')) sc += 3;
    if (adv) sc += x.cls === 'Attacker' ? 5 : 1.5;
    const sus = x.cls === 'Defender' || R.heal || R.shield || R.taunt;
    if (sus) sc += 1;
    if (R.buff && x.b !== 'Step3') sc += 2;
    if (R.cdr) sc += 2;
    return {x, v, R, fv, adv, sus, sc};
  }
  function evalTeam(m){
    // 全爆裂約每 20 秒一輪：每段的「20／冷卻」加總 ≥ 1 才能每輪都放
    const cov = {1:0, 2:0, 3:0}, who = {1:[], 2:[], 3:[]};
    const flex = [];
    m.forEach(u => { const s = STEP[u.x.b]; if (s){ cov[s] += 20 / u.R.cd; who[s].push(u); } else flex.push(u); });
    flex.forEach(u => { const s = [1, 2, 3].sort((a, b) => cov[a] - cov[b])[0]; cov[s] += 20 / u.R.cd; who[s].push(u); u.as = s; });
    let pen = 0;
    [1, 2, 3].forEach(s => pen += 25 * Math.max(0, 1 - cov[s] + 1e-9));
    const anyCdr = m.some(u => u.R.cdr);
    if (anyCdr) pen *= 0.8;
    if (document.getElementById('tmHeal').checked && !m.some(u => u.sus)) pen += 8;
    const atk = m.filter(u => u.x.cls === 'Attacker').length;
    if (atk < 2) pen += (2 - atk) * 3;
    return {m, cov, who, ok:[1, 2, 3].every(s => cov[s] >= 0.999), sc: m.reduce((a, u) => a + u.sc, 0) - pen};
  }
  function combos(arr, k, fn, start = 0, cur = []){
    if (cur.length === k){ fn(cur.slice()); return; }
    for (let i = start; i <= arr.length - (k - cur.length); i++){ cur.push(arr[i]); combos(arr, k, fn, i + 1, cur); cur.pop(); }
  }
  function search(units){
    const by = b => units.filter(u => u.x.b === b).sort((a, c) => c.sc - a.sc);
    const cand = [...by('Step1').slice(0, 7), ...by('Step2').slice(0, 7), ...by('Step3').slice(0, 9), ...by('AllStep').slice(0, 3)];
    if (cand.length < 5) return [];
    const all = [];
    combos(cand, 5, m => all.push(evalTeam(m.map(u => ({...u, as:0})))));
    all.sort((a, b) => b.sc - a.sc);
    const out = [];
    for (const t of all){
      if (out.length >= 3) break;
      if (out.every(o => o.m.filter(u => t.m.some(w => w.x.id === u.x.id)).length <= 3)) out.push(t);
    }
    return out;
  }
  function mem(u){
    const x = u.x, tags = [];
    if (u.adv) tags.push('<span class="tm-tag t-own">剋制</span>');
    if (u.R.heal) tags.push('<span class="tm-tag">補</span>');
    if (u.R.shield) tags.push('<span class="tm-tag">盾</span>');
    if (u.R.taunt) tags.push('<span class="tm-tag">嘲諷</span>');
    if (u.R.buff) tags.push('<span class="tm-tag t-friend">增攻</span>');
    if (u.R.cdr) tags.push('<span class="tm-tag t-friend">減CD</span>');
    return `<div class="tm-mem" data-goto="n-${x.id}"><img src="${miUrl(x, 0)}" alt="">
      <span class="tm-tag t-${x.cls === 'Attacker' ? 'dps' : 'own'}">${BURST[x.b]}${u.as ? '→' + ['', 'Ⅰ', 'Ⅱ', 'Ⅲ'][u.as] : ''}・${u.R.cd}s</span>
      <div class="tm-nm">${esc(x.name)}</div><div class="tm-nm">${elTag(x.el)} ${x.r} ${lvLabel(x, u.v)}${u.fv ? '・寶P' + u.fv : ''}</div><div>${tags.join(' ')}</div></div>`;
  }
  function card(i, t){
    const rows = [1, 2, 3].map(s => `<tr><th>爆裂 ${['', 'Ⅰ', 'Ⅱ', 'Ⅲ'][s]}</th><td>${t.who[s].map(u => esc(u.x.name) + `（${u.R.cd}s）`).join('、') || '—'}</td>
      <td class="${t.cov[s] >= 0.999 ? 'tm-ok' : 'tm-ng'}">${t.cov[s] >= 0.999 ? '✓ 每輪可放' : t.cov[s] > 0 ? '△ 隔輪才能放' : '✗ 缺'}</td></tr>`).join('');
    return `<div class="tm-card"><div class="tm-head"><span class="tm-b ${t.ok ? 'ok' : 'mid'}">${i === 0 ? '推薦' : '替代 ' + i}</span>
      <small style="color:var(--sub)">分數 ${t.sc.toFixed(1)}${t.ok ? '' : '・爆裂循環不完整'}</small></div>
      <div class="tm-mems">${t.m.map(mem).join('')}</div>
      <table class="tm-w"><tr><th>段</th><th>成員（冷卻）</th><th>循環</th></tr>${rows}</table></div>`;
  }
  async function render(){
    const out = document.getElementById('teamOut'), info = document.getElementById('teamInfo');
    let own = data.list.filter(x => owned.n[x.id]);
    if (document.getElementById('tmSSR').checked) own = own.filter(x => x.r === 'SSR');
    if (own.length < 5){ out.innerHTML = '<div class="msg">請先在「妮姬」分頁勾選至少 5 位持有的妮姬。</div>'; info.innerHTML = ''; return; }
    if (loading) return;
    if (own.some(x => !role[x.rid])) out.innerHTML = '<div class="msg">讀取技能資料中（只有第一次比較久）…</div>';
    try{ await ensureFavs(); }catch(e){}
    try{ await loadRoles(own); }catch(err){ loading = false; }
    const enemy = document.getElementById('tmEl').value;
    const units = own.map(x => unit(x, enemy));
    const teams = search(units);
    const cnt = b => own.filter(x => x.b === b).length;
    info.innerHTML = `持有 ${own.length} 位：爆裂 Ⅰ ${cnt('Step1')}・Ⅱ ${cnt('Step2')}・Ⅲ ${cnt('Step3')}・全 ${cnt('AllStep')}。<br>
      規則：全爆裂約每 20 秒一輪，每段成員的「20 秒／冷卻」加總要 ≥1（例：Ⅲ 冷卻 40 秒需要 2 位）；「全」爆裂（小紅帽等）補到最缺的段。
      分數＝稀有度＋突破／核心＋收藏品，火力型放 Ⅲ 加分${enemy ? `，對「${EL[enemy]}」代碼有效的 ${EL[Object.keys(STRONG).find(k => STRONG[k] === enemy)]} 屬性加分（火力型加更多）` : ''}；
      全隊增攻、減爆裂冷卻、補／盾／嘲諷由技能文字判斷，僅供參考。`;
    out.innerHTML = teams.length ? teams.map((t, i) => card(i, t)).join('') : '<div class="msg">持有的妮姬不足以組成 5 人隊。</div>';
  }
  function init(){
    const sel = document.getElementById('tmEl');
    sel.innerHTML += EL_ORDER.map(e => `<option value="${e}">${EL[e]}（用 ${EL[Object.keys(STRONG).find(k => STRONG[k] === e)]} 打）</option>`).join('');
    ['tmEl', 'tmHeal', 'tmSSR'].forEach(id => document.getElementById(id).addEventListener('change', render));
    document.getElementById('teamOut').addEventListener('click', ev => {
      const g = ev.target.closest('[data-goto]');
      if (g){ pushedHash = true; location.hash = g.dataset.goto; }
    });
  }
  return {init, render, clearCache};
})();
