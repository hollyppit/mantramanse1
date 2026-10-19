const fs=require('node:fs'),assert=require('node:assert/strict');
const p='output/independent-reference-2026-10-17/';
const original=JSON.parse(fs.readFileSync(p+'cases.json','utf8'));
const x=JSON.parse(fs.readFileSync(p+'literature-conditions-32-rereview.json','utf8'));
const table=JSON.parse(fs.readFileSync(p+'literature-hidden-root-rereview.json','utf8')).hiddenTable;
assert.equal(x.cases.length,32);assert.equal(new Set(x.cases.map(c=>c.id)).size,32);
assert.equal(x.cases.filter(c=>c.parentReview).length,8);
const sourceIds=new Set(x.sources.map(s=>s.id));
for(const c of x.cases){
 const o=original.find(o=>o.id===c.id);assert.ok(o);assert.deepEqual(c.raw,o.raw);assert.equal(c.ruleId,o.ruleId);
 assert.equal(c.finalVerdict,'unknown');assert.equal(c.publishable,false);assert.equal(c.sourceConditionVerdict,'not-established');
 for(const field of [c.confirmed,c.applicationReview,c.heldReason])assert.ok(typeof field === 'string' && field.trim());
 for(const id of c.sourceIds)assert.ok(sourceIds.has(id));
 assert.equal(c.literalInventory.length,Object.values(c.raw.pillars).filter(Boolean).length);
 for(const f of c.literalInventory){assert.equal(f.pillar,c.raw.pillars[f.position]);assert.deepEqual(f.hiddenStems,table[f.pillar[1]]);assert.equal(f.strength,'unassessed');}
 if(c.parentReview){const parent=x.cases.find(r=>r.id===c.parentReview);assert.ok(parent);assert.deepEqual(c.raw.pillars,parent.raw.pillars);assert.ok(c.raw.targetYear&&c.raw.annualPillar&&c.raw.daewoonPillar);}
}
assert.equal(x.engineVerdictUsedAsTruth,false);assert.equal(x.externalAI,false);assert.equal(x.published,false);
const script=fs.readFileSync('tools/rereview-literature-conditions32.py','utf8');
for(const forbidden of ['comparison.json','engine.js','reference.json','subprocess','requests','urllib'])assert.ok(!script.includes(forbidden),forbidden);
const report=fs.readFileSync('docs/LITERATURE_CONDITIONS_32_REREVIEW_2026-10-17.md','utf8');
for(const c of x.cases)assert.equal(report.split('### '+c.id+' —').length-1,1);
console.log('PASS: all 32 individual records, 24 natal / 8 annual, raw data preserved, sources resolved, literal membership checked, all final verdicts held.');
console.log('Scope: record consistency only; not independent validation of traditional interpretation.');
