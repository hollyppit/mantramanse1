// 정밀 보정 레이어: 풀이 본문을 고른 뒤, 이 사람의 일간·월지·용신에 맞는 문장을 생활 사례(reality) 문단 끝에 덧붙인다.
// 문단 문안(라이브러리)은 십성·강약 조합으로만 갈리므로, 같은 조합의 사용자도 이 층에서 서로 다른 문장을 받는다. AI·네트워크 호출 없음, 결정적.
// 한 주제 안에서 같은 문장이 두 장에 나오지 않도록, 주제마다 장을 고르게 나눠 앵커 장 3·변형 수개에만 붙인다.
import {DM,MB,YONG,TOPICS} from './_detail-reading-data.js';
export const DETAIL_VERSION='detail-20261025-1';
const COUNT={self:22,wealth:12,career:12,love:12,health:10,remedy:8};
const AXES=[['dm',DM],['mb',MB],['yong',YONG]];
const SKIP=new Set(['timeline_self_02']); // 자동차 비유 장은 비유를 깨지 않도록 제외
const VARIANTS=Math.min(...AXES.flatMap(([,d])=>Object.values(d).flatMap(t=>TOPICS.map(k=>t[k].length))));
export const parseChapter=id=>{const m=/^timeline_([a-z]+)_(\d+)$/.exec(String(id||''));return m&&COUNT[m[1]]?{topic:m[1],index:Number(m[2])-1}:null;};
// 앵커: 주제 장 수를 3×변형 수 구간으로 나눈 가운데 장. 앵커 j의 축은 j%3, 변형은 floor(j/3).
export function anchors(topic){
 const n=COUNT[topic],k=3*VARIANTS,out=[];
 for(let j=0;j<k;j++){let pos=Math.floor((j+0.5)*n/k);if(SKIP.has('timeline_'+topic+'_'+String(pos+1).padStart(2,'0')))pos+=1;out.push({pos,axis:j%3,variant:Math.floor(j/3)});}
 return out;
}
export function keysOf(sd){
 return {dm:sd?.dayMaster?.stem||'',mb:sd?.pillars?.month?.ko?.[1]||'',yong:sd?.usefulElements?.yong||''};
}
export function sentence(chapterId,sd){
 const ch=parseChapter(chapterId);if(!ch||SKIP.has(chapterId))return '';
 const a=anchors(ch.topic).find(x=>x.pos===ch.index);if(!a)return '';
 const [axis,dict]=AXES[a.axis],key=keysOf(sd)[axis],row=dict[key];
 return row?.[ch.topic]?.[a.variant]||'';
}
export const DetailReading={sentence,anchors,parseChapter,keysOf,version:DETAIL_VERSION,variants:VARIANTS};
