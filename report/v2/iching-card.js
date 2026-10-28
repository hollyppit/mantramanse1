/* 주제별 풀이 중간의 "주역 점괘" 카드. 종합풀이·재물운 심화·커리어운 심화·인연운 심화를 읽다가 중간에서 점괘를 칠 수 있게 한다(선택, 건너뛰기 가능).
   · 카드는 읽기 문서 안의 한 섹션이다. 선택형 추가 풀이(.rd-answer)와 같은 방식으로 자동 진행을 멈추고(.vd), "이어 읽기"를 누르면 같은 자리에서 다시 재생한다.
   · 점괘 계산은 report/iching/engine.js(세 동전), 해석은 /api/iching(관리자가 승인·게시한 문구만, 개방 전에는 카드가 아예 나오지 않는다).
   · AI 상세 풀이가 켜져 있으면 기본 결과 화면이 된다: 시작할 때 한 번 동의하면 점괘 직후 자동으로 요청하고, 꺼져 있거나 실패하면 검수된 풀이를 펼쳐 보여 준다.
   · 질문·결과는 서버에 저장하지 않는다. 이 기기(localStorage)에 "이전 점괘"로만 남고 만세력 화면의 주역 탭과 같은 기록을 쓴다. 사주 값은 이미 계산된 sd 를 읽기만 한다. */
