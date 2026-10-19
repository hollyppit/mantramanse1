const fs=require('node:fs');
const assert=require('node:assert/strict');
const base='output/independent-reference-2026-10-17/';
const x=JSON.parse(fs.readFileSync(base+'held-three-literature-reinforcement.json','utf8'));
const original=JSON.parse(fs.readFileSync(base+'cases.json','utf8'));
assert.equal(x.sources.length,5); assert.equal(Object.keys(x.rules).length,3);
assert.equal(x.cases.length,32); assert.equal(new Set(x.cases.map(c=>c.id)).size,32);
const ids=new Set(x.sources.map(s=>s.id));
for(const s of x.sources){assert.ok(s.locator&&s.layer&&s.finding&&s.limit);assert.equal(new URL(s.url).protocol,'https:');}
for(const c of x.cases){const o=original.find(o=>o.id===c.id);assert.ok(o);assert.deepEqual(c.raw,o.raw);assert.equal(c.ruleId,o.ruleId);assert.equal(c.verdict,'unknown');assert.equal(c.publishable,false);assert.equal(c.hourMissing,!o.raw.hourKnown);for(const id of c.sourceIds)assert.ok(ids.has(id));assert.ok(c.unresolved.length>=3);}
assert.equal(x.externalAI,false); assert.equal(x.published,false);
assert.ok(!JSON.stringify(x).includes('engineVerdict'));
console.log('PASS: 5 source sections; 3 held rule maps; 32 original cases preserved; no publishable verdict.');
