/* 여러 명 궁합(무리 궁합, 2026-11-25) — 3~6명의 사주를 함께 놓고 무리 안의 흐름을 본다. 표시 전용
   · 두 사람 계산은 compat-pair.js(PairCompat.evaluate, 2판 6항목·대칭 총점)를 모든 두 사람 조합에 그대로 돌려 읽기만 한다.
     엔진(engine.js)·두 사람 궁합 계산식은 바꾸지 않는다.
   · ① 관계 지도: 모든 쌍의 총점 → 선 굵기·색, 잘 맞물리는 쌍·맞춰 갈 곳이 많은 쌍
     ② 기운 방향: 두 사람 궁합의 십성 묶음(tenGods: 상대 원국 세력 비율 share × 작용값 value)으로
        인성(받쳐 줌)·식상(표현을 끌어냄)·관성(중심을 잡아 줌 / 압박으로 느껴짐)을 화살표로
     ③ 무리 오행 균형: 각자의 오행 세력(ch.weights.pct)을 평균해 무리에 적은·많은 기운과 그 기운을 채우는 사람
     ④ 중재자: 맞춰 갈 곳이 많은 두 사람 모두와 잘 맞는 사람
     ⑤ 함께 좋은 시기: 각자의 월운 흐름 점수(engine wolun → combined, 엔진 값 그대로)를 겹쳐 함께 움직이기 좋은 달·예민해지기 쉬운 달
        등급은 luck-grade.js(좋음·무난·조심), 달의 오행은 luck-element-theme.js mainEl
   · 문구 원칙: "안 맞는 사람"이라고 단정하지 않는다. 맞물리는 방식과 대하는 요령을 쉬운 말로 쓴다.
   · 스위치: MANTRA_FLAGS.groupCompat(기본 꺼짐, 관리자 /api/luck-flags groupCompat)
   브라우저: window.GroupCompat · Node: module.exports */
