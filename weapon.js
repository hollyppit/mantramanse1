/* 나의 주무기 · 주무기 발현 타이밍 — 판정 로직. 문안은 weapon-data.js(MantraWeaponData), 화면은 weapon-view.js. 2026-11-26
   · 주무기 = 원국에서 '드러나 있고(투간) · 뿌리가 있고(통근) · 실제 세력이 평균 몫 이상'인 오행. 그 오행이 일간 기준 어떤 십성으로 드러나는지가 발현 방식.
     - 신강약(나를 돕는 힘이 얼마나 되나)·용신(이 사주의 균형에 필요한 기운)과 다른 질문이다. 셋은 서로 대신하지 않는다.
   · 기능 나눔(지시문 2절) — 한 파일 안의 구역으로 나눴다:
       element-strength  오행 세력: 엔진 최종 세력 ch.weights.pct · 계절 왕상휴수사 ch.weights.seasonal.states 를 그대로 읽는다(새로 계산하지 않음)
       pillar-patterns   병존(천간·지지 같은 글자)·간여지동(한 기둥 위아래 같은 오행)·오행 반복·일간 반복 — 엔진에 판정 함수가 없어 여기서 정의(용어 설명 glossary-overlap.js 와 같은 뜻)
       root-exposure     투간(일간 밖 천간)·통근(지장간 M.HIDDEN)·뿌리 깊이(정기/중기/여기)·월지 뿌리
       ten-god-weapon    주무기 오행의 일간 기준 십성 묶음과 실제로 드러난 십성(M.tenGod)
       weapon-selection  핵심 조건 → 온전함 → 보탬 조건 개수 → 세력 %(동률 처리 규칙 포함), 신뢰도
       weapon-timing     운(대운·세운·월운) 한 기둥이 무기를 켜는지(활성도)·유형(강화·지원·발산·조정)·제약 — 유리도는 엔진 흐름 등급 그대로
       weapon-interpretation 은 weapon-data.js(문안)·weapon-view.js(화면)
   · 엔진(engine.js) 값·점수·용신·격국·종격·합충 계산은 바꾸지 않는다. 읽기 전용: ch.pillars · M.HIDDEN · ch.relations · M.luckRelations ·
     ch.unified.roles(용신 역할 — 비교·해석 문구에만) · ch.strength(비교 표시) · x.combined/x.ev.fitScore(유리도 표시)
   · 가중치 점수를 쓰지 않는다. 조건은 모두 '맞다/아니다'. 기준값은 두 개뿐: 세력 20%(오행 5개의 평균 몫), 세력 1위.
     기준을 바꿨을 때 선정이 달라지는 명식 수는 docs/weapon-analysis/ 민감도 표(tools/weapon-analysis/sensitivity.cjs).
   · 사용: MantraWeapon.analyze(M, ch) · MantraWeapon.luck(M, ch, pillar, kind) · MantraWeapon.timeline(M, ch, { fromY, years, wolY }) */
