/* 건강·사고수 상세 풀이 장 6개(2026-11-15, 챕터 고도화 4묶음) — 종합풀이 '건강 및 사고수'(timeline_self_35) 바로 뒤에 붙는다.
   h1 내 몸의 오행 지도 · h2 나는 언제 쉽게 지칠까 · h3 스트레스가 몸으로 오는 길 · h4 올해·이번 달 몸 챙길 때 · h5 사고수 신호 읽기 · h6 앞으로 10년 안전 흐름과 삼재
   · 표시 전용: engine.js(weights·climate·strength·relations·seunRange·wolun·evaluateDomainLuck·getSamjae·daeunAt)와
     /health-body.js(MantraHealthBody.read) · /accident-hint.js(MantraAccidentHint.read) 결과만 읽는다. AI·DB 문안·새 점수 없음.
   · 의학적 진단·질병·사고 발생을 예측하지 않는다. 전통 오행-장부 대응과 생활 습관 참고로만 쓰고, 장마다 그 안내를 둔다(금지 표현 검사).
   · 공개 스위치: /api/luck-flags healthChapters(기본 꺼짐). 로컬·미리보기 주소에서는 ?mantraFlags=healthChapters. 검사: tests/health-chapters-sim.cjs
   · 같은 방식의 앞선 장: flow-chapters.js(오행 흐름·격국), reading-peak.js(전성기) */