(function (G) {
  'use strict';
  const VERSION = 'group-compat-2026-11-25';
  const MIN = 3, MAX = 6;
  const EL_K = ['목', '화', '토', '금', '수'], EL_H = ['木', '火', '土', '金', '水'];
  const elN = e => `${EL_K[e]}(${EL_H[e]})`;
  // 쌍 총점 구간(두 사람 궁합 총점 0~100). 이름은 단정하지 않는 말로만 쓴다
  const BAND = { good: 72, care: 58 };
  const bandOf = s => s >= BAND.good ? 'good' : s < BAND.care ? 'care' : 'mid';
  const BAND_NAME = { good: '잘 맞물리는 사이', mid: '무난하게 맞춰 가는 사이', care: '서로 맞춰 갈 곳이 많은 사이' };
  // 기운 방향 기준: 기여(share × value) 크기. tests/compat-group-sim.cjs 가 무작위 무리에서 화살표 수가 지나치게 많거나 적지 않은지 본다
  // 무작위 두 사람 쌍에서 종류별로 위쪽 약 10~13%만 화살표가 되도록 맞춘 기준(2026-11-25)
  const ARROW = { support: 0.15, spark: 0.09, anchor: 0.07, pressure: 0.09, pressureShare: 0.18, cap: 2 };   // cap: 지도에는 사람 수 + cap 개까지만(나머지는 목록에서 펼쳐 보기)
  const ARROW_KIND = {
    support: { g: 4, label: '받쳐 줌', line: (x, y) => `${x}${pick(x, '은', '는')} ${y}의 마음을 받쳐 주는 쪽이에요. 힘들 때 기대기 좋은 사람이에요.`, tip: (x, y) => `${y}${pick(y, '이', '가')} 기대는 만큼 스스로 할 일도 정해 두면, 받는 도움이 성장으로 이어져요.` },
    spark: { g: 1, label: '표현을 끌어냄', line: (x, y) => `${x}${pick(x, '은', '는')} ${y}의 말과 행동을 끌어내는 쪽이에요. 같이 있으면 ${y}${pick(y, '이', '가')} 더 활발해져요.`, tip: (x, y) => `아이디어는 함께 내되, 끝맺는 일정은 한 사람이 챙기세요.` },
    anchor: { g: 3, label: '중심을 잡아 줌', line: (x, y) => `${x}${pick(x, '은', '는')} ${y}에게 기준과 방향을 잡아 주는 쪽이에요.`, tip: (x, y) => `${x}의 기준은 짧고 분명하게 전할수록 ${y}에게 힘이 돼요.` },
    pressure: { g: 3, label: '압박으로 느껴지기 쉬움', line: (x, y) => `${x}의 기준과 말이 ${y}에게는 압박으로 느껴지기 쉬워요. 뜻은 좋아도 받아들이는 쪽이 무겁게 느낄 수 있어요.`, tip: (x, y) => `${x}${pick(x, '은', '는')} 지적을 짧게 하고, 기대하는 것을 미리 말로 정해 두면 ${y}${pick(y, '이', '가')} 훨씬 편해져요.` },
  };
  // 무리 오행 균형: 다섯 기운 평균 20% 기준
  const BAL = { lack: 12, over: 30, fill: 22 };
  const EL_FILL = [
    '새 계획을 세우고 앞으로 나아가게 하는 힘',
    '분위기를 띄우고 마음을 표현하게 하는 힘',
    '흩어진 것을 모으고 안정시키는 힘',
    '결정하고 마무리 짓는 힘',
    '한발 물러서 생각하고 정보를 모으는 힘',
  ];
  const EL_OVER = [
    '일을 자꾸 벌이고 서로 앞서가려는 흐름',
    '말과 감정이 빨리 달아오르는 흐름',
    '변화를 미루고 하던 대로만 하려는 흐름',
    '서로 옳고 그름을 따지며 날이 서는 흐름',
    '생각만 많고 결정이 늦어지는 흐름',
  ];
  const EL_LACK_TIP = [
    '새로 시작하는 일은 누가 먼저 꺼낼지 정해 두세요.',
    '서로 칭찬하고 마음을 말로 표현하는 시간을 일부러 만들어 보세요.',
    '일정과 돈 관리 같은 기본 규칙을 함께 정해 두면 흔들림이 줄어요.',
    '결정할 날짜를 미리 정해 두고, 마감은 한 사람이 챙기세요.',
    '중요한 일은 하루 묵혔다가 정보를 모은 뒤 결정해 보세요.',
  ];
  const REL_TIP = {
    lover: '두 사람만의 시간과 무리 전체의 시간을 따로 정해 두면 서운함이 줄어요.',
    work: '역할과 결정 순서를 문서로 정해 두면, 맞물리는 쌍의 장점은 살고 부딪침은 줄어요.',
    friend: '모일 때마다 같은 사람이 맞춰 주지 않도록, 약속 정하는 사람을 돌아가며 맡아 보세요.',
    family: '가까운 만큼 말투를 조심하고, 돌봄과 간섭의 선을 가족끼리 한 번 이야기해 두세요.',
  };
  const ROLES = { '': '', parent: '부모', child: '자녀', spouse: '배우자', sibling: '형제·자매', grand: '조부모', grandchild: '손주', relative: '친척' };

  function jong(w) { const s = String(w), c = s.charCodeAt(s.length - 1); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0; }
  function pick(w, a, b) { return jong(w) ? a : b; }
  const r1 = v => Math.round(v * 10) / 10;
  // 이름이 '나'일 때 '나가'는 '내가'로(문장을 만든 뒤 한 번에 고친다)
  const fixMe = t => typeof t === 'string' ? t.replace(/(^|[\s·(])나가 /g, '$1내가 ') : t;
  const fixAll = a => a.map(fixMe);

  // 이름이 비었거나 겹치면 구분되는 이름으로 바꾼다
  function uniqNames(members) {
    const seen = {};
    return members.map((m, i) => {
      let n = String(m.name || '').trim() || `${i + 1}번째 사람`;
      if (seen[n]) { let k = 2; while (seen[n + k]) k++; n = n + k; }
      seen[n] = true; return n;
    });
  }

  function evaluate(M, members, rel, opts) {
    opts = opts || {};
    const PC = opts.pair || G.PairCompat;
    if (!M || !PC || !Array.isArray(members)) return { ok: false, error: '계산 모듈이 준비되지 않았어요.' };
    const list = members.filter(m => m && m.ch && m.ch.pillars);
    if (list.length < MIN) return { ok: false, error: `${MIN}명 이상 골라 주세요.` };
    if (list.length > MAX) return { ok: false, error: `한 번에 ${MAX}명까지 볼 수 있어요.` };
    rel = PC.REL_TYPES && PC.REL_TYPES[rel] ? rel : 'lover';
    const names = uniqNames(list);
    const P = list.map((m, i) => ({ i, id: m.id != null ? String(m.id) : String(i), name: names[i], role: ROLES[m.role] != null ? m.role : '', roleLabel: ROLES[m.role] || '', me: !!m.me, ch: m.ch,
      dayGz: M.STEM[m.ch.pillars.day.s] + M.BR[m.ch.pillars.day.b], dayEl: M.stemEl(m.ch.pillars.day.s) }));
    const n = P.length;

    // ── ① 모든 두 사람 조합 ──
    const pairs = [], S = [...Array(n)].map(() => Array(n).fill(null));
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
      const R = PC.evaluate(M, P[a].ch, P[b].ch, rel, { a: P[a].name, b: P[b].name });
      const sorted = (R.parts || []).slice().sort((x, y) => y.score - x.score);
      const pl = d => (d && d.plain) || { help: d ? d.help : [], burden: d ? d.burden : [], advice: d ? d.advice : [] };
      const D = R.directions || {};
      const pr = { a, b, score: R.score, band: bandOf(R.score), bandName: BAND_NAME[bandOf(R.score)],
        best: sorted[0] ? { key: sorted[0].key, label: sorted[0].label, score: sorted[0].score } : null,
        worst: sorted.length ? { key: sorted[sorted.length - 1].key, label: sorted[sorted.length - 1].label, score: sorted[sorted.length - 1].score } : null,
        help: [...(pl(D.ab).help || []).slice(0, 1), ...(pl(D.ba).help || []).slice(0, 1)],
        burden: [...(pl(D.ab).burden || []).slice(0, 1), ...(pl(D.ba).burden || []).slice(0, 1)],
        advice: [...(pl(D.ab).advice || []).slice(0, 1), ...(pl(D.ba).advice || []).slice(0, 1)],
        _r: R };
      pairs.push(pr); S[a][b] = S[b][a] = pr;
    }
    const pk = pr => [P[pr.a].name, P[pr.b].name].sort().join('|');
    const byScore = pairs.slice().sort((x, y) => y.score - x.score || (pk(x) < pk(y) ? -1 : pk(x) > pk(y) ? 1 : 0));
    const avg = Math.round(pairs.reduce((s, p) => s + p.score, 0) / pairs.length);
    const top = byScore.filter(p => p.band === 'good').slice(0, 3);
    if (!top.length) top.push(byScore[0]);
    const low = pairs.filter(p => p.band === 'care').sort((x, y) => x.score - y.score || (pk(x) < pk(y) ? -1 : pk(x) > pk(y) ? 1 : 0)).slice(0, 3);
    // 모두 무난 이상이면 가장 낮은 쌍 하나만 '조금 더 신경 쓸 쌍'으로(단, 가장 잘 맞는 쌍과 같지 않을 때)
    const lowest = pairs.slice().sort((x, y) => x.score - y.score || (pk(x) < pk(y) ? -1 : pk(x) > pk(y) ? 1 : 0))[0];
    const softLow = !low.length && pairs.length > 1 && lowest.score < byScore[0].score ? [lowest] : [];

    // ── ② 기운 방향(X → Y) ──
    const arrows = [];
    for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) {
      if (x === y) continue;
      const pr = S[x][y], R = pr._r; if (!R.tenGods) continue;
      // Y가 A이면 aGets(= B의 원국을 A의 십성으로 본 것)가 X → Y
      const gs = pr.a === y ? R.tenGods.aGets : R.tenGods.bGets;
      const at = g => gs.find(t => t.name === ['비겁', '식상', '재성', '관성', '인성'][g]) || { share: 0, value: 0 };
      const c4 = at(4).share * at(4).value, c1 = at(1).share * at(1).value, g3 = at(3), c3 = g3.share * g3.value;
      const cands = [
        { kind: 'support', v: c4 },
        { kind: 'spark', v: c1 },
        { kind: 'anchor', v: c3 },
        { kind: 'pressure', v: g3.share >= ARROW.pressureShare ? -c3 : 0 },
      ].map(c => Object.assign(c, { r: c.v / ARROW[c.kind] })).filter(c => c.r >= 1).sort((p, q) => q.r - p.r || ['support', 'pressure', 'anchor', 'spark'].indexOf(p.kind) - ['support', 'pressure', 'anchor', 'spark'].indexOf(q.kind));
      if (!cands.length) continue;
      const c = cands[0], K = ARROW_KIND[c.kind];
      arrows.push({ from: x, to: y, kind: c.kind, label: K.label, strength: +c.v.toFixed(3), line: K.line(P[x].name, P[y].name), tip: K.tip(P[x].name, P[y].name) });
    }
    arrows.sort((p, q) => q.strength - p.strength || (P[p.from].name + P[p.to].name < P[q.from].name + P[q.to].name ? -1 : 1));
    // 사람별 요약: 가장 많이 받쳐 주는 사람, 기준을 세우는 사람
    const giveCount = P.map(p => arrows.filter(a => a.from === p.i && (a.kind === 'support' || a.kind === 'spark')).length);
    const gMax = Math.max(...giveCount), gTop = P.filter(p => giveCount[p.i] === gMax).sort((a, b) => a.name < b.name ? -1 : 1);
    const giver = gMax >= 2 ? gTop[0].i : -1;

    // ── ③ 무리 오행 균형 ──
    const pctOf = p => [0, 1, 2, 3, 4].map(e => +(((p.ch.weights && p.ch.weights.pct) || [])[e] || 0));
    const each = P.map(p => pctOf(p));
    const group = [0, 1, 2, 3, 4].map(e => r1(each.reduce((s, v) => s + v[e], 0) / n));
    const order = [0, 1, 2, 3, 4].sort((a, b) => group[a] - group[b] || a - b);
    const lack = order.filter(e => group[e] < BAL.lack);
    const over = order.slice().reverse().filter(e => group[e] > BAL.over);
    const fillers = e => P.map(p => ({ i: p.i, pct: r1(each[p.i][e]) })).filter(x => x.pct >= BAL.fill).sort((a, b) => b.pct - a.pct || (P[a.i].name < P[b.i].name ? -1 : 1));
    const balance = { group, each: each.map(v => v.map(r1)),
      lack: lack.map(e => ({ e, pct: group[e], fill: EL_FILL[e], tip: EL_LACK_TIP[e], by: fillers(e).slice(0, 2) })),
      over: over.map(e => ({ e, pct: group[e], flow: EL_OVER[e], by: fillers(e).slice(0, 2) })),
      lines: [] };
    balance.lack.forEach(l => {
      const who = l.by.map(x => P[x.i].name);
      balance.lines.push(`무리 전체에 ${elN(l.e)} 기운이 ${l.pct}%로 적어요. ${l.fill}이 부족해지기 쉬워요. ${who.length ? `${who.join('·')}${pick(who[who.length - 1], '이', '가')} 이 기운을 가장 많이 가지고 있어, 그 역할을 맡기면 무리가 한결 편해져요.` : l.tip}`);
    });
    balance.over.forEach(o => {
      const who = o.by.map(x => P[x.i].name);
      balance.lines.push(`${elN(o.e)} 기운이 ${o.pct}%로 많아요. 모이면 ${o.flow}이 생기기 쉬워요.${who.length ? ` 특히 ${who.join('·')}${pick(who[who.length - 1], '이', '가')} 함께 있을 때 두드러져요.` : ''}`);
    });
    if (!balance.lines.length) balance.lines.push('다섯 기운이 무리 안에 고르게 퍼져 있어요. 한쪽으로 쏠리지 않아 서로의 빈자리를 자연스럽게 채우는 무리예요.');

    // ── ④ 중재자 ──
    const mediators = [];
    (low.length ? low : softLow).forEach(pr => {
      let best = null;
      for (let c = 0; c < n; c++) {
        if (c === pr.a || c === pr.b) continue;
        const sa = S[c][pr.a].score, sb = S[c][pr.b].score, m = Math.min(sa, sb);
        if (m >= Math.max(pr.score + 6, 62) && (!best || m > best.min || (m === best.min && (sa + sb > best.sum || (sa + sb === best.sum && P[c].name < P[best.c].name))))) best = { c, min: m, sum: sa + sb, sa, sb };
      }
      const A = P[pr.a].name, B = P[pr.b].name;
      if (best) {
        const C = P[best.c].name;
        mediators.push({ pair: [pr.a, pr.b], by: best.c, scores: [best.sa, best.sb], line: `${A}${pick(A, '과', '와')} ${B} 사이에서는 ${C}${pick(C, '이', '가')} 다리 역할을 하기 좋아요. ${C}${pick(C, '은', '는')} 두 사람 모두와 잘 맞물려, 의견이 갈릴 때 한 번 정리해 주면 대화가 부드러워져요.` });
      } else mediators.push({ pair: [pr.a, pr.b], by: -1, scores: [], line: `${A}${pick(A, '과', '와')} ${B} 사이를 이어 줄 사람이 무리 안에 뚜렷하지 않아요. 두 사람이 직접 이야기할 때는 짧게, 한 가지 주제씩 나누는 편이 좋아요.` });
    });

    // ── ⑤ 함께 좋은 시기(월운) ──
    const months = togetherMonths(M, P, opts);

    // ── 요약 ──
    const nm = pr => `${P[pr.a].name}${pick(P[pr.a].name, '과', '와')} ${P[pr.b].name}`, last = pr => P[pr.b].name;
    const summary = [];
    summary.push(`${n}명이 함께 있을 때 두 사람씩 맞물리는 정도는 평균 ${avg}점이에요. ${avg >= BAND.good ? '대체로 서로 힘이 되는 무리예요.' : avg >= BAND.care ? '맞물리는 쌍과 맞춰 갈 쌍이 섞여 있는 무리예요.' : '서로 맞춰 가야 할 곳이 많은 무리라, 역할과 규칙을 정해 두면 훨씬 편해져요.'}`);
    if (top[0]) summary.push(`가장 잘 맞물리는 두 사람은 ${nm(top[0])}${pick(last(top[0]), '이에요', '예요')}(${top[0].score}점).`);
    if (low[0]) summary.push(`${nm(low[0])}${pick(last(low[0]), '은', '는')} 서로 맞춰 갈 곳이 많아요(${low[0].score}점).${mediators[0] && mediators[0].by >= 0 ? ` 이럴 때 ${P[mediators[0].by].name}${pick(P[mediators[0].by].name, '이', '가')} 이어 주기 좋아요.` : ''}`);
    else if (softLow[0]) summary.push(`크게 부딪치는 쌍은 없고, ${nm(softLow[0])}만 조금 더 신경 쓰면 돼요(${softLow[0].score}점).`);
    if (giver >= 0) summary.push(`${P[giver].name}${pick(P[giver].name, '은', '는')} 무리 안에서 여러 사람을 받쳐 주는 쪽이에요.`);
    const tips = [REL_TIP[rel], ...(low[0] ? low[0].advice.slice(0, 1) : []), ...(balance.lack[0] ? [balance.lack[0].tip] : [])].filter(Boolean);

    arrows.forEach(a => { a.line = fixMe(a.line); a.tip = fixMe(a.tip); });
    mediators.forEach(m => { m.line = fixMe(m.line); });
    balance.lines = fixAll(balance.lines);
    if (months) { months.lines.good = fixAll(months.lines.good); months.lines.care = fixAll(months.lines.care); }
    const strip = pr => { const o = Object.assign({}, pr); delete o._r; return o; };
    return { ok: true, version: VERSION, rel, relLabel: (PC.REL_TYPES[rel] || {}).label || '', n, avg,
      people: P.map(p => ({ i: p.i, id: p.id, name: p.name, role: p.role, roleLabel: p.roleLabel, me: p.me, dayGz: p.dayGz, dayEl: p.dayEl })),
      pairs: pairs.map(strip), top: top.map(strip), low: low.map(strip), softLow: softLow.map(strip),
      arrows, giver, balance, mediators, months, summary: fixAll(summary), tips,
      pairResult: (a, b) => (S[a] && S[a][b] ? S[a][b]._r : null) };
  }

  // 지금 달부터 12달: 사람마다 엔진 월운 흐름 점수(combined) → 등급. 달 기둥은 모두에게 같으므로 오행 색은 하나
  function togetherMonths(M, P, opts) {
    const LG = opts.grade || G.MantraLuckGrade, LT = opts.theme || G.MantraLuckTheme;
    if (!M.wolun || !M.monthsOfYear) return null;
    const now = opts.now != null ? +opts.now : Date.now();
    const Y0 = M.yearPillarAt ? M.yearPillarAt(now).sajuYear : new Date(now).getUTCFullYear();
    const span = [];
    [Y0, Y0 + 1].forEach(Y => { if (Y >= M.MIN_Y && Y <= M.MAX_Y - 1) M.monthsOfYear(Y).forEach((m, k) => span.push({ Y, k, m })); });
    let start = 0; span.forEach((x, i) => { if (x.m.startMs <= now) start = i; });
    const pick12 = span.slice(start, start + 12);
    if (!pick12.length) return null;
    const cache = {};
    const wol = (p, Y) => { const key = p.i + ':' + Y; if (!cache[key]) { try { cache[key] = M.wolun(p.ch, Y); } catch (e) { cache[key] = []; } } return cache[key]; };
    const gradeK = v => { if (LG && LG.flow) return LG.flow(v, M).k; return v >= 18 ? 'good' : v > -12 ? 'ok' : 'care'; };
    const rows = pick12.map(({ Y, k, m }) => {
      const d = new Date(m.startMs + 9 * 3600e3);
      const vals = P.map(p => { const it = wol(p, Y)[k]; const v = it && Number.isFinite(it.combined) ? it.combined : null; return { i: p.i, v, g: v == null ? null : gradeK(v) }; });
      const ok = vals.filter(x => x.v != null);
      const mean = ok.length ? Math.round(ok.reduce((s, x) => s + x.v, 0) / ok.length) : 0;
      const good = ok.filter(x => x.g === 'good').length, care = ok.filter(x => x.g === 'care').length;
      const me = LT && LT.mainEl ? LT.mainEl(M, m) : null;
      return { Y, k, startMs: m.startMs, label: `${d.getUTCMonth() + 1}월`, year: d.getUTCFullYear(), gz: M.STEM[m.s] + M.BR[m.b], el: me ? me.el : M.stemEl(m.s),
        mean, good, care, vals, score: mean + 8 * good - 10 * care };
    });
    const n = P.length, idx = rows.map((r, i) => i);
    const goodM = idx.filter(i => rows[i].care <= Math.floor(n / 4) && (rows[i].good >= Math.ceil(n / 2) || rows[i].mean >= 12))
      .sort((a, b) => rows[b].score - rows[a].score || a - b).slice(0, 3);
    const careM = idx.filter(i => rows[i].care >= Math.max(2, Math.ceil(n / 3)))
      .sort((a, b) => rows[a].score - rows[b].score || a - b).slice(0, 3);
    const when = r => `${r.year}년 ${r.label}`;
    const nm = r => r.vals.filter(x => x.g === 'care').map(x => P[x.i].name);
    const gm = r => r.vals.filter(x => x.g === 'good').map(x => P[x.i].name);
    const lines = { good: [], care: [] };
    goodM.forEach(i => { const r = rows[i], w = gm(r); lines.good.push(`${when(r)}(${r.gz})에는 ${w.length ? `${w.join('·')}의 흐름이 함께 좋아` : '모두의 흐름이 고르게 무난해'} 함께 일을 벌이거나 모이기 좋아요. 이 달에 두드러지는 기운은 ${elN(r.el)}${'목토'.includes(EL_K[r.el]) ? '이에요' : '예요'}.`); });
    careM.forEach(i => { const r = rows[i], w = nm(r); lines.care.push(`${when(r)}(${r.gz})에는 ${w.join('·')}의 흐름이 예민해지기 쉬워요. 큰 결정이나 무리한 일정은 피하고, 서로 말투를 한 번 더 살피세요.`); });
    if (!lines.good.length) lines.good.push('앞으로 12달 안에 모두의 흐름이 함께 크게 오르는 달은 뚜렷하지 않아요. 각자 흐름이 좋은 달에 그 사람이 앞장서는 방식이 잘 맞아요.');
    if (!lines.care.length) lines.care.push('여러 사람이 동시에 예민해지는 달은 뚜렷하지 않아요.');
    return { rows, good: goodM, care: careM, lines };
  }

  const api = { VERSION, MIN, MAX, BAND, BAND_NAME, ARROW, BAL, ROLES, evaluate, togetherMonths, bandOf };
  G.GroupCompat = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
