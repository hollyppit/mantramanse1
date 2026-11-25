const fs=require('fs'),vm=require('vm'),path=require('path');// 사용: make-prop.cjs 다음에 node tools/luck-engine-audit-20261125/compare.cjs  → out/compare-result.json
const S=path.join(__dirname,'out'), ROOT=path.join(__dirname,'..','..');
const load=f=>{const c={console};c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync(f,'utf8'),c);return c.Manse;};
const V={base:load(path.join(S,'engine-base.js')),A:load(path.join(S,'engine-prop-A.js')),B:load(path.join(S,'engine-prop-B.js')),C:load(path.join(S,'engine-prop-C.js')),ABC:load(path.join(S,'engine-prop-ABC.js'))};
const base2=load(path.join(S,'engine-base.js'));
// 표본: dev = 기존 300 생성식, ind = 독립(LCG 무작위, 분 포함, 1935~2012)
const dev=[...Array(300)].map((_,i)=>({year:1950+(i*7)%55,month:1+(i*5)%12,day:1+(i*11)%28,hour:(i*3)%24,minute:0,gender:i%2?'M':'F',calendar:'solar'}));
let seed=20261125;const rnd=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648;
const ind=[...Array(300)].map(()=>({year:1935+Math.floor(rnd()*78),month:1+Math.floor(rnd()*12),day:1+Math.floor(rnd()*28),hour:Math.floor(rnd()*24),minute:Math.floor(rnd()*60),gender:rnd()<.5?'M':'F',calendar:'solar'}));
const q=(a,p)=>{const s=[...a].sort((x,y)=>x-y);return Math.round(s[Math.floor(p*(s.length-1))]*10)/10};
const pear=(a,b)=>{const n=a.length,ma=a.reduce((s,x)=>s+x,0)/n,mb=b.reduce((s,x)=>s+x,0)/n;let sab=0,sa=0,sb=0;for(let i=0;i<n;i++){sab+=(a[i]-ma)*(b[i]-mb);sa+=(a[i]-ma)**2;sb+=(b[i]-mb)**2}return Math.round(sab/Math.sqrt(sa*sb)*1000)/1000};
const g3=(v,t=[18,-12])=>v>=t[0]?'좋음':v>t[1]?'무난':'조심';
function run(M,sample,seunYears=40){const D=[],Sx=[],rel=[],str=[],meta=[];sample.forEach((inp,ci)=>{const ch=M.compute(inp);
  ch.daeun.list.forEach((d,k)=>{D.push(d.ev.fitScore);rel.push(Math.abs(d.ev.relationScore*d.ev.weights.relation));str.push(Math.abs(d.ev.structureScore*d.ev.weights.structure));meta.push({ci,k,mode:ch.unified.mode,help:ch.strength.help,parts:d.ev.parts});});
  M.seunRange(ch,ch.solar.y+10,ch.solar.y+10+seunYears-1).forEach(x=>Sx.push(x.combined));});return {D,Sx,rel,str,meta};}
