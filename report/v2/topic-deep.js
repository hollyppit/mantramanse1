/* 주제 심화 2차(2026-11-06) — 재물·커리어·인연·개운(공간) 장에 만세력 계산을 순위·그래프 블록으로 붙인다.
   · 계산은 하지 않는다. 이미 있는 엔진만 읽는다:
       engine.js evaluateDomainLuck(+확장 지표 12종) · wealth-career.js(수익 유형·업무 환경·직업·약점) · compat-pair.js(두 사람 궁합)
       fengshui-engine.js(현공비성·팔택) · fengshui-data.js(업종 오행) · region-reading.js(방위오행 해석) · wish-spots.js(소원성취 명당)
   · 등급(최고·좋음·무난·주의·부담)은 만세력 ‘운세 흐름 → 그래프 지표’와 같은 구간(SIG_CUTS, index.html)을 쓴다. 구간이 바뀌면 함께 바꾼다.
   · 스위치 topicDeep(기본 꺼짐): 관리자 운세 환경 탭 또는 로컬·미리보기 주소 ?mantraFlags=topicDeep. 꺼져 있으면 아무것도 붙이지 않는다.
   · 사건을 예측하지 않는다. 점수는 이 앱 해석 모델의 상대 비교이며, 문장은 엔진이 만든 요약·근거를 그대로 옮긴다.
   연결: reading-feature.js 가 SPEC 의 custom:'td:*' 조각을 이 모듈의 render 로 넘긴다. 검증: node tests/topic-deep-sim.cjs */
