/* 滑鼠移到圖片上時顯示放大圖（共用）
 * 清單卡片／組隊頭像：游標旁顯示放大圖（最大 340x480），有 data-big 時載入後替換。
 * 詳細資料視窗裡的立繪（.dart img）：畫面中央顯示原圖解析度（超過視窗才縮小）。
 * 只在有滑鼠的裝置啟用。
 */
(() => {
  if (!window.matchMedia || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const SEL = '.item .img img, .tm-mem img, #dlg .dart img';
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;z-index:30;pointer-events:none;display:none;padding:4px;border-radius:10px;' +
    'background:var(--card,#fff);box-shadow:0 10px 30px rgba(0,0,0,.35);border:1px solid var(--line,#ddd)';
  const img = document.createElement('img');
  const THUMB = 'display:block;max-width:340px;max-height:480px;min-width:200px;width:auto;height:auto;object-fit:contain;border-radius:7px';
  const FULL = 'display:block;max-width:calc(100vw - 32px);max-height:calc(100vh - 32px);min-width:0;width:auto;height:auto;object-fit:contain;border-radius:7px';
  img.style.cssText = THUMB;
  let full = false;
  box.appendChild(img);
  document.addEventListener('DOMContentLoaded', () => document.body.appendChild(box));
  if (document.body) document.body.appendChild(box);

  const bad = new Set();   // 載入失敗的大圖不再嘗試
  let cur = null, mx = 0, my = 0;
  function place(x, y){
    mx = x; my = y;
    if (full){   // 原圖模式：置中
      box.style.left = Math.max(4, (innerWidth - box.offsetWidth) / 2) + 'px';
      box.style.top = Math.max(4, (innerHeight - box.offsetHeight) / 2) + 'px';
      return;
    }
    const w = box.offsetWidth, h = box.offsetHeight, m = 16;
    let left = x + m, top = y + m;
    if (left + w > innerWidth - 8) left = x - w - m;
    if (top + h > innerHeight - 8) top = Math.max(8, innerHeight - h - 8);
    box.style.left = Math.max(8, left) + 'px';
    box.style.top = top + 'px';
  }
  document.addEventListener('mouseover', ev => {
    const t = ev.target.closest && ev.target.closest(SEL);
    if (!t || t === cur) return;
    full = !!t.closest('#dlg');
    if (!full && document.body.classList.contains('lock')) return;   // 詳細資料視窗開著時，清單縮圖不顯示
    cur = t;
    img.style.cssText = full ? FULL : THUMB;
    box.style.zIndex = full ? 40 : 30;
    img.src = t.currentSrc || t.src;
    const big = t.dataset.big;
    if (big && !bad.has(big)){
      const pre = new Image();
      pre.onload = () => { if (cur === t) img.src = big; };
      pre.onerror = () => bad.add(big);
      pre.src = big;
    }
    box.style.display = 'block';
    place(ev.clientX, ev.clientY);
  });
  document.addEventListener('mousemove', ev => { if (cur) place(ev.clientX, ev.clientY); });
  document.addEventListener('mouseout', ev => {
    if (!cur) return;
    const to = ev.relatedTarget;
    if (to && to.closest && to.closest(SEL) === cur) return;
    if (ev.target.closest && ev.target.closest(SEL) !== cur) return;
    cur = null; box.style.display = 'none';
  });
  document.addEventListener('click', () => { cur = null; box.style.display = 'none'; }, true);
  img.addEventListener('load', () => { if (cur) place(mx, my); });
})();
