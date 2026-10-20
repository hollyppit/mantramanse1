const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
global.window=globalThis;for(const f of ['report/v2/reading-text.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));
const R=ReportV2.ReadingText,rows=JSON.parse(fs.readFileSync('output/reader-continuity-20261021/user-screen-readings.json'));
let count=0,changed=0,before=[],after=[];
const norm=s=>s.replace(/\s+/g,' ').trim();
for(const row of rows)for(const p of row.paragraphs){
 const original=p.text,parts=R.readingParagraphs(original,false);
 assert.equal(norm(parts.join(' ')),norm(original),'paragraph splitting must preserve all evidence');
 const concise=R.readingParagraphs(original,true);assert(concise.length);
 before.push(original.length);after.push(...concise.map(t=>t.length));
 if(norm(concise.join(' '))!==norm(original))changed++;count++;
}
assert(R.concise('일하는 방식를 확인해요.').includes('방식을'));
assert.equal(R.readingParagraphs('정재가 들어와요. 돈의 흐름을 살펴요. 예를 들어, 재료비를 적어요.',true).length,2);
const stats=a=>({max:Math.max(...a),p95:a.sort((a,b)=>a-b)[Math.floor(a.length*.95)]});
console.log(JSON.stringify({passed:true,screens:rows.length,paragraphs:count,shortened:changed,before:stats(before),after:stats(after),evidencePreserved:true}));
