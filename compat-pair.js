/* 두 사람 궁합 — 내 사주(A)와 상대 사주(B)를 비교한다.
   기존 엔진(M)의 계산 결과(ch.yong, ch.weights, ch.strength, M.luckRelations, M.relationsAmong, M.tenGod)를 읽기만 하고
   다른 점수에는 영향을 주지 않는다. 점수·등급은 명리 모델의 참고 지표이며, 문구는 읽기 쉽게 단정적으로 쓴다. */
(function (G) {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const POS = ['year', 'month', 'day', 'hour'];
  const AREA = { year: '조상·어린 시절', month: '부모·직장', day: '속마음·배우자', hour: '자녀·말년' };
  const ROLE_W = { '용신': 1, '희신': 0.6, '한신': 0, '구신': -0.5, '기신': -1 };

  // 관계 종류별 가중치(합 100): 오행 보완 / 일간 십성 / 일지(배우자궁) / 간지 전체 조화 / 강약 균형
  const REL_TYPES = {
    lover: { label: '연인·부부', w: { yong: 25, dayStem: 20, dayBranch: 25, harmony: 20, balance: 10 } },
    work: { label: '직장·동업', w: { yong: 30, dayStem: 15, dayBranch: 10, harmony: 25, balance: 20 } },
    friend: { label: '친구', w: { yong: 25, dayStem: 20, dayBranch: 15, harmony: 25, balance: 15 } },
    family: { label: '가족', w: { yong: 30, dayStem: 25, dayBranch: 10, harmony: 20, balance: 15 } },
  };
  const PART_LABEL = { yong: '오행 보완', dayStem: '일간 궁합', dayBranch: '일지(마음자리)', harmony: '간지 조화', balance: '강약 균형' };

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

  function evaluate(M, A, B, rel, names) {
    const cfg = REL_TYPES[rel] || REL_TYPES.lover;
    const nm = Object.assign({ a: '나', b: '상대' }, names || {});
    const dA = A.pillars.day, dB = B.pillars.day;

    // 1) 오행 보완 — 서로의 용신·희신을 상대의 오행이 얼마나 채워 주는가
    const fitA = elementFit(M, A, B), fitB = elementFit(M, B, A);
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
    balance = Math.round(clamp(balance, 20, 96));

    const parts = ['yong', 'dayStem', 'dayBranch', 'harmony', 'balance'].map(k => ({ key: k, label: PART_LABEL[k], score: { yong, dayStem, dayBranch, harmony, balance }[k], weight: cfg.w[k] }));
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
        aGets: { score: fitA.score, top: fitA.top, dayEl: fitA.dayEl, dayRole: fitA.dayRole },   // 상대가 나에게 채워 주는 것
        bGets: { score: fitB.score, top: fitB.top, dayEl: fitB.dayEl, dayRole: fitB.dayRole },   // 내가 상대에게 채워 주는 것
      },
      stems: { aSeesB: tgAB, bSeesA: tgBA, hap: stemRel.some(r => r.type === '천간합'), chung: stemRel.some(r => r.type === '천간충') },
      dayBranch: { rels: dayBranchRels.map(r => r.type), same: sameBranch },
      relations: items,
      best, worst,
      strength: { a: A.strength.zone, b: B.strength.zone },
    };
  }

  G.PairCompat = { evaluate, REL_TYPES, PART_LABEL, REL_TXT, AREA, gradeOf, GRADES };
})(typeof window !== 'undefined' ? window : globalThis);
