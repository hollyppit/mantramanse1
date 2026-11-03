/* 건강 측면 참고: 사주 원국과 운(대운·세운·월운·일진)의 오행으로 "어느 장부·부위가 상대적으로 약해지거나 쏠리기 쉬운가"를 전통 오행-장부 대응으로 읽는다.
   MantraHealthBody.read(M, ch, x)  — x는 M.luckItem 계열(세운·월운·일진·대운) 한 칸. 원국과 x를 읽기만 하고 아무것도 바꾸지 않는다. AI·네트워크 호출 없음.
   규칙(점수는 순위를 가르는 내부 값이며 화면에는 '주의'/'참고' 두 단계로만 표시)
     원국: 오행 비율이 아주 적으면(≤8%) 약하기 쉬운 장부, 아주 많으면(≥32%) 과해지기 쉬운 장부. 조열·한습·습·건조가 뚜렷하면 해당 장부를 함께 본다.
     운: ① 이미 많은 오행을 운이 더하면 쏠림 ② 억부상 기신·구신인 오행 ③ 운의 글자가 원국 글자와 충·형·파·해·원진을 이루면 그 글자의 오행 ④ 운이 원국의 적은 오행을 극하면 더 약해짐. 운이 원국의 적은 오행을 채우면 도움으로 따로 표시.
   의학적 진단·예측이 아니며 전통 해석을 참고용으로 서술한다. */
