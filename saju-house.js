/* 사주의 집 — 십성 구조를 한 채의 집으로 그린다(만세력 오행·강약 탭). 2026-11-24
   · 비유: 물 = 재물. 비겁=기둥·대들보(나의 힘), 식상=물길·창문(물을 길어 오는 통로·표현), 재성=물탱크(고인 재물),
           관성=담장·대문(지키는 틀·직장·규율), 인성=지붕(나를 덮어 주는 보호·공부·문서).
   · 크기 = 십성 세력(ten-god-roles.js force 5단계), 재료 색 = 그 십성의 실제 오행, 햇살/풍화 = 통합 용신 역할,
     장면 = 십성 구조 11가지(식상생재·재생관·관인상생…)의 성립 여부 + 과다 패턴(재다신약 등, ten-god-roles CFG 문턱과 같은 값).
   · 해석은 엔진(ten-god-roles.analyze)이 끝낸다. 단면도 SVG 는 계산으로 그리고(늘 정확), AI 실사는 같은 명세로 /api/mulsang-art kind=house.
   · 명세에는 생년월일·이름·간지가 없다(십성 비율·세력·역할·구조만). 브라우저·서버 공용.
   · 사용: MantraSajuHouse.fromChart(M, ch) → spec · .clean · .key · .scene · .caption · .partInfo(spec, i) · .svg(spec, {labels}) · .prompt · .checklist · .judge */
