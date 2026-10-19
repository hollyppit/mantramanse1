import {compoundPassages} from './_reading-compound-copy.js';
import {conditionalPassages} from './_reading-conditional-copy.js';
import {GUIDE_COPY} from './_reading-guide-copy.js';
import {FICTION_COPY,FICTION_MOTIFS} from './_reading-fiction-copy.js';
import {politeText} from './_polite.js';
export const SEED_VERSION='compound-76-20261020-6';
const stems={목:['갑','을'],화:['병','정'],토:['무','기'],금:['경','신'],수:['임','계']};
const elementId={목:'wood',화:'fire',토:'earth',금:'metal',수:'water'};
export function seedPassages(contract){
 const m=contract.id.match(/^timeline_(self|wealth|career|love|health|creative|remedy)_(\d+)$/);if(!m)return [];
 const topic=m[1],i=Number(m[2])-1,fields=['title','reality','strength','risk','reinforce','practice'];
 const make=(role,text,kind='guide',suffix=role,when={})=>({id:'seed-'+topic+'-'+(i+1)+'-'+suffix,role,kind,text:politeText(text),ruleIds:[],when,unless:{},adviceKey:'seed-'+topic+'-'+(i+1)+'-'+suffix});
 if(topic==='creative'){
  const story=FICTION_COPY[i];if(!story)return [];
  return [make('title',story.title,'fiction'),...Object.entries(stems).map(([el,values])=>make('reality',story.body+'\n\n'+FICTION_MOTIFS[el][i],'fiction','reality-'+elementId[el],{dayMaster:values})),
   make('why','이 장면의 시대와 인물, 사건은 미리 작성한 창작 설정입니다. 계산된 일간의 오행은 장면의 상징 표현을 고르는 데만 사용하며 실제 성향이나 과거의 증거로 쓰지 않습니다.','fiction'),
   make('strength',story.choice,'fiction'),make('risk',story.cost,'fiction'),
   make('reinforce','이 장면을 읽을 때는 「'+contract.title+'」에서 인물이 지키려 했던 것과 실제로 선택한 행동을 구분해 보세요. 이야기를 자신의 과거라고 받아들일 필요는 없습니다.','fiction'),
   make('practice','「'+contract.title+'」에서 다른 결정을 내릴 수 있었던 순간을 찾아보세요. 독자에게 같은 일이 일어난다는 예고가 아니라 장면을 다시 읽는 감상 질문입니다.','fiction'),
   make('evidence','이 연작은 기록관 서윤과 목수 하람이 항구의 빠진 기록을 찾는 창작 이야기입니다. 인물 이름과 사건은 모든 장에서 이어지며 사주 근거를 대신하지 않습니다.','fiction')];
 }
 const row=GUIDE_COPY[topic]?.[i];if(!row)return [];
 return [...conditionalPassages(contract,row),...compoundPassages(contract),...fields.map((role,n)=>make(role,row[n])),
  make('why','이 항목의 예시는 「'+contract.example+'」을 가정한 설명입니다. 질문과 관련된 생활 조건을 비교하는 데 쓰며, 독자의 실제 경험을 확인한 사실로 제시하지 않습니다.'),
  make('evidence','질문 「'+contract.question+'」의 전통 해석에서는 '+contract.requiredEvidence.join(', ')+'을 구분해 확인합니다. 적용된 게시 근거가 있을 때만 개인 풀이로 연결하고, 이 참고 설명 자체를 새로운 명리 근거로 사용하지 않습니다.')];
}
