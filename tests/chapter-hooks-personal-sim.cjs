/* 챕터 후킹 개인화 전수 검사.
   - chapter-hooks.js 에 있는 65개 장이 모두 장별 문안(일간 10 × 꼬리말 3)을 갖는다.
   - 문장마다 그 장의 주제어가 들어 있다(다른 장 문장을 돌려 쓰면 걸린다).
   - 같은 사람 기준으로 65개 장의 큰 제목·꼬리말이 서로 겹치지 않는다.
   - 장 사이 문장이 지나치게 비슷하지 않다(같은 일간 기준 문자 이그램 유사도). */
const path=require('path'),assert=require('assert');
const v2=path.join(__dirname,'..','report','v2');
global.window=undefined;
require(path.join(v2,'chapter-hooks.js'));
require(path.join(v2,'chapter-hooks-personal-data-1.js'));
require(path.join(v2,'chapter-hooks-personal-data-2.js'));
const {make}=require(path.join(v2,'chapter-hooks-personal.js'));
const HOOKS=globalThis.MantraChapterHooks,DATA=globalThis.MantraPersonalHookData;
const ids=Object.keys(HOOKS),STEMS=['갑','을','병','정','무','기','경','신','임','계'],BANDS=['신강','신약','중화'];
let fails=[];const bad=(m)=>fails.push(m);

assert.strictEqual(ids.length,65,'후킹 표 장 수');
ids.forEach(id=>{
 const d=DATA[id];if(!d){bad(id+': 장별 문안 없음');return;}
 if(!d.k)bad(id+': 주제어(k) 없음');
 if(!Array.isArray(d.p)||d.p.length!==10)bad(id+': 일간 문장 10개 아님');
 if(!Array.isArray(d.t)||d.t.length!==3)bad(id+': 꼬리말 3개 아님');
 (d.p||[]).forEach((p,i)=>{
  if(!p.includes(d.k))bad(id+' '+STEMS[i]+': 주제어 "'+d.k+'" 없음 → '+p);
  if(!/(요|다)$/.test(p))bad(id+' '+STEMS[i]+': 끝맺음 이상 → '+p);
  if(/\s{2,}|\.\.|[(){}]|undefined|null|^\s|\s$/.test(p))bad(id+' '+STEMS[i]+': 형식 이상 → '+p);
  if(p.length<20||p.length>90)bad(id+' '+STEMS[i]+': 길이 '+p.length+' → '+p);
 });
 if(new Set(d.p).size!==10)bad(id+': 일간끼리 문장 중복');
 (d.t||[]).forEach((t,i)=>{if(!/(요)\.$/.test(t))bad(id+' 꼬리 '+BANDS[i]+': 끝맺음 → '+t);});
});
Object.keys(DATA).forEach(id=>{if(!HOOKS[id])bad(id+': 후킹 표에 없는 장');});

// 전역 중복: 문장·꼬리말이 다른 장과 같으면 안 된다.
const seen=new Map();
ids.forEach(id=>(DATA[id].p||[]).forEach((p,i)=>{const k=p;if(seen.has(k))bad('문장 중복: '+id+'/'+STEMS[i]+' = '+seen.get(k));else seen.set(k,id+'/'+STEMS[i]);}));
BANDS.forEach((b,bi)=>{const m=new Map();ids.forEach(id=>{const t=(DATA[id].t||[])[bi];if(!t)return;if(m.has(t))bad('꼬리말 중복('+b+'): '+id+' = '+m.get(t));else m.set(t,id);});});

// 유사도: 같은 일간으로 두 장을 비교해 문자 2-gram 자카드가 높으면 사실상 같은 문장이다.
function grams(s){const t=s.replace(/\s+/g,''),o=new Set();for(let i=0;i<t.length-1;i++)o.add(t.slice(i,i+2));return o;}
function jac(a,b){let n=0;a.forEach(x=>{if(b.has(x))n++;});return n/(a.size+b.size-n);}
const LIMIT=0.62;let maxSim=0,maxPair='';
STEMS.forEach((st,si)=>{
 const g=ids.map(id=>grams(DATA[id].p[si]));
 for(let a=0;a<ids.length;a++)for(let b=a+1;b<ids.length;b++){const j=jac(g[a],g[b]);if(j>maxSim){maxSim=j;maxPair=ids[a]+'~'+ids[b]+'/'+st;}if(j>=LIMIT)bad('장 사이 문장 유사('+j.toFixed(2)+'): '+ids[a]+' ~ '+ids[b]+' / '+st+'\n   '+DATA[ids[a]].p[si]+'\n   '+DATA[ids[b]].p[si]);}
});

// 한 사람 기준 65개 장: 큰 제목·꼬리말 모두 달라야 한다. 이름 유무·신강/신약/중화 전부.
STEMS.forEach(st=>BANDS.forEach(band=>['백진우','',null].forEach(nm=>{
 const sd={dayMaster:{stem:st},strength:{band},name:nm};
 const mains=new Set(),tails=new Set();
 ids.forEach(id=>{
  const r=make(id,sd);
  if(!r){bad(id+' '+st+': make 결과 없음');return;}
  if(!r.chapter)bad(id+' '+st+': 장별 문안을 안 씀(예전 주제군으로 떨어짐)');
  if(!/[.]$/.test(r.main)||/\.\.|undefined|null|\s{2}/.test(r.main))bad(id+' '+st+': main 형식 → '+r.main);
  if(!r.tail)bad(id+' '+st+'/'+band+': 꼬리말 비어 있음');
  if(!r.main.includes(st==='갑'?'갑목':'')&&false)bad('x');
  mains.add(r.main);tails.add(r.tail);
 });
 if(mains.size!==ids.length)bad(st+'/'+band+'/'+nm+': 큰 제목 중복 '+(ids.length-mains.size)+'건');
 if(tails.size!==ids.length)bad(st+'/'+band+'/'+nm+': 꼬리말 중복 '+(ids.length-tails.size)+'건');
})));

// 일간·밴드 값이 없으면 null/빈 꼬리말, 표에 없는 장은 예전 문장으로 떨어진다.
assert.strictEqual(make('timeline_self_03',{dayMaster:{}}),null);
const old=make('timeline_health_01',{dayMaster:{stem:'경'},strength:{band:'신약'}});
assert.ok(old&&old.main&&!old.chapter,'표에 없는 장은 예전 방식');

if(fails.length){console.error(fails.slice(0,60).join('\n'));console.error('실패 '+fails.length+'건');process.exit(1);}
console.log('chapter-hooks-personal-sim OK — 장 '+ids.length+' × 일간 10 = '+seen.size+'문장, 최대 유사도 '+maxSim.toFixed(2)+' ('+maxPair+')');