(function (G) {
  'use strict';
  var VERSION = 'health-body-1.0';
  var EL = ['목', '화', '토', '금', '수'], HJ = ['木', '火', '土', '金', '水'];
  var PART = [
    { organ: '간·담', body: '눈, 근육·힘줄, 손발톱, 신경(두통·목어깨 뻣뻣함)' },
    { organ: '심장·소장', body: '혈관·혈압, 얼굴·혀, 수면과 신경 흥분(가슴 두근거림)' },
    { organ: '비장·위', body: '소화기, 입, 살과 근육, 복부' },
    { organ: '폐·대장', body: '호흡기(코·기관지), 피부, 장' },
    { organ: '신장·방광', body: '비뇨·생식기, 허리·무릎·뼈, 귀, 몸의 냉기' }
  ];
  var POS = { year: '년주(전통적으로 머리·얼굴에 대응)', month: '월주(가슴·어깨)', day: '일주(복부·허리)', hour: '시주(하체)' };
  var KIND = { daeun: '대운', seun: '세운', wolun: '월운', ilun: '일진' };
  var CAUTION = '건강 측면은 오행의 쏠림을 전통 방식으로 읽은 참고 해석이며 질병의 진단이나 발생 가능성을 뜻하지 않습니다. 몸에 불편이 있으면 해석과 상관없이 의료기관에서 상담하세요.';
  var nm = function (i) { return EL[i] + '(' + HJ[i] + ')'; };
  var cache = typeof WeakMap !== 'undefined' ? new WeakMap() : null;

  function natalBase(M, ch) {
    var pct = ch.weights.pct, sc = [0, 0, 0, 0, 0], why = [[], [], [], [], []], cl = ch.climate || {}, T = cl.temp || 0, H = cl.hum || 0;
    for (var e = 0; e < 5; e++) {
      var p = pct[e];
      if (p <= 8) { sc[e] += p === 0 ? 1.6 : 1.2; why[e].push('원국에 ' + nm(e) + ' 기운이 ' + (p === 0 ? '없어' : Math.round(p * 10) / 10 + '%로 적어') + ' ' + PART[e].organ + ' 쪽이 평소 약하기 쉬운 편으로 읽습니다.'); }
      else if (p >= 32) { sc[e] += 1.0; why[e].push('원국에 ' + nm(e) + ' 기운이 ' + Math.round(p * 10) / 10 + '%로 많아 ' + PART[e].organ + ' 쪽이 평소 과해지기 쉬운 편입니다.'); }
    }
    if (T >= 0.5) { sc[1] += 0.8; sc[4] += 0.8; why[1].push('원국이 조열해 열이 오르기 쉽습니다.'); why[4].push('원국이 조열해 진액이 마르기 쉬워 신장·방광 쪽을 함께 봅니다.'); }
    if (T <= -0.5) { sc[4] += 0.8; sc[2] += 0.5; why[4].push('원국이 한랭해 몸이 차가워지기 쉬워 신장·방광 쪽을 함께 봅니다.'); why[2].push('원국이 한랭해 소화기가 차가워지기 쉽습니다.'); }
    if (H >= 0.5) { sc[2] += 0.6; sc[4] += 0.4; why[2].push('원국이 습해 비장·위 쪽에 수분이 정체되기 쉽습니다.'); }
    if (H <= -0.5) { sc[3] += 0.8; why[3].push('원국이 건조해 폐·피부 쪽이 마르기 쉽습니다.'); }
    return { sc: sc, why: why, pct: pct };
  }
  function natalOf(M, ch) { if (cache && cache.has(ch)) return cache.get(ch); var b = natalBase(M, ch); if (cache) cache.set(ch, b); return b; }

  function luckEls(M, x) { var s = M.stemEl(x.s), b = M.BR_EL[x.b]; return { s: s, b: b }; }

  function read(M, ch, x, kind) {
    var nb = natalOf(M, ch), sc = nb.sc.slice(), why = nb.why.map(function (a) { return a.slice(); }), pct = nb.pct, relief = [], L = luckEls(M, x), roles = ch.yongAll && ch.yongAll.eokbu && ch.yongAll.eokbu.roles || {};
    var label = KIND[kind] || '이 시기', lz = HJ[L.s] + HJ[L.b], seen = {};
    // ① 많은 오행을 더함 ④ 적은 오행을 극함 / 채움 (천간·지지가 같은 결과를 내면 한 문장으로 합친다)
    var adds = {}, ctls = {}, fills = {}, padd = [0, 0, 0, 0, 0];
    [L.s, L.b].forEach(function (le, k) {
      var which = k === 0 ? '천간' : '지지';
      for (var e = 0; e < 5; e++) {
        if (le === e && pct[e] >= 32) (adds[e] = adds[e] || []).push(which);
        if (le === e && pct[e] <= 8) (fills[e] = fills[e] || []).push(which);
        if ((e + 3) % 5 === le && pct[e] <= 8) (ctls[e + ':' + le] = ctls[e + ':' + le] || []).push(which);
      }
    });
    Object.keys(adds).forEach(function (e) { e = +e; sc[e] += 1.2; padd[e] += 1.2; why[e].push(label + '의 ' + adds[e].join('·') + ' ' + nm(e) + ' 기운이 이미 많은 ' + EL[e] + '을 더해 ' + PART[e].organ + ' 쪽 쏠림이 커집니다.'); });
    Object.keys(fills).forEach(function (e) { e = +e; sc[e] -= 0.8; relief.push(label + '의 ' + fills[e].join('·') + ' ' + nm(e) + ' 기운이 원국에서 모자란 ' + EL[e] + '을 채워 ' + PART[e].organ + ' 쪽에는 도움이 되는 흐름입니다.'); });
    Object.keys(ctls).forEach(function (key) { var p = key.split(':'), e = +p[0], le = +p[1]; sc[e] += 1.0; padd[e] += 1.0; why[e].push(label + '의 ' + ctls[key].join('·') + ' ' + nm(le) + ' 기운이 원국에서 적은 ' + EL[e] + '을 극해 ' + PART[e].organ + ' 쪽이 더 약해지기 쉽습니다.'); });
    // ② 억부상 기신·구신 오행
    var burdenDone = {};
    [L.s, L.b].forEach(function (le) {
      var r = roles[le]; if ((r === '기신' || r === '구신') && !burdenDone[le]) { burdenDone[le] = 1; sc[le] += r === '기신' ? 1.0 : 0.6; padd[le] += r === '기신' ? 1.0 : 0.6; why[le].push(label + '의 ' + nm(le) + ' 기운은 억부 기준 ' + r + '이라 ' + PART[le].organ + ' 쪽에 부담으로 읽습니다.'); }
    });
    // ③ 원국과의 충·형·파·해·원진 (같은 오행에 걸린 관계는 한 문장으로 합친다)
    var hit = [0, 0, 0, 0, 0], hits = [[], [], [], [], []];
    try {
      var rl = M.luckRelations(ch, { s: x.s, b: x.b }).rels || [];
      rl.forEach(function (r) {
        var t = r.type || ''; var w = /충/.test(t) ? 1.5 : /형/.test(t) ? 1.0 : /(파|해|원진)/.test(t) ? 0.5 : 0; if (!w) return;
        var pos = (r.members || []).filter(function (m) { return m !== 'luck'; })[0]; if (!pos || !ch.pillars[pos]) return;
        var el = r.kind === 'stem' ? M.stemEl(ch.pillars[pos].s) : M.BR_EL[ch.pillars[pos].b], key = el + ':' + t + ':' + pos; if (seen[key]) return; seen[key] = 1;
        if (hit[el] + w > 2.5) w = Math.max(0, 2.5 - hit[el]); if (!w) return; hit[el] += w; sc[el] += w; padd[el] += w;
        hits[el].push(POS[pos] + '와 ' + r.name);
      });
      for (var h = 0; h < 5; h++) if (hits[h].length) why[h].push(label + '의 ' + lz + ' 글자가 원국 ' + hits[h].join(', ') + ' 관계를 이뤄 ' + nm(h) + '에 해당하는 ' + PART[h].organ + ' 쪽이 흔들리기 쉬운 때로 읽습니다.');
    } catch (e) { }
    var items = [];
    for (var e2 = 0; e2 < 5; e2++) if (sc[e2] >= 1.5 && padd[e2] >= 0.5) items.push({ el: e2, elName: EL[e2], hanja: HJ[e2], organ: PART[e2].organ, body: PART[e2].body, level: sc[e2] >= 2.5 ? '주의' : '참고', score: Math.round(sc[e2] * 10) / 10, reasons: why[e2].slice(0, 4) });
    items.sort(function (a, b) { return b.score - a.score || a.el - b.el; });
    items = items.slice(0, 3);
    var summary = items.length ? label + '에는 ' + items.map(function (i) { return i.organ; }).join('·') + ' 쪽을 평소보다 살펴보면 좋은 흐름으로 읽습니다.' : label + '에는 특정 장부로 뚜렷하게 쏠리는 신호가 없어 무난한 흐름으로 읽습니다.';
    return { version: VERSION, kind: kind || null, luck: lz, items: items, relief: relief.slice(0, 2), summary: summary, natal: natalLines(M, ch), caution: CAUTION };
  }
  function natalLines(M, ch) {
    var nb = natalOf(M, ch), out = [];
    for (var e = 0; e < 5; e++) if (nb.sc[e] >= 1.0 && nb.why[e].length) out.push(nb.why[e][0]);
    return out.slice(0, 3);
  }
  G.MantraHealthBody = { VERSION: VERSION, read: read, PART: PART, CAUTION: CAUTION };
})(typeof window !== 'undefined' ? window : globalThis);
