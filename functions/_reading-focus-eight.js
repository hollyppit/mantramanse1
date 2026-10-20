// Authored chapter-specific guides. Conditions reuse the existing calculator; no new fortune rules.
import {DETAIL_PROFILES} from './_reading-detail-profiles.js';
import {PROFILE_COPY,TIMING_COPY} from './_reading-profile-copy.js';
export const FOCUS_VERSION='focus-eight-20261021-1';
export const FOCUS_CHAPTERS={timeline_self_01:'identity',timeline_self_05:'contrast',timeline_self_12:'mistake',timeline_wealth_02:'income',timeline_career_01:'work',timeline_love_06:'conflict',timeline_self_20:'timing',timeline_self_22:'manual'};
const roles=['title','reality','strength','risk','reinforce','practice','why','evidence'];
const timing=[
 {id:'open',name:'기회·확장 흐름',seasons:['기회기','확장기']},
 {id:'build',name:'축적·수확 흐름',seasons:['축적기','수확기']},
 {id:'adjust',name:'전환·방어 흐름',seasons:['전환기','방어기']}
];
const EVIDENCE='이 문안은 계산값에 맞춰 고르는 생활 참고 해설입니다. 연결된 원문 근거가 없는 해설을 개인 사실이나 고전 규칙으로 승격하지 않습니다. 실제 경험과 다른 부분은 맞춰 받아들이기보다 생활 환경과 함께 다시 살펴보세요.';
export function focusPassages(c){
 const topic=FOCUS_CHAPTERS[c.id];if(!topic)return [];
 const make=(id,row,when,basis)=>{const texts=[...row,basis,EVIDENCE];return roles.map((role,i)=>({id:'bundle-focus-'+id+'-'+topic+'-'+role,role,kind:'guide',text:texts[i],when:structuredClone(when),unless:{},ruleIds:[],adviceKey:'focus-'+id+'-'+topic+'-'+role}));};
 if(topic==='timing')return timing.flatMap(t=>['신강','중화','신약'].flatMap((band,i)=>make(t.id+'-'+['strong','balanced','weak'][i],TIMING_COPY[t.id][band].slice(),{daewoonSeason:t.seasons,strength:[band]},'현재 대운의 기존 흐름 분류가 '+t.seasons.join(' 또는 ')+'이고 원국의 강약 모델이 '+band+'일 때만 선택합니다. 대운 기간과 세운의 판단은 별개로 확인하며 이 해설에서 새 점수나 전환 연도를 만들지 않습니다.')));
 const rows=PROFILE_COPY[c.id.replace(/^timeline_/,'')];if(!rows)throw Error('Missing focus chapter copy: '+c.id);
 return DETAIL_PROFILES.flatMap((p,i)=>make(p.id,rows[i].slice(),p.when,p.name+'의 일간·강약 분류·개별 십성 조건이 모두 맞을 때 선택합니다. 일간은 전통 비유이고 강약은 기존 계산 모델의 구간이며, 두 십성의 높은 비중만으로 실제 행동이나 사건을 판정하지 않습니다. 생활 장면은 경험과 비교하기 위한 예시입니다.'));
}
export function focusProfileKey(id){const m=/^bundle-focus-(.+)-(identity|contrast|mistake|income|work|conflict|timing|manual)-(title|reality|strength|risk|reinforce|practice|why|evidence)$/.exec(id||'');return m?m[1]:'';}
