import { analyze } from './_interpretation-engine.js';
const TIME_FIELDS = new Set(['daewoonStemTG','daewoonBranchTG','seunStemTG','seunBranchTG']);
const TG = new Set(['비견','겁재','식신','상관','편재','정재','편관','정관','편인','정인']);
// Evidence inspection only. This endpoint never approves rules or generates predictions.
export function annualEvidence(sd, periods, items, opts = {}) {
  if (!Number.isInteger(sd?.nowYear) || !Array.isArray(periods) || !periods.length || periods.length > 10) throw Error('invalid-annual-periods');
  const validLuck = value => value && typeof value.ganzhi === 'string' && TG.has(value.stemTG) && TG.has(value.branchTG);
  for (const [i,p] of periods.entries()) {
    if (!p || p.year !== sd.nowYear + i || p.sewoon?.year !== p.year || !validLuck(p.sewoon)) throw Error('invalid-annual-periods');
    const dw=p.currentDaewoon;
    if (dw != null && (!validLuck(dw) || !Number.isInteger(dw.startYear) || !Number.isInteger(dw.endYear) || dw.startYear > p.year || dw.endYear < p.year)) throw Error('invalid-annual-periods');
  }
  const temporalItems=items.filter(r=>[r.conditions,...(r.alsoWhen || [])].some(c=>Object.keys(c || {}).some(k=>TIME_FIELDS.has(k))));
  return periods.map(p => {
    // Keep natal observations; discard current-year-only context rather than cloning it into the future.
    const chart={...sd,nowYear:p.year,sewoon:p.sewoon,currentDaewoon:p.currentDaewoon,monthlyLuck:[],currentRoots:null,ziwei:null,
      calculationProvenance:{...sd.calculationProvenance,annualSajuYear:p.year,annualScope:'existing-engine-luck-values'}};
    const a=analyze(chart,temporalItems,opts), allowed=opts.sourceRuleIds?.length ? new Set(opts.sourceRuleIds) : null;
    const claims=a.claims.filter(c=>c.system==='saju' && c.elements.some(e=>TIME_FIELDS.has(e.key)) && (!allowed || allowed.has(c.knowledge_id)));
    return {year:p.year,calculated:{sewoon:p.sewoon,currentDaewoon:p.currentDaewoon},scope:'annual-rule-evidence',
      status:claims.length?'candidate-evidence-present':'missing-evidence',requiresExpertReview:true,
      claims,limitations:['계산 간지와 십성은 사건 예측의 근거가 아닙니다.','후보 존재는 챕터 전체의 근거 충족이나 전문가 승인이 아닙니다.'],
      warnings:[...(!p.currentDaewoon?[{code:'annual-daewoon-unavailable'}]:[]),...(!claims.length?[{code:'annual-evidence-missing'}]:[])]};
  });
}
