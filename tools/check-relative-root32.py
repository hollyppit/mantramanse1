import json,pathlib
p=pathlib.Path('output/independent-reference-2026-10-17')
x=json.loads((p/'relative-root-narrowing32.json').read_text(encoding='utf-8'))
a=json.loads((p/'cases.json').read_text(encoding='utf-8-sig'))
assert len(x['cases'])==len(a)==32
assert len({r['id'] for r in x['cases']})==32
refs={s['id'] for s in x['sources']}
rows={r['id']:r for r in x['cases']}
for c in a:
 r=rows[c['id']]; assert r['raw']==c['raw'] and r['ruleId']==c['ruleId']
 assert r['finalVerdict']==r['rootEffectiveness']=='unknown' and not r['publishable']
 assert all(s in refs for s in r['sourceIds'])
 assert all(r[k].strip() for k in ['narrowedConclusion','remainingRelativeComparison','requiredEvidence'])
 if r['parentReview']: assert r['raw']['pillars']==rows[r['parentReview']]['raw']['pillars']
# 独立な具体 fixture: 日主の支援と支そのものの冲を混同しない
for cid in ['G03-N','G19-N','G24-N']:
 assert not any(f['sameElement'] for f in rows[cid]['carrierInventory']),cid
f=next(f for f in rows['G20-N']['carrierInventory'] if f['position']=='day')
assert f['sameElement']==['己'] and f['directClashPositions']==['month']
f=next(f for f in rows['G14-N']['carrierInventory'] if f['position']=='day')
assert f['sameElement']==['癸'] and f['directClashPositions']==['hour']
f=next(f for f in rows['G15-N']['carrierInventory'] if f['position']=='month')
assert f['sameElement']==['丁'] and f['directClashPositions']==['day']
for cid in ['G02-N','G12-N']: assert not any(f['directClashPositions'] for f in rows[cid]['carrierInventory'])
assert sum(bool(r['parentReview']) for r in rows.values())==8
assert not x['engineTruthUsed'] and not x['externalAI'] and not x['published']
report=pathlib.Path('docs/RELATIVE_ROOT_NARROWING_32_2026-10-17.md').read_text(encoding='utf-8')
for cid in rows: assert report.count('### '+cid+'\n')==1
print('PASS: 32 raw records preserved, 8 annual links, concrete carrier/clash fixtures, sources and all held verdicts verified.')
print('Record validation only; no expert-consensus or traditional-strength accuracy claim.')
