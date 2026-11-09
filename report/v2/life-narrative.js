/* 운명의 타임라인 서사 엔진 — 1단계(2026-11-08, 스위치 lifeNarrative 기본 꺼짐).
   계획: docs/LIFE_NARRATIVE_PLAN_2026-11-08.md
   · profile(M, ch, now): 사주당 한 번 계산하는 공통 분석. 억부·조후는 engine.js 통합 판단(ch.unified)을 그대로 쓰고(독립 평가 + 공통 결과),
     강약·통근·격국·십성 묶음·구조 패턴·조습·원국 합충·일지 십성·배우자 기운을 근거 문장이 붙은 태그로 만든다.
   · lifeStory(...): 실제 대운 시작 시각(startMs)으로 만 나이 구간을 잡고, 대운마다 끌어오는 십성·통합 역할·흐름 점수·일지/월지 충합으로
     시기 이야기를 만든다. 전체 모양은 실제 점수로 분류(늦게 피는 상승·앞이 강한 하강·중반 정점·V자 반전·굴곡·잔잔함·물결) — 고정 틀 없음.
     지나온 시기는 맞춰 보기 문형, 지금·앞으로는 준비 문형으로 나눈다.
   · compose(...): 장의 복합 규칙(조건 2개 이상)을 고르고 '핵심 성향 → 생활 → 갈등과 약점 → 운의 변화 → 조언'으로 엮는다.
     리포트 단위로 쓴 규칙·문장을 기록해 장 사이 중복 문장과 상충 규칙을 막는다. 맞는 규칙이 없으면 null(기존 DB 문안 그대로).
   · forChapter(c): reading-text.js 가 부른다. 스위치가 꺼져 있거나 시범 장이 아니면 null. */
