// Complete editorial scenes selected only by existing calculated facts. No model or network.
// These are traditional reading guides, not verified biography or predictions of events.
import {PROFILE_COPY} from './_reading-profile-copy.js';
export const DETAIL_VERSION='detail-profiles-20261021-1';
const roles=['title','reality','strength','risk','reinforce','practice','why','evidence'];
const PROFILES=[{"id":"wood-initiative","name":"목 일간·신강·비견과 겁재","when":{"dayMaster":["갑","을"],"strength":["신강"],"tenGod":{"비견":"strong","겁재":"strong"}}},{"id":"fire-opportunity","name":"화 일간·신약·상관과 편재","when":{"dayMaster":["병","정"],"strength":["신약"],"tenGod":{"상관":"strong","편재":"strong"}}},{"id":"earth-steady","name":"토 일간·중화·식신과 정재","when":{"dayMaster":["무","기"],"strength":["중화"],"tenGod":{"식신":"strong","정재":"strong"}}},{"id":"metal-reform","name":"금 일간·신강·상관과 정관","when":{"dayMaster":["경","신"],"strength":["신강"],"tenGod":{"상관":"strong","정관":"strong"}}},{"id":"water-vigilance","name":"수 일간·신약·편관과 편인","when":{"dayMaster":["임","계"],"strength":["신약"],"tenGod":{"편관":"strong","편인":"strong"}}}];
export const DETAIL_PROFILES=PROFILES.map((p,i)=>({...p,copy:{self:PROFILE_COPY.self_01[i],wealth:PROFILE_COPY.wealth_01[i],career:PROFILE_COPY.career_01[i],love:PROFILE_COPY.love_01[i]}}));
export function detailPassages(c){
 const m=/^timeline_(self|wealth|career|love)_01$/.exec(c.id);if(!m)return [];
 return DETAIL_PROFILES.flatMap(p=>{
  const prefix='bundle-detail-'+p.id+'-'+m[1];
  const texts=[...p.copy[m[1]],'이 설명은 '+p.name+' 조건을 모두 만족할 때 선택하는 「'+c.title+'」의 생활 해설입니다. 이름이나 출생일로 임의 분류하지 않고 만세력이 계산한 조건을 그대로 사용해요.',
   '적용 조건: '+p.when.dayMaster.join('·')+' 일간, '+p.when.strength[0]+', '+Object.keys(p.when.tenGod).join('·')+' 각각 높은 비중입니다. 이는 전통 해석을 풀어쓴 문안이며 실제 경험을 확인한 사실이나 재산·건강·미래 사건의 판정이 아닙니다.'];
  return roles.map((role,i)=>({id:prefix+'-'+role,role,kind:'guide',text:texts[i],when:structuredClone(p.when),unless:{},ruleIds:[],adviceKey:prefix+'-'+role}));
 });
}