(function (G) {
  'use strict';
  var VERSION = 'saju-house-20261124-1', STYLE_V = 'house1';
  var GN = ['비겁', '식상', '재성', '관성', '인성'];
  var EL_KO = ['목', '화', '토', '금', '수'], EL_HJ = ['木', '火', '土', '金', '水'];
  var FORCE_K = ['없음', '약함', '보통', '강함', '과다'];
  var ROLE_CODE = { '용신': 'Y', '희신': 'H', '한신': 'N', '구신': 'G', '기신': 'K' }, ROLE_KO = { Y: '용신', H: '희신', N: '한신', G: '구신', K: '기신' };
  var IX_KEYS = ['siksaengjae', 'jaesaenggwan', 'gwanin', 'salin', 'sikjesal', 'gyeongwan', 'paein', 'jaegeugin', 'dosik', 'honjap', 'bigeopjaeng'];
  var IX_KO = { siksaengjae: '식상생재', jaesaenggwan: '재생관', gwanin: '관인상생', salin: '살인상생', sikjesal: '식신제살', gyeongwan: '상관견관', paein: '상관패인', jaegeugin: '재극인', dosik: '도식(효신탈식)', honjap: '관살혼잡', bigeopjaeng: '비겁쟁재' };
  // 집의 다섯 부분
  var PART = [
    { ko: '기둥·대들보', role: '나의 힘 — 집을 버티는 뼈대', noun: 'pillars and main beam' },
    { ko: '물길·창문', role: '밖에서 물(재물)을 길어 오는 통로, 나를 드러내는 창', noun: 'water pipe and windows' },
    { ko: '물탱크', role: '고여 있는 물 — 모으고 굴리는 재물', noun: 'water cistern' },
    { ko: '담장·대문', role: '집과 물탱크를 지키는 틀 — 직장·책임·규칙', noun: 'outer wall and gate' },
    { ko: '지붕', role: '나를 덮어 주는 보호 — 공부·문서·도와주는 사람', noun: 'roof' }];
  // 세력 5단계별 모습(영어 지시 · 한국어 설명)
  var LOOK = [
    [['a single thin pillar', '기둥이 가는 한 개뿐'], ['two thin pillars', '가는 기둥 두 개'], ['two sturdy pillars', '튼튼한 기둥 두 개'], ['three thick pillars', '굵은 기둥 세 개'], ['four massive pillars crowding the room', '방을 가득 채운 굵은 기둥 네 개']],
    [['no pipe and no windows — the house is closed off from the stream', '물길도 창도 없이 닫힌 집'], ['one narrow pipe and one small window', '가는 물길 하나와 작은 창 하나'], ['a clear water pipe and two windows', '시원한 물길 하나와 창 두 개'], ['a wide channel and several large windows', '넓은 물길과 큰 창 여러 개'], ['many pipes and wide-open windows with water spilling out', '물길과 창이 너무 많아 물이 넘쳐 새는 모습']],
    [['an empty, dry cistern', '바닥이 마른 빈 물탱크'], ['a small cistern with a little water', '물이 조금 담긴 작은 물탱크'], ['a medium cistern about half full', '반쯤 찬 보통 물탱크'], ['a large cistern nearly full', '거의 가득 찬 큰 물탱크'], ['an oversized cistern overflowing', '넘칠 만큼 큰 물탱크']],
    [['no outer wall or gate — the yard is wide open', '담장도 대문도 없이 열린 마당'], ['a low fence with a simple gate', '낮은 울타리와 소박한 대문'], ['a solid wall with a proper gate', '든든한 담장과 제대로 된 대문'], ['a tall wall with a heavy locked gate', '높은 담과 무거운 자물쇠 대문'], ['towering walls closing in tightly around the house', '집을 바짝 조이는 높은 담']],
    [['no roof — the house is open to the sky', '지붕 없이 하늘이 열린 집'], ['a thin, small roof', '얇고 작은 지붕'], ['a sturdy roof', '튼튼한 지붕'], ['a broad roof with deep eaves', '처마가 깊은 넓은 지붕'], ['an oversized, heavy roof weighing down the house', '집을 내리누르는 크고 무거운 지붕']]];
  // 재료 = 그 십성의 오행
  var MAT_EN = ['natural pine timber', 'red-lacquered wood and fired red brick', 'rammed earth and ochre clay', 'grey granite with iron fittings', 'dark blue-black glazed tile and stone'];
  var MAT_KO = ['소나무 목재(목)', '붉은 칠·벽돌(화)', '흙·황토(토)', '화강암·쇠붙이(금)', '검푸른 기와·돌(수)'];
  var MAT_COL = ['#6f8f4e', '#c0503a', '#b8935a', '#8f99a3', '#35546f'];
  // 구조 11가지: 장면(영어) · 설명(한국어). good/bad 는 ten-god-roles 판정(tone)으로 따로 붙인다
  var IX_SCENE = {
    siksaengjae: ['the pipe runs from the outside stream straight into the cistern, with water flowing in', '물길이 바깥 냇물에서 물탱크로 곧장 이어져 물이 들어와요 — 재주·일로 재물을 버는 흐름'],
    jaesaenggwan: ['overflow from the cistern fills a moat along the outer wall, making the wall stronger', '물탱크에서 넘친 물이 담장 둘레 해자를 채워 담을 든든하게 해요 — 재물이 자리·신용을 키우는 흐름'],
    gwanin: ['the frame of the wall rises and joins the roof beams, the wall holding the roof up', '담장의 틀이 지붕 들보와 이어져 지붕을 떠받쳐요 — 직장·책임이 실력·자격으로 이어지는 흐름'],
    salin: ['heavy stone buttresses from the wall rise into the roof, turning pressure into support', '무거운 돌담 버팀벽이 지붕까지 올라가 압력을 받침으로 바꿔요 — 시련을 공부·실력으로 바꾸는 흐름'],
    sikjesal: ['the water channel runs along the wall and smooths its sharp spikes', '물길이 담장을 따라 흐르며 날카로운 가시를 다듬어요 — 재주로 압박을 다루는 흐름'],
    gyeongwan: ['a burst pipe sprays against the wall and cracks the gate', '터진 물길이 담장에 부딪쳐 대문에 금이 가요 — 말·표현이 틀·윗사람과 부딪히기 쉬운 자리'],
    paein: ['a gutter from the roof feeds a valve that calms the gushing pipe', '지붕 홈통이 밸브로 이어져 거센 물길을 다스려요 — 배움·원칙이 거친 표현을 다듬는 흐름'],
    jaegeugin: ['the heavy cistern leaks into the foundation beneath the roof posts', '무거운 물탱크가 지붕 받침 밑으로 물을 흘려 기초를 적셔요 — 돈 일이 공부·문서를 흔드는 자리'],
    dosik: ['the heavy roof sags down and blocks the windows and the pipe', '무거운 지붕이 처져 창과 물길을 가려요 — 생각·보호가 많아 표현과 실행이 막히는 자리'],
    honjap: ['two different walls tangle around the house, their gates facing different ways', '서로 다른 담장 두 겹이 얽히고 대문이 다른 쪽을 향해요 — 책임·조직이 엇갈리는 자리'],
    bigeopjaeng: ['several taps from different pillars all draw from the one cistern', '여러 기둥에서 꼭지를 달아 한 물탱크의 물을 나눠 써요 — 같은 몫을 여럿이 나누는 자리'] };
  var TH = { jaeda: 30, gwanda: 30, seolgi: 30, inda: 35, sinyak: 42 };   // ten-god-roles CFG.th·carry.sinyak 와 같은 값
  var PAT = {
    jaeda: ['the house leans slightly under the weight of the big cistern', '큰 물탱크 무게에 집이 살짝 기울어요(재다신약) — 재물보다 감당할 힘을 먼저 키울 때'],
    gwanda: ['the tall walls crowd the small house', '높은 담이 작은 집을 조여요(관살과다) — 책임·압박을 나눠 질 사람이 필요할 때'],
    seolgi: ['water and warmth escape through too many openings', '열린 데가 많아 물과 온기가 새요(식상과다) — 내보내는 만큼 채우는 힘이 필요할 때'],
    inda: ['the roof is so heavy it darkens the rooms inside', '지붕이 무거워 방이 어두워요(인성과다) — 생각을 줄이고 몸으로 움직일 때'] };

  var isInt = function (v, lo, hi) { return typeof v === 'number' && v === Math.floor(v) && v >= lo && v <= hi; };
  var forceOf = function (p) { return p < 3 ? 0 : p < 10 ? 1 : p < 20 ? 2 : p < 32 ? 3 : 4; };   // ten-god-roles CFG.force 와 같은 경계
  var ga = function (w) { w = String(w).replace(/\([^()]*\)\s*$/, ''); var c = w.charCodeAt(w.length - 1) - 0xAC00; return c >= 0 && c <= 11171 && c % 28 !== 0; };
  var J = { 이: function (w) { return w + (ga(w) ? '이' : '가'); }, 은: function (w) { return w + (ga(w) ? '은' : '는'); } };

  // ── 원국 → 명세 ──
  function fromChart(M, ch) {
    var T = G.MantraTenGodRoles, r = null; try { r = T ? T.analyze(M, ch) : null; } catch (e) { r = null; }
    var dEl = M.stemEl(ch.pillars.day.s), roles = (ch.unified && ch.unified.roles) || (ch.yong && ch.yong.roles) || {};
    var gp = (ch.weights && ch.weights.groups) || [20, 20, 20, 20, 20];
    var g = [0, 1, 2, 3, 4].map(function (i) { return { p: Math.round(gp[i] || 0), r: ROLE_CODE[roles[(dEl + i) % 5]] || 'N' }; });
    var ix = r ? (r.interactions || []).filter(function (o) { return o.status === 'on' || o.status === 'weak'; }).map(function (o) { return { k: o.key, s: o.status, t: o.tone === 'good' || o.tone === 'bad' ? o.tone : 'mixed' }; }).filter(function (o) { return IX_KEYS.indexOf(o.k) >= 0; }) : [];
    return clean({ v: 1, dEl: dEl, help: Math.round((ch.strength && ch.strength.help) || 0), g: g, ix: ix });
  }
  function clean(x) {
    if (!x || typeof x !== 'object' || x.v !== 1 || !isInt(x.dEl, 0, 4) || !isInt(x.help, 0, 100) || !Array.isArray(x.g) || x.g.length !== 5) return null;
    for (var i = 0; i < 5; i++) { var q = x.g[i]; if (!q || !isInt(q.p, 0, 100) || !/^[YHNGK]$/.test(q.r)) return null; }
    var ix = Array.isArray(x.ix) ? x.ix : [], seen = {};
    if (ix.length > 11) return null;
    for (var j = 0; j < ix.length; j++) { var o = ix[j]; if (!o || IX_KEYS.indexOf(o.k) < 0 || seen[o.k] || ['on', 'weak'].indexOf(o.s) < 0 || ['good', 'bad', 'mixed'].indexOf(o.t) < 0) return null; seen[o.k] = 1; }
    return { v: 1, dEl: x.dEl, help: x.help, g: x.g.map(function (q) { return { p: q.p, r: q.r }; }), ix: ix.map(function (o) { return { k: o.k, s: o.s, t: o.t }; }) };
  }
  function key(spec) {
    var s = clean(spec); if (!s) return null;
    return STYLE_V + '|' + s.dEl + '|' + (s.help < 30 ? 'w' : s.help < 42 ? 'v' : s.help < 58 ? 'm' : 's') + '|' + s.g.map(function (q) { return forceOf(q.p) + q.r; }).join('') + '|' + s.ix.map(function (o) { return IX_KEYS.indexOf(o.k) + o.s[0] + o.t[0]; }).sort().join(',');
  }

  // ── 명세 → 장면 ──
  function scene(spec) {
    var s = clean(spec); if (!s) return null;
    var parts = s.g.map(function (q, i) { var el = (s.dEl + i) % 5, f = forceOf(q.p); return { i: i, gn: GN[i], p: q.p, f: f, role: q.r, el: el, part: PART[i], look: LOOK[i][f], good: q.r === 'Y' || q.r === 'H', bad: q.r === 'K' || q.r === 'G', absent: f === 0 }; });
    var weak = s.help < TH.sinyak, pats = [];
    if (s.g[2].p >= TH.jaeda && weak) pats.push('jaeda');
    if (s.g[3].p >= TH.gwanda && weak) pats.push('gwanda');
    if (s.g[1].p >= TH.seolgi && weak) pats.push('seolgi');
    if (s.g[4].p >= TH.inda) pats.push('inda');
    var frame = s.help < 30 ? ['the whole frame looks fragile', '전체 뼈대가 여려요(태약 이하)'] : s.help < 42 ? ['the frame is a little light for its load', '뼈대가 짐에 비해 조금 가벼워요(신약)'] : s.help < 58 ? ['the frame is well balanced', '뼈대와 짐이 균형을 이뤄요(중화)'] : ['the frame is very solid and heavy', '뼈대가 아주 단단하고 무거워요(신강)'];
    return { spec: s, parts: parts, ix: s.ix, pats: pats, frame: frame, help: s.help };
  }

  // ── 설명(한국어) ──
  function partLine(p) {
    var head = p.part.ko + ' = ' + p.gn + ' ' + p.p + '%(' + FORCE_K[p.f] + ') · ' + p.look[1] + '.';
    if (p.absent) return head + ' 원국에 ' + J.이(p.gn) + ' 거의 없어 이 부분이 비어 있어요.' + (p.good ? ' 그런데 이 사주에 필요한 기운(' + ROLE_KO[p.role] + ')이라, 비어 있는 이 자리가 살면서 밖에서 채워 갈 부분이에요.' : '');
    var mat = MAT_KO[p.el], ie = ga(mat) ? '이에요.' : '예요.';
    return head + ' 재료는 ' + mat + (p.good ? ', 이 사주에 필요한 기운(' + ROLE_KO[p.role] + ')이라 햇살을 받아요.' : p.bad ? ', 넘치면 부담이 되는 기운(' + ROLE_KO[p.role] + ')이라 그늘에 바래 있어요.' : ie);
  }
  function partInfo(spec, i) {
    var sc = scene(spec); if (!sc || !sc.parts[i]) return null;
    var p = sc.parts[i], rel = sc.ix.filter(function (o) { return ixParts(o.k).indexOf(i) >= 0; });
    return { title: p.part.ko + ' · ' + p.gn, role: p.part.role, line: partLine(p), structures: rel.map(function (o) { return IX_KO[o.k] + (o.s === 'weak' ? '(약하게)' : '') + ' — ' + IX_SCENE[o.k][1] + '.'; }) };
  }
  function ixParts(k) { return { siksaengjae: [1, 2], jaesaenggwan: [2, 3], gwanin: [3, 4], salin: [3, 4], sikjesal: [1, 3], gyeongwan: [1, 3], paein: [4, 1], jaegeugin: [2, 4], dosik: [4, 1], honjap: [3], bigeopjaeng: [0, 2] }[k] || []; }
  function caption(spec) {
    var sc = scene(spec); if (!sc) return [];
    var out = [{ k: '집', t: '물을 재물로 놓고 사주를 한 채의 집으로 그렸어요. 나를 돕는 힘(비겁+인성)이 ' + sc.help + '%라 ' + sc.frame[1] + '.' }];
    sc.parts.forEach(function (p) { out.push({ k: p.part.ko, t: partLine(p), i: p.i }); });
    sc.ix.forEach(function (o) { out.push({ k: IX_KO[o.k], t: (o.s === 'weak' ? '(약하게) ' : '') + IX_SCENE[o.k][1] + '.' + (o.t === 'good' ? ' 이 사주에는 도움이 되는 흐름이에요.' : o.t === 'bad' ? ' 이 사주에는 부담이 되는 쪽이에요.' : ' 좋고 나쁨이 섞인 흐름이에요.') }); });
    sc.pats.forEach(function (k) { out.push({ k: '모양', t: PAT[k][1] + '.' }); });
    if (!sc.ix.length) out.push({ k: '구조', t: '뚜렷하게 이어진 흐름(식상생재 같은 구조)은 아직 없어요. 운에서 들어오는 기운이 부분과 부분을 새로 이어 줘요.' });
    return out;
  }

  // ── 단면도 SVG(계산으로 그림). labels:false 면 글자 없는 AI 참고 그림 ──
  function svg(spec, opt) {
    var sc = scene(spec); if (!sc) return ''; opt = opt || {};
    var W = 640, H = 520, gy = 430, P = sc.parts, lab = opt.labels !== false, sel = opt.sel;
    var has = function (k) { return sc.ix.some(function (o) { return o.k === k; }); };
    var col = function (p) { return MAT_COL[p.el]; }, op = function (p) { return p.bad ? 0.55 : 1; };
    var stroke = function (p) { return p.absent ? 'stroke="#9aa0a6" stroke-dasharray="6 6" fill="none"' : 'stroke="#2f2f2f"'; };
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" class="sh-svg">';
    s += '<rect width="' + W + '" height="' + H + '" fill="#eef1f2"/><rect y="' + gy + '" width="' + W + '" height="' + (H - gy) + '" fill="#d8d2c4"/>';
    // 바깥 냇물(물의 근원)
    s += '<path d="M0 ' + (gy + 30) + ' C40 ' + (gy + 10) + ' 60 ' + (gy + 50) + ' 110 ' + (gy + 30) + ' L110 ' + H + ' L0 ' + H + ' Z" fill="#7fa7c4" opacity=".8"/>';
    var sun = function (p, cx, cy, r) { return p.good && !p.absent ? '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#f5c84c" opacity=".35"/>' : ''; };
    var g = function (i, inner) { return '<g data-part="' + i + '" class="sh-part' + (sel === i ? ' on' : '') + '" style="cursor:pointer">' + inner + '</g>'; };
    var r4f = P[4].f, roofBase = 120 + [0, 50, 70, 85, 110][r4f] + 14 + (has('dosik') ? 18 : 0);
    s += '<rect x="190" y="' + roofBase + '" width="400" height="' + (gy - roofBase) + '" fill="#fbfaf6" stroke="#b9b4a8" stroke-width="2"/>';   // 집 몸체(벽)
    // 관성: 담장·대문
    var w3 = P[3], wallH = [0, 40, 70, 100, 130][w3.f];
    var wall = sun(w3, 590, gy - 60, 70);
    if (w3.absent) wall += '<path d="M140 ' + gy + ' L140 ' + (gy - 40) + ' M600 ' + gy + ' L600 ' + (gy - 40) + '" ' + stroke(w3) + ' stroke-width="4"/>';
    else { wall += '<rect x="132" y="' + (gy - wallH) + '" width="16" height="' + wallH + '" fill="' + col(w3) + '" opacity="' + op(w3) + '" ' + stroke(w3) + '/><rect x="592" y="' + (gy - wallH) + '" width="16" height="' + wallH + '" fill="' + col(w3) + '" opacity="' + op(w3) + '" ' + stroke(w3) + '/><rect x="560" y="' + (gy - Math.min(wallH, 90)) + '" width="32" height="' + Math.min(wallH, 90) + '" fill="#6b4f35" opacity=".85" stroke="#2f2f2f"/>';
      if (has('honjap')) wall += '<rect x="118" y="' + (gy - wallH + 15) + '" width="10" height="' + (wallH - 15) + '" fill="' + col(w3) + '" opacity=".6" stroke="#2f2f2f"/><rect x="612" y="' + (gy - wallH + 15) + '" width="10" height="' + (wallH - 15) + '" fill="' + col(w3) + '" opacity=".6" stroke="#2f2f2f"/>';
      if (has('gyeongwan')) wall += '<path d="M566 ' + (gy - 70) + ' l10 18 l-8 12 l12 20" stroke="#b03a2e" stroke-width="3" fill="none"/>';
      if (w3.bad) wall += '<path d="M600 ' + (gy - wallH + 10) + ' l-6 20 l8 14" stroke="#555" stroke-width="2" fill="none"/>';
      if (has('jaesaenggwan')) wall += '<rect x="148" y="' + (gy - 8) + '" width="444" height="8" fill="#7fa7c4" opacity=".75"/>';
    }
    s += g(3, wall);
    // 인성: 지붕
    var r4 = P[4], rw = [0, 300, 360, 410, 450][r4.f], rh = [0, 50, 70, 85, 110][r4.f], top = 120, sag = has('dosik') ? 18 : 0;
    var roof = sun(r4, 370, top + 10, 90);
    if (r4.absent) roof += '<path d="M230 220 L370 ' + top + ' L510 220" ' + stroke(r4) + ' stroke-width="3"/>';
    else roof += '<path d="M' + (370 - rw / 2) + ' ' + (top + rh + sag) + ' Q370 ' + (top - 10) + ' ' + (370 + rw / 2) + ' ' + (top + rh + sag) + ' L' + (370 + rw / 2 - 20) + ' ' + (top + rh + 14 + sag) + ' L' + (370 - rw / 2 + 20) + ' ' + (top + rh + 14 + sag) + ' Z" fill="' + col(r4) + '" opacity="' + op(r4) + '" ' + stroke(r4) + ' stroke-width="2"/>';
    if ((has('gwanin') || has('salin')) && !r4.absent && !w3.absent) roof += '<path d="M148 ' + (gy - wallH) + ' L' + (370 - rw / 2 + 30) + ' ' + (top + rh + 10) + ' M592 ' + (gy - wallH) + ' L' + (370 + rw / 2 - 30) + ' ' + (top + rh + 10) + '" stroke="' + (has('salin') ? '#7d8490' : '#8a6b44') + '" stroke-width="' + (has('salin') ? 7 : 4) + '"/>';
    if (has('paein') && !r4.absent) roof += '<path d="M' + (370 - rw / 2 + 25) + ' ' + (top + rh + 14) + ' L' + (370 - rw / 2 + 25) + ' 330" stroke="#555" stroke-width="3"/><circle cx="' + (370 - rw / 2 + 25) + '" cy="334" r="7" fill="#c9a43a" stroke="#333"/>';
    s += g(4, roof);
    // 비겁: 기둥
    var p0 = P[0], n0 = [1, 2, 2, 3, 4][p0.f], th = sc.help < 30 ? 7 : sc.help < 42 ? 10 : sc.help < 58 ? 14 : 18, ph0 = gy - (top + rh + 14);
    var lean = sc.pats.indexOf('jaeda') >= 0 ? 6 : 0;
    var pil = sun(p0, 360, gy - ph0 / 2, 70);
    for (var k = 0; k < n0; k++) { var px = n0 === 1 ? 360 : 300 + k * (120 / (n0 - 1)); pil += '<path d="M' + px + ' ' + gy + ' L' + (px + lean) + ' ' + (gy - ph0) + '" stroke="' + col(p0) + '" stroke-width="' + th + '" opacity="' + op(p0) + '" stroke-linecap="square"/>'; }
    pil += '<path d="M280 ' + (gy - ph0 + 6) + ' L' + (440 + lean) + ' ' + (gy - ph0 + 6) + '" stroke="' + col(p0) + '" stroke-width="' + (th - 2) + '" opacity="' + op(p0) + '"/>';
    s += g(0, pil);
    // 재성: 물탱크
    var p2 = P[2], tw = [70, 70, 90, 110, 130][p2.f], tnH = [80, 80, 100, 120, 140][p2.f], fill = [0, 0.2, 0.5, 0.85, 1][p2.f], tx = 450, ty = gy - tnH;
    var tank = sun(p2, tx + tw / 2, ty + tnH / 2, tw * 0.8);
    tank += '<rect x="' + tx + '" y="' + ty + '" width="' + tw + '" height="' + tnH + '" rx="8" fill="#f7f7f5" ' + (p2.absent ? stroke(p2) : 'stroke="' + col(p2) + '"') + ' stroke-width="6" opacity="' + op(p2) + '"/>';
    if (fill) tank += '<rect x="' + (tx + 4) + '" y="' + (ty + tnH * (1 - Math.min(fill, 0.97))) + '" width="' + (tw - 8) + '" height="' + (tnH * Math.min(fill, 0.97) - 4) + '" rx="4" fill="#4f86b5" opacity=".8"/>';
    if (p2.f === 4) tank += '<path d="M' + (tx + tw) + ' ' + (ty + 6) + ' q14 20 4 50" stroke="#4f86b5" stroke-width="5" fill="none"/>';
    if (has('bigeopjaeng')) for (var b = 0; b < 3; b++) tank += '<path d="M' + (tx - 4) + ' ' + (gy - 20 - b * 18) + ' L' + (330 + b * 20) + ' ' + (gy - 20 - b * 18) + '" stroke="#7a7a7a" stroke-width="3"/>';
    if (has('jaegeugin')) tank += '<path d="M' + (tx + 10) + ' ' + (gy - 2) + ' q-30 10 -70 6" stroke="#4f86b5" stroke-width="4" fill="none" opacity=".7"/>';
    s += g(2, tank);
    // 식상: 물길·창문
    var p1 = P[1], pw = [0, 6, 10, 16, 22][p1.f], nw = [0, 1, 2, 3, 4][p1.f];
    var pipe = sun(p1, 160, gy - 40, 60);
    if (p1.absent) pipe += '<path d="M100 ' + (gy - 20) + ' L' + tx + ' ' + (gy - 20) + '" ' + stroke(p1) + ' stroke-width="4"/>';
    else {
      var flow = has('siksaengjae');
      pipe += '<path d="M95 ' + (gy + 25) + ' L95 ' + (gy - 30) + ' L' + (flow ? tx : 250) + ' ' + (gy - 30) + '" fill="none" stroke="' + col(p1) + '" stroke-width="' + pw + '" opacity="' + op(p1) + '" stroke-linejoin="round"/>';
      if (flow) pipe += '<path d="M95 ' + (gy + 25) + ' L95 ' + (gy - 30) + ' L' + tx + ' ' + (gy - 30) + '" fill="none" stroke="#9cc9ea" stroke-width="' + Math.max(2, pw / 3) + '" stroke-dasharray="8 8"/>';
      if (has('sikjesal')) pipe += '<path d="M150 ' + (gy - 60) + ' L590 ' + (gy - 60) + '" stroke="#9cc9ea" stroke-width="3" stroke-dasharray="4 6"/>';
      for (var w = 0; w < nw; w++) pipe += '<rect x="' + (205 + (w % 2) * 42) + '" y="' + (gy - 175 + Math.floor(w / 2) * 50) + '" width="26" height="34" fill="#cfe6f3" stroke="' + col(p1) + '" stroke-width="3"' + (has('dosik') ? ' opacity=".35"' : '') + '/>';
      if (p1.f === 4) pipe += '<path d="M250 ' + (gy - 30) + ' q10 18 0 28" stroke="#4f86b5" stroke-width="4" fill="none"/>';
    }
    s += g(1, pipe);
    if (lab) {
      var L = [[0, 360, gy - ph0 + 30, 'middle'], [1, 120, gy + 26, 'start'], [2, tx + tw / 2, ty - 10, 'middle'], [3, 630, gy - Math.max(wallH, 40) - 10, 'end'], [4, 370, top - 8, 'middle']];
      L.forEach(function (q) { var p = P[q[0]]; s += '<text x="' + q[1] + '" y="' + q[2] + '" text-anchor="' + q[3] + '" font-size="15" font-weight="700" fill="#222" paint-order="stroke" stroke="#fff" stroke-width="4" data-part="' + q[0] + '" style="cursor:pointer">' + p.part.ko + ' · ' + p.gn + ' ' + p.p + '%</text>'; });
      s += '<text x="55" y="' + (H - 12) + '" text-anchor="middle" font-size="13" fill="#24506f" paint-order="stroke" stroke="#fff" stroke-width="3">바깥 물(재물의 근원)</text>';
    }
    return s + '</svg>';
  }

  // ── 실사 프롬프트(영어 고정 틀) ──
  var STYLE_EN = 'Photorealistic photograph of a detailed handcrafted architectural miniature: a small traditional Korean house shown as a cutaway cross-section on a wooden table, so the inside is visible. Soft window light plus a warm key light, shallow depth of field, rich true-to-life color and real material textures. Vertical 3:4 composition. Not an illustration, painting or 3D render.';
  function prompt(spec) {
    var sc = scene(spec); if (!sc) return null;
    var P = sc.parts, L = [STYLE_EN, ''];
    L.push('METAPHOR: water stands for wealth. A small stream flows outside on the left; it is the only source of water.');
    L.push('', 'PARTS (follow exactly; the attached diagram shows placement and relative size — keep them, but turn it into a real photographed miniature):');
    var ord = [4, 0, 1, 2, 3];
    ord.forEach(function (i) { var p = P[i]; L.push('- ' + p.part.noun.toUpperCase() + ': ' + p.look[0] + (p.absent ? '.' : ', made of ' + MAT_EN[p.el] + '.') + (p.absent ? '' : p.good ? ' It is in warm golden sunlight, fresh and well kept.' : p.bad ? ' It looks weathered, worn and partly in cool shadow.' : '')); });
    L.push('- OVERALL FRAME: ' + sc.frame[0] + '.');
    var st = sc.ix.map(function (o) { return (o.s === 'weak' ? 'faintly, ' : '') + IX_SCENE[o.k][0]; }).concat(sc.pats.map(function (k) { return PAT[k][0]; }));
    if (!sc.ix.some(function (o) { return o.k === 'siksaengjae'; }) && !P[1].absent) st.push('the pipe does not reach the cistern; it stops short');
    if (st.length) L.push('', 'SCENE DETAILS: ' + st.join('; ') + '.');
    var absent = P.filter(function (p) { return p.absent; });
    if (absent.length) L.push('ABSENT — must not appear: ' + absent.map(function (p) { return p.i === 4 ? 'any roof' : p.i === 3 ? 'any wall, fence or gate' : p.i === 2 ? 'any water inside the cistern' : p.i === 1 ? 'any pipe or window' : 'extra pillars'; }).join('; ') + '.');
    L.push('', 'RULES: no text, letters, numbers, signs or labels. No people, no animals, no miniature figures. Keep it one single house.');
    return L.join('\n');
  }
  function checklist(spec) {
    var sc = scene(spec); if (!sc) return [];
    var P = sc.parts, c = [{ id: 'house', q: 'Is there a single small house shown as a cutaway with its inside visible?', critical: true }];
    c.push(P[4].absent ? { id: 'roof-no', q: 'Is the house without any roof?', critical: true } : { id: 'roof', q: 'Does the house have a roof?', critical: true });
    c.push(P[3].absent ? { id: 'wall-no', q: 'Is there no outer wall, fence or gate around the house?', critical: true } : { id: 'wall', q: 'Is there an outer wall or fence with a gate?', critical: false });
    c.push({ id: 'tank', q: 'Is there a water cistern or tank inside or next to the house?', critical: true });
    c.push(P[1].absent ? { id: 'pipe-no', q: 'Is the house free of any water pipe and windows?', critical: false } : { id: 'pipe', q: 'Is there a water pipe or channel coming from outside?', critical: false });
    if (sc.ix.some(function (o) { return o.k === 'siksaengjae' && o.s === 'on'; })) c.push({ id: 'flow', q: 'Does the pipe visibly carry water into the cistern?', critical: false });
    c.push({ id: 'stream', q: 'Is there a small stream of water outside the house?', critical: false });
    c.push({ id: 'notext', q: 'Is the image free of any written text, letters, numbers or labels?', critical: true });
    c.push({ id: 'nopeople', q: 'Is the image free of people, figures and animals?', critical: false });
    c.push({ id: 'photo', q: 'Does it look like a real photograph of a physical miniature model?', critical: false });
    return c;
  }
  function judge(spec, answers) {
    var c = checklist(spec), failed = c.filter(function (x) { return answers[x.id] !== true; }), critical = failed.filter(function (x) { return x.critical; });
    return { pass: critical.length === 0 && failed.length - critical.length <= 1, failed: failed.map(function (x) { return x.id; }), critical: critical.map(function (x) { return x.id; }) };
  }
  function sketchSVG(spec) { return svg(spec, { labels: false }); }   // AI 참고·대체 그림(글자 없음)

  var api = { VERSION: VERSION, STYLE_V: STYLE_V, PART: PART, GN: GN, IX_KO: IX_KO, fromChart: fromChart, clean: clean, key: key, scene: scene, caption: caption, partInfo: partInfo, svg: svg, sketchSVG: sketchSVG, prompt: prompt, checklist: checklist, judge: judge };
  G.MantraSajuHouse = api;
  if (typeof module === 'object' && module && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
