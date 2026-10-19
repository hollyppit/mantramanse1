const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');global.window=globalThis;vm.runInThisContext(fs.readFileSync('report/v2/chapter-policy.js','utf8'));const P=MantraChapterPolicy,p=P.policy({chapterKind:'self'});const title='당신은 자기 기준을 지키려는 힘과 책임·평가를 무겁게 받아들이는 성향이 함께 있는 사람으로 풀이됩니다.';
const risk='다른 의견을 받아들여야 하는 상황에서는 자기 방식을 고수하는 태도가 고집으로 비칠 수 있습니다.';
assert(P.duplicate(title,risk),'shared trait concept alone is only a candidate');assert(P.similarity(title,risk)<0.65);assert(!P.inspect({paragraphs:[{id:'0',text:title},{id:'3',text:risk}]},p,[],null).issues.some(x=>x.code==='semantic-trait-duplicate'));
assert(P.inspect({paragraphs:[{id:'0',text:title},{id:'3',text:title}]},p,[],null).issues.some(x=>/duplicate/.test(x.code)));
const first='책임감이 강한 성향이라 맡은 업무의 처리 과정에서 약속과 기준을 꼼꼼하게 챙기는 편입니다.';const paraphrase='책임감이 높은 성향이라 맡은 업무의 처리 과정에서 약속과 기준을 세심하게 챙기는 편입니다.';assert(P.inspect({paragraphs:[{id:'0',text:first},{id:'2',text:paraphrase}]},p,[],null).issues.some(x=>/duplicate/.test(x.code)));
console.log('PASS: actual trait-summary/risk extension allowed; verbatim and close paraphrase remain rejected; semantic AI review remains required');
