/* 주제별 상세풀이에 붙는 운 분석 층 블록(2026-11-18) — 만세력 운세 흐름의 분석을 맞는 장에 같은 계산으로
   · timeline_self_20 '전체 인생 흐름'              ← 시대 흐름(삼원구운 20년)과 이 사주가 받아들이는 방식(macroEra)
   · timeline_self_24 '움직여야 될 때와 기다려야 할 때' ← 앞으로의 운 교체 중 구조가 바뀌는 전환기(luckEnv) + 지금 상위·하위 운 방향
   · *_flow 네 장 '…기운은 어떻게 흐를까?'          ← 지금 대운→세운→월운 오행 겹쳐 보기(luckOverlay) + 외부 환경과 개인 반응 나눠 보기(luckEnv)
   · 타이밍 장(재물 06·10·14, 커리어 08·14, 인연 08·14) ← 올해부터 3년, 세운마다 그 주제 십성 구조·영역 판정(tenGodRoles)
   · timeline_self_25 '타고난 강점과 약점'          ← 원국 십성 작용 요약(tenGodRoles)
   · 공개 스위치: 만세력과 같은 /api/luck-flags(luckEnv·luckOverlay·tenGodRoles·macroEra). 로컬·미리보기 주소에서는 ?mantraFlags=…
   · 표시 전용: 점수·용신·DB 문안을 바꾸지 않는다. 모듈이 없거나 계산이 실패하면 블록을 붙이지 않는다. 검사: tests/luck-layer-blocks-sim.cjs */