(function (root) {
  'use strict';
  var R = root.ReportV2 = root.ReportV2 || {};
  var VERSION = 'life-narrative-20261108-1';
  var D = function () { return root.MantraLifeNarrativeData; };
  var YEAR = 365.2422 * 86400000;
  var GN = ['bi', 'sik', 'jae', 'gwan', 'in'], GK = ['비겁', '식상', '재성', '관성', '인성'];
  // 시범 장 → 렌즈
  var CHAPTERS = { timeline_self_20: 'life', timeline_self_03: 'life', timeline_wealth_02: 'wealth', timeline_love_04: 'love', timeline_career_07: 'career',
    // 3단계 1묶음(종합풀이 12장). '운이 바꾸는 것'은 data 의 CH_LUCK(장마다 고유 문장)으로 쓴다
    timeline_self_18: 'life', timeline_self_22: 'life', timeline_self_24: 'life', timeline_self_25: 'life', timeline_self_26: 'career', timeline_self_27: 'love', timeline_self_29: 'love',
    timeline_self_30: 'wealth', timeline_self_31: 'wealth', timeline_self_33: 'life', timeline_self_34: 'life', timeline_self_37: 'life',
    // 3단계 2묶음(재물운 심화 14장)
    timeline_wealth_01: 'wealth', timeline_wealth_03: 'wealth', timeline_wealth_04: 'wealth', timeline_wealth_05: 'wealth', timeline_wealth_06: 'wealth', timeline_wealth_07: 'wealth', timeline_wealth_08: 'wealth',
    timeline_wealth_09: 'wealth', timeline_wealth_10: 'wealth', timeline_wealth_11: 'wealth', timeline_wealth_12: 'wealth', timeline_wealth_13: 'wealth', timeline_wealth_14: 'wealth', timeline_wealth_15: 'wealth',
    // 3단계 3묶음(인연운 심화 14장)
    timeline_love_01: 'love', timeline_love_02: 'love', timeline_love_03: 'love', timeline_love_05: 'love', timeline_love_06: 'love', timeline_love_07: 'love', timeline_love_08: 'love',
    timeline_love_09: 'love', timeline_love_10: 'love', timeline_love_11: 'love', timeline_love_12: 'love', timeline_love_13: 'love', timeline_love_14: 'love', timeline_love_15: 'love',
    // 3단계 4묶음(커리어운 심화 14장)
    timeline_career_01: 'career', timeline_career_02: 'career', timeline_career_03: 'career', timeline_career_04: 'career', timeline_career_05: 'career', timeline_career_06: 'career', timeline_career_08: 'career',
    timeline_career_09: 'career', timeline_career_10: 'career', timeline_career_11: 'career', timeline_career_12: 'career', timeline_career_13: 'career', timeline_career_14: 'career', timeline_career_15: 'career' };
  var LENS_WORD = { life: '삶', wealth: '돈', love: '관계', career: '일' };
  var STAGE = { core: '핵심 성향', life: '실제 생활에서는', conflict: '갈등과 약점', luck: '운이 바꾸는 것', advice: '현실적인 조언' };
  var norm = function (t) { return String(t || '').replace(/[\s.,!?·—'"‘’“”()]/g, ''); };
  var sentences = function (t) { return String(t || '').split(/(?<=[.!?])\s+/).map(function (x) { return x.trim(); }).filter(Boolean); };
  var mod5 = function (x) { return ((x % 5) + 5) % 5; };
  // 조사: 마지막 한글 음절의 받침으로 고른다(괄호 속은 건너뜀)
  function josa(w, pair) { w = String(w); var c = null; for (var i = w.length - 1; i >= 0; i--) { var k = w.charCodeAt(i); if (k >= 0xAC00 && k <= 0xD7A3) { c = k; break; } if (w[i] === ')') { var o = w.lastIndexOf('(', i); if (o > 0) { i = o; continue; } } } var p = pair.split('/'), j = c == null ? 0 : (c - 0xAC00) % 28; return w + (j ? p[0] : p[1]); }

  // ───────── 공통 분석 ─────────
  // 태그: str:weak|mid|strong(+veryweak|verystrong) · root:none|weak|firm · g:<묶음>:heavy|some|light|none · dom:<묶음> · pat:<구조 패턴>
  //       gk:<격 묶음> + gk:seong|part|pa · u:<통합 판단 방식> · u:prim:<주 기준> · yong:<묶음> · yong:absent · cl:hot|cold|wet|dry|even
  //       rel:dm-clash|day-clash|hyeong|wonjin|day-hap|stem-hap · dj:<일지 십성 묶음> · spouse:heavy|none|mix · tg:pyeonjae:high|jeongjae:high · sex:M|F · age:senior|young
  var _profile = new WeakMap();
  function profile(M, ch, now) {
    var hit = _profile.get(ch); if (hit) return hit;
    var tags = {}, add = function (t, why) { if (!tags[t]) tags[t] = why; };
    var st = ch.strength, help = st.help, G = ch.weights.groups, tg = ch.weights.tgPct || {}, dEl = M.stemEl(ch.pillars.day.s);
    var pc = function (v) { return Math.round(v) + '%'; };
    add(help < 42 ? 'str:weak' : help > 58 ? 'str:strong' : 'str:mid', '나를 돕는 힘 ' + pc(help) + '(' + st.zone + ')');
    if (help < 30) add('str:veryweak', '나를 돕는 힘 ' + pc(help)); if (help >= 70) add('str:verystrong', '나를 돕는 힘 ' + pc(help));
    var rs = 0; try { rs = M.analyzeNatalRoot(ch).natalRootScore; } catch (e) { }
    if (rs === 0) add('root:none', '일간의 뿌리(통근) 없음'); else if (rs < 30) add('root:weak', '일간의 뿌리(통근) ' + rs + '점'); else if (rs >= 60) add('root:firm', '일간의 뿌리(통근) ' + rs + '점');
    var dom = 0;
    G.forEach(function (v, i) {
      var n = GN[i], k = GK[i] + ' ' + pc(v); if (v > G[dom]) dom = i;
      if (v >= 30) add('g:' + n + ':heavy', k); if (v >= 10) add('g:' + n + ':some', k); if (v < 10) add('g:' + n + ':light', k); if (v < 3) add('g:' + n + ':none', k);
    });
    add('dom:' + GN[dom], '가장 큰 묶음 ' + GK[dom] + ' ' + pc(G[dom]));
    (ch.patterns && ch.patterns.list || []).forEach(function (p) { if (p.level !== '참고') add('pat:' + p.name, p.name + ' — ' + p.basis); });
    try {
      var gc = M.gyeokCore(ch), GKEY = { 정관: 'gwan', 편관: 'gwan', 정재: 'jae', 편재: 'jae', 식신: 'sik', 상관: 'sik', 정인: 'in', 편인: 'in', wolgeop: 'bi' };
      add('gk:' + GKEY[gc.key], gc.kind); if (gc.status === 'seong' || gc.status === 'part' || gc.status === 'pa') add('gk:' + gc.status, gc.kind + ' ' + ({ seong: '성격', part: '부분 성격', pa: '파격' })[gc.status]);
    } catch (e) { }
    var u = ch.unified;
    if (u) {
      add('u:' + u.mode, '통합 판단 ' + u.headline); add('u:prim:' + u.primary, '주 기준 ' + u.primaryName);
      add('yong:' + GN[mod5(u.yong - dEl)], '용신 ' + M.EL_K[u.yong]); if ((ch.weights.pct[u.yong] || 0) < 5) add('yong:absent', '용신이 원국에 ' + pc(ch.weights.pct[u.yong] || 0));
    }
    var c = ch.climate, any = false;
    if (c.temp >= 0.6) { add('cl:hot', '원국 온도 +' + c.temp.toFixed(2)); any = true; }
    if (c.temp <= -0.6) { add('cl:cold', '원국 온도 ' + c.temp.toFixed(2)); any = true; }
    if (c.hum >= 0.8) { add('cl:wet', '원국 습도 +' + c.hum.toFixed(2)); any = true; }
    if (c.hum <= -0.8) { add('cl:dry', '원국 습도 ' + c.hum.toFixed(2)); any = true; }
    if (!any) add('cl:even', '온도·습도 고름');
    (ch.relations || []).forEach(function (r) {
      var m = r.members || [], day = m.indexOf('day') >= 0, mon = m.indexOf('month') >= 0, nm = r.name || r.type;
      if (r.kind === 'branch') {
        if (r.type === '충' && day && mon) add('rel:dm-clash', '일지·월지 ' + nm);
        if (r.type === '충' && day) add('rel:day-clash', '일지 ' + nm);
        if (r.type === '형' && (day || mon)) add('rel:hyeong', nm);
        if ((r.type === '원진' || r.type === '귀문관') && day) add('rel:wonjin', '일지 ' + nm);
        if (/합/.test(r.type) && day) add('rel:day-hap', '일지 ' + nm);
      } else if (r.type === '천간합' && day) add('rel:stem-hap', '일간 ' + nm);
    });
    var djg = mod5(M.stemEl(M.mainHidden(ch.pillars.day.b)) - dEl); add('dj:' + GN[djg], '일지 ' + M.BR[ch.pillars.day.b] + '(' + GK[djg] + ')');
    var F = ch.gender === 'F', sg = F ? 3 : 2, a = F ? '정관' : '정재', b = F ? '편관' : '편재';
    if (G[sg] >= 25) add('spouse:heavy', (F ? '관성' : '재성') + ' ' + pc(G[sg])); if (G[sg] < 3) add('spouse:none', (F ? '관성' : '재성') + ' ' + pc(G[sg]));
    if ((tg[a] || 0) >= 8 && (tg[b] || 0) >= 8) add('spouse:mix', a + ' ' + pc(tg[a] || 0) + ' · ' + b + ' ' + pc(tg[b] || 0));
    if ((tg['편재'] || 0) >= 15) add('tg:pyeonjae:high', '편재 ' + pc(tg['편재'])); if ((tg['정재'] || 0) >= 15) add('tg:jeongjae:high', '정재 ' + pc(tg['정재']));
    add('sex:' + (F ? 'F' : 'M'), F ? '여성' : '남성');
    // 나이: 은퇴 이후(만 65세 이상)·학생 시기(만 20세 미만)는 같은 사주라도 일의 장면이 다르다(커리어 장의 이직·이력서 문장을 막는다)
    var age = ((now || Date.now()) - ch.utc) / YEAR; if (age >= 65) add('age:senior', '현재 만 ' + Math.floor(age) + '세'); if (age < 20) add('age:young', '현재 만 ' + Math.floor(age) + '세');
    var res = { version: VERSION, tags: tags, has: function (t) { return Object.prototype.hasOwnProperty.call(tags, t); }, dEl: dEl };
    _profile.set(ch, res); return res;
  }

  // ───────── 대운 서사 ─────────
  function pullOf(M, ch, p) {
    var dEl = M.stemEl(ch.pillars.day.s), g = [0, 0, 0, 0, 0];
    g[mod5(M.stemEl(p.s) - dEl)] += 0.4; M.HIDDEN[p.b].forEach(function (h) { g[mod5(M.stemEl(h[0]) - dEl)] += 0.6 * h[1] / 30; });
    var top = 0; g.forEach(function (v, i) { if (v > g[top]) top = i; }); return { g: g, top: top };
  }
  var toneOf = function (fit) { return fit >= 18 ? 'good' : fit > -12 ? 'mixed' : 'hard'; };
  function periods(M, ch, now) {
    var list = ch.daeun.list, out = [];
    list.forEach(function (x, i) {
      var next = list[i + 1], start = x.startMs, end = next ? next.startMs : start + 10 * YEAR;
      var a0 = (start - ch.utc) / YEAR, a1 = (end - ch.utc) / YEAR; if (a0 > 85) return;
      var ev = x.ev || {}, fit = typeof ev.fitScore === 'number' ? ev.fitScore : 0, pull = pullOf(M, ch, x), rels = [];
      try { rels = M.luckRelations(ch, x).rels; } catch (e) { }
      var ev2 = { dayClash: rels.some(function (r) { return r.type === '충' && r.members.indexOf('day') >= 0; }), monthClash: rels.some(function (r) { return r.type === '충' && r.members.indexOf('month') >= 0; }), dayHap: rels.some(function (r) { return /합/.test(r.type) && r.kind === 'branch' && r.members.indexOf('day') >= 0; }) };
      var el = mod5(M.stemEl(ch.pillars.day.s) + pull.top);
      out.push({ female: ch.gender === 'F', i: i, gz: M.STEM[x.s] + M.BR[x.b], start: start, end: end, age0: a0, age1: a1, year0: new Date(start).getUTCFullYear(), fit: fit, tone: toneOf(fit), group: pull.top, role: ch.unified ? ch.unified.roles[el] : '', events: ev2, tense: end <= now ? 'past' : start <= now ? 'current' : 'future' });
    });
    return out;
  }
  // 전체 모양: 실제 흐름 점수로 분류. 한 가지 모양이 과반이 되지 않는지는 tests/life-narrative-sim.cjs 가 확인한다.
  function arcOf(ps) {
    var v = ps.filter(function (p) { return p.age0 < 80; }).map(function (p) { return p.fit; });
    if (v.length < 3) return 'flat';
    var max = Math.max.apply(null, v), min = Math.min.apply(null, v), range = max - min;
    if (range < 30) return 'flat';
    var turns = 0, dir = 0; for (var i = 1; i < v.length; i++) { var d = v[i] - v[i - 1]; if (Math.abs(d) < 12) continue; var s = d > 0 ? 1 : -1; if (dir && s !== dir) turns++; dir = s; }
    var third = Math.max(1, Math.floor(v.length / 3)), mean = function (a) { return a.reduce(function (x, y) { return x + y; }, 0) / a.length; };
    var head = mean(v.slice(0, third)), tail = mean(v.slice(-third)), pi = v.indexOf(max), ti = v.indexOf(min), mid = function (k) { return k > 0 && k < v.length - 1; };
    if (turns >= 3) return 'wave';
    if (mid(pi) && max - head >= 18 && max - tail >= 18) return 'peak';
    if (mid(ti) && head - min >= 18 && tail - min >= 18) return 'valley';
    if (tail - head >= 15) return 'rise';
    if (head - tail >= 15) return 'fall';
    return 'swing';
  }
  var ageTxt = function (p) { return '만 ' + Math.max(0, Math.floor(p.age0)) + '~' + Math.floor(p.age1) + '세'; };
  function transition(prev, p) {
    if (!prev) return '';
    var d = p.fit - prev.fit;
    if (prev.fit >= 0 && p.fit < -12) return '잘 굴러가던 흐름이 한 번 꺾이는 구간이에요.';
    if (prev.fit < -12 && p.fit >= 0) return '막혀 있던 흐름이 뒤집히는 구간이에요.';
    if (d >= 20) return '앞 10년보다 확실히 숨통이 트여요.';
    if (d <= -20) return '앞 10년보다 무게가 늘어나요.';
    return '';
  }
  function periodText(D0, st, lens, p, prev) {
    var youth = p.age0 < 16 && p.tense === 'past', Y = D0.YOUTH;
    var outs = youth ? Y.out[p.tone] : D0.OUT[lens][p.tone][p.tense === 'past' ? 'past' : 'future'], key = (youth ? 'youth' : lens) + p.tone + (p.tense === 'past' ? 'p' : 'f');
    var k = st.variant[key] || 0; st.variant[key] = k + 1;
    var parts = [];
    var tr = transition(prev, p); if (tr) parts.push(tr);
    if (youth) parts.push(Y.env[p.group]);
    else if (prev && prev.group === p.group) { var ck = 'cont' + lens, cv = st.variant[ck] || 0; st.variant[ck] = cv + 1; parts.push(D0.CONT[lens][cv % D0.CONT[lens].length]); }
    else parts.push(D0.ENV[lens][p.group]);
    parts.push(outs[k % outs.length]);
    var ev = p.events, E = youth ? Y.event : { dayClash: D0.EVENT.dayClash[lens], dayHap: D0.EVENT.dayHap[lens], monthClash: D0.EVENT.monthClash[lens] };
    if (lens === 'love' && p.group === (p.female ? 3 : 2)) parts.push(p.tense === 'past' ? '배우자 인연을 뜻하는 기운이 들어온 시기라, 진지한 만남이나 관계의 결정이 이때 있었을 수 있어요.' : '배우자 인연을 뜻하는 기운이 들어오는 시기라, 진지한 만남이나 관계의 결정이 움직이기 쉬워요.');
    var evs = [];
    if (ev.dayClash) evs.push(E.dayClash); else if (ev.dayHap) evs.push(E.dayHap); if (ev.monthClash) evs.push(E.monthClash);
    // 지나온 대운의 사건 신호는 과거형으로 바꿔 맞춰 보기 문형을 지킨다
    if (p.tense === 'past' && !youth) evs = evs.map(function (t) { return t.replace(/겹쳐요/g, '겹쳤어요').replace(/있어요/g, '있었어요').replace(/쉬워요\./g, '쉬웠어요.'); });
    return parts.concat(evs).join(' ');
  }
  function seunLine(M, ch, now, lens) {
    var Y = new Date(now).getUTCFullYear(), list; try { list = M.seunRange(ch, Y, Y + 4); } catch (e) { return ''; }
    if (!list || !list.length) return '';
    var want = lens === 'wealth' ? [2, 1] : lens === 'career' ? [3, 1] : lens === 'love' ? (ch.gender === 'F' ? [3, 4] : [2, 4]) : null;
    var scored = list.map(function (x) { var pu = pullOf(M, ch, x), s = x.ev.fitScore + (want ? (pu.top === want[0] ? 30 : pu.top === want[1] ? 14 : 0) : 0); return { y: x.year, gz: M.STEM[x.s] + M.BR[x.b], s: s, fit: x.ev.fitScore, clash: (x.ev.triggers || []).some(function (t) { return /충/.test(t); }) }; });
    var best = scored.slice().sort(function (a, b) { return b.s - a.s; })[0], worst = scored.slice().sort(function (a, b) { return a.fit - b.fit; })[0];
    var out = '앞으로 5년 중 ' + LENS_WORD[lens] + ' 쪽으로 힘이 가장 실리는 해는 ' + best.y + '년(' + best.gz + ')이에요.';
    if (worst && worst.y !== best.y && worst.fit < -12) out += ' ' + worst.y + '년(' + worst.gz + ')은 흐름이 무거운 해라' + (worst.clash ? ' 부딪히는 글자까지 겹쳐' : '') + ' 큰 결정을 피하는 편이 좋아요.';
    return out;
  }
  // 장 하나에 넣는 '운이 바꾸는 것' 단계: 지금 대운 + 다음 대운(+지난 대운 한 줄) + 앞으로 5년 세운
  // 운 단계: 시점 문장(렌즈별로 다름)은 중복 제거에서 빼고 본문만 중복 제거한다
  var LENS_EYE = { life: '삶 전체로 보면', wealth: '돈의 흐름으로 보면', love: '관계의 눈으로 보면', career: '일의 흐름으로 보면' };
  // 장마다 고유한 '운이 바꾸는 것'(data CH_LUCK): 지금·다음 대운 + (말년 장) 50세 이후 대운 + (시기 장) 5년 세운 + (배우자 장) 배우자 기운이 오는 때
  var COND_W = { good: '받쳐 주는', mixed: '엇갈리는', hard: '무거운' };
  function chapterLuck(M, ch, now, spec, st) {
    var ps = periods(M, ch, now), ci = ps.findIndex(function (p) { return p.tense === 'current'; }), out = [];
    var eye = spec.eye, g = spec.g, line = function (p) { return dedupe(st, g[p.group]); };
    if (spec.late) {
      var late = ps.filter(function (p) { return p.age0 >= 50 && p.age0 < 85; }).slice(0, 3);
      late.forEach(function (p, k) { var sameAsPrev = k > 0 && late[k - 1].group === p.group; out.push(josa(ageTxt(p) + '(' + p.gz + ' 대운, ' + p.year0 + '년~)', '은/는') + ' ' + (p.tense === 'past' ? '이미 지나온 시기로, 흐름이 ' + COND_W[p.tone] + ' 구간이었어요.' : p.tense === 'current' ? '지금 지나는 시기로, 흐름이 ' + COND_W[p.tone] + ' 구간이에요.' : '흐름이 ' + COND_W[p.tone] + ' 구간이에요.') + ' ' + (sameAsPrev ? (k === 1 || late[0].group !== p.group ? '말년의 앞 구간과 같은 성격의 기운이 이어져서, 그때 만든 생활 방식이 그대로 굳어지기 쉬워요.' : '말년 내내 같은 성격의 기운이 이어지는 드문 흐름이라, 50대에 만든 습관이 남은 인생의 모습을 거의 정해요.') : line(p))); });
      if (!late.length) out.push('말년에 해당하는 대운 정보가 충분하지 않아요.');
      return out.join('\n\n');
    }
    if (ci < 0) return '';
    var cur = ps[ci], next = ps[ci + 1];
    out.push('지금 지나는 ' + ageTxt(cur) + ' 구간(' + cur.gz + ' 대운)을 ' + eye + ', 흐름이 ' + COND_W[cur.tone] + ' 때예요. ' + line(cur));
    // 다음 대운 문장은 그 장의 고유 문장과 한 문장으로 묶는다(시점만 같은 문장이 여러 장에서 반복되지 않게)
    if (next && !spec.months) out.push(next.year0 + '년 무렵(' + ageTxt(next) + ')부터는 흐름이 ' + COND_W[next.tone] + ' 쪽으로 바뀌' + (next.group !== cur.group ? '고, ' + g[next.group] : '지만, ' + eye + ' 지금과 같은 숙제가 이어져요.'));
    // 재물 시기 장 세 개는 시간 단위가 서로 다르다: bigYears(앞으로 10년의 해) · decades(남은 대운) · months(가까운 12개월)
    var wBonus = function (top) { return top === 2 ? 30 : top === 1 ? 14 : 0; }, cBonus = function (top) { return top === 3 ? 30 : top === 1 ? 14 : 0; };
    if (spec.bigYears) {
      try {
        var car = spec.bigYears === 'career', yb = car ? cBonus : wBonus;
        var Yb = new Date(now).getUTCFullYear(), yl = M.seunRange(ch, Yb, Yb + 9).map(function (x) { var pu = pullOf(M, ch, x); return { y: x.year, gz: M.STEM[x.s] + M.BR[x.b], s: x.ev.fitScore + yb(pu.top), fit: x.ev.fitScore, money: car ? pu.top === 3 || pu.top === 1 : pu.top === 2 || pu.top === 1 }; });
        // 흐름이 무거운 해(-12 이하, '움직일 때' 장의 기다릴 해 기준)는 기회의 해로 꼽지 않는다(장 사이 엇갈림 방지)
        var big = yl.filter(function (x) { return x.money && x.s > 10 && x.fit > -12; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 3).sort(function (a, b) { return a.y - b.y; });
        if (car && spec.senior) out.push(big.length ? josa('앞으로 10년 중 새 역할을 맡거나 활동을 넓히기 좋은 해는 ' + big.map(function (x) { return x.y + '년(' + x.gz + ')'; }).join(' · '), '이에요/예요') + '. 이 해에 맞춰 배움이나 모임 자리를 미리 알아 두세요.' : '앞으로 10년 안에는 활동의 판이 크게 바뀌는 해가 뚜렷하지 않아요. 해마다 한 가지씩 꾸준히 이어 가는 쪽이 맞아요.');
        else if (car) out.push(big.length ? josa('앞으로 10년 중 일에서 한 단계 올라설 기회가 커지는 해는 ' + big.map(function (x) { return x.y + '년(' + x.gz + ')'; }).join(' · '), '이에요/예요') + '. 이 해에 맞춰 자격·이력·포트폴리오를 미리 준비해 두세요.' : '앞으로 10년 안에는 일의 자리가 크게 바뀌는 해가 뚜렷하지 않아요. 한 번의 도약보다 해마다 한 칸씩 쌓는 전략이 맞는 10년이에요.');
        else out.push(big.length ? josa('앞으로 10년 중 큰돈과 만날 기회가 커지는 해는 ' + big.map(function (x) { return x.y + '년(' + x.gz + ')'; }).join(' · '), '이에요/예요') + '. 이 해에는 거래와 계약을 미루지 마세요.' : '앞으로 10년 안에는 돈의 기운이 크게 몰리는 해가 뚜렷하지 않아요. 큰 한 방보다 꾸준히 쌓는 쪽이 맞는 10년이에요.');
        var yw = yl.slice().sort(function (a, b) { return a.fit - b.fit; })[0]; if (yw && yw.fit < -15 && !big.some(function (x) { return x.y === yw.y; })) out.push(josa(yw.y + '년(' + yw.gz + ')', '은/는') + (car && spec.senior ? ' 흐름이 가장 무거운 해라, 새 일을 벌이기보다 건강과 생활 리듬을 지키는 데 쓰세요.' : car ? ' 일의 흐름이 가장 무거운 해라, 이직·독립 같은 큰 결정보다 지금 자리를 다지는 데 쓰세요.' : ' 흐름이 가장 무거운 해라, 큰돈이 걸린 결정은 피하는 편이 좋아요.'));
      } catch (e) { }
    }
    // 이직·독립(career_08): 앞으로 10년 중 일터 자리(월지)를 흔드는 해·자리 기운이 들어오는 해(이직) / 독립의 기운이 실리는 해, 가장 무거운 해는 버티기
    if (spec.move) {
      try {
        var Yv = new Date(now).getUTCFullYear(), vrows = M.seunRange(ch, Yv, Yv + 9).map(function (x) {
          var rels = M.luckRelations(ch, x).rels, mclash = rels.some(function (r) { return r.type === '충' && r.members.indexOf('month') >= 0; }), mhap = rels.some(function (r) { return r.kind === 'branch' && /합/.test(r.type) && r.members.indexOf('month') >= 0; }), top = pullOf(M, ch, x).top;
          var why = mclash ? (spec.senior ? '하던 일을 흔드는 해' : '일터 자리를 흔드는 해') : top === 3 ? (spec.senior ? '새 역할의 기운이 들어옴' : '새 자리의 기운이 들어옴') : mhap ? (spec.senior ? '하던 일과 합' : '일터 자리와 합') : '';
          return { y: x.year, gz: M.STEM[x.s] + M.BR[x.b], why: why, indep: (top === 0 || top === 1) && x.ev.fitScore >= 0, s: (mclash ? 2 : 0) + (top === 3 ? 1.5 : 0) + (mhap ? 1 : 0) + x.ev.fitScore / 100, fit: x.ev.fitScore };
        });
        var mv2 = vrows.filter(function (x) { return x.why; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 3).sort(function (a, b) { return a.y - b.y; });
        if (spec.senior) out.push(mv2.length ? josa('앞으로 10년 중 일의 형태가 바뀌기 쉬운 해는 ' + mv2.map(function (x) { return x.y + '년(' + x.why + ')'; }).join(', '), '이에요/예요') + '.' : '앞으로 10년 안에는 하던 일을 크게 흔드는 해가 뚜렷하지 않아요. 일을 줄이거나 넘기는 때는 스스로 정한 기준으로 고르세요.');
        else out.push(mv2.length ? josa('앞으로 10년 중 이직·자리 이동이 움직이기 쉬운 해는 ' + mv2.map(function (x) { return x.y + '년(' + x.why + ')'; }).join(', '), '이에요/예요') + '.' : '앞으로 10년 안에는 일터를 크게 흔드는 해가 뚜렷하지 않아요. 떠밀려 옮길 일이 적은 만큼, 옮길지는 스스로 정한 기준으로 판단하세요.');
        var heavyMv = mv2.filter(function (x) { return x.fit <= -12; }).map(function (x) { return x.y + '년'; });
        if (heavyMv.length) out.push('다만 ' + heavyMv.join('·') + '은 전체 흐름이 무거운 해라, 움직일 일이 생겨도 조건을 확인한 뒤 천천히 정하세요.');
        var ind = vrows.filter(function (x) { return x.indep &&!mv2.some(function (m) { return m.y === x.y; }); }).sort(function (a, b) { return b.fit - a.fit; }).slice(0, 2).sort(function (a, b) { return a.y - b.y; });
        if (ind.length) out.push((spec.senior ? '새 활동을 시험해 보기 좋은 해는 ' : '독립이나 내 일을 시험해 보기 좋은 해는 ') + ind.map(function (x) { return x.y + '년'; }).join('·') + (spec.senior ? '이에요. 큰돈 없이 작게 먼저 해 보세요.' : '이에요. 회사를 다니며 작게 먼저 해 보세요.'));
        var vw = vrows.slice().sort(function (a, b) { return a.fit - b.fit; })[0]; if (vw && vw.fit < -15) out.push(josa(vw.y + '년', '은/는') + (spec.senior ? ' 흐름이 가장 무거운 해라, 이 해에는 일을 늘리거나 목돈을 넣는 결정을 피하세요.' : ' 흐름이 가장 무거운 해라, 이 해의 이직이나 퇴사는 다음 자리를 확정한 뒤에만 하세요.'));
      } catch (e) { }
    }
    if (spec.decades) {
      var fut = ps.filter(function (p) { return p.tense !== 'past' && p.age0 < 80; }).map(function (p) { return { p: p, s: p.fit + wBonus(p.group) }; });
      if (fut.length) {
        var best2 = fut.slice().sort(function (a, b) { return b.s - a.s; }).slice(0, 2).sort(function (a, b) { return a.p.age0 - b.p.age0; });
        var bl = best2.map(function (x) { return ageTxt(x.p) + '(' + x.p.year0 + '년~)'; }); out.push('남은 인생에서 재물에 힘이 가장 실리는 10년은 ' + (bl.length > 1 ? josa(bl[0], '과/와') + ' ' + bl[1] : bl[0]) + ' 구간이에요.');
        var low = fut.slice().sort(function (a, b) { return a.s - b.s; })[0]; if (low && !best2.some(function (x) { return x.p === low.p; })) out.push(josa(ageTxt(low.p) + '(' + low.p.year0 + '년~)', '은/는') + ' 재물 면에서 넓히기보다 지키는 데 집중해야 하는 10년이에요.');
      }
    }
    var sgL = ch.gender === 'F' ? 3 : 2, loveBonus = function (top) { return top === sgL ? 30 : top === 1 ? 14 : 0; };
    if (spec.months) {
      try {
        var love = spec.months === 'love', work = spec.months === 'career', bon = love ? loveBonus : work ? cBonus : wBonus;
        var Ym = M.yearPillarAt(now).sajuYear, all = M.wolun(ch, Ym).concat(M.wolun(ch, Ym + 1)), mi = 0; all.forEach(function (m, i) { if (m.startMs <= now) mi = i; });
        var ml = all.slice(mi, mi + 12).map(function (m) { var dd = new Date(m.startMs + 9 * 3600e3), pu = pullOf(M, ch, m); return { t: m.startMs, label: dd.getUTCFullYear() + '년 ' + (dd.getUTCMonth() + 1) + '월', s: m.ev.fitScore + bon(pu.top), fit: m.ev.fitScore }; });
        var top3 = ml.slice().sort(function (a, b) { return b.s - a.s; }).slice(0, 3).sort(function (a, b) { return a.t - b.t; }), mw = ml.slice().sort(function (a, b) { return a.fit - b.fit; })[0];
        out.push('가까운 12개월 중 ' + (love ? '인연이 움직이기 쉬운 달은 ' : work && spec.senior ? '새 활동에 힘이 실리는 달은 ' : work ? '일에 힘이 실리는 달은 ' : '돈의 판단에 힘이 실리는 달은 ') + top3.map(function (x) { return x.label; }).join(' · ') + (love ? '이에요. 인연의 달도 절기로 바뀌어서, 그달 초순(5~8일 무렵)부터 기운이 들어와요.' : work && spec.senior ? '이에요. 활동의 달도 절기로 나뉘어서, 그달 5~8일 무렵부터 기운이 바뀌어요.' : work ? '이에요. 일의 달은 절기 기준이라, 그달 5~8일 무렵부터 힘이 실린다고 보세요.' : '이에요. 달은 절기로 바뀌어서 그달 초순(5~8일 무렵)부터예요.'));
        if (mw && mw.fit < -12 && !top3.some(function (x) { return x.t === mw.t; })) out.push(josa(mw.label, '은/는') + ' 흐름이 가장 무거운 달이라 ' + (love ? '고백·동거·이별 같은 관계의 큰 결정을 미루세요.' : work && spec.senior ? '새 일·큰 약속·투자 권유 같은 결정을 미루세요.' : work ? '이직·퇴사·큰 제안 수락 같은 결정을 미루세요.' : '큰 지출과 계약을 피하세요.'));
      } catch (e) { }
    }
    // 결혼운(love_08): 앞으로 10년 중 배우자 기운이 들어오는 해 + 배우자 자리(일지)와 합을 이루는 해, 일지를 충하는 해는 주의
    if (spec.marriage) {
      try {
        var Yr = new Date(now).getUTCFullYear(), mrows = M.seunRange(ch, Yr, Yr + 9).map(function (x) {
          var rels = M.luckRelations(ch, x).rels, hap = rels.some(function (r) { return r.kind === 'branch' && /합/.test(r.type) && r.members.indexOf('day') >= 0; }), clash = rels.some(function (r) { return r.type === '충' && r.members.indexOf('day') >= 0; }), sp = pullOf(M, ch, x).top === sgL;
          return { y: x.year, gz: M.STEM[x.s] + M.BR[x.b], why: sp && hap ? '배우자 기운과 배우자 자리의 합이 겹침' : sp ? '배우자 기운이 들어옴' : hap ? '배우자 자리와 합' : '', s: (sp ? 2 : 0) + (hap ? 1.5 : 0) + x.ev.fitScore / 100, fit: x.ev.fitScore, clash: clash };
        });
        var good = mrows.filter(function (x) { return x.why; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 4).sort(function (a, b) { return a.y - b.y; });
        out.push(good.length ? josa('앞으로 10년 중 결혼 이야기가 움직이기 쉬운 해는 ' + good.map(function (x) { return x.y + '년(' + x.why + ')'; }).join(', '), '이에요/예요') + '.' : '앞으로 10년 안에는 결혼을 끌어당기는 해가 뚜렷하지 않아요. 날을 기다리기보다 관계의 준비가 된 해에 스스로 정하는 쪽이 맞아요.');
        var heavyM = good.filter(function (x) { return x.fit <= -12; }).map(function (x) { return x.y + '년'; });
        if (heavyM.length) out.push(heavyM.join('·') + '은 인연의 기운은 들어오지만 전체 흐름은 무거운 해라, 이야기가 오가도 결정은 서두르지 마세요.');
        var cl = mrows.filter(function (x) { return x.clash; }).map(function (x) { return x.y + '년'; }).slice(0, 2);
        if (cl.length) out.push(cl.join('·') + '은 배우자 자리를 흔드는 해라, 결혼이나 이별 같은 큰 결정은 한 계절 더 확인하고 내리세요.');
      } catch (e) { }
    }
    if (spec.spouse) {
      var sg = ch.gender === 'F' ? 3 : 2, comes = ps.filter(function (p) { return p.tense !== 'past' && p.group === sg && p.age0 < 60; }).slice(0, 2);
      out.push(comes.length ? josa('앞으로 배우자 인연을 뜻하는 기운이 대운으로 들어오는 때는 ' + comes.map(function (p) { return ageTxt(p) + '(' + p.year0 + '년~)'; }).join(', '), '이에요/예요') + '. 이 시기에는 만남의 자리를 일부러 늘리세요.' : '앞으로 남은 대운 중 배우자 인연을 뜻하는 기운이 직접 들어오는 구간은 없어서, 그 기운이 해마다 들어오는 해를 노리는 쪽이 현실적이에요.');
      try { var Y = new Date(now).getUTCFullYear(), ys = M.seunRange(ch, Y, Y + 9).filter(function (x) { return pullOf(M, ch, x).top === sg; }).slice(0, 3); if (ys.length) out.push('앞으로 10년 중 그 기운이 들어오는 해: ' + ys.map(function (x) { return x.year + '년'; }).join(' · ') + '.'); } catch (e) { }
    }
    if (spec.seun) {
      try {
        var Y2 = new Date(now).getUTCFullYear(), list = M.seunRange(ch, Y2, Y2 + 4), mv = list.filter(function (x) { return x.ev.fitScore >= 18; }).map(function (x) { return x.year + '년'; }), wt = list.filter(function (x) { return x.ev.fitScore <= -12; }).map(function (x) { return x.year + '년'; });
        out.push(mv.length || wt.length ? '앞으로 5년 중 ' + (mv.length ? '움직이기 좋은 해는 ' + mv.join('·') + (wt.length ? '이고, ' : '이에요.') : '') + (wt.length ? '기다리는 게 나은 해는 ' + wt.join('·') + '이에요.' : '') : '앞으로 5년은 크게 튀는 해 없이 고른 편이라, 시기보다 준비된 정도로 결정하는 게 맞아요.');
      } catch (e) { }
    }
    return out.join('\n\n');
  }
  function luckStage(M, ch, now, lens, st, chapterId) {
    // 은퇴 이후(만 65세 이상)는 커리어 장의 운 단계를 일의 형태·역할·생활 리듬으로 읽는 문장으로 바꾼다
    var sspec = D().CH_LUCK_SENIOR && D().CH_LUCK_SENIOR[chapterId]; if (sspec && profile(M, ch, now).has('age:senior')) return chapterLuck(M, ch, now, Object.assign({ senior: true }, sspec), st);
    var spec = D().CH_LUCK && D().CH_LUCK[chapterId]; if (spec) return chapterLuck(M, ch, now, spec, st);
    var D0 = D(), ps = periods(M, ch, now), ci = ps.findIndex(function (p) { return p.tense === 'current'; });
    if (ci < 0) return '';
    var cur = ps[ci], next = ps[ci + 1], prev = ps[ci - 1], out = [];
    out.push('지금 지나는 ' + ageTxt(cur) + ' 구간(' + cur.gz + ' 대운)을 ' + LENS_EYE[lens] + ' — ' + dedupe(st, periodText(D0, st, lens, cur, prev)));
    if (next) { var nb = dedupe(st, periodText(D0, st, lens, next, cur)); if (nb) out.push(next.year0 + '년 무렵(' + ageTxt(next) + ')부터는 — ' + nb); }
    var sl = dedupe(st, seunLine(M, ch, now, lens)); if (sl) out.push(sl);
    return out.join('\n\n');
  }

  // ───────── 규칙 선택·조합 ─────────
  function matches(rule, P) {
    if (rule.all.some(function (t) { return !P.has(t); })) return false;
    if (rule.any.some(function (grp) { return !grp.some(function (t) { return P.has(t); }); })) return false;
    if (rule.none.some(function (t) { return P.has(t); })) return false;
    return true;
  }
  var condCount = function (rule) { return rule.all.length + rule.any.length; };
  var _state = new WeakMap();
  function stateOf(ch) { var s = _state.get(ch); if (!s) _state.set(ch, s = { rules: new Set(), sentences: new Set(), variant: {}, cache: {}, gen: GEN }); return s; }
  function dedupe(st, text) {
    return String(text || '').split(/\n{2,}/).map(function (para) {
      return sentences(para).filter(function (s) { var k = norm(s); if (k.length < 8) return true; if (st.sentences.has(k)) return false; st.sentences.add(k); return true; }).join(' ');
    }).filter(Boolean).join('\n\n');
  }
  function evidenceRows(P, rule, D0, extra) {
    var conds = rule ? rule.all.concat(rule.any.map(function (g) { return g.find(function (t) { return P.has(t); }); })).filter(Boolean) : [];
    var lines = [];
    if (rule) lines.push(rule.basis);
    if (conds.length) lines.push('이 사주에서 확인된 조건: ' + conds.map(function (t) { return P.tags[t]; }).join(' · ') + '.');
    (extra || []).forEach(function (x) { lines.push(x); });
    var terms = (rule ? rule.terms : []).concat(['대운', '세운']).filter(function (t, i, a) { return a.indexOf(t) === i && D0.TERMS[t]; });
    return { lines: lines, terms: terms.map(function (t) { return { term: t, text: D0.TERMS[t] }; }), conds: conds };
  }
  var TIME_NOTE = '지나온 시기의 문장은 원국과 대운으로 맞춰 본 해석이라 실제 기억과 비교해 보시면 되고, 지금과 앞으로의 문장은 사건 예언이 아니라 준비할 방향이에요.';
  // opts.rules: 미리보기용 규칙 목록(관리자 초안 포함), opts.state: 미리보기마다 새 상태(운영 화면의 중복 기록과 섞지 않는다)
  function compose(M, ch, now, chapterId, opts) {
    opts = opts || {};
    var lens = CHAPTERS[chapterId], D0 = D(); if (!lens || !D0 || !ch || !ch.unified || !ch.daeun) return null;
    var st = opts.state || stateOf(ch); if (st.gen !== GEN && !opts.state) { st.rules = new Set(); st.sentences = new Set(); st.variant = {}; st.cache = {}; st.gen = GEN; }
    if (st.cache[chapterId] !== undefined) return st.cache[chapterId];
    var P = profile(M, ch, now), res = null, trace = [];
    if (chapterId === 'timeline_self_20') res = composeLife(M, ch, now, P, st, D0);
    else {
      var cands = (opts.rules || rules()).filter(function (r) { return r.chapter === chapterId && r.on !== false; }).sort(function (a, b) { return b.priority - a.priority || condCount(b) - condCount(a) || (a.id < b.id ? -1 : 1); });
      var pick = null;
      cands.forEach(function (r) {
        var ok = matches(r, P), why = !ok ? '조건 불일치' : condCount(r) < 2 ? '복합 조건 아님' : pick ? '더 높은 우선순위 규칙 선택됨' : r.opposes.some(function (id) { return st.rules.has(id); }) ? '이미 나온 규칙과 상충' : 'selected';
        trace.push({ id: r.id, result: why });
        if (why === 'selected') pick = r;
      });
      if (pick) {
        st.rules.add(pick.id);
        var rows = [{ stage: 'core', text: dedupe(st, pick.core) }, { stage: 'life', text: dedupe(st, pick.life) }, { stage: 'conflict', text: dedupe(st, pick.conflict) }, { stage: 'luck', text: luckStage(M, ch, now, lens, st, chapterId) }, { stage: 'advice', text: dedupe(st, pick.advice) }].filter(function (r) { return r.text; });
        var evd = evidenceRows(P, pick, D0, [pick.conf === 'moderate' ? '근거 강도: 보통 — 구조 하나가 아니라 기운의 비율로 읽은 해석이라, 맞지 않는 부분은 걸러 읽어 주세요.' : '근거 강도: 높음 — 원국의 구조(격국·강약·십성 배치)에서 직접 나온 해석이에요.', TIME_NOTE]);
        res = { chapterId: chapterId, lens: lens, rule: pick.id, hook: pick.hook, rows: rows.map(function (r) { return { stage: r.stage, label: STAGE[r.stage], text: r.text }; }), evidence: evd, trace: trace, version: VERSION };
      }
    }
    if (res && !res.trace.length) res.trace = trace;
    st.cache[chapterId] = res; return res;
  }
  function composeLife(M, ch, now, P, st, D0) {
    var ps = periods(M, ch, now); if (ps.length < 3) return null;
    var arc = arcOf(ps), A = D0.ARC[arc], hookS = sentences(A.hook), past = ps.filter(function (p) { return p.tense === 'past'; }), cur = ps.find(function (p) { return p.tense === 'current'; }), fut = ps.filter(function (p) { return p.tense === 'future' && p.age0 < 80; });
    var line = function (p, prev) { return ageTxt(p) + ' · ' + p.gz + ' 대운 (' + p.year0 + '년~) — ' + periodText(D0, st, 'life', p, prev); };
    var rows = [];
    rows.push({ stage: 'core', label: '내 인생의 모양: ' + A.name, text: hookS.slice(1).join(' ') + (cur ? ' 지금은 ' + ageTxt(cur) + ' 구간을 지나고 있어요.' : '') });
    if (past.length) rows.push({ stage: 'life', label: '지나온 시기 — 맞춰 보기', text: past.map(function (p) { return line(p, ps[p.i - 1 - ps[0].i]); }).join('\n\n') });
    var hardest = ps.filter(function (p) { return p.age1 > 18 && p.age0 < 80; }).sort(function (a, b) { return a.fit - b.fit; })[0] || ps[0];
    var best = ps.filter(function (p) { return p.tense !== 'past' && p.age0 < 80; }).sort(function (a, b) { return b.fit - a.fit; })[0] || null;
    rows.push({ stage: 'conflict', label: '인생에서 가장 버거운 구간', text: josa(ageTxt(hardest) + '(' + hardest.gz + ' 대운)', '이/가') + ' 흐름 점수가 가장 낮은 구간이에요. ' + (hardest.tense === 'past' ? '이미 지나온 시기라면, 그때 잃은 것보다 그때 생긴 버릇(지나친 경계·포기·무리)이 지금까지 남아 있는지 돌아볼 만해요.' : '아직 오지 않은 시기라면, 그 전 구간에서 비상금·건강·한두 명의 믿을 사람을 미리 준비해 두는 것이 가장 확실한 대비예요.') });
    if (cur || fut.length) rows.push({ stage: 'luck', label: '지금과 앞으로 — 준비하기', text: [cur ? '지금 · ' + line(cur, ps[cur.i - 1 - ps[0].i]) : ''].concat(fut.slice(0, 3).map(function (p) { return line(p, ps[p.i - 1 - ps[0].i]); })).filter(Boolean).join('\n\n') });
    rows.push({ stage: 'advice', label: '흐름을 내 편으로 쓰는 법', text: A.tip + ' 앞으로 남은 시기 중에는 ' + (best ? josa(ageTxt(best) + '(' + best.gz + ' 대운)', '이/가') + ' 가장 힘이 실리는 구간이니 큰 움직임은 그 구간에 맞추세요.' : '가장 좋았던 구간이 이미 지나갔으니, 그때 만든 것을 지키고 다듬는 쪽이 남은 시기의 핵심이에요.') });
    rows.forEach(function (r) { r.text = dedupe(st, r.text); });
    var evd = evidenceRows(P, null, D0, ['대운은 ' + (ch.daeun.forward ? '순행' : '역행') + '이며, 첫 대운은 실제로 만 ' + (ps[0].age0).toFixed(1) + '세에 시작해요(대운수 ' + ch.daeun.num + '). 나이 구간은 대운이 바뀌는 실제 시각으로 계산했어요.', '인생의 모양은 대운마다의 흐름 점수(통합 용신·관계·구조)를 이어 분류했어요: ' + ps.filter(function (p) { return p.age0 < 80; }).map(function (p) { return Math.floor(p.age0) + '세 ' + Math.round(p.fit); }).join(' · ') + '.', TIME_NOTE]);
    return { chapterId: 'timeline_self_20', lens: 'life', rule: 'arc:' + arc, arc: arc, hook: hookS[0], rows: rows.filter(function (r) { return r.text; }), evidence: evd, trace: [], version: VERSION };
  }

  // ───────── 규칙 검증·게시본 병합 (관리자 화면·API·테스트가 같은 함수를 쓴다) ─────────
  var BAN = /반드시|무조건|100%|보장|틀림없이|대박|성공할 거예요|다 잘될|걱정하지 마세요|운명이 정해|확실히 (?:성공|부자)/;
  var JARGON = /신약|신강|관성|재성|인성|식상|비겁|정관|편관|정재|편재|식신|상관(?!없)|비견|겁재|(?<!당신 |내 )편인|정인|용신|기신|희신|격국|조후|억부|통근|일간|일지|월지|십성|오행|합충/;
  var TAG_RE = /^(str:(weak|mid|strong|veryweak|verystrong)|root:(none|weak|firm)|g:(bi|sik|jae|gwan|in):(heavy|some|light|none)|dom:(bi|sik|jae|gwan|in)|pat:[가-힣()]{2,12}|gk:(bi|sik|jae|gwan|in|seong|part|pa)|u:(single|agree|conflict|bridge|jong|forced|prim:(eokbu|johu|tonggwan|gyeok|jehwa|jong))|yong:(bi|sik|jae|gwan|in|absent)|cl:(hot|cold|wet|dry|even)|rel:(dm-clash|day-clash|hyeong|wonjin|day-hap|stem-hap)|dj:(bi|sik|jae|gwan|in)|spouse:(heavy|none|mix)|tg:(pyeonjae|jeongjae):high|sex:[MF]|age:(senior|young))$/;
  var TEXT_KEYS = ['hook', 'core', 'life', 'conflict', 'advice'];
  // 문제 목록을 돌려준다(빈 목록 = 통과). 사용자에게 보이는 말로 쓴다.
  function validateRule(r) {
    var out = [], add = function (t) { out.push(t); };
    if (!r || typeof r !== 'object') return ['규칙 형식이 아닙니다'];
    if (!/^[a-z0-9][a-z0-9._-]{2,59}$/.test(r.id || '')) add('ID는 영문 소문자·숫자·._- 3~60자입니다');
    if (!CHAPTERS[r.chapter] || r.chapter === 'timeline_self_20') add('적용 장은 서사 엔진이 맡은 장이어야 합니다(전체 인생 흐름 장은 규칙 없이 대운으로 만들어요)');
    var all = r.all || [], any = r.any || [], none = r.none || [];
    if (!Array.isArray(all) || !Array.isArray(any) || !Array.isArray(none) || any.some(function (g) { return !Array.isArray(g) || !g.length; })) add('조건 형식이 올바르지 않습니다');
    else {
      if (all.length + any.length < 2) add('조건이 2개 이상이어야 합니다(복합 규칙)');
      all.concat(none, [].concat.apply([], any)).forEach(function (t) { if (!TAG_RE.test(t)) add('알 수 없는 조건: ' + t); });
      if (all.length + any.length + none.length > 12) add('조건은 12개 이하입니다');
    }
    if (!Number.isInteger(r.priority) || r.priority < 0 || r.priority > 200) add('우선순위는 0~200 사이 정수입니다');
    if (['strong', 'moderate'].indexOf(r.conf) < 0) add('근거 강도는 strong 또는 moderate 입니다');
    if (typeof r.basis !== 'string' || r.basis.length < 40 || r.basis.length > 500) add('명리 근거는 40~500자입니다');
    if (!Array.isArray(r.terms) || r.terms.some(function (t) { return typeof t !== 'string'; })) add('용어 목록이 올바르지 않습니다');
    TEXT_KEYS.forEach(function (k) {
      var t = r[k], nm = { hook: '후킹', core: '핵심 성향', life: '생활 사례', conflict: '갈등과 약점', advice: '조언' }[k];
      var min = k === 'hook' ? 15 : 25; if (typeof t !== 'string' || t.trim().length < min || t.length > 700) { add(nm + ' 문장은 ' + min + '~700자입니다'); return; }
      if (BAN.test(t)) add(nm + '에 금지 표현: ' + t.match(BAN)[0]);
      if (JARGON.test(t)) add(nm + '에 명리 용어(근거 펼쳐보기에서만 씁니다): ' + t.match(JARGON)[0]);
      if (/[<>{}]/.test(t)) add(nm + '에 쓸 수 없는 기호(< > { })가 있습니다');
    });
    if (typeof r.hook === 'string' && !/[?？]$/.test(r.hook.trim())) add('후킹은 질문으로 끝나야 합니다');
    return out;
  }
  var GEN = 1, published = null;
  // 기본 규칙(data) 위에 게시본을 덮는다. items: [{ id, ...fields }] — 기본 id 면 필드 덮어쓰기, 새 id 면 추가, on:false 면 끔
  function mergeRules(base, items) {
    var by = {}, order = [];
    base.forEach(function (r) { by[r.id] = Object.assign({}, r); order.push(r.id); });
    (items || []).forEach(function (it) {
      if (!it || !it.id) return;
      var next = Object.assign({ all: [], any: [], none: [], opposes: [], terms: [] }, by[it.id] || {}, it);
      if (validateRule(next).length) return;   // 검증을 통과하지 못한 게시본은 쓰지 않는다(기본 규칙 유지)
      if (!by[it.id]) order.push(it.id); by[it.id] = next;
    });
    return order.map(function (id) { return by[id]; });
  }
  function rules() { var D0 = D(); return published ? published : D0 ? D0.RULES : []; }
  function setPublished(items) { published = items && items.length ? mergeRules(D().RULES, items) : null; GEN++; }

  // ───────── 스위치 · 게시 규칙 받기 ─────────
  var remoteOn = null;
  function localFlag() { try { var f = root.MANTRA_FLAGS; if (f && f.lifeNarrative === true) return true; var h = root.location && root.location.hostname || ''; if (/^(localhost|127\.0\.0\.1)$/.test(h) || /^[a-z0-9][a-z0-9-]*\.mantramanse\.pages\.dev$/i.test(h)) return /[?&]mantraFlags=[A-Za-z,]*\blifeNarrative\b/.test(root.location.search || ''); } catch (e) { } return false; }
  function enabled() { return localFlag() || remoteOn === true; }
  // 스위치와 게시 규칙을 받은 뒤 이미 그려진 시범 장이 있으면 다시 그리게 알린다(viewer.js 가 듣는다)
  try {
    if (root.fetch && root.location && root.document) {
      var getJ = function (u) { return root.fetch(u, { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); };
      Promise.all([localFlag() ? Promise.resolve(null) : getJ('/api/luck-flags'), getJ('/api/narrative-rules')]).then(function (x) {
        if (x[0]) remoteOn = x[0].lifeNarrative === true;
        if (x[1] && Array.isArray(x[1].pub) && x[1].pub.length) setPublished(x[1].pub);
        if (enabled() && root.dispatchEvent && root.CustomEvent) root.dispatchEvent(new root.CustomEvent('mantra:life-narrative'));
      });
    }
  } catch (e) { }
  function forChapter(c) {
    if (!enabled()) return null;
    var id = c && (c.editorialContractId || c.id), f = c && c.readingFeature; if (!CHAPTERS[id] || !f || !f.M || !f.ch) return null;
    try { return compose(f.M, f.ch, f.now || Date.now(), id); } catch (e) { return null; }
  }
  var api = { version: VERSION, CHAPTERS: CHAPTERS, STAGE: STAGE, profile: profile, periods: periods, arcOf: arcOf, compose: compose, forChapter: forChapter, enabled: enabled, validateRule: validateRule, mergeRules: mergeRules, rules: rules, setPublished: setPublished, TAG_RE: TAG_RE, newState: function () { return { rules: new Set(), sentences: new Set(), variant: {}, cache: {}, gen: GEN }; }, _reset: function (ch) { _state.delete(ch); } };
  R.LifeNarrative = api; root.MantraLifeNarrative = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