const R={};
for(const [sn,sample] of [['dev',dev],['ind',ind]]){
 const out={};for(const k of Object.keys(V)) out[k]=run(V[k],sample);
 const b=out.base;R[sn]={};
 for(const k of Object.keys(V)){const o=out[k];const rec={daeun:{p5:q(o.D,.05),p25:q(o.D,.25),med:q(o.D,.5),p75:q(o.D,.75),p95:q(o.D,.95)},seun:{p5:q(o.Sx,.05),p25:q(o.Sx,.25),med:q(o.Sx,.5),p75:q(o.Sx,.75),p95:q(o.Sx,.95)},
   relMed:q(o.rel,.5),relP90:q(o.rel,.9),strMed:q(o.str,.5)};
  const gr=a=>{const c={좋음:0,무난:0,조심:0};a.forEach(v=>c[g3(v)]++);return Object.fromEntries(Object.entries(c).map(([kk,v])=>[kk,Math.round(v/a.length*1000)/10]))};
  rec.gradeDaeun=gr(o.D);rec.gradeSeun=gr(o.Sx);
  if(k!=='base'){const dd=o.D.map((v,i)=>v-b.D[i]),ds=o.Sx.map((v,i)=>v-b.Sx[i]);
   rec.vsBase={corrDaeun:pear(b.D,o.D),corrSeun:pear(b.Sx,o.Sx),absDeltaDaeun:{med:q(dd.map(Math.abs),.5),p90:q(dd.map(Math.abs),.9),max:q(dd.map(Math.abs),1)},absDeltaSeun:{med:q(ds.map(Math.abs),.5),p90:q(ds.map(Math.abs),.9)},
    gradeChangeDaeun:Math.round(o.D.filter((v,i)=>g3(v)!==g3(b.D[i])).length/o.D.length*1000)/10,gradeChangeSeun:Math.round(o.Sx.filter((v,i)=>g3(v)!==g3(b.Sx[i])).length/o.Sx.length*1000)/10,
    big15:o.D.filter((v,i)=>Math.abs(v-b.D[i])>=15).length};
   if(k==='ABC'){const idx=dd.map((v,i)=>[Math.abs(v),i]).sort((x,y)=>y[0]-x[0]).slice(0,8);
    rec.topChanged=idx.map(([a,i])=>{const m=b.meta[i],mo=o.meta[i];const inp=sample[m.ci];
      const diffParts=mo.parts.filter(p=>p.comp==='relation'||p.comp==='structure').map(p=>p.label.slice(0,40)+'('+Math.round(p.v*10)/10+')').slice(0,3);
      const oldParts=m.parts.filter(p=>p.comp==='relation'||p.comp==='structure').map(p=>p.label.slice(0,40)+'('+Math.round(p.v*10)/10+')').slice(0,3);
      return {chart:`${inp.year}-${inp.month}-${inp.day} ${inp.hour}시 ${inp.gender}`,daeun:m.k+1,base:Math.round(b.D[i]),prop:Math.round(o.D[i]),old:oldParts,new:diffParts};});}
  }
  R[sn][k]=rec;}
 // 특수군별(ABC vs base) — 종격·경계 강약
 const grpStat=f=>{const ids=b.meta.map((m,i)=>f(m)?i:-1).filter(i=>i>=0);if(!ids.length)return null;return {n:ids.length,corr:pear(ids.map(i=>b.D[i]),ids.map(i=>out.ABC.D[i])),absDeltaMed:q(ids.map(i=>Math.abs(out.ABC.D[i]-b.D[i])),.5)}};
 R[sn].groups={jong:grpStat(m=>m.mode==='jong'),border:grpStat(m=>m.help>=42&&m.help<=58),other:grpStat(m=>m.mode!=='jong'&&!(m.help>=42&&m.help<=58))};
}
// 재현성: 같은 엔진 두 VM, 같은 입력 → 같은 값
const rep=dev.slice(0,50).every(inp=>JSON.stringify(V.base.compute(inp).daeun.list.map(d=>d.ev.fitScore))===JSON.stringify(base2.compute(inp).daeun.list.map(d=>d.ev.fitScore)));
R.reproducible=rep;
// 민감도: 학파 강제(억부·조후) vs 자동 — 대운 등급이 바뀌는 비율(기존 엔진)
const sens={};for(const sc of ['eokbu','johu']){let n=0,ch=0,dsum=[];dev.forEach(inp=>{const a=V.base.compute(inp),b2=V.base.compute({...inp,school:sc});a.daeun.list.forEach((d,k)=>{n++;const v2=b2.daeun.list[k].ev.fitScore;dsum.push(Math.abs(v2-d.ev.fitScore));if(g3(v2)!==g3(d.ev.fitScore))ch++;});});sens[sc]={gradeChange:Math.round(ch/n*1000)/10,absDeltaMed:q(dsum,.5),absDeltaP90:q(dsum,.9)};}
R.schoolSensitivity=sens;
// 대칭 등급안(±15) 비율 — 기존 엔진
const sym=a=>{const c={좋음:0,무난:0,조심:0};a.forEach(v=>c[v>=15?'좋음':v>-15?'무난':'조심']++);return Object.fromEntries(Object.entries(c).map(([kk,v])=>[kk,Math.round(v/a.length*1000)/10]))};
const bd=run(V.base,dev),bi=run(V.base,ind);R.symmetric15={devDaeun:sym(bd.D),devSeun:sym(bd.Sx),indDaeun:sym(bi.D),indSeun:sym(bi.Sx)};
fs.writeFileSync(path.join(S,'compare-result.json'),JSON.stringify(R,null,1));console.log('done');
