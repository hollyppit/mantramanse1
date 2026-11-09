/* 2026-11-09 구성 다양화 2단계 — 순위·순서 블록 하나뿐이던 장에 모양이 다른 블록을 더한다(fate-blocks.js 에 등록).
   fx:check 점검표 · fx:vs 저울(양자택일) · fx:profile 인물·재능 카드 · fx:likes 좋아하는 점·불편한 점 · fx:road 10년 로드맵.
   특징키는 reading-feature.js 와 같다: b:신강약 · t:가장 큰 십성군 · l:가장 작은 십성군 · e:일간 오행. 계산은 바꾸지 않는다. */
(function (root) {
  'use strict';
  var R = root.ReportV2 = root.ReportV2 || {}, FB = R.FateBlocks; if (!FB || !FB.add) return;
  var esc = FB.esc, jo = FB.jo, who = FB.who, EL_HJ = FB.EL_HJ, GRP_MEAN = FB.GRP_MEAN, REM = FB.REM, ACT = FB.ACT;
  var HZ = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  function feats(sd) { var f = {}, st = sd.dayMaster || {}; if (sd.strength && sd.strength.band) f['b:' + sd.strength.band] = 1; if (sd.dominantGroup) f['t:' + sd.dominantGroup] = 1; if (sd.weakestGroup) f['l:' + sd.weakestGroup] = 1; if (st.el) f['e:' + st.el] = 1; return f; }
  var KEY_TXT = function (k) { var p = k.split(':'), v = p[1]; return p[0] === 'b' ? (v === '신강' ? '기운이 센 사주(신강)' : v === '신약' ? '기운이 여린 사주(신약)' : '기운이 고른 사주(' + v + ')') : p[0] === 't' ? '가장 큰 기운이 ' + v + '(' + (GRP_MEAN[v] || '') + ')' : p[0] === 'l' ? '가장 작은 기운이 ' + v + '(' + (GRP_MEAN[v] || '') + ')' : '일간이 ' + v + '(' + EL_HJ[v] + ')'; };
  function head(kick, title, lead) { return '<p class="fx-kick">' + esc(kick) + '</p><h3 class="fx-title">' + esc(title) + '</h3>' + (lead ? '<p class="fx-lead">' + esc(lead) + '</p>' : ''); }

  /* ── 점검표 ── */
  var CHECK = {
    habit: { title: '성공을 막는 습관 점검표', items: [['일을 끝내기 전에 다음 일을 벌여요', ['t:식상', 'e:목']], ['도움을 청하지 않고 혼자 붙들어요', ['t:비겁', 'b:신강']], ['완벽해질 때까지 내놓지 않아요', ['t:인성', 't:관성']], ['눈앞의 수입에 맞춰 방향을 자주 바꿔요', ['t:재성', 'e:수']], ['윗사람 눈치에 내 의견을 삼켜요', ['b:신약', 'l:비겁']], ['피곤해도 쉬는 날을 미뤄요', ['b:신강', 'e:화']], ['결정을 끝까지 미뤄요', ['b:신약', 'l:관성']]] },
    loveErr: { title: '연애 실수 점검표', items: [['연락 속도로 마음을 재요', ['e:화', 't:식상']], ['서운함을 쌓아 뒀다가 한 번에 터뜨려요', ['t:비겁', 't:관성']], ['상대를 내 방식대로 바꾸려 해요', ['t:관성', 't:재성']], ['혼자 결론을 내리고 조용히 멀어져요', ['t:인성', 'e:수']], ['좋아하면 다 맞춰 주다가 지쳐요', ['b:신약', 'l:비겁']], ['마음보다 조건을 먼저 계산해요', ['t:재성', 'e:금']], ['처음엔 뜨겁다가 금방 식어요', ['e:목', 'b:신강']]] },
    org: { title: '조직에서 부딪히는 지점 점검표', items: [['규칙보다 내 방식이 먼저 나와요', ['t:비겁', 't:식상']], ['말이 앞서 윗사람과 부딪혀요', ['t:식상', 'e:화']], ['책임은 늘고 권한은 없다고 느껴요', ['t:관성', 'b:신약']], ['동료와 성과 경쟁에 지쳐요', ['t:비겁', 'b:신강']], ['변화 없는 반복에 답답해져요', ['e:목', 'l:인성']], ['보고와 절차를 자꾸 미뤄요', ['e:수', 'l:관성']]] },
    biz: { title: '창업 전 점검표', items: [['시장 반응보다 내 확신을 먼저 믿어요', ['t:비겁', 'b:신강']], ['고정비를 처음부터 크게 잡아요', ['t:재성', 'e:화']], ['동업 조건을 말로만 정해요', ['t:비겁', 'l:관성']], ['아이템을 자꾸 바꿔요', ['t:식상', 'e:목']], ['돈 관리를 남에게 맡겨요', ['l:재성', 't:인성']], ['계약·규정 확인을 뒤로 미뤄요', ['l:관성', 'e:수']]] },
    moneyPpl: { title: '사람 때문에 돈 새는 지점 점검표', items: [['부탁을 거절하지 못해요', ['b:신약', 't:인성']], ['친한 사이라 차용증을 안 써요', ['t:비겁', 'e:토']], ['좋은 사람이라는 말에 보증을 서요', ['t:인성', 'l:재성']], ['모임 비용을 늘 내가 내요', ['t:비겁', 'e:화']], ['수익 약속에 쉽게 끌려요', ['t:재성', 'e:수']], ['가족 일에 돈부터 꺼내요', ['t:인성', 't:관성']]] }
  };
  var STOP = { 목: '시작하기 전에 "끝낼 날짜"부터 적으세요.', 화: '보내기 전에 하룻밤만 묵혀 두세요.', 토: '한 달에 한 번, 하던 방식을 하나만 바꿔 보세요.', 금: '자르기 전에 상대 이야기를 끝까지 한 번 들으세요.', 수: '움직이기 전에 머물 곳 하나를 먼저 정하세요.' };
  FB.add('fx:check', function (H, part) {
    var c = CHECK[part.set] || CHECK.habit, f = feats(H.sd), b = FB.base(H);
    var rows = c.items.map(function (it, i) { var hit = it[1].filter(function (k) { return f[k]; }); return { t: it[0], hit: hit, s: hit.length * 10 - i * 0.1 }; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 5);
    return '<section class="dp-embed dp fx">' + head('命簿 · 점검표', c.title, '해당하는 칸에 체크해 보세요. 위쪽일수록 ' + who(H) + '의 사주에서 나오기 쉬운 순서예요.') +
      '<ul class="fx-check">' + rows.map(function (r, i) { return '<li' + (r.hit.length ? ' class="is-hot"' : '') + '><label><input type="checkbox"><span>' + esc(r.t) + '</span></label>' + (r.hit.length ? '<small>' + esc(r.hit.map(KEY_TXT).join(' · ')) + (i < 2 ? ' · 가능성 높음' : '') + '</small>' : '') + '</li>'; }).join('') + '</ul>' +
      '<p class="fx-rx-f">' + esc('멈추는 한 문장 — ' + (STOP[b.yong] || STOP.토)) + '</p></section>';
  });

  /* ── 저울(양자택일) ── */
  var VS = {
    job: { title: '직장형과 사업형 사이, 내 저울', a: '직장형', b: '사업형', A: [['t:관성', 12], ['t:인성', 8], ['b:신약', 10], ['e:토', 4], ['e:금', 4]], B: [['t:비겁', 10], ['t:재성', 10], ['t:식상', 8], ['b:신강', 10], ['e:목', 4], ['e:화', 4]], mix: { a: '조직 안에서 맡은 일을 내 사업처럼 키워 보세요. 사내 신규 프로젝트가 잘 맞아요.', b: '혼자 시작하되 회계·계약은 처음부터 전문가에게 맡기세요.' } },
    lead: { title: '리더형과 전문가형 사이, 내 저울', a: '리더형', b: '전문가형', A: [['t:비겁', 10], ['t:관성', 10], ['b:신강', 10], ['e:화', 4], ['e:목', 4]], B: [['t:인성', 12], ['t:식상', 8], ['b:신약', 8], ['e:수', 4], ['e:금', 4]], mix: { a: '앞에 서되, 결정 전에 전문가 한 사람의 의견을 꼭 들으세요.', b: '한 분야를 깊게 파고, 작은 팀 하나를 이끄는 경험을 쌓아 보세요.' } },
    salary: { title: '월급형과 사업형 사이, 내 저울', a: '월급형', b: '사업형', A: [['t:관성', 12], ['t:인성', 8], ['b:신약', 10], ['e:토', 4], ['e:금', 4]], B: [['t:재성', 12], ['t:비겁', 8], ['t:식상', 8], ['b:신강', 10], ['e:화', 4]], mix: { a: '월급을 바탕으로 두고 작은 부업 하나로 사업 감각을 시험해 보세요.', b: '처음 1~2년 버틸 생활비를 따로 떼어 두고 시작하세요.' } },
    invest: { title: '안정 저축형과 공격 투자형 사이, 내 저울', a: '안정 저축형', b: '공격 투자형', A: [['t:인성', 10], ['t:관성', 10], ['b:신약', 10], ['e:토', 5], ['e:금', 4]], B: [['t:재성', 12], ['t:비겁', 8], ['t:식상', 6], ['b:신강', 10], ['e:화', 4], ['e:수', 4]], mix: { a: '저축이 기본이되, 여윳돈의 일부만 정해 두고 경험 삼아 투자해 보세요.', b: '투자 비율 상한선을 먼저 정하고, 손절 기준을 글로 적어 두세요.' } }
  };
  FB.add('fx:vs', function (H, part) {
    var v = VS[part.set] || VS.job, f = feats(H.sd), A = v.A.filter(function (x) { return f[x[0]]; }), B = v.B.filter(function (x) { return f[x[0]]; });
    var sa = A.reduce(function (s, x) { return s + x[1]; }, 0), sb = B.reduce(function (s, x) { return s + x[1]; }, 0), pos = Math.max(12, Math.min(88, Math.round(50 + (sb - sa) * 1.4)));
    var side = pos > 55 ? 'b' : pos < 45 ? 'a' : '', lean = (side ? (side === 'a' ? v.a : v.b) + ' 쪽으로 기울어요' : '두 쪽이 거의 반반이에요') + ' · ' + v.a + ' ' + (100 - pos) + ' : ' + pos + ' ' + v.b;
    var list = function (arr) { return arr.length ? arr.map(function (x) { return '<li>' + esc(KEY_TXT(x[0])) + '</li>'; }).join('') : '<li>뚜렷한 신호 없음</li>'; };
    return '<section class="dp-embed dp fx">' + head('命簿 · 저울', v.title, who(H) + '의 사주 신호를 양쪽 접시에 올려 봤어요.') +
      '<div class="fx-scale"><div class="fx-scale-l"><b>' + esc(v.a) + '</b><span>' + esc(v.b) + '</span></div><div class="fx-bar"><i style="left:' + pos + '%"></i></div><p class="fx-lean">' + esc(lean) + '</p></div>' +
      '<div class="fx-two"><div class="fx-side fx-best"><p class="fx-sk">' + esc(v.a + ' 쪽 신호') + '</p><ul class="fx-ul">' + list(A) + '</ul></div><div class="fx-side fx-worst"><p class="fx-sk">' + esc(v.b + ' 쪽 신호') + '</p><ul class="fx-ul">' + list(B) + '</ul></div></div>' +
      '<p class="fx-rx-f">' + esc('섞어 쓰는 법 — ' + (side === 'b' ? v.mix.b : v.mix.a)) + '</p></section>';
  });

  /* ── 인물·재능 카드 ── */
  var PROF = {
    relate: { kick: '命簿 · 관계 대장', title: '내가 관계를 맺는 방식', rows: [
      ['처음 다가가는 방식', 'e', { 목: '먼저 질문을 던지며 다가가요', 화: '웃음과 말로 먼저 분위기를 열어요', 토: '말없이 곁에 머물며 천천히 다가가요', 금: '예의와 선을 지키며 조심스럽게 다가가요', 수: '상대를 먼저 살피고 맞춰 가며 다가가요' }],
      ['가까워지는 속도', 'b', { 신강: '빠르게 가까워지고, 내가 관계를 이끌어요', 신약: '천천히 가까워지고, 믿음이 생긴 뒤에 마음을 열어요', 중화: '상대 속도에 맞춰 무리 없이 가까워져요' }],
      ['관계에서 맡는 역할', 't', { 비겁: '같이 버티는 동료 역할', 식상: '분위기를 띄우는 이야기꾼 역할', 재성: '현실적인 해결사 역할', 관성: '약속을 지키는 든든한 기둥 역할', 인성: '고민을 들어 주는 상담자 역할' }],
      ['관계가 오래 가는 조건', 'y', { 목: '함께 배우고 자라는 이야기가 있을 때', 화: '서로를 자주 칭찬하고 표현할 때', 토: '약속이 꾸준히 지켜질 때', 금: '서로의 선과 기준을 존중할 때', 수: '말하지 않아도 흐름을 알아줄 때' }],
      ['부딪히는 지점', 'g', { 목: '서로 자기 계획만 밀어붙일 때', 화: '감정이 먼저 터질 때', 토: '고집이 맞설 때', 금: '말이 너무 날카로울 때', 수: '속마음을 숨길 때' }]] },
    love: { kick: '命簿 · 연정 대장', title: '사랑할 때의 나', rows: [
      ['사랑 표현', 't', { 비겁: '곁에서 함께하는 시간으로 표현해요', 식상: '말과 선물로 아낌없이 표현해요', 재성: '실제로 챙겨 주는 행동으로 표현해요', 관성: '약속과 책임으로 표현해요', 인성: '마음을 헤아리는 배려로 표현해요' }],
      ['연락 스타일', 'e', { 목: '자주, 일상 이야기를 길게 나눠요', 화: '즉흥적으로, 감정이 오를 때 바로 연락해요', 토: '정해진 시간에 꾸준히 연락해요', 금: '짧고 분명하게, 필요한 말만 해요', 수: '상대 분위기를 보며 맞춰 연락해요' }],
      ['데이트 취향', 'e', { 목: '산책·전시처럼 걸으며 이야기하는 데이트', 화: '공연·축제처럼 들뜬 데이트', 토: '맛집·집 데이트처럼 편안한 데이트', 금: '계획대로 움직이는 깔끔한 데이트', 수: '여행·밤 드라이브처럼 흘러가는 데이트' }],
      ['불안해지는 순간', 'l', { 비겁: '내 편이 없다고 느낄 때', 식상: '마음을 말할 기회가 없을 때', 재성: '관계가 손해처럼 느껴질 때', 관성: '관계의 기준이 흐려질 때', 인성: '이해받지 못한다고 느낄 때' }],
      ['이별 앞에서', 'b', { 신강: '먼저 결론을 내고 정리해요', 신약: '오래 붙잡고 망설여요', 중화: '시간을 두고 차분히 정리해요' }]] },
    talent: { kick: '命簿 · 재주 대장', title: '돈이 되는 내 재능', rows: [
      ['재능의 이름', 't', { 비겁: '사람을 모으고 끌고 가는 힘', 식상: '만들고 표현하는 솜씨', 재성: '기회와 값을 알아보는 눈', 관성: '맡은 일을 끝까지 책임지는 힘', 인성: '배우고 정리해 전하는 머리' }],
      ['돈이 되는 자리', 't', { 비겁: '영업·모임 운영·팀 프로젝트', 식상: '콘텐츠·디자인·강의·요리', 재성: '거래·유통·재무·투자', 관성: '관리·공공·법무·품질', 인성: '교육·연구·상담·기획' }],
      ['재능을 키우는 법', 'y', { 목: '매일 조금씩 배우고 기록하기', 화: '만든 것을 자주 사람들 앞에 내놓기', 토: '한 분야에서 오래 신뢰 쌓기', 금: '기준을 세우고 군더더기 덜어내기', 수: '여러 정보를 모아 흐름 읽기' }],
      ['재능을 막는 습관', 'g', { 목: '벌이기만 하고 끝내지 않기', 화: '보여 주는 데만 힘쓰기', 토: '익숙한 데 머물기', 금: '완벽하지 않으면 내놓지 않기', 수: '이것저것 기웃거리기' }],
      ['재능이 피는 때', 'y', { 목: '아침', 화: '한낮', 토: '오후', 금: '저녁', 수: '밤' }]] }
  };
  FB.add('fx:profile', function (H, part) {
    var p = PROF[part.set] || PROF.relate, sd = H.sd, b = FB.base(H), band = sd.strength && sd.strength.band, bandKey = band === '신강' || band === '신약' ? band : '중화';
    var val = function (k) { return k === 'e' ? sd.dayMaster && sd.dayMaster.el : k === 'b' ? bandKey : k === 't' ? sd.dominantGroup : k === 'l' ? sd.weakestGroup : k === 'y' ? b.yong : b.gi; };
    var basisOf = function (k) { var v = val(k); return k === 'e' ? '일간 ' + v + '(' + EL_HJ[v] + ')' : k === 'b' ? band || v : k === 't' ? '가장 큰 기운 ' + v : k === 'l' ? '가장 작은 기운 ' + v : k === 'y' ? '용신 ' + v + '(' + EL_HJ[v] + ')' : '기신 ' + v + '(' + EL_HJ[v] + ')'; };
    var rows = p.rows.map(function (r, i) { var v = r[2][val(r[1])]; return v ? '<li><i>' + HZ[i] + '</i><b>' + esc(r[0]) + '</b><span>' + esc(v) + '</span><em>' + esc(basisOf(r[1])) + '</em></li>' : ''; }).join('');
    var card = R.Deep && R.Deep.dayCard ? R.Deep.dayCard(H, '') : '';
    return '<section class="dp-embed dp fx fx-prof">' + head(p.kick, p.title, '') + card + '<ul class="fx-list">' + rows + '</ul></section>';
  });

  /* ── 좋아하는 점 · 불편한 점 ── */
  var LIKE = { 비겁: ['의리 있고 내 편이 되어 줘요', '고집이 세고 지기 싫어해요'], 식상: ['재미있고 솔직해서 분위기가 살아요', '말이 앞서서 상처를 줄 때가 있어요'], 재성: ['현실적으로 도와주고 챙겨 줘요', '계산이 빨라 정이 없어 보일 때가 있어요'], 관성: ['믿음직하고 약속을 지켜요', '원칙을 앞세워 딱딱해 보여요'], 인성: ['이야기를 잘 들어 주고 따뜻해요', '생각이 많아 속을 알기 어려워요'] };
  var LIKE_EL = { 목: ['밝고 성장하려는 기운이 보기 좋아요', '자기 계획대로만 가려 할 때가 있어요'], 화: ['표정과 말에 온기가 있어요', '감정 기복이 겉으로 드러나요'], 토: ['곁에 있으면 편안해요', '변화를 귀찮아해 답답해 보여요'], 금: ['깔끔하고 기준이 분명해요', '말이 차갑게 들릴 때가 있어요'], 수: ['눈치가 빠르고 센스가 있어요', '속마음을 잘 안 보여 줘요'] };
  FB.add('fx:likes', function (H) {
    var sd = H.sd, t = LIKE[sd.dominantGroup] || LIKE.비겁, e = LIKE_EL[sd.dayMaster && sd.dayMaster.el] || LIKE_EL.토, el = sd.dayMaster && sd.dayMaster.el;
    var col = function (good) { return '<div class="fx-side fx-' + (good ? 'best' : 'worst') + '"><p class="fx-sk">' + (good ? '好 · 좋아하는 이유' : '忌 · 불편해하는 이유') + '</p><ul class="fx-ul"><li>' + esc(t[good ? 0 : 1]) + '<small>' + esc('가장 큰 기운 ' + sd.dominantGroup) + '</small></li><li>' + esc(e[good ? 0 : 1]) + '<small>' + esc('일간 ' + el + '(' + EL_HJ[el] + ')') + '</small></li></ul></div>'; };
    return '<section class="dp-embed dp fx">' + head('命簿 · 거울 앞', '사람들이 보는 나의 두 얼굴', '같은 성질이 어떤 사람에게는 매력으로, 어떤 사람에게는 불편함으로 보여요.') + '<div class="fx-two">' + col(true) + col(false) + '</div><p class="fx-rx-f">' + esc('불편함을 줄이는 한 가지 — ' + (FB.REM[FB.base(H).yong] || FB.REM.토).small) + '</p></section>';
  });

  /* ── 맞는 업종 · 안 맞는 업종 ── */
  var FIT = { 목: ['교육·강의', '출판·콘텐츠', '디자인·패션', '의료·복지'], 화: ['방송·미디어', '마케팅·홍보', '요식·뷰티', '공연·이벤트'], 토: ['부동산·건설', '공공기관', '금융·보험', '농식품·유통'], 금: ['법률·감사', '제조·기계', 'IT 엔지니어링', '군·경·보안'], 수: ['무역·물류', '연구·분석', '여행·서비스', '상담·심리'] };
  FB.add('fx:fit', function (H) {
    var b = FB.base(H), col = function (good) { var el = good ? b.yong : b.gi; return '<div class="fx-side fx-' + (good ? 'best' : 'worst') + '"><p class="fx-sk">' + (good ? '合 · 잘 맞는 업종' : '逆 · 힘이 드는 업종') + '</p><h4>' + esc(el + '(' + EL_HJ[el] + ') 기운의 일') + '</h4><ul class="fx-ul">' + (FIT[el] || []).map(function (j) { return '<li>' + esc(j) + '</li>'; }).join('') + '</ul><p class="fx-note">' + esc(good ? '내 사주가 가장 필요로 하는 기운(용신)을 매일 쓰게 되는 일이에요.' : '이미 많거나 부딪히는 기운(기신)을 더 쓰게 되는 일이라 오래 하면 지치기 쉬워요.') + '</p></div>'; };
    return '<section class="dp-embed dp fx">' + head('命簿 · 업종 대장', '맞는 업종과 힘이 드는 업종', '업종 이름보다 그 일이 어떤 기운을 쓰는지가 중요해요. 힘이 드는 업종이라도 맡는 역할을 바꾸면 덜 지쳐요.') + '<div class="fx-two">' + col(true) + col(false) + '</div></section>';
  });

  /* ── 10년 로드맵 ── */
  var ROAD = { career: ['일', ['기반 다지기', '실력 드러내기', '자리 굳히기']], wealth: ['돈', ['새는 곳 막기', '굴리는 법 익히기', '불리고 지키기']] };
  FB.add('fx:road', function (H, part) {
    var sd = H.sd, dw = sd.daewoon || [], now = sd.nowYear || new Date().getFullYear(), r = ROAD[part.topic] || ROAD.career, b = FB.base(H);
    var cur = dw.filter(function (x) { return x.startYear <= now && now <= x.endYear; })[0], next = dw.filter(function (x) { return x.startYear > now; })[0];
    var first = part.topic === 'wealth' ? '고정 지출을 정리하고 생활비 3개월분을 따로 떼어 두기' : '지금 자리에서 이름을 걸 대표 성과 하나 만들기', second = part.topic === 'wealth' ? ACT[b.yong] + '로 수입 통로를 하나 더 만들기' : jo(ACT[b.yong], '을', '를') + ' 맡는 역할로 넓히기';
    var steps = [[now + '~' + (now + 2) + '년', r[1][0], first], [(now + 3) + '~' + (now + 6) + '년', r[1][1], second], [(now + 7) + '~' + (now + 10) + '년', r[1][2], next ? next.ganzhi + ' 대운(' + next.startYear + '년~)에 맞춰 판을 다시 짜기' : '지금 흐름을 지키며 쌓은 것을 굳히기']];
    return '<section class="dp-embed dp fx">' + head('命簿 · 십년 지도', '앞으로 10년, ' + r[0] + '의 로드맵', cur ? '지금은 ' + cur.ganzhi + ' 대운(' + cur.startYear + '~' + cur.endYear + '년)이에요. 세 구간으로 나눠 할 일을 정했어요.' : '세 구간으로 나눠 할 일을 정했어요.') +
      '<ol class="fx-road">' + steps.map(function (s, i) { return '<li><span class="fx-road-n">' + HZ[i] + '</span><div><small>' + esc(s[0]) + '</small><b>' + esc(s[1]) + '</b><p>' + esc(s[2]) + '</p></div></li>'; }).join('') + '</ol></section>';
  });
})(typeof window !== 'undefined' ? window : globalThis);
