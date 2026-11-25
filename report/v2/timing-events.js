/* 사건별 타이밍 표(2026-11-26) — 커리어·인연·재물 타이밍 장(timeline_*_14) 끝에 "언제 무엇을" 한눈에.
   · 왜: 전수 검토(scratchpad timing-audit) 결과 취업 타이밍 0건, 새 인연·연애 시작 시기 거의 없음, 이직 장 안에서
     '자리 이동 신호가 오는 해'(서사)와 '흐름이 받쳐 주는 해'(그래프)가 서로 다른 해를 짚어 엇갈려 보였다.
   · 무엇: 사건마다 두 값을 함께 본다 — ① 계기(그해 들어오는 십성 묶음·일터 자리(월지)/배우자 자리(일지)의 합·충·도화(연살))
     ② 흐름(같은 장 그래프와 같은 순위 ReadingFeature.rank). 둘이 겹치면 '움직이기 좋은 해', 계기만 있으면 '알아보고 준비할 해',
     흐름이 무거우면(fitScore ≤ -12) '조건 확인 후 천천히'. 가까운 12개월은 그래프와 같은 달 순위.
   · 이직 계기는 life-narrative 'spec.move'(career_08), 결혼은 'spec.marriage'(love_08)와 같은 식 — 장 사이 해가 엇갈리지 않게.
   · 적성 연결: 취업·이직은 직업 적성(careerProfile) 상위 분야, 독립은 특기 결(aptitude-chapters WORK_TYPE)·부업 세부 분야,
     새 인연은 활동으로 넓히는 만남 자리(aptitude MEET_IDS), 수입은 돈이 되는 세부 분야(MONEY).
   · 표시 전용·결정적. 엔진 계산을 바꾸지 않는다. 20세 미만: 커리어는 진로 말, 인연·재물 블록은 넣지 않는다. 65세 이상: 취업·창업 대신 새 활동.
   · 사용: R.TimingEvents.build(M, ch, now, topic) · R.TimingEvents.block(H, topic) (reading-feature custom:'tev') */
