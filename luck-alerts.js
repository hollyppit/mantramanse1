/* 뚜렷한 신호 자동 알림(2026-11-18) — 분야별로 '이 사람 기준' 특별히 좋은 날·안 좋은 날을 찾아 상단에 띄운다. 표시 전용
 *  · 점수: 엔진 M.evaluateDomainLuck(일진·월운) 그대로. 새 점수를 만들지 않는다.
 *  · 기준선: 그 사람의 일진 점수 2년치(오늘 ±1년)·월운 10년치 분포. 사람마다 평소 수준이 달라서 같은 점수라도 뜻이 다르다.
 *  · 뚜렷한 신호 = 그 사람 분포에서 상위·하위 1%(월운은 5%) **이면서** 신호등 단계가 최고·부담(MantraTLGraph SIG_CUTS)일 때만.
 *    매일 바뀌는 작은 오르내림은 알리지 않는다. 같은 분야는 가장 뚜렷한 하루만, 전체는 최대 opt.max 개.
 *  · 말투: 사건을 정하지 않는다("~할 수 있는 날", "신호가 뚜렷해요"). 금지: 반드시·무조건·확정 등.
 *  브라우저: window.MantraLuckAlerts · Node: module.exports  (먼저 engine.js, report/hub/timeline-graph.js 가 있어야 한다)
 */
