/* 대운·세운·월운·일진 공통 분석 층(2026-11-18) — 표시 전용, 점수·용신 판정은 바꾸지 않는다
 *  엔진 1 env(): 외부 환경의 기운 — 원국(일간·강약·용신)을 쓰지 않고 그 시기 간지 자체만 본다
 *     천간·지지 오행, 지장간 구성, 간지 안의 관계, 월령·계절 왕상휴수사(월운·일진), 상위 운과의 간지 관계, 앞뒤 시기와의 변화
 *     십성은 일간이 있어야 정해지므로 이 층에는 넣지 않는다(개인 층에서 본다)
 *  엔진 2 보조 transition(): 운 교체 시점의 구조 변화 — 원국 역할이 뒤집히거나 일지·월지와 새 충·합이 생기거나
 *     십성 구조(ten-god-roles.js)가 새로 서거나 풀릴 때만 중요도를 올린다. 모든 교체를 전환기로 부풀리지 않는다
 *  hierarchy(): 상위 운과 하위 운의 방향(원국 역할 기준)이 같은지·다른지 — 상위 운이 하위 운 결과를 정하지 않는다
 *  브라우저: window.MantraLuckEnv · Node: module.exports
 */
(function (root) {
  'use strict';
  var VERSION = 'luck-env-2026-11-18';
  var EL_K = ['목(木)', '화(火)', '토(土)', '금(金)', '수(水)'], EL_S = ['목', '화', '토', '금', '수'];
  var LEVEL_K = { daeun: '대운', seun: '세운', wolun: '월운', ilun: '일진' };
  var UNIT = { daeun: '10년', seun: '한 해', wolun: '한 달', ilun: '하루' }, UNIT_IS = { daeun: '10년이에요', seun: '한 해예요', wolun: '한 달이에요', ilun: '하루예요' };
  // 오행의 시간적 성질(사람과 무관한 상징) — 사건을 정하지 않는다
  var EL_Q = ['뻗어 나가고 새로 시작하는', '밝게 드러나고 퍼지는', '모으고 다지며 버티는', '정리하고 매듭짓는', '스며들고 모으며 깊어지는'];
  var EL_ENV = [
    '새로 벌이고 넓히는 움직임이 많아지는 결이에요.',
    '보이고 알려지는 일, 속도와 열기가 커지는 결이에요.',
    '쌓고 지키고 조율하는 일이 앞에 서는 결이에요.',
    '기준을 세우고 정리하고 마무리하는 일이 앞에 서는 결이에요.',
    '정보와 생각이 오가고 안으로 깊어지는 일이 앞에 서는 결이에요.'
  ];
  var mod5 = function (x) { return ((x % 5) + 5) % 5; };
  function relEl(a, b) { if (a === b) return 'same'; if (mod5(a + 1) === b) return 'gen'; if (mod5(b + 1) === a) return 'genBy'; if (mod5(a + 2) === b) return 'ctl'; return 'ctlBy'; }
  var stemEl = function (s) { return Math.floor(s / 2); };
  function josa(word, a, b) { var c = word.charCodeAt(word.length - 1); if (word.slice(-1) === ')') c = word.charCodeAt(word.length - 2); var has = c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0; return word + (has ? a : b); }
  function ro(word) { var w = word.indexOf('(') > 0 ? word.slice(0, word.indexOf('(')) : word, c = w.charCodeAt(w.length - 1); var jong = c >= 0xAC00 && c <= 0xD7A3 ? (c - 0xAC00) % 28 : 0; return word + (jong && jong !== 8 ? '으로' : '로'); }
  function elJ(e, a, b) { return EL_S[e] + '(' + '木火土金水'[e] + ')' + (/[목금]/.test(EL_S[e]) ? a : b); }   // 목·금은 받침 있음, 화·토·수는 없음

  // ── 계절(월령): 寅卯辰 봄 · 巳午未 여름 · 申酉戌 가을 · 亥子丑 겨울, 진술축미는 토가 왕한 환절기 ──
  var SEASON = ['겨울', '겨울', '봄', '봄', '봄', '여름', '여름', '여름', '가을', '가을', '가을', '겨울'];
  var CLIMATE = ['한겨울이라 차고 어두운', '겨울 끝이라 차고 축축한', '봄 들머리라 아직 쌀쌀한', '한봄이라 피어나는', '늦봄 환절기라 습해지는', '초여름이라 달아오르는', '한여름이라 뜨거운', '늦여름 환절기라 덥고 마른', '초가을이라 서늘해지는', '한가을이라 맑고 단단한', '늦가을 환절기라 마르고 식는', '초겨울이라 차가워지는'];
  // 왕상휴수사: 월령 오행 기준 — 왕 같음 · 상 월령이 생함 · 휴 내가 월령을 생함 · 수 내가 월령을 극함 · 사 월령이 나를 극함
  var STATE = { same: ['왕', '제철이라 가장 힘이 센'], genBy: ['상', '계절이 밀어 줘서 힘이 붙는'], gen: ['휴', '계절에 힘을 내주느라 쉬어 가는'], ctl: ['수', '계절을 누르느라 힘이 묶이는'], ctlBy: ['사', '계절에 눌려 힘이 약한'] };
  function stateOf2(el, seasonEl) {
    var r = relEl(seasonEl, el), k = r === 'same' ? 'same' : r === 'gen' ? 'genBy' : r === 'genBy' ? 'gen' : r === 'ctl' ? 'ctlBy' : 'ctl';
    return { key: k, name: STATE[k][0], text: STATE[k][1] };
  }

  // 간지 안의 관계(천간 ↔ 지지 본기 오행)
  function pillarRel(sEl, bEl) {
    var r = relEl(bEl, sEl);
    if (r === 'same') return { key: 'same', name: '간지 같은 오행', text: '천간과 지지가 같은 오행이라 그 기운이 순수하고 뚜렷하게 나타나요.' };
    if (r === 'gen') return { key: 'root', name: '지지가 천간을 생함', text: '지지가 천간을 받쳐 줘서 겉으로 드러난 기운에 뿌리가 있는 편이에요.' };
    if (r === 'genBy') return { key: 'down', name: '천간이 지지를 생함', text: '천간의 기운이 지지로 흘러 들어가 겉보다 바탕이 두꺼워지는 결이에요.' };
    if (r === 'ctlBy') return { key: 'gaedu', name: '천간이 지지를 극함(개두)', text: '천간이 지지를 누르는 모양이라 겉의 기운과 바탕의 기운이 엇갈려요.' };
    return { key: 'jeolgak', name: '지지가 천간을 극함(절각)', text: '지지가 천간을 누르는 모양이라 겉으로 드러난 기운이 오래 버티기 어려운 결이에요.' };
  }

  // 운 기둥 하나의 오행 비율(천간 1 + 지지 지장간 일수 비율 1) — 원국 없음
  function mixOf(M, s, b) {
    var v = [0, 0, 0, 0, 0]; v[stemEl(s)] += 1;
    var H = M.HIDDEN[b], tot = H.reduce(function (a, h) { return a + h[1]; }, 0);
    H.forEach(function (h) { v[stemEl(h[0])] += h[1] / tot; });
    return v.map(function (x) { return Math.round(x / 2 * 100); });
  }
  function hiddenOf(M, b) {
    var H = M.HIDDEN[b], tot = H.reduce(function (a, h) { return a + h[1]; }, 0);
    return H.map(function (h) { return { s: h[0], stem: M.STEM[h[0]], el: stemEl(h[0]), pct: Math.round(h[1] / tot * 100) }; }).sort(function (a, b2) { return b2.pct - a.pct; });
  }

  var REL_TEXT = {
    '천간합': function (r) { return '천간끼리 합으로 묶여 ' + elJ(r.el, '쪽으로', '쪽으로') + ' 기울어요'; },
    '천간충': function () { return '천간끼리 부딪쳐 겉으로 드러나는 흔들림이 커져요'; },
    '육합': function (r) { return '지지끼리 합으로 묶여 ' + elJ(r.el, '쪽으로', '쪽으로') + ' 기울어요'; },
    '삼합': function (r) { return '지지 셋이 모여 ' + EL_K[r.el] + ' 기운의 큰 덩어리가 생겨요'; },
    '반합': function (r) { return '지지 둘이 반쯤 모여 ' + EL_K[r.el] + ' 기운이 커져요'; },
    '방합': function (r) { return '같은 계절 지지가 모여 ' + EL_K[r.el] + ' 기운이 커져요'; },
    '충': function () { return '지지끼리 부딪쳐 자리·환경이 바뀌는 움직임이 생겨요'; },
    '형': function () { return '지지끼리 긴장과 마찰이 생기는 결이에요'; },
    '파': function () { return '지지끼리 틈이 생겨 짜임이 흐트러지기 쉬운 결이에요'; },
    '해': function () { return '지지끼리 서로 깎아 먹는 결이에요'; },
    '원진': function () { return '지지끼리 미묘하게 어긋나는 결이에요'; },
    '귀문관': function () { return '지지끼리 예민함이 올라오는 결이에요'; }
  };
  function relText(r) { var f = REL_TEXT[r.type]; return f ? f(r) : r.type; }
  var REL_EL_TEXT = {
    same: function (a, b) { return '같은 ' + EL_K[a] + ' 기운이 이어져요'; },
    gen: function (a, b) { return EL_K[a] + '이 ' + EL_K[b] + '을 생해 주는 흐름이에요'; },
    genBy: function (a, b) { return EL_K[b] + '이 ' + EL_K[a] + '을 생해 주는 흐름이에요'; },
    ctl: function (a, b) { return EL_K[a] + '이 ' + EL_K[b] + '을 누르는 흐름이에요'; },
    ctlBy: function (a, b) { return EL_K[b] + '이 ' + EL_K[a] + '을 누르는 흐름이에요'; }
  };
  function elFlow(a, b) { return REL_EL_TEXT[relEl(a, b)](a, b).replace(/\)이 /g, ')이 ').replace(/\(火\)이/g, '(火)가').replace(/\(土\)이/g, '(土)가').replace(/\(水\)이/g, '(水)가').replace(/\(火\)을/g, '(火)를').replace(/\(土\)을/g, '(土)를').replace(/\(水\)을/g, '(水)를'); }

  // ── 엔진 1: 외부 환경 ──
  // layers: 위에서 아래로 [{level, s, b, label}] (맨 끝이 이번 시기), opt: { prev:{s,b}, next:{s,b}, seasonB }
  function env(M, layers, opt) {
    opt = opt || {};
    var me = layers[layers.length - 1], level = me.level, gz = M.STEM[me.s] + M.BR[me.b];
    var sEl = stemEl(me.s), bEl = M.BR_EL[me.b], hid = hiddenOf(M, me.b);
    var out = {
      version: VERSION, level: level, levelK: LEVEL_K[level], gz: gz,
      stem: { ch: M.STEM[me.s], el: sEl, elK: EL_K[sEl], yang: me.s % 2 === 0, quality: EL_Q[sEl] },
      branch: { ch: M.BR[me.b], el: bEl, elK: EL_K[bEl], yang: me.b % 2 === 0, hidden: hid },
      mix: mixOf(M, me.s, me.b), pillar: pillarRel(sEl, bEl), season: null, upper: [], prev: null, next: null
    };
    var SK = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'], BK = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
    out.stem.text = '천간 ' + josa(M.STEM[me.s] + '(' + SK[me.s] + ')', '은', '는') + ' ' + (out.stem.yang ? '양' : '음') + '의 ' + EL_K[sEl] + ' — ' + EL_Q[sEl] + ' 기운이 겉으로 드러나요.';
    out.branch.text = '지지 ' + josa(M.BR[me.b] + '(' + BK[me.b] + ')', '은', '는') + ' ' + EL_K[bEl] + ' 바탕이고, 안에 ' + hid.map(function (h) { return h.stem + '(' + EL_S[h.el] + ') ' + h.pct + '%'; }).join(' · ') + '가 들어 있어요.';
    // 계절(월운은 그 달의 월지, 일진은 그날이 든 달의 월지) — 대운·세운은 계절 단위가 아니라 넣지 않는다
    var sb = level === 'wolun' ? me.b : level === 'ilun' ? opt.seasonB : null;
    if (sb != null) {
      var se = M.BR_EL[sb], st = stateOf2(sEl, se), bt = stateOf2(bEl, se);
      out.season = {
        b: sb, br: M.BR[sb], name: SEASON[sb], el: se, elK: EL_K[se], climate: CLIMATE[sb], stemState: st, branchState: bt,
        text: M.BR[sb] + '월은 ' + CLIMATE[sb] + ' 때예요(월령 ' + EL_K[se] + '). ' + (level === 'ilun' ? '이날 ' : '이달 ') + '천간 ' + EL_S[sEl] + ' 기운은 ' + st.name + '(' + st.text + ' 상태)' + (bEl !== sEl ? ', 지지 ' + EL_S[bEl] + ' 기운은 ' + bt.name + '(' + bt.text + ' 상태)' : '') + '예요.'
      };
    }
    // 상위 운과의 관계(간지끼리, 원국 없음)
    var ups = layers.slice(0, -1);
    if (ups.length) {
      var items = layers.map(function (l) { return { id: l.level, s: l.s, b: l.b }; });
      var rels = (M.relationsAmong(items) || []).filter(function (r) { return r.members.indexOf(level) >= 0; });
      ups.slice().reverse().forEach(function (u) {
        var rs = rels.filter(function (r) { return r.members.indexOf(u.level) >= 0 && r.members.length === 2; });
        var ue = stemEl(u.s);
        out.upper.push({
          level: u.level, levelK: LEVEL_K[u.level], gz: M.STEM[u.s] + M.BR[u.b],
          stemFlow: elFlow(ue, sEl), rels: rs.map(function (r) { return { type: r.type, name: r.name, el: r.el, text: relText(r) }; })
        });
      });
      var tri = rels.filter(function (r) { return r.members.length >= 3; });
      if (tri.length) out.upperGroup = tri.map(function (r) { return { type: r.type, name: r.name, el: r.el, text: relText(r) }; });
    }
    // 앞뒤 시기
    function cmp(o, dir) {
      if (!o || o.s == null) return null;
      var a = dir === 'prev' ? o : me, b = dir === 'prev' ? me : o;
      var rs = (M.relationsAmong([{ id: 'a', s: a.s, b: a.b }, { id: 'b', s: b.s, b: b.b }]) || []).map(function (r) { return { type: r.type, name: r.name, el: r.el, text: relText(r) }; });
      var ag = M.STEM[a.s] + M.BR[a.b], bg = M.STEM[b.s] + M.BR[b.b], ae = stemEl(a.s), be = stemEl(b.s);
      return { gz: dir === 'prev' ? ag : bg, stemFlow: elFlow(ae, be), sameStemEl: ae === be, sameBranchEl: M.BR_EL[a.b] === M.BR_EL[b.b], rels: rs,
        text: ag + ' → ' + bg + ': 천간은 ' + (ae === be ? '같은 ' + EL_K[ae] + ' 기운이 이어져요' : EL_K[ae] + '에서 ' + ro(EL_K[be]) + ' 넘어가요. ' + elFlow(ae, be)) + '. 지지는 ' + (M.BR_EL[a.b] === M.BR_EL[b.b] ? '같은 ' + EL_K[M.BR_EL[b.b]] + ' 기운이 이어져요' : EL_K[M.BR_EL[a.b]] + '에서 ' + ro(EL_K[M.BR_EL[b.b]]) + ' 바뀌어요') + '.' + (rs.length ? ' 두 시기 사이에 ' + rs.map(function (r) { return r.name; }).join(', ') + ' 관계가 걸려요.' : '') };
    }
    out.prev = cmp(opt.prev, 'prev'); out.next = cmp(opt.next, 'next');
    out.summary = gz + ' ' + LEVEL_K[level] + '은 ' + (sEl === bEl ? '겉과 바탕이 모두 ' + EL_K[sEl] + ' 기운인 ' : EL_K[sEl] + ' 기운이 겉에, ' + EL_K[bEl] + ' 기운이 바탕에 깔린 ') + UNIT_IS[level] + '. ' + EL_ENV[sEl];
    out.note = '이 칸은 모두에게 같은 그 시기의 간지·오행·계절만 봐요. 좋고 나쁨은 원국에 따라 달라서 아래 개인 칸에서 따로 봐요. 오행이 실제 사건을 정한다는 뜻은 아니에요.';
    out.noTenGod = '십성은 일간이 있어야 정해져서 이 칸에는 넣지 않았어요.';
    return out;
  }

  // ── 원국 역할(통합 용신) → 방향 ──
  var ROLE_V = { '용신': 2, '희신': 1, '한신': 0, '중립': 0, '구신': -1, '기신': -2 };
  function roleOf(ch, el) { return (ch.unified && ch.unified.roles && ch.unified.roles[el]) || '중립'; }
  // 운 기둥 하나의 방향: 천간 1 + 지지 지장간 일수 비율 1로 오행을 나눠 각 오행의 통합 용신 역할 값을 더한다(지장간 속 용신·기신까지 반영 — 겹쳐 보기와 같은 셈)
  function sideOf(ch, s, b, M) {
    var vec = [0, 0, 0, 0, 0]; vec[stemEl(s)] += 1; var H = M.HIDDEN[b], tot = H.reduce(function (a, h) { return a + h[1]; }, 0); H.forEach(function (h) { vec[stemEl(h[0])] += h[1] / tot; });
    var v = vec.reduce(function (a, w, e) { return a + w * (ROLE_V[roleOf(ch, e)] || 0); }, 0); v = Math.round(v * 100) / 100;
    return { v: v, side: v >= 1.5 ? 'good' : v <= -1.5 ? 'bad' : v >= 0.5 ? 'lean-good' : v <= -0.5 ? 'lean-bad' : 'mid' };
  }
  var SIDE_K = { good: '도움 쪽', 'lean-good': '조금 도움 쪽', mid: '중간', 'lean-bad': '조금 부담 쪽', bad: '부담 쪽', mixed: '도움·부담 섞임' };
  var TONE_SIDE = { good: 'good', bad: 'bad', mixed: 'mixed', flat: 'mid' };   // 겹쳐 보기(luck-overlay explain) 층 판정 → 방향
  var sgn = function (s) { return /good/.test(s) ? 1 : /bad/.test(s) ? -1 : 0; };

  // 상위 운과 하위 운의 방향 비교(원국 역할 기준) — 위가 아래를 정하지 않는다
  // opt.tones: { daeun:'good'|'bad'|'mixed'|'flat', … } — 겹쳐 보기 층 판정이 있으면 그 값을 써서 두 상자가 엇갈리지 않게 한다
  function hierarchy(M, ch, layers, opt) {
    var tones = opt && opt.tones || null;
    if (!layers || layers.length < 2) return null;
    var rows = layers.map(function (l) { var sd = sideOf(ch, l.s, l.b, M); if (tones && TONE_SIDE[tones[l.level]]) sd = { v: sd.v, side: TONE_SIDE[tones[l.level]] }; return { level: l.level, levelK: LEVEL_K[l.level], gz: M.STEM[l.s] + M.BR[l.b], side: sd.side, sideK: SIDE_K[sd.side], v: sd.v, stemRole: roleOf(ch, stemEl(l.s)), branchRole: roleOf(ch, M.BR_EL[l.b]) }; });
    var me = rows[rows.length - 1], up = rows[rows.length - 2], a = sgn(up.side), b = sgn(me.side), text;
    var unit = { seun: '올해', wolun: '이달', ilun: '오늘' }[me.level] || '이번 시기', unitT = { seun: '올해는', wolun: '이달은', ilun: '오늘은' }[me.level] || '이번 시기는', unitS = { seun: '올해가', wolun: '이달이', ilun: '오늘이' }[me.level] || '이번 시기가';
    if (a === b && a !== 0) text = up.levelK + '와 ' + me.levelK + '가 같은 ' + (a > 0 ? '도움' : '부담') + ' 방향이라 흐름이 겹쳐서 더 또렷하게 느껴져요.';
    else if (a > 0 && b < 0) text = '큰 배경(' + up.levelK + ')은 받쳐 주는데 ' + unitT + ' 부담 쪽이에요. 배경이 버팀목이 돼 주니 ' + unit + '의 부담은 넘길 여지가 있어요.';
    else if (a < 0 && b > 0) text = '큰 배경(' + up.levelK + ')은 무거운데 ' + unitT + ' 도움 쪽이에요. 반짝 열리는 틈이라 크게 벌이기보다 필요한 것부터 챙기는 데 쓰기 좋아요.';
    else if (a === 0 && b !== 0) text = '큰 배경(' + up.levelK + ')은 중간이고 ' + unitS + ' ' + (b > 0 ? '도움' : '부담') + ' 쪽이라, 이번 변화는 ' + me.levelK + '의 몫이 커요.';
    else if (a !== 0 && b === 0) text = unitT + ' 중간이라 큰 배경(' + up.levelK + ')의 ' + (a > 0 ? '도움' : '부담') + ' 방향이 그대로 이어져요.';
    else text = '두 층 모두 중간이라 뚜렷하게 기우는 쪽이 없어요.';
    text = text.replace(/대운와/g, '대운과').replace(/세운와/g, '세운과').replace(/월운와/g, '월운과').replace(/일진와/g, '일진과').replace(/일진가/g, '일진이').replace(/대운가/g, '대운이').replace(/세운가/g, '세운이').replace(/월운가/g, '월운이');
    return { rows: rows, text: text, differ: a !== b, note: '방향은 천간·지지 오행의 통합 용신 역할로만 본 거예요. 실제 흐름 점수는 합충·구조까지 더한 값이라 조금 다를 수 있어요.' };
  }

  // ── 앞뒤 시기 찾기(엔진 함수만 사용) ──
  function neighbors(M, ch, x, kind) {
    var prev = null, next = null;
    try {
      if (kind === 'daeun') { var L = ch.daeun.list, i = L.indexOf(x); if (i < 0) L.forEach(function (d, k) { if (d.startMs === x.startMs) i = k; }); prev = i > 0 ? L[i - 1] : null; next = i >= 0 && i < L.length - 1 ? L[i + 1] : null; }
      else if (kind === 'seun') { prev = M.seunRange(ch, x.year - 1, x.year - 1)[0] || null; next = M.seunRange(ch, x.year + 1, x.year + 1)[0] || null; }
      else if (kind === 'wolun') {
        var sy = M.yearPillarAt(x.startMs + 86400000).sajuYear, all = M.wolun(ch, sy - 1).concat(M.wolun(ch, sy), M.wolun(ch, sy + 1)), j = -1;
        all.forEach(function (m, k) { if (m.startMs === x.startMs) j = k; }); if (j >= 0) { prev = all[j - 1] || null; next = all[j + 1] || null; }
      } else if (kind === 'ilun') {
        var d = x.date, t = Date.UTC(d[0], d[1] - 1, d[2]);
        var day = function (ms) { var D = new Date(ms), y = D.getUTCFullYear(), m = D.getUTCMonth() + 1, dd = D.getUTCDate(); return (M.ilun(ch, y, m) || []).filter(function (it) { return it.date && it.date[2] === dd; })[0] || null; };
        prev = day(t - 86400000); next = day(t + 86400000);
      }
    } catch (e) { }
    return { prev: prev, next: next };
  }

  // ── 전환기 판정(개인) ──
  var TG_GROUP = { '비견': '비겁', '겁재': '비겁', '식신': '식상', '상관': '식상', '편재': '재성', '정재': '재성', '편관': '관성', '정관': '관성', '편인': '인성', '정인': '인성' };
  // prevLayers/curLayers 는 ten-god-roles 구조 비교용(없으면 생략)
  function transition(M, ch, prevX, x, kind, opt) {
    opt = opt || {};
    if (!prevX || !x || prevX.s == null) return null;
    var sig = [], add = function (w, text, key) { sig.push({ w: w, text: text, key: key }); };
    var ps = stemEl(prevX.s), cs = stemEl(x.s), pb = M.BR_EL[prevX.b], cb = M.BR_EL[x.b];
    var flip = function (a, b) { var x1 = sgn(ROLE_V[a] > 0 ? 'good' : ROLE_V[a] < 0 ? 'bad' : 'mid'), x2 = sgn(ROLE_V[b] > 0 ? 'good' : ROLE_V[b] < 0 ? 'bad' : 'mid'); return x1 !== x2 && (x1 !== 0 || x2 !== 0) ? (x1 * x2 < 0 ? 2 : 1) : 0; };
    var rs0 = roleOf(ch, ps), rs1 = roleOf(ch, cs), rb0 = roleOf(ch, pb), rb1 = roleOf(ch, cb);
    var f1 = flip(rs0, rs1), f2 = flip(rb0, rb1), dirK = function (r) { return ROLE_V[r] > 0 ? '도움 쪽' : ROLE_V[r] < 0 ? '부담 쪽' : '중간'; };
    if (f1) add(f1, '천간 기운이 ' + EL_S[ps] + '(' + rs0 + ')에서 ' + ro(EL_S[cs] + '(' + rs1 + ')') + ' 바뀌어, 원국에서 맡는 역할이 ' + dirK(rs0) + '에서 ' + ro(dirK(rs1)) + ' ' + (f1 === 2 ? '뒤집혀요' : '옮겨 가요') + '.', 'stemRole');
    if (f2) add(f2, '지지 기운이 ' + EL_S[pb] + '(' + rb0 + ')에서 ' + ro(EL_S[cb] + '(' + rb1 + ')') + ' 바뀌어, 바탕 역할이 ' + dirK(rb0) + '에서 ' + ro(dirK(rb1)) + ' ' + (f2 === 2 ? '뒤집혀요' : '옮겨 가요') + '.', 'branchRole');
    var g0 = TG_GROUP[prevX.stemTG], g1 = TG_GROUP[x.stemTG];
    if (g0 && g1 && g0 !== g1) add(0.5, '천간 십성이 ' + g0 + '(' + prevX.stemTG + ')에서 ' + ro(g1 + '(' + x.stemTG + ')') + ' 바뀌어 주로 쓰이는 기운의 종류가 달라져요.', 'tg');
    var f0 = prevX.ev && prevX.ev.fitScore, fc = x.ev && x.ev.fitScore;
    var TH = { daeun: [30, 15], seun: [30, 15], wolun: [35, 20], ilun: [45, 25] }[kind] || [30, 15];
    if (f0 != null && fc != null) { var d = fc - f0; if (Math.abs(d) >= TH[0]) add(2, '흐름 점수가 ' + Math.round(f0) + '에서 ' + Math.round(fc) + '까지 크게 ' + (d > 0 ? '올라가요' : '내려가요') + '.', 'fit'); else if (Math.abs(d) >= TH[1]) add(1, '흐름 점수가 ' + Math.round(f0) + '에서 ' + Math.round(fc) + '까지 ' + (d > 0 ? '올라가요' : '내려가요') + '.', 'fit'); }
    // 원국 일지·월지와 새로 생기는 충·합
    var P = ch.pillars, natal = [{ id: 'day', b: P.day.b }, { id: 'month', b: P.month.b }], NK = { day: '일지', month: '월지' };
    var relN = function (it) { return (M.relationsAmong(natal.concat([{ id: 'luck', b: it.b }])) || []).filter(function (r) { return r.members.indexOf('luck') >= 0 && /^(충|육합|형)$/.test(r.type); }).map(function (r) { var who = r.members.filter(function (m) { return m !== 'luck'; })[0]; return { key: r.type + who, text: NK[who] + ' ' + r.name }; }); };
    var n0 = relN(prevX).map(function (r) { return r.key; }), n1 = relN(x), fresh = n1.filter(function (r) { return n0.indexOf(r.key) < 0; });
    // 일지·월지가 같은 글자면 같은 관계가 두 번 잡혀서 이름별로 묶는다
    var byName = {}; fresh.forEach(function (r) { var nm = r.text.replace(/^(일지|월지) /, ''), who = r.text.slice(0, 2); (byName[nm] = byName[nm] || []).push(who); });
    Object.keys(byName).slice(0, 2).forEach(function (nm) { var w = byName[nm]; add(w.indexOf('일지') >= 0 && kind !== 'ilun' ? 2 : 1, '원국 ' + w.join('·') + '와 ' + nm + ' 관계가 새로 생겨 생활 기반이 움직이는 신호예요.', 'natal'); });
    // 십성 구조(ten-god-roles) 변화
    var TG = root.MantraTenGodRoles;
    if (TG && opt.prevLayers && opt.curLayers) {
      try {
        var on = function (layers) { var r = TG.luck(M, ch, layers), L = r.layers[r.layers.length - 1], m = {}; (L.B.changes || []).forEach(function (c) { m[c.name] = c.to; }); return m; };
        var a = on(opt.prevLayers), b = on(opt.curLayers), names = {}; Object.keys(a).concat(Object.keys(b)).forEach(function (k) { names[k] = 1; });
        var moved = Object.keys(names).filter(function (k) { return (a[k] === 'on') !== (b[k] === 'on'); });
        moved.slice(0, 2).forEach(function (k) { add(1, '십성 구조 ' + josa(k, '이', '가') + ' ' + (b[k] === 'on' ? '새로 서요' : '풀려요') + '.', 'tgr'); });
      } catch (e) { }
    }
    var score = sig.reduce(function (a, s) { return a + s.w; }, 0);
    var core = sig.some(function (q) { return q.w >= 2 && /stemRole|branchRole|natal/.test(q.key); });
    var cut = kind === 'ilun' ? [6, 4] : [5, 3];   // 하루 단위는 교체가 잦아 문턱을 한 칸 올린다
    var level = score >= cut[0] && core ? 'high' : score >= cut[1] ? 'mid' : 'low';
    var pg = M.STEM[prevX.s] + M.BR[prevX.b], cg = M.STEM[x.s] + M.BR[x.b];
    var text = level === 'high' ? pg + ' → ' + cg + ': 원국과 맞물리는 구조가 바뀌는 전환기예요.'
      : level === 'mid' ? pg + ' → ' + cg + ': 흐름이 한 번 바뀌는 지점이에요.'
      : pg + ' → ' + cg + ': 평소 수준의 교체예요. 따로 크게 볼 구조 변화는 적어요.';
    return { level: level, levelK: { high: '큰 전환', mid: '눈에 띄는 변화', low: '평소 교체' }[level], score: score, signals: sig.sort(function (p, q) { return q.w - p.w; }), prevGz: pg, gz: cg, kind: kind, text: text };
  }

  var api = { version: VERSION, LEVEL_K: LEVEL_K, EL_Q: EL_Q, relEl: relEl, mixOf: mixOf, stateOf: stateOf2, pillarRel: pillarRel, env: env, hierarchy: hierarchy, neighbors: neighbors, transition: transition };
  root.MantraLuckEnv = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
