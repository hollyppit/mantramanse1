/* 두 사람 궁합 — 내 사주(A)와 상대 사주(B)를 비교한다. (2판: 6항목 + 양방향, 1판 산식은 evaluateLegacy)
   기존 엔진(M)의 계산 결과(ch.yong, ch.weights, ch.strength, M.luckRelations, M.relationsAmong, M.tenGod)를 읽기만 하고
   다른 점수에는 영향을 주지 않는다. 점수·등급은 명리 모델의 참고 지표이며, 문구는 읽기 쉽게 단정적으로 쓴다. */
(function (G) {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const POS = ['year', 'month', 'day', 'hour'];
  const AREA = { year: '조상·어린 시절', month: '부모·직장', day: '속마음·배우자', hour: '자녀·말년' };
  // 자리 이름은 '월지'·'일간'처럼 기둥+천간/지지로 쓴다(뜻풀이 이름 대신)
  const POS_K = { year: '년', month: '월', day: '일', hour: '시' };
  const posName = (pos, kind) => [].concat(pos).map(k => POS_K[k] + (kind === 'stem' ? '간' : '지')).join('·');
  const ROLE_W = { '용신': 1, '희신': 0.6, '한신': 0, '구신': -0.5, '기신': -1 };

  // 관계 종류별 가중치(합 100): 오행 보완 / 일간 십성 / 일지(배우자궁) / 간지 전체 조화 / 강약 균형
  const REL_TYPES_V1 = {
    lover: { label: '연인·부부', w: { yong: 25, dayStem: 20, dayBranch: 25, harmony: 20, balance: 10 } },
    work: { label: '직장·동업', w: { yong: 30, dayStem: 15, dayBranch: 10, harmony: 25, balance: 20 } },
    friend: { label: '친구', w: { yong: 25, dayStem: 20, dayBranch: 15, harmony: 25, balance: 15 } },
    family: { label: '가족', w: { yong: 30, dayStem: 25, dayBranch: 10, harmony: 20, balance: 15 } },
  };
  const PART_LABEL_V1 = { yong: '오행·조후 보완', dayStem: '일간 궁합', dayBranch: '일지(마음자리)', harmony: '간지 조화', balance: '강약·기후 균형' };

  const GRADES = [
    [90, '천생연분', 'top'], [80, '아주 좋음', 'good'], [70, '좋음', 'good'], [60, '무난', 'mid'], [50, '노력 필요', 'warn'], [0, '상극 주의', 'bad'],
  ];
  const gradeOf = s => { const g = GRADES.find(x => s >= x[0]); return { name: g[1], tone: g[2] }; };

  // 십성(상대 일간이 나에게 무엇인가) 점수와 뜻
  const TG_SCORE = { '정인': 82, '정재': 82, '정관': 82, '식신': 80, '편인': 68, '편재': 70, '편관': 62, '상관': 58, '비견': 64, '겁재': 48 };
  const SPOUSE = { M: ['정재', '편재'], F: ['정관', '편관'] };

  // 합충 종류별 문구: [톤, 이름, 뜻, 대처, 세기]
  const REL_TXT = {
    '충': ['bad', '정면으로 부딪치는 관계', '서로를 가장 강하게 자극합니다. 끌림도 크지만 한번 틀어지면 크게 싸웁니다.', '감정이 올라올 때 바로 반응하지 말고 하루 뒤에 이야기하세요.', 3],
    '형': ['bad', '서로 눌러서 불편해지는 관계', '가까워질수록 서로를 압박하고 지적하게 됩니다. 사소한 문제가 돈·법·건강 같은 현실 문제로 번지기 쉽습니다.', '지적은 짧게, 돈과 계약은 문서로 정리하세요.', 2],
    '파': ['bad', '자꾸 어긋나는 관계', '큰 갈등보다 약속·계획이 틀어지는 식으로 나타납니다.', '일정과 역할을 미리 정해 두면 대부분 해결됩니다.', 1],
    '해': ['bad', '서운함이 쌓이는 관계', '말하지 않은 서운함이 쌓여 서서히 멀어지기 쉽습니다.', '서운한 점은 그날 바로 말하세요.', 1.5],
    '원진': ['bad', '미운 정이 드는 관계', '끌리는데 이유 없이 거슬립니다. 애증이 반복되는 사이입니다.', '원인을 따지기보다 거리를 조절하세요.', 1.5],
    '귀문관': ['mid', '예민하게 얽히는 관계', '서로의 감정을 깊이 읽어 집착·의심으로 번지기 쉽지만, 정신적으로는 깊이 통합니다.', '확인하고 싶을 때는 추측하지 말고 직접 물어보세요.', 1],
    '육합': ['good', '서로 끌어당기는 짝', '자연스럽게 마음이 가고 호흡이 잘 맞습니다.', '편한 만큼 선을 지키세요.', 3],
    '삼합': ['good', '한 방향으로 힘이 모이는 관계', '같은 목표를 향하면 시너지가 큽니다.', '목표를 함께 정하고 역할을 나누세요.', 3],
    '반합': ['good', '손발이 맞는 관계', '같은 방향으로 움직이는 힘이 있습니다.', '공동 계획을 세워 보세요.', 2],
    '방합': ['good', '같은 결로 묶이는 관계', '비슷한 기질이라 말이 잘 통합니다. 한쪽으로 쏠리는 점만 주의하세요.', '서로 다른 시각을 일부러 들어 보세요.', 2],
    '천간합': ['good', '마음이 통하는 합', '생각과 뜻이 끌려 의기투합하기 쉽습니다.', '감정만으로 중요한 결정을 하지 마세요.', 2.5],
    '천간충': ['bad', '생각이 맞서는 관계', '의견과 방침이 부딪쳐 말다툼이 잦습니다.', '결론을 서두르지 말고 합의는 문서로 남기세요.', 2],
  };
  const BAD_BRANCH = { '충': 25, '형': 36, '원진': 38, '해': 42, '파': 46 };
  const GOOD_BRANCH = { '육합': 92, '삼합': 86, '반합': 84, '방합': 78 };

  function elementFit(M, self, other) {
    const roles = self.yong.roles, pct = other.weights.pct;
    let fit = 0, top = null;
    for (let e = 0; e < 5; e++) {
      const w = ROLE_W[roles[e]] || 0, c = (pct[e] || 0) / 100 * w;
      fit += c;
      if (w > 0 && (!top || c > top.c)) top = { e, c, role: roles[e], pct: pct[e] || 0 };
    }
    const dayEl = M.stemEl(other.pillars.day.s), dayW = ROLE_W[roles[dayEl]] || 0;
    const f = 0.6 * fit + 0.4 * dayW * 0.8;
    return { score: Math.round(clamp(50 + f * 70, 8, 98)), top, dayEl, dayRole: roles[dayEl], bad: ROLE_W[roles[dayEl]] < 0 };
  }

  function branchScore(rels) {
    const good = rels.filter(r => GOOD_BRANCH[r.type]).map(r => GOOD_BRANCH[r.type]);
    const bad = rels.filter(r => BAD_BRANCH[r.type]).map(r => BAD_BRANCH[r.type]);
    if (good.length && bad.length) return 58;
    if (good.length) return Math.max(...good);
    if (bad.length) return Math.min(...bad);
    return 60;
  }

  // 1판(5항목) 산식 — 전후 비교와 회귀 확인용으로 그대로 남긴다.
  function evaluateLegacy(M, A, B, rel, names) {
    const cfg = REL_TYPES_V1[rel] || REL_TYPES_V1.lover;
    const nm = Object.assign({ a: '나', b: '상대' }, names || {});
    const dA = A.pillars.day, dB = B.pillars.day;

    // 1) 오행·조후 보완 — 엔진의 통합 판단(M.unifiedSupport)으로 상대의 여덟 글자·조습·일간의 뿌리·일간끼리의 합을 함께 본다.
    //    통합 판단이 없는 옛 엔진에서는 예전 방식(용신 역할 × 상대 오행 비율 + 상대 일간 역할)으로 계산한다.
    const sup = (x, y, self, other) => (M.unifiedSupport && x.unified ? M.unifiedSupport(x, y, { self, other }) : elementFit(M, x, y));
    const fitA = sup(A, B, nm.a, nm.b), fitB = sup(B, A, nm.b, nm.a);
    const yong = Math.round((fitA.score + fitB.score) / 2);

    // 2) 일간 — 천간합·충, 서로가 서로에게 무엇인가(십성)
    const tgAB = M.tenGod(dA.s, dB.s), tgBA = M.tenGod(dB.s, dA.s);
    let stemScore = (TG_SCORE[tgAB] + TG_SCORE[tgBA]) / 2;
    if (rel === 'lover') {   // 연인·부부는 서로가 배우자성(남자의 재성, 여자의 관성)인지도 본다
      const bonus = (list, tg) => list[0] === tg ? 92 : list[1] === tg ? 80 : 0;
      stemScore = Math.max(stemScore, (bonus(SPOUSE[A.gender] || [], tgAB) + bonus(SPOUSE[B.gender] || [], tgBA)) / 2);
    }
    const dayStemRels = M.relationsAmong([{ id: 'a', s: dA.s, b: dA.b }, { id: 'b', s: dB.s, b: dB.b }]);
    const stemRel = dayStemRels.filter(r => r.kind === 'stem');
    if (stemRel.some(r => r.type === '천간합')) stemScore = Math.max(stemScore, 93);
    if (stemRel.some(r => r.type === '천간충')) stemScore = Math.min(stemScore, 35);
    const dayStem = Math.round(clamp(stemScore, 10, 98));

    // 3) 일지 — 마음자리(배우자궁)끼리의 관계
    const dayBranchRels = dayStemRels.filter(r => r.kind === 'branch');
    const sameBranch = dA.b === dB.b;
    const dayBranch = Math.round(dayBranchRels.length ? branchScore(dayBranchRels) : sameBranch ? 66 : 60);

    // 4) 간지 조화 — 내 기둥 4개와 상대 기둥 4개 사이의 모든 합·충(자리 중요도로 가중)
    const items = [];
    let good = 0, bad = 0;
    const posW = (a, b) => (a === 'day' && b === 'day') ? 3 : (a === b && (a === 'month')) ? 2 : (a === 'year' && b === 'year') ? 1.5 : (a === 'day' || b === 'day') ? 2 : 1;
    POS.filter(k => B.pillars[k]).forEach(bp => {
      const { rels } = M.luckRelations(A, { s: B.pillars[bp].s, b: B.pillars[bp].b });
      rels.forEach(r => {
        const t = REL_TXT[r.type]; if (!t) return;
        const aPos = r.members.filter(m => m !== 'luck');
        const w = Math.max(...aPos.map(ap => posW(ap, bp)));
        items.push({ type: r.type, name: r.name, kind: r.kind, aPos, bPos: bp, tone: t[0], weight: w, str: t[4], txt: t });
        if (t[0] === 'good') good += w * t[4] / 3; else if (t[0] === 'bad') bad += w * t[4] / 3;
      });
    });
    const harmony = Math.round(clamp(68 + 5.5 * good - 4.5 * bad, 12, 97));

    // 5) 강약 균형 — 한쪽이 강하고 한쪽이 약하면 서로 기대기 좋다
    const hA = A.strength.help - 50, hB = B.strength.help - 50;
    let balance;
    if (hA * hB < 0) balance = 72 + Math.min(24, Math.abs(hA - hB) * 0.6);
    else if (Math.abs(hA) < 6 || Math.abs(hB) < 6) balance = 70;
    else balance = 66 - Math.min(26, Math.min(Math.abs(hA), Math.abs(hB)) * 0.8);
    // 기후(조후)도 함께 본다: 한쪽이 덥고 한쪽이 차면(또는 건조·습함) 서로 맞춰 주고, 같은 쪽으로 치우치면 같은 약점이 겹친다
    const balanceNotes = [], cA = A.climate || { temp: 0, hum: 0 }, cB = B.climate || { temp: 0, hum: 0 };
    const tilt = c => ({ t: c.temp >= 0.6 ? 1 : c.temp <= -0.6 ? -1 : 0, h: c.hum >= 0.8 ? 1 : c.hum <= -0.8 ? -1 : 0 });
    const tA = tilt(cA), tB = tilt(cB);
    let climAdj = 0;
    if (tA.t && tA.t === -tB.t) { climAdj += 8; balanceNotes.push(`${tA.t > 0 ? nm.a : nm.b}의 더운 기운과 ${tA.t > 0 ? nm.b : nm.a}의 차가운 기운이 서로를 식히고 데워 줍니다.`); }
    else if (tA.t && tA.t === tB.t) { climAdj -= 8; balanceNotes.push(`두 사람 모두 ${tA.t > 0 ? '더운' : '추운'} 사주라 같은 쪽으로 치우친 기운이 겹칩니다.`); }
    if (tA.h && tA.h === -tB.h) { climAdj += 5; balanceNotes.push('한쪽의 건조함과 다른 쪽의 습함이 서로를 맞춰 줍니다.'); }
    else if (tA.h && tA.h === tB.h) { climAdj -= 5; balanceNotes.push(`두 사람 모두 ${tA.h > 0 ? '습한' : '건조한'} 쪽이라 같은 약점이 겹칩니다.`); }
    if (Math.abs(hA) < 8 && Math.abs(hB) < 8) balanceNotes.unshift('두 사람 모두 강약이 중간에 가까워 어느 한쪽이 크게 기울지 않습니다.');
    else if (hA * hB < 0) balanceNotes.unshift('한 사람은 힘이 남고 한 사람은 모자라 서로 기대기 좋은 강약입니다.');
    else if (Math.abs(hA) >= 6 && Math.abs(hB) >= 6) balanceNotes.unshift(`두 사람 모두 ${hA > 0 ? '힘이 남는' : '힘이 모자란'} 쪽이라 같은 약점이 함께 드러나기 쉽습니다.`);
    balance = Math.round(clamp(balance + climAdj, 20, 96));

    const parts = ['yong', 'dayStem', 'dayBranch', 'harmony', 'balance'].map(k => ({ key: k, label: PART_LABEL_V1[k], score: { yong, dayStem, dayBranch, harmony, balance }[k], weight: cfg.w[k] }));
    // 항목 가중 평균은 56~60 근처에 몰려 변별력이 낮으므로, 무작위 사주 600쌍 분포(중앙 60, 상위 10% 71)를 기준으로 폭을 넓힌다
    const raw = parts.reduce((s, p) => s + p.score * p.weight, 0) / 100;
    const score = Math.round(clamp(66 + (raw - 60) * 2, 12, 98));
    const grade = gradeOf(score);

    items.sort((x, y) => y.weight * y.str - x.weight * x.str);
    const sorted = parts.slice().sort((x, y) => y.score - x.score);
    const best = sorted[0], worst = sorted[sorted.length - 1];

    return {
      rel, relLabel: cfg.label, names: nm, score, grade, parts,
      element: {
        aGets: { score: fitA.score, top: fitA.top, dayEl: fitA.dayEl, dayRole: fitA.dayRole, reasons: fitA.reasons || [] },   // 상대가 나에게 채워 주는 것
        bGets: { score: fitB.score, top: fitB.top, dayEl: fitB.dayEl, dayRole: fitB.dayRole, reasons: fitB.reasons || [] },   // 내가 상대에게 채워 주는 것
        unified: !!(fitA.reasons),
      },
      stems: { aSeesB: tgAB, bSeesA: tgBA, hap: stemRel.some(r => r.type === '천간합'), chung: stemRel.some(r => r.type === '천간충') },
      dayBranch: { rels: dayBranchRels.map(r => r.type), same: sameBranch },
      relations: items,
      best, worst,
      strength: { a: A.strength.zone, b: B.strength.zone }, balanceNotes,
    };
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 2판(6항목) — 2026-11-16
  //  ① 오행·용신 보완   상대 원국의 오행 분포를 억부 역할로 한 번, 조후(기후 섞임 + 조후 역할)로 한 번 따로 보고,
  //                     두 기준의 급한 정도(urgency)를 비율로 삼아 합친다. 어느 한쪽을 임의로 앞세우지 않는다.
  //                     옛 '강약·기후 균형'은 이 항목에 흡수한다(같은 강약·기후를 두 번 세지 않는다). 상대 일간은 ②에서 본다.
  //  ② 일간 궁합        두 일간 한 글자끼리의 생극(십성)·천간합·천간충만 본다. 배우자성 가산은 ⑥으로 옮겼다.
  //  ③ 일지·배우자궁    두 일지 사이의 합·충·형·해·파·원진·귀문.
  //  ④ 간지 전체 조화   두 사람 여덟 글자 전체에서 '사람 사이'에 생기는 합충(일간끼리·일지끼리 짝은 ②③에서 보므로 뺀다)
  //                     + 원국 상호작용(상대 글자가 내 원국의 충을 합으로 풀거나, 원국의 합을 충으로 흔드는 경우).
  //                     A·B 순서를 바꿔 두 번 계산해 평균하므로 순서와 상관없이 같다.
  //  ⑤ 십성 상호 보완   상대 글자(상대 일간 제외)를 내 일간 기준 십성 세력으로 나눈다. 개수가 아니라 자리·통근·월령·투간·지장간 일수로 가중한다.
  //                     값은 '부족하니 가산'이 아니라 내 원국 십성 구조와 맞물리는 작용(관인상생·식신생재·식상제살·재생관 /
  //                     군겁쟁재·상관견관·편인도식·재극인·관살혼잡·태과 등)과 일간 강약에 따른 그 십성의 기능으로 매기고,
  //                     억부·조후·통합 판단의 희기신으로 부호를 교차 검증한다(세 기준이 모두 꺼리면 긍정 효과를 크게 줄인다).
  //  ⑥ 관계별 상호작용  연인·부부: 배우자성 · 직장·동업: 생산↔관리 역할 분담 · 친구: 비겁·식상 교류 · 가족: 인성 돌봄과 강약 주도.
  // 총점은 ①~⑥을 관계별 가중치(합 100)로 더한 뒤, 무작위 쌍 분포를 1판 점수 분포(중앙·상하위 10%)에 맞춰 펼친다.
  // 모든 항목은 두 방향 평균이거나 대칭 계산이라 A·B 순서를 바꿔도 총점이 같다. 점수는 상대적 명리 지표이며 확률이 아니다.
  const VERSION = 2;
  const REL_TYPES = {
    lover: { label: '연인·부부', w: { yong: 18, dayStem: 14, dayBranch: 22, harmony: 14, tenGod: 16, relation: 16 } },
    work: { label: '직장·동업', w: { yong: 20, dayStem: 12, dayBranch: 8, harmony: 18, tenGod: 22, relation: 20 } },
    friend: { label: '친구', w: { yong: 18, dayStem: 20, dayBranch: 12, harmony: 20, tenGod: 15, relation: 15 } },
    family: { label: '가족', w: { yong: 22, dayStem: 18, dayBranch: 10, harmony: 16, tenGod: 18, relation: 16 } },
  };
  // 가중치 근거(관리자·검수 화면에서 그대로 보여 줄 수 있는 문장)
  const REL_WHY = {
    lover: '함께 사는 사이라 배우자 자리(일지)를 가장 크게 보고, 서로가 배우자의 기운(남자의 재성·여자의 관성)인지와 십성 보완을 함께 봅니다.',
    work: '일로 만나는 사이라 속마음(일지)보다 서로의 역할(십성)과 생산·관리 분담, 기운 보완을 크게 봅니다.',
    friend: '대등한 사이라 성향(일간)과 전체 글자의 어울림을 크게 보고, 비겁·식상 교류를 함께 봅니다.',
    family: '오래 함께 지내는 사이라 기운 보완과 성향을 크게 보고, 돌봄(인성)과 누가 이끄는지(강약)를 함께 봅니다.',
  };
  const PART_LABEL = { yong: '오행·용신 보완', dayStem: '일간 궁합', dayBranch: '일지·배우자궁', harmony: '간지 전체 조화', tenGod: '십성 상호 보완', relation: '관계별 상호작용' };
  const PART_KEYS = ['yong', 'dayStem', 'dayBranch', 'harmony', 'tenGod', 'relation'];
  // 총점 펼침: 무작위 사주 1,200쌍에서 1판 점수 분포(중앙·상하위 10%)에 맞춘 값(tests/compat-pair-v2-sim.cjs 가 다시 확인한다)
  const SPREAD = { mid: 59, center: 70, k: 2.16 };

  const GROUP = ['비겁', '식상', '재성', '관성', '인성'];
  const mod5 = x => ((x % 5) + 5) % 5;
  const rv = r => ROLE_W[r] || 0;
  const PWS = { year: 0.6, month: 0.9, day: 1.2, hour: 0.7 }, PWB = { year: 0.6, month: 1.1, day: 1.2, hour: 0.7 };

  // 십성 묶음별 문구: 도움(긍정) · 부담(부정) · 조언 · 관계별로 드러나는 모습
  const TG_TXT = {
    0: { good: '함께 버티고 협력하는 힘', bad: '경쟁심과 고집, 몫을 두고 다투는 마음', tip: '역할과 몫을 처음부터 나눠 두면 경쟁이 협력으로 바뀝니다.',
      rel: { lover: '친구처럼 편하게 기대는 사이가 됩니다.', work: '같은 목표를 향해 같이 밀어붙이는 동료가 됩니다.', friend: '어깨를 나란히 하는 단짝이 됩니다.', family: '형제처럼 서로 편을 들어 줍니다.' } },
    1: { good: '표현하고 만들어 내는 활동력', bad: '말이 앞서고 기운이 새어 나가는 피로', tip: '아이디어는 함께 내되, 끝맺는 일정은 한 사람이 챙기세요.',
      rel: { lover: '마음을 말과 행동으로 표현하게 해 줍니다.', work: '아이디어와 결과물을 만들어 내는 힘이 됩니다.', friend: '같이 있으면 재미있고 활동적이 됩니다.', family: '집 안에 활기와 대화를 불어넣습니다.' } },
    2: { good: '현실 성과와 자원 관리', bad: '돈·일 욕심이 커지며 생기는 과로와 계산', tip: '돈과 일의 기준을 숫자로 정해 두면 다툼이 줄어듭니다.',
      rel: { lover: '생활을 현실적으로 꾸리게 해 줍니다.', work: '성과를 숫자로 만들고 자원을 관리하게 해 줍니다.', friend: '현실적인 조언과 정보를 나눕니다.', family: '살림과 경제를 든든하게 받쳐 줍니다.' } },
    3: { good: '책임감과 규율, 바로 세워 주는 힘', bad: '압박과 통제, 잔소리로 느껴지는 부담', tip: '지적은 짧게 하고, 기대하는 것은 미리 말로 정해 두세요.',
      rel: { lover: '관계를 책임지게 하고 중심을 잡아 줍니다.', work: '일의 기준과 규칙을 세워 줍니다.', friend: '바른말을 해 주는 친구가 됩니다.', family: '집안의 규칙과 체계를 잡아 줍니다.' } },
    4: { good: '보호와 배움, 정서적인 지지', bad: '기대고 미루게 되는 마음, 지나친 간섭', tip: '도움을 받는 만큼 스스로 할 일을 정해 두면 의존이 성장으로 바뀝니다.',
      rel: { lover: '마음을 편하게 받아 주는 쉼터가 됩니다.', work: '배우고 의지할 수 있는 선배·조언자가 됩니다.', friend: '고민을 들어 주는 친구가 됩니다.', family: '돌보고 감싸 주는 역할을 합니다.' } },
  };

  // 내 사주가 필요로 하는 기운을 기준별로 따로 본다(억부·조후는 섞지 않는다)
  function needView(ch) {
    const u = ch.unified, ya = ch.yongAll || {}, jong = !!(u && u.mode === 'jong');
    const base = (ch.yong && ch.yong.roles) || {};
    const eRoles = jong ? u.roles : (ya.eokbu && ya.eokbu.roles) || base;
    const eU = jong ? 3 : u && u.theories && u.theories.eokbu ? u.theories.eokbu.urgency : 2;
    const joOk = !!(ya.johu && ya.johu.applicable && ya.johu.roles);
    const jRoles = joOk ? ya.johu.roles : null;
    const jU = joOk ? (u && u.theories && u.theories.johu && u.theories.johu.urgency) || 2 : 0;
    const uniRoles = (u && u.roles) || base;
    const uniV = [0, 1, 2, 3, 4].map(e => u && u.roleV ? u.roleV[e] : rv(base[e]));
    return { jong, eRoles, eU, jRoles, jU, uniRoles, uniV, cond: (u && u.conditions) || {} };
  }

  // ① 한 방향(other → self): 상대 원국이 내 용신표를 얼마나 채우는가
  function elementDir(M, self, other) {
    const nv = needView(self), pct = [0, 1, 2, 3, 4].map(e => (other.weights.pct[e] || 0) / 100);
    const eok = pct.reduce((s, p, e) => s + p * rv(nv.eRoles[e]), 0);
    let jo = null, clim = 0, joRole = 0;
    if (nv.jRoles) {
      const a = self.climate || { temp: 0, hum: 0 }, b = other.climate || { temp: 0, hum: 0 }, dev = (x, k) => Math.max(0, Math.abs(x) / k - 0.3);
      // 기후가 고른 사람(0)과 섞였을 때를 기준으로, 이 상대와 섞였을 때 내 치우침이 더 줄면 +, 더 커지면 − (같은 쪽으로 치우친 상대는 −)
      const mt = 0.7 * a.temp + 0.3 * b.temp, mh = 0.7 * a.hum + 0.3 * b.hum;
      clim = clamp((dev(0.7 * a.temp, 0.6) - dev(mt, 0.6) + dev(0.7 * a.hum, 0.8) - dev(mh, 0.8)) / 0.6, -1, 1);
      joRole = pct.reduce((s, p, e) => s + p * rv(nv.jRoles[e]), 0);
      jo = 0.5 * joRole + 0.5 * clim;
    }
    const f = jo == null ? eok : (nv.eU * eok + nv.jU * jo) / (nv.eU + nv.jU);
    const conflict = jo != null && Math.sign(eok) !== Math.sign(jo) && Math.abs(eok) >= 0.08 && Math.abs(jo) >= 0.08;
    let top = null, worst = null;
    for (let e = 0; e < 5; e++) {
      const c = pct[e] * nv.uniV[e];
      if (nv.uniV[e] > 0 && (!top || c > top.c)) top = { e, c, role: nv.uniRoles[e], pct: pct[e] * 100 };
      if (nv.uniV[e] < 0 && (!worst || c < worst.c)) worst = { e, c, role: nv.uniRoles[e], pct: pct[e] * 100 };
    }
    const dayEl = M.stemEl(other.pillars.day.s);
    return { f, eok, jo, clim, joRole, conflict, top, worst, dayEl, dayRole: nv.uniRoles[dayEl], eU: nv.eU, jU: nv.jU, jong: nv.jong,
      eTop: argBest(pct, e => rv(nv.eRoles[e])), jTop: nv.jRoles ? argBest(pct, e => rv(nv.jRoles[e])) : null };
  }
  function argBest(pct, val) { let b = null; for (let e = 0; e < 5; e++) { const v = val(e); if (v > 0 && pct[e] > 0.06 && (!b || pct[e] * v > b.c)) b = { e, c: pct[e] * v, pct: pct[e] * 100 }; } return b; }

  // ⑤에서 쓰는 상대 글자의 실제 세력(상대 일간 제외): 자리 · 통근(뿌리 없는 천간 0.6배) · 월령(월지 정기 1.5배) · 투간(천간에 드러난 지장간 1.3배) · 지장간 일수
  function glyphPower(M, ch) {
    const out = [0, 0, 0, 0, 0], ks = POS.filter(k => ch.pillars[k]);
    const stemEls = ks.filter(k => k !== 'day').map(k => M.stemEl(ch.pillars[k].s));
    const rootEls = new Set(); ks.forEach(k => M.HIDDEN[ch.pillars[k].b].forEach(([hs]) => rootEls.add(M.stemEl(hs))));
    for (const k of ks) {
      const p = ch.pillars[k];
      if (k !== 'day') { const e = M.stemEl(p.s); out[e] += PWS[k] * (rootEls.has(e) ? 1 : 0.6); }
      const H = M.HIDDEN[p.b];
      H.forEach(([hs, dd], i) => { const e = M.stemEl(hs); let w = PWB[k] * dd / 30; if (k === 'month' && i === H.length - 1) w *= 1.5; if (stemEls.includes(e)) w *= 1.3; out[e] += w; });
    }
    const sum = out.reduce((a, b) => a + b, 0) || 1;
    return out.map(x => x / sum);
  }

  // 내 원국 십성 구조에 상대 십성이 들어올 때의 작용(긍정·부정 양면). nat: 내 십성 묶음 비율(0~1), s: 일간 약함 정도(+약 / −강)
  function tgEffects(g, nat, help, nv, dA) {
    const s = clamp((50 - help) / 20, -1, 1), uv = gg => nv.uniV[mod5(dA + gg)], out = [];
    const add = (v, code, txt) => { if (v) out.push({ v, code, txt }); };
    if (g === 4) {
      add(0.6 * s, s >= 0 ? '방신' : '인성과잉', s >= 0 ? '힘이 모자란 쪽을 받쳐 주는 보호막이 됩니다.' : '이미 힘이 넘치는데 더 받쳐 주어 게을러지거나 기대기 쉽습니다.');
      if (nat[3] >= 0.25) add(0.4, '관인상생', '원래 지고 있던 책임감·압박을 상대의 배려가 버틸 힘으로 바꿔 줍니다(관인상생).');
      if (nat[1] >= 0.2 && uv(1) > 0) add(-0.4, '편인도식', '표현·활동 기운을 눌러 하고 싶은 말을 삼키게 만들 수 있습니다(인성이 식상을 누름).');
      if (nat[4] >= 0.3) add(-0.4, '인성태과', '원국에 이미 많은 기운이라 보살핌이 간섭이나 잔소리로 느껴지기 쉽습니다.');
    } else if (g === 0) {
      add(0.5 * s, s >= 0 ? '방신' : '비겁과잉', s >= 0 ? '혼자 감당하기 버거운 일을 함께 짊어져 줍니다.' : '둘 다 고집이 세져 누가 먼저 양보할지 다투기 쉽습니다.');
      if (s > 0 && nat[2] + nat[3] >= 0.45) add(0.3, '비겁방신', '혼자 감당하던 돈·책임을 나눠 들어 줍니다.');
      if (s < 0 && nat[2] >= 0.1) add(-0.4, '군겁쟁재', '돈과 몫을 두고 경쟁하는 구도가 생기기 쉽습니다(군겁쟁재).');
      if (nat[0] >= 0.35) add(-0.3, '비겁태과', '원국에 같은 기운이 이미 많아 서로 고집이 세지고 시야가 좁아질 수 있습니다.');
    } else if (g === 1) {
      add(-0.5 * s, s <= 0 ? '설수' : '설기', s <= 0 ? '넘치는 내 힘을 밖으로 풀어 표현과 결과물로 바꿔 줍니다.' : '힘이 모자란데 자꾸 내보내게 만들어 쉽게 지칩니다.');
      if (nat[2] >= 0.15 && help >= 40) add(0.3, '식상생재', '상대의 아이디어와 활동이 성과·돈으로 이어집니다(식상생재).');
      if (nat[3] >= 0.3) add(0.4, '식상제살', '짓누르던 압박을 상대 덕분에 말과 행동으로 풀어냅니다(식상제살).');
      else if (nat[3] >= 0.1 && uv(3) > 0) add(-0.3, '상관견관', '지키려는 규칙·체면을 상대가 건드려 부딪칠 수 있습니다(상관견관).');
    } else if (g === 2) {
      add(-0.5 * s, s <= 0 ? '재용' : '재다신약', s <= 0 ? '넘치는 힘을 돈과 성과로 쓰게 해 줍니다.' : '감당할 힘보다 일·돈 거리가 많아져 버거워집니다.');
      if (nat[1] >= 0.2) add(0.35, '식신생재', '타고난 재능과 손재주를 현실 성과로 바꿔 줍니다(식신생재).');
      if (nat[3] >= 0.12 && help >= 45) add(0.2, '재생관', '현실 기반이 생겨 일과 자리가 더 단단해집니다(재생관).');
      if (nat[4] >= 0.2 && uv(4) > 0) add(-0.35, '재극인', '꼭 필요한 배움·휴식을 돈·일 문제가 밀어낼 수 있습니다(재극인).');
    } else if (g === 3) {
      add(-0.55 * s, s <= 0 ? '관용' : '극신', s <= 0 ? '넘치는 힘에 방향과 규칙을 잡아 줍니다.' : '힘이 모자란데 책임과 압박까지 겹쳐 눌리기 쉽습니다.');
      if (nat[4] >= 0.2) add(0.35, '관인상생', '상대가 주는 책임이 안에 있던 배움·인내와 이어져 성장으로 바뀝니다(관인상생).');
      if (nat[3] >= 0.25) add(-0.35, '관살혼잡', '이미 짊어진 책임 위에 기준이 하나 더 생겨 헷갈리고 피곤해집니다(관살혼잡).');
    }
    return out;
  }

  // ⑤ 한 방향(other → self)
  function tenGodDir(M, self, other) {
    const dA = M.stemEl(self.pillars.day.s), nv = needView(self), sup = glyphPower(M, other);
    const nat = [0, 1, 2, 3, 4].map(g => ((self.weights.groups && self.weights.groups[g]) || 0) / 100), help = self.strength.help;
    const groups = [];
    for (let g = 0; g < 5; g++) {
      const e = mod5(dA + g), effs = tgEffects(g, nat, help, nv, dA);
      let v = effs.reduce((a, x) => a + x.v, 0);
      const er = rv(nv.eRoles[e]), jr = nv.jRoles ? rv(nv.jRoles[e]) : null, ur = nv.uniV[e];
      const votes = [er, jr, ur].filter(x => x != null), ok = votes.filter(x => x > 0).length, no = votes.filter(x => x < 0).length;
      // 교차 검증: 긍정 작용은 통합 판단이 필요로 할 때만 온전히, 억부·조후 중 한 기준이라도 필요로 하면 0.6배, 한신이면 0.4배, 통합 판단이 꺼리면 0.15배.
      //           부정 작용은 통합 판단의 용신이면 반으로, 두 기준 이상이 꺼리면 조금 키운다.
      const gate = v > 0 ? (ur > 0 ? 1 : ok ? 0.6 : ur < 0 ? 0.15 : 0.4) : (ur >= 0.5 ? 0.5 : no >= 2 ? 1.2 : 1);
      v *= gate;
      groups.push({ g, name: GROUP[g], e, share: sup[e], v, gate, effs, roles: { eokbu: nv.eRoles[e], johu: nv.jRoles ? nv.jRoles[e] : null, unified: nv.uniRoles[e] }, contrib: sup[e] * v });
    }
    const f = groups.reduce((a, x) => a + x.contrib, 0);
    return { f, groups, nat };
  }

  // ⑥ 관계별 상호작용(대칭 점수 + 방향별 설명)
  const SPOUSE_G = { M: 2, F: 3 };
  function relationFit(M, A, B, rel, tgAB, tgBA) {
    const hA = A.strength.help - 50, hB = B.strength.help - 50, notes = [];
    const gA = g => ((A.weights.groups || [])[g] || 0) / 100, gB = g => ((B.weights.groups || [])[g] || 0) / 100;
    const contrast = hA * hB < 0 && Math.abs(hA - hB) >= 12 ? 0.15 : (hA > 8 && hB > 8 ? -0.12 : 0);
    let f = 0;
    if (rel === 'lover') {
      const sp = (self, dir, gender) => { const g = SPOUSE_G[gender]; if (g == null) return 0; const x = dir.groups[g]; const s = x.share;
        let v = s >= 0.4 ? -0.15 : s >= 0.12 ? 0.25 + 0.6 * (s - 0.12) : s / 0.12 * 0.15; if (x.roles.unified === '기신' && s >= 0.2) v -= 0.15; return v; };
      const a = sp(A, tgAB, A.gender), b = sp(B, tgBA, B.gender);
      f = 0.5 * (a + b) + 0.5 * contrast;
      notes.push({ dir: 'ab', v: a, g: SPOUSE_G[A.gender] }, { dir: 'ba', v: b, g: SPOUSE_G[B.gender] });
    } else if (rel === 'work') {
      const prod = x => x(1), man = x => x(2) + x(3), plan = x => x(4), drive = x => x(0);
      const comp = (prod(gA) * man(gB) + prod(gB) * man(gA)) * 2 + (plan(gA) * prod(gB) + plan(gB) * prod(gA));
      const clash = drive(gA) * drive(gB) * 1.5 + (man(gA) >= 0.4 && man(gB) >= 0.4 ? 0.12 : 0);
      f = comp - clash - 0.08 + contrast;
      notes.push({ comp, clash });
    } else if (rel === 'friend') {
      const near = Math.abs(hA - hB) < 15 ? 0.15 : 0, fun = Math.min(gA(1), gB(1)) >= 0.15 ? 0.15 : 0;
      const rival = hA > 8 && hB > 8 && (tgAB.groups[0].share >= 0.3 || tgBA.groups[0].share >= 0.3) ? -0.3 : 0;
      const share = 0.5 * (tgAB.groups[0].share + tgAB.groups[1].share + tgBA.groups[0].share + tgBA.groups[1].share) - 0.45;
      f = near + fun + rival + 0.4 * share;
      notes.push({ near, fun, rival });
    } else {
      const care = (self, dir, h) => { const s = dir.groups[4].share, p = dir.groups[3].share; return (h < 0 ? 0.6 * s : -0.3 * Math.max(0, s - 0.25)) - (h < -8 ? 0.5 * Math.max(0, p - 0.25) : 0); };
      const a = care(A, tgAB, hA), b = care(B, tgBA, hB);
      f = 0.5 * (a + b) + contrast * 1.3;
      notes.push({ dir: 'ab', v: a }, { dir: 'ba', v: b });
    }
    return { score: Math.round(clamp(58 + f * 90, 10, 97)), f, contrast, notes };
  }

  // ④ 사람 사이 합충(한 순서) — 일간끼리·일지끼리 짝은 뺀다
  const PAIRW = (a, b) => (a === 'day' && b === 'day') ? 3 : (a === b && a === 'month') ? 2 : (a === 'year' && b === 'year') ? 1.5 : (a === 'day' || b === 'day') ? 2 : 1;
  function crossRels(M, X, Y) {
    const items = [];
    POS.forEach(k => { if (X.pillars[k]) items.push({ id: 'a.' + k, s: X.pillars[k].s, b: X.pillars[k].b }); });
    POS.forEach(k => { if (Y.pillars[k]) items.push({ id: 'b.' + k, s: Y.pillars[k].s, b: Y.pillars[k].b }); });
    const out = [];
    for (const r of M.relationsAmong(items)) {
      const aPos = r.members.filter(m => m[0] === 'a').map(m => m.slice(2)), bPos = r.members.filter(m => m[0] === 'b').map(m => m.slice(2));
      if (!aPos.length || !bPos.length) continue;
      if (r.members.length === 2 && aPos[0] === 'day' && bPos[0] === 'day') continue;   // ②·③에서 본다
      const t = REL_TXT[r.type]; if (!t) continue;
      let w = 0; aPos.forEach(a => bPos.forEach(b => { w = Math.max(w, PAIRW(a, b)); }));
      out.push({ type: r.type, name: r.name, kind: r.kind, aPos, bPos: bPos[0], bAll: bPos, tone: t[0], weight: w, str: t[4], txt: t });
    }
    return out;
  }
  // 원국 상호작용(other → self): 상대 지지가 내 원국의 충을 합으로 풀거나(탐합망충), 원국의 육합을 충으로 흔드는가
  function interplay(M, self, other, me, you) {
    const own = POS.filter(k => self.pillars[k]).map(k => ({ id: k, b: self.pillars[k].b }));
    const natal = M.relationsAmong(own), out = [];
    const oBr = POS.filter(k => other.pillars[k]).map(k => ({ k, b: other.pillars[k].b }));
    const pairRel = (b1, b2, type) => M.relationsAmong([{ id: 'x', b: b1 }, { id: 'y', b: b2 }]).some(r => r.type === type);
    for (const r of natal) {
      if (r.type === '충' && r.members.length === 2) {
        const hit = oBr.find(o => r.members.some(m => pairRel(self.pillars[m].b, o.b, '육합')));
        if (hit) out.push({ tone: 'good', v: 1, text: `${you}의 ${M.josa(posName(hit.k), '이/가')} ${M.josa(me === '나' ? '내 원국의 ' + r.name : me + ' 원국의 ' + r.name, '을/를')} 합으로 묶어 부딪침을 누그러뜨립니다.` });
      }
      if (r.type === '육합' && r.members.length === 2) {
        const hit = oBr.find(o => r.members.some(m => pairRel(self.pillars[m].b, o.b, '충')));
        if (hit) out.push({ tone: 'bad', v: 1, text: `${you}의 ${M.josa(posName(hit.k), '이/가')} ${me === '나' ? '내' : me + '의'} 원국에 있던 합(${r.name})을 충으로 흔들어, 익숙하던 균형이 깨지기 쉽습니다.` });
      }
    }
    return out;
  }
  function harmonyOf(M, X, Y, nm) {
    const items = crossRels(M, X, Y);
    let good = 0, bad = 0;
    items.forEach(it => { if (it.tone === 'good') good += it.weight * it.str / 3; else if (it.tone === 'bad') bad += it.weight * it.str / 3; });
    const ip = [...interplay(M, X, Y, nm.a, nm.b), ...interplay(M, Y, X, nm.b, nm.a)];
    ip.forEach(x => { if (x.tone === 'good') good += 0.7; else bad += 0.7; });
    return { score: clamp(66 + 6 * good - 5 * bad, 12, 97), items, interplay: ip };
  }

  // 방향별 설명(other → self)
  function directionText(M, self, other, el, tg, rel, me, you) {
    const EL = e => `${M.EL_K[e]}(${M.EL[e]})`, meTo = me === '나' ? '나에게' : me + '에게';
    const pos = tg.groups.filter(x => x.contrib > 0.01).sort((a, b) => b.contrib - a.contrib);
    const neg = tg.groups.filter(x => x.contrib < -0.01).sort((a, b) => a.contrib - b.contrib);
    const best = pos[0] || null, worst = neg[0] || null;
    const help = [], burden = [], advice = [];
    if (best) {
      const eff = best.effs.filter(x => x.v > 0).sort((a, b) => b.v - a.v)[0];
      help.push(`${you}의 ${best.name} 기운(${EL(best.e)}, 상대 원국 세력의 ${Math.round(best.share * 100)}%)이 ${meTo} ${TG_TXT[best.g].good}이 됩니다. ${TG_TXT[best.g].rel[rel]}`);
      if (eff) help.push(eff.txt);
      const side = best.effs.find(x => x.v < 0);
      if (side) burden.push(`다만 같은 ${best.name} 기운이 ${side.txt}`);
    }
    if (el.top && el.top.pct >= 8) help.push(`오행으로 보면 ${meTo} 필요한 ${EL(el.top.e)} 기운(${el.top.role})이 ${you}에게 ${Math.round(el.top.pct)}% 있습니다.`);
    if (worst) {
      const eff = worst.effs.filter(x => x.v < 0).sort((a, b) => a.v - b.v)[0];
      burden.push(`${you}의 ${worst.name} 기운(${EL(worst.e)})은 ${meTo} ${TG_TXT[worst.g].bad}으로 다가오기 쉽습니다.${eff ? ' ' + eff.txt : ''}`);
      advice.push(TG_TXT[worst.g].tip);
    }
    if (el.conflict) burden.push(`억부(강약)로는 ${el.eok > 0 ? '도움' : '부담'}이지만 조후(온도·습도)로는 ${el.jo > 0 ? '도움' : '부담'}이라, 함께 있을 때 편한 면과 지치는 면이 같이 나타납니다.`);
    else if (el.worst && el.worst.pct >= 25 && el.f < 0) burden.push(`${you}에게 많은 ${EL(el.worst.e)} 기운(${el.worst.pct.toFixed(0)}%)은 ${meTo} ${el.worst.role}이라 오래 붙어 있으면 기운이 새기 쉽습니다.`);
    if (best && !advice.length) advice.push(`${you}의 ${TG_TXT[best.g].good}을 믿고 맡기는 영역을 정해 두면 도움이 더 커집니다.`);
    else if (best) advice.push(`${you}에게 ${M.josa(best.name === '인성' ? '조언과 지지' : best.name === '식상' ? '아이디어와 표현' : best.name === '재성' ? '현실 계획과 살림' : best.name === '관성' ? '기준과 마감' : '함께 버티는 일', '을/를')} 부탁하면 관계가 편해집니다.`);
    const score = Math.round(clamp(52 + 70 * (0.5 * el.f + 0.5 * tg.f), 8, 98));
    // 생활 언어 풀이(plain): 전문 용어·비율 없이 같은 판단을 다시 쓴다. help/burden/advice 는 근거(전문) 문장으로 그대로 둔다.
    const strip = t => String(t).replace(/\s*\([^)]*\)/g, '').trim();
    const tp = n => n === '나' ? '나는' : M.josa(n, '은/는'), wa = n => n === '나' ? '나와' : M.josa(n, '과/와');
    const plain = { help: [], burden: [], advice: [] };
    if (best) {
      const eff = best.effs.filter(x => x.v > 0).sort((a, b) => b.v - a.v)[0];
      plain.help.push(`${tp(you)} ${meTo} ${P_GOOD[best.g]}이에요. ${TG_TXT[best.g].rel[rel]}${eff ? ' ' + strip(eff.txt) : ''}`);
      const side = best.effs.find(x => x.v < 0);
      if (side) plain.burden.push(`다만 같은 이유로 ${strip(side.txt)}`);
    }
    if (worst) {
      const eff = worst.effs.filter(x => x.v < 0).sort((a, b) => a.v - b.v)[0];
      plain.burden.push(`가끔은 ${you}의 ${P_BAD[worst.g]}이 ${meTo} 부담으로 느껴질 수 있어요.${eff ? ' ' + strip(eff.txt) : ''}`);
    }
    // 억부·조후가 엇갈리는 정상 복합 판단: 지우지 않고 두 이유를 한 문장으로 잇는다
    if (el.conflict) plain.burden.push(el.eok > 0
      ? `${wa(you)} 함께 있으면 힘은 나는데, 몸과 마음의 리듬은 한쪽으로 더 치우쳐 쉽게 지칠 수 있어요. 기운의 세기로는 도움이 되지만 기운의 온도로는 부담이 되기 때문이에요.`
      : `${wa(you)} 함께 있으면 마음은 편안해지는데, ${me === '나' ? '내' : me + '의'} 힘은 조금씩 빠질 수 있어요. 기운의 온도는 맞춰 주지만 기운의 세기로는 힘을 덜어 가기 때문이에요.`);
    else if (el.worst && el.worst.pct >= 25 && el.f < 0) plain.burden.push(`${wa(you)} 오래 붙어 있으면 기운이 새기 쉬워, 각자 충전하는 시간이 필요해요.`);
    advice.forEach(x => plain.advice.push(x));
    return { from: you, to: me, score, best: best && { name: best.name, g: best.g, e: best.e, share: best.share }, worst: worst && { name: worst.name, g: worst.g, e: worst.e, share: worst.share },
      element: el.top ? { e: el.top.e, role: el.top.role, pct: el.top.pct } : null, help, burden, advice, plain };
  }
  const P_GOOD = { 0: '어려울 때 함께 버티고 협력해 주는 사람', 1: '마음을 표현하고 움직이게 해 주는 사람', 2: '현실 감각과 살림을 챙겨 주는 사람', 3: '중심을 잡아 주고 책임감을 일깨우는 사람', 4: '마음을 받쳐 주고 배우게 해 주는 사람' };
  const P_BAD = { 0: '경쟁하거나 고집을 부리는 모습', 1: '말이 앞서거나 기운을 빼는 모습', 2: '돈·일 욕심이나 계산적인 모습', 3: '압박하거나 잔소리하는 모습', 4: '지나치게 간섭하거나 기대게 만드는 모습' };
  // 항목을 생활 언어로 부를 때
  const PART_PLAIN = { yong: '서로 부족한 기운을 채워 주는 점', dayStem: '타고난 성향', dayBranch: '속마음과 생활 리듬', harmony: '두 사람 사주 전체의 어울림', tenGod: '서로 맡아 주는 역할', relation: '이 관계에서 기대하는 역할' };

  function evaluate(M, A, B, rel, names) {
    if (!A || !B || !A.unified || !B.unified || !A.weights || !A.weights.groups || !B.weights.groups || !M.HIDDEN) return evaluateLegacy(M, A, B, rel, names);   // 옛 엔진
    const cfg = REL_TYPES[rel] || REL_TYPES.lover; rel = REL_TYPES[rel] ? rel : 'lover';
    const nm = Object.assign({ a: '나', b: '상대' }, names || {});
    const dA = A.pillars.day, dB = B.pillars.day;

    // ① 오행·용신
    const elAB = elementDir(M, A, B), elBA = elementDir(M, B, A);   // elAB: B가 A에게 주는 것
    const elScore = f => Math.round(clamp(50 + f * 95, 8, 98));
    const yong = Math.round((elScore(elAB.f) + elScore(elBA.f)) / 2);

    // ② 일간
    const tgAB = M.tenGod(dA.s, dB.s), tgBA = M.tenGod(dB.s, dA.s);
    let stemScore = (TG_SCORE[tgAB] + TG_SCORE[tgBA]) / 2;
    const dayRels = M.relationsAmong([{ id: 'a', s: dA.s, b: dA.b }, { id: 'b', s: dB.s, b: dB.b }]);
    const stemRel = dayRels.filter(r => r.kind === 'stem');
    if (stemRel.some(r => r.type === '천간합')) stemScore = Math.max(stemScore, 93);
    if (stemRel.some(r => r.type === '천간충')) stemScore = Math.min(stemScore, 35);
    const dayStem = Math.round(clamp(stemScore, 10, 98));

    // ③ 일지
    const dayBranchRels = dayRels.filter(r => r.kind === 'branch');
    const sameBranch = dA.b === dB.b;
    const dayBranch = Math.round(dayBranchRels.length ? branchScore(dayBranchRels) : sameBranch ? 66 : 60);

    // ④ 간지 전체 — 두 순서 평균
    const hAB = harmonyOf(M, A, B, nm), hBA = harmonyOf(M, B, A, { a: nm.b, b: nm.a });
    const harmony = Math.round((hAB.score + hBA.score) / 2);
    const items = hAB.items.slice().sort((x, y) => y.weight * y.str - x.weight * x.str);

    // ⑤ 십성 상호 보완
    const tAB = tenGodDir(M, A, B), tBA = tenGodDir(M, B, A);
    const tgScore = f => Math.round(clamp(52 + f * 110, 8, 98));
    const tenGod = Math.round((tgScore(tAB.f) + tgScore(tBA.f)) / 2);

    // ⑥ 관계별
    const R6 = relationFit(M, A, B, rel, tAB, tBA);
    const relation = R6.score;

    const vals = { yong, dayStem, dayBranch, harmony, tenGod, relation };
    const parts = PART_KEYS.map(k => ({ key: k, label: PART_LABEL[k], score: vals[k], weight: cfg.w[k] }));
    const raw = parts.reduce((s, p) => s + p.score * p.weight, 0) / 100;
    const score = Math.round(clamp(SPREAD.center + (raw - SPREAD.mid) * SPREAD.k, 12, 98));
    const grade = gradeOf(score);
    const sorted = parts.slice().sort((x, y) => y.score - x.score || PART_KEYS.indexOf(x.key) - PART_KEYS.indexOf(y.key));
    const best = sorted[0], worst = sorted[sorted.length - 1];

    // 양방향
    const ab = directionText(M, A, B, elAB, tAB, rel, nm.a, nm.b);   // B → A
    const ba = directionText(M, B, A, elBA, tBA, rel, nm.b, nm.a);   // A → B
    if (rel === 'lover') {
      const sp = (n, d, gender, who, other) => { const g = SPOUSE_G[gender]; if (g == null || n.v == null) return;
        const s = d.groups[g].share; const line = s >= 0.4 ? `${other}에게 ${who}의 배우자 기운(${GROUP[g]})이 아주 많아, 끌림이 강한 만큼 집착·간섭으로 번지기 쉽습니다.` : s >= 0.12 ? `${other}에게는 ${who}의 배우자 기운(${GROUP[g]})이 ${Math.round(s * 100)}% 있어, 짝으로서 자연스럽게 끌립니다.` : `${other}에게는 ${who}의 배우자 기운(${GROUP[g]})이 적어, 설렘보다 편안함으로 이어지는 사이입니다.`;
        (s >= 0.4 ? d === tAB ? ab.burden : ba.burden : d === tAB ? ab.help : ba.help).push(line);
        const ga = n => n === '나' ? '내가' : M.josa(n, '이/가'), D = d === tAB ? ab : ba;
        const pl = s >= 0.4 ? `${other}에게는 ${ga(who)} 배우자로 끌리는 기운이 아주 많아, 끌림이 강한 만큼 집착이나 간섭으로 번지기 쉬워요.` : s >= 0.12 ? `${other}에게는 ${ga(who)} 배우자로 끌리는 기운이 있어, 짝으로서 자연스럽게 끌려요.` : `${other}에게는 ${ga(who)} 배우자로 끌리는 기운이 적어, 설렘보다 편안함으로 이어지는 사이예요.`;
        (s >= 0.4 ? D.plain.burden : D.plain.help).push(pl); };
      sp(R6.notes[0], tAB, A.gender, nm.a, nm.b); sp(R6.notes[1], tBA, B.gender, nm.b, nm.a);
    }
    const gap = ab.score - ba.score;
    let asym = null;
    if (Math.abs(gap) >= 15) {   // 무작위 쌍의 방향 점수 차 상위 약 30%
      const more = gap > 0 ? ab : ba, less = gap > 0 ? ba : ab;
      asym = { gap, text: `${more.to === '나' ? '내가' : more.to + (jongOf(more.to) ? '이' : '가')} 받는 도움(${more.score}점)이 ${less.to === '나' ? '내가' : less.to + (jongOf(less.to) ? '이' : '가')} 받는 도움(${less.score}점)보다 큽니다. ${more.best ? `${more.from}의 ${more.best.name} 기운이 ${more.to === '나' ? '나에게' : more.to + '에게'} 꼭 맞는 반면, ` : ''}${less.to === '나' ? '나에게' : less.to + '에게'} 필요한 기운은 상대 쪽에 상대적으로 적습니다. 도움이 한쪽으로 기울기 쉬우니, 덜 받는 쪽의 필요를 일부러 챙겨 주세요.` };
      const ga = n => n === '나' ? '내가' : M.josa(n, '이/가');
      asym.plain = `${ga(more.to)} 받는 도움이 ${less.to === '나' ? '나보다' : less.to + '보다'} 조금 더 큰 사이예요. 도움이 한쪽으로 기울기 쉬우니, ${ga(less.to)} 무엇을 필요로 하는지 일부러 물어보고 챙겨 주세요.`;
    }

    // 종합평 세 칸
    const goods = items.filter(x => x.tone === 'good'), bads = items.filter(x => x.tone === 'bad');
    const helpEach = [...ab.help.slice(0, 1), ...ba.help.slice(0, 1)];
    if (goods[0]) helpEach.push(`${who(nm.a)} ${M.josa(posName(goods[0].aPos, goods[0].kind), '과/와')} ${who(nm.b)} ${M.josa(posName(goods[0].bAll || goods[0].bPos, goods[0].kind), '이/가')} ${goods[0].txt[1]}입니다. ${goods[0].txt[2]}`);
    const whyConflict = [...ab.burden.slice(0, 1), ...ba.burden.slice(0, 1)];
    if (bads[0]) whyConflict.push(`${who(nm.a)} ${M.josa(posName(bads[0].aPos, bads[0].kind), '과/와')} ${who(nm.b)} ${M.josa(posName(bads[0].bAll || bads[0].bPos, bads[0].kind), '이/가')} ${bads[0].txt[1]}입니다. ${bads[0].txt[2]}`);
    [...hAB.interplay].filter(x => x.tone === 'bad').slice(0, 1).forEach(x => whyConflict.push(x.text));
    const grow = [REL_GROW[rel], ...ab.advice.slice(0, 1), ...ba.advice.slice(0, 1)];
    if (bads[0]) grow.push(bads[0].txt[3]);
    function who(n) { return n === '나' ? '나의' : n + '의'; }
    const uniq = a => [...new Set(a.filter(Boolean))];

    // 강약·기후 메모(점수는 ①에 흡수 — 설명으로만 남긴다)
    const hA = A.strength.help - 50, hB = B.strength.help - 50, balanceNotes = [];
    if (Math.abs(hA) < 8 && Math.abs(hB) < 8) balanceNotes.push('두 사람 모두 강약이 중간에 가까워 어느 한쪽이 크게 기울지 않습니다.');
    else if (hA * hB < 0) balanceNotes.push('한 사람은 힘이 남고 한 사람은 모자라 서로 기대기 좋은 강약입니다.');
    else if (Math.abs(hA) >= 6 && Math.abs(hB) >= 6) balanceNotes.push(`두 사람 모두 ${hA > 0 ? '힘이 남는' : '힘이 모자란'} 쪽이라 같은 약점이 함께 드러나기 쉽습니다.`);
    if (elAB.conflict) balanceNotes.push(`${nm.a} 쪽은 억부와 조후가 ${nm.b}의 기운을 다르게 봅니다(억부 ${elAB.eok > 0 ? '도움' : '부담'} · 조후 ${elAB.jo > 0 ? '도움' : '부담'}). 두 기준을 따로 계산해 급한 정도 비율로 합쳤습니다.`);
    if (elBA.conflict) balanceNotes.push(`${nm.b} 쪽은 억부와 조후가 ${nm.a}의 기운을 다르게 봅니다(억부 ${elBA.eok > 0 ? '도움' : '부담'} · 조후 ${elBA.jo > 0 ? '도움' : '부담'}). 두 기준을 따로 계산해 급한 정도 비율로 합쳤습니다.`);

    const elOut = (el, tg) => ({ score: elScore(el.f), top: el.top, dayEl: el.dayEl, dayRole: el.dayRole, reasons: [], eokbu: +el.eok.toFixed(3), johu: el.jo == null ? null : +el.jo.toFixed(3), climate: +el.clim.toFixed(3), conflict: el.conflict, weights: { eokbu: el.eU, johu: el.jU }, tenGod: tgScore(tg.f) });
    return {
      version: VERSION, rel, relLabel: cfg.label, relWhy: REL_WHY[rel], names: nm, score, grade, parts, raw: +raw.toFixed(2),
      element: { aGets: elOut(elAB, tAB), bGets: elOut(elBA, tBA), unified: true },
      tenGods: {
        aGets: tAB.groups.map(x => ({ name: x.name, el: x.e, share: +x.share.toFixed(3), value: +x.v.toFixed(3), roles: x.roles, effects: x.effs.map(e => e.code) })),
        bGets: tBA.groups.map(x => ({ name: x.name, el: x.e, share: +x.share.toFixed(3), value: +x.v.toFixed(3), roles: x.roles, effects: x.effs.map(e => e.code) })),
      },
      directions: { ab, ba }, asym,
      summary3: { help: uniq(helpEach).slice(0, 4), conflict: uniq(whyConflict).slice(0, 4), grow: uniq(grow).slice(0, 4) },
      stems: { aSeesB: tgAB, bSeesA: tgBA, hap: stemRel.some(r => r.type === '천간합'), chung: stemRel.some(r => r.type === '천간충') },
      dayBranch: { rels: dayBranchRels.map(r => r.type), same: sameBranch },
      relations: items, interplay: hAB.interplay,
      relationFit: { score: relation, contrast: R6.contrast },
      best, worst,
      strength: { a: A.strength.zone, b: B.strength.zone }, balanceNotes,
    };
  }
  const jongOf = n => { const c = String(n).charCodeAt(String(n).length - 1); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0; };
  const REL_GROW = {
    lover: '중요한 이야기는 감정이 가라앉은 뒤에 하고, 돈과 기념일 문제는 미리 약속을 정해 두세요.',
    work: '역할과 책임을 문서로 나누고, 의견이 갈리면 근거 자료로 결정하세요.',
    friend: '서운한 점은 쌓아 두지 말고 가볍게 바로 말하세요.',
    family: '가까울수록 말투를 조심하고, 돌봄과 간섭의 선을 함께 정해 두세요.',
  };

  G.PairCompat = { evaluate, evaluateLegacy, VERSION, REL_TYPES, REL_TYPES_V1, REL_WHY, PART_LABEL, PART_LABEL_V1, PART_KEYS, REL_TXT, AREA, POS_K, posName, TG_TXT, GROUP, SPREAD, PART_PLAIN, gradeOf, GRADES,
    _internal: { needView, elementDir, glyphPower, tenGodDir, relationFit, harmonyOf } };
})(typeof window !== 'undefined' ? window : globalThis);
