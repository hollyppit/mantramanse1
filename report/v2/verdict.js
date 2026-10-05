// 총평(c00) 재료 — "이 이야기 주인공의 가장 큰 동력과 아직 쓰이지 않은 부분"(전지적 내레이터, 서술체). 순수 함수, 계산은 이미 나온 sd·규칙 모듈 문장만 읽는다(새 명리 규칙·행동을 만들지 않는다).
//   장면 순서: 발견(potential) → 막힘(blocked) → 증거(evidence, 있을 때만 + 맞습니다/아닙니다) → 조언(advice)
//   말투는 서술체(~다). 계산값(sd)과 규칙 모듈 문장은 그대로 두고 문장 틀만 서술체로 바꾼다.
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {};
  var FIRST = '이 이야기의 주인공에게는 한 가지 큰 동력이 있다.'; // 첫 문장 고정(AI도 바꾸지 못한다)
  var POTENTIAL = { 비겁: '스스로 길을 여는 힘', 식상: '생각을 형태로 만드는 힘', 재성: '기회를 알아보는 힘', 관성: '사람들이 믿고 따르게 만드는 힘', 인성: '깊이 이해하고 꿰뚫는 힘' };
  var BLOCK_LABEL = '이 힘이 아직 다 쓰이지 않는 이유';
  var ADVICE_LEAD = '다음 장면을 바꾸는 건 거창한 결심이 아니라 첫 두 걸음이다.';
  var AI_MIN_RATIO = 0.5; // AI 가 다듬은 막힘 문장이 템플릿의 50% 미만으로 줄면 버린다(지적을 약하게 만들지 못하게)

  // 막힘 문장 고르기: 우세 군이 과다면 그 군의 모듈 → 거의 없는 군 모듈 → 그 밖의 과다 모듈 → c05 lead. 반드시 1개.
  function pickBlocked(cands, dom, c05) {
    cands = cands || [];
    var by = function (f) { return cands.filter(f)[0]; };
    return by(function (x) { return x.kind === 'high' && x.group === dom; }) || by(function (x) { return x.kind === 'zero'; }) || by(function (x) { return x.kind === 'high'; }) || (c05 ? { id: c05.id, headline: c05.headline, summary: c05.summary, kind: 'c05' } : null);
  }

  // parts: { blocked: [{id, kind:'high'|'zero', group, headline, summary}], c05: view, plan }
  function material(sd, parts) {
    parts = parts || {};
    var g = sd.dominantGroup, pct = Math.round(sd.groups[g]), times = Math.round(sd.groups[g] / 20 * 10) / 10, name = POTENTIAL[g] || '';
    var avg = times >= 1.2 ? '평균(20%)의 ' + times + '배다.' : '평균(20%)보다 조금 높은, 가장 큰 축이다.';
    var potential = { group: g, name: name, pct: pct, times: times, pillar: sd.dayPillar.ko };
    var discover = '이 사람을 움직이는 가장 큰 동력은 \'' + name + '\'이다. 사주에서 ' + g + ' 기운이 ' + pct + '%로 가장 크고, ' + avg;
    var b = pickBlocked(parts.blocked, g, parts.c05), blocked = { label: BLOCK_LABEL, headline: (b && b.headline) || '', text: (b && b.summary) || '', source: (b && (b.kind === 'c05' ? 'c05' : b.kind === 'high' ? 'groupHigh' : 'groupZero')) || '', id: (b && b.id) || '' };
    var dw = sd.currentDaewoon, evidence = dw ? { startYear: dw.startYear, startAge: dw.startAge, ganzhi: dw.ganzhi,
      text: '지금의 대운은 ' + dw.startYear + '년(' + dw.startAge + '세 무렵)에 시작된 ' + dw.ganzhi + ' 대운이다. 그 무렵부터 \'' + name + '\'을 쓸 일이 늘어났을까?',
      yes: '그렇다면 이야기의 시간축과 겹친다. 이미 쓰이기 시작한 힘이니, 이제 필요한 건 막힘을 줄이는 일이다.', no: '그렇다면 이 힘은 아직 다음 장면을 기다리는 중일 수 있다. 아래 두 걸음이 그 문을 여는 첫 장면이 된다.' } : null;
    var advice = { lead: ADVICE_LEAD, items: ((parts.plan && parts.plan.checklist) || []).slice(0, 2) }; // 규칙 모듈 문장 그대로
    return { first: FIRST, potential: potential, discover: discover, blocked: blocked, evidence: evidence, advice: advice };
  }

  // AI 가 다듬은 총평 문장 검증: 문자열·길이·단정 표현, 막힘은 템플릿의 50% 이상 길이일 때만 채택. 반환: 채택된 항목만.
  function acceptAi(v, base, banned) {
    var out = {}; if (!v || typeof v !== 'object' || !base) return out;
    var ok = function (s, max) { return typeof s === 'string' && s.trim().length >= 8 && s.length <= max && !(banned && banned.test(s)); };
    if (ok(v.discover, 300)) out.discover = v.discover.trim();
    if (ok(v.blocked, 400) && v.blocked.trim().length >= (base.blocked.text || '').length * AI_MIN_RATIO) out.blocked = v.blocked.trim();
    if (base.evidence && ok(v.evidence, 300)) out.evidence = v.evidence.trim();
    return out;
  }

  R.Verdict = { FIRST: FIRST, POTENTIAL: POTENTIAL, BLOCK_LABEL: BLOCK_LABEL, AI_MIN_RATIO: AI_MIN_RATIO, material: material, pickBlocked: pickBlocked, acceptAi: acceptAi };
})(typeof window !== 'undefined' ? window : globalThis);
