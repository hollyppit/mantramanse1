import pathlib,json
p=pathlib.Path('output/independent-reference-2026-10-17')
x=json.loads((p/'g17-hai-versus-shen-support.json').read_text(encoding='utf-8'))
a=next(c for c in json.loads((p/'cases.json').read_text(encoding='utf-8-sig')) if c['id']=='G17-N')
assert x['raw']==a['raw']
c={c['id']:c for c in x['comparators']}
assert len(c)==4
assert c['R01']['pillars']==['壬申','丙午','癸亥','戊午']
assert c['R02']['pillars']==['甲寅','辛未','癸亥','戊午']
assert c['R03']['pillars']==['戊子','庚申','壬寅','辛丑']
assert c['J01']['pillars']==['甲寅','壬申','癸巳','癸亥']
assert all(v['pillars']!=list(x['raw']['pillars'].values()) for v in c.values())
assert {r['id'] for r in x['paths']}=={'H','S-metal','S-water'}
for r in x['paths']: assert r['status']=='unknown' and r['reason'] and len(r['preservationNeed'])==3
assert len({(r['hai'],r['shen']) for r in x['scenarioChecks']})==4
assert x['finalVerdict']=='unknown' and x['exactFullMatchCount']==0
for k in ['publishable','engineTruthUsed','externalAI','published']:assert x[k] is False
print('PASS: G17 preserved; 4 comparator pillars and 3 distinct paths; no whole-chart result substituted for root preservation; all verdicts held.')
