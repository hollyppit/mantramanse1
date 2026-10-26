/* '내 사주로 더 깊게' 층. 장마다 사주 값(가장 센 기운·가장 약한 기운·일간의 힘·나를 채워 주는 기운·지금 대운)에 맞는 문단을 붙인다.
   문안은 reading-depth-data-*.js 가 R.ReadingDepthData[장 id]에 등록한다. 값은 엔진이 계산한 것만 읽고 새로 해석하지 않는다. */
(function(root){'use strict';var R=root.ReportV2=root.ReportV2||{};
var GROUPS=['비겁','식상','재성','관성','인성'],BANDS=['신강','중화','신약'],ELS=['목','화','토','금','수'];
var GLOSS={비겁:'내 편·경쟁·자기 힘',식상:'표현·재주',재성:'돈·현실',관성:'책임·자리',인성:'배움·보호'};
var EL_GLOSS={목:'성장·시작',화:'표현·열기',토:'안정·중심',금:'결단·정리',수:'지혜·흐름'};
var TG_GROUP={비견:'비겁',겁재:'비겁',식신:'식상',상관:'식상',편재:'재성',정재:'재성',편관:'관성',정관:'관성',편인:'인성',정인:'인성'};
var BAND_LEAD={신강:'내 힘이 센 편이라는 계산이 나왔어요.',중화:'내 힘이 한쪽으로 치우치지 않은 편이에요.',신약:'내 힘이 상대적으로 여린 편이에요.'};
// 문안이 앞 문장과 같은 사실을 다시 말하면 그 앞머리를 덜어 낸다.
function trimBand(t){return t.replace(/^힘이 (?:센|고른|여린) 편이라(?:는 )?,? ?/,'');}
function trimYong(t){return t.replace(/^(?:충전 방법: |나를 채워 주는 )?(?:연료가 )?[목화토금수] (?:기운(?:이|을)? ?(?:나를 )?(?:채워 주니|도와주니|채우면|채워 주세요\.)|쪽이라|쪽이 )[,\s]*/,'').replace(/^(?:나를 채워 주는 )?연료가 [목화토금수] 쪽이라,? ?/,'');}
// 한 리포트에서 20장 넘게 같은 문장으로 시작하지 않도록, 장 id로 앞머리 표현을 돌려 쓴다.
var LEAD_STRONG=['내 사주에서 가장 두드러진 기운은 {g}이에요.','원국에서 가장 큰 몫을 차지하는 기운은 {g}이에요.','타고난 글자 중 가장 힘이 센 쪽은 {g}이에요.','내 사주를 움직이는 중심 기운은 {g}이에요.'];
var LEAD_WEAK=['상대적으로 가장 약한 기운은 {g}이에요.','가장 적게 담긴 기운은 {g}이에요.','원국에서 가장 조용한 기운은 {g}이에요.','힘이 가장 덜 실린 쪽은 {g}이에요.'];
var LEAD_YONG=['나를 채워 주는 기운은 {e} 쪽이에요.','내게 힘을 보태 주는 기운은 {e} 쪽이에요.','부족한 곳을 메워 주는 기운은 {e} 쪽이에요.','내 사주의 균형을 잡아 주는 기운은 {e} 쪽이에요.'];
var LEAD_LUCK=['지금 지나는 대운은 {g}이 강조되는 구간이에요.','지금의 10년 대운은 {g} 쪽으로 기울어 있어요.','현재 대운에서는 {g}의 기운이 두드러져요.','지금 걷는 대운은 {g}이 중심이 되는 시기예요.'];
function hashId(id){var n=0;for(var i=0;i<String(id).length;i++)n=(n*31+String(id).charCodeAt(i))>>>0;return n;}
function lead(list,id,salt,k,v){return list[(hashId(id)+salt)%list.length].replace(k,v);}
function pickStrongest(sd){var g=sd.groups||{},best=null;GROUPS.forEach(function(k){if(Number.isFinite(g[k])&&(best===null||g[k]>g[best]))best=k;});return GROUPS.indexOf(sd.dominantGroup)>=0?sd.dominantGroup:best;}
function pickWeakest(sd){var g=sd.groups||{},best=null;GROUPS.forEach(function(k){if(Number.isFinite(g[k])&&(best===null||g[k]<g[best]))best=k;});return GROUPS.indexOf(sd.weakestGroup)>=0?sd.weakestGroup:best;}
// 한 장에 붙일 문단: [{key,text}]. 데이터가 없는 값은 건너뛰고, 사주 값이 없으면 빈 배열.
function paragraphs(c,sd){var id=c&&(c.editorialContractId||c.id),d=R.ReadingDepthData&&R.ReadingDepthData[id];if(!d||!sd)return [];var out=[];
 var top=pickStrongest(sd),weak=pickWeakest(sd),band=sd.strength&&sd.strength.band,yong=sd.usefulElements&&sd.usefulElements.yong,dw=sd.currentDaewoon,tg=dw&&TG_GROUP[dw.stemTG],nowY=sd.nowYear;
 var ti=GROUPS.indexOf(top),wi=GROUPS.indexOf(weak),bi=BANDS.indexOf(band),yi=ELS.indexOf(yong);
 if(ti>=0&&d.g&&d.g[ti])out.push({key:'strong',text:lead(LEAD_STRONG,id,0,'{g}',top+'('+GLOSS[top]+')')+' '+d.g[ti]});
 if(wi>=0&&d.w&&d.w[wi]&&weak!==top)out.push({key:'weak',text:lead(LEAD_WEAK,id,1,'{g}',weak+'('+GLOSS[weak]+')')+' '+d.w[wi]});
 if(bi>=0&&d.b&&d.b[bi])out.push({key:'band',text:BAND_LEAD[band]+' '+trimBand(d.b[bi])});
 if(yi>=0&&d.y&&d.y[yi])out.push({key:'yong',text:lead(LEAD_YONG,id,2,'{e}',yong+'('+EL_GLOSS[yong]+')')+' '+trimYong(d.y[yi])});
 if(d.t&&tg&&dw&&(!nowY||(dw.startYear<=nowY&&nowY<=dw.endYear))){var ki=GROUPS.indexOf(tg);if(ki>=0&&d.t[ki])out.push({key:'luck',text:lead(LEAD_LUCK,id,3,'{g}',tg+'('+GLOSS[tg]+')')+' '+d.t[ki]});}
 return out;}
function html(c,esc){var sd=c&&c.readingVisualData,ps=paragraphs(c,sd);if(!ps.length)return '';
 return '<div class="reading-depth"><h3>내 사주로 더 깊게 보면</h3>'+ps.map(function(p){return '<p class="lead" data-reading-role="depth" data-depth-key="'+p.key+'">'+esc(p.text)+'</p>';}).join('')+'</div>';}
R.ReadingDepthData=R.ReadingDepthData||{};
R.ReadingDepth={paragraphs:paragraphs,html:html,GROUPS:GROUPS,BANDS:BANDS,ELS:ELS};
})(typeof window!=='undefined'?window:globalThis);
