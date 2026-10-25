/* 사주 요소 풀이 선택기: 이 사람의 사주에 실제로 있는 신살·12신살·글자 사이의 관계·두드러진 십성 중에서,
   그 장의 주제에 맞는 풀이를 고른다. 문장 사전은 chart-lines-stars.js / chart-lines-rest.js. AI·네트워크 없음, 결정적.
   사주에 없는 요소는 말하지 않고, 흔한 요소보다 드문 요소를 먼저 고른다(그 사람만의 특징이 먼저 보이도록). */
(function(root){'use strict';
var STARS=root.MantraChartLinesStars||{},REST=root.MantraChartLinesRest||{},FILL=root.MantraChartLinesFill||{},
S12=REST.S12||{},REL=REST.REL||{},TG=REST.TG||{};
function mergeInto(base,add){Object.keys(add||{}).forEach(function(name){base[name]=Object.assign({},base[name]||{},add[name]);});return base;}
STARS=mergeInto(Object.assign({},STARS),FILL.star);REL=mergeInto(Object.assign({},REL),FILL.rel);S12=mergeInto(Object.assign({},S12),FILL.s12);
// 표본 1,500명에서 요소가 나온 횟수. 적을수록 먼저 고른다.
var FREQ={삼기귀인:6,금신살:121,고란살:115,양인살:227,효신살:237,십악대패일:255,음양차착살:302,상문살:314,과숙살:321,조객살:328,천의성:321,고신살:328,천관귀인:341,천주귀인:390,금여록:392,낙정관살:401,건록:410,암록:426,괴강살:425,문창귀인:438,천덕귀인:456,학당귀인:462,탕화살:463,천복귀인:466,월덕귀인:509,백호대살:515,급각살:520,공망:573,천을귀인:677,복성귀인:728,천문성:778,홍염살:450,태극귀인:870,현침살:1367,천라지망:186,
 겁살:364,재살:376,천살:354,지살:849,연살:370,월살:346,망신살:350,장성살:863,반안살:330,역마살:351,육해살:371,화개살:861,
 충:782,형:1217,파:796,해:706,원진:689,귀문관:681,육합:676,반합:639,천간충:609,천간합:861,삼합:68,방합:60,
 비견:237,겁재:218,식신:225,상관:217,편재:236,정재:222,편관:213,정관:202,편인:248,정인:198};
var DISPLAY={연살:'도화살'};
function josa(word,a,b){var c=String(word).charCodeAt(String(word).length-1);return (c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28)?a:b;}
function prefix(kind,name){var n=DISPLAY[name]||name;
 if(kind==='rel')return '사주 글자들 사이에 '+n+josa(n,'이','가')+' 걸려 있어요.';
 if(kind==='tg')return '사주에 '+n+'의 힘이 두드러져요.';
 return '사주에 '+n+josa(n,'이','가')+' 있어요.';}
// 같은 요소가 한 리포트에서 다시 나올 때는 같은 문장을 되풀이하지 않고 표현을 바꾼다(첫 등장은 prefix).
var AGAIN={star:['{n}{은} 이 장에서도 드러나요.','{n}의 결이 여기서도 이어져요.','{n}의 흔적은 이 장에도 있어요.','이 장에서도 {n}의 영향을 빼놓을 수 없어요.'],s12:['{n}{은} 이 장에서도 드러나요.','{n}의 결이 여기서도 이어져요.','{n}의 흔적은 이 장에도 있어요.','이 장에서도 {n}의 영향을 빼놓을 수 없어요.'],
 rel:['{n}{은} 이 장에서도 한몫해요.','{n}의 영향이 여기서도 보여요.','{n}의 결은 이 장에도 이어져요.','이 장에서도 {n}의 흐름이 보여요.'],tg:['{n}의 힘은 이 장에서도 이어져요.','{n}의 기운이 여기서도 눈에 띄어요.','{n}의 결은 이 장에도 나타나요.','이 장에서도 {n}의 힘이 한몫해요.']};
function again(kind,name,times){var n=DISPLAY[name]||name,list=AGAIN[kind]||AGAIN.star,t=list[(Math.max(1,times)-1)%list.length];return t.replace('{n}',n).replace('{은}',josa(n,'은','는'));}
var TABLE={star:STARS,s12:S12,rel:REL,tg:TG};
function ids(){var out=[];Object.keys(TABLE).forEach(function(k){Object.keys(TABLE[k]).forEach(function(name){Object.keys(TABLE[k][name]||{}).forEach(function(key){var id='timeline_'+key;if(out.indexOf(id)<0)out.push(id);});});});return out;}
function present(sd){
 var star=(sd.specialStars||[]).map(function(s){return s&&s.name;}).filter(Boolean),s12=Object.keys(sd.sinsal12||{}).map(function(k){return sd.sinsal12[k];}).filter(function(v){return typeof v==='string';}),
 rel=[].concat(sd.combinations||[],sd.clashes||[]).map(function(r){return r&&r.type;}).filter(Boolean),tg=Object.keys(sd.tenGods||{}).filter(function(k){return Number(sd.tenGods[k])>=20;});
 return {star:star,s12:s12,rel:rel,tg:tg};
}
// 이 장에서 쓸 수 있는 풀이 후보(중복 요소 제외), 드문 순서.
function candidates(sd,id){
 if(!sd||!id)return [];var key=String(id).replace(/^timeline_/,''),have=present(sd),out=[],seen={};
 ['star','s12','rel','tg'].forEach(function(kind){have[kind].forEach(function(name){var tag=kind+':'+name;if(seen[tag])return;seen[tag]=1;var body=TABLE[kind][name]&&TABLE[kind][name][key];if(body)out.push({kind:kind,name:name,rank:FREQ[name]==null?500:FREQ[name],body:body,first:prefix(kind,name),text:prefix(kind,name)+' '+body});});});
 return out.sort(function(a,b){return a.rank-b.rank||(a.kind+a.name<b.kind+b.name?-1:1);});
}
var api={candidates:candidates,ids:ids,prefix:prefix,again:again,FREQ:FREQ,TABLE:TABLE,DISPLAY:DISPLAY,version:'chart-lines-20261026-1'};
root.MantraChartLines=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
