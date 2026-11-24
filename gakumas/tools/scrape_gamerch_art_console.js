/* 學マス Pアイドル カードイラスト抓取：在 https://gamerch.com/gakumasu/850392（プロデュースアイドル一覧）的 console 執行。
 * 逐頁讀各カード頁（間隔 2.5 秒，約 6 分鐘），取 alt＝「キャラ名（カード名）」的圖片 key，對照 masterdata IdolCard 後下載 art.json。
 * 之後把內容貼進 gakumas/art.js：window.GK_ART={i_card-id:[覚醒前key, 覚醒後key]}。新卡 wiki 還沒建頁就沒有圖（頁面會改用 game8 小圖）。 */
(async () => {
  const nz = s => String(s).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '').replace(/[ー〜～]/g, '');
  const dec = s => { const m = s.match(/resize\/([^?"]+)/); if (m) try { return JSON.parse(atob(m[1])).key; } catch (e) {} const k = s.match(/contents\/(wiki\/4990\/entry\/[^?"]+)/); return k ? k[1] : ''; };
  const links = new Map();
  document.querySelectorAll('a').forEach(x => { const t = x.textContent.trim(); if (/gamerch\.com\/gakumasu\/\d+$/.test(x.href) && /^.+（.+）$/.test(t)) links.set(x.href, t); });
  const G = {};
  for (const [u, t] of links){
    const r = await fetch(u); if (r.status === 429){ await new Promise(z => setTimeout(z, 30000)); continue; }
    const d = new DOMParser().parseFromString(await r.text(), 'text/html');
    const ks = [...new Set([...d.querySelectorAll('img')].filter(i => i.alt === t).map(i => dec(i.getAttribute('data-src') || i.getAttribute('src') || '')).filter(Boolean))];
    const m = t.replace('ようそこ', 'ようこそ').match(/^(.+)（(.+)）$/); G[nz(m[2] + m[1])] = ks.map(k => k.replace('wiki/4990/entry/', ''));
    console.log(Object.keys(G).length, '/', links.size, t);
    await new Promise(z => setTimeout(z, 2500));
  }
  const MD = 'https://raw.githubusercontent.com/vertesan/gakumasu-diff/main/';
  const ct = await (await fetch(MD + 'Character.yaml')).text(), it = await (await fetch(MD + 'IdolCard.yaml')).text(), C = {};
  ct.split(/\n- id: /).forEach(b => { const id = b.split('\n')[0].replace('- id: ', '').trim(), ln = (b.match(/\n  lastName: (.*)/) || [])[1], fn = (b.match(/\n  firstName: (.*)/) || [])[1]; if (ln) C[id] = ln + fn; });
  const A = {};
  it.split(/\n- id: /).forEach(b => { const id = b.split('\n')[0].replace('- id: ', '').trim(), cid = (b.match(/\n  characterId: (.*)/) || [])[1], n = ((b.match(/\n  name: (.*)/) || [])[1] || '').replace(/^"|"$/g, ''); const k = cid && G[nz(n + C[cid])]; if (k && k.length) A[id] = k; });
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(A)], {type:'application/json'})); a.download = 'art.json'; a.click();
  console.log('done', Object.keys(A).length);
})();
