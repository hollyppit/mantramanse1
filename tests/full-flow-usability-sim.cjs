const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const viewer=fs.readFileSync('report/v2/viewer.js','utf8'),toon=fs.readFileSync('report/v2/samsara.js','utf8'),reader=fs.readFileSync('report/v2/reader.js','utf8');
const extract=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));
(async()=>{
const getSource=extract(viewer,'  function getJson(u)','  function birthOf');let aborted=0;
for(const mode of ['headers-stall','body-stall','reject','success','null']){
 const c={window:{AbortController},AbortController,Promise,setTimeout:(f)=>setTimeout(f,10),clearTimeout,fetch:()=>mode==='headers-stall'?new Promise(()=>{}):mode==='reject'?Promise.reject(Error('offline')):Promise.resolve({ok:true,json:()=>mode==='body-stall'?new Promise(()=>{}):Promise.resolve(mode==='null'?null:{media:['ready']})})};
 vm.runInNewContext(getSource+';this.get=getJson',c);const got=await c.get('/optional');assert.equal(JSON.stringify(got),mode==='success'?'{"media":["ready"]}':'{}',mode);
}
// A chosen chapter must be the jump target, even when an act screen precedes it.
const chapter={previousElementSibling:{classList:{contains:()=>true}}},jumps=[];
const c={R:{},S:{rep:{chapters:[{id:'a'}]},mv:{gotoEl:e=>jumps.push(e)}},$:()=>chapter};vm.runInNewContext(extract(viewer,'  function gotoChapter(','  function onSection(')+';gotoChapter(0,true)',c);assert.equal(jumps[0],chapter);
// Reload restores only the same tab route; new navigation and other report URLs stay fresh.
const handoff=extract(viewer,'  (function handoff()','  window.addEventListener(\'mantra:guide-change');
for(const [type,scope,expected]of [['reload','?from=hub',1],['navigate','?from=hub',0],['reload','?from=hub&world=w2',0]]){
 let starts=0;const saved=JSON.stringify({inp:{gender:'M'},name:'검증',resumeChapter:'c03',scope});const ctx={sg:k=>k==='mt_v2_restore'?saved:null,location:{search:'?from=hub'},performance:{getEntriesByType:()=>[{type}]},sessionStorage:{removeItem(){}},window:{Manse:{compute:x=>({input:x})}},S:{},R:{},setTimeout:f=>f(),start:()=>starts++};vm.runInNewContext(handoff,ctx);assert.equal(starts,expected);if(expected)assert.equal(ctx.S.guideResume,'c03');
}
// Long overflowing pages cannot auto-advance; fitting pages can.
for(const overflow of [true,false]){let callback,moved=0;const ctx={auto:true,dead:false,timer:0,clear(){},setTimeout:f=>callback=f,tx:{scrollHeight:overflow?1000:200,clientHeight:200,scrollTop:0},model:{frames:[{}]},i:0,opts:{},dwell:()=>1000,updateAuto(){},btnA:{},next:()=>moved++};vm.runInNewContext(extract(toon,'    function schedule()','    function pageWindow()')+';schedule()',ctx);callback();assert.equal(moved,overflow?0:1);if(overflow)assert.equal(ctx.auto,false);}
for(const width of [320,390,844,1440])for(const i of [0,7,14,59]){const ctx={root:{innerWidth:width},i,model:{frames:Array(60)}};vm.runInNewContext(extract(toon,'    function pageWindow()','    function show()')+';this.range=pageWindow()',ctx);assert(i>=ctx.range.start&&i<ctx.range.end);assert(ctx.range.end-ctx.range.start<=(width<=600?5:9));}
const moves=[],ctx={seekEl:{addEventListener:(k,f)=>ctx.key=f,getAttribute:()=>50},seek:n=>moves.push(n)};vm.runInNewContext(extract(reader,"    seekEl.addEventListener('keydown'",'    seekEl.onclick'),ctx);for(const key of ['Home','End','ArrowLeft','ArrowRight'])ctx.key({key,preventDefault(){},stopPropagation(){}});assert.deepEqual(moves,[0,1,.45,.55]);
console.log('PASS: bounded initial fetch/body, exact chapter jump, scoped reload restoration, long-page auto guard, mobile page windows, keyboard seek');
})().catch(e=>{console.error(e);process.exitCode=1});