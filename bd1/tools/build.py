import json,re,os,sys
d=json.load(open('bd.json'));D,M=d['D'],d['M']
T=json.load(open('tr_all.json'))
NUM=re.compile(r'[-+]?\d+(\.\d+)?')
miss=set()
def tl(l):
    l=l.strip()
    if not l: return l
    if l in T: return T[l]
    key=NUM.sub('#',l)
    t=T.get(key)
    if t is None:
        miss.add(l); return l
    nums=[m.group(0) for m in NUM.finditer(l)]
    out=[];i=0
    for ch in re.split(r'(#)',t):
        if ch=='#': out.append(nums[i] if i<len(nums) else '#'); i+=1
        else: out.append(ch)
    return ''.join(out)
def tx(s): return '\n'.join(tl(x) for x in (s or '').split('\n'))
PRE={'상급 ':'上級','최상급 ':'最上級','하급 ':'下級'}
def tn(n):
    if not n: return n
    if n in T: return T[n]
    for k,v in PRE.items():
        if n.startswith(k): return v+tn(n[len(k):])
    m=re.match(r'^(.*?) ?(II|III|Ⅱ|Ⅲ)$',n)
    if m and m.group(1) in T: return T[m.group(1)]+' '+m.group(2)
    miss.add(n); return n
TARGET={'STST_FIRST':'最前','STST_LAST':'最後','STST_RANDOM':'隨機','STST_SECOND':'跳一格','STST_SUPPORT_NEXT_SEQUENCE':'下一順序','STST_THIRD':'跳兩格','STST_SELF_TARGET':'自身','STST_STARTBUFF':'戰鬥開始','STST_INDUCING_CHAOS':'混亂誘導'}
lst=[];det={}
for x in D['mercs']:
    h=x['h'];m=M['m'][str(h)]
    base=m['stg'][0]['fn']
    stg=[]
    for s in m['stg']:
        arr=M['skill'].get(str(s['sk'])) or []
        stg.append({'s':s['s'],'aw':s['fn']!=base,'fn':tn(s['fn']),'d':tn(s['d']) if s['d'] in T else tx(s['d']),'st':s['st'],'ml':s['ml'],'co':s['co'],'bv':s.get('bv'),'card':s['card'],'icon':s['icon'],'sk':s['sk'],'mx':max(0,len(arr)-1)})
    cos=[{'n':(T.get(c['n']) or {'기본 복장':'基本服裝','각성 복장':'覺醒服裝'}.get(c['n']) or c['n']),'card':c['card']} for c in (m.get('cos') or [])]
    lst.append({'h':h,'n':tn(x['n']),'nk':x['n'],'t':x['t'],'c':x['c'],'o':x.get('o'),'src':x.get('src'),'stg':stg,'cos':cos,'set':m.get('set')})
    # detail
    sk={};bf={}
    for s in m['stg']:
        key=str(s['sk'])
        if key in sk: continue
        lv=[]
        for e in M['skill'].get(key) or []:
            lv.append({'n':tn(e['n']),'r':e['r'],'st':TARGET.get(e['st'],e['st']),'ty':e['ty'],'b':e.get('b') or [],'sb':e.get('sb') or []})
            for bid in (e.get('b') or [])+(e.get('sb') or []):
                b=M['buff'].get(str(bid))
                if b and str(bid) not in bf:
                    bf[str(bid)]={'n':tn(b.get('n')),'ty':tx(b.get('ty')),'at':tx(b.get('at')),'tu':tx(b.get('tu')),'tg':tx(b.get('tg')),'x':tx(b.get('x')),'ex':tx(b.get('ex')),'i':b.get('i'),'d':b.get('d')}
        sk[key]=lv
    my=None
    if m.get('myth'):
        f=m['myth']['fixed']
        my={'fixed':{'n':tn(f['n']),'ty':tx(f['ty']),'tg':tx(f['tg']),'at':tx(f['at']),'tu':tx(f['tu']),'x':tx(f['x']),'i':f.get('i')},'slots':[{'n':s['n'],'c':[tn(c) for c in s['c']]} for s in m['myth']['slots']]}
    prof=m.get('prof') or {}
    det[h]={'sk':sk,'bf':bf,'my':my,'prof':{'who':prof.get('who'),'ttl':prof.get('ttl'),'say':prof.get('say')}}
print('missing',len(miss))
json.dump(sorted(miss),open('miss.json','w'),ensure_ascii=False,indent=0)
os.makedirs('out/data',exist_ok=True)
open('out/data/list.js','w',encoding='utf-8').write('window.BD1_LIST='+json.dumps(lst,ensure_ascii=False,separators=(',',':'))+';\n')
groups={}
idx={x['h']:i for i,x in enumerate(lst)}
for h,v in det.items(): groups.setdefault(idx[h]%20,{})[h]=v
for x in lst: x['g']=idx[x['h']]%20
for g,v in groups.items():
    open(f'out/data/d{g}.js','w',encoding='utf-8').write('window.BD1_D=window.BD1_D||{};Object.assign(window.BD1_D,'+json.dumps(v,ensure_ascii=False,separators=(',',':'))+');\n')
sets={k:{'n':v['n'],'lab':v['lab'],'lv':v['lv'],'mem':[mm['h'] for mm in v['mem']]} for k,v in M['set'].items()}
print('sets sample',list(sets.items())[:1])
