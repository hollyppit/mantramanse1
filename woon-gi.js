/* 오운육기(五運六氣) — 한 해의 기후 흐름. 2026-11-20
   · 모두에게 공통인 '그해의 기후'(중운·사천·재천·여섯 구간 객기)를 계산하고, 이 사주가 그 기후를 어떻게 받는지 읽는다.
   · 시간 크기: 시대(삼원구운 20년, macro-era.js) → 올해의 기후(오운육기 1년·6구간, 이 파일) → 개인 대운·세운.
   · 개인 용신·운·흐름 점수를 바꾸지 않는다(표시 전용). 역할은 통합 용신(ch.unified.roles), 기후 맞춤은 원국 한난조습(ch.climate)을 읽기만 한다.
   · 규칙(황제내경 운기 7편의 통설):
       중운(세운): 갑기 토 · 을경 금 · 병신 수 · 정임 목 · 무계 화, 양간 = 태과(넘침) · 음간 = 불급(모자람 → 나를 누르는 기운이 끼어듦)
       사천(상반기 주도)·재천(하반기 주도): 자오 소음군화/양명조금 · 축미 태음습토/태양한수 · 인신 소양상화/궐음풍목
                                            묘유 양명조금/소음군화 · 진술 태양한수/태음습토 · 사해 궐음풍목/소양상화
       객기 여섯 구간: 궐음→소음→태음→소양→양명→태양 순환, 사천이 3번째(삼지기)·재천이 6번째(종지기) 구간
       주기 여섯 구간(해마다 같음): 궐음풍목·소음군화·소양상화·태음습토·양명조금·태양한수
       구간 경계: 대한·춘분·소만·대서·추분·소설(운기의 해는 대한에서 시작)
   · 브라우저·Node 공용. 사용: MantraWoonGi.year(M, Y) · MantraWoonGi.analyze(M, ch, ms) · MantraWoonGi.html(M, ch, ms, opt) */
