/* チェンクロ角色資料抓取（在 https://gamerch.com/chainchroniclewiki/419125 「アルカナクロニクル」頁面的 Console 執行）
 * 1. 由 25 個「★數〈職業〉」標籤頁＋本頁年表收集角色頁 id
 * 2. 逐頁抓角色頁（wiki 約每分鐘 20 頁的流量限制，全部約 80 分鐘；分頁要保持在前景）
 * 3. 完成後頁面左上出現 DOWNLOAD 連結，點下去存成 cc_raw.json
 * 4. python build_cc.py cc_raw.json ../data
 */
(async () => {
  const TAGS = {22352:'★★★〈戦士〉',22355:'★★★〈魔法使い〉',22359:'★★★〈弓使い〉',22361:'★★★★★〈魔法使い〉',22364:'★★★★★〈戦士〉',
    22367:'★★★★★〈騎士〉',22375:'★★★★★〈弓使い〉',22381:'★★★★★〈僧侶〉',22383:'★★★★〈戦士〉',22384:'★★★★〈騎士〉',22386:'★★★★〈弓使い〉',
    22389:'★★★★〈僧侶〉',22404:'★★〈戦士〉',22405:'★★★★〈魔法使い〉',22410:'★★〈騎士〉',22420:'★〈騎士〉',22422:'★〈僧侶〉',22426:'★★〈弓使い〉',
    22427:'★★〈魔法使い〉',22430:'★〈魔法使い〉',22432:'★★★〈僧侶〉',22434:'★★★〈騎士〉',22445:'★★〈僧侶〉',22457:'★〈戦士〉',22458:'★〈弓使い〉'};
  const BASE = 'https://gamerch.com/chainchroniclewiki/';
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const get = async url => { for (let a = 0; a < 8; a++){ const r = await fetch(url); if (r.status === 429){ await sleep(5000 * (a + 1)); continue; } return r.ok ? r.text() : null; } return null; };
  const cc = {}, det = {};
  // 1a. 標籤頁
  for (const tid of Object.keys(TAGS)){
    for (let page = 1; page < 200; page++){
      await sleep(1200);
      const html = await get(`${BASE}tag/${tid}?sort=2&page=${page}`); if (!html) break;
      const items = [...new DOMParser().parseFromString(html, 'text/html').querySelectorAll('.tag-detail > ul')];
      for (const ul of items){
        const a = ul.querySelector('li > a'); const pid = a && +(a.getAttribute('href').match(/\/(\d+)$/) || [])[1];
        if (pid && !cc[pid]) cc[pid] = {pid, name: a.textContent.trim(), tags: [...ul.querySelectorAll('.other-tag a')].map(x => x.textContent.trim()), rc: TAGS[tid]};
      }
      if (items.length < 20) break;
    }
    console.log('tag', tid, Object.keys(cc).length);
  }
  // 1b. 本頁年表（標籤沒標到的新角色）
  for (const t of document.querySelectorAll('.main table')) for (const r of t.rows){
    const cells = [...r.cells].map(c => c.textContent.trim());
    const link = [...r.querySelectorAll('a')].find(x => x.textContent.trim() === cells[2]); if (!link) continue;
    const pid = +(link.getAttribute('href').match(/\/(\d+)$/) || [])[1]; if (!pid) continue;
    cc[pid] = Object.assign(cc[pid] || {pid, name: cells[2], tags: [cells[3]].filter(Boolean), rc: null}, {date: cells[0], obtain: cells[1]});
  }
  // 2. 角色頁
  const parse = html => {
    const doc = new DOMParser().parseFromString(html, 'text/html'), main = doc.querySelector('.main') || doc.body;
    const norm = s => s.replace(/\s+/g, ' ').trim();
    let img = null;
    for (const el of main.querySelectorAll('img,source')){
      const s = el.getAttribute('data-src') || el.getAttribute('src') || (el.getAttribute('data-srcset') || '').split(/[ ,]/)[0] || '';
      const m = s.match(/\/resize\/([A-Za-z0-9+/=]+)/);
      if (m){ try{ const k = JSON.parse(atob(m[1])).key; if (/entry\//.test(k)){ img = k.replace(/^wiki\/3663\/entry\//, ''); break; } }catch(e){} }
      const m2 = s.match(/contents\/wiki\/3663\/entry\/([^?"]+)/); if (m2){ img = m2[1]; break; }
    }
    const f = {}, secs = [];
    const KEYS = ['名前','レアリティ','クラス','職業','所属','コスト','最大レベル','武器タイプ','ILLUST','CV','入手方法','登場日','バトル所属','絆ステタイプ'];
    for (const t of main.querySelectorAll('table')){
      let rows = [...t.rows].map(r => [...r.cells].map(c => norm(c.textContent).slice(0, 700))).filter(r => r.join('').replace(/サンプル/g, '').trim());
      if (!rows.length) continue;
      if (/^(画像|前面|VOICE|対応OS|タイトル|登場$|運命の物語|限界突破数)/.test((rows[0][0] || '').replace(/\s/g, ''))) continue;
      if (rows.length === 2 && rows[0].some(c => c.replace(/\s/g, '') === 'レアリティ') && rows[0].length === rows[1].length) rows[0].forEach((h, i) => { const k = h.replace(/\s/g, ''); if (KEYS.includes(k) && !f[k]) f[k] = rows[1][i]; });
      rows.forEach(r => { for (let i = 0; i + 1 < r.length; i += 2){ const k = r[i].replace(/\s/g, ''); if (KEYS.includes(k) && !f[k] && r[i + 1]) f[k] = r[i + 1]; } });
      secs.push(rows);
    }
    return {img, f, secs};
  };
  const ids = Object.keys(cc).map(Number).sort((a, b) => a - b);
  for (let i = 0; i < ids.length; i++){
    await sleep(1000);
    const html = await get(BASE + ids[i]); if (html) det[ids[i]] = parse(html);
    if (i % 50 === 0) console.log('page', i, '/', ids.length);
  }
  // 3. 下載連結
  const blob = new Blob([JSON.stringify({time: new Date().toISOString().slice(0, 10).replace(/-/g, '/'), cc, d: det})], {type: 'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'cc_raw.json'; a.textContent = 'DOWNLOAD cc_raw.json';
  a.style.cssText = 'position:fixed;top:10px;left:10px;z-index:999999;background:#ff0;padding:20px;font-size:24px;border:3px solid #000';
  document.body.appendChild(a);
  console.log('done', ids.length);
})();
