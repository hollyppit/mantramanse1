const assert=require('node:assert/strict'),{audit,compare}=require('../tools/rag-backup-audit.cjs');
const rows=[{key:'ik:d:SELF',value:JSON.stringify([{id:'SELF-1',status:'published',reviewed:true,chapterIds:['c1'],evidence:[{docId:'d1'}]}]),expires_at:null,updated_at:'2026-10-17T00:00:00Z'},{key:'src:idx',value:'[{"id":"d1"}]',expires_at:null},{key:'src:chunks:d1',value:'[{"id":"chunk-1","text":"original"}]'},{key:'tombstone',value:null}];
assert(compare(rows,[...rows].reverse()).matched);
for(const edit of [r=>r[0].value=r[0].value.replace('published','draft'),r=>r[0].value=r[0].value.replace('c1','c2'),r=>r[0].updated_at='changed',r=>r[1].expires_at='2030-01-01',r=>r[2].value='[]',r=>r.pop()]){const copy=structuredClone(rows);edit(copy);assert.throws(()=>compare(rows,copy),/differs/);}
assert.throws(()=>audit([...rows,rows[0]]),/duplicate row key/);
assert.throws(()=>audit([{key:'ik:d:SELF',value:'[{"id":"a"},{"id":"a"}]'}]),/duplicate knowledge id/);
assert.deepEqual(audit(rows).counts,{rows:4,knowledge:1,published:1,reviewed:1,sourceRows:2});
console.log('backup audit: exact values, links, states, metadata, tombstones and corruption detection PASS');