(function (root) {
  'use strict';
  var R = root.ReportV2 = root.ReportV2 || {}, DOC = root.document;
  var cur = null, F = {}, ready = false, rev = 0;
  function set(M, ch) { cur = M && ch ? { M: M, ch: ch } : null; }
  var esc0 = function (t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (x) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[x]; }); };
  var NAMES = ['luckEnv', 'luckOverlay', 'tenGodRoles', 'macroEra'];
  function box(kick, title, lead, body, note, E) {
    return '<section class="dp-embed dp fx eb-blk lb-blk"><p class="fx-kick">' + E(kick) + '</p><h3 class="fx-title">' + E(title) + '</h3>' + (lead ? '<p class="fx-lead">' + E(lead) + '</p>' : '') + body + (note ? '<p class="fx-note">' + E(note) + '</p>' : '') + '</section>';
  }
  var V = function () { return root.MantraLuckView; };
  var nowMs = function () { return cur && cur.now || Date.now(); };
  var kstYear = function (ms) { return new Date(ms + 9 * 3600e3).getUTCFullYear(); };

  // 지금 시기 엔진 항목(대운·세운·월운)
  function nowItems() {
    var M = cur.M, ch = cur.ch, ms = nowMs(), out = {};
    out.daeun = M.daeunAt(ch, ms) || null;
    try { var sy = M.yearPillarAt(ms).sajuYear; out.seun = M.seunRange(ch, sy, sy)[0] || null; out.sajuYear = sy; var mo = null; M.wolun(ch, sy).concat(M.wolun(ch, sy + 1)).forEach(function (m) { if (m.startMs <= ms) mo = m; }); out.wolun = mo; } catch (e) { }
    return out;
  }

  // 전체 인생 흐름: 시대 흐름
  function era(E) {
    if (!F.macroEra || !V()) return '';
    var h = V().era(cur.M, cur.ch, nowMs(), { flags: F, esc: E }); if (!h) return '';
    return box('時運 · 시대의 바람', '내 운 바깥에서 부는 20년의 바람', '대운이 내 인생의 계절이라면, 시대 흐름은 모두가 함께 맞는 큰 날씨예요. 같은 날씨라도 사주마다 받아들이는 방식이 달라요.', h,
      '삼원구운(20년 주기) 기준이에요. 시대 오행은 용신을 바꾸지 않고 점수에도 들어가지 않아요.', E);
  }

  // 움직일 때·기다릴 때: 앞으로의 교체 중 구조가 바뀌는 전환기
  function turns(E) {
    var LE = root.MantraLuckEnv; if (!F.luckEnv || !LE || !V()) return '';
    var M = cur.M, ch = cur.ch, it = nowItems(), rows = [], y0 = it.sajuYear || kstYear(nowMs());
    var push = function (prev, x, kind, label) { if (!prev || !x) return; try { var t = LE.transition(M, ch, prev, x, kind, { prevLayers: V().layersOf(M, ch, prev, kind), curLayers: V().layersOf(M, ch, x, kind) }); if (t) rows.push({ t: t, label: label }); } catch (e) { } };
    // 다음 대운 교체
    var L = ch.daeun.list, di = it.daeun ? L.indexOf(it.daeun) : -1; if (di < 0 && it.daeun) L.forEach(function (d, k) { if (d.startMs === it.daeun.startMs) di = k; });
    if (di >= 0 && L[di + 1]) push(L[di], L[di + 1], 'daeun', L[di + 1].startYear + '년 대운 교체');
    // 앞으로 3년 세운 교체
    for (var y = y0; y < y0 + 3; y++) { try { push(M.seunRange(ch, y, y)[0], M.seunRange(ch, y + 1, y + 1)[0], 'seun', (y + 1) + '년 세운 교체'); } catch (e) { } }
    if (!rows.length) return '';
    var ORDER = { high: 0, mid: 1, low: 2 };
    rows.sort(function (a, b) { return ORDER[a.t.level] - ORDER[b.t.level]; });
    var li = rows.map(function (r) { var t = r.t; return '<li><b>' + E(r.label) + '</b> <span class="lv-chip ' + (t.level === 'high' ? 'bad' : '') + '">' + E(t.levelK) + '</span> ' + E(t.text) + (t.level !== 'low' && t.signals.length ? '<br><span class="lv-sm">' + E(t.signals.slice(0, 2).map(function (q) { return q.text; }).join(' ')) + '</span>' : '') + '</li>'; }).join('');
    var hi = ''; try { var h = it.seun ? LE.hierarchy(M, ch, V().layersOf(M, ch, it.seun, 'seun')) : null; if (h) hi = '<p><b>지금 큰 배경과 올해</b> ' + E(h.text) + '</p>'; } catch (e) { }
    var big = rows.filter(function (r) { return r.t.level === 'high'; }).length;
    return box('轉機 · 바뀌는 지점', big ? '앞으로 구조가 바뀌는 전환기 ' + big + '번' : '앞으로 몇 해의 운 교체', '운은 해마다 바뀌지만, 원국과 맞물리는 구조까지 바뀌는 교체는 많지 않아요. 크게 움직일 때는 그런 지점에 맞추는 편이 좋아요.',
      '<ul class="fx-ul">' + li + '</ul>' + hi, '전환 판정은 원국에서 맡는 역할이 뒤집히는지, 일지·월지와 새 충·합이 생기는지, 십성 구조가 서거나 풀리는지로만 정해요. 흐름 점수는 바뀌지 않아요.', E);
  }

  // 흐름 장: 지금 대운→세운→월운 겹쳐 보기 + 외부/개인 나눠 보기
  var TOPIC = { timeline_self_flow: null, timeline_wealth_flow: 'wealth', timeline_career_flow: 'career', timeline_love_flow: 'love' };
  function flowNow(id) {
    return function (E) {
      if (!V() || !(F.luckOverlay || F.luckEnv || F.tenGodRoles)) return '';
      var it = nowItems(); if (!it.wolun) return '';
      var p = V().parts(cur.M, cur.ch, it.wolun, 'wolun', { flags: F, esc: E }), body = '';
      if (p.ol) body += '<p class="fx-sub"><b>원국 위에 운을 겹치면</b></p>' + p.ol;
      if (p.hier) body += '<p class="fx-sub"><b>큰 운과 작은 운의 방향</b></p>' + p.hier;
      var dom = '';
      if (TOPIC[id] && F.tenGodRoles && root.MantraTenGodRoles) {
        try { var tr = root.MantraTenGodRoles.luck(cur.M, cur.ch, V().layersOf(cur.M, cur.ch, it.seun, 'seun')), me = tr.layers[tr.layers.length - 1], d = (me.B.domains || []).filter(function (q) { return q.key === TOPIC[id]; })[0];
          if (d) dom = '<p><b>올해 ' + E(d.name) + ' 쪽 판정</b> <span class="lv-chip ' + (d.tone === 'good' ? 'good' : d.tone === 'bad' ? 'bad' : '') + '">' + E(d.toneK) + '</span> ' + E(d.basis) + (d.note ? ' · ' + E(d.note) : '') + '</p>'; } catch (e) { }
      }
      if (p.env) body += '<details class="lb-more"><summary>모두에게 같은 이달의 기운(외부 환경) 보기</summary>' + p.env + '</details>';
      body = dom + body;
      if (!body) return '';
      var gz = function (x) { return x ? cur.M.STEM[x.s] + cur.M.BR[x.b] : ''; };
      return box('重疊 · 지금 겹친 운', '지금 겹쳐 있는 운: ' + [gz(it.daeun) && '대운 ' + gz(it.daeun), gz(it.seun) && '세운 ' + gz(it.seun), '월운 ' + gz(it.wolun)].filter(Boolean).join(' → '),
        '타고난 오행 위에 10년·1년·1달의 운이 차례로 쌓여 지금의 기운이 돼요. 층마다 무엇을 더하고 덜어 내는지 보면 흐름이 왜 이런지가 보여요.', body,
        '만세력 운세 흐름의 오행 겹쳐 보기와 같은 계산이에요. 설명용이라 흐름 점수·그래프는 바뀌지 않아요.', E);
    };
  }

  // 타이밍 장: 올해부터 3년 세운마다 그 주제 십성 구조·영역 판정
  var TIMING = { timeline_wealth_06: 'wealth', timeline_wealth_10: 'wealth', timeline_wealth_14: 'wealth', timeline_career_08: 'career', timeline_career_14: 'career', timeline_love_08: 'love', timeline_love_14: 'love' };
  var TOPIC_K = { wealth: '재물', career: '커리어', love: '인연' };
  function timing(id) {
    return function (E) {
      var TG = root.MantraTenGodRoles; if (!F.tenGodRoles || !TG || !V()) return '';
      var M = cur.M, ch = cur.ch, key = TIMING[id], y0 = nowItems().sajuYear || kstYear(nowMs()), li = [];
      for (var y = y0; y < y0 + 3; y++) {
        try {
          var se = M.seunRange(ch, y, y)[0]; if (!se) continue;
          var tr = TG.luck(M, ch, V().layersOf(M, ch, se, 'seun')), me = tr.layers[tr.layers.length - 1];
          var d = (me.B.domains || []).filter(function (q) { return q.key === key; })[0];
          var chg = (me.B.changes || []).filter(function (c) { return (c.kind !== 'gone' || c.tone === 'good') && !(d && String(d.basis).indexOf(c.name) >= 0); }).slice(0, 2).map(function (c) { return c.name + ' ' + c.kindK; });
          li.push('<li><b>' + y + '년 ' + E(M.STEM[se.s] + M.BR[se.b]) + '</b> ' + (d ? '<span class="lv-chip ' + (d.tone === 'good' ? 'good' : d.tone === 'bad' ? 'bad' : '') + '">' + E(TOPIC_K[key] + ' ' + d.toneK) + '</span> ' + E(d.basis) : '<span class="lv-chip">' + E(TOPIC_K[key]) + ' 쪽 큰 움직임 없음</span>') + (chg.length ? '<br><span class="lv-sm">십성 구조: ' + E(chg.join(' · ')) + '</span>' : '') + '</li>');
        } catch (e) { }
      }
      if (!li.length) return '';
      return box('十星 · 해마다 들어오는 기운', '올해부터 3년, ' + TOPIC_K[key] + ' 쪽으로 들어오는 기운', '해마다 들어오는 십성이 원국과 만나 ' + TOPIC_K[key] + ' 쪽 구조를 새로 세우거나 풀어요. 같은 해라도 사주마다 결과가 달라요.',
        '<ul class="fx-ul">' + li.join('') + '</ul>', '만세력 운세 흐름의 원국과 운의 상호작용과 같은 계산이에요. 판정은 그 해에 들어온 십성의 역할로 본 것이고, 흐름 점수는 바뀌지 않아요.', E);
    };
  }

  // 강점·약점: 원국 십성 작용 요약
  function natalTg(E) {
    var TG = root.MantraTenGodRoles; if (!F.tenGodRoles || !TG) return '';
    var a; try { a = TG.analyze(cur.M, cur.ch); } catch (e) { return ''; }
    if (!a || !a.summary || !a.summary.length) return '';
    return box('十星 · 다섯 가지 힘', '강점과 약점을 만드는 다섯 가지 힘', '비겁·식상·재성·관성·인성 중 어느 힘이 크고, 그 힘이 이 사주에서 실제로 도움으로 쓰이는지 부담이 되는지를 함께 봐요.',
      '<ul class="fx-ul">' + a.summary.map(function (t) { return '<li>' + E(t) + '</li>'; }).join('') + '</ul>', '만세력 오행·강약 탭의 십성 작용 분석과 같은 판정이에요.', E);
  }

  var MAP = { timeline_self_20: era, timeline_self_24: turns, timeline_self_25: natalTg };
  Object.keys(TOPIC).forEach(function (id) { MAP[id] = flowNow(id); });
  Object.keys(TIMING).forEach(function (id) { MAP[id] = timing(id); });

  function html(c, esc) {
    var id = c && (c.editorialContractId || c.id), f = MAP[id]; if (!f || !cur || !ready) return '';
    var FO = R.FactOnce, sd = c.readingVisualData; if (FO && sd && c.id && !FO.own(sd, 'lb:' + id, c.id)) return '';
    try { return f(esc || esc0) || ''; } catch (e) { return ''; }
  }

  // ── 스위치·모듈 불러오기 ──
  function localFlags() {
    var o = {}; try { var f = root.MANTRA_FLAGS || {}; NAMES.forEach(function (k) { if (f[k] === true) o[k] = true; }); var h = root.location && root.location.hostname || ''; if (/^(localhost|127\.0\.0\.1)$/.test(h) || /^[a-z0-9][a-z0-9-]*\.mantramanse\.pages\.dev$/i.test(h)) { var m = (root.location.search || '').match(/[?&]mantraFlags=([A-Za-z,]*)/); if (m) m[1].split(',').forEach(function (k) { if (NAMES.indexOf(k) >= 0) o[k] = true; }); } } catch (e) { } return o;
  }
  function load(src) { return new Promise(function (ok) { var s = DOC.createElement('script'); s.src = src; s.async = false; s.onload = ok; s.onerror = ok; DOC.head.appendChild(s); }); }
  function init() {
    if (!DOC || typeof fetch === 'undefined') return;
    var lf = localFlags(), getFlags = root.MantraLastGood ? root.MantraLastGood.json('/api/luck-flags', 5000, function (d) { return !!(d && typeof d === 'object' && Number.isInteger(d.version)); }) : fetch('/api/luck-flags').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    Promise.resolve(getFlags).catch(function () { return null; }).then(function (d) {
      d = d || {}; NAMES.forEach(function (k) { F[k] = lf[k] === true || d[k] === true; });
      if (!NAMES.some(function (k) { return F[k]; })) return;
      var V_ = '?v=20261118-lv', need = [].concat(F.luckOverlay ? ['/luck-overlay.js'] : [], F.tenGodRoles || F.luckEnv ? ['/ten-god-roles.js'] : [], F.luckEnv ? ['/luck-env.js'] : [], F.macroEra ? ['/fengshui-data.js', '/fengshui-engine.js', '/macro-era.js', '/macro-era-bridge.js'] : [], ['/luck-layers-view.js']);
      return need.filter(function (u) { return !DOC.querySelector('script[src^="' + u + '"]'); }).reduce(function (p, u) { return p.then(function () { return load(u + V_); }); }, Promise.resolve()).then(function () {
        if (root.MantraLuckView && !DOC.getElementById('lv-css')) { var st = DOC.createElement('style'); st.id = 'lv-css'; st.textContent = root.MantraLuckView.CSS + '.lb-blk .lv-ol{padding-left:0}.lb-blk details.lb-more{margin:8px 0}.lb-blk details.lb-more>summary{cursor:pointer;font-size:.86rem;opacity:.8}'; DOC.head.appendChild(st); }
        ready = !!root.MantraLuckView; rev++;
      });
    });
  }

  R.LuckLayerBlocks = { set: set, html: html, init: init, MAP: MAP, get ready() { return ready; }, get rev() { return rev; },
    _force: function (flags) { F = Object.assign({}, flags || {}); ready = true; rev++; } };
  if (DOC && DOC.readyState !== 'loading') init(); else if (DOC) DOC.addEventListener('DOMContentLoaded', init);
  if (typeof module !== 'undefined' && module.exports) module.exports = R.LuckLayerBlocks;
})(typeof window !== 'undefined' ? window : globalThis);
