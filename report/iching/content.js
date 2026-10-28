/* 주역 콘텐츠 저장소 — 원문(classics)·현대어 초안(modern)·해석 모듈(packs)을 한곳에서 꺼내고, 검수·게시 상태에 따라 노출 여부를 정한다.
   키: classics:N · modern:N · pack:N:<general|wealth|career|love> · pack:N:line:P.
   내용 = 관리자 수정본(overrides)이 있으면 그것, 없으면 코드에 들어 있는 초안. 내용이 바뀌면 해시가 달라져 이전 승인은 자동으로 무효(stale)가 된다.
   노출 규칙(mode 'public'):
     · setRelease() 로 게시본(release)이 지정돼 있으면 → 게시본에 같은 해시로 들어 있는 항목만 보인다(서버가 항상 이렇게 쓴다).
     · 게시본이 지정되지 않았으면(과거 호환·테스트) → setReviewState() 에서 reviewed·published 로 표시한 항목만 보인다.
   mode 'preview'(관리자 미리보기)는 draft·source-imported·reviewed 도 보여 주되 결과에 preview 표시를 남긴다. missing·rejected 는 어느 모드에서도 문장을 만들지 않는다.
   이 파일은 파일시스템을 읽지 않는다. 데이터 파일(texts/*.js)을 먼저 불러온 뒤(브라우저는 script 태그, Node 는 node-loader.js, Worker 는 import) 쓴다. */
(function(root){'use strict';
var CATEGORIES=['general','wealth','career','love'],CAT_KO={general:'종합',wealth:'재물',career:'커리어',love:'인연'},VERSION='draft-0.2';
var REVIEW={},RELEASE=null,OVERRIDES={};
var PREVIEW_OK={reviewed:1,published:1,draft:1,'source-imported':1},OLD_VISIBLE={reviewed:1,published:1};
function C(){return root.IchingClassics;}function M(){return root.IchingModernData||{};}function P(){return root.IchingPacks||{};}

// 정렬된 JSON → 변경 감지용 해시(cyrb53). 보안용이 아니라 "내용이 바뀌었는가"를 가리는 용도다.
function canon(v){if(v===null||typeof v!=='object')return JSON.stringify(v);if(Array.isArray(v))return '['+v.map(canon).join(',')+']';return '{'+Object.keys(v).sort().map(function(k){return JSON.stringify(k)+':'+canon(v[k]);}).join(',')+'}';}
function hash(s){var h1=0xdeadbeef,h2=0x41c6ce57;for(var i=0,ch;i<s.length;i++){ch=s.charCodeAt(i);h1=Math.imul(h1^ch,2654435761);h2=Math.imul(h2^ch,1597334677);}
 h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);
 return (4294967296*(2097151&h2)+(h1>>>0)).toString(16);}
function parseKey(key){var p=String(key).split(':'),n=+p[1];
 if(p[0]==='classics'||p[0]==='modern')return {type:p[0],num:n};
 if(p[0]==='pack'&&p[2]==='line')return {type:'pack-line',num:n,pos:+p[3]};
 if(p[0]==='pack')return {type:'pack',num:n,cat:p[2]};
 return null;}
function builtin(key){var k=parseKey(key);if(!k)return undefined;
 if(k.type==='classics')return C()&&C().hexagrams[k.num];
 if(k.type==='modern')return M()[k.num];
 if(k.type==='pack-line')return P()[k.num]&&P()[k.num].lines&&P()[k.num].lines[k.pos];
 return P()[k.num]&&P()[k.num][k.cat];}
function effective(key){return Object.prototype.hasOwnProperty.call(OVERRIDES,key)?OVERRIDES[key]:builtin(key);}
function exists(key){return effective(key)!==undefined&&effective(key)!==null;}
function currentHash(key){return exists(key)?hash(canon(effective(key))):null;}
function hasOverride(key){return Object.prototype.hasOwnProperty.call(OVERRIDES,key);}

function status(key){
 if(!exists(key))return 'missing';
 var r=REVIEW[key],h=currentHash(key);
 if(r&&r.status){
  if(r.status==='rejected')return 'rejected';
  if((r.status==='reviewed'||r.status==='published')&&r.contentHash&&r.contentHash!==h)return 'stale'; // 승인 뒤 내용이 바뀜 → 재검수 필요
  return r.status;
 }
 return key.indexOf('classics:')===0&&!hasOverride(key)?'source-imported':'draft';
}
function released(key){return !!(RELEASE&&RELEASE.items&&RELEASE.items[key]&&RELEASE.items[key]===currentHash(key));}
function visible(key,mode){
 if(!exists(key))return false;
 if(mode==='preview'){var s=status(key);return !!PREVIEW_OK[s];}
 if(RELEASE)return released(key);
 return !!OLD_VISIBLE[status(key)];
}
// 노출 가능하면 값, 아니면 null. sink.used 에는 쓴 키, sink.missing 에는 못 쓴 키, sink.draft 는 미검수 문구를 썼는지.
function get(key,mode,sink){
 if(!visible(key,mode)){if(sink){(sink.missing=sink.missing||[]).indexOf(key)<0&&sink.missing.push(key);}return null;}
 if(sink){(sink.used=sink.used||[]).indexOf(key)<0&&sink.used.push(key);var s=status(key);if(mode==='preview'&&(s==='draft'||s==='source-imported'))sink.draft=true;}
 return effective(key);
}
function releaseVersion(){return RELEASE?'release-'+RELEASE.version:null;}
function setReviewState(map){REVIEW=map||{};}
function setOverrides(map){OVERRIDES=map||{};}
function setRelease(rel){RELEASE=rel||null;}
function allKeys(){var ks=[];for(var n=1;n<=64;n++){ks.push('classics:'+n,'modern:'+n);CATEGORIES.forEach(function(c){ks.push('pack:'+n+':'+c);});for(var l=1;l<=6;l++)ks.push('pack:'+n+':line:'+l);}return ks;}
function coverage(){
 var out=[];for(var n=1;n<=64;n++){var row={num:n};['classics','modern'].forEach(function(k){row[k]=status(k+':'+n);});CATEGORIES.forEach(function(c){row[c]=status('pack:'+n+':'+c);});row.lines=[1,2,3,4,5,6].map(function(l){return status('pack:'+n+':line:'+l);});out.push(row);}
 return out;}
var api={VERSION:VERSION,CATEGORIES:CATEGORIES,CAT_KO:CAT_KO,status:status,visible:visible,released:released,get:get,exists:exists,effective:effective,builtin:builtin,hasOverride:hasOverride,currentHash:currentHash,
 parseKey:parseKey,canon:canon,hash:hash,releaseVersion:releaseVersion,setReviewState:setReviewState,setOverrides:setOverrides,setRelease:setRelease,allKeys:allKeys,coverage:coverage,
 get classics(){return C();},get modern(){return M();},get packs(){return P();}};
root.IchingContent=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
