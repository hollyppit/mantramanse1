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
  var VERSION = 'saju-house-20261124-2', STYLE_V = 'scene1';
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
  function key(spec) {   // 2026-11-24: 실사 한 장면은 유형(넘침 × 필요 × 필요한 칸이 비었는지)으로만 정한다 — 같은 유형은 저장본 공유
    var S = summary(spec); if (!S) return null;
    return STYLE_V + '|' + (S.over == null ? 'b' : S.over) + '|' + S.need + '|' + (scene(spec).parts[S.need].absent ? 'x' : 'w');
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
    // focus: [넘치는 칸, 필요한 칸] — 이 두 부분만 진하게(빨강·초록 테두리 빛), 나머지는 흐리게(2026-11-24 한 카드로 줄이기)
    var fo = opt.focus || null, fx = function (i) { return !fo ? '' : i === fo[0] ? 'filter:drop-shadow(0 0 5px #D85A30) drop-shadow(0 0 2px #D85A30)' : i === fo[1] ? 'filter:drop-shadow(0 0 5px #639922) drop-shadow(0 0 2px #639922)' : 'opacity:.28'; };
    var has = function (k) { return sc.ix.some(function (o) { return o.k === k; }); };
    var col = function (p) { return MAT_COL[p.el]; }, op = function (p) { return p.bad ? 0.55 : 1; };
    var stroke = function (p) { return p.absent ? 'stroke="#9aa0a6" stroke-dasharray="6 6" fill="none"' : 'stroke="#2f2f2f"'; };
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" class="sh-svg">';
    s += '<rect width="' + W + '" height="' + H + '" fill="#eef1f2"/><rect y="' + gy + '" width="' + W + '" height="' + (H - gy) + '" fill="#d8d2c4"/>';
    // 바깥 냇물(물의 근원)
    s += '<path d="M0 ' + (gy + 30) + ' C40 ' + (gy + 10) + ' 60 ' + (gy + 50) + ' 110 ' + (gy + 30) + ' L110 ' + H + ' L0 ' + H + ' Z" fill="#7fa7c4" opacity=".8"/>';
    var sun = function (p, cx, cy, r) { return p.good && !p.absent ? '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#f5c84c" opacity=".35"/>' : ''; };
    var g = function (i, inner) { return '<g data-part="' + i + '" class="sh-part' + (sel === i ? ' on' : '') + '" style="cursor:pointer;' + fx(i) + '">' + inner + '</g>'; };
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
      L.forEach(function (q) { var p = P[q[0]]; s += '<text x="' + q[1] + '" y="' + q[2] + '" text-anchor="' + q[3] + '" font-size="' + (fo && (q[0] === fo[0] || q[0] === fo[1]) ? 21 : fo ? 16 : 17) + '" font-weight="700" fill="' + (!fo ? '#222' : q[0] === fo[0] ? '#c2492a' : q[0] === fo[1] ? '#3B6D11' : '#9a9890') + '" paint-order="stroke" stroke="#fff" stroke-width="4" data-part="' + q[0] + '" style="cursor:pointer">' + p.part.ko + ' · ' + p.gn + ' ' + p.p + '%</text>'; });
      s += '<text x="55" y="' + (H - 12) + '" text-anchor="middle" font-size="13" fill="#24506f" paint-order="stroke" stroke="#fff" stroke-width="3">바깥 물(재물의 근원)</text>';
    }
    return s + '</svg>';
  }

  // ── 실사 한 장면(2026-11-24 사용자 요청: 미니어처 집 대신 한 줄 진단을 그대로 담은 한 장면) ──
  //  넘치는 힘은 '지나치게 하고 있는 모습', 필요한 힘은 '비어 있는 자리'(없음) 또는 '희미한 자리'(약함), 멀리 그 힘이 채워질 희망의 빛
  var STYLE_EN = 'Cinematic, photorealistic photograph of one ordinary Korean adult in a real everyday setting, seen from the side or slightly from behind so the face is not the focus. Natural light, true-to-life color, shallow depth of field, quiet emotional storytelling like a film still. Vertical 3:4 composition. Not an illustration, painting or 3D render.';
  var OVER_EN = [
    'they insist on carrying a tall stack of heavy boxes all by themselves, shoulders squared, while helpful hands nearby are ignored',
    'they keep pouring water from a large jug into many other people\'s cups, water splashing and spilling onto the ground around them',
    'they are surrounded by too many overflowing buckets and sacks they try to hold all at once, visibly straining under the weight',
    'they are hemmed in by tall walls and a heavy gate, a thick stack of duty folders pressing down on their shoulders',
    'they sit buried among towering stacks of books and notes, lost in thought, while the door behind them stays closed'];
  var CALM_EN = 'they stand calmly in an orderly, balanced space where nothing is too much';
  var NEED_EN = [
    ['there is no one beside them — an empty chair where a companion should be', 'only a faint figure of a friend far away'],
    ['their own window is shut and their own tap is dry — nothing flows out from them', 'their own window is only slightly open'],
    ['their own jar is completely empty and dry', 'their own jar holds only a little water'],
    ['there are no fences, paths or markers around them — the ground has no boundaries', 'only a low, broken fence marks their path'],
    ['there is no roof over them — rain falls straight on them and no one holds an umbrella', 'only a thin, small awning barely covers them from the rain']];
  var HOPE_EN = ['a friend walking toward them', 'an open window with light pouring in', 'a full jar of clear water', 'a clear stone path', 'a sheltering roof'];
  function prompt(spec) {
    var S = summary(spec); if (!S) return null;
    var absent = scene(spec).parts[S.need].absent;
    return [STYLE_EN, '',
      'SCENE (one single moment): ' + (S.over == null ? CALM_EN : OVER_EN[S.over]) + '. At the same time, ' + NEED_EN[S.need][absent ? 0 : 1] + '.',
      'HOPE: in the far background, a soft warm golden light falls on ' + HOPE_EN[S.need] + ', the thing they need most.',
      'FOCUS: the excess and the missing piece must both be obvious at first glance; keep everything else simple and uncluttered.',
      '', 'RULES: exactly one main person. No text, letters, numbers, signs, logos or watermarks. No fantasy elements.'].join('\n');
  }
  var OVER_Q = ['Is the main person carrying a stack of heavy boxes by themselves?', 'Is the main person pouring water from a jug into other cups, with water spilling?', 'Is the main person surrounded by many overflowing buckets or sacks?', 'Is the main person surrounded by tall walls or carrying a heavy stack of folders?', 'Is the main person surrounded by tall stacks of books or papers?'];
  var NEED_Q = [['Is there an empty seat or empty space beside the person, with no companion?', 'Is there at most a distant companion, not close by?'], ['Is a window shut or a tap dry near the person?', 'Is a window only slightly open near the person?'], ['Is there an empty or nearly empty jar near the person?', 'Is there a jar with only a little water near the person?'], ['Is the ground around the person without clear fences or paths?', 'Is there only a low or broken fence near the person?'], ['Is the person standing without a roof, in the rain?', 'Is the person under only a small awning, with rain around?']];
  function checklist(spec) {
    var S = summary(spec); if (!S) return [];
    var absent = scene(spec).parts[S.need].absent;
    var c = [{ id: 'person', q: 'Is there exactly one main person in the image?', critical: true }];
    if (S.over != null) c.push({ id: 'over', q: OVER_Q[S.over], critical: true });
    c.push({ id: 'need', q: NEED_Q[S.need][absent ? 0 : 1], critical: false });
    c.push({ id: 'hope', q: 'Is there a warm golden light somewhere in the background?', critical: false });
    c.push({ id: 'notext', q: 'Is the image free of any written text, letters, numbers or signs?', critical: true });
    c.push({ id: 'photo', q: 'Does it look like a real photograph rather than an illustration?', critical: false });
    return c;
  }
  function judge(spec, answers) {
    var c = checklist(spec), failed = c.filter(function (x) { return answers[x.id] !== true; }), critical = failed.filter(function (x) { return x.critical; });
    return { pass: critical.length === 0 && failed.length - critical.length <= 1, failed: failed.map(function (x) { return x.id; }), critical: critical.map(function (x) { return x.id; }) };
  }
  function sketchSVG() { return ''; }   // 한 장면은 배치 밑그림 없이 프롬프트만으로 그린다

  // ── 한눈 요약(2026-11-24 사용자 요청: A 한 줄 진단 → B 기운의 물길 → C 내 얘기 장면) ──
  //  비유를 배우지 않아도 읽히게: 쉬운 이름 + 넘치는 것 하나·필요한 것 하나만 강조. 모두 명세(십성 비율·역할·구조)에서 만든다.
  var EASY = ['내 힘', '퍼내는 힘', '모은 돈', '지키는 틀', '채워 주는 힘'];
  var EASY_SUB = ['버티는 힘·자존심', '표현·기술·일하는 손', '재물·결과·현실 감각', '책임·직장·규칙', '공부·도움·쉼'];
  var OVER_P = ['버티는 힘', '퍼내는 힘', '벌려 놓은 돈 일', '짊어진 책임', '생각과 걱정'];
  var NEED_P = ['함께 버텨 줄 내 힘', '밖으로 꺼낼 통로', '손에 쥐는 결과', '나를 잡아 주는 틀', '받쳐 줄 지붕(도움·배움)'];
  var SCENE = {
    over: ['내 방식대로 밀어붙이다가 주변과 부딪쳐, 결국 혼자 다 떠안았던 적', '일을 벌이면 손이 빠르고 아이디어가 쏟아지는데, 끝나고 보면 남는 게 생각보다 적었던 적', '돈 될 일을 여러 개 벌여 놓고 몸이 따라가지 못해 지쳤던 시기', '맡은 책임이 많아 쉬는 날에도 머릿속에서 일이 떠나지 않던 때', '생각하고 준비만 하다가 정작 시작할 때를 놓쳤던 적'],
    need: ['혼자 결정해야 할 때 내 편이 없다고 느껴 마음이 약해졌던 밤', '하고 싶은 말이 있었는데 꺼내지 못하고 삼켰던 순간', '열심히 했는데 통장에는 생각만큼 남지 않아 허탈했던 달', '정해진 틀이 없으니 오히려 하루가 흐트러졌던 시기', '남 챙기다 지쳐서, 정작 내가 기댈 사람은 없다고 느낀 밤'],
    got: ['믿을 만한 동료가 생기자 같은 일도 훨씬 가볍게 해냈던 때', '배운 걸 밖으로 보여 주기 시작하자 기회가 따라왔던 시기', '작은 것이라도 결과를 손에 쥐자 자신감이 붙었던 때', '마감과 규칙이 생기자 오히려 실력이 늘었던 시기', '공부·자격증·멘토가 생겼을 때 갑자기 일이 술술 풀린 시기'] };
  // 상생 물길 순서: 채워 주는 힘(인성) → 내 힘(비겁) → 퍼내는 힘(식상) → 모은 돈(재성) → 지키는 틀(관성) → 다시 인성
  var FLOW = [4, 0, 1, 2, 3];
  // 넘침(과다)의 뜻은 십성마다 다르다: 식상은 새고, 인성은 고이고, 관성은 누르고, 재성은 벅차고, 비겁은 부딪힌다
  var OVER_NOTE = ['주변과 부딪치거나, 같은 몫을 여럿이 나눠 쓰기 쉬워요.', '들어온 만큼 흘러 나가기 쉬워요 — 버는 만큼 새는 자리예요.', '벌여 놓은 돈 일이 커서 내 힘이 감당하기 벅차요.', '책임과 압박에 눌리기 쉬워요.', '고여 버려서 생각만 많고 움직임이 막히기 쉬워요.'];
  var LINK_IX = { gwanin: [3, 4], salin: [3, 4], siksaengjae: [1, 2], jaesaenggwan: [2, 3] };
  function summary(spec) {
    var sc = scene(spec); if (!sc) return null;
    var P = sc.parts, byP = P.slice().sort(function (a, b) { return b.p - a.p || a.i - b.i; });
    var over = byP[0].f >= 3 ? byP[0] : null;
    var yong = P.filter(function (p) { return p.role === 'Y'; })[0], hee = P.filter(function (p) { return p.role === 'H'; })[0];
    var need = yong && (!over || yong.i !== over.i) ? yong : hee && (!over || hee.i !== over.i) ? hee : P.slice().sort(function (a, b) { return a.p - b.p || a.i - b.i; }).filter(function (p) { return !over || p.i !== over.i; })[0];
    var needWord = need.absent ? '없는' : need.f <= 1 ? '약한' : '아쉬운';
    var headline = over ? OVER_P[over.i] + (ga(OVER_P[over.i]) ? '은' : '는') + ' 넘치는데, ' + NEED_P[need.i] + (ga(NEED_P[need.i]) ? '이' : '가') + ' ' + needWord + ' 사람'
      : '다섯 힘이 고르게 나뉜 사람 — ' + NEED_P[need.i] + (ga(NEED_P[need.i]) ? '을' : '를') + ' 채우면 더 단단해져요';
    var sub = (over ? EASY[over.i] + '(' + GN[over.i] + ')이 ' + over.p + '%로 가장 커요. ' : '') + EASY[need.i] + '(' + GN[need.i] + ')' + (need.absent ? '은 원국에 거의 없고, ' : '은 ' + need.p + '%이고, ') + (need.role === 'Y' || need.role === 'H' ? '이 사주에 필요한 기운(' + ROLE_KO[need.role] + ')이에요.' : '보태면 균형이 맞아요.');
    var bars = P.map(function (p) { return { i: p.i, name: EASY[p.i], sub: EASY_SUB[p.i], gn: p.gn, p: p.p, mark: over && p.i === over.i ? 'over' : p.i === need.i ? 'need' : '' }; });
    // 물길: 구간마다 폭(앞 칸 비율), 끊김(앞이나 뒤가 3% 미만), 샘(과다), 잘 이어짐(구조 성립·좋음)
    var nodes = FLOW.map(function (i) { return { i: i, name: EASY[i], p: P[i].p, absent: P[i].absent, leak: P[i].f === 4 }; });
    var good = sc.ix.filter(function (o) { return o.t === 'good' && LINK_IX[o.k]; }).map(function (o) { return LINK_IX[o.k]; });
    var notes = [];
    nodes.forEach(function (n, k) { var nx = nodes[(k + 1) % 5]; if (n.absent) notes.push({ t: 'cut', s: EASY[n.i] + (ga(EASY[n.i]) ? '이' : '가') + ' 끊겨 있어요 — ' + (k === 0 ? '밖에서 채워 주는 흐름 없이 내 힘으로만 버텨요.' : '이 자리에서 흐름이 멈춰요.') }); });
    nodes.forEach(function (n) { if (n.leak && !n.absent) notes.push({ t: 'leak', s: EASY[n.i] + (ga(EASY[n.i]) ? '이' : '가') + ' 너무 커서(' + n.p + '%) ' + OVER_NOTE[n.i] }); });
    good.forEach(function (pr) { notes.push({ t: 'good', s: EASY[pr[0]] + '에서 ' + EASY[pr[1]] + '(으)로 잘 이어져요.'.replace(/\(으\)로/, ga(EASY[pr[1]]) ? '으로' : '로') }); });
    if (!notes.length) notes.push({ t: 'ok', s: '크게 막히거나 새는 곳 없이 흐름이 이어져요.' });
    var scenes = [{ t: 'over', s: SCENE.over[(over || byP[0]).i] }, { t: 'need', s: SCENE.need[need.i] }, { t: 'got', s: SCENE.got[need.i] }];
    return { headline: headline, sub: sub, over: over ? over.i : null, need: need.i, bars: bars, nodes: nodes, good: good, notes: notes, scenes: scenes };
  }
  // B 물길 SVG: 다섯 칸을 ㄷ자로 잇고, 물길 굵기 = 앞 칸 비율. 끊긴 칸은 점선, 새는 칸은 물방울, 잘 이어진 구간은 초록
  function flowSVG(spec) {
    var S = summary(spec); if (!S) return '';
    var N = S.nodes, W = 600, H = 300, R = 50, pos = [[62, 70], [212, 70], [362, 70], [530, 70], [530, 228]], back = [360, 228];
    var col = function (n) { return S.over === n.i ? '#D85A30' : S.need === n.i ? '#3B6D11' : '#5F5E5A'; };
    var isGood = function (a, b) { return S.good.some(function (pr) { return pr[0] === a && pr[1] === b; }); };
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" class="sf-svg" role="img"><title>기운의 물길</title>';
    for (var k = 0; k < 4; k++) {
      var a = N[k], b = N[k + 1], A = pos[k], B = pos[k + 1], w = Math.max(4, Math.min(30, a.p / 1.7)), cut = a.absent || b.absent;
      var stroke = cut ? '#B4B2A9' : isGood(a.i, b.i) ? '#639922' : '#7FA7C4';
      s += '<path d="' + (k === 3 ? 'M' + A[0] + ' ' + (A[1] + R) + ' L' + B[0] + ' ' + (B[1] - R) : 'M' + (A[0] + R) + ' ' + A[1] + ' L' + (B[0] - R) + ' ' + B[1]) + '" stroke="' + stroke + '" stroke-width="' + (cut ? 3 : w) + '"' + (cut ? ' stroke-dasharray="6 6"' : '') + ' fill="none" stroke-linecap="round"/>';
    }
    // 마지막 칸(지키는 틀) → 처음(채워 주는 힘)으로 돌아가는 물길
    var L = N[4], F = N[0], cutB = L.absent || F.absent, wB = Math.max(4, Math.min(30, L.p / 1.7));
    s += '<path d="M' + (530 - R) + ' 228 L62 228 L62 ' + (70 + R) + '" stroke="' + (cutB ? '#B4B2A9' : isGood(L.i, F.i) ? '#639922' : '#7FA7C4') + '" stroke-width="' + (cutB ? 3 : wB) + '"' + (cutB ? ' stroke-dasharray="6 6"' : '') + ' fill="none" stroke-linejoin="round" opacity=".85"/>';
    N.forEach(function (n, k) {
      var p = pos[k], c = col(n);
      s += '<g data-part="' + n.i + '"><circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + R + '" fill="#fff" stroke="' + c + '" stroke-width="' + (S.over === n.i || S.need === n.i ? 3 : 1.5) + '"' + (n.absent ? ' stroke-dasharray="5 4"' : '') + '/>';
      s += '<text x="' + p[0] + '" y="' + (p[1] - 4) + '" text-anchor="middle" font-size="' + (n.name.length > 4 ? 15 : 19) + '" font-weight="700" fill="' + c + '">' + n.name + '</text><text x="' + p[0] + '" y="' + (p[1] + 20) + '" text-anchor="middle" font-size="18" fill="' + c + '">' + n.p + '%</text></g>';
      if (n.leak && !n.absent && n.i === 1) s += '<path d="M' + (p[0] + 30) + ' ' + (p[1] + 44) + ' q10 12 2 22 M' + (p[0] + 44) + ' ' + (p[1] + 36) + ' q10 10 2 20" stroke="#D85A30" stroke-width="2.5" fill="none"/>';
    });
    s += '<text x="296" y="160" text-anchor="middle" font-size="17" fill="#888780">굵기 = 힘의 크기 · 점선 = 끊긴 곳</text>';
    return s + '</svg>';
  }

  var api = { VERSION: VERSION, summary: summary, flowSVG: flowSVG, EASY: EASY, STYLE_V: STYLE_V, PART: PART, GN: GN, IX_KO: IX_KO, fromChart: fromChart, clean: clean, key: key, scene: scene, caption: caption, partInfo: partInfo, svg: svg, sketchSVG: sketchSVG, prompt: prompt, checklist: checklist, judge: judge };
  G.MantraSajuHouse = api;
  if (typeof module === 'object' && module && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
