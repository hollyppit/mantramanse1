import json,pathlib
p=pathlib.Path('output/independent-reference-2026-10-17')
x=json.loads((p/'self-combination-three-comparators.json').read_text(encoding='utf-8'))
a={c['id']:c for c in json.loads((p/'cases.json').read_text(encoding='utf-8-sig'))}
assert {r['id'] for r in x['reviews']}=={'G06-N','G09-N','G17-N'}
c={c['id']:c for c in x['comparators']}
assert len(c)==4
expected={'H01':['辛酉','壬辰','丁巳','甲辰'],'H02':['丁丑','癸丑','庚子','乙酉'],'H03':['丁巳','戊申','癸丑','乙卯'],'H04':['戊子','戊午','癸酉','戊午']}
for k,v in expected.items(): assert c[k]['pillars']==v
for r in x['reviews']:
 assert r['raw']==a[r['id']]['raw']
 assert r['finalVerdict']==r['effectiveAction']=='unknown' and not r['publishable']
 for k in r['comparators']: assert c[k]['target']==r['id']
 assert len(r['conditions'])==3 and r['confirmed'] and r['held']
 assert all(c[k]['pillars']!=list(r['raw']['pillars'].values()) for k in r['comparators'])
g=a['G17-N']['raw']['pillars']; h=c['H03']['pillars']
assert h[0]==g['year'] and h[1]==g['month'] and h[2][0]==g['day'][0]
assert h[2][1]!=g['day'][1] and h[3]!=g['hour']
assert not x['engineTruthUsed'] and not x['externalAI'] and not x['published']
print('PASS: 3 source cases preserved; 4 comparator pillar records; H03 partial match and critical differences; all effective-action judgments held.')
print('Checks cover record integrity, not scholarly or predictive correctness.')
