/* 사고수 참고: 운(대운·세운·월운·일진) 한 칸과 사주 원국의 오행·충형·신살로 "어떤 환경에서 어떤 종류의 부주의·부딪힘을 조심하면 좋은가"를 전통 해석으로 서술한다.
   MantraAccidentHint.read(M, ch, x, kind, score)  — score는 앱의 사고수 지수(0~100, 선택). 원국과 x를 읽기만 하고 아무것도 바꾸지 않는다. AI·네트워크 호출 없음.
   장면 7가지: 오행 5(목=높은 곳·넘어짐, 화=불·열·전기, 토=무너짐·낙석·공사장, 금=도로·차량·금속 도구, 수=물·빙판) + 날카로운 도구(양인살·현침살) + 갑작스러운 충격(백호대살·괴강살).
   점수(내부): 운 글자가 원국과 충 1.5·형 1.0·파/해/원진 0.5(걸린 원국 글자의 오행), 이미 많은 오행(≥32%)을 운이 더하면 1.2, 억부 기신 0.6·구신 0.4, 해당 신살 1.0·0.8. 1.5 이상이면 표시, 2.5 이상이면 '주의'.
   장소는 걸린 원국 기둥의 전통 대응(년주=집 밖 먼 곳·이동, 월주=직장·일터, 일주=집과 가까운 생활권, 시주=귀가길·늦은 시간)을 덧붙인다.
   사고 발생·결과를 예측하지 않는 참고 서술이며, 사망·중상 같은 단정 표현은 쓰지 않는다. */
