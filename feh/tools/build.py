"""FEH 靜態資料：python build.py feh_raw.json <輸出 data 目錄>
feh_raw.json＝在 feheroes.fandom.com 用 tools/export_console.js 匯出（Cargo：Units/UnitStats/UnitSkills/Skills/Languages）。
"""
import json, sys, os, re, hashlib, datetime, html
F = json.load(open(sys.argv[1], encoding='utf-8'))
out = sys.argv[2]
today = datetime.date.today().isoformat()
L = {l['pg']: l['ChineseTW'] for l in F['Languages'] if l['ChineseTW']}
ORIGIN = {
 'Fire Emblem: Shadow Dragon and the Blade of Light': '暗黑龍與光之劍', 'Fire Emblem: Mystery of the Emblem': '紋章之謎',
 'Fire Emblem: Shadow Dragon': '新・暗黑龍與光之劍', 'Fire Emblem: New Mystery of the Emblem': '新・紋章之謎',
 'Fire Emblem Gaiden': '外傳', 'Fire Emblem Echoes: Shadows of Valentia': 'Echoes 另一位英雄王',
 'Fire Emblem: Genealogy of the Holy War': '聖戰之系譜', 'Fire Emblem: Thracia 776': '多拉基亞776',
 'Fire Emblem: The Binding Blade': '封印之劍', 'Fire Emblem: The Blazing Blade': '烈火之劍', 'Fire Emblem: The Sacred Stones': '聖魔之光石',
 'Fire Emblem: Path of Radiance': '蒼炎之軌跡', 'Fire Emblem: Radiant Dawn': '曉之女神', 'Fire Emblem Awakening': '覺醒',
 'Fire Emblem Fates': 'if', 'Fire Emblem: Three Houses': '風花雪月', 'Fire Emblem Engage': 'Engage',
 'Tokyo Mirage Sessions ♯FE': '幻影異聞錄♯FE', 'Tokyo Mirage Sessions ♯FE Encore': '幻影異聞錄♯FE Encore',
 'Fire Emblem Heroes': '英雄雲集', 'Fire Emblem Warriors': '無雙', 'Fire Emblem Warriors: Three Hopes': '無雙 風花雪月',
 'Fire Emblem Shadows': 'Fire Emblem Shadows', 'Fire Emblem Cipher': 'Cipher', 'Fire Emblem: Fortune\'s Weave': "Fortune's Weave",
}
def zh(k, d=None): return L.get(k) or d or k
def h2(fn):
    fn = fn.replace(' ', '_'); return hashlib.md5(fn.encode('utf-8')).hexdigest()[:2]
def clean(s):
    s = html.unescape(s or '')
    s = re.sub(r'<br\s*/?>', '\n', s); s = re.sub(r'<[^>]+>', '', s)
    s = re.sub(r"\[\[(?:[^|\]]*\|)?([^\]]*)\]\]", r'\1', s); s = s.replace("'''", '').replace("''", '')
    return re.sub(r'\n{2,}', '\n', s).strip()
def skname(s):
    n = zh(s['pg'], s['Name']); en = s['Name']
    m = re.search(r'(\s\d|\+)$', en)
    if m and not n.endswith(m.group(1).strip()): n += m.group(1).strip()
    return n
stats = {s['WikiName']: s for s in F['UnitStats']}
US = {}
for r in F['UnitSkills']: US.setdefault(r['WikiName'], []).append(r)
SK = {}
for s in F['Skills']: SK.setdefault(s['WikiName'], s)
refines = {}
for s in F['Skills']:
    if s['RefinePath'] and s['Scategory'] == 'weapon': refines.setdefault(s['GroupName'], []).append(s)
