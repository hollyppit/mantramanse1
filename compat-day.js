/* 60갑자 일주 적합도 2판 — 내 원국 8글자 × 상대 일주 2글자 (설계: docs/DAY_PILLAR_COMPAT_PLAN_2026-11-16.md)
   engine.js 의 결과(ch.unified·relationsAmong·tenGod·HIDDEN)만 읽고 엔진은 바꾸지 않는다.
   스위치 MANTRA_FLAGS.dayCompat(기본 꺼짐, 관리자 /api/luck-flags dayCompat)이 켜져 있을 때만 M.compatDayPillars·M.compatAttraction 이
   이 계산을 돌려준다. 꺼져 있으면 기존 엔진 계산 그대로다(돌려주는 필드 이름은 같다 — 무빙툰 saju-data·deep-life·garden 호환).
   - 상대의 전체 원국은 모르므로 상대의 통근·월령·강약·용신은 계산하지 않는다. 상대 일주가 들여오는 기운(일간 55%·일지 지장간 45%)만 본다.
   - 억부·조후·격국·통관·제화·종격은 통합 판단 역할값(roleV) 하나로 반영하고 따로 더하지 않는다(중복 가산 없음).
   - 부족한 오행이라는 이유만으로 가산하지 않는다(옛 '균형'·'과잉 위험' 성분 없음). 일지 충·형은 맞는 내 글자의 역할로 조건부 처리한다.
   - 끌림은 실제 감정 예측이 아니라 배우자성·합·매력 신살 같은 명리 상징 관계 지표다(엔진 evaluateAttraction 그대로, '내게 필요한 기운'만 새 값). */
