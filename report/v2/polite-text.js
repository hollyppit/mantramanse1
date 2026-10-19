// Deterministic service-copy normalization. Source quotes, IDs and conditions are never rewritten.
(function(root){'use strict';
var VERSION='polite-1';
function ending(word){
  if(/니다$/.test(word)&&(word.charCodeAt(word.length-3)-0xAC00)%28===17)return word;
  if(/(?:습니다|입니다|합니다|됩니다|세요|해요|돼요|어요|아요|예요|이에요|십시오)$/.test(word))return word;
  if(/하라$/.test(word))return word.slice(0,-2)+'하세요';
  if(/해라$/.test(word))return word.slice(0,-2)+'하세요';
  if(/마라$/.test(word))return word.slice(0,-2)+'마세요';
  if(/[아어여워춰려]라$/.test(word))return word.slice(0,-1)+' 주세요';
  if(/보라$/.test(word))return word.slice(0,-1)+'세요';
  if(/해$/.test(word))return word.slice(0,-1)+'합니다';
  if(!/다$/.test(word))return word;
  var stem=word.slice(0,-1);
  if(/이다$/.test(word))return word.slice(0,-2)+'입니다';
  if(/아니다$/.test(word))return word.slice(0,-3)+'아닙니다';
  if(/는다$/.test(word))return word.slice(0,-2)+'습니다';
  if(/(?:시기|구조|해|예시|자리|경우|분야|열정파|선택지|단위|이유|읽기|먼저|의미|경고|주의|상태|과제|취지|황금기|전략|침체기)다$/.test(word))return stem+'입니다';
  var n=stem.charCodeAt(stem.length-1)-0xAC00;
  if(n<0||n>11171)return word;
  var tail=n%28,base=stem.slice(0,-1),last=stem.slice(-1);
  if(tail===0)return base+String.fromCharCode(0xAC00+n+17)+'니다';
  if(tail===4)return base+String.fromCharCode(0xAC00+n-4+17)+'니다';
  if(tail===8)return base+String.fromCharCode(0xAC00+n-8+17)+'니다';
  return stem+'습니다';
}
function text(value){
 if(typeof value!=='string')return value;
 // Only sentence-final words, including list items without a final period.
 return value.replace(/[가-힣]+(?=[.!?。…]*(?:[”’"']?)(?:\s|$))/g,function(w,offset,whole){
   var rest=whole.slice(offset+w.length);if(!/^(?:[.!?。…]+|[”’"']?(?:\s*\n|\s*$))/.test(rest))return w;
   return ending(w);
 });
}
var prose=new Set(['principle','interpretation','strengths','risks','behaviorPatterns','actions','strengthenActions','copingActions','worker','business','freelance','love','text','situation','strength','risk','exception','strategy','reinforce','practice','reality','why','judgment','hypothesis','vulnerabilities','reality_questions','body','narration','meaning','choice','summary','detail','limitation','limitations']);
var skip=new Set(['evidence','quote','source','sources','sourceMemo','sourceReference','conditions','alsoWhen','exclusions','when','ziweiConditions','history','previous','original','review','automation','validation','claim_ids','refs','tags','requiredEvidence']);
function content(value,key){
 if(typeof value==='string')return prose.has(key)?text(value):value;
 if(Array.isArray(value))return value.map(function(v){return content(v,key);});
 if(!value||typeof value!=='object')return value;
 var out={};Object.keys(value).forEach(function(k){out[k]=skip.has(k)?value[k]:content(value[k],k);});return out;
}
function stored(key,value){
 if(typeof value!=='string'||!(/^(?:ik:d:|ik:blocks:chapter:|ik:library:)/.test(key)||/^ik:editorial:(?:draft|published)$/.test(key))||/:history$/.test(key))return value;
 try{return JSON.stringify(content(JSON.parse(value)));}catch{return value;}
}
root.MantraPolite={VERSION:VERSION,text:text,content:content,stored:stored};
if(typeof module!=='undefined'&&module.exports)module.exports=root.MantraPolite;
})(typeof window!=='undefined'?window:globalThis);
