/* 2026-11-09 구성 다양화 4단계 — 시기 장과 남은 심화 장(fate-blocks.js 에 등록).
   fx:years 움직일 해·기다릴 해 · fx:actcal 기회의 해 준비 달력 · fx:cross 교운기 알림 · fx:meter(bowl) 재물 그릇 사양 · fx:profile(parent) 부모가 된 나.
   해마다의 판단: 그해 천간·지지의 오행이 내 용신·희신이면 순풍, 기신·구신이면 맞바람(천간 ×2 + 지지 ×1). 계산은 바꾸지 않는다. */
(function (root) {
  'use strict';
  var R = root.ReportV2 = root.ReportV2 || {}, FB = R.FateBlocks; if (!FB || !FB.add) return;
  var esc = FB.esc, jo = FB.jo, who = FB.who, EL_HJ = FB.EL_HJ, ACT = FB.ACT;
  var HZ = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  var STEM = '갑을병정무기경신임계', BR = '자축인묘진사오미신유술해', STEM_EL = '목목화화토토금금수수', BR_EL = '수토목목토화화토금금토수';
  var ROLE_V = { 용신: 2, 희신: 1, 한신: 0, 구신: -1, 기신: -2 };
  function head(kick, title, lead) { return '<p class="fx-kick">' + esc(kick) + '</p><h3 class="fx-title">' + esc(title) + '</h3>' + (lead ? '<p class="fx-lead">' + esc(lead) + '</p>' : ''); }
  function years(H, n) {
    var sd = H.sd, roles = (sd.usefulElements && sd.usefulElements.roles) || {}, now = sd.nowYear || new Date().getFullYear(), out = [];
    for (var y = now; y < now + (n || 10); y++) {
      var si = ((y - 4) % 10 + 10) % 10, bi = ((y - 4) % 12 + 12) % 12, se = STEM_EL.charAt(si), be = BR_EL.charAt(bi);
      var s = (ROLE_V[roles[se]] || 0) * 2 + (ROLE_V[roles[be]] || 0);
      out.push({ y: y, gz: STEM.charAt(si) + BR.charAt(bi), se: se, be: be, s: s, sr: roles[se] || '한신', br: roles[be] || '한신' });
    }
    return out;
  }
  var tone = function (s) { return s >= 3 ? 'good' : s <= -2 ? 'bad' : 'mid'; };
  var TOPIC = {
    wealth: { word: '재물', go: '수입 통로를 늘리고 큰 결정을 내리기 좋은 해', wait: '지출을 줄이고 계약·투자를 미루는 게 나은 해', before: '빚과 고정비를 정리하고 종잣돈을 따로 모아 두기', on: '미뤄 둔 투자·사업·이직 같은 큰 결정을 실행하기', after: '번 것을 묶어 두고 새는 곳을 다시 점검하기' },
    career: { word: '일', go: '이직·독립·승진 같은 움직임을 걸어 볼 해', wait: '자리를 지키며 실력과 이력을 쌓는 게 나은 해', before: '이력과 포트폴리오를 정리하고 사람을 만나 두기', on: '옮기거나 독립하는 결정을 실행하기', after: '새 자리에서 기준을 세우고 성과 하나를 만들기' },
    love: { word: '인연', go: '만남을 넓히고 관계를 한 단계 올리기 좋은 해', wait: '관계를 다지고 큰 약속은 서두르지 않는 게 나은 해', before: '나에게 맞는 사람의 조건을 정리하고 생활을 가다듬기', on: '진지한 대화와 약속(결혼·동거 이야기)을 꺼내기', after: '함께 사는 규칙과 돈 기준을 같이 정하기' }
  };
  var roleTxt = function (r) { return r === '용신' ? '나를 채워 주는 기운' : r === '희신' ? '나를 돕는 기운' : r === '기신' ? '부딪히는 기운' : r === '구신' ? '부담이 되는 기운' : '중간 기운'; };

  /* ── 움직일 해 · 기다릴 해 ── */
  FB.add('fx:years', function (H, part) {
    var t = TOPIC[part.topic] || TOPIC.wealth, ys = years(H, 10), go = ys.filter(function (x) { return x.s >= 2; }).sort(function (a, b) { return b.s - a.s || a.y - b.y; }).slice(0, 3), wait = ys.filter(function (x) { return x.s <= -2; }).sort(function (a, b) { return a.s - b.s || a.y - b.y; }).slice(0, 3);
    var chip = '<div class="fx-yr">' + ys.map(function (x) { return '<span class="is-' + tone(x.s) + '"><b>' + x.y + '</b><small>' + esc(x.gz) + '</small></span>'; }).join('') + '</div>';
    var list = function (arr, good) { return arr.length ? arr.map(function (x) { return '<li><b>' + x.y + '년 ' + esc(x.gz) + '</b><small>' + esc('천간 ' + x.se + ' · ' + roleTxt(x.sr) + ' / 지지 ' + x.be + ' · ' + roleTxt(x.br)) + '</small></li>'; }).join('') : '<li>' + (good ? '앞으로 10년 안에 뚜렷한 순풍 해는 없어요. 해마다 조금씩 쌓는 쪽이 맞아요.' : '앞으로 10년 안에 크게 막히는 해는 없어요.') + '</li>'; };
    return '<section class="dp-embed dp fx">' + head('命簿 · 해마다의 바람', '앞으로 10년, 움직일 해와 기다릴 해', '그해 들어오는 천간·지지 오행이 내 사주에 필요한 기운인지로 나눴어요. 밝은 칸은 순풍, 붉은 칸은 맞바람이에요.') + chip +
      '<div class="fx-two"><div class="fx-side fx-best"><p class="fx-sk">動 · 움직일 해</p><p class="fx-note">' + esc(t.go) + '</p><ul class="fx-ul">' + list(go, true) + '</ul></div><div class="fx-side fx-worst"><p class="fx-sk">靜 · 기다릴 해</p><p class="fx-note">' + esc(t.wait) + '</p><ul class="fx-ul">' + list(wait, false) + '</ul></div></div></section>';
  });

  /* ── 기회의 해 준비 달력 ── */
  FB.add('fx:actcal', function (H, part) {
    var t = TOPIC[part.topic] || TOPIC.wealth, ys = years(H, 10), best = ys.slice(1).sort(function (a, b) { return b.s - a.s || a.y - b.y; })[0] || ys[0];
    var cells = [[best.y - 1, '準 · 준비하는 해', t.before], [best.y, '行 · 실행하는 해', t.on], [best.y + 1, '守 · 지키는 해', t.after]];
    return '<section class="dp-embed dp fx">' + head('命簿 · 준비 달력', t.word + ' 기회의 해, 세 해로 준비하기', '앞으로 10년 중 ' + best.y + '년(' + best.gz + ')이 ' + t.word + ' 쪽 바람이 가장 좋아요. 기회는 그해 하루에 오지 않으니, 앞뒤 해까지 묶어 준비해요.') +
      '<ol class="fx-steps">' + cells.map(function (c) { return '<li><small>' + esc(c[0] + '년 · ' + c[1]) + '</small><p>' + esc(c[2]) + '</p></li>'; }).join('') + '</ol>' +
      '<p class="fx-rx-f">' + esc('근거 — ' + best.y + '년은 천간 ' + best.se + '(' + roleTxt(best.sr) + '), 지지 ' + best.be + '(' + roleTxt(best.br) + ')가 들어오는 해예요.') + '</p></section>';
  });

  /* ── 교운기 알림 ── */
  var STEM_EL_K = { 갑: '목', 을: '목', 병: '화', 정: '화', 무: '토', 기: '토', 경: '금', 신: '금', 임: '수', 계: '수' };
  var CROSS = {
    wealth: { up: ['바뀌기 전에 종잣돈을 모아 두세요.', '바뀐 뒤에는 수입 통로를 하나씩 늘려 가세요.'], down: ['바뀌기 전에 큰 투자는 정리해 두세요.', '바뀐 뒤 1~2년은 지출 상한선을 낮게 잡으세요.'] },
    career: { up: ['바뀌기 전에 이력과 사람을 정리해 두세요.', '바뀐 뒤에는 새 역할을 적극적으로 맡아 보세요.'], down: ['바뀌기 전에 자리를 단단히 굳혀 두세요.', '바뀐 뒤 1~2년은 큰 이동보다 실력 쌓기가 먼저예요.'] },
    love: { up: ['바뀌기 전에 생활을 가다듬고 만남의 자리를 넓혀 두세요.', '바뀐 뒤에는 관계를 한 단계 올리는 대화를 꺼내 보세요.'], down: ['바뀌기 전에 서운한 일은 미리 풀어 두세요.', '바뀐 뒤 1~2년은 큰 약속보다 관계를 다지는 데 힘을 쓰세요.'] }
  };
  FB.add('fx:cross', function (H, part) {
    var sd = H.sd, dw = sd.daewoon || [], now = sd.nowYear || new Date().getFullYear(), roles = (sd.usefulElements && sd.usefulElements.roles) || {};
    var cur = sd.currentDaewoon || dw.filter(function (x) { return x.startYear <= now && now <= x.endYear; })[0], next = (cur && dw[dw.indexOf(cur) + 1]) || dw.filter(function (x) { return x.startYear > now; })[0];
    if (!cur || !next) return null;
    var ce = STEM_EL_K[String(cur.ganzhi).charAt(0)], ne = STEM_EL_K[String(next.ganzhi).charAt(0)], cv = ROLE_V[roles[ce]] || 0, nv = ROLE_V[roles[ne]] || 0, up = nv >= cv, left = Math.max(0, next.startYear - now), c = CROSS[part.topic] || CROSS.wealth;
    return '<section class="dp-embed dp fx">' + head('命簿 · 교운기 알림', '다음 대운이 바뀌는 때', '') +
      '<div class="fx-cross"><div><small>지금</small><b>' + esc(cur.ganzhi) + ' 대운</b><span>' + esc(cur.startYear + '~' + cur.endYear + '년 · ' + ce + '(' + EL_HJ[ce] + ') ' + roleTxt(roles[ce])) + '</span></div><i aria-hidden="true">→</i><div><small>' + esc(next.startYear + '년부터') + '</small><b>' + esc(next.ganzhi) + ' 대운</b><span>' + esc(ne + '(' + EL_HJ[ne] + ') ' + roleTxt(roles[ne])) + '</span></div><p class="fx-left"><strong>' + left + '</strong>년 남음</p></div>' +
      '<p class="fx-lead">' + esc(up ? (nv < 0 ? '맞바람이 조금 누그러지는 쪽으로 바뀌어요. 지금 버틴 만큼 다음 10년이 수월해져요.' : nv > cv ? '바람이 나아지는 쪽으로 바뀌어요. 지금은 다음 10년을 위해 준비할 때예요.' : '지금과 비슷한 바람이 이어져요. 하던 방식을 지키며 조금씩 넓히세요.') : (cv > 0 && nv >= 0 ? '순풍이 조금 약해지는 쪽으로 바뀌어요. 지금 흐름이 좋을 때 단단히 다져 두세요.' : '바람이 거세지는 쪽으로 바뀌어요. 지금 흐름이 좋을 때 단단히 다져 두세요.')) + '</p>' +
      '<ul class="fx-check">' + c[up ? 'up' : 'down'].map(function (x) { return '<li><label><input type="checkbox"><span>' + esc(x) + '</span></label></li>'; }).join('') + '</ul></section>';
  });
})(typeof window !== 'undefined' ? window : globalThis);
