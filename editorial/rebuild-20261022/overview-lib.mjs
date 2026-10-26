import {entry} from './lib.mjs';
// 종합풀이 20장 중 새로 쓰는 요약 장의 공통 틀. 일간의 힘(신강/중화/신약) 세 갈래로 나누고, 통근은 이 장들에서 가르지 않으므로 모든 구간을 허용한다(조건 두 개 이상 규칙 때문에 넣음).
export const ST={강:['신강'],중:['중화'],약:['신약']};
export const ANY_ROOT=['매우 강한 통근','강한 통근','통근','약한 통근','매우 약한 통근','무근'];
// table: {강:{id,core:[후킹,이어지는 문장],hint,ex,pos,neg,adv,emp,biz,free}, 중:{…}, 약:{…}}
export function byStrength({ch,key,table,tail,notice}){
 return ['강','중','약'].map(s=>{const u=table[s];return {...entry({id:`${key}-${u.id}`,chapter:ch,when:{strength:ST[s],rootLevel:ANY_ROOT},tags:[`${key}.${u.id}.${s}`],storyKey:u.story,
  text:[`${u.core[0]} ${u.core[1]}`,`일간의 힘이 ${ST[s][0]}이라 ${u.hint}. ${tail}`,u.ex,u.pos,u.neg,u.adv,u.emp,u.biz,u.free]}),...(notice?{notice}:{})};});
}
