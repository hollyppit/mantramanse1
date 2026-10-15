const assert=require('assert'),fs=require('fs'),vm=require('vm');
global.window=globalThis;vm.runInThisContext(fs.readFileSync('report/v2/short-story.js','utf8'));
const B=ReportV2.ShortStory,groups=['비겁','식상','재성','관성','인성'];
const source={slot:'past:관성:금:M',frames:[{img:'/one.webp',paras:['한 줄 요약 · 이전 해설입니다.']},{img:'/two.webp',paras:['기존 풀이입니다.']}]},snapshot=JSON.stringify(source),seen=new Set();
for(let i=1;i<=7;i++)for(const group of groups){
 const w={id:'w'+i,name:'주제',bgImage:'/cover.webp'},sd={dominantGroup:group,weakestGroup:'식상',dayMaster:{el:'metal'},strength:{band:'신강'}};
 const model=B.build(w,sd,source),text=model.frames.map(f=>f.paras.join(' ')).join('\n');
 assert.equal(model.frames.length,8);assert(model.frames.every(f=>f.cap&&f.paras.length>=2));
 assert(!/\{[^}]+\}|한 줄 요약|왜 이런 이야기가/.test(text));assert(text.includes('“'));assert(text.includes('찬 공기'));
 assert.equal(model.slot,source.slot);assert(model.frames.every(f=>f.img));
 seen.add(text);assert(model.notice.includes('창작'));assert.equal(model.storyBasis.dominantGroup,group);
 const other=B.build(w,{...sd,strength:{band:'신약'}},source);assert.notDeepEqual(model.frames[6].paras,other.frames[6].paras);
}
assert.equal(seen.size,35);assert.equal(JSON.stringify(source),snapshot);
assert.equal(B.build({id:'custom'},null,source),source);
console.log('Short stories: seven complete arcs × five motives, chart variation, image preservation and source immutability passed');