(function (G) {
  'use strict';
  const VERSION = 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), mod5 = x => ((x % 5) + 5) % 5;
  // engine.js 내부와 같은 글자별 온도·습도 표(엔진 파일을 바꾸지 않으려고 복사해 둔다 — engine.js STEM_TEMP·BR_TEMP·STEM_HUM·BR_HUM)
  const STEM_TEMP = [0.5, 0.5, 2, 2, 0.5, -0.5, -0.5, -0.5, -2, -2], BR_TEMP = [-2, -1.5, -0.5, 0, 0, 1.5, 2, 1.5, 0, -0.5, 0.5, -1.5];
  const STEM_HUM = [0, 0, -2, -2, -0.5, 0.5, 0.5, 0.5, 2, 2], BR_HUM = [2, 1, 0, 0, 1, -1, -2, -1, 0.5, 0, -1, 1.5];
  const climateNeed = c => ({ t: Math.abs(c.temp) >= 0.3 ? clamp(-c.temp / 0.6, -1.5, 1.5) : 0, h: Math.abs(c.hum) >= 0.4 ? clamp(-c.hum / 0.8, -1.5, 1.5) : 0 });
  const glyphClimate = (need, t, h) => (need.t * t + need.h * h) / 2;

  // 가중치(합 100) — 조후가 필요 없는 원국은 johu 몫을 role 로 넘긴다
  const CFG = {
    w: { role: 34, johu: 10, struct: 14, stem: 10, branch: 20, natal: 12 },
    spread: 70,                                   // 50 + 70 × 가중 합(−1~+1)
    supply: { stem: 0.55, branch: 0.45 },
    bond: { '육합': 0.5, '반합': 0.35, '삼합': 0.6, '방합': 0.5, '천간합': 0.35 },
    friction: { '충': 0.55, '형': 0.4, '원진': 0.3, '해': 0.25, '파': 0.2, '귀문관': 0.2, '천간충': 0.4 },
    bondRole: 0.6,                                // 합으로 생기는 오행의 역할값에 따라 합 점수 ±60%
    relieve: 0.8, protect: 1.2,                   // 충·형이 꺼리는 기운을 치면 감점 최대 80% 상쇄, 꼭 필요한 기운(역할 ≥0.5)을 치면 1.2배
    posW: { month: 0.55, hour: 0.4, year: 0.3 },
    natalFix: 0.25, natalBreak: 0.2,              // 상대 글자가 원국의 충을 합으로 풂(+) · 원국의 합을 충으로 흔듦(−)
    stemGroup: [0.15, 0.1, 0.1, -0.1, 0.3],       // 상대 일간이 내 일간에게 비겁·식상·재성·관성·인성일 때의 기본 성향 값(기존과 같음)
    type: { frictionStim: 0.4, frictionStimAll: 0.85, bondStable: 0.35, frictionStable: 0.15, compFit: 0.2, compFitStrong: 0.45, active: 0.6 },
    condition: { high: 66, ok: 55, low: 30, risk: 0.55, highRisk: 0.35 },
  };
  const PART_LABEL = { role: '내게 필요한 기운', johu: '기후 맞춤', struct: '십성 작용', stem: '일간 관계', branch: '일지(배우자 자리) 관계', natal: '내 원국과의 합충' };
  const THEORY_K = { eokbu: '강약(억부)', johu: '기후(조후)', gyeok: '격국', tonggwan: '통관' };

  function supplyOf(M, s, b) {
    const out = [0, 0, 0, 0, 0]; out[M.stemEl(s)] += CFG.supply.stem;
    M.HIDDEN[b].forEach(([hs, dd]) => { out[M.stemEl(hs)] += CFG.supply.branch * dd / 30; });
    return out;
  }
  // compat-pair.js 2판 십성 작용과 같은 규칙. nat: 내 십성 묶음 비율(0~1)
  function structEff(g, nat, help, uv) {
    const s = clamp((50 - help) / 20, -1, 1), out = [];
    const add = (v, code) => out.push({ v, code });
    if (g === 4) { if (nat[3] >= 0.25) add(0.4, '관인상생'); if (nat[1] >= 0.2 && uv(1) > 0) add(-0.4, '편인도식'); if (nat[4] >= 0.3) add(-0.4, '인성 태과'); }
    else if (g === 0) { if (s > 0 && nat[2] + nat[3] >= 0.45) add(0.3, '비겁방신'); if (s < 0 && nat[2] >= 0.1) add(-0.4, '군겁쟁재'); if (nat[0] >= 0.35) add(-0.3, '비겁 태과'); }
    else if (g === 1) { if (nat[2] >= 0.15 && help >= 40) add(0.3, '식상생재'); if (nat[3] >= 0.3) add(0.4, '식상제살'); else if (nat[3] >= 0.1 && uv(3) > 0) add(-0.3, '상관견관'); }
    else if (g === 2) { if (nat[1] >= 0.2) add(0.35, '식신생재'); if (nat[3] >= 0.12 && help >= 45) add(0.2, '재생관'); if (nat[4] >= 0.2 && uv(4) > 0) add(-0.35, '재극인'); }
    else if (g === 3) { if (nat[4] >= 0.2) add(0.35, '관인상생'); if (nat[3] >= 0.25) add(-0.35, '관살혼잡'); }
    return out;
  }

  function evaluate(M, ch, s, b) {
    const u = ch.unified, rv = e => u.roleV[e], d = ch.pillars.day, dEl = M.stemEl(d.s), sup = supplyOf(M, s, b);
    const tags = [];
    // ① 내게 필요한 기운
    const role = clamp(sup.reduce((a, x, e) => a + x * rv(e), 0), -1, 1);
    // ② 기후 맞춤(글자별)
    const johuOn = !!(u.theories && u.theories.johu && u.theories.johu.applicable), need = climateNeed(ch.climate);
    const johu = johuOn ? clamp((CFG.supply.stem * glyphClimate(need, STEM_TEMP[s], STEM_HUM[s]) + CFG.supply.branch * glyphClimate(need, BR_TEMP[b], BR_HUM[b])) / 1.5, -1, 1) : 0;
    // ③ 십성 작용
    const nat = [0, 1, 2, 3, 4].map(g => ((ch.weights.groups && ch.weights.groups[g]) || 0) / 100), help = ch.strength.help, uvg = g => rv(mod5(dEl + g));
    let struct = 0; const effects = [];
    for (let g = 0; g < 5; g++) {
      const e = mod5(dEl + g); if (sup[e] < 0.05) continue;
      for (const x of structEff(g, nat, help, uvg)) {
        const gate = x.v > 0 ? (rv(e) > 0 ? 1 : rv(e) < 0 ? 0.3 : 0.6) : (rv(e) >= 0.5 ? 0.5 : 1);
        const v = sup[e] * x.v * gate; struct += v; effects.push({ code: x.code, v });
      }
    }
    struct = clamp(struct * 1.6, -1, 1);
    // ④ 일간 관계
    let stem = CFG.stemGroup[mod5(M.stemEl(s) - dEl)];
    for (const r of M.relationsAmong([{ id: 'me', s: d.s }, { id: 'you', s }])) {
      if (r.type === '천간합') { const v = CFG.bond['천간합'] * (1 + CFG.bondRole * (r.el != null ? rv(r.el) : 0)); stem += v; tags.push({ kind: 'bond', where: '일간', name: r.name, v }); }
      if (r.type === '천간충') { stem -= CFG.friction['천간충']; tags.push({ kind: 'friction', where: '일간', name: r.name, v: CFG.friction['천간충'] }); }
    }
    stem = clamp(stem, -1, 1);
    // ⑤ 일지·⑥ 원국: 지지 하나와 상대 지지의 관계(자리 무게 w). 충·형은 맞는 내 글자의 역할로 조건부
    let bondSum = 0, fricSum = 0, nBond = 0, nFric = 0;
    const relTo = (myB, w, where, natal) => {
      let v = 0;
      for (const r of M.relationsAmong([{ id: 'me', b: myB }, { id: 'you', b }])) {
        if (CFG.bond[r.type] != null) {
          const x = CFG.bond[r.type] * (1 + CFG.bondRole * (r.el != null ? rv(r.el) : 0)) * w; v += x;
          if (natal) nBond += Math.max(0, x); else bondSum += Math.max(0, x);
          tags.push({ kind: 'bond', where, name: r.name, v: x });
        } else if (CFG.friction[r.type] != null) {
          const f = rv(M.BR_EL[myB]); let x = CFG.friction[r.type] * w, note = '';
          if ((r.type === '충' || r.type === '형') && f < 0) { x *= 1 - CFG.relieve * Math.min(1, -f); note = 'relieve'; }
          else if (f >= 0.5) { x *= CFG.protect; note = 'protect'; }
          v -= x; if (natal) nFric += x; else fricSum += x;
          tags.push({ kind: 'friction', where, name: r.name, v: x, note });
        }
      }
      return v;
    };
    const branch = clamp(relTo(d.b, 1, '일지', false) + (d.b === b ? 0.1 : 0), -1, 1);
    if (d.b === b) tags.push({ kind: 'bond', where: '일지', name: `${M.BR[b]}${M.BR[b]} 같은 지지`, v: 0.1 });
    let natal = 0;
    for (const k of ['year', 'month', 'hour']) { const p = ch.pillars[k]; if (p) natal += relTo(p.b, CFG.posW[k], M.POS_K[k] + '지', true); }
    const own = ['year', 'month', 'day', 'hour'].filter(k => ch.pillars[k]).map(k => ({ id: k, b: ch.pillars[k].b }));
    const pairHas = (b1, type) => M.relationsAmong([{ id: 'x', b: b1 }, { id: 'y', b }]).some(q => q.type === type);
    for (const r of M.relationsAmong(own)) {
      if (r.type === '충' && r.members.length === 2 && r.members.some(m => pairHas(ch.pillars[m].b, '육합'))) { natal += CFG.natalFix; nBond += CFG.natalFix; tags.push({ kind: 'bond', where: '원국', name: `원국 ${r.name}을 합으로 묶음`, v: CFG.natalFix }); }
      if (r.type === '육합' && r.members.length === 2 && r.members.some(m => pairHas(ch.pillars[m].b, '충'))) { natal -= CFG.natalBreak; nFric += CFG.natalBreak; tags.push({ kind: 'friction', where: '원국', name: `원국 ${r.name}을 충으로 흔듦`, v: CFG.natalBreak }); }
    }
    natal = clamp(natal, -1, 1);
    // 합산
    const w = Object.assign({}, CFG.w); if (!johuOn) { w.role += w.johu; w.johu = 0; }
    const vals = { role, johu, struct, stem, branch, natal };
    const parts = Object.keys(CFG.w).map(k => ({ key: k, label: PART_LABEL[k], v: vals[k], w: w[k], pts: vals[k] * w[k] * CFG.spread / 100 }));
    const score = Math.round(clamp(50 + parts.reduce((a, x) => a + x.pts, 0), 0, 100));
    // 위험도(점수와 별개) · 유형 · 조건
    const risk = clamp(1.1 * fricSum + 0.6 * nFric + 0.15 * Math.max(0, -role) + 0.1 * Math.max(0, -johu) + 0.2 * Math.max(0, -struct), 0, 1);
    const compFit = (w.role * role + w.johu * johu) / (w.role + w.johu);
    const supplyG = [0, 0, 0, 0, 0]; for (let e = 0; e < 5; e++) supplyG[mod5(e - dEl)] += sup[e];
    const activeShare = supplyG[1] + supplyG[2] + supplyG[3], T = CFG.type, Q = CFG.condition;
    let type;
    if (fricSum >= T.frictionStim || fricSum + nFric >= T.frictionStimAll) type = '상호자극형';
    else if (bondSum >= T.bondStable && fricSum <= T.frictionStable && compFit < T.compFitStrong) type = '안정형';
    else if (compFit >= T.compFit) type = '보완형';
    else if (activeShare >= T.active && score >= 50) type = '활성형';
    else type = '혼합형';
    const condition = (risk >= Q.risk || score < Q.low) ? '주의 요소 있음' : (score >= Q.high && risk < Q.highRisk) ? '조화 높음' : score >= Q.ok ? '조화' : '혼합';
    // 이유·주의(생활 언어 위주, 용어는 괄호로)
    const sTG = M.tenGod(d.s, s), bTG = M.tenGod(d.s, M.mainHidden(b)), sEl = M.stemEl(s);
    const elWord = M.EL_K[sEl], eun = /[목금]$/.test(elWord) ? '은' : '는';
    const reasons = [`상대 일간 ${M.STEM[s]}${M.EL[sEl]}${eun} 나(${M.STEM[d.s]}) 기준 ${sTG}(${M.TG_GROUP ? M.TG_GROUP[mod5(sEl - dEl)] : ''}) 기운입니다`];
    if (role >= 0.2) reasons.push('내 사주에 필요한 기운(통합 용신 기준)을 들여옵니다');
    else if (role <= -0.2) reasons.push('내 사주가 이미 많거나 꺼리는 기운을 더 키우는 편입니다');
    // 기준별 판단(억부·조후·격국·통관) — 점수에 따로 더하지 않고 설명으로만
    const th = u.theories || {}, view = [];
    for (const k of ['eokbu', 'johu', 'gyeok', 'tonggwan']) { const t = th[k]; if (!t || !t.applicable) continue; const fav = (t.favor || []).includes(sEl), avd = (t.avoid || []).includes(sEl); if (fav || avd) view.push(`${M.josa(THEORY_K[k], '으로/로')}는 ${fav ? '도움' : '부담'}`); }
    if (view.length) reasons.push(`일간 오행(${M.EL_K[sEl]})${eun} ${view.join(', ')}${view.some(x => x.endsWith('도움')) && view.some(x => x.endsWith('부담')) ? ' — 기준마다 판단이 달라 조건부로 봅니다' : ''}`);
    if (johu >= 0.25) reasons.push('두 글자의 온도·습도가 원국의 기후 치우침을 맞춰 줍니다'); else if (johu <= -0.25) reasons.push('두 글자의 온도·습도가 원국의 기후 치우침을 더 키웁니다');
    const effP = effects.filter(x => x.v > 0.02).map(x => x.code), effN = effects.filter(x => x.v < -0.02).map(x => x.code);
    if (effP.length) reasons.push(`원국 구조와 잘 맞물립니다(${[...new Set(effP)].join('·')})`);
    tags.filter(t => t.kind === 'bond').forEach(t => reasons.push(`${t.where} ${t.name} — 결속·연결 신호`));
    const cautions = tags.filter(t => t.kind === 'friction').map(t => `${t.where} ${t.name} — 변화·마찰 신호${t.note === 'relieve' ? '(맞는 글자가 내게 부담이던 기운이라 오히려 정리되는 면도 있습니다)' : t.note === 'protect' ? '(맞는 글자가 내게 꼭 필요한 기운이라 더 조심하세요)' : ''}`);
    if (effN.length) cautions.push(`원국 구조의 약점을 건드릴 수 있습니다(${[...new Set(effN)].join('·')})`);
    return {
      version: VERSION, i: M.gzIndex ? M.gzIndex(s, b) : ((6 * s - 5 * b) % 60 + 60) % 60, s, b, ganzhi: M.STEM[s] + M.BR[b], ganzhiK: M.STEM_K[s] + M.BR_K[b], score, type, condition, risk,
      elementFit: role, stemRelation: stem, branchRelation: branch, tenGodEffect: struct, climateFit: johu, balanceFit: 0, relationFit: natal, excessRisk: 0,
      bond: bondSum, friction: fricSum, natalBond: nBond, natalFriction: nFric, activeShare, compFit, stemTG: sTG, branchTG: bTG, parts, tags, reasons, cautions, myDay: M.STEM[d.s] + M.BR[d.b],
      theories: view, effects,
    };
  }

  const _day = new WeakMap(), _att = new WeakMap();
  function dayPillars(M, ch) {
    let all = _day.get(ch);
    if (!all) { all = []; for (let i = 0; i < 60; i++) all.push(evaluate(M, ch, i % 10, i % 12)); all.sort((a, x) => x.score - a.score || a.risk - x.risk); _day.set(ch, all); }
    return all;
  }
  // 끌림: 엔진 evaluateAttraction 을 그대로 쓰고 '내게 필요한 기운'(need) 성분만 새 compFit 으로 바꿔 다시 합산한다
  function attraction(M, ch, partner) {
    partner = partner || 'opposite';
    let m = _att.get(ch); if (!m) _att.set(ch, m = {});
    if (m[partner]) return m[partner];
    const A = M.COMPAT_CONFIG && M.COMPAT_CONFIG.attract, scale = (A && A.scale) || 1.2;
    m[partner] = dayPillars(M, ch).map(x => {
      const at = M.evaluateAttraction(ch, x.s, x.b, partner), to = at.toThem;
      const comps = to.comps.map(c => c.key === 'need' ? Object.assign({}, c, { v: Math.max(0, x.compFit), pts: Math.max(0, x.compFit) * c.w }) : c);
      const score = Math.round(Math.min(100, comps.reduce((a, c) => a + c.pts, 0) * scale));
      const NEED = '내 사주가 필요로 하는 기운을 채워 주는 일주입니다';
      let reasons = to.reasons.filter(t => t !== NEED && t !== '뚜렷한 끌림 신호가 적은 일주입니다');
      if (x.compFit >= 0.2) reasons.push(NEED);
      if (!reasons.length) reasons = ['뚜렷한 끌림 신호가 적은 일주입니다'];
      const toThem = { score, comps, reasons };
      return Object.assign({}, x, { attract: { toThem, toMe: at.toMe, mutual: Math.round(Math.sqrt(score * at.toMe.score)) } });
    });
    return m[partner];
  }

  const on = () => !!(G.MANTRA_FLAGS && G.MANTRA_FLAGS.dayCompat === true);
  // 엔진 함수를 감싼다: 스위치가 켜져 있을 때만 새 계산, 꺼져 있으면 원래 함수
  function install(M) {
    if (!M || M.__dayCompat) return M;
    const old = { compatDayPillars: M.compatDayPillars, compatAttraction: M.compatAttraction };
    M.compatDayPillarsV1 = old.compatDayPillars; M.compatAttractionV1 = old.compatAttraction;
    M.compatDayPillars = function (ch) { return on() && ch && ch.unified ? dayPillars(M, ch) : old.compatDayPillars.apply(this, arguments); };
    M.compatAttraction = function (ch, partner) { return on() && ch && ch.unified ? attraction(M, ch, partner) : old.compatAttraction.apply(this, arguments); };
    M.__dayCompat = VERSION;
    return M;
  }

  G.MantraDayCompat = { VERSION, CFG, PART_LABEL, evaluate, dayPillars, attraction, install, isOn: on };
  if (G.Manse) install(G.Manse);
  // 브라우저: 관리자 스위치(/api/luck-flags dayCompat)를 한 번 읽어 켠다. 바뀌면 'mantra:daycompat' 이벤트로 알린다
  try {
    if (typeof fetch === 'function' && G.document && !on()) {
      fetch('/api/luck-flags').then(r => r.ok ? r.json() : null).then(dc => {
        if (dc && dc.dayCompat === true) { G.MANTRA_FLAGS = Object.assign(G.MANTRA_FLAGS || {}, { dayCompat: true }); try { G.dispatchEvent(new Event('mantra:daycompat')); } catch (e) { } }
      }).catch(() => { });
    }
  } catch (e) { }
})(typeof window !== 'undefined' ? window : globalThis);
