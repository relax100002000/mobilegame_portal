# 學マス 說明資料：python build_desc.py <masterdata 目錄> <輸出 desc.js>
# 需要 IdolCard / CharacterDetail / ProduceCard / ProduceItem .yaml（vertesan/gakumasu-diff）
import yaml, json, re, sys, os
L = yaml.CLoader
src, out = sys.argv[1], sys.argv[2]
def load(n): return yaml.load(open(os.path.join(src, n + '.yaml'), encoding='utf-8'), Loader=L)
pc, pi, ic, cd = load('ProduceCard'), load('ProduceItem'), load('IdolCard'), load('CharacterDetail')
def txt(ds):
    s = ''
    for d in ds or []:
        t, ty = d.get('text') or '', d['produceDescriptionType']
        if ty == 'ProduceDescriptionType_PlainText' and not t: s += '\n'
        elif ty == 'ProduceDescriptionType_ProduceDescriptionName' and d.get('targetId') == 'Label_StyleDot': s += '・'
        else: s += t
    s = re.sub(r'<[^>]+>', '', s)
    s = '\n'.join(l.strip() for l in s.split('\n'))
    return re.sub(r'\n{2,}', '\n', s).strip()
PC = {(c['id'], c.get('upgradeCount', 0)): c for c in pc}
PI = {i['id']: i for i in pi}
CAT = {'ProduceCardCategory_ActiveSkill': 'アクティブ', 'ProduceCardCategory_MentalSkill': 'メンタル', 'ProduceCardCategory_Trouble': 'トラブル'}
def card(cid):
    r = []
    for u in (0, 1):
        c = PC.get((cid, u))
        if c: r.append({'n': c['name'], 'd': txt(c.get('produceDescriptions')), 'cat': CAT.get(c.get('category'), ''), 'st': c.get('stamina', 0), 'fst': c.get('forceStamina', 0)})
    return r
def item(iid):
    i = PI.get(iid)
    return {'n': i['name'], 'd': txt(i.get('produceDescriptions'))} if i else None
D = {}
for x in ic:
    e = {'card': card(x.get('produceCardId', '')), 'it': [t for t in (item(x.get('beforeProduceItemId')), item(x.get('afterProduceItemId'))) if t]}
    if x.get('secondProduceCardId'): e['card2'] = card(x['secondProduceCardId'])
    D[x['id']] = e
LAB = {'Grade': '学年', 'Height': '身長', 'Weight': '体重', 'BloodType': '血液型', 'ThreeSize': 'スリーサイズ', 'ZodiacSign': '星座', 'Cv': 'CV', 'Age': '年齢', 'Birthday': '誕生日', 'DominantHand': '利き手', 'Birthplace': '出身地', 'SpecialSkill': '特技', 'Hobby': '趣味', 'Introduction': '紹介'}
P = {}
for r in sorted(cd, key=lambda r: (r['characterId'], r['order'])):
    t = r['type'].replace('CharacterDetailType_', '')
    v = str(r['content']) + ('cm' if t == 'Height' else 'kg' if t == 'Weight' else '歳' if t == 'Age' else '')
    P.setdefault(r['characterId'], []).append([LAB.get(t, t), v])
open(out, 'w', encoding='utf-8').write('/* 学マス 固有スキルカード・Pアイテム・プロフィール（vertesan/gakumasu-diff masterdata，gakumas/tools/build_desc.py 產生） */\nwindow.GK_DESC=' + json.dumps({'i': D, 'p': P}, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(len(D), len(P))