(function (G) {
  'use strict';
  var VERSION = 'woon-gi-20261120-1';
  var EL = ['목(木)', '화(火)', '토(土)', '금(金)', '수(水)'], ELS = ['목', '화', '토', '금', '수'], EL_HJ = ['木', '火', '土', '金', '水'];
  var EL_WX = ['바람', '더위', '습기', '건조함', '추위'], EL_WX_I = ['바람이', '더위가', '습기가', '건조함이', '추위가'];   // 오행이 기후로 드러나는 모습
  var STEM_HJ = '甲乙丙丁戊己庚辛壬癸', BR_HJ = '子丑寅卯辰巳午未申酉戌亥';
  var UN_OF_STEM = [2, 3, 4, 0, 1];   // stem % 5 → 중운 오행
  var BR_EL = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
  // 육기: t(한난 +더움)·h(조습 +습함)은 원국 기후 맞춤을 보는 대략값
  var QI = [
    { k: '궐음풍목', hj: '厥陰風木', w: '풍(바람)', el: 0, t: 0.2, h: -0.2, mood: '바람이 잦고 변화가 빠른 기운', life: '일정과 기분이 자주 흔들리기 쉬워요. 생활 리듬을 고정하고 목·어깨 긴장을 자주 풀어 주세요.' },
    { k: '소음군화', hj: '少陰君火', w: '서(온열)', el: 1, t: 1.0, h: 0, mood: '따뜻하고 들뜨는 기운', life: '활동과 만남이 늘어요. 들뜬 만큼 잠과 쉬는 시간을 먼저 지켜 두세요.' },
    { k: '태음습토', hj: '太陰濕土', w: '습(습기)', el: 2, t: 0, h: 1.5, mood: '눅눅하고 무거운 기운', life: '몸과 마음이 처지기 쉬워요. 가볍게 자주 움직이고 과식·찬 음식은 줄여 보세요.' },
    { k: '소양상화', hj: '少陽相火', w: '화(열기)', el: 1, t: 1.8, h: -0.3, mood: '뜨겁고 강한 열기', life: '무리하면 쉽게 지쳐요. 일정에 여백을 두고 물을 충분히 드세요.' },
    { k: '양명조금', hj: '陽明燥金', w: '조(건조)', el: 3, t: -0.4, h: -1.5, mood: '마르고 서늘한 기운', life: '건조함에 예민해져요. 실내 습도와 보습을 챙기고, 날 선 말은 한 번 걸러 보세요.' },
    { k: '태양한수', hj: '太陽寒水', w: '한(추위)', el: 4, t: -1.8, h: 0.4, mood: '차고 움츠러드는 기운', life: '몸이 움츠러들어 활동량이 줄기 쉬워요. 보온과 꾸준한 운동을 챙기세요.' }
  ];
  var SITIAN_OF_BR = [1, 2, 3, 4, 5, 0];   // branch % 6 → 사천 육기
  var HOST = [0, 1, 3, 2, 4, 5];           // 주기 1~6 구간(해마다 같음)
  var STEP_TERM = [1, 5, 9, 13, 17, 21];   // 대한·춘분·소만·대서·추분·소설 (engine TERM_NAMES 인덱스)
  var STEP_TERM_K = ['대한', '춘분', '소만', '대서', '추분', '소설'];
  var STEP_K = ['초지기', '이지기', '삼지기', '사지기', '오지기', '종지기'];
  var YIN = ['角', '徵', '宮', '商', '羽'], YIN_K = ['각', '치', '궁', '상', '우'];   // 오음(목·화·토·금·수)
  var mod = function (x, n) { return ((x % n) + n) % n; };
  var clamp = function (x, a, b) { return Math.max(a, Math.min(b, x)); };

  // ── 한 해의 운기(모두에게 공통) ──
  function year(M, Y) {
    var tY = M.termsOf(Y), tN = M.termsOf(Y + 1); if (!tY || !tN) return null;
    var p = M.yearPillarOf(Y), s = p.s, b = p.b, un = UN_OF_STEM[s % 5], excess = s % 2 === 0;
    var si = SITIAN_OF_BR[b % 6], ja = mod(si + 3, 6), ctrl = mod(un + 3, 5);   // ctrl: 중운을 누르는 오행(불급일 때 끼어듦)
    var bounds = STEP_TERM.map(function (i) { return tY[i]; }).concat([tN[1]]);
    var steps = [0, 1, 2, 3, 4, 5].map(function (k) { return { i: k, name: STEP_K[k], from: bounds[k], to: bounds[k + 1], fromTerm: STEP_TERM_K[k], host: HOST[k], guest: mod(si + k - 2, 6) }; });
    // 운과 기의 관계(사천 오행 vs 중운 오행)
    var se = QI[si].el, rel = se === un ? 'same' : mod(se + 1, 5) === un ? 'qiGen' : mod(se + 2, 5) === un ? 'qiHit' : mod(un + 1, 5) === se ? 'unGen' : 'unHit';
    var REL = { same: ['운기 같음', '하늘의 기운과 한 해의 바탕이 같은 오행이라 그 기운이 한쪽으로 크게 쏠리는 해예요.'], qiGen: ['순화(順化)', '하늘의 기운이 한 해의 바탕을 생해 주어 흐름이 비교적 순한 해예요.'], qiHit: ['천형(天刑)', '하늘의 기운이 한 해의 바탕을 눌러 기후 변화가 거칠게 느껴지기 쉬운 해예요.'], unGen: ['소역(小逆)', '한 해의 바탕이 하늘의 기운을 생해 주느라 힘이 새는, 조금 어긋난 해예요.'], unHit: ['불화(不和)', '한 해의 바탕이 하늘의 기운을 눌러 서로 맞지 않는 해예요. 계절이 제철답지 않게 느껴지기 쉬워요.'] };
    var tags = [];
    var tianfu = se === un, suihui = BR_EL[b] === un && [0, 6, 3, 9, 1, 4, 7, 10].indexOf(b) >= 0;
    if (tianfu && suihui) tags.push('태을천부(太乙天符)'); else { if (tianfu) tags.push('천부(天符)'); if (suihui) tags.push('세회(歲會)'); }
    if (QI[ja].el === un) tags.push(excess ? '동천부(同天符)' : '동세회(同歲會)');
    var unText = excess ? EL[un] + ' 기운이 넘치는 해(태과) — ' + EL_WX_I[un] + ' 두드러지기 쉬워요.'
      : EL[un] + ' 기운이 모자라는 해(불급) — 그 틈에 ' + EL[ctrl] + ' 기운(' + EL_WX[ctrl] + ')이 끼어들기 쉬워요.';
    // 주운(해마다 같은 목→화→토→금→수 다섯 구간)·객운(중운에서 시작해 상생 순서) — 오음건운 태소상생: 같은 해 안에서 오행마다 태(넘침)·소(모자람)가 하나로 정해지고,
    //   주운 순서(목0·화1·토2·금3·수4)로 태·소가 번갈아 서며 중운 오행은 중운의 태과/불급과 같다. 교운: 대한 · 춘분 뒤 13일 · 망종 뒤 10일 · 처서 뒤 7일 · 입동 뒤 4일
    var tai = function (e) { return (mod(e - un, 2) === 0) === excess; };
    var D = 864e5, ub = [tY[1], tY[5] + 13 * D, tY[10] + 10 * D, tY[15] + 7 * D, tY[20] + 4 * D, tN[1]];
    //   객운은 『類經圖翼』대로 중운의 태소에서 시작해 구간마다 태·소가 번갈아 선다(갑년: 태궁·소상·태우·소각·태치)
    var yunStep = function (k, e, t) { return { i: k, from: ub[k], to: ub[k + 1], el: e, tai: t, yin: YIN[e], label: (t ? '태' : '소') + YIN_K[e] + '(' + (t ? '太' : '少') + YIN[e] + ')' }; };
    var zhuyun = [0, 1, 2, 3, 4].map(function (k) { return yunStep(k, k, tai(k)); }), keyun = [0, 1, 2, 3, 4].map(function (k) { return yunStep(k, mod(un + k, 5), (k % 2 === 0) === excess); });
    return { Y: Y, gz: STEM_HJ[s] + BR_HJ[b], s: s, b: b, un: un, excess: excess, ctrl: ctrl, unK: ELS[un] + '운 ' + (excess ? '태과' : '불급'), unText: unText,
      zhuyun: zhuyun, keyun: keyun, sitian: si, zaiquan: ja, steps: steps, from: bounds[0], to: bounds[6], rel: rel, relK: REL[rel][0], relText: REL[rel][1], tags: tags };
  }
  function yearAt(M, ms) {
    var kd = new Date(ms + 9 * 3600e3), Y = kd.getUTCFullYear(), t = M.termsOf(Y);
    if (t && ms < t[1]) Y -= 1;
    return year(M, Y);
  }

  // ── 이 사주가 그 기후를 받는 방식 ──
  var GOOD = { '용신': 1, '희신': 1 }, BAD = { '기신': 1, '구신': 1 };
  function roleOf(ch, el) { return String((ch.unified && ch.unified.roles && ch.unified.roles[el]) || '').replace(/^조건부 /, '') || '중립'; }
  function sideOf(role) { return GOOD[role] ? 1 : BAD[role] ? -1 : 0; }
  function need(ch) { var c = ch.climate || { temp: 0, hum: 0 }; return { t: Math.abs(c.temp) >= 0.3 ? clamp(-c.temp / 0.6, -1.5, 1.5) : 0, h: Math.abs(c.hum) >= 0.4 ? clamp(-c.hum / 0.8, -1.5, 1.5) : 0, c: c }; }
  function natalWord(c) { return c.temp >= 0.6 ? '더운' : c.temp <= -0.6 ? '추운' : c.hum >= 0.8 ? '습한' : c.hum <= -0.8 ? '건조한' : ''; }
  function toneOf(v) { return v >= 0.5 ? 'good' : v <= -0.5 ? 'bad' : 'mid'; }
  // 육기 하나(사천·재천·구간 객기)
  function readQi(ch, q, nd) {
    var Q = QI[q], role = roleOf(ch, Q.el), sd = sideOf(role), cf = (nd.t * Q.t + nd.h * Q.h) / 2, cs = cf >= 0.3 ? 1 : cf <= -0.3 ? -1 : 0, nw = natalWord(nd.c);
    var v = sd + cs * 0.5, t;
    if (sd > 0) t = cs < 0 ? EL[Q.el] + ' 기운은 이 사주에 ' + role + '이지만, ' + (nw || '원국') + ' 기후 치우침을 조금 키워 득실이 섞여요.' : EL[Q.el] + ' 기운이 이 사주에 ' + role + '이라 순풍이에요' + (cs > 0 ? '. 원국의 ' + nw + ' 기후도 맞춰 줘요.' : '.');
    else if (sd < 0) t = cs > 0 ? EL[Q.el] + ' 기운은 이 사주에 ' + role + '이지만, ' + (nw || '원국') + ' 기후를 덜어 주는 면도 있어요.' : EL[Q.el] + ' 기운이 이 사주에 ' + role + '이라 부담 쪽이에요' + (cs < 0 ? '. ' + nw + ' 원국 기후도 더 치우치게 해요.' : '. 페이스를 조절하는 편이 좋아요.');
    else t = cs > 0 ? '역할은 ' + role + '이지만 ' + (nw ? nw + ' ' : '') + '원국 기후를 맞춰 주는 쪽이라 지내기 편한 편이에요.' : cs < 0 ? '역할은 ' + role + '이지만 ' + (nw ? nw + ' ' : '') + '원국 기후를 더 치우치게 해 컨디션 관리가 필요해요.' : '이 사주에는 크게 돕지도 막지도 않는 기후예요.';
    return { qi: q, el: Q.el, role: role, climate: Math.round(cf * 100) / 100, tone: toneOf(v), v: v, text: t };
  }
  // 중운(한 해 바탕): 태과면 그 오행, 불급이면 끼어드는 오행을 주로 보고 약해지는 오행을 덧붙인다
  function readUn(ch, y) {
    var main = y.excess ? y.un : y.ctrl, role = roleOf(ch, main), sd = sideOf(role), t;
    t = (y.excess ? '넘치는 ' : '끼어드는 ') + EL[main] + ' 기운은 이 사주에 ' + role + (sd > 0 ? '이라 한 해의 바탕이 내 편으로 기울어요.' : sd < 0 ? '이라 한 해의 바탕이 부담 쪽으로 기울어요.' : '이라 한 해의 바탕은 크게 기울지 않아요.');
    var v = sd;
    if (!y.excess) { var wr = roleOf(ch, y.un), ws = sideOf(wr); if (ws > 0) { t += ' 대신 필요한 ' + EL[y.un] + ' 기운(' + wr + ')은 오히려 약해지는 해예요.'; v -= 0.5; } else if (ws < 0) { t += ' 부담이던 ' + EL[y.un] + ' 기운(' + wr + ')은 약해져 한숨 돌리는 면도 있어요.'; v += 0.5; } }
    return { el: main, role: role, tone: toneOf(v), v: v, text: t };
  }

  function analyze(M, ch, ms) {
    var t = ms || Date.now(), y = yearAt(M, t); if (!y) return { supported: false };
    var nd = need(ch), cur = y.steps.filter(function (s) { return s.from <= t && t < s.to; })[0] || y.steps[0];
    var steps = y.steps.map(function (s) { return Object.assign({}, s, { read: readQi(ch, s.guest, nd), now: s === cur }); });
    var r = { supported: true, version: VERSION, year: y, un: readUn(ch, y), sitian: readQi(ch, y.sitian, nd), zaiquan: readQi(ch, y.zaiquan, nd), steps: steps, cur: steps[cur.i] };
    // 다음 해(구간이 거의 끝났으면 미리 보기용)
    // 종합: 시대(삼원구운) → 올해 기후(오운육기) → 지금 대운
    var lay = [], ME = G.MantraMacroEra;
    try { if (ME) { var kd = new Date(t + 9 * 3600e3), e = ME.eraAt({ y: kd.getUTCFullYear(), m: kd.getUTCMonth() + 1, d: kd.getUTCDate() }); if (e && e.supported) { var er = roleOf(ch, e.era.el); lay.push({ k: '시대 · 20년', sub: e.era.period + '운 ' + ELS[e.era.el], el: e.era.el, role: er, tone: toneOf(sideOf(er)) }); } } } catch (x) { }
    lay.push({ k: '올해 기후 · 1년', sub: y.unK, el: r.un.el, role: r.un.role, tone: r.un.tone });
    lay.push({ k: '지금 구간 · 두 달', sub: QI[r.cur.guest].k, el: r.cur.read.el, role: r.cur.read.role, tone: r.cur.read.tone });
    try { var du = M.daeunAt && M.daeunAt(ch, t); if (du) { var de = M.stemEl(du.s), dr = roleOf(ch, de); lay.push({ k: '지금 대운 · 10년', sub: STEM_HJ[du.s] + BR_HJ[du.b], el: de, role: dr, tone: toneOf(sideOf(dr)) }); } } catch (x) { }
    var g = lay.filter(function (l) { return l.tone === 'good'; }).length, b = lay.filter(function (l) { return l.tone === 'bad'; }).length;
    var curT = r.cur.read.tone, unT = r.un.tone;
    var sum = g > b && curT !== 'bad' ? '큰 바람과 올해 기후가 대체로 내 편이에요. 지금 구간에 하고 싶던 일을 한 걸음 더 밀어 보세요.'
      : b > g && curT !== 'good' ? '바깥 기후가 부담 쪽으로 겹쳐 있어요. 남들 속도에 맞추기보다 컨디션과 리듬을 지키는 쪽이 이득이에요.'
        : unT === 'good' && curT === 'bad' ? '올해 바탕은 괜찮지만 지금 두 달은 부담 쪽 기후예요. 큰 결정은 다음 구간으로 미뤄도 좋아요.'
          : unT === 'bad' && curT === 'good' ? '올해 바탕은 부담 쪽이지만 지금 두 달은 숨 쉴 틈이 있어요. 이 구간에 할 일을 몰아 두세요.'
            : '도움과 부담이 섞인 기후예요. 결정은 개인 대운·세운 흐름을 기준으로 하고, 기후는 생활 관리 참고로 쓰세요.';
    r.layers = lay; r.summary = sum;
    r.note = '오운육기는 한 해의 기후 흐름을 읽는 전통 이론으로, 모두에게 공통인 바깥 환경이에요. 개인의 용신·운·흐름 점수를 바꾸지 않으며, 생활 관리 문장은 의학적 진단이 아니에요.';
    r.basis = ['중운: ' + y.gz + '년 천간 ' + STEM_HJ[y.s] + ' → ' + y.unK + ' (갑기 토·을경 금·병신 수·정임 목·무계 화, 양간 태과·음간 불급)', '사천·재천: 지지 ' + BR_HJ[y.b] + ' → 사천 ' + QI[y.sitian].k + ' · 재천 ' + QI[y.zaiquan].k, '객기: 궐음→소음→태음→소양→양명→태양 순환, 사천이 삼지기·재천이 종지기', '구간 경계: 대한·춘분·소만·대서·추분·소설(운기의 해는 대한에서 시작)', '주운·객운: 오음건운 태소상생(『類經圖翼』) — 주운은 각·치·궁·상·우(목→수), 객운은 중운에서 시작해 상생 순서로 태·소가 번갈아 섬(객운 뒤 구간의 태소를 주운 표에서 다시 정하는 견해도 있음), 교운은 대한·춘분 뒤 13일·망종 뒤 10일·처서 뒤 7일·입동 뒤 4일', '운기 관계: ' + y.relK + (y.tags.length ? ' · ' + y.tags.join(' · ') : ''), '이 사주의 역할: 통합 용신 판단(오행별 용신·희신·한신·구신·기신) + 원국 한난조습과의 맞춤'];
    return r;
  }

  // ── 화면 조각(만세력·타임라인 공용) ──
  var fmtY = function (ms) { var d = new Date(ms + 9 * 3600e3); return d.getUTCFullYear() + '.' + (d.getUTCMonth() + 1) + '.' + d.getUTCDate(); };
  var fmt = function (ms) { var d = new Date(ms + 9 * 3600e3); return (d.getUTCMonth() + 1) + '.' + d.getUTCDate(); };
  var esc0 = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var TONE_K = { good: '도움', bad: '부담', mid: '중립' };
  function html(M, ch, ms, opt) {
    opt = opt || {}; var E = opt.esc || esc0, r; try { r = analyze(M, ch, ms); } catch (e) { return ''; }
    if (!r || !r.supported) return '';
    var y = r.year, chip = function (tone, txt) { return '<span class="wg-chip ' + tone + '">' + E(txt) + '</span>'; };
    var el = function (e) { return '<i class="wg-el e' + e + '">' + EL_HJ[e] + '</i>'; };
    var head = '<p class="wg-lead"><b>' + y.Y + ' ' + E(y.gz) + '년 운기</b> — ' + E(y.unK) + ' · 사천 ' + E(QI[y.sitian].k) + ' · 재천 ' + E(QI[y.zaiquan].k) + '</p>' +
      '<p class="wg-tags">' + chip('mid', y.relK) + y.tags.map(function (t) { return chip('mid', t); }).join('') + '<span class="wg-sm">' + fmtY(y.from) + '(대한) ~ ' + fmtY(y.to) + '</span></p>';
    var cell = function (k, sub, rd, el0) { return '<div class="wg-c ' + rd.tone + '"><span class="wg-k">' + E(k) + '</span>' + el(el0) + '<b>' + E(sub) + '</b>' + chip(rd.tone, rd.role) + '</div>'; };
    var three = '<div class="wg-three">' + cell('한 해 바탕', y.unK, r.un, r.un.el) + cell('상반기 · 사천', QI[y.sitian].k, r.sitian, r.sitian.el) + cell('하반기 · 재천', QI[y.zaiquan].k, r.zaiquan, r.zaiquan.el) + '</div>' +
      '<ul class="wg-ul"><li><b>한 해 바탕</b> ' + E(y.unText) + ' ' + E(r.un.text) + '</li><li><b>상반기</b> ' + E(QI[y.sitian].mood) + ' — ' + E(r.sitian.text) + '</li><li><b>하반기</b> ' + E(QI[y.zaiquan].mood) + ' — ' + E(r.zaiquan.text) + '</li></ul>';
    var strip = '<div class="wg-steps" role="list" aria-label="여섯 구간 객기">' + r.steps.map(function (s) { return '<div role="listitem" class="wg-s ' + s.read.tone + (s.now ? ' on' : '') + '"><small>' + fmt(s.from) + '~</small>' + el(QI[s.guest].el) + '<b>' + E(QI[s.guest].w) + '</b><span>' + E(TONE_K[s.read.tone]) + '</span><em>주기 ' + E(QI[s.host].w.replace(/\(.*$/, '')) + '</em></div>'; }).join('') + '</div>';
    // 주운·객운 다섯 구간(약 73일씩)
    var nowYun = function (L) { return L.filter(function (x) { return x.from <= (ms || Date.now()) && (ms || Date.now()) < x.to; })[0]; }, zn = nowYun(y.zhuyun), kn = nowYun(y.keyun);
    var yunRow = function (L, cur) { return L.map(function (x) { return '<td class="' + (x === cur ? 'on' : '') + '">' + el(x.el) + '<b>' + E(x.label) + '</b></td>'; }).join(''); };
    var yun = '<div class="wg-tw"><table class="wg-yun"><thead><tr><th></th>' + y.zhuyun.map(function (x, k) { return '<th>' + ['초운', '이운', '삼운', '사운', '종운'][k] + '<small>' + fmt(x.from) + '~</small></th>'; }).join('') + '</tr></thead><tbody>' +
      '<tr><th>주운<small>해마다 같음</small></th>' + yunRow(y.zhuyun, zn) + '</tr><tr><th>객운<small>올해만</small></th>' + yunRow(y.keyun, kn) + '</tr></tbody></table></div>' +
      '<p class="wg-sm">주운은 계절마다 늘 같은 순서(목→화→토→금→수)로 돌고, 객운은 올해의 중운(' + E(y.unK) + ')에서 출발해 상생 순서로 돌아요. 태(太)는 그 기운이 넘치고 소(少)는 모자란다는 뜻이에요.' + (kn ? ' 지금은 객운 ' + E(kn.label) + ' 구간이에요.' : '') + '</p>';
    var c = r.cur, cq = QI[c.guest], hq = QI[c.host];
    var now = '<div class="wg-now"><p class="wg-nk">지금 구간 · ' + E(c.name) + ' ' + fmt(c.from) + '~' + fmt(c.to) + '</p><p><b>' + E(cq.k) + '</b>(객기, 올해 이 구간) 위에 <b>' + E(hq.k) + '</b>(주기, 해마다 같은 계절 기운) — ' + E(cq.mood) + '.</p><p>' + E(c.read.text) + '</p><p class="wg-sm">생활 관리 · ' + E(cq.life) + '</p></div>';
    var lay = '<div class="wg-lay">' + r.layers.map(function (l, i) { return (i ? '<em>→</em>' : '') + '<span class="wg-l ' + l.tone + '"><small>' + E(l.k) + '</small><b>' + el(l.el) + E(l.sub) + '</b>' + chip(l.tone, l.role) + '</span>'; }).join('') + '</div><p class="wg-sum">' + E(r.summary) + '</p>';
    var basis = '<details class="wg-more"><summary>계산 근거 보기</summary><ul class="wg-ul wg-sm">' + r.basis.map(function (t) { return '<li>' + E(t) + '</li>'; }).join('') + '</ul></details>';
    var hk = opt.h || 'h4', fold = opt.fold || function (t, h) { return '<details class="wg-more"><summary>' + E(t) + '</summary>' + h + '</details>'; };
    return '<div class="wg">' + head + three +
      '<' + hk + ' class="wg-h">육기 여섯 구간 <small>대한부터 두 달씩 · 위는 올해의 객기, 아래 작은 글씨는 해마다 같은 주기</small></' + hk + '>' + strip + now +
      fold('오운 다섯 구간 보기 (주운·객운)', yun) +
      (opt.layers ? '<' + hk + ' class="wg-h">종합 · 시대에서 지금까지</' + hk + '>' + lay : '') + basis + '<p class="wg-note">' + E(r.note) + '</p></div>';
  }
  var CSS = '.wg{display:grid;gap:8px}.wg p{margin:0}.wg-lead{font-size:.95rem;line-height:1.55}.wg-tags{display:flex;flex-wrap:wrap;gap:5px;align-items:center}.wg-sm{font-size:.76rem;opacity:.7}.wg-h{margin:6px 0 0;font-size:.86rem}.wg-h small{font-weight:400;font-size:.74rem;opacity:.65;margin-left:6px}'
    + '.wg-chip{display:inline-block;font-size:.72rem;font-weight:700;padding:1px 8px;border-radius:999px;border:1px solid rgba(127,127,127,.35);white-space:nowrap}.wg-chip.good{color:#1f7a5c;border-color:#1f7a5c66;background:#1f7a5c14}.wg-chip.bad{color:#b23a2b;border-color:#b23a2b66;background:#b23a2b12}'
    + '.wg-el{display:inline-grid;place-items:center;width:26px;height:26px;border-radius:7px;font-style:normal;font-weight:800;font-size:.9rem;color:#fff;flex:none}.wg-el.e0{background:#2FA866}.wg-el.e1{background:#E8402F}.wg-el.e2{background:#E3A915}.wg-el.e3{background:#AEB4BF}.wg-el.e4{background:#2B303C}'
    + '.wg-three{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.wg-c{display:grid;justify-items:center;gap:3px;text-align:center;padding:8px 4px;border-radius:12px;border:1px solid rgba(127,127,127,.25)}.wg-c.good{background:#1f7a5c10;border-color:#1f7a5c44}.wg-c.bad{background:#b23a2b0e;border-color:#b23a2b44}.wg-c b{font-size:.84rem}.wg-k{font-size:.7rem;opacity:.7}'
    + '.wg-ul{margin:0;padding-left:18px;font-size:.86rem;line-height:1.6}.wg-ul li{margin:2px 0}'
    + '.wg-steps{display:grid;grid-template-columns:repeat(6,1fr);gap:4px}.wg-s{display:grid;justify-items:center;gap:2px;padding:6px 2px;border-radius:10px;border:1.5px solid transparent;background:rgba(127,127,127,.08);font-size:.74rem;text-align:center}.wg-s small{font-size:.62rem;opacity:.7}.wg-s span{font-size:.64rem;opacity:.8}.wg-s.good span{color:#1f7a5c;opacity:1;font-weight:700}.wg-s.bad span{color:#b23a2b;opacity:1;font-weight:700}.wg-s.on{border-color:currentColor;background:rgba(127,127,127,.16)}.wg-s .wg-el{width:22px;height:22px;font-size:.78rem}'
    + '.wg-now{border-radius:12px;padding:10px 12px;border:1px dashed rgba(127,127,127,.4);display:grid;gap:4px;font-size:.88rem;line-height:1.6}.wg-nk{font-size:.74rem;font-weight:800;opacity:.75;letter-spacing:.03em}'
    + '.wg-lay{display:flex;flex-wrap:wrap;gap:4px;align-items:center}.wg-lay em{font-style:normal;opacity:.5}.wg-l{display:grid;gap:2px;padding:6px 8px;border-radius:10px;border:1px solid rgba(127,127,127,.25);font-size:.78rem}.wg-l small{font-size:.66rem;opacity:.7}.wg-l b{display:flex;gap:4px;align-items:center}.wg-l .wg-el{width:20px;height:20px;font-size:.72rem}.wg-l.good{border-color:#1f7a5c55}.wg-l.bad{border-color:#b23a2b55}.wg-sum{font-size:.9rem;font-weight:600;line-height:1.6}'
    + '.wg-s em{font-style:normal;font-size:.6rem;opacity:.55}.wg-tw{overflow-x:auto}.wg-yun{width:100%;border-collapse:collapse;font-size:.76rem;text-align:center}.wg-yun th,.wg-yun td{padding:5px 3px;border-bottom:1px solid rgba(127,127,127,.18);vertical-align:middle}.wg-yun th small{display:block;font-weight:400;font-size:.62rem;opacity:.6}.wg-yun td b{display:block;font-size:.7rem;margin-top:2px}.wg-yun td.on{background:rgba(127,127,127,.16);border-radius:8px}.wg-yun .wg-el{width:20px;height:20px;font-size:.7rem}'
    + '.wg-more>summary{cursor:pointer;font-size:.82rem;opacity:.85}.wg-note{font-size:.74rem;opacity:.65;line-height:1.55}'
    + '@media (max-width:560px){.wg-steps{grid-template-columns:repeat(3,1fr)}.wg-three{gap:4px}.wg-c b{font-size:.76rem}}';
  function injectCss(doc) { try { doc = doc || G.document; if (!doc || doc.getElementById('wg-css')) return; var s = doc.createElement('style'); s.id = 'wg-css'; s.textContent = CSS; doc.head.appendChild(s); } catch (e) { } }

  var api = { version: VERSION, year: year, yearAt: yearAt, analyze: analyze, html: html, CSS: CSS, injectCss: injectCss, QI: QI };
  G.MantraWoonGi = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
