/* 신년운세 조합기 — AI 호출 없이 미리 쓴 문구를 조건으로 골라 한 권의 풀이로 묶는다.
   입력: { birth, targetYear, mode } — mode 'public' 이면 검수 전(draft) 토정 현대어 풀이는 빼고 원문만, 'preview' 면 모두.
   의존(전역 또는 deps 인자): Manse(만세력), TojeongEngine, TojeongText, TojeongSupplement, TojeongModern, NewyearSajuLink, NewyearBlocks, NewyearPacks.
   순서: 근거(데이터로 만든 사실 문장) → 기질·상황 → 현실 사례 → 실천 조언. 토정비결과 사주는 각각 풀고, 방향이 다르면 섞지 않고 나눠 보여 준다. */
(function (root) {
  'use strict';
  var TG_GROUP = { 비견: '비겁', 겁재: '비겁', 식신: '식상', 상관: '식상', 편재: '재성', 정재: '재성', 편관: '관성', 정관: '관성', 편인: '인성', 정인: '인성' };
  var TG_PLAIN = { 비견: '나와 같은 편, 동료', 겁재: '경쟁자, 나눠 가질 사람', 식신: '꾸준히 만들어 내는 힘', 상관: '말과 표현, 튀는 재능', 편재: '움직이는 큰돈, 바깥 활동', 정재: '꼬박꼬박 들어오는 돈, 살림', 편관: '갑작스러운 책임과 압박', 정관: '나를 다잡는 질서와 평가', 편인: '혼자 파고드는 공부, 직감', 정인: '도와주는 사람, 자격과 문서' };
  var BAND_PLAIN = { 순풍: '순풍(밀어 주는 흐름)', 보통: '보통(크게 기울지 않는 흐름)', 주의: '주의(조심할 일이 앞서는 흐름)', 부담: '부담(버텨야 하는 흐름)' };
  var REL_PLAIN = { 천간합: '어울림', 천간충: '부딪힘', 육합: '손잡음', 삼합: '큰 어울림', 반합: '반쯤 어울림', 방합: '같은 방향으로 모임', 충: '정면으로 부딪힘', 형: '서로 긁힘', 파: '틀어짐', 해: '서운함', 원진: '괜한 미움', 귀문관: '예민해짐' };
  var EL_PLAIN = { 목: '나무(목)', 화: '불(화)', 토: '흙(토)', 금: '쇠(금)', 수: '물(수)' };
  var DIR_KO = { good: '좋음', neutral: '보통', caution: '조심', burden: '버팀' };
  var RANK = { 순풍: 3, 보통: 2, 주의: 1, 부담: 0 };
  // 받침에 맞는 '이에요/예요'
  var ieyo = function (w) { var s = String(w || ''), ch = s.charCodeAt(s.length - 1) - 0xAC00; return s + (ch >= 0 && ch <= 11171 && ch % 28 === 0 ? '예요' : '이에요'); };

  function dep(deps, name) { var v = (deps && deps[name]) || root[name]; if (!v) throw new Error(name + ' 가 로드되지 않았습니다'); return v; }
  // 같은 사람은 늘 같은 문구, 사람마다는 다른 문구가 나오도록 하는 해시(FNV-1a)
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; } return h; }
  var elKey = function (s) { return s ? s.charAt(0) : null; };   // '화(火)' → '화'
  function domainLevel(key, band) {
    if (!band) return 'mid';
    if (key === 'health') return /높음/.test(band) ? 'high' : band === '무난' ? 'mid' : 'low';
    if (key === 'accident') return /주의/.test(band) ? 'high' : band === '보통' ? 'mid' : 'low';
    return /높음/.test(band) && !/다소/.test(band) ? 'high' : band === '무난' ? 'mid' : 'low';
  }
  function fill(text, ctx) {
    return String(text || '').replace(/\{(\w+)\}/g, function (m, k) { return ctx.place[k] != null ? ctx.place[k] : ''; });
  }
  // 조건에 맞는 블록 중 가장 구체적인 것(맞은 키가 많은 것), 같으면 해시로
  function pick(blocks, section, ctx, salt, usedIds) {
    var cands = blocks.filter(function (b) {
      if (b.section !== section) return false;
      var w = b.when || {};
      return Object.keys(w).every(function (k) {
        var want = w[k], have = ctx.when[k];
        if (have == null) return false;
        var hv = Array.isArray(have) ? have : [have];
        return want.some(function (x) { return hv.indexOf(x) >= 0; });
      });
    });
    if (!cands.length) return null;
    var best = Math.max.apply(null, cands.map(function (b) { return Object.keys(b.when || {}).length; }));
    cands = cands.filter(function (b) { return Object.keys(b.when || {}).length === best; });
    var c = cands[hash(ctx.seed + section + (salt || '')) % cands.length];
    var useAlt = c.alt && hash(ctx.seed + c.id) % 2 === 1;
    if (usedIds) {   // 한 풀이 안에서 같은 블록 문장이 되풀이되지 않게: 쓴 판이면 다른 판, 둘 다 썼으면 같은 조건의 다른 블록, 없으면 null
      var free = [];
      cands.forEach(function (b) { if (!usedIds[b.id]) free.push([b, false]); if (b.alt && !usedIds[b.id + '#alt']) free.push([b, true]); });
      if (!free.length) return null;
      var pref = free.filter(function (f) { return f[0] === c && f[1] === useAlt; })[0] || free[hash(ctx.seed + section + (salt || '') + 'u') % free.length];
      c = pref[0]; useAlt = pref[1];
      usedIds[c.id + (useAlt ? '#alt' : '')] = 1;
    }
    var src = useAlt ? c.alt : c;
    return { id: c.id + (useAlt ? '#alt' : ''), hook: fill(src.hook, ctx), situation: fill(src.situation, ctx), scene: fill(src.scene, ctx), advice: fill(src.advice, ctx), line: fill(src.line, ctx) };
  }
  function paras(basis, b) {
    var out = [];
    if (b && b.hook) out.push({ role: 'hook', text: b.hook });
    if (basis) out.push({ role: 'basis', text: basis });
    if (b) ['situation', 'scene', 'advice'].forEach(function (r) { if (b[r]) out.push({ role: r, text: b[r] }); });
    return out;
  }

  function compose(input, deps) {
    var M = dep(deps, 'Manse'), TJ = dep(deps, 'TojeongEngine'), TXT = dep(deps, 'TojeongText');
    var SUP = (deps && deps.TojeongSupplement) || root.TojeongSupplement || { gua: {} };
    var MOD = (deps && deps.TojeongModern) || root.TojeongModern || {};
    var LINK = dep(deps, 'NewyearSajuLink'), BLOCKS = (deps && deps.NewyearBlocks) || root.NewyearBlocks || [];
    var Y = input.targetYear || 2027, mode = input.mode || 'public';
    var PACK = ((deps && deps.NewyearPacks) || root.NewyearPacks || {})[Y];
    if (!PACK) throw new Error(Y + '년 연도 자료(years/' + Y + '/pack.js)가 없습니다');

    var tj = TJ.compute({ birth: input.birth, targetYear: Y, options: input.tojeongOptions }, M);
    var sj = LINK.sajuYear(input.birth, Y, M);
    var g = tj.gua, src = TXT.gua[g] || null, sup = SUP.gua && SUP.gua[g] || null, mod = MOD[g] || null;
    var modOk = mod && (mode === 'preview' || mod.status === 'reviewed' || mod.status === 'published');

    var seed = [sj.natal.pillars.year, sj.natal.pillars.month, sj.natal.pillars.day, sj.natal.pillars.hour || '-', g].join('|');
    var tgGroup = TG_GROUP[sj.year.stemTG];
    var change = sj.change ? (RANK[sj.change.to] > RANK[sj.change.from] ? 'up' : RANK[sj.change.to] < RANK[sj.change.from] ? 'down' : 'same') : 'same';
    var relTypes = sj.year.relations.map(function (r) { return r.type; });
    var ctx = {
      seed: seed,
      when: {
        stemTG: sj.year.stemTG, branchTG: sj.year.branchTG, tgGroup: tgGroup, band: sj.year.band, rel: relTypes,
        change: change, daeunChanged: sj.change && sj.change.daeunChanged ? [true] : null,
        samjae: sj.year.samjae && sj.year.samjae.active ? sj.year.samjae.stage : null,
        yongEl: elKey(sj.natal.yongsin.yong), giEl: elKey(sj.natal.yongsin.gi),
      },
      place: { yearGz: PACK.gz, yearName: PACK.name, yongPlain: EL_PLAIN[elKey(sj.natal.yongsin.yong)] || '', giPlain: EL_PLAIN[elKey(sj.natal.yongsin.gi)] || '', relWithPlain: '' },
    };
    var withCtx = function (extra) { var c = { seed: ctx.seed, when: Object.assign({}, ctx.when, extra || {}), place: ctx.place }; return c; };
    var used = {};
    var dedupe = function (list) { return list.filter(function (p) { var k = p.text.replace(/\s+/g, ''); if (used[k]) return false; used[k] = 1; return true; }); };

    // ── 근거 문장(데이터) ─────────────────────────
    var dm = sj.natal.dayMaster;
    var basisYear = PACK.name + '의 천간 ' + PACK.gz.charAt(0) + '은 태어난 날의 기운(' + dm.stem + ', ' + dm.element + ')에게 \'' + TG_PLAIN[sj.year.stemTG] + '\'(' + sj.year.stemTG + ') 역할로 들어오고, 올해 흐름은 ' + BAND_PLAIN[sj.year.band] + '이에요.';
    var basisChange = sj.prevYear ? '2026년 ' + sj.prevYear.gz + '년의 흐름(' + sj.prevYear.band + ')과 비교하면 ' + (change === 'up' ? '한 단계 올라서요' : change === 'down' ? '한 단계 내려와요' : '비슷한 높이예요') + (sj.change.daeunChanged ? ', 그리고 10년 단위의 큰 흐름(대운)이 이 무렵 바뀌어요.' : '.') : '';

    // ── 1. 여는 장 ─────────────────────────
    var gx = src ? src.guaxiang.join(' ') : sup ? sup.front.slice(0, 2).join(' ') : '';
    var open = {
      id: 'open', title: PACK.productTitle,
      paras: [
        { role: 'hook', text: PACK.intro[0] },
        { role: 'basis', text: '토정비결로 계산한 올해의 괘는 ' + g + '괘예요. 나이 ' + tj.steps.upper.age + '세와 올해 수, 태어난 달·날의 올해 수를 더해 나온 번호예요.' },
        { role: 'tojeong', text: '괘의 첫 글귀: ' + gx + (modOk && mod.theme ? ' — ' + mod.theme : '') },
        { role: 'situation', text: PACK.symbol.line },
        { role: 'note', text: PACK.intro[1] },
      ].concat(tj.notes.map(function (n) { return { role: 'note', text: n }; })),
    };

    // ── 2. 총운 ─────────────────────────
    var totalCore = pick(BLOCKS, 'total', ctx);
    // 관계 블록의 {relWithPlain} = 그 관계를 만드는 원국 기둥의 쉬운 이름
    var PILLAR_PLAIN = { 연주: '태어난 해의 기운', 월주: '태어난 달의 기운', 일주: '나 자신(태어난 날)의 기운', 시주: '태어난 시의 기운' };
    var relBlock = null;
    if (relTypes.length) {
      relBlock = pick(BLOCKS, 'relation', withCtx({ rel: relTypes }), 'rel');
      if (relBlock) {
        var relType = relBlock.id.replace(/^relation\./, '').replace(/#alt$/, ''), rr = sj.year.relations.find(function (x) { return x.type === relType; }) || sj.year.relations[0];
        ctx.place.relWithPlain = PILLAR_PLAIN[rr.with[0]] || '타고난 기운';
        relBlock = pick(BLOCKS, 'relation', withCtx({ rel: relTypes }), 'rel');   // 자리표시를 채워 다시 만든다(같은 해시라 같은 블록)
      }
    }
    var changeBlock = pick(BLOCKS, 'change', ctx);
    var samjaeBlock = ctx.when.samjae ? pick(BLOCKS, 'samjae', ctx) : null;
    var tjTotal = [];
    if (src) tjTotal.push({ role: 'tojeong', text: '토정비결 원문: ' + src.guaci.slice(0, 3).map(function (p) { return p.join(' '); }).join(' / ') });
    if (sup && !src) tjTotal.push({ role: 'tojeong', text: '토정비결 원문(보충본): ' + sup.front.join(' ') });
    // 개요는 첫 문장만 — 나머지는 아래 좋은 점·조심할 점과 내용이 겹친다
    if (modOk && mod.overview && mod.overview[0]) tjTotal.push({ role: 'tojeong', text: mod.overview[0] });
    var tjTone = modOk ? mod.tone : null;
    var cmp = LINK.compare(tjTone, sj.year.direction);
    var bridge = cmp.kind !== 'unknown' ? pick(BLOCKS, 'bridge', withCtx({ compare: cmp.kind }), 'bridge-year') : null;
    var total = {
      id: 'total', title: '2027 총운',
      sections: [
        { id: 'core', title: '핵심 흐름', paras: dedupe(paras(basisYear, totalCore)) },
        { id: 'tojeong', title: '토정비결이 말하는 올해', paras: dedupe(tjTotal.concat(modOk && mod.good && mod.good.length ? [{ role: 'good', text: mod.good.join(' ') }] : []).concat(modOk && mod.caution && mod.caution.length ? [{ role: 'caution', text: mod.caution.join(' ') }] : [])) },
        { id: 'compare', title: '두 풀이가 만나는 지점', compare: cmp, paras: dedupe(bridge ? paras(null, bridge) : [{ role: 'note', text: '토정비결 괘의 길흉 풀이를 검수하는 중이라, 두 풀이의 방향 비교는 검수 뒤에 보여 드려요.' }]) },
        { id: 'opportunity', title: '기회와 위기', paras: dedupe(relBlock ? paras('올해 들어오는 글자와 타고난 사주의 관계: ' + sj.year.relations.map(function (r) { return r.with.map(function (w) { return PILLAR_PLAIN[w] || w; }).join('·') + '과 ' + (REL_PLAIN[r.type] || r.type) + '(' + r.type + ')'; }).join(', ') + '.', relBlock) : []).concat(samjaeBlock ? dedupe(paras('띠로 보는 삼재: ' + sj.year.samjae.group + ' — 올해는 ' + sj.year.samjae.stage + '예요.', samjaeBlock)) : []) },
        { id: 'change', title: '작년과 달라지는 점', paras: dedupe(paras(basisChange, changeBlock)) },
      ],
    };

    // ── 3. 분야 ─────────────────────────
    var domainChapter = function (key, title) {
      var d = sj.domains[key] || {}, lvl = domainLevel(key, d.band);
      // 등급 블록과 십성 묶음 블록은 조건 키가 달라 따로 고른다(한쪽 키를 비워 섞이지 않게)
      var main = pick(BLOCKS, key, withCtx({ domainBand: lvl, tgGroup: null, giEl: null }), key);
      var flavor = pick(BLOCKS, key, withCtx({ tgGroup: tgGroup, domainBand: null, giEl: null }), key + 'grp');
      var basis = title + ' 지수는 ' + d.score + '점(' + d.band + ')' + (d.summary ? ' — ' + d.summary : '');
      var ps = paras(basis, main);
      if (flavor && (!main || flavor.id !== main.id)) ps = ps.concat([{ role: 'situation', text: flavor.hook }, { role: 'advice', text: flavor.advice }].filter(function (p) { return p.text; }));
      return { id: key, title: title, score: d.score, band: d.band, level: lvl, paras: dedupe(ps) };
    };
    var health = domainChapter('health', '건강');
    var giBlock = pick(BLOCKS, 'health', withCtx({ domainBand: null, tgGroup: null }), 'gi');
    if (giBlock) health.paras = health.paras.concat(dedupe([{ role: 'situation', text: giBlock.hook }, { role: 'advice', text: giBlock.advice }].filter(function (p) { return p.text; })));
    var acc = domainChapter('accident', '사고·안전');
    health.paras = health.paras.concat(acc.paras);
    health.note = '건강·사고 풀이는 생활 리듬을 살피자는 뜻이에요. 몸에 이상이 느껴지면 운세보다 진료를 먼저 받으세요.';

    // ── 4. 12개월 (음력 월 = 토정 기준, 함께 절기 월운 = 사주 기준) ─────────────
    var monthUsed = {};
    var months = sj.lunarMonths.map(function (lm) {
      var sm = sj.months[lm.sajuIndex - 1];
      var mgroup = TG_GROUP[sm.stemTG];
      var mb = pick(BLOCKS, 'month', withCtx({ monthDir: sm.direction, tgGroup: mgroup }), 'm' + lm.lunarMonth, monthUsed);
      var solarM = +lm.solarStart.slice(5, 7);
      var season = pick(BLOCKS, 'season', withCtx({ solarMonth: solarM }), 's' + solarM);
      var tjm = src ? src.months[lm.lunarMonth] : null, mm = modOk && mod.months ? mod.months[lm.lunarMonth] : null;
      var c = LINK.compare(mm ? mm.tone : null, sm.direction);
      var ps = [];
      if (tjm) ps.push({ role: 'tojeong', text: '토정비결 ' + lm.lunarMonth + '월: ' + tjm.map(function (p) { return p.join(' '); }).join(' / ') });
      if (mm) ps.push({ role: 'tojeong', text: mm.gist });
      ps.push({ role: 'basis', text: '사주로 보면 이 무렵(' + sm.solarStart + '~' + sm.solarEnd + ')은 ' + sm.gz + '월, 흐름은 ' + ieyo(sm.band) + '.' });
      if (mb) ps = ps.concat([{ role: 'situation', text: mb.situation }, { role: 'scene', text: mb.scene }, { role: 'advice', text: mb.advice }]);
      if (season && (season.line || season.hook)) ps.push({ role: 'scene', text: season.line || season.hook });
      if (c.kind === 'different') ps.push({ role: 'note', text: '이 달은 토정비결(' + DIR_KO[c.tojeong] + ')과 사주(' + DIR_KO[c.saju] + ')가 다르게 봐요. 두 풀이를 따로 읽어 주세요.' });
      return { lunarMonth: lm.lunarMonth, label: '음력 ' + lm.lunarMonth + '월', solar: lm.solarStart + ' ~ ' + lm.solarEnd, basis: { tojeong: PACK.basisLabels.tojeongMonth, saju: PACK.basisLabels.sajuMonth }, sajuMonth: sm.gz, direction: sm.direction, tojeongTone: mm ? mm.tone : null, compare: c.kind, hook: mb ? mb.hook : null, paras: dedupe(ps) };
    });

    // ── 5. 결정적 시기 ─────────────────────────
    var hi = pick(BLOCKS, 'peak', withCtx({ monthDir: 'good' }), 'hi'), lo = pick(BLOCKS, 'peak', withCtx({ monthDir: 'burden' }), 'lo');
    var peak = {
      id: 'peak', title: '올해의 결정적 시기',
      high: sj.peaks.high, low: sj.peaks.low,
      paras: dedupe(paras('가장 힘이 실리는 때: ' + sj.peaks.high.map(function (p) { return p.solarStart + '~' + p.solarEnd + '(' + p.gz + '월)'; }).join(', ') + '.', hi).concat(paras('가장 조심할 때: ' + sj.peaks.low.map(function (p) { return p.solarStart + '~' + p.solarEnd + '(' + p.gz + '월)'; }).join(', ') + '.', lo))),
    };

    // ── 6. 행동 지침 ─────────────────────────
    var doB = pick(BLOCKS, 'action', withCtx({ giEl: null }), 'do'), avoidB = pick(BLOCKS, 'action', withCtx({ yongEl: null }), 'avoid');
    var action = {
      id: 'action', title: '2027 행동 지침',
      paras: dedupe(paras('올해 힘이 되는 기운: ' + (ctx.place.yongPlain || '-') + ', 조심할 기운: ' + (ctx.place.giPlain || '-') + '.', doB).concat(paras(null, avoidB))),
    };

    var chapters = [open, total,
      domainChapter('wealth', '재물운'), domainChapter('career', '직업·사업운'), domainChapter('love', '연애·인연운'), health,
      { id: 'months', title: '12개월 운세', note: '토정비결은 음력 달, 사주는 절기(입춘부터) 달로 봐요. 날짜는 양력으로 함께 적었어요.', months: months },
      peak, action];
    return {
      version: 'newyear-compose-1', year: Y, mode: mode,
      tojeong: { gua: g, zhouyi: src ? src.zhouyi : null, guaxiang: src ? src.guaxiang : sup ? sup.front.slice(0, 2) : null, source: src ? 'kyu1077' : sup ? 'nl-supplement' : null, steps: tj.steps, notes: tj.notes, modernStatus: mod ? mod.status : null, modernShown: !!modOk },
      saju: { natal: sj.natal, year: sj.year, change: sj.change },
      chapters: chapters,
    };
  }

  // 풀이 전체 문장 목록(검사·PDF 용)
  function sentences(reading) {
    var out = [];
    var walk = function (ps) { (ps || []).forEach(function (p) { out.push({ role: p.role, text: p.text }); }); };
    reading.chapters.forEach(function (c) {
      walk(c.paras);
      (c.sections || []).forEach(function (s) { walk(s.paras); });
      (c.months || []).forEach(function (m) { if (m.hook) out.push({ role: 'hook', text: m.hook }); walk(m.paras); });
    });
    return out;
  }

  var API = { compose: compose, sentences: sentences, TG_GROUP: TG_GROUP, TG_PLAIN: TG_PLAIN };
  root.NewyearCompose = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
