// 주역 대표 괘 3개 × 4분야 실제 출력 예시를 검수용 문서로 만든다. node tools/render-iching-samples.cjs → docs/ICHING_PHASE3_SAMPLES.md
// 결과는 모두 draft(AI 초안, 관리자 검수 전)이며, 사주 입력은 형식 확인용 예시 값이다(실제 사용자 사주가 아님).
const fs = require('fs'), path = require('path');
require('../report/iching/node-loader.js');
const E = require('../report/iching/engine.js'), K = require('../report/iching/content.js');
const { compose } = require('../report/iching/compose.js'), { validate } = require('../report/iching/result-schema.js'), { check } = require('../report/iching/quality.js');
const SAJU = { dayMaster: { stem: '병', el: '화' }, strength: { band: '신약' }, nowYear: 2026, daewoon: [{ startYear: 2020, endYear: 2029, ganzhi: '임인', season: 'accumulation' }], annual: { year: 2026, ganzhi: '병오' } };
const CASTS = [
  { n: 5, values: [7, 7, 9, 8, 7, 8], note: '삼효 하나가 변하는 경우' },
  { n: 29, values: [8, 7, 6, 8, 7, 8], note: '삼효 하나가 변하는 경우' },
  { n: 14, values: [7, 7, 7, 7, 6, 7], note: '오효 하나가 변하는 경우' }
];
const Q = { general: '올해 안에 큰 결정을 해야 하는데 지금 움직여도 될까요?', wealth: '지금 투자를 시작해도 될까요?', career: '지금 직장을 그만두고 사업을 시작해도 될까요?', love: '지금 만나는 사람과 결혼해도 될까요?' };
const li = a => (a && a.length ? a.map(x => '- ' + x).join('\n') : '- (없음)');
const figure = r => r.hexagram.figure.slice().reverse().map(f => (f.yang ? '━━━━━' : '━━ ━━') + (f.changing ? '  ○ 변효' : '') + '   ' + f.label).join('\n');

function md(r) {
  const t = r.transformation_analysis, j = r.saju_cross_analysis;
  let s = '';
  s += '#### SECTION 01. 핵심 결론\n- 질문: ' + r.question + '\n- 판단 방향: **' + r.conclusion.direction + '** (행동 방향 분류이며 길흉·성공 확률이 아닙니다)\n- 결론: ' + r.conclusion.summary + '\n- 판단에 필요한 조건:\n' + li(r.conclusion.conditions).replace(/^/gm, '  ') + '\n\n';
  const x = r.hexagram_explanation;
  s += '#### SECTION 02. 본괘 해석\n```\n' + figure(r) + '\n```\n- 제' + x.number + '괘 ' + x.name + '(' + x.hanja + ') · ' + x.upper_lower + '\n- 키워드: ' + x.keywords.join(' · ') + '\n- 괘사 원문: ' + x.guaci_original.text + '\n- 괘사 현대어: ' + x.guaci_modern.text + '\n- 핵심 의미: ' + x.core_meaning + '\n- 이 질문과의 연결: ' + x.meaning_for_question + '\n\n';
  const sa = r.situation_analysis;
  s += '#### SECTION 03. 현재 상황 분석\n- 질문의 핵심 쟁점: ' + sa.issue + '\n- 현재 유리한 조건:\n' + li(sa.favorable).replace(/^/gm, '  ') + '\n- 현재 불리한 조건:\n' + li(sa.unfavorable).replace(/^/gm, '  ') + '\n- 주의해야 할 판단 오류:\n' + li(sa.judgment_errors).replace(/^/gm, '  ') + '\n- 상황을 개선하기 위한 조건:\n' + li(sa.improve_conditions).replace(/^/gm, '  ') + '\n\n';
  s += '#### SECTION 04. 변효 및 변괘 해석\n- ' + t.statement + ' (변효 ' + t.changing_count + '개, 적용 규칙: ' + t.rule.name + ')\n';
  t.readings.forEach(x => { s += '- 해당 ' + (x.kind === 'yaoci' ? '효사' : '괘사') + (x.label ? '(' + x.label + ')' : '') + ': ' + x.original + '\n  - 현대어: ' + x.modern + '\n'; });
  (t.line_meanings || []).forEach(l => { s += '- ' + l.label + '의 의미: ' + l.meaning + '\n'; });
  s += '- 변괘: 제' + t.transformed.num + '괘 ' + t.transformed.name + '(' + t.transformed.hanja + ') — ' + t.relation.transformed_core + '\n- 본괘와 변괘의 관계: ' + t.relation.from + ' → ' + t.relation.to + '. ' + t.relation.note + '\n\n';
  s += '#### SECTION 05. 사주·주역 교차 해석\n';
  if (j.status === 'ok') s += '- 대운·세운:\n' + li(j.luck_context).replace(/^/gm, '  ') + '\n- ' + j.category + ' 관련 사주 특성:\n' + li(j.category_traits).replace(/^/gm, '  ') + '\n- 공통으로 강조되는 부분:\n' + li(j.common).replace(/^/gm, '  ') + '\n- 서로 다른 방향:\n' + li(j.divergent).replace(/^/gm, '  ') + '\n- 종합적인 참고 판단: ' + j.reference_judgment + '\n\n';
  else s += '- ' + j.note + '\n\n';
  const sc = r.scenarios;
  s += '#### SECTION 06. 최선·최악의 시나리오\n> ' + sc.disclaimer + '\n- 유리한 전개 — 충족할 조건:\n' + li(sc.favorable.conditions).replace(/^/gm, '  ') + '\n  행동:\n' + li(sc.favorable.actions).replace(/^/gm, '  ') + '\n- 불리한 전개 — 부족한 준비:\n' + li(sc.unfavorable.gaps).replace(/^/gm, '  ') + '\n  반복하면 문제가 되는 행동:\n' + li(sc.unfavorable.repeats).replace(/^/gm, '  ') + '\n\n';
  const a = r.action_plan;
  s += '#### SECTION 07. 현실적인 행동 처방\n- 지금 해야 할 행동 3개:\n' + li(a.do).replace(/^/gm, '  ') + '\n- 피해야 할 행동 2개:\n' + li(a.avoid).replace(/^/gm, '  ') + '\n- 결정 전에 확인할 조건:\n' + li(a.check_before).replace(/^/gm, '  ') + '\n- 판단을 다시 점검할 기준:\n' + li(a.review_criteria).replace(/^/gm, '  ') + '\n\n';
  s += '#### SECTION 08. 최종 한마디\n> ' + r.final_message.text + '\n\n';
  return s;
}

