/* 지역 방위오행 × 개인 사주 해석 엔진 (브라우저·Node·Cloudflare Functions 공용)
   입력: engine.js 의 원국 계산 결과(ch) + region-data.js 의 방위 판정(tradition: 실제 방위각 → 8방위 → 후천팔괘 오행).
   원국·용신·점수는 바꾸지 않는다(읽기만). AI 호출 없음 — 모든 문장은 region-reading-data.js 의 사전 문구에서 조건으로 고른다.
   분석 층: ① 그 오행이 일간에게 무엇인가(십성) ② 억부 역할(신강·신약) ③ 조후 역할과 한난조습을 실제로 얼마나 바로잡는지
            ④ 월령에서의 힘(旺相休囚死) ⑤ 원국 안의 양(부족≠필요, 과다) ⑥ 상생상극 연쇄(키우는 기운·누르는 기운)
            ⑦ 억부·조후 충돌과 우선순위 ⑧ 종합 판정
   사용: MantraRegionReading.read(Manse, chart, tradition, { region, mode }) */
(function (G) {
  'use strict';
  var D = G.MantraRegionReadingData; if (!D || !D.PH) throw new Error('region-reading-data.js 를 먼저 불러오세요');
  var VERSION = D.VERSION, REV = 0;
  var EL5 = ['목', '화', '토', '금', '수'], GRPK = ['bi', 'sik', 'jae', 'gwan', 'in'], GRPN = ['비겁', '식상', '재성', '관성', '인성'];
  var ROLE = { 용신: 'yong', 희신: 'hee', 한신: 'han', 구신: 'gu', 기신: 'gi' }, ROLE_KO = { yong: '용신', hee: '희신', han: '한신', gu: '구신', gi: '기신', none: '해당 없음' };
  var VAL = { yong: 2, hee: 1, han: 0, gu: -1, gi: -2, none: 0 };
  var ZONE = { 극약: 'xweak', 태약: 'weak', 신약: 'weak', 중화: 'mid', 신강: 'strong', 태강: 'strong', 극왕: 'xstrong', 극신강: 'xstrong', 극신약: 'xweak' };
  var ZONE_ORD = { xweak: 0, weak: 1, mid: 2, strong: 3, xstrong: 4 };
  var ZONE_WORD = { xweak: '매우 약한', weak: '약한', mid: '균형에 가까운', strong: '강한', xstrong: '매우 강한' };
  // 오행 하나가 원국의 한난·조습 지표를 움직이는 방향(engine.js STEM_TEMP·STEM_HUM 의 오행별 평균): + 덥다/습하다
  var ELT = [0.5, 2, 0, -0.5, -2], ELH = [0, -2, 0, 0.5, 2];
  var SEASON = { 0: ['겨울', 4, 'winter'], 1: ['환절기', 2, 'trans'], 2: ['봄', 0, 'spring'], 3: ['봄', 0, 'spring'], 4: ['환절기', 2, 'trans'], 5: ['여름', 1, 'summer'], 6: ['여름', 1, 'summer'], 7: ['환절기', 2, 'trans'], 8: ['가을', 3, 'autumn'], 9: ['가을', 3, 'autumn'], 10: ['환절기', 2, 'trans'], 11: ['겨울', 4, 'winter'] };
  var MSTATE = { 0: 'wang', 1: 'sang', 4: 'hyu', 3: 'su', 2: 'sa' };
  var BAN = /반드시|무조건|확실히|틀림없이|100%|보장|예언|절대|운이 (트입니다|열립니다)|망합니다/;
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; }, sign = function (v) { return v > 0 ? 1 : v < 0 ? -1 : 0; };

  // ───────────── 규칙·문구 저장소 (관리자 게시본이 덮어쓴다) ─────────────
  var CUR = null;
  function reset() { CUR = { phrases: D.PH.map(function (p) { return Object.assign({}, p, { when: p.when.slice(), unless: p.unless.slice() }); }), rules: {} }; D.RULES.forEach(function (r) { CUR.rules[r.id] = r.v; }); }
  reset();
  function applyPublished(pub) {
    reset(); if (!pub || typeof pub !== 'object') { REV++; return false; }
    var byId = {}; CUR.phrases.forEach(function (p) { byId[p.id] = p; });
    Object.keys(pub.phrases || {}).forEach(function (id) { var p = byId[id], o = pub.phrases[id]; if (!p || !o) return; ['text', 'basis', 'tag'].forEach(function (k) { if (typeof o[k] === 'string') p[k] = o[k]; }); if (typeof o.on === 'boolean') p.on = o.on; if (typeof o.pri === 'number') p.pri = o.pri; ['when', 'unless'].forEach(function (k) { if (Array.isArray(o[k])) p[k] = o[k].slice(); }); });
    (pub.custom || []).forEach(function (c) { if (c && c.id && !byId[c.id] && /^R\.[a-z_]+/.test(c.id)) CUR.phrases.push({ id: c.id, sec: 'R', cx: 'all', role: c.role || c.id.split('.')[1], tag: c.tag || c.id, when: c.when || [], unless: c.unless || [], basis: c.basis || '', pri: +c.pri || 1, text: c.text || '', v: 1, on: c.on !== false, custom: true }); });
    D.RULES.forEach(function (r) { var v = pub.rules && pub.rules[r.id]; if (typeof v === 'number' && v >= r.min && v <= r.max) CUR.rules[r.id] = v; });
    REV++; return true;
  }
  var R = function (id) { return CUR.rules[id]; };

  // ───────────── 조건 평가 ─────────────
  var COND_RE = /^([A-Za-z0-9_.]+)(>=|<=|!=|!~|=|~)(.+)$/;
  var KEYS = ['el', 'grp', 'zone', 'eok', 'johu', 'johu.app', 'differ', 'verdict', 'prio', 'conflict', 'ctemp', 'chum', 'improve', 'worsen', 'mstate', 'season', 'lack', 'feeds', 'ctl', 'src', 'sup', 'lackbad', 'already', 'tone', 'near', 'center'];
  function evalCond(c, f) {
    var m = COND_RE.exec(String(c).trim()); if (!m) return false;
    var key = m[1], op = m[2], alts = m[3].split('|'), v = f[key];
    if (op === '=') return alts.indexOf(String(v)) >= 0;
    if (op === '!=') return alts.indexOf(String(v)) < 0;
    if (op === '>=' || op === '<=') { if (key !== 'zone' || !(v in ZONE_ORD) || !(alts[0] in ZONE_ORD)) return false; return op === '>=' ? ZONE_ORD[v] >= ZONE_ORD[alts[0]] : ZONE_ORD[v] <= ZONE_ORD[alts[0]]; }
    return false;
  }
  function validateCond(c) { var m = COND_RE.exec(String(c || '').trim()); if (!m) return '조건 형식이 올바르지 않습니다: ' + c; if (KEYS.indexOf(m[1]) < 0) return '알 수 없는 조건 키입니다: ' + m[1]; if ((m[2] === '>=' || m[2] === '<=') && m[1] !== 'zone') return '>= <= 는 zone 에만 쓸 수 있습니다'; if (m[2] === '~' || m[2] === '!~') return '~ 는 이 해석에서 쓰지 않습니다'; return null; }
  function validateText(text) {
    if (typeof text !== 'string' || !text.trim()) return '문구를 입력하세요';
    var t = text.trim(); if (t.length > 360) return '문구는 360자 이하로 입력하세요';
    if (BAN.test(t)) return '단정·과장 표현(반드시·무조건·보장·절대 등)은 사용할 수 없습니다';
    var bad = /\{([^}]*)\}/g, m; while ((m = bad.exec(t))) if (D.PLACEHOLDERS.indexOf(m[1]) < 0) return '사용할 수 없는 자리표시자입니다: {' + m[1] + '}';
    var ss = t.replace(/\{[^}]*\}/g, 'x').split(/(?<=[.!?])\s*/).filter(Boolean);
    for (var i = 0; i < ss.length; i++) if (!/(니다|세요|요|죠|까)[.!?]?$/.test(ss[i].trim().replace(/\([^)]*\)\s*[.!?]?$/, ''))) return '존댓말(…합니다/…하세요/…예요)로 끝나야 합니다: “' + ss[i].slice(-12) + '”';
    return null;
  }

  // ───────────── 원국 분석 (원국당 한 번) ─────────────
  var chartCache = new WeakMap();
  function chartCtx(M, ch) {
    var key = REV, hit = chartCache.get(ch); if (hit && hit.key === key) return hit.c;
    var st = ch.strength, F = M.extractNatalFeatures(ch), adv = M.methodAdvice(ch), eo = ch.yongAll.eokbu, jo = ch.yongAll.johu, jApp = !!(jo && jo.applicable !== false && jo.roles);
    var zone = ZONE[st.zone] || 'mid', dEl = M.stemEl(ch.pillars.day.s), mb = ch.pillars.month.b, se = SEASON[mb];
    var T = ch.climate.temp, H = ch.climate.hum, dev = F.climateDev;
    var sevE = R('minSev') + (1 - R('minSev')) * clamp(Math.abs(st.help - 50) / 30, 0, 1), sevJ = jApp ? clamp(dev, 0.2, 1) : 0;
    var c = { dEl: dEl, zone: zone, help: st.help, zoneName: st.zone, pct: ch.weights.pct, T: T, H: H, dev: dev, eo: eo, jo: jo, jApp: jApp, sevE: sevE, sevJ: sevJ, verdict: adv.verdict === '병행' ? 'both' : adv.verdict === '조후' ? 'johu' : 'eokbu', advWhy: adv.why,
      differ: jApp && eo.yong !== jo.yong, season: se[0], seasonEl: se[1], seasonKey: se[2], ctemp: T >= 0.5 ? 'hot' : T <= -0.5 ? 'cold' : 'none', chum: H >= 0.6 ? 'wet' : H <= -0.6 ? 'dry' : 'none' };
    c.climWord = [c.ctemp === 'hot' ? '더운' : c.ctemp === 'cold' ? '추운' : '', c.chum === 'dry' ? '건조한' : c.chum === 'wet' ? '습한' : ''].filter(Boolean).join('·') || '한난·조습';
    chartCache.set(ch, { key: key, c: c }); return c;
  }
  var roleOf = function (c, school, el) { var t = school === 'e' ? c.eo : c.jo; if (school === 'j' && !c.jApp) return 'none'; return t && t.roles && ROLE[t.roles[el]] || 'none'; };

  // ───────────── 한 방위 오행의 판정 ─────────────
  function analyzeElement(M, ch, el, mode, tr) {
    var c = chartCtx(M, ch), pct = c.pct, base = mode === 'eokbu' || mode === 'johu' || mode === 'both' ? mode : c.verdict;
    var eokR = roleOf(c, 'e', el), johuR = roleOf(c, 'j', el), E = VAL[eokR] * c.sevE, J = VAL[johuR] * c.sevJ;
    var grp = GRPK[((el - c.dEl) % 5 + 5) % 5];
    // 한난조습: 방위 오행이 원국 지표를 얼마나 움직이는가(양수=바로잡음)
    var k = R('climateStep') / 2, gT = Math.abs(c.T) - Math.abs(c.T + k * ELT[el]), gH = Math.abs(c.H) - Math.abs(c.H + k * ELH[el]);
    var useT = Math.abs(c.T) >= 0.3, useH = Math.abs(c.H) >= 0.4, impT = useT && gT > 0.05, impH = useH && gH > 0.05, worT = useT && gT < -0.05, worH = useH && gH < -0.05;
    var nGain = clamp((useT ? gT / 1.2 : 0) + (useH ? gH / 1.6 : 0), -1, 1);
    var improve = impT && impH ? 'both' : impT ? 'temp' : impH ? 'hum' : 'none', worsen = worT && worH ? 'both' : worT ? 'temp' : worH ? 'hum' : 'none';
    // 충돌·우선순위
    var conflict = c.jApp && sign(E) * sign(J) < 0 && Math.abs(E) >= R('conflictMin') && Math.abs(J) >= R('conflictMin'), prio = base;
    if (conflict && base === 'both') { var mg = c.sevJ - c.sevE; prio = Math.abs(mg) < R('prioMargin') ? 'both' : mg > 0 ? 'johu' : 'eokbu'; }
    var wE = prio === 'eokbu' ? (conflict ? 1.3 : 1) : prio === 'johu' ? (conflict ? 0.5 : 0.4) : 1, wJ = prio === 'johu' ? (conflict ? 1.3 : 1) : prio === 'eokbu' ? (conflict ? 0.5 : 0.4) : 1;
    if (!c.jApp) wJ = 0;
    // 상생상극 연쇄: 그 오행이 키우는 기운(생)·누르는 기운(극)이 이 사주에서 도움인지 부담인지
    var nv = function (e) { return wE * VAL[roleOf(c, 'e', e)] * c.sevE + wJ * VAL[roleOf(c, 'j', e)] * c.sevJ; };
    var gen = (el + 1) % 5, ctl = (el + 2) % 5, genBy = (el + 4) % 5, ctlBy = (el + 3) % 5;
    var feeds = nv(gen) > 0.3 ? 'good' : nv(gen) < -0.3 ? 'bad' : 'none', ctlF = nv(ctl) < -0.3 ? 'helps' : nv(ctl) > 0.3 ? 'harms' : 'none';
    var src = pct[genBy] >= R('lackPct') ? 'rooted' : 'none', sup = pct[ctlBy] >= R('overPct') ? 'suppressed' : 'none';
    var Rel = R('wRel') * ((feeds === 'good' ? 1 : feeds === 'bad' ? -1 : 0) + (ctlF === 'helps' ? 1 : ctlF === 'harms' ? -1 : 0)), Cl = R('wClimate') * c.dev * nGain;
    // 월령
    var mstate = MSTATE[((el - c.seasonEl) % 5 + 5) % 5], sf = mstate === 'wang' || mstate === 'sang' ? R('seasonBoost') : mstate === 'su' || mstate === 'sa' ? R('seasonDamp') : 1;
    var raw = wE * E + wJ * J + Cl + Rel, net = raw * sf;
    var lack = pct[el] < 1 ? 'absent' : pct[el] < R('lackPct') ? 'low' : pct[el] >= R('overPct') ? 'over' : 'ok';
    var eokBad = (eokR === 'gi' || eokR === 'gu') && johuR !== 'yong' && johuR !== 'hee';   // 억부상 부담인데 조후가 받쳐 주지 않음
    var lackbad = (lack === 'absent' || lack === 'low') && (net < 0 || eokBad) ? 'yes' : 'no', already = lack === 'over' && net > 0 && (eokR === 'yong' || eokR === 'hee' || johuR === 'yong' || johuR === 'hee') ? 'yes' : 'no';
    var tone = net >= R('toneGood') ? 'good' : net >= R('toneMild') ? 'mildgood' : net <= -R('toneGood') ? 'caution' : net <= -R('toneMild') ? 'mildcaution' : 'neutral';
    if (conflict && prio === 'both' && Math.abs(net) < R('toneGood')) tone = 'mixed';
    if (eokBad && (tone === 'good' || tone === 'mildgood')) tone = 'neutral';   // 한난조습·상생 가산이 있어도 억부 기신·구신을 조후 없이 ‘맞는 편’으로 올리지 않는다
    return { el: el, elName: EL5[el], grp: grp, eokR: eokR, johuR: johuR, E: E, J: J, Cl: Cl, Rel: Rel, sf: sf, raw: raw, net: net, tone: tone, conflict: conflict, prio: prio, base: base, wE: wE, wJ: wJ, improve: improve, worsen: worsen, feeds: feeds, ctl: ctlF, src: src, sup: sup, mstate: mstate, lack: lack, lackbad: lackbad, already: already, pctEl: pct[el], genEl: EL5[gen], ctlEl: EL5[ctl] };
  }
  // 지도·후보 목록에서 쓰는 요약: 오행별 종합 판정
  function toneOfElement(M, ch, elName, mode) { var i = EL5.indexOf(elName); if (i < 0) return null; var a = analyzeElement(M, ch, i, mode); return { tone: a.tone, net: a.net, conflict: a.conflict }; }

  // ───────────── 문구 조합 ─────────────
  var trace;
  function pick(role, facts, max, vars, opt) {
    var cand = [];
    CUR.phrases.forEach(function (p) {
      if (p.role !== role) return;
      if (opt && opt.skipNone && /\.none$/.test(p.tag)) return;
      if (opt && opt.onlyNone && !/\.none$/.test(p.tag)) return;
      if (!p.on) { trace.excluded.push({ id: p.id, why: '비활성' }); return; }
      for (var i = 0; i < p.when.length; i++) if (!evalCond(p.when[i], facts)) { trace.excluded.push({ id: p.id, why: '적용 조건 불충족: ' + p.when[i] }); return; }
      for (var j = 0; j < p.unless.length; j++) if (evalCond(p.unless[j], facts)) { trace.excluded.push({ id: p.id, why: '제외 조건 해당: ' + p.unless[j] }); return; }
      cand.push(p);
    });
    var by = {}; cand.forEach(function (p) { var cur = by[p.tag]; if (!cur || p.pri > cur.pri) { if (cur) trace.excluded.push({ id: cur.id, why: '같은 tag(' + p.tag + ')의 더 높은 우선순위 문구가 선택됨' }); by[p.tag] = p; } else trace.excluded.push({ id: p.id, why: '같은 tag(' + p.tag + ')의 더 높은 우선순위 문구가 선택됨' }); });
    var list = Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return b.pri - a.pri || (a.id < b.id ? -1 : 1); });
    if (max) { list.slice(max).forEach(function (p) { trace.excluded.push({ id: p.id, why: '표시 개수 초과' }); }); list = list.slice(0, max); }
    return list.map(function (p) { trace.phrases.push(p.id); return { id: p.id, text: fill(p.text, vars), basis: p.basis }; });
  }
  function fill(t, v) { return String(t).replace(/\{([A-Za-z]+)\}/g, function (m, k) { return v[k] != null ? v[k] : ''; }); }

  // tr: region-data 의 tradition(r) 결과 { direction, element, near, deg, refPoint }
  function read(M, ch, tr, opts) {
    opts = opts || {}; trace = { phrases: [], excluded: [] };
    var el = EL5.indexOf(tr.element); if (el < 0) return null;
    var c = chartCtx(M, ch), a = analyzeElement(M, ch, el, opts.mode, tr), center = tr.direction === '중앙';
    var facts = { el: tr.element, grp: a.grp, zone: c.zone, eok: a.eokR, johu: a.johuR, 'johu.app': c.jApp ? 'yes' : 'no', differ: c.differ ? 'yes' : 'no', verdict: c.verdict, prio: a.prio, conflict: a.conflict ? 'yes' : 'no', ctemp: c.ctemp, chum: c.chum,
      improve: a.improve, worsen: a.worsen, mstate: a.mstate, season: c.seasonKey, lack: a.lack, feeds: a.feeds, ctl: a.ctl, src: a.src, sup: a.sup, lackbad: a.lackbad, already: a.already, tone: a.tone, near: tr.near ? 'yes' : 'no', center: center ? 'yes' : 'no' };
    var vars = { region: opts.region || '이 지역', dir: tr.direction, dirWord: center ? '중앙' : tr.direction + '쪽', deg: tr.deg != null ? Math.round(tr.deg) : '', ref: (tr.refPoint || '기준점'), el: tr.element, grpName: GRPN[GRPK.indexOf(a.grp)], genEl: a.genEl, ctlEl: a.ctlEl, season: c.season, seasonEl: EL5[c.seasonEl], roleE: ROLE_KO[a.eokR], roleJ: ROLE_KO[a.johuR], climWord: c.climWord, zoneWord: ZONE_WORD[c.zone], altDir: tr.near ? tr.near.direction : '', altEl: tr.near ? tr.near.element : '', verdictWord: { eokbu: '억부', johu: '조후', both: '병행' }[c.verdict] };
    var rel = [].concat(pick('dir', facts, 1, vars), pick('grp', facts, 1, vars), pick('eok', facts, 1, vars), pick('johu', facts, 1, vars), pick('climate', facts, 1, vars), pick('month', facts, 1, vars), pick('lack', facts, 1, vars), pick('flow', facts, 3, vars));
    var pros = pick('pro', facts, 3, vars, { skipNone: true }), cons = pick('con', facts, 3, vars, { skipNone: true });
    if (!pros.length) pros = pick('pro', facts, 1, vars, { onlyNone: true }); if (!cons.length) cons = pick('con', facts, 1, vars, { onlyNone: true });
    var conflict = pick('conflict', facts, 1, vars), headline = pick('headline', facts, 1, vars)[0] || null, overall = pick('overall', facts, 2, vars), caveat = pick('caveat', facts, 2, vars);
    return { version: VERSION, rev: REV, region: opts.region || '', direction: tr.direction, deg: tr.deg != null ? Math.round(tr.deg) : null, element: tr.element, near: tr.near || null, center: center,
      tone: a.tone, toneLabel: D.TONE_LABEL[a.tone], headline: headline, relation: rel, pros: pros, cons: cons, conflict: conflict, conflictOn: a.conflict, overall: overall, caveat: caveat,
      basis: { mode: a.base, prio: a.prio, verdict: c.verdict, verdictWhy: c.advWhy, differ: c.differ, zone: c.zoneName, help: Math.round(c.help * 10) / 10, season: c.season, seasonEl: EL5[c.seasonEl], climate: { temp: Math.round(c.T * 100) / 100, hum: Math.round(c.H * 100) / 100, dev: Math.round(c.dev * 100) / 100 } },
      evidence: { grp: GRPN[GRPK.indexOf(a.grp)], eok: ROLE_KO[a.eokR], johu: ROLE_KO[a.johuR], mstate: a.mstate, pct: Math.round(a.pctEl * 10) / 10, lack: a.lack, improve: a.improve, worsen: a.worsen, feeds: a.feeds, ctl: a.ctl, scores: { eok: r2(a.E), johu: r2(a.J), climate: r2(a.Cl), flow: r2(a.Rel), season: a.sf, net: r2(a.net) } },
      facts: facts, trace: { phrases: trace.phrases.filter(function (v, i, x) { return x.indexOf(v) === i; }), excluded: trace.excluded.slice(0, 300) } };
  }
  var r2 = function (v) { return Math.round(v * 100) / 100; };

  // 점검: 한 해석 안에서의 일관성(관리자 미리보기·테스트용)
  function check(rd) {
    var iss = [], tp = rd.tone, e = rd.evidence;
    if (!rd.headline) iss.push('종합 제목 문구가 없음'); if (!rd.overall.length) iss.push('종합 문구가 없음'); if (rd.relation.length < 3) iss.push('사주와의 관계 문구가 3개 미만');
    if ((tp === 'good' || tp === 'mildgood') && e.eok === '기신' && e.johu !== '용신' && e.johu !== '희신') iss.push('기신 방향인데 조후의 뒷받침 없이 맞는 편으로 판정');
    if ((tp === 'caution' || tp === 'mildcaution') && e.eok === '용신' && (e.johu === '용신' || e.johu === '희신')) iss.push('억부·조후 모두 용신인데 맞지 않는 편으로 판정');
    if ((tp === 'good' || tp === 'mildgood') && rd.facts.lackbad === 'yes') iss.push('부족하지만 부담이 되는 오행을 좋게 판정');
    if (rd.conflictOn && !rd.conflict.length) iss.push('억부·조후가 충돌하는데 이유 문구가 없음');
    rd.relation.concat(rd.pros, rd.cons, rd.overall, rd.conflict).forEach(function (x) { if (BAN.test(x.text)) iss.push('금지 표현: ' + x.text.slice(0, 20)); if (/\{[^}]*\}/.test(x.text)) iss.push('자리표시자 미치환: ' + x.id); });
    return iss;
  }

  G.MantraRegionReading = { VERSION: VERSION, read: read, check: check, toneOfElement: toneOfElement, applyPublished: applyPublished, validateText: validateText, validateCond: validateCond, evalCond: evalCond, rules: function () { return D.RULES.map(function (r) { return Object.assign({}, r, { cur: CUR.rules[r.id] }); }); }, phrases: function () { return CUR.phrases.map(function (p) { return Object.assign({}, p); }); }, analyze: analyzeElement, ctx: chartCtx, EL5: EL5, KEYS: KEYS, BAN: BAN, rev: function () { return REV; } };
})(typeof window !== 'undefined' ? window : globalThis);
