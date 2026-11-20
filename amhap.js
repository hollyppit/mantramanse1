/* 암합(暗合) 분석 — 지지 속 지장간끼리(또는 천간과 지장간이) 천간합을 이루는 '드러나지 않는 결합 구조'. 2026-11-20
   · 보조 분석 전용: 길흉 판정이 아니고, 합화(오행이 바뀜)도 판정하지 않는다(isTransformation 은 늘 false).
     엔진(engine.js)의 지장간 데이터·합충형파해·오행 세력·강약·용신·궁합 점수를 바꾸지 않는다(tests/amhap-sim.cjs 회귀 검사).
   · 지장간: 엔진 일반 지장간(JIJANGGAN, 프로젝트 채택 기준 — 午=己·丁, 亥=甲·壬)만 쓴다. 월률분야(WOLRYUL) 사령 천간을 일반 지장간에 더하지 않는다.
     월률분야는 선택적으로 '태어난 때 월지에서 그 지장간이 사령 중이었는지'를 표시하는 데만 쓴다(성립 여부는 바꾸지 않음).
   · 기본 조합(학파마다 범위가 다르므로 '대표 조합'으로 표시): 子戌(戊癸) · 丑寅(戊癸) · 寅未(甲己) · 卯申(乙庚) · 午亥(丁壬)
   · 유형: A 지지 간 지장간 암합('branch-hidden-stem') · B 명암합(천간↔지장간, 'stem-hidden-stem') · C 자합(같은 지지 안, 'self-hidden-stem', 기본 꺼짐)
   · 영역: 원국('natal') · 운(대운 'daeun'·세운 'seun'·월운 'wolun'·일진 'ilun' ↔ 원국, 운끼리 'luck-luck') · 궁합('compatibility', A·B 소속 따로)
   · 사용: MantraAmhap.natal(M, ch) · .luck(M, ch, [{ level, s, b, label }]) · .compat(M, chA, chB, { nameA, nameB }) */
