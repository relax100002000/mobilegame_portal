// 在 game8.jp 任一頁的 DevTools console 執行，下載 g8.json（サポカ名／［カード名］アイドル名 → img.game8.jp 路徑）
(async () => {
  const get = async u => { const h = await (await fetch(u)).text(); const d = new DOMParser().parseFromString(h, 'text/html');
    return [...d.querySelectorAll('img')].map(i => [i.getAttribute('data-src') || i.getAttribute('src'), i.alt]).filter(x => /img\.game8.*original/.test(x[0] || '') && /画像$/.test(x[1])); };
  const sup = {}, idol = {};
  for (const p of ['609148', '609149', '609150']){ for (const [u, a] of await get('https://game8.jp/gakuen-idolmaster/' + p)){ const n = a.replace(/画像$/, ''); if (!sup[n]) sup[n] = u.replace('https://img.game8.jp/', ''); } await new Promise(r => setTimeout(r, 800)); }
  for (const p of ['609099', '609100']){ for (const [u, a] of await get('https://game8.jp/gakuen-idolmaster/' + p)){ const n = a.replace(/画像$/, ''); if (/^［/.test(n) && !idol[n]) idol[n] = u.replace('https://img.game8.jp/', ''); } await new Promise(r => setTimeout(r, 800)); }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({sup, idol})], {type:'application/json'})); a.download = 'g8.json'; a.click();
})();
