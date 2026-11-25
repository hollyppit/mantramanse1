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
  var VERSION = 'weapon-20261126-9';   // 7판 보완: 묶인 후보도 구조적 중요도가 2점 이상 높으면 1순위 가능   // 7판: 탭 사이 일관성(기반 역량·보조 역량·오행·강약 판정과의 관계·모순 재검토 표시), 선정 불변   // 6판(선정): 지지 중심 경로·월령 장악·사령·지지 병존, 구조적 중요도 순위(투출 가점 없음), 생으로 이어지는 보조 역량   // 5판: 발현 강도(강한 주무기 재강화 그대로 반영)와 활용 유리도(용신 역할·강약·관련 십성 작용) 분리   // 4판(운): 발현 단계 이름 통일·오행 축/십성 축/합충 한 번·유형별 분기·작용 유형 4종   // 3판: 생극제화(십성 상호작용 성립) 근거·오행+십신 둘 다 있어야 확정·발현 조합(짝 십성)·운의 조합형   // 판정 2판: 격국·상신 구조 조건, 십신형 경로, 파격 제약, 유형(오행형·십신형·복합형), 표시 이름(주무기·잠정·미확정)
  var EL_K = ['목', '화', '토', '금', '수'], EL_H = ['木', '火', '土', '金', '水'];
  var GN = ['비겁', '식상', '재성', '관성', '인성'];
  var POS = ['year', 'month', 'day', 'hour'], POSK = { year: '년', month: '월', day: '일', hour: '시', luck: '운' };
  var ADJ = { 'year|month': 1, 'month|day': 1, 'day|hour': 1 };
  var CFG = {
    forceMin: 20,                 // 평균 몫(100% ÷ 오행 5개). 이 이상이어야 '실제 세력이 있다'
    maxWeapons: 2,
    seasonOK: ['왕', '상'],        // 득령(월령에서 왕·상)
    plusKeys: ['season', 'overlap', 'top', 'deepRoot', 'structure', 'act', 'monthCmd', 'saryeong', 'branchRep'],   // 6판: 월령 장악·사령·지지 병존 추가
    // 6판(2026-11-26): 보탬 조건은 개수가 아니라 구조적 중요도로 잰다(순위용). 월령(월지 정기)·격국이 가장 무겁고, 병존·간여지동·뿌리는 가볍다. 투간 자체는 가점이 없다
    branchPath: true,             // 6판 지지 중심 경로: 천간에 드러나지 않아도 세력 20%↑ · 월령(월지 정기 또는 득령) · 지지 정기 2곳↑ 또는 지지 병존 · 뿌리 자리 충 없음이면 후보
    // 이전 plusKeys(5판까지): ['season', 'overlap', 'top', 'deepRoot', 'structure', 'act'] — 같은 무게로 개수만 셌다   // act(3판) = 주무기 십성이 성립한(on) 상호작용(좋음·섞임)에 참여 — ten-god-roles.js 판정 그대로   // 보탬 조건(같은 무게로 개수만 센다). structure = 격국의 격 오행(성립·부분) 또는 켜진 상신(2판)
    structMin: 10,                // 십신형 경로: 세력이 평균 몫(20%)에 못 미쳐도 이 % 이상이면서 투간·통근·온전함·구조 역할(격·상신)을 갖추면 후보(평균 몫의 절반)
    intactFirst: true,            // 합·충으로 묶이지 않은 후보를 먼저
    intactGap: 2,                 // 7판 보완(2026-11-26 사용자 결정): 묶인 후보라도 구조적 중요도가 이만큼 이상 높으면 '묶이지 않은 후보 먼저'를 넘어 함께 비교(다듬어 쓰는 주무기)
    hourKeepAll: true,            // (strict 모드에서만) 12시진 모두에서 첫 무기가 남아야 잠정 확정
    hourMode: 'provisional',      // 시간 모름(2026-11-26 사용자 결정): 'provisional' = 년·월·일 세 기둥으로 판정하고 12시진 유지 비율을 신뢰도·안내에 반영 / 'strict' = 예전처럼 다 유지돼야만 확정
    hourKeepMid: 9,               // provisional: 12시진 중 이 수 이상 유지되면 신뢰도 '보통', 미만이면 '약함'(75%)
    hourVariants: [[0, 40], [2, 0], [4, 0], [6, 0], [8, 0], [10, 0], [12, 0], [14, 0], [16, 0], [18, 0], [20, 0], [22, 0]],   // 시진 12개(한국 시각 → 보정 후 각 시진 안쪽)
  };
  var mod = function (a, n) { return ((a % n) + n) % n; };
  // 조사 자동: 한자 간지는 한글 음으로 받침을 본다(甲갑·丁정·亥해…) — 'X이(가)'·'X을(를)'·'X과(와)'를 고쳐 쓴다
  var RD = { '甲': '갑', '乙': '을', '丙': '병', '丁': '정', '戊': '무', '己': '기', '庚': '경', '辛': '신', '壬': '임', '癸': '계', '子': '자', '丑': '축', '寅': '인', '卯': '묘', '辰': '진', '巳': '사', '午': '오', '未': '미', '申': '신', '酉': '유', '戌': '술', '亥': '해' };
  var batch = function (ch) { ch = RD[ch] || ch; var c = ch.charCodeAt(0) - 0xAC00; return c >= 0 && c <= 11171 ? c % 28 !== 0 : null; };
  var pickJ = function (b, j) { return j[0] === '이' ? (b ? '이' : '가') : j[0] === '을' ? (b ? '을' : '를') : (b ? '과' : '와'); };
  var fixJ = function (t) { return String(t).replace(/(.)(\([^()]*\))(이\(가\)|을\(를\)|과\(와\))/g, function (m, ch, par, j) { var b = batch(ch); return b == null ? m : ch + par + pickJ(b, j); }).replace(/(.)(이\(가\)|을\(를\)|과\(와\))/g, function (m, ch, j) { var b = batch(ch); if (b == null) return m; return ch + (j[0] === '이' ? (b ? '이' : '가') : j[0] === '을' ? (b ? '을' : '를') : (b ? '과' : '와')); }); };
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
      var uq = function (a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); };
      return { pos: k, chung: uq(on.filter(function (r) { return r.type === '충'; }).map(function (r) { return r.name; })), other: uq(on.filter(function (r) { return /형|파|해|원진/.test(r.type); }).map(function (r) { return r.name; })) };
    });
    var states = ch.weights.seasonal && ch.weights.seasonal.states, season = states ? states[e].state : null;
    // 6판: 같은 오행 지지의 지장간과 십성(정기 기준) — 지지에 쌓인 힘이 어떤 십성으로 작용하는지
    var sameBr = POS.filter(function (k) { return P[k] && M.BR_EL[P[k].b] === e; }).map(function (k) { var b = P[k].b, H = M.HIDDEN[b], L = M.hiddenLabels(b); return { pos: k, ch: M.BR[b], main: M.STEM[M.mainHidden(b)], mainTg: M.tenGod(P.day.s, M.mainHidden(b)), hidden: H.map(function (h, i) { return { s: M.STEM[h[0]], el: M.stemEl(h[0]), tg: M.tenGod(P.day.s, h[0]), depth: L[i] }; }) }; });
    var mainRoots = roots.filter(function (r) { return r.depth === '정기'; });
    var sr = ch.saryeong || null, srOn = !!(sr && sr.stem != null && M.STEM.indexOf(sr.stem) >= 0 ? M.stemEl(M.STEM.indexOf(sr.stem)) === e : sr && typeof sr.stem === 'number' && M.stemEl(sr.stem) === e);
    var c = {
      force: pct >= O.forceMin,
      exposed: stems.length > 0,
      rooted: stems.length > 0 && roots.length > 0,
      season: season ? O.seasonOK.indexOf(season) >= 0 : M.BR_EL[P.month.b] === e,
      overlap: ganyeo.length > 0 || bStem.length > 0,   // 6판: 지지 병존은 branchRep 로 따로
      branchRep: bBranch.length > 0,
      monthCmd: M.stemEl(M.mainHidden(P.month.b)) === e,   // 월령 장악: 월지 정기가 이 오행
      saryeong: srOn,                                         // 사령: 절입 후 지금 월지에서 주도권을 쥔 지장간이 이 오행
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
    // 6판 지지 중심 경로: 천간 투출이 없어도 월령과 지지에서 주도하는 힘이면 후보(투출만으로 우선하지 않게)
    c.branchPath = !!O.branchPath && !c.exposed && e !== dEl && c.force && (c.monthCmd || c.season) && (mainRoots.length >= 2 || c.branchRep) && intactRoot;
    c.intact = c.exposed ? (intactStem && (roots.length ? intactRoot : false)) : c.branchPath;
    c.core = (c.force && c.exposed && c.rooted) || c.branchPath;
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
      sig: sigOf(c, st, g),
      sameBranches: sameBr, mainRoots: mainRoots, saryeong: srOn ? { day: sr.day, stem: typeof sr.stem === 'number' ? M.STEM[sr.stem] : sr.stem, tg: sr.tg } : null,
    };
  }

  // 6판 구조적 중요도(순위용, 같은 사실을 두 번 세지 않음): 월령(월지 정기 2 / 득령만 1) · 사령(월령 장악과 같으면 +0.5, 아니면 +1) · 격 오행(월령 장악과 겹치면 +1, 아니면 +2) · 켜진 상신 +1
  //   · 실제 작용 +1 · 세력 1위 +1 · 깊은 뿌리·지지 병존·천간 병존/간여지동 각 +0.5. 투간 자체는 가점 없음(후보 조건일 뿐). 월겁·건록(비겁)은 월령 무게 1
  function sigOf(c, st, g) {
    var v = c.monthCmd ? (g === 0 ? 1 : 2) : c.season ? 1 : 0;
    if (c.saryeong) v += c.monthCmd ? 0.5 : 1;
    if (st.some(function (x) { return x.kind === 'gyeok'; })) v += c.monthCmd ? 1 : 2;
    if (st.some(function (x) { return x.kind === 'sang'; })) v += 1;
    if (c.act) v += 1; if (c.top) v += 1;
    ['deepRoot', 'branchRep', 'overlap'].forEach(function (k) { if (c[k]) v += 0.5; });
    return v;
  }
  // 근거 줄 — 실제 글자·자리를 그대로 적는다(추적 가능)
  function reasons(f) {
    var out = [], c = f.cond;
    out.push((c.force ? '○ ' : '× ') + '세력 ' + f.pct + '% (' + f.rank + '위' + (c.force ? ', 평균 몫 20% 이상' : ', 평균 몫 20%에 못 미침') + ') · 표면 글자 ' + f.surface.total + '개(천간 ' + f.surface.stem + '·지지 ' + f.surface.branch + ')');
    out.push((c.exposed ? '○ ' : '× ') + (c.exposed ? '천간에 드러남(투간): ' + f.stems.map(function (s) { return POSK[s.pos] + '간 ' + s.ch + '(' + s.tg + ')'; }).join(' · ') : '천간에 드러나지 않음' + (f.isDayEl ? '(일간 말고 같은 오행 천간 없음)' : '')));
    out.push((f.roots.length ? '○ ' : '× ') + (f.roots.length ? '지지에 뿌리(통근): ' + f.roots.map(function (r) { return POSK[r.pos] + '지 ' + r.ch + '의 ' + r.depth + ' ' + r.hs; }).join(' · ') : '지지 속에 같은 오행 뿌리 없음'));
    if (f.season) out.push((c.season ? '○ ' : '· ') + '월령에서 ' + f.season + (c.season ? '(득령)' : ''));
    if (c.monthCmd) out.push('○ 월령 장악: 월지 정기가 ' + f.elK + ' — 명식의 계절 중심을 쥔 힘');
    if (c.saryeong && f.saryeong) out.push('○ 사령: 절입 ' + f.saryeong.day + '일째, 월지에서 ' + f.saryeong.stem + '(' + f.saryeong.tg + ')이 주도권을 쥠');
    if (f.sameBranches && f.sameBranches.length >= 2) out.push('○ 같은 오행 지지 ' + f.sameBranches.length + '개: ' + f.sameBranches.map(function (b) { return POSK[b.pos] + '지 ' + b.ch + '(정기 ' + b.main + ' ' + b.mainTg + ')'; }).join(' · '));
    if (c.branchPath) out.push('○ 지지 중심: 천간에 드러나지 않았지만 월령과 지지에서 주도하는 힘(투출 없이도 후보)');
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
  function rankCmp(O) { return function (a, b) { var ds = b.sig - a.sig; if (O.intactFirst && Math.abs(ds) < (O.intactGap != null ? O.intactGap : 99)) { var di = b.cond.intact - a.cond.intact; if (di) return di; } return ds || (b.pct - a.pct) || (a.el - b.el); }; }   // 묶임 우선은 중요도 차이가 intactGap 미만일 때만   // 6판: 개수 대신 구조적 중요도

  // ── weapon-selection: 원국 판정(시주 있는 그대로) ──
  function judge(M, ch, o) {
    var O = opt0(o);
    var pct = ch.weights.pct, order = [0, 1, 2, 3, 4].sort(function (a, b) { return (pct[b] - pct[a]) || (a - b); });
    var GK = null; try { GK = M.gyeokCore ? M.gyeokCore(ch) : null; } catch (e) { GK = null; }
    var TR = null; try { TR = G.MantraTenGodRoles && G.MantraTenGodRoles.analyze ? G.MantraTenGodRoles.analyze(M, ch) : null; } catch (e) { TR = null; }
    var facts = [0, 1, 2, 3, 4].map(function (e) { return elementFacts(M, ch, e, order.indexOf(e), O, GK, TR); });
    facts.forEach(function (f) { f.reasons = reasons(f).map(fixJ); });
    var core = facts.filter(function (f) { return f.cond.core; }).sort(rankCmp(O));
    var intact = core.filter(function (f) { return f.cond.intact; });
    var topIntactSig = intact.reduce(function (m, f) { return Math.max(m, f.sig); }, -99), heavyBound = O.intactGap != null ? core.filter(function (f) { return !f.cond.intact && f.sig >= topIntactSig + O.intactGap; }) : [];
    var pool = O.intactFirst ? (intact.length ? intact.concat(heavyBound).sort(rankCmp(O)) : core) : core, status, weapons = [], complex = [], near = [], log = [];
    // 2판 십신형 경로: 세력 structMin~20% · 투간 · 통근 · 온전함 · 구조 역할 — 개수가 아니라 격국·상신 구조로 두드러지는 십신. 핵심 후보 뒤에 둔다
    var structPath = O.structMin != null ? facts.filter(function (f) { return !f.cond.core && f.pct >= O.structMin && f.cond.exposed && f.roots.length && f.cond.intact && f.cond.structure; }).sort(rankCmp(O)) : [];
    structPath.forEach(function (f) { f.path = 'structure'; });
    var X = O.maxWeapons, nm = function (f) { return EL_K[f.el] + '(' + f.groupName + ')'; };
    log.push('핵심 조건(세력 ' + O.forceMin + '% 이상 · 투간 · 통근, 또는 지지 중심)을 갖춘 후보: ' + (core.length ? core.map(function (f) { return nm(f) + (f.cond.branchPath ? '(지지 중심)' : ''); }).join(' · ') : '없음'));
    if (heavyBound.length && intact.length) log.push('합·충으로 묶였지만 구조적 중요도가 ' + O.intactGap + '점 이상 높은 후보도 함께 비교함(다듬어 쓰는 주무기): ' + heavyBound.map(function (f) { return nm(f) + ' ' + f.sig + '점'; }).join(' · '));
    if (O.intactFirst && core.length && intact.length !== core.length) log.push(intact.length ? '합·충으로 묶이지 않은 후보만 먼저 봄: ' + intact.map(nm).join(' · ') : '모든 후보가 원국 안에서 합·충으로 묶여 있어 그대로 비교함(다듬어 쓰는 무기)');
    if (pool.length > 1) log.push('구조적 중요도: ' + pool.map(function (f) { return nm(f) + ' ' + f.sig + '점' + (f.plus.length ? '(' + f.plus.map(function (k) { return PLUS_K[k]; }).join('·') + ')' : ''); }).join(' / '));
    if (structPath.length) log.push('구조로 두드러지는 십신 후보(세력 ' + O.structMin + '~20%): ' + structPath.map(nm).join(' · '));
    if (!pool.length && structPath.length) { pool = structPath.slice(); log.push('핵심 조건을 갖춘 힘이 없어 구조 후보로 판정'); }
    if (!pool.length) { status = 'none'; log.push('핵심 조건을 갖춘 힘도, 구조로 두드러지는 십신도 없어 주무기를 정하지 않음'); }
    else if (pool.length > X && pool[X].sig === pool[X - 1].sig) {
      // 2번째와 3번째가 같은 조건 수 → 세력 %만으로 둘째를 고르지 않는다. 첫째가 앞서면 하나만, 첫째까지 같으면 복합형
      if (pool[0].sig > pool[1].sig) { weapons = [pool[0]]; status = 'single'; near = pool.slice(1).filter(function (f) { return f.sig === pool[1].sig; }).map(function (f) { return f.el; }); log.push('2순위 자리에 같은 조건 수의 후보가 ' + near.length + '개라 세력 %만으로 가르지 않고 1순위만 둠'); }
      else { status = 'complex'; complex = pool.filter(function (f) { return f.sig === pool[0].sig; }); log.push('후보 ' + complex.length + '개가 같은 조건 수로 서 있어 복합형'); }
    }
    else { weapons = pool.slice(0, X); if (weapons.length < X && structPath.length && weapons[0].path !== 'structure') { weapons.push(structPath[0]); log.push('2순위 자리에 구조로 두드러지는 십신 ' + nm(structPath[0]) + '을(를) 보조 주무기로 둠'); } status = weapons.length === 1 ? 'single' : 'dual'; if (weapons.length === 2) log.push('1순위 ' + nm(weapons[0]) + ', 2순위(보조) ' + nm(weapons[1]) + (weapons[0].sig === weapons[1].sig && weapons[1].path !== 'structure' ? ' — 중요도가 같아 세력 %로 순서만 정함' : weapons[1].path === 'structure' ? ' — 보조는 구조로 두드러지는 십신' : '')); }
    // 6판 보조 역량: 두 무기가 성립한 생(生) 작용(식신생재·재생관·관인상생 등)으로 이어지면, 생하는 쪽이 구조적으로 무겁거나 같을 때 생하는 쪽을 주무기, 받는 쪽을 '보조 역량'으로
    if (weapons.length === 2) {
      var a0 = weapons[0], a1 = weapons[1], link = ((TR && TR.interactions) || []).filter(function (o) { return o.status === 'on' && o.tone !== 'bad' && ((o.from === a0.group && o.to === a1.group) || (o.from === a1.group && o.to === a0.group)) && mod(o.to - o.from, 5) === 1; })[0];
      // 십성 작용 엔진에선 불성립이어도 격국 엔진이 켜진 상신(예: 재성으로 식신의 기운을 이어 줌(식신생재))으로 보면 같은 생 구조로 인정
      if (!link && GK) [[a0, a1], [a1, a0]].forEach(function (pr) { if (link) return; var s0 = pr[0], d0 = pr[1]; if (mod(d0.group - s0.group, 5) !== 1) return; var x = (GK.sang || []).filter(function (q) { return q.on && q.el === d0.el; })[0]; if (x && GK.el === s0.el) link = { from: s0.group, to: d0.group, name: ((/\(([^)]+)\)/.exec(x.text) || [])[1]) || ['비겁생식상', '식상생재', '재생관', '관인상생', '인성생비겁'][s0.group] }; });
      if (link) {
        var src = link.from === a0.group ? a0 : a1, dst = src === a0 ? a1 : a0;
        if (src.sig >= dst.sig || src.cond.monthCmd) {
          weapons = [src, dst]; dst.link = { kind: 'support', from: src.el, fromGroup: src.group, name: link.name };
          log.push(nm(src) + '이(가) ' + nm(dst) + '을(를) 낳는 ' + link.name + ' 구조라, ' + nm(src) + '을(를) 주무기로, ' + nm(dst) + '을(를) 이어 받는 보조 역량으로 둠');
        }
      }
    }
    weapons.forEach(function (w, i) {
      w.order = i + 1; w.level = w.plusN >= 2 ? 'clear' : 'plain'; w.shaky = !w.cond.intact; w.path = w.path || (w.cond.branchPath ? 'branch' : 'core');
      // 유형: 오행형(구조 역할 없음) · 십신형(구조 역할이 있고 오행 쪽 보탬이 없거나 십신 경로) · 복합형(오행 쪽 보탬과 구조 역할이 함께)
      w.tgEvidence = w.cond.structure || w.cond.act;   // 3판: 십신 근거 = 격국·상신 또는 성립한 실제 작용
      w.elemPlusN = w.plus.filter(function (k) { return k !== 'structure' && k !== 'act'; }).length;
      w.type = !w.tgEvidence ? 'element' : (w.path === 'structure' || w.elemPlusN === 0) ? 'tengod' : 'complex';
      w.partners = partnersOf(w, TR, facts);
      w.typeK = { element: '오행형', tengod: '십신형', complex: '복합형' }[w.type];
    });
    var hiddenPow = facts.filter(function (f) { return f.cond.force && !f.cond.exposed && f.roots.length; }).map(function (f) { return f.el; });
    var thinEdge = facts.filter(function (f) { return f.cond.exposed && f.roots.length && !f.cond.force; }).map(function (f) { return f.el; });
    log = log.map(fixJ);
    return { status: status, weapons: weapons, complex: complex, near: near, facts: facts, order: order, hiddenPow: hiddenPow, thinEdge: thinEdge, core: core.map(function (f) { return f.el; }), log: log, tr: TR ? true : false };
  }
  var PLUS_K = { season: '득령', overlap: '천간 병존·간여지동', top: '세력 1위', deepRoot: '깊은 뿌리', structure: '격국·상신', act: '실제 작용', monthCmd: '월령 장악', saryeong: '사령', branchRep: '지지 병존' };

  // ── 7판(2026-11-26) 탭 사이 일관성: 원국(십성·통근·투간)·오행·강약(세력·과다·부족·병존)·주무기 판정을 잇는다 ──
  //  선정 결과·계산식은 바꾸지 않는다. ① 기반 역량(주무기를 낳는 쪽)·주무기·보조 역량(이어 받는 쪽) 세 자리
  //  ② 오행·강약 탭의 판정(가장 강한 오행·과다/부족 패턴·강약)이 주무기와 어떤 관계인지(같음·낳음·이어 받음·누름·다스림)
  //  ③ 서로 모순되는 판정은 원인과 함께 '재검토' 표시(선정을 고치지 않음)
  var REL_OF = function (x, wEl) { return ['same', 'out', 'ctrled', 'ctrl', 'gen'][mod(x - wEl, 5)]; };   // x 가 주무기에 대해: 같음·주무기가 낳음·주무기가 다스림·주무기를 누름·주무기를 낳음
  function crossCheck(M, ch, A) {
    A = A || analyze(M, ch); if (!A || !A.ok) return null;
    var P = ch.pillars, dEl = M.stemEl(P.day.s), elOfG = function (g) { return mod(dEl + g, 5); };
    var TR = null; try { TR = G.MantraTenGodRoles && G.MantraTenGodRoles.analyze ? G.MantraTenGodRoles.analyze(M, ch) : null; } catch (e) { TR = null; }
    var pats = []; try { pats = G.MantraTenGodRoles && G.MantraTenGodRoles.agreePatterns ? G.MantraTenGodRoles.agreePatterns(M, ch) : (ch.patterns && ch.patterns.list || []); } catch (e) { pats = ch.patterns && ch.patterns.list || []; }
    var PAT_G = { '식상과다(설기)': 1, '재다신약': 2, '관살과다': 3, '인성과다': 4, '군겁쟁재': 0 }, NO_G = { '무비겁': 0, '무식상': 1, '무재': 2, '무관': 3, '무인성': 4 };
    var main = A.weapons[0] || null, out = { ok: true, main: main ? main.el : null, base: null, support: null, links: [], flags: [], level: 'ok', facts: {} };
    var pct = ch.weights.pct, top = A.order ? A.order[0] : A.strongest.el, grp = TR && TR.groups || [];
    out.facts = { top: top, topPct: Math.round(pct[top] * 10) / 10, zone: ch.strength && ch.strength.zone, patterns: pats.map(function (p) { return p.name; }), groupForce: grp.map(function (x) { return x.force; }) };
    if (!main) { out.level = 'none'; return out; }
    var wEl = main.el, wG = main.group, F = A.facts;
    var on = function (from, to) { return (TR && TR.interactions || []).filter(function (o) { return o.status === 'on' && o.from === from && o.to === to && o.tone !== 'bad'; })[0]; };
    // ① 기반 역량: 주무기를 낳는 오행(인성 쪽 묶음)이 세력 있거나(20%↑·강함/과다) 2순위 무기면
    var bEl = mod(wEl + 4, 5), bF = F[bEl], bG = mod(wG + 4, 5), bForce = grp[bG] && grp[bG].force;
    var bIsW = A.weapons[1] && A.weapons[1].el === bEl;
    if (bF && (bF.cond.force || /강함|과다/.test(bForce || '') || bIsW) && bF.pct >= 10) out.base = { el: bEl, group: bG, pct: bF.pct, force: bForce || '', act: (on(bG, wG) || {}).name || '', weapon: bIsW };
    // 보조 역량: 2순위가 생으로 이어 받으면 그대로, 아니면 주무기가 낳는 쪽 묶음에 성립한 생 작용이 있고 세력 10%↑
    var w1 = A.weapons[1];
    if (w1 && w1.link) out.support = { el: w1.el, group: w1.group, pct: w1.pct, act: w1.link.name, weapon: true };
    else { var sEl = mod(wEl + 1, 5), sG = mod(wG + 1, 5), sa = on(wG, sG); if (sa && F[sEl] && F[sEl].pct >= 10) out.support = { el: sEl, group: sG, pct: F[sEl].pct, act: sa.name, weapon: !!(w1 && w1.el === sEl) }; }
    // ② 오행·강약 판정 → 주무기와의 관계
    var seen = {};
    var addLink = function (kind, el, label, extra) { var r = REL_OF(el, wEl); var k = kind === 'lack' ? 'lack' + el : kind + el + label; if (seen[k]) return; seen[k] = 1;   /* 무○·○ 결핍이 같은 오행이면 한 줄 */ out.links.push({ kind: kind, el: el, group: mod(el - dEl, 5), rel: r, label: label, extra: extra || null }); };
    addLink('top', top, '가장 강한 오행', { pct: out.facts.topPct, why: A.strongest.why || null });
    pats.forEach(function (p) {
      if (PAT_G[p.name] != null) addLink('excess', elOfG(PAT_G[p.name]), p.name, { level: p.level, basis: p.basis });
      else if (NO_G[p.name] != null) addLink('lack', elOfG(NO_G[p.name]), p.name, null);
      else { var m = /^(목|화|토|금|수)\(.\) 결핍/.exec(p.name); if (m) addLink('lack', EL_K.indexOf(m[1]), p.name, null); }
    });
    if (out.facts.zone) addLink('zone', dEl, '일간 강약 ' + out.facts.zone, { weak: /신약|태약|극약/.test(out.facts.zone), strong: /신강|태강|극왕/.test(out.facts.zone) });
    // ③ 모순 검사(재검토 표시만)
    var flag = function (k, lv, cause) { out.flags.push({ k: k, level: lv, cause: cause }); };
    if (out.links.some(function (l) { return l.kind === 'lack' && l.el === wEl; })) flag('lackWeapon', 'review', '오행·강약 탭은 이 오행(십성)이 없다고 보는데 주무기로 잡혔어요 — 판정 데이터가 서로 어긋나요');
    if (main.pct < 10 && main.path !== 'structure') flag('weak', 'review', '세력 ' + main.pct + '%로 약한 오행이 핵심 경로로 잡혔어요');
    var tf = F[top];
    if (top !== wEl && tf && tf.cond.core && (!w1 || w1.el !== top) && !(out.base && out.base.el === top) && !(out.support && out.support.el === top)) { var tn = EL_K[top] + '(' + tf.groupName + ')';
      if (tf.sig > main.sig && !tf.cond.intact && main.cond.intact) { var gap = (CFG.intactGap != null ? CFG.intactGap : 99); if (tf.sig - main.sig >= gap) flag('topIntact', 'review', '가장 강한 ' + tn + '이(가) 구조적 중요도(' + tf.sig + '점)가 주무기(' + main.sig + '점)보다 ' + gap + '점 이상 높은데 합·충으로 묶여 밀렸어요 — 규칙과 어긋나 재검토가 필요해요'); else flag('topIntact', 'check', '가장 강한 ' + tn + '의 구조적 중요도(' + tf.sig + '점)가 주무기(' + main.sig + '점)보다 조금 높지만 차이가 ' + gap + '점 미만이고 원국에서 합·충으로 묶여 있어, 묶이지 않은 주무기를 먼저 뒀어요'); }
      else flag('topCore', 'check', '가장 강한 ' + tn + '도 핵심 조건을 갖췄지만 구조적 중요도(' + tf.sig + '점)가 주무기(' + main.sig + '점)보다 낮아 빠졌어요'); }
    if (w1 && w1.link && !on(mod(w1.group + 4, 5), w1.group) && !on(wG, w1.group)) flag('engineGap', 'note', '보조 역량의 ' + w1.link.name + '은(는) 격국 엔진의 상신으로 인정했고, 십성 작용 엔진에서는 성립하지 않았어요(두 엔진 판정 차이)');
    if (out.links.some(function (l) { return l.kind === 'excess' && l.el === wEl; }) && /용신/.test(main.role || '')) flag('excessYong', 'note', '과다로 판정된 오행이 용신으로도 잡혀 있어요(엔진 판정 그대로) — 강점이자 조절 대상으로 함께 읽어요');
    if (main.shaky) flag('shaky', 'note', '원국 탭의 주무기 천간·뿌리가 합·충으로 묶여 있어요 — 다듬어 쓰는 무기로 표시해요');
    out.level = out.flags.some(function (f) { return f.level === 'review'; }) ? 'review' : out.flags.some(function (f) { return f.level === 'check'; }) ? 'check' : 'ok';
    out.links.forEach(function (l) { l.fixJ = true; });
    return out;
  }
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
      weapons: j.weapons, complex: j.complex, near: j.near, facts: j.facts, order: j.order, hiddenPow: j.hiddenPow, thinEdge: j.thinEdge, core: j.core, log: j.log,
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
    strong: { n: '강하게 발현', k: 'on2', o: 0, y: 4 }, on: { n: '발현', k: 'on1', o: 1, y: 3 }, shaky: { n: '발현·흔들림', k: 'shk', o: 2, y: 3 },
    sup: { n: '보조·강화', k: 'sup', o: 3, y: 2 }, quiet: { n: '잠재·유지', k: 'qt', o: 4, y: 1 }, trim: { n: '제약·조정', k: 'trm', o: 5, y: 0 }, hit: { n: '제약·조정', k: 'hit', o: 6, y: 0 },
  };
  var KIND_K = { boost: '강화형', assist: '보조형', keep: '유지형', limit: '제약형' };   // 4판: 카드의 작용 유형(한 가지)
  var TYPE_K = { strengthen: '강화형', support: '지원형', release: '발산형', adjust: '조정형', partner: '조합형' };
  // ── 주무기 활용 유리도(5판, 2026-11-26): 강해진 주무기가 원국 전체에 유리하게 쓰이는가 — 발현 강도와 따로, 합산하지 않는다 ──
  //  기준: ① 주무기 오행의 통합 용신 역할(용신 +2·희신 +1·한신 0·구신 -1·기신 -2 — 엔진 ch.unified.roles 그대로)
  //        ② 일간 강약(ch.strength.zone)은 역할이 한신일 때만 가른다(용신 계산에 이미 들어 있어 두 번 세지 않음)
  //        ③ 이 운에서 생기는 관련 십성 작용: 쓰임처(설기)가 열림 +1 · 제화 +1 · 부담 조합 -1 · 많은 힘이 쓰임처 없이 더 세짐 -1
  //  등급: 2↑ 유리 · 1 대체로 유리 · 0 보통 · -1 조절 필요 · -2↓ 부담. 운세 흐름 등급(favor)과도 별개
  var UF_BASE = { '용신': 2, '희신': 1, '한신': 0, '구신': -1, '기신': -2 };
  var UF_LV = [{ min: 2, k: 'good', n: '유리' }, { min: 1, k: 'good2', n: '대체로 유리' }, { min: 0, k: 'mid', n: '보통' }, { min: -1, k: 'adj', n: '조절 필요' }, { min: -99, k: 'bad', n: '부담' }];
  function useFavor(ch, w, g, x) {
    var roles = ch.unified && ch.unified.roles || {}, R = String(roles[w.el] || '').replace(/^조건부 /, ''), base = UF_BASE[R] != null ? UF_BASE[R] : 0;
    var zone = ch.strength && ch.strength.zone || '', sS = /신강|태강|극왕/.test(zone), wS = /신약|태약|극약/.test(zone), helpG = g === 0 || g === 4, why = [];
    why.push({ k: 'role', v: UF_BASE[R] != null ? UF_BASE[R] : 0, role: R });
    var zv = 0; if (!R || R === '한신') zv = sS ? (helpG ? -1 : 1) : wS ? (helpG ? 1 : -1) : 0;
    why.push({ k: 'zone', v: zv, zone: zone, help: helpG, used: !R || R === '한신' });
    var t = base + zv;
    if (x.out && x.excess) { t++; why.push({ k: 'release', v: 1 }); }
    if (x.jehwa) { t++; why.push({ k: 'jehwa', v: 1 }); }
    if (x.ptBad) { t--; why.push({ k: 'badpair', v: -1, name: x.ptName }); }
    if (x.excess && x.grow && !x.out) { t--; why.push({ k: 'overheat', v: -1 }); }
    var lv = UF_LV.filter(function (o) { return t >= o.min; })[0];
    var yong = ch.unified && ch.unified.yong, dEl = null; try { dEl = mod(Math.floor(ch.pillars.day.s / 2), 5); } catch (e) { }
    return { k: lv.k, n: lv.n, t: t, role: R, zone: zone, why: why, yong: yong, yongGroup: yong != null && dEl != null ? mod(yong - dEl, 5) : null };
  }
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
    if (excess && (stemSame || rootAny) && !out) cons.push('주무기가 이 명식에서 이미 많은 쪽(' + wRole + ')이라, 더 세지면 과하게 쓰기 쉬워요');
    // 활용 방향: 운 천간의 일간 기준 십성 묶음(엔진 tenGod)
    var ds = ch.pillars.day.s, tg = M.tenGod(ds, p.s), tgG = Math.floor(M.TG.indexOf(tg) / 2);
    // ── 발현 판정 4판(2026-11-26): 오행 축 · 십성 축 · 합충(한 번만) → 주무기 유형별로 묶어 단계 결정 ──
    //  · 오행형: 오행 축만(유입·통근·투간·생극·합충) / 십신형: 십성 축만(같은 십신 투출·지지 통근·격국 역할·짝 작용, 단순 출현은 보조까지)
    //  · 복합형: 두 축을 따로 판정하고 강화·보완·상충을 본다. 합충형파해는 두 축에 나눠 넣지 않고 마지막에 한 번만 반영(중복 가감 없음)
    var bMain = M.mainHidden(p.b), bTg = M.tenGod(ds, bMain), bG = Math.floor(M.TG.indexOf(bTg) / 2), g = w.group;
    var monthEl = M.stemEl(M.mainHidden(ch.pillars.month.b));
    var hwaOk = function (r) { var sp = monthEl === r.el || mod(monthEl + 1, 5) === r.el; return sp && !rr.some(function (x) { return x !== r && x.kind === r.kind && /충/.test(x.type) && x.members.some(function (k) { return r.members.indexOf(k) >= 0; }); }); };
    var hwaTo = [], boundBad = [];
    bound.forEach(function (r) { if (hwaOk(r) && r.el === w.el) hwaTo.push(r); else boundBad.push({ r: r, hwa: hwaOk(r) }); });
    var guk = rr.filter(function (r) { return r.kind === 'branch' && /삼합|방합|육합|반합/.test(r.type) && r.el === w.el && r.members.indexOf('luck') >= 0 && !rr.some(function (x) { return x.kind === 'branch' && x.type === '충' && x.members.some(function (k) { return k !== 'luck' && r.members.indexOf(k) >= 0; }); }); });
    var gukFull = guk.some(function (r) { return /삼합|방합/.test(r.type); });
    // 오행 축
    var eAx = stemSame && rootAny ? 2 : (stemSame || rootDeep || gukFull) ? 1 : (gen || rootAny || guk.length || hwaTo.length) ? 0.5 : 0;
    var eDown = hitStem, capped = false;
    // 5판: 이미 강한 주무기가 다시 강해지는 것도 발현 강도에 그대로 반영한다(낮추지 않음). 과열 여부는 '활용 유리도'에서 따로 판정
    // 십성 축
    var exact = (w.tgs || []).indexOf(tg) >= 0, struct = (w.structure || []).length > 0, rootG = bG === g, rootGAny = rootAny;
    var ctrlG = mod(g + 3, 5), ptGood = pt && pt.tone !== 'bad', ptBad = pt && pt.tone === 'bad';
    var jehwa = w.type !== 'element' && tgG === ctrlG && ptGood;   // 누르는 십성이지만 원국에서 좋은 작용(예: 상관패인·식신제살)으로 성립 — 제약이 아니라 다듬어짐
    var tAx = tgG === g && rootGAny && (exact || struct) ? 2 : (tgG === g && (rootGAny || exact || struct)) || (rootG && struct) || (ptGood && rootGAny) ? 1 : (tgG === g || rootGAny || ptGood || tgG === mod(g + 4, 5)) ? 0.5 : 0;
    var tDown = ptBad || (tgG === ctrlG && !jehwa);
    // 합충(한 번만)
    var relDown = boundBad.length + clash.length + rootHit.length > 0;
    var T = w.type === 'element' ? 'element' : w.type === 'tengod' ? 'tengod' : 'complex';
    var up = function (x) { return x >= 1; };
    var base, axisRel = '';
    if (T === 'element') base = { v: eAx, down: eDown };
    else if (T === 'tengod') base = { v: tAx, down: tDown };
    else {
      // 두 축 모두 오름 → 둘 중 하나가 2면 강하게 / 한 축만 오름 → 발현 / 둘 다 받침 이하 → 보조 또는 잠잠
      var v = up(eAx) && up(tAx) ? (Math.max(eAx, tAx) === 2 ? 2 : 1) : (up(eAx) || up(tAx)) ? 1 : (eAx || tAx) ? 0.5 : 0;
      base ={ v: v, down: (eDown && !up(tAx)) || (tDown && !up(eAx)) || (eDown && tDown), split: (up(eAx) && tDown) || (up(tAx) && eDown) };
      axisRel = up(eAx) && up(tAx) ? 'reinforce' : (up(eAx) && tDown) || (up(tAx) && eDown) ? 'conflict' : (up(eAx) || up(tAx)) && (eAx >= 0.5 && tAx >= 0.5) ? 'complement' : (up(eAx) || up(tAx)) ? 'single' : (eDown || tDown) ? 'down' : (eAx && tAx) ? 'light' : (eAx || tAx) ? 'lightOne' : 'quiet';
    }
    var lv;
    if (base.v >= 1) lv = (relDown || base.down || base.split) ? 'shaky' : base.v === 2 ? 'strong' : 'on';
    else if (base.v === 0.5) lv = (relDown || base.down) ? 'quiet' : 'sup';
    else lv = (relDown || base.down) ? (excess ? 'trim' : 'hit') : 'quiet';
    if (T !== 'element' && jehwa && lv === 'hit') lv = 'quiet';   // 제화(좋은 누름)는 제약으로 세지 않는다
    var mixedSig = base.v >= 0.5 && (relDown || base.down) && lv === 'quiet';   // 받침과 누름이 엇갈려 단계를 올리지 않음
    var kind = /strong|on|shaky/.test(lv) ? 'boost' : lv === 'sup' ? 'assist' : lv === 'quiet' ? 'keep' : 'limit';
    // 지원·제약 근거(카드 ⑤⑥) — 있을 때만
    var sup = [], lim = [];
    if (stemSame) sup.push({ k: 'stem', x: '운의 천간 ' + M.STEM[p.s] + '이(가) 주무기와 같은 ' + w.elK + ' 기운이라 능력이 겉으로 드러나요' + (exact ? ' (원국에 드러난 ' + tg + '과 같은 십신)' : '') });
    if (rootAny) sup.push({ k: 'root', x: '운의 지지 ' + M.BR[p.b] + ' 속 ' + lab[rootIx] + ' ' + M.STEM[hid[rootIx][0]] + '이(가) 주무기에 ' + (rootDeep ? '깊은 ' : '얕은 ') + '뿌리를 대 줘요' });
    if (gen) sup.push({ k: 'gen', x: EL_K[genOf(w.el)] + ' 기운(' + GN[mod(g + 4, 5)] + ')이 ' + objJ(w.elK) + ' 낳아 받쳐 줘요' });
    if (out && !excess) sup.push({ k: 'out', x: EL_K[outOf(w.el)] + ' 기운(' + GN[mod(g + 1, 5)] + ')이 와서 주무기의 힘이 흘러 나갈 쓰임처가 생겨요' });
    if (out && excess) sup.push({ k: 'out', x: EL_K[outOf(w.el)] + ' 기운(' + GN[mod(g + 1, 5)] + ')이 많은 주무기의 힘을 쓰임처로 빼 줘 과열을 덜어요' });
    if (ptGood) sup.push({ k: 'partner', x: '운의 천간이 ' + GN[tgG] + '(' + tg + ') — 주무기와 짝을 이루는 ' + (pt.name || GN[tgG]) + ' 작용이 이 시기에 켜져요' + (jehwa ? '. 누르는 힘이지만 원국에서 좋은 작용으로 성립해, 지나친 힘을 다듬어 써요' : '') });
    if (struct && tgG === g) sup.push({ k: 'struct', x: '격국에서 맡은 역할(' + w.structure[0].text + ')이 운 천간에서 다시 드러나요' });
    hwaTo.forEach(function (r) { sup.push({ k: 'hwa', x: r.name + ' — 월령이 받쳐 합화가 성립해 주무기 기운이 더해져요' }); });
    guk.forEach(function (r) { sup.push({ k: 'guk', x: r.name + ' — 지지가 ' + (/삼합|방합/.test(r.type) ? '모여 ' : '절반 모여 ') + w.elK + ' 기운을 만들어 주무기를 받쳐요' }); });
    if (hitStem && !jehwa) lim.push({ k: 'ctrl', x: '운의 천간 ' + M.STEM[p.s] + '(' + EL_K[se] + ', ' + tg + ')이(가) ' + objJ(w.elK) + ' 눌러요 — ' + GN[ctrlG] + '이(가) ' + GN[g] + ' 기능을 제어해요' });
    if (ptBad) lim.push({ k: 'badpair', x: GN[tgG] + '(' + tg + ')이 들어와 ' + pt.name + ' 같은 부담 조합이 커져요' });
    boundBad.forEach(function (o) { lim.push({ k: 'bound', x: o.r.name + ' — ' + (o.hwa ? '합화가 성립해 원국의 주무기 천간이 다른 기운으로 바뀌어요' : '원국의 주무기 천간이 운과 합으로 묶여 기능이 둔해져요(합화 조건은 안 맞음)') }); });
    clash.forEach(function (r) { lim.push({ k: 'clash', x: r.name + ' — 원국의 주무기 천간이 운과 부딪혀 쓰는 방식이 흔들려요' }); });
    rootHit.forEach(function (r) { lim.push({ k: 'roothit', x: r.name + ' — 주무기의 뿌리 자리' + (r.members.indexOf('month') >= 0 ? '(월지)' : '') + '가 충을 받아 힘이 고르지 않아요' }); });
    if (excess && (stemSame || rootDeep) && !out) lim.push({ k: 'over', x: '주무기가 이 명식에서 이미 많은 쪽(' + wRole + ')이라, 이 시기엔 ' + GN[g] + ' 기능이 과하게 쓰여요' });
    sup.forEach(function (o) { o.x = fixJ(o.x); }); lim.forEach(function (o) { o.x = fixJ(o.x); }); s.forEach(function (o) { o.x = fixJ(o.x); }); cons = cons.map(fixJ);
    var uf = useFavor(ch, w, g, { excess: excess, out: out, jehwa: jehwa, ptBad: w.type !== 'element' && ptBad, ptName: pt && pt.name, grow: stemSame || rootDeep });
    var refs = rootOther.map(function (r) { return r.name; }), relNames = bound.concat(clash, rootHit, guk).map(function (r) { return r.name; }).concat(refs);
    return {
      el: w.el, level: lv, levelK: ACT[lv].n, key: ACT[lv].k, ord: ACT[lv].o, y: ACT[lv].y,
      types: types, typesK: types.map(function (t) { return TYPE_K[t]; }), signals: s, constraints: cons,
      use: { tg: tg, group: tgG, groupName: GN[tgG] }, partner: pt || null,
      roles: { stem: role(se), branch: role(be), weapon: wRole },
      // 4판 추가
      wType: T, kind: kind, kindK: KIND_K[kind], axis: { e: eAx, eDown: eDown, t: tAx, tDown: tDown, rel: axisRel, relDown: relDown, capped: capped, mixed: mixedSig, jehwa: jehwa, exact: exact },
      supports: sup, limits: lim, refs: refs, relNames: relNames, rootDepth: rootDeep ? '정기' : rootAny ? lab[rootIx] : '', stemSame: stemSame, gen: gen, out: out, hitStem: hitStem,
      letters: { stem: { ch: M.STEM[p.s], el: se, tg: tg, group: tgG, role: role(se) }, branch: { ch: M.BR[p.b], el: be, main: M.STEM[bMain], mainEl: M.stemEl(bMain), tg: bTg, group: bG, role: role(M.stemEl(bMain)) } },
      wGroup: g, wTgs: w.tgs || [], excess: excess, useFav: uf,
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

  var api = { VERSION: VERSION, CFG: CFG, ACT: ACT, KIND_K: KIND_K, crossCheck: crossCheck, TYPE_K: TYPE_K, PLUS_K: PLUS_K, analyze: analyze, luck: luck, timeline: timeline, favor: favor, readPair: readPair, judge: judge, sig: sig, _elementFacts: elementFacts };
  G.MantraWeapon = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
