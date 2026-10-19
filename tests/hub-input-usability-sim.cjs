const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync('report/hub/hub-saju.js','utf8');
const tick=()=>new Promise(r=>setImmediate(r));
function setup(){let active=true,saves=0,moves=0,html='',resolve;const handlers={},field=(value)=>({value,focus(){this.focused=true}}),f={};
for(const [k,v]of Object.entries({name:'검증',gender:'F',calendar:'solar',year:'2024',month:'2',day:'29',time:'12:00',city:'126.98'}))f[k]=field(v);
f.unknown={checked:false};f.leap={checked:false,parentElement:{}};const msg={textContent:''},button={textContent:'시작',disabled:false};
Object.defineProperty(f.day,'innerHTML',{set(v){this.options=v;this.value=String(v.match(/value="(\d+)" selected/)[1])}});
f.querySelector=s=>s==='[type=submit]'?button:f.gender;f.addEventListener=(k,fn)=>handlers[k]=fn;f.setAttribute=()=>{};f.removeAttribute=()=>{};
const P={has:()=>false,get:()=>null,toInput:x=>x,save:()=>{saves++;return state.saveOK},awakened:()=>false};
const H={profile:P,esc:x=>x,br:x=>x,$:s=>s==='#sf'?f:msg,route:(k,fn)=>H.routes[k]=fn,routes:{},view:x=>{html=x;return{}},engine:()=>state.engine(),track(){},afterInput(){},replace(){moves++},alive:()=>active};
const state={saveOK:true,engine:()=>Promise.resolve({compute(){}}),f,msg,button,handlers,H,get saves(){return saves},get moves(){return moves},get html(){return html},leave(){active=false}};
vm.runInNewContext(source,{window:{Hub:H,MantraCore:{DAYMODE:{}},FreeCore:{}},Date,console});H.routes.input({next:'my'},{});return state;}
(async()=>{
let s=setup();assert(!s.html.includes('이야기을'));assert.equal(s.f.day.value,'29');s.f.year.value='2023';s.handlers.change({target:{name:'year'}});assert.equal(s.f.day.value,'28');assert(!s.f.day.options.includes('value="29"'));
s.f.calendar.value='lunar';s.handlers.change({target:{name:'calendar'}});assert(s.f.day.options.includes('value="30"'));assert(!s.f.day.options.includes('value="31"'));
s=setup();s.f.time.value='';s.handlers.submit({preventDefault(){}});assert.match(s.msg.textContent,/태어난 시간/);assert(s.f.time.focused);assert.equal(s.saves,0);
s=setup();s.saveOK=false;s.handlers.submit({preventDefault(){}});await tick();assert.equal(s.moves,0);assert.match(s.msg.textContent,/저장하지 못/);assert.equal(s.button.disabled,false);
s=setup();let resolve;s.engine=()=>new Promise(r=>resolve=r);s.handlers.submit({preventDefault(){}});s.handlers.submit({preventDefault(){}});assert(s.button.disabled);resolve({compute(){}});await tick();assert.equal(s.saves,1);assert.equal(s.moves,1);
s=setup();s.engine=()=>Promise.reject(Error('offline'));s.handlers.submit({preventDefault(){}});await tick();assert.match(s.msg.textContent,/다시 시도/);assert.equal(s.button.disabled,false);
s=setup();s.handlers.submit({preventDefault(){}});s.leave();await tick();assert.equal(s.saves,0);assert.equal(s.moves,0);
s=setup();s.f.unknown.checked=true;s.f.time.value='';s.handlers.submit({preventDefault(){}});await tick();assert.equal(s.moves,1);
console.log('PASS: leap dates, lunar bounds, explicit unknown time, failed storage, duplicate submit, retry and navigation race');
})().catch(e=>{console.error(e);process.exitCode=1});
