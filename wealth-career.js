/* 직업·활동 적성 고도화 — 판정·조합 엔진 (브라우저·Node·Cloudflare Functions 공용)
   입력은 engine.js 의 원국 계산 결과(ch)뿐이다. 대운·세운·월운·일진은 읽지 않는다(‘운세 흐름’ 탭의 몫).
   파이프라인: 원국 값 → ① 십성의 힘(투출·통근) → ② 구조 11종 판정(성립/부분/관련/불성립/보류) → ③ 수익 유형 6종(근거·관문) →
              ④ 업무 환경 5축(범주) → ⑤ 직업 매칭 → ⑥ 취약점 → ⑦ 사전 문구 조합(조건·충돌 제거·중복 제거) → 추적(trace)
   AI 호출은 없다. 모든 문장은 데이터 계층(wealth-career-data*.js)의 사전 문구에서 조건으로 고른다.
   사용: MantraWealthCareer.build(Manse, chart, { name }) */
(function (G) {
  'use strict';
  var D = G.MantraWealthCareerData; if (!D || !D.PH) throw new Error('wealth-career-data.js 를 먼저 불러오세요');
  var VERSION = D.VERSION, REV = 0;

  var TG = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'];
  var TGK = { 비견: 'bigyeon', 겁재: 'geopjae', 식신: 'sikshin', 상관: 'sanggwan', 편재: 'pyeonjae', 정재: 'jeongjae', 편관: 'pyeongwan', 정관: 'jeonggwan', 편인: 'pyeonin', 정인: 'jeongin' };
  var GRPK = ['bi', 'sik', 'jae', 'gwan', 'in'], GRPN = ['비겁', '식상', '재성', '관성', '인성'];
  var GRP_OF = { 비견: 0, 겁재: 0, 식신: 1, 상관: 1, 편재: 2, 정재: 2, 편관: 3, 정관: 3, 편인: 4, 정인: 4 };
  var POSK = { year: '년', month: '월', day: '일', hour: '시' }, ROLEK = { main: '정기', mid: '중기', res: '여기' };
  var PAL = { year: 0.6, month: 1, day: 0.9, hour: 0.7 }, STW = { year: 0.8, month: 1, hour: 0.8 }, HW = { main: 1, mid: 0.55, res: 0.35 };
  var LV = ['absent', 'weak', 'mid', 'strong'], SC = { full: 1, part: 0.55, rel: 0.2, none: 0, hold: 0 }, SL = [0, 0.3, 0.65, 1];
  var ZONE = { 극약: 'xweak', 신약: 'weak', 중화: 'mid', 신강: 'strong', 극왕: 'xstrong', 극신강: 'xstrong', 극신약: 'xweak' };
  var BAN = /반드시|무조건|확실히|틀림없이|100%|보장|예언|천직|돈복이 없|가난|활짝|성공합니다|망합니다|절대/;
  var NOUN_ROLES = { skill: 1, method: 1, example: 1 };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var pct = function (v) { return Math.round(v); };

  // ───────────── 문구·직업·유형 저장소 (관리자 게시본을 덮어쓴다) ─────────────
  var CUR = null;   // { phrases:[], jobs:[], types:{} }
  function reset() {
    CUR = { phrases: D.PH.map(function (p) { return Object.assign({}, p, { when: p.when.slice(), unless: p.unless.slice() }); }), jobs: D.JOBS.map(function (j) { return Object.assign({}, j); }), types: {}, weak: {} };
    D.TYPES.forEach(function (t) { CUR.types[t.id] = { id: t.id, name: t.name, plain: t.plain, on: t.on !== false }; });
    D.WEAKNESSES.forEach(function (w) { CUR.weak[w.id] = { on: w.on !== false }; });
  }
  reset();
  // pub: { phrases:{id:{text,on,pri,when,unless,basis}}, custom:[phrase], jobs:{id:{…필드}}, customJobs:[job], types:{id:{on,name,plain}}, weak:{id:{on}} }
  function applyPublished(pub) {
    reset(); if (!pub || typeof pub !== 'object') { REV++; return false; }
    var byId = {}; CUR.phrases.forEach(function (p) { byId[p.id] = p; });
    Object.keys(pub.phrases || {}).forEach(function (id) { var p = byId[id], o = pub.phrases[id]; if (!p || !o) return; ['text', 'basis'].forEach(function (k) { if (typeof o[k] === 'string') p[k] = o[k]; }); if (typeof o.on === 'boolean') p.on = o.on; if (typeof o.pri === 'number') p.pri = o.pri; ['when', 'unless'].forEach(function (k) { if (Array.isArray(o[k])) p[k] = o[k].slice(); }); if (typeof o.tag === 'string') p.tag = o.tag; });
    (pub.custom || []).forEach(function (c) { if (c && c.id && !byId[c.id] && /^S[0-4P]$/.test(c.sec)) CUR.phrases.push({ id: c.id, sec: c.sec, cx: c.cx || 'all', role: c.role || 'note', tag: c.tag || c.role || c.id, when: c.when || [], unless: c.unless || [], basis: c.basis || '', pri: +c.pri || 1, text: c.text || '', v: 1, on: c.on !== false, custom: true }); });
    var jb = {}; CUR.jobs.forEach(function (j) { jb[j.id] = j; });
    Object.keys(pub.jobs || {}).forEach(function (id) { var j = jb[id], o = pub.jobs[id]; if (!j || !o) return; Object.keys(o).forEach(function (k) { if (k !== 'id') j[k] = o[k]; }); });
    (pub.customJobs || []).forEach(function (c) { if (c && c.id && !jb[c.id] && c.name && c.types && c.cats) CUR.jobs.push(Object.assign({ els: {}, env: {}, exposes: [], barrier: 'experience', how: '', income: '', caution: '', path: '', grp: 'custom', v: 1, on: true, custom: true }, c)); });
    Object.keys(pub.types || {}).forEach(function (id) { var t = CUR.types[id], o = pub.types[id]; if (!t || !o) return; if (typeof o.on === 'boolean') t.on = o.on; if (typeof o.name === 'string' && o.name.trim()) t.name = o.name.trim(); if (typeof o.plain === 'string' && o.plain.trim()) t.plain = o.plain.trim(); });
    Object.keys(pub.weak || {}).forEach(function (id) { if (CUR.weak[id] && pub.weak[id] && typeof pub.weak[id].on === 'boolean') CUR.weak[id].on = pub.weak[id].on; });
    REV++; return true;
  }

  // ───────────── 조건 평가 ─────────────
  var COND_RE = /^([A-Za-z0-9_.]+)(>=|<=|!=|!~|=|~)(.+)$/;
  function ordOf(key) { return key.indexOf('st.') === 0 ? D.STATE_ORD : key.indexOf('pw.') === 0 ? D.LEVEL_ORD : key === 'str.zone' ? D.ZONE_ORD : null; }
  function evalCond(c, f) {
    var m = COND_RE.exec(String(c).trim()); if (!m) return false;
    var key = m[1], op = m[2], alts = m[3].split('|'), v = f[key];
    if (op === '=') return alts.indexOf(String(v)) >= 0;
    if (op === '!=') return alts.indexOf(String(v)) < 0;
    if (op === '~' || op === '!~') { var has = Array.isArray(v) && alts.some(function (a) { return v.indexOf(a) >= 0; }); return op === '~' ? has : !has; }
    var ord = ordOf(key); if (!ord || !(v in ord) || !(alts[0] in ord)) return false;
    return op === '>=' ? ord[v] >= ord[alts[0]] : ord[v] <= ord[alts[0]];
  }
  // 조건 문자열 검증(관리자 입력용): 문법과 키 접두사만 확인한다
  var KEY_OK = /^(st\.(sikshin_jae|sanggwan_jae|jae_gwan|gwanin|salin|sikshin_sal|sanggwan_pain|sanggwan_gyeongwan|jaeda_sinyak|gwansal_honjap|bigeop_jae|saengjae)|pw\.(bigyeon|geopjae|sikshin|sanggwan|pyeonjae|jeongjae|pyeongwan|jeonggwan|pyeonin|jeongin|bi|sik|jae|gwan|in)|str\.zone|yong\.(differ|conflict|eokbu|johu)|chart\.hour|type\.(primary|sec|status|conf)|env\.(org|stab|team|role|work)|wk\.pick|wk\.[a-z]+)$/;
  function validateCond(c) {
    var m = COND_RE.exec(String(c || '').trim()); if (!m) return '조건 형식이 올바르지 않습니다: ' + c;
    if (!KEY_OK.test(m[1])) return '알 수 없는 조건 키입니다: ' + m[1];
    return null;
  }
  function allPass(list, f) { for (var i = 0; i < list.length; i++) if (!evalCond(list[i], f)) return false; return true; }
  function anyPass(list, f) { for (var i = 0; i < list.length; i++) if (evalCond(list[i], f)) return true; return false; }

  function validateText(text, role) {
    if (typeof text !== 'string' || !text.trim()) return '문구를 입력하세요';
    var t = text.trim(); if (t.length > 320) return '문구는 320자 이하로 입력하세요';
    if (BAN.test(t)) return '단정·과장 표현(반드시·무조건·보장·절대 등)은 사용할 수 없습니다';
    if (/\{(?!who\}|name\})[^}]*\}/.test(t)) return '사용할 수 없는 자리표시자입니다({who}, {name}만 허용)';
    if (!NOUN_ROLES[role]) {
      var ss = t.replace(/\{who\}|\{name\}/g, '').split(/(?<=[.!?])\s*/).filter(Boolean);
      for (var i = 0; i < ss.length; i++) if (!/(니다|세요|요|죠|까|겠습니다)[.!?]?$/.test(ss[i].trim()) && !/[”"’']$/.test(ss[i].trim())) return '존댓말(…합니다/…하세요/…예요)로 끝나야 합니다: “' + ss[i].slice(-12) + '”';
    }
    return null;
  }

  // ───────────── ① 십성의 힘 (투출·통근) ─────────────
  function scan(M, ch) {
    var d = ch.pillars.day.s, per = {}, hasHour = !!ch.pillars.hour;
    TG.forEach(function (t) { per[t] = { vis: 0, hid: 0, visAt: [], hidAt: [] }; });
    ['year', 'month', 'hour'].forEach(function (k) { var p = ch.pillars[k]; if (!p) return; var t = M.tenGod(d, p.s); per[t].vis += STW[k]; per[t].visAt.push(k); });
    ['year', 'month', 'day', 'hour'].forEach(function (k) {
      var p = ch.pillars[k]; if (!p) return; var h = M.HIDDEN[p.b];
      h.forEach(function (x, i) { var role = i === h.length - 1 ? 'main' : (i === 0 && h.length === 3 ? 'res' : 'mid'), t = M.tenGod(d, x[0]); per[t].hid += PAL[k] * HW[role]; per[t].hidAt.push(k + ':' + role); });
    });
    var monthMain = M.tenGod(d, M.mainHidden(ch.pillars.month.b)), lvl = {}, info = [];
    TG.forEach(function (t) {
      var p = per[t], touched = p.vis > 0, rooted = p.hid >= 0.5, v;
      if (touched && rooted) v = 3; else if (!touched && monthMain === t) v = 3; else if (touched || p.hid >= 0.9) v = 2; else if (p.hid > 0) v = 1; else v = 0;
      if (v > 1 && ch.weights.tgPct[t] < 3) v = 1;   // 비율 3% 미만의 흔적은 구조를 이루는 재료로 세지 않는다
      lvl[t] = v; p.touched = touched; p.rooted = rooted;
      var loc = p.visAt.map(function (k) { return POSK[k] + '간'; }).concat(p.hidAt.slice(0, 4).map(function (h) { var a = h.split(':'); return POSK[a[0]] + '지 ' + ROLEK[a[1]]; }));
      p.loc = loc.join('·') || '없음';
      info.push({ tg: t, key: TGK[t], level: LV[v], label: D.LEVEL_LABEL[LV[v]], touched: touched, rooted: rooted, loc: p.loc, pct: Math.round(ch.weights.tgPct[t] * 10) / 10 });
    });
    var gl = [0, 0, 0, 0, 0]; TG.forEach(function (t) { gl[GRP_OF[t]] = Math.max(gl[GRP_OF[t]], lvl[t]); });
    return { per: per, lvl: lvl, gl: gl, info: info, hasHour: hasHour };
  }

  // ───────────── ② 구조 11종 판정 ─────────────
  function judge(M, ch, P) {
    var L = function (t) { return P.lvl[t]; }, GL = P.gl, per = P.per, G = ch.weights.groups, T = ch.weights.tgPct;
    var zone = ZONE[ch.strength.zone] || 'mid', help = ch.strength.help, weakish = zone === 'weak' || zone === 'xweak', strongish = zone === 'strong' || zone === 'xstrong';
    var touched = function (t) { return per[t].touched; };
    var touchedAny = function (a) { return a.some(touched); };
    var d = function (t) { return t + '(' + per[t].loc + ')·' + D.LEVEL_LABEL[LV[L(t)]]; };
    var grp = function (g, names) { return GRPN[g] + ' ' + names.map(function (t) { return t + '(' + per[t].loc + ')'; }).join(' · ') + ' — ' + D.LEVEL_LABEL[LV[GL[g]]]; };
    var rels = ch.relations || [];
    var out = {};
    var set = function (id, state, ev, o) { o = o || {}; out[id] = { id: id, state: state, label: D.STATE_LABEL[state], score: SC[state], evidence: ev, miss: o.miss || [], notes: o.notes || [], flags: o.flags || {} }; };
    var steal = function (a) { return touched('편인') && L('편인') >= 2 && a <= 2; };

    // 식신생재 · 상관생재
    ['식신', '상관'].forEach(function (src) {
      var id = src === '식신' ? 'sikshin_jae' : 'sanggwan_jae', a = L(src), b = GL[2], ev = [d(src), grp(2, ['편재', '정재'])], miss = [], notes = [], flags = {};
      if (!a && !b) return set(id, 'none', ev, { miss: [src + '과 재성이 모두 없음'] });
      if (!a || !b) return set(id, 'rel', ev, { miss: [!a ? src + '이 원국에 없음' : '재성이 원국에 없음'], notes: [!a ? '재성만 있어 ' + src + '이 이어 주는 연결이 없습니다' : src + '만 있어 수입으로 이어 주는 재성이 없습니다'] });
      flags.steal = id === 'sikshin_jae' && steal(a); flags.burden = weakish && b >= 3;
      flags.block = id === 'sanggwan_jae' && touched('정관') && L('정관') >= 2;
      if (flags.steal) miss.push('편인이 식신을 가로막는 모양(도식)');
      if (flags.burden) miss.push('일간이 약한데 재성이 강해 감당이 벅참');
      if (flags.block) miss.push('정관과 부딪히는 모양(상관견관)이 함께 있음');
      if (a < 2) miss.push(src + '의 힘이 약함'); if (b < 2) miss.push('재성의 힘이 약함');
      if (Math.max(a, b) < 3) miss.push('어느 쪽도 투출과 통근을 함께 갖춘 강한 힘은 아님');
      var thin = T[src] < 8 || G[2] < 10; if (thin && a >= 2 && b >= 2) miss.push('비율이 낮음(' + src + ' ' + pct(T[src]) + '% · 재성 ' + pct(G[2]) + '%)');
      var full = a >= 2 && b >= 2 && Math.max(a, b) >= 3 && (touched(src) || touchedAny(['편재', '정재'])) && !flags.steal && !flags.burden && !flags.block && !thin;
      set(id, full ? 'full' : Math.min(a, b) < 2 ? 'rel' : 'part', ev, { miss: full ? [] : miss, notes: notes, flags: flags });
    });
    // 재생관
    (function () {
      var a = GL[2], b = GL[3], ev = [grp(2, ['편재', '정재']), grp(3, ['편관', '정관'])];
      if (!a && !b) return set('jae_gwan', 'none', ev);
      if (!a || !b) return set('jae_gwan', 'rel', ev, { miss: [!a ? '재성이 없음' : '관성이 없음'] });
      var breaker = GL[0] >= 3 && G[2] < G[0], honjap = touched('정관') && touched('편관'), miss = [];
      if (breaker) miss.push('비겁이 강해 재성을 나눠 가짐'); if (honjap) miss.push('정관·편관이 함께 드러나 관의 질서가 흐려짐');
      if (a < 2) miss.push('재성의 힘이 약함'); if (b < 2) miss.push('관성의 힘이 약함');
      var thin = G[2] < 12 || G[3] < 12; if (thin && a >= 2 && b >= 2) miss.push('비율이 낮음(재성 ' + pct(G[2]) + '% · 관성 ' + pct(G[3]) + '%)');
      var full = a >= 2 && b >= 2 && Math.max(a, b) >= 3 && !breaker && !honjap && !thin;
      set('jae_gwan', full ? 'full' : Math.min(a, b) < 2 ? 'rel' : 'part', ev, { miss: full ? [] : miss, flags: { breaker: breaker, honjap: honjap } });
    })();
    // 관인상생
    (function () {
      var a = L('정관'), b = GL[4], ev = [d('정관'), grp(4, ['편인', '정인'])];
      if (!a && !b) return set('gwanin', 'none', ev);
      if (!a || !b) return set('gwanin', 'rel', ev, { miss: [!a ? '정관이 없음' + (L('편관') ? '(편관만 있음 — 살인상생을 보세요)' : '') : '인성이 없음'] });
      var breaker = GL[2] >= 3, honjap = touched('편관') && L('편관') >= 2, gyeon = touched('상관') && L('상관') >= 2, miss = [];
      if (breaker) miss.push('재성이 강해 인성을 누름(재극인)'); if (honjap) miss.push('편관이 함께 드러나 정관의 질서가 흐려짐(관살혼잡)'); if (gyeon) miss.push('상관이 정관과 부딪힘');
      if (a < 2) miss.push('정관의 힘이 약함'); if (b < 2) miss.push('인성의 힘이 약함');
      var thin = T.정관 < 8 || G[4] < 10; if (thin && a >= 2 && b >= 2) miss.push('비율이 낮음(정관 ' + pct(T.정관) + '% · 인성 ' + pct(G[4]) + '%)');
      var full = a >= 2 && b >= 2 && Math.max(a, b) >= 3 && !breaker && !honjap && !gyeon && !thin;
      set('gwanin', full ? 'full' : Math.min(a, b) < 2 ? 'rel' : 'part', ev, { miss: full ? [] : miss, flags: { breaker: breaker, honjap: honjap, gyeon: gyeon } });
    })();
    // 살인상생: 편관(필요하면 정관 절반)의 압력 대비 인성의 비율까지 본다
    (function () {
      var a = L('편관'), b = GL[4], pressure = T.편관 + (touched('정관') && L('정관') >= 2 ? T.정관 * 0.5 : 0), ratio = pressure > 0 ? G[4] / pressure : 0;
      var ev = [d('편관'), grp(4, ['편인', '정인']), '인성 ' + pct(G[4]) + '% : 관살 압력 ' + pct(pressure) + '% (비율 ' + ratio.toFixed(2) + ')'];
      if (!a && !b) return set('salin', 'none', ev);
      if (!a || !b) return set('salin', 'rel', ev, { miss: [!a ? '편관이 없음' : '인성이 없음'] });
      var needIn = touchedAny(['편인', '정인']) || b >= 3, breaker = GL[2] >= 3, miss = [], notes = [];
      if (!needIn) miss.push('인성이 천간에 드러나지 않고 지장간에만 있어 압박을 받아 내는 힘이 제한적'); if (ratio < 0.5) miss.push('인성의 양이 관살의 압력에 비해 부족함'); if (breaker) miss.push('재성이 강해 인성을 누름');
      if (strongish) { miss.push('일간이 이미 강해 인성의 생이 꼭 필요하지는 않음'); }
      if (a < 2) miss.push('편관의 힘이 약함'); if (b < 2) miss.push('인성의 힘이 약함');
      var full = a >= 2 && b >= 2 && needIn && ratio >= 0.5 && !breaker && !strongish && T.편관 >= 8;
      set('salin', full ? 'full' : Math.min(a, b) < 2 ? 'rel' : 'part', ev, { miss: full ? [] : miss, notes: notes, flags: { ratio: ratio, needIn: needIn } });
    })();
    // 식신제살
    (function () {
      var a = L('식신'), b = L('편관'), ratio = T.편관 > 0 ? T.식신 / T.편관 : 0, ev = [d('식신'), d('편관'), '식신 ' + pct(T.식신) + '% : 편관 ' + pct(T.편관) + '% (비율 ' + ratio.toFixed(2) + ')'];
      if (!a && !b) return set('sikshin_sal', 'none', ev);
      if (!a || !b) return set('sikshin_sal', 'rel', ev, { miss: [!a ? '식신이 없음' : '편관이 없음'] });
      var st = steal(a), bound = false, boundWith = '';
      per['식신'].visAt.forEach(function (pos) { rels.forEach(function (r) { if (r.type === '천간합' && r.members && r.members.indexOf(pos) >= 0) { var other = r.members.filter(function (m) { return m !== pos; })[0], op = ch.pillars[other]; if (op && M.tenGod(ch.pillars.day.s, op.s) !== '편관') { bound = true; boundWith = M.tenGod(ch.pillars.day.s, op.s) + '(' + POSK[other] + '간)'; } } }); });
      var miss = [], notes = [];
      if (a < 2) miss.push('식신의 힘이 약함'); else if (!touched('식신')) miss.push('식신이 천간에 드러나지 않음'); if (ratio < 0.6) miss.push('식신의 양이 편관에 비해 적음'); if (ratio > 2.5) miss.push('식신이 편관보다 지나치게 많아 압박이 거의 남지 않음(제살태과)');
      if (st) miss.push('편인이 식신을 가로막는 모양(도식)'); if (bound) { miss.push('식신이 ' + boundWith + '과 합으로 묶여 제 역할을 다 못할 수 있음'); }
      var full = a >= 2 && touched('식신') && b >= 1 && ratio >= 0.6 && ratio <= 2.5 && !st && !bound && T.식신 >= 6;
      set('sikshin_sal', full ? 'full' : (a < 2 || b < 1) ? 'rel' : 'part', ev, { miss: full ? [] : miss, notes: notes, flags: { ratio: ratio, bound: bound, steal: st } });
    })();
    // 상관패인
    (function () {
      var a = L('상관'), b = GL[4], ev = [d('상관'), grp(4, ['편인', '정인'])];
      if (!a && !b) return set('sanggwan_pain', 'none', ev);
      if (!a || !b) return set('sanggwan_pain', 'rel', ev, { miss: [!a ? '상관이 없음' : '인성이 없음'] });
      var breaker = GL[2] >= 3, miss = [];
      if (breaker) miss.push('재성이 강해 인성을 누름'); if (strongish) miss.push('일간이 이미 강해 인성의 도움이 꼭 필요하지는 않음'); if (a < 2) miss.push('상관의 힘이 약함'); if (b < 2) miss.push('인성의 힘이 약함');
      var thin = T.상관 < 8 || G[4] < 10; if (thin && a >= 2 && b >= 2) miss.push('비율이 낮음(상관 ' + pct(T.상관) + '% · 인성 ' + pct(G[4]) + '%)');
      var full = a >= 2 && b >= 2 && Math.max(a, b) >= 3 && !breaker && !strongish && !thin;
      set('sanggwan_pain', full ? 'full' : Math.min(a, b) < 2 ? 'rel' : 'part', ev, { miss: full ? [] : miss });
    })();
    // 상관견관 (위험 구조: 성립 = 부딪힘이 실제로 드러나 있음)
    (function () {
      var a = L('상관'), b = L('정관'), ev = [d('상관'), d('정관')];
      if (!a && !b) return set('sanggwan_gyeongwan', 'none', ev);
      if (!a || !b) return set('sanggwan_gyeongwan', 'none', ev, { notes: ['한쪽만 있어 부딪히는 구조는 아님'] });
      var mitigated = GL[4] >= 2, both = touched('상관') && touched('정관') && a >= 2 && b >= 2;
      if (a < 2) return set('sanggwan_gyeongwan', 'rel', ev, { miss: ['상관의 힘이 약해 부딪힘이 크지 않음'] });
      if (!touched('상관') && !touched('정관')) return set('sanggwan_gyeongwan', 'rel', ev, { miss: ['두 글자 모두 천간에 드러나지 않고 지장간에만 있어 부딪힘이 겉으로 크지 않음'] });
      set('sanggwan_gyeongwan', both && !mitigated ? 'full' : 'part', ev, { notes: mitigated ? ['인성이 있어 상관의 날을 다듬는 완충 요소가 있습니다'] : [], miss: both ? [] : ['한쪽이 천간에 드러나지 않음'], flags: { mitigated: mitigated } });
    })();
    // 재다신약 (억부 판정에 의존 — 극약이면 종격 가능성 때문에 보류)
    (function () {
      var g2 = G[2], ev = ['재성 ' + pct(g2) + '% · 나를 돕는 힘 ' + help.toFixed(0) + '% (' + ch.strength.zone + ')'], st;
      if (help < 20 && g2 >= 35) return set('jaeda_sinyak', 'hold', ev, { notes: ['일간이 극히 약하고 재성이 매우 많아 종재격(재성을 따르는 격)일 가능성이 있습니다. 이 앱은 종격을 판정하지 않아 판정을 보류합니다'] });
      if (g2 >= 30 && help < 42) st = 'full'; else if ((g2 >= 22 && help < 48) || (g2 >= 30 && help < 50)) st = 'part'; else if (g2 >= 12 && help < 50) st = 'rel'; else st = 'none';
      set('jaeda_sinyak', st, ev);
    })();
    // 관살혼잡 (위험 구조)
    (function () {
      var a = L('정관'), b = L('편관'), ev = [d('정관'), d('편관')];
      if (!a || !b) return set('gwansal_honjap', 'none', ev, { notes: ['정관·편관이 함께 있지 않음'] });
      var st, notes = [], bound = rels.some(function (r) { return r.type === '천간합' && r.members && r.members.some(function (m) { var p = ch.pillars[m]; return p && ['정관', '편관'].indexOf(M.tenGod(ch.pillars.day.s, p.s)) >= 0; }); });
      if (touched('정관') && touched('편관')) st = 'full'; else if ((touched('정관') || touched('편관')) && Math.min(a, b) >= 2) st = 'part'; else st = 'rel';
      if (L('식신') >= 2 && touched('식신')) notes.push('식신이 관살을 다스리는 완화 요소(식신제살)가 있으나 완성도는 별도 구조 판정을 보세요');
      if (bound) notes.push('관성 글자가 천간합에 얽혀 있어 일부는 합으로 묶여 힘이 줄 수 있습니다(합화·합거 여부는 별도 판단)');
      if (GL[4] >= 2) notes.push('인성이 있어 관살의 압박을 일부 받아 내는 완화 요소가 있습니다');
      set('gwansal_honjap', st, ev, { notes: notes });
    })();
    // 비겁·재성
    (function () {
      var p0 = G[0], p2 = G[2], ev = ['비겁 ' + pct(p0) + '% : 재성 ' + pct(p2) + '%'], st;
      if (p0 >= 40 && p2 > 0 && p2 <= p0 * 0.4 && L('겁재') >= 2) st = 'full'; else if (p0 >= 32 && p2 > 0 && p2 <= p0 * 0.6) st = 'part'; else if (p0 >= 28) st = 'rel'; else st = 'none';
      set('bigeop_jae', st, ev, { notes: st === 'rel' && p2 <= 0.01 ? ['재성이 없어 나눠 가질 몫 자체가 원국에 드러나지 않습니다'] : [] });
    })();
    // 파생: 식신생재·상관생재 중 높은 단계
    var ord = D.STATE_ORD, best = ord[out.sikshin_jae.state] >= ord[out.sanggwan_jae.state] ? out.sikshin_jae : out.sanggwan_jae;
    out.__saengjae = best.state;
    // 시주 미상: 없는 요소가 시주에 있을 수 있으므로 불성립·관련 요소 존재는 확정하지 않는다
    if (!P.hasHour) D.STRUCTS.forEach(function (s) { var o = out[s.id]; if (o && (o.state === 'none' || o.state === 'rel')) { o.notes.push('시주를 몰라 시간·시지에 빠진 요소가 있을 수 있어 확정하지 않습니다(원래 판정: ' + o.label + ')'); o.state = 'hold'; o.label = D.STATE_LABEL.hold; o.score = 0; } else if (o && o.state === 'part') o.notes.push('시주에 따라 달라질 수 있습니다'); });
    return out;
  }

  // ───────────── ③ 수익 유형 6종 ─────────────
  function typeCalc(ch, P, st) {
    var GL = P.gl, L = function (t) { return P.lvl[t]; }, G = ch.weights.groups, zone = ZONE[ch.strength.zone] || 'mid';
    var sc = function (k) { return st[k].state === 'full' ? 1 : st[k].state === 'part' ? 0.55 : 0; }, S = function (n) { return SL[n]; };
    // 힘 = 단계(투출·통근)와 실제 비율의 평균: 단계만 보면 ‘보통’ 하나가 50%짜리 기운과 같아지는 것을 막는다
    var pw = function (g) { return 0.5 * SL[GL[g]] + 0.5 * clamp(G[g] / 30, 0, 1); };
    var bell = function (x) { return x < 12 ? x / 12 : x <= 28 ? 1 : Math.max(0, 1 - (x - 28) / 24); };
    var tch = function (ts) { return ts.some(function (t) { return P.per[t].touched; }) ? 1 : 0; };
    var gate = function (cond, via) { return { ok: !!cond, via: via }; };
    var st2 = function (k, min) { return D.STATE_ORD[st[k].state] >= (min === 'full' ? 3 : 2); };
    var res = {};
    var def = function (id, comps, pens, g) {
      var score = 0, ev = [], used = [];
      comps.forEach(function (c) { var v = clamp(c[1], 0, 1); score += c[2] * v; if (c[2] * v >= 0.08) ev.push(c[0]); used.push({ label: c[0], v: Math.round(v * 100) / 100, w: c[2] }); });
      pens.forEach(function (p) { if (p[1] > 0) { score -= p[1]; ev.push('감점: ' + p[0]); used.push({ label: '감점: ' + p[0], v: -p[1], w: 1 }); } });
      res[id] = { id: id, score: clamp(score, 0, 1), gate: g.ok, via: g.via, comps: used, evidence: ev, fullGate: g.full || false };
    };
    var steal = st.sikshin_jae.flags && st.sikshin_jae.flags.steal;
    def('prod', [['식상의 힘 ' + D.LEVEL_LABEL[LV[GL[1]]], pw(1), 0.50], ['식상→재성 구조 ' + D.STATE_LABEL[st.__saengjae], Math.max(sc('sikshin_jae'), sc('sanggwan_jae'), 0.8 * sc('sanggwan_pain')), 0.30], ['식상이 천간에 드러남', tch(['식신', '상관']), 0.10], ['식상의 균형(' + Math.round(G[1]) + '%)', bell(G[1]), 0.10]],
      [['편인이 식신을 가로막음', steal ? 0.15 : 0]], gate(GL[1] >= 2 || D.STATE_ORD[st.__saengjae] >= 2, [GL[1] >= 2 ? '식상 쓸 만한 힘' : '', D.STATE_ORD[st.__saengjae] >= 2 ? '식신생재/상관생재 ' + D.STATE_LABEL[st.__saengjae] : ''].filter(Boolean)));
    res.prod.fullGate = GL[1] >= 3 || st.__saengjae === 'full';
    var cap = st.jaeda_sinyak.state;
    def('biz', [['재성의 힘 ' + D.LEVEL_LABEL[LV[GL[2]]], pw(2), 0.40], ['식상→재성 구조 ' + D.STATE_LABEL[st.__saengjae], Math.max(sc('sikshin_jae'), sc('sanggwan_jae')), 0.25], ['비겁의 추진력(' + Math.round(G[0]) + '%)', GL[2] >= 2 ? bell(G[0]) : 0, 0.15], ['재성을 감당하는 힘', 1 - SC[cap === 'hold' ? 'part' : cap], 0.20]],
      [['비겁이 재성을 나눠 가짐', st.bigeop_jae.state === 'full' ? 0.2 : st.bigeop_jae.state === 'part' ? 0.08 : 0]], gate(GL[2] >= 2 || D.STATE_ORD[st.__saengjae] >= 2, [GL[2] >= 2 ? '재성 쓸 만한 힘' : '', D.STATE_ORD[st.__saengjae] >= 2 ? '식신생재/상관생재 ' + D.STATE_LABEL[st.__saengjae] : ''].filter(Boolean)));
    res.biz.fullGate = GL[2] >= 3 || st.__saengjae === 'full';
    var techVia = []; if (st2('sikshin_sal')) techVia.push('식신제살 ' + st.sikshin_sal.label); if (st2('salin')) techVia.push('살인상생 ' + st.salin.label); if (GL[4] >= 2 && GL[1] >= 2) techVia.push('인성·식상 모두 쓸 만한 힘');
    def('tech', [['식신제살 ' + st.sikshin_sal.label, sc('sikshin_sal'), 0.30], ['살인상생 ' + st.salin.label, sc('salin'), 0.20], ['인성(전문지식)의 힘 ' + D.LEVEL_LABEL[LV[GL[4]]], pw(4), 0.20], ['식상(기술 활용)의 힘 ' + D.LEVEL_LABEL[LV[GL[1]]], pw(1), 0.15], ['관살(책임·압박)을 활용할 재료 ' + D.LEVEL_LABEL[LV[GL[3]]], pw(3), 0.15]], [], gate(techVia.length, techVia));
    res.tech.fullGate = st.sikshin_sal.state === 'full' || st.salin.state === 'full';
    var orgVia = []; if (st2('gwanin')) orgVia.push('관인상생 ' + st.gwanin.label); if (st2('jae_gwan')) orgVia.push('재생관 ' + st.jae_gwan.label); if (st2('salin')) orgVia.push('살인상생 ' + st.salin.label); if (L('정관') >= 2 && GL[4] >= 2) orgVia.push('정관·인성 모두 쓸 만한 힘');
    def('org', [['관인상생 ' + st.gwanin.label, sc('gwanin'), 0.25], ['관성의 힘 ' + D.LEVEL_LABEL[LV[GL[3]]], pw(3), 0.25], ['인성의 힘 ' + D.LEVEL_LABEL[LV[GL[4]]], pw(4), 0.15], ['재생관 ' + st.jae_gwan.label, sc('jae_gwan'), 0.10], ['정관이 천간에 드러남', P.per['정관'].touched ? 1 : 0, 0.15], ['살인상생 ' + st.salin.label, sc('salin'), 0.10]],
      [['관살혼잡', st.gwansal_honjap.state === 'full' ? 0.2 : st.gwansal_honjap.state === 'part' ? 0.1 : 0], ['상관견관', st.sanggwan_gyeongwan.state === 'full' ? 0.15 : 0]], gate(orgVia.length, orgVia));
    res.org.fullGate = st.gwanin.state === 'full' || st.jae_gwan.state === 'full';
    def('edu', [['인성의 힘 ' + D.LEVEL_LABEL[LV[GL[4]]], pw(4), 0.35], ['식상(전달하는 힘) ' + D.LEVEL_LABEL[LV[GL[1]]], pw(1), 0.25], ['인성·식상의 균형', Math.min(pw(4), pw(1)), 0.25], ['정인의 힘 ' + D.LEVEL_LABEL[LV[L('정인')]], S(L('정인')), 0.15]], [], gate(GL[4] >= 2 && GL[1] >= 1, GL[4] >= 2 && GL[1] >= 1 ? ['인성 쓸 만한 힘', '식상 최소 존재'] : []));
    res.edu.fullGate = GL[4] >= 3 && GL[1] >= 2;
    var mean3 = (pw(0) + pw(1) + pw(2)) / 3;
    def('net', [['비겁의 힘 ' + D.LEVEL_LABEL[LV[GL[0]]], pw(0), 0.30], ['식상의 힘 ' + D.LEVEL_LABEL[LV[GL[1]]], pw(1), 0.25], ['재성의 힘 ' + D.LEVEL_LABEL[LV[GL[2]]], pw(2), 0.25], ['비겁·식상·재성의 고른 정도', mean3 * (GL[0] && GL[1] && GL[2] ? 1 : 0.6), 0.20]],
      [['비겁이 재성을 나눠 가짐', st.bigeop_jae.state === 'full' ? 0.2 : st.bigeop_jae.state === 'part' ? 0.08 : 0]], gate(GL[0] >= 2 && (GL[1] >= 1 || GL[2] >= 1), GL[0] >= 2 && (GL[1] >= 1 || GL[2] >= 1) ? ['비겁 쓸 만한 힘', '식상 또는 재성 존재'] : []));
    res.net.fullGate = GL[0] >= 3 && GL[1] >= 2 && GL[2] >= 2;
    // 관문(gate): 단계만이 아니라 실제 비율과 구조 판정을 요구한다 — 지장간의 약한 흔적만으로는 유형을 세우지 않는다
    var so = D.STATE_ORD, pc = function (g) { return Math.round(G[g]); }, sg = so[st.__saengjae] >= 2 ? '식신생재/상관생재 ' + D.STATE_LABEL[st.__saengjae] : '';
    var gt = function (id, via, full) { via = via.filter(Boolean); res[id].gate = via.length > 0; res[id].via = via; res[id].fullGate = !!full; };
    gt('prod', [GL[1] >= 3 ? '식상이 투출·통근을 갖춘 강한 힘' : '', sg, G[1] >= 24 && GL[1] >= 2 ? '식상 비율 ' + pc(1) + '%' : ''], GL[1] >= 3 && G[1] >= 20 || st.__saengjae === 'full');
    gt('biz', [GL[2] >= 3 ? '재성이 투출·통근을 갖춘 강한 힘' : '', sg, G[2] >= 24 && GL[2] >= 2 ? '재성 비율 ' + pc(2) + '%' : ''], GL[2] >= 3 && G[2] >= 20 || st.__saengjae === 'full');
    gt('tech', [so[st.sikshin_sal.state] >= 2 ? '식신제살 ' + st.sikshin_sal.label : '', so[st.salin.state] >= 2 ? '살인상생 ' + st.salin.label : '', G[4] >= 15 && G[1] >= 15 && GL[3] >= 2 && GL[4] >= 2 && GL[1] >= 2 ? '인성 ' + pc(4) + '% · 식상 ' + pc(1) + '% · 관성이 함께 쓸 만한 힘' : ''], st.sikshin_sal.state === 'full' || st.salin.state === 'full');
    gt('org', [so[st.gwanin.state] >= 2 ? '관인상생 ' + st.gwanin.label : '', so[st.jae_gwan.state] >= 2 ? '재생관 ' + st.jae_gwan.label : '', so[st.salin.state] >= 2 && st.salin.state === 'full' ? '살인상생 성립' : '', L('정관') >= 2 && GL[4] >= 2 && G[3] >= 20 ? '정관·인성이 함께 쓸 만한 힘(관성 ' + pc(3) + '%)' : ''], st.gwanin.state === 'full' || st.jae_gwan.state === 'full');
    gt('edu', [GL[4] >= 2 && G[4] >= 22 && GL[1] >= 1 ? '인성 ' + pc(4) + '% · 식상 존재' : '', so[st.sanggwan_pain.state] >= 2 ? '상관패인 ' + st.sanggwan_pain.label : ''], GL[4] >= 3 && GL[1] >= 2);
    gt('net', [GL[0] >= 2 && G[0] >= 22 && (GL[1] >= 2 || GL[2] >= 2) ? '비겁 ' + pc(0) + '% · 식상 또는 재성이 함께 쓸 만한 힘' : ''], GL[0] >= 3 && GL[1] >= 2 && GL[2] >= 2);
    return res;
  }
  var QUAL = 0.50, SECMIN = 0.48;
  function pickTypes(calc) {
    var ids = Object.keys(calc).filter(function (id) { return CUR.types[id] && CUR.types[id].on; });
    var rows = ids.map(function (id) { var c = calc[id]; return Object.assign({}, c, { name: CUR.types[id].name, plain: CUR.types[id].plain, qualified: c.gate && c.score >= QUAL }); }).sort(function (a, b) { return b.score - a.score; });
    var qual = rows.filter(function (r) { return r.qualified; });
    var primary = qual[0] || null, secondary = [];
    if (primary) secondary = qual.slice(1).filter(function (r) { return r.score >= SECMIN && r.score >= primary.score * 0.75; }).slice(0, 2);
    var tie = !!(primary && secondary.length && primary.score - secondary[0].score < 0.05);
    var conf = !primary ? 'low' : (primary.score >= 0.62 && primary.fullGate ? 'solid' : primary.score >= 0.5 ? 'mid' : 'low');
    return { rows: rows, primary: primary, secondary: secondary, status: primary ? 'ok' : 'insufficient', conf: conf, tie: tie, candidates: primary ? [] : rows.slice(0, 2) };
  }

  // ───────────── ④ 업무 환경 5축 (범주형) ─────────────
  var HI = 62, LO = 38;
  function leanOf(v) { var d = Math.abs(v - 50); return d >= 25 ? 'strong' : d >= 12 ? 'light' : 'flat'; }
  var LEAN_LABEL = { strong: '뚜렷하게', light: '약간', flat: '어느 쪽에도 크게 치우치지 않게' };
  function envAxes(M, ch, P, st) {
    var ws = M.careerProfile(ch).workStyle, F = M.extractNatalFeatures(ch), G = ch.weights.groups, T = ch.weights.tgPct, v = {};
    var adj = [];
    var o = 100 - ws.independence.value, oAdj = [];
    if (st.gwanin.state === 'full') oAdj.push(['관인상생 성립', 8]); else if (st.gwanin.state === 'part') oAdj.push(['관인상생 부분 성립', 4]);
    if (st.jae_gwan.state === 'full') oAdj.push(['재생관 성립', 4]);
    if (st.__saengjae === 'full') oAdj.push(['식신생재/상관생재 성립(독립 쪽)', -6]);
    oAdj.forEach(function (a) { o += a[1]; });
    if (st.gwansal_honjap.state === 'full') { o = 50 + (o - 50) * 0.8; oAdj.push(['관살혼잡으로 한쪽 쏠림이 완화됨', 0]); }
    o = clamp(o, 0, 100);
    var ax = {
      org: { v: o, hi: 'org', lo: 'ind', basis: ['관성 ' + pct(G[3]) + '% · 인성 ' + pct(G[4]) + '% 대 비겁 ' + pct(G[0]) + '% · 식상 ' + pct(G[1]) + '% (관성·인성이 많을수록 조직 쪽, 비겁·식상이 많을수록 독립 쪽)', ch.strength.zone + ' 원국(나를 돕는 힘 ' + ch.strength.help.toFixed(0) + '%)'].concat(oAdj.filter(function (a) { return a[1]; }).map(function (a) { return '구조 보정: ' + a[0]; })) },
      stab: { v: ws.stability.value, hi: 'stable', lo: 'change', basis: ['정관 ' + pct(T.정관) + '% · 정재 ' + pct(T.정재) + '% 대 상관 ' + pct(T.상관) + '% · 편재 ' + pct(T.편재) + '% · 겁재 ' + pct(T.겁재) + '% (앞쪽이 많을수록 안정, 뒤쪽이 많을수록 변화)', '조후 치우침 ' + (F.climateDev >= 0.5 ? '큼' : '작음') + ' · 원국 충·형 ' + F.relations.clash + '개'] },
      team: { v: clamp(ws.interaction.value + (P.gl[0] >= 2 ? 4 : 0), 0, 100), hi: 'team', lo: 'solo', basis: ['비겁·식상·재성 ' + pct(G[0] + G[1] + G[2]) + '% 대 인성·관성 ' + pct(G[3] + G[4]) + '% (사람·거래 쪽 십성이 많을수록 협업 쪽)', '비겁 ' + D.LEVEL_LABEL[LV[P.gl[0]]]] },
      role: { v: 0.6 * ws.execution.value + 0.4 * ws.creation.value, hi: 'tech', lo: 'plan', basis: ['식상·비겁·재성(몸으로 실행하는 십성) ' + pct(G[0] + G[1] + G[2]) + '% 대 인성·관성(분석·절차) ' + pct(G[3] + G[4]) + '%', '식상 ' + D.LEVEL_LABEL[LV[P.gl[1]]] + ' · 인성 ' + D.LEVEL_LABEL[LV[P.gl[4]]]] },
      work: { v: 0.6 * ws.creation.value + 0.4 * (100 - ws.stability.value), hi: 'create', lo: 'repeat', basis: ['식상·편인(새로 만드는 십성) ' + pct(T.식신 + T.상관 + T.편인) + '% 대 정관·정인(안정·절차) ' + pct(T.정관 + T.정인) + '%', '조후 치우침 ' + (F.climateDev >= 0.5 ? '큼' : '작음')] },
    };
    return D.AXES.map(function (a) {
      var x = ax[a.id], val = clamp(x.v, 0, 100), verdict = val >= HI ? x.hi : val <= LO ? x.lo : 'mix', lean = verdict === 'mix' ? 'flat' : leanOf(val);
      return { id: a.id, name: a.name, verdict: verdict, label: a.verdicts[verdict], lean: lean, leanLabel: verdict === 'mix' ? '어느 쪽에도 크게 치우치지 않음' : LEAN_LABEL[lean] + ' ' + a.verdicts[verdict] + ' 쪽', basis: x.basis, _v: val };
    });
  }

  // ───────────── ⑥ 취약점 ─────────────
  function weaknesses(ch, P, st, types, axes, facts) {
    var GL = P.gl, zone = ZONE[ch.strength.zone] || 'mid', weakish = zone === 'weak' || zone === 'xweak', S = function (n) { return SL[n]; };
    var env = {}; axes.forEach(function (a) { env[a.id] = a.verdict; });
    var q = {}; types.rows.forEach(function (r) { q[r.id] = r.qualified ? r.score : r.score * 0.5; });
    var aff = function (ids) { return Math.max.apply(null, ids.map(function (i) { return q[i] || 0; }).concat([0])); };
    var out = [], add = function (id, score, basis) { if (CUR.weak[id] && CUR.weak[id].on) out.push({ id: id, score: clamp(score, 0, 1), basis: basis }); };
    var sg = D.STATE_ORD[st.__saengjae];
    add('pricing', ((1 - S(GL[2])) * 0.5 + aff(['prod', 'tech', 'edu']) * 0.35 + (GL[1] >= 2 || GL[4] >= 2 ? 0.15 : 0)) * (sg >= 2 ? 0.55 : 1), ['재성 ' + D.LEVEL_LABEL[LV[GL[2]]], '식신생재/상관생재 ' + D.STATE_LABEL[st.__saengjae]]);
    add('sales', st.sanggwan_gyeongwan.state === 'full' ? 0.85 : st.sanggwan_gyeongwan.state === 'part' ? 0.6 : (GL[1] >= 2 && GL[2] <= 1 ? 0.4 : 0), ['상관견관 ' + st.sanggwan_gyeongwan.label, '식상 ' + D.LEVEL_LABEL[LV[GL[1]]] + ' · 재성 ' + D.LEVEL_LABEL[LV[GL[2]]]]);
    add('expansion', Math.max({ full: 0.9, part: 0.65, rel: 0.35, none: 0, hold: 0.3 }[st.jaeda_sinyak.state], ch.weights.groups[1] >= 30 && weakish ? 0.6 : 0, ch.weights.groups[2] >= 30 && ch.weights.groups[0] >= 30 ? 0.5 : 0), ['재다신약 ' + st.jaeda_sinyak.label, ch.strength.zone]);
    add('orgdep', (types.primary && types.primary.id === 'org') || env.org === 'org' ? (ch.weights.groups[3] >= 30 ? (weakish ? 0.7 : 0.55) : 0.3) : 0, ['관성 ' + pct(ch.weights.groups[3]) + '%', '조직 중심 성향']);
    add('solo', env.org === 'ind' && GL[4] <= 1 ? (GL[4] === 0 ? 0.75 : 0.65) : 0, ['독립 중심 성향', '인성 ' + D.LEVEL_LABEL[LV[GL[4]]]]);
    add('compete', Math.max({ full: 0.85, part: 0.6, rel: 0.3, none: 0, hold: 0.2 }[st.bigeop_jae.state], GL[0] >= 3 && GL[2] <= 1 ? 0.5 : 0), ['비겁·재성 경쟁 ' + st.bigeop_jae.label]);
    add('cashflow', GL[1] >= 2 && GL[2] <= 1 ? 0.45 + (P.lvl['겁재'] >= 2 ? 0.15 : 0) + (GL[2] === 0 ? 0.1 : 0) : 0, ['식상 ' + D.LEVEL_LABEL[LV[GL[1]]], '재성 ' + D.LEVEL_LABEL[LV[GL[2]]]]);
    add('distrib', GL[2] <= 1 ? aff(['tech', 'edu', 'prod']) * 0.6 + (GL[0] <= 1 ? 0.2 : 0) + 0.15 : 0, ['재성 ' + D.LEVEL_LABEL[LV[GL[2]]], '비겁 ' + D.LEVEL_LABEL[LV[GL[0]]]]);
    add('pressure', Math.min(1, { full: 0.9, part: 0.6, rel: 0.3, none: 0, hold: 0 }[st.gwansal_honjap.state] + (GL[3] >= 3 && weakish ? 0.15 : 0)), ['관살혼잡 ' + st.gwansal_honjap.label, '관성 ' + D.LEVEL_LABEL[LV[GL[3]]]]);
    add('stall', GL[4] >= 3 && GL[1] <= 1 ? 0.7 : GL[4] >= 3 && GL[1] === 2 ? 0.35 : 0, ['인성 ' + D.LEVEL_LABEL[LV[GL[4]]], '식상 ' + D.LEVEL_LABEL[LV[GL[1]]]]);
    out.sort(function (a, b) { return b.score - a.score; });
    var picked = out.filter(function (w) { return w.score >= 0.5; }).slice(0, 3);
    if (picked.length < 2 && CUR.weak.general && CUR.weak.general.on) {
      out.filter(function (w) { return w.score >= 0.3 && picked.indexOf(w) < 0; }).slice(0, 2 - picked.length).forEach(function (w) { picked.push(w); });
      if (picked.length < 2) picked.push({ id: 'general', score: 0.3, basis: ['뚜렷한 취약 구조가 적음'], general: true });
      if (picked.length < 2) out.filter(function (w) { return picked.indexOf(w) < 0; }).slice(0, 2 - picked.length).forEach(function (w) { w.low = true; picked.push(w); });
    }
    out.forEach(function (w) { w.level = w.score >= 0.75 ? 'high' : w.score >= 0.5 ? 'mid' : 'low'; });
    picked.forEach(function (w) { w.level = w.general ? 'low' : w.score >= 0.75 ? 'high' : w.score >= 0.5 ? 'mid' : 'low'; });
    return { all: out, picked: picked };
  }

  // ───────────── 조건 사실표 ─────────────
  // 오행 e 가 일간 기준 어느 십성 묶음인가: 같은 오행 비겁 · 내가 생함 식상 · 내가 극함 재성 · 나를 극함 관성 · 나를 생함 인성
  function elGroup(M, ch, e) { if (e == null) return 'none'; var dEl = M.stemEl(ch.pillars.day.s); return GRPK[((e - dEl) % 5 + 5) % 5]; }
  function baseFacts(M, ch, P, st) {
    var f = {}, y = ch.yongAll || {}, eo = y.eokbu, jo = y.johu;
    TG.forEach(function (t) { f['pw.' + TGK[t]] = LV[P.lvl[t]]; });
    GRPK.forEach(function (k, i) { f['pw.' + k] = LV[P.gl[i]]; });
    D.STRUCTS.forEach(function (s) { f['st.' + s.id] = st[s.id].state; }); f['st.saengjae'] = st.__saengjae;
    f['str.zone'] = ZONE[ch.strength.zone] || 'mid';
    var ge = eo && eo.applicable ? elGroup(M, ch, eo.yong) : 'none', gj = jo && jo.applicable ? elGroup(M, ch, jo.yong) : 'none';
    f['yong.eokbu'] = ge; f['yong.johu'] = gj;
    f['yong.differ'] = eo && jo && eo.applicable && jo.applicable && eo.yong !== jo.yong ? 'yes' : 'no';
    f['yong.conflict'] = eo && jo && jo.applicable && eo.roles && ['기신', '구신'].indexOf(eo.roles[jo.yong]) >= 0 ? 'yes' : 'no';
    f['chart.hour'] = P.hasHour ? 'known' : 'unknown';
    return f;
  }

  // ───────────── ⑦ 문구 조합 ─────────────
  var ctxTrace = null;
  function pickPhrases(sec, cx, role, facts, max, vars) {
    var cand = [];
    CUR.phrases.forEach(function (p) {
      if (p.sec !== sec || p.cx !== cx || (role && p.role !== role)) return;
      if (!p.on) { ctxTrace.excluded.push({ id: p.id, why: '비활성' }); return; }
      if (!allPass(p.when, facts)) { ctxTrace.excluded.push({ id: p.id, why: '적용 조건 불충족' }); return; }
      if (p.unless.length && anyPass(p.unless, facts)) { ctxTrace.excluded.push({ id: p.id, why: '제외 조건 해당' }); return; }
      cand.push(p);
    });
    var byTag = {}; cand.forEach(function (p) { var cur = byTag[p.tag]; if (!cur || p.pri > cur.pri) { if (cur) ctxTrace.excluded.push({ id: cur.id, why: '같은 tag(' + p.tag + ')의 더 높은 우선순위 문구가 선택됨' }); byTag[p.tag] = p; } else ctxTrace.excluded.push({ id: p.id, why: '같은 tag(' + p.tag + ')의 더 높은 우선순위 문구가 선택됨' }); });
    var list = Object.keys(byTag).map(function (k) { return byTag[k]; }).sort(function (a, b) { return b.pri - a.pri || (a.id < b.id ? -1 : 1); });
    if (max) { list.slice(max).forEach(function (p) { ctxTrace.excluded.push({ id: p.id, why: '표시 개수 초과' }); }); list = list.slice(0, max); }
    return list.map(function (p) { ctxTrace.phrases.push(p.id); return { id: p.id, text: fill(p.text, vars), basis: p.basis }; });
  }
  function fill(t, vars) { return String(t).replace(/\{who\}/g, vars.who).replace(/\{name\}/g, vars.name || ''); }
  var norm = function (s) { return String(s).replace(/[\s.,·()“”‘’'"!?、]/g, ''); };
  function bigrams(s) { var o = {}, n = norm(s); for (var i = 0; i < n.length - 1; i++) o[n.substr(i, 2)] = 1; return o; }
  function similar(a, b) { var A = bigrams(a), B = bigrams(b), ka = Object.keys(A), inter = 0; ka.forEach(function (k) { if (B[k]) inter++; }); var uni = ka.length + Object.keys(B).length - inter; return uni ? inter / uni : 0; }
  // 같은 의미 반복 제거: 앞에 이미 나온 문장과 거의 같은 문구는 뒤쪽에서 뺀다(추적에 남김)
  function dedupe(groups) {
    var seen = [];
    groups.forEach(function (g) {
      var arr = g.items, keep = arr.filter(function (it) { var dup = seen.some(function (s) { return norm(s) === norm(it.text) || similar(s, it.text) > 0.82; }); if (dup) { ctxTrace.deduped.push(it.id); return false; } seen.push(it.text); return true; });
      arr.length = 0; keep.forEach(function (x) { arr.push(x); });   // 결과 객체의 원본 배열을 직접 줄인다
    });
  }

  // ───────────── 전체 빌드 ─────────────
  var cache = new WeakMap();
  function build(M, ch, opts) {
    opts = opts || {}; var key = (opts.name || '') + '|' + REV, hit = cache.get(ch); if (hit && hit.key === key) return hit.res;
    ctxTrace = { phrases: [], excluded: [], deduped: [] };
    var P = scan(M, ch), st = judge(M, ch, P), calc = typeCalc(ch, P, st), types = pickTypes(calc), axes = envAxes(M, ch, P, st), facts = baseFacts(M, ch, P, st);
    var vars = { who: opts.name ? opts.name + '님은' : '이 원국은', name: opts.name || '' };
    facts['type.primary'] = types.primary ? types.primary.id : 'none'; facts['type.sec'] = types.secondary.map(function (r) { return r.id; }); facts['type.status'] = types.status; facts['type.conf'] = types.conf;
    axes.forEach(function (a) { facts['env.' + a.id] = a.verdict; });
    var wk = weaknesses(ch, P, st, types, axes, facts);
    facts['wk.pick'] = wk.picked.map(function (w) { return w.id; }); wk.all.forEach(function (w) { facts['wk.' + w.id] = w.level; });

    var res = { version: VERSION, rev: REV, name: opts.name || '', caution: D.CAUTION_STRUCT, facts: facts };
    res.intro = pickPhrases('S0', 'all', 'intro', facts, 1, vars);
    res.notes = ['yong_differ', 'yong_same', 'hour_unknown', 'jonggyeok'].map(function (r) { return pickPhrases('S0', 'all', r, facts, 1, vars)[0]; }).filter(Boolean);
    res.zone = { key: facts['str.zone'], label: ch.strength.zone, help: Math.round(ch.strength.help * 10) / 10 };
    var yn = ch.yongAll || {}, ELK = M.EL_K;
    res.yong = ['eokbu', 'johu'].map(function (k) { var y = yn[k]; return y && y.applicable ? { school: k, name: k === 'eokbu' ? '억부 용신' : '조후 용신', el: ELK[y.yong], group: GRPN[GRPK.indexOf(facts['yong.' + k])] || '', role: k === 'eokbu' ? '일하는 힘의 균형을 맞추는 역할' : '계절의 한난·조습을 맞추는 역할' } : { school: k, name: k === 'eokbu' ? '억부 용신' : '조후 용신', el: '', group: '', role: '해당 없음' }; });
    res.yongDiffer = facts['yong.differ'] === 'yes'; res.yongConflict = facts['yong.conflict'] === 'yes';
    res.power = P.info; res.pct = ch.weights.groups.map(function (v, i) { return { group: GRPN[i], pct: Math.round(v * 10) / 10 }; });
    res.structures = D.STRUCTS.map(function (s) { var o = st[s.id], pl = pickPhrases('SP', s.id, o.state, facts, 1, vars)[0]; return Object.assign({ name: s.name, polarity: s.polarity, desc: s.desc, plain: pl ? pl.text : '', plainId: pl ? pl.id : '' }, o); });

    // S1
    var s1 = { status: types.status, conf: types.conf, tie: types.tie, rows: types.rows.map(function (r) { return { id: r.id, name: r.name, score: Math.round(r.score * 100), qualified: r.qualified, gate: r.gate, via: r.via, evidence: r.evidence, comps: r.comps }; }) };
    var describe = function (r, primary) {
      var cx = r.id, f = Object.assign({}, facts), o = { id: r.id, name: r.name, plain: r.plain, score: Math.round(r.score * 100), evidence: r.evidence, via: r.via };
      o.head = pickPhrases('S1', cx, 'head', f, 1, vars); if (primary) { ['reason', 'scene', 'strength', 'risk', 'action', 'skill', 'method'].forEach(function (role) { o[role] = pickPhrases('S1', cx, role, f, role === 'reason' ? 3 : role === 'scene' ? 2 : 1, vars); }); } else { o.line = pickPhrases('S1', cx, 'sec', f, 1, vars); o.method = pickPhrases('S1', cx, 'method', f, 1, vars); o.skill = pickPhrases('S1', cx, 'skill', f, 1, vars); }
      return o;
    };
    s1.primary = types.primary ? describe(types.primary, true) : null; s1.secondary = types.secondary.map(function (r) { return describe(r, false); });
    s1.candidates = types.candidates.map(function (r) { return { id: r.id, name: r.name, plain: r.plain, score: Math.round(r.score * 100), evidence: r.evidence, missing: r.gate ? ['점수가 기준에 못 미침'] : ['관문 조건 미충족: ' + (r.id === 'tech' ? '식신제살·살인상생 부분 이상 또는 인성·식상 동시 존재' : r.id === 'org' ? '관인상생·재생관·살인상생 부분 이상 또는 정관·인성 동시 존재' : r.id === 'prod' ? '식상이 쓸 만한 힘이거나 식상생재 부분 이상' : r.id === 'biz' ? '재성이 쓸 만한 힘이거나 식상생재 부분 이상' : r.id === 'edu' ? '인성이 쓸 만한 힘이고 식상 존재' : '비겁이 쓸 만한 힘이고 식상 또는 재성 존재')] }; });
    s1.insufficient = types.primary ? [] : pickPhrases('S0', 'all', 'insufficient', facts, 1, vars);
    res.s1 = s1;

    // S2
    res.s2 = { intro: pickPhrases('S2', 'all', 'intro', facts, 1, vars), note: pickPhrases('S2', 'all', 'note', facts, 1, vars),
      axes: axes.map(function (a) { var cx = a.id + '.' + a.verdict; return { id: a.id, name: a.name, verdict: a.verdict, label: a.label, lean: a.lean, leanLabel: a.leanLabel, basis: a.basis, strength: pickPhrases('S2', cx, 'strength', facts, 1, vars), burden: pickPhrases('S2', cx, 'burden', facts, 1, vars), example: pickPhrases('S2', cx, 'example', facts, 1, vars) }; }),
      cohere: pickPhrases('S2', 'cohere', 'note', facts, 3, vars) };

    // S3
    res.s3 = jobs(M, ch, P, st, types, axes, facts, vars);

    // S4
    res.s4 = { intro: pickPhrases('S4', 'all', 'intro', facts, 1, vars), nowealth: pickPhrases('S4', 'all', 'nowealth', facts, 1, vars), few: pickPhrases('S4', 'all', 'few', facts, 1, vars),
      items: wk.picked.map(function (w) { var dm = D.WEAKNESSES.filter(function (x) { return x.id === w.id; })[0]; return { id: w.id, domain: dm ? dm.domain : '', level: w.level, levelLabel: w.general ? '기본 점검' : w.low ? '가능성은 낮지만 점검' : w.level === 'high' ? '뚜렷함' : '살펴볼 만함', basis: w.basis, title: pickPhrases('S4', w.id, 'title', facts, 1, vars), why: pickPhrases('S4', w.id, 'why', facts, 1, vars), scene: pickPhrases('S4', w.id, 'scene', facts, 1, vars), impact: pickPhrases('S4', w.id, 'impact', facts, 1, vars), fix: pickPhrases('S4', w.id, 'fix', facts, 1, vars) }; }),
      kind: 'potential', ranking: wk.all.map(function (w) { return { id: w.id, score: Math.round(w.score * 100), level: w.level }; }) };

    // 중복·반복 제거(섹션을 가로질러 처음 나온 문장만 남김)
    var order = [];
    var push = function (arr) { if (arr && arr.length) order.push({ items: arr }); };
    if (s1.primary) { ['head', 'reason', 'scene', 'strength', 'risk', 'action'].forEach(function (k) { push(s1.primary[k]); }); }
    res.s2.axes.forEach(function (a) { ['strength', 'burden', 'example'].forEach(function (k) { push(a[k]); }); });
    res.s4.items.forEach(function (it) { ['why', 'scene', 'impact', 'fix'].forEach(function (k) { push(it[k]); }); });
    dedupe(order);

    res.trace = { phrases: ctxTrace.phrases.filter(function (v, i, a) { return a.indexOf(v) === i; }), excluded: ctxTrace.excluded.slice(0, 400), deduped: ctxTrace.deduped, rules: { qual: QUAL, secMin: SECMIN, envHi: HI, envLo: LO } };
    res.issues = validate(res);
    cache.set(ch, { key: key, res: res }); return res;
  }

  // ───────────── ⑤ 직업 ─────────────
  var BAR_LABEL = { license: '자격·면허 필요/유리', experience: '경력·포트폴리오 중요', open: '자유 진입(경쟁·편차 큼)' };
  function jobs(M, ch, P, st, types, axes, facts, vars) {
    var prof = M.careerProfile(ch), cats = prof.byKey, env = {}; axes.forEach(function (a) { env[a.id] = a.verdict; });
    var bur = {}; prof.envs.forEach(function (e) { bur[e.env] = e.burden; });
    var W = {}; types.rows.forEach(function (r) { W[r.id] = types.status === 'insufficient' ? Math.min(r.score, 0.5) / 0.5 * 0.6 : (types.primary && r.id === types.primary.id ? 1 : types.secondary.some(function (s) { return s.id === r.id; }) ? 0.75 : Math.min(r.score, 0.4) / 0.4 * 0.35); });
    var qset = {}; if (types.primary) qset[types.primary.id] = 1; types.secondary.forEach(function (s) { qset[s.id] = 1; });
    var rows = CUR.jobs.filter(function (j) { return j.on !== false; }).map(function (j) {
      var tk = Object.keys(j.types || {}), tw = tk.reduce(function (s, k) { return s + j.types[k]; }, 0) || 1;
      var fitType = tk.reduce(function (s, k) { return s + j.types[k] * (W[k] || 0); }, 0) / tw;
      var ek = Object.keys(j.env || {}), fitEnv = ek.length ? ek.reduce(function (s, a) { return s + (env[a] === j.env[a] ? 1 : env[a] === 'mix' ? 0.6 : 0.15); }, 0) / ek.length : 0.6;
      var ck = Object.keys(j.cats || {}), cw = ck.reduce(function (s, k) { return s + j.cats[k]; }, 0) || 1;
      var fitCat = ck.reduce(function (s, k) { return s + j.cats[k] * clamp((cats[k] ? cats[k].score - 25 : 0) / 55, 0, 1); }, 0) / cw;
      var ex = (j.exposes || []).map(function (e) { return bur[e] || 0; }), pen = ex.length ? Math.max(0, (ex.reduce(function (a, b) { return a + b; }, 0) / ex.length - 35) / 65) * 0.12 : 0;
      var total = 0.40 * fitType + 0.25 * fitEnv + 0.35 * fitCat - pen;
      var linked = types.status === 'ok' ? tk.filter(function (k) { return qset[k] && j.types[k] >= 0.3; }) : tk;
      var bestType = (linked.length ? linked : tk).slice().sort(function (a, b) { return j.types[b] * (W[b] || 0) - j.types[a] * (W[a] || 0); })[0];
      return { job: j, linked: linked.length > 0, fitType: fitType, fitEnv: fitEnv, fitCat: fitCat, pen: pen, total: total, bestType: bestType, expBurden: (j.exposes || []).filter(function (e) { return (bur[e] || 0) >= 50; }) };
    }).sort(function (a, b) { return b.total - a.total; });
    var gateMin = 0.40, pool = rows.filter(function (r) { return r.linked && r.fitType >= gateMin; });
    if (pool.length < 5) pool = rows.filter(function (r) { return r.linked && r.fitType >= 0.28; });
    if (pool.length < 5) pool = pool.concat(rows.filter(function (r) { return pool.indexOf(r) < 0; }));
    var chosen = [], cnt = {}; pool.forEach(function (r) { if (chosen.length >= 8) return; var g = r.job.grp; if ((cnt[g] || 0) >= 2) return; cnt[g] = (cnt[g] || 0) + 1; chosen.push(r); });
    if (chosen.length < 5) pool.forEach(function (r) { if (chosen.length < 5 && chosen.indexOf(r) < 0) chosen.push(r); });
    var linkOf = function (t) { return t ? (pickPhrases('S3', 'link', t, facts, 1, vars)[0] || null) : null; };
    var structLines = function (t) { var map = { prod: ['sikshin_jae', 'sanggwan_jae', 'sanggwan_pain'], biz: ['sikshin_jae', 'sanggwan_jae', 'jaeda_sinyak'], tech: ['sikshin_sal', 'salin'], org: ['gwanin', 'jae_gwan', 'salin'], edu: ['sanggwan_pain'], net: ['bigeop_jae'] }; return (map[t] || []).filter(function (id) { return D.STATE_ORD[st[id].state] >= 2; }).map(function (id) { return D.STRUCTS.filter(function (s) { return s.id === id; })[0].name + ' ' + st[id].label; }); };
    var list = chosen.map(function (r, i) {
      var j = r.job, t = r.bestType, tn = CUR.types[t] ? CUR.types[t].name : '';
      var envMatch = Object.keys(j.env || {}).filter(function (a) { return env[a] === j.env[a]; }).map(function (a) { var ax = axes.filter(function (x) { return x.id === a; })[0]; return ax.label; });
      var envGap = Object.keys(j.env || {}).filter(function (a) { return env[a] !== 'mix' && env[a] !== j.env[a]; }).map(function (a) { var ax = axes.filter(function (x) { return x.id === a; })[0], D2 = D.AXES.filter(function (x) { return x.id === a; })[0]; return { axis: ax.name, mine: ax.label, job: D2.verdicts[j.env[a]] }; });
      var topCats = Object.keys(j.cats || {}).sort(function (a, b) { return j.cats[b] - j.cats[a]; }).slice(0, 2).map(function (k) { return { key: k, name: (M.CAREER_CONFIG.categories[k] || {}).name || k, score: cats[k] ? cats[k].score : 0 }; });
      var els = Object.keys(j.els || {}).sort(function (a, b) { return j.els[b] - j.els[a]; });
      return { rank: i + 1, id: j.id, name: j.name, grp: j.grp, type: t, typeName: tn, typeRole: types.primary && t === types.primary.id ? '대표' : types.secondary.some(function (s) { return s.id === t; }) ? '보조' : '참고',
        link: linkOf(t), structures: structLines(t), envMatch: envMatch, envGap: envGap, cats: topCats, els: els, how: j.how, income: j.income, caution: j.caution, path: j.path,
        barrier: j.barrier, barrierLabel: BAR_LABEL[j.barrier] || '', barrierText: (pickPhrases('S3', 'barrier', j.barrier, facts, 1, vars)[0] || {}).text || '', exposes: r.expBurden, custom: !!j.custom,
        _fit: { type: Math.round(r.fitType * 100), env: Math.round(r.fitEnv * 100), cat: Math.round(r.fitCat * 100), total: Math.round(r.total * 100) } };
    });
    return { intro: pickPhrases('S3', 'all', 'intro', facts, 1, vars), reality: pickPhrases('S3', 'all', 'reality', facts, 1, vars), weak: pickPhrases('S3', 'all', 'weak_basis', facts, 1, vars), jobs: list, pool: pool.length };
  }

  // ───────────── 일관성 검증 (섹션 간 모순·근거 부족) ─────────────
  function validate(res) {
    var iss = [], s1 = res.s1, p = s1.primary;
    var env = {}; res.s2.axes.forEach(function (a) { env[a.id] = a.verdict; });
    if (!p && s1.status === 'ok') iss.push('대표 유형이 없는데 status=ok');
    if (p && !s1.rows.filter(function (r) { return r.id === p.id; })[0].gate) iss.push('대표 유형이 관문(근거)을 통과하지 못함');
    if (p && p.id === 'org' && env.org === 'ind' && !res.s2.cohere.some(function (c) { return /org_ind/.test(c.id); })) iss.push('조직·관리형 대표인데 독립 중심 환경에 맥락 설명이 없음');
    if (p && p.id === 'biz' && env.org === 'org' && !res.s2.cohere.some(function (c) { return /biz_org/.test(c.id); })) iss.push('사업·유통형 대표인데 조직 중심 환경에 맥락 설명이 없음');
    var okTypes = {}; if (p) okTypes[p.id] = 1; s1.secondary.forEach(function (s) { okTypes[s.id] = 1; });
    if (s1.status === 'ok') res.s3.jobs.slice(0, 3).forEach(function (j) { if (!okTypes[j.type]) iss.push('상위 직업 ' + j.name + '의 연결 유형(' + j.type + ')이 대표·보조 유형이 아님'); });
    if (res.s3.jobs.length < 5) iss.push('추천 직업이 5개 미만');
    if (res.s4.items.length < 2) iss.push('취약점이 2개 미만');
    var all = []; ['head', 'reason', 'scene', 'strength', 'risk', 'action'].forEach(function (k) { if (p) (p[k] || []).forEach(function (x) { all.push(x.text); }); });
    all.forEach(function (t) { if (BAN.test(t)) iss.push('금지 표현 포함: ' + t.slice(0, 20)); });
    return iss;
  }

  // 관리자 화면용 읽기 전용 접근자
  function phrases() { return CUR.phrases.map(function (p) { return Object.assign({}, p); }); }
  function jobList() { return CUR.jobs.map(function (j) { return Object.assign({}, j); }); }
  function types() { return D.TYPES.map(function (t) { return Object.assign({}, t, CUR.types[t.id]); }); }
  function basePhrases() { return D.PH; }

  G.MantraWealthCareer = { VERSION: VERSION, build: build, applyPublished: applyPublished, validateText: validateText, validateCond: validateCond, evalCond: evalCond, phrases: phrases, jobs: jobList, types: types, basePhrases: basePhrases, baseJobs: function () { return D.JOBS; }, BAN: BAN, scan: scan, judge: judge, rev: function () { return REV; } };
})(typeof window !== 'undefined' ? window : globalThis);
