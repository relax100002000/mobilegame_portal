#!/usr/bin/env python3
"""把內建瀏覽器抓下來的 cc_raw.json 轉成 cc/data/list.js 與 d0..d{N-1}.js

用法：python build_cc.py cc_raw.json ../data
cc_raw.json 格式：{"time": "...", "cc": {pid: {pid,name,tags,rc,date,obtain}}, "d": {pid: {img,f,secs}}}
"""
import json, re, sys, os

CHUNKS = 20
CLS = ['戦士', '騎士', '弓使い', '魔法使い', '僧侶']
WPN = ['斬', '打', '突', '弓', '魔', '聖', '拳', '銃', '狙']


def norm_date(s):
    m = re.search(r'(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})', s or '')
    return f'{m.group(1)}/{int(m.group(2)):02d}/{int(m.group(3)):02d}' if m else ''


def main(src, out):
    raw = json.load(open(src, encoding='utf-8'))
    cc, det = raw['cc'], raw.get('d', {})
    items, chunks = [], [dict() for _ in range(CHUNKS)]
    for pid_s, c in cc.items():
        pid = int(pid_s)
        d = det.get(pid_s) or {}
        f = dict(d.get('f') or {})
        # 舊版頁面「入手方法 | 登場日」是表頭＋值兩列，逐列解析會抓錯，改從表格補
        for sec in d.get('secs', []):
            if len(sec) >= 2 and sec[0] and re.sub(r'\s', '', sec[0][0]) == '入手方法' and len(sec[0]) >= 2 and re.sub(r'\s', '', sec[0][1]) == '登場日':
                f['入手方法'], f['登場日'] = sec[1][0], (sec[1][1] if len(sec[1]) > 1 else '')
        if re.fullmatch(r'登\s*場\s*日', f.get('入手方法', '')):
            f.pop('入手方法')
        rar_txt = f.get('レアリティ') or ''
        r = rar_txt.count('★') or (c.get('rc') or '').count('★')
        rl = re.sub(r'[★\s]', '', rar_txt)[:4]
        job = (f.get('職業') or '').split('/')[-1].strip()
        if job not in CLS:
            m = re.search(r'〈(.+?)〉', c.get('rc') or '')
            job = m.group(1) if m else ''
        w = (f.get('武器タイプ') or '').split('/')[0].strip()
        if w not in WPN:
            w = next((t for t in c.get('tags', []) if t in WPN), '')
        fa = f.get('所属') or ''
        if not fa:
            fa = next((t for t in c.get('tags', []) if t not in WPN and '★' not in t), '')
        if not r and not job:
            continue   # 連到所属頁等非角色頁
        item = {'id': pid, 'n': c.get('name') or f.get('名前') or '', 'r': r, 'rl': rl, 'c': job, 'w': w, 'fa': fa,
                'cost': f.get('コスト', ''), 'date': norm_date(f.get('登場日') or c.get('date')),
                'ob': f.get('入手方法') or c.get('obtain') or '', 'img': d.get('img') or ''}
        items.append({k: v for k, v in item.items() if v not in ('', None)})
        if d:
            chunks[pid % CHUNKS][pid] = {'f': f, 'secs': d.get('secs', [])}
    items.sort(key=lambda x: x['id'])
    os.makedirs(out, exist_ok=True)
    data = {'time': raw.get('time', ''), 'chunks': CHUNKS, 'list': items}
    with open(os.path.join(out, 'list.js'), 'w', encoding='utf-8') as fp:
        fp.write('window.CC_DATA = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
    for i, ch in enumerate(chunks):
        with open(os.path.join(out, f'd{i}.js'), 'w', encoding='utf-8') as fp:
            fp.write(f'(window.CC_DETAIL = window.CC_DETAIL || {{}})[{i}] = ' + json.dumps(ch, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print(len(items), 'items;', sum(1 for x in items if x.get('img')), 'with image;', sum(len(c) for c in chunks), 'details')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
