/* 2026-11-09 구성 다양화 3단계 — 남은 단일 블록 장에 모양이 다른 블록을 더한다(fate-blocks.js 에 등록).
   fx:meter 기운 계기판 · fx:family 가족 자리도 · fx:env 빛나는 환경과 지치는 환경 · fx:pair 끌리는 사람과 맞는 사람
   그리고 fx:check · fx:vs · fx:profile 의 새 묶음(돈 새는 곳·돈 선택·결혼 갈등·생활 안전 / 모으기와 쓰기 / 배우자 성향·버는 방식·나라는 사람).
   값은 사주(십성 비중·신강약·용신/기신·네 기둥의 십성)에서 규칙으로 고른다. 계산은 바꾸지 않는다. */
(function (root) {
  'use strict';
  var R = root.ReportV2 = root.ReportV2 || {}, FB = R.FateBlocks; if (!FB || !FB.add) return;
  var esc = FB.esc, jo = FB.jo, who = FB.who, EL_HJ = FB.EL_HJ, GRP_MEAN = FB.GRP_MEAN, REM = FB.REM, ACT = FB.ACT;
  var HZ = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  function head(kick, title, lead) { return '<p class="fx-kick">' + esc(kick) + '</p><h3 class="fx-title">' + esc(title) + '</h3>' + (lead ? '<p class="fx-lead">' + esc(lead) + '</p>' : ''); }
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  /* ── 기운 계기판: 십성 다섯 무리를 주제의 말로 바꿔 막대로 ── */
  var METER = {
    wealth: { title: '내 재물 계기판', lead: '돈과 관련된 다섯 가지 힘이 내 사주에 얼마나 있는지 보여 줘요. 길수록 많이 가진 힘이에요.', names: { 비겁: ['경쟁·지출 압력', '돈을 같이 쓰고 나누는 힘'], 식상: ['버는 통로', '재능을 돈으로 바꾸는 힘'], 재성: ['재물 자체', '돈을 알아보고 쥐는 힘'], 관성: ['지키는 힘', '규칙으로 돈을 묶어 두는 힘'], 인성: ['받는 복', '문서·자격·도움으로 들어오는 힘'] } },
    career: { title: '내 일하는 힘 계기판', lead: '일할 때 쓰는 다섯 가지 힘이 내 사주에 얼마나 있는지 보여 줘요. 길수록 타고난 힘이에요.', names: { 비겁: ['추진력', '혼자서도 밀고 나가는 힘'], 식상: ['실행·표현', '만들고 보여 주는 힘'], 재성: ['성과 감각', '결과와 숫자를 챙기는 힘'], 관성: ['조직력', '책임과 규칙 속에서 버티는 힘'], 인성: ['학습력', '배우고 정리하는 힘'] } }
  };
  FB.add('fx:meter', function (H, part) {
    var sd = H.sd, g = sd.groups || {}, m = METER[part.set] || METER.wealth, keys = ['비겁', '식상', '재성', '관성', '인성'], max = Math.max.apply(null, keys.map(function (k) { return +g[k] || 0; })) || 1;
    var top = keys.slice().sort(function (a, b) { return (g[b] || 0) - (g[a] || 0); }), hi = top[0], lo = top[4];
    var rows = keys.map(function (k) { var v = Math.round(+g[k] || 0); return '<div class="fx-mt' + (k === hi ? ' is-hi' : k === lo ? ' is-lo' : '') + '"><span><b>' + esc(m.names[k][0]) + '</b><small>' + esc(k + ' · ' + m.names[k][1]) + '</small></span><i><em style="width:' + clamp(Math.round(v / max * 100), 3, 100) + '%"></em></i><strong>' + v + '%</strong></div>'; }).join('');
    return '<section class="dp-embed dp fx">' + head('命簿 · 계기판', m.title, m.lead) + '<div class="fx-meter">' + rows + '</div><p class="fx-rx-f">' + esc('가장 센 힘은 ' + m.names[hi][0] + '(' + hi + '), 가장 약한 힘은 ' + m.names[lo][0] + '(' + lo + ')예요. 약한 쪽은 사람·도구·습관으로 빌려 쓰면 돼요.') + '</p></section>';
  });

  /* ── 가족 자리도: 네 기둥이 가리키는 가족 자리와 그 자리의 십성 ── */
  var SEAT = [['year', '연주', '조상·윗대', '집안의 뿌리와 어릴 적 분위기'], ['month', '월주', '부모·형제', '자라면서 가장 많이 부딪히고 배운 관계'], ['day', '일지', '배우자', '가장 가까이 사는 사람과의 거리'], ['hour', '시주', '자녀·아랫사람', '내가 돌보고 이어 줄 관계']];
  var TG_FAM = { 비견: '나와 닮아 동등하게 지내지만 고집이 부딪히는 자리', 겁재: '정은 깊은데 경쟁과 돈 문제가 얽히기 쉬운 자리', 식신: '편하게 챙겨 주고 먹이고 돌보는 자리', 상관: '말이 잘 통하지만 말 때문에 상처도 주고받는 자리', 편재: '넓게 베풀지만 기대와 씀씀이가 커지는 자리', 정재: '살림과 책임을 차곡차곡 나누는 자리', 편관: '엄하고 무거워 긴장이 있지만 나를 단련시키는 자리', 정관: '기준과 예의가 분명해 서로 지키는 게 많은 자리', 편인: '마음은 깊은데 표현이 적어 거리가 생기기 쉬운 자리', 정인: '나를 품고 도와주는 든든한 자리' };
  FB.add('fx:family', function (H) {
    var sd = H.sd, P = sd.pillars || {};
    var rows = SEAT.map(function (s, i) { var p = P[s[0]], tg = p ? (s[0] === 'day' ? p.branchTG : (p.stemTG || p.branchTG)) : ''; return '<li><i>' + HZ[i] + '</i><b>' + esc(s[1] + ' · ' + s[2]) + '</b><span>' + esc(p ? (TG_FAM[tg] || '뚜렷한 쏠림 없이 무난한 자리') : '태어난 시각을 몰라 이 자리는 비워 둬요') + '</span><em>' + esc(p ? (p.hanja || '') + ' · ' + (tg || '-') + ' — ' + s[3] : s[3]) + '</em></li>'; }).join('');
    return '<section class="dp-embed dp fx">' + head('命簿 · 가족 자리도', '내 사주 속 가족의 자리', '네 기둥은 각각 가족의 자리를 가리켜요. 그 자리에 앉은 기운(십성)으로 관계의 분위기를 읽어요. 실제 가족 한 사람 한 사람을 단정하는 건 아니에요.') + '<ul class="fx-list">' + rows + '</ul></section>';
  });

  /* ── 빛나는 환경과 지치는 환경 ── */
  var ENV = { 목: ['배우고 성장할 거리가 계속 생기는 곳', '아침 일찍 시작하고 기획부터 하는 팀'], 화: ['성과가 바로 드러나고 칭찬이 오가는 곳', '사람을 자주 만나고 발표가 많은 팀'], 토: ['오래 다니며 신뢰를 쌓는 안정된 곳', '역할이 분명하고 일정이 꾸준한 팀'], 금: ['기준과 평가가 분명한 곳', '군더더기 없이 결과로 말하는 팀'], 수: ['정보가 빨리 돌고 이동이 잦은 곳', '자율이 크고 유연하게 일하는 팀'] };
  FB.add('fx:env', function (H) {
    var b = FB.base(H), col = function (good) { var el = good ? b.yong : b.gi, e = ENV[el] || ENV.토; return '<div class="fx-side fx-' + (good ? 'best' : 'worst') + '"><p class="fx-sk">' + (good ? '光 · 빛나는 환경' : '疲 · 지치는 환경') + '</p><ul class="fx-ul"><li>' + esc(e[0]) + '</li><li>' + esc(e[1]) + '</li><li>' + esc((REM[el] || REM.토).place.split('·')[0] + ' 같은 분위기') + '</li></ul><p class="fx-note">' + esc((good ? '용신 ' : '기신 ') + el + '(' + EL_HJ[el] + ') 기운이 도는 환경이에요.') + '</p></div>'; };
    return '<section class="dp-embed dp fx">' + head('命簿 · 터 고르기', '빛나는 환경과 지치는 환경', '같은 일이라도 어떤 분위기의 자리에서 하느냐에 따라 성과가 달라져요.') + '<div class="fx-two">' + col(true) + col(false) + '</div></section>';
  });

  /* ── 끌리는 사람과 실제 맞는 사람 ── */
  var PULL = { 비겁: '나처럼 자기주장이 강하고 당당한 사람', 식상: '재치 있고 말이 잘 통하는 사람', 재성: '현실 감각 있고 능력 있어 보이는 사람', 관성: '듬직하고 기준이 분명한 사람', 인성: '다정하고 나를 이해해 줄 것 같은 사람' };
  var PEL = { 목: '함께 배우고 새 계획을 세우는', 화: '표현이 풍부하고 밝은', 토: '말보다 행동으로 곁을 지키는', 금: '약속과 선을 분명히 지키는', 수: '눈치 빠르고 마음을 먼저 읽는' };
  FB.add('fx:pair', function (H) {
    var sd = H.sd, b = FB.base(H), pull = PULL[sd.dominantGroup] || PULL.비겁;
    return '<section class="dp-embed dp fx">' + head('命簿 · 끌림과 맞음', '끌리는 사람과 실제 잘 맞는 사람', '끌림은 내가 이미 많이 가진 기운에서, 맞음은 내게 필요한 기운에서 와요. 둘이 다를 때가 많아요.') +
      '<div class="fx-two"><div class="fx-side fx-worst"><p class="fx-sk">引 · 자꾸 끌리는 사람</p><h4>' + esc(pull) + '</h4><p class="fx-note">' + esc('가장 큰 기운 ' + sd.dominantGroup + '(' + (GRP_MEAN[sd.dominantGroup] || '') + ')' + jo(GRP_MEAN[sd.dominantGroup] || '기운', '이', '가').slice(-1) + ' 익숙한 결을 찾아요. 처음엔 편하지만 같은 숙제가 겹치기 쉬워요.') + '</p></div>' +
      '<div class="fx-side fx-best"><p class="fx-sk">合 · 실제 잘 맞는 사람</p><h4>' + esc(PEL[b.yong] + ' 사람') + '</h4><p class="fx-note">' + esc('내 사주가 가장 필요로 하는 기운 ' + b.yong + '(' + EL_HJ[b.yong] + ')' + jo(b.yong, '을', '를').slice(-1) + ' 가진 사람이에요. 처음엔 덜 끌려도 오래 갈수록 편해요.') + '</p></div></div></section>';
  });

})(typeof window !== 'undefined' ? window : globalThis);
