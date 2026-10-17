const fs=require('fs'),assert=require('assert/strict'),crypto=require('crypto');
const s=JSON.parse(fs.readFileSync('docs/TIMELINE84_HEALTH_SUPPLEMENT.json')),corpus=JSON.parse(fs.readFileSync('output/timeline84-review/corpus.json')),audit=JSON.parse(fs.readFileSync('output/timeline84-review/source-audit.json')),live=JSON.parse(fs.readFileSync('output/timeline84-live/final-reviewed-results.json'));
assert.equal(s.productionWrites,0);assert.equal(s.deployed,false);assert.equal(s.chapters.length,3);
assert.equal(s.aiReview.passed,true);assert.equal(s.aiReview.expertApproved,false);
const review=JSON.parse(fs.readFileSync(s.aiReview.report)),initial=JSON.parse(fs.readFileSync(s.aiReview.initialReport));
const chapterHash=crypto.createHash('sha256').update(JSON.stringify(s.chapters)).digest('hex');
assert.equal(chapterHash,s.aiReview.reviewedChapterHash);assert.equal(chapterHash,review.reviewedChapterHash);
assert(review.passed&&review.finalReview.chapters.length===3&&review.finalReview.chapters.every(c=>c.ok&&!c.issues.length));
assert.equal(s.aiProviderCalls,review.callIds.length+initial.callIds.length);
for(const id of [...initial.callIds,...review.callIds]){const call=JSON.parse(fs.readFileSync('output/ux-writing/calls/'+id+'.json'));assert(call.ok&&call.responseId&&call.usage.input_tokens>0&&call.usage.output_tokens>0);}
assert(s.chapters.every(c=>c.paragraphs.every(p=>!p.text.includes('승인 근거'))));
assert(review.budget.actualUSD<=2&&review.budget.reservedUSD<=2);
for(const src of s.sources.filter(x=>x.kind==='traditional-reference')){const c=corpus.documents.find(d=>d.id===src.documentId).chunks.find(c=>c.id===src.chunkId);assert.equal(crypto.createHash('sha256').update(c.text).digest('hex'),src.sha256);}
for(const c of s.chapters){assert.equal(c.mode,'educational-only');assert.equal(c.state,'draft');assert.equal(c.expertApproved,false);assert.equal(c.personalizedEvidenceAccepted,false);assert.deepEqual(c.sourceRuleIds,[]);assert(c.sourceIds.every(id=>s.sources.some(x=>x.id===id)));assert.equal(audit.rows.find(r=>r.id===c.id).linked.length,0);assert.equal(live.rows.find(r=>r.id===c.id).personalizedEvidenceAccepted,false);assert(fs.readFileSync('output/timeline84-live/review.html','utf8').includes('data-health-supplement="'+c.id+'"'));}
console.log('PASS: 3 educational drafts; exact local source provenance; personalized approval and publication gates preserved.');
