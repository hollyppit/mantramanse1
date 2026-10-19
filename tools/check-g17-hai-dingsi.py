import json,pathlib
p=pathlib.Path('output/independent-reference-2026-10-17')
x=json.loads((p/'g17-hai-dingsi-effect-review.json').read_text(encoding='utf-8'))
a=next(c for c in json.loads((p/'cases.json').read_text(encoding='utf-8-sig')) if c['id']=='G17-N')
assert x['raw']==a['raw']
assert list(x['raw']['pillars'].values())==['丁巳','戊申','癸亥','丁巳']
assert x['baseline']['pillars']==['丁巳','戊申','癸丑','乙卯']
d,h=x['changes'];assert d['removedHidden']==['癸','辛','己'] and d['addedHidden']==['壬','甲']
assert h['removedHidden']==['乙'] and set(h['addedHidden'])==set('庚丙戊')
clashes={tuple(e['positions']):e['adjacent'] for e in x['edges'] if e['kind']=='clash'}
assert clashes=={('day','hour'):True,('year','day'):False}
assert x['raw']['pillars']['month']=='戊申'
assert all('寅' not in v for v in x['raw']['pillars'].values())
assert len(x['comparators'])==4 and len(x['questions'])==5
source={s['id'] for s in x['sources']}; comp={c['id'] for c in x['comparators']}
for q in x['questions']:
 assert all(s in source for s in q['sources']) and all(c in comp for c in q['comparator'])
 assert q['confirmed'] and q['held'] and q['needs']
for k in ['finalVerdict','officialEffectiveness','sealEffectiveness']:assert x[k]=='unknown'
for k in ['publishable','engineTruthUsed','externalAI','published']:assert x[k] is False
print('PASS: G17 raw pillars, H03 baseline, hidden-stem replacements, adjacent vs distant edges, 5 evidence scopes and held status.')
print('Record integrity checked; no claim of independent traditional-effectiveness validation.')
