// Concrete outcomes and everyday situations; technical distributions stay in evidence.
import { FLOW_SCENES } from './_reading-flow-scenes.js';
const particle=s=>{const n=[...s].at(-1).charCodeAt(0)-0xac00;return n>=0&&n<11172&&n%28?'은':'는';};
export const NARRATIVE_OPENINGS=Object.fromEntries(Object.entries(FLOW_SCENES).map(([topic,rows])=>[topic,rows.map(([scene,object,gain,cost])=>[
 scene+'에는 잘하는 일도 무리해서 늘리지 않는 게 좋아요. '+cost+particle(cost)+' 조심하셔야 해요.',
 scene+'에는 내 생각만큼 주변 상황도 신경 쓰이실 거예요. 이때 중요한 건 '+gain+'이에요.',
 scene+'에도 처음부터 다 해내려고 애쓰지 마세요. '+cost+'까지 감수할 필요는 없어요.'
]) ]));
