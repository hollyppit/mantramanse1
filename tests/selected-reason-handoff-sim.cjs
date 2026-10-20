const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');global.window=globalThis;
global.ReportV2={ReadingFlow:{scenes:()=>[]}};vm.runInThisContext(fs.readFileSync('report/v2/full-reading.js','utf8'));
const chapter={id:'c02',title:'나는 어떤 사람으로 태어났을까?',editorialDraft:true,editorialContractId:'timeline_self_01',readingCore:{why:'이전 일반 계산 설명입니다.'},scenes:[]},job=ReportV2.FullReading.collect(chapter,'가상검수');
assert.deepEqual(job.chapter.paragraphs.map(p=>p.role),['title','why','reality','strength','risk','reinforce','practice','evidence']);
const text='무토·중화에 식신과 정재 조건이 함께 맞아 이 문안을 선택합니다. 비중만으로 실제 행동을 단정하지 않습니다.';
const why=job.chapter.paragraphs.find(p=>p.role==='why');assert(why.text.includes('실제로 선택한 문안'));
job.targets[job.chapter.paragraphs.indexOf(why)](text);assert.equal(chapter.readingCore.why,text);
console.log('PASS: selected reason requested and replaces generic fallback without changing other roles');
