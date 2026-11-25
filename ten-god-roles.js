/* 십성 작용 판정 엔진(표시 전용 분석 계층) — 2026-11-18
   다섯 십성(비겁·식상·재성·관성·인성)이 '이 명식에서 실제로 무슨 일을 하는지'를 판정한다.
   · 원칙
     - 세력(얼마나 많고 뿌리가 있는가)과 유불리(이 사주에 도움이 되는가)를 따로 판정한다. 많다고 나쁘고 적다고 좋은 게 아니다.
     - 신강/신약 하나로 결과를 뒤집지 않는다: 월령·투출·통근·억부/조후 용신·다른 십성과의 생극·합충을 함께 본다.
     - 억부 기준 역할과 조후 기준 역할을 따로 저장하고, 일치/불일치를 표시한다. 최종 역할은 엔진 통합 용신(ch.unified)을 그대로 읽는다.
     - 상호작용 구조(식상생재·재생관·관인상생·살인상생·식신제살·상관견관·상관패인·재극인·도식·관살혼잡·비겁쟁재)는
       '성립 여부'(on·weak·off)와 '유불리'(good·bad·mixed)를 분리한다.
   · 재사용: 비중 ch.weights(groups·tgPct·pct), 강약 ch.strength, 통합 용신 ch.unified(roles·roleV·theories.eokbu/johu),
       합충 Manse.relationsAmong, 운 구조 Manse.luckStructures(참고 표시), 격국 카드 MantraGyeokStructure.analyze(있으면 원국 구조 대조),
       운 한 기둥 오행 점수 MantraLuckOverlay.pillarVec(있으면, 없으면 같은 셈법으로 계산).
   · 엔진(engine.js)의 흐름 점수·그래프·용신·강약 값은 읽기만 하고 바꾸지 않는다(tests/ten-god-roles-sim.cjs 가 불변 검사).
   · 운 연동: 대운 → 세운 → 월운 → 일진을 아래층부터 차례로 쌓는다(층 무게 대운 1·세운 0.7·월운 0.4·일진 0.2 — 오행 겹쳐 보기와 같은 값).
       층마다 '그 층을 쌓기 전 → 쌓은 뒤' 구조 상태를 비교해 신규 형성·강화·약화·해소를 낸다(상위 운이 깔아 둔 바탕 위에서 하위 운을 읽는다).
       결과는 A. 기운의 유불리(들어온 오행이 억부·조후·통합 용신에서 어떤 역할인가) / B. 현실적 작용(구조 변화·감당 능력·영역) 두 갈래.
   · 브라우저·Node 공용. 사용: MantraTenGodRoles.analyze(Manse, ch) · MantraTenGodRoles.luck(Manse, ch, layers) */