(function (G) {
  'use strict';
  var VERSION = 'weapon-20261126-4';   // 3판: 생극제화(십성 상호작용 성립) 근거·오행+십신 둘 다 있어야 확정·발현 조합(짝 십성)·운의 조합형   // 판정 2판: 격국·상신 구조 조건, 십신형 경로, 파격 제약, 유형(오행형·십신형·복합형), 표시 이름(주무기·잠정·미확정)
  var EL_K = ['목', '화', '토', '금', '수'], EL_H = ['木', '火', '土', '金', '水'];
  var GN = ['비겁', '식상', '재성', '관성', '인성'];
  var POS = ['year', 'month', 'day', 'hour'], POSK = { year: '년', month: '월', day: '일', hour: '시', luck: '운' };
  var ADJ = { 'year|month': 1, 'month|day': 1, 'day|hour': 1 };
  var CFG = {
    forceMin: 20,                 // 평균 몫(100% ÷ 오행 5개). 이 이상이어야 '실제 세력이 있다'
    maxWeapons: 2,
    seasonOK: ['왕', '상'],        // 득령(월령에서 왕·상)
    plusKeys: ['season', 'overlap', 'top', 'deepRoot', 'structure', 'act'],   // act(3판) = 주무기 십성이 성립한(on) 상호작용(좋음·섞임)에 참여 — ten-god-roles.js 판정 그대로   // 보탬 조건(같은 무게로 개수만 센다). structure = 격국의 격 오행(성립·부분) 또는 켜진 상신(2판)
    structMin: 10,                // 십신형 경로: 세력이 평균 몫(20%)에 못 미쳐도 이 % 이상이면서 투간·통근·온전함·구조 역할(격·상신)을 갖추면 후보(평균 몫의 절반)
    intactFirst: true,            // 합·충으로 묶이지 않은 후보를 먼저
    hourKeepAll: true,            // (strict 모드에서만) 12시진 모두에서 첫 무기가 남아야 잠정 확정
    hourMode: 'provisional',      // 시간 모름(2026-11-26 사용자 결정): 'provisional' = 년·월·일 세 기둥으로 판정하고 12시진 유지 비율을 신뢰도·안내에 반영 / 'strict' = 예전처럼 다 유지돼야만 확정
    hourKeepMid: 9,               // provisional: 12시진 중 이 수 이상 유지되면 신뢰도 '보통', 미만이면 '약함'(75%)
    hourVariants: [[0, 40], [2, 0], [4, 0], [6, 0], [8, 0], [10, 0], [12, 0], [14, 0], [16, 0], [18, 0], [20, 0], [22, 0]],   // 시진 12개(한국 시각 → 보정 후 각 시진 안쪽)
  };
  var mod = function (a, n) { return ((a % n) + n) % n; };
  var objJ = function (w) { var c = String(w).charCodeAt(String(w).length - 1) - 0xAC00; return w + (c >= 0 && c <= 11171 && c % 28 !== 0 ? '을' : '를'); };   // 목·화·토·금·수 + 을/를
  var genOf = function (e) { return mod(e + 4, 5); }, ctrlOf = function (e) { return mod(e + 3, 5); }, outOf = function (e) { return mod(e + 1, 5); };
  var pairKey = function (a, b) { var i = POS.indexOf(a), j = POS.indexOf(b); return i < j ? a + '|' + b : b + '|' + a; };
  var anyAdj = function (a) { return a.some(function (x, i) { return a.slice(i + 1).some(function (y) { return ADJ[pairKey(x, y)]; }); }); };
  var _cache = typeof WeakMap === 'function' ? new WeakMap() : null;
  var opt0 = function (o) { var r = {}; for (var k in CFG) r[k] = CFG[k]; if (o) for (var j in o) r[j] = o[j]; return r; };

  // ── element-strength · pillar-patterns · root-exposure: 원국 한 오행의 조건 ──
  function elementFacts(M, ch, e, rank, O, GK, TR) {
    O = O || CFG;
    var P = ch.pillars, dEl = M.stemEl(P.day.s), pct = ch.weights.pct[e] || 0;
    var stems = [], roots = [], ganyeo = [], bStem = [], bBranch = [], surf = { stem: 0, branch: 0 };
    POS.forEach(function (k) {
      var p = P[k]; if (!p) return;
      if (M.stemEl(p.s) === e) surf.stem++; if (M.BR_EL[p.b] === e) surf.branch++;
      if (M.stemEl(p.s) === e && k !== 'day') stems.push({ pos: k, s: p.s, ch: M.STEM[p.s], tg: M.tenGod(P.day.s, p.s) });
      var hid = M.HIDDEN[p.b], lab = M.hiddenLabels(p.b);
      hid.forEach(function (h, i) { if (M.stemEl(h[0]) === e) roots.push({ pos: k, b: p.b, ch: M.BR[p.b], hs: M.STEM[h[0]], depth: lab[i], share: h[1] / 30 }); });
      if (M.stemEl(p.s) === e && M.BR_EL[p.b] === e) ganyeo.push({ pos: k, gz: M.STEM[p.s] + M.BR[p.b] });
    });
    // 병존: 같은 글자(천간이면 같은 십성, 지지면 같은 지지)가 둘 이상 — 일간 글자도 센다(일간과 같은 천간 = 일간 반복)
    var seenS = {}, seenB = {};
    POS.forEach(function (k) { var p = P[k]; if (!p) return; if (M.stemEl(p.s) === e) (seenS[p.s] = seenS[p.s] || []).push(k); if (M.BR_EL[p.b] === e) (seenB[p.b] = seenB[p.b] || []).push(k); });
    Object.keys(seenS).forEach(function (s) { var a = seenS[s]; if (a.length >= 2) bStem.push({ ch: M.STEM[+s], pos: a, adj: anyAdj(a), withDay: a.indexOf('day') >= 0 }); });
    Object.keys(seenB).forEach(function (b) { var a = seenB[b]; if (a.length >= 2) bBranch.push({ ch: M.BR[+b], pos: a, adj: anyAdj(a) }); });
    // 원국 안 합·충: 드러난 천간이 합·충으로 묶이는지, 뿌리 지지가 충을 맞는지(형·파·해·원진은 길흉 없이 기록만)
    var rel = ch.relations || [];
    stems.forEach(function (st) {
      st.bound = rel.filter(function (r) { return r.kind === 'stem' && r.type === '천간합' && r.members.indexOf(st.pos) >= 0; }).map(function (r) { return r.name; });
      st.clash = rel.filter(function (r) { return r.kind === 'stem' && r.type === '천간충' && r.members.indexOf(st.pos) >= 0; }).map(function (r) { return r.name; });
      st.free = !st.bound.length && !st.clash.length;
    });
    var rootPos = {}; roots.forEach(function (r) { rootPos[r.pos] = 1; });
    var rootClash = Object.keys(rootPos).map(function (k) {
      var on = rel.filter(function (r) { return r.kind === 'branch' && r.members.indexOf(k) >= 0; });
      return { pos: k, chung: on.filter(function (r) { return r.type === '충'; }).map(function (r) { return r.name; }), other: on.filter(function (r) { return /형|파|해|원진/.test(r.type); }).map(function (r) { return r.name; }) };
    });
    var states = ch.weights.seasonal && ch.weights.seasonal.states, season = states ? states[e].state : null;
    var c = {
      force: pct >= O.forceMin,
      exposed: stems.length > 0,
      rooted: stems.length > 0 && roots.length > 0,
      season: season ? O.seasonOK.indexOf(season) >= 0 : M.BR_EL[P.month.b] === e,
      overlap: ganyeo.length > 0 || bStem.length > 0 || bBranch.length > 0,
      top: rank === 0,
      deepRoot: roots.some(function (r) { return r.depth === '정기' || r.pos === 'month'; }),
    };
    // 2판: 격국·상신 구조(엔진 gyeokCore 그대로 읽음) — 격 오행(성립·부분 성립)이거나 켜진 상신이면 구조 역할, 켜진 파격 요인(구원 없음)이면 제약
    var st = [], br = [];
    // 건록격·양인격·월겁격(격 = 비겁, group 0)은 격 자체가 다스려야 할 힘이라 '격 오행' 조건에서 뺀다(상신만 인정)
    if (GK && GK.el === e && GK.group !== 0 && (GK.status === 'seong' || GK.status === 'part')) st.push({ kind: 'gyeok', text: '월령 격국 ' + GK.kind + '의 격 오행' + (GK.status === 'part' ? '(부분 성립)' : '') });
    (GK && GK.sang || []).forEach(function (x) { if (x.on && x.el === e) st.push({ kind: 'sang', text: '상신 — ' + x.text }); });
    (GK && GK.pa || []).forEach(function (x) { if (x.on && x.el === e && !(x.rescue && x.rescue.on)) br.push(x.text); });
    c.structure = st.length > 0;
    // 3판: 생극제화 — 십성 작용 엔진(ten-god-roles.js)이 성립(on)으로 판정한 상호작용 중 이 오행의 십성 묶음이 참여한 것
    var gg = mod(e - M.stemEl(P.day.s), 5), acts = [], actBad = [];
    (TR && TR.interactions || []).forEach(function (o) {
      if (o.status !== 'on' || (o.from !== gg && o.to !== gg)) return;
      if (o.tone === 'bad') actBad.push({ name: o.name, from: o.from, to: o.to }); else if (o.from !== o.to) acts.push({ name: o.name, from: o.from, to: o.to, tone: o.tone });
    });
    c.act = acts.length > 0;
    var intactStem = stems.some(function (s) { return s.free; }), intactRoot = rootClash.some(function (r) { return !r.chung.length; });
    c.intact = c.exposed && intactStem && (roots.length ? intactRoot : false);
    c.core = c.force && c.exposed && c.rooted;
    var plus = O.plusKeys.filter(function (k) { return c[k]; });
    var g = mod(e - dEl, 5);
    return {
      el: e, elK: EL_K[e], elH: EL_H[e], group: g, groupName: GN[g], pct: Math.round(pct * 10) / 10, rank: rank + 1,
      season: season, stems: stems, roots: roots, ganyeo: ganyeo, byeongjon: { stem: bStem, branch: bBranch }, rootClash: rootClash,
      surface: { stem: surf.stem, branch: surf.branch, total: surf.stem + surf.branch }, repeat: surf.stem + surf.branch >= 3,
      dayRepeat: bStem.some(function (b) { return b.withDay; }),
      tgs: stems.map(function (s) { return s.tg; }).filter(function (t, i, a) { return a.indexOf(t) === i; }),
      cond: c, plus: plus, plusN: plus.length, isDayEl: e === dEl,
      structure: st, breaks: br, acts: acts, actBad: actBad,
      elemPlusN: plus.filter(function (k) { return k !== 'structure'; }).length,
    };
  }

  // 근거 줄 — 실제 글자·자리를 그대로 적는다(추적 가능)
  function reasons(f) {
    var out = [], c = f.cond;
    out.push((c.force ? '○ ' : '× ') + '세력 ' + f.pct + '% (' + f.rank + '위' + (c.force ? ', 평균 몫 20% 이상' : ', 평균 몫 20%에 못 미침') + ') · 표면 글자 ' + f.surface.total + '개(천간 ' + f.surface.stem + '·지지 ' + f.surface.branch + ')');
    out.push((c.exposed ? '○ ' : '× ') + (c.exposed ? '천간에 드러남(투간): ' + f.stems.map(function (s) { return POSK[s.pos] + '간 ' + s.ch + '(' + s.tg + ')'; }).join(' · ') : '천간에 드러나지 않음' + (f.isDayEl ? '(일간 말고 같은 오행 천간 없음)' : '')));
    out.push((f.roots.length ? '○ ' : '× ') + (f.roots.length ? '지지에 뿌리(통근): ' + f.roots.map(function (r) { return POSK[r.pos] + '지 ' + r.ch + '의 ' + r.depth + ' ' + r.hs; }).join(' · ') : '지지 속에 같은 오행 뿌리 없음'));
    if (f.season) out.push((c.season ? '○ ' : '· ') + '월령에서 ' + f.season + (c.season ? '(득령)' : ''));
    if (f.ganyeo.length) out.push('○ 간여지동: ' + f.ganyeo.map(function (g) { return POSK[g.pos] + '주 ' + g.gz; }).join(' · '));
    f.byeongjon.stem.forEach(function (b) { out.push('○ 천간 병존: ' + b.ch + ' ' + b.pos.length + '개(' + b.pos.map(function (k) { return POSK[k]; }).join('·') + (b.adj ? ', 붙어 있음' : ', 떨어져 있음') + (b.withDay ? ', 일간과 같은 글자' : '') + ')'); });
    f.byeongjon.branch.forEach(function (b) { out.push('○ 지지 병존: ' + b.ch + ' ' + b.pos.length + '개(' + b.pos.map(function (k) { return POSK[k]; }).join('·') + (b.adj ? ', 붙어 있음' : ', 떨어져 있음') + ')'); });
    f.stems.forEach(function (s) { if (s.bound.length) out.push('△ ' + POSK[s.pos] + '간 ' + s.ch + '이(가) 합으로 묶임: ' + s.bound.join(' · ')); if (s.clash.length) out.push('△ ' + POSK[s.pos] + '간 ' + s.ch + '이(가) 부딪힘: ' + s.clash.join(' · ')); });
    f.structure.forEach(function (x) { out.push('○ 구조 역할: ' + x.text); });
    f.breaks.forEach(function (t) { out.push('△ 격국을 흔드는 쪽: ' + t + ' (구원 없음)'); });
    (f.acts || []).forEach(function (a) { out.push('○ 실제 작용: ' + a.name + ' 성립'); });
    (f.actBad || []).forEach(function (a) { out.push('△ 부담 작용: ' + a.name + ' 성립'); });
    f.rootClash.forEach(function (r) { if (r.chung.length) out.push('△ 뿌리 자리 ' + POSK[r.pos] + '지가 충: ' + r.chung.join(' · ')); if (r.other.length) out.push('· 뿌리 자리 ' + POSK[r.pos] + '지 관계(길흉 판단 없음): ' + r.other.join(' · ')); });
    return out;
  }

  // 3판 발현 조합: 주무기 십성 g 와 짝을 이루는 십성 — ① 성립(on)한 상호작용으로 묶인 묶음(좋음·섞임·부담 표시) ② 없으면 실제로 드러난(천간) 묶음 중 세력 보통 이상
  function partnersOf(w, TR, facts) {
    var g = w.group, out = [], seen = {};
    (TR && TR.interactions || []).forEach(function (o) {
      if (o.status !== 'on' || o.from === o.to || (o.from !== g && o.to !== g)) return;
      var p = o.from === g ? o.to : o.from; if (seen[p]) return; seen[p] = 1;
      out.push({ group: p, basis: 'act', name: o.name, tone: o.tone === 'bad' ? 'bad' : o.tone === 'good' ? 'good' : 'mixed' });
    });
    (TR && TR.groups || []).forEach(function (x) {
      if (x.g === g || seen[x.g] || !x.exposed || !x.exposed.length || !/보통|강함|과다/.test(x.force || '')) return; seen[x.g] = 1;
      out.push({ group: x.g, basis: 'coexist', name: '', tone: 'mixed' });
    });
    return out.slice(0, 3);
  }
  function rankCmp(O) { return function (a, b) { return (O.intactFirst ? (b.cond.intact - a.cond.intact) : 0) || (b.plusN - a.plusN) || (b.pct - a.pct) || (a.el - b.el); }; }

  // ── weapon-selection: 원국 판정(시주 있는 그대로) ──
  function judge(M, ch, o) {
    var O = opt0(o);
    var pct = ch.weights.pct, order = [0, 1, 2, 3, 4].sort(function (a, b) { return (pct[b] - pct[a]) || (a - b); });
    var GK = null; try { GK = M.gyeokCore ? M.gyeokCore(ch) : null; } catch (e) { GK = null; }
    var TR = null; try { TR = G.MantraTenGodRoles && G.MantraTenGodRoles.analyze ? G.MantraTenGodRoles.analyze(M, ch) : null; } catch (e) { TR = null; }
    var facts = [0, 1, 2, 3, 4].map(function (e) { return elementFacts(M, ch, e, order.indexOf(e), O, GK, TR); });
    facts.forEach(function (f) { f.reasons = reasons(f); });
    var core = facts.filter(function (f) { return f.cond.core; }).sort(rankCmp(O));
    var intact = core.filter(function (f) { return f.cond.intact; });
    var pool = O.intactFirst ? (intact.length ? intact : core) : core, status, weapons = [], complex = [], near = [], log = [];
    // 2판 십신형 경로: 세력 structMin~20% · 투간 · 통근 · 온전함 · 구조 역할 — 개수가 아니라 격국·상신 구조로 두드러지는 십신. 핵심 후보 뒤에 둔다
    var structPath = O.structMin != null ? facts.filter(function (f) { return !f.cond.core && f.pct >= O.structMin && f.cond.exposed && f.roots.length && f.cond.intact && f.cond.structure; }).sort(rankCmp(O)) : [];
    structPath.forEach(function (f) { f.path = 'structure'; });
    var X = O.maxWeapons, nm = function (f) { return EL_K[f.el] + '(' + f.groupName + ')'; };
    log.push('핵심 조건(세력 ' + O.forceMin + '% 이상 · 투간 · 통근)을 모두 갖춘 후보: ' + (core.length ? core.map(nm).join(' · ') : '없음'));
    if (O.intactFirst && core.length && intact.length !== core.length) log.push(intact.length ? '합·충으로 묶이지 않은 후보만 먼저 봄: ' + intact.map(nm).join(' · ') : '모든 후보가 원국 안에서 합·충으로 묶여 있어 그대로 비교함(다듬어 쓰는 무기)');
    if (pool.length > 1) log.push('보탬 조건 개수: ' + pool.map(function (f) { return nm(f) + ' ' + f.plusN + '개' + (f.plus.length ? '(' + f.plus.map(function (k) { return PLUS_K[k]; }).join('·') + ')' : ''); }).join(' / '));
    if (structPath.length) log.push('구조로 두드러지는 십신 후보(세력 ' + O.structMin + '~20%): ' + structPath.map(nm).join(' · '));
    if (!pool.length && structPath.length) { pool = structPath.slice(); log.push('핵심 조건을 갖춘 힘이 없어 구조 후보로 판정'); }
    if (!pool.length) { status = 'none'; log.push('핵심 조건을 갖춘 힘도, 구조로 두드러지는 십신도 없어 주무기를 정하지 않음'); }
    else if (pool.length > X && pool[X].plusN === pool[X - 1].plusN) {
      // 2번째와 3번째가 같은 조건 수 → 세력 %만으로 둘째를 고르지 않는다. 첫째가 앞서면 하나만, 첫째까지 같으면 복합형
      if (pool[0].plusN > pool[1].plusN) { weapons = [pool[0]]; status = 'single'; near = pool.slice(1).filter(function (f) { return f.plusN === pool[1].plusN; }).map(function (f) { return f.el; }); log.push('2순위 자리에 같은 조건 수의 후보가 ' + near.length + '개라 세력 %만으로 가르지 않고 1순위만 둠'); }
      else { status = 'complex'; complex = pool.filter(function (f) { return f.plusN === pool[0].plusN; }); log.push('후보 ' + complex.length + '개가 같은 조건 수로 서 있어 복합형'); }
    }
    else { weapons = pool.slice(0, X); if (weapons.length < X && structPath.length && weapons[0].path !== 'structure') { weapons.push(structPath[0]); log.push('2순위 자리에 구조로 두드러지는 십신 ' + nm(structPath[0]) + '을(를) 보조 주무기로 둠'); } status = weapons.length === 1 ? 'single' : 'dual'; if (weapons.length === 2) log.push('1순위 ' + nm(weapons[0]) + ', 2순위(보조) ' + nm(weapons[1]) + (weapons[0].plusN === weapons[1].plusN && weapons[1].path !== 'structure' ? ' — 조건 수가 같아 세력 %로 순서만 정함' : weapons[1].path === 'structure' ? ' — 보조는 구조로 두드러지는 십신' : '')); }
    weapons.forEach(function (w, i) {
      w.order = i + 1; w.level = w.plusN >= 2 ? 'clear' : 'plain'; w.shaky = !w.cond.intact; w.path = w.path || 'core';
      // 유형: 오행형(구조 역할 없음) · 십신형(구조 역할이 있고 오행 쪽 보탬이 없거나 십신 경로) · 복합형(오행 쪽 보탬과 구조 역할이 함께)
      w.tgEvidence = w.cond.structure || w.cond.act;   // 3판: 십신 근거 = 격국·상신 또는 성립한 실제 작용
      w.elemPlusN = w.plus.filter(function (k) { return k !== 'structure' && k !== 'act'; }).length;
      w.type = !w.tgEvidence ? 'element' : (w.path === 'structure' || w.elemPlusN === 0) ? 'tengod' : 'complex';
      w.partners = partnersOf(w, TR, facts);
      w.typeK = { element: '오행형', tengod: '십신형', complex: '복합형' }[w.type];
    });
    var hiddenPow = facts.filter(function (f) { return f.cond.force && !f.cond.exposed && f.roots.length; }).map(function (f) { return f.el; });
    var thinEdge = facts.filter(function (f) { return f.cond.exposed && f.roots.length && !f.cond.force; }).map(function (f) { return f.el; });
    return { status: status, weapons: weapons, complex: complex, near: near, facts: facts, order: order, hiddenPow: hiddenPow, thinEdge: thinEdge, core: core.map(function (f) { return f.el; }), log: log, tr: TR ? true : false };
  }
  var PLUS_K = { season: '득령', overlap: '병존·간여지동', top: '세력 1위', deepRoot: '깊은 뿌리', structure: '격국·상신', act: '실제 작용' };

  function sig(j) { return j.status + ':' + (j.weapons.length ? j.weapons : j.complex).map(function (w) { return w.el; }).join(','); }

  // 시간 모름: 시진 12개를 넣어 3기둥 판정이 유지되는지 본다(엔진 compute 를 다시 부를 뿐 값은 바꾸지 않는다)
  function hourCheck(M, ch, base, O) {
    var inp = ch.input || null; if (!inp) return null;
    var first = base.weapons[0] ? base.weapons[0].el : null, keep = 0, same = 0, seen = {}, n = 0;
    O.hourVariants.forEach(function (hm) {
      var q = {}; for (var k in inp) q[k] = inp[k]; q.hour = hm[0]; q.minute = hm[1];
      var c2; try { c2 = M.compute(q); } catch (e) { return; }
      if (!c2 || !c2.pillars.hour) return; n++;
      var j = judge(M, c2, O), s = sig(j); seen[s] = (seen[s] || 0) + 1;
      if (s === sig(base)) same++;
      if (first != null && j.weapons.some(function (w) { return w.el === first; })) keep++;
    });
    return { variants: n, same: same, keepFirst: first != null ? keep : null, outcomes: seen };
  }

  // 신뢰도 = 내부 판정 근거가 얼마나 한결같이 갖춰졌는가(명리 정확도·성공 가능성이 아니다)
  function confidenceOf(w, hourKnown, status, hc, O) {
    if (status === 'undetermined' || status === 'complex') return 'low';
    if (!hourKnown && hc && hc.keepFirst != null && hc.keepFirst < (O ? O.hourKeepMid : 9)) return 'low';   // 시간 모름: 시진에 따라 자주 바뀌면 약함
    if (!w.cond.intact || w.plusN === 0) return 'low';
    if (w.path === 'structure') return 'low';   // 세력이 평균 몫에 못 미치는 십신형은 잠정
    if (w.breaks && w.breaks.length) return 'mid';   // 격국을 흔드는 쪽이면 탄탄으로 보지 않음
    if (w.actBad && w.actBad.length && !w.cond.act) return 'mid';   // 부담 작용만 성립하면 탄탄으로 보지 않음
    if (w.plusN >= 2 && hourKnown) return 'high';
    return 'mid';
  }

  function analyze(M, ch, o) {
    if (!M || !ch || !ch.weights || !ch.pillars || !ch.pillars.day) return { ok: false, version: VERSION, reason: 'NO_DATA' };
    var O = opt0(o);
    if (_cache && !o) { var hit = _cache.get(ch); if (hit) return hit; }
    var j = judge(M, ch, O), hourKnown = ch.hourKnown !== false && !!ch.pillars.hour, hc = null, status = j.status;
    if (!hourKnown) {
      hc = hourCheck(M, ch, j, O);
      if (O.hourMode === 'strict') {   // 예전 규칙(비교용): 3기둥 판정의 첫 무기가 12시진 모두에서 남아야 확정, 아니면 미확정
        var need = O.hourKeepAll ? (hc ? hc.variants : 99) : Math.ceil((hc ? hc.variants : 12) * 0.75);
        if (!hc || status === 'none' || status === 'complex' || hc.keepFirst < need) status = 'undetermined';
      }
      // provisional(기본): 시주 근거 없이 세 기둥으로 판정한 결과를 그대로 쓰고(잠정), 12시진 유지 비율은 신뢰도·안내 문장에만 반영
    }
    var u = ch.unified || {}, pct = ch.weights.pct, top = j.order[0], roles = u.roles || {};
    var wEls = j.weapons.map(function (w) { return w.el; });
    j.weapons.forEach(function (w) { w.role = String(roles[w.el] || '').replace(/^조건부 /, ''); w.confidence = confidenceOf(w, hourKnown, status, hc, O); });
    j.complex.forEach(function (w) { w.role = String(roles[w.el] || '').replace(/^조건부 /, ''); w.confidence = 'low'; });
    var P = ch.pillars, dEl = M.stemEl(P.day.s), dbg = mod(M.stemEl(M.mainHidden(P.day.b)) - dEl, 5);
    var res = {
      ok: true, version: VERSION, hourKnown: hourKnown,
      status: status, rawStatus: j.status,
      weapons: j.weapons, complex: j.complex, near: j.near, facts: j.facts, hiddenPow: j.hiddenPow, thinEdge: j.thinEdge, core: j.core, log: j.log,
      candidates: (j.weapons.length ? j.weapons : j.complex).map(function (w) { return w.el; }),
      confidence: j.weapons.length ? j.weapons[0].confidence : 'low',
      label: !j.weapons.length ? '주무기 미확정' : (j.weapons[0].confidence === 'low' || !j.weapons[0].tgEvidence || j.weapons[0].path === 'structure') ? '잠정 주무기' : '주무기',   // 3판: 오행 근거와 십신 근거가 둘 다 있어야 확정   // 2판 표시 이름
      strongest: { el: top, pct: Math.round(pct[top] * 10) / 10, isWeapon: wEls.indexOf(top) >= 0 },
      yong: u.yong != null ? { el: u.yong, isWeapon: wEls.indexOf(u.yong) >= 0, name: u.primaryName || '' } : null,
      strength: { zone: ch.strength.zone, help: Math.round(ch.strength.help * 10) / 10 },
      // 일주 간여지동(지시문 2-2 C): 일간과 일지가 같은 오행인지, 일지 정기가 일간을 돕는지(비겁·인성)
      dayPillar: { gz: M.STEM[P.day.s] + M.BR[P.day.b], ganyeo: M.BR_EL[P.day.b] === dEl, branchTG: M.tenGod(P.day.s, M.mainHidden(P.day.b)), helps: dbg === 0 || dbg === 4 },
      jong: u.mode === 'jong',
      hourCheck: hc, provisional: !hourKnown && status !== 'undetermined', hourKeep: hc && hc.keepFirst != null ? { keep: hc.keepFirst, of: hc.variants } : null,
      exceptions: [],
    };
    var weak = /신약|태약|극약/.test(res.strength.zone);
    if (j.weapons.length && !res.strongest.isWeapon) {
      res.exceptions.push('strongest-not-weapon');
      var tf = j.facts[top]; res.strongest.why = !tf.cond.exposed ? (tf.isDayEl ? 'dayOnly' : 'notExposed') : !tf.cond.rooted ? 'noRoot' : (!tf.cond.intact && j.weapons[0].cond.intact) ? 'shaky' : 'fewer';
    }
    if (res.yong && j.weapons.length && !res.yong.isWeapon) res.exceptions.push('yong-not-weapon');
    if (res.yong && res.yong.isWeapon) res.exceptions.push('yong-is-weapon');
    if (j.weapons.some(function (w) { return /기신|구신/.test(w.role); })) res.exceptions.push('weapon-is-gisin');
    if (j.weapons.some(function (w) { return w.shaky; })) res.exceptions.push('shaky-weapon');
    if (j.weapons.some(function (w) { return w.isDayEl; })) res.exceptions.push('bigeop-weapon');
    if (j.hiddenPow.length) res.exceptions.push('hidden-power');
    if (j.facts.some(function (f) { return f.byeongjon.stem.length + f.byeongjon.branch.length > 0 && !f.cond.core; })) res.exceptions.push('byeongjon-not-core');
    if (res.dayPillar.ganyeo && weak) res.exceptions.push('day-ganyeo-weak');
    if (j.core.length >= 2) res.exceptions.push('multi-candidate');
    if (j.near.length) res.exceptions.push('tie-cut');
    if (res.jong) res.exceptions.push('jong');
    if (!hourKnown) res.exceptions.push('hour-unknown');
    if (_cache && !o) _cache.set(ch, res);
    return res;
  }

  // ── weapon-timing: 운 한 기둥이 무기를 켜는가(활성도)·어떤 방식인가(유형)·무엇이 막는가(제약) ──
  var ACT = {
    strong: { n: '강하게 켜짐', k: 'on2', o: 0, y: 4 }, on: { n: '켜짐', k: 'on1', o: 1, y: 3 }, shaky: { n: '켜지되 흔들림', k: 'shk', o: 2, y: 3 },
    sup: { n: '받쳐 줌', k: 'sup', o: 3, y: 2 }, quiet: { n: '조용함', k: 'qt', o: 4, y: 1 }, trim: { n: '정리', k: 'trm', o: 5, y: 0 }, hit: { n: '눌림', k: 'hit', o: 6, y: 0 },
  };
  var TYPE_K = { strengthen: '강화형', support: '지원형', release: '발산형', adjust: '조정형', partner: '조합형' };
  function luckOne(M, ch, w, p) {
    var se = M.stemEl(p.s), be = M.BR_EL[p.b], hid = M.HIDDEN[p.b], lab = M.hiddenLabels(p.b), s = [], cons = [];
    var roles = ch.unified && ch.unified.roles || {}, role = function (e) { return String(roles[e] || '').replace(/^조건부 /, ''); };
    var wRole = role(w.el), excess = /기신|구신/.test(wRole);
    var stemSame = se === w.el, rootIx = -1;
    hid.forEach(function (h, i) { if (M.stemEl(h[0]) === w.el && (rootIx < 0 || lab[i] === '정기')) rootIx = i; });
    var rootDeep = rootIx >= 0 && lab[rootIx] === '정기', rootAny = rootIx >= 0;
    var gen = se === genOf(w.el) || be === genOf(w.el);
    var hitStem = se === ctrlOf(w.el), out = se === outOf(w.el) || be === outOf(w.el);
    var rr = []; try { rr = M.luckRelations(ch, p).rels || []; } catch (e) { rr = []; }
    var wPos = w.stems.map(function (x) { return x.pos; }), rPos = w.roots.map(function (x) { return x.pos; });
    var bound = rr.filter(function (r) { return r.kind === 'stem' && r.type === '천간합' && r.members.some(function (m) { return wPos.indexOf(m) >= 0; }); });
    var clash = rr.filter(function (r) { return r.kind === 'stem' && r.type === '천간충' && r.members.some(function (m) { return wPos.indexOf(m) >= 0; }); });
    var rootHit = rr.filter(function (r) { return r.kind === 'branch' && r.type === '충' && r.members.some(function (m) { return rPos.indexOf(m) >= 0; }); });
    var rootOther = rr.filter(function (r) { return r.kind === 'branch' && /형|파|해|원진/.test(r.type) && r.members.some(function (m) { return rPos.indexOf(m) >= 0; }); });
    var types = [];
    if (stemSame || rootAny) types.push('strengthen'); if (gen) types.push('support'); if (out) types.push('release');
    // 3판 조합형: 운 천간의 십성 묶음이 주무기의 짝 십성(발현 조합)이면 — 짝 능력이 켜지는 때(부담 조합이면 제약으로)
    var lg = mod(se - M.stemEl(ch.pillars.day.s), 5), pt = (w.partners || []).filter(function (p) { return p.group === lg && se !== w.el; })[0];
    if (pt && pt.tone !== 'bad') { types.push('partner'); s.push({ t: 'partner', x: '운의 천간이 ' + GN[lg] + ' — 주무기와 짝을 이루는 능력' + (pt.name ? '(' + pt.name + ')' : '') + '이 함께 켜져요' }); }
    var hit = hitStem || bound.length || clash.length || rootHit.length; if (hit) types.push('adjust');
    if (stemSame) s.push({ t: 'strengthen', x: '운의 천간 ' + M.STEM[p.s] + '이(가) 같은 ' + w.elK + ' 기운 — 무기가 겉으로 드러나요' });
    if (rootAny) s.push({ t: 'strengthen', x: '운의 지지 ' + M.BR[p.b] + ' 속 ' + lab[rootIx] + ' ' + M.STEM[hid[rootIx][0]] + ' — 무기에 뿌리를 대 줘요' });
    if (gen) s.push({ t: 'support', x: EL_K[genOf(w.el)] + ' 기운이 ' + objJ(w.elK) + ' 낳아 받쳐 줘요' });
    if (out) s.push({ t: 'release', x: EL_K[outOf(w.el)] + ' 기운이 와서 무기를 밖으로 내보낼 쓰임처가 열려요' });
    if (hitStem) cons.push('운의 천간 ' + M.STEM[p.s] + '(' + EL_K[se] + ')이(가) ' + objJ(w.elK) + ' 제어해요(극)');
    bound.forEach(function (r) { cons.push(r.name + ' — 원국의 무기 천간이 운과 합으로 묶여요'); });
    clash.forEach(function (r) { cons.push(r.name + ' — 원국의 무기 천간이 운과 부딪혀요'); });
    rootHit.forEach(function (r) { cons.push(r.name + ' — 무기의 뿌리 자리가 흔들려요'); });
    rootOther.forEach(function (r) { cons.push(r.name + ' — 뿌리 자리에 걸리는 관계(길흉 판단 없이 참고)'); });
    if (pt && pt.tone === 'bad') cons.push(GN[lg] + ' 기운이 들어와 ' + pt.name + ' 같은 부담 조합이 커지기 쉬워요');
    if (excess && (stemSame || rootAny)) cons.push('주무기가 이 명식에서 이미 많은 쪽(' + wRole + ')이라, 더 세지면 과하게 쓰기 쉬워요');
    var on = (stemSame && rootAny) ? 'strong' : (stemSame || rootDeep) ? 'on' : null;
    var lv = on ? (hit ? 'shaky' : on) : (gen || rootAny) ? (hit ? 'quiet' : 'sup') : hit ? (excess ? 'trim' : 'hit') : 'quiet';
    // 활용 방향: 운 천간의 일간 기준 십성 묶음(엔진 tenGod)
    var tg = M.tenGod(ch.pillars.day.s, p.s), tgG = Math.floor(M.TG.indexOf(tg) / 2);
    return {
      el: w.el, level: lv, levelK: ACT[lv].n, key: ACT[lv].k, ord: ACT[lv].o, y: ACT[lv].y,
      types: types, typesK: types.map(function (t) { return TYPE_K[t]; }), signals: s, constraints: cons,
      use: { tg: tg, group: tgG, groupName: GN[tgG] }, partner: pt || null,
      roles: { stem: role(se), branch: role(be), weapon: wRole },
    };
  }

  // 활용 유리도 = 그 시기 엔진 흐름 점수 등급(통합 용신·구조·합충이 이미 반영된 값 그대로). 활성도와 합치지 않는다.
  function favor(M, x) {
    var v = x && Number.isFinite(x.combined) ? x.combined : x && x.ev ? x.ev.fitScore : null;
    if (!Number.isFinite(v)) return null;
    var LG = G.MantraLuckGrade, g = LG && LG.flow ? LG.flow(v, M) : null;
    if (!g) { var C = (M.LUCK_CFG && M.LUCK_CFG.condition) || { tailwind: 18, caution: -12 }; g = v >= C.tailwind ? { k: 'good', n: '좋음' } : v > C.caution ? { k: 'ok', n: '무난' } : { k: 'care', n: '조심' }; }
    return { v: Math.round(v), k: g.k, n: g.n };
  }
  // 두 축을 나란히 읽는 한 줄 열쇠(점수 합산 아님)
  function readPair(act, fav) {
    var a = act.level, f = fav ? fav.k : 'ok';
    if (a === 'strong' || a === 'on') return f === 'good' ? 'combo-go' : f === 'care' ? 'combo-over' : 'combo-pick';
    if (a === 'shaky') return 'combo-shaky';
    if (a === 'sup') return 'combo-train';
    if (a === 'trim') return 'combo-trim';
    if (a === 'hit') return 'combo-guard';
    return f === 'good' ? 'combo-other' : 'combo-rest';
  }

  function luck(M, ch, p, kind) {
    var A = analyze(M, ch); if (!A.ok || !p) return null;
    var list = A.weapons.length ? A.weapons : A.complex; if (!list.length) return { kind: kind, gz: M.gzName(p), none: true, favor: favor(M, p) };
    var acts = list.slice(0, CFG.maxWeapons).map(function (w) { return luckOne(M, ch, w, p); });
    var best = acts.slice().sort(function (a, b) { return a.ord - b.ord; })[0], fv = favor(M, p);
    return { kind: kind, gz: M.gzName(p), s: p.s, b: p.b, acts: acts, best: best, favor: fv, read: readPair(best, fv) };
  }

  function timeline(M, ch, opt) {
    opt = opt || {};
    var A = analyze(M, ch); if (!A.ok) return null;
    var fromY = opt.fromY || (ch.solar ? ch.solar.y : 2000), years = opt.years || 10, wolY = opt.wolY || fromY;
    var dl = (ch.daeun && ch.daeun.list || []).map(function (x, i) { var r = luck(M, ch, x, 'daeun'); if (r) { r.i = i; r.startAge = x.startAge; r.startYear = x.startYear; r.startMs = x.startMs; } return r; });
    var sl = (M.seunRange(ch, fromY, fromY + years - 1) || []).map(function (x) { var r = luck(M, ch, x, 'seun'); if (r) { r.year = x.year; r.age = x.age; r.daeunGz = x.daeun ? M.gzName(x.daeun) : ''; } return r; });
    var wl = (M.wolun(ch, wolY) || []).map(function (x, i) { var r = luck(M, ch, x, 'wolun'); if (r) { r.i = i; r.termName = x.termName; r.startMs = x.startMs; r.month = new Date(x.startMs + 9 * 3600e3).getUTCMonth() + 1; } return r; });
    var on = function (r) { return r && r.best && (r.best.level === 'strong' || r.best.level === 'on'); };
    return {
      version: VERSION, fromY: fromY, years: years, wolY: wolY, daeun: dl, seun: sl, wolun: wl,
      onDaeun: dl.filter(on).map(function (r) { return r.i; }), onSeun: sl.filter(on).map(function (r) { return r.year; }), onWolun: wl.filter(on).map(function (r) { return r.i; }),
    };
  }

  var api = { VERSION: VERSION, CFG: CFG, ACT: ACT, TYPE_K: TYPE_K, PLUS_K: PLUS_K, analyze: analyze, luck: luck, timeline: timeline, favor: favor, readPair: readPair, judge: judge, sig: sig, _elementFacts: elementFacts };
  G.MantraWeapon = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
