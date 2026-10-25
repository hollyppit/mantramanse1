// 정밀 보정 레이어: 풀이 본문을 고른 뒤, 이 사람의 일간·월지·용신에 맞는 문장을 생활 사례(reality) 문단에 덧붙인다.
// 문단 문안(라이브러리)은 십성·강약 조합으로만 갈리므로, 같은 조합의 사용자도 이 층에서 서로 다른 문장을 받는다. AI·네트워크 호출 없음, 결정적.
// 한 리포트 안에서 같은 문장이 두 장에 나오지 않도록, 주제의 장을 순서대로 (일간→월지→용신) 축을 돌려 가며 배정하고
// 같은 축은 장마다 다른 변형을 쓴다. 자동차 비유 장은 비유를 깨지 않도록 제외한다.
import {DM,MB,YONG,TOPICS} from './_detail-reading-data.js';
import {DM_X} from './_detail-reading-extra-dm.js';
import {MB_X} from './_detail-reading-extra-mb.js';
import {YONG_X} from './_detail-reading-extra-yong.js';
import {TAIL} from './_detail-reading-extra-tail.js';
export const DETAIL_VERSION='detail-20261026-4';
export const COUNT={self:22,wealth:12,career:12,love:12,health:10,remedy:8};
const SKIP=new Set(['timeline_self_02']);
const merge=(base,extra,tail={})=>Object.fromEntries(Object.keys(base).map(k=>[k,Object.fromEntries(TOPICS.map(t=>[t,[...base[k][t],...(extra[k]?.[t]||[]),...(tail[t]?.[k]?[tail[t][k]]:[])]]))]));
export const DICT={dm:merge(DM,DM_X,TAIL.dm),mb:merge(MB,MB_X,TAIL.mb),yong:merge(YONG,YONG_X)};
export const AXES=['dm','mb','yong'];
const chapterId=(topic,i)=>`timeline_${topic}_${String(i).padStart(2,'0')}`;
export const parseChapter=id=>{const m=/^timeline_([a-z]+)_(\d+)$/.exec(String(id||''));return m&&COUNT[m[1]]?{topic:m[1],number:Number(m[2])}:null;};
// 앵커: 자격이 있는 장을 순서대로 배정. j번째 장의 축은 j%3, 변형은 floor(j/3).
export function anchors(topic){
 const out=[];let j=0;
 for(let n=1;n<=COUNT[topic];n++){if(SKIP.has(chapterId(topic,n)))continue;out.push({number:n,axis:j%3,variant:Math.floor(j/3)});j++;}
 return out;
}
export function keysOf(sd){
 return {dm:sd?.dayMaster?.stem||'',mb:sd?.pillars?.month?.ko?.[1]||'',yong:sd?.usefulElements?.yong||''};
}
export function sentence(id,sd){
 const ch=parseChapter(id);if(!ch||SKIP.has(id))return '';
 const a=anchors(ch.topic).find(x=>x.number===ch.number);if(!a)return '';
 const axis=AXES[a.axis],key=keysOf(sd)[axis],text=DICT[axis][key]?.[ch.topic]?.[a.variant]||'';
 return axis==='yong'?varyYongLead(text,ch.number):text;
}
// "용신이 금으로 계산돼요."로 시작하는 문장이 여러 장에 똑같이 나오지 않도록, 장 번호에 따라 첫머리를 바꿔 한 문장으로 잇는다.
const YONG_LEAD=/^용신(?:[(]균형을 잡아 주는 기운[)])?이 ([목화토금수])(?:으로|로) 계산돼요[.] (.+)$/;
const BATCHIM=new Set(['목','금']);
export function varyYongLead(text,number){
 const m=YONG_LEAD.exec(text||'');if(!m)return text||'';const el=m[1],rest=m[2];
 const leads=['용신(균형을 잡아 주는 기운)이 '+el+(BATCHIM.has(el)?'이라서':'라서')+', ',el+' 용신의 결로 보면, ','균형을 잡아 주는 '+el+' 기운 쪽에서 보면, '];
 return leads[number%3]+rest;
}
export const DetailReading={sentence,anchors,parseChapter,keysOf,varyYongLead,version:DETAIL_VERSION};