(function (root) {
  'use strict';
  var R = root.ReportV2 = root.ReportV2 || {}, DOC = root.document;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var EL = ['목', '화', '토', '금', '수'], EL_HJ = ['木', '火', '土', '金', '水'];
  var ROLE_RANK = { '용신': 4, '희신': 3, '한신': 2, '구신': 1, '기신': 0 };

  // ── 등급: 만세력 그래프 지표와 같은 구간 ──
  var SIG_CUTS = { love: [45, 49, 58, 66], wealth: [39, 44, 51, 56], health: [56, 63, 73, 78], accident: [16, 23, 37, 50], job: [45, 50, 57, 63], move: [47, 51, 59, 67], career: [41, 49, 60, 66], business: [44, 50, 58, 64], child: [42, 46, 58, 67], marriage: [39, 47, 62, 72], noble: [40, 49, 60, 68], study: [43, 49, 58, 65], windfall: [35, 41, 52, 64], windfallLoss: [17, 24, 39, 54], estate: [45, 51, 60, 66], social: [45, 51, 58, 63], family: [44, 49, 59, 66] };
  var SIG = [{ k: 'best', n: '최고', c: '#2E7D4F' }, { k: 'good', n: '좋음', c: '#5BAA6F' }, { k: 'ok', n: '무난', c: '#9AA3B2' }, { k: 'warn', n: '주의', c: '#D9A035' }, { k: 'bad', n: '부담', c: '#C9503C' }];
  function sig(key, v) {
    var c = SIG_CUTS[key]; if (!c) return SIG[2];
    var inv = key === 'accident' || key === 'windfallLoss', x = inv ? -v : v, q = inv ? c.slice().reverse().map(function (z) { return -z; }) : c;
    return x >= q[3] ? SIG[0] : x >= q[2] ? SIG[1] : x > q[1] ? SIG[2] : x > q[0] ? SIG[3] : SIG[4];
  }
  var SUB = {
    windfall: { name: '횡재운', what: '뜻밖의 수입·기회 신호와 들어온 것을 지키는 힘' }, business: { name: '사업운', what: '내 일을 벌이고 굴리는 힘' },
    job: { name: '취업운', what: '조직과 닿는 기회와 받쳐 주는 구조' }, move: { name: '이직운', what: '자리를 옮기는 신호와 옮겨도 유리한 구조' },
    career: { name: '직업운', what: '내 적성 분야가 살아나는 정도' }, marriage: { name: '결혼운', what: '결속 신호와 배우자 자리의 안정' },
    family: { name: '부모·가족운', what: '가족 영역의 움직임과 가정의 안정' }, child: { name: '자식운', what: '자녀 자리의 활성과 안정' },
    social: { name: '대인·구설운', what: '교류의 활발함과 말·약속의 마찰' }, noble: { name: '귀인운', what: '도와주는 사람이 붙는 신호' },
    study: { name: '학업운', what: '배움이 쌓이는 집중 환경' }, estate: { name: '문서·이사운', what: '계약·거처 쪽 움직임과 안정' },
    wealth: { name: '재물운', what: '재정 활동성·적합도·안정성' }, love: { name: '애정운', what: '관계 활성도·적합도·안정성' },
  };

  // ── 스위치 ──
  var on = false, ready = false, rev = 0, waiters = [];
  function flagLocal() { try { var f = root.MANTRA_FLAGS; if (f && f.topicDeep === true) return true; var h = root.location && root.location.hostname || ''; if (/^(localhost|127\.0\.0\.1)$/.test(h) || /^[a-z0-9][a-z0-9-]*\.mantramanse\.pages\.dev$/i.test(h)) return /[?&]mantraFlags=[A-Za-z,]*\btopicDeep\b/.test(root.location.search || ''); } catch (e) { } return false; }
  var DEPS = ['/compat-pair.js', '/fengshui-data.js', '/fengshui-engine.js', '/wealth-career-data.js', '/wealth-career-data-2.js', '/wealth-career-data-3.js', '/wealth-career-jobs.js', '/wealth-career.js', '/region-data.js', '/region-reading-data.js', '/region-reading.js', '/wish-spots.js'];
  var spots = null;
  function loadScripts() {
    return DEPS.reduce(function (p, src) { return p.then(function () { return new Promise(function (ok) { var s = DOC.createElement('script'); s.src = src; s.async = false; s.onload = ok; s.onerror = ok; DOC.head.appendChild(s); }); }); }, Promise.resolve());
  }
  function getJson(u, ms) { return new Promise(function (ok) { var d = false, fin = function (v) { if (!d) { d = true; ok(v); } }; setTimeout(function () { fin(null); }, ms); try { fetch(u).then(function (r) { return r.ok ? r.json() : null; }).then(fin, function () { fin(null); }); } catch (e) { fin(null); } }); }
  function init() {
    if (!DOC || typeof fetch === 'undefined') return;
    var local = flagLocal();
    (local ? Promise.resolve(true) : (root.MantraLastGood ? root.MantraLastGood.json('/api/luck-flags', 5000, function (d) { return !!(d && typeof d === 'object' && Number.isInteger(d.version)); }) : getJson('/api/luck-flags', 4000)).then(function (d) { return !!(d && d.topicDeep === true); })).then(function (v) {
      if (!v) return; on = true;
      return Promise.all([loadScripts(), getJson('/api/wish-spots', 4000).then(function (d) { spots = d && d.enabled && Array.isArray(d.spots) ? d.spots : null; })]).then(function () { ready = true; rev++; waiters.splice(0).forEach(function (f) { try { f(); } catch (e) { } }); });
    });
  }

  // ── 공통 조각 ──
  function D() { return R.Deep; }
  function bar(label, v, o) { var Dp = D(); if (Dp && Dp.bar) return Dp.bar(label, v, o); return '<div class="dp-bar"><span class="dp-bl">' + esc(label) + '</span><span class="dp-bt"><i style="width:' + Math.round(clamp(v, 0, 100)) + '%"></i></span><b>' + esc(o && o.text != null ? o.text : Math.round(v)) + '</b></div>'; }
  function box(cap, lead, body) { return '<section class="dp-embed dp td-blk"><div class="cap">' + esc(cap) + '</div>' + (lead ? '<p class="lead">' + lead + '</p>' : '') + body + '</section>'; }
  function chip(s) { return '<span class="td-chip" style="background:' + s.c + '">' + esc(s.n) + '</span>'; }
  function who(H) { return H.name ? esc(H.name) + '님' : '당신'; }
  function rolesOf(ch) { return (ch.yong && ch.yong.roles) || (ch.yongAll && ch.yongAll.eokbu && ch.yongAll.eokbu.roles) || {}; }

  /* ① 그래프 지표: 앞으로 10년(세운) 또는 12개월(월운) — 등급 · TOP 3 · 엔진 요약·근거 */
  function subTiming(H, key, scope) {
    var M = H.M, ch = H.ch, Y = (H.sd && H.sd.nowYear) || new Date().getFullYear(), S = SUB[key]; if (!M || !ch || !S) return null;
    var list = [], lv = scope === 'month' ? 'wolun' : 'seun';
    if (scope === 'month') { var all = M.wolun(ch, Y).concat(M.wolun(ch, Y + 1)), now = H.now || Date.now(), ci = 0; all.forEach(function (x, i) { if (x.startMs <= now) ci = i; }); list = all.slice(ci, ci + 12); }
    else list = M.seunRange(ch, Y, Y + 9);
    var rows = list.map(function (x, i) {
      var d; try { d = M.evaluateDomainLuck(ch, x, lv); } catch (e) { return null; }
      var o = d && d[key]; if (!o) return null;
      var v = Math.round(clamp(o.score, 0, 100)), label = scope === 'month' ? (new Date(x.startMs).getMonth() + 1) + '월' : x.year + '년';
      return { i: i, v: v, s: sig(key, v), label: label, gz: M.gzNameK ? M.gzNameK(x) : '', age: scope === 'month' ? null : x.year - ch.solar.y, sum: o.summary || '', why: (o.reasons || [])[0] || '', loss: o.loss || null };
    }).filter(Boolean);
    if (rows.length < 3) return null;
    var top = rows.slice().sort(function (a, b) { return b.v - a.v || a.i - b.i; }).slice(0, 3), low = rows.slice().sort(function (a, b) { return a.v - b.v || a.i - b.i; })[0];
    var star = top.map(function (r) { return r.i; });
    var body = '<div class="dp-bars">' + rows.map(function (r) { return bar((star.indexOf(r.i) >= 0 ? '★ ' : '') + r.label + (r.gz ? ' ' + r.gz : ''), r.v, { text: r.v + ' · ' + r.s.n, color: r.s.c }); }).join('') + '</div>';
    body += '<h4 class="td-h">' + esc(S.name) + '이 가장 살아나는 ' + (scope === 'month' ? '달' : '해') + ' TOP 3</h4><ol class="td-ol">' + top.map(function (r) {
      return '<li><b>' + esc(r.label) + (r.age != null ? ' (' + r.age + '세)' : '') + '</b> ' + chip(r.s) + ' <span class="td-sc">' + r.v + '점</span><br>' + esc(r.sum) + (r.why ? '<br><small>근거: ' + esc(r.why) + '</small>' : '') + '</li>';
    }).join('') + '</ol>';
    body += '<p class="td-note"><b>가장 조심할 ' + (scope === 'month' ? '달' : '해') + '</b>: ' + esc(low.label) + ' ' + chip(low.s) + ' — ' + esc(low.sum) + '</p>';
    if (key === 'windfall') {
      var lossTop = rows.filter(function (r) { return r.loss; }).sort(function (a, b) { return b.loss.score - a.loss.score; }).slice(0, 2);
      if (lossTop.length) body += '<p class="td-note td-warn"><b>뜻밖의 재물 손실 위험이 큰 ' + (scope === 'month' ? '달' : '해') + '</b>: ' + lossTop.map(function (r) { return esc(r.label) + ' (손실 위험 ' + r.loss.score + '점 · ' + esc(r.loss.band) + ')'; }).join(', ') + '. 이 시기엔 보증·고위험 투자·큰 지출을 한 번 더 확인하세요.</p>';
    }
    var lead = who(H) + '의 <b>' + esc(S.name) + '</b>(' + esc(S.what) + ')을 ' + (scope === 'month' ? '앞으로 12개월' : '앞으로 10년') + ' 동안 계산했어요. 색은 만세력 ‘운세 흐름’ 그래프와 같은 기준이에요.';
    return box((scope === 'month' ? '앞으로 12개월 ' : '앞으로 10년 ') + S.name + ' 그래프', lead, body + '<p class="td-foot">점수는 이 앱 해석 모델의 상대 지표이며 사건을 예측하지 않습니다.</p>');
  }

  /* ② 직업·활동 적성(wealth-career.js) */
  function wcOf(H) { var W = root.MantraWealthCareer; if (!W || !H.M || !H.ch) return null; if (H.__wc) return H.__wc; try { H.__wc = W.build(H.M, H.ch, { name: H.name || '' }); } catch (e) { H.__wc = null; } return H.__wc; }
  function income(H) {
    var wc = wcOf(H); if (!wc || !wc.s1 || !wc.s1.rows) return null;
    var rows = wc.s1.rows.slice().sort(function (a, b) { return b.score - a.score; });
    var body = rows.map(function (r, n) {
      return '<section class="dp-embed dp dp-job"><small class="dp-rank">' + (n + 1) + '순위</small><h4>' + esc(r.name) + (r.qualified ? '' : ' <span class="td-mut">(조건 일부 미충족)</span>') + '</h4>' + bar('', r.score, { cls: 'dp-slim', text: r.score + '점', color: n < 2 ? '#D5B97F' : '' }) +
        (r.evidence && r.evidence.length ? '<ul class="dp-ul">' + r.evidence.slice(0, 3).map(function (e) { return '<li>' + esc(e) + '</li>'; }).join('') + '</ul>' : '') + '</section>';
    }).join('');
    return box('나에게 맞는 돈 버는 방식 순위', who(H) + ' 원국의 십성 힘과 구조(식신생재·살인상생 등)를 겹쳐 수익 유형 ' + rows.length + '가지를 점수로 비교했어요.', body);
  }
  function jobs(H, n) {
    var wc = wcOf(H); if (!wc || !wc.s3 || !wc.s3.jobs || !wc.s3.jobs.length) return null;
    var list = wc.s3.jobs.slice(0, n || 10), BR = { license: '자격·면허 필요', experience: '경력·포트폴리오 필요', open: '자유 진입' };
    var body = list.map(function (j, i) {
      var fit = j._fit && j._fit.total, why = [j.link && j.link.text, j.how ? '하는 일: ' + j.how : '', j.income ? '버는 구조: ' + j.income : '', j.caution ? '조심할 점: ' + j.caution : ''].filter(Boolean);
      return '<section class="dp-embed dp dp-job"><small class="dp-rank">' + (i + 1) + '순위</small><h4>' + esc(j.name) + '</h4><p class="td-mut">' + esc([j.typeName, j.barrierLabel || BR[j.barrier] || '', (j.cats || []).map(function (c) { return c.name; }).slice(0, 2).join('·')].filter(Boolean).join(' · ')) + '</p>' + (fit != null ? bar('', fit, { cls: 'dp-slim', text: Math.round(fit) + '점', color: i < 3 ? '#D5B97F' : '' }) : '') +
        (why.length ? '<ul class="dp-ul">' + why.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>' : '') + (j.path ? '<p class="td-mut">진입 경로: ' + esc(j.path) + '</p>' : '') + '</section>';
    }).join('');
    return box('나에게 맞는 직업 TOP ' + list.length, '만세력 ‘직업·돈 버는 방식’과 같은 계산이에요. 수익 방식과 업무 환경을 함께 놓고 직업 DB에서 골랐어요.', body + '<p class="td-foot">명리상 맞는 구조와 실제 진입 가능성은 별개입니다. 자격 요건은 시행 기관에서 최신 정보를 확인하세요.</p>');
  }
  function env(H) {
    var wc = wcOf(H); if (!wc || !wc.s2 || !wc.s2.axes) return null;
    var body = '<div class="td-axes">' + wc.s2.axes.map(function (a) {
      var t = function (l) { return (l && l[0] && l[0].text) || ''; }, why = [].concat(a.basis || []).slice(0, 1);
      return '<div class="td-axis"><small>' + esc(a.name) + '</small><b>' + esc(a.leanLabel || a.label || '') + '</b>' + (t(a.strength) ? '<p><b class="td-fix">강점</b> ' + esc(t(a.strength)) + '</p>' : '') + (t(a.burden) ? '<p><b class="td-warn">부담</b> ' + esc(t(a.burden)) + '</p>' : '') + (t(a.example) ? '<p class="td-mut">예: ' + esc(t(a.example)) + '</p>' : '') + (why.length ? '<p class="td-mut">근거: ' + esc(why[0]) + '</p>' : '') + '</div>';
    }).join('') + '</div>';
    return box('나에게 맞는 업무 환경 5가지', '조직·독립, 속도, 사람과의 거리 같은 일하는 환경을 원국 값으로 판정했어요. 점수가 아니라 방향과 강도로 보여 드려요.', body);
  }
  function weak(H) {
    var wc = wcOf(H); if (!wc || !wc.s4 || !wc.s4.items || !wc.s4.items.length) return null;
    var t = function (l) { return (l && l[0] && l[0].text) || ''; };
    var body = '<ul class="td-ol">' + wc.s4.items.map(function (it) { return '<li><b>' + esc(t(it.title) || it.domain) + '</b> <span class="td-mut">' + esc(it.domain + ' · ' + (it.levelLabel || '')) + '</span>' + (t(it.why) ? '<br>' + esc(t(it.why)) : '') + (t(it.scene) ? '<br><small>이런 장면: ' + esc(t(it.scene)) + '</small>' : '') + (t(it.fix) ? '<br><b class="td-fix">이렇게 막아요</b> ' + esc(t(it.fix)) : '') + '</li>'; }).join('') + '</ul>';
    return box('일에서 약해지기 쉬운 지점', '원국 구조에서 읽히는 “약해질 가능성”이에요. 해당하지 않으면 가볍게 넘기세요.', body);
  }
  function industry(H) {
    var FD = root.MantraFengshuiData; if (!FD || !FD.INDUSTRY || !H.ch) return null;
    var roles = rolesOf(H.ch), rows = FD.INDUSTRY.map(function (x, i) { var a = ROLE_RANK[roles[x.el]], b = ROLE_RANK[roles[x.sub]]; return { x: x, i: i, v: Math.round(20 + 15 * (a == null ? 2 : a) + 5 * (b == null ? 2 : b)), r1: roles[x.el], r2: roles[x.sub] }; }).sort(function (a, b) { return b.v - a.v || a.i - b.i; });
    var row = function (r, n, label) { return '<li><b>' + label + ' ' + esc(r.x.name) + '</b> <span class="td-sc">' + r.v + '점</span><br><small>주 기운 ' + EL[r.x.el] + EL_HJ[r.x.el] + '(이 사주에서 ' + esc(r.r1 || '-') + ') · 보조 ' + EL[r.x.sub] + EL_HJ[r.x.sub] + '(' + esc(r.r2 || '-') + ')</small><br>' + esc(r.x.note || '') + '</li>'; };
    var body = '<h4 class="td-h">잘 맞는 업종</h4><ol class="td-ol">' + rows.slice(0, 4).map(function (r, n) { return row(r, n, (n + 1) + '순위'); }).join('') + '</ol>' +
      '<h4 class="td-h">운영 방식으로 보완이 필요한 업종</h4><ul class="td-ol">' + rows.slice(-3).reverse().map(function (r) { return row(r, 0, ''); }).join('') + '</ul>';
    return box('내 사주와 맞는 업종 순위', '업종마다 주·보조 오행을 정하고, 그 기운이 ' + who(H) + ' 사주에서 용신·희신인지 기신·구신인지로 순위를 매겼어요(만세력 ‘공간·명당 → 사업장’과 같은 기준).', body + '<p class="td-foot">업종 오행 분류는 전통 분류에 따른 참고용이며, 실제 사업성은 상권·시장 조사가 더 중요합니다.</p>');
  }

  /* ③ 궁합: 만세력 ‘궁합’ 탭에 저장한 상대(이 기기 localStorage)를 그대로 쓰고, 여기서 추가하면 만세력에도 보인다. */
  var PR_KEY = 'mantra-manse-v1-partners', REL_NAME = { lover: '연인·부부', work: '직장·동업', friend: '친구', family: '가족' };
  function partners() { try { var l = JSON.parse(root.localStorage.getItem(PR_KEY) || '[]'); return Array.isArray(l) ? l : []; } catch (e) { return []; } }
  function savePartner(rec) { var key = function (x) { return [x.name, x.year, x.month, x.day, x.hour, x.minute, x.gender, x.calendar].join('|'); }; var l = [rec].concat(partners().filter(function (x) { return key(x) !== key(rec); })).slice(0, 8); try { root.localStorage.setItem(PR_KEY, JSON.stringify(l)); } catch (e) { } }
  function partnerChart(M, me, p) {
    var i = me.input || {};
    return M.compute({ year: +p.year, month: +p.month, day: +p.day, hour: p.hourUnknown ? null : +p.hour, minute: +p.minute || 0, calendar: p.calendar || 'solar', leap: !!p.leap, gender: p.gender, lon: p.lon != null ? +p.lon : 126.98, timeMode: i.timeMode, jasi: i.jasi, sinsalBase: i.sinsalBase, model: i.model, school: i.school, combinationMode: i.combinationMode, climatePalaceMode: i.climatePalaceMode });
  }
  function evalPair(H, p, rel) { var PC = root.PairCompat; if (!PC || !H.M || !H.ch) return null; try { return PC.evaluate(H.M, H.ch, partnerChart(H.M, H.ch, p), rel || p.rel || 'lover', { a: H.name || '나', b: p.name || '상대' }); } catch (e) { return null; } }
  var cpSel = {};
  function compatForm(id, rel) {
    var g = (cpSel.gender || 'F');
    return '<form class="td-cpf" data-td-cpf="' + esc(id) + '" data-rel="' + esc(rel) + '"><p class="td-mut">상대의 생년월일을 넣으면 바로 계산해요. 입력한 정보는 이 기기에만 저장되고, 만세력 ‘궁합’ 탭에서도 함께 보여요.</p>' +
      '<div class="td-cpr"><input name="name" placeholder="이름(선택)" maxlength="20"><select name="gender"><option value="F"' + (g === 'F' ? ' selected' : '') + '>여</option><option value="M"' + (g === 'M' ? ' selected' : '') + '>남</option></select><select name="calendar"><option value="solar">양력</option><option value="lunar">음력</option></select></div>' +
      '<div class="td-cpr"><input name="year" inputmode="numeric" placeholder="년(예: 1993)" required><input name="month" inputmode="numeric" placeholder="월" required><input name="day" inputmode="numeric" placeholder="일" required><input name="hour" inputmode="numeric" placeholder="시(모르면 비움)"></div>' +
      '<button type="submit" class="td-btn">궁합 보기</button><p class="td-err" hidden></p></form>';
  }
  function compat(H, rel, id) {
    if (!root.PairCompat) return null;
    var list = partners(), relN = REL_NAME[rel] || '연인·부부';
    if (!list.length) return box(relN + ' 궁합 보기', '아직 저장된 상대가 없어요. 상대 정보를 넣으면 ' + who(H) + '과의 궁합 점수와 항목별 이유를 바로 보여 드려요.', compatForm(id, rel));
    var idx = Math.min(cpSel[id] || 0, list.length - 1), p = list[idx], r = evalPair(H, p, rel);
    var tabs = list.length > 1 ? '<div class="td-cpt">' + list.map(function (x, i) { return '<button type="button" class="td-btn' + (i === idx ? ' on' : '') + '" data-td-cp="' + esc(id) + ':' + i + '">' + esc(x.name || '상대 ' + (i + 1)) + '</button>'; }).join('') + '</div>' : '';
    if (!r) return box(relN + ' 궁합', '', tabs + '<p class="td-mut">이 상대의 궁합을 계산하지 못했어요. 생년월일을 확인해 주세요.</p>' + compatForm(id, rel));
    var g = r.grade || {}, items = (r.parts || []).slice(0, 8), rels = (r.relations || []).filter(function (x) { return x.txt && x.txt[1]; }).sort(function (a, b) { return (b.str || 0) - (a.str || 0); }).slice(0, 4);
    var body = tabs + '<div class="td-cph"><b class="td-cps">' + Math.round(r.score) + '</b><span>점 · ' + esc(g.name || '') + '</span></div>' +
      (r.best && r.worst ? '<p class="lead">가장 잘 맞는 곳은 <b>' + esc(r.best.label) + '</b>(' + Math.round(r.best.score) + '점), 가장 신경 쓸 곳은 <b>' + esc(r.worst.label) + '</b>(' + Math.round(r.worst.score) + '점)이에요.</p>' : '') +
      '<div class="dp-bars">' + items.map(function (it) { return bar(it.label || '', it.score, { text: Math.round(it.score) + '점' }); }).join('') + '</div>' +
      (rels.length ? '<h4 class="td-h">두 사주가 만나는 자리</h4><ul class="dp-ul">' + rels.map(function (x) { return '<li><b>' + esc(x.name) + ' · ' + esc(x.txt[1]) + '</b> — ' + esc(x.txt[2] || '') + (x.txt[3] ? '<br><small>이렇게: ' + esc(x.txt[3]) + '</small>' : '') + '</li>'; }).join('') + '</ul>' : '') +
      (r.stems && r.stems.aSeesB ? '<p class="td-note">' + who(H) + '에게 상대는 <b>' + esc(r.stems.aSeesB) + '</b>, 상대에게 ' + who(H) + '은 <b>' + esc(r.stems.bSeesA) + '</b>의 사람이에요.</p>' : '') +
      '<details class="td-more"><summary>다른 상대 추가하기</summary>' + compatForm(id, rel) + '</details>';
    return box(who(H) + ' × ' + (p.name || '상대') + ' · ' + relN + ' 궁합', '', body + '<p class="td-foot">궁합 점수는 명리 모델의 참고 지표이며 관계의 결과를 정하지 않습니다.</p>');
  }
  function compatRank(H, rel, id) {
    var list = partners(); if (!root.PairCompat) return null;
    if (list.length < 2) return compat(H, rel, id);
    var rows = list.map(function (p, i) { var r = evalPair(H, p, rel); return r ? { p: p, i: i, v: Math.round(r.score), g: r.grade || {} } : null; }).filter(Boolean).sort(function (a, b) { return b.v - a.v; });
    var body = '<div class="dp-bars">' + rows.map(function (x, n) { return bar((n + 1) + '순위 · ' + (x.p.name || '상대 ' + (x.i + 1)), x.v, { text: x.v + '점 · ' + (x.g.name || x.g.label || '') }); }).join('') + '</div><details class="td-more"><summary>다른 상대 추가하기</summary>' + compatForm(id, rel) + '</details>';
    return box('저장한 사람들과의 ' + (REL_NAME[rel] || '') + ' 궁합 순위', '만세력 ‘궁합’ 탭과 여기서 저장한 ' + rows.length + '명을 같은 기준으로 비교했어요.', body);
  }

  /* ④ 공간: 방위·지역·우리 집·명당 */
  function mode(H) { var a; try { a = H.M.methodAdvice(H.ch); } catch (e) { a = null; } return a && a.verdict === '병행' ? 'both' : a && a.verdict === '조후' ? 'johu' : 'eokbu'; }
  var TONE_V = { best: 3, good: 2, fit: 2, ok: 1, neutral: 1, mixed: 0, caution: -1, bad: -2, avoid: -2 };
  function dirs(H, kind) {
    var FD = root.MantraFengshuiData, RR = root.MantraRegionReading, F = root.MantraFengshui; if (!FD || !RR || !FD.PALACE) return null;
    var md = mode(H), RD = root.MantraRegionReadingData || {}, kua = null, stars = null;
    try { if (F && F.bazhai && F.birthYearFromChart) { var bz = F.bazhai({ birthYear: F.birthYearFromChart(H.ch), gender: H.ch.gender }); stars = bz && bz.personStars; kua = bz && bz.person; } } catch (e) { }
    var rows = FD.PALACE.map(function (p, i) { var t = RR.toneOfElement(H.M, H.ch, EL[p.el], md), st = stars && stars[i]; return { p: p, i: i, t: t, net: t.net || 0, st: st }; }).sort(function (a, b) { return b.net - a.net || a.i - b.i; });
    var body = '<ol class="td-ol">' + rows.map(function (r, n) {
      var lab = (RD.TONE_LABEL || {})[r.t.tone] || r.t.tone, agree = r.st ? (r.st.good === (r.net > 0) ? '두 이론이 같은 방향' : '두 이론이 엇갈림 — 사주 쪽을 우선해 가볍게') : '';
      return '<li' + (n < 3 ? ' class="td-top"' : '') + '><b>' + (n + 1) + '. ' + esc(r.p.dir) + '쪽</b> <span class="td-mut">' + EL[r.p.el] + EL_HJ[r.p.el] + ' 기운 · 사주 판정 ' + esc(lab) + '</span>' + (r.st ? '<br><small>팔택 본명괘 기준: ' + esc(r.st.name) + (r.st.good ? '(길)' : '(흉)') + ' · ' + esc(agree) + '</small>' : '') + '</li>';
    }).join('') + '</ol>';
    var lead = kind === 'biz' ? '사업장을 고를 때 지금 사는 곳에서 어느 방향 지역이 ' + who(H) + ' 사주의 ' + ({ eokbu: '억부', johu: '조후', both: '억부·조후' }[md]) + ' 기준과 맞는지 순위로 정리했어요.' : '거처를 옮기거나 방을 고를 때 참고할 방향 순위예요. ' + who(H) + ' 사주의 ' + ({ eokbu: '억부', johu: '조후', both: '억부·조후' }[md]) + ' 기준으로 방위오행을 판정했어요.';
    return box(kind === 'biz' ? '사업장 방향 추천 순위' : '내 사주에 맞는 거주 방향 순위', lead + (kua ? ' 팔택은 본명괘 <b>' + esc(kua.gua || '') + '</b>(' + esc(kua.groupName || '') + ') 기준이에요.' : ''), body + '<p class="td-foot">사주(필요한 기운)와 풍수(건물·방위의 조건)는 다른 체계라 점수를 합치지 않고 나란히 보여 드립니다.</p>');
  }
  function regions(H) {
    var RG = root.MantraRegion, RR = root.MantraRegionReading; if (!RG || !RR || !RG.REGIONS) return null;
    var md = mode(H), rows = RG.REGIONS.map(function (r, i) { var t = RG.tradition(r), rd = null; try { rd = RR.read(H.M, H.ch, t, { region: r.name, mode: md }); } catch (e) { } var tn = RR.toneOfElement(H.M, H.ch, t.element, md); return { r: r, i: i, t: t, rd: rd, net: tn.net || 0 }; }).sort(function (a, b) { return b.net - a.net || a.i - b.i; });
    var top = rows.slice(0, 5), body = '<ol class="td-ol">' + top.map(function (x, n) { return '<li class="td-top"><b>' + (n + 1) + '순위 ' + esc(x.r.name) + '</b> <span class="td-mut">' + esc(x.t.direction) + '쪽 · ' + esc(x.t.element) + ' 기운' + (x.rd && x.rd.toneLabel ? ' · ' + esc(x.rd.toneLabel) : '') + '</span>' + (x.rd && x.rd.headline ? '<br>' + esc(x.rd.headline.text || x.rd.headline) + (x.rd.overall && x.rd.overall[0] ? ' ' + esc(x.rd.overall[0].text) : '') : '') + '</li>'; }).join('') + '</ol>';
    var last = rows[rows.length - 1];
    body += '<p class="td-note">가장 신중하게 볼 지역: <b>' + esc(last.r.name) + '</b>(' + esc(last.t.direction) + '쪽)' + (last.rd && last.rd.headline ? ' — ' + esc(last.rd.headline.text || last.rd.headline) : '') + '</p>';
    return box('내 사주에 맞는 지역 TOP 5', '전국 ' + rows.length + '개 시·도를 남한 중앙부(대전) 기준 방위오행으로 놓고 ' + who(H) + ' 사주의 필요한 기운과 비교했어요.', body + '<p class="td-foot">' + esc(RG.NOTE || '방위오행은 상징적 대응이며 실제 지역의 오행량이나 생활 조건을 뜻하지 않습니다.') + '</p>');
  }
  function house(H) {
    var F = root.MantraFengshui; if (!F || !F.analyze) return null;
    var sp = null; try { sp = JSON.parse(root.localStorage.getItem('mantra-space-v1') || 'null'); } catch (e) { }
    var c = sp && Array.isArray(sp.home) && sp.home.filter(function (x) { return x && x.facing !== '' && isFinite(+x.facing); })[0];
    if (!c) return box('우리 집 현공풍수', '만세력 <b>공간·명당 → 우리 집·사업장 풍수</b>에서 집의 향(방향)과 준공 연도를 넣으면, 여기서 현공비성 판정과 내 사주에 필요한 방향이 이 집에서 어떤 별을 만나는지 함께 보여 드려요.', '<p><a class="td-btn" href="/#space">만세력에서 집 정보 넣기 ›</a></p>');
    var an; try { an = F.analyze({ ch: H.ch, facingDeg: +c.facing, builtYear: c.built || null, renovationYear: c.reno || null, evalYear: new Date().getFullYear(), form: Object.assign({}, c.form, { hazards: c.hazards }) }); } catch (e) { return null; }
    var xk = an.xuankong, good = xk.palaces.filter(function (p) { return p.idx < 8 && (p.shanTone > 0 || p.xiangTone > 0); }), bad = xk.palaces.filter(function (p) { return p.idx < 8 && p.shanTone < 0 && p.xiangTone < 0; });
    var body = '<p class="lead"><b>' + esc(xk.pattern.name) + '</b> — ' + esc(xk.pattern.text) + '</p><p class="td-mut">' + xk.period + '운 건물 · 지금 ' + xk.nowPeriod + '운 · 향 ' + esc(xk.facing.mt.label) + '</p>' +
      (good.length ? '<h4 class="td-h">힘을 받는 방위</h4><ul class="dp-ul">' + good.slice(0, 4).map(function (p) { return '<li><b>' + esc(p.dir) + '</b> — ' + esc(p.xiangTone > 0 ? p.xiangText : p.shanText) + '</li>'; }).join('') + '</ul>' : '') +
      (bad.length ? '<h4 class="td-h">보완이 필요한 방위</h4><ul class="dp-ul">' + bad.slice(0, 3).map(function (p) { return '<li><b>' + esc(p.dir) + '</b> — ' + esc(p.shanText) + '</li>'; }).join('') + '</ul>' : '') +
      (an.form && an.form.verdict ? '<p class="td-note">형세: ' + esc(an.form.verdict) + '</p>' : '');
    return box('우리 집 현공풍수 · ' + (c.name || '우리 집'), '만세력에 저장한 집 정보로 현공비성·형세를 계산했어요.', body + '<p class="td-foot">산성은 사람·건강, 향성은 재물·사회운의 상징입니다. 풍수 판정은 생활 환경의 참고이며 운세를 보장하지 않습니다.</p>');
  }
  function wish(H, wishId) {
    var WS = root.MantraWishSpots, RG = root.MantraRegion; if (!WS || !spots || !spots.length) return null;
    var base = null; try { var v = JSON.parse(root.localStorage.getItem('mantra-region-v1') || '{}'); base = v.home && RG && RG.get(v.home); } catch (e) { }
    base = base ? { lat: base.lat, lon: base.lon, name: base.name } : RG && RG.REF ? { lat: RG.REF.lat, lon: RG.REF.lon, name: RG.REF.name } : null; if (!base) return null;
    var rk; try { rk = WS.rank(H.M, H.ch, spots, base, wishId || 'general', { mode: mode(H) }); } catch (e) { return null; }
    var list = (rk && rk.items) || []; if (!Array.isArray(list) || !list.length) return null;
    var wn = ((WS.WISH || []).filter(function (w) { return w.id === wishId; })[0] || {}).name || '종합';
    var body = '<ol class="td-ol">' + list.slice(0, 5).map(function (x, n) { return '<li class="td-top"><b>' + (n + 1) + '순위 ' + esc(x.name) + '</b> <span class="td-sc">' + Math.round(x.score) + '점</span> <span class="td-mut">' + esc([x.typeName, x.direction ? x.direction + '쪽' : '', x.distKm != null ? x.distKm + 'km' : '', x.toneLabel].filter(Boolean).join(' · ')) + '</span>' + (x.reasons && x.reasons.length ? '<br><small>' + esc(x.reasons[0]) + '</small>' : '') + (x.source && /^https?:\/\//.test(x.source.url || '') ? '<br><small><a href="' + esc(x.source.url) + '" target="_blank" rel="noopener">출처</a></small>' : '') + '</li>'; }).join('') + '</ol>';
    return box('나의 소원성취 명당 TOP 5 · ' + wn, esc(base.name) + ' 기준으로, 관리자가 출처를 확인해 등록한 장소만 ' + who(H) + ' 사주와 소원 분야에 맞춰 점수순으로 골랐어요.', body + '<p class="td-foot">점수는 장소끼리 비교하기 위한 상대값이며 소원의 성취를 보장하지 않습니다.</p>');
  }

  // ── 장 → 블록 ──
  var KINDS = {
    'td:sub': function (H, p) { return subTiming(H, p.key, p.scope || 'year'); }, 'td:income': income, 'td:jobs': function (H, p) { return jobs(H, p.n); }, 'td:env': env, 'td:weak': weak, 'td:industry': industry,
    'td:compat': function (H, p, id) { return compat(H, p.rel, id); }, 'td:compatRank': function (H, p, id) { return compatRank(H, p.rel, id); },
    'td:dirs': function (H, p) { return dirs(H, p.kind); }, 'td:regions': regions, 'td:house': house, 'td:wish': function (H, p) { return wish(H, p.wish); },
  };
  var PLAN = {
    timeline_wealth_04: ['월급형·사업형 판단 근거', [{ custom: 'td:income' }, { custom: 'td:sub', key: 'business' }]],
    timeline_wealth_06: [null, [{ custom: 'td:sub', key: 'windfall' }]],
    timeline_wealth_08: ['투자 성향과 위험한 해', [{ custom: 'td:sub', key: 'windfall', scope: 'month' }]],
    timeline_wealth_09: ['돈 관계에서 사람 보기', [{ custom: 'td:sub', key: 'noble' }, { custom: 'td:compat', rel: 'work' }]],
    timeline_wealth_12: ['재산을 키우는 시기 전략', [{ custom: 'td:sub', key: 'estate' }]],
    timeline_wealth_13: ['재물로 엮이는 사람과의 궁합', [{ custom: 'td:compatRank', rel: 'work' }]],
    timeline_wealth_15: ['재물 명당과 사업장 방향', [{ custom: 'td:wish', wish: 'wealth' }, { custom: 'td:dirs', kind: 'biz' }]],
    timeline_career_01: [null, [{ custom: 'td:jobs', n: 10 }]],
    timeline_career_02: ['돈이 되는 재능 순위', [{ custom: 'td:income' }]],
    timeline_career_03: ['직장·사업 판단 근거', [{ custom: 'td:env' }, { custom: 'td:sub', key: 'job' }]],
    timeline_career_04: ['리더·전문가 판단 근거', [{ custom: 'td:env' }]],
    timeline_career_05: ['업종 순위', [{ custom: 'td:industry' }]],
    timeline_career_07: ['조직에서 약해지는 지점', [{ custom: 'td:weak' }]],
    timeline_career_08: [null, [{ custom: 'td:sub', key: 'move' }]],
    timeline_career_09: ['사업을 벌이기 좋은 해와 방향', [{ custom: 'td:sub', key: 'business' }, { custom: 'td:dirs', kind: 'biz' }]],
    timeline_career_12: ['10년 커리어 그래프', [{ custom: 'td:sub', key: 'career' }, { custom: 'td:sub', key: 'study' }]],
    timeline_career_13: ['일로 엮이는 사람과의 궁합', [{ custom: 'td:sub', key: 'noble' }, { custom: 'td:compatRank', rel: 'work' }]],
    timeline_career_15: ['커리어 명당', [{ custom: 'td:wish', wish: 'career' }, { custom: 'td:regions' }]],
    timeline_love_03: ['사람이 붙고 떨어지는 해', [{ custom: 'td:sub', key: 'social' }]],
    timeline_love_05: [null, [{ custom: 'td:compat', rel: 'lover' }]],
    timeline_love_08: [null, [{ custom: 'td:sub', key: 'marriage' }]],
    timeline_love_10: ['가족운 흐름', [{ custom: 'td:sub', key: 'family' }]],
    timeline_love_11: [null, [{ custom: 'td:sub', key: 'child' }]],
    timeline_love_13: ['저장한 사람들과의 궁합', [{ custom: 'td:compatRank', rel: 'lover' }]],
    timeline_remedy_04: ['나를 회복시키는 방향과 집', [{ custom: 'td:dirs', kind: 'home' }, { custom: 'td:house' }]],
    timeline_remedy_05: ['행운의 지역과 명당', [{ custom: 'td:regions' }, { custom: 'td:wish', wish: 'general' }]],
  };
  // reading-feature.js SPEC 에 조각을 더한다(기존 조각 뒤에). 스위치가 꺼져 있으면 render 가 null 이라 아무것도 붙지 않는다.
  function attach() {
    var RF = R.ReadingFeature; if (!RF || !RF.SPEC) return false;
    Object.keys(PLAN).forEach(function (id) { var pl = PLAN[id], sp = RF.SPEC[id]; if (sp) { if (!sp.__td) { sp.parts = sp.parts.concat(pl[1]); sp.__td = 1; } } else RF.SPEC[id] = { title: pl[0] || '심화 풀이', parts: pl[1].slice(), __td: 1 }; });
    return true;
  }
  var last = {};
  function render(part, H, id) { if (!on || !ready || !KINDS[part.custom]) return null; last[id] = H; try { return KINDS[part.custom](H, part, id); } catch (e) { return null; } }
  function has(kind) { return !!KINDS[kind]; }

  // ── 궁합 입력·상대 바꾸기: 블록만 다시 그린다 ──
  function rerender(id) {
    var H = last[id], box0 = DOC && DOC.querySelector('[data-reading-feature="' + id + '"]'); if (!H || !box0 || !R.ReadingFeature) return;
    var pl = PLAN[id]; if (!pl) return;
    var html = pl[1].map(function (p) { return render(p, H, id); }).filter(Boolean);
    var blocks = box0.querySelectorAll('.td-blk'), parent = blocks.length ? blocks[0].parentNode : box0;
    Array.prototype.forEach.call(blocks, function (b) { b.parentNode.removeChild(b); });
    var tmp = DOC.createElement('div'); tmp.innerHTML = html.join(''); while (tmp.firstChild) parent.appendChild(tmp.firstChild);
  }
  if (DOC) {
    DOC.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-td-cp]'); if (!b) return; var a = b.getAttribute('data-td-cp').split(':'); cpSel[a[0]] = +a[1]; rerender(a[0]); });
    DOC.addEventListener('submit', function (e) {
      var f = e.target.closest && e.target.closest('[data-td-cpf]'); if (!f) return; e.preventDefault();
      var id = f.getAttribute('data-td-cpf'), rel = f.getAttribute('data-rel') || 'lover', v = function (n) { return String((f.elements[n] || {}).value || '').trim(); }, err = f.querySelector('.td-err');
      var num = function (s, a, b) { var x = Number(s); return s !== '' && Number.isInteger(x) && x >= a && x <= b ? x : NaN; };
      var y = num(v('year'), 1900, 2099), m = num(v('month'), 1, 12), d = num(v('day'), 1, 31), hh = v('hour') === '' ? null : num(v('hour'), 0, 23);
      if (isNaN(y) || isNaN(m) || isNaN(d) || (hh !== null && isNaN(hh))) { if (err) { err.hidden = false; err.textContent = '년(1900~2099)·월·일을 숫자로, 시는 0~23으로 넣어 주세요.'; } return; }
      var rec = { name: v('name').slice(0, 20), gender: v('gender') === 'M' ? 'M' : 'F', calendar: v('calendar') === 'lunar' ? 'lunar' : 'solar', leap: false, year: y, month: m, day: d, hour: hh === null ? 12 : hh, minute: 0, hourUnknown: hh === null, city: '서울', lon: 126.98, rel: rel };
      var H = last[id]; if (H && !evalPair(H, rec, rel)) { if (err) { err.hidden = false; err.textContent = '이 날짜로는 계산할 수 없어요. 날짜를 확인해 주세요.'; } return; }
      cpSel.gender = rec.gender; savePartner(rec); cpSel[id] = 0; rerender(id);
    });
    var st = DOC.createElement('style');
    st.textContent = '.td-blk .td-h{margin:14px 0 6px;font-size:.95rem}.td-ol{margin:6px 0 0;padding-left:1.1em}.td-ol li{margin:8px 0;line-height:1.6}.td-ol li.td-top b{color:#D5B97F}.td-chip{display:inline-block;font-size:.7rem;color:#fff;border-radius:999px;padding:1px 8px;vertical-align:1px}.td-sc{font-size:.8rem;opacity:.8}.td-mut{opacity:.7;font-size:.82rem}.td-note{margin:10px 0 0;font-size:.88rem;line-height:1.6}.td-warn{color:#E79A88}.td-foot{margin:10px 0 0;font-size:.74rem;opacity:.6;line-height:1.5}.td-axes{display:grid;gap:8px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}.td-axis{border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:8px 10px}.td-axis small{display:block;opacity:.7}.td-axis b{display:block;margin:2px 0}.td-cph{display:flex;align-items:baseline;gap:6px;margin:6px 0}.td-cps{font-size:2.2rem;color:#D5B97F}.td-cpt{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 8px}.td-btn{display:inline-block;border:1px solid rgba(213,185,127,.6);background:transparent;color:inherit;border-radius:999px;padding:5px 12px;font:inherit;font-size:.85rem;cursor:pointer;text-decoration:none}.td-btn.on{background:#D5B97F;color:#1b1b1b}.td-cpf{margin-top:8px}.td-cpr{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}.td-cpr input,.td-cpr select{flex:1 1 70px;min-width:0;padding:7px 9px;border-radius:8px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:inherit;font:inherit;font-size:.88rem}.td-err{color:#E79A88;font-size:.82rem}.td-fix{color:#8FD3A8;font-weight:600}.td-axis p{margin:4px 0;font-size:.86rem;line-height:1.55}.td-more{margin-top:10px}.td-more summary{cursor:pointer;font-size:.85rem;opacity:.85}';
    DOC.head.appendChild(st);
  }

  R.TopicDeep = { render: render, has: has, attach: attach, init: init, PLAN: PLAN, SIG_CUTS: SIG_CUTS, sig: sig, get rev() { return rev; }, get ready() { return on && ready; },
    // 테스트용: 스위치·의존 모듈을 직접 주입한다(브라우저에서는 init 이 한다)
    _force: function (v, wishSpots) { on = !!v; ready = !!v; spots = wishSpots || spots; rev++; } };
  attach();
  init();
  if (typeof module !== 'undefined' && module.exports) module.exports = R.TopicDeep;
})(typeof window !== 'undefined' ? window : globalThis);
