/* 타로 배열 풀이 — 카드가 놓인 자리(원 카드 / 과거·현재·미래 / 상황·장애물·조언·결과)에 맞춰 읽는 방식을 바꾸고, 카드들을 하나의 이야기로 잇는다.
   무료 타로(/report/hub/)와 만세력 타로(/)가 같이 쓴다. 화면 모양은 각자 그리고, 이 파일은 문장과 구성(데이터)만 만든다.
   카드 한 장의 뜻은 FreeCore.composeTarot(카드·방향·분야 문장 조합, 관리자 수정 문구 반영)에서 가져오고, 여기서는 자리에 맞게 고르고 배치할 뿐이다. 생성형 AI 는 쓰지 않는다. */
(function (root) {
  'use strict';
  var EL_K = ['목', '화', '토', '금', '수'], SUIT_EL = { W: 1, C: 4, S: 3, P: 2 }; // 완드=화 · 컵=수 · 소드=금 · 펜타클=토 (메이저는 오행과 무관)
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var nameOf = function (r) { return r.card.nameKo || r.card.name; };

  // parts: [종류, 이 자리에서 붙일 이름]. 종류: sum 요약 · det 해석 · flow 지금의 흐름 · opp 기회 · caut 조심할 점 · act 행동 · act2 행동 2가지 · cls 마무리
  var POS = {
    msg: { lens: '이 질문에 대한 카드의 답', lead: function (kw) { return '이 질문에 카드가 주는 답은 "' + kw + '"입니다.'; }, parts: [['sum', ''], ['det', ''], ['flow', '지금의 흐름'], ['opp', '기회'], ['caut', '조심할 점'], ['act', '이렇게 해보세요'], ['cls', '']] },
    past: { lens: '이 일의 뿌리 — 지금까지 남은 영향', lead: function (kw) { return '지금 상황의 뿌리에는 "' + kw + '"의 흐름이 있었습니다.'; }, parts: [['sum', ''], ['caut', '지금까지 남은 영향'], ['cls', '여기서 배울 점']] },
    now: { lens: '지금 놓인 상태', lead: function (kw) { return '지금은 "' + kw + '"의 한가운데에 있습니다.'; }, parts: [['sum', ''], ['flow', '지금의 흐름'], ['opp', '기회'], ['caut', '조심할 점']] },
    fut: { lens: '이대로 가면 향하는 곳 (바꿀 수 있는 부분 포함)', lead: function (kw) { return '이 흐름대로 가면 "' + kw + '" 쪽으로 향합니다.'; }, parts: [['sum', ''], ['opp', '열려 있는 길'], ['act', '미래를 내 쪽으로 당기려면'], ['cls', '']] },
    sit: { lens: '지금 놓인 판 전체', lead: function (kw) { return '지금 판 전체의 분위기는 "' + kw + '"입니다.'; }, parts: [['sum', ''], ['det', ''], ['flow', '지금의 흐름']] },
    obs: { lens: '앞을 가로막는 것 — 넘어야 할 숙제', lead: function (kw, rev) { return '앞을 가로막는 것은 "' + kw + '"입니다. ' + (rev ? '역방향이라 걸림돌이 바깥보다 마음·습관 같은 안쪽에 있습니다.' : '정방향이라 걸림돌이 바깥 상황이나 사람에게서 옵니다.'); }, parts: [['caut', '넘어야 할 숙제'], ['act2', '넘는 방법']] },
    adv: { lens: '해 볼 것 — 카드의 조언', lead: function (kw) { return '카드의 조언은 "' + kw + '"을 기억하며 움직이라는 것입니다.'; }, parts: [['act', '이렇게 해보세요'], ['opp', '이렇게 하면 열리는 길'], ['cls', '']] },
    res: { lens: '이대로 가면 맞이할 결말', lead: function (kw) { return '이 흐름의 끝에는 "' + kw + '"이 기다립니다.'; }, parts: [['sum', ''], ['opp', '결말을 살리는 것'], ['caut', '결말을 해치는 것'], ['cls', '']] },
  };

  // 같은 풀이 안에서 이미 나온 문장은 다시 쓰지 않는다: 시드를 바꿔 가며 겹침이 가장 적은 조합을 고른다
  function compose(FC, Tarot, r, mode, seedBase, used, ov) {
    var best = null, bestHit = 1e9, i, texts;
    for (i = 0; i < 8; i++) {
      var fx = null; try { fx = FC.composeTarot(Tarot, r.card.id, r.rev, mode, seedBase + r.k + r.card.id + (i ? '#' + i : ''), ov); } catch (e) { return null; }
      if (!fx) return null;
      texts = [fx.headline, fx.summary].concat(fx.detail, [fx.currentFlow, fx.opportunity, fx.caution], fx.actions, [fx.closing]);
      var hit = texts.filter(function (t) { return used[t]; }).length;
      if (hit < bestHit) { best = fx; bestHit = hit; if (!hit) break; }
    }
    [best.headline, best.summary].concat(best.detail, [best.currentFlow, best.opportunity, best.caution], best.actions, [best.closing]).forEach(function (t) { used[t] = 1; });
    return best;
  }

  /* rows: [{k, card, rev, sc, kw, label?}] (자리 키 k: msg/past/now/fut/sit/obs/adv/res)
     o: { FC, Tarot, mode, spread, seed, ov, plain } — plain: 하루짜리 문구('오늘')를 '지금'으로 바꿀지(만세력)
     반환: [{ row, lens, lead, headline, blocks: [{t:'p',text} | {t:'cells',items:[{label,text}]} | {t:'acts',label,items:[]} | {t:'note',label,text}] }] — fx 가 없으면 blocks 는 비어 있다 */
  function readings(rows, o) {
    var used = {}, tw = function (t) { return o.plain ? String(t).replace(/오늘 하루/g, '요즘').replace(/오늘은/g, '지금은').replace(/오늘/g, '지금') : t; };
    return rows.map(function (r) {
      var P = POS[r.k] || POS.msg, lead = P.lead(r.kw, r.rev), fx = o.FC ? compose(o.FC, o.Tarot, r, o.mode, String(o.seed || '') + String(o.spread || ''), used, o.ov) : null;
      var res = { row: r, lens: P.lens, lead: lead, headline: fx ? tw(fx.headline) : '', blocks: [] };
      if (!fx) return res;
      var cells = [], flush = function () { if (cells.length) { res.blocks.push({ t: 'cells', items: cells }); cells = []; } };
      P.parts.forEach(function (pt) {
        var kind = pt[0], label = pt[1];
        if (kind === 'sum') res.blocks.push({ t: 'p', text: tw(fx.summary) });
        else if (kind === 'det') fx.detail.forEach(function (x) { res.blocks.push({ t: 'p', text: tw(x) }); });
        else if (kind === 'flow') cells.push({ label: label, text: tw(fx.currentFlow) });
        else if (kind === 'opp') cells.push({ label: label, text: tw(fx.opportunity) });
        else if (kind === 'caut') cells.push({ label: label, text: tw(fx.caution) });
        else if (kind === 'act' || kind === 'act2') { flush(); res.blocks.push({ t: 'acts', label: label, items: (kind === 'act2' ? fx.actions.slice(0, 2) : fx.actions).map(tw) }); }
        else if (kind === 'cls') { flush(); res.blocks.push({ t: 'note', label: label, text: tw(fx.closing) }); }
      });
      flush();
      return res;
    });
  }

  // 카드들을 하나의 이야기로 잇는다: 점수 흐름(좋아지는지·식는지)과 카드 오행의 상생·상극을 문장으로 풀어 준다. 반환: HTML 문자열(<b> 만 사용, 나머지는 이스케이프)
  function story(rows, spread, topicName) {
    var by = {}; rows.forEach(function (r) { by[r.k] = r; });
    var nm = function (r) { return '<b>' + esc(nameOf(r)) + (r.rev ? '(역)' : '') + '</b>'; }, kw = function (r) { return '"' + esc(r.kw) + '"'; }, ck = function (r) { return nm(r) + ' ' + kw(r); };
    var step = function (x, y) { return y.sc - x.sc >= 0.5 ? '막혀 있던 흐름이 풀려 가는' : x.sc - y.sc >= 0.5 ? '기세가 가라앉는' : '비슷한 결이 이어지는'; };
    var tone = function (r) { return r.sc > 0.4 ? '밝은' : r.sc < -0.4 ? '조심스러운' : '조율이 필요한'; };
    var elOf = function (r) { return SUIT_EL[r.card.suit]; }, sameSuit = function (x, y) { return x.card.suit !== 'M' && x.card.suit === y.card.suit; };
    var t = '';
    if (spread === 'one' || rows.length === 1) {
      t = esc(topicName) + ' 질문에 대한 카드의 답은 ' + ck(rows[0]) + '입니다. 전체 분위기는 ' + tone(rows[0]) + ' 쪽이고, 아래 풀이의 결론 → 이유 → 행동 순서로 읽으면 됩니다.';
    } else if (by.past && by.now && by.fut) {
      var s1 = step(by.past, by.now), s2 = step(by.now, by.fut);
      t = '과거 ' + ck(by.past) + ' → 현재 ' + ck(by.now) + ' → 미래 ' + ck(by.fut) + '로 이어지는 이야기입니다. '
        + (s1 === s2 ? '과거에서 미래까지 내내 <b>' + s1 + '</b> 흐름입니다. ' : '과거에서 현재로는 <b>' + s1 + '</b> 흐름이고, 현재에서 미래로는 <b>' + s2 + '</b> 흐름입니다. ')
        + (sameSuit(by.past, by.now) && sameSuit(by.now, by.fut) ? '세 장이 같은 기운이라 한 가지 주제가 계속 반복되고 있습니다. ' : sameSuit(by.past, by.now) || sameSuit(by.now, by.fut) ? '이웃한 카드가 같은 기운이라 이야기가 끊기지 않고 이어집니다. ' : '')
        + (by.fut.sc > by.now.sc + 0.4 ? '지금이 가장 어려운 고비이고 이후로 나아집니다.' : by.fut.sc < by.now.sc - 0.4 ? '지금의 기세를 살려 두지 않으면 식을 수 있으니 미리 방향을 잡아 두세요.' : '큰 반전보다는 지금의 방식을 꾸준히 이어 가는 쪽이 맞습니다.');
    } else if (by.sit && by.obs && by.adv && by.res) {
      var a = elOf(by.adv), o = elOf(by.obs), rel = a != null && o != null ? ((o - a) % 5 + 5) % 5 : -1;
      var pair = rel === 2 ? '조언 카드의 ' + EL_K[a] + ' 기운이 장애물의 ' + EL_K[o] + ' 기운을 눌러 줘서, 조언을 따르면 실제로 막힌 곳이 풀립니다.'
        : rel === 4 ? '장애물의 ' + EL_K[o] + ' 기운이 조언의 ' + EL_K[a] + ' 기운을 돕는 조합이라, 걸림돌이 오히려 해법의 재료가 됩니다.'
        : rel === 3 ? '장애물의 ' + EL_K[o] + ' 기운이 조언의 ' + EL_K[a] + ' 기운을 누르는 조합이라, 조언을 실천하는 데 평소보다 힘이 듭니다.'
        : by.adv.sc >= by.obs.sc ? '조언 카드가 장애물보다 힘이 세서 충분히 풀 수 있는 숙제입니다.' : '장애물의 힘이 더 커서 조언을 한 번이 아니라 꾸준히 지켜야 합니다.';
      t = '상황은 ' + ck(by.sit) + ', 앞을 가로막는 것은 ' + ck(by.obs) + ', 카드의 조언은 ' + ck(by.adv) + ', 이대로 가면 맞이할 결말은 ' + ck(by.res) + '입니다. ' + pair + ' '
        + (by.res.sc > 0.4 ? '결말은 밝은 쪽입니다.' : by.res.sc < -0.4 ? '결말이 무거운 쪽이라 조언을 미루지 않는 것이 중요합니다.' : '결말은 내가 어떻게 움직이느냐에 따라 달라지는 열린 상태입니다.');
    }
    return t;
  }

  root.TarotRead = { POS: POS, SUIT_EL: SUIT_EL, readings: readings, story: story, esc: esc };
})(typeof window !== 'undefined' ? window : globalThis);