let doc = '# 주역 Phase 3 — 데이터 구축 현황과 대표 괘 출력 예시 (검수용)\n\n생성일 2026-10-29 · 모든 문구는 **draft(AI 초안)** 이며 관리자 검수·승인 전에는 운영 서비스에 노출되지 않습니다. 이 문서의 결과는 `node tools/render-iching-samples.cjs` 로 다시 만들 수 있습니다.\n\n';
doc += '## 1. 데이터 구축 현황\n\n| 데이터 | 범위 | 상태 | 출처 |\n|---|---|---|---|\n| 괘사·단전·대상전·효사·소상전 원문 | 64괘, 효 386개(384효 + 건 용구·곤 용육) | source-imported (관리자 대조 필요) | 중국어 위키문헌 「周易」. 고전 원문은 퍼블릭 도메인, 전사본은 CC BY-SA 4.0 |\n| 괘사·효사 현대어 번역, 키워드 3개, 핵심 의미 | 64괘 전체 | draft (AI 초안) | AI가 위 원문을 직역에 가깝게 옮김 |\n| 분야별 해석 모듈(종합·재물·커리어·인연) | 64괘 전체(5수·14대유·29감은 손으로 작성, 나머지 61괘는 괘별 고유 문구 + 방향×분야 행동 은행 조합) | draft | AI 초안 |\n| 변효(1~6효) 해석 모듈 | 64괘 × 6효 = 384개 | draft | AI 초안 |\n| 사주 교차 해석 | 규칙 기반 조합(일간·신강약·대운 구간 vs 주역 방향) | draft | 기존 사주 결과를 읽기만 함 |\n\n';
doc += '- 원문 검증: 각 효의 이름(初九·六二 등)의 음양이 괘의 효 패턴과 모두 일치하고, 「하괘下 상괘上」 표기가 괘 구조 표와 일치함을 도구가 확인했습니다. 다만 위키문헌 자체 품질 표시가 50%이고 이체자(无·羣 등)와 일부 판본 차이(`variants` 51건)가 있어 **관리자 대조가 필요**합니다.\n- 위키문헌 교감 표기가 있는 곳은 페이지가 택한 글자를 본문으로 두고 다른 판본 글자를 `variants`에 기록했습니다(예: 감괘 육사는 페이지의 본문이 통행본과 다릅니다 — 대조 필요).\n- 현대어 번역은 직역에 가깝게 옮긴 초안이라 일부 문장이 어색할 수 있습니다. 사용자에게 보이는 효사 풀이는 번역 그대로가 아니라, 각 효의 "의미 모듈"을 통해 풀어 쓰도록 설계했습니다(현재 3괘만 작성).\n\n';
doc += '## 2. 검수 요청 사항\n\n1. 문체(존댓말, 솔직·직관·생활밀착)가 운영자 1인의 목소리로 맞는지\n2. 분야별 문구가 같은 설명을 반복하지 않고 해당 분야의 구체적 문제에 집중하는지\n3. 행동 처방이 구체적인지(지양 표현·확정 표현은 자동 검사로 걸러 두었습니다)\n4. 아래 판단 방향(실행 검토/준비 우선/신중한 접근)이 괘의 성격과 맞는지\n5. 사주 교차 해석의 "공통/다른 방향" 서술이 적절한지\n\n';
doc += '> 질문 원문은 기록용이며 의미를 분석하지 않습니다. 같은 4개 질문을 세 괘에 모두 던졌을 때 괘와 분야에 따라 답이 어떻게 달라지는지를 보기 위한 예시입니다. 사주 입력은 형식 확인용 예시 값(병화 일간·신약·2020~2029 임인 대운)입니다.\n\n';
K.setReviewState({});
CASTS.forEach(c => {
  const cast = E.resolve(c.values);
  doc += '---\n\n## 예시 ' + c.n + '. ' + K.packs[c.n].name + ' (' + c.note + ')\n\n';
  ['general', 'wealth', 'career', 'love'].forEach(cat => {
    const r = compose({ question: Q[cat], category: cat, cast, saju: cat === 'wealth' || cat === 'career' ? null : SAJU }, { mode: 'preview', resultId: 'sample', now: '2026-10-29T00:00:00.000Z' });
    const v = validate(r), q = check(r, { cast, saju: SAJU });
    if (!v.ok || q.errors.length) throw new Error(c.n + '/' + cat + ' ' + v.errors.concat(q.errors).join(' | '));
    doc += '### ' + K.packs[c.n].name.split(' ')[0] + ' × ' + K.CAT_KO[cat] + ' 분야' + (cat === 'wealth' || cat === 'career' ? ' (사주 연동 정보 없음 경우)' : ' (사주 연동 경우)') + '\n\n' + md(r);
  });
});
fs.writeFileSync(path.join(__dirname, '../docs/ICHING_PHASE3_SAMPLES.md'), doc);
console.log('OK', doc.length, '자');