(function (G) {
  'use strict';
  const VERSION = 'ten-god-roles-20261118-1';
  const GN = ['비겁', '식상', '재성', '관성', '인성'];
  const GOF = { 비견: 0, 겁재: 0, 식신: 1, 상관: 1, 편재: 2, 정재: 2, 편관: 3, 정관: 3, 편인: 4, 정인: 4 };
  const MEMBERS = [['비견', '겁재'], ['식신', '상관'], ['편재', '정재'], ['편관', '정관'], ['편인', '정인']];
  const EASY = ['나와 같은 힘(형제·동료·경쟁)', '내가 내보내는 힘(표현·기술·결과물)', '내가 다루는 힘(돈·현실·성과)', '나를 다스리는 힘(직장·책임·규칙)', '나를 돕는 힘(공부·문서·후원)'];
  const POSK = { year: '년', month: '월', day: '일', hour: '시', daeun: '대운', seun: '세운', wolun: '월운', ilun: '일진' };
  const LEVELS = ['daeun', 'seun', 'wolun', 'ilun'], LEVEL_K = { daeun: '대운', seun: '세운', wolun: '월운', ilun: '일진' };
  const UNIT = { daeun: '10년 동안', seun: '올해', wolun: '이번 달', ilun: '오늘' };
  const CFG = {
    layerW: { daeun: 1, seun: 0.7, wolun: 0.4, ilun: 0.2 },        // 오행 겹쳐 보기(luck-overlay.js)와 같은 층 무게
    hiddenW: { main: 1, mid: 0.55, res: 0.35 },                     // 지장간 뿌리 무게(격국 카드 gyeok-structure.js 와 같은 값)
    force: [[3, '없음'], [10, '약함'], [20, '보통'], [32, '강함'], [101, '과다']],   // 십성 묶음 비율(%) → 세력 이름
    present: 8, clear: 15,                                          // 있음(엔진 오행 흐름 present 8)·뚜렷함(다섯 묶음 평균 20%의 3/4) — 투출+통근이면 비율이 낮아도 뚜렷함
    carry: { weak: 30, base: 35, sinyak: 42 },                      // 감당 능력(비겁+인성 %): 30 태약 경계(엔진 STRENGTH_ZONES) · 35 재관 감당(격국 카드 jaegwanHelp) · 42 신약 경계
    // 문턱값 근거(2026-11-18 명리 검수, docs/TEN_GOD_ROLES_THRESHOLD_REVIEW_2026-11-18.md)
    //   엔진 원국 패턴(engine.js): 군겁쟁재 비겁 35 · 재다신약 재 30+신약 · 관살과다 관 30+신약 · 식상과다 식상 30+신약 · 인성과다 인성 35
    //   격국 카드(gyeok-structure.js CFG.sip): 군겁 35·쟁재 25 · 재파인 15 · 관인 70 · 살인 60 · 상관패인 65·식상 15 · 생재 30 · 재관 35 · 모왕 일간 15
    th: { jaeng: { bigeop: 35, jae: 25 }, jaeda: 30, gwanda: 30, seolgi: 30, inda: 35, mowangSelf: 15, geugin: 15, gwanin: 70, salin: 60, paein: { help: 65, sik: 15 }, jesal: { carry: 0.5, over: 2.5 }, gyeon: 0.7, dosik: 1 },
    changeEps: 2,                                                   // 같은 상태일 때 '강화/약화'로 볼 관련 십성 비율 변화(%p)
    hapRoot: 0.5                                                    // 충 받은 지지의 뿌리 무게 배율
  };
  const BANNED = /반드시|무조건|100%|틀림없이|대박|망한다|망합니다|성공합니다|실패합니다|확정|운명입니다|대흉|대길/;
  const mod5 = x => ((x % 5) + 5) % 5;
  const r1 = v => Math.round(v * 10) / 10;
  const lastH = w => String(w).replace(/\s*\([^()]*\)\s*$/, '').replace(/[^가-힣]+$/, ''), bat = w => { const t = lastH(w), c = t.charCodeAt(t.length - 1); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0; };
  const J = { 이: w => w + (bat(w) ? '이' : '가'), 은: w => w + (bat(w) ? '은' : '는'), 을: w => w + (bat(w) ? '을' : '를'), 과: w => w + (bat(w) ? '과' : '와'), 으로: w => w + (bat(w) && (lastH(w).charCodeAt(lastH(w).length - 1) - 0xAC00) % 28 !== 8 ? '으로' : '로') };

  // ───────── 운 한 기둥 오행 점수: 천간 1 + 지지 1(지장간 일수 비율) — 오행 겹쳐 보기와 같은 셈법(있으면 그 함수를 그대로 씀) ─────────
  function pillarVec(M, s, b) {
    if (G.MantraLuckOverlay && G.MantraLuckOverlay.pillarVec) return G.MantraLuckOverlay.pillarVec(M, s, b);
    const v = [0, 0, 0, 0, 0]; v[M.stemEl(s)] += 1;
    const H = M.HIDDEN[b], days = H.reduce((a, h) => a + h[1], 0);
    H.forEach(h => { v[M.stemEl(h[0])] += h[1] / days; });
    return v;
  }
  const depthOf = (H, i) => i === H.length - 1 ? 'main' : (i === 0 && H.length === 3 ? 'res' : 'mid');

  // ───────── 상태(state): 원국, 또는 원국 + 운 층들. 같은 판정 함수를 원국·운에 똑같이 쓴다 ─────────
  //   items: [{ id, s, b, luck }] — id 는 year·month·day·hour 또는 daeun·seun·wolun·ilun
  function buildState(M, ch, lucks, W) {
    const d = ch.pillars.day.s, dEl = M.stemEl(d), wt = ch.weights;
    const natal = ['year', 'month', 'day', 'hour'].filter(k => ch.pillars[k]).map(k => ({ id: k, s: ch.pillars[k].s, b: ch.pillars[k].b, luck: false }));
    const lk = (lucks || []).map(L => ({ id: L.level, s: L.s, b: L.b, luck: true, w: W[L.level] }));
    const items = natal.concat(lk);
    // 비중: 원국은 엔진 값 그대로, 운은 층 무게만큼 오행 점수를 더한 뒤 다시 비율로
    const total = wt.total || 9, pts = wt.pct.map(p => p / 100 * total);
    const tgPts = {}; Object.keys(GOF).forEach(t => { tgPts[t] = (wt.tgPct[t] || 0) / 100 * total; });
    lk.forEach(L => {
      pillarVec(M, L.s, L.b).forEach((x, e) => { pts[e] += x * L.w; });
      tgPts[M.tenGod(d, L.s)] += L.w;
      const H = M.HIDDEN[L.b], days = H.reduce((a, h) => a + h[1], 0);
      H.forEach(h => { tgPts[M.tenGod(d, h[0])] += L.w * h[1] / days; });
    });
    // 운의 합화(2026-11-18): 오행 겹쳐 보기와 같은 규칙으로 옮긴 몫을 더한다(겹쳐 보기와 비율을 맞춤). 십성 몫은 일간 기준 그 오행의 음양 반반으로 옮긴다
    if (lk.length && G.MantraLuckOverlay && G.MantraLuckOverlay.compute) {
      try {
        const oc = G.MantraLuckOverlay.compute(M, ch, (lucks || []).map(L => ({ level: L.level, s: L.s, b: L.b, at: L.at })), { weights: W });
        if (oc.mode === 'seasonal') {
          // 계절 재분석(2026-11-20): 오행 비율은 겹쳐 보기 최종값 그대로. 오행 안의 두 십성(음·양)은 더해 쌓은 몫의 비율대로 나눈다
          const fin = oc.layers.length ? oc.layers[oc.layers.length - 1].pct : oc.natal.pct, tot = pts.reduce((a, x) => a + x, 0) || 1;
          [0, 1, 2, 3, 4].forEach(e => {
            const nv = fin[e] / 100 * tot, ts = [e * 2, e * 2 + 1].map(s2 => M.tenGod(d, s2)), old = tgPts[ts[0]] + tgPts[ts[1]];
            ts.forEach(t => { tgPts[t] = old > 0 ? tgPts[t] / old * nv : nv / 2; });
            pts[e] = nv;
          });
        } else oc.layers.forEach(l => (l.hwaNet || []).forEach((x, e) => {
          if (!x) return; pts[e] = Math.max(0, pts[e] + x);
          [e * 2, e * 2 + 1].forEach(s2 => { const t = M.tenGod(d, s2); tgPts[t] = Math.max(0, tgPts[t] + x / 2); });
        }));
      } catch (e) { }
    }
    const sum = pts.reduce((a, x) => a + x, 0) || 1, tsum = Object.keys(tgPts).reduce((a, t) => a + tgPts[t], 0) || 1;
    const pct = pts.map(x => x / sum * 100), tg = {}; Object.keys(tgPts).forEach(t => { tg[t] = tgPts[t] / tsum * 100; });
    const grp = [0, 1, 2, 3, 4].map(g => pct[mod5(dEl + g)]);
    // 합충: 원국끼리 + 운↔원국 + 운끼리(엔진 relationsAmong)
    const rel = M.relationsAmong ? M.relationsAmong(items.map(x => ({ id: x.id, s: x.s, b: x.b }))) : [];
    const ORD = ['hour', 'day', 'month', 'year'];
    const adj = r => { const a = ORD.indexOf(r.members[0]), b = ORD.indexOf(r.members[1]); return a < 0 || b < 0 || Math.abs(a - b) === 1; };   // 운이 끼면 자리 이웃 조건 없이
    // 묶인 천간(합거): 일간이 아닌 천간이 이웃(또는 운)과 천간합 → 그 자리의 투출은 '묶임'으로 본다
    const bound = {};
    rel.filter(r => r.kind === 'stem' && r.type === '천간합' && r.members.indexOf('day') < 0 && adj(r)).forEach(r => r.members.forEach(m => { bound[m] = r.name; }));
    // 충 받은 지지: 뿌리 무게를 줄인다
    const clashed = {};
    rel.filter(r => r.kind === 'branch' && r.type === '충').forEach(r => r.members.forEach(m => { clashed[m] = r.name; }));
    // 투출·통근
    const exposed = [[], [], [], [], []], exposedBound = [[], [], [], [], []], root = [0, 0, 0, 0, 0], rootAt = [[], [], [], [], []];
    const tgExposed = {};
    items.forEach(x => {
      if (x.id !== 'day') {
        const t = M.tenGod(d, x.s), g = GOF[t];
        (bound[x.id] ? exposedBound : exposed)[g].push(x.id);
        if (!bound[x.id]) (tgExposed[t] = tgExposed[t] || []).push(x.id);
      }
      const H = M.HIDDEN[x.b], mul = (x.luck ? x.w : 1) * (clashed[x.id] ? CFG.hapRoot : 1);
      H.forEach((h, i) => { const g = GOF[M.tenGod(d, h[0])], v = CFG.hiddenW[depthOf(H, i)] * mul; root[g] += v; if (rootAt[g].indexOf(x.id) < 0) rootAt[g].push(x.id); });
    });
    const help = grp[0] + grp[4];
    const monthMainG = GOF[M.tenGod(d, M.mainHidden(ch.pillars.month.b))], monthStemG = GOF[M.tenGod(d, ch.pillars.month.s)];
    return { d, dEl, items, pct, grp, tg, rel, bound, clashed, exposed, exposedBound, root, rootAt, tgExposed, help, monthMainG, monthStemG, natalHelp: ch.strength.help };
  }
  // 있음·뚜렷함: 비율만이 아니라 투출+통근도 본다
  const has = (S, g) => S.grp[g] >= CFG.present || S.exposed[g].length > 0;
  const clear = (S, g) => S.grp[g] >= CFG.clear || (S.exposed[g].length > 0 && S.root[g] >= 0.5);
  const tgHas = (S, t) => S.tg[t] >= 4 || !!(S.tgExposed[t] && S.tgExposed[t].length);
  const tgClear = (S, t) => S.tg[t] >= 9 || (!!(S.tgExposed[t] && S.tgExposed[t].length) && S.tg[t] >= 4);

  // ───────── 역할: 통합(엔진) · 억부 · 조후를 따로 ─────────
  function rolesOf(ch) {
    const u = ch.unified || {}, th = u.theories || {};
    const one = (t) => {
      if (!t || !t.applicable || t.yong == null) return null;
      return e => e === t.yong ? '용신' : (t.favor || []).indexOf(e) >= 0 ? '희신' : (t.avoid || []).indexOf(e) >= 0 ? '기신' : '중립';
    };
    const eok = one(th.eokbu), joh = one(th.johu);
    const sign = r => r === '용신' || r === '희신' ? 1 : r === '기신' || r === '구신' ? -1 : 0;
    return {
      mode: u.mode || '', primary: u.primaryName || '', eokbu: th.eokbu || null, johu: th.johu || null,
      unified: e => (u.roles && u.roles[e]) || '', unifiedV: e => (u.roleV && u.roleV[e]) || 0,
      eokbuRole: e => eok ? eok(e) : '해당 없음', johuRole: e => joh ? joh(e) : '해당 없음',
      agree: e => {
        if (!eok || !joh) return 'single';
        const a = sign(eok(e)), b = sign(joh(e));
        return a === 0 && b === 0 ? 'neutral' : a === b ? 'agree' : a === 0 || b === 0 ? 'partial' : 'conflict';
      }
    };
  }
  const AGREE_K = { agree: '억부·조후 일치', conflict: '억부·조후 불일치', partial: '한쪽만 판단', neutral: '둘 다 중립', single: '한 기준만 적용' };

  // ───────── 상호작용 구조 11종: 성립(on·weak·off)과 유불리(good·bad·mixed)를 따로 ─────────
  //   from→to 는 기운이 흐르거나 누르는 방향(그룹 번호). conds 는 성립 조건, blocks 는 성립을 약하게 만드는 요인.
  // eng(2026-11-25 M1): 원국 분석일 때 엔진 공통 구조 판정 { key: '성립'|'후보'|'없음' } — 이 7종은 자체 조건 대신 공통 판정을 쓴다(자체 판정은 ownStatus 로 남김)
  const ENG_KEY = { salin: '살인상생', sikjesal: '식신제살', gyeongwan: '상관견관', paein: '상관패인', honjap: '관살혼잡', dosik: '효신탈식(도식)', bigeopjaeng: '군겁쟁재' };
  function engineStatusOf(ch) {
    const P = ch && ch.patterns; if (!P || !P.named) return null;
    const out = {}; Object.keys(ENG_KEY).forEach(k => { const p = P.named.filter(x => x.name === ENG_KEY[k])[0]; out[k] = p ? p.status : '없음'; });
    return out;
  }
  function interactions(S, R, eng) {
    const out = [], ge = g => mod5(S.dEl + g), v = g => R.unifiedV(ge(g));
    const lv = g => GN[g] + ' ' + r1(S.grp[g]) + '%' + (S.exposed[g].length ? '·투출' : '') + (S.root[g] >= 0.5 ? '·통근' : '');
    const lt = t => t + ' ' + r1(S.tg[t]) + '%' + (S.tgExposed[t] ? '·투출' : '');
    const c = (label, ok, detail, core) => ({ label, ok: !!ok, detail: detail || '', core: core !== false });
    const b = (label, hit, detail) => ({ label, hit: !!hit, detail: detail || '' });
    const mk = (o) => {
      const coreOk = o.conds.filter(x => x.core).every(x => x.ok), allOk = o.conds.every(x => x.ok), blocked = o.blocks.some(x => x.hit);
      o.status = !coreOk ? 'off' : allOk && !blocked ? 'on' : 'weak';
      if (eng && eng[o.key]) { o.ownStatus = o.status; o.engineStatus = eng[o.key]; o.status = eng[o.key] === '성립' ? 'on' : 'off'; o.candidate = eng[o.key] === '후보'; }
      if (o.status === 'off') { o.tone = ''; o.toneWhy = ''; } else { const t = o.toneFn(); o.tone = t[0]; o.toneWhy = t[1]; }
      delete o.toneFn; out.push(o); return o;
    };
    const carry = S.help, weakSelf = carry < CFG.carry.weak, okSelf = carry >= CFG.carry.base;
    const inF = (g) => v(g) > 0, inB = (g) => v(g) < 0;
    const roleName = g => R.unified(ge(g)) || '중립';
    const dosikRaw = tgClear(S, '편인') && !!S.tgExposed['편인'] && tgHas(S, '식신');
    const jaeClear = clear(S, 2), inClear = clear(S, 4);

    // 1 식상생재
    mk({ key: 'siksaengjae', name: '식상생재', from: 1, to: 2,
      conds: [c('식상이 있음', has(S, 1), lv(1)), c('재성이 있음', has(S, 2), lv(2)), c('둘 중 하나는 천간에 드러남', S.exposed[1].length || S.exposed[2].length, ''), c('식상·재성 모두 뚜렷함', clear(S, 1) && clear(S, 2), '', false), c('내 힘이 결과를 낼 만함(돕는 힘 ' + CFG.carry.weak + '% 이상)', !weakSelf, '돕는 힘 ' + r1(carry) + '%', false)],
      blocks: [b('편인이 식상을 막음(도식)', dosikRaw && !jaeClear, lt('편인'))],
      toneFn: () => weakSelf ? ['bad', '흐름은 있지만 내 힘이 약해, 일은 많고 손에 남는 건 적게 느껴지기 쉬워요.'] : (inF(1) || inF(2)) ? ['good', '만들어 낸 것이 돈·성과로 이어지는 쪽이 이 사주에 필요한 흐름이에요.'] : ['mixed', '일이 돈으로 이어지긴 하지만 이 사주에 꼭 필요한 흐름은 아니라, 바쁜 만큼 손에 남는지 한 번씩 따져 보는 게 좋아요.'] });
    // 2 재생관
    const gyeonUnres = tgClear(S, '상관') && tgClear(S, '정관') && !inClear;
    mk({ key: 'jaesaenggwan', name: '재생관', from: 2, to: 3,
      conds: [c('재성이 있음', has(S, 2), lv(2)), c('관성이 있음', has(S, 3), lv(3)), c('둘 중 하나는 천간에 드러남', S.exposed[2].length || S.exposed[3].length, ''), c('재성·관성 모두 뚜렷함', clear(S, 2) && clear(S, 3), '', false), c('일간이 재·관을 감당함(돕는 힘 ' + CFG.carry.base + '% 이상)', okSelf, '돕는 힘 ' + r1(carry) + '%', false)],
      blocks: [b('상관견관이 풀리지 않음', gyeonUnres, lt('상관') + ' · ' + lt('정관'))],
      toneFn: () => !okSelf ? ['bad', '돈과 책임이 한꺼번에 나를 누르는 쪽이라, 자리는 커져도 버겁게 느끼기 쉬워요.'] : (inF(2) || inF(3)) ? ['good', '번 것이 자리·신용으로 이어지는 흐름이에요. 성과가 직함이 되기 쉬워요.'] : ['mixed', '번 것이 자리로 이어지긴 하지만, 이 사주엔 자리 욕심이 오히려 짐이 되기도 해요.'] });
    // 3 관인상생(정관 주도)
    const salDom = S.tg['편관'] > S.tg['정관'];
    const TH = CFG.th, jaePain = jaeClear && S.grp[2] >= S.grp[4] + TH.geugin && has(S, 4) && !clear(S, 0);
    mk({ key: 'gwanin', name: '관인상생', from: 3, to: 4,
      conds: [c('관성이 있음', has(S, 3), lv(3)), c('인성이 있음', has(S, 4), lv(4)), c('정관이 편관보다 주도', !salDom, lt('정관') + ' · ' + lt('편관')), c('관성·인성 모두 뚜렷함', clear(S, 3) && clear(S, 4), '', false)],
      blocks: [b('재성이 인성을 깸(재극인)', jaePain, lv(2))],
      toneFn: () => carry >= TH.gwanin ? ['mixed', '인정받는 흐름은 좋지만 이미 힘이 넉넉한 편이라, 편한 자리에 눌러앉고 싶어질 수 있어요.'] : inB(4) && carry >= 58 ? ['mixed', '조직과 윗사람의 도움이 이어지지만, 기대는 마음이 커지면 내 판단이 흐려질 수 있어요.'] : ['good', '책임(관성)이 공부·인정(인성)을 거쳐 나를 키우는 흐름이에요. 조직·자격과 잘 맞아요.'] });
    // 4 살인상생(편관 주도)
    mk({ key: 'salin', name: '살인상생', from: 3, to: 4, sal: true,
      conds: [c('편관이 있음', tgHas(S, '편관'), lt('편관')), c('인성이 있음', has(S, 4), lv(4)), c('편관이 정관보다 주도', salDom, lt('편관') + ' · ' + lt('정관')), c('일간이 지나치게 강하지 않음(돕는 힘 ' + TH.salin + '% 미만)', carry < TH.salin, '돕는 힘 ' + r1(carry) + '%', false), c('편관·인성 모두 뚜렷함', tgClear(S, '편관') && clear(S, 4), '', false)],
      blocks: [b('재성이 살을 키우며 인성을 깸', jaePain, lv(2))],
      toneFn: () => carry >= TH.salin ? ['mixed', '압박을 공부·자격으로 바꾸는 길은 있지만, 이미 버틸 힘이 있는 편이라 굳이 기댈 흐름은 아니에요.'] : ['good', '센 압박(편관)을 인성이 받아 내 실력으로 바꿔 주는 흐름이에요. 위기에서 크는 타입이에요.'] });
    // 5 식신제살
    const sikV = S.tg['식신'], salV = S.tg['편관'];
    const jesal = mk({ key: 'sikjesal', name: '식신제살', from: 1, to: 3,
      conds: [c('식신이 있음', tgHas(S, '식신'), lt('식신')), c('편관이 있음', tgHas(S, '편관'), lt('편관')), c('식신·편관 모두 뚜렷함', tgClear(S, '식신') && tgClear(S, '편관'), '', false), c('식신이 편관을 감당할 만함', sikV >= salV * TH.jesal.carry, lt('식신') + ' · ' + lt('편관'), false), c('일간이 식신을 쓸 힘이 있음(돕는 힘 ' + CFG.carry.weak + '% 이상)', !weakSelf, '돕는 힘 ' + r1(carry) + '%', false)],
      blocks: [b('편인이 식신을 막음(도식)', dosikRaw && !jaeClear, lt('편인'))],
      toneFn: () => sikV > salV * TH.jesal.over && inF(3) ? ['bad', '내 방식이 너무 앞서 필요한 규칙·조직까지 밀어내기 쉬워요(제살태과). 맞출 땐 맞춰 주는 게 이득이에요.'] : (S.grp[3] >= 20 || inB(3)) ? ['good', '센 압박(편관)을 실력·결과물(식신)로 눌러 다루는 흐름이에요. 위기 대응에 강해요.'] : ['mixed', '압박을 실력으로 다룰 힘은 있지만, 막상 그럴 만큼 센 압박은 많지 않은 편이에요.'] });
    // 6 상관견관
    const paeinBlock = clear(S, 4) && (tgHas(S, '정인') || S.grp[4] >= CFG.clear);
    mk({ key: 'gyeongwan', name: '상관견관', from: 1, to: 3,
      conds: [c('상관이 있음', tgHas(S, '상관'), lt('상관')), c('정관이 있음', tgHas(S, '정관'), lt('정관')), c('상관·정관 중 하나는 천간에 드러남', !!(S.tgExposed['상관'] || S.tgExposed['정관']), ''), c('상관이 정관을 누를 만큼 셈', S.tg['상관'] >= S.tg['정관'] * TH.gyeon, lt('상관') + ' · ' + lt('정관'), false)],
      blocks: [b('인성이 상관을 눌러 줌(상관패인)', paeinBlock, lv(4)), b('재성이 상관을 관으로 이어 줌(통관)', jaeClear, lv(2))],
      toneFn: () => inB(3) ? ['mixed', '윗사람·규칙과 부딪히긴 해도, 이 사주엔 답답한 틀을 깨는 게 오히려 숨통이 되기도 해요.'] : ['bad', '말·자기주장(상관)이 규칙·윗사람(정관)과 부딪히기 쉬운 구조예요. 말의 수위가 관건이에요.'] });
    // 7 상관패인
    mk({ key: 'paein', name: '상관패인', from: 4, to: 1,
      conds: [c('상관이 뚜렷함', tgClear(S, '상관'), lt('상관')), c('인성이 있음', has(S, 4), lv(4)), c('인성이 뚜렷함', clear(S, 4), '', false), c('식상이 ' + TH.paein.sik + '% 이상', S.grp[1] >= TH.paein.sik, lv(1), false), c('일간이 지나치게 강하지 않음(돕는 힘 ' + TH.paein.help + '% 이하)', carry <= TH.paein.help, '돕는 힘 ' + r1(carry) + '%', false)],
      blocks: [b('재성이 인성을 깸(재극인)', jaePain, lv(2))],
      toneFn: () => inF(1) && !inB(4) && S.grp[1] < 15 ? ['mixed', '말과 재주가 다듬어지긴 하지만, 이 사주엔 표현력이 무기라 너무 참으면 손해예요.'] : ['good', '거친 말·재주(상관)를 공부·원칙(인성)이 다듬어 주는 흐름이에요. 실력이 품격이 돼요.'] });
    // 8 재극인
    mk({ key: 'jaegeugin', name: '재극인', from: 2, to: 4,
      conds: [c('재성이 뚜렷함', jaeClear, lv(2)), c('인성이 있음', has(S, 4), lv(4)), c('재성이 인성보다 ' + TH.geugin + '%p 이상 많음', S.grp[2] >= S.grp[4] + TH.geugin, lv(2) + ' · ' + lv(4))],
      blocks: [b('관성이 재와 인을 이어 줌(재생관→관생인)', clear(S, 3), lv(3)), b('비겁이 재성을 눌러 인성을 지킴', clear(S, 0), lv(0))],
      toneFn: () => inB(4) ? ['good', '생각만 많던 일을 현실이 정리해 주는 쪽이라, 머리로 고민하기보다 움직일수록 풀려요.'] : inF(4) ? ['bad', '이 사주에 필요한 인성(공부·문서·도움)을 돈·현실 문제가 깎는 구조예요. 공부와 돈 사이 줄다리기가 생겨요.'] : ['mixed', '현실 감각이 생각을 앞서는 구조예요. 공부보다 실전으로 배우는 편이에요.'] });
    // 9 도식(효신탈식)
    mk({ key: 'dosik', name: '도식(효신탈식)', from: 4, to: 1,
      conds: [c('편인이 천간에 드러남', !!S.tgExposed['편인'], lt('편인')), c('편인이 뚜렷함', tgClear(S, '편인'), lt('편인')), c('식신이 있음', tgHas(S, '식신'), lt('식신')), c('편인이 식신보다 셈', S.tg['편인'] >= S.tg['식신'] * TH.dosik, lt('편인') + ' · ' + lt('식신'), false)],
      blocks: [b('재성이 편인을 눌러 줌(재제효)', jaeClear, lv(2))],
      toneFn: () => inF(1) ? ['bad', '필요한 식신(꾸준한 결과물)을 편인(걱정·딴생각)이 가로막아, 시작은 많고 마무리가 약해지기 쉬워요.'] : ['mixed', '걱정이 손을 잡아끌 때가 있지만, 이 사주에선 그 손해가 크지 않아요.'] });
    // 10 관살혼잡
    const hapSal = (S.tgExposed['편관'] || []).length === 0 && S.exposedBound[3].length > 0;
    mk({ key: 'honjap', name: '관살혼잡', from: 3, to: 3,
      conds: [c('정관이 있음', tgHas(S, '정관'), lt('정관')), c('편관이 있음', tgHas(S, '편관'), lt('편관')), c('정관·편관 중 하나는 천간에 드러남', !!(S.tgExposed['정관'] || S.tgExposed['편관']), ''), c('정관·편관 모두 천간에 드러남(지지에만 섞이면 약하게)', !!(S.tgExposed['정관'] && S.tgExposed['편관']), '', false), c('둘 다 힘이 있음', tgClear(S, '정관') && tgClear(S, '편관'), '', false)],
      blocks: [b('식신제살로 정리됨', jesal.status === 'on', ''), b('편관이 합으로 묶임(합살)', hapSal, '')],
      toneFn: () => carry >= 55 ? ['mixed', '규칙과 압박이 섞여 있지만 내 힘이 받쳐 줘서, 여러 책임을 동시에 쥐는 쪽으로 쓰여요.'] : ['bad', '기준이 여러 개 겹쳐(정관+편관) 무엇을 따라야 할지 흔들리기 쉬워요. 책임이 몰릴 땐 우선순위부터 정해 두세요.'] });
    // 11 비겁쟁재
    mk({ key: 'bigeopjaeng', name: '비겁쟁재', from: 0, to: 2,
      conds: [c('비겁이 많음(' + TH.jaeng.bigeop + '% 이상)', S.grp[0] >= TH.jaeng.bigeop, lv(0)), c('재성이 조금이라도 있음', S.grp[2] >= 2 || S.root[2] > 0 || S.exposed[2].length > 0, lv(2)), c('재성이 비겁보다 적음(' + TH.jaeng.jae + '% 이하)', S.grp[2] <= TH.jaeng.jae, lv(2))],
      blocks: [b('관성이 비겁을 눌러 재를 지킴(관제비겁)', clear(S, 3), lv(3)), b('식상이 비겁 기운을 재로 이어 줌(통관)', clear(S, 1), lv(1))],
      toneFn: () => inB(2) ? ['mixed', '돈을 두고 나눔·경쟁이 생기지만, 이 사주엔 혼자 다 쥐기보다 나누는 게 오히려 편할 때도 있어요.'] : ['bad', '같이 하는 사람·경쟁자와 돈·몫을 나누게 되기 쉬운 구조예요. 동업·보증·공동 지출은 선을 그어 두세요.'] });
    out.forEach(o => { o.easy = EASY_IX[o.key] || ''; o.fromK = GN[o.from]; o.toK = GN[o.to]; o.statusK = o.candidate ? '후보' : STATUS_K[o.status]; o.toneK = TONE_K[o.tone] || ''; o.roleFrom = roleName(o.from); o.roleTo = roleName(o.to); });
    return out;
  }
  const STATUS_K = { on: '성립', weak: '약하게 성립', off: '불성립' }, TONE_K = { good: '유리', bad: '불리', mixed: '엇갈림' };

  // ───────── 십성 묶음별 판정: 세력 · 자리(투출·통근·월령) · 역할(통합·억부·조후) · 실제 작용 ─────────
  //   관성은 7가지 구조 + 기본형, 나머지 묶음도 같은 방식으로 '이 명식에서의 작용 유형'을 고른다.
  function groupTypes(g, S, IX, R) {
    const on = k => { const x = IX.filter(o => o.key === k)[0]; return x && x.status !== 'off' ? x : null; };
    const T = [], add = (key, name, hit, tone, why) => { if (hit) T.push({ key, name, tone, why }); };
    const carry = S.help, v = R.unifiedV(mod5(S.dEl + g)), pres = has(S, g);
    if (g === 3) {   // 관성 7가지 구조(+기본형)
      add('gwanin', on('salin') && !on('gwanin') ? '살인상생형' : '관인상생형', on('gwanin') || on('salin'), (on('gwanin') || on('salin') || {}).tone, '관성이 인성을 거쳐 나를 키움');
      add('jesal', '식신제살형', on('sikjesal'), on('sikjesal') && on('sikjesal').tone, '센 관을 식신이 다스림');
      add('jaegwan', '재생관형', on('jaesaenggwan'), on('jaesaenggwan') && on('jaesaenggwan').tone, '재성이 관성을 키움');
      add('honjap', '관살혼잡형', on('honjap'), on('honjap') && on('honjap').tone, '정관과 편관이 섞임');
      add('gyeon', '상관견관형', on('gyeongwan'), on('gyeongwan') && on('gyeongwan').tone, '관이 상관에게 다침');
      add('taegwa', '관살태과형', S.grp[3] >= CFG.th.gwanda && carry < CFG.carry.sinyak && !clear(S, 4), 'bad', '관이 많은데 받아 줄 인성이 약함');
      add('muryeok', '관성 무력형', !pres, v > 0 ? 'bad' : 'mixed', '관성이 거의 없어 규칙·틀이 약함');
      if (!T.length) add('base', '관성 기본형', true, v > 0 ? 'good' : v < 0 ? 'bad' : 'mixed', '특별한 구조 없이 자리를 지킴');
    } else if (g === 0) {
      add('jaeng', '비겁쟁재형', on('bigeopjaeng'), on('bigeopjaeng') && on('bigeopjaeng').tone, '비겁이 재를 나눠 가짐');
      add('saeng', '비겁생식형', S.grp[0] >= 25 && clear(S, 1), 'good', '넘치는 힘을 식상으로 내보냄');
      add('je', '관제비겁형', S.grp[0] >= 25 && clear(S, 3) && !clear(S, 1), 'good', '관성이 비겁을 다스림');
      add('help', '신약 보조형', carry < CFG.carry.sinyak && pres, 'good', '약한 나를 받쳐 줌');
      add('excess', '비겁 과다형', S.grp[0] >= CFG.th.jaeng.bigeop && !clear(S, 1) && !clear(S, 3), 'bad', '고집·독립심이 넘치는데 빠질 길이 적음');
      add('none', '비겁 부족형', S.grp[0] < CFG.present, v > 0 ? 'bad' : 'mixed', '나와 같은 편이 적어 혼자 버팀');
      if (!T.length) add('base', '비겁 기본형', true, v > 0 ? 'good' : v < 0 ? 'bad' : 'mixed', '자기 몫을 지키는 정도');
    } else if (g === 1) {
      add('saengjae', '식상생재형', on('siksaengjae'), on('siksaengjae') && on('siksaengjae').tone, '결과물이 돈으로 이어짐');
      add('jesal', '식신제살형', on('sikjesal'), on('sikjesal') && on('sikjesal').tone, '실력으로 압박을 다룸');
      add('gyeon', '상관견관형', on('gyeongwan'), on('gyeongwan') && on('gyeongwan').tone, '말·주장이 규칙과 부딪힘');
      add('paein', '상관패인형', on('paein'), on('paein') && on('paein').tone, '인성이 상관을 다듬음');
      add('dosik', '도식 피해형', on('dosik'), on('dosik') && on('dosik').tone, '편인에 막힘');
      add('seolgi', '설기 과다형', S.grp[1] >= CFG.th.seolgi && carry < CFG.carry.sinyak, 'bad', '내보내는 힘이 커서 기운이 빠짐');
      add('none', '표현 부족형', !pres, v > 0 ? 'bad' : 'mixed', '내보낼 통로가 적어 속으로 쌓음');
      if (!T.length) add('base', '식상 기본형', true, v > 0 ? 'good' : v < 0 ? 'bad' : 'mixed', '필요한 만큼 표현함');
    } else if (g === 2) {
      add('saenggwan', '재생관형', on('jaesaenggwan'), on('jaesaenggwan') && on('jaesaenggwan').tone, '돈이 자리로 이어짐');
      add('result', '생재 결과형', on('siksaengjae'), on('siksaengjae') && on('siksaengjae').tone, '식상의 결과로 들어오는 돈');
      add('geugin', '재극인형', on('jaegeugin'), on('jaegeugin') && on('jaegeugin').tone, '현실이 생각·공부를 누름');
      add('jaeda', '재다신약형', S.grp[2] >= CFG.th.jaeda && carry < CFG.carry.sinyak, 'bad', '돈·일이 많아 감당이 버거움');
      add('jaeng', '쟁재 피해형', on('bigeopjaeng'), on('bigeopjaeng') && on('bigeopjaeng').tone, '비겁에게 몫을 빼앗김');
      add('none', '재성 부족형', !pres, v > 0 ? 'bad' : 'mixed', '돈을 다루는 감각이 약하게 드러남');
      if (!T.length) add('base', '재성 기본형', true, v > 0 ? 'good' : v < 0 ? 'bad' : 'mixed', '번 만큼 쓰는 무난한 흐름');
    } else {
      add('gwanin', on('salin') && !on('gwanin') ? '살인상생형' : '관인상생형', on('gwanin') || on('salin'), (on('gwanin') || on('salin') || {}).tone, '관을 받아 나에게 넘김');
      add('paein', '상관패인형', on('paein'), on('paein') && on('paein').tone, '상관을 다듬음');
      add('dosik', '도식형', on('dosik'), on('dosik') && on('dosik').tone, '식신을 가로막음');
      add('geug', '재극인 피해형', on('jaegeugin'), on('jaegeugin') && on('jaegeugin').tone === 'bad' ? 'bad' : 'mixed', '재성에게 깎임');
      add('mowang', '인성 과다형', S.grp[4] >= CFG.th.inda, 'bad', S.grp[0] <= CFG.th.mowangSelf ? '도움이 넘쳐 내가 묻힘(모왕자쇠)' : '생각·기댈 곳이 많아 움직임이 느려짐');
      add('help', '신약 보조형', carry < CFG.carry.sinyak && pres, 'good', '약한 나를 받쳐 줌');
      add('none', '인성 부족형', !pres, v > 0 ? 'bad' : 'mixed', '기댈 곳이 적어 스스로 배움');
      if (!T.length) add('base', '인성 기본형', true, v > 0 ? 'good' : v < 0 ? 'bad' : 'mixed', '필요한 만큼 받쳐 줌');
    }
    T.forEach(t => { if (!t.tone) t.tone = 'mixed'; });
    const rank = t => { const x = IX.filter(o => o.key === TYPE_IX[t.key])[0]; return x ? (x.status === 'on' ? 0 : 2) : 1; };   // 온전히 성립 → 비율·강약 유형 → 약하게 성립
    return T.map((t, i) => [t, i]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map(x => x[0]);
  }
  const TYPE_IX = { gwanin: 'gwanin', jesal: 'sikjesal', jaegwan: 'jaesaenggwan', honjap: 'honjap', gyeon: 'gyeongwan', jaeng: 'bigeopjaeng', saengjae: 'siksaengjae', paein: 'paein', dosik: 'dosik', saenggwan: 'jaesaenggwan', result: 'siksaengjae', geugin: 'jaegeugin', geug: 'jaegeugin' };
  function forceName(p) { for (const [lim, nm] of CFG.force) if (p < lim) return nm; return '과다'; }

  function groupsOf(M, ch, S, IX, R) {
    return [0, 1, 2, 3, 4].map(g => {
      const el = mod5(S.dEl + g), mem = MEMBERS[g];
      const types = groupTypes(g, S, IX, R), main = types[0];
      const u = R.unified(el), eok = R.eokbuRole(el), joh = R.johuRole(el), ag = R.agree(el);
      // 세력과 유불리를 따로: 세력은 비율·투출·통근, 유불리는 통합 용신 역할
      const force = forceName(S.grp[g]), uv = R.unifiedV(el);
      const fav = uv > 0.01 ? 'good' : uv < -0.01 ? 'bad' : 'neutral';
      const mon = S.monthMainG === g ? '월지 정기(월령을 잡음)' : S.monthStemG === g ? '월간에 있음' : '';
      const rel = IX.filter(o => o.status !== 'off' && (o.from === g || o.to === g));
      return {
        g, name: GN[g], easy: EASY[g], el, elK: M.EL_K[el], elH: M.EL[el],
        pct: r1(S.grp[g]), members: mem.map(t => ({ tg: t, pct: r1(S.tg[t]), exposed: (S.tgExposed[t] || []).map(k => POSK[k]) })),
        exposed: S.exposed[g].map(k => POSK[k]), bound: S.exposedBound[g].map(k => POSK[k] + '(' + S.bound[k] + ')'),
        root: r1(S.root[g]), rootAt: S.rootAt[g].map(k => POSK[k] + (S.clashed[k] ? '(충)' : '')), month: mon,
        force, favor: fav, role: { unified: u || '중립', eokbu: eok, johu: joh, agree: ag, agreeK: AGREE_K[ag] },
        types, main, related: rel.map(o => o.key),
        line: groupLine(g, force, fav, u, main, S, ag)
      };
    });
  }
  function groupLine(g, force, fav, u, main, S, ag) {
    const nm = GN[g], fz = force === '없음' ? '거의 없고' : force === '과다' ? '아주 많고' : force === '강함' ? '강하게 자리 잡았고' : force === '약함' ? '약하게 있고' : '알맞게 있고';
    const fv = fav === 'good' ? '이 사주에 필요한 기운(' + u + ')이에요' : fav === 'bad' ? '이 사주에는 부담 쪽 기운(' + u + ')이에요' : '이 사주에서 큰 영향은 없는 기운이에요';
    const agT = ag === 'conflict' ? ' 다만 강약(억부)과 기후(조후)의 판단이 서로 달라 때에 따라 다르게 느껴질 수 있어요.' : '';
    return J.은(nm) + ' ' + fz + ', ' + fv + '. 실제로는 ‘' + main.name + '’(' + main.why + ')' + (bat(main.name) && (lastH(main.name).charCodeAt(lastH(main.name).length - 1) - 0xAC00) % 28 !== 8 ? '으로' : '로') + ' 작용해요.' + agT;
  }

  // ───────── 원국 판정 ─────────
  const cache = (typeof WeakMap !== 'undefined') ? new WeakMap() : null;
  function analyze(M, ch) {
    const hit = cache && cache.get(ch); if (hit) return hit;
    const R = rolesOf(ch), S = buildState(M, ch, [], CFG.layerW), IX = interactions(S, R, engineStatusOf(ch));
    const groups = groupsOf(M, ch, S, IX, R);
    // 격국 카드(gyeok-structure.js)와 엔진 패턴(ch.patterns)에 같은 이름의 구조가 있으면 대조 표시(판정은 이 모듈 기준, 서로 덮어쓰지 않음)
    let gx = null; try { gx = G.MantraGyeokStructure ? G.MantraGyeokStructure.analyze(M, ch) : null; } catch (e) { gx = null; }
    const XMAP = { siksaengjae: ['saengjae'], jaesaenggwan: ['jaegwan'], gwanin: ['gwanin'], salin: ['salin'], sikjesal: ['jesal'], gyeongwan: ['gyeongwan'], paein: ['paein'], dosik: ['hyosin'], honjap: ['honjap'], bigeopjaeng: ['gungeop'] };
    const PMAP = { gyeongwan: '상관견관', honjap: '관살혼잡', bigeopjaeng: '군겁쟁재', dosik: '효신탈식(도식)', sikjesal: '식신제살' };
    const pnames = (ch.patterns && ch.patterns.list || []).map(x => x.name);
    IX.forEach(o => {
      const gi = gx && (XMAP[o.key] || []).map(k => gx.items.filter(x => x.key === k)[0]).filter(Boolean)[0];
      o.ref = { gyeok: gi ? (gi.on ? '성립' : '불성립') : null, engine: o.engineStatus || (PMAP[o.key] ? (pnames.indexOf(PMAP[o.key]) >= 0 ? '있음' : '없음') : null), common: !!o.engineStatus };
    });
    const R0 = {
      version: VERSION, mode: R.mode, primary: R.primary,
      strength: { help: r1(ch.strength.help), zone: ch.strength.zone, deukryeong: ch.strength.deukryeong, deukji: ch.strength.deukji, deukse: ch.strength.deukse },
      yongsin: {
        unified: { yong: ch.unified && ch.unified.yong, hee: ch.unified && ch.unified.hee, gi: ch.unified && ch.unified.gi, roles: ch.unified && ch.unified.roles },
        eokbu: R.eokbu ? { applicable: !!R.eokbu.applicable, yong: R.eokbu.yong, favor: R.eokbu.favor || [], avoid: R.eokbu.avoid || [], why: R.eokbu.why || '', verdict: R.eokbu.verdict || '' } : null,
        johu: R.johu ? { applicable: !!R.johu.applicable, yong: R.johu.yong, favor: R.johu.favor || [], avoid: R.johu.avoid || [], why: R.johu.why || '', verdict: R.johu.verdict || '' } : null,
        same: !!(R.eokbu && R.johu && R.eokbu.applicable && R.johu.applicable && R.eokbu.yong === R.johu.yong),
        agreeK: !(R.johu && R.johu.applicable) ? '조후는 급하지 않아 억부 기준만 적용' : !(R.eokbu && R.eokbu.applicable) ? '억부는 해당 없음, 조후 기준만 적용' : R.eokbu.yong === R.johu.yong ? '억부·조후 용신이 같아요' : '억부·조후 용신이 달라요'
      },
      groups, interactions: IX, active: IX.filter(o => o.status !== 'off'),
      summary: summaryOf(groups, IX, ch),
      note: '십성 작용 분석은 설명용입니다. 신강·신약, 용신, 운세 흐름 점수·그래프는 바꾸지 않습니다.'
    };
    if (cache) cache.set(ch, R0);
    return R0;
  }
  function summaryOf(groups, IX, ch) {
    const act = IX.filter(o => o.status === 'on');
    const top = groups.slice().sort((a, b) => b.pct - a.pct)[0], need = groups.filter(g => g.favor === 'good').map(g => g.name);
    const lines = [];
    lines.push('가장 큰 힘은 ' + top.name + (bat(top.name) ? '이에요(' : '예요(') + '' + top.pct + '%, ' + top.force + '). ' + (top.favor === 'good' ? '많은 쪽이 이 사주에 필요한 기운이라 힘이 그대로 쓰여요.' : top.favor === 'bad' ? '많긴 하지만 이 사주엔 부담 쪽이라, 많다고 다 좋은 건 아니에요.' : '많지만 좋고 나쁨에 큰 영향은 없는 기운이에요.'));
    if (need.length) lines.push('이 사주에 필요한 쪽은 ' + need.join('·') + (bat(need[need.length - 1]) ? '이에요.' : '예요.'));
    if (act.length) lines.push('원국에 이미 서 있는 흐름은 ' + act.slice(0, 3).map(o => o.easy + '(' + o.name.replace(/\(.*\)$/, '') + ', ' + o.toneK + ')').join(', ') + (act.length > 3 ? ' 외 ' + (act.length - 3) + '개' : '') + (act.length > 3 ? '예요.' : '이에요.'));
    else lines.push('뚜렷하게 서 있는 십성 구조는 없어, 운에서 들어오는 기운에 따라 구조가 새로 만들어지는 편이에요.');
    return lines;
  }

  // ───────── 운 연동: 대운 → 세운 → 월운 → 일진을 아래층부터 쌓는다 ─────────
  //   layers: [{ level, s, b, label }] (luck-overlay 의 layersAt / 화면 olLayers 와 같은 모양)
  function luck(M, ch, layers, opts) {
    opts = opts || {};
    const W = Object.assign({}, CFG.layerW, opts.weights || {});
    const R = rolesOf(ch), nat = analyze(M, ch), d = ch.pillars.day.s;
    const list = (layers || []).filter(L => L && LEVELS.indexOf(L.level) >= 0 && L.s != null && L.b != null).sort((a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level));
    const out = []; let prevS = buildState(M, ch, [], W), prevIX = nat.interactions;
    list.forEach((L, i) => {
      const S = buildState(M, ch, list.slice(0, i + 1), W), IX = interactions(S, R);
      const stTG = M.tenGod(d, L.s), brTG = M.tenGod(d, M.mainHidden(L.b)), se = M.stemEl(L.s), be = M.stemEl(M.mainHidden(L.b));
      const inc = [{ at: '천간 ' + M.STEM[L.s], tg: stTG, g: GOF[stTG], el: se }, { at: '지지 ' + M.BR[L.b], tg: brTG, g: GOF[brTG], el: be }];
      // A. 기운의 유불리 — 들어온 오행의 역할(통합·억부·조후 따로)
      const A = inc.map(x => ({ at: x.at, tg: x.tg, group: GN[x.g], el: x.el, elK: M.EL_K[x.el], unified: R.unified(x.el) || '중립', unifiedV: R.unifiedV(x.el), eokbu: R.eokbuRole(x.el), johu: R.johuRole(x.el), agree: R.agree(x.el), agreeK: AGREE_K[R.agree(x.el)] }));
      const aV = (A[0].unifiedV + A[1].unifiedV) / 2, aTone = A[0].unifiedV * A[1].unifiedV < -0.01 ? 'mixed' : aV > 0.2 ? 'good' : aV < -0.2 ? 'bad' : 'flat';   // 천간·지지 역할이 갈리면 평균으로 덮지 않고 '엇갈림'
      // B. 현실적 작용 — 구조 변화(아래층까지 쌓인 상태와 비교)
      const changes = [];
      IX.forEach((o, k) => {
        const p = prevIX[k], rk = { off: 0, weak: 1, on: 2 }, a = rk[p.status], b = rk[o.status];
        const dv = (S.grp[o.from] + S.grp[o.to]) - (prevS.grp[o.from] + prevS.grp[o.to]);
        let kind = null;
        if (a === 0 && b > 0) kind = 'new';
        else if (a > 0 && b === 0) kind = 'gone';
        else if (b > a) kind = 'up';
        else if (b < a) kind = 'down';
        else if (b > 0 && Math.abs(dv) >= CFG.changeEps && inc.some(x => x.g === o.from || x.g === o.to)) kind = dv > 0 ? 'up' : 'down';
        if (kind) changes.push({ key: o.key, name: o.name, kind, kindK: CHG_K[kind], from: p.status, to: o.status, tone: o.tone || p.tone, toneK: TONE_K[o.tone || p.tone] || '', why: kind === 'gone' ? goneWhy(o) : o.toneWhy, delta: r1(dv) });
      });
      // 합충으로 묶이거나 흔들린 원국 자리
      const natRel = S.rel.filter(r => r.members.indexOf(L.level) >= 0 && r.members.some(m => ['year', 'month', 'day', 'hour'].indexOf(m) >= 0));
      const luckRel = S.rel.filter(r => r.members.indexOf(L.level) >= 0 && r.members.every(m => LEVELS.indexOf(m) >= 0));
      const touched = [];
      natRel.forEach(r => {
        const pos = r.members.filter(m => m !== L.level && ['year', 'month', 'day', 'hour'].indexOf(m) >= 0)[0]; if (!pos) return;
        const P = ch.pillars[pos];
        if (r.kind === 'stem' && r.type === '천간합' && pos !== 'day') touched.push({ pos: POSK[pos], kind: 'bind', name: r.name, group: GN[GOF[M.tenGod(d, P.s)]], text: '' });
        if (r.kind === 'branch' && r.type === '충') touched.push({ pos: POSK[pos], kind: 'clash', name: r.name, group: GN[GOF[M.tenGod(d, M.mainHidden(P.b))]], text: '' });
      });
      touched.forEach(t => { t.text = t.kind === 'bind' ? t.pos + '간 ' + t.group + ' 기운이 합(' + t.name + ')으로 묶여 힘이 덜 나와요' : t.pos + '지의 ' + t.group + ' 뿌리가 충(' + t.name + ')으로 흔들려요'; });
      // 감당 능력 변화(돕는 힘 = 비겁 + 인성)
      const carry = { before: r1(prevS.help), after: r1(S.help), delta: r1(S.help - prevS.help) };
      // 엔진의 운 구조(참고, 점수에 이미 반영된 것 — 읽기만)
      let eng = []; try { eng = M.luckStructures ? M.luckStructures(ch, { s: L.s, b: L.b }).map(x => ({ name: x.name, kind: x.kind })) : []; } catch (e) { eng = []; }
      const D = domainsOf(M, ch, L, inc, changes, R, S, natRel);
      const step = { level: L.level, levelK: LEVEL_K[L.level], label: L.label || '', gz: M.STEM[L.s] + M.BR[L.b], s: L.s, b: L.b, w: W[L.level],
        incoming: A, A: { tone: aTone, toneK: { good: '도움', bad: '부담', mixed: '엇갈림', flat: '잔잔' }[aTone], v: Math.round(aV * 100) / 100 },
        B: { changes, touched, carry, domains: D }, engineStructures: eng,
        groupsNow: S.grp.map(r1), groupsDelta: S.grp.map((x, g) => r1(x - prevS.grp[g])), luckRel: luckRel.map(r => r.name) };
      step.lines = layerLines(step, R);
      out.push(step); prevS = S; prevIX = IX;
    });
    return { version: VERSION, weights: W, natal: nat, layers: out, rule: '대운 ' + W.daeun + ' · 세운 ' + W.seun + ' · 월운 ' + W.wolun + ' · 일진 ' + W.ilun + ' 무게로 아래층부터 쌓아, 층마다 쌓기 전과 뒤의 구조를 비교' };
  }
  const CHG_K = { new: '새로 생김', up: '강해짐', down: '약해짐', gone: '풀림' };
  function goneWhy(o) { return o.name + ' 조건이 이 시기엔 흐려져요.'; }

  // ───────── 영역 영향: 재물 · 커리어 · 인연(전통 배우자성 기준은 따로 표기) ─────────
  function domainsOf(M, ch, L, inc, changes, R, S, natRel) {
    const gs = inc.map(x => x.g), hasG = g => gs.indexOf(g) >= 0, vOf = g => R.unifiedV(mod5(S.dEl + g));
    const chg = keys => changes.filter(c => keys.indexOf(c.key) >= 0);
    const toneOf = (base, cs) => { let v = base; cs.forEach(c => { if (c.kind === 'gone') return; v += (c.tone === 'good' ? 0.5 : c.tone === 'bad' ? -0.5 : 0) * (c.kind === 'down' ? -0.5 : 1); }); return v > 0.2 ? 'good' : v < -0.2 ? 'bad' : 'mixed'; };
    const out = [];
    // 재물: 재성 유입·식상생재·재생관·비겁쟁재·재극인
    const wc = chg(['siksaengjae', 'jaesaenggwan', 'bigeopjaeng', 'jaegeugin']);
    if (hasG(2) || hasG(1) || wc.length) out.push({ key: 'wealth', name: '재물', tone: toneOf(hasG(2) ? vOf(2) * 0.6 : 0, wc), basis: (hasG(2) ? '재성이 들어옴' : hasG(1) ? '식상(재성의 뿌리)이 들어옴' : '재물 구조가 바뀜') + (wc.length ? ' · ' + wc.map(c => c.name + ' ' + c.kindK).join(', ') : '') });
    // 커리어: 관성·인성·식상 유입, 관인·살인·식신제살·견관·혼잡
    const cc = chg(['gwanin', 'salin', 'sikjesal', 'gyeongwan', 'honjap', 'paein']);
    if (hasG(3) || hasG(4) || cc.length) out.push({ key: 'career', name: '커리어', tone: toneOf(hasG(3) ? vOf(3) * 0.6 : hasG(4) ? vOf(4) * 0.4 : 0, cc), basis: (hasG(3) ? '관성(직장·책임)이 들어옴' : hasG(4) ? '인성(자격·문서)이 들어옴' : '일 구조가 바뀜') + (cc.length ? ' · ' + cc.map(c => c.name + ' ' + c.kindK).join(', ') : '') });
    // 인연: ① 일지(배우자 자리)와 운 지지의 합·충 ② 전통 배우자성(남 재성·여 관성) — 기준을 나눠 적는다
    const male = (ch.gender || (ch.input && ch.input.gender)) === 'M', sp = male ? 2 : 3;
    const dayRel = natRel.filter(r => r.kind === 'branch' && r.members.indexOf('day') >= 0).map(r => r.type + '(' + r.name + ')');
    if (dayRel.length || hasG(sp)) out.push({ key: 'love', name: '인연', tone: dayRel.some(t => /^충/.test(t)) ? 'mixed' : dayRel.some(t => /합/.test(t)) ? 'good' : hasG(sp) ? (vOf(sp) >= 0 ? 'good' : 'mixed') : 'mixed',
      basis: [dayRel.length ? '일지(배우자 자리) 기준: ' + dayRel.join('·') : '', hasG(sp) ? '전통 배우자성 기준(' + (male ? '남성 → 재성' : '여성 → 관성') + '): 배우자성이 들어옴' : ''].filter(Boolean).join(' / '),
      note: '전통 배우자성(남성 재성·여성 관성)은 옛 기준이에요. 요즘은 일지와 운의 합·충, 관계 십성 전반을 함께 봐요.' });
    out.forEach(x => { x.toneK = TONE_K[x.tone] || '엇갈림'; });
    return out;
  }

  // ───────── 층별 풀이 문장(사전 문구 조합 · AI 없음) ─────────
  // 쉬운 말 — 구조 이름 앞에 붙여 '무슨 일인지' 먼저 보이게(문안 검수 2026-11-18)
  const EASY_IX = {
    siksaengjae: '하는 일이 돈으로 이어지는 흐름', jaesaenggwan: '번 것이 자리·신용으로 이어지는 흐름', gwanin: '책임이 인정·자격으로 이어지는 흐름',
    salin: '압박을 실력으로 바꾸는 흐름', sikjesal: '실력으로 압박을 다루는 흐름', gyeongwan: '말·주장이 윗사람·규칙과 부딪히는 흐름',
    paein: '거친 재주를 공부가 다듬는 흐름', jaegeugin: '현실 문제가 공부·생각을 누르는 흐름', dosik: '걱정·딴생각이 결과물을 막는 흐름',
    honjap: '기준과 책임이 여러 갈래로 겹치는 흐름', bigeopjaeng: '돈·몫을 사람들과 나누게 되는 흐름'
  };
  const ROLE_EASY = { 용신: '꼭 필요한 기운', 희신: '도움 되는 기운', 한신: '큰 상관 없는 기운', 중립: '큰 상관 없는 기운', 구신: '조금 부담인 기운', 기신: '부담 기운' };
  const TOPIC = { daeun: '이 10년은', seun: '올해는', wolun: '이번 달은', ilun: '오늘은' };
  const MAX_CHG = { daeun: 2, seun: 2, wolun: 1, ilun: 1 };
  const ieyo = w => w + (bat(w) ? '이에요' : '예요');
  function layerLines(st, R) {
    const lines = [], u = UNIT[st.level], A = st.incoming, deep = st.level === 'daeun' || st.level === 'seun';
    const re = a => ROLE_EASY[a.unified] || ROLE_EASY.중립;
    const tgs = a => a.filter((t, i) => a.indexOf(t) === i).join('·');
    // ① 들어온 기운 + 이 사주에서의 쓰임(쉬운 말)
    let head;
    if (A[0].group === A[1].group) head = st.levelK + ' ' + st.gz + ' — ' + A[0].group + '(' + tgs([A[0].tg, A[1].tg]) + ') 기운이 들어와요.';
    else head = st.levelK + ' ' + st.gz + ' — 천간으로 ' + A[0].group + '(' + A[0].tg + '), 지지로 ' + J.이(A[1].group + '(' + A[1].tg + ')') + ' 들어와요.';
    head += re(A[0]) === re(A[1]) ? ' 이 사주엔 ' + (A[0].group === A[1].group ? '' : '둘 다 ') + ieyo(re(A[0])) + '.' : ' 이 사주엔 천간이 ' + re(A[0]) + ', 지지가 ' + ieyo(re(A[1])) + '.';
    if (deep && A.some(a => a.agree === 'conflict')) head += ' 다만 강약과 기후 기준의 판단이 갈려, 때에 따라 다르게 느껴질 수 있어요.';
    lines.push(head);
    // ② 구조 변화(쉬운 말 먼저, 이름은 괄호)
    const nm0 = c => c.name.replace(/\(.*\)$/, ''), lab = c => (EASY_IX[c.key] || nm0(c)) + '(' + nm0(c) + ')';
    const GOOD_END = { daeun: ' 이 흐름을 살려 볼 만한 10년이에요.', seun: ' 올해 써 보기 좋은 흐름이에요.', wolun: ' 이 흐름을 써 보기 좋아요.', ilun: ' 이 흐름을 써 보기 좋아요.' };
    const lastS = t => { const m = String(t).match(/[^.]+\.\s*$/); return m ? m[0].trim() : t; };
    const ch = st.B.changes.filter(c => c.kind !== 'gone').slice(0, MAX_CHG[st.level]);
    let goodSaid = false;   // '써 보기 좋아요' 끝맺음은 층마다 한 번만
    ch.forEach(c => {
      if (c.kind === 'down') lines.push(u + ' ' + J.이(lab(c)) + ' 약해져요. ' + (c.tone === 'bad' ? '그만큼 부담이 덜해요.' : c.tone === 'good' ? '평소 기대던 힘이 덜 나오니 무리하지 마세요.' : '흐름이 조금 느슨해져요.'));
      else lines.push(u + ' ' + J.이(lab(c)) + (c.kind === 'new' ? ' 새로 생겨요.' : ' 강해져요.') + (c.tone === 'good' ? (goodSaid ? '' : (goodSaid = true, GOOD_END[st.level])) : deep && c.why ? ' ' + (c.tone === 'bad' ? lastS(c.why) : c.why) : c.tone === 'bad' ? ' 이 부분만 조심하면 돼요.' : ''));
    });
    const gone = ch.length < MAX_CHG[st.level] ? st.B.changes.filter(c => c.kind === 'gone').slice(0, 1) : [];
    gone.forEach(c => lines.push(TOPIC[st.level] + ' 원래 있던 ' + J.이(lab(c)) + (st.level === 'daeun' ? ' 느슨해져요. ' : ' 잠시 쉬어요. ') + (c.tone === 'bad' ? '부담이 줄어드는 쪽이에요.' : c.tone === 'good' ? '평소 기대던 흐름이 약해지니 무리하지 마세요.' : '흐름이 조금 달라져요.')));
    if (!ch.length && !gone.length) lines.push(TOPIC[st.level] + ' 원국 구조를 새로 만들거나 깨지는 않고, ' + (st.A.tone === 'good' ? '필요한 기운을 조금 더해 주는 정도예요.' : st.A.tone === 'bad' ? '부담 기운을 조금 더하는 정도라 속도만 조절하면 돼요.' : '잔잔하게 지나가는 편이에요.'));
    // ③ 감당 능력(일진은 생략) · 합충(문장이 짧을 때만)
    const cr = st.B.carry;
    if (st.level !== 'ilun' && Math.abs(cr.delta) >= 3 && lines.length < 3) lines.push('버티는 힘(비겁+인성)이 ' + cr.before + '% → ' + cr.after + '%로 ' + (cr.delta > 0 ? '늘어, 밀어붙일 여력이 생겨요.' : '줄어, 일을 벌리기보다 고르는 게 나아요.'));
    if (st.B.touched.length && lines.length < 3) lines.push(st.B.touched[0].text + '.');
    return lines.filter(t => !BANNED.test(t));
  }

  // ── 엔진 패턴 목록과 십성 작용 판정 맞추기(2026-11-18) ──
  //   사전 풀이 문안·'이 사주에서 보이는 패턴'은 엔진 ch.patterns 를 보고 구조 이름을 말한다. 같은 구조를 이 판정이 '성립 안 함'(off)으로 보면
  //   화면 한쪽은 '있음', 다른 쪽은 '없음'이 되므로, 표시·문안 선택에서는 그 패턴만 뺀다. 약하게 성립(weak)·이 판정이 다루지 않는 패턴은 그대로.
  //   엔진 결과(ch.patterns·점수)는 바꾸지 않는다. 반환: 걸러진 패턴 배열(엔진 항목 그대로) — dropped 는 뺀 이름
  const PAT_MAP = { '살인상생': '살인상생', '식신제살': '식신제살', '상관견관': '상관견관', '상관패인': '상관패인', '관살혼잡': '관살혼잡', '효신탈식(도식)': '도식(효신탈식)', '군겁쟁재': '비겁쟁재', '식상생재': '식상생재', '재생관': '재생관', '관인상생': '관인상생', '재극인': '재극인' };
  const AGREE_CACHE = typeof WeakMap === 'function' ? new WeakMap() : null;
  function agreePatterns(M, ch) {
    M = M || G.Manse; const list = (ch && ch.patterns && ch.patterns.list) || [];
    if (!M || !ch || !list.length) { const o = list.slice(); o.dropped = []; return o; }
    const hit = AGREE_CACHE && AGREE_CACHE.get(ch); if (hit) return hit;
    if (ch.patterns.named) { const o = ch.patterns.list.slice(); o.dropped = (ch.patterns.candidates || []).map(p => p.name); o.candidates = (ch.patterns.candidates || []).slice(); o.common = true; if (AGREE_CACHE) AGREE_CACHE.set(ch, o); return o; }   // 2026-11-25 M1: 엔진 공통 판정(성립만 표시, 후보는 숨김 목록)
    let st = {}; try { (analyze(M, ch).interactions || []).forEach(it => { st[it.name] = it.status; }); } catch (e) { st = null; }
    const dropped = [], out = !st ? list.slice() : list.filter(p => { const k = PAT_MAP[p.name]; if (k && st[k] === 'off') { dropped.push(p.name); return false; } return true; });
    out.dropped = dropped; if (AGREE_CACHE) AGREE_CACHE.set(ch, out); return out;
  }
  G.MantraTenGodRoles = { VERSION, CFG, GN, EASY_IX, ROLE_EASY, STATUS_K, TONE_K, CHG_K, AGREE_K, BANNED, analyze, luck, buildState, interactions, rolesOf, pillarVec, agreePatterns, PAT_MAP };
})(typeof window !== 'undefined' ? window : globalThis);