(function (root) {
  'use strict';
  var VERSION = 'luck-alerts-2026-11-18';
  var NAME = { love: '인연', wealth: '재물', career: '직업', health: '건강', job: '취업', business: '사업', family: '가족', child: '자녀', marriage: '결혼', windfall: '횡재수', windfallLoss: '손재수' };
  // 화면별 분야(타임라인은 넓게 4개, 만세력은 세분화)
  var SETS = { timeline: ['love', 'wealth', 'career', 'health'], manse: ['love', 'wealth', 'career', 'business', 'job', 'family', 'child', 'windfall', 'windfallLoss'] };
  var ONE_SIDED = { windfall: 'good', windfallLoss: 'bad' };   // 횡재수는 좋은 신호만, 손재수는 나쁜 신호만 알린다
  var GOOD_LINE = { love: '사람과 마음이 잘 닿는 흐름이 또렷해요.', wealth: '돈의 흐름이 살아나고 지키기도 좋은 신호가 또렷해요.', career: '일에서 실력이 드러나기 좋은 신호가 또렷해요.', health: '몸과 컨디션의 균형이 좋은 쪽으로 또렷해요.', job: '조직·자리와 닿는 신호가 또렷해요.', business: '거래·독립·내 일을 벌이는 신호가 또렷해요.', family: '가족 사이가 부드러워지는 신호가 또렷해요.', child: '자녀 자리가 밝아지는 신호가 또렷해요.', marriage: '결속·약속 쪽 신호가 또렷해요.', windfall: '뜻밖의 수입·기회 신호가 평소보다 크게 올라와요.' };
  var BAD_LINE = { love: '관계에서 오해·마찰이 생기기 쉬운 신호가 또렷해요.', wealth: '돈이 새거나 판단이 흔들리기 쉬운 신호가 또렷해요.', career: '일에서 압박·충돌이 커지기 쉬운 신호가 또렷해요.', health: '몸에 부담이 쌓이기 쉬운 신호가 또렷해요.', job: '조직·자리 쪽이 흔들리기 쉬운 신호가 또렷해요.', business: '거래·계약에서 어긋나기 쉬운 신호가 또렷해요.', family: '가족 사이 말이 엇갈리기 쉬운 신호가 또렷해요.', child: '자녀 자리에 신경 쓸 일이 생기기 쉬운 신호가 또렷해요.', marriage: '약속·결속 쪽이 흔들리기 쉬운 신호가 또렷해요.', windfallLoss: '돈을 나누거나 잃기 쉬운 신호(손재)가 평소보다 크게 올라와요.' };
  var GOOD_DO = { love: '미뤄 둔 연락·만남을 잡기 좋아요.', wealth: '계획해 둔 돈 일을 처리하기 좋아요.', career: '보여 줄 결과물이나 제안을 내기 좋아요.', health: '운동·검진 같은 몸 관리를 시작하기 좋아요.', job: '지원·면접·자리 이야기를 꺼내기 좋아요.', business: '거래처 연락·제안을 넣기 좋아요.', family: '가족과 시간을 내기 좋아요.', child: '아이와 이야기할 시간을 내기 좋아요.', marriage: '중요한 약속을 정하기 좋아요.', windfall: '들어온 돈은 바로 쓰지 말고 따로 떼어 두세요.' };
  var BAD_DO = { love: '감정이 오른 말은 하루 미뤄 보세요.', wealth: '큰 결제·투자·보증은 날을 바꿔 보세요.', career: '중요한 보고·결정은 한 번 더 확인하세요.', health: '무리한 일정은 줄이고 쉬는 시간을 먼저 넣으세요.', job: '서두른 결정보다 조건 확인을 먼저 하세요.', business: '계약서·조건을 한 번 더 확인하세요.', family: '서운한 말은 바로 하기보다 정리해서 전하세요.', child: '아이 일정·안전을 한 번 더 챙겨 보세요.', marriage: '중요한 약속은 날을 바꿔 보세요.', windfallLoss: '빌려주기·보증·충동 결제는 피하세요.' };
  var DOW = ['일', '월', '화', '수', '목', '금', '토'];

  function TGm() { return root.MantraTLGraph; }
  function scoreOf(r, key) { if (!r) return null; if (key === 'windfallLoss') return r.windfall && r.windfall.loss ? r.windfall.loss.score : null; return r[key] ? r[key].score : null; }
  function pieceOf(r, key) { return key === 'windfallLoss' ? (r.windfall && r.windfall.loss) : r[key]; }
  var SIGFN = null;   // 만세력은 자체 sigMetric 을 넘긴다(opt.sigMetric) — 같은 SIG_CUTS
  function sigOf(key, v) { if (SIGFN) return SIGFN(key, v).k; var T = TGm(); return T && T.sigMetric ? T.sigMetric(key, v).k : null; }
  function quant(a, f) { if (!a.length) return null; var s = a.slice().sort(function (x, y) { return x - y; }); return s[Math.max(0, Math.min(s.length - 1, Math.round(f * (s.length - 1))))]; }
  function kst(ms) { var d = new Date(ms + 9 * 3600e3); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), dow: d.getUTCDay() }; }

  // 사람별 기준선(같은 사주는 다시 계산하지 않는다)
  var BASE = {};
  function chartKey(ch) { var P = ch.pillars || {}; return ['year', 'month', 'day', 'hour'].map(function (k) { return P[k] ? P[k].s + '.' + P[k].b : '-'; }).join('|') + '|' + ch.gender + '|' + (ch.daeun && ch.daeun.list.length ? ch.daeun.list[0].startMs : ''); }
  function daysAround(M, ch, ms, back, fwd) {
    var out = [], a = kst(ms - back * 864e5), b = kst(ms + fwd * 864e5), y = a.y, m = a.m;
    while (y < b.y || (y === b.y && m <= b.m)) { try { out = out.concat(M.ilun(ch, y, m) || []); } catch (e) { } m++; if (m > 12) { m = 1; y++; } }
    return out;
  }
  function baseline(M, ch, ms, keys) {
    var k = chartKey(ch) + '|' + kst(ms).y, B = BASE[k];
    if (B && keys.every(function (x) { return B.day[x]; })) return B;
    B = BASE[k] = { day: {}, mon: {} };
    var days = daysAround(M, ch, ms, 365, 365), dv = {}, mv = {};
    keys.forEach(function (x) { dv[x] = []; mv[x] = []; });
    days.forEach(function (x) { var r; try { r = M.evaluateDomainLuck(ch, x, 'ilun', {}); } catch (e) { return; } keys.forEach(function (key) { var v = scoreOf(r, key); if (v != null) dv[key].push(v); }); });
    var y0 = kst(ms).y; for (var y = y0 - 5; y <= y0 + 5; y++) { var ws = []; try { ws = M.wolun(ch, y) || []; } catch (e) { } ws.forEach(function (w) { var r; try { r = M.evaluateDomainLuck(ch, w, 'wolun', { ms: w.startMs + 12 * 864e5 }); } catch (e) { return; } keys.forEach(function (key) { var v = scoreOf(r, key); if (v != null) mv[key].push(v); }); }); }
    keys.forEach(function (key) { B.day[key] = { lo: quant(dv[key], 0.01), hi: quant(dv[key], 0.99), mid: quant(dv[key], 0.5), n: dv[key].length }; B.mon[key] = { lo: quant(mv[key], 0.05), hi: quant(mv[key], 0.95), mid: quant(mv[key], 0.5), n: mv[key].length }; });
    return B;
  }

  // 한 시기의 판정: good/bad/null + 강도(분포 끝을 얼마나 넘었나)
  function judge(key, v, b) {
    if (v == null || !b || b.hi == null) return null;
    var inv = key === 'windfallLoss', sig = sigOf(key, v), side = null, over = 0;
    var top = v >= b.hi && b.hi > b.mid, bottom = v <= b.lo && b.lo < b.mid;
    if (!inv) { if (top && sig === 'best') { side = 'good'; over = v - b.hi; } else if (bottom && sig === 'bad') { side = 'bad'; over = b.lo - v; } }
    else if (top && sig === 'bad') { side = 'bad'; over = v - b.hi; }   // 손재수: 높을수록 나쁨
    if (!side || (ONE_SIDED[key] && ONE_SIDED[key] !== side)) return null;
    return { side: side, strength: Math.round((over + 1 + Math.abs(v - b.mid) / 10) * 10) / 10 };
  }

  function dateLabel(t, now) {
    var a = kst(t), n = kst(now), diff = Math.round((Date.UTC(a.y, a.m - 1, a.d) - Date.UTC(n.y, n.m - 1, n.d)) / 864e5);
    return diff === 0 ? '오늘' : diff === 1 ? '내일' : diff === 2 ? '모레' : a.m + '/' + a.d + '(' + DOW[a.dow] + ')';
  }

  // scan: { set:'timeline'|'manse', keys, now, days:7, max:3 } → [{ key, name, side, level, ms, when, gz, score, line, todo, why, strength }]
  function scan(M, ch, opt) {
    opt = opt || {};
    SIGFN = opt.sigMetric || null;
    if (!M || !ch || !M.evaluateDomainLuck || (!SIGFN && !TGm())) return [];
    var now = opt.now || Date.now(), keys = opt.keys || SETS[opt.set || 'timeline'], span = opt.days || 7, max = opt.max || 3;
    var B = baseline(M, ch, now, keys), found = {};
    var put = function (a) { var cur = found[a.key]; if (!cur || a.strength > cur.strength) found[a.key] = a; };
    // 오늘부터 span 일
    var n = kst(now), days = daysAround(M, ch, now, 0, span).filter(function (x) { var t = Date.UTC(x.date[0], x.date[1] - 1, x.date[2]), t0 = Date.UTC(n.y, n.m - 1, n.d); return t >= t0 && t < t0 + span * 864e5; });
    days.forEach(function (x) {
      var r; try { r = M.evaluateDomainLuck(ch, x, 'ilun', {}); } catch (e) { return; }
      keys.forEach(function (key) {
        var v = scoreOf(r, key), j = judge(key, v, B.day[key]); if (!j) return;
        var p = pieceOf(r, key) || {}, t = Date.UTC(x.date[0], x.date[1] - 1, x.date[2], 3);
        put({ key: key, name: NAME[key] || key, side: j.side, level: 'ilun', ms: t, when: dateLabel(t, now), gz: M.STEM[x.s] + M.BR[x.b], score: v, strength: j.strength + (dateLabel(t, now) === '오늘' ? 1 : 0),
          line: (j.side === 'good' ? GOOD_LINE : BAD_LINE)[key] || '', todo: (j.side === 'good' ? GOOD_DO : BAD_DO)[key] || '', why: (p.reasons || [])[0] || p.summary || '' });
      });
    });
    // 이번 달(월운) — 한 달 내내 이어지는 신호
    try {
      var mo = null; M.wolun(ch, n.y - 1).concat(M.wolun(ch, n.y)).forEach(function (w) { if (w.startMs <= now) mo = w; });
      if (mo) { var rm = M.evaluateDomainLuck(ch, mo, 'wolun', { ms: mo.startMs + 12 * 864e5 });
        keys.forEach(function (key) { var v = scoreOf(rm, key), j = judge(key, v, B.mon[key]); if (!j) return; var p = pieceOf(rm, key) || {};
          put({ key: key, name: NAME[key] || key, side: j.side, level: 'wolun', ms: mo.startMs, when: '이번 달', gz: M.STEM[mo.s] + M.BR[mo.b], score: v, strength: j.strength + 0.5,
            line: (j.side === 'good' ? GOOD_LINE : BAD_LINE)[key] || '', todo: (j.side === 'good' ? GOOD_DO : BAD_DO)[key] || '', why: (p.reasons || [])[0] || p.summary || '' }); }); }
    } catch (e) { }
    var list = Object.keys(found).map(function (k) { return found[k]; }).sort(function (a, b) { return b.strength - a.strength; });
    return list.slice(0, max);
  }

  var api = { version: VERSION, NAME: NAME, SETS: SETS, scan: scan, judge: judge, baseline: baseline, _BASE: BASE };
  root.MantraLuckAlerts = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