(function (G) {
  'use strict';
  var VERSION = 'accident-hint-1.0';
  var EL = ['목', '화', '토', '금', '수'], HJ = ['木', '火', '土', '金', '水'];
  var SCENE = [
    { key: 'wood', title: '높은 곳·계단·운동 중 넘어짐', where: '계단, 산책로·운동장, 높은 곳', tip: '계단과 높은 곳에서는 서두르지 않고, 운동 전에는 몸을 충분히 풀어 주세요.' },
    { key: 'fire', title: '불·열·전기 관련 부주의', where: '주방, 전열기구·전기 설비 주변, 더운 야외', tip: '가스·전열기구는 쓴 뒤 한 번 더 확인하고, 더운 날 야외 활동은 무리하지 마세요.' },
    { key: 'earth', title: '무너짐·낙석·공사 현장 주변의 부주의', where: '공사장, 산길, 오래된 건물 주변', tip: '공사장이나 낙석 구간은 되도록 피하고, 미끄러운 산길은 무리하지 마세요.' },
    { key: 'metal', title: '도로·차량·금속 도구 관련 부딪힘', where: '도로·주차장, 작업장, 금속 공구·기계 주변', tip: '운전은 속도와 차간 거리를 여유 있게, 공구를 쓸 때는 보호 장비를 챙기세요.' },
    { key: 'water', title: '물·빙판·빗길에서의 미끄러짐', where: '욕실, 빗길·빙판, 물가', tip: '욕실·빗길·빙판에서는 보폭을 줄이고, 물놀이는 안전 수칙을 지키세요.' },
    { key: 'edge', title: '날카로운 것에 베이거나 찔리는 부주의', where: '주방·작업대, 유리·칼·바늘 등을 다루는 곳', tip: '칼·유리·바늘을 다룰 때는 서두르지 말고 손 방향을 확인하세요.' },
    { key: 'sudden', title: '갑작스러운 충격·과격한 행동', where: '붐비는 곳, 격한 운동·레저, 속도를 내는 곳', tip: '급하게 움직이거나 격한 활동을 할 때는 평소보다 한 단계 천천히 하세요.' }
  ];
  var POSW = { year: '집 밖 먼 곳·이동 중', month: '직장·일터', day: '집과 가까운 생활권', hour: '귀가길·늦은 시간' };
  var POSN = { year: '년주', month: '월주', day: '일주', hour: '시주' };
  var KIND = { daeun: '대운', seun: '세운', wolun: '월운', ilun: '일진' };
  var SIN = { '양인살': [5, 1.0], '현침살': [5, 1.0], '백호대살': [6, 1.0], '괴강살': [6, 0.8], '낙정관살': [4, 1.0] };
  var CAUTION = '사고수 서술은 오행의 쏠림과 충·형 신호를 전통 방식으로 읽은 참고 해석이며, 사고가 일어난다는 예측이나 확률이 아닙니다. 평소 안전 수칙을 지키는 것이 가장 중요합니다.';
  var nm = function (i) { return EL[i] + '(' + HJ[i] + ')'; };

  function read(M, ch, x, kind, score) {
    var pct = ch.weights.pct, roles = ch.yongAll && ch.yongAll.eokbu && ch.yongAll.eokbu.roles || {}, label = KIND[kind] || '이 시기', lz = HJ[M.stemEl(x.s)] + HJ[M.BR_EL[x.b]];
    var sc = [0, 0, 0, 0, 0, 0, 0], why = [[], [], [], [], [], [], []], where = [{}, {}, {}, {}, {}, {}, {}], seen = {};
    // 충·형·파·해·원진: 걸린 원국 글자의 오행 장면 + 기둥 위치
    var hit = [0, 0, 0, 0, 0], hits = [[], [], [], [], []];
    try {
      (M.luckRelations(ch, { s: x.s, b: x.b }).rels || []).forEach(function (r) {
        var t = r.type || '', w = /충/.test(t) ? 1.5 : /형/.test(t) ? 1.0 : /(파|해|원진)/.test(t) ? 0.5 : 0; if (!w) return;
        var pos = (r.members || []).filter(function (m) { return m !== 'luck'; })[0]; if (!pos || !ch.pillars[pos]) return;
        var el = r.kind === 'stem' ? M.stemEl(ch.pillars[pos].s) : M.BR_EL[ch.pillars[pos].b], key = el + ':' + t + ':' + pos; if (seen[key]) return; seen[key] = 1;
        if (hit[el] + w > 2.5) w = Math.max(0, 2.5 - hit[el]); if (!w) return; hit[el] += w; sc[el] += w; where[el][pos] = 1;
        hits[el].push(POSN[pos] + '와 ' + r.name);
      });
      for (var h = 0; h < 5; h++) if (hits[h].length) why[h].push(label + '의 ' + lz + ' 글자가 원국 ' + hits[h].join(', ') + ' 관계를 이뤄 ' + nm(h) + ' 기운과 얽힌 장면에서 부딪힘이 생기기 쉬운 신호입니다.');
    } catch (e) { }
    // 이미 많은 오행을 운이 더함 / 억부 기신·구신
    var added = {}, burden = {};
    [M.stemEl(x.s), M.BR_EL[x.b]].forEach(function (le, k) {
      if (pct[le] >= 32) (added[le] = added[le] || []).push(k === 0 ? '천간' : '지지');
      var r = roles[le]; if ((r === '기신' || r === '구신') && !burden[le]) burden[le] = r;
    });
    Object.keys(added).forEach(function (e) { e = +e; sc[e] += 1.2; why[e].push(label + '의 ' + added[e].join('·') + ' ' + nm(e) + ' 기운이 이미 많은 ' + EL[e] + '을 더해 이 오행의 장면에서 과해지기 쉽습니다.'); });
    Object.keys(burden).forEach(function (e) { e = +e; sc[e] += burden[e] === '기신' ? 0.6 : 0.4; why[e].push(label + '의 ' + nm(e) + ' 기운은 억부 기준 ' + burden[e] + '이라 이 장면에서 부담이 커지기 쉽습니다.'); });
    // 신살
    try {
      (M.luckRelations(ch, { s: x.s, b: x.b }).sinsal || []).forEach(function (s) {
        var m = SIN[s.name]; if (!m || s.good) return; sc[m[0]] += m[1]; why[m[0]].push(label + '에 ' + s.name + '(' + s.basis + ')이 걸려 있어 ‘' + SCENE[m[0]].title + '’ 장면에 주의를 두라는 전통 신호가 있습니다.');
      });
    } catch (e) { }
    var items = [];
    for (var i = 0; i < 7; i++) if (sc[i] >= 1.5) {
      var ps = Object.keys(where[i]), pl = ps.length ? ps.map(function (p) { return POSN[p] + '(' + POSW[p] + ')'; }).join(', ') : '';
      items.push({ key: SCENE[i].key, title: SCENE[i].title, where: SCENE[i].where, position: pl, level: sc[i] >= 2.5 ? '주의' : '참고', score: Math.round(sc[i] * 10) / 10, reasons: why[i].slice(0, 4), tip: SCENE[i].tip });
    }
    items.sort(function (a, b) { return b.score - a.score; }); items = items.slice(0, 3);
    var sLv = score == null ? null : score >= 66 ? '높은 편' : score >= 45 ? '보통' : '낮은 편';
    var summary = items.length ? label + '에는 다음 장면을 평소보다 조심하면 좋은 흐름으로 읽습니다: ' + items.map(function (t) { return t.title; }).join(' · ') + '.' + (sLv ? ' (사고수 지수 ' + score + ' · ' + sLv + ')' : '') : label + '에는 특정 장면으로 뚜렷하게 모이는 신호가 없어 일상적인 안전 수칙 정도로 충분한 흐름으로 읽습니다.' + (sLv ? ' (사고수 지수 ' + score + ' · ' + sLv + ')' : '');
    return { version: VERSION, kind: kind || null, luck: lz, items: items, summary: summary, caution: CAUTION };
  }
  G.MantraAccidentHint = { VERSION: VERSION, read: read, SCENE: SCENE, CAUTION: CAUTION };
})(typeof window !== 'undefined' ? window : globalThis);
