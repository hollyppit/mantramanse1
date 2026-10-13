// Only onboarding display copy is migrated. Identifiers, research and assets stay intact.
export function migrateOnboardingCopy(config){
  const out=JSON.parse(JSON.stringify(config||{}));
  const clean=t=>typeof t==='string'?t.replace(/\{이름귀인\}/g,'{name}').replace(/\{귀인\}/g,'당신').replace(/귀인께서/g,'당신이').replace(/귀인의/g,'당신의').replace(/귀인(?:님)?[,，]?\s*/g,''):t;
  const walk=o=>{if(!o||typeof o!=='object')return;for(const k of Object.keys(o)){
    if(['title','sub','body','emphasis','detail','dialogue','head','desc','hint','button','line','say','tag','resumeText','leapText','calcLines','errLines','revealLines','lines','unknownLines'].includes(k)){
      const value=o[k];if(typeof value==='string')o[k]=clean(value);else if(Array.isArray(value))o[k]=value.map(clean);else if(value&&typeof value==='object')for(const g of ['male','female'])if(Array.isArray(value[g]))value[g]=value[g].map(clean);
    }
    if(k!=='cases'&&k!=='removedCases')walk(o[k]);
  }};
  walk(out);out.honorific='님';
  if(out.quest&&out.quest.guides){for(const g of ['male','female']){const v=out.quest.guides[g];if(!v)continue;if(['경계의 기록자','천명 기록관','시간의 해독자','운명 해독관'].includes(v.name))v.name=g==='male'?'운명 감찰관':'명운 해독관';}}
  out.copyRevision=2;return out;
}
