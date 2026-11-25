// 전문가 검토용 사례집(30개) 문서 생성: data/casebook30.json → 04_전문가_검토용_사례집.md
//   결론만이 아니라 엔진이 쓴 근거(이론별 판정·단계·조건·격국 상신/파격·합화 사유)를 그대로 싣는다.
//   사용: node tools/myeongri-audit-20261125/casebook.cjs (audit.cjs 다음)
const fs = require('fs'), path = require('path');
const DIR = path.join(__dirname, '..', '..', 'docs', 'myeongri-audit-2026-11-25');
const B = JSON.parse(fs.readFileSync(path.join(DIR, 'data', 'casebook30.json'), 'utf8'));
const EL = ['목', '화', '토', '금', '수'], GN = ['비겁', '식상', '재성', '관성', '인성'];
const TH = { eokbu: '억부', johu: '조후', tonggwan: '통관', gyeok: '격국', jehwa: '제화' };
const MODE = { single: '단일 기준', agree: '조후·억부 같은 방향', conflict: '조후·억부 충돌', bridge: '겸용(양쪽 만족)', jong: '종격', forced: '직접 선택' };
const JONG = { none: '해당 없음', jin: '진종', ga: '가종(가능성)', hold: '보류(시 미상)' };
const GS = { seong: '성격', pa: '파격', part: '부분 성격', none: '격 쓰기 어려움', hold: '참고(시 미상)' };
const esc = s => String(s == null ? '' : s).replace(/\|/g, '／');
// 유형별 기본 쟁점(학파 차이를 오류로 단정하지 않기 위한 질문)
const Q = {
  '신강·신약 경계': ['돕는 힘이 50% 근처라 억부 용신 방향이 기준선 하나로 갈린다. 득령·득지·득세와 통근을 보면 이 명식은 신강·신약 중 어느 쪽인가?', '경계 명식에서 억부보다 격국·조후를 앞세운 엔진의 순서가 타당한가?'],
  '조후·억부 충돌': ['조후 용신과 억부 용신이 다른 오행을 원한다. 『궁통보감』 일간×월 조후표로 보면 이 명식의 조후 용신은 엔진 결과와 같은가?', '엔진은 급함 단계(치우침 크기)로 주 기준을 고른다. 이 명식에서 어느 쪽을 먼저 써야 하는가?'],
  '격국 뚜렷': ['엔진은 월지 지장간 중 천간에 드러난 글자(정기 우선)로 격을 잡는다. 사령(지금 주도 글자)이나 다른 투출 기준으로 보면 격이 같은가?', '상신이 실제로 격을 돕는 위치(인접·같은 층)에 있는가? 합으로 묶이지 않았는가?'],
  '종격·특수격 후보': ['진종·가종 판정이 타당한가? 가종이면 운에 따라 종격처럼 움직인다고 보는가(엔진은 가종에 억부 역할표 사용)?', '종격의 용·희·한·구·기 배치(특히 비겁·인성의 역할)가 학파 기준과 맞는가?'],
  '합충 중첩': ['한 글자가 합과 충에 함께 걸린다. 합이 충을 풀어 주는가(탐합망충), 충이 합을 깨는가? 엔진은 충이 있으면 합화를 인정하지 않고, 충의 힘 감소는 그대로 둔다.', '합화(化)가 성립하는가, 묶이기만 하는가(合而不化)?'],
  '용신·기신 복잡': ['조건부 역할(다른 이론이 필요로 하는 기신·구신을 누그러뜨림)이 여러 개다. 이 명식의 실제 희기는 어떻게 보는가?', '한신으로 배정된 오행이 실제로 중립인가?'],
};
const flagText = f => {
  const t = [];
  if (f.eokbuFlip) t.push('돕는 힘 ±3%p 안에서 억부 용신이 바뀜(경계 민감)');
  if (f.hanAgainst) t.push('한신 배치: ' + f.hanAgainst);
  if (f.jongRoleIssue) t.push('종격 역할 배치: ' + f.jongRoleIssue + ' — 비겁을 기신으로 보는 학파가 많음');
  if (f.hapAndChungSame && f.hapAndChungSame.length) t.push('합과 충이 함께 걸린 글자: ' + f.hapAndChungSame.map(k => k.replace('branch:', '').replace('stem:', '천간 ').replace('year', '년').replace('month', '월').replace('day', '일').replace('hour', '시')).join(', '));
  if (f.wuWeiHap) t.push('午未합을 화(火)로 봄 — 토(土)로 보는 학파 있음');
  if (f.dayStemHap && f.dayStemHap.length) t.push('일간 천간합 ' + f.dayStemHap.join(', ') + ' — 엔진은 일간 합화(화기격)를 판정하지 않음' + (f.hwagiCandidate.length ? ' · 인접·월령 지원이 있어 화기격 후보' : ''));
  if (f.nonAdjStemHap && f.nonAdjStemHap.length) t.push('떨어진 천간합 ' + f.nonAdjStemHap.join(', ') + ' — 관계 목록에는 표시, 합화 반영은 안 함');
  if (f.saengMyoNoWang) t.push('생지·묘지(공합)만 있음 — 엔진은 반합으로 보지 않음');
  if (f.threeWay && f.threeWay.length) t.push('같은 구조의 판정이 엇갈림: ' + f.threeWay.join(', '));
  if (f.goodPatternVsRole && f.goodPatternVsRole.length) t.push('좋은 구조 이름과 역할이 반대: ' + f.goodPatternVsRole.join(', '));
  if (f.patVsGyeok && f.patVsGyeok.length) t.push('구조 목록(지지 정기만)과 격국 파격(지장간 전체) 불일치: ' + f.patVsGyeok.join(', '));
  if (f.saryeongVsGyeok) t.push('사령 기준이면 격이 달라질 수 있음(학파)');
  if (f.yongAbsent) t.push('용신 오행이 원국에 1% 미만');
  if (f.gyeokPrimaryDouble) t.push('격국이 주 기준 — 운 점수에서 격국 성분과 역할표가 같은 오행을 봄(가중 평균이라 크기는 늘지 않음)');
  if (f.oneElementDominant) t.push('한 오행이 60% 이상 — 일행득기 등 특수격 후보(엔진은 종왕·종강으로만 판정)');
  return t;
};
const L = [];
L.push('# 4. 전문가 검토용 사례집 30개 (2026-11-25)', '');
L.push(`- 엔진: \`engine.js\` ${B.engineHash}(운영본, 변경 없음) · 생성: ${B.runAt.slice(0, 10)} · 원자료: \`data/casebook30.json\``);
L.push('- 표본: 300개 명식 검사(`03`)에서 여섯 유형마다 5개를 표본 순서 균등 간격으로 뽑음(유형 간 중복 없음). 생성식 표본이라 실존 인물이 아니다.');
L.push('- 각 사례는 엔진의 결론과 함께 **엔진이 쓴 근거를 그대로** 싣는다. "전문가 검토 쟁점"은 정답이 아니라 확인할 질문이다.');
L.push('- 표기: 오행 비율·십성 묶음은 엔진 세력 모델(월령 2배·왕상휴수사·뿌리·충형파해·합화 부분 반영) 값. 흐름 점수는 −100~+100, 등급은 좋음·무난·조심.', '');
const byType = {}; B.cases.forEach(c => (byType[c.type] = byType[c.type] || []).push(c));
let n = 0;
for (const [type, cases] of Object.entries(byType)) {
  L.push(`## ${type}`, '', '**이 유형의 기본 쟁점**', ...Q[type].map(q => '- ' + q), '');
  for (const { chart: c, flags: f } of cases) {
    n++; const u = c.unified, I = c.input;
    L.push(`### 사례 ${String(n).padStart(2, '0')} — 표본 #${c.idx} · ${c.pillars}`, '');
    L.push(`- 입력: 양력 ${I.year}-${String(I.month).padStart(2, '0')}-${String(I.day).padStart(2, '0')} ${String(I.hour).padStart(2, '0')}:00 · ${I.gender === 'M' ? '남' : '여'} · 한국 표준시`);
    L.push(`- **원국**: 년 ${c.pillars.split(' ')[0]} · 월 ${c.pillars.split(' ')[1]} · 일 ${c.pillars.split(' ')[2]} · 시 ${c.pillars.split(' ')[3]} — 일간 ${c.dayMaster}, 월지 ${c.month}, 사령 ${c.saryeong.stem}(${c.saryeong.tg}, ${c.saryeong.label})`);
    L.push(`- 오행: ${EL.map((e, i) => e + ' ' + c.pct[i]).join(' · ')}% · 십성 묶음: ${GN.map((g, i) => g + ' ' + c.groups[i]).join(' · ')}%`);
    L.push(`- 강약: 돕는 힘 ${c.help}% (${c.zone}) · 득령 ${c.deukryeong ? '○' : '×'} · 득지 ${c.deukji ? '○' : '×'} · 득세 ${c.deukse ? '○' : '×'} · 통근 점수 ${c.rootScore} · 한난 ${c.climate.temp} · 조습 ${c.climate.hum}`);
    L.push(`- **엔진 용신 판정**: ${MODE[u.mode] || u.mode} — 주 기준 ${u.primary}${u.secondary ? ' · 보조 ' + u.secondary : ''} → 용신 ${u.yong} · 희신 ${u.hee} · ${Object.entries(u.roles).filter(([, r]) => !['용신', '희신'].includes(r)).map(([e, r]) => r + ' ' + e).join(' · ')}`);
    L.push(`- 역할값(목·화·토·금·수): ${u.roleV.join(' / ')} (기본 용 1 · 희 0.5 · 한 0 · 구 −0.5 · 기 −1, 조건부면 누그러뜨림)`, '');
    L.push('| 이론 | 해당 | 급함 | 그 이론의 용신 | 통합 판단에서 | 엔진 근거 |', '|---|---|---|---|---|---|');
    Object.entries(u.theories).forEach(([k, t]) => L.push(`| ${TH[k]} | ${t.applicable ? '○' : '×'} | ${t.urgency} | ${t.yong || '—'} | ${t.verdict} | ${esc(t.why)} |`));
    L.push('', '**판단 단계(엔진 원문)**', ...u.steps.map(s => '- ' + s));
    if (Object.keys(u.conditions).length) L.push('', '**조건부 역할**', ...Object.entries(u.conditions).flatMap(([e, v]) => v.map(x => `- ${e}: ${x}`)));
    if (u.conflicts.length) L.push('', '**이론 충돌**', ...u.conflicts.map(x => '- ' + x));
    L.push('', `**격국**: ${c.gyeok.kind} — ${GS[c.gyeok.status] || c.gyeok.status}${c.gyeok.status !== c.gyeok.statusRaw ? ' (시 미상 전 ' + GS[c.gyeok.statusRaw] + ')' : ''}`, '- 상신: ' + c.gyeok.sang.join(' · '), '- 파격·구응: ' + c.gyeok.pa.join(' · '));
    L.push('', `**종격**: ${JONG[c.jong.status]}${c.jong.kind ? ' · 후보 ' + c.jong.kind : ''} (${c.jong.side === 'weak' ? '극약 쪽' : c.jong.side === 'strong' ? '극왕 쪽' : '중간'})`);
    L.push('', '**십성 구조**(엔진 이름 판정 · 운 점수용 성립 조건 B안)');
    L.push(...(c.patterns.length ? c.patterns.map(p => `- ${p.name}(${p.level}) — ${p.basis}${p.established == null ? '' : p.established ? ' · B안 성립' : ' · **B안 불성립(이름만 일치)**'}`) : ['- 없음']));
    L.push('', '**합충형파해**');
    L.push(...(c.relations.length ? c.relations.map(r => `- ${r.name}(${r.type}, ${r.members})${r.el ? ' → ' + r.el : ''}`) : ['- 없음']));
    if (c.combinations.length) L.push('- 합의 오행 비중 반영: ' + c.combinations.map(r => `${r.name} ${r.applied ? '반영' : '미반영'}${r.applied ? '' : '(' + r.reasons.join(', ') + ')'}`).join(' · '));
    L.push('', '**대운**(시작 연도·나이·간지·흐름 점수·등급)', '', '| ' + c.daeun.map(d => `${d.start}(${d.age}세)`).join(' | ') + ' |', '|' + c.daeun.map(() => '---').join('|') + '|', '| ' + c.daeun.map(d => `${d.gz} ${d.fit} ${d.grade || ''}`).join(' | ') + ' |');
    L.push('', '**세운 2020~2029**(흐름 = 세운 0.6 + 대운 0.4 + 연결 보정 · 억부·조후·관계·구조는 성분 점수)', '', '| 연도 | 간지 | 흐름 | 등급 | 통합 용신 | 억부 | 조후 | 관계 | 구조 | 운 구조 |', '|---|---|---|---|---|---|---|---|---|---|');
    c.seun.forEach(s => L.push(`| ${s.year} | ${s.gz} | ${s.flow} | ${s.grade || ''} | ${s.unified} | ${s.eokbu} | ${s.johu} | ${s.relation} | ${s.structure} | ${esc(s.structs.join(', ')) || '—'} |`));
    const ft = flagText(f);
    L.push('', '**전문가 검토 쟁점**', ...(ft.length ? ft.map(x => '- ' + x) : ['- 자동 점검에서 걸린 항목 없음 — 위 유형 쟁점만 확인']), '- 판정: ☐ 엔진과 같음 ☐ 학파 차이(허용) ☐ 엔진 오류 ☐ 미확정 — 메모:', '');
  }
}
fs.writeFileSync(path.join(DIR, '04_전문가_검토용_사례집.md'), L.join('\n'));
console.log('사례', n, '줄', L.length);
