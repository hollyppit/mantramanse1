/* 주역 점괘 계산 엔진 — 세 동전 점법. 순수 함수만 있다: AI·네트워크·저장·사주 엔진을 부르지 않는다.
   효 값: 6 노음(변하는 음) · 7 소양 · 8 소음 · 9 노양(변하는 양). 항상 아래(초효, 1)→위(상효, 6) 순서.
   같은 효 값 여섯 개를 넣으면 항상 같은 결과가 나온다(재현성). 난수는 cast()에서만 쓰고, 테스트에서는 rng 를 주입할 수 있다. */
(function(root){'use strict';
var H=root.IchingHexagrams||(typeof require!=='undefined'?require('./hexagrams.js'):null);
var RULE_ID='zhuxi-bengui-v1'; // 주희 『역학계몽』 변점(變占) 규칙. 다른 규칙은 RULES 에 id 로 추가한다.

function isLineValue(v){return v===6||v===7||v===8||v===9;}
function yang(v){return v===7||v===9;}
function changing(v){return v===6||v===9;}
// 세 동전(각 2 또는 3)의 합 → 6·7·8·9
function lineFromCoins(c){
 if(!Array.isArray(c)||c.length!==3||!c.every(function(x){return x===2||x===3;}))throw new Error('invalid-coins');
 return c[0]+c[1]+c[2];
}
function defaultRandom(){
 var g=typeof globalThis!=='undefined'?globalThis:root,c=g.crypto;
 if(c&&c.getRandomValues){var a=new Uint32Array(1);c.getRandomValues(a);return a[0]/4294967296;}
 throw new Error('secure-random-unavailable'); // Math.random 으로 조용히 대체하지 않는다
}
function randomBit(rng){return (rng?rng():defaultRandom())<0.5?0:1;}
// rng: 0 이상 1 미만을 돌려주는 함수(테스트용). 없으면 crypto.
function throwCoins(rng){return [2+randomBit(rng),2+randomBit(rng),2+randomBit(rng)];}
function cast(rng){
 var coins=[],values=[];
 for(var i=0;i<6;i++){var c=throwCoins(rng);coins.push(c);values.push(lineFromCoins(c));}
 return resolve(values,{coins:coins});
}
function hexOf(lines){var h=H.byLines(lines);if(!h)throw new Error('hexagram-not-found');return h;}
function describe(h){return {num:h.num,ko:h.ko,hanja:h.hanja,upper:h.upper,lower:h.lower,lines:h.lines.slice()};}

// 주희 변점 규칙: 변효 개수별로 어느 괘의 어떤 사(辭)를 보는지 가리킨다. 문장은 담지 않고 참조만 돌려준다.
//  kind: 'guaci'(괘사) · 'yaoci'(효사) · 'yong'(건 용구·곤 용육). role: primary(중심) · secondary(참고)
var RULES={};
RULES[RULE_ID]={id:RULE_ID,name:'주희 본의(역학계몽) 변점 규칙',source:'朱熹 『易學啓蒙』 考變占',apply:function(base,moved,pos){
 var n=pos.length,still=[1,2,3,4,5,6].filter(function(p){return pos.indexOf(p)<0;});
 var g=function(h,role){return {kind:'guaci',hexagram:h.num,role:role};},y=function(h,line,role){return {kind:'yaoci',hexagram:h.num,line:line,role:role};};
 if(n===0)return [g(base,'primary')];
 if(n===1)return [y(base,pos[0],'primary')];
 if(n===2)return [y(base,pos[1],'primary'),y(base,pos[0],'secondary')]; // 두 변효의 효사, 위의 효가 중심
 if(n===3)return [g(base,'primary'),g(moved,'secondary')]; // 본괘 괘사가 중심(貞), 변괘 괘사가 참고(悔)
 if(n===4)return [y(moved,still[0],'primary'),y(moved,still[1],'secondary')]; // 변괘의 불변효 둘, 아래 효가 중심
 if(n===5)return [y(moved,still[0],'primary')]; // 변괘의 불변효 하나
 if(base.num===1)return [{kind:'yong',hexagram:1,role:'primary',name:'용구'}];
 if(base.num===2)return [{kind:'yong',hexagram:2,role:'primary',name:'용육'}];
 return [g(moved,'primary')]; // 여섯 효가 모두 변하면 건·곤 외에는 변괘 괘사
}};

function resolve(values,extra,ruleId){
 if(!Array.isArray(values)||values.length!==6||!values.every(isLineValue))throw new Error('invalid-line-values');
 var rule=RULES[ruleId||RULE_ID];if(!rule)throw new Error('unknown-rule');
 var baseLines=values.map(function(v){return yang(v)?1:0;}),base=hexOf(baseLines);
 var pos=[];values.forEach(function(v,i){if(changing(v))pos.push(i+1);});
 var movedLines=values.map(function(v){return changing(v)?(yang(v)?0:1):(yang(v)?1:0);}),moved=hexOf(movedLines);
 return {
  values:values.slice(),coins:extra&&extra.coins?extra.coins:null,
  hexagram:describe(base),
  changingLines:pos.map(function(p){return {position:p,value:values[p-1],from:values[p-1]===9?'yang':'yin',to:values[p-1]===9?'yin':'yang'};}),
  changingCount:pos.length,
  transformedHexagram:pos.length?describe(moved):null, // 변효가 없으면 변괘 없음
  rule:{id:rule.id,name:rule.name,source:rule.source},
  reading:rule.apply(base,moved,pos)
 };
}
var api={RULE_ID:RULE_ID,RULES:RULES,lineFromCoins:lineFromCoins,throwCoins:throwCoins,cast:cast,resolve:resolve,isLineValue:isLineValue};
root.Iching=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
