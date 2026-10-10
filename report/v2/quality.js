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

  /* ── 풀이 DB 근거 상태(CONTENT_DB_DESIGN §7): 모듈 목록만 읽는 순수 점검. mods = Compose.library().all(정책 적용 전 전체) ── */
  var STATUSES = ['approved', 'legacy', 'draft', 'needs_evidence', 'retired'], BASES = ['engine', 'tradition', 'editorial', 'legacy'];
  function textHash(m) { return R.Rules.hash([m.headline || '', m.summary || '', m.detail || '']); }
  function evidence(mods, o) {
    o = o || {}; var Ru = R.Rules, known = {}; Object.keys(Ru.FIELDS).forEach(function (k) { known[k] = 1; });
    var out = { total: mods.length, status: {}, basis: { none: 0 }, categories: [], mismatch: [], unknownCond: [], staleText: [], ruleConflict: [], policy: o.policy || 'off', hidden: o.hidden || 0, restored: o.restored || 0, wouldHide: { hide_unverified: 0, strict: 0 } };
    STATUSES.forEach(function (s) { out.status[s] = 0; }); BASES.forEach(function (b) { out.basis[b] = 0; });
    var cats = {};
    mods.forEach(function (m) {
      var st = m.status || 'legacy', ev = m.evidence, c = cats[m.category] || (cats[m.category] = { category: m.category, total: 0, approved: 0, legacy: 0, other: 0 });
      out.status[STATUSES.indexOf(st) >= 0 ? st : 'legacy']++; if (ev && BASES.indexOf(ev.basis) >= 0) out.basis[ev.basis]++; else out.basis.none++;
      c.total++; if (st === 'approved') c.approved++; else if (st === 'legacy') c.legacy++; else c.other++;
      if (Ru.gate(m, 'hide_unverified')) out.wouldHide.hide_unverified++; if (Ru.gate(m, 'strict')) out.wouldHide.strict++;
      if (m.enabled !== false && (st === 'draft' || st === 'retired')) out.mismatch.push({ id: m.id, reason: '사용 중(enabled)인데 상태가 ' + st + ' 라 숨겨집니다' });
      if (m.enabled === false && st === 'approved') out.mismatch.push({ id: m.id, reason: '승인(approved)인데 사용 안 함(enabled=false)입니다' });
      if (st === 'approved' && (!ev || ev.basis === 'legacy' || (ev.basis === 'tradition' && !(ev.refs || []).length))) out.mismatch.push({ id: m.id, reason: '승인 상태인데 근거가 비어 있습니다' });
      var bad = Object.keys(m.conditions || {}).filter(function (k) { return !known[k]; }); if (bad.length) out.unknownCond.push({ id: m.id, keys: bad });
      if (ev && ev.textHash && ev.textHash !== textHash(m)) out.staleText.push(m.id);
      var ex = m.rule && m.rule.except, c = m.conditions || {}; // 선택 조건 값이 전부 제외 조건에 들어 있으면 이 모듈은 어떤 사주에서도 선택되지 않는다
      if (ex) { var dead = Object.keys(ex).filter(function (k) { return c[k] && c[k].length && c[k].every(function (v) { return (ex[k] || []).indexOf(v) >= 0; }); }); if (dead.length) out.ruleConflict.push({ id: m.id, keys: dead }); }
    });
    out.categories = Object.keys(cats).map(function (k) { var c = cats[k]; c.ratio = c.total ? Math.round(c.approved / c.total * 100) : 0; return c; }).sort(function (a, b) { return a.ratio - b.ratio || (a.category < b.category ? -1 : 1); });
    return out;
  }
  // 관리자 편집 검토: 원본(orig)과 편집본(n)을 받아 status·evidence 를 규칙에 맞게 정리한다. n 을 제자리에서 고치고 { errors, notes } 를 돌려준다.
  //  · 승인(approved)은 근거(basis ≠ legacy, tradition 이면 출처 1개 이상)가 있어야 한다 → 아니면 이전 상태로 되돌리고 오류.
  //  · 승인 상태인 모듈의 문장을 고치면(상태를 일부러 바꾸지 않은 경우) needs_evidence 로 내리고 rev 를 올린다.
  //  · 승인으로 저장하는 순간의 문장 해시를 evidence.textHash 에 남긴다.
  function reviewEdit(orig, n) {
    var errors = [], notes = [], was = (orig && orig.status) || 'legacy', now = n.status || 'legacy';
    var changed = !!orig && textHash(orig) !== textHash(n), ev = n.evidence || null;
    if (now === 'approved') {
      var weak = !ev || ev.basis === 'legacy' || (ev.basis === 'tradition' && !(ev.refs || []).length);
      if (weak) { errors.push('승인하려면 근거 종류(legacy 가 아님)가 필요하고, 전통 문헌 근거는 출처가 1개 이상 있어야 합니다. 이전 상태(' + was + ')로 되돌렸습니다.'); n.status = was; }
      else if (was === 'approved' && changed) { n.status = 'needs_evidence'; ev.rev = (+ev.rev || 0) + 1; delete ev.textHash; notes.push('승인된 문장을 고쳐서 상태를 needs_evidence 로 내렸습니다. 근거를 다시 확인한 뒤 승인하세요.'); }
      else { ev.textHash = textHash(n); }
    } else if (ev && ev.basis !== 'legacy' && changed) { ev.rev = (+ev.rev || 0) + 1; }
    return { errors: errors, notes: notes };
  }

  R.Quality = { STATUSES: STATUSES, evidence: evidence, reviewEdit: reviewEdit, textHash: textHash, MIN_LEN: MIN_LEN, textOf: textOf, chapterTexts: chapterTexts, missing: missing, absolute: absolute, assets: assets, worlds: worlds, audit: audit };
})(typeof window !== 'undefined' ? window : globalThis);
