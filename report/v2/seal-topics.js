/* Four presentation blueprints for the existing 64 catalog contracts + PeakReading.
 * Pure metadata only: no DOM, storage, requests, calculation or reading text rewriting.
 * "current" means enabled catalog topic + non-archived chapter, not publication approval.
 */
(function(root){'use strict';
var R=root.ReportV2=root.ReportV2||{},VERSION='seal-topics-1';
var TOPICS={
 self:{id:'self',worldId:'w1',title:'종합풀이',label:'나를 읽는 봉인',guide:'타고난 기질부터 삶의 흐름까지, 한 장의 질문을 따라 읽어 보세요.',practicePrompt:'이 장에서 기억할 나의 특징 하나와 해볼 실천 하나를 남겨 보세요.',accent:'#e6c389',symbol:'나',intro:'기질 · 관계 · 일 · 삶의 흐름'},
 wealth:{id:'wealth',worldId:'w2',title:'재물운 심화',label:'돈의 흐름을 읽는 봉인',guide:'돈을 벌고 쓰는 방식부터 관계와 시기까지, 궁금한 질문을 펼쳐 보세요.',practicePrompt:'이 장을 읽고 확인할 지출·약속·실천 하나를 남겨 보세요.',accent:'#b8d7b4',symbol:'재',intro:'수입 · 지출 · 선택 · 전략'},
 career:{id:'career',worldId:'w7',title:'커리어운 심화',label:'일의 방향을 읽는 봉인',guide:'재능과 일하는 환경, 선택의 조건을 장면마다 살펴보세요.',practicePrompt:'이 장에서 확인할 업무 조건이나 시도할 행동 하나를 남겨 보세요.',accent:'#b5ccef',symbol:'업',intro:'재능 · 환경 · 역할 · 다음 선택'},
 love:{id:'love',worldId:'w3',title:'인연운 심화',label:'관계의 결을 읽는 봉인',guide:'내가 관계를 맺는 방식과 서로 조율할 조건을 질문마다 살펴보세요.',practicePrompt:'이 장에서 돌아볼 대화나 함께 조율할 약속 하나를 남겨 보세요.',accent:'#ebbdce',symbol:'연',intro:'마음 · 대화 · 거리 · 함께하는 생활'}
};
var ROLES=[
 {id:'title',stage:'opening',label:'이 질문에 담긴 풀이',order:0,kind:'reading'},
 {id:'reality',stage:'observation',label:'생활 속 장면',order:1,kind:'reading'},
 {id:'strength',stage:'strength',label:'살펴볼 장점',order:2,kind:'reading'},
 {id:'risk',stage:'conflict',label:'갈등과 반대 조건',order:3,kind:'reading'},
 {id:'reinforce',stage:'strategy',label:'조건을 살피는 전략',order:4,kind:'reading'},
 {id:'practice',stage:'practice',label:'작은 실천 하나',order:5,kind:'reading'},
 {id:'why',stage:'basis',label:'계산과 풀이의 연결',order:6,kind:'basis'},
 {id:'evidence',stage:'basis',label:'문안 출처와 해석의 범위',order:7,kind:'basis'}
];
var ROLE_LABELS={self:{strength:'나의 장점을 살펴보기',risk:'다르게 드러나는 조건',reinforce:'나에게 맞춰 활용하기'},wealth:{strength:'재물 풀이에서 살펴볼 장점',risk:'돈과 관련해 살필 갈등·조건',reinforce:'현실의 돈 관리에 연결하기'},career:{strength:'일에서 살펴볼 장점',risk:'일하는 환경의 갈등·조건',reinforce:'다음 선택의 조건 정리하기'},love:{strength:'관계에서 살펴볼 장점',risk:'관계의 갈등과 반대 조건',reinforce:'서로 조율할 방법 살펴보기'}};
var STAGES=[{id:'opening',order:0,label:'질문'},{id:'observation',order:1,label:'장면'},{id:'strength',order:2,label:'장점'},{id:'conflict',order:3,label:'갈등·조건'},{id:'strategy',order:4,label:'전략'},{id:'practice',order:5,label:'실천'},{id:'basis',order:6,label:'근거·범위'}];
function clone(x){return JSON.parse(JSON.stringify(x));}
function freeze(x){if(x&&typeof x==='object'){Object.keys(x).forEach(function(k){freeze(x[k]);});Object.freeze(x);}return x;}
freeze(TOPICS);freeze(ROLES);freeze(ROLE_LABELS);freeze(STAGES);
function catalogOf(catalog){return catalog&&Array.isArray(catalog.chapters)&&Array.isArray(catalog.topics)?catalog:R.Editorial&&R.Editorial.defaults?R.Editorial.defaults():{topics:[],chapters:[]};}
function chapterId(c){return typeof c==='string'?c:String(c&&(c.editorialContractId||c.chapterId||c.id)||'');}
function topicOf(c){var id=chapterId(c),matched=/^timeline_(self|wealth|career|love)_/.exec(id);if(matched)return matched[1];if(typeof c==='string')return TOPICS[c]?c:null;var explicit=c&&(c.editorialTopicId||c.topicId);return TOPICS[explicit]?explicit:null;}
function chapters(catalog,topic){if(typeof catalog==='string'&&topic==null){topic=catalog;catalog=null;}var source=catalogOf(catalog),wanted=typeof topic==='object'&&topic?topic.id:topic,enabled=new Set(source.topics.filter(function(t){return t.enabled===true&&TOPICS[t.id]&&(!wanted||t.id===wanted);}).map(function(t){return t.id;})),seen=new Set();
 var rows=source.chapters.filter(function(c){if(!c||!enabled.has(c.topicId)||c.state==='archived'||c.enabled===false||seen.has(c.id))return false;seen.add(c.id);return true;}).map(function(c){return Object.assign(clone(c),{chapterId:c.id,presentationSource:'catalog'});}).sort(function(a,b){var ao=Object.keys(TOPICS).indexOf(a.topicId),bo=Object.keys(TOPICS).indexOf(b.topicId);return ao-bo||(Number(a.order)||0)-(Number(b.order)||0)||(a.id<b.id?-1:a.id>b.id?1:0);});
 // This descriptor points to the existing local PeakReading chapter; it adds no reading or calculation.
 if(enabled.has('self')&&!seen.has('timeline_self_peak')){var anchor=rows.findIndex(function(c){return c.id==='timeline_self_20';});if(anchor>=0)rows.splice(anchor+1,0,{id:'timeline_self_peak',chapterId:'timeline_self_peak',topicId:'self',title:'내 인생의 전성기는 언제?',question:'내 인생의 전성기는 언제?',state:'derived',presentationSource:'existing-peak-reading',derivedFrom:'ReportV2.PeakReading',insertAfter:'timeline_self_20'});}
 return rows.map(function(c,i){c.presentationOrder=i;return c;});
}
function describe(c,catalog){var id=topicOf(c);if(!id)return null;var chapter=chapterId(c),source=catalogOf(catalog),contract=source.chapters.find(function(x){return x.id===chapter;}),input=c&&typeof c==='object'?c:{},topic=clone(TOPICS[id]),question=input.question||input.title||contract&&contract.question||contract&&contract.title|| (chapter==='timeline_self_peak'?'내 인생의 전성기는 언제?':topic.title);
 var scope=chapter==='timeline_self_peak'?'calculation':input.readingProvider==='local-reviewed-education'?'education':chapter==='timeline_self_35'?'health-reference':chapter==='timeline_self_36'?'fiction':'reviewed-reading';
 return Object.assign(topic,{schemaVersion:VERSION,chapterId:chapter,question:String(question),scope:scope,scopeLabel:scope==='calculation'?'기존 계산에 따른 시기 참고':scope==='education'?'건강·안전 일반 안내':scope==='health-reference'?'건강·안전 참고 해석':scope==='fiction'?'사주 모티브 창작 이야기':'검수 문안 읽기',roles:ROLES.map(function(role){return Object.assign({},role,{label:(ROLE_LABELS[id]||{})[role.id]||role.label,required:false});}),stages:clone(STAGES)});
}
var api={version:VERSION,topicOf:topicOf,describe:describe,chapters:chapters,blueprints:function(){return clone(TOPICS);}};R.SealTopics=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

