/* 주제별 풀이 끝의 "마지막 질문" 카드 — 타로 · 주역 두 탭.
   · 종합풀이·재물운 심화·커리어운 심화·인연운 심화의 마지막 장 뒤에 한 번 나온다(건너뛰기 가능). 주역 카드는 예전에 풀이 중간에 있던 것을 이 자리로 옮겼다.
   · 기본 결과(타로: 카드·자리·키워드·종합 판단 / 주역: 검수된 풀이)는 AI 없이 바로, 늘 무료로 보인다.
   · AI 는 "내 사주와 엮어 깊이 읽기"를 눌렀을 때만 부른다. 타로·주역을 합쳐 기기당 하루 N회(기본 2, 한국 시간 자정 초기화, 받은 풀이만 차감) — 서버 _deep-quota.js.
   · 같은 날 같은 카드·질문은 이 기기에 저장된 결과를 다시 연다(새 호출 없음). 질문·결과는 서버에 저장하지 않는다.
   · 타로 탭은 관리자 스위치(주역 탭 → AI 깊이 읽기 상자의 "타로 깊이 읽기")가 켜졌을 때만 보인다. 주역 탭은 주역 서비스가 개방된 주제에서만 보인다. */
(function (root) {
  'use strict';
  var R = root.ReportV2 = root.ReportV2 || {};
  var WORLD = { w1: { mode: 'today', ko: '종합' }, w2: { mode: 'money', ko: '재물' }, w7: { mode: 'work', ko: '커리어' }, w3: { mode: 'love', ko: '인연' } };
  var HINT = { today: ['올해 가장 크게 고민되는 일을 어떻게 풀면 좋을까요?', '지금 가는 방향을 유지해도 될까요?'], money: ['지금 큰 지출을 해도 괜찮을까요?', '돈이 모이지 않는 이유가 뭘까요?'], work: ['지금 이직을 준비해도 될까요?', '이 일을 계속해도 될까요?'], love: ['이 사람과의 관계를 이어 가도 될까요?', '새로운 인연을 만나려면 무엇을 바꿔야 할까요?'] };
  var LAST = 'mt_tarot_deep_', DEV = 'mt_dev_id', DAY = 86400000;
  var ERR = { 'device-limit': '오늘 깊이 읽기를 모두 썼어요. 내일(한국 시간 자정) 다시 열려요.', 'ip-limit': '이 네트워크에서 오늘 이용할 수 있는 깊이 읽기를 모두 썼어요. 내일 다시 열려요.', 'daily-limit': '오늘은 깊이 읽기 이용이 많아 잠시 닫혔어요. 내일 다시 열려요.', 'ai-invalid': 'AI가 기준에 맞는 풀이를 만들지 못했어요. 횟수는 차감되지 않았어요.', 'ai-failed': 'AI 연결이 잠시 불안정해요. 횟수는 차감되지 않았어요.', 'cost-limit': '지금은 깊이 읽기를 쓸 수 없어요.', 'ai-off': '깊이 읽기가 지금은 꺼져 있어요.', 'ai-unavailable': '깊이 읽기가 지금은 꺼져 있어요.' };
  var ST = {}, STATUS = null, loading = false;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var store = { get: function (k) { try { return root.localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { root.localStorage.setItem(k, v); } catch (e) { } } };
  var ul = function (a) { return a && a.length ? '<ul>' + a.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : ''; };

  // 이 기기의 임의 ID(하루 횟수를 사람 단위로 세는 데만 쓴다. 서버에는 해시만 남는다)
  function device() {
    var v = store.get(DEV); if (v && /^[a-z0-9]{16,40}$/.test(v)) return v;
    var a = new Uint8Array(12); try { root.crypto.getRandomValues(a); } catch (e) { for (var i = 0; i < 12; i++) a[i] = Math.floor(Math.random() * 256); }
    v = Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); store.set(DEV, v); return v;
  }
  function loadStatus() {
    if (STATUS || loading) return; loading = true;
    root.fetch('/api/deep-ai?a=status&device=' + device()).then(function (r) { return r.json(); }).then(function (d) { STATUS = d || null; }).catch(function () { STATUS = { tarot: { enabled: false }, iching: { ai: false }, left: 0, limit: 0 }; });
  }
  function quota() { return STATUS ? { left: STATUS.left, limit: STATUS.limit } : { left: 0, limit: 0 }; }
  function setQuota(q) { if (STATUS && q && q.limit) { STATUS.left = q.left; STATUS.limit = q.limit; } }
  function tarotOn() { return !!(STATUS && STATUS.tarot && STATUS.tarot.enabled && root.MantraCore && root.MantraCore.Tarot); }
  function ichingOn(wid) { return !!(R.IchingCard && R.IchingCard.offered(wid)); }
  function offered(wid) { return !!WORLD[wid] && (tarotOn() || ichingOn(wid)); }
  // 세계의 장 목록에서 카드를 붙일 장: 마지막 장 뒤
  function anchorFor(idxs) { return idxs && idxs.length ? idxs[idxs.length - 1] : -1; }
  // "내 사주와 엮어 깊이 읽기" 버튼(남은 횟수 표시). 남은 횟수가 0이면 안내만.
  function aiButton(attr) {
    var q = quota();
    if (q.limit && q.left <= 0) return '<p class="rdic-small">오늘 깊이 읽기 ' + q.limit + '회를 모두 썼어요. 내일 다시 열려요. 위의 기본 풀이는 그대로 볼 수 있어요.</p>';
    return '<button type="button" class="chipbtn rdic-go dk-ai" ' + attr + '>내 사주와 엮어 깊이 읽기' + (q.limit ? ' · 오늘 남은 ' + q.left + '/' + q.limit : '') + '</button>' +
      '<p class="rdic-small">누르면 질문과 카드·괘, 사주 요약(일간·강약·지금 대운)이 AI 서비스(OpenAI 또는 Anthropic)로 전송됩니다. 이름·생년월일·출생지는 보내지 않고, 서버에 저장하지 않습니다. AI가 쓴 글은 관리자 검수를 거치지 않습니다.</p>';
  }

  /* ── 타로 ── */
  function sajuOf(sd) {
    try {
      if (!sd || !sd.dayMaster || !sd.strength) return null;
      return { dayMaster: { stem: sd.dayMaster.stem, el: sd.dayMaster.el }, strength: { band: sd.strength.band }, nowYear: sd.nowYear || new Date().getFullYear(),
        daewoon: (sd.daewoon || []).map(function (x) { return { startYear: x.startYear, endYear: x.endYear, ganzhi: x.ganzhi, season: x.seasonName || x.season }; }) };
    } catch (e) { return null; }
  }
  function restore(wid) { var raw = store.get(LAST + wid); if (!raw) return null; try { var o = JSON.parse(raw); return o && o.picks && Date.now() - o.at < DAY ? o : null; } catch (e) { return null; } }
  function tState(wid) {
    if (!ST[wid]) { var o = restore(wid); ST[wid] = o ? { phase: 'result', picks: o.picks, q: o.q || '', ai: o.ai ? { phase: 'done', detail: o.ai } : null } : { phase: 'offer', q: '' }; }
    return ST[wid];
  }
  function tSave(wid, s) { store.set(LAST + wid, JSON.stringify({ at: Date.now(), picks: s.picks, q: s.q || '', ai: s.ai && s.ai.detail || null })); }
  function spreadOf(wid, s) { var T = root.MantraCore.Tarot; return T.readSpread('three', s.picks, WORLD[wid].mode); }
  function tarotView(wid) {
    var s = tState(wid), w = WORLD[wid], aiOn = tarotOn();
    if (s.phase === 'offer') {
      return '<p class="lead rd-answer-question">' + esc(w.ko) + ' 주제로 타로 세 장을 펼쳐 볼까요?</p><p class="faint">지금 마음에 걸리는 ' + esc(w.ko) + ' 고민을 하나 떠올려 보세요. 과거·현재·미래 세 장으로 읽어 드립니다.</p>' +
        '<div class="rdic-hints">' + HINT[w.mode].map(function (q) { return '<button type="button" class="chipbtn" data-dk-q="' + esc(q) + '">' + esc(q) + '</button>'; }).join('') + '</div>' +
        '<input class="rdic-q" type="text" maxlength="200" data-dk-input placeholder="질문 (선택, 최대 200자)" value="' + esc(s.q || '') + '" aria-label="타로 질문">' +
        '<div class="vd rd-answer-choices" role="group" aria-label="타로 선택"><button type="button" class="chipbtn rdic-go" data-dk-draw>카드 세 장 뽑기</button><button type="button" class="chipbtn" data-dk-skip>건너뛰고 이어 읽기</button></div>';
    }
    var rs = spreadOf(wid, s); if (!rs) { ST[wid] = { phase: 'offer', q: s.q }; return tarotView(wid); }
    var d = s.ai && s.ai.detail;
    var cards = '<div class="dk-cards">' + rs.rows.map(function (r, i) { return '<div class="dk-card' + (r.rev ? ' rev' : '') + '"><small>' + esc(r.label) + '</small><b>' + esc(r.card.nameKo) + '</b><span>' + (r.rev ? '역방향' : '정방향') + '</span><em>' + esc(r.kw) + '</em>' + (d && d.cards[i] ? '<p>' + esc(d.cards[i]) + '</p>' : '') + '</div>'; }).join('') + '</div>';
    var basic = '<h5>카드가 말하는 흐름</h5><p><span class="rdic-tag">' + esc(rs.band) + '</span> ' + esc(rs.oneLine) + '</p>' + (rs.trend ? '<p>' + esc(rs.trend) + '</p>' : '') + ul(rs.notes) + '<p><b>조언</b> ' + esc(rs.advice) + '</p>';
    var ai = '';
    if (s.ai && s.ai.phase === 'loading') ai = '<div class="rdic-ai"><b>깊이 읽기</b><p class="rdic-small">질문과 사주에 맞춰 풀이를 쓰는 중이에요… (10~30초)</p></div>';
    else if (d) ai = '<div class="rdic-ai"><b>깊이 읽기</b> <span class="rdic-tag">AI 작성</span><p class="rdic-answer">' + esc(d.answer) + '</p>' + (d.saju_note ? '<h5>내 사주와 함께 보면</h5><p>' + esc(d.saju_note) + '</p>' : '') + '<h5>이 질문에 맞춘 행동</h5>' + ul(d.steps) + '<p class="rdic-small"><b>주의</b> ' + esc(d.caution) + '</p></div>';
    else if (aiOn) ai = (s.ai && s.ai.phase === 'err' ? '<p class="rdic-small rdic-err">' + esc(s.ai.err) + '</p>' : '') + aiButton('data-dk-ai');
    return '<p class="rdic-small">' + esc(w.ko) + ' 타로 · 과거·현재·미래' + (s.q ? ' · ' + esc(s.q) : '') + '</p>' + cards + (d ? ai + '<details class="rdic-more"><summary>카드 기본 풀이 보기</summary>' + basic + '</details>' : basic + ai) +
      '<p class="rdic-small">타로는 미래를 확정하는 도구가 아니라, 지금의 선택을 돌아보게 하는 참고 자료입니다.</p>' +
      '<div class="vd rd-answer-choices" role="group" aria-label="타로 이후"><button type="button" class="chipbtn rdic-go" data-dk-continue>이어 읽기</button><button type="button" class="chipbtn" data-dk-again>새 질문으로 다시 뽑기</button></div>';
  }

  /* ── 카드 전체(탭) ── */
  function html(wid) {
    var t = tarotOn(), ic = ichingOn(wid), first = t ? 'tarot' : 'iching';
    var tabs = t && ic ? '<div class="dk-tabs" role="tablist" aria-label="마지막 질문 방식"><button type="button" role="tab" data-dk-tab="tarot" aria-selected="true">타로</button><button type="button" role="tab" data-dk-tab="iching" aria-selected="false">주역 점괘</button></div>' : '';
    return '<div class="rd-answer rd-deep" data-deep="' + esc(wid) + '" data-completed="0"><p class="dk-kick">마지막 질문 하나</p><h4 class="dk-h">' + esc(WORLD[wid].ko) + ' 이야기를 다 읽으셨어요. 마음에 남은 질문이 있나요?</h4>' + tabs +
      (t ? '<div class="dk-pane" data-dk-pane="tarot"' + (first === 'tarot' ? '' : ' hidden') + '><div data-dk-tarot="' + esc(wid) + '">' + tarotView(wid) + '</div></div>' : '') +
      (ic ? '<div class="dk-pane" data-dk-pane="iching"' + (first === 'iching' ? '' : ' hidden') + '>' + R.IchingCard.html(wid) + '</div>' : '') + '</div>';
  }

  /* ── 동작 ── */
  function done(box, o) { box.dataset.completed = '1'; if (o.onMeasure) o.onMeasure(); if (o.onContinue) o.onContinue(); }
  function paintT(box, wid, o) { var p = box.querySelector('[data-dk-tarot]'); if (p) p.innerHTML = tarotView(wid); if (o.onMeasure) o.onMeasure(); }
  function askAi(box, wid, o) {
    var s = ST[wid]; s.ai = { phase: 'loading' }; paintT(box, wid, o);
    var body = { mode: WORLD[wid].mode, spread: 'three', picks: s.picks, question: (s.q || '').trim(), saju: sajuOf(o.sd), device: device(), consent: true };
    root.fetch('/api/deep-ai?a=tarot', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (x) { return x.json().then(function (d) { return { s: x.status, d: d }; }); }).catch(function () { return { s: 0, d: {} }; }).then(function (z) {
        if (ST[wid] !== s || !box.isConnected) return;
        if (z.s === 200 && z.d.ok) { s.ai = { phase: 'done', detail: z.d.detail }; setQuota(z.d.quota); tSave(wid, s); if (o.onTrack) o.onTrack('tarot_deep_ai_done', { world: wid }); }
        else { s.ai = { phase: 'err', err: ERR[z.d && z.d.error] || '깊이 읽기를 받지 못했어요. 횟수는 차감되지 않았어요.' }; if (z.d && /limit/.test(z.d.error || '') && STATUS) STATUS.left = 0; }
        paintT(box, wid, o);
      });
  }
  function handleClick(target, o) {
    var btn = target.closest && target.closest('[data-dk-tab],[data-dk-q],[data-dk-draw],[data-dk-skip],[data-dk-continue],[data-dk-again],[data-dk-ai]'); if (!btn) return false;
    var box = btn.closest('[data-deep]'); if (!box) return false; var wid = box.dataset.deep;
    if (btn.hasAttribute('data-dk-tab')) {
      var k = btn.dataset.dkTab; box.querySelectorAll('[data-dk-tab]').forEach(function (b) { b.setAttribute('aria-selected', String(b === btn)); }); box.querySelectorAll('[data-dk-pane]').forEach(function (p) { p.hidden = p.dataset.dkPane !== k; });
      if (o.onPause) o.onPause(); if (o.onMeasure) o.onMeasure(); if (o.onTrack) o.onTrack('deep_ask_tab', { world: wid, tab: k }); return true;
    }
    var s = tState(wid), input = box.querySelector('[data-dk-input]'); if (input) s.q = input.value;
    if (btn.hasAttribute('data-dk-q')) { s.q = btn.dataset.dkQ; paintT(box, wid, o); return true; }
    if (btn.hasAttribute('data-dk-draw')) { s.picks = root.MantraCore.Tarot.draw(3); s.phase = 'result'; s.ai = null; tSave(wid, s); if (o.onPause) o.onPause(); paintT(box, wid, o); if (o.onTrack) o.onTrack('tarot_deep_drawn', { world: wid }); return true; }
    if (btn.hasAttribute('data-dk-ai')) { askAi(box, wid, o); return true; }
    if (btn.hasAttribute('data-dk-again')) { ST[wid] = { phase: 'offer', q: '' }; store.set(LAST + wid, ''); paintT(box, wid, o); if (o.onPause) o.onPause(); return true; }
    if (btn.hasAttribute('data-dk-skip') && o.onTrack) o.onTrack('deep_ask_skipped', { world: wid });
    done(box, o); return true;
  }
  function init() { device(); loadStatus(); }
  R.DeepAsk = { init: init, offered: offered, anchorFor: anchorFor, html: html, handleClick: handleClick, device: device, quota: quota, setQuota: setQuota, aiButton: aiButton, ERR: ERR, _state: ST, _setStatus: function (s) { STATUS = s; } };
  if (typeof module !== 'undefined' && module.exports) module.exports = R.DeepAsk;
})(typeof window !== 'undefined' ? window : globalThis);