(function (root) {
  'use strict';
  var R = root.ReportV2 = root.ReportV2 || {};
  var CAT = { w1: 'general', w2: 'wealth', w7: 'career', w3: 'love' }, CAT_KO = { general: '종합', wealth: '재물', career: '커리어', love: '인연' };
  var HINT = { general: ['올해 가장 크게 고민되는 일을 결정해도 될까요?', '지금 가는 방향을 유지해도 될까요?'], wealth: ['지금 투자를 시작해도 될까요?', '큰 지출을 앞두고 있는데 괜찮을까요?', '돈이 모이지 않는 이유가 궁금해요'], career: ['이직해도 될까요?', '지금 직장을 그만두고 사업을 시작해도 될까요?'], love: ['지금 만나는 사람과 관계를 더 진전시켜도 될까요?', '결혼을 생각해도 될까요?'] };
  var KEY = 'mt_iching_v1', LAST = 'mt_iching_last_', DAY = 86400000, AI_ERR = { 'ip-limit': '오늘 이용 가능한 AI 풀이 횟수를 모두 썼습니다.', 'daily-limit': '오늘은 AI 풀이 이용이 많아 잠시 닫혔습니다.', 'ai-invalid': 'AI가 기준에 맞는 풀이를 만들지 못했습니다.', 'ai-failed': 'AI 서비스에 연결하지 못했습니다.' };
  var LN = { 6: '노음(변하는 음)', 7: '소양', 8: '소음', 9: '노양(변하는 양)' };
  var ST = {}, STATUS = null, loading = false;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var store = { get: function (k) { try { return root.localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { root.localStorage.setItem(k, v); } catch (e) { /* 저장이 막혀도 점괘는 본다 */ } } };

  function loadStatus() {
    if (STATUS || loading) return; loading = true;
    root.fetch('/api/iching?a=status').then(function (r) { return r.json(); }).then(function (d) { STATUS = d || { open: false, categories: [] }; }).catch(function () { STATUS = { open: false, categories: [] }; });
  }
  function categoryOf(wid) { return CAT[wid] || null; }
  // 서비스가 개방돼 있고 이 주제의 분야가 열려 있을 때만 카드를 넣는다(개방 전에는 문서가 예전과 똑같다).
  function offered(wid) { var c = CAT[wid]; return !!(c && STATUS && STATUS.open && STATUS.categories.indexOf(c) >= 0 && root.Iching); }
  // 세계의 챕터 목록(idxs)에서 카드를 붙일 챕터: 중간쯤(절반 지점의 챕터 뒤).
  function anchorFor(idxs) { if (!idxs || !idxs.length) return -1; return idxs[Math.max(0, Math.min(idxs.length - 1, Math.floor(idxs.length / 2) - 1))]; }

  function sajuOf(sd) {
    try {
      if (!sd || !sd.dayMaster || !sd.strength) return null;
      return { dayMaster: { stem: sd.dayMaster.stem, el: sd.dayMaster.el }, strength: { band: sd.strength.band }, nowYear: sd.nowYear || new Date().getFullYear(),
        daewoon: (sd.daewoon || []).map(function (x) { return { startYear: x.startYear, endYear: x.endYear, ganzhi: x.ganzhi, season: x.season }; }), annual: sd.sewoon ? { year: sd.sewoon.year, ganzhi: sd.sewoon.ganzhi } : undefined };
    } catch (e) { return null; }
  }
  function restore(wid) {
    var raw = store.get(LAST + wid); if (!raw) return null;
    try { var o = JSON.parse(raw); return o && o.result && Date.now() - o.at < DAY ? o : null; } catch (e) { return null; }
  }
  function stateOf(wid) {
    if (!ST[wid]) { var last = restore(wid); ST[wid] = last ? { phase: 'result', result: last.result, ai: last.ai ? { phase: 'done', detail: last.ai } : null, q: last.result.question || '', values: last.result.hexagram.values.slice(), restored: true } : { phase: 'offer', q: '' }; }
    return ST[wid];
  }
  function saveResult(wid, s, sd) {
    store.set(LAST + wid, JSON.stringify({ at: Date.now(), result: s.result, ai: s.ai && s.ai.detail || null }));
    var hist = []; try { hist = JSON.parse(store.get(KEY) || '[]'); } catch (e) { hist = []; }
    var i = hist.findIndex(function (h) { return h && h.result && h.result.result_id === s.result.result_id; });
    var entry = { at: new Date().toISOString(), result: s.result, saju: s.saju || null, ai: s.ai && s.ai.detail || undefined, from: 'timeline' };
    if (i >= 0) hist[i] = Object.assign(hist[i], entry); else hist.unshift(entry);
    store.set(KEY, JSON.stringify(hist.slice(0, 20)));
  }

  /* ── 화면 조각 ── */
  function fig(values) {
    var rows = '';
    for (var i = 5; i >= 0; i--) { var v = values[i], has = v != null, yang = v === 7 || v === 9, chg = v === 6 || v === 9;
      rows += '<div class="rdic-ln' + (has ? ' on' : '') + (chg ? ' chg' : '') + '" aria-label="' + (i + 1) + '효 ' + (has ? (yang ? '양' : '음') + (chg ? ' 변효' : '') : '미정') + '">' + (has ? (yang ? '<i class="y"></i>' : '<i class="n"></i><i class="n"></i>') : '<i class="e"></i>') + (chg ? '<b class="mk" aria-hidden="true">○</b>' : '') + '<small>' + ['초', '이', '삼', '사', '오', '상'][i] + '효</small></div>'; }
    return '<div class="rdic-fig" role="img" aria-label="쌓인 효">' + rows + '</div>';
  }
  var ul = function (a) { return a && a.length ? '<ul>' + a.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : ''; };
  function reviewed(r) {
    var x = r.hexagram_explanation, t = r.transformation_analysis, j = r.saju_cross_analysis, sc = r.scenarios, a = r.action_plan, s = r.situation_analysis, c = r.conclusion, tr = r.transformed_hexagram;
    var h = '<h5>핵심 결론</h5><p><b>' + esc(c.direction) + '</b> — ' + esc(c.summary) + '</p>' + ul(c.conditions);
    h += '<h5>본괘 · 제' + x.number + '괘 ' + esc(x.name) + '(' + esc(x.hanja) + ')</h5><p>' + esc(x.upper_lower) + ' · ' + esc((x.keywords || []).join(' · ')) + '</p><p>' + esc(x.core_meaning) + '</p><p class="rdic-orig">' + esc(x.guaci_original && x.guaci_original.text) + '</p><p>' + esc(x.guaci_modern && x.guaci_modern.text) + '</p>';
    h += '<h5>현재 상황</h5><p>' + esc(s.issue) + '</p><b>유리</b>' + ul(s.favorable) + '<b>불리</b>' + ul(s.unfavorable) + '<b>주의할 판단 오류</b>' + ul(s.judgment_errors) + '<b>개선 조건</b>' + ul(s.improve_conditions);
    h += '<h5>변효와 변괘</h5><p>' + esc(t.statement || t.summary) + '</p>' + (t.readings || []).map(function (y) { return '<p class="rdic-small"><b>' + esc(y.label || '괘사') + '</b> <span class="rdic-orig">' + esc(y.original) + '</span><br>' + esc(y.modern) + '</p>'; }).join('') + (t.line_meanings ? ul(t.line_meanings.map(function (l) { return l.label + ' — ' + l.meaning; })) : '') + (tr && t.relation ? '<p>변괘 ' + esc(tr.ko) + '(' + tr.num + ') — ' + esc(t.relation.transformed_core) + '</p><p class="rdic-small">' + esc(t.relation.note) + '</p>' : '');
    h += '<h5>사주와 주역을 함께 보면</h5>' + (j.status === 'ok' ? ul(j.luck_context) + ul(j.category_traits) + '<b>같은 방향</b>' + ul(j.common) + '<b>다른 방향</b>' + ul(j.divergent) + '<p>' + esc(j.reference_judgment) + '</p>' : '<p class="rdic-small">사주 연동 정보 없음</p>');
    h += '<h5>최선과 최악의 시나리오</h5><p class="rdic-small">' + esc(sc.disclaimer) + '</p><b>유리하게 흐르려면</b>' + ul(sc.favorable.conditions.concat(sc.favorable.actions)) + '<b>불리하게 흐르는 경우</b>' + ul(sc.unfavorable.gaps.concat(sc.unfavorable.repeats));
    h += '<h5>현실적인 행동 처방</h5><b>지금 해야 할 행동</b>' + ul(a['do']) + '<b>피해야 할 행동</b>' + ul(a.avoid) + '<b>결정 전에 확인할 것</b>' + ul(a.check_before) + '<b>다시 점검할 기준</b>' + ul(a.review_criteria);
    return h + '<h5>최종 한마디</h5><p class="rdic-final">' + esc(r.final_message.text) + '</p>';
  }
  function aiBlock(s) {
    var A = s.ai, d = A && A.detail;
    if (A && A.phase === 'loading') return '<div class="rdic-ai"><b>AI 상세 풀이</b><p class="rdic-small">질문에 맞춰 풀이를 쓰는 중입니다… (10~30초)</p></div>';
    if (!d) return '';
    return '<div class="rdic-ai"><b>AI 상세 풀이</b> <span class="rdic-tag">AI 작성</span><p class="rdic-small">검수된 풀이를 바탕으로 AI가 이 질문에 맞게 풀어 쓴 보충 설명입니다. 관리자가 한 줄씩 검수한 문장은 아닙니다.</p><p class="rdic-answer">' + esc(d.answer) + '</p><h5>괘가 말하는 것</h5>' + d.reading.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') + (d.saju_note ? '<h5>사주와 함께 보면</h5><p>' + esc(d.saju_note) + '</p>' : '') + '<h5>이 질문에 맞춘 행동</h5>' + ul(d.steps) + '<h5>스스로에게 물어볼 것</h5>' + ul(d.ask_yourself) + '<p class="rdic-small">' + esc(d.caution) + '</p></div>';
  }
  function view(wid) {
    var s = stateOf(wid), cat = CAT[wid], ko = CAT_KO[cat], aiOn = !!(STATUS && STATUS.ai && STATUS.ai.enabled);
    if (s.phase === 'offer' || s.phase === 'err') {
      return '<p class="lead rd-answer-question">잠깐, ' + esc(ko) + ' 주제로 주역 점괘를 쳐 볼까요?</p><p class="faint">여기까지 읽은 내용과 별개로, 지금 마음에 걸리는 ' + esc(ko) + ' 문제를 하나 떠올려 보세요. 세 동전으로 괘를 얻고 검수된 해석으로 풀어 드립니다. 건너뛰고 이어 읽어도 됩니다.</p>' +
        '<div class="rdic-hints">' + HINT[cat].map(function (q) { return '<button type="button" class="chipbtn" data-ic-q="' + esc(q) + '">' + esc(q) + '</button>'; }).join('') + '</div>' +
        '<input class="rdic-q" type="text" maxlength="200" data-ic-input placeholder="질문 (선택, 최대 200자)" value="' + esc(s.q || '') + '" aria-label="점괘 질문">' +
        '<p class="rdic-small">질문의 글자를 분석해서 답하지는 않습니다. 선택한 주제와 나온 괘를 기준으로 풀이합니다. 질문은 서버에 저장되지 않습니다.' + (aiOn ? '<br><b>AI 상세 풀이가 함께 제공됩니다.</b> 시작하면 질문과 풀이 내용이 AI 서비스(OpenAI 또는 Anthropic)로 전송됩니다. 이름·생년월일·출생지는 보내지 않으며, AI가 쓴 글은 관리자 검수를 거치지 않습니다. 하루 이용 횟수에 제한이 있습니다.' : '') + '</p>' +
        (s.err ? '<p class="rdic-err">' + esc(s.err) + '</p>' : '') +
        '<div class="vd rd-answer-choices" role="group" aria-label="주역 점괘 선택"><button type="button" class="chipbtn rdic-go" data-ic-start>' + (aiOn ? '동의하고 점괘 보기' : '점괘 보기') + '</button><button type="button" class="chipbtn" data-ic-skip>건너뛰고 이어 읽기</button></div>';
    }
    if (s.phase === 'casting' || s.phase === 'loading') {
      var n = (s.values || []).length, last = n ? s.coins[n - 1].reduce(function (a, b) { return a + b; }, 0) : 0;
      return '<div class="rdic-cast"><div class="rdic-coins" aria-live="polite">' + (n ? s.coins[n - 1].map(function (c) { return '<span class="rdic-coin ' + (c === 3 ? 'f' : 'b') + '">' + (c === 3 ? '앞' : '뒤') + '</span>'; }).join('') : '') + '</div><p class="rdic-say">' + (s.phase === 'loading' ? '괘를 풀이하는 중입니다…' : n ? n + '번째 효 · 동전 합 ' + last + ' → ' + LN[last] : '마음속 질문을 떠올리며 동전을 던집니다…') + '</p>' + fig(s.values || []) + '</div>';
    }
    // 결과: AI 풀이가 있으면 그것을 앞에, 검수된 풀이는 접어 둔다. AI 가 없거나 실패하면 검수된 풀이를 펼친다.
    var r = s.result, tr = r.transformed_hexagram, hasAi = !!(s.ai && (s.ai.phase === 'done' || s.ai.phase === 'loading'));
    return '<div class="rdic-head">' + fig(r.hexagram.values) + '<div><p class="rdic-small">' + esc(ko) + ' 점괘' + (r.question ? ' · ' + esc(r.question) : '') + '</p><p class="rdic-name">제' + r.hexagram.num + '괘 ' + esc(r.hexagram.ko) + '(' + esc(r.hexagram.hanja) + ')' + (tr ? ' → ' + esc(tr.ko) : '') + '</p><p><span class="rdic-tag">' + esc(r.conclusion.direction) + '</span></p><p>' + esc(r.conclusion.summary) + '</p></div></div>' +
      aiBlock(s) + (s.ai && s.ai.phase === 'err' ? '<p class="rdic-small rdic-err">' + esc(s.ai.err) + ' 검수된 풀이를 아래에 펼쳤습니다. <button type="button" class="chipbtn" data-ic-ai>AI 풀이 다시 요청</button></p>' : '') +
      '<details class="rdic-more"' + (hasAi ? '' : ' open') + '><summary>검수된 풀이 전체 보기 (8단계)</summary>' + reviewed(r) + '</details>' +
      '<p class="rdic-small">점괘는 미래를 확정하는 도구가 아니라, 지금의 선택을 돌아보게 하는 참고 자료입니다.</p>' +
      '<div class="vd rd-answer-choices" role="group" aria-label="점괘 이후"><button type="button" class="chipbtn rdic-go" data-ic-continue>읽던 곳으로 돌아가 이어 읽기</button><button type="button" class="chipbtn" data-ic-again>새 질문으로 다시 보기</button></div>';
  }
  function html(wid) {
    return '<div class="rd-answer rd-iching" data-ic-panel="' + esc(wid) + '" data-completed="0" aria-live="polite">' + view(wid) + '</div>';
  }

  /* ── 동작 ── */
  function paint(panel, wid, o) { panel.innerHTML = view(wid); if (o.onMeasure) o.onMeasure(); }
  function fail(panel, wid, o, msg) { var s = ST[wid]; s.phase = 'err'; s.err = msg; paint(panel, wid, o); }
  function askAi(panel, wid, o) {
    var s = ST[wid], r = s.result; s.ai = { phase: 'loading' }; paint(panel, wid, o);
    root.fetch('/api/iching?a=detail', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: r.question, category: r.question_category, values: r.hexagram.values, saju: s.saju || null, consent: true }) })
      .then(function (x) { return x.json().then(function (d) { return { s: x.status, d: d }; }); }).catch(function () { return { s: 0, d: {} }; }).then(function (z) {
        if (ST[wid] !== s || !panel.isConnected) return;
        if (z.s === 200 && z.d.ok) { s.ai = { phase: 'done', detail: z.d.detail }; saveResult(wid, s, o.sd); if (o.onTrack) o.onTrack('iching_ai_done', { world: wid }); }
        else s.ai = { phase: 'err', err: AI_ERR[z.d && z.d.error] || 'AI 풀이를 받지 못했습니다.' };
        paint(panel, wid, o);
      });
  }
  function interpret(panel, wid, o) {
    var s = ST[wid]; s.phase = 'loading'; paint(panel, wid, o);
    var saju = sajuOf(o.sd); s.saju = saju;
    root.fetch('/api/iching?a=interpret', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: (s.q || '').trim(), category: CAT[wid], values: s.values, saju: saju }) })
      .then(function (x) { return x.json().then(function (d) { return { s: x.status, d: d }; }); }).catch(function () { return { s: 0, d: {} }; }).then(function (z) {
        if (ST[wid] !== s || !panel.isConnected) return;
        if (z.s === 200 && z.d.ok) {
          s.result = z.d.result; s.phase = 'result'; s.ai = null; saveResult(wid, s, o.sd); panel.dataset.completed = '1';
          if (o.onTrack) o.onTrack('iching_completed', { world: wid, hexagram: z.d.result.hexagram.num, changing: z.d.result.changing_lines.length });
          if (STATUS && STATUS.ai && STATUS.ai.enabled) askAi(panel, wid, o); else paint(panel, wid, o);
        } else fail(panel, wid, o, z.s === 403 || z.s === 503 ? '점괘 풀이가 아직 준비되지 않았습니다. 건너뛰고 이어 읽어 주세요.' : '점괘를 보지 못했습니다. 잠시 뒤 다시 시도해 주세요.');
      });
  }
  function cast(panel, wid, o) {
    var s = ST[wid]; s.phase = 'casting'; s.coins = []; s.values = []; s.result = null; s.ai = null; s.err = null; panel.dataset.completed = '0';
    if (o.onPause) o.onPause(); paint(panel, wid, o);
    var step = function () {
      if (ST[wid] !== s || s.phase !== 'casting' || !panel.isConnected) return;
      var c = root.Iching.throwCoins(), v = root.Iching.lineFromCoins(c); s.coins.push(c); s.values.push(v); paint(panel, wid, o);
      if (s.values.length < 6) setTimeout(step, 750); else setTimeout(function () { if (ST[wid] === s && panel.isConnected) interpret(panel, wid, o); }, 900);
    };
    setTimeout(step, 400);
  }
  // 문서 클릭 처리. 이 카드의 버튼이면 true.
  function handleClick(target, o) {
    var btn = target.closest && target.closest('[data-ic-start],[data-ic-skip],[data-ic-continue],[data-ic-again],[data-ic-q],[data-ic-ai]'); if (!btn) return false;
    var panel = btn.closest('[data-ic-panel]'); if (!panel) return false; var wid = panel.dataset.icPanel, s = stateOf(wid);
    var input = panel.querySelector('[data-ic-input]'); if (input) s.q = input.value;
    if (btn.hasAttribute('data-ic-q')) { s.q = btn.dataset.icQ; paint(panel, wid, o); return true; }
    if (btn.hasAttribute('data-ic-start')) { if (!root.Iching) { fail(panel, wid, o, '점괘 계산 모듈을 불러오지 못했습니다. 새로고침해 주세요.'); return true; } if (o.onTrack) o.onTrack('iching_started', { world: wid, ai: !!(STATUS && STATUS.ai && STATUS.ai.enabled) }); cast(panel, wid, o); return true; }
    if (btn.hasAttribute('data-ic-ai')) { askAi(panel, wid, o); return true; }
    if (btn.hasAttribute('data-ic-again')) { ST[wid] = { phase: 'offer', q: '' }; store.set(LAST + wid, ''); panel.dataset.completed = '0'; paint(panel, wid, o); if (o.onPause) o.onPause(); return true; }
    // 건너뛰기·이어 읽기: 이 카드는 끝난 것으로 표시하고 자동 진행을 같은 자리에서 다시 시작한다.
    if (btn.hasAttribute('data-ic-skip') && o.onTrack) o.onTrack('iching_skipped', { world: wid });
    panel.dataset.completed = '1'; if (o.onMeasure) o.onMeasure(); if (o.onContinue) o.onContinue(); return true;
  }
  function init() { loadStatus(); }
  R.IchingCard = { init: init, offered: offered, categoryOf: categoryOf, anchorFor: anchorFor, html: html, handleClick: handleClick, _state: ST, _setStatus: function (s) { STATUS = s; } };
  if (typeof module !== 'undefined' && module.exports) module.exports = R.IchingCard;
})(typeof window !== 'undefined' ? window : globalThis);
