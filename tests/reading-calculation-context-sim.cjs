const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
global.window = globalThis;
for (const file of ['engine.js', 'report/v2/saju-data.js']) vm.runInThisContext(fs.readFileSync(file, 'utf8'), {filename: file});
(async () => {
  const E = await import('../functions/_interpretation-engine.js');
  const U = await import('../functions/_ux-writing.js');
  const inputs = [[1968,4,22,9,'M'],[1977,1,4,12,'F'],[1987,11,20,18,'F'],[2000,12,3,null,'M']];
  const profiles = inputs.map(([year,month,day,hour,gender]) => {
    const sd = ReportV2.SajuData.build(Manse.compute({year,month,day,hour,minute:0,gender,calendar:'solar',city:'서울'}), {now:Date.UTC(2026,9,19,3)});
    return {sd, summary:{hourKnown:hour!==null}};
  });
  // Minimal synthetic rule premises; no private source excerpts or local AI archives are required.
  const rules = {
    'TIMING-0034': {principle:'대운이 바뀌는 전후 1~2년의 변화를 점검합니다.',conditions:{daewoonSeason:['전환기']}},
    'CAREER-0025': {principle:'장성살이 운에서 오면 역할을 점검합니다.',conditions:{star:['장성살']}},
    'ACTION-0002': {principle:'재살이 운에서 오면 제약을 점검합니다.',conditions:{star:['재살']}},
    'ACTION-0023': {principle:'인성인 수를 토가 억누르는 사례입니다.',conditions:{}},
    'TIMING-0005': {principle:'배우자성이 강하고 일간이 약하며 대운·세운에 지원이 있는 사례입니다.',conditions:{strength:['신약']}},
    'MARRIAGE-0003': {principle:'일지의 홍염살에 충·형이 작용하는 사례입니다.',conditions:{star:['홍염살']}},
    'TIMING-0003': {principle:'방합과 삼합 구조의 반응을 비교합니다.',conditions:{}},
    'RELATIONSHIP-0026': {principle:'세운이 시지와 합하면 적용하는 사례입니다.',conditions:{}},
    'TIMING-0019': {principle:'세운이 연지와 합하면 적용하는 사례입니다.',conditions:{}}
  };
  const before = JSON.stringify(rules);
  for (const p of profiles) {
    const near = p.sd.daewoon.some(d => Math.abs(p.sd.nowYear-d.startYear)<=2);
    assert.equal(E.sourcePremiseIssue(rules['TIMING-0034'],p.sd)==='source-daewoon-boundary-window-mismatch',!near);
    const snapshot=JSON.stringify(p.sd), output=U.writingPlan({claims:[]},{sd:p.sd,chapter:{id:'test',paragraphs:[]}});
    assert.deepEqual(output.calculationFacts.placements.clashes,p.sd.clashes);
    assert.deepEqual(output.calculationFacts.placements.specialStars,p.sd.specialStars);
    assert.deepEqual(output.calculationFacts.timeCalculation.currentDaewoon,p.sd.currentDaewoon);
    assert.equal(JSON.stringify(p.sd),snapshot);
    if (!p.summary.hourKnown) assert(!output.calculationFacts.placements.pillars.hour);
  }
  for (const id of ['CAREER-0025','ACTION-0002']) assert.equal(E.sourcePremiseIssue(rules[id],profiles[1].sd),'source-luck-star-time-condition-missing');
  assert.equal(E.sourcePremiseIssue(rules['ACTION-0023'],profiles[0].sd),'source-resource-element-mismatch');
  assert.equal(E.sourcePremiseIssue(rules['TIMING-0005'],profiles[0].sd),'source-spouse-strength-mismatch');
  assert.equal(E.sourcePremiseIssue(rules['MARRIAGE-0003'],profiles[1].sd),'source-spouse-star-activation-mismatch');
  assert.equal(E.sourcePremiseIssue(rules['MARRIAGE-0003'],{...profiles[1].sd,clashes:[{type:'충',members:['day','hour']}]}),null);
  for (const p of profiles.slice(0,3)) assert.equal(E.sourcePremiseIssue(rules['TIMING-0003'],p.sd),'source-full-combination-missing');
  for (const id of ['RELATIONSHIP-0026','TIMING-0019']) assert.equal(E.sourcePremiseIssue(rules[id],profiles[1].sd),'source-annual-pillar-relation-unverified');
  const at={...profiles[1].sd,currentDaewoon:{startYear:2026,endYear:2035},daewoon:[{startYear:2026,endYear:2035}]};
  for (const [year,valid] of [[2024,true],[2026,true],[2028,true],[2029,false]]) assert.equal(E.sourcePremiseIssue(rules['TIMING-0034'],{...at,nowYear:year})==null,valid);
  assert.equal(JSON.stringify(rules),before);
  assert(U.inspectWriting([{id:'0',role:'title',text:'사고수는 전통적인 해석 개념입니다.'}],{}).issues.some(i=>i.code==='technical-term'));
  console.log('PASS: four synthetic charts, temporal and placement premises, boundary windows, unknown hour, immutable calculation context; no private fixtures');
})().catch(e=>{console.error(e);process.exitCode=1;});
