"""g8.json（scrape_game8_console.js 下載）＋ gakumas-tools 的 idols.csv／p_idols.csv → ../img.js
用法：python build_img.py g8.json idols.csv p_idols.csv
csv 來源：https://raw.githubusercontent.com/gakumas-tools/gakumas-tools/master/packages/gakumas-data/csv/
"""
import json, csv, re, sys, unicodedata, os
def nz(s):
    s = unicodedata.normalize('NFKC', s)
    s = ''.join(ch for ch in s if unicodedata.category(ch)[0] in 'LN')
    return re.sub('[ー〜～]', '', s)
g8 = json.load(open(sys.argv[1], encoding='utf-8'))
names = {r['id']: r['name'].replace(' ', '') for r in csv.DictReader(open(sys.argv[2], encoding='utf-8-sig'))}
tools = {nz(r['title'] + names.get(r['idolId'], '')): int(r['id']) for r in csv.DictReader(open(sys.argv[3], encoding='utf-8-sig'))}
out = {'s': {nz(k): v for k, v in g8['sup'].items()}, 'i': {nz(k): v for k, v in g8['idol'].items()}, 't': tools}
dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'img.js')
open(dst, 'w', encoding='utf-8').write('/* 學マス 圖片對照（由 game8 一覧頁與 gakumas-tools 整理；key＝名稱正規化 nz()） */\nwindow.GK_IMG=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
print('sup', len(out['s']), 'idol', len(out['i']), 'tools', len(tools))
