// 실제 편집기 로직을 작은 DOM fixture에서 실행한다. 네트워크 없이 입력·전환·저장을 검사한다.
const assert=require('assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const fields=new Map();let sent=null,changes=null;
function node(id){
  const n={id,disabled:false,style:{},value:'',checked:false,attributes:{},setAttribute(k,v){this.attributes[k]=v},removeAttribute(k){delete this.attributes[k]},remove(){},addEventListener(){},querySelector(s){return fields.get(s.slice(1))||null},querySelectorAll(s){return s==='input,textarea,select,button' ? [...fields.values()] : []}};
  Object.defineProperty(n,'innerHTML',{set(html){this.html=html;for(const m of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)){const x=node(m[1]),v=/\bvalue="([^"]*)"/.exec(m[0]);x.value=v?v[1]:'';x.checked=/\bchecked\b/.test(m[0]);fields.set(m[1],x)}},get(){return this.html||''}});return n;
}
const root=node('root');
const ctx={window:null,console,setTimeout:()=>0,clearTimeout(){},CustomEvent:function(t,o){this.type=t;this.detail=o.detail},ReportV2:{SajuData:{SEASONS:{}},Remedy:{normalize:x=>x}},document:{createElement:()=>node('created'),head:{appendChild(){}},body:{appendChild(){},contains:()=>true}},fetch:async(u,o)=>{sent=JSON.parse(o.body);return {ok:true,json:async()=>({version:'saved'})}}};ctx.window=ctx;ctx.dispatchEvent=()=>{};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../report/admin/v2-content.js'),'utf8'),ctx);
const C=ctx.V2Content;
const options={title:'편집기',base:[],initial:[{id:'one',summary:'원문1',priority:1},{id:'two',summary:'원문2',priority:1}],key:'modules',cats:[['identity','일주']],catLabel:'종류',title2:x=>x.id,catName:()=>'',fields:x=>'<input id="eText" value="'+x.summary+'">',read:(box,x)=>({...x,summary:box.querySelector('#eText').value}),blank:()=>({id:'new'}),onChange:list=>changes=list};C.ST.saved={};C.itemAdmin(root,options);
const select=id=>fields.get('iList').onclick({target:{closest:()=>({dataset:{id}})}});
const type=(id,value)=>{fields.get(id).value=value;fields.get('iEd').oninput({target:{matches:()=>true}})};
(async()=>{
  select('one');type('eText','첫 수정');select('two');assert.equal(changes[0].summary,'첫 수정','적용 전 항목 이동에도 수정 보존');
  select('one');type('eText','두 번째 수정');assert.equal(C.flushEditors(),true);type('eText','세 번째 수정');assert.equal(C.flushEditors(),true);assert.equal(changes[0].summary,'세 번째 수정','같은 폼에서 연속 수집 후에도 보존');
  type('eText','저장 버튼만 누름');fields.get('iSave').onclick();await new Promise(r=>setImmediate(r));assert.equal(sent.modules[0].summary,'저장 버튼만 누름','별도 적용 없이 저장');
  type('eId','two');select('two');assert.equal(C.flushEditors(),false,'중복 ID면 항목 이동과 저장 중단');assert.equal(fields.get('eId').value,'two','검증 실패 입력 유지');
  const a={disabled:false},b={disabled:true};const pane={querySelectorAll:()=>[a,b],setAttribute(){},removeAttribute(){}};let finish,calls=0;
  const task=C.withBusy(pane,()=>{calls++;return new Promise(r=>finish=r)});const same=C.withBusy(pane,()=>{throw Error('중복 실행')});assert.equal(task,same);assert.ok(a.disabled&&b.disabled);await Promise.resolve();finish();await task;assert.equal(calls,1);assert.equal(a.disabled,false);assert.equal(b.disabled,true);
  await assert.rejects(C.withBusy(pane,()=>Promise.reject(Error('실패'))),/실패/);assert.equal(a.disabled,false);assert.equal(b.disabled,true);
  ctx.Onboard=require('../report/hub/onboard-data.js');ctx.Quest=require('../report/hub/quest-data.js');ctx.OnboardingContent={settings:{cover:{title:'기본 커버'}}};ctx.location={origin:'https://test.local'};ctx.addEventListener=()=>{};
  ctx.V2Content={api:async url=>url.includes('/api/story')?{story:null}:{config:{cover:{title:'커버'}}},setPw(){},esc:x=>String(x||''),toast(){}};const onboardPane=node('onboard');ctx.document.getElementById=()=>onboardPane;
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../report/admin/v2-onboard.js'),'utf8'),ctx);ctx.V2Onboard.open('onboard','pw');await new Promise(r=>setImmediate(r));assert.ok(fields.has('obCover'),'온보딩 첫 화면 편집기가 실제로 열림');assert.ok(!onboardPane.innerHTML.includes('class="err"'),'온보딩 관리자 초기화 오류 없음');
  const stylePane=node('style');stylePane.innerHTML='<button id="stSave">저장</button>';ctx.document.getElementById=()=>stylePane;let loads=0;ctx.V2Content.api=async()=>{loads++;return {}};
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../report/admin/v2-style.js'),'utf8'),ctx);ctx.V2Style._state.dirty=true;ctx.V2Style.open('stylecfg','pw');assert.equal(loads,0,'미저장 문체에 복귀하면 재로딩하지 않음');assert.equal(ctx.AdminDirty['풀이 문체'](),true);
  const shell=fs.readFileSync(path.join(__dirname,'../report/admin/v2-shell.js'),'utf8'),selector={innerHTML:''},pc={R:{Chapters:{projects:()=>[{id:'draft',name:'비공개 상품',enabled:false}]}},content:()=>({}),$:()=>selector,TS:{project:'missing'},esc:x=>x};vm.createContext(pc);vm.runInContext(shell.match(/function drawProj\(\) \{[^\n]+/)[0],pc);pc.drawProj();assert.equal(pc.TS.project,'draft');assert.ok(selector.innerHTML.includes('비공개'));pc.R.Chapters.projects=()=>[];pc.drawProj();assert.equal(pc.TS.project,'full');
  console.log('admin-editing-sim OK: 적용 전 전환·연속 편집·직접 저장·검증 실패 보존·중복 저장 방지·실패 복구');
})().catch(e=>{console.error(e);process.exitCode=1});