KEEP = {'legendary', 'mythic', 'duo', 'harmonized', 'rearmed', 'ascended', 'attuned', 'emblem', 'aide', 'entwined', 'chosen', 'special', 'brave', 'fallen', 'resplendent', 'limited', 'ghb', 'tempest', 'refresher'}
units, used, origins = [], set(), []
for u in F['Units']:
    pr = set(u['Properties'] or [])
    if 'enemy' in pr or 'generic' in pr: continue
    if not u['ReleaseDate'] or u['ReleaseDate'] > today: continue
    s = stats.get(u['WikiName'])
    if not s: continue
    w = u['WikiName']
    og = []
    for e in (u['Origin'] or '').split(','):
        e = e.strip()
        if not e: continue
        if e not in origins: origins.append(e)
        og.append(origins.index(e))
    sk = []
    for r in sorted(US.get(w, []), key=lambda r: (r['skillPos'] or 0)):
        x = SK.get(r['skill'])
        if not x: continue
        used.add(r['skill'])
        sk.append([r['skill'], r['unlockRarity'] or 0, r['defaultRarity'] or 0])
    tw = zh(u['Name'] + ': ' + u['Title'] + '/Misc', '')
    tt, nn = (tw.split('　', 1) if '　' in tw else ('', tw))
    units.append({'i': u['IntID'], 'w': w, 'n': nn or u['Name'], 't': tt or u['Title'], 'en': u['Name'] + ': ' + u['Title'], 'p': u['Person'] or u['Name'],
        'o': og, 'g': (u['Gender'] or '')[:1], 'wt': u['WeaponType'], 'mv': u['MoveType'], 'pr': sorted(pr & KEEP), 'rd': u['ReleaseDate'],
        'st': [s['Lv1HP5'], s['Lv1Atk5'], s['Lv1Spd5'], s['Lv1Def5'], s['Lv1Res5']], 'gr': [s['HPGR3'], s['AtkGR3'], s['SpdGR3'], s['DefGR3'], s['ResGR3']],
        'h': [h2(w + ' Face FC.webp') if 'noFC' not in pr else '', h2(w + ' Face.webp'), h2(w + ' BtlFace.webp')],
        'ar': u['Artist'] or '', 've': u['ActorEN'] or '', 'vj': u['ActorJP'] or '', 'ds': clean(u['Description']), 'sk': sk})
units.sort(key=lambda x: (x['rd'], x['i']), reverse=True)
skills = {}
for k in used:
    s = SK[k]
    e = {'n': skname(s), 'en': s['Name'], 'c': s['Scategory'], 'd': clean(s['Description'])}
    if s['Might']: e['mt'] = s['Might']
    if s['SP']: e['sp'] = s['SP']
    if s['Cooldown']: e['cd'] = s['Cooldown']
    if s['Exclusive']: e['ex'] = 1
    if s['Scategory'] == 'weapon' and s['UseRange']: e['rg'] = s['UseRange']
    if s['StatModifiers'] and s['Scategory'] != 'weapon' and s['StatModifiers'] != '0,0,0,0,0': e['sm'] = s['StatModifiers']
    rf = [r for r in refines.get(s['GroupName'], []) if r['Name'] == s['Name']] if s['Scategory'] == 'weapon' else []
    if rf:
        st = [r for r in rf if r['RefinePath'] in ('atk', 'spd', 'def', 'res')]
        base = clean(st[0]['Description']) if st else ''
        R = {'d': base, 's': {r['RefinePath']: r['StatModifiers'] for r in st}, 'e': []}
        for r in rf:
            if r['RefinePath'] in ('atk', 'spd', 'def', 'res'): continue
            d = clean(r['Description'])
            if base and d.startswith(base): d = d[len(base):].lstrip('\n')
            R['e'].append({'p': r['RefinePath'], 'd': d, 's': r['StatModifiers']})
        e['rf'] = R
    skills[k] = e
os.makedirs(out, exist_ok=True)
og = [ORIGIN.get(o, zh(o, o)) if o in ORIGIN else o for o in origins]
open(os.path.join(out, 'list.js'), 'w', encoding='utf-8').write('/* FEH 英雄清單（feheroes.fandom.com Cargo 靜態快照 %s；tools/build.py 產生） */\nwindow.FEH={d:"%s",o:%s,u:%s};\n' % (today, today, json.dumps(og, ensure_ascii=False), json.dumps(units, ensure_ascii=False, separators=(',', ':'))))
open(os.path.join(out, 'skills.js'), 'w', encoding='utf-8').write('/* FEH 技能（名稱繁中，效果英文；%s） */\nwindow.FEH_SK=%s;\n' % (today, json.dumps(skills, ensure_ascii=False, separators=(',', ':'))))
print(len(units), len(skills), len(origins), [o for o in origins if o not in ORIGIN])