(function (root) {
  'use strict';
  var R = root.ReportV2 = root.ReportV2 || {};
  var VERSION = 'health-chapters-20261124-sj';
  var EK = ['목', '화', '토', '금', '수'], EH = ['木', '火', '土', '金', '水'];
  var IDS = ['timeline_self_h1', 'timeline_self_h2', 'timeline_self_h3', 'timeline_self_h4', 'timeline_self_h5', 'timeline_self_h6'];
  var TITLES = { timeline_self_h1: '내 몸의 오행 지도', timeline_self_h2: '나는 언제 쉽게 지칠까?', timeline_self_h3: '스트레스가 몸으로 오는 길', timeline_self_h4: '올해·이번 달 몸 챙길 때', timeline_self_h5: '사고수 신호 읽기 — 조심할 장면', timeline_self_h6: '앞으로 10년 안전 흐름과 삼재' };
  var BANNED = /진단합니다|발병|걸립니다|걸릴 거예요|사망|죽음|죽는|중상|큰 사고가 납니다|사고가 납니다|반드시|무조건|확정|틀림없|암에|불치/;
  var MED = '전통 오행과 장부를 맞대어 읽은 생활 참고예요. 의학적 진단이나 예측이 아니니, 몸에 이상이 느껴지면 병원 진료를 먼저 받으세요.';
  var NOTE = { timeline_self_h2: '체질이나 질병을 가르는 판단이 아니라, 힘을 쓰는 리듬에 대한 생활 참고예요.', timeline_self_h3: '스트레스 질환을 진단하는 내용이 아니에요. 긴장이 오래가면 전문가 상담을 먼저 받으세요.', timeline_self_h4: '달별 지수는 건강 상태를 재는 값이 아니라 생활을 조절할 때 참고하는 흐름이에요.', timeline_self_h6: '해마다의 지수는 사고를 예고하는 값이 아니라, 일정을 나눌 때 참고하는 흐름이에요.' };
  var SAFE = '사고가 난다는 예측이 아니라, 전통 해석에서 조심하라고 짚는 장면을 생활 습관으로 옮긴 참고예요.';
  var PART = [
    { organ: '간·담', body: '눈, 근육·힘줄, 손발톱, 목·어깨 뻣뻣함' }, { organ: '심장·소장', body: '혈관·혈압, 얼굴 열감, 잠과 두근거림' },
    { organ: '비장·위', body: '소화기, 입, 살과 근육, 복부' }, { organ: '폐·대장', body: '코·기관지, 피부, 장' }, { organ: '신장·방광', body: '허리·무릎·뼈, 귀, 몸의 냉기' }];
  var YEAR_HABIT = [
    '한 해 동안 아침 스트레칭과 주 3회 걷기를 고정해 두고, 눈이 피로한 날은 화면 보는 시간을 줄이세요.', '한 해 동안 햇볕 아래 걷는 시간을 일정하게 두고, 늦은 밤의 카페인과 과로를 줄이세요.',
    '한 해 동안 식사 시간을 고정하고, 바쁜 달에도 끼니를 거르지 않는 규칙을 지키세요.', '한 해 동안 호흡 운동과 실내 습도를 챙기고, 환절기에는 목과 피부를 먼저 보호하세요.', '한 해 동안 잠드는 시간을 고정하고, 추운 계절에는 허리와 발을 따뜻하게 지키세요.'];
  var SIGNAL = { press: '긴장이 오래가면 어깨와 턱에 힘이 들어가고 잠이 얕아지는 것이 첫 신호로 오기 쉬워요.', pressCush: '긴장할 때 몸에 힘이 들어가 목·어깨가 뻐근해지는 것이 첫 신호로 오기 쉬워요.', drain: '목이 잠기거나 입맛이 들쭉날쭉해지는 것이 지쳤다는 첫 신호로 오기 쉬워요.', hold: '두통이나 소화가 막히는 느낌이 쌓인 긴장의 첫 신호로 오기 쉬워요.', even: '피곤이 주말까지 이어지는 것이 리듬이 흐트러졌다는 첫 신호로 오기 쉬워요.' };
  var HABIT = [
    '아침에 10분 걷거나 몸을 늘려 주는 스트레칭으로 굳은 근육을 풀어 주세요.', '햇볕을 쬐는 가벼운 산책과 짧은 유산소로 순환을 깨워 주세요. 밤늦게 자극적인 것은 줄이세요.',
    '정해진 시간에 천천히 먹고, 과식·야식을 줄여 소화기를 쉬게 해 주세요.', '깊게 숨 쉬는 시간을 하루 두 번 두고, 건조한 날에는 실내 습도와 피부를 챙겨 주세요.', '물을 자주 마시고 잠을 일정하게 지키며, 허리·발을 따뜻하게 해 주세요.'];
  var bat = function (w) { var t = String(w).replace(/\([^()]*\)\s*$/, '').replace(/[^가-힣]+$/, ''), c = t.charCodeAt(t.length - 1) - 0xAC00; return c >= 0 && c <= 11171 && c % 28 !== 0; };
  var J = { 이: function (w) { return w + (bat(w) ? '이' : '가'); }, 은: function (w) { return w + (bat(w) ? '은' : '는'); }, 을: function (w) { return w + (bat(w) ? '을' : '를'); }, 예요: function (w) { return w + (bat(w) ? '이에요' : '예요'); }, 라: function (w) { return w + (bat(w) ? '이라' : '라'); }, 로: function (w) { var t = String(w).replace(/[^가-힣]+$/, ''), c = t.charCodeAt(t.length - 1) - 0xAC00; return w + (c >= 0 && c % 28 !== 0 && c % 28 !== 8 ? '으로' : '로'); } };
  var el = function (e) { return EK[e] + '(' + EH[e] + ')'; };
  var pc = function (v) { return Math.round(v) + '%'; };
  function rows(core) { return Object.keys(core).filter(function (k) { return core[k]; }).map(function (k) { return { role: k, text: core[k] }; }); }
  function join(a) { return a.filter(Boolean).map(function (t) { return String(t).replace(/\s+/g, ' ').trim(); }).join('\n\n'); }
  function chapter(id, core, vd) {
    if (core.why) { var wp = String(core.why).split('\n\n'); wp[0] = '이 사주: ' + wp[0]; core.why = wp.join('\n\n'); }
    return { id: id, base: id, title: TITLES[id], kind: 'life', editorialTopicId: 'self', editorialContractId: id, aiEnabled: false, readingSupplementary: true, readingDeferred: false,
      readingProvider: 'local-engine-luck', healthChapter: true, readingCore: core, readingParagraphs: rows(core), readingVisualData: vd, scenes: R.ReadingFlow ? R.ReadingFlow.scenes(core, id) : [] };
  }
  function ctx(M, ch, name, now) {
    now = now || Date.now();
    var nowY = M.yearPillarAt ? M.yearPillarAt(now).sajuYear : new Date(now).getFullYear();
    return { M: M, ch: ch, now: now, nowY: nowY, nm: String(name || '').trim().replace(/님$/, ''), pct: ch.weights.pct, G: ch.weights.groups, dEl: M.stemEl(ch.pillars.day.s), help: ch.strength && ch.strength.help, cl: ch.climate || { temp: 0, hum: 0 }, yong: ch.unified ? ch.unified.yong : null };
  }
  function who(C) { return C.nm ? C.nm + '님' : '당신'; }
  function seun(C, from, to) { try { return C.M.seunRange(C.ch, from, to) || []; } catch (e) { return []; } }
  function dom(C, x, level) { try { return C.M.evaluateDomainLuck(C.ch, x, level, {}); } catch (e) { return null; } }
  function climateNotes(C) {
    var o = [], c = C.cl;
    if (c.temp >= 0.6) o.push({ e: 1, t: '원국이 덥고 메마른 쪽(조열)이라 열이 위로 오르기 쉬워요. 심장·혈압, 잠과 얼굴 열감 쪽을 함께 살펴요.' });
    if (c.temp <= -0.6) o.push({ e: 4, t: '원국이 차가운 쪽(한랭)이라 몸이 쉽게 식어요. 허리·무릎과 하체 냉기, 순환 쪽을 함께 살펴요.' });
    if (c.hum >= 0.8) o.push({ e: 2, t: '원국이 습한 쪽이라 몸이 무겁고 붓기 쉬워요. 소화와 부종 쪽을 함께 살펴요.' });
    if (c.hum <= -0.8) o.push({ e: 3, t: '원국이 건조한 쪽이라 호흡기와 피부가 마르기 쉬워요. 수분과 실내 습도를 함께 살펴요.' });
    return o;
  }

  // h1 내 몸의 오행 지도
  function h1(C) {
    var hi = [], lo = [], mid = [];
    C.pct.forEach(function (v, e) { if (v >= 32) hi.push(e); else if (v <= 8) lo.push(e); else if (v >= 14 && v <= 26) mid.push(e); });
    hi.sort(function (a, b) { return C.pct[b] - C.pct[a]; }); lo.sort(function (a, b) { return C.pct[a] - C.pct[b]; });
    var cn = climateNotes(C), top = hi.length ? hi[0] : lo.length ? lo[0] : cn.length ? cn[0].e : null;
    var title = top == null ? who(C) + '의 몸 오행은 한쪽으로 크게 쏠린 곳 없이 비교적 고른 편이에요.' : who(C) + '의 몸 오행 지도에서 먼저 챙길 곳은 ' + J.예요(PART[top].organ + ' 쪽') + '.';
    var lines = hi.map(function (e) { return '원국에 ' + el(e) + ' 기운이 ' + pc(C.pct[e]) + '로 많아 ' + PART[e].organ + '(' + PART[e].body + ') 쪽이 평소 과해지기 쉬운 편이에요.'; })
      .concat(lo.map(function (e) { return '원국에 ' + el(e) + ' 기운이 ' + pc(C.pct[e]) + '로 적어 ' + PART[e].organ + '(' + PART[e].body + ') 쪽이 약해지기 쉬운 편이에요.'; }))
      .concat(cn.map(function (x) { return x.t; }));
    var core = {
      title: title,
      reality: join([lines.length ? lines.join(' ') : '다섯 기운이 모두 8~32% 사이에 있어, 특별히 약하거나 과한 장부가 두드러지지 않아요.', '실제 생활에서는 피곤할 때 이 부위가 먼저 신호를 보내는지 한 달쯤 살펴보면, 내 몸의 약한 고리를 알아차리기 쉬워요.']),
      strength: mid.length ? mid.map(function (e) { return PART[e].organ; }).join('·') + ' 쪽은 기운이 알맞게 있어 몸을 비교적 고르게 받쳐 주는 편이에요.' : '어느 한 기운이 몸 전체를 끌고 가는 구조라, 그 기운이 잘 쓰일 때는 회복도 빠른 편이에요.',
      risk: join([hi.length ? PART[hi[0]].organ + ' 쪽은 바쁠 때 무리가 한꺼번에 몰리기 쉬워요. 피로가 쌓이는 주간에는 그쪽 신호를 먼저 확인하세요.' : lo.length ? PART[lo[0]].organ + ' 쪽은 평소 힘이 적어, 무리한 다음에 회복이 더디게 느껴질 수 있어요.' : '', MED]),
      reinforce: C.yong != null ? '이 사주의 균형을 잡아 주는 기운은 ' + J.라(el(C.yong)) + ', 그 기운과 맞닿은 생활 습관이 몸의 균형에도 도움이 된다고 봐요. ' + HABIT[C.yong] : HABIT[top != null ? top : 2],
      practice: top != null ? HABIT[top].split('. ')[0].replace(/\.$/, '') + '. 이번 주에 세 번만 해 보고 몸의 반응을 적어 보세요.' : '이번 주에 수면 시간과 식사 시간을 한 번씩 적어 보고, 가장 들쭉날쭉한 쪽 하나를 고르게 맞춰 보세요.',
      why: join(['오행 비율(월령 가중): ' + C.pct.map(function (v, e) { return EK[e] + ' ' + pc(v); }).join(' · ') + '. 32% 이상은 과해지기 쉬운 쪽, 8% 이하는 약해지기 쉬운 쪽으로 봤어요.', '원국 온도 ' + C.cl.temp.toFixed(2) + ' · 습도 ' + C.cl.hum.toFixed(2) + '(±0.6·±0.8 이상이면 조열·한랭·습·건조로 함께 봤어요).', '오행과 장부의 대응은 전통 명리의 일반 대응이며, 만세력 건강 지도(health-body.js)와 같은 기준이에요.']),
    };
    return chapter('timeline_self_h1', core, { name: C.nm, healthTop: top });
  }

  // h2 나는 언제 쉽게 지칠까
  var PHASE = { 장생: 'grow', 목욕: 'grow', 관대: 'grow', 건록: 'peak', 제왕: 'peak', 쇠: 'fade', 병: 'fade', 사: 'fade', 묘: 'store', 절: 'store', 태: 'renew', 양: 'renew' };
  var PH_TXT = { grow: '기운이 자라는 단계라, 새로 시작할 때 힘이 나지만 한꺼번에 여러 일을 벌이면 금방 흔들려요', peak: '기운이 차오른 단계라, 버티는 힘은 큰데 쉬어야 할 때를 놓치기 쉬워요', fade: '기운을 안으로 아끼는 단계라, 몰아서 쓰기보다 나눠 쓸 때 오래 가요', store: '기운을 저장하는 단계라, 겉으로는 조용해도 쉬는 시간이 충분해야 다시 힘이 나요', renew: '기운이 다시 싹트는 단계라, 준비하고 배우는 리듬에서 힘이 붙어요' };
  function h2(C) {
    var help = C.help, band = help == null ? '' : help < 42 ? 'weak' : help > 58 ? 'strong' : 'mid';
    var dst = C.ch.cells && C.ch.cells.day && C.ch.cells.day.unseong, du = C.M.daeunAt(C.ch, C.now), cst = du && du.unseong;
    var title = band === 'weak' ? who(C) + '은 힘을 한 번에 크게 쓰기보다 나눠 쓸 때 오래 가는 체질로 읽어요.' : band === 'strong' ? who(C) + '은 버티는 힘이 큰 만큼, 지친 줄 모르고 몰아붙이다 한 번에 꺾이기 쉬운 쪽으로 읽어요.' : who(C) + '은 힘이 고른 편이라, 지치는 원인은 체력보다 생활 리듬이 흐트러질 때가 많아요.';
    var core = {
      title: title,
      reality: join([help != null ? '나를 돕는 힘(비겁·인성)이 ' + pc(help) + '예요. ' + (band === 'weak' ? '일과 사람에게 기운이 쉽게 빠져나가는 구조라, 바쁜 주간이 이어지면 주말에 몰아서 쓰러지기 쉬워요.' : band === 'strong' ? '스스로 밀고 가는 힘이 커서 피곤해도 일을 끝까지 붙잡고 있는 편이에요.' : '들어오는 힘과 나가는 힘이 비슷해, 잠·식사 리듬이 무너질 때 피로가 먼저 와요.') : '',
        dst && PH_TXT[PHASE[dst]] ? '나 자신이 머무는 자리(일지)의 12운성은 ' + J.로(dst) + ', ' + PH_TXT[PHASE[dst]] + '.' : '']),
      strength: band === 'weak' ? '몸의 신호에 일찍 반응하는 편이라, 쉬는 법만 익히면 오히려 오래 건강을 지키는 쪽이에요.' : band === 'strong' ? '회복력이 좋은 편이라, 무리한 뒤에도 잠을 제대로 자면 빨리 돌아와요.' : '어느 쪽으로도 크게 치우치지 않아, 리듬을 지키는 만큼 몸이 그대로 따라와요.',
      risk: join([band === 'strong' ? '\'아직 괜찮다\'는 느낌이 가장 큰 함정이에요. 쉬어야 할 신호(잠이 얕아짐, 입맛 변화)를 일부러 확인하세요.' : band === 'weak' ? '남의 부탁과 일정을 다 받아 주면, 몸보다 마음이 먼저 지쳐요.' : '불규칙한 잠과 식사가 이어지면 작은 피로가 쌓여 길게 갈 수 있어요.', NOTE.timeline_self_h2]),
      reinforce: cst && PH_TXT[PHASE[cst]] ? '지금 10년 대운(' + C.M.gzName(du) + ')의 12운성은 ' + J.로(cst) + ', ' + PH_TXT[PHASE[cst]] + '. 원국의 리듬과 지금 대운의 리듬이 ' + (PHASE[cst] === PHASE[dst] ? '같은 쪽이라 익숙한 방식으로 쉬면 돼요.' : '달라, 예전과 같은 방식으로 쉬어도 회복이 덜 될 수 있어요. 쉬는 방법을 한 번 바꿔 보세요.') : '',
      practice: band === 'weak' ? '이번 주 일정표에 \'아무것도 안 하는 2시간\'을 먼저 적어 넣고 지켜 보세요.' : band === 'strong' ? '하루 일이 끝나면 오늘 몸 상태를 1~5점으로 적어 보고, 3점 이하가 이틀 이어지면 다음 날 일정을 줄이세요.' : '일어나는 시간과 자는 시간을 일주일만 같게 맞춰 보세요.',
      why: join([help != null ? '나를 돕는 힘 ' + pc(help) + '(42% 미만 여림, 58% 초과 셈).' : '', dst ? '일지 12운성 ' + dst + (cst ? ' · 지금 대운 12운성 ' + cst : '') + '. 12운성은 기운의 생명주기 단계를 뜻하며 좋고 나쁨을 정하지 않아요.' : '', '강약과 12운성은 만세력 원국 탭·운세 흐름 탭과 같은 계산이에요.']),
    };
    return chapter('timeline_self_h2', core, { name: C.nm });
  }

  // h3 스트레스가 몸으로 오는 길
  function h3(C) {
    var G = C.G, gw = G[3], gs = G[1], gi = G[4], gb = G[0], d = C.dEl, ctl = (d + 3) % 5;
    var type = gw >= 30 && gi < 10 ? 'press' : gw >= 30 ? 'pressCush' : gs >= 30 ? 'drain' : gb >= 30 ? 'hold' : 'even';
    var dayRel = (C.ch.relations || []).filter(function (r) { return (r.members || []).indexOf('day') >= 0 && /충|형/.test(r.type); });
    var T = {
      press: [who(C) + '의 스트레스는 쌓였다가 몸으로 바로 오는 쪽이에요.', '일·책임(관성) 기운이 ' + pc(gw) + '로 큰데, 그 압박을 받아 줄 배움·도움(인성)이 ' + pc(gi) + '로 적어요. 압박이 쿠션 없이 나(' + el(d) + ')에게 바로 닿는 구조라, 긴장이 오래가면 ' + PART[d].organ + ' 쪽과 잠이 먼저 흔들리기 쉬워요.'],
      pressCush: [who(C) + '의 스트레스는 크게 들어오지만 받아 넘길 쿠션도 있는 쪽이에요.', '일·책임(관성) 기운이 ' + pc(gw) + '로 크고, 배움·도움(인성)이 ' + pc(gi) + '로 그 압박을 받아 넘겨 줘요. 혼자 버티기보다 배우고 도움을 청할 때 긴장이 몸에 덜 남아요.'],
      drain: [who(C) + '의 스트레스는 쏟아내며 소모되는 쪽이에요.', '표현·재능(식상) 기운이 ' + pc(gs) + '로 커서, 말하고 만들고 신경 쓰는 데 기운이 많이 나가요. 바쁜 시기에는 목·어깨가 굳고 끼니를 거르기 쉬운 쪽으로 몸에 와요.'],
      hold: [who(C) + '의 스트레스는 참았다가 한 번에 터지는 쪽이에요.', '나와 같은 힘(비겁)이 ' + pc(gb) + '로 커서 웬만한 일은 혼자 참고 버텨요. 그만큼 쌓인 긴장이 어느 날 몸살처럼 한 번에 나오기 쉬워요.'],
      even: [who(C) + '의 스트레스는 한 곳에 몰리기보다 생활 리듬을 따라 오르내리는 쪽이에요.', '압박(관성)·소모(식상)·버팀(비겁)이 어느 하나로 크게 치우치지 않아요. 스트레스 자체보다 잠과 식사가 흐트러질 때 몸이 먼저 반응해요.'],
    }[type];
    var core = {
      title: T[0],
      reality: join([T[1], SIGNAL[type], dayRel.length ? '나 자신이 머무는 자리(일지)에 ' + dayRel.map(function (r) { return r.name || r.type; }).join('·') + '이 걸려 있어, 가까운 생활권(집·가족)에서 부딪히는 일이 있을 때 긴장이 더 오래 남는 편이에요.' : '']),
      strength: (type === 'pressCush' || gi >= 15 ? '도움을 받아들이는 힘(인성 ' + pc(gi) + ')이 있어, 지칠 때 쉬고 배우는 쪽으로 방향을 바꾸면 회복이 빨라요.' : '스트레스가 오는 길이 비교적 분명해서, 그 길만 알면 미리 막아 두기 쉬운 편이에요.') + ' 지친 몸은 쉬는 시간의 길이보다 쉬는 방식이 바뀔 때 더 빨리 돌아와요.',
      risk: join([type === 'press' ? '\'조금만 더\'가 반복되면 긴장이 풀리지 않은 채 잠자리에 들게 돼요.' : type === 'drain' ? '좋아하는 일일수록 쉬는 것을 잊기 쉬워요.' : type === 'hold' ? '괜찮다고 말하는 습관이 몸의 신호를 늦게 알아차리게 해요.' : '바쁜 시기에 잠·식사가 한꺼번에 무너지면 회복이 길어져요.', NOTE.timeline_self_h3]),
      reinforce: { press: '압박을 받아 줄 쿠션(배움·도움·쉼)을 일부러 만들어 두세요. 혼자 끌어안기보다 나눠 맡을 사람을 정해 두는 것만으로도 몸의 긴장이 줄어요.', pressCush: '힘들 때 찾아갈 사람과 쉬는 방법을 미리 정해 두면, 압박이 실력으로 바뀌는 쪽으로 흘러가요.', drain: '쏟아낸 만큼 채우는 시간을 따로 두세요. 하루 끝에 말·화면 없이 쉬는 30분이 소모를 막아 줘요.', hold: '참는 대신 짧게 털어놓는 통로를 하나 만드세요. 일주일에 한 번 몸과 마음 상태를 적어 두는 것도 좋아요.', even: '잠과 식사 시간을 고정하는 것이 가장 큰 스트레스 관리예요.' }[type],
      practice: { press: '이번 주 맡은 일 중 하나를 다른 사람에게 부탁하거나 기한을 늦춰 보세요.', pressCush: '이번 주에 도움을 청할 사람 한 명을 정하고 실제로 한 번 연락해 보세요.', drain: '오늘 밤 잠들기 전 30분은 휴대폰을 멀리 두고 쉬어 보세요.', hold: '오늘 힘들었던 일 하나를 한 줄로 적어 보세요.', even: '이번 주 일어나는 시간을 매일 같게 맞춰 보세요.' }[type],
      why: join(['십성 묶음: 비겁 ' + pc(gb) + ' · 식상 ' + pc(gs) + ' · 관성 ' + pc(gw) + ' · 인성 ' + pc(G[4]) + ' · 재성 ' + pc(G[2]) + '. 30% 이상을 큰 쪽, 10% 미만을 작은 쪽으로 봤어요.', '스트레스가 몸에 닿는 곳은 일간 오행(' + el(d) + ')의 장부(' + PART[d].organ + ')로 봤어요. 일간을 누르는 오행은 ' + J.예요(el(ctl)) + '.', dayRel.length ? '일지 관계: ' + dayRel.map(function (r) { return r.name; }).join(' · ') + '.' : '']),
    };
    return chapter('timeline_self_h3', core, { name: C.nm, stressType: type });
  }

  // h4 올해·이번 달 몸 챙길 때
  var BAND_PLAIN = function (s) { return s >= 65 ? '여유 있는 편' : s >= 45 ? '무난한 편' : s >= 35 ? '조금 무거운 편' : '부담이 큰 편'; };
  function monthOf(ms) { var d = new Date(ms + 9 * 3600000); return d.getUTCMonth() + 1; }
  function h4(C) {
    var x = seun(C, C.nowY, C.nowY)[0]; if (!x) return null;
    var dh = dom(C, x, 'seun'), hs = dh && dh.health ? dh.health.score : null, hb = null; try { hb = root.MantraHealthBody ? root.MantraHealthBody.read(C.M, C.ch, x) : null; } catch (e) { }
    var top = hb && hb.items && hb.items[0];
    var ms = []; try { ms = C.M.wolun(C.ch, C.nowY) || []; } catch (e) { }
    var mm = ms.map(function (m) { var d = dom(C, m, 'wolun'); return { m: monthOf(m.startMs), s: d && d.health ? d.health.score : null, gz: C.M.gzName(m) }; }).filter(function (r) { return r.s != null; });
    var low = mm.slice().sort(function (a, b) { return a.s - b.s; }).slice(0, 3), high = mm.slice().sort(function (a, b) { return b.s - a.s; }).slice(0, 2);
    var mlist = function (a) { return a.slice().sort(function (x, y) { return ((x.m + 10) % 12) - ((y.m + 10) % 12); }).map(function (r) { return r.m + '월'; }).join('·'); };
    var core = {
      title: hs == null ? who(C) + '의 올해 몸 흐름을 오행으로 짚어 봤어요.' : who(C) + '의 ' + C.nowY + '년 몸 흐름은 ' + BAND_PLAIN(hs) + '이에요' + (low.length ? '. 특히 ' + mlist(low) + '에 몸을 먼저 챙기세요.' : '.'),
      reality: join([top ? C.nowY + '년(' + C.M.gzName(x) + ')에는 ' + top.organ + '(' + top.body + ') 쪽을 ' + (top.level === '주의' ? '먼저' : '함께') + ' 살펴보면 좋아요. ' + (top.reasons && top.reasons[0] ? String(top.reasons[0]).replace(/편입니다\.$/, '편이에요.').replace(/쉽습니다\.$/, '쉬워요.').replace(/커집니다\.$/, '커져요.') : '') : '', low.length ? '달마다 보면 ' + mlist(low) + '은 균형이 흐트러지기 쉬운 달이고, ' + mlist(high) + '은 비교적 여유 있는 달이에요.' : '']),
      strength: high.length ? mlist(high) + '은 몸의 균형이 비교적 좋은 달이라, 운동을 시작하거나 건강검진처럼 미뤄 둔 일을 하기 좋아요.' : '',
      risk: join([low.length ? mlist(low) + '에는 야근·과음·무리한 일정을 줄이고 잠을 먼저 챙기세요.' : '', NOTE.timeline_self_h4]),
      reinforce: top ? '올해는 ' + top.organ + ' 쪽에 맞는 습관을 하나 정해 한 해 동안 지켜 보세요. ' + YEAR_HABIT[top.el] : '올해는 특정 장부로 크게 쏠리는 신호가 뚜렷하지 않아요. ' + (C.yong != null ? '사주의 균형을 잡아 주는 ' + el(C.yong) + ' 쪽 습관을 한 해 동안 지켜 보세요. ' + YEAR_HABIT[C.yong] : '잠과 식사 시간을 고정하는 것만으로 충분해요.'),
      practice: low.length ? '달력에서 ' + low[0].m + '월에 \'몸 챙기는 주\'를 표시해 두고, 그 주에는 약속을 하나 덜 잡아 보세요.' : '이번 달에 몸 상태를 매주 한 번 적어 보세요.',
      why: join([hs != null ? C.nowY + '년 건강 균형 지수 ' + Math.round(hs) + '(높을수록 여유) — 만세력 운세 흐름 탭의 건강 지수와 같은 계산이에요.' : '', mm.length ? '월별 지수: ' + mm.map(function (r) { return r.m + '월 ' + Math.round(r.s); }).join(' · ') + '.' : '', top ? '장부 쏠림은 만세력 건강 지도(health-body.js)의 1순위 항목이에요.' : '']),
    };
    return chapter('timeline_self_h4', core, { name: C.nm });
  }

  // h5 사고수 신호 읽기
  function samjaeLine(C, y) { try { var s = C.M.getSamjae(C.ch.pillars.year.b, y); return s && s.active ? s : null; } catch (e) { return null; } }
  function h5(C) {
    var AH = root.MantraAccidentHint; if (!AH) return null;
    var x = seun(C, C.nowY, C.nowY)[0]; if (!x) return null;
    var a = null; try { a = AH.read(C.M, C.ch, x, 'seun'); } catch (e) { }
    var du = C.M.daeunAt(C.ch, C.now), ad = null; try { ad = du ? AH.read(C.M, C.ch, du, 'daeun') : null; } catch (e) { }
    var items = (a && a.items || []).slice(0, 2), dItem = ad && ad.items && ad.items[0], sj = samjaeLine(C, C.nowY);
    var scene = function (it) { return it.title + ' — ' + it.where + (it.position ? '(' + it.position + ')' : '') + '. ' + it.tip; };
    var core = {
      title: items.length ? who(C) + '의 ' + C.nowY + '년에 전통 해석이 짚는 조심할 장면은 \'' + items[0].title + '\'' + (items[1] ? ' 쪽이에요.' : (bat(items[0].title) ? '이에요.' : '예요.')) : who(C) + '의 ' + C.nowY + '년에는 전통 해석상 크게 짚이는 사고수 신호가 뚜렷하지 않아요.',
      reality: join((items.length ? items.map(scene) : ['올해 운의 글자가 원국과 크게 부딪히지 않아, 평소의 안전 습관만 지켜도 충분한 해로 읽어요.']).concat(['이런 장면은 서두르는 날, 잠이 부족한 날, 늦은 귀갓길처럼 몸과 마음의 여유가 줄어든 때에 더 쉽게 생겨요.'])),
      strength: dItem ? (items[0] && items[0].key === dItem.key ? '올해 장면과 지금 10년의 장면이 같아서, 한 가지 습관만 꾸준히 챙기면 되는 구조예요.' : '올해 장면과 지금 10년의 장면이 달라서, 올해는 올해 장면을, 길게는 10년 장면을 나눠 챙기면 돼요.') : '지금 10년 대운에서는 크게 짚이는 장면이 없어, 올해의 신호만 챙기면 되는 구조예요.',
      risk: join([dItem ? '지금 10년(' + C.M.gzName(du) + ' 대운) 동안 길게 이어지는 신호는 \'' + dItem.title + '\' 쪽이에요. ' + dItem.tip : '', sj ? '전통 민속의 삼재로 보면 올해는 ' + sj.stage + '이에요(' + sj.group + '). 삼재는 참고 정보이며 이 앱의 점수에는 쓰지 않아요.' : '', SAFE]),
      reinforce: items.length ? '장면이 정해져 있으니 그 장소에서만 한 박자 늦추면 돼요. 나머지 생활은 평소처럼 지내도 충분해요.' : '운전·계단·주방처럼 매일 지나는 곳에서 한 번 더 확인하는 습관이면 충분해요.',
      practice: items.length ? '\'' + items[0].title + '\' 장면에서 쓸 나만의 확인 문장 하나를 정해, 이번 주에 세 번 소리 내어 확인해 보세요.' : '이번 주 운전·계단·주방에서 \'한 번 더 확인\'을 습관으로 붙여 보세요.',
      why: join([C.nowY + '년(' + C.M.gzName(x) + ') 세운이 원국과 만드는 관계로 본 장면: ' + ((a && a.items || []).map(function (it) { return it.title; }).join(' · ') || '뚜렷한 장면 없음'), (a && a.items || []).map(function (it) { return it.title + ': ' + (it.reasons || []).join(' '); }).join(' / '), '장면 7가지(오행 5 + 날카로운 도구 + 갑작스러운 충격)와 장소 대응은 만세력 사고수 참고(accident-hint.js)와 같은 기준이에요.']),
    };
    return chapter('timeline_self_h5', core, { name: C.nm });
  }

  // h6 앞으로 10년 안전 흐름과 삼재
  // 2026-11-24: 삼재를 더 자세히 — 띠 묶음과 삼재 3년, 10년 안 삼재 해마다 단계·사고수 주의 지수·10년 중 순위·그해 주의 지수가 높은 달,
  //  단계별 생활 조심 장면(공용 /samjae-copy.js, 만세력·타임라인과 같은 문장), 입춘 경계·설날 띠 차이. 모두 엔진 값(getSamjae·evaluateDomainLuck·wolun)만 쓴다.
  var SJ_ORDER = ['들삼재', '눌삼재', '날삼재'];
  function sjCycle(C, y) {
    var S = root.MantraSamjae; if (S) { try { return S.cycle(C.M, C.ch.pillars.year.b, y); } catch (e) { } }
    var cur = samjaeLine(C, y), pos = cur ? SJ_ORDER.indexOf(cur.stage) : -1, start = cur ? y - pos : null;
    if (!cur) for (var k = 1; k <= 12; k++) { var q = samjaeLine(C, y + k); if (q && q.stage === SJ_ORDER[0]) { start = y + k; cur = q; break; } }
    if (start == null) return null;
    return { group: cur.group, pos: pos, start: start, gap: pos >= 0 ? 0 : start - y, next: start + 12, years: [0, 1, 2].map(function (i) { return { year: start + i, stage: SJ_ORDER[i], nick: '', tip: '', br: C.M.BR_K[((start + i - 4) % 12 + 12) % 12] }; }) };
  }
  function monthPeaks(C, y) {
    var ms = []; try { ms = C.M.wolun(C.ch, y) || []; } catch (e) { return []; }
    return ms.map(function (m, i) { var d = dom(C, m, 'wolun'); return d && d.accident ? { i: i, term: m.termName, gz: C.M.gzName(m), s: d.accident.score } : null; }).filter(Boolean)
      .sort(function (p, q) { return q.s - p.s || p.i - q.i; }).slice(0, 2).sort(function (p, q) { return p.i - q.i; });
  }
  function h6(C) {
    var xs = seun(C, C.nowY, C.nowY + 9); if (xs.length < 5) return null;
    var rows0 = xs.map(function (x) { var d = dom(C, x, 'seun'); return { y: x.year, gz: C.M.gzName(x), s: d && d.accident ? d.accident.score : null, sj: samjaeLine(C, x.year) }; }).filter(function (r) { return r.s != null; });
    var top = rows0.slice().sort(function (a, b) { return b.s - a.s || a.y - b.y; }).slice(0, 3), calm = rows0.slice().sort(function (a, b) { return a.s - b.s || a.y - b.y; }).slice(0, 2);
    var rank = function (r) { return rows0.filter(function (q) { return q.s > r.s; }).length + 1; };
    var sjYears = rows0.filter(function (r) { return r.sj; });
    var yl = function (a) { return a.map(function (r) { return r.y + '년'; }).join('·'); };
    var S = root.MantraSamjae, cyc = sjCycle(C, C.nowY), brNow = C.M.BR_K[C.ch.pillars.year.b];
    var nowSj = samjaeLine(C, C.nowY), nowPos = nowSj ? SJ_ORDER.indexOf(nowSj.stage) + 1 : 0;
    var nick = function (st) { return S && S.STAGE[st] ? S.STAGE[st][0] : ''; }, tip = function (st) { return S && S.STAGE[st] ? S.STAGE[st][1] : ''; };
    var lb = C.ch.lunar && C.ch.lunar.y ? ((C.ch.lunar.y - 4) % 12 + 12) % 12 : C.ch.pillars.year.b;
    // 10년 안 삼재 해마다 한 문단: 단계·별칭, 사고수 주의 지수와 10년 중 순위, 그해 지수가 높은 달 두 개, 겹침 여부
    var sjPara = sjYears.map(function (r) {
      var pk = monthPeaks(C, r.y), k = rank(r), both = k <= 3;
      return r.y + '년(' + r.gz + ')은 ' + r.sj.stage + (nick(r.sj.stage) ? '(' + nick(r.sj.stage) + ')' : '') + '예요. 이 해의 사고수 주의 지수는 ' + Math.round(r.s) + '점으로 ' +
        (both ? '10년 중 ' + (k === 1 ? '가장 높아요' : k + '번째로 높아요') + '. 삼재와 주의 지수가 함께 겹치는 해라, 두 신호를 나눠 보지 말고 한 해 내내 안전 습관을 한 단계 올려 두면 좋아요.' : '10년 ' + rows0.length + '개 해 가운데 ' + k + '번째라 높지 않은 편이에요. 삼재라도 실제 운의 주의 신호는 낮으니, 겁낼 해라기보다 확인 절차를 하나 더 붙이는 해로 읽으면 충분해요.') +
        (pk.length ? ' 그해 안에서는 ' + pk.map(function (p) { return p.term + '부터 이어지는 ' + p.gz + '월(' + Math.round(p.s) + '점)'; }).join('과 ') + '에 주의 지수가 가장 높아요.' : '');
    });
    var stageTips = sjYears.length && S ? sjYears.map(function (r) { return r.sj.stage; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).map(function (st) { return st + '(' + nick(st) + ')에는 ' + tip(st).replace(/^[^.]*해예요.\s*/, ''); }) : [];
    var whatSj = cyc ? '삼재(三災)는 띠를 기준으로 12년마다 한 번 돌아오는 3년의 조심 시기를 가리키는 전통 민속이에요. 셋이 한 묶음인 띠(삼합)끼리 삼재 해가 같아서, ' + brNow + '년생이 속한 ' + cyc.group + '는 ' + cyc.years.map(function (q) { return q.br; }).join('·') + '년이 삼재예요. 첫해를 들삼재(들어오는 해), 둘째 해를 눌삼재(머무는 해), 셋째 해를 날삼재(나가는 해)라고 불러요.' : '';
    var nextLine = !sjYears.length && cyc ? ' 다음 삼재는 ' + cyc.start + '~' + (cyc.start + 2) + '년이에요.' : '';
    var core = {
      title: (nowSj ? who(C) + '의 ' + C.nowY + '년은 삼재 3년 중 ' + nowPos + '번째 해(' + nowSj.stage + ')예요. 앞으로 10년 중 안전을 한 번 더 챙길 해는 ' : who(C) + '의 앞으로 10년 중 안전을 한 번 더 챙길 해는 ') + yl(top.slice().sort(function (a, b) { return a.y - b.y; })) + '이에요.',
      reality: join([top.map(function (r) { return r.y + '년(' + r.gz + ')은 주의 지수 ' + Math.round(r.s) + '점으로 10년 중 높은 편이에요.'; }).join(' '), calm.length ? yl(calm) + '은 비교적 차분한 해예요.' : '', whatSj]),
      strength: calm.length ? yl(calm) + '처럼 차분한 해에는 이사·여행·운동처럼 몸을 쓰는 계획을 잡기 좋아요.' + (sjYears.length && calm.some(function (r) { return r.sj; }) ? ' 특히 ' + yl(calm.filter(function (r) { return r.sj; })) + '은 삼재여도 주의 지수가 낮은 해라, 미리 점검만 해 두면 평소처럼 움직여도 괜찮아요.' : '') : '',
      risk: join([sjYears.length ? '앞으로 10년 중 삼재에 해당하는 해는 ' + sjYears.map(function (r) { return r.y + '년(' + r.sj.stage + ')'; }).join('·') + '이에요.' : '앞으로 10년 안에 삼재에 해당하는 해는 없어요.' + nextLine].concat(sjPara, [stageTips.join(' '),
        sjYears.length ? '삼재 해는 양력 1월 1일이 아니라 입춘(2월 4일 무렵)부터 바뀌어요.' + (sjYears[0].sj.stage === '들삼재' ? ' 그래서 ' + sjYears[0].y + '년 1월은 아직 삼재 전이고, ' + (sjYears[0].y + 3) + '년 입춘에 삼재가 끝나요.' : ' 지금 이어지는 삼재는 ' + (sjYears[sjYears.length - 1].y + 1) + '년 입춘에 끝나요.') : '',
        lb !== C.ch.pillars.year.b ? '태어난 날이 입춘과 설날 사이라, 사주(입춘) 기준으로는 ' + brNow + '년생이지만 설날 기준 민간 띠로는 ' + C.M.BR_K[lb] + '년생이에요. 여기서는 입춘 기준으로 계산했고, 설날 기준으로 보면 삼재 해가 달라질 수 있어요.' : '',
        '삼재는 전통 민속의 참고일 뿐, 10년 주의 지수 계산에는 들어가지 않아요.', NOTE.timeline_self_h6])),
      reinforce: '주의 지수가 높은 해에는 큰 이동·무리한 운동·위험한 작업을 한꺼번에 몰지 말고, 하나씩 나눠 잡으세요.' + (sjYears.length ? ' 삼재 3년은 큰일을 미루는 시기가 아니라 확인을 한 번 더 붙이는 시기예요. 계약서 다시 읽기, 정기 검진, 운전 전 컨디션 확인처럼 방어 습관 하나를 정해 3년 동안 이어 가면 충분해요.' : ''),
      practice: '달력의 ' + top[0].y + '년 첫 페이지에 \'안전 점검의 해\'라고 적어 두고, 그해 시작에 보험·차량·집 안 안전을 한 번 점검해 보세요.' + (sjYears.length ? ' ' + (sjYears[0].sj.stage === '들삼재' ? '삼재가 시작되는 ' + sjYears[0].y + '년' : '삼재가 이어지는 ' + sjYears[0].y + '년') + ' 입춘 무렵에는 보험 보장·차량 정비·중요 서류의 만기를 한 번에 확인해 두세요.' : ''),
      why: join(['연도별 주의 지수: ' + rows0.map(function (r) { return r.y + '년 ' + Math.round(r.s) + '점' + (r.sj ? '(' + r.sj.stage + ')' : ''); }).join(' · ') + ' — 만세력 운세 흐름 탭의 사고수 지수와 같은 계산이에요(높을수록 조심).',
        '삼재는 띠(년지 ' + brNow + ') 기준 전통 민속 계산(getSamjae, 입춘 기준 연지)이에요.' + (cyc ? ' ' + cyc.group + ' → 삼재 년지 ' + cyc.years.map(function (q) { return q.br; }).join('·') + '.' : '') + ' 그해 달별 지수는 월운 사고수 지수와 같은 계산이에요.']),
    };
    return chapter('timeline_self_h6', core, { name: C.nm });
  }

  function yo(t) { return String(t).replace(/편입니다\./g, '편이에요.').replace(/쉽습니다\./g, '쉬워요.').replace(/있습니다\./g, '있어요.').replace(/됩니다\./g, '돼요.'); }
  function buildAll(M, ch, name, now) {
    var C = ctx(M, ch, name, now), out = {};
    [h1, h2, h3, h4, h5, h6].forEach(function (f, i) { try { var c = f(C); if (c) { Object.keys(c.readingCore).forEach(function (k) { c.readingCore[k] = yo(c.readingCore[k]); }); c.readingParagraphs = rows(c.readingCore); out[IDS[i]] = c; } } catch (e) { if (root.console) root.console.warn('health-chapters', IDS[i], e && e.message); } });
    return out;
  }
  function contract(c) { return c && (c.editorialContractId || c.id) || ''; }
  function add(rep, sd, name, M, ch) {
    if (!rep || !rep.chapters || !M || !ch) return rep;
    if (rep.chapters.some(function (c) { return c.healthChapter; })) return rep;
    var made = buildAll(M, ch, name), list = rep.chapters.slice();
    var i = list.findIndex(function (c) { return contract(c) === 'timeline_self_35' || c.id === 'deep_health'; });
    if (i < 0) { for (var k = list.length - 1; k >= 0; k--) if (list[k].editorialTopicId === 'self') { i = k; break; } }
    if (i < 0) return rep;
    var prev = list[i].id, at = i + 1;
    IDS.forEach(function (id) { var c = made[id]; if (!c) return; c.act = list[i].act; c.placeAfter = prev; prev = c.id; list.splice(at++, 0, c); });
    list.forEach(function (c, j) { c.no = j + 1; });
    return Object.assign({}, rep, { chapters: list });
  }
  function localFlag() {
    try { var f = root.MANTRA_FLAGS; if (f && f.healthChapters === true) return true; var h = root.location && root.location.hostname || '';
      if (/^(localhost|127\.0\.0\.1)$/.test(h) || /^[a-z0-9][a-z0-9-]*\.mantramanse\.pages\.dev$/i.test(h)) return /[?&]mantraFlags=[A-Za-z,]*\bhealthChapters\b/.test(root.location.search || ''); } catch (e) { }
    return false;
  }
  var readyP = null;
  function ready() {
    if (readyP) return readyP; if (localFlag()) return (readyP = Promise.resolve(true)); if (!root.fetch) return (readyP = Promise.resolve(false));
    var valid = function (d) { return !!(d && typeof d === 'object' && Number.isInteger(d.version)); };
    var p = root.MantraLastGood ? root.MantraLastGood.json('/api/luck-flags', 5000, valid) : root.fetch('/api/luck-flags', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; });
    return (readyP = Promise.resolve(p).then(function (d) { return !!(d && d.healthChapters === true); }).catch(function () { return false; }));
  }
  function readyWithin(ms) {
    var saved = function () { try { var d = root.MantraLastGood && root.MantraLastGood.saved('/api/luck-flags'); return !!(d && d.healthChapters === true); } catch (e) { return false; } };
    return Promise.race([ready().then(function (v) { return sjP.then(function () { return v; }); }), new Promise(function (ok) { setTimeout(function () { ok(saved()); }, ms || 2500); })]);
  }
  // 삼재 단계별 생활 조심 문장은 공용 /samjae-copy.js(만세력·타임라인과 같은 문장). 못 불러오면 단계 이름만 쓴다
  var sjP = Promise.resolve();
  if (root.document && !root.MantraSamjae) { try { sjP = new Promise(function (ok) { var sjs = root.document.createElement('script'); sjs.src = '/samjae-copy.js?v=20261124-sj'; sjs.onload = sjs.onerror = function () { ok(); }; (root.document.head || root.document.documentElement).appendChild(sjs); }); } catch (e) { } }
  if (root.document && root.fetch) { try { ready(); } catch (e) { } }
  R.HealthChapters = { VERSION: VERSION, IDS: IDS, TITLES: TITLES, BANNED: BANNED, MED: MED, SAFE: SAFE, NOTE: NOTE, buildAll: buildAll, add: add, ready: ready, readyWithin: readyWithin, localFlag: localFlag };
  if (typeof module !== 'undefined' && module.exports) module.exports = R.HealthChapters;
})(typeof window !== 'undefined' ? window : globalThis);