(function (G) {
  'use strict';
  var VERSION = 'amhap-20261120-2';
  var CFG = {
    school: 'default',
    // 기본 지지 암합 조합 [지지A, 지지B, A 속 천간, B 속 천간]
    basic: [['子', '戌', '癸', '戊'], ['丑', '寅', '癸', '戊'], ['寅', '未', '甲', '己'], ['卯', '申', '乙', '庚'], ['午', '亥', '丁', '壬']],
    useBasic: true,
    extended: false,          // 학파 설정: 일반 지장간에서 그 밖의 지지 암합 조합도 찾음(school 'extended')
    myeongam: { samePillar: true, otherPillar: false, cross: true },   // 명암합: 같은 기둥(간지 암합) · 다른 기둥 · 궁합 교차
    selfHap: false,           // 자합(같은 지지 안, 예: 辰 속 戊癸)
    extraCombos: [],          // 추가 학파 조합 [지지A, 지지B, 천간A, 천간B, '학파 이름'] — 기본 조합을 덮어쓰지 않고 더함
    wolryulAssist: true,      // 월지가 끼고 태어난 때 사령 천간이 그 지장간이면 '사령 중' 표시만
  };
  var HAP_EL = { '0-5': 2, '1-6': 3, '2-7': 4, '3-8': 0, '4-9': 1 };   // 甲己土 乙庚金 丙辛水 丁壬木 戊癸火
  var POS = ['year', 'month', 'day', 'hour'];
  var POS_K = { year: '연지', month: '월지', day: '일지', hour: '시지', daeun: '대운', seun: '세운', wolun: '월운', ilun: '일진' };
  var POS_STEM_K = { year: '연간', month: '월간', day: '일간', hour: '시간', daeun: '대운 천간', seun: '세운 천간', wolun: '월운 천간', ilun: '일진 천간' };
  var LEVEL_K = { natal: '원국', daeun: '대운', seun: '세운', wolun: '월운', ilun: '일진', 'luck-luck': '운끼리', compatibility: '궁합' };
  var key = function (a, b) { return a < b ? a + '-' + b : b + '-' + a; };
  // 받침 판단: 한자 천간·지지는 독음으로(壬 → 임 → 받침 있음)
  var READ = { 甲: '갑', 乙: '을', 丙: '병', 丁: '정', 戊: '무', 己: '기', 庚: '경', 辛: '신', 壬: '임', 癸: '계', 子: '자', 丑: '축', 寅: '인', 卯: '묘', 辰: '진', 巳: '사', 午: '오', 未: '미', 申: '신', 酉: '유', 戌: '술', 亥: '해' };
  var jong = function (w) { var t = String(w).replace(/[)\s]+$/, ''), last = t.charAt(t.length - 1), c = (READ[last] || last).charCodeAt(0); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0; };
  var J = function (w, a, b) { return w + (jong(w) ? a : b); };
  // 으로/로: 받침 없거나 ㄹ 받침이면 로
  var RO = function (w) { var t = String(w).replace(/[)s]+$/, ''), last = t.charAt(t.length - 1), c = (READ[last] || last).charCodeAt(0); var j = c >= 0xAC00 && c <= 0xD7A3 ? (c - 0xAC00) % 28 : 0; return w + (j && j !== 8 ? '으로' : '로'); };

  function hidden(M, b) { var Jg = M.JIJANGGAN[b], L = M.hiddenLabels(b); return Jg.map(function (s, i) { return { s: s, depth: L[i] }; }); }
  function hasHidden(M, b, s) { return M.JIJANGGAN[b].indexOf(s) >= 0; }
  function depthOf(M, b, s) { var i = M.JIJANGGAN[b].indexOf(s); return i < 0 ? null : M.hiddenLabels(b)[i]; }
  var hapName = function (M, a, b) { return M.STEM[Math.min(a, b)] + M.STEM[Math.max(a, b)] + '合'; };

  // 활성 지지 조합 목록: [bA, bB, sA, sB, school]
  function combos(M) {
    var out = [], seen = {};
    var add = function (bA, bB, sA, sB, school) { var k = key(bA * 100 + sA, bB * 100 + sB); if (seen[k]) return; seen[k] = 1; out.push([bA, bB, sA, sB, school]); };
    var idx = function (c) { return [M.BR.indexOf(c[0]), M.BR.indexOf(c[1]), M.STEM.indexOf(c[2]), M.STEM.indexOf(c[3])]; };
    if (CFG.useBasic) CFG.basic.forEach(function (c) { var x = idx(c); add(x[0], x[1], x[2], x[3], 'default'); });
    (CFG.extraCombos || []).forEach(function (c) { var x = idx(c); add(x[0], x[1], x[2], x[3], c[4] || 'extra'); });
    if (CFG.extended) for (var a = 0; a < 12; a++) for (var b = a + 1; b < 12; b++) M.JIJANGGAN[a].forEach(function (sa) { M.JIJANGGAN[b].forEach(function (sb) { if (HAP_EL[key(sa, sb)] != null) add(a, b, sa, sb, 'extended'); }); });
    return out;
  }
  var pid = function (x) { return x.owner ? x.owner + ':' + x.id : x.id; };

  // A 지지 간 암합: 두 묶음의 지지를 비교. 같은 지지 쌍·같은 합은 한 기록으로 묶고 위치(positions)는 모두 보존
  function branchPairs(M, L, R, source, same) {
    var list = combos(M), out = {}, order = [];
    L.forEach(function (x, i) {
      R.forEach(function (y, j) {
        if (same && j <= i) return;
        list.forEach(function (c) {
          var ab = x.b === c[0] && y.b === c[1], ba = x.b === c[1] && y.b === c[0]; if (!ab && !ba) return;
          var sx = ab ? c[2] : c[3], sy = ab ? c[3] : c[2];
          var ok = hasHidden(M, x.b, sx) && hasHidden(M, y.b, sy);   // 프로젝트 지장간 기준에 그 천간이 있어야 성립
          var el = HAP_EL[key(sx, sy)], hap = hapName(M, sx, sy);
          var k = source + '|' + M.BR[x.b] + M.BR[y.b] + '|' + hap + '|' + (x.owner || '') + (y.owner || '');
          if (!out[k]) { out[k] = { type: 'branch-hidden-stem', source: source, branchA: M.BR[x.b], branchB: M.BR[y.b], hiddenStemA: M.STEM[sx], hiddenStemB: M.STEM[sy], depthA: depthOf(M, x.b, sx), depthB: depthOf(M, y.b, sy),
            combination: hap, element: M.EL[el], elementIdx: el, relation: '暗合', school: c[4], isValid: ok, isTransformation: false, positions: [], _s: [sx, sy] }; order.push(k); }
          out[k].positions.push([pid(x), pid(y)]);
        });
      });
    });
    return order.map(function (k) { return out[k]; });
  }
  // B 명암합: 천간 S ↔ 지지 B 속 지장간. opts.same 같은 기둥 · opts.other 같은 사람의 다른 기둥 · opts.cross 다른 사람(궁합)
  function stemHidden(M, stems, brs, source, opts) {
    var out = [];
    stems.forEach(function (S) {
      brs.forEach(function (Bx) {
        var sameOwner = (S.owner || '') === (Bx.owner || ''), same = sameOwner && S.id === Bx.id;
        if (same ? !opts.same : sameOwner ? !opts.other : !opts.cross) return;
        hidden(M, Bx.b).forEach(function (h) {
          var el = HAP_EL[key(S.s, h.s)]; if (el == null) return;
          out.push({ type: 'stem-hidden-stem', source: source, stem: M.STEM[S.s], stemPos: pid(S), branch: M.BR[Bx.b], branchPos: pid(Bx),
            hiddenStem: M.STEM[h.s], depth: h.depth, combination: hapName(M, S.s, h.s), element: M.EL[el], elementIdx: el, relation: same ? '干支暗合' : '明暗合',
            school: 'myeongam', isValid: true, isTransformation: false, positions: [[pid(S), pid(Bx)]], samePillar: same, _s: [S.s, h.s] });
        });
      });
    });
    return out;
  }
  // C 자합(기본 꺼짐)
  function selfPairs(M, brs, source) {
    if (!CFG.selfHap) return [];
    var out = [];
    brs.forEach(function (Bx) { var H = M.JIJANGGAN[Bx.b]; for (var i = 0; i < H.length; i++) for (var j = i + 1; j < H.length; j++) { var el = HAP_EL[key(H[i], H[j])]; if (el == null) continue;
      out.push({ type: 'self-hidden-stem', source: source, branchA: M.BR[Bx.b], branchB: M.BR[Bx.b], hiddenStemA: M.STEM[H[i]], hiddenStemB: M.STEM[H[j]], combination: hapName(M, H[i], H[j]), element: M.EL[el], elementIdx: el, relation: '自合', school: 'self', isValid: true, isTransformation: false, positions: [[pid(Bx), pid(Bx)]], _s: [H[i], H[j]] }); } });
    return out;
  }

  // 십성·배우자 별·직업 연결·다른 관계와의 겹침·사령 표시·해석을 붙인다
  function annotate(M, recs, ctx) {
    recs.forEach(function (r) {
      var chOf = function (owner) { return owner === 'B' ? ctx.chB : ctx.chA; };
      var owners = r.positions[0].map(function (p) { return String(p).indexOf(':') > 0 ? p.split(':')[0] : 'A'; });
      r.relatedTenGods = r._s.map(function (s, i) { var ch = chOf(owners[i]); return { stem: M.STEM[s], owner: owners[i], tenGod: ch ? M.tenGod(ch.pillars.day.s, s) : '' }; });
      var ids = []; r.positions.forEach(function (pp) { pp.forEach(function (p) { ids.push(String(p).split(':').pop()); }); });
      var spouse = function (owner) { var ch = chOf(owner); return ch && ch.gender === 'F' ? ['정관', '편관'] : ['정재', '편재']; };
      r.loveLink = ids.indexOf('day') >= 0 || r.relatedTenGods.some(function (t) { return spouse(t.owner).indexOf(t.tenGod) >= 0; });
      r.careerLink = ids.indexOf('month') >= 0 || r.relatedTenGods.some(function (t) { return t.tenGod === '정관' || t.tenGod === '편관'; });
      r.overlap = [];
      if (ctx.rel && r.type === 'branch-hidden-stem') r.positions.forEach(function (pp) { if (pp[0] === pp[1]) return; ctx.rel.forEach(function (x) { if (x.kind === 'branch' && pp.every(function (p) { return x.members.indexOf(p) >= 0; }) && r.overlap.indexOf(x.type) < 0) r.overlap.push(x.type); }); });
      if (CFG.wolryulAssist && r.source === 'natal' && ctx.chA && ctx.chA.saryeong) {
        var sar = ctx.chA.saryeong.stem, hit = false;
        r.positions.forEach(function (pp) { pp.forEach(function (p, i) { if (p !== 'month') return; var s = r.type === 'stem-hidden-stem' ? r._s[1] : r._s[i]; if (s === sar && (r.type !== 'stem-hidden-stem' || i === 1)) hit = true; }); });
        if (hit) r.saryeong = '태어난 때 월지에서 ' + J(M.STEM[sar], '이', '가') + ' 사령(주도) 중이었어요 — 월률분야 보조 표시이며 성립 여부는 그대로예요.';
      }
      r.activation = r.source;
      r.text = interpret(M, r, ctx);
      delete r._s;
    });
    return recs;
  }

  // 해석: 일반 · 직업 · 연애 · 주의 — 단정 표현을 쓰지 않는다
  function interpret(M, r, ctx) {
    ctx = ctx || {};
    var nm = function (p) { var s = String(p), id = s.split(':').pop(), ow = s.indexOf(':') > 0 ? s.split(':')[0] : ''; return { id: id, who: ow ? (ow === 'A' ? (ctx.nameA || 'A') : (ctx.nameB || 'B')) + '의 ' : '' }; };
    var pp = r.positions[0], gzA, gzB;
    if (r.type === 'stem-hidden-stem') { var a = nm(r.stemPos), b = nm(r.branchPos); gzA = a.who + POS_STEM_K[a.id] + ' ' + r.stem; gzB = b.who + POS_K[b.id] + ' ' + r.branch + ' 속 ' + r.hiddenStem; }
    else { var a2 = nm(pp[0]), b2 = nm(pp[1]); gzA = a2.who + POS_K[a2.id] + ' ' + r.branchA; gzB = b2.who + POS_K[b2.id] + ' ' + r.branchB; }
    var tgs = (r.relatedTenGods || []).map(function (t) { return t.stem + (t.tenGod ? '(' + t.tenGod + ')' : ''); }).join('·');
    var pair = J(gzA, '과', '와') + ' ' + J(gzB, '이', '가');
    var tA = (r.relatedTenGods || [])[0] || {}, tB = (r.relatedTenGods || [])[1] || {};
    var lead = {
      natal: r.type === 'stem-hidden-stem'
        ? J(gzA + '(' + tA.tenGod + ')', '이', '가') + ' ' + (r.samePillar ? '바로 아래 ' : '') + J(gzB + '(' + tB.tenGod + ')', '과', '와') + ' 조용히 묶여 있어요(' + (r.samePillar ? '간지 암합' : '명암합') + '). 겉으로 드러난 마음이 속에 숨은 기운과 이어져 있는 모양이에요.'
        : '원국 안에서 ' + pair + ' 지장간 ' + RO(tgs) + ' 조용히 묶여 있어요. 겉으로 드러나는 관계와 별개로 안쪽에서 이어지는 끈으로 볼 수 있어요.',
      daeun: '이 대운 동안 ' + pair + ' 암합을 이뤄요(' + tgs + '). 오랜 기간에 걸쳐 기존 관계나 환경 안에서 드러나지 않던 연결이 다시 짜일 수 있는 흐름이에요.',
      seun: '이번 세운에서는 원국의 지지와 새로운 암합 관계가 형성됩니다(' + gzA + '·' + gzB + ', ' + tgs + '). 이는 기존 관계나 환경에서 외부에 드러나지 않았던 연결이 부각되는 흐름으로 해석할 수 있습니다.',
      wolun: '이번 달은 ' + pair + ' 암합을 이뤄요(' + tgs + '). 업무 관계나 개인적인 교류에서 드러나지 않는 연결이 짧게 생기기 쉬운 달이에요.',
      ilun: '오늘은 ' + pair + ' 암합을 이뤄요(' + tgs + '). 만남이나 대화에서 은근한 접점이 생기는 날로 가볍게 참고해요.',
      'luck-luck': '운끼리 ' + pair + ' 암합을 이뤄요(' + tgs + '). 큰 흐름과 작은 흐름이 속에서 맞물리는 때예요.',
      compatibility: pair + ' 속에서 묶여요(' + tgs + '). 서로에게 느끼는 내면적 친밀감이나 겉으로 표현되지 않는 호감·교감으로 볼 수 있어요.'
    }[r.source] || '';
    var out = { general: lead };
    if (r.overlap && r.overlap.length) out.general += ' 같은 자리에 ' + r.overlap.join('·') + '도 함께 있어 겉의 관계와 속의 관계를 따로 봐야 해요.';
    if (r.careerLink && r.source !== 'compatibility') {
      out.career = '월지(일터 자리)나 관성과 이어져 있어, 조직 안의 드러나지 않는 역할·외부 협업·별도 프로젝트·겸업 같은 모습으로 나타날 수 있어요. 다만 암합만으로 직업 변동을 판단하지 않고 월지·관성·대운·세운의 변화와 함께 봐요.';
      if (ctx.monthHits && ctx.monthHits.length && r.source !== 'natal') out.career += ' 이 시기에는 월지에 ' + ctx.monthHits.join('·') + '도 함께 걸려 있어 일터 쪽 변화 신호가 겹쳐요.';
    }
    if (r.loveLink) out.love = (r.source === 'compatibility' ? '서로의 배우자궁(일지)이나 배우자 자리 십성과 이어져 있어, ' : '배우자궁(일지)이나 배우자 자리 십성과 이어져 있어, ') + '표현되지 않은 호감이나 사적인 교감 같은 내면의 연결로 볼 수 있어요. 관계의 실제 모습은 천간합·지지합·충형 등 다른 요소와 실제 상황을 함께 봐야 해요.';
    out.caution = '암합은 길흉 판정이 아니라 드러나지 않는 결합 구조를 보는 보조 해석이에요. 합화(오행이 바뀜)가 일어난다는 뜻도 아니에요.';
    if (!r.isValid) out.general = '이 조합은 대표 암합표에는 있지만 이 앱의 지장간 기준에서는 해당 천간이 없어 성립하지 않는 것으로 봐요.';
    return out;
  }

  var pillarsOf = function (ch, owner) { return POS.filter(function (k) { return ch.pillars[k]; }).map(function (k) { return { id: k, s: ch.pillars[k].s, b: ch.pillars[k].b, owner: owner }; }); };

  function natal(M, ch) {
    if (!M || !M.JIJANGGAN || !ch || !ch.pillars) return [];
    var P = pillarsOf(ch);
    var recs = branchPairs(M, P, P, 'natal', true).concat(stemHidden(M, P, P, 'natal', { same: CFG.myeongam.samePillar, other: CFG.myeongam.otherPillar, cross: false }), selfPairs(M, P, 'natal'));
    return annotate(M, recs, { chA: ch, rel: ch.relations });
  }
  // 운: layers [{ level, s, b, label }] — 그 시점에만 유효(원국에 더하지 않고 ch 를 바꾸지 않음)
  function luck(M, ch, layers) {
    if (!M || !M.JIJANGGAN || !ch || !ch.pillars) return [];
    var P = pillarsOf(ch), L = (layers || []).filter(function (x) { return x && x.s != null && x.b != null; }).map(function (x) { return { id: x.level, s: x.s, b: x.b, label: x.label || '' }; });
    var all = P.concat(L), rel = M.relationsAmong(all.map(function (x) { return { id: x.id, s: x.s, b: x.b }; }));
    var monthHits = rel.filter(function (x) { return x.kind === 'branch' && /^(충|형)$/.test(x.type) && x.members.indexOf('month') >= 0 && x.members.some(function (m) { return POS.indexOf(m) < 0; }); }).map(function (x) { return x.name; });
    var recs = [];
    L.forEach(function (x, i) {
      var rs = branchPairs(M, [x], P, x.id, false);
      if (CFG.myeongam.otherPillar) rs = rs.concat(stemHidden(M, [x], P, x.id, { same: false, other: true, cross: false }), stemHidden(M, P, [x], x.id, { same: false, other: true, cross: false }));
      rs.forEach(function (r) { r.period = x.label; });
      recs = recs.concat(rs);
      L.slice(i + 1).forEach(function (y) { branchPairs(M, [x], [y], 'luck-luck', false).forEach(function (r) { r.levels = [x.id, y.id]; recs.push(r); }); });
    });
    return annotate(M, recs, { chA: ch, rel: rel, monthHits: monthHits });
  }
  // 궁합: A·B 원국 교차(각자 원국 안의 암합과 구분). 궁합 점수에는 넣지 않는다
  function compat(M, chA, chB, o) {
    o = o || {};
    if (!M || !M.JIJANGGAN || !chA || !chB) return [];
    var A = pillarsOf(chA, 'A'), B = pillarsOf(chB, 'B');
    var recs = branchPairs(M, A, B, 'compatibility', false);
    if (CFG.myeongam.cross) recs = recs.concat(stemHidden(M, A, B, 'compatibility', { same: false, other: false, cross: true }), stemHidden(M, B, A, 'compatibility', { same: false, other: false, cross: true }));
    var rel = M.relationsAmong(A.map(function (x) { return { id: 'A:' + x.id, s: x.s, b: x.b }; }).concat(B.map(function (x) { return { id: 'B:' + x.id, s: x.s, b: x.b }; })));
    return annotate(M, recs, { chA: chA, chB: chB, rel: rel, nameA: o.nameA, nameB: o.nameB });
  }
  // ── 운명의 타임라인용 보조 문장(2026-11-20 예외 정책) ──
  //  · 별도 장·점수 없음. 기존 장의 '운 단계' 문단 끝에, 조건이 모두 맞을 때만 한 문장.
  //  · lens: life(종합) = 원국 일지·월지 암합만 · wealth = 재성 연결 · career = 월지·관성 연결 · love = 일지·배우자 별 연결. 그 밖(건강·사고 등)은 없음.
  //  · 시간 범위: 지금 대운과 올해 세운만(월운·일진은 타임라인 장에 쓰지 않음, 원국 암합은 종합만).
  //  · said(Set): 리포트 안에서 이미 말한 암합은 다시 말하지 않는다.
  var WEALTH_TG = ['정재', '편재'];
  function timelineNote(M, ch, o) {
    o = o || {};
    var lens = o.lens, said = o.said || null, now = o.now || Date.now();
    if (!M || !ch || !ch.pillars || ['life', 'wealth', 'career', 'love'].indexOf(lens) < 0) return null;
    var POSW = { year: '연지', month: '월지', day: '일지', hour: '시지' };
    var link = function (r) {
      if (lens === 'wealth') return (r.relatedTenGods || []).some(function (t) { return WEALTH_TG.indexOf(t.tenGod) >= 0; });
      if (lens === 'career') return !!r.careerLink;
      if (lens === 'love') return !!r.loveLink;
      return false;
    };
    var pick = null;
    if (lens === 'life') {
      pick = natal(M, ch).filter(function (r) { return r.isValid && r.type === 'branch-hidden-stem' && r.positions.some(function (pp) { return pp.indexOf('day') >= 0 || pp.indexOf('month') >= 0; }); })[0] || null;
    } else {
      var layers = [];
      try { var du = M.daeunAt ? M.daeunAt(ch, now) : null; if (du) layers.push({ level: 'daeun', s: du.s, b: du.b, label: M.gzName(du) + ' 대운' }); } catch (e) { }
      try { var sy = M.yearPillarAt ? M.yearPillarAt(now).sajuYear : new Date(now).getUTCFullYear(), se = M.seunRange(ch, sy, sy)[0]; if (se) layers.push({ level: 'seun', s: se.s, b: se.b, label: sy + '년 세운' }); } catch (e) { }
      pick = luck(M, ch, layers).filter(function (r) { return r.isValid && r.type === 'branch-hidden-stem' && (r.source === 'daeun' || r.source === 'seun') && link(r); })[0] || null;
    }
    if (!pick) return null;
    var key = pick.source + '|' + pick.branchA + pick.branchB + '|' + pick.combination;
    if (said && said.has(key)) return null;
    // 타임라인 본문은 전문 용어(재성·관성·일지·월지·십성 등)를 쓰지 않는다 — 자리 이름은 쉬운 말로
    var PLAIN = { year: '집안 자리', month: '일터 자리', day: '배우자 자리', hour: '자녀·앞날 자리', daeun: '지금 대운에 들어온 글자', seun: '올해 들어온 글자' };
    var pp = pick.positions[0], a = PLAIN[pp[0]] + '(' + pick.branchA + ')', b = PLAIN[pp[1]] + '(' + pick.branchB + ')';
    var pair = J(a, '과', '와') + ' ' + b;
    var body = {
      life: J(pair, '이', '가') + ' 속으로 조용히 묶인 숨은 합(암합)이 있어, 겉으로 드러나는 관계와 별개로 안쪽에서 이어지는 끈이 깔려 있는 사주예요.',
      wealth: J(pair, '이', '가') + ' 속으로 묶이는 숨은 합(암합)이 돈을 뜻하는 기운과 이어지는 때라, 겉에 잘 보이지 않는 돈의 연결(드러나지 않는 거래나 숨은 수입 경로 같은)이 생길 수 있어요. 돈 흐름의 좋고 나쁨은 앞의 판단을 따르고, 이건 보조로만 봐요.',
      career: J(pair, '이', '가') + ' 속으로 묶이는 숨은 합(암합)이 일터 자리나 일·책임을 뜻하는 기운과 이어지는 때라, 조직 안의 드러나지 않는 역할이나 별도 협업 같은 모습으로 나타날 수 있어요. 이것만으로 이직이나 퇴사를 판단하지는 않아요.',
      love: J(pair, '이', '가') + ' 속으로 묶이는 숨은 합(암합)이 배우자 자리나 배우자를 뜻하는 기운과 이어지는 때라, 표현되지 않은 호감이나 사적인 교감 같은 내면의 접점이 생길 수 있어요. 관계의 실제 모습은 앞의 흐름과 함께 봐요.'
    }[lens];
    if (said) said.add(key);
    return { key: key, text: body, record: pick };
  }
  function analyze(M, ch, opt) { var n = natal(M, ch), l = opt && opt.luck ? luck(M, ch, opt.luck.map(function (x) { return { level: x.level || x.id, s: x.s, b: x.b, label: x.label }; })) : []; return { version: VERSION, items: n.concat(l), cfg: CFG }; }

  var NOTE = '암합은 학파마다 인정 범위가 다른 보조 해석입니다. 기본값은 대표 지지 암합 5조합(子戌·丑寅·寅未·卯申·午亥)과 같은 기둥의 간지 암합이며, 이 앱의 일반 지장간 기준(午=己·丁, 亥=甲·壬)으로만 판정하고 월률분야 사령 천간은 지장간에 더하지 않습니다. 합화·길흉·점수에는 반영하지 않습니다.';
  var api = { version: VERSION, CFG: CFG, LEVEL_K: LEVEL_K, POS_K: POS_K, NOTE: NOTE, combos: combos, natal: natal, luck: luck, compat: compat, interpret: interpret, timelineNote: timelineNote, analyze: analyze };
  G.MantraAmhap = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
