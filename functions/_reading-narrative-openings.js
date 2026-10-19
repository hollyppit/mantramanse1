// Question-specific outcomes; no repeated instruction to prepare or seek permission.
import { FLOW_SCENES } from './_reading-flow-scenes.js';
export const NARRATIVE_OPENINGS=Object.fromEntries(Object.entries(FLOW_SCENES).map(([topic,rows])=>[topic,rows.map(([scene,object,gain,cost])=>[
 gain+'도 중요하지만, '+cost+'까지 감수할 필요는 없어요.',
 scene+'에는 하나의 방식만 고집할 필요는 없어요. '+gain+'부터 생각해 보세요.',
 scene+'에는 '+gain+'에 필요한 작은 조건부터 마련해 보세요.'
]) ]));
