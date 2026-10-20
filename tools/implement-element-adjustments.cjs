const fs=require('fs');const p='engine.js';let s=fs.readFileSync(p,'utf8');const start=s.indexOf('  function elementWeights(ch, modelKey) {'),end=s.indexOf('  const STRENGTH_ZONES',start);if(start<0||end<0)throw Error('anchor');s=s.slice(0,start)+`  // Versioned app model: retain natal characters; adjust only relative distribution.
  const ADJUSTMENT_VERSION = 'element-adjustments-1';
  const POSITION_WEIGHT = { year: 0.9, month: 1.1, day: 1.1, hour: 0.9 };
  function adjustmentOptions(inp) {
    const out = {};
    for (const k of ['combinationMode', 'climatePalaceMode']) {
      const value = inp[k] == null ? 'auto' : inp[k];
      if (!['auto', 'off'].includes(value)) throw new Error('지원하지 않는 오행 보정 설정입니다');
      out[k] = value;
    }
    return out;
  }
  function combinationEffects(ch) {
    const candidates = ch.relations.filter(r => ['삼합', '방합', '육합', '천간합'].includes(r.type));
    const monthEl = stemEl(mainHidden(ch.pillars.month.b));
    return candidates.map(r => {
      const adjacent = r.members.length === 3 || Math.abs(POS.indexOf(r.members[0]) - POS.indexOf(r.members[1])) === 1;
      const supported = monthEl === r.el || (monthEl + 1) % 5 === r.el;
      const exposed = POS.some(k => ch.pillars[k] && stemEl(ch.pillars[k].s) === r.el);
      const clash = ch.relations.some(x => x.kind === r.kind && /충/.test(x.type) && x.members.some(k => r.members.includes(k)));
      const competition = candidates.some(x => x !== r && x.kind === r.kind && x.el !== r.el && x.members.some(k => r.members.includes(k)));
      const absorbed = candidates.some(x => x !== r && x.kind === r.kind && x.el === r.el && x.members.length > r.members.length && r.members.every(k => x.members.includes(k)));
      const reasons = [];
      if (!adjacent) reasons.push('서로 떨어진 두 글자');
      if (!supported) reasons.push('월령의 같은 오행·상생 지원 없음');
      if (r.type === '육합' && !exposed) reasons.push('결과 오행이 천간에 드러나지 않음');
      if (clash) reasons.push('참여 글자에 충이 함께 있음');
      if (competition) reasons.push('다른 오행의 합과 중복');
      if (absorbed) reasons.push('더 큰 같은 오행의 합에 포함');
      return { type:r.type, name:r.name, kind:r.kind, members:r.members.slice(), element:EL_K[r.el], el:r.el, eligible:!reasons.length, share:r.members.length === 3 ? 0.5 : 0.25, reasons:reasons.length ? reasons : ['인접·월령 지원·충 및 중복 조건 확인'] };
    });
  }
  function elementWeights(ch, modelKey, raw) {
    const M = MODELS[modelKey], options = raw ? {combinationMode:'off',climatePalaceMode:'off'} : ch.adjustmentOptions || adjustmentOptions(ch.input || {});
    const effects = combinationEffects(ch), shifts = new Map(), c = climate(ch);
    if (options.combinationMode === 'auto') for (const r of effects.filter(r => r.eligible)) for (const k of r.members) {
      const id = r.kind + ':' + k;
      if (!(r.kind === 'stem' && k === 'day') && !shifts.has(id)) shifts.set(id,r);
    }
    const climateFactors = [0.35,1,0,-0.35,-1].map((heat,e) => options.climatePalaceMode === 'auto' ? Math.max(0.85,Math.min(1.15,1 + 0.08 * heat * c.temp + 0.03 * [0,-1,0,0,1][e] * c.hum)) : 1);
    const els = [0,0,0,0,0], tg = {}; TG.forEach(t => tg[t] = 0);
    const d = ch.pillars.day.s; let total = 0;
    const add = (s,w,isDay,e) => { const weight=w*climateFactors[e];els[e]+=weight;total+=weight;if(!isDay)tg[tenGod(d,e*2+(s%2))]+=weight; };
    const addStem = (s,w,isDay,k,kind) => { const r=shifts.get(kind+':'+k),e=stemEl(s);if(r){add(s,w*(1-r.share),isDay,e);add(s,w*r.share,isDay,r.el);}else add(s,w,isDay,e); };
    for (const k of POS) {
      const p=ch.pillars[k];if(!p)continue;
      const pw=options.climatePalaceMode==='auto'?POSITION_WEIGHT[k]:1;
      addStem(p.s,pw,k==='day',k,'stem');
      const bw=(k==='month'?M.monthW:1)*pw;
      if(M.split)for(const [hs,days] of HIDDEN[p.b])addStem(hs,bw*days/30,false,k,'branch');
      else addStem(mainHidden(p.b),bw,false,k,'branch');
    }
    const pct=els.map(v=>v/total*100),groups=[0,0,0,0,0],dEl=stemEl(d);
    els.forEach((v,e)=>groups[groupOfEl(dEl,e)]+=v/total*100);
    const tgTotal=Object.values(tg).reduce((a,b)=>a+b,0),tgPct={};for(const t of TG)tgPct[t]=tg[t]/tgTotal*100;
    return {pct,groups,tgPct,total,adjustments:{version:ADJUSTMENT_VERSION,options:{...options},combinations:effects.map(r=>({...r,applied:options.combinationMode==='auto'&&r.eligible})),positionWeights:options.climatePalaceMode==='auto'?{...POSITION_WEIGHT}:null,climateFactors,notes:['합의 결과는 완전한 합화 확정이 아닌 비중의 부분 반영입니다.','조후·궁성 계수는 앱의 참고 모델이며 고전의 확정 공식이 아닙니다.','원국 글자·일간·지장간·합충 관계는 바꾸지 않습니다.']}};
  }
`+s.slice(end);s=s.replace("ch.model = inp.model || 'season';","ch.model = inp.model || 'season';\n    ch.adjustmentOptions = adjustmentOptions(inp);\n    ch.baseWeights = elementWeights(ch, ch.model, true);");fs.writeFileSync(p,s);