(function (root) {
  'use strict';
  var R = root.ReportV2 = root.ReportV2 || {};
  var VERSION = 'timing-events-20261126-1';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var bat = function (w) { var t = String(w).replace(/[^가-힣0-9]+$/, ''), ch = t.charCodeAt(t.length - 1); if (/[0-9]$/.test(t)) return /[013678]$/.test(t); var c = ch - 0xAC00; return c >= 0 && c <= 11171 && c % 28 !== 0; };
  var josa = function (w, a, b) { return w + (bat(w) ? a : b); };

  // ── 문안 ──
  var T = {
    head: { career: '언제 무엇을 — 커리어 사건별 타이밍', love: '언제 무엇을 — 인연 사건별 타이밍', wealth: '언제 무엇을 — 재물 사건별 타이밍' },
    sub: '그해 들어오는 기운이 만드는 계기와, 위 그래프의 흐름 점수를 함께 봤어요. 둘이 겹치는 해가 실제로 움직이기 좋은 해예요.',
    tag: { go: '움직이기 좋은 해', prep: '알아보고 준비할 해', slow: '조건 확인 후 천천히', care: '조심할 해' },
    none: { career: '앞으로 10년 안에 이 일을 끌어당기는 해가 뚜렷하지 않아요. 날을 기다리기보다 준비가 된 때 스스로 정하는 쪽이 맞아요.',
      love: '앞으로 10년 안에 이 일을 끌어당기는 해가 뚜렷하지 않아요. 시기보다 내 생활 반경을 넓히는 쪽이 더 큰 차이를 만들어요.',
      wealth: '앞으로 10년 안에 이 일을 끌어당기는 해가 뚜렷하지 않아요. 해를 고르기보다 정해 둔 기준대로 꾸준히 가는 쪽이 맞아요.' },
    monthsKid: '가까운 12개월 중 원서·대회·발표처럼 도전하기 좋은 달', monthsSenior: '가까운 12개월 중 새 활동을 시작하기 좋은 달',
    months: { career: '가까운 12개월 중 지원·면접·제안처럼 일을 실제로 움직이기 좋은 달', love: '가까운 12개월 중 약속을 잡고 사람을 만나기 좋은 달', wealth: '가까운 12개월 중 돈의 결정을 내리기 좋은 달' },
    note: '해와 달은 기운이 실리는 때를 견줘 본 참고예요. 일이 일어난다는 예고가 아니고, 실제 결정은 내 상황과 조건을 먼저 보고 내리세요.',
  };
  // 사건 정의: id · 이름 · 계기 판정(row) → 이유 문자열 · 연령 조건 · 실천 문장(움직이기 좋은 해 / 준비할 해)
  var EV = {
    career: [
      { id: 'job', name: '취업·입사', kidName: '진학·진로 결정', seniorSkip: true, sig: function (r) { return r.top === 3 ? '조직·자리의 기운이 들어옴' : r.top === 4 ? '합격·문서의 기운이 들어옴' : r.mhap ? '일터 자리와 합' : ''; },
        go: '지원서를 넉넉히 넣고 면접을 몰아 보세요. 붙을 자리를 고르는 해예요.', prep: '자격·포트폴리오를 채우고, 가고 싶은 곳의 채용 시기를 미리 파악해 두세요.',
        kidGo: '가고 싶은 학교·전공을 정하고 원서를 준비하기 좋은 해예요.', kidPrep: '관심 분야를 체험하며 진로 후보를 좁혀 두세요.' },
      { id: 'move', name: '이직·자리 이동', kidSkip: true, seniorName: '일의 형태 바꾸기', sig: function (r) { return r.mclash ? '일터 자리를 흔듦' : r.top === 3 ? '새 자리의 기운이 들어옴' : r.mhap ? '일터 자리와 합' : ''; },
        rank: function (r) { return (r.mclash ? 2 : 0) + (r.top === 3 ? 1.5 : 0) + (r.mhap ? 1 : 0) + r.fit / 100; }, n: 3,   // life-narrative spec.move(career_08)와 같은 식·같은 3개
        go: '제안을 받으면 조건을 따져 실제로 옮겨 볼 만해요. 이력서를 최신으로 두세요.', prep: '흔들림·제안이 오는 해예요. 바로 옮기기보다 시장을 알아보고 조건을 모아 두세요.',
        seniorGo: '하던 일을 줄이거나 넘기는 방식을 실제로 바꿔 볼 만한 해예요.', seniorPrep: '일의 형태가 흔들리는 해예요. 바로 바꾸기보다 넘길 일과 남길 일을 먼저 적어 두세요.' },
      { id: 'up', name: '승진·인정', kidName: '대회·수상·인정', sig: function (r) { return r.top === 3 && r.fit > 0 ? '책임과 자리의 기운이 받쳐 줌' : r.top === 4 && r.fit > 0 ? '윗사람·문서의 도움이 들어옴' : ''; },
        go: '맡은 성과를 숫자로 정리해 먼저 이야기를 꺼내 보세요.', prep: '평가에 남을 일을 하나 정해 기록부터 쌓아 두세요.',
        kidGo: '대회·공모전·발표에 도전해 보기 좋은 해예요.', kidPrep: '작품·기록을 한곳에 모아 두며 도전할 자리를 찾아 두세요.' },
      { id: 'indep', name: '독립·창업', kidSkip: true, seniorName: '새 활동 시작', sig: function (r) { return r.top === 1 && r.fit >= 0 ? '내 재능을 밖으로 내보내는 기운' : r.top === 0 && r.fit >= 0 ? '내 힘으로 서는 기운' : r.top === 2 && r.fit >= 0 ? '내 일로 수익을 만드는 기운' : ''; },
        go: '회사 밖에서 작게 먼저 팔아 보거나, 준비해 둔 일을 시작해 볼 만해요.', prep: '퇴사보다 부업·사이드 프로젝트로 시장 반응부터 확인해 두세요.',
        seniorGo: '배움·모임·작은 일거리처럼 새 활동을 시작해 볼 만한 해예요.', seniorPrep: '큰돈 없이 체험부터 해 보며 맞는 활동을 골라 두세요.' },
    ],
    love: [
      { id: 'meet', name: '새 인연·만남', sig: function (r) { return r.sp ? '이성·인연의 기운이 들어옴' : r.dohwa ? '사람을 끄는 도화(연살)의 해' : r.dhap ? '배우자 자리와 합' : ''; },
        go: '소개·모임·새 활동 자리를 일부러 늘려 보세요. 사람이 들어오는 해예요.', prep: '만남의 자리는 생기지만 흐름이 고르지 않아요. 가볍게 만나며 사람을 알아보는 해로 쓰세요.' },
      { id: 'start', name: '연애 시작·관계 정하기', sig: function (r) { return r.dhap && r.sp ? '인연 기운과 배우자 자리의 합이 겹침' : r.dhap ? '배우자 자리와 합' : r.sp && r.fit > 0 ? '인연의 기운이 받쳐 줌' : ''; },
        go: '마음이 있는 사람에게 먼저 다가가거나 관계의 이름을 정하기 좋은 해예요.', prep: '마음이 커져도 서두르기보다 서로의 속도를 확인하며 다져 가세요.' },
      { id: 'wed', name: '결혼 이야기', sig: function (r) { return r.sp && r.dhap ? '배우자 기운과 배우자 자리의 합이 겹침' : r.sp ? '배우자 기운이 들어옴' : r.dhap ? '배우자 자리와 합' : ''; },
        rank: function (r) { return (r.sp ? 2 : 0) + (r.dhap ? 1.5 : 0) + r.fit / 100; }, n: 4,   // life-narrative spec.marriage(love_08)와 같은 식·같은 4개
        go: '결혼 이야기를 꺼내거나 집안 인사를 진행하기 좋은 해예요. 자세한 흐름은 ‘결혼운은 언제 강해질까?’ 장과 같아요.', prep: '이야기는 오가지만 흐름은 무거운 편이라, 날짜를 정하기보다 준비를 다지는 해로 쓰세요.' },
    ],
    wealth: [
      { id: 'big', name: '큰돈·기회', sig: function (r) { return r.top === 2 ? '재물의 기운이 들어옴' : r.top === 1 && r.fit > 0 ? '재능이 돈으로 이어지는 기운' : ''; },
        go: '미뤄 둔 거래·계약을 진행해 볼 만해요. 기회가 오면 조건을 문서로 남기세요.', prep: '돈의 움직임은 있지만 흐름이 고르지 않아요. 판을 키우기보다 조건을 모아 두세요.' },
      { id: 'earn', name: '수입 늘리기', sig: function (r) { return r.top === 3 && r.fit > 0 ? '자리·책임이 수입으로 이어지는 기운' : r.top === 4 && r.fit > 0 ? '자격·평판이 수입으로 이어지는 기운' : r.mhap && r.fit > 0 ? '일터와 손발이 맞는 해' : ''; },
        go: '연봉 협상·단가 조정·부업 확장을 걸어 보기 좋은 해예요.', prep: '수입을 늘릴 준비(자격·포트폴리오·단가표)를 해 두세요.' },
    ],
  };
  // 주의 사건(움직이기 좋은 해가 아니라 '조심할 해'로만 보여 준다)
  var CARE = {
    career: { id: 'rest', name: '쉬어 갈 해', kidName: '쉬어 갈 해', pick: function (r) { return r.fit < -15; }, why: '흐름이 가장 무거운 해', text: '큰 이동·퇴사 결정은 피하고 실력과 이력을 쌓는 데 쓰세요.', kidText: '무리한 목표보다 기본기를 다지는 해로 쓰세요.', seniorText: '일을 늘리거나 목돈을 넣는 결정은 피하고 생활 리듬을 지키세요.' },
    love: { id: 'clash', name: '갈등·이별 주의', pick: function (r) { return r.dclash; }, why: '배우자 자리를 흔드는 해', text: '말다툼이 커지기 쉬워요. 이별·동거 같은 큰 결정은 한 계절 더 지켜본 뒤에 내리세요.' },
    wealth: { id: 'loss', name: '지출·손실 주의', pick: function (r) { return r.top === 0 || r.fit <= -15; }, why: '돈이 흩어지기 쉬운 해', text: '보증·동업·큰 투자 권유는 한 번 더 따져 보고, 고정 지출을 줄여 두세요.' },
  };
  // 적성 연결 문장
  var FIT = {
    job: '이 시기에 지원할 곳은 직업 적성에서 앞선 {cats} 쪽이 맞기 쉬워요.',
    move: '옮길 곳을 고를 때는 {cats} 쪽과, 일하는 방식({pole})이 맞는지를 함께 보세요.',
    up: '인정받기 쉬운 무기는 {weapon}이에요.',
    indep: '내 일로 시작한다면 {type} 결을 살린 {subs} 쪽부터 작게 시험해 볼 만해요.',
    meet: '만남의 자리는 {subs}처럼 활동이 있는 곳에서 자연스럽게 열리기 쉬워요.',
    earn: '수입을 넓힌다면 {subs} 쪽이 이 사주의 세부 분야 점수가 높아요.',
  };

  // ── 계산 ──
  function pullTop(M, ch, x) {
    var dEl = M.stemEl(ch.pillars.day.s), g = M.groupPull ? M.groupPull(dEl, x).slice() : [0, 0, 0, 0, 0], top = 0;
    g.forEach(function (v, i) { if (v > g[top]) top = i; }); return top;
  }
  function rows(M, ch, now) {
    var Y = new Date(now).getUTCFullYear(), sgL = ch.gender === 'F' ? 3 : 2;
    return M.seunRange(ch, Y, Y + 9).map(function (x) {
      var rels = M.luckRelations(ch, x).rels, has = function (type, pos) { return rels.some(function (r) { return (type === '합' ? r.kind === 'branch' && /합/.test(r.type) : r.type === type) && r.members.indexOf(pos) >= 0; }); };
      var top = pullTop(M, ch, x);
      return { y: x.year, gz: M.gzNameK(x), top: top, fit: x.ev.fitScore, sp: top === sgL, mclash: has('충', 'month'), mhap: has('합', 'month'), dclash: has('충', 'day'), dhap: has('합', 'day'), dohwa: x.sinsal12 === '연살' };
    });
  }
  function ageOf(ch, now) { var by = ch.input && ch.input.year ? +ch.input.year : null; return by ? new Date(now).getUTCFullYear() - by : 30; }
  function build(M, ch, now, topic) {
    if (!M || !ch || !EV[topic]) return null;
    now = now || Date.now();
    var age = ageOf(ch, now), kid = age < 20, senior = age >= 65;
    if (kid && topic !== 'career') return null;
    var rs = rows(M, ch, now), RF = R.ReadingFeature, rk = null;
    try { rk = RF && RF.rank ? RF.rank(M, ch, now, topic, 'year') : null; } catch (e) { rk = null; }
    var flowRank = {}; (rk || []).forEach(function (r, i) { flowRank[r.y] = i; });
    var goodFlow = function (r) { return flowRank[r.y] != null ? flowRank[r.y] < 4 && r.fit > -12 : r.fit >= 10; };
    var events = EV[topic].filter(function (e) { return !(kid && e.kidSkip) && !(senior && e.seniorSkip); }).map(function (e) {
      var hits = rs.map(function (r) { var w = e.sig(r); return w ? { y: r.y, gz: r.gz, why: w, fit: r.fit, cls: goodFlow(r) ? 'go' : r.fit <= -12 ? 'slow' : 'prep' } : null; }).filter(Boolean);
      // 움직이기 좋은 해 먼저, 같은 등급이면 흐름 순위·이른 해 순 — 최대 4개를 해 순서로
      var ord = { go: 0, prep: 1, slow: 2 }, fr = function (y) { return flowRank[y] != null ? flowRank[y] : 99; };
      var pick = e.rank ? hits.map(function (h) { return { h: h, s: e.rank(rs.filter(function (r) { return r.y === h.y; })[0]) }; }).sort(function (a, b) { return b.s - a.s; }).slice(0, e.n).map(function (x) { return x.h; }).sort(function (a, b) { return a.y - b.y; })
        : hits.slice().sort(function (a, b) { return (ord[a.cls] - ord[b.cls]) || (fr(a.y) - fr(b.y)) || (a.y - b.y); }).slice(0, 4).sort(function (a, b) { return a.y - b.y; });
      var name = kid && e.kidName ? e.kidName : senior && e.seniorName ? e.seniorName : e.name;
      return { id: e.id, name: name, years: pick, go: kid && e.kidGo ? e.kidGo : senior && e.seniorGo ? e.seniorGo : e.go, prep: kid && e.kidPrep ? e.kidPrep : senior && e.seniorPrep ? e.seniorPrep : e.prep };
    });
    var goY = {}; events.forEach(function (e) { e.years.forEach(function (x) { if (x.cls === 'go') goY[x.y] = 1; }); });
    var c = CARE[topic], careYears = rs.filter(function (r) { return c.pick(r) && !goY[r.y]; }).sort(function (a, b) { return a.fit - b.fit; }).slice(0, 2).sort(function (a, b) { return a.y - b.y; }).map(function (r) { return { y: r.y, gz: r.gz, why: c.why }; });
    var months = [];
    try { months = (RF && RF.rank ? RF.rank(M, ch, now, topic, 'month') : []).slice(0, 3).map(function (r) { return { y: r.y, m: r.m, label: r.y + '년 ' + r.m + '월' }; }).sort(function (a, b) { return a.y * 12 + a.m - (b.y * 12 + b.m); }); } catch (e) { months = []; }
    return { version: VERSION, topic: topic, kid: kid, senior: senior, events: events, care: { name: kid && c.kidName ? c.kidName : c.name, years: careYears, text: kid && c.kidText ? c.kidText : senior && c.seniorText ? c.seniorText : c.text }, months: months, fit: fitLines(M, ch, topic, events, kid) };
  }
  // 적성 연결(특기·적성 모듈이 있을 때만)
  function fitLines(M, ch, topic, events, kid) {
    var out = {}, AC = R.AptChapters, AD = R.AptChaptersData, A = root.MantraAptitude, r = null, P = null;
    try { r = A ? A.build(M, ch) : null; } catch (e) { r = null; }
    try { P = M.careerProfile ? M.careerProfile(ch) : null; } catch (e) { P = null; }
    var subsBy = function (ids, n) { if (!r || !r.ok) return []; var all = []; Object.keys(r.details).forEach(function (f) { r.details[f].subs.forEach(function (s) { if (s.ok && ids.indexOf(s.id) >= 0) all.push(s); }); }); return all.sort(function (a, b) { return (b.score - a.score) || (a.id < b.id ? -1 : 1); }).slice(0, n); };
    var top1 = r && r.ok ? r.talents.filter(function (t) { return t.ok; }).sort(function (a, b) { return (b.score - a.score) || (a.id < b.id ? -1 : 1); })[0] : null;
    var cats = P && P.top && P.top.length ? (P.top[1] ? josa(P.top[0].name, '과', '와') + ' ' + P.top[1].name : P.top[0].name) : '';
    var pole = ''; try { if (P && P.workStyle) { var ks = M.CAREER_AXIS_KEYS || Object.keys(P.workStyle), best = null; ks.forEach(function (k) { var x = P.workStyle[k]; if (!x) return; var lean = Math.abs(x.value - 50); if (!best || lean > best.lean) best = { lean: lean, name: x.value >= 50 ? x.left : x.right }; }); pole = best ? best.name : ''; } } catch (e) { pole = ''; }
    events.forEach(function (e) {
      if (e.id === 'job' && cats && !kid) out.job = FIT.job.replace('{cats}', cats);
      if (e.id === 'job' && kid && cats) out.job = '진로를 고를 때는 직업 적성에서 앞선 ' + cats + ' 쪽을 먼저 체험해 보세요.';
      if (e.id === 'move' && cats && pole) out.move = FIT.move.replace('{cats}', cats).replace('{pole}', pole);
      if (e.id === 'up' && top1 && AD && AD.WORK && AD.WORK[top1.id]) out.up = FIT.up.replace('{weapon}', AD.WORK[top1.id].weapon);
      if (e.id === 'indep' && top1 && top1.types && AD && AD.SIDE) { var ty = top1.types.list.filter(function (x) { return x.id === top1.types.top; })[0], ss = subsBy(Object.keys(AD.SIDE), 2); if (ty && ss.length) out.indep = FIT.indep.replace('{type}', ty.name).replace('{subs}', (ss[1] ? josa(ss[0].name, '과', '와') + ' ' + ss[1].name : ss[0].name)); }
      if (e.id === 'meet' && AD && AD.MEET_IDS) { var ms = subsBy(AD.MEET_IDS, 2); if (ms.length) out.meet = FIT.meet.replace('{subs}', (ms[1] ? josa(ms[0].name, '과', '와') + ' ' + ms[1].name : ms[0].name)); }
      if (e.id === 'earn' && AD && AD.MONEY) { var es = subsBy(Object.keys(AD.MONEY), 2); if (es.length) out.earn = FIT.earn.replace('{subs}', (es[1] ? josa(es[0].name, '과', '와') + ' ' + es[1].name : es[0].name)); }
    });
    return out;
  }

  // ── 화면 ──
  var CSS = '.tev-ev{border:1px solid var(--line,rgba(0,0,0,.12));border-radius:12px;padding:10px 12px;margin:8px 0}.tev-ev h4{margin:0 0 6px;font-size:.95rem}' +
    '.tev-ys{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 6px;padding:0;list-style:none}.tev-ys li{border-radius:10px;padding:5px 9px;font-size:.82rem;line-height:1.4;background:rgba(127,127,127,.12)}' +
    '.tev-ys li b{margin-right:4px}.tev-ys li small{display:block;opacity:.75}.tev-ys li.is-go{background:rgba(46,160,90,.16)}.tev-ys li.is-slow,.tev-ys li.is-care{background:rgba(220,80,60,.14)}' +
    '.tev-do{margin:4px 0 0;font-size:.88rem;line-height:1.6}.tev-fit{margin:4px 0 0;font-size:.84rem;opacity:.85}';
  function css() { return '<style>' + CSS + '</style>'; }   // 장마다 다시 그려지므로 블록에 함께 넣는다
  function html(o) {
    if (!o) return '';
    var yli = function (x, cls, tag) { return '<li class="is-' + cls + '"><b>' + x.y + '년</b>' + esc(x.gz) + '<small>' + esc(tag + ' · ' + x.why) + '</small></li>'; };
    var evs = o.events.map(function (e) {
      var gos = e.years.filter(function (x) { return x.cls === 'go'; }), preps = e.years.filter(function (x) { return x.cls !== 'go'; });
      var doTxt = !e.years.length ? T.none[o.topic] : (gos.length ? gos.map(function (x) { return x.y + '년'; }).join('·') + ' — ' + e.go : '') + (gos.length && preps.length ? ' ' : '') + (preps.length ? preps.map(function (x) { return x.y + '년'; }).join('·') + ' — ' + (preps.every(function (x) { return x.cls === 'slow'; }) ? '흐름이 무거운 해라 조건을 확인한 뒤 천천히 정하세요.' : e.prep) : '');
      return '<div class="tev-ev"><h4>' + esc(e.name) + '</h4>' + (e.years.length ? '<ul class="tev-ys">' + e.years.map(function (x) { return yli(x, x.cls, T.tag[x.cls]); }).join('') + '</ul>' : '') +
        '<p class="tev-do">' + esc(doTxt) + '</p>' + (o.fit[e.id] ? '<p class="tev-fit">' + esc(o.fit[e.id]) + '</p>' : '') + '</div>';
    }).join('');
    var care = o.care.years.length ? '<div class="tev-ev"><h4>' + esc(o.care.name) + '</h4><ul class="tev-ys">' + o.care.years.map(function (x) { return yli(x, 'care', T.tag.care); }).join('') + '</ul><p class="tev-do">' + esc(o.care.text) + '</p></div>' : '';
    var mon = o.months.length ? '<p class="tev-do"><b>' + esc(o.topic === 'career' && o.kid ? T.monthsKid : o.topic === 'career' && o.senior ? T.monthsSenior : T.months[o.topic]) + '</b>: ' + esc(o.months.map(function (m) { return m.label; }).join(' · ')) + '</p>' : '';
    return css() + '<section class="dp-embed dp dp-tev"><div class="cap">' + esc(T.head[o.topic]) + '</div><p class="lead">' + esc(T.sub) + '</p>' + evs + care + mon + '<p class="dp-mi">' + esc(T.note) + '</p></section>';
  }
  function block(H, topic) {
    if (!H || !H.M || !H.ch) return null;
    var o = null; try { o = build(H.M, H.ch, H.now || Date.now(), topic); } catch (e) { o = null; }
    return o ? html(o) : null;
  }
  var API = { VERSION: VERSION, build: build, block: block, html: html, rows: rows, EV: EV, CARE: CARE, T: T, FIT: FIT };
  R.TimingEvents = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
