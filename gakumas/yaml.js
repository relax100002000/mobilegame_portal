/* 學マス masterdata 用的極簡 YAML（block 樣式，2 空格縮排）解析 */
function yamlParse(src){
  const L = src.split('\n'); let i = 0;
  const ind = s => s.length - s.trimStart().length;
  function scalar(v){
    v = v.replace(/^[ \t]+|[ \t]+$/g, '');
    if (v === '' ) return null;
    if (v[0] === '"') { try { return JSON.parse(v); } catch(e) { return v.slice(1, -1); } }
    if (v[0] === "'") return v.slice(1, -1).replace(/''/g, "'");
    if (v === '[]') return [];
    if (v === '{}') return {};
    if (v === 'true') return true;
    if (v === 'false') return false;
    if (v === 'null' || v === '~') return null;
    if (/^-?\d+(\.\d+)?$/.test(v) && v.length < 16) return Number(v);
    return v;
  }
  function skip(){ while (i < L.length && (L[i].trim() === '' || L[i].trimStart()[0] === '#')) i++; }
  function block(n){   // 解析縮排 = n 的區塊
    skip(); if (i >= L.length) return null;
    const t = L[i].slice(n);
    return t.startsWith('- ') || t === '-' ? seq(n) : map(n);
  }
  function seq(n){
    const out = [];
    while (true){
      skip(); if (i >= L.length) break;
      const line = L[i]; if (ind(line) !== n || !(line.slice(n).startsWith('- ') || line.slice(n) === '-')) break;
      const rest = line.slice(n + 2);
      if (line.slice(n) === '-' ){ i++; out.push(block(n + 2)); continue; }
      if (/^[^\s"'][^:]*:(\s|$)/.test(rest) && !/^https?:/.test(rest)){   // "- key: val" → map 從 n+2 開始
        L[i] = ' '.repeat(n + 2) + rest; out.push(map(n + 2));
      } else { out.push(scalar(rest)); i++; }
    }
    return out;
  }
  function map(n){
    const out = {};
    while (true){
      skip(); if (i >= L.length) break;
      const line = L[i]; if (ind(line) !== n) break;
      const t = line.slice(n); if (t.startsWith('- ')) break;
      const m = /^([^:]+?):(?:\s+(.*))?$/.exec(t);
      if (!m){ i++; continue; }
      const k = m[1], v = m[2];
      i++;
      if (v === undefined || v === ''){
        skip();
        if (i < L.length && (ind(L[i]) > n || (ind(L[i]) === n && L[i].slice(n).startsWith('- ')))) out[k] = block(ind(L[i]));
        else out[k] = null;
      } else if (/^[|>][-+]?$/.test(v)){   // block scalar
        const buf = []; let bi = -1;
        while (i < L.length && (L[i].trim() === '' || ind(L[i]) > n)){ if (bi < 0 && L[i].trim() !== '') bi = ind(L[i]); buf.push(L[i]); i++; }
        while (buf.length && buf[buf.length - 1].trim() === '') buf.pop();
        let txt = buf.map(l => l.slice(bi < 0 ? 0 : bi)).join(v[0] === '>' ? ' ' : '\n');
        if (!v.endsWith('-') && buf.length) txt += '\n';
        out[k] = txt;
      } else out[k] = scalar(v);
    }
    return out;
  }
  return block(0);
}

