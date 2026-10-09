// 중간 선택형 추가 풀이. 계산 요약과 이미 보여 준 문구만 전송하며 이름·생년월일은 보내지 않는다.
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {}, cache = Object.create(null);
  var TOPICS = {
    self: ['지금 나에게 더 필요한 설명은 무엇입니까?', ['내 성향을 더 잘 쓰고 싶어요', '실제 모습은 설명과 달라요', '같은 습관에 자꾸 막혀요', '무엇부터 바꿀지 알고 싶어요']],
    money: ['돈을 다루면서 어떤 부분이 가장 걸립니까?', ['돈 버는 강점을 더 살리고 싶어요', '내 돈 쓰는 모습과는 달라요', '벌어도 남지 않는 일이 반복돼요', '관리 방법을 구체적으로 알고 싶어요']],
    career: ['일하면서 어떤 부분을 더 짚어 볼까요?', ['잘하는 일을 더 살리고 싶어요', '지금 일하는 모습과는 달라요', '성과를 내도 부담이 계속 커져요', '일의 우선순위를 정하고 싶어요']],
    love: ['연애에서 어떤 상황을 더 살펴볼까요?', ['애정을 표현하는 강점을 살리고 싶어요', '실제 연애 모습과는 달라요', '마음을 전하다 같은 갈등을 겪어요', '다음 대화에서 할 일을 알고 싶어요']],
    marriage: ['함께 사는 관계에서 무엇이 더 궁금합니까?', ['서로의 장점을 더 잘 쓰고 싶어요', '내 관계의 모습과는 달라요', '역할과 기대가 자꾸 어긋나요', '생활에서 합의할 일을 알고 싶어요']],
    relation: ['사람 사이에서 어떤 부분을 더 살펴볼까요?', ['관계에서 내 강점을 살리고 싶어요', '실제 사람 대하는 모습과는 달라요', '같은 부탁과 갈등이 반복돼요', '경계를 어떻게 말할지 알고 싶어요']]
  };
  var KEYS = ['resonates', 'different', 'risk', 'action'];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function card(topic) {
    var t = TOPICS[topic]; if (!t) return '';
    return '<div class="rd-answer" data-answer-topic="' + topic + '" data-completed="0"><p class="lead rd-answer-question">' + esc(t[0]) + '</p><p class="faint">가까운 상황을 고르면, 이 풀이의 근거와 연결해 더 자세히 답합니다. 선택 없이 이어 읽어도 됩니다.</p><div class="vd rd-answer-choices" role="group" aria-label="' + esc(t[0]) + '">' + t[1].map(function (label, i) { return '<button type="button" class="btn" data-answer-choice="' + KEYS[i] + '" aria-pressed="false">' + esc(label) + '</button>'; }).join('') + '</div><p class="rd-answer-status faint" role="status" aria-live="polite"></p><div class="rd-answer-result" hidden></div><div class="rd-answer-actions"><button type="button" class="btn" data-answer-retry hidden>답변 다시 받기</button><button type="button" class="btn" data-answer-continue hidden>답변을 읽었어요 · 이어 읽기</button><button type="button" class="btn" data-answer-skip>선택 없이 이어 읽기</button></div></div>';
  }
  function payload(topic, choice, sd) {
    var SC = R.StoryComposer, id = SC && Object.keys(SC.MOD).find(function (k) { return SC.MOD[k] === topic; }), e = SC && SC.TOPICS[topic] && SC.TOPICS[topic][sd.dominantGroup], sol = id && SC.solution(id, sd);
    if (!sol || !e || KEYS.indexOf(choice) < 0) return null;
    var groups = {}; ['비겁', '식상', '재성', '관성', '인성'].forEach(function (g) { groups[g] = sd.groups[g]; });
    return { topic: topic, choice: choice, facts: { dominantGroup: sd.dominantGroup, strength: sd.strength.band, groups: groups, yong: sd.usefulElements && !sd.usefulElements.fallback ? sd.usefulElements.yong : null }, source: { conclusion: e[0], strength: e[3], risk: e[4], principle: sol.principle, action: sol.action } };
  }
  function render(result) {
    var labels = { meaning: '선택한 상황을 읽으면', tradeoff: '살릴 힘과 경계할 습관', solution: '명리적 보완 방향', action: '지금 할 일과 확인할 변화' };
    return '<p class="rd-answer-label">선택에 대한 추가 풀이</p>' + Object.keys(labels).map(function (key) { return '<div class="rd-answer-part"><h4>' + labels[key] + '</h4><p class="lead">' + esc(result[key]) + '</p></div>'; }).join('');
  }
  function validResult(r) { return !!r && ['meaning', 'tradeoff', 'solution', 'action'].every(function (k) { return typeof r[k] === 'string' && r[k].length >= 15 && r[k].length <= 300; }); }
  function ask(panel, choice, o) {
    var data = payload(panel.dataset.answerTopic, choice, o.sd); if (!data) return;
    if (panel._answerController) panel._answerController.abort();
    var id = (panel._answerSeq || 0) + 1; panel._answerSeq = id; panel._answerChoice = choice; panel.dataset.completed = '0';
    var status = panel.querySelector('.rd-answer-status'), output = panel.querySelector('.rd-answer-result'), retry = panel.querySelector('[data-answer-retry]'), next = panel.querySelector('[data-answer-continue]'), skip = panel.querySelector('[data-answer-skip]');
    [].forEach.call(panel.querySelectorAll('[data-answer-choice]'), function (b) { b.setAttribute('aria-pressed', String(b.dataset.answerChoice === choice)); });
    panel.setAttribute('aria-busy', 'true'); status.textContent = '선택한 상황과 풀이의 근거를 연결하고 있습니다…'; output.hidden = true; output.innerHTML = ''; retry.hidden = true; next.hidden = true; skip.hidden = false; skip.textContent = '답변 기다리지 않고 이어 읽기';
    if (o.onPause) o.onPause(); if (o.onMeasure) o.onMeasure();
    var key = JSON.stringify(data), hit = cache[key];
    var ctl = root.AbortController ? new root.AbortController() : null; panel._answerController = ctl;
    var timer = root.setTimeout(function () { if (ctl) ctl.abort(); }, 60000);
    var run = hit && Date.now() - hit.at < 900000 ? Promise.resolve(hit.result) : (o.fetch || root.fetch)('/api/reading-answer', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data), signal: ctl && ctl.signal }).then(function (res) { return res.json().then(function (d) { if (!res.ok || !d.ok || !validResult(d.result)) throw new Error(d.error || 'ai-unavailable'); cache[key] = { result: d.result, at: Date.now() }; return d.result; }); });
    return run.then(function (r) {
      if (panel._answerSeq !== id || !panel.isConnected) return;
      output.innerHTML = render(r); output.hidden = false; status.textContent = '선택한 상황에 대한 풀이입니다. 읽은 뒤 이어가거나 다른 상황을 골라 보세요.'; next.hidden = false; skip.hidden = true;
      if (o.onMeasure) o.onMeasure();
    }).catch(function (e) {
      if (panel._answerSeq !== id || !panel.isConnected) return;
      status.textContent = e.message === 'rate-limited' ? '추가 풀이 요청이 많아 잠시 쉬어야 합니다. 기존 본문은 계속 읽을 수 있습니다.' : '추가 답변을 받지 못했습니다. 다시 요청하거나 기존 본문을 이어 읽을 수 있습니다.';
      retry.hidden = false; skip.textContent = '기존 본문 이어 읽기';
      if (o.onMeasure) o.onMeasure();
    }).then(function () { root.clearTimeout(timer); if (panel._answerSeq === id) { panel.setAttribute('aria-busy', 'false'); panel._answerController = null; } });
  }
  function handleClick(target, o) {
    var button = target.closest && target.closest('[data-answer-choice],[data-answer-retry],[data-answer-continue],[data-answer-skip]'); if (!button) return false;
    var panel = button.closest('.rd-answer'); if (!panel) return false;
    if (button.hasAttribute('data-answer-choice')) { ask(panel, button.dataset.answerChoice, o); if (o.onChoice) o.onChoice(panel.dataset.answerTopic, button.dataset.answerChoice); }
    else if (button.hasAttribute('data-answer-retry')) ask(panel, panel._answerChoice, o);
    else {
      panel._answerSeq = (panel._answerSeq || 0) + 1; if (panel._answerController) panel._answerController.abort(); panel.setAttribute('aria-busy', 'false'); panel.dataset.completed = '1';
      if (button.hasAttribute('data-answer-skip')) { panel.querySelector('.rd-answer-status').textContent = '기존 본문을 이어 읽습니다. 필요할 때 돌아와 선택할 수 있습니다.'; button.textContent = '이어 읽기'; }
      if (o.onMeasure) o.onMeasure(); if (o.onContinue) o.onContinue();
    }
    return true;
  }
  R.ReadingAnswer = { TOPICS: TOPICS, KEYS: KEYS, card: card, payload: payload, render: render, validResult: validResult, ask: ask, handleClick: handleClick };
})(typeof window !== 'undefined' ? window : globalThis);