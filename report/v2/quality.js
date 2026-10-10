/* 서비스 점검(품질 관리) — 정합성 검사(consistency.js)가 다루지 않는 항목만 모은다.
   ① 풀이 누락 의심: 글자 수가 너무 적은 챕터   ② 단정 표현: 검토가 필요한 문구(맥락을 함께 보여 줌)
   ③ 에셋 누락: 슬롯별 이미지·영상 등록 현황   ④ 세계 매핑: 어느 세계에도 규칙이 안 맞아 대체 세계로 간 챕터·빈 세계·숨겨진 챕터
   계산값과 문장의 불일치(출생 계절 등)와 문장 중복은 관리자 "정합성 검사" 탭이 맡는다. 이 모듈은 AI 를 호출하지 않는다.
   R.Quality.audit({ doc, worlds, slots }) → { chapters, missing, absolute, assets, worlds, summary }     검증: node tests/quality-sim.js */
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {};
  var MIN_LEN = 60; // 이 글자 수보다 짧은 챕터는 풀이 누락 의심(도입 제목만 있는 경우 포함)
  var SKIP_KEYS = /^(sceneId|sceneType|id|bg|layout|kind|image|class|src|url|poster|key|slot|tag|tags|style|icon|cue|bgmMood|preset|motion|compact)$/;
  // 검토가 필요한 단정 표현. 문장 전체가 단정이라는 뜻이 아니라 "맥락을 확인해 달라"는 표시다.
  var ABSOLUTE = [/반드시/, /무조건/, /틀림없/, /확실히/, /절대/, /운명이 정해/, /반드시 .{0,8}(이혼|파산|사망)/, /(이혼|파산|사망|죽음|사고)(하게|합니다|할 것|한다)/];

  function strip(s) { return String(s).replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;/g, ' ').replace(/\s+/g, ' ').trim(); }
  function collect(o, out, depth) {
    if (depth > 6 || o == null) return;
    if (typeof o === 'string') { var t = strip(o); if (t && !/^[A-Za-z0-9_\-:.#/]+$/.test(t)) out.push(t); return; } // 영문·숫자 식별자(연출 이름·ID)는 글자 수에서 뺀다
    if (Array.isArray(o)) { o.forEach(function (x) { collect(x, out, depth + 1); }); return; }
    if (typeof o === 'object') Object.keys(o).forEach(function (k) { if (!SKIP_KEYS.test(k)) collect(o[k], out, depth + 1); });
  }
  function textOf(ch) { var parts = []; collect(ch.scenes || [], parts, 0); ['headline', 'interpretation', 'meaning', 'lead', 'introText'].forEach(function (k) { if (typeof ch[k] === 'string') parts.push(strip(ch[k])); }); return parts.join(' '); }

  function chapterTexts(doc) { return (doc.chapters || []).map(function (c, i) { var t = textOf(c); return { id: c.id, base: c.base || c.id, no: c.no || i + 1, act: c.act, title: c.title || '', len: t.length, text: t }; }); }
  function missing(cts, min) { min = min || MIN_LEN; return cts.filter(function (c) { return c.len < min; }).map(function (c) { return { id: c.id, title: c.title, len: c.len }; }); }
  function absolute(cts) {
    var out = [];
    cts.forEach(function (c) {
      ABSOLUTE.forEach(function (re) {
        var m = re.exec(c.text); if (!m) return;
        var a = Math.max(0, m.index - 24), b = Math.min(c.text.length, m.index + m[0].length + 24);
        out.push({ id: c.id, title: c.title, word: m[0], snippet: c.text.slice(a, b) });
      });
    });
    return out;
  }
  function assets(slots) {
    var list = slots || [], groups = {}, miss = [];
    list.forEach(function (s) {
      var g = groups[s.group] = groups[s.group] || { total: 0, image: 0, video: 0 }; g.total++; if (s.url) g.image++; else miss.push({ id: s.id, title: s.title, group: s.group }); if (s.video) g.video++;
    });
    return { total: list.length, image: list.filter(function (s) { return s.url; }).length, video: list.filter(function (s) { return s.video; }).length, missing: miss, groups: groups };
  }
  function worlds(chapters, ws) {
    var X = R.Explore; if (!X) return null;
    var list = ws && ws.length ? ws : X.mergeWorlds(null), counts = {}, fallback = [], hidden = 0, off = {};
    list.forEach(function (w) { counts[w.id] = 0; if (w.enabled === false) off[w.id] = 1; });
    (chapters || []).forEach(function (c) {
      var id = X.worldFor(c, list, 'life'), hit = list.some(function (w) { return w.id === id && ((w.chapters || []).indexOf(c.id) >= 0 || (w.match || []).some(function (r) { return new RegExp(r).test(c.id) || new RegExp(r).test(c.base || c.id); })); });
      if (!hit) fallback.push({ id: c.id, title: c.title, world: id });
      if (counts[id] != null) counts[id]++; if (off[id]) hidden++;
    });
    return { counts: counts, empty: list.filter(function (w) { return w.enabled !== false && !counts[w.id]; }).map(function (w) { return { id: w.id, name: w.name }; }), fallback: fallback, hidden: hidden, list: list.map(function (w) { return { id: w.id, name: w.name, enabled: w.enabled !== false, count: counts[w.id] || 0 }; }) };
  }

  function audit(o) {
    var cts = chapterTexts(o.doc || { chapters: [] }), ms = missing(cts, o.minLen), ab = absolute(cts), as = o.slots ? assets(o.slots) : null, ws = worlds((o.doc && o.doc.chapters) || [], o.worlds);
    return { chapters: cts.length, missing: ms, absolute: ab, assets: as, worlds: ws,
      summary: { chapters: cts.length, missing: ms.length, absolute: ab.length, assetMissing: as ? as.missing.length : null, worldFallback: ws ? ws.fallback.length : null, worldEmpty: ws ? ws.empty.length : null } };
  }

  R.Quality = { MIN_LEN: MIN_LEN, textOf: textOf, chapterTexts: chapterTexts, missing: missing, absolute: absolute, assets: assets, worlds: worlds, audit: audit };
})(typeof window !== 'undefined' ? window : globalThis);
